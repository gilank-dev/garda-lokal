# AUTONOMOUS AI AGENT IMPLEMENTATION PLAN
**Project Name:** GARDA-LOKAL

> **Instruksi untuk AI Coding Agent:** Ikuti urutan langkah di bawah ini secara berurutan tanpa melompati tahapan. Gunakan dokumen `PRD.md`, `ARCHITECTURE.md`, `SCHEMA.md`, `AI_HARNESS.md`, dan `VPS_RUNBOOK.md` sebagai acuan mutlak.

---

## FASE 1: INISIALISASI DATABASE & STORAGE SUPABASE
- [ ] **Task 1.1:** Eksekusi seluruh skrip SQL dari `SCHEMA.md` ke proyek Supabase untuk membuat tabel `reports`, `report_forensics`, `report_messages`, `admin_audit_logs`, beserta *trigger* `trg_immutable_audit_logs` dan fungsi `find_nearby_active_cluster`.
- [ ] **Task 1.2:** Buat *Storage Bucket* privat bernama `evidence-vault` di Supabase.
- [ ] **Task 1.3:** Buat akun Admin pertama di Supabase Auth (Email & Password khusus petugas) dan tetapkan `ADMIN_ACCESS_CODE` di variabel lingkungan.

---

## FASE 2: PEMBANGUNAN SERVICE VPS (`/opt/garda-vps`)
- [ ] **Task 2.1:** Jalankan `setup-vps.sh` dari `VPS_RUNBOOK.md` pada VPS 1GB/3GB.
- [ ] **Task 2.2:** Di dalam `/opt/garda-vps`, inisialisasi proyek Bun ringan (`bun init -y`) dan pasang paket minimal: `hono`, `ai`, `@ai-sdk/openai`, `zod`, `@supabase/supabase-js`.
- [ ] **Task 2.3:** Bangun `index.ts` di VPS yang mencakup:
  1. Verifikasi tanda tangan `HMAC-SHA256` dari Vercel (`X-Garda-Signature` & `X-Garda-Timestamp`).
  2. *In-Memory Rate Limiter* ketat: **Maksimal 3 request per IP per menit**.
  3. *In-Memory FIFO Queue* (Konkurensi = 2) agar RAM 1GB tidak pernah penuh.
  4. Pemanggilan fungsi RPC `find_nearby_active_cluster` ke Supabase untuk menggabungkan laporan berjarak < 500 meter dalam 3 jam terakhir.
  5. Pemanggilan `9Router` (`http://127.0.0.1:20128/v1`, model `garda-intel-combo`) menggunakan skema `GardaIntelligenceSchema` dari `AI_HARNESS.md`.
  6. *Fallback Handler*: Jika 9Router *timeout* (>15 detik) atau gagal semua tier, simpan laporan dengan status `RAW_UNPROCESSED`.
  7. Pengiriman notifikasi email ke Admin melalui API Resend setiap kali laporan selesai diproses atau berstatus darurat.
- [ ] **Task 2.4:** Aktifkan service abadi dengan `sudo systemctl enable --now garda-core`.

---

## FASE 3: PEMBANGUNAN WEB PELAPOR & DASHBOARD ADMIN DI VERCEL (NEXT.JS)
- [ ] **Task 3.1:** Inisialisasi proyek Next.js (App Router, TypeScript, Tailwind CSS) dengan paket `leaflet`, `react-leaflet`, `exifr` (untuk ekstraksi EXIF sebelum kompresi), `lucide-react`, dan `@supabase/supabase-js`.
- [ ] **Task 3.2:** Bangun utilitas *Client-Side Forensic & Image Compressor* (`lib/media-forensics.ts`):
  1. Baca metadata EXIF asli (GPS, waktu kamera, model perangkat) menggunakan `exifr` dan hitung hash SHA-256 file asli.
  2. Kompres gambar menggunakan HTML5 `<canvas>` ke format `image/webp` dengan kualitas bertahap hingga ukuran file **< 80 KB** (lebar maks 1280px).
  3. Hitung jarak (meter) antara titik pin OpenStreetMap yang dipilih pelapor dengan titik GPS asli di EXIF foto.
- [ ] **Task 3.3:** Bangun **Halaman Pelapor (`/`)** sesuai spesifikasi Mobile-First di `PRD.md`:
  - Beranda dengan tombol **"+ Buat Laporan Kejadian Baru"** dan daftar **"Riwayat Laporan Saya"** (sinkronisasi dengan token di `localStorage`).
  - Komponen peta interaktif OpenStreetMap (Leaflet) seluruh Indonesia dengan pencarian alamat otomatis (*Nominatim Reverse Geocoding*).
  - Popup Modal **"Laporan Diterima"** setelah pengiriman berhasil, diikuti navigasi otomatis kembali ke halaman awal dengan riwayat yang langsung terbarui.
  - Fitur buka detail riwayat untuk menjawab pertanyaan tindak lanjut dari petugas.
- [ ] **Task 3.4:** Bangun **Halaman Admin (`/admin`)** sesuai `PRD.md`:
  - Halaman Login (`/admin/login`) dengan validasi Email + Password + Kode Otorisasi Admin.
  - Dashboard utama (`/admin/dashboard`) dengan *Supabase Realtime Listener* (bunyi dan lencana notifikasi saat laporan masuk), filter status, dan indikator klaster.
  - Halaman detail laporan (`/admin/reports/[id]`) yang:
    1. Otomatis mencatat log `READ_DETAIL` ke `admin_audit_logs` saat dibuka oleh Admin.
    2. Menampilkan **Nama Lengkap** dan narasi utuh dari AI, lokasi OpenStreetMap, foto bukti, serta tabel perbandingan forensik EXIF.
    3. Menyediakan kolom chat ke pelapor dan form ubah status yang **mewajibkan pengisian catatan tindakan**.
    4. Menampilkan tabel **Riwayat Audit Permanen** di bagian bawah halaman.

---

## FASE 4: PENGUJIAN KEAMANAN & VALIDASI AKHIR (QA CHECKLIST)
- [ ] **Task 4.1:** Uji *Rate Limit*: Kirim 4 laporan berturut-turut dalam 30 detik dari IP yang sama $\rightarrow$ Pastikan laporan ke-4 ditolak dengan HTTP `429`.
- [ ] **Task 4.2:** Uji *Forensic Compression*: Unggah foto berukuran 5 MB dari kamera HP $\rightarrow$ Pastikan file yang tersimpan di Supabase berukuran < 80 KB (WebP), namun data GPS & waktu pemotretan asli tetap tampil lengkap di halaman `/admin`.
- [ ] **Task 4.3:** Uji *Dual-View Privacy*: Pastikan di halaman riwayat pelapor nama orang tampil sebagai inisial (`B.S.`), sedangkan di halaman `/admin` tampil nama lengkap (`Budi Santoso`).
- [ ] **Task 4.4:** Uji *Immutable Audit Log*: Coba lakukan perintah `DELETE` atau `UPDATE` pada tabel `admin_audit_logs` $\rightarrow$ Pastikan PostgreSQL menolak dengan pesan pelanggaran keamanan.