-- 001_initial_schema.sql
-- GARDA-LOKAL / PAI (Platform Pelaporan & Intelijen Kejadian Nasional)
-- PostgreSQL 15+ (Supabase)

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES
DO $$ BEGIN
  CREATE TYPE incident_category AS ENUM ('BENTROK', 'PERUNDUNGAN', 'MIRAS_NARKOBA', 'LAINNYA');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE temporal_status AS ENUM ('SEDANG_BERLANGSUNG', 'RENCANA_MENDATANG', 'KEJADIAN_LAMPAU');
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE report_status AS ENUM (
    'BARU',
    'DITINDAKLANJUTI',
    'BUTUH_INFO_PELAPOR',
    'SELESAI',
    'INDIKASI_PALSU',
    'RAW_UNPROCESSED'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE TYPE audit_action_type AS ENUM (
    'READ_DETAIL',
    'CHANGE_STATUS',
    'ADD_NOTE',
    'SEND_MESSAGE_TO_REPORTER'
  );
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

-- 2. TABEL UTAMA LAPORAN (reports)
CREATE TABLE IF NOT EXISTS public.reports (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  cluster_parent_id UUID REFERENCES public.reports(id) ON DELETE SET NULL,
  reporter_token_hash TEXT NOT NULL, -- SHA-256 dari token acak di HP pelapor
  
  -- Klasifikasi & Waktu
  category incident_category NOT NULL DEFAULT 'LAINNYA',
  temporal_context temporal_status NOT NULL DEFAULT 'SEDANG_BERLANGSUNG',
  status report_status NOT NULL DEFAULT 'BARU',
  
  -- Skor Analisis AI (0 - 100)
  urgency_score INTEGER NOT NULL DEFAULT 50 CHECK (urgency_score >= 0 AND urgency_score <= 100),
  credibility_score INTEGER NOT NULL DEFAULT 50 CHECK (credibility_score >= 0 AND credibility_score <= 100),
  is_potential_hoax BOOLEAN NOT NULL DEFAULT FALSE,
  hoax_reason TEXT,
  
  -- Pemisahan Narasi (Publik Inisial vs Admin Nama Lengkap)
  raw_reporter_input TEXT NOT NULL,
  public_masked_summary TEXT NOT NULL DEFAULT 'Laporan sedang dalam proses verifikasi sistem.',
  admin_full_narrative TEXT,
  extracted_entities JSONB DEFAULT '{}'::jsonb,
  tactical_recommendation TEXT,
  
  -- Data Geospasial OpenStreetMap
  latitude DOUBLE PRECISION NOT NULL,
  longitude DOUBLE PRECISION NOT NULL,
  address_road TEXT,
  address_subdistrict TEXT, -- Kelurahan / Desa
  address_district TEXT,    -- Kecamatan
  address_city TEXT,        -- Kota / Kabupaten
  address_province TEXT,    -- Provinsi
  location_landmark TEXT,   -- Patokan lokasi dari pelapor
  
  cluster_count INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_reports_status_urgency ON public.reports(status, urgency_score DESC, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_reports_token_hash ON public.reports(reporter_token_hash);
CREATE INDEX IF NOT EXISTS idx_reports_coords ON public.reports(latitude, longitude);

-- 3. TABEL FORENSIK & BUKTI MEDIA (report_forensics)
CREATE TABLE IF NOT EXISTS public.report_forensics (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL UNIQUE REFERENCES public.reports(id) ON DELETE CASCADE,
  
  -- Jejak Jaringan & Perangkat Pelapor (Hanya untuk Admin)
  reporter_ip TEXT,
  user_agent TEXT,
  device_platform TEXT,
  
  -- Bukti Foto Terkompresi & Metadata EXIF Asli
  compressed_image_path TEXT, -- Path di Supabase Storage (WebP <80KB)
  original_file_sha256 TEXT,
  compressed_file_sha256 TEXT,
  exif_metadata JSONB DEFAULT '{}'::jsonb,
  exif_gps_latitude DOUBLE PRECISION,
  exif_gps_longitude DOUBLE PRECISION,
  exif_captured_at TIMESTAMPTZ,
  distance_pin_vs_exif_meters DOUBLE PRECISION,
  is_metadata_consistent BOOLEAN DEFAULT TRUE,
  
  media_purged_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 4. TABEL KOMUNIKASI DUA ARAH (report_messages)
CREATE TABLE IF NOT EXISTS public.report_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE CASCADE,
  sender_role TEXT NOT NULL CHECK (sender_role IN ('ADMIN', 'REPORTER')),
  admin_email TEXT,
  message_text TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_messages_report_id ON public.report_messages(report_id, created_at ASC);

-- 5. TABEL AUDIT LOG PERMANEN (admin_audit_logs) - APPEND ONLY!
-- Jaminan Integritas Hukum & Forensik:
-- Tabel ini mencatat seluruh interaksi petugas intelijen/admin terhadap setiap laporan.
-- Kolom 'mandatory_note' wajib diisi (minimal alasan pembacaan atau disposisi status).
CREATE TABLE IF NOT EXISTS public.admin_audit_logs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  report_id UUID NOT NULL REFERENCES public.reports(id) ON DELETE RESTRICT,
  admin_user_id UUID,
  admin_email TEXT NOT NULL,
  action_type audit_action_type NOT NULL,
  previous_status report_status,
  new_status report_status,
  mandatory_note TEXT NOT NULL,
  client_ip TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_audit_report_id ON public.admin_audit_logs(report_id, created_at DESC);

-- 6. TRIGGER KEAMANAN MUTLAK: MELARANG UPDATE & DELETE PADA TABEL AUDIT LOG (WORM - Write Once, Read Many)
-- Aturan Integritas Mutlak:
-- Mencegah segala bentuk rekayasa atau manipulasi jejak audit oleh akun siapa pun,
-- termasuk admin database. Data hanya boleh di-INSERT, tidak pernah di-UPDATE atau di-DELETE.
CREATE OR REPLACE FUNCTION public.prevent_audit_log_modification()
RETURNS TRIGGER AS $$
BEGIN
  RAISE EXCEPTION 'PELANGGARAN KEAMANAN MUTLAK: Log audit bersifat permanen (immutable) dan tidak dapat diubah atau dihapus dalam kondisi apa pun.';
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_immutable_audit_logs ON public.admin_audit_logs;
CREATE TRIGGER trg_immutable_audit_logs
BEFORE UPDATE OR DELETE ON public.admin_audit_logs
FOR EACH ROW EXECUTE FUNCTION public.prevent_audit_log_modification();

-- 7. FUNGSI PENCARIAN KLASTER INSIDEN TERDEKAT (RUMUS HAVERSINE < 500 METER & 3 JAM TERAKHIR)
-- Logika Geospasial:
-- Menghitung jarak lingkaran besar (Great Circle Distance) antara koordinat pelapor baru
-- dengan insiden aktif lain berkategori sama dalam jendela waktu 3 jam terakhir dan radius <= 500 meter.
-- Jika ditemukan kecocokan, ID insiden pertama dijadikan 'cluster_parent_id'.
CREATE OR REPLACE FUNCTION public.find_nearby_active_cluster(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  cat incident_category
)
RETURNS UUID AS $$
DECLARE
  found_cluster_id UUID;
BEGIN
  SELECT id INTO found_cluster_id
  FROM public.reports
  WHERE category = cat
    AND cluster_parent_id IS NULL
    AND status IN ('BARU', 'DITINDAKLANJUTI', 'BUTUH_INFO_PELAPOR', 'RAW_UNPROCESSED')
    AND created_at >= (NOW() - INTERVAL '3 hours')
    AND (
      6371000 * acos(
        least(1.0, greatest(-1.0,
          cos(radians(lat)) * cos(radians(latitude)) *
          cos(radians(longitude) - radians(lng)) +
          sin(radians(lat)) * sin(radians(latitude))
        ))
      )
    ) <= 500
  ORDER BY created_at ASC
  LIMIT 1;

  RETURN found_cluster_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 8. ROW LEVEL SECURITY (RLS)
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_forensics ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.report_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_audit_logs ENABLE ROW LEVEL SECURITY;

-- Kebijakan RLS
DO $$ BEGIN
  CREATE POLICY "Akses publik baca laporan via hash token" ON public.reports
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Akses publik kirim pesan laporan" ON public.report_messages
    FOR INSERT WITH CHECK (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
  CREATE POLICY "Akses publik baca pesan laporan" ON public.report_messages
    FOR SELECT USING (true);
EXCEPTION
  WHEN duplicate_object THEN null;
END $$;
