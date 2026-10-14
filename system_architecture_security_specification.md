# SYSTEM ARCHITECTURE & SECURITY SPECIFICATION
**Project Name:** GARDA-LOKAL
**Deployment Topology:** Vercel (Frontend/Admin) $\leftrightarrow$ Cloudflare Tunnel $\leftrightarrow$ VPS (1GB RAM / 3GB Disk) $\leftrightarrow$ Supabase (DB/Auth/Storage/Realtime) + Resend (Email).

---

## 1. TOPOLOGI ARSITEKTUR MENYELURUH

Sistem memisahkan lapisan antarmuka pengguna (Vercel) dari lapisan pemrosesan antrean dan kecerdasan buatan (VPS) untuk menjamin keamanan kunci rahasia dan menjaga kestabilan VPS berspesifikasi rendah.

```
[Perangkat Pelapor (HP)]
       │
       │ 1. HTTPS POST (Teks + Koordinat OSM + Foto WebP <80KB + JSON EXIF)
       ▼
[Vercel: Next.js App Router]
       │ 2. Simpan foto WebP ke Supabase Storage & buat baris awal di DB
       │ 3. Kirim Webhook ber-tanda tangan HMAC-SHA256 ke VPS
       ▼
[Cloudflare Tunnel (HTTPS Zero-Open-Port)]
       │
       ▼
[VPS 1GB RAM / 3GB Disk (Linux + Bun + Tmux + Systemd)]
  ├── Gerbang Rate-Limit: Maks 3 request / IP / menit (In-Memory)
  ├── Antrean FIFO Ringan: Maks 2 pekerjaan paralel, kapasitas 50 slot
  └── Worker Triage AI:
       ├── Memanggil 9Router (http://127.0.0.1:20128/v1) -> Combo 3-Tier AI
       ├── Jika 9Router Gagal Total -> Tandai status: RAW_UNPROCESSED
       └── Jika Berhasil -> Update hasil analisis AI ke Supabase + Trigger Email
       │
       ▼
[Supabase PostgreSQL + Realtime + Resend API]
       │
       ▼
[Perangkat Petugas (HP/Laptop) - /admin]
```

---

## 2. SPESIFIKASI KOMUNIKASI ANTAR-KOMPONEN

### 2.1. Jembatan Aman Vercel $\rightarrow$ VPS (HMAC-SHA256 Verification)
Agar endpoint VPS tidak dapat diserang atau ditembak langsung oleh pihak luar, setiap *request* dari Vercel ke VPS wajib menyertakan dua *header* keamanan:
- `X-Garda-Timestamp`: Waktu Unix dalam detik saat *request* dikirim.
- `X-Garda-Signature`: Hasil `HMAC-SHA256( timestamp + "." + raw_json_body, SHARED_VPS_SECRET )`.

**Aturan Validasi di VPS:**
1. Jika selisih waktu sekarang dengan `X-Garda-Timestamp` lebih dari **60 detik**, tolak dengan `401 Unauthorized` (mencegah *Replay Attack*).
2. Jika nilai tanda tangan tidak cocok secara `timingSafeEqual`, tolak dengan `403 Forbidden`.

### 2.2. Rate Limiting di VPS & Vercel (3 Request / IP / Menit)
- Menggunakan penyimpanan *In-Memory Map* ringan di dalam proses Bun (`Map<string, { count: number, resetAt: number }>`).
- Setiap IP pelapor yang diteruskan melalui header terverifikasi dicek: jika `count >= 3` dalam jendela 60 detik, kembalikan status `429 Too Many Requests`.
- Pembersihan memori otomatis dijalankan setiap 5 menit untuk menghapus entri yang sudah kedaluwarsa agar penggunaan RAM tetap di bawah 1 MB.

### 2.3. Manajemen Antrean di VPS 1GB (Zero-Crash Queue)
Untuk melindungi 1 vCPU dan 1 GB RAM dari lonjakan beban:
1. Saat laporan masuk ke endpoint `/api/queue-report` di VPS, data langsung dimasukkan ke dalam array antrean di memori (`JobQueue`) dan server VPS langsung merespons `202 Accepted` dalam waktu **< 50ms**.
2. *Background Worker* di dalam proses Bun yang sama mengambil pekerjaan dari antrean dengan batas **`MAX_CONCURRENCY = 2`**.
3. Setiap pekerjaan memiliki batas waktu tunggu (*hard timeout*) **15 detik** saat menghubungi 9Router.
4. **Fallback Mutlak:** Jika terjadi *timeout* atau seluruh provider di 9Router gagal, *worker* tetap memperbarui baris laporan di Supabase dengan status `RAW_UNPROCESSED`, menyalin teks asli pelapor ke kolom narasi admin, dan tetap mengirimkan notifikasi email ke petugas agar laporan darurat tidak pernah hilang.

---

## 3. ARSITEKTUR KEAMANAN (CIA TRIAD & OWASP TOP 10)

### 3.1. Implementasi CIA Triad
1. **Confidentiality (Kerahasiaan):**
   - Pemisahan kolom di database: `public_masked_summary` (hanya inisial dan area umum) vs `admin_full_narrative` (nama lengkap dan detail sensitif).
   - Tabel `report_forensics` dan `admin_audit_logs` dikunci dengan *Row Level Security (RLS)* sehingga tidak pernah bisa diakses oleh *client key* anonim.
   - Kunci rahasia (`SUPABASE_SERVICE_ROLE_KEY`, `SHARED_VPS_SECRET`, `ADMIN_ACCESS_CODE_HASH`) hanya tersimpan di *Environment Variables* server.
2. **Integrity (Keutuhan Data):**
   - **Append-Only Audit Log:** Tabel `admin_audit_logs` dilengkapi *PostgreSQL Trigger* yang memblokir operasi `UPDATE` dan `DELETE` di tingkat mesin database.
   - **Verifikasi Bukti Foto:** Hash SHA-256 dari foto asli (sebelum kompresi) dan foto WebP (sesudah kompresi) dicatat di tabel forensik.
3. **Availability (Ketersediaan):**
   - Penggunaan Cloudflare Tunnel menghilangkan kebutuhan membuka port firewall di VPS (hanya port SSH internal jika diperlukan).
   - Layanan di VPS dibungkus dalam `systemd` + `tmux` dengan kebijakan `Restart=always`, serta ZRAM aktif untuk mencegah *Out-Of-Memory (OOM) Killer*.

### 3.2. Kepatuhan OWASP Top 10
- **A01 Broken Access Control:** Middleware Next.js memvalidasi sesi JWT Supabase Auth + klaim verifikasi kode otorisasi admin pada setiap rute `/admin/*` dan `/api/admin/*`.
- **A02 Cryptographic Failures:** Tiket riwayat pelapor menggunakan token acak 128-bit (`crypto.randomBytes(16).toString('hex')`). Database hanya menyimpan hasil `SHA-256` dari token tersebut (`reporter_token_hash`).
- **A03 Injection (SQL & Prompt Injection):** Semua akses DB menggunakan parameter terikat (*prepared statements* via Supabase SDK). Input pelapor yang masuk ke AI diisolasi dalam tag XML `<laporan_mentah>` dengan sistem instruksi anti-pembajakan perintah.
- **A05 Security Misconfiguration:** Header HTTP ketat dipasang di `next.config.mjs` (`X-Frame-Options: DENY`, `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`).