-- ==============================================================================
-- GARDA-LOKAL / PAI (Platform Pelaporan & Intelijen Kejadian Nasional)
-- Realistic Indonesian Seed Data for Supabase PostgreSQL
-- ==============================================================================

-- Nonaktifkan trigger immutable audit log sementara selama proses seeding
ALTER TABLE IF EXISTS public.admin_audit_logs DISABLE TRIGGER trg_immutable_audit_logs;

-- Bersihkan data sebelumnya (idempotent reset)
DELETE FROM public.report_messages;
DELETE FROM public.admin_audit_logs;
DELETE FROM public.report_forensics;
DELETE FROM public.reports;

-- ==============================================================================
-- 1. SEED REPORTS
-- ==============================================================================

-- 1A. Jakarta Timur (Otista Raya, Jatinegara) - BENTROK (Klaster Induk)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-4111-8111-111111111111',
  NULL,
  '6581f0792dd687a6266669d41e36fa814e2f96df7381d731b92002ddf7174d43',
  'BENTROK',
  'SEDANG_BERLANGSUNG',
  'DITINDAKLANJUTI',
  94,
  90,
  FALSE,
  NULL,
  'Tawuran pecah antar dua kelompok warga membawa senjata tajam celurit panjang dan lemparan molotov di perempatan Otista Raya dekat halte Bidara Cina. Lalu lintas dua arah macet total, warga ketakutan dan ruko-ruko buru-buru tutup.',
  'Bentrokan bersenjata tajam dilaporkan di kawasan Otista Raya, Jatinegara. Petugas kepolisian telah dikerahkan ke lokasi untuk pengendalian massa dan sterilisasi jalan raya.',
  'Terjadi bentrok fisik terbuka antara kelompok pemuda RW 04 dan RW 07 Bidara Cina. Saksi di lokasi merekam penggunaan celurit panjang, molotov botol sirup, dan kembang api diarahkan ke perumahan warga. Korban luka 1 orang terkena serpihan kaca di bagian pelipis. Regu Tim Patroli Perintis Presisi Polres Metro Jakarta Timur sedang meluncur ke TKP.',
  '{
    "involved_persons_full_names": ["Kelompok Pemuda RW 04", "Kelompok Pemuda RW 07 Bidara Cina"],
    "weapons_or_substances": ["Celurit Panjang Corbek", "Bom Molotov", "Petasan Kembang Api Torpedo", "Batu Kali"],
    "specific_landmarks": ["Halte TransJakarta Bidara Cina", "Perempatan Jl. Otista Raya"],
    "estimated_headcount": "35 - 50 orang"
  }'::jsonb,
  'Kirim 2 unit Rantis Water Cannon dan 3 regu Tim Patroli Perintis Presisi bermotor trail. Lakukan penutupan arus lalu lintas dari arah Kampung Melayu menuju Cawang. Amankan perimeter gang pemukiman warga.',
  -6.238200,
  106.868500,
  'Jl. Otista Raya No. 45',
  'Bidara Cina',
  'Jatinegara',
  'Jakarta Timur',
  'DKI Jakarta',
  'Dekat Halte TransJakarta Bidara Cina',
  2,
  NOW() - INTERVAL '45 minutes',
  NOW() - INTERVAL '15 minutes'
);

-- 1B. Jakarta Timur (Otista III) - BENTROK (Klaster Turunan <210m dari 1A)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-4111-8111-222222222222',
  '11111111-1111-4111-8111-111111111111',
  '8aee8637021b4d09a3aee6783cbd648be99cb02c93800c70819bb20a8d71602f',
  'BENTROK',
  'SEDANG_BERLANGSUNG',
  'DITINDAKLANJUTI',
  88,
  85,
  FALSE,
  NULL,
  'Massa tawuran yang dari Otista Raya berlari kocar-kacir masuk ke gang Otista III sambil melempar batu ke pos kamling dan rumah penduduk. Kaca jendela pos kamling hancur.',
  'Kelompok massa bentrokan terpecah ke area permukiman Otista III. Tim patroli bermotor sedang melakukan penyisiran ke dalam gang.',
  'Pelarian massa bentrokan dari TKP Otista Raya menuju jalur tembusan pemukiman Otista 3 Cipinang Cempedak. Terjadi kerusakan pos ronda RT 05. Pelapor bersembunyi di lantai dua rumah.',
  '{
    "involved_persons_full_names": ["Massa Bentrok Pecahan Otista"],
    "weapons_or_substances": ["Pecahan Batu Konblok", "Kayu Balok", "Pisau Dapur"],
    "specific_landmarks": ["Pos Kamling RT 05 / RW 02", "Gang Masuk Otista III"],
    "estimated_headcount": "15 - 20 orang"
  }'::jsonb,
  'Kerahkan personel bermotor trail untuk menyekat gang sempit tembusan Cipinang Kebembem agar massa tidak masuk lebih dalam ke kawasan perumahan padat.',
  -6.239600,
  106.869700,
  'Jl. Otista III No. 12',
  'Cipinang Cempedak',
  'Jatinegara',
  'Jakarta Timur',
  'DKI Jakarta',
  'Pos Kamling RT 05 Otista 3',
  1,
  NOW() - INTERVAL '30 minutes',
  NOW() - INTERVAL '10 minutes'
);

-- 1C. Jakarta Selatan (Underpass Manggarai) - BENTROK
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '11111111-1111-4111-8111-333333333333',
  NULL,
  '600d5bd2fd7fb8a065d8f5a05c1239deab44306f14e306858eb99628a5ae0d5b',
  'BENTROK',
  'SEDANG_BERLANGSUNG',
  'BARU',
  95,
  92,
  FALSE,
  NULL,
  'Tawuran Underpass Manggarai pecah kembali malam ini. Anak-anak remaja bawa senjata tajam celurit bebek dan petasan kembang api saling tembak di kolong jembatan. Pengendara motor dan mobil terjebak dan putar balik lawan arah.',
  'Bentrokan remaja dilaporkan di Underpass Manggarai. Warga dan pengguna jalan diimbau menghindari jalur Jl. Sultan Agung.',
  'Bentrokan antarkelompok pemuda Tambak dan Manggarai pecah di kolong terowongan Stasiun Manggarai. Saling serang menggunakan petasan tembak dan celurit bebek modifikasi. Jalur utama penghubung Matraman - Tebet terputus total.',
  '{
    "involved_persons_full_names": ["Geng Pemuda Tambak Bawah", "Geng Remaja RW Manggarai"],
    "weapons_or_substances": ["Celurit Bebek Corbek", "Kembang Api Roman Candle", "Botol Kaca Berisi Pasir"],
    "specific_landmarks": ["Underpass Kolong Stasiun Manggarai", "Pintu Masuk Terowongan Sultan Agung"],
    "estimated_headcount": "50 - 70 orang"
  }'::jsonb,
  'Penyekatan darurat di pertigaan Jl. Tambak dan Minangkabau. Tembakkan gas air mata untuk memecah konsentrasi massa di kolong jembatan. Evakuasi kendaraan sipil yang terjebak di tengah underpass.',
  -6.208800,
  106.848200,
  'Jl. Sultan Agung Underpass',
  'Manggarai',
  'Tebet',
  'Jakarta Selatan',
  'DKI Jakarta',
  'Underpass Stasiun Manggarai Kolong Jembatan',
  1,
  NOW() - INTERVAL '15 minutes',
  NOW() - INTERVAL '15 minutes'
);

-- 2A. Bandung (Coblong, Taman Ganesha) - PERUNDUNGAN (Bukti Foto Konsisten)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-4222-8222-111111111111',
  NULL,
  'ba294aa117db6bae7f94af6bf3316ac3291e318e2dbe1f51126639fb64e5c617',
  'PERUNDUNGAN',
  'KEJADIAN_LAMPAU',
  'DITINDAKLANJUTI',
  80,
  95,
  FALSE,
  NULL,
  'Saya menyaksikan dan sempat memfoto aksi perundungan fisik terhadap siswa adik kelas SMP oleh 4 pelajar berseragam SMA di belakang halte Taman Ganesha sore tadi. Korban ditendang, dipaksa mencium sepatu, dan uang sakunya diambil paksa.',
  'Laporan dugaan tindak kekerasan dan perundungan terhadap pelajar di Coblong, Bandung. Bukti foto dan identitas seragam pelaku telah diamankan serta dikoordinasikan dengan Satgas Pencegahan Kekerasan Sekolah.',
  'Pelapor melampirkan bukti foto digital beresolusi tinggi dengan metadata EXIF kamera Xiaomi Redmi Note 11 yang cocok dengan lokasi Taman Ganesha. Korban berinisial D.P. (13 thn, SMPN 7 Bandung) mengalami luka lebam di lengan dan trauma psikis. Terduga pelaku utama berinisial R.M. dan F.K. dari SMA swasta di Dago.',
  '{
    "involved_persons_full_names": ["Doni Pratama (Korban Siswa SMP)", "Rizki Maulana (Terduga Pelaku SMA)", "Farhan Kurnia (Terduga Pelaku SMA)"],
    "weapons_or_substances": ["Kekerasan Fisik Tangan Kosong / Tendangan Sepatu"],
    "specific_landmarks": ["Belakang Halte Bus Taman Ganesha", "Kantin Kejujuran Belakang Siliwangi"],
    "estimated_headcount": "4 pelaku, 1 korban"
  }'::jsonb,
  'Koordinasikan penanganan bersama Unit Pelayanan Perempuan dan Anak (PPA) Satreskrim Polrestabes Bandung dan Dinas Pendidikan Kota Bandung. Dampingi korban untuk visum et repertum di RS Borromeus.',
  -6.892400,
  107.610800,
  'Jl. Ganesa No. 10',
  'Lebak Siliwangi',
  'Coblong',
  'Kota Bandung',
  'Jawa Barat',
  'Taman Ganesha Dekat Gerbang Utama Kampus',
  1,
  NOW() - INTERVAL '2 hours',
  NOW() - INTERVAL '35 minutes'
);

-- 2B. Bandung (Sukajadi, Dekat PVJ) - PERUNDUNGAN (Rencana Mendatang)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  NULL,
  '970d3ab7251d5d69801350146135249316713b61e38d38b8fb1b9ec815829274',
  'PERUNDUNGAN',
  'RENCANA_MENDATANG',
  'BUTUH_INFO_PELAPOR',
  82,
  78,
  FALSE,
  NULL,
  'Ada obrolan di grup WA perkumpulan motor sekolah yang merencanakan penghadangan dan pemukulan terhadap anak baru pindahan besok sore jam 16.30 di ruko kosong samping Paris Van Java Sukajadi.',
  'Informasi rencana pencegatan dan tindak kekerasan antarpelajar di Sukajadi. Tindakan preventif pengawasan patroli telah dijadwalkan oleh Binmas.',
  'Laporan rencana intimidasi terorganisir melibatkan sekitar 8 sampai 10 siswa yang menargetkan seorang siswa pindahan berinisial D. Lokasi target adalah deretan ruko kosong seberang PVJ yang sering dijadikan tempat nongkrong tanpa izin.',
  '{
    "involved_persons_full_names": ["Dimas (Siswa Sasaran)", "Kelompok Remaja Barudak Sukajadi"],
    "weapons_or_substances": ["Rencana Pengeroyokan", "Tali Sabuk Gesper Logam"],
    "specific_landmarks": ["Ruko Kosong Samping PVJ", "Jl. Sukajadi Bawah"],
    "estimated_headcount": "8 - 10 orang siswa"
  }'::jsonb,
  'Instruksikan Bhabinkamtibmas dan Babinsa Sukajadi melakukan pos pantau stasioner di area ruko kosong mulai pukul 16.00 WIB guna sterilisasi dan pencegahan tindak pidana.',
  -6.886300,
  107.595800,
  'Jl. Sukajadi No. 137',
  'Pasteur',
  'Sukajadi',
  'Kota Bandung',
  'Jawa Barat',
  'Ruko Kosong Samping Paris Van Java Mall',
  1,
  NOW() - INTERVAL '3 hours',
  NOW() - INTERVAL '1 hour'
);

-- 3A. Surabaya (Kenjeran, Bulak) - MIRAS_NARKOBA (Pesta Miras Cukrik & Gangguan)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-4333-8333-111111111111',
  NULL,
  '20876177d1840b7afbc320aa472362be4f026d0fbe4dcf6636e5d0c130fb4de6',
  'MIRAS_NARKOBA',
  'SEDANG_BERLANGSUNG',
  'BARU',
  86,
  89,
  FALSE,
  NULL,
  'Pesta miras oplosan jenis cukrik di gubuk bambu pinggir pantai Kenjeran dekat pintu air. Sekitar 12 pemuda mabuk berat, menyetel musik keras-keras, dan mulai menggoda serta melempar botol ke pengendara motor yang melintas.',
  'Gangguan ketertiban akibat pesta minuman keras beralkohol oplosan di kawasan pesisir Kenjeran, Surabaya. Patroli Samapta telah dihubungi untuk penertiban.',
  'Aktivitas konsumsi miras oplosan ilegal cukrik di gazebo pesisir Kenjeran Lama. Massa pemuda dalam kondisi hilang kendali kesadaran dan mengancam kenyamanan warga nelayan sekitar. Dikhawatirkan terjadi keracunan metanol oplosan.',
  '{
    "involved_persons_full_names": ["Gerombolan Pemuda Mabuk Pesisir Bulak"],
    "weapons_or_substances": ["Miras Oplosan Cukrik", "Botol Kaca Bir Bekas", "Kayu Balok"],
    "specific_landmarks": ["Pintu Air Kenjeran Lama", "Taman Hiburan Pantai Ria Kenjeran"],
    "estimated_headcount": "10 - 14 orang"
  }'::jsonb,
  'Patroli Gabungan Polsek Kenjeran bersama Satpol PP Kecamatan Bulak. Lakukan razia dan sita jeriken sisa miras cukrik serta amankan pemuda ke kantor untuk pembinaan.',
  -7.241500,
  112.798200,
  'Jl. Sukolilo No. 100',
  'Sukolilo Baru',
  'Bulak',
  'Kota Surabaya',
  'Jawa Timur',
  'Gazebo Pesisir Pantai Kenjeran Lama Dekat Pintu Air',
  1,
  NOW() - INTERVAL '50 minutes',
  NOW() - INTERVAL '50 minutes'
);

-- 3B. Medan (Belawan, Bagan Deli) - MIRAS_NARKOBA (Peredaran Dermaga Nelayan)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '33333333-3333-4333-8333-222222222222',
  NULL,
  'e14af7b2277d7ea1dc084daeaab8273956bb517c7a732460e11f922f2cefc903',
  'MIRAS_NARKOBA',
  'SEDANG_BERLANGSUNG',
  'DITINDAKLANJUTI',
  91,
  90,
  FALSE,
  NULL,
  'Ada transaksi peredaran narkoba jenis sabu paket hemat dan tuak nias keras di lorong dekat dermaga kapal nelayan Belawan. Pengedar menyelipkan pisau badik di pinggang celana.',
  'Laporan dugaan peredaran zat narkotika terlarang di area pelabuhan Belawan, Medan. Informasi telah diteruskan ke Satres Narkoba Polres Pelabuhan Belawan.',
  'Aktivitas transaksi narkotika jenis metamfetamina (sabu) paket kecil di Lorong Melati, Bagan Deli. Terduga pengedar utama berinisial B.M. alias Ucok Belawan yang merupakan residivis kasus serupa. Transaksi memanfaatkan lalu-lalang nelayan bongkar muat ikan.',
  '{
    "involved_persons_full_names": ["Baharudin Manurung alias Ucok Belawan", "Jaringan Pengedar Lorong Melati"],
    "weapons_or_substances": ["Narkotika Golongan I Metamfetamina (Sabu)", "Pisau Badik Tajam", "Tuak Nias Oplosan"],
    "specific_landmarks": ["Lorong Melati Bagan Deli", "Gudang Ikan Asin Belawan"],
    "estimated_headcount": "5 - 8 orang"
  }'::jsonb,
  'Operasi senyap tim Opsnal Resnarkoba Polres Pelabuhan Belawan dibantu personel Satpolairud. Gunakan pelindung rompi anti-tusuk mengingat target membawa senjata tajam terselip.',
  3.782500,
  98.687400,
  'Jl. Pelabuhan Raya No. 8',
  'Bagan Deli',
  'Medan Belawan',
  'Kota Medan',
  'Sumatera Utara',
  'Dermaga Tambat Kapal Nelayan Belawan Lorong Melati',
  1,
  NOW() - INTERVAL '1 hour 20 minutes',
  NOW() - INTERVAL '25 minutes'
);

-- 4A. Bandung Timur (Buahbatu / Bypass Soekarno Hatta) - LAINNYA (Geng Motor Knalpot Brong & Sajam)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-8444-111111111111',
  NULL,
  'b41470821cb0fc31163e0794c448a2fc9bee7700325dac3f3b570bd371c9f7e6',
  'LAINNYA',
  'SEDANG_BERLANGSUNG',
  'BARU',
  90,
  91,
  FALSE,
  NULL,
  'Konvoi arak-arakan geng motor sekitar 30 sepeda motor memblokir jalur cepat bypass Soekarno Hatta arah Cibiru. Mereka menggeber knalpot brong, mengibarkan bendera hitam, dan mengacungkan senjata tajam samurai ke arah pengendara lain.',
  'Aksi konvoi gerombolan motor meresahkan pengguna jalan raya di jalur bypass Soekarno-Hatta. Tim Raimas dan Patroli Reskrim sedang melakukan pencegatan.',
  'Aksi konvoi liar puluhan motor berknalpot tidak standar tanpa helm melintasi jalur cepat Soekarno-Hatta depan Metro Indah Mall. Laporan dari ojol menyebut mereka sempat menendang spion mobil pick-up yang tidak memberi jalan.',
  '{
    "involved_persons_full_names": ["Gerombolan Konvoi Geng Motor Liar"],
    "weapons_or_substances": ["Pedang Katana Samurai", "Gir Motor Bertali Sabuk", "Knalpot Brong Bising"],
    "specific_landmarks": ["Depan Mall MIM Metro Indah Mall", "Underpass Buahbatu Bypass"],
    "estimated_headcount": "45 - 60 orang (30 unit sepeda motor)"
  }'::jsonb,
  'Pencegatan dan barikade di perempatan Simpang Lima Kiaracondong dan Bundaran Cibiru oleh Tim Prabu Lodaya. Tindak tegas pelanggaran senjata tajam sesuai UU Darurat No. 12 Tahun 1951.',
  -6.948200,
  107.652100,
  'Jl. Soekarno Hatta No. 590',
  'Sekejati',
  'Buahbatu',
  'Kota Bandung',
  'Jawa Barat',
  'Jalur Cepat Bypass Depan Metro Indah Mall (MIM)',
  1,
  NOW() - INTERVAL '20 minutes',
  NOW() - INTERVAL '20 minutes'
);

-- 4B. Jakarta Barat (Daan Mogot, Cengkareng) - LAINNYA (Penertiban Geng Motor - SELESAI)
INSERT INTO public.reports (
  id,
  cluster_parent_id,
  reporter_token_hash,
  category,
  temporal_context,
  status,
  urgency_score,
  credibility_score,
  is_potential_hoax,
  hoax_reason,
  raw_reporter_input,
  public_masked_summary,
  admin_full_narrative,
  extracted_entities,
  tactical_recommendation,
  latitude,
  longitude,
  address_road,
  address_subdistrict,
  address_district,
  address_city,
  address_province,
  location_landmark,
  cluster_count,
  created_at,
  updated_at
) VALUES (
  '44444444-4444-4444-8444-222222222222',
  NULL,
  'c6ccd6188eecc5b3a16b6f192ae2940d5646bc9cb3a396f1c9d153d935347319',
  'LAINNYA',
  'KEJADIAN_LAMPAU',
  'SELESAI',
  65,
  95,
  FALSE,
  NULL,
  'Kerumunan pemuda bermotor kumpul di warung remang Daan Mogot membawa botol miras dan stik golf siap tawuran dini hari.',
  'Penertiban kerumunan pemuda bermotor di Jl. Daan Mogot Km 11 telah berhasil diselesaikan oleh Polsek Cengkareng. Situasi kondusif.',
  'Operasi cipta kondisi gabungan Polsek Cengkareng membubarkan kerumunan 20 orang pemuda. Lima unit sepeda motor tanpa surat-surat resmi disita ke kantor polisi.',
  '{
    "involved_persons_full_names": ["Kelompok Pemuda Daan Mogot"],
    "weapons_or_substances": ["Stik Golf Logam", "Botol Kaca Minuman Keras", "Balok Kayu"],
    "specific_landmarks": ["Halte Jembatan Gantung Daan Mogot", "Warung Pinggir Jalan Km 11"],
    "estimated_headcount": "20 orang"
  }'::jsonb,
  'Kasus selesai ditangani. Lakukan patroli berkala di sepanjang Daan Mogot pada jam rawan 01.00 - 04.30 WIB.',
  -6.152800,
  106.745500,
  'Jl. Daan Mogot Km 11',
  'Kedaung Kali Angke',
  'Cengkareng',
  'Jakarta Barat',
  'DKI Jakarta',
  'Dekat Halte Jembatan Gantung Daan Mogot',
  1,
  NOW() - INTERVAL '5 hours',
  NOW() - INTERVAL '1 hour'
);

-- ==============================================================================
-- 2. SEED FORENSIK PERANGKAT & KAMERA ASLI (report_forensics)
-- ==============================================================================

-- Forensik 1A: Otista (Samsung Galaxy S23 Ultra)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '11111111-2222-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '180.252.164.22',
  'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.113 Mobile Safari/537.36',
  'Android',
  'evidence-vault/11111111-1111-4111-8111-111111111111/evidence_otista_s23.webp',
  'a3f8b03e4d9c721980af4a03c0e12d456789abcdef0123456789abcdef012345',
  'b2e7c91d3e8b610879fe3b92b9d01c3456789abcdef0123456789abcdef01234',
  '{
    "Make": "Samsung",
    "Model": "Galaxy S23 Ultra (SM-S918B)",
    "Software": "S918BXXU3BWJM",
    "DateTimeOriginal": "2026-10-14 20:15:30",
    "ExposureTime": "1/120s",
    "FNumber": 1.7,
    "ISOSpeedRatings": 400,
    "FocalLength": "6.3mm",
    "Flash": "Flash did not fire",
    "ColorSpace": "sRGB",
    "GPSLatitude": -6.238150,
    "GPSLongitude": 106.868450,
    "GPSAltitude": "18.5m"
  }'::jsonb,
  -6.238150,
  106.868450,
  NOW() - INTERVAL '47 minutes',
  7.4,
  TRUE,
  NULL,
  NOW() - INTERVAL '45 minutes'
);

-- Forensik 1B: Otista III (Apple iPhone 14 Pro)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '11111111-2222-4111-8111-222222222222',
  '11111111-1111-4111-8111-222222222222',
  '114.124.201.89',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
  'iOS',
  'evidence-vault/11111111-1111-4111-8111-222222222222/evidence_otista3_iphone14.webp',
  'c4a9d12e5f0a832091ba5b14d1f23e567890bcdef1234567890bcdef123456',
  'd5b0e23f6a1b943102cb6c25e2a34f678901cdef2345678901cdef234567',
  '{
    "Make": "Apple",
    "Model": "iPhone 14 Pro (A2890)",
    "Software": "iOS 17.5.1",
    "DateTimeOriginal": "2026-10-14 20:30:12",
    "ExposureTime": "1/60s",
    "FNumber": 1.78,
    "ISOSpeedRatings": 500,
    "FocalLength": "6.86mm",
    "LensModel": "iPhone 14 Pro back triple camera 6.86mm f/1.78",
    "GPSLatitude": -6.239550,
    "GPSLongitude": 106.869650,
    "GPSAltitude": "21.0m"
  }'::jsonb,
  -6.239550,
  106.869650,
  NOW() - INTERVAL '32 minutes',
  7.8,
  TRUE,
  NULL,
  NOW() - INTERVAL '30 minutes'
);

-- Forensik 1C: Manggarai (Xiaomi 13T)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '11111111-2222-4111-8111-333333333333',
  '11111111-1111-4111-8111-333333333333',
  '36.85.120.44',
  'Mozilla/5.0 (Linux; Android 14; 2306EPN60G Build/UKQ1.230804.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.72 Mobile Safari/537.36',
  'Android',
  'evidence-vault/11111111-1111-4111-8111-333333333333/evidence_manggarai_xiaomi13t.webp',
  'e6c1f34a7b2c054213dc7d36f3b45a789012def0123456789012def012345',
  'f7d2a45b8c3d165324ed8e47a4c56b890123ef1234567890123ef123456',
  '{
    "Make": "Xiaomi",
    "Model": "Xiaomi 13T (2306EPN60G)",
    "Software": "HyperOS 1.0.4.0.UMFEUXM",
    "DateTimeOriginal": "2026-10-14 20:45:00",
    "ExposureTime": "1/40s",
    "FNumber": 1.9,
    "ISOSpeedRatings": 800,
    "FocalLength": "5.54mm",
    "LensMake": "Leica Vario-Summicron 1:1.9-2.2/15-50 ASPH",
    "GPSLatitude": -6.208750,
    "GPSLongitude": 106.848150
  }'::jsonb,
  -6.208750,
  106.848150,
  NOW() - INTERVAL '17 minutes',
  7.7,
  TRUE,
  NULL,
  NOW() - INTERVAL '15 minutes'
);

-- Forensik 2A: Bandung Coblong (Xiaomi Redmi Note 11)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '22222222-2222-4222-8222-111111111111',
  '22222222-2222-4222-8222-111111111111',
  '103.247.22.15',
  'Mozilla/5.0 (Linux; Android 13; 2201117TY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
  'Android',
  'evidence-vault/22222222-2222-4222-8222-111111111111/evidence_ganesha_redmi11.webp',
  '01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
  '12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
  '{
    "Make": "Xiaomi",
    "Model": "Redmi Note 11 (2201117TY)",
    "Software": "MIUI 14.0.5",
    "DateTimeOriginal": "2026-10-14 18:25:10",
    "ExposureTime": "1/100s",
    "FNumber": 1.8,
    "ISOSpeedRatings": 125,
    "FocalLength": "4.26mm",
    "GPSLatitude": -6.892380,
    "GPSLongitude": 107.610780
  }'::jsonb,
  -6.892380,
  107.610780,
  NOW() - INTERVAL '2 hours 5 minutes',
  3.1,
  TRUE,
  NULL,
  NOW() - INTERVAL '2 hours'
);

-- Forensik 2B: Bandung Sukajadi (Samsung Galaxy A54 5G)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '22222222-2222-4222-8222-222222222222',
  '22222222-2222-4222-8222-222222222222',
  '182.1.84.103',
  'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36',
  'Android',
  'evidence-vault/22222222-2222-4222-8222-222222222222/evidence_sukajadi_a54.webp',
  '23c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
  '34d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
  '{
    "Make": "Samsung",
    "Model": "Galaxy A54 5G (SM-A546E)",
    "Software": "A546EXXU6BXB4",
    "DateTimeOriginal": "2026-10-14 17:15:00",
    "ExposureTime": "1/200s",
    "FNumber": 1.8,
    "ISOSpeedRatings": 50,
    "FocalLength": "5.54mm",
    "GPSLatitude": -6.886250,
    "GPSLongitude": 107.595720
  }'::jsonb,
  -6.886250,
  107.595720,
  NOW() - INTERVAL '3 hours 10 minutes',
  11.2,
  TRUE,
  NULL,
  NOW() - INTERVAL '3 hours'
);

-- Forensik 3A: Surabaya Kenjeran (Apple iPhone 13)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '33333333-2222-4333-8333-111111111111',
  '33333333-3333-4333-8333-111111111111',
  '110.138.89.51',
  'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
  'iOS',
  'evidence-vault/33333333-3333-4333-8333-111111111111/evidence_kenjeran_iphone13.webp',
  '45e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
  '56f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
  '{
    "Make": "Apple",
    "Model": "iPhone 13 (A2633)",
    "Software": "iOS 17.4.1",
    "DateTimeOriginal": "2026-10-14 20:10:05",
    "ExposureTime": "1/30s",
    "FNumber": 1.6,
    "ISOSpeedRatings": 640,
    "FocalLength": "5.1mm",
    "GPSLatitude": -7.241470,
    "GPSLongitude": 112.798160
  }'::jsonb,
  -7.241470,
  112.798160,
  NOW() - INTERVAL '52 minutes',
  5.6,
  TRUE,
  NULL,
  NOW() - INTERVAL '50 minutes'
);

-- Forensik 3B: Medan Belawan (Samsung Galaxy S22)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '33333333-2222-4333-8333-222222222222',
  '33333333-3333-4333-8333-222222222222',
  '180.246.60.11',
  'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
  'Android',
  'evidence-vault/33333333-3333-4333-8333-222222222222/evidence_belawan_s22.webp',
  '67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7',
  '78b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
  '{
    "Make": "Samsung",
    "Model": "Galaxy S22 (SM-S901B)",
    "Software": "S901BXXS7DXD1",
    "DateTimeOriginal": "2026-10-14 19:38:22",
    "ExposureTime": "1/50s",
    "FNumber": 1.8,
    "ISOSpeedRatings": 320,
    "FocalLength": "5.4mm",
    "GPSLatitude": 3.782470,
    "GPSLongitude": 98.687380
  }'::jsonb,
  3.782470,
  98.687380,
  NOW() - INTERVAL '1 hour 23 minutes',
  4.2,
  TRUE,
  NULL,
  NOW() - INTERVAL '1 hour 20 minutes'
);

-- Forensik 4A: Bandung Timur Geng Motor (Xiaomi POCO X5 Pro)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '44444444-2222-4444-8444-111111111111',
  '44444444-4444-4444-8444-111111111111',
  '114.79.45.198',
  'Mozilla/5.0 (Linux; Android 13; 22101320G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36',
  'Android',
  'evidence-vault/44444444-4444-4444-8444-111111111111/evidence_bypass_pocox5.webp',
  '89c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
  '90d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0',
  '{
    "Make": "Xiaomi",
    "Model": "POCO X5 Pro 5G (22101320G)",
    "Software": "MIUI 14.0.3",
    "DateTimeOriginal": "2026-10-14 20:38:15",
    "ExposureTime": "1/25s",
    "FNumber": 1.9,
    "ISOSpeedRatings": 1000,
    "FocalLength": "5.89mm",
    "GPSLatitude": -6.948150,
    "GPSLongitude": 107.652060
  }'::jsonb,
  -6.948150,
  107.652060,
  NOW() - INTERVAL '22 minutes',
  6.5,
  TRUE,
  NULL,
  NOW() - INTERVAL '20 minutes'
);

-- Forensik 4B: Daan Mogot Selesai (Samsung Galaxy A34)
INSERT INTO public.report_forensics (
  id,
  report_id,
  reporter_ip,
  user_agent,
  device_platform,
  compressed_image_path,
  original_file_sha256,
  compressed_file_sha256,
  exif_metadata,
  exif_gps_latitude,
  exif_gps_longitude,
  exif_captured_at,
  distance_pin_vs_exif_meters,
  is_metadata_consistent,
  media_purged_at,
  created_at
) VALUES (
  '44444444-2222-4444-8444-222222222222',
  '44444444-4444-4444-8444-222222222222',
  '180.254.11.90',
  'Mozilla/5.0 (Linux; Android 14; SM-A346E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
  'Android',
  'evidence-vault/44444444-4444-4444-8444-222222222222/evidence_daanmogot_a34.webp',
  'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
  'b2c3d4e5f6a708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
  '{
    "Make": "Samsung",
    "Model": "Galaxy A34 5G (SM-A346E)",
    "Software": "A346EXXS6BXC3",
    "DateTimeOriginal": "2026-10-14 15:50:00",
    "ExposureTime": "1/100s",
    "FNumber": 1.8,
    "ISOSpeedRatings": 100,
    "FocalLength": "4.65mm",
    "GPSLatitude": -6.152740,
    "GPSLongitude": 106.745450
  }'::jsonb,
  -6.152740,
  106.745450,
  NOW() - INTERVAL '5 hours 10 minutes',
  8.9,
  TRUE,
  NULL,
  NOW() - INTERVAL '5 hours'
);

-- ==============================================================================
-- 3. SEED PESAN KOMUNIKASI DUA ARAH (report_messages)
-- ==============================================================================

-- Pesan untuk 1A (Otista)
INSERT INTO public.report_messages (
  id,
  report_id,
  sender_role,
  admin_email,
  message_text,
  created_at
) VALUES
(
  '11111111-3333-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  'ADMIN',
  'ops.jaktim@garda-lokal.id',
  'Laporan Anda telah diverifikasi oleh Command Center Polda Metro Jaya. Tim Patroli Perintis Presisi Polres Metro Jakarta Timur sedang meluncur dengan estimasi tiba 4 menit. Mohon tetap berada di dalam bangunan yang terkunci dan jangan mengambil risiko mendekat.',
  NOW() - INTERVAL '35 minutes'
),
(
  '11111111-3333-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111111',
  'REPORTER',
  NULL,
  'Siap terima kasih pak. Saya bersama karyawan minimarket sudah rolling door ditutup dan lampu dimatikan. Suara petasan masih kencang di luar.',
  NOW() - INTERVAL '30 minutes'
),
(
  '11111111-3333-4111-8111-111111111113',
  '11111111-1111-4111-8111-111111111111',
  'ADMIN',
  'ops.jaktim@garda-lokal.id',
  'Tindakan Anda sangat tepat. Personel bermotor trail sudah tiba di perempatan dan sedang mendorong massa mundur ke arah Cipinang.',
  NOW() - INTERVAL '15 minutes'
);

-- Pesan untuk 1B (Otista 3 Klaster Turunan)
INSERT INTO public.report_messages (
  id,
  report_id,
  sender_role,
  admin_email,
  message_text,
  created_at
) VALUES
(
  '11111111-3333-4111-8111-222222222221',
  '11111111-1111-4111-8111-222222222222',
  'ADMIN',
  'ops.jaktim@garda-lokal.id',
  'Laporan Anda telah otomatis digabungkan dengan insiden utama Otista Raya. Regu patroli trail saat ini langsung menyisir jalur tembusan Otista III.',
  NOW() - INTERVAL '20 minutes'
);

-- Pesan untuk 2A (Bandung Coblong)
INSERT INTO public.report_messages (
  id,
  report_id,
  sender_role,
  admin_email,
  message_text,
  created_at
) VALUES
(
  '22222222-3333-4222-8222-111111111111',
  '22222222-2222-4222-8222-111111111111',
  'ADMIN',
  'ppa.polrestabesbdg@garda-lokal.id',
  'Selamat malam pelapor. Terima kasih atas keberanian dan kepedulian Anda. Foto bukti yang Anda sertakan sangat jelas memperlihatkan atribut sekolah pelaku. Apakah korban saat ini bersama Anda atau sudah dijemput keluarga?',
  NOW() - INTERVAL '1 hour 45 minutes'
),
(
  '22222222-3333-4222-8222-111111111112',
  '22222222-2222-4222-8222-111111111111',
  'REPORTER',
  NULL,
  'Malam ibu penyidik, korban Doni tadi langsung saya amankan ke klinik dekat kampus ITB dan orang tuanya sudah datang menjemput. Orang tua berencana membuat laporan resmi dan visum besok pagi.',
  NOW() - INTERVAL '1 hour 20 minutes'
),
(
  '22222222-3333-4222-8222-111111111113',
  '22222222-2222-4222-8222-111111111111',
  'ADMIN',
  'ppa.polrestabesbdg@garda-lokal.id',
  'Baik, Unit PPA siap mendampingi proses visum di RS Santo Borromeus. Surat pengantar visum resmi sudah kami siapkan. Terima kasih banyak.',
  NOW() - INTERVAL '35 minutes'
);

-- Pesan untuk 2B (Bandung Sukajadi Rencana)
INSERT INTO public.report_messages (
  id,
  report_id,
  sender_role,
  admin_email,
  message_text,
  created_at
) VALUES
(
  '22222222-3333-4222-8222-222222222221',
  '22222222-2222-4222-8222-222222222222',
  'ADMIN',
  'binmas.sukajadi@garda-lokal.id',
  'Halo pelapor, terima kasih atas informasi pencegahan ini. Mohon berkenan melampirkan tangkapan layar (screenshot) obrolan WA atau nomor kontak koordinator geng tersebut jika ada, agar pihak sekolah dan Bhabinkamtibmas dapat memanggil orang tua sebelum kejadian.',
  NOW() - INTERVAL '1 hour 15 minutes'
);

-- Pesan untuk 3B (Medan Belawan)
INSERT INTO public.report_messages (
  id,
  report_id,
  sender_role,
  admin_email,
  message_text,
  created_at
) VALUES
(
  '33333333-3333-4333-8333-222222222221',
  '33333333-3333-4333-8333-222222222222',
  'ADMIN',
  'narkoba.belawan@garda-lokal.id',
  'Laporan intelijen diterima. Tim Opsnal Satresnarkoba sedang melakukan pemetaan titik pelarian lorong dermaga. Identitas Anda dirahasiakan penuh.',
  NOW() - INTERVAL '40 minutes'
);

-- ==============================================================================
-- 4. SEED IMMUTABLE AUDIT LOGS (admin_audit_logs)
-- ==============================================================================

-- Log untuk 1A (Otista Raya)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '11111111-4444-4111-8111-111111111111',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-000000000001',
  'ops.jaktim@garda-lokal.id',
  'READ_DETAIL',
  NULL,
  NULL,
  'Operator Command Center membuka berkas detail laporan darurat bentrokan Otista dan memverifikasi rekaman CCTV Dishub.',
  '10.10.1.55',
  NOW() - INTERVAL '42 minutes'
),
(
  '11111111-4444-4111-8111-111111111112',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-000000000001',
  'ops.jaktim@garda-lokal.id',
  'CHANGE_STATUS',
  'BARU',
  'DITINDAKLANJUTI',
  'Bentrokan terverifikasi valid berkekuatan senjata tajam dan petasan. Disposisi segera ke 3 unit Patroli Perintis Presisi Polres Jaktim.',
  '10.10.1.55',
  NOW() - INTERVAL '38 minutes'
),
(
  '11111111-4444-4111-8111-111111111113',
  '11111111-1111-4111-8111-111111111111',
  '99999999-9999-4999-8999-000000000001',
  'ops.jaktim@garda-lokal.id',
  'SEND_MESSAGE_TO_REPORTER',
  NULL,
  NULL,
  'Mengirim instruksi evakuasi perlindungan mandiri di dalam bangunan terkunci kepada pelapor di TKP Otista.',
  '10.10.1.55',
  NOW() - INTERVAL '35 minutes'
);

-- Log untuk 1B (Otista 3)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '11111111-4444-4111-8111-222222222221',
  '11111111-1111-4111-8111-222222222222',
  '99999999-9999-4999-8999-000000000001',
  'ops.jaktim@garda-lokal.id',
  'READ_DETAIL',
  NULL,
  NULL,
  'Membuka laporan anak klaster Otista 3. Verifikasi koordinat radius 205 meter dari induk #11111111-1111-4111-8111-111111111111.',
  '10.10.1.55',
  NOW() - INTERVAL '25 minutes'
),
(
  '11111111-4444-4111-8111-222222222222',
  '11111111-1111-4111-8111-222222222222',
  '99999999-9999-4999-8999-000000000001',
  'ops.jaktim@garda-lokal.id',
  'CHANGE_STATUS',
  'BARU',
  'DITINDAKLANJUTI',
  'Sinkronisasi status dengan klaster induk. Mengarahkan tim motor trail menyekat gang Cipinang Cempedak.',
  '10.10.1.55',
  NOW() - INTERVAL '22 minutes'
);

-- Log untuk 2A (Bandung Coblong)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '22222222-4444-4222-8222-111111111111',
  '22222222-2222-4222-8222-111111111111',
  '99999999-9999-4999-8999-000000000002',
  'ppa.polrestabesbdg@garda-lokal.id',
  'READ_DETAIL',
  NULL,
  NULL,
  'Penyidik PPA membuka bukti visual forensik dan menginspeksi lencana seragam sekolah pelaku.',
  '10.20.4.12',
  NOW() - INTERVAL '1 hour 50 minutes'
),
(
  '22222222-4444-4222-8222-111111111112',
  '22222222-2222-4222-8222-111111111111',
  '99999999-9999-4999-8999-000000000002',
  'ppa.polrestabesbdg@garda-lokal.id',
  'CHANGE_STATUS',
  'BARU',
  'DITINDAKLANJUTI',
  'Bukti digital dan konsistensi EXIF terkonfirmasi asli. Surat pendampingan visum et repertum diterbitkan ke RS Santo Borromeus.',
  '10.20.4.12',
  NOW() - INTERVAL '1 hour 40 minutes'
);

-- Log untuk 2B (Bandung Sukajadi)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '22222222-4444-4222-8222-222222222221',
  '22222222-2222-4222-8222-222222222222',
  '99999999-9999-4999-8999-000000000002',
  'binmas.sukajadi@garda-lokal.id',
  'CHANGE_STATUS',
  'BARU',
  'BUTUH_INFO_PELAPOR',
  'Meminta bukti pendukung tangkapan layar WhatsApp dan nomor inisiator rencana pengeroyokan di ruko samping PVJ.',
  '10.20.4.12',
  NOW() - INTERVAL '1 hour 15 minutes'
);

-- Log untuk 3B (Medan Belawan)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '33333333-4444-4333-8333-222222222221',
  '33333333-3333-4333-8333-222222222222',
  '99999999-9999-4999-8999-000000000003',
  'narkoba.belawan@garda-lokal.id',
  'CHANGE_STATUS',
  'BARU',
  'DITINDAKLANJUTI',
  'Target residivis berinisial B.M. alias Ucok Belawan teridentifikasi di Lorong Melati. Koordinasi penindakan taktis dengan Satpolairud.',
  '10.30.2.88',
  NOW() - INTERVAL '50 minutes'
);

-- Log untuk 4B (Daan Mogot Selesai)
INSERT INTO public.admin_audit_logs (
  id,
  report_id,
  admin_user_id,
  admin_email,
  action_type,
  previous_status,
  new_status,
  mandatory_note,
  client_ip,
  created_at
) VALUES
(
  '44444444-4444-4444-8444-222222222221',
  '44444444-4444-4444-8444-222222222222',
  '99999999-9999-4999-8999-000000000001',
  'kapolsek.cengkareng@garda-lokal.id',
  'CHANGE_STATUS',
  'DITINDAKLANJUTI',
  'SELESAI',
  'Operasi gabungan cipta kondisi berhasil membubarkan kerumunan geng motor di Daan Mogot Km 11, menyita 5 unit motor tanpa surat, dan mengamankan lokasi.',
  '10.10.8.21',
  NOW() - INTERVAL '1 hour'
);

-- ==============================================================================
-- 5. AKTIFKAN KEMBALI TRIGGER KEAMANAN MUTLAK (IMMUTABLE AUDIT LOG)
-- ==============================================================================
ALTER TABLE IF EXISTS public.admin_audit_logs ENABLE TRIGGER trg_immutable_audit_logs;

-- Verifikasi jumlah data yang berhasil di-seed
DO $$
DECLARE
  v_reports_count INTEGER;
  v_forensics_count INTEGER;
  v_messages_count INTEGER;
  v_audit_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_reports_count FROM public.reports;
  SELECT COUNT(*) INTO v_forensics_count FROM public.report_forensics;
  SELECT COUNT(*) INTO v_messages_count FROM public.report_messages;
  SELECT COUNT(*) INTO v_audit_count FROM public.admin_audit_logs;

  RAISE NOTICE 'Seed GARDA-LOKAL selesai: % reports, % forensics, % messages, % audit logs.',
    v_reports_count, v_forensics_count, v_messages_count, v_audit_count;
END $$;
