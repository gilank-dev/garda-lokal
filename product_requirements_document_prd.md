# PRODUCT REQUIREMENTS DOCUMENT (PRD)
**Project Name:** GARDA-LOKAL (Platform Pelaporan & Intelijen Kejadian Nasional)
**Document Version:** 1.0.0-ENTERPRISE
**Target Scale:** Seluruh Wilayah Indonesia (Berbasis OpenStreetMap)
**Core Philosophy:** Mobile-First Utility, Asymmetric Pseudonymity, Forensic Accountability, Zero AI Slop.

---

## 1. TUJUAN & KONSEP PRODUK
Membangun platform pelaporan insiden lokal (potensi bentrok/tawuran, perundungan/bullying, dan penyalahgunaan miras/narkoba/obat keras) yang aman, cepat, dan terverifikasi.
- **Asymmetric Pseudonymity:** Identitas pelapor dan nama pihak terkait disamarkan menjadi **Inisial** untuk tampilan publik/riwayat umum, namun **Nama Lengkap, Lokasi Presisi OpenStreetMap, dan Metadata Forensik** ditampilkan secara utuh khusus bagi Admin/Petugas resmi untuk mencegah laporan palsu, fitnah, atau adu domba antar kelompok.
- **Strict Anti-AI-Slop Policy:** Antarmuka pengguna (UI) dilarang menggunakan kata "AI", "Bot", "Asisten Pintar", ikon kilau (*sparkles*), gradasi ungu/neon khas template AI, atau kalimat basa-basi robotik. Sistem harus tampil dan terasa seperti perangkat lunak komando lapangan profesional.

---

## 2. TARGET PENGGUNA & PERAN (ROLES)
1. **Pelapor (Masyarakat / Siswa / Saksi):**
   - Mengakses halaman utama (`/`) tanpa perlu registrasi akun.
   - Memiliki riwayat laporan pribadi yang tersimpan di penyimpanan lokal peramban HP (`localStorage` / `IndexedDB`) menggunakan token kriptografi.
   - Dapat membalas pertanyaan tindak lanjut dari petugas secara dua arah.
2. **Admin / Petugas Resmi (`/admin`):**
   - Masuk menggunakan **Email Khusus Petugas + Password** (Supabase Auth) ditambah verifikasi wajib **Kode Otorisasi Admin (`ADMIN_ACCESS_CODE`)**.
   - Menerima notifikasi instan di layar dashboard HP dan melalui **Email Petugas** saat ada laporan masuk.
   - Melihat detail utuh (nama lengkap, titik koordinat OpenStreetMap, foto bukti, dan metadata EXIF asli).
   - Mengubah status laporan dengan kewajiban mengisi catatan tindakan yang tercatat permanen di log audit (*immutable*).

---

## 3. SPESIFIKASI FITUR & ALUR PENGGUNA (USER FLOWS)

### 3.1. Alur Pelapor (Mobile-First Web - Rute `/`)
1. **Halaman Awal (Home View):**
   - Menampilkan tombol utama berukuran besar dan kontras tinggi: **"+ Buat Laporan Kejadian Baru"**.
   - Menampilkan daftar **"Riwayat Laporan Saya"** di bawah tombol utama. Jika belum ada laporan, tampilkan informasi singkat mengenai keamanan pelaporan.
   - Setiap kartu di "Riwayat Laporan Saya" menampilkan: Kategori, Waktu Lapor, Ringkasan Disamarkan (Inisial), Status Terkini (`DITERIMA`, `SEDANG DICEK`, `BUTUH INFO TAMBAHAN`, `SELESAI`), dan indikator pesan baru jika petugas bertanya.
2. **Formulir Pelaporan (Single-Screen Tactical Form):**
   - **Peta Pinpoint OpenStreetMap:** Peta interaktif menggunakan Leaflet.js. Pengguna dapat menekan tombol *"Gunakan Lokasi Saya"* atau menggeser pin secara manual ke titik kejadian di seluruh Indonesia. Sistem melakukan *reverse geocoding* otomatis (mengambil nama jalan, kelurahan, kecamatan, kota/kabupaten, provinsi).
   - **Kategori Kejadian:** Pilihan cepat (`BENTROK`, `PERUNDUNGAN`, `MIRAS_NARKOBA`, `LAINNYA`).
   - **Status Waktu Kejadian:** Pilihan cepat (`SEDANG BERLANGSUNG`, `RENCANA / AKAN TERJADI`, `SUDAH TERJADI`).
   - **Kronologi Lengkap:** Input teks bagi pelapor untuk menulis detail kejadian, nama pelaku/korban, ciri-ciri fisik, dan patokan lokasi.
   - **Unggah Bukti Foto (Kompresi + Ekstraksi Forensik):**
     - Saat pelapor memilih foto, sistem di *browser* terlebih dahulu mengekstrak seluruh metadata asli (EXIF GPS Latitude/Longitude, Tanggal/Jam Asli Kamera, Merk/Tipe HP, dan Hash SHA-256) ke dalam struktur JSON.
     - Setelah JSON diamankan, foto dikompresi di *browser* menjadi format **WebP (< 80 KB, maks lebar 1280px)** agar ringan saat diunggah dan menghemat ruang database.
3. **Pengiriman & Popup Konfirmasi:**
   - Saat tombol **"Kirim Laporan"** ditekan, data dikirim ke server.
   - Layar menampilkan Popup Modal tegas: **"Laporan Diterima. Data Anda telah masuk ke antrean verifikasi petugas."**
   - Setelah pengguna menutup popup, layar kembali ke Halaman Awal (`/`) dan laporan baru langsung muncul di daftar **"Riwayat Laporan Saya"**.
4. **Tanya-Jawab Lanjutan (Two-Way Clarification):**
   - Jika petugas membutuhkan detail tambahan, pelapor dapat mengetuk item di "Riwayat Laporan Saya" dan membalas pesan petugas pada ruang diskusi tiket tersebut.

---

### 3.2. Alur Dashboard Petugas (Mobile-First Command Center - Rute `/admin`)
1. **Autentikasi Berlapis (`/admin/login`):**
   - Input: `Email Petugas`, `Password`, dan `Kode Otorisasi Admin`.
   - Tidak ada halaman *Sign-Up* publik.
2. **Layar Utama Antrean Insiden (`/admin/dashboard`):**
   - **Realtime Alert Banner:** Peringatan visual dan suara di dashboard saat laporan baru masuk (khususnya jika skor urgensi $\ge 80$ atau berstatus `SEDANG_BERLANGSUNG`).
   - **Filter Cepat:** Filter berdasarkan Status (`BARU`, `DITINDAKLANJUTI`, `SELESAI`, `INDIKASI_PALSU`, `RAW_UNPROCESSED`), Kategori, dan Urutan Prioritas Skor AI.
   - **Indikator Klaster:** Jika ada beberapa laporan di titik yang berdekatan (< 500m dalam 3 jam), kartu menampilkan lencana: **`[KLASTER: X Laporan di Area Ini]`**.
3. **Layar Detail & Forensik Laporan (`/admin/reports/[id]`):**
   - **Pencatatan Baca Otomatis (Auto-Read Audit):** Begitu halaman detail dibuka oleh Admin, sistem wajib mengirim sinyal pencatatan ke tabel `admin_audit_logs` bahwa Admin terkait telah membaca laporan tersebut pada jam presisi.
   - **Panel Informasi Utuh:** Menampilkan narasi lengkap hasil ekstraksi AI beserta teks asli pelapor (Nama Lengkap tidak disensor), skor urgensi, skor kredibilitas, dan analisis potensi kebohongan/fitnah.
   - **Panel Geospasial & Forensik Bukti:**
     - Peta OpenStreetMap titik kejadian dengan tombol **"Buka Navigasi Peta"**.
     - Foto bukti terkompresi beserta tabel **Data Forensik EXIF** (Perbandingan antara titik pin peta vs titik GPS asli kamera foto, waktu pengambilan foto, dan indikator `COCOK` atau `TIDAK COCOK / FOTO LAMA`).
   - **Panel Komunikasi ke Pelapor:** Kolom kirim pesan untuk menanyakan detail tambahan ke pelapor.
   - **Panel Ubah Status (Wajib Catatan):**
     - Pilihan ubah status (`DITINDAKLANJUTI`, `SELESAI`, `INDIKASI_PALSU`).
     - Wajib mengisi kolom **"Catatan Tindakan Petugas"** (minimal 10 karakter).
   - **Riwayat Audit Permanen (Immutable Log View):** Bagian bawah halaman menampilkan daftar kronologis seluruh aktivitas petugas pada laporan tersebut (Siapa yang membaca, siapa yang mengubah status, catatan yang ditulis, dan waktu presisi). Data ini tidak memiliki tombol hapus atau edit.

---

## 4. PEDOMAN DESAIN VISUAL (UI/UX DESIGN TOKENS)
- **Layout:** Mobile-First (`max-w-md` terpusat di layar desktop, *full-width* responsif di layar HP, dan tampilan *grid* melebar khusus untuk `/admin` jika dibuka di layar monitor/tablet).
- **Palet Warna (Tactical High-Contrast):**
  - Background Utama: `#0B0F17` (Slate Obsidian) atau Mode Terang Lapangan `#F8FAFC` dengan kontras teks tinggi.
  - Surface / Card: `#111827` dengan border tegas `1px solid #1F2937`.
  - Teks Utama: `#F9FAFB`. Teks Sekunder: `#9CA3AF`.
  - Warna Status Darurat / Bentrok: `#DC2626` (Merah Tegas).
  - Warna Status Peringatan / Perundungan / Miras: `#D97706` (Amber).
  - Warna Status Terverifikasi / Selesai: `#059669` (Hijau).
- **Tipografi:**
  - UI & Narasi: `Inter` atau `Plus Jakarta Sans` (mudah dibaca di layar HP kecil).
  - Data Koordinat, Hash, Log Audit & Skor: `JetBrains Mono` (Monospace).