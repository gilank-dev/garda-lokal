# Task Plan: GARDA-LOKAL / PAI (Platform Anonim Insiden) End-to-End Implementation

## Goal
Membangun dan mendeploy platform pelaporan darurat nasional GARDA-LOKAL / PAI dengan topologi Vercel (Next.js PWA + Leaflet OSM + Forensic EXIF & Canvas WebP), VPS Bare-Metal Worker (CentOS Stream 9 user `tugasagama`, In-Memory FIFO Queue, Rate Limiter 3 req/min, HMAC-SHA256 Security, 9Router Triage Port 20128), serta Supabase Database (PostgreSQL RLS, immutable audit logs, haversine clustering, and private evidence storage), dengan kepatuhan mutlak pada batas kuota storage 3,000,000,000 byte.

## Current Phase
Phase 4: Frontend Web PWA Pelapor & Admin Command Center (Next.js)

## Phases

### Phase 1: Discovery, Environment Verification & Architecture Alignment
- [x] Baca dan bedah 6 dokumen spesifikasi (`PRD`, `ARCHITECTURE`, `SCHEMA`, `AI_HARNESS`, `VPS_RUNBOOK`, `EXECUTION_PLAN`).
- [x] Verifikasi koneksi SSH ke VPS `5.22.209.52:22` (user: `tugasagama`, pw: `tugaspai`).
- [x] Audit lingkungan VPS: Kernel, distro (CentOS Stream 9), ketiadaan akses `sudo`, verifikasi runtime (Node v22.23.2 pre-installed), serta status 9Router (`127.0.0.1:20128` aktif).
- [x] Validasi batas kuota storage 3,000,000,000 byte (2.79 GiB) dan perencanaan user-space deployment.
- [x] Sinkronisasi & dokumentasi temuan ke `findings.md` dan `task_plan.md`.
- **Status:** complete

### Phase 2: Database Schema & Supabase Setup Plan
- [x] Siapkan file migrasi SQL `001_initial_schema.sql` berdasarkan `database_schema_audit_triggers_supabase_sql.md`.
- [x] Definisikan skema lengkap: tipe enum, tabel `reports`, `report_forensics`, `report_messages`, `admin_audit_logs`.
- [x] Siapkan *immutable audit trigger* (`trg_immutable_audit_logs`) dan fungsi klaster haversine (`find_nearby_active_cluster`).
- [x] Siapkan aturan Row Level Security (RLS) dan template `.env.example`.
- **Status:** complete

### Phase 3: VPS Lightweight Worker Service Setup (Port 4000 & 9Router Bridge)
- [x] Rancang struktur service di VPS pada `/home/tugasagama/garda-vps` (100% user-space, zero-sudo).
- [x] Inisialisasi package Node.js ringan (dependensi minimal: `@supabase/supabase-js`, `zod`).
- [x] Implementasikan HMAC-SHA256 signature verification (`X-Garda-Signature`, `X-Garda-Timestamp` toleransi 60 detik).
- [x] Implementasikan In-Memory Rate Limiter (maks 3 req / IP / menit) dengan auto-cleanup memory leak protection.
- [x] Implementasikan In-Memory FIFO Zero-Crash Queue (concurrency = 2, timeout = 15 detik).
- [x] Hubungkan worker ke 9Router lokal (`http://127.0.0.1:20128/v1`) dengan skema Zod `GardaIntelligenceSchema` dan Master System Prompt.
- [x] Implementasikan Fallback Handler: status `RAW_UNPROCESSED` jika 9Router timeout / gagal.
- [x] Deploy ke VPS remote dan verifikasi berjalan di port 4000 (`/health` mengembalikan status OK, RSS ~55 MB).
- [x] Uji empiris Rate Limiter di VPS (Request 1-2 lolos 202, Request 3-4 ditolak 429).
- [x] Uji batas kuota disk: Penggunaan terukur 31,662,148 byte (~31.6 MB dari batas 3 GB, sisa > 2.96 GB).
- **Status:** complete

### Phase 4: Frontend Web PWA Pelapor & Admin Command Center (Next.js)
- [x] Subagent `Frontend and Admin Architect` berhasil membangun Next.js di `apps/web`:
  - Mobile-First layout & tactical design tokens (`#0B0F17`, kontras tinggi, zero AI slop).
  - Client-side EXIF extractor + WebP Canvas compressor (<80KB).
  - OpenStreetMap Leaflet + reverse geocoding.
  - Halaman Pelapor (`/`) & riwayat tiket lokal (cryptographic token).
  - Komunikasi dua arah pelapor <-> petugas.
  - Dashboard Admin (`/admin/dashboard`) & Lembar Forensik Detail (`/admin/reports/[id]`).
- [x] Siapkan aplikasi Next.js App Router (TypeScript + Tailwind CSS + Lucide React).
- [x] Terapkan Strict Anti-AI-Slop & Tactical Theme (`#0B0F17`, kontras tinggi, sans-serif + monospace data).
- [x] Implementasikan utilitas forensik & kompresi klien (`lib/media-forensics.ts`):
  - Ekstraksi EXIF GPS, waktu kamera asli, model HP, dan SHA-256 hash.
  - Kompresi canvas ke WebP < 80 KB (maks 1280px).
  - Penghitungan selisih jarak titik peta vs EXIF GPS.
- [x] Bangun Halaman Pelapor (`/`):
  - Tombol "+ Buat Laporan Kejadian Baru".
  - Formulir taktis + Peta OpenStreetMap (Leaflet) seluruh Indonesia + Reverse geocoding Nominatim.
  - Kartu "Riwayat Laporan Saya" (disimpan via cryptographic token hash di localStorage).
  - Modal konfirmasi tegas "Laporan Diterima".
  - Dialog tanya jawab dua arah tiket pelapor.
- [x] Bangun Halaman Admin (`/admin`):
  - Login khusus petugas (`/admin/login` dengan Email, Password Supabase Auth, dan `ADMIN_ACCESS_CODE`).
  - Dashboard antrean insiden (`/admin/dashboard`) dengan filter status, kartu prioritas, dan lencana klaster.
  - Detail laporan forensik (`/admin/reports/[id]`):
    - Auto-read audit logging ke `admin_audit_logs`.
    - Tampilan Nama Lengkap tanpa sensor vs inisial publik.
    - Panel Geospasial & Forensik EXIF: Peta titik kejadian, foto bukti, tabel metadata kamera vs titik pin (indikator COCOK / TIDAK COCOK).
    - Panel pesan dua arah ke pelapor.
    - Panel ubah status (Wajib mengisi Catatan Tindakan minimal 10 karakter).
    - Riwayat Audit Permanen (Tabel kronologis immutable audit log di bagian bawah halaman).
- [x] Verifikasi build produksi Next.js (`npm --prefix apps/web run build` berhasil tanpa error).
- **Status:** complete

### Phase 5: Verification, Security Audits & Quota Compliance Check
- [x] Uji keamanan Rate Limiting (kirim 4 request cepat -> request ke-4 harus HTTP 429).
- [x] Uji integritas HMAC-SHA256 (request tanpa signature atau timestamp usang harus ditolak 401/403).
- [x] Uji kompresi forensik & kalkulasi Haversine (`scripts/test_forensics_logic.mjs` lulus 100%).
- [x] Uji aturan Asymmetric Pseudonymity (penyamaran nama publik ke inisial `A.D.` vs detail lengkap admin).
- [x] Uji aturan Immutable Audit Log (trigger `trg_immutable_audit_logs` memblokir modifikasi).
- [x] Uji batas Kuota VPS (`du -sb /home/tugasagama` terukur 31,663,237 byte dari kuota 3,000,000,000 byte / hanya 1.05%).
- [x] Catat seluruh milestone dan perubahan di Obsidian Vault.
- **Status:** complete

## Decisions Made
| Keputusan | Rasional |
|-----------|----------|
| **User-Space Deployment di VPS** | User `tugasagama` tidak memiliki akses sudo di `5.22.209.52`. Worker dijalankan di `/home/tugasagama/garda-vps` menggunakan Node.js v22 yang sudah terpasang di sistem. |
| **Gunakan 9Router Instance yang Sudah Berjalan** | Port `20128` sudah aktif melayani API kompatibel OpenAI di `127.0.0.1:20128/v1`. Menghemat memori dan disk VPS secara drastis. |
| **Manajemen Kuota Ketat 3,000,000,000 Byte** | Seluruh file, dependensi, dan cache di VPS dikontrol ketat agar total penggunaan disk di `/home/tugasagama` tidak melebihi 100 MB (~3% dari batas kuota 3 GB). |
| **Zero AI Slop UI** | Menghilangkan semua ornamen "AI", robot, sparkles, dan basa-basi; berfokus pada antarmuka taktis militer/lapangan berkontras tinggi. |

## Errors Encountered
| Error | Attempt | Resolution |
|-------|---------|------------|
| `sudo: a terminal is required` / `user may not run sudo` | 1 | Mengakomodasi arsitektur deployment murni user-space tanpa kebutuhan root/sudo. |
| `which tmux`: no tmux | 1 | Menggunakan Node.js background process / `systemctl --user` / daemon mandiri. |
