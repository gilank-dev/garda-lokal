# Findings & Decisions: GARDA-LOKAL / PAI (Platform Anonim Insiden)

## Requirements & Constraints
- **Scope Dokumen:**
  - `product_requirements_document_prd.md`: Asymmetric Pseudonymity (Inisial untuk publik vs Nama Lengkap & Forensik untuk Admin), Zero AI Slop (larangan istilah bot/sparkles/gradasi ungu), Mobile-first tactical UI, OpenStreetMap Leaflet + reverse geocoding, EXIF metadata extraction + Canvas WebP compression (<80KB), two-way discussion ticket, command center `/admin` with immutable audit logs and cluster detection (<500m & 3 jam).
  - `system_architecture_security_specification.md`: Vercel (Next.js) <-> Cloudflare Tunnel <-> VPS (Queue Worker + 9Router) <-> Supabase (PostgreSQL + RLS + Triggers) + Resend. HMAC-SHA256 signature verification (`X-Garda-Signature` + `X-Garda-Timestamp`), in-memory rate limit (3 req/IP/min), FIFO Queue (concurrency 2, timeout 15s, zero-crash fallback to `RAW_UNPROCESSED`).
  - `database_schema_audit_triggers_supabase_sql.md`: Enum types, `reports`, `report_forensics`, `report_messages`, `admin_audit_logs`, trigger `trg_immutable_audit_logs` (blocking UPDATE/DELETE), Haversine RPC function `find_nearby_active_cluster`, RLS policies, private bucket `evidence-vault`.
  - `ai_harness_9router_combo_prompt_engineering_spec.md`: Zod schema `GardaIntelligenceSchema`, 9Router Combo model `garda-intel-combo`, Master System Prompt (guardrails, dialect & slang translation: sajam, miras, perundungan, credibility check).
  - `vps_1gb_3gb_bare_metal_setup_tmux_runbook.md`: Bare-metal hardware budget, lightweight services.
  - `autonomous_ai_agent_execution_plan.md`: 4-phase master roadmap.

- **Koneksi SSH & Target VPS:**
  - Host: `5.22.209.52`
  - Port: `22`
  - Username: `tugasagama`
  - Password: `tugaspai`
  - Quota: **Limit 3,000,000,000 bytes (~3 GB / 2.79 GiB)**

## Research Findings (Live Remote Inspection)
- **Konektivitas SSH:** Berhasil terkoneksi secara langsung melalui Python Paramiko.
- **Sistem Operasi:** `CentOS Stream 9` (Kernel `5.14.0-731.el9.x86_64`, `glibc 2.34`).
- **Hak Akses User:** User `tugasagama` **TIDAK memiliki izin `sudo`** (`user tugasagama may not run sudo on vpsgo`).
- **Binary Pre-installed di VPS:**
  - `node`: **v22.23.2** (Sudah terpasang system-wide)
  - `npm`: **10.9.8**
  - `python3`: **3.9.25**
  - `git`, `curl`, `tar`: Tersedia
  - `tmux`: Belum ada di `/usr/bin/tmux`, namun user-space daemon / background script / systemd user session tersedia.
- **Systemd User Session:** `systemd --user` aktif berjalan untuk UID `tugasagama`.
- **9Router Status:** **SUDAH AKTIF BERJALAN di `127.0.0.1:20128`** oleh user `lzmedia`.
  - Endpoint `http://127.0.0.1:20128/` mengembalikan `HTTP/1.1 307 Temporary Redirect` ke `/dashboard`.
  - Endpoint `http://127.0.0.1:20128/v1/models` aktif dan menyediakan model AI (Gemini 3.1, DeepSeek V4.1 Flash, GLM-5.3 Flash, Mistral Large, dll).
- **Penggunaan Storage Saat Ini:** `/home/tugasagama` hanya terpakai **24 KB** dari batas kuota 3,000,000,000 byte.

## Technical Decisions
| Keputusan | Rasional & Adaptasi Lingkungan |
|-----------|--------------------------------|
| **User-Space Deployment (No Sudo)** | Karena `tugasagama` tidak punya hak `sudo`, seluruh instalasi paket worker (`hono`/`express`, `@supabase/supabase-js`, `@ai-sdk/openai`, `zod`) dipasang di direktori lokal `$HOME/garda-vps` menggunakan `npm` atau `bun` lokal. Tidak menyentuh `/etc/` atau `/opt/`. |
| **Gunakan Node.js v22 yang Sudah Ada** | Node.js 22 sudah terpasang rapi di VPS. Kita dapat menjalankan Hono/Node HTTP server atau memasang Bun di user-space `$HOME/.bun`. Node.js 22 native fetch + crypto HMAC sangat stabil dan hemat memori (<40MB RSS). |
| **Integrasi Langsung ke 9Router Port 20128** | 9Router sudah aktif di VPS pada port 20128. Worker VPS tinggal mengirim payload ke `http://127.0.0.1:20128/v1/chat/completions` menggunakan model combo yang tersedia tanpa perlu menginstal ulang 9Router dari awal. |
| **Jaga Kuota Disk < 3,000,000,000 Byte** | Proyek worker di VPS hanya memerlukan `node_modules` minimal (~40 MB) atau single bundled binary (~15 MB via esbuild/ncc), jauh di bawah batas kuota 3 GB (hanya ~1.5% dari kuota). |
| **Persistensi Worker via Systemd User atau PM2/Nohup/Disown** | Karena `systemd --user` aktif untuk `tugasagama`, worker dapat didaftarkan sebagai `~/.config/systemd/user/garda-worker.service` atau dijalankan dengan background daemon hemat memori. |

## Issues & Resolutions Encountered
| Masalah | Solusi / Resolusi |
|---------|-------------------|
| Runbook `setup-vps.sh` menggunakan `apt-get` dan `sudo` | Diganti dengan User-Space Provisioning Script khusus `tugasagama` tanpa sudo. |
| Script runbook mencoba membuat `/opt/garda-vps` | Dipindahkan ke `/home/tugasagama/garda-vps` yang memiliki hak tulis penuh. |
| Tmux tidak terpasang di sistem | Gunakan daemon `systemd --user` atau Node cluster / detached process dengan logging ke file log berotasi. |
