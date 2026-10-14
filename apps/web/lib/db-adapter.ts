import crypto from 'crypto';
import {
  Report,
  ReportForensics,
  ReportMessage,
  AdminAuditLog,
  ReportStatus,
  IncidentCategory,
  TemporalStatus,
  CreateReportInput,
  ReportFilter,
} from './types';
import {
  getSupabaseAdminClient,
  dispatchReportToVpsQueue,
  fetchReportFromVps,
  fetchReportsFromVps,
} from './supabase';

// ==============================================================================
// 1. ENVIRONMENT & CONNECTION DETECTION
// ==============================================================================

/**
 * Checks whether Supabase is configured with valid live credentials.
 * If URL or service key contains placeholders or defaults, return false.
 */
export function isUsingLiveSupabase(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL || process.env.SUPABASE_URL || '';
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '';

  if (!url || !key) return false;
  if (url.includes('placeholder') || url.includes('your-project-id')) return false;
  if (key.includes('placeholder') || key.includes('eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...')) return false;

  return true;
}

// ==============================================================================
// 2. REALISTIC INDONESIAN SEED DATA (IN-MEMORY DEMO FALLBACK)
// ==============================================================================

const INITIAL_REPORTS: Report[] = [
  // 1A. Jakarta Timur (Otista Raya, Jatinegara) - BENTROK (Klaster Induk)
  {
    id: '11111111-1111-4111-8111-111111111111',
    cluster_parent_id: null,
    reporter_token_hash: '6581f0792dd687a6266669d41e36fa814e2f96df7381d731b92002ddf7174d43',
    category: 'BENTROK',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'DITINDAKLANJUTI',
    urgency_score: 94,
    credibility_score: 90,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Tawuran pecah antar dua kelompok warga membawa senjata tajam celurit panjang dan lemparan molotov di perempatan Otista Raya dekat halte Bidara Cina. Lalu lintas dua arah macet total, warga ketakutan dan ruko-ruko buru-buru tutup.',
    public_masked_summary:
      'Bentrokan bersenjata tajam dilaporkan di kawasan Otista Raya, Jatinegara. Petugas kepolisian telah dikerahkan ke lokasi untuk pengendalian massa dan sterilisasi jalan raya.',
    admin_full_narrative:
      'Terjadi bentrok fisik terbuka antara kelompok pemuda RW 04 dan RW 07 Bidara Cina. Saksi di lokasi merekam penggunaan celurit panjang, molotov botol sirup, dan kembang api diarahkan ke perumahan warga. Korban luka 1 orang terkena serpihan kaca di bagian pelipis. Regu Tim Patroli Perintis Presisi Polres Metro Jakarta Timur sedang meluncur ke TKP.',
    extracted_entities: {
      involved_persons_full_names: ['Kelompok Pemuda RW 04', 'Kelompok Pemuda RW 07 Bidara Cina'],
      weapons_or_substances: ['Celurit Panjang Corbek', 'Bom Molotov', 'Petasan Kembang Api Torpedo', 'Batu Kali'],
      specific_landmarks: ['Halte TransJakarta Bidara Cina', 'Perempatan Jl. Otista Raya'],
      estimated_headcount: '35 - 50 orang',
    },
    tactical_recommendation:
      'Kirim 2 unit Rantis Water Cannon dan 3 regu Tim Patroli Perintis Presisi bermotor trail. Lakukan penutupan arus lalu lintas dari arah Kampung Melayu menuju Cawang. Amankan perimeter gang pemukiman warga.',
    latitude: -6.2382,
    longitude: 106.8685,
    address_road: 'Jl. Otista Raya No. 45',
    address_subdistrict: 'Bidara Cina',
    address_district: 'Jatinegara',
    address_city: 'Jakarta Timur',
    address_province: 'DKI Jakarta',
    location_landmark: 'Dekat Halte TransJakarta Bidara Cina',
    cluster_count: 2,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // 1B. Jakarta Timur (Otista III) - BENTROK (Klaster Turunan <210m dari 1A)
  {
    id: '11111111-1111-4111-8111-222222222222',
    cluster_parent_id: '11111111-1111-4111-8111-111111111111',
    reporter_token_hash: '8aee8637021b4d09a3aee6783cbd648be99cb02c93800c70819bb20a8d71602f',
    category: 'BENTROK',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'DITINDAKLANJUTI',
    urgency_score: 88,
    credibility_score: 85,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Massa tawuran yang dari Otista Raya berlari kocar-kacir masuk ke gang Otista III sambil melempar batu ke pos kamling dan rumah penduduk. Kaca jendela pos kamling hancur.',
    public_masked_summary:
      'Kelompok massa bentrokan terpecah ke area permukiman Otista III. Tim patroli bermotor sedang melakukan penyisiran ke dalam gang.',
    admin_full_narrative:
      'Pelarian massa bentrokan dari TKP Otista Raya menuju jalur tembusan pemukiman Otista 3 Cipinang Cempedak. Terjadi kerusakan pos ronda RT 05. Pelapor bersembunyi di lantai dua rumah.',
    extracted_entities: {
      involved_persons_full_names: ['Massa Bentrok Pecahan Otista'],
      weapons_or_substances: ['Pecahan Batu Konblok', 'Kayu Balok', 'Pisau Dapur'],
      specific_landmarks: ['Pos Kamling RT 05 / RW 02', 'Gang Masuk Otista III'],
      estimated_headcount: '15 - 20 orang',
    },
    tactical_recommendation:
      'Kerahkan personel bermotor trail untuk menyekat gang sempit tembusan Cipinang Kebembem agar massa tidak masuk lebih dalam ke kawasan perumahan padat.',
    latitude: -6.2396,
    longitude: 106.8697,
    address_road: 'Jl. Otista III No. 12',
    address_subdistrict: 'Cipinang Cempedak',
    address_district: 'Jatinegara',
    address_city: 'Jakarta Timur',
    address_province: 'DKI Jakarta',
    location_landmark: 'Pos Kamling RT 05 Otista 3',
    cluster_count: 1,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
  },
  // 1C. Jakarta Selatan (Underpass Manggarai) - BENTROK
  {
    id: '11111111-1111-4111-8111-333333333333',
    cluster_parent_id: null,
    reporter_token_hash: '600d5bd2fd7fb8a065d8f5a05c1239deab44306f14e306858eb99628a5ae0d5b',
    category: 'BENTROK',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'BARU',
    urgency_score: 95,
    credibility_score: 92,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Tawuran Underpass Manggarai pecah kembali malam ini. Anak-anak remaja bawa senjata tajam celurit bebek dan petasan kembang api saling tembak di kolong jembatan. Pengendara motor dan mobil terjebak dan putar balik lawan arah.',
    public_masked_summary:
      'Bentrokan remaja dilaporkan di Underpass Manggarai. Warga dan pengguna jalan diimbau menghindari jalur Jl. Sultan Agung.',
    admin_full_narrative:
      'Bentrokan antarkelompok pemuda Tambak dan Manggarai pecah di kolong terowongan Stasiun Manggarai. Saling serang menggunakan petasan tembak dan celurit bebek modifikasi. Jalur utama penghubung Matraman - Tebet terputus total.',
    extracted_entities: {
      involved_persons_full_names: ['Geng Pemuda Tambak Bawah', 'Geng Remaja RW Manggarai'],
      weapons_or_substances: ['Celurit Bebek Corbek', 'Kembang Api Roman Candle', 'Botol Kaca Berisi Pasir'],
      specific_landmarks: ['Underpass Kolong Stasiun Manggarai', 'Pintu Masuk Terowongan Sultan Agung'],
      estimated_headcount: '50 - 70 orang',
    },
    tactical_recommendation:
      'Penyekatan darurat di pertigaan Jl. Tambak dan Minangkabau. Tembakkan gas air mata untuk memecah konsentrasi massa di kolong jembatan. Evakuasi kendaraan sipil yang terjebak di tengah underpass.',
    latitude: -6.2088,
    longitude: 106.8482,
    address_road: 'Jl. Sultan Agung Underpass',
    address_subdistrict: 'Manggarai',
    address_district: 'Tebet',
    address_city: 'Jakarta Selatan',
    address_province: 'DKI Jakarta',
    location_landmark: 'Underpass Stasiun Manggarai Kolong Jembatan',
    cluster_count: 1,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // 2A. Bandung (Coblong, Taman Ganesha) - PERUNDUNGAN (Bukti Foto Konsisten)
  {
    id: '22222222-2222-4222-8222-111111111111',
    cluster_parent_id: null,
    reporter_token_hash: 'ba294aa117db6bae7f94af6bf3316ac3291e318e2dbe1f51126639fb64e5c617',
    category: 'PERUNDUNGAN',
    temporal_context: 'KEJADIAN_LAMPAU',
    status: 'DITINDAKLANJUTI',
    urgency_score: 80,
    credibility_score: 95,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Saya menyaksikan dan sempat memfoto aksi perundungan fisik terhadap siswa adik kelas SMP oleh 4 pelajar berseragam SMA di belakang halte Taman Ganesha sore tadi. Korban ditendang, dipaksa mencium sepatu, dan uang sakunya diambil paksa.',
    public_masked_summary:
      'Laporan dugaan tindak kekerasan dan perundungan terhadap pelajar di Coblong, Bandung. Bukti foto dan identitas seragam pelaku telah diamankan serta dikoordinasikan dengan Satgas Pencegahan Kekerasan Sekolah.',
    admin_full_narrative:
      'Pelapor melampirkan bukti foto digital beresolusi tinggi dengan metadata EXIF kamera Xiaomi Redmi Note 11 yang cocok dengan lokasi Taman Ganesha. Korban berinisial D.P. (13 thn, SMPN 7 Bandung) mengalami luka lebam di lengan dan trauma psikis. Terduga pelaku utama berinisial R.M. dan F.K. dari SMA swasta di Dago.',
    extracted_entities: {
      involved_persons_full_names: [
        'Doni Pratama (Korban Siswa SMP)',
        'Rizki Maulana (Terduga Pelaku SMA)',
        'Farhan Kurnia (Terduga Pelaku SMA)',
      ],
      weapons_or_substances: ['Kekerasan Fisik Tangan Kosong / Tendangan Sepatu'],
      specific_landmarks: ['Belakang Halte Bus Taman Ganesha', 'Kantin Kejujuran Belakang Siliwangi'],
      estimated_headcount: '4 pelaku, 1 korban',
    },
    tactical_recommendation:
      'Koordinasikan penanganan bersama Unit Pelayanan Perempuan dan Anak (PPA) Satreskrim Polrestabes Bandung dan Dinas Pendidikan Kota Bandung. Dampingi korban untuk visum et repertum di RS Borromeus.',
    latitude: -6.8924,
    longitude: 107.6108,
    address_road: 'Jl. Ganesa No. 10',
    address_subdistrict: 'Lebak Siliwangi',
    address_district: 'Coblong',
    address_city: 'Kota Bandung',
    address_province: 'Jawa Barat',
    location_landmark: 'Taman Ganesha Dekat Gerbang Utama Kampus',
    cluster_count: 1,
    created_at: new Date(Date.now() - 2 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  // 2B. Bandung (Sukajadi, Dekat PVJ) - PERUNDUNGAN (Rencana Mendatang)
  {
    id: '22222222-2222-4222-8222-222222222222',
    cluster_parent_id: null,
    reporter_token_hash: '970d3ab7251d5d69801350146135249316713b61e38d38b8fb1b9ec815829274',
    category: 'PERUNDUNGAN',
    temporal_context: 'RENCANA_MENDATANG',
    status: 'BUTUH_INFO_PELAPOR',
    urgency_score: 82,
    credibility_score: 78,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Ada obrolan di grup WA perkumpulan motor sekolah yang merencanakan penghadangan dan pemukulan terhadap anak baru pindahan besok sore jam 16.30 di ruko kosong samping Paris Van Java Sukajadi.',
    public_masked_summary:
      'Informasi rencana pencegatan dan tindak kekerasan antarpelajar di Sukajadi. Tindakan preventif pengawasan patroli telah dijadwalkan oleh Binmas.',
    admin_full_narrative:
      'Laporan rencana intimidasi terorganisir melibatkan sekitar 8 sampai 10 siswa yang menargetkan seorang siswa pindahan berinisial D. Lokasi target adalah deretan ruko kosong seberang PVJ yang sering dijadikan tempat nongkrong tanpa izin.',
    extracted_entities: {
      involved_persons_full_names: ['Dimas (Siswa Sasaran)', 'Kelompok Remaja Barudak Sukajadi'],
      weapons_or_substances: ['Rencana Pengeroyokan', 'Tali Sabuk Gesper Logam'],
      specific_landmarks: ['Ruko Kosong Samping PVJ', 'Jl. Sukajadi Bawah'],
      estimated_headcount: '8 - 10 orang siswa',
    },
    tactical_recommendation:
      'Instruksikan Bhabinkamtibmas dan Babinsa Sukajadi melakukan pos pantau stasioner di area ruko kosong mulai pukul 16.00 WIB guna sterilisasi dan pencegahan tindak pidana.',
    latitude: -6.8863,
    longitude: 107.5958,
    address_road: 'Jl. Sukajadi No. 137',
    address_subdistrict: 'Pasteur',
    address_district: 'Sukajadi',
    address_city: 'Kota Bandung',
    address_province: 'Jawa Barat',
    location_landmark: 'Ruko Kosong Samping Paris Van Java Mall',
    cluster_count: 1,
    created_at: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
  // 3A. Surabaya (Kenjeran, Bulak) - MIRAS_NARKOBA (Pesta Cukrik)
  {
    id: '33333333-3333-4333-8333-111111111111',
    cluster_parent_id: null,
    reporter_token_hash: '20876177d1840b7afbc320aa472362be4f026d0fbe4dcf6636e5d0c130fb4de6',
    category: 'MIRAS_NARKOBA',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'BARU',
    urgency_score: 86,
    credibility_score: 89,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Pesta miras oplosan jenis cukrik di gubuk bambu pinggir pantai Kenjeran dekat pintu air. Sekitar 12 pemuda mabuk berat, menyetel musik keras-keras, dan mulai menggoda serta melempar botol ke pengendara motor yang melintas.',
    public_masked_summary:
      'Gangguan ketertiban akibat pesta minuman keras beralkohol oplosan di kawasan pesisir Kenjeran, Surabaya. Patroli Samapta telah dihubungi untuk penertiban.',
    admin_full_narrative:
      'Aktivitas konsumsi miras oplosan ilegal cukrik di gazebo pesisir Kenjeran Lama. Massa pemuda dalam kondisi hilang kendali kesadaran dan mengancam kenyamanan warga nelayan sekitar. Dikhawatirkan terjadi keracunan metanol oplosan.',
    extracted_entities: {
      involved_persons_full_names: ['Gerombolan Pemuda Mabuk Pesisir Bulak'],
      weapons_or_substances: ['Miras Oplosan Cukrik', 'Botol Kaca Bir Bekas', 'Kayu Balok'],
      specific_landmarks: ['Pintu Air Kenjeran Lama', 'Taman Hiburan Pantai Ria Kenjeran'],
      estimated_headcount: '10 - 14 orang',
    },
    tactical_recommendation:
      'Patroli Gabungan Polsek Kenjeran bersama Satpol PP Kecamatan Bulak. Lakukan razia dan sita jeriken sisa miras cukrik serta amankan pemuda ke kantor untuk pembinaan.',
    latitude: -7.2415,
    longitude: 112.7982,
    address_road: 'Jl. Sukolilo No. 100',
    address_subdistrict: 'Sukolilo Baru',
    address_district: 'Bulak',
    address_city: 'Kota Surabaya',
    address_province: 'Jawa Timur',
    location_landmark: 'Gazebo Pesisir Pantai Kenjeran Lama Dekat Pintu Air',
    cluster_count: 1,
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  // 3B. Medan (Belawan, Bagan Deli) - MIRAS_NARKOBA (Peredaran Dermaga Nelayan)
  {
    id: '33333333-3333-4333-8333-222222222222',
    cluster_parent_id: null,
    reporter_token_hash: 'e14af7b2277d7ea1dc084daeaab8273956bb517c7a732460e11f922f2cefc903',
    category: 'MIRAS_NARKOBA',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'DITINDAKLANJUTI',
    urgency_score: 91,
    credibility_score: 90,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Ada transaksi peredaran narkoba jenis sabu paket hemat dan tuak nias keras di lorong dekat dermaga kapal nelayan Belawan. Pengedar menyelipkan pisau badik di pinggang celana.',
    public_masked_summary:
      'Laporan dugaan peredaran zat narkotika terlarang di area pelabuhan Belawan, Medan. Informasi telah diteruskan ke Satres Narkoba Polres Pelabuhan Belawan.',
    admin_full_narrative:
      'Aktivitas transaksi narkotika jenis metamfetamina (sabu) paket kecil di Lorong Melati, Bagan Deli. Terduga pengedar utama berinisial B.M. alias Ucok Belawan yang merupakan residivis kasus serupa. Transaksi memanfaatkan lalu-lalang nelayan bongkar muat ikan.',
    extracted_entities: {
      involved_persons_full_names: ['Baharudin Manurung alias Ucok Belawan', 'Jaringan Pengedar Lorong Melati'],
      weapons_or_substances: ['Narkotika Golongan I Metamfetamina (Sabu)', 'Pisau Badik Tajam', 'Tuak Nias Oplosan'],
      specific_landmarks: ['Lorong Melati Bagan Deli', 'Gudang Ikan Asin Belawan'],
      estimated_headcount: '5 - 8 orang',
    },
    tactical_recommendation:
      'Operasi senyap tim Opsnal Resnarkoba Polres Pelabuhan Belawan dibantu personel Satpolairud. Gunakan pelindung rompi anti-tusuk mengingat target membawa senjata tajam terselip.',
    latitude: 3.7825,
    longitude: 98.6874,
    address_road: 'Jl. Pelabuhan Raya No. 8',
    address_subdistrict: 'Bagan Deli',
    address_district: 'Medan Belawan',
    address_city: 'Kota Medan',
    address_province: 'Sumatera Utara',
    location_landmark: 'Dermaga Tambat Kapal Nelayan Belawan Lorong Melati',
    cluster_count: 1,
    created_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  // 4A. Bandung Timur (Buahbatu / Bypass Soekarno Hatta) - LAINNYA (Geng Motor Knalpot Brong & Sajam)
  {
    id: '44444444-4444-4444-8444-111111111111',
    cluster_parent_id: null,
    reporter_token_hash: 'b41470821cb0fc31163e0794c448a2fc9bee7700325dac3f3b570bd371c9f7e6',
    category: 'LAINNYA',
    temporal_context: 'SEDANG_BERLANGSUNG',
    status: 'BARU',
    urgency_score: 90,
    credibility_score: 91,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Konvoi arak-arakan geng motor sekitar 30 sepeda motor memblokir jalur cepat bypass Soekarno Hatta arah Cibiru. Mereka menggeber knalpot brong, mengibarkan bendera hitam, dan mengacungkan senjata tajam samurai ke arah pengendara lain.',
    public_masked_summary:
      'Aksi konvoi gerombolan motor meresahkan pengguna jalan raya di jalur bypass Soekarno-Hatta. Tim Raimas dan Patroli Reskrim sedang melakukan pencegatan.',
    admin_full_narrative:
      'Aksi konvoi liar puluhan motor berknalpot tidak standar tanpa helm melintasi jalur cepat Soekarno-Hatta depan Metro Indah Mall. Laporan dari ojol menyebut mereka sempat menendang spion mobil pick-up yang tidak memberi jalan.',
    extracted_entities: {
      involved_persons_full_names: ['Gerombolan Konvoi Geng Motor Liar'],
      weapons_or_substances: ['Pedang Katana Samurai', 'Gir Motor Bertali Sabuk', 'Knalpot Brong Bising'],
      specific_landmarks: ['Depan Mall MIM Metro Indah Mall', 'Underpass Buahbatu Bypass'],
      estimated_headcount: '45 - 60 orang (30 unit sepeda motor)',
    },
    tactical_recommendation:
      'Pencegatan dan barikade di perempatan Simpang Lima Kiaracondong dan Bundaran Cibiru oleh Tim Prabu Lodaya. Tindak tegas pelanggaran senjata tajam sesuai UU Darurat No. 12 Tahun 1951.',
    latitude: -6.9482,
    longitude: 107.6521,
    address_road: 'Jl. Soekarno Hatta No. 590',
    address_subdistrict: 'Sekejati',
    address_district: 'Buahbatu',
    address_city: 'Kota Bandung',
    address_province: 'Jawa Barat',
    location_landmark: 'Jalur Cepat Bypass Depan Metro Indah Mall (MIM)',
    cluster_count: 1,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  // 4B. Jakarta Barat (Daan Mogot, Cengkareng) - LAINNYA (Penertiban Geng Motor - SELESAI)
  {
    id: '44444444-4444-4444-8444-222222222222',
    cluster_parent_id: null,
    reporter_token_hash: 'c6ccd6188eecc5b3a16b6f192ae2940d5646bc9cb3a396f1c9d153d935347319',
    category: 'LAINNYA',
    temporal_context: 'KEJADIAN_LAMPAU',
    status: 'SELESAI',
    urgency_score: 65,
    credibility_score: 95,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input:
      'Kerumunan pemuda bermotor kumpul di warung remang Daan Mogot membawa botol miras dan stik golf siap tawuran dini hari.',
    public_masked_summary:
      'Penertiban kerumunan pemuda bermotor di Jl. Daan Mogot Km 11 telah berhasil diselesaikan oleh Polsek Cengkareng. Situasi kondusif.',
    admin_full_narrative:
      'Operasi cipta kondisi gabungan Polsek Cengkareng membubarkan kerumunan 20 orang pemuda. Lima unit sepeda motor tanpa surat-surat resmi disita ke kantor polisi.',
    extracted_entities: {
      involved_persons_full_names: ['Kelompok Pemuda Daan Mogot'],
      weapons_or_substances: ['Stik Golf Logam', 'Botol Kaca Minuman Keras', 'Balok Kayu'],
      specific_landmarks: ['Halte Jembatan Gantung Daan Mogot', 'Warung Pinggir Jalan Km 11'],
      estimated_headcount: '20 orang',
    },
    tactical_recommendation:
      'Kasus selesai ditangani. Lakukan patroli berkala di sepanjang Daan Mogot pada jam rawan 01.00 - 04.30 WIB.',
    latitude: -6.1528,
    longitude: 106.7455,
    address_road: 'Jl. Daan Mogot Km 11',
    address_subdistrict: 'Kedaung Kali Angke',
    address_district: 'Cengkareng',
    address_city: 'Jakarta Barat',
    address_province: 'DKI Jakarta',
    location_landmark: 'Dekat Halte Jembatan Gantung Daan Mogot',
    cluster_count: 1,
    created_at: new Date(Date.now() - 5 * 60 * 60 * 1000).toISOString(),
    updated_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

const INITIAL_FORENSICS: ReportForensics[] = [
  // 1A. Otista S23 Ultra
  {
    id: '11111111-2222-4111-8111-111111111111',
    report_id: '11111111-1111-4111-8111-111111111111',
    reporter_ip: '180.252.164.22',
    user_agent:
      'Mozilla/5.0 (Linux; Android 14; SM-S918B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.113 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/11111111-1111-4111-8111-111111111111/evidence_otista_s23.webp',
    original_file_sha256: 'a3f8b03e4d9c721980af4a03c0e12d456789abcdef0123456789abcdef012345',
    compressed_file_sha256: 'b2e7c91d3e8b610879fe3b92b9d01c3456789abcdef0123456789abcdef01234',
    exif_metadata: {
      Make: 'Samsung',
      Model: 'Galaxy S23 Ultra (SM-S918B)',
      Software: 'S918BXXU3BWJM',
      DateTimeOriginal: '2026-10-14 20:15:30',
      ExposureTime: '1/120s',
      FNumber: 1.7,
      ISOSpeedRatings: 400,
      FocalLength: '6.3mm',
      GPSLatitude: -6.23815,
      GPSLongitude: 106.86845,
    },
    exif_gps_latitude: -6.23815,
    exif_gps_longitude: 106.86845,
    exif_captured_at: new Date(Date.now() - 47 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 7.4,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
  },
  // 1B. Otista III iPhone 14 Pro
  {
    id: '11111111-2222-4111-8111-222222222222',
    report_id: '11111111-1111-4111-8111-222222222222',
    reporter_ip: '114.124.201.89',
    user_agent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_5_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.5 Mobile/15E148 Safari/604.1',
    device_platform: 'iOS',
    compressed_image_path: 'evidence-vault/11111111-1111-4111-8111-222222222222/evidence_otista3_iphone14.webp',
    original_file_sha256: 'c4a9d12e5f0a832091ba5b14d1f23e567890bcdef1234567890bcdef123456',
    compressed_file_sha256: 'd5b0e23f6a1b943102cb6c25e2a34f678901cdef2345678901cdef234567',
    exif_metadata: {
      Make: 'Apple',
      Model: 'iPhone 14 Pro (A2890)',
      Software: 'iOS 17.5.1',
      DateTimeOriginal: '2026-10-14 20:30:12',
      ExposureTime: '1/60s',
      FNumber: 1.78,
      ISOSpeedRatings: 500,
      FocalLength: '6.86mm',
      GPSLatitude: -6.23955,
      GPSLongitude: 106.86965,
    },
    exif_gps_latitude: -6.23955,
    exif_gps_longitude: 106.86965,
    exif_captured_at: new Date(Date.now() - 32 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 7.8,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  // 1C. Manggarai Xiaomi 13T
  {
    id: '11111111-2222-4111-8111-333333333333',
    report_id: '11111111-1111-4111-8111-333333333333',
    reporter_ip: '36.85.120.44',
    user_agent:
      'Mozilla/5.0 (Linux; Android 14; 2306EPN60G Build/UKQ1.230804.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.6422.72 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/11111111-1111-4111-8111-333333333333/evidence_manggarai_xiaomi13t.webp',
    original_file_sha256: 'e6c1f34a7b2c054213dc7d36f3b45a789012def0123456789012def012345',
    compressed_file_sha256: 'f7d2a45b8c3d165324ed8e47a4c56b890123ef1234567890123ef123456',
    exif_metadata: {
      Make: 'Xiaomi',
      Model: 'Xiaomi 13T (2306EPN60G)',
      Software: 'HyperOS 1.0.4.0.UMFEUXM',
      DateTimeOriginal: '2026-10-14 20:45:00',
      ExposureTime: '1/40s',
      FNumber: 1.9,
      ISOSpeedRatings: 800,
      FocalLength: '5.54mm',
      GPSLatitude: -6.20875,
      GPSLongitude: 106.84815,
    },
    exif_gps_latitude: -6.20875,
    exif_gps_longitude: 106.84815,
    exif_captured_at: new Date(Date.now() - 17 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 7.7,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // 2A. Coblong Xiaomi Redmi Note 11
  {
    id: '22222222-2222-4222-8222-111111111111',
    report_id: '22222222-2222-4222-8222-111111111111',
    reporter_ip: '103.247.22.15',
    user_agent:
      'Mozilla/5.0 (Linux; Android 13; 2201117TY) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.6099.230 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/22222222-2222-4222-8222-111111111111/evidence_ganesha_redmi11.webp',
    original_file_sha256: '01a2b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1',
    compressed_file_sha256: '12b3c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2',
    exif_metadata: {
      Make: 'Xiaomi',
      Model: 'Redmi Note 11 (2201117TY)',
      Software: 'MIUI 14.0.5',
      DateTimeOriginal: '2026-10-14 18:25:10',
      ExposureTime: '1/100s',
      FNumber: 1.8,
      ISOSpeedRatings: 125,
      FocalLength: '4.26mm',
      GPSLatitude: -6.89238,
      GPSLongitude: 107.61078,
    },
    exif_gps_latitude: -6.89238,
    exif_gps_longitude: 107.61078,
    exif_captured_at: new Date(Date.now() - 125 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 3.1,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 120 * 60 * 1000).toISOString(),
  },
  // 2B. Sukajadi Samsung Galaxy A54
  {
    id: '22222222-2222-4222-8222-222222222222',
    report_id: '22222222-2222-4222-8222-222222222222',
    reporter_ip: '182.1.84.103',
    user_agent:
      'Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/123.0.6312.118 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/22222222-2222-4222-8222-222222222222/evidence_sukajadi_a54.webp',
    original_file_sha256: '23c4d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3',
    compressed_file_sha256: '34d5e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4',
    exif_metadata: {
      Make: 'Samsung',
      Model: 'Galaxy A54 5G (SM-A546E)',
      Software: 'A546EXXU6BXB4',
      DateTimeOriginal: '2026-10-14 17:15:00',
      GPSLatitude: -6.88625,
      GPSLongitude: 107.59572,
    },
    exif_gps_latitude: -6.88625,
    exif_gps_longitude: 107.59572,
    exif_captured_at: new Date(Date.now() - 190 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 11.2,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 180 * 60 * 1000).toISOString(),
  },
  // 3A. Kenjeran iPhone 13
  {
    id: '33333333-2222-4333-8333-111111111111',
    report_id: '33333333-3333-4333-8333-111111111111',
    reporter_ip: '110.138.89.51',
    user_agent:
      'Mozilla/5.0 (iPhone; CPU iPhone OS 17_4_1 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.4 Mobile/15E148 Safari/604.1',
    device_platform: 'iOS',
    compressed_image_path: 'evidence-vault/33333333-3333-4333-8333-111111111111/evidence_kenjeran_iphone13.webp',
    original_file_sha256: '45e6f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5',
    compressed_file_sha256: '56f7a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6',
    exif_metadata: {
      Make: 'Apple',
      Model: 'iPhone 13 (A2633)',
      Software: 'iOS 17.4.1',
      GPSLatitude: -7.24147,
      GPSLongitude: 112.79816,
    },
    exif_gps_latitude: -7.24147,
    exif_gps_longitude: 112.79816,
    exif_captured_at: new Date(Date.now() - 52 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 5.6,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  // 3B. Belawan Samsung Galaxy S22
  {
    id: '33333333-2222-4333-8333-222222222222',
    report_id: '33333333-3333-4333-8333-222222222222',
    reporter_ip: '180.246.60.11',
    user_agent:
      'Mozilla/5.0 (Linux; Android 14; SM-S901B) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.82 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/33333333-3333-4333-8333-222222222222/evidence_belawan_s22.webp',
    original_file_sha256: '67a8b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7',
    compressed_file_sha256: '78b9c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8',
    exif_metadata: {
      Make: 'Samsung',
      Model: 'Galaxy S22 (SM-S901B)',
      Software: 'S901BXXS7DXD1',
      GPSLatitude: 3.78247,
      GPSLongitude: 98.68738,
    },
    exif_gps_latitude: 3.78247,
    exif_gps_longitude: 98.68738,
    exif_captured_at: new Date(Date.now() - 83 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 4.2,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
  },
  // 4A. Bandung Timur Poco X5
  {
    id: '44444444-2222-4444-8444-111111111111',
    report_id: '44444444-4444-4444-8444-111111111111',
    reporter_ip: '114.79.45.198',
    user_agent:
      'Mozilla/5.0 (Linux; Android 13; 22101320G) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.6261.90 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/44444444-4444-4444-8444-111111111111/evidence_bypass_pocox5.webp',
    original_file_sha256: '89c0d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9',
    compressed_file_sha256: '90d1e2f3a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d5e6f7a8b9c0',
    exif_metadata: {
      Make: 'Xiaomi',
      Model: 'POCO X5 Pro 5G (22101320G)',
      Software: 'MIUI 14.0.3',
      GPSLatitude: -6.94815,
      GPSLongitude: 107.65206,
    },
    exif_gps_latitude: -6.94815,
    exif_gps_longitude: 107.65206,
    exif_captured_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 6.5,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  // 4B. Daan Mogot Samsung Galaxy A34
  {
    id: '44444444-2222-4444-8444-222222222222',
    report_id: '44444444-4444-4444-8444-222222222222',
    reporter_ip: '180.254.11.90',
    user_agent:
      'Mozilla/5.0 (Linux; Android 14; SM-A346E) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.6367.54 Mobile Safari/537.36',
    device_platform: 'Android',
    compressed_image_path: 'evidence-vault/44444444-4444-4444-8444-222222222222/evidence_daanmogot_a34.webp',
    original_file_sha256: 'a1b2c3d4e5f60718293a4b5c6d7e8f9a0b1c2d3e4f5a6b7c8d9e0f1a2b3c4d',
    compressed_file_sha256: 'b2c3d4e5f6a708192a3b4c5d6e7f8a9b0c1d2e3f4a5b6c7d8e9f0a1b2c3d4e',
    exif_metadata: {
      Make: 'Samsung',
      Model: 'Galaxy A34 5G (SM-A346E)',
      Software: 'A346EXXS6BXC3',
      GPSLatitude: -6.15274,
      GPSLongitude: 106.74545,
    },
    exif_gps_latitude: -6.15274,
    exif_gps_longitude: 106.74545,
    exif_captured_at: new Date(Date.now() - 310 * 60 * 1000).toISOString(),
    distance_pin_vs_exif_meters: 8.9,
    is_metadata_consistent: true,
    media_purged_at: null,
    created_at: new Date(Date.now() - 300 * 60 * 1000).toISOString(),
  },
];

const INITIAL_MESSAGES: ReportMessage[] = [
  // 1A (Otista)
  {
    id: '11111111-3333-4111-8111-111111111111',
    report_id: '11111111-1111-4111-8111-111111111111',
    sender_role: 'ADMIN',
    admin_email: 'ops.jaktim@garda-lokal.id',
    message_text:
      'Laporan Anda telah diverifikasi oleh Command Center Polda Metro Jaya. Tim Patroli Perintis Presisi Polres Metro Jakarta Timur sedang meluncur dengan estimasi tiba 4 menit. Mohon tetap berada di dalam bangunan yang terkunci dan jangan mengambil risiko mendekat.',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  {
    id: '11111111-3333-4111-8111-111111111112',
    report_id: '11111111-1111-4111-8111-111111111111',
    sender_role: 'REPORTER',
    admin_email: null,
    message_text:
      'Siap terima kasih pak. Saya bersama karyawan minimarket sudah rolling door ditutup dan lampu dimatikan. Suara petasan masih kencang di luar.',
    created_at: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
  },
  {
    id: '11111111-3333-4111-8111-111111111113',
    report_id: '11111111-1111-4111-8111-111111111111',
    sender_role: 'ADMIN',
    admin_email: 'ops.jaktim@garda-lokal.id',
    message_text:
      'Tindakan Anda sangat tepat. Personel bermotor trail sudah tiba di perempatan dan sedang mendorong massa mundur ke arah Cipinang.',
    created_at: new Date(Date.now() - 15 * 60 * 1000).toISOString(),
  },
  // 1B (Otista 3)
  {
    id: '11111111-3333-4111-8111-222222222221',
    report_id: '11111111-1111-4111-8111-222222222222',
    sender_role: 'ADMIN',
    admin_email: 'ops.jaktim@garda-lokal.id',
    message_text:
      'Laporan Anda telah otomatis digabungkan dengan insiden utama Otista Raya. Regu patroli trail saat ini langsung menyisir jalur tembusan Otista III.',
    created_at: new Date(Date.now() - 20 * 60 * 1000).toISOString(),
  },
  // 2A (Coblong)
  {
    id: '22222222-3333-4222-8222-111111111111',
    report_id: '22222222-2222-4222-8222-111111111111',
    sender_role: 'ADMIN',
    admin_email: 'ppa.polrestabesbdg@garda-lokal.id',
    message_text:
      'Selamat malam pelapor. Terima kasih atas keberanian dan kepedulian Anda. Foto bukti yang Anda sertakan sangat jelas memperlihatkan atribut sekolah pelaku. Apakah korban saat ini bersama Anda atau sudah dijemput keluarga?',
    created_at: new Date(Date.now() - 105 * 60 * 1000).toISOString(),
  },
  {
    id: '22222222-3333-4222-8222-111111111112',
    report_id: '22222222-2222-4222-8222-111111111111',
    sender_role: 'REPORTER',
    admin_email: null,
    message_text:
      'Malam ibu penyidik, korban Doni tadi langsung saya amankan ke klinik dekat kampus ITB dan orang tuanya sudah datang menjemput. Orang tua berencana membuat laporan resmi dan visum besok pagi.',
    created_at: new Date(Date.now() - 80 * 60 * 1000).toISOString(),
  },
  {
    id: '22222222-3333-4222-8222-111111111113',
    report_id: '22222222-2222-4222-8222-111111111111',
    sender_role: 'ADMIN',
    admin_email: 'ppa.polrestabesbdg@garda-lokal.id',
    message_text:
      'Baik, Unit PPA siap mendampingi proses visum di RS Santo Borromeus. Surat pengantar visum resmi sudah kami siapkan. Terima kasih banyak.',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  // 2B (Sukajadi)
  {
    id: '22222222-3333-4222-8222-222222222221',
    report_id: '22222222-2222-4222-8222-222222222222',
    sender_role: 'ADMIN',
    admin_email: 'binmas.sukajadi@garda-lokal.id',
    message_text:
      'Halo pelapor, terima kasih atas informasi pencegahan ini. Mohon berkenan melampirkan tangkapan layar (screenshot) obrolan WA atau nomor kontak koordinator geng tersebut jika ada, agar pihak sekolah dan Bhabinkamtibmas dapat memanggil orang tua sebelum kejadian.',
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  // 3B (Belawan)
  {
    id: '33333333-3333-4333-8333-222222222221',
    report_id: '33333333-3333-4333-8333-222222222222',
    sender_role: 'ADMIN',
    admin_email: 'narkoba.belawan@garda-lokal.id',
    message_text:
      'Laporan intelijen diterima. Tim Opsnal Satresnarkoba sedang melakukan pemetaan titik pelarian lorong dermaga. Identitas Anda dirahasiakan penuh.',
    created_at: new Date(Date.now() - 40 * 60 * 1000).toISOString(),
  },
];

const INITIAL_AUDIT_LOGS: AdminAuditLog[] = [
  // 1A (Otista)
  {
    id: '11111111-4444-4111-8111-111111111111',
    report_id: '11111111-1111-4111-8111-111111111111',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'ops.jaktim@garda-lokal.id',
    action_type: 'READ_DETAIL',
    previous_status: null,
    new_status: null,
    mandatory_note:
      'Operator Command Center membuka berkas detail laporan darurat bentrokan Otista dan memverifikasi rekaman CCTV Dishub.',
    client_ip: '10.10.1.55',
    created_at: new Date(Date.now() - 42 * 60 * 1000).toISOString(),
  },
  {
    id: '11111111-4444-4111-8111-111111111112',
    report_id: '11111111-1111-4111-8111-111111111111',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'ops.jaktim@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'BARU',
    new_status: 'DITINDAKLANJUTI',
    mandatory_note:
      'Bentrokan terverifikasi valid berkekuatan senjata tajam dan petasan. Disposisi segera ke 3 unit Patroli Perintis Presisi Polres Jaktim.',
    client_ip: '10.10.1.55',
    created_at: new Date(Date.now() - 38 * 60 * 1000).toISOString(),
  },
  {
    id: '11111111-4444-4111-8111-111111111113',
    report_id: '11111111-1111-4111-8111-111111111111',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'ops.jaktim@garda-lokal.id',
    action_type: 'SEND_MESSAGE_TO_REPORTER',
    previous_status: null,
    new_status: null,
    mandatory_note:
      'Mengirim instruksi evakuasi perlindungan mandiri di dalam bangunan terkunci kepada pelapor di TKP Otista.',
    client_ip: '10.10.1.55',
    created_at: new Date(Date.now() - 35 * 60 * 1000).toISOString(),
  },
  // 1B (Otista 3)
  {
    id: '11111111-4444-4111-8111-222222222221',
    report_id: '11111111-1111-4111-8111-222222222222',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'ops.jaktim@garda-lokal.id',
    action_type: 'READ_DETAIL',
    previous_status: null,
    new_status: null,
    mandatory_note:
      'Membuka laporan anak klaster Otista 3. Verifikasi koordinat radius 205 meter dari induk #11111111-1111-4111-8111-111111111111.',
    client_ip: '10.10.1.55',
    created_at: new Date(Date.now() - 25 * 60 * 1000).toISOString(),
  },
  {
    id: '11111111-4444-4111-8111-222222222222',
    report_id: '11111111-1111-4111-8111-222222222222',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'ops.jaktim@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'BARU',
    new_status: 'DITINDAKLANJUTI',
    mandatory_note:
      'Sinkronisasi status dengan klaster induk. Mengarahkan tim motor trail menyekat gang Cipinang Cempedak.',
    client_ip: '10.10.1.55',
    created_at: new Date(Date.now() - 22 * 60 * 1000).toISOString(),
  },
  // 2A (Coblong)
  {
    id: '22222222-4444-4222-8222-111111111111',
    report_id: '22222222-2222-4222-8222-111111111111',
    admin_user_id: '99999999-9999-4999-8999-000000000002',
    admin_email: 'ppa.polrestabesbdg@garda-lokal.id',
    action_type: 'READ_DETAIL',
    previous_status: null,
    new_status: null,
    mandatory_note:
      'Penyidik PPA membuka bukti visual forensik dan menginspeksi lencana seragam sekolah pelaku.',
    client_ip: '10.20.4.12',
    created_at: new Date(Date.now() - 110 * 60 * 1000).toISOString(),
  },
  {
    id: '22222222-4444-4222-8222-111111111112',
    report_id: '22222222-2222-4222-8222-111111111111',
    admin_user_id: '99999999-9999-4999-8999-000000000002',
    admin_email: 'ppa.polrestabesbdg@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'BARU',
    new_status: 'DITINDAKLANJUTI',
    mandatory_note:
      'Bukti digital dan konsistensi EXIF terkonfirmasi asli. Surat pendampingan visum et repertum diterbitkan ke RS Santo Borromeus.',
    client_ip: '10.20.4.12',
    created_at: new Date(Date.now() - 100 * 60 * 1000).toISOString(),
  },
  // 2B (Sukajadi)
  {
    id: '22222222-4444-4222-8222-222222222221',
    report_id: '22222222-2222-4222-8222-222222222222',
    admin_user_id: '99999999-9999-4999-8999-000000000002',
    admin_email: 'binmas.sukajadi@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'BARU',
    new_status: 'BUTUH_INFO_PELAPOR',
    mandatory_note:
      'Meminta bukti pendukung tangkapan layar WhatsApp dan nomor inisiator rencana pengeroyokan di ruko samping PVJ.',
    client_ip: '10.20.4.12',
    created_at: new Date(Date.now() - 75 * 60 * 1000).toISOString(),
  },
  // 3B (Belawan)
  {
    id: '33333333-4444-4333-8333-222222222221',
    report_id: '33333333-3333-4333-8333-222222222222',
    admin_user_id: '99999999-9999-4999-8999-000000000003',
    admin_email: 'narkoba.belawan@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'BARU',
    new_status: 'DITINDAKLANJUTI',
    mandatory_note:
      'Target residivis berinisial B.M. alias Ucok Belawan teridentifikasi di Lorong Melati. Koordinasi penindakan taktis dengan Satpolairud.',
    client_ip: '10.30.2.88',
    created_at: new Date(Date.now() - 50 * 60 * 1000).toISOString(),
  },
  // 4B (Daan Mogot Selesai)
  {
    id: '44444444-4444-4444-8444-222222222221',
    report_id: '44444444-4444-4444-8444-222222222222',
    admin_user_id: '99999999-9999-4999-8999-000000000001',
    admin_email: 'kapolsek.cengkareng@garda-lokal.id',
    action_type: 'CHANGE_STATUS',
    previous_status: 'DITINDAKLANJUTI',
    new_status: 'SELESAI',
    mandatory_note:
      'Operasi gabungan cipta kondisi berhasil membubarkan kerumunan geng motor di Daan Mogot Km 11, menyita 5 unit motor tanpa surat, dan mengamankan lokasi.',
    client_ip: '10.10.8.21',
    created_at: new Date(Date.now() - 60 * 60 * 1000).toISOString(),
  },
];

// ==============================================================================
// 3. PERSISTENT IN-MEMORY SINGLETON STORE
// ==============================================================================

interface InMemStore {
  reports: Report[];
  forensics: ReportForensics[];
  messages: ReportMessage[];
  auditLogs: AdminAuditLog[];
}

declare global {
  // eslint-disable-next-line no-var
  var __garda_db_store: InMemStore | undefined;
}

function getMemoryStore(): InMemStore {
  if (!globalThis.__garda_db_store) {
    globalThis.__garda_db_store = {
      reports: JSON.parse(JSON.stringify(INITIAL_REPORTS)),
      forensics: JSON.parse(JSON.stringify(INITIAL_FORENSICS)),
      messages: JSON.parse(JSON.stringify(INITIAL_MESSAGES)),
      auditLogs: JSON.parse(JSON.stringify(INITIAL_AUDIT_LOGS)),
    };
  }
  return globalThis.__garda_db_store;
}

// ==============================================================================
// 4. HAVERSINE GEOSPATIAL CLUSTERING UTILITY
// ==============================================================================

/**
 * Calculates Great-Circle distance in meters between two coordinates.
 */
export function calculateHaversineMeters(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000; // Earth radius in meters
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) * Math.sin(dLat / 2) +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) *
      Math.sin(dLon / 2);
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

/**
 * In-memory equivalent of PostgreSQL RPC find_nearby_active_cluster:
 * Looks for an active report in the same category within 500m created in the last 3 hours.
 */
function findNearbyClusterInMemory(
  lat: number,
  lng: number,
  category: IncidentCategory,
  store: InMemStore
): string | null {
  const threeHoursAgo = Date.now() - 3 * 60 * 60 * 1000;

  for (const rep of store.reports) {
    if (
      rep.category === category &&
      !rep.cluster_parent_id &&
      (rep.status === 'BARU' || rep.status === 'DITINDAKLANJUTI' || rep.status === 'BUTUH_INFO_PELAPOR' || rep.status === 'RAW_UNPROCESSED') &&
      new Date(rep.created_at).getTime() >= threeHoursAgo
    ) {
      const distance = calculateHaversineMeters(lat, lng, rep.latitude, rep.longitude);
      if (distance <= 500) {
        return rep.id;
      }
    }
  }

  return null;
}

// ==============================================================================
// 5. HYBRID DATABASE ADAPTER METHODS
// ==============================================================================

/**
 * Fetch reports with cluster count calculation and optional filtering.
 */
export async function getReports(filter?: ReportFilter): Promise<Report[]> {
  const isLive = isUsingLiveSupabase();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      let query = supabase.from('reports').select('*');

      if (filter?.status && filter.status !== 'SEMUA') {
        query = query.eq('status', filter.status);
      }
      if (filter?.category && filter.category !== 'SEMUA') {
        query = query.eq('category', filter.category);
      }

      if (filter?.sortBy === 'urgency') {
        query = query.order('urgency_score', { ascending: false }).order('created_at', { ascending: false });
      } else {
        query = query.order('created_at', { ascending: false });
      }

      const { data, error } = await query;
      if (error) throw error;

      const reportsList = data || [];
      const clusterMap = new Map<string, number>();

      reportsList.forEach((r: Report) => {
        if (r.cluster_parent_id) {
          clusterMap.set(r.cluster_parent_id, (clusterMap.get(r.cluster_parent_id) || 1) + 1);
        }
      });

      return reportsList.map((r: Report) => ({
        ...r,
        cluster_count: clusterMap.get(r.id) || (r.cluster_parent_id ? 2 : 1),
      }));
    } catch (err: any) {
      console.warn('[DB Adapter] Live Supabase query failed, falling back to in-memory store:', err.message);
    }
  }

  // Fallback In-Memory & VPS Persistent Store
  const store = getMemoryStore();

  // Merge any newly enqueued reports from VPS persistent repository
  try {
    const vpsReports = await fetchReportsFromVps();
    if (vpsReports && Array.isArray(vpsReports) && vpsReports.length > 0) {
      const existingIds = new Set(store.reports.map((r) => r.id));
      for (const vr of vpsReports) {
        if (!existingIds.has(vr.id)) {
          store.reports.unshift(vr);
          existingIds.add(vr.id);
        } else {
          const idx = store.reports.findIndex((r) => r.id === vr.id);
          if (idx !== -1 && vr.updated_at && (!store.reports[idx].updated_at || vr.updated_at > store.reports[idx].updated_at)) {
            store.reports[idx] = { ...store.reports[idx], ...vr };
          }
        }
      }
    }
  } catch (e) {
    // Graceful fallback to memory store
  }

  let reports = [...store.reports];

  if (filter?.status && filter.status !== 'SEMUA') {
    reports = reports.filter((r) => r.status === filter.status);
  }
  if (filter?.category && filter.category !== 'SEMUA') {
    reports = reports.filter((r) => r.category === filter.category);
  }

  // Count cluster sizes
  const clusterMap = new Map<string, number>();
  store.reports.forEach((r) => {
    if (r.cluster_parent_id) {
      clusterMap.set(r.cluster_parent_id, (clusterMap.get(r.cluster_parent_id) || 1) + 1);
    }
  });

  const enriched = reports.map((r) => ({
    ...r,
    cluster_count: clusterMap.get(r.id) || (r.cluster_parent_id ? 2 : 1),
  }));

  if (filter?.sortBy === 'urgency') {
    enriched.sort((a, b) => b.urgency_score - a.urgency_score || new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  } else {
    enriched.sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
  }

  return enriched;
}

/**
 * Fetch report by ID with Asymmetric Privacy Masking:
 * - ADMIN: Full narrative, extracted entities, and complete device/camera forensics.
 * - REPORTER: Masked summary, category, status, and geographical bounds if token matches.
 * - PUBLIC: Sanitized public summary and status only.
 */
export async function getReportById(
  id: string,
  userRole: 'ADMIN' | 'REPORTER' | 'PUBLIC',
  reporterToken?: string | null
): Promise<{
  report: Partial<Report> | null;
  forensics?: ReportForensics | null;
  viewerRole: 'ADMIN' | 'REPORTER' | 'PUBLIC';
}> {
  const isLive = isUsingLiveSupabase();
  let rawReport: Report | null = null;
  let rawForensics: ReportForensics | null = null;

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data: repData, error: repErr } = await supabase.from('reports').select('*').eq('id', id).single();
      if (!repErr && repData) {
        rawReport = repData;
        if (userRole === 'ADMIN') {
          const { data: foreData } = await supabase.from('report_forensics').select('*').eq('report_id', id).single();
          rawForensics = foreData || null;
        }
      }
    } catch (err: any) {
      console.warn('[DB Adapter] Live Supabase getReportById failed, trying in-memory store:', err.message);
    }
  }

  // In-memory lookup if not found in Supabase or in demo mode
  if (!rawReport) {
    const store = getMemoryStore();
    rawReport = store.reports.find((r) => r.id === id) || null;
    if (rawReport && userRole === 'ADMIN') {
      rawForensics = store.forensics.find((f) => f.report_id === id) || null;
    }
  }

  // Fallback to VPS persistent repository
  if (!rawReport) {
    try {
      const vpsData = await fetchReportFromVps(id);
      if (vpsData?.report) {
        rawReport = vpsData.report;
        rawForensics = vpsData.forensics || null;
        const store = getMemoryStore();
        if (rawReport) {
          store.reports.unshift(rawReport as Report);
        }
        if (rawForensics) store.forensics.unshift(rawForensics);
      }
    } catch (e) {
      console.warn('[DB Adapter] Fallback fetch from VPS failed:', e);
    }
  }

  if (!rawReport) {
    return { report: null, viewerRole: userRole };
  }

  // 1. ADMIN: Return full report & forensics
  if (userRole === 'ADMIN') {
    return {
      report: rawReport,
      forensics: rawForensics,
      viewerRole: 'ADMIN',
    };
  }

  // 2. REPORTER: Validate token hash for verified reporter view
  if (reporterToken) {
    const computedHash = crypto.createHash('sha256').update(reporterToken).digest('hex');
    if (computedHash === rawReport.reporter_token_hash) {
      return {
        report: {
          id: rawReport.id,
          category: rawReport.category,
          temporal_context: rawReport.temporal_context,
          status: rawReport.status,
          public_masked_summary: rawReport.public_masked_summary,
          created_at: rawReport.created_at,
          updated_at: rawReport.updated_at,
          address_city: rawReport.address_city,
          address_district: rawReport.address_district,
        },
        viewerRole: 'REPORTER',
      };
    }
  }

  // 3. PUBLIC: Minimal sanitized representation
  return {
    report: {
      id: rawReport.id,
      category: rawReport.category,
      status: rawReport.status,
      public_masked_summary: rawReport.public_masked_summary,
      created_at: rawReport.created_at,
    },
    viewerRole: 'PUBLIC',
  };
}

/**
 * Creates a new emergency report, handles geospatial clustering, saves forensics,
 * and triggers the VPS queue worker webhook.
 */
export async function createReport(data: CreateReportInput): Promise<{
  success: boolean;
  reportId: string;
  clusterParentId: string | null;
  dbSaved: boolean;
  vpsQueueStatus: number;
  vpsMessage: string;
}> {
  const isLive = isUsingLiveSupabase();
  const reportId = crypto.randomUUID();
  const reporterTokenHash = crypto.createHash('sha256').update(data.reporterToken).digest('hex');
  const now = new Date().toISOString();

  let clusterParentId: string | null = null;
  let dbSaved = false;

  // Initial masked summary
  const initialSummary = 'Laporan diterima dan sedang dalam antrean verifikasi petugas lapangan.';
  const urgency = data.temporalContext === 'SEDANG_BERLANGSUNG' ? 75 : 50;

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();

      // RPC call to find nearby cluster (<500m & within 3h)
      const { data: rpcClusterId } = await supabase.rpc('find_nearby_active_cluster', {
        lat: data.latitude,
        lng: data.longitude,
        cat: data.category,
      });

      if (rpcClusterId) {
        clusterParentId = rpcClusterId;
      }

      // Storage upload for evidence if present
      let storagePath: string | null = null;
      if (data.imageWebpBase64 && data.imageWebpBase64.includes(',')) {
        try {
          const base64Data = data.imageWebpBase64.split(',')[1];
          const buffer = Buffer.from(base64Data, 'base64');
          const fileName = `${reportId}/${Date.now()}_evidence.webp`;

          const { data: uploadData, error: uploadErr } = await supabase.storage
            .from('evidence-vault')
            .upload(fileName, buffer, {
              contentType: 'image/webp',
              upsert: false,
            });

          if (!uploadErr && uploadData?.path) {
            storagePath = uploadData.path;
          } else {
            storagePath = `inline:${fileName}`;
          }
        } catch (uploadEx) {
          console.warn('[DB Adapter Storage] Supabase Storage upload skipped:', uploadEx);
        }
      }

      // Insert report
      const { error: repErr } = await supabase.from('reports').insert({
        id: reportId,
        cluster_parent_id: clusterParentId,
        reporter_token_hash: reporterTokenHash,
        category: data.category,
        temporal_context: data.temporalContext || 'SEDANG_BERLANGSUNG',
        status: 'BARU',
        urgency_score: urgency,
        credibility_score: 50,
        raw_reporter_input: data.rawReporterInput,
        public_masked_summary: initialSummary,
        admin_full_narrative: data.rawReporterInput,
        latitude: data.latitude,
        longitude: data.longitude,
        address_road: data.addressRoad || null,
        address_subdistrict: data.addressSubdistrict || null,
        address_district: data.addressDistrict || null,
        address_city: data.addressCity || null,
        address_province: data.addressProvince || null,
        location_landmark: data.locationLandmark || null,
        created_at: now,
        updated_at: now,
      });

      if (!repErr) {
        dbSaved = true;

        // Insert forensics
        await supabase.from('report_forensics').insert({
          report_id: reportId,
          reporter_ip: data.clientIp || null,
          user_agent: data.userAgent || null,
          device_platform: data.devicePlatform || null,
          compressed_image_path: storagePath,
          original_file_sha256: data.originalFileSha256 || null,
          compressed_file_sha256: data.compressedFileSha256 || null,
          exif_metadata: data.exifMetadata || {},
          exif_gps_latitude: data.exifGpsLatitude || null,
          exif_gps_longitude: data.exifGpsLongitude || null,
          exif_captured_at: data.exifCapturedAt || null,
          distance_pin_vs_exif_meters: data.distancePinVsExifMeters || null,
          is_metadata_consistent: data.isMetadataConsistent ?? true,
          created_at: now,
        });
      }
    } catch (err: any) {
      console.warn('[DB Adapter] Live Supabase insert failed, saving to in-memory store:', err.message);
    }
  }

  // Always sync into in-memory store as primary or fallback
  const store = getMemoryStore();

  if (!clusterParentId) {
    clusterParentId = findNearbyClusterInMemory(data.latitude, data.longitude, data.category, store);
  }

  const newReport: Report = {
    id: reportId,
    cluster_parent_id: clusterParentId,
    reporter_token_hash: reporterTokenHash,
    category: data.category,
    temporal_context: data.temporalContext || 'SEDANG_BERLANGSUNG',
    status: 'BARU',
    urgency_score: urgency,
    credibility_score: 50,
    is_potential_hoax: false,
    hoax_reason: null,
    raw_reporter_input: data.rawReporterInput,
    public_masked_summary: initialSummary,
    admin_full_narrative: data.rawReporterInput,
    extracted_entities: null,
    tactical_recommendation: null,
    latitude: data.latitude,
    longitude: data.longitude,
    address_road: data.addressRoad || null,
    address_subdistrict: data.addressSubdistrict || null,
    address_district: data.addressDistrict || null,
    address_city: data.addressCity || null,
    address_province: data.addressProvince || null,
    location_landmark: data.locationLandmark || null,
    cluster_count: 1,
    created_at: now,
    updated_at: now,
  };

  store.reports.unshift(newReport);

  const newForensics: ReportForensics = {
    id: crypto.randomUUID(),
    report_id: reportId,
    reporter_ip: data.clientIp || '127.0.0.1',
    user_agent: data.userAgent || 'Garda-Reporter/Web',
    device_platform: data.devicePlatform || 'Web Browser',
    compressed_image_path: data.imageWebpBase64 ? `in-memory:${reportId}/evidence.webp` : null,
    original_file_sha256: data.originalFileSha256 || null,
    compressed_file_sha256: data.compressedFileSha256 || null,
    exif_metadata: data.exifMetadata || {},
    exif_gps_latitude: data.exifGpsLatitude || null,
    exif_gps_longitude: data.exifGpsLongitude || null,
    exif_captured_at: data.exifCapturedAt || null,
    distance_pin_vs_exif_meters: data.distancePinVsExifMeters || null,
    is_metadata_consistent: data.isMetadataConsistent ?? true,
    media_purged_at: null,
    created_at: now,
  };

  store.forensics.unshift(newForensics);
  dbSaved = true;

  // Dispatch to VPS Queue Worker via HMAC-signed webhook
  const vpsDispatch = await dispatchReportToVpsQueue({
    reportId,
    rawReporterInput: data.rawReporterInput,
    category: data.category,
    temporalContext: data.temporalContext || 'SEDANG_BERLANGSUNG',
    latitude: data.latitude,
    longitude: data.longitude,
    addressRoad: data.addressRoad,
    addressSubdistrict: data.addressSubdistrict,
    addressDistrict: data.addressDistrict,
    addressCity: data.addressCity,
    addressProvince: data.addressProvince,
    locationLandmark: data.locationLandmark,
    reporterTokenHash,
    status: 'BARU',
    forensics: newForensics,
  });

  return {
    success: true,
    reportId,
    clusterParentId,
    dbSaved,
    vpsQueueStatus: vpsDispatch.status,
    vpsMessage: vpsDispatch.message,
  };
}

/**
 * Updates report status and writes an append-only, immutable audit log entry.
 */
export async function updateReportStatus(
  id: string,
  newStatus: ReportStatus,
  mandatoryNote: string,
  adminEmail: string,
  clientIp: string = '127.0.0.1'
): Promise<{ success: boolean; previousStatus: ReportStatus; newStatus: ReportStatus; message: string }> {
  if (!mandatoryNote || mandatoryNote.trim().length < 10) {
    throw new Error('Catatan tindakan petugas wajib diisi minimal 10 karakter.');
  }

  const isLive = isUsingLiveSupabase();
  let previousStatus: ReportStatus = 'BARU';
  const now = new Date().toISOString();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data: curRep, error: curErr } = await supabase.from('reports').select('status').eq('id', id).single();
      if (curErr || !curRep) throw new Error('Laporan tidak ditemukan di Supabase');

      previousStatus = curRep.status;

      // Update status
      const { error: updErr } = await supabase
        .from('reports')
        .update({ status: newStatus, updated_at: now })
        .eq('id', id);

      if (updErr) throw updErr;

      // Append immutable audit log
      const { error: audErr } = await supabase.from('admin_audit_logs').insert({
        report_id: id,
        admin_user_id: crypto.randomUUID(),
        admin_email: adminEmail,
        action_type: 'CHANGE_STATUS',
        previous_status: previousStatus,
        new_status: newStatus,
        mandatory_note: mandatoryNote.trim(),
        client_ip: clientIp,
        created_at: now,
      });

      if (audErr) {
        console.error('[DB Adapter Audit] Error appending to Supabase audit log:', audErr);
      }
    } catch (err: any) {
      console.warn('[DB Adapter] Live status update failed, syncing in-memory store:', err.message);
    }
  }

  // Update in-memory store
  const store = getMemoryStore();
  const report = store.reports.find((r) => r.id === id);
  if (!report) {
    throw new Error('Laporan tidak ditemukan.');
  }

  previousStatus = report.status;
  report.status = newStatus;
  report.updated_at = now;

  // Append immutable audit log (strictly append-only, no update/delete)
  const auditEntry: AdminAuditLog = {
    id: crypto.randomUUID(),
    report_id: id,
    admin_user_id: crypto.randomUUID(),
    admin_email: adminEmail,
    action_type: 'CHANGE_STATUS',
    previous_status: previousStatus,
    new_status: newStatus,
    mandatory_note: mandatoryNote.trim(),
    client_ip: clientIp,
    created_at: now,
  };

  store.auditLogs.unshift(auditEntry);

  return {
    success: true,
    previousStatus,
    newStatus,
    message: `Status berhasil diperbarui menjadi ${newStatus}. Tindakan telah dicatat secara permanen di log audit.`,
  };
}

/**
 * Updates report intelligence fields after asynchronous processing by VPS AI Worker.
 */
export async function updateReportIntelligence(
  id: string,
  intelligence: {
    category?: IncidentCategory;
    temporal_context?: TemporalStatus;
    urgency_score?: number;
    credibility_score?: number;
    is_potential_hoax?: boolean;
    hoax_reason?: string | null;
    public_masked_summary?: string;
    admin_full_narrative?: string;
    extracted_entities?: any;
    tactical_recommendation?: string;
    status?: ReportStatus;
  }
): Promise<{ success: boolean; report: Report }> {
  const isLive = isUsingLiveSupabase();
  const now = new Date().toISOString();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      await supabase
        .from('reports')
        .update({
          ...intelligence,
          updated_at: now,
        })
        .eq('id', id);
    } catch (err: any) {
      console.warn('[DB Adapter] Live Supabase intelligence update failed, syncing in-memory store:', err.message);
    }
  }

  const store = getMemoryStore();
  const report = store.reports.find((r) => r.id === id);
  if (!report) {
    throw new Error('Laporan tidak ditemukan.');
  }

  if (intelligence.category) report.category = intelligence.category;
  if (intelligence.temporal_context) report.temporal_context = intelligence.temporal_context;
  if (intelligence.urgency_score !== undefined) report.urgency_score = intelligence.urgency_score;
  if (intelligence.credibility_score !== undefined) report.credibility_score = intelligence.credibility_score;
  if (intelligence.is_potential_hoax !== undefined) report.is_potential_hoax = intelligence.is_potential_hoax;
  if (intelligence.hoax_reason !== undefined) report.hoax_reason = intelligence.hoax_reason;
  if (intelligence.public_masked_summary) report.public_masked_summary = intelligence.public_masked_summary;
  if (intelligence.admin_full_narrative) report.admin_full_narrative = intelligence.admin_full_narrative;
  if (intelligence.extracted_entities !== undefined) report.extracted_entities = intelligence.extracted_entities;
  if (intelligence.tactical_recommendation) report.tactical_recommendation = intelligence.tactical_recommendation;
  if (intelligence.status) report.status = intelligence.status;
  report.updated_at = now;

  return { success: true, report };
}

/**
 * Records an immutable READ_DETAIL action in the audit logs when an admin views a report.
 */
export async function recordReadAudit(
  reportId: string,
  adminEmail: string,
  clientIp: string = '127.0.0.1'
): Promise<{ success: boolean }> {
  const isLive = isUsingLiveSupabase();
  const now = new Date().toISOString();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      await supabase.from('admin_audit_logs').insert({
        report_id: reportId,
        admin_user_id: crypto.randomUUID(),
        admin_email: adminEmail,
        action_type: 'READ_DETAIL',
        mandatory_note: 'Petugas membuka dan membaca data detail utuh serta bukti forensik laporan.',
        client_ip: clientIp,
        created_at: now,
      });
    } catch (err: any) {
      console.warn('[DB Adapter] Live read audit logging skipped:', err.message);
    }
  }

  const store = getMemoryStore();
  store.auditLogs.unshift({
    id: crypto.randomUUID(),
    report_id: reportId,
    admin_user_id: crypto.randomUUID(),
    admin_email: adminEmail,
    action_type: 'READ_DETAIL',
    previous_status: null,
    new_status: null,
    mandatory_note: 'Petugas membuka dan membaca data detail utuh serta bukti forensik laporan.',
    client_ip: clientIp,
    created_at: now,
  });

  return { success: true };
}

/**
 * Retrieves bidirectional communication messages for a report.
 */
export async function getReportMessages(reportId: string): Promise<ReportMessage[]> {
  const isLive = isUsingLiveSupabase();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('report_messages')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: true });

      if (!error && data) return data;
    } catch (err: any) {
      console.warn('[DB Adapter] Live getReportMessages failed, falling back to memory store:', err.message);
    }
  }

  const store = getMemoryStore();
  return store.messages
    .filter((m) => m.report_id === reportId)
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime());
}

/**
 * Creates a message from Admin or Reporter.
 * If sent by ADMIN, automatically changes status to BUTUH_INFO_PELAPOR and appends audit log.
 */
export async function createMessage(
  reportId: string,
  senderRole: 'ADMIN' | 'REPORTER',
  messageText: string,
  adminEmail?: string | null,
  reporterToken?: string | null
): Promise<{ success: boolean; message: ReportMessage }> {
  if (!messageText || messageText.trim().length === 0) {
    throw new Error('Pesan tidak boleh kosong.');
  }

  const isLive = isUsingLiveSupabase();
  const now = new Date().toISOString();
  const msgId = crypto.randomUUID();

  // Validate report existence and reporter token if applicable
  const store = getMemoryStore();
  const report = store.reports.find((r) => r.id === reportId);

  if (senderRole === 'REPORTER' && reporterToken && report) {
    const computedHash = crypto.createHash('sha256').update(reporterToken).digest('hex');
    if (computedHash !== report.reporter_token_hash) {
      throw new Error('Token pelapor tidak valid.');
    }
  }

  const newMsg: ReportMessage = {
    id: msgId,
    report_id: reportId,
    sender_role: senderRole,
    admin_email: adminEmail || null,
    message_text: messageText.trim(),
    created_at: now,
  };

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase.from('report_messages').insert(newMsg).select().single();
      if (!error && data) {
        if (senderRole === 'ADMIN') {
          await supabase
            .from('reports')
            .update({ status: 'BUTUH_INFO_PELAPOR', updated_at: now })
            .eq('id', reportId);

          await supabase.from('admin_audit_logs').insert({
            report_id: reportId,
            admin_user_id: crypto.randomUUID(),
            admin_email: adminEmail || 'petugas@garda-lokal.id',
            action_type: 'SEND_MESSAGE_TO_REPORTER',
            mandatory_note: `Mengirim pesan klarifikasi ke pelapor: "${messageText.trim().substring(0, 50)}..."`,
            created_at: now,
          });
        }
      }
    } catch (err: any) {
      console.warn('[DB Adapter] Live createMessage failed, falling back to memory store:', err.message);
    }
  }

  store.messages.push(newMsg);

  if (senderRole === 'ADMIN' && report) {
    report.status = 'BUTUH_INFO_PELAPOR';
    report.updated_at = now;

    store.auditLogs.unshift({
      id: crypto.randomUUID(),
      report_id: reportId,
      admin_user_id: crypto.randomUUID(),
      admin_email: adminEmail || 'petugas@garda-lokal.id',
      action_type: 'SEND_MESSAGE_TO_REPORTER',
      previous_status: null,
      new_status: 'BUTUH_INFO_PELAPOR',
      mandatory_note: `Mengirim pesan klarifikasi ke pelapor: "${messageText.trim().substring(0, 50)}..."`,
      client_ip: '127.0.0.1',
      created_at: now,
    });
  }

  return { success: true, message: newMsg };
}

/**
 * Retrieves the immutable audit log history for a specific report.
 */
export async function getAuditLogs(reportId: string): Promise<AdminAuditLog[]> {
  const isLive = isUsingLiveSupabase();

  if (isLive) {
    try {
      const supabase = getSupabaseAdminClient();
      const { data, error } = await supabase
        .from('admin_audit_logs')
        .select('*')
        .eq('report_id', reportId)
        .order('created_at', { ascending: false });

      if (!error && data) return data;
    } catch (err: any) {
      console.warn('[DB Adapter] Live getAuditLogs failed, falling back to memory store:', err.message);
    }
  }

  const store = getMemoryStore();
  return store.auditLogs
    .filter((a) => a.report_id === reportId)
    .sort((a, b) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime());
}
