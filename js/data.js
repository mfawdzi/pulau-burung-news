/* =========================================================
   Pulau Burung News — Data Layer
   Menyimpan semua berita di localStorage (browser) sehingga
   berperan sebagai "database" sederhana tanpa server.
   File ini dipakai bersama oleh index.html (situs publik)
   dan admin.html (dashboard reporter/admin).
   ========================================================= */

const PBN_KEYS = {
  ARTICLES: 'pbn_articles_v1',
  USERS: 'pbn_users_v1',
  MARKET_WIDGET: 'pbn_market_widget_v1',
  SESSION: 'pbn_session_v1',
  LOKER_REQUESTS: 'pbn_loker_requests_v1',
  NEWS_TIPS: 'pbn_news_tips_v1',
  AD_REQUESTS: 'pbn_ad_requests_v1',
  COMMENTS: 'pbn_comments_v1',
  LIKES: 'pbn_likes_v1',
  SHOPEE_ADS: 'pbn_shopee_ads_v1',
  BOARD_CARDS: 'pbn_board_cards_v1'
};

/* ---------- Kartu Papan Informasi Desa (default) ---------- */
const PBN_DEFAULT_BOARD_CARDS = [
  {
    id: 'board-1',
    title: 'Jajak Pendapat Warga (Polling)',
    desc: "Bikin warga lebih terlibat — redaksi bisa tanya pendapat soal isu lokal (mis. 'Setuju jalan desa diperbaiki lewat swadaya?') dan lihat hasilnya real-time.",
    items: [
      'Pertanyaan + beberapa pilihan jawaban',
      'Warga vote satu kali per akun',
      'Hasil ditampilkan sebagai persentase/grafik'
    ]
  },
  {
    id: 'board-2',
    title: 'Kontak Darurat & Layanan Publik',
    desc: 'Daftar nomor penting yang sering dicari warga — puskesmas, polsek, damkar, kantor desa — daripada nyari-nyari di WA grup.',
    items: [
      'Nama layanan (Puskesmas, Polsek, dll)',
      'Nomor telepon/WA',
      'Jam operasional'
    ]
  },
  {
    id: 'board-3',
    title: 'Direktori UMKM & Usaha Lokal',
    desc: "Katalog toko/usaha kecil di kecamatan — beda dari Info Loker (lowongan kerja) dan Iklan (promosi berbayar), ini lebih ke 'buku alamat' usaha yang bisa dicari warga.",
    items: [
      'Nama usaha & jenis (warung, bengkel, dll)',
      'Desa/lokasi usaha',
      'Nomor WhatsApp kontak'
    ]
  },
  {
    id: 'board-4',
    title: 'Info Cuaca & Pasang Surut Air Laut',
    desc: 'Sangat relevan buat daerah pesisir kayak Pulau Burung — nelayan & warga yang mau bepergian pakai speedboat butuh info ini tiap hari.',
    items: [
      'Kondisi cuaca hari ini/besok',
      'Jadwal pasang-surut air laut',
      'Peringatan gelombang tinggi (kalau ada)'
    ]
  },
  {
    id: 'board-5',
    title: 'Agenda Kegiatan Desa',
    desc: 'Kalender kegiatan per desa — musyawarah, gotong royong, posyandu, turnamen, dll. Warga bisa tahu kapan & di mana acara berlangsung.',
    items: [
      'Tanggal & waktu kegiatan',
      'Nama desa penyelenggara',
      'Lokasi (mis. Balai Desa)'
    ]
  }
];

/* ---------- Peran pengguna ----------
   Urutan dari yang paling tinggi wewenangnya:
   superadmin > admin > reporter > pengunjung
   Hanya 'superadmin' yang boleh mengubah peran akun lain
   (menjadikan seseorang reporter atau mengembalikannya jadi pengunjung). */
const PBN_ROLES = [
  { id: 'superadmin', label: 'Admin Super' },
  { id: 'admin', label: 'Admin' },
  { id: 'reporter', label: 'Reporter' },
  { id: 'pengunjung', label: 'Pengunjung' }
];

function pbnRoleLabel(role) {
  const found = PBN_ROLES.find(r => r.id === role);
  return found ? found.label : role;
}

/* Peran yang boleh mengelola konten berita/papan desa */
function pbnCanManageContent(role) {
  return role === 'superadmin' || role === 'admin' || role === 'reporter';
}

/* Peran yang boleh menandai Hero & mengelola semua konten siapa pun */
function pbnIsEditorInChief(role) {
  return role === 'superadmin' || role === 'admin';
}

/* Hanya admin super yang boleh mengelola peran & akun pengguna */
function pbnCanManageUsers(role) {
  return role === 'superadmin';
}

/* ---------- Kategori resmi ---------- */
const PBN_CATEGORIES = [
  'Pulau Burung',
  'Berita Desa',
  'Peristiwa',
  'Pemerintahan',
  'Ekonomi',
  'Pendidikan',
  'Olahraga',
  'Info Loker'
];

/* ---------- Akun bawaan (demo) ----------
   Di aplikasi nyata, ganti dengan autentikasi server/API.
   Untuk demo ini, akun disimpan di localStorage agar bisa
   ditambah dari dashboard admin. */
const PBN_DEFAULT_USERS = [
  { username: 'superadmin', password: 'super123', role: 'superadmin', name: 'Admin Super PBN' },
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin Redaksi' },
  { username: 'reporter', password: 'reporter123', role: 'reporter', name: 'Reporter PBN' },
  { username: 'pengunjung', password: 'pengunjung123', role: 'pengunjung', name: 'Warga PBN' }
];

/* ---------- Data awal (contoh berita) ---------- */
const PBN_SEED_ARTICLES = [
  {
    id: 'a1',
    type: 'berita',
    title: 'Jalan Penghubung Desa Sungai Simbar dan Sungai Iyu Rusak Parah, Warga Keluhkan Kondisi Jalan',
    excerpt: 'Warga dua desa menuntut perbaikan segera setelah jalan penghubung utama tergenang dan berlubang sejak musim hujan lalu, menghambat akses ke pasar dan puskesmas terdekat.',
    content: 'Warga Desa Sungai Simbar dan Sungai Iyu mengeluhkan kondisi jalan penghubung antar desa yang rusak parah sejak musim hujan beberapa bulan terakhir. Sejumlah titik jalan tergenang air dan berlubang cukup dalam, sehingga menyulitkan warga yang hendak ke pasar maupun ke puskesmas terdekat.\n\nSalah satu warga mengatakan kondisi ini sudah berlangsung lama dan berdampak pada aktivitas ekonomi warga, terutama petani yang mengangkut hasil kebun. Warga berharap pemerintah kecamatan segera turun tangan melakukan perbaikan sebelum musim hujan berikutnya.\n\nHingga berita ini diturunkan, pihak kecamatan belum memberikan keterangan resmi terkait rencana perbaikan jalan tersebut.',
    category: 'Peristiwa',
    village: 'Sungai Simbar',
    author: 'Reporter PBN',
    date: '2026-08-28T09:40:00',
    views: 3421,
    isHero: true,
    ticker: true,
    status: 'published'
  },
  {
    id: 'a2',
    type: 'berita',
    title: 'Harga Kelapa di Pulau Burung Naik, Petani Mulai Rasakan Dampaknya',
    excerpt: 'Harga kelapa di tingkat petani naik menjadi Rp3.100/kg, memberi angin segar bagi perekonomian warga kecamatan.',
    content: 'Harga kelapa di wilayah Pulau Burung dilaporkan naik menjadi Rp3.100 per kilogram dalam dua pekan terakhir. Kenaikan ini disambut baik oleh petani setempat yang selama ini bergantung pada hasil kebun kelapa sebagai sumber penghasilan utama.\n\nSalah satu pengepul menyebutkan kenaikan harga dipengaruhi oleh permintaan pasar luar daerah yang meningkat menjelang akhir tahun. Petani berharap tren kenaikan harga ini dapat bertahan hingga beberapa bulan ke depan.',
    category: 'Ekonomi',
    village: 'Pulau Burung',
    author: 'Reporter PBN',
    date: '2026-08-28T07:30:00',
    views: 2108,
    isHero: false,
    ticker: true,
    status: 'published'
  },
  {
    id: 'a3',
    type: 'berita',
    title: 'Posko Layanan KTP Keliling Dibuka di Lima Desa Pekan Depan',
    excerpt: 'Pemerintah kecamatan membuka layanan KTP keliling untuk mempermudah warga yang belum sempat mengurus dokumen kependudukan.',
    content: 'Pemerintah Kecamatan Pulau Burung mengumumkan akan membuka posko layanan KTP keliling di lima desa mulai pekan depan. Layanan ini bertujuan mempermudah warga yang kesulitan mengurus dokumen kependudukan karena jarak tempuh ke kantor kecamatan.\n\nJadwal lengkap posko akan diumumkan melalui kantor desa masing-masing. Warga diimbau membawa dokumen pendukung seperti kartu keluarga dan surat pengantar dari RT/RW setempat.',
    category: 'Pemerintahan',
    village: 'Pulau Burung',
    author: 'Admin Redaksi',
    date: '2026-08-28T05:10:00',
    views: 1640,
    isHero: false,
    ticker: true,
    status: 'published'
  },
  {
    id: 'a4',
    type: 'berita',
    title: 'SDN 003 Pulau Burung Raih Juara Cerdas Cermat Tingkat Kabupaten',
    excerpt: 'Tim cerdas cermat SDN 003 Pulau Burung berhasil membawa pulang piala juara satu tingkat kabupaten.',
    content: 'Tim cerdas cermat dari SDN 003 Pulau Burung berhasil meraih juara satu dalam lomba cerdas cermat tingkat kabupaten yang digelar pekan lalu. Prestasi ini menjadi kebanggaan bagi sekolah dan orang tua siswa.\n\nKepala sekolah menyampaikan apresiasi kepada tim guru pembimbing dan siswa yang telah berlatih intensif selama sebulan terakhir sebelum perlombaan berlangsung.',
    category: 'Pendidikan',
    village: 'Pulau Burung',
    author: 'Reporter PBN',
    date: '2026-08-27T14:00:00',
    views: 980,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a5',
    type: 'berita',
    title: 'Musyawarah Desa Bahas Anggaran Perbaikan Dermaga Tahun 2027',
    excerpt: 'Musyawarah desa membahas rencana anggaran perbaikan dermaga yang akan diajukan pada tahun anggaran 2027.',
    content: 'Pemerintah Desa Pulau Burung menggelar musyawarah desa untuk membahas rencana anggaran perbaikan dermaga yang rusak akibat abrasi. Rencana ini akan diajukan pada tahun anggaran 2027 dan melibatkan partisipasi warga dalam proses perencanaannya.',
    category: 'Pulau Burung',
    village: 'Pulau Burung',
    author: 'Reporter PBN',
    date: '2026-08-28T08:15:00',
    views: 512,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a6',
    type: 'berita',
    title: 'Turnamen Voli Antar-Dusun Resmi Dibuka, Diikuti 12 Tim',
    excerpt: 'Turnamen voli tahunan antar-dusun resmi dibuka dan diikuti oleh 12 tim dari berbagai dusun.',
    content: 'Turnamen voli antar-dusun tahunan resmi dibuka dengan diikuti 12 tim dari berbagai dusun di kecamatan Pulau Burung. Turnamen ini diharapkan dapat mempererat silaturahmi antar warga sekaligus mencari bibit atlet voli daerah.',
    category: 'Olahraga',
    village: 'Pulau Burung',
    author: 'Kontributor',
    date: '2026-08-28T07:00:00',
    views: 430,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a7',
    type: 'berita',
    title: 'Kebakaran Lahan Kecil Terjadi di Dekat Perkebunan Kelapa, Tak Ada Korban Jiwa',
    excerpt: 'Kebakaran lahan skala kecil terjadi di dekat area perkebunan kelapa, berhasil dipadamkan warga sebelum meluas.',
    content: 'Kebakaran lahan berskala kecil terjadi di dekat area perkebunan kelapa milik warga. Api berhasil dipadamkan secara gotong royong oleh warga sekitar sebelum meluas ke area perkebunan. Tidak ada korban jiwa maupun kerugian besar dalam peristiwa ini.',
    category: 'Peristiwa',
    village: 'Sungai Iyu',
    author: 'Reporter PBN',
    date: '2026-08-28T05:00:00',
    views: 305,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a8',
    type: 'berita',
    title: 'Kecelakaan Speedboat di Perairan Pulau Burung, Satu Penumpang Luka Ringan',
    excerpt: 'Sebuah speedboat mengalami kecelakaan kecil di perairan Pulau Burung, satu penumpang mengalami luka ringan.',
    content: 'Sebuah speedboat penumpang mengalami kecelakaan kecil di perairan Pulau Burung akibat menghantam benda keras di bawah permukaan air. Satu penumpang dilaporkan mengalami luka ringan dan telah mendapat perawatan di puskesmas setempat.',
    category: 'Peristiwa',
    village: 'Pulau Burung',
    author: 'Reporter PBN',
    date: '2026-08-28T00:00:00',
    views: 890,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a9',
    type: 'berita',
    title: 'Banjir Rob Rendam Pemukiman di Sekitar Muara, Warga Diminta Waspada',
    excerpt: 'Banjir rob merendam sejumlah pemukiman di sekitar muara, warga diimbau waspada terhadap kenaikan air susulan.',
    content: 'Banjir rob merendam sejumlah pemukiman warga di sekitar muara akibat pasang air laut yang tinggi. Warga diimbau untuk tetap waspada terhadap potensi kenaikan air susulan dalam beberapa hari ke depan.',
    category: 'Peristiwa',
    village: 'Sungai Iyu',
    author: 'Reporter PBN',
    date: '2026-08-27T00:00:00',
    views: 670,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'a10',
    type: 'berita',
    title: 'Pencurian Hasil Kebun Dilaporkan Warga, Polsek Turun Tangan',
    excerpt: 'Warga melaporkan kasus pencurian hasil kebun kepada pihak kepolisian setempat, penyelidikan sedang berjalan.',
    content: 'Seorang warga melaporkan kasus pencurian hasil kebun kelapa kepada pihak Polsek setempat. Pihak kepolisian menyatakan telah menerima laporan dan tengah melakukan penyelidikan untuk mengungkap pelaku.',
    category: 'Peristiwa',
    village: 'Tanjung Simpang',
    author: 'Reporter PBN',
    date: '2026-08-26T00:00:00',
    views: 540,
    isHero: false,
    ticker: false,
    status: 'published'
  },
  {
    id: 'p1',
    type: 'papan',
    title: 'Jalan penghubung rusak parah, warga minta perbaikan',
    village: 'Sungai Simbar',
    category: 'Berita Desa',
    author: 'Reporter PBN',
    date: '2026-08-28T09:40:00',
    verifikasi: 'Terverifikasi',
    excerpt: '',
    content: '',
    views: 0,
    status: 'published'
  },
  {
    id: 'p2',
    type: 'papan',
    title: 'Musyawarah desa bahas anggaran dermaga 2027',
    village: 'Pulau Burung',
    category: 'Berita Desa',
    author: 'Reporter PBN',
    date: '2026-08-28T08:15:00',
    verifikasi: 'Terverifikasi',
    excerpt: '',
    content: '',
    views: 0,
    status: 'published'
  },
  {
    id: 'p3',
    type: 'papan',
    title: 'Bantuan bibit kelapa untuk kelompok tani didistribusikan',
    village: 'Sungai Iyu',
    category: 'Berita Desa',
    author: 'Kontributor',
    date: '2026-08-27T00:00:00',
    verifikasi: 'Menunggu Verifikasi',
    excerpt: '',
    content: '',
    views: 0,
    status: 'published'
  },
  {
    id: 'p4',
    type: 'papan',
    title: 'Kegiatan gotong royong bersihkan parit desa',
    village: 'Tanjung Simpang',
    category: 'Berita Desa',
    author: 'Kontributor',
    date: '2026-08-27T00:00:00',
    verifikasi: 'Terverifikasi',
    excerpt: '',
    content: '',
    views: 0,
    status: 'published'
  }
];

/* ---------- Inisialisasi (seed sekali saja) ---------- */
function pbnInit() {
  if (!localStorage.getItem(PBN_KEYS.ARTICLES)) {
    localStorage.setItem(
      PBN_KEYS.ARTICLES,
      JSON.stringify(PBN_SEED_ARTICLES)
    );
  }

  // Seed kartu Papan Informasi Desa (sekali saja)
  if (!localStorage.getItem(PBN_KEYS.BOARD_CARDS)) {
    localStorage.setItem(PBN_KEYS.BOARD_CARDS, JSON.stringify(PBN_DEFAULT_BOARD_CARDS));
  }

  // Pastikan akun default selalu tersedia
  let users = [];

  try {
    users = JSON.parse(localStorage.getItem(PBN_KEYS.USERS)) || [];
  } catch (e) {
    users = [];
  }

  PBN_DEFAULT_USERS.forEach(defaultUser => {
    const existing = users.find(
      u => u.username === defaultUser.username
    );

    if (!existing) {
      users.push(defaultUser);
    }
  });

  localStorage.setItem(
    PBN_KEYS.USERS,
    JSON.stringify(users)
  );
}

/* ---------- Articles CRUD ---------- */
function pbnGetArticles() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.ARTICLES)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveArticles(list) {
  localStorage.setItem(PBN_KEYS.ARTICLES, JSON.stringify(list));
}

function pbnGetArticleById(id) {
  return pbnGetArticles().find(a => a.id === id) || null;
}

function pbnUpsertArticle(article) {
  const list = pbnGetArticles();
  const idx = list.findIndex(a => a.id === article.id);
  if (idx >= 0) {
    list[idx] = article;
  } else {
    list.unshift(article);
  }
  pbnSaveArticles(list);
}

function pbnDeleteArticle(id) {
  const list = pbnGetArticles().filter(a => a.id !== id);
  pbnSaveArticles(list);
}

function pbnIncrementViews(id) {
  const list = pbnGetArticles();
  const item = list.find(a => a.id === id);
  if (item) {
    item.views = (item.views || 0) + 1;
    pbnSaveArticles(list);
  }
}

/* Jadikan satu artikel sebagai Hero (berita utama), dan otomatis
   melepas status Hero dari artikel lain supaya hanya ada 1 aktif. */
function pbnSetAsHero(id) {
  const list = pbnGetArticles();
  list.forEach(a => { a.isHero = (a.id === id); });
  pbnSaveArticles(list);
}

/* Nyalakan/matikan status ticker (running text) untuk satu artikel,
   tanpa mengubah artikel lain. Dipakai di menu Setting > Berita Live. */
function pbnSetArticleTicker(id, ticker) {
  const list = pbnGetArticles();
  const item = list.find(a => a.id === id);
  if (item) {
    item.ticker = !!ticker;
    pbnSaveArticles(list);
  }
}

function pbnNewId() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

/* ---------- Permintaan Pasang Info Loker ---------- */
function pbnGetLokerRequests() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.LOKER_REQUESTS)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveLokerRequests(list) {
  localStorage.setItem(PBN_KEYS.LOKER_REQUESTS, JSON.stringify(list));
}

function pbnAddLokerRequest(req) {
  const list = pbnGetLokerRequests();
  list.unshift({
    id: pbnNewId(),
    businessName: req.businessName,
    contactName: req.contactName,
    phone: req.phone,
    detail: req.detail,
    image: req.image || null,
    submittedBy: req.submittedBy || null,
    submittedByName: req.submittedByName || null,
    date: new Date().toISOString(),
    status: 'baru'
  });
  pbnSaveLokerRequests(list);
}

function pbnUpdateLokerRequestStatus(id, status, processor) {
  const list = pbnGetLokerRequests();
  const item = list.find(r => r.id === id);
  if (item) {
    item.status = status;
    if (status === 'diproses' && processor) {
      item.processedBy = processor.username;
      item.processedByName = processor.name;
    }
    pbnSaveLokerRequests(list);
  }
}

function pbnDeleteLokerRequest(id) {
  pbnSaveLokerRequests(pbnGetLokerRequests().filter(r => r.id !== id));
}

/* ---------- Info Berita dari Pengunjung ---------- */
function pbnGetNewsTips() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.NEWS_TIPS)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveNewsTips(list) {
  localStorage.setItem(PBN_KEYS.NEWS_TIPS, JSON.stringify(list));
}

function pbnAddNewsTip(tip) {
  const list = pbnGetNewsTips();
  list.unshift({
    id: pbnNewId(),
    title: tip.title,
    village: tip.village,
    detail: tip.detail,
    phone: tip.phone || '',
    image: tip.image || null,
    submittedBy: tip.submittedBy,
    submittedByName: tip.submittedByName,
    date: new Date().toISOString(),
    status: 'baru' // baru -> diproses -> diterbitkan / ditolak
  });
  pbnSaveNewsTips(list);
}

function pbnUpdateNewsTipStatus(id, status, processor) {
  const list = pbnGetNewsTips();
  const item = list.find(t => t.id === id);
  if (item) {
    item.status = status;
    if (status === 'diproses' && processor) {
      item.processedBy = processor.username;
      item.processedByName = processor.name;
    }
    pbnSaveNewsTips(list);
  }
}

function pbnDeleteNewsTip(id) {
  pbnSaveNewsTips(pbnGetNewsTips().filter(t => t.id !== id));
}

/* ---------- Permintaan Pasang Iklan ---------- */
function pbnGetAdRequests() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.AD_REQUESTS)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveAdRequests(list) {
  localStorage.setItem(PBN_KEYS.AD_REQUESTS, JSON.stringify(list));
}

function pbnAddAdRequest(req) {
  const list = pbnGetAdRequests();
  list.unshift({
    id: pbnNewId(),
    businessName: req.businessName,
    phone: req.phone,
    detail: req.detail,
    image: req.image || null,
    submittedBy: req.submittedBy,
    submittedByName: req.submittedByName,
    date: new Date().toISOString(),
    status: 'baru' // baru -> diproses -> selesai
  });
  pbnSaveAdRequests(list);
}

function pbnUpdateAdRequestStatus(id, status, processor) {
  const list = pbnGetAdRequests();
  const item = list.find(r => r.id === id);
  if (item) {
    item.status = status;
    if (status === 'diproses' && processor) {
      item.processedBy = processor.username;
      item.processedByName = processor.name;
    }
    pbnSaveAdRequests(list);
  }
}

function pbnDeleteAdRequest(id) {
  pbnSaveAdRequests(pbnGetAdRequests().filter(r => r.id !== id));
}

/* =========================================================
   WIDGET HARGA KELAPA & EMAS
   ========================================================= */

const PBN_DEFAULT_MARKET_WIDGET = {
  enabled: true,

  kelapa: {
    enabled: true,
    title: 'Harga Kelapa',
    price: 'Rp 3.500',
    unit: 'per kg',
    note: 'Harga kelapa terbaru.'
  },

emas: {
  enabled: true,
  title: 'Harga Emas ANTAM',
  note: 'Harga emas terbaru.',
  updatedAt: '2 September 2026, 00.55 WIB',

  buyLink: 'https://wa.me/6281234567890',
  phone: '',

  // Daftar pecahan harga emas — bisa ditambah/diedit/dihapus lewat dashboard admin.
  // Tiap pecahan punya harga jual (price) dan harga buyback sendiri.
  denominations: [
    { id: 'emas-1', label: '0.5 gram', price: 'Rp 1.225.000', buyback: 'Rp 1.150.000' },
    { id: 'emas-2', label: '1 gram',   price: 'Rp 2.450.000', buyback: 'Rp 2.300.000' },
    { id: 'emas-3', label: '2 gram',   price: 'Rp 4.900.000', buyback: 'Rp 4.600.000' }
  ]
},

  autoHide: 10
};

function pbnGetMarketWidget() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PBN_KEYS.MARKET_WIDGET)
    );

    if (!saved) {
      return JSON.parse(
        JSON.stringify(PBN_DEFAULT_MARKET_WIDGET)
      );
    }

    // Migrasi data lama: sebelumnya emas hanya punya 1 harga (price/buyback)
    // tanpa daftar pecahan. Jika ditemukan, ubah jadi 1 baris denominations.
    if (saved.emas && !Array.isArray(saved.emas.denominations) && saved.emas.price) {
      saved.emas.denominations = [{
        id: 'emas-migrated',
        label: saved.emas.unit || '1 gram',
        price: saved.emas.price,
        buyback: saved.emas.buyback || ''
      }];
    }

    return {
      ...PBN_DEFAULT_MARKET_WIDGET,
      ...saved,
      kelapa: {
        ...PBN_DEFAULT_MARKET_WIDGET.kelapa,
        ...(saved.kelapa || {})
      },
      emas: {
        ...PBN_DEFAULT_MARKET_WIDGET.emas,
        ...(saved.emas || {})
      }
    };

  } catch (e) {
    return JSON.parse(
      JSON.stringify(PBN_DEFAULT_MARKET_WIDGET)
    );
  }
}

function pbnSaveMarketWidget(settings) {
  localStorage.setItem(
    PBN_KEYS.MARKET_WIDGET,
    JSON.stringify(settings)
  );
}

/* =========================================================
   WIDGET IKLAN PROMO SHOPEE
   ========================================================= */

const PBN_DEFAULT_SHOPEE_ADS = {
  enabled: true,
  // Tidak diisi foto contoh (harus diupload admin) supaya widget
  // otomatis tersembunyi sampai superadmin menambahkan iklan asli.
  items: []
};

function pbnGetShopeeAds() {
  try {
    const saved = JSON.parse(
      localStorage.getItem(PBN_KEYS.SHOPEE_ADS)
    );

    if (!saved) {
      return JSON.parse(
        JSON.stringify(PBN_DEFAULT_SHOPEE_ADS)
      );
    }

    return {
      enabled: saved.enabled !== false,
      items: Array.isArray(saved.items) ? saved.items : []
    };

  } catch (e) {
    return JSON.parse(
      JSON.stringify(PBN_DEFAULT_SHOPEE_ADS)
    );
  }
}

function pbnSaveShopeeAds(settings) {
  localStorage.setItem(
    PBN_KEYS.SHOPEE_ADS,
    JSON.stringify(settings)
  );
}

function pbnAddShopeeAd(item) {
  const settings = pbnGetShopeeAds();
  item.id = 'shopee-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  item.order = settings.items.length + 1;
  settings.items.push(item);
  pbnSaveShopeeAds(settings);
  return item;
}

function pbnUpdateShopeeAd(id, patch) {
  const settings = pbnGetShopeeAds();
  const item = settings.items.find(i => i.id === id);
  if (item) {
    Object.assign(item, patch);
    pbnSaveShopeeAds(settings);
  }
  return item;
}

function pbnDeleteShopeeAd(id) {
  const settings = pbnGetShopeeAds();
  settings.items = settings.items.filter(i => i.id !== id);
  pbnSaveShopeeAds(settings);
}

/* ---------- Papan Informasi Desa (CRUD) ---------- */
function pbnGetBoardCards() {
  try {
    const saved = JSON.parse(localStorage.getItem(PBN_KEYS.BOARD_CARDS));
    if (!Array.isArray(saved)) {
      return JSON.parse(JSON.stringify(PBN_DEFAULT_BOARD_CARDS));
    }
    return saved;
  } catch (e) {
    return JSON.parse(JSON.stringify(PBN_DEFAULT_BOARD_CARDS));
  }
}

function pbnSaveBoardCards(list) {
  localStorage.setItem(PBN_KEYS.BOARD_CARDS, JSON.stringify(list));
}

function pbnAddBoardCard(card) {
  const list = pbnGetBoardCards();
  list.push({
    id: pbnNewId(),
    title: (card.title || '').trim(),
    desc: (card.desc || '').trim(),
    items: Array.isArray(card.items) ? card.items.filter(t => t.trim()) : []
  });
  pbnSaveBoardCards(list);
}

function pbnUpdateBoardCard(id, patch) {
  const list = pbnGetBoardCards();
  const item = list.find(c => c.id === id);
  if (item) {
    Object.assign(item, patch);
    pbnSaveBoardCards(list);
  }
}

function pbnDeleteBoardCard(id) {
  pbnSaveBoardCards(pbnGetBoardCards().filter(c => c.id !== id));
}

/* ---------- Komentar ----------
   Untuk saat ini komentar dikirim pengunjung lewat dashboard admin.html
   (pilih judul berita + tulis komentar) dan dimoderasi oleh admin/admin super.
   Menampilkan komentar langsung di bawah artikel pada index.html adalah
   langkah lanjutan yang belum dikerjakan di file ini. */
function pbnGetComments() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.COMMENTS)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveComments(list) {
  localStorage.setItem(PBN_KEYS.COMMENTS, JSON.stringify(list));
}

function pbnAddComment(comment) {
  const list = pbnGetComments();
  list.unshift({
    id: pbnNewId(),
    articleId: comment.articleId,
    articleTitle: comment.articleTitle,
    text: comment.text,
    submittedBy: comment.submittedBy,
    submittedByName: comment.submittedByName,
    date: new Date().toISOString(),
    status: 'terbit' // terbit / disembunyikan
  });
  pbnSaveComments(list);
}

function pbnUpdateCommentStatus(id, status) {
  const list = pbnGetComments();
  const item = list.find(c => c.id === id);
  if (item) {
    item.status = status;
    pbnSaveComments(list);
  }
}

function pbnDeleteComment(id) {
  pbnSaveComments(pbnGetComments().filter(c => c.id !== id));
}

/* ---------- Users / Auth ---------- */
function pbnGetUsers() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.USERS)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveUsers(list) {
  localStorage.setItem(PBN_KEYS.USERS, JSON.stringify(list));
}

function pbnLogin(username, password) {
  username = (username || '').trim().toLowerCase();
  password = (password || '').trim();

  // Pastikan akun Super Admin selalu tersedia
  if (username === 'superadmin' && password === 'super123') {
    const users = pbnGetUsers();
    let user = users.find(u => u.username === 'superadmin');

    if (!user) {
      user = {
        username: 'superadmin',
        password: 'super123',
        role: 'superadmin',
        name: 'Admin Super PBN'
      };

      users.push(user);
      pbnSaveUsers(users);
    } else {
      // Pastikan data Super Admin tetap benar
      user.password = 'super123';
      user.role = 'superadmin';
      user.name = 'Admin Super PBN';
      pbnSaveUsers(users);
    }

    sessionStorage.setItem(
      PBN_KEYS.SESSION,
      JSON.stringify({
        username: 'superadmin',
        role: 'superadmin',
        name: 'Admin Super PBN'
      })
    );

    return user;
  }

  // Login akun lainnya
  const user = pbnGetUsers().find(
    u => u.username === username && u.password === password
  );

  if (user) {
    sessionStorage.setItem(
      PBN_KEYS.SESSION,
      JSON.stringify({
        username: user.username,
        role: user.role,
        name: user.name
      })
    );

    return user;
  }

  return null;
}

function pbnLogout() {
  sessionStorage.removeItem(PBN_KEYS.SESSION);
}

function pbnCurrentUser() {
  try {
    return JSON.parse(sessionStorage.getItem(PBN_KEYS.SESSION));
  } catch (e) {
    return null;
  }
}

function pbnGetUserByUsername(username) {
  return pbnGetUsers().find(u => u.username === username) || null;
}

/* Pendaftaran akun baru — selalu jadi 'pengunjung'.
   Hanya admin super yang bisa menaikkan jadi reporter/admin nantinya. */
function pbnRegisterUser({
  username,
  password,
  name,
  phone,
  email
}) {
  username = (username || '').trim().toLowerCase();

  if (!username || !password || !name) {
    return {
      error: 'Semua kolom wajib diisi.'
    };
  }

  if (pbnGetUserByUsername(username)) {
    return {
      error: 'Username sudah dipakai, coba yang lain.'
    };
  }

  const users = pbnGetUsers();

  const newUser = {
    username,
    password,
    role: 'pengunjung',
    name: name.trim(),
    phone: (phone || '').trim(),
    email: (email || '').trim(),
    avatar: null
  };

  users.push(newUser);

  pbnSaveUsers(users);

  return {
    user: newUser
  };
}

/* Ubah peran akun — dipanggil dari panel Manajemen Pengguna (admin super saja) */
function pbnUpdateUserRole(username, newRole) {
  const users = pbnGetUsers();
  const user = users.find(u => u.username === username);
  if (!user) return false;
  user.role = newRole;
  pbnSaveUsers(users);
  return true;
}

function pbnDeleteUser(username) {
  const users = pbnGetUsers().filter(u => u.username !== username);
  pbnSaveUsers(users);
}

/* Perbarui profil (nama/telepon/kata sandi/foto) — dipakai lewat modal "Profil Kita" di index.html */
function pbnUpdateProfile(
  username,
  { username: newUsername, name, phone, email, password, avatar }
) {
  const users = pbnGetUsers();

  const user = users.find(
    u => u.username === username
  );

  if (!user) return null;

  if (newUsername && newUsername !== user.username) {
    const normalizedUsername = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(normalizedUsername)) return null;
    const duplicate = users.find(
      u => u.username === normalizedUsername && u !== user
    );
    if (duplicate) return null;
    user.username = normalizedUsername;
  }

  if (name) {
    user.name = name.trim();
  }

  if (phone !== undefined) {
    user.phone = phone.trim();
  }

  if (email !== undefined) {
    user.email = email.trim();
  }

  if (password) {
    user.password = password;
  }

  if (avatar !== undefined) {
    user.avatar = avatar;
  }

  pbnSaveUsers(users);

  /* Sinkronkan session */
  const session = pbnCurrentUser();

  if (
    session &&
    session.username === username
  ) {
    session.username = user.username;
    session.name = user.name;
    session.phone = user.phone;
    session.email = user.email;
    session.avatar = user.avatar;

    sessionStorage.setItem(
      PBN_KEYS.SESSION,
      JSON.stringify(session)
    );
  }

  return user;
}

/* Cocokkan username + email + nomor WA persis dengan data akun.
   Dipakai untuk alur "Lupa Kata Sandi" (tanpa OTP nyata). */
function pbnVerifyIdentity(username, email, phone) {
  const user = pbnGetUserByUsername((username || '').trim().toLowerCase());
  if (!user) return null;
  const emailMatch = (user.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase();
  const phoneMatch = (user.phone || '').replace(/\D/g, '') === (phone || '').replace(/\D/g, '');
  if (emailMatch && phoneMatch && user.email && user.phone) {
    return user;
  }
  return null;
}

/* Set kata sandi baru langsung (dipakai setelah pbnVerifyIdentity berhasil). */
function pbnResetPassword(username, newPassword) {
  const users = pbnGetUsers();
  const user = users.find(u => u.username === username);
  if (!user) return false;
  user.password = newPassword;
  pbnSaveUsers(users);
  return true;
}

/* ---------- Suka (Like) Berita ---------- */
function pbnGetLikes() {
  try {
    return JSON.parse(localStorage.getItem(PBN_KEYS.LIKES)) || [];
  } catch (e) {
    return [];
  }
}

function pbnSaveLikes(list) {
  localStorage.setItem(PBN_KEYS.LIKES, JSON.stringify(list));
}

function pbnHasLiked(articleId, username) {
  if (!username) return false;
  return pbnGetLikes().some(l => l.articleId === articleId && l.username === username);
}

function pbnGetLikeCount(articleId) {
  return pbnGetLikes().filter(l => l.articleId === articleId).length;
}

/* Nyalakan/matikan suka untuk satu pengguna. Mengembalikan status terbaru. */
function pbnToggleLike(articleId, username) {
  const list = pbnGetLikes();
  const idx = list.findIndex(l => l.articleId === articleId && l.username === username);
  if (idx >= 0) {
    list.splice(idx, 1);
  } else {
    list.push({ articleId, username, date: new Date().toISOString() });
  }
  pbnSaveLikes(list);
  return { liked: idx < 0, count: list.filter(l => l.articleId === articleId).length };
}

/* ---------- Util ---------- */
/* Membaca file (foto) jadi data URL base64 untuk disimpan di localStorage.
   maxBytes membatasi ukuran supaya tidak menghabiskan kuota localStorage. */
function pbnReadFileAsDataURL(file, maxBytes) {
  return new Promise((resolve, reject) => {
    if (!file) { resolve(null); return; }
    if (maxBytes && file.size > maxBytes) {
      reject(new Error('Ukuran file terlalu besar (maksimal ' + Math.round(maxBytes / (1024 * 1024) * 10) / 10 + 'MB).'));
      return;
    }
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = () => reject(new Error('Gagal membaca file.'));
    reader.readAsDataURL(file);
  });
}

/* Mengubah link video (YouTube, dsb) jadi HTML embed untuk ditampilkan di modal berita.
   Link YouTube diubah jadi iframe embed; link video langsung (mp4, dst) dipakai lewat tag <video>. */
function pbnVideoEmbedHtml(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) {
    return `<div class="modal-video"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Video berita" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  }
  const fb = url.match(/facebook\.com|fb\.watch/);
  if (fb) {
    return `<div class="modal-video"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}" title="Video berita" allowfullscreen loading="lazy"></iframe></div>`;
  }
  return `<div class="modal-video"><video src="${pbnEscapeHtml(url)}" controls preload="metadata"></video></div>`;
}

function pbnFormatDate(iso) {
  const d = new Date(iso);
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const jam = String(d.getHours()).padStart(2, '0');
  const menit = String(d.getMinutes()).padStart(2, '0');
  return `${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()}, ${jam}.${menit} WIB`;
}

function pbnRelativeTime(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diffMs / 60000);
  if (mins < 1) return 'Baru saja';
  if (mins < 60) return `${mins} menit lalu`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} jam lalu`;
  const days = Math.floor(hrs / 24);
  if (days === 1) return 'Kemarin';
  if (days < 7) return `${days} hari lalu`;
  return pbnFormatDate(iso);
}

function pbnCategoryTagClass(category) {
  const map = {
    'Pulau Burung': 'tag-pulau',
    'Berita Desa': 'tag-pulau',
    'Peristiwa': 'tag-peristiwa',
    'Pemerintahan': 'tag-pemerintahan',
    'Ekonomi': 'tag-ekonomi',
    'Pendidikan': 'tag-pendidikan',
    'Olahraga': 'tag-olahraga',
    'Info Loker': 'tag-loker'
  };
  return map[category] || 'tag-pulau';
}

function pbnEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

pbnInit();
