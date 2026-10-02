/* =========================================================
   Pulau Burung News — Data Layer (versi Firestore)
   Semua data disinkronkan real-time dari Firestore lewat
   onSnapshot, disimpan di PBN_CACHE, lalu dibaca sinkron
   oleh fungsi pbnGet... seperti sebelumnya (localStorage).
   ========================================================= */

const PBN_KEYS = {
  SESSION: 'pbn_session_v1'
};

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
function pbnCanManageContent(role) {
  return role === 'superadmin' || role === 'admin' || role === 'reporter';
}
function pbnIsEditorInChief(role) {
  return role === 'superadmin' || role === 'admin';
}
function pbnCanManageUsers(role) {
  return role === 'superadmin';
}

const PBN_CATEGORIES = [
  'Pulau Burung', 'Berita Desa', 'Peristiwa', 'Pemerintahan',
  'Ekonomi', 'Pendidikan', 'Olahraga', 'Info Loker'
];

const PBN_DEFAULT_USERS = [];

const PBN_SEED_ARTICLES = [
  { id: 'a1', type: 'berita', title: 'Jalan Penghubung Desa Sungai Simbar dan Sungai Iyu Rusak Parah, Warga Keluhkan Kondisi Jalan', excerpt: 'Warga dua desa menuntut perbaikan segera.', content: 'Warga Desa Sungai Simbar dan Sungai Iyu mengeluhkan kondisi jalan penghubung antar desa yang rusak parah.', category: 'Peristiwa', village: 'Sungai Simbar', author: 'Reporter PBN', date: '2026-08-28T09:40:00', views: 3421, isHero: true, ticker: true, status: 'published' },
  { id: 'a2', type: 'berita', title: 'Harga Kelapa di Pulau Burung Naik', excerpt: 'Harga kelapa naik menjadi Rp3.100/kg.', content: 'Harga kelapa di wilayah Pulau Burung dilaporkan naik.', category: 'Ekonomi', village: 'Pulau Burung', author: 'Reporter PBN', date: '2026-08-28T07:30:00', views: 2108, isHero: false, ticker: true, status: 'published' }
];

const PBN_DEFAULT_MARKET_WIDGET = {
  enabled: true,
  kelapa: { enabled: true, title: 'Harga Kelapa', price: 'Rp 3.500', unit: 'per kg', note: 'Harga kelapa terbaru.' },
  emas: {
    enabled: true, title: 'Harga Emas ANTAM', note: 'Harga emas terbaru.', updatedAt: '-',
    buyLink: '', phone: '',
    denominations: [{ id: 'emas-1', label: '1 gram', price: 'Rp 2.450.000', buyback: 'Rp 2.300.000' }]
  },
  shopeepay: { enabled: false, link: '' },
  autoHide: 10
};

const PBN_DEFAULT_SHOPEE_ADS = { enabled: true, items: [] };
const PBN_DEFAULT_POPUP_VIDEO = { enabled: false, videoUrl: '', linkUrl: '' };

const PBN_DEFAULT_BOARD_CARDS = [
  { id: 'board-1', title: 'Jajak Pendapat Warga (Polling)', desc: 'Bikin warga lebih terlibat lewat jajak pendapat isu lokal.', items: ['Pertanyaan + beberapa pilihan jawaban', 'Warga vote satu kali per akun', 'Hasil ditampilkan sebagai persentase/grafik'] },
  { id: 'board-2', title: 'Kontak Darurat & Layanan Publik', desc: 'Daftar nomor penting yang sering dicari warga.', items: ['Nama layanan (Puskesmas, Polsek, dll)', 'Nomor telepon/WA', 'Jam operasional'] }
];

/* ---------- Cache lokal, disinkronkan real-time dari Firestore ---------- */
const PBN_CACHE = {
  articles: [], users: [], lokerRequests: [], newsTips: [], adRequests: [],
  comments: [], likes: [], boardCards: [], me: null,
  marketWidget: JSON.parse(JSON.stringify(PBN_DEFAULT_MARKET_WIDGET)),
  shopeeAds: JSON.parse(JSON.stringify(PBN_DEFAULT_SHOPEE_ADS)),
  popupVideo: JSON.parse(JSON.stringify(PBN_DEFAULT_POPUP_VIDEO)),
  ready: {}
};

function pbnNotifyChange(name) {
  document.dispatchEvent(new CustomEvent('pbn:data-changed', { detail: { name } }));
}

function pbnNewId() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pbnSubscribeCollection(colName, cacheKey, query) {
  return (query || db.collection(colName)).onSnapshot(snap => {
    PBN_CACHE[cacheKey] = snap.docs.map(d => ({ id: d.id, ...d.data() }));
    PBN_CACHE.ready[cacheKey] = true;
    pbnNotifyChange(cacheKey);
  }, err => console.error('[Firestore] gagal memantau ' + colName, err));
}

function pbnSubscribeDoc(colName, docId, cacheKey, defaults) {
  db.collection(colName).doc(docId).onSnapshot(snap => {
    PBN_CACHE[cacheKey] = snap.exists ? { ...defaults, ...snap.data() } : JSON.parse(JSON.stringify(defaults));
    PBN_CACHE.ready[cacheKey] = true;
    pbnNotifyChange(cacheKey);
  }, err => console.error('[Firestore] gagal memantau ' + colName + '/' + docId, err));
}

async function pbnSeedIfEmpty() {
  try {
    const artSnap = await db.collection('articles').limit(1).get();
    if (artSnap.empty) {
      const batch = db.batch();
      PBN_SEED_ARTICLES.forEach(a => batch.set(db.collection('articles').doc(a.id), a));
      await batch.commit();
    }
    
    // BAGIAN SEEDING USER SUDAH DIHAPUS DEMI KEAMANAN

    const boardSnap = await db.collection('boardCards').limit(1).get();
    if (boardSnap.empty) {
      const batch3 = db.batch();
      PBN_DEFAULT_BOARD_CARDS.forEach(c => batch3.set(db.collection('boardCards').doc(c.id), c));
      await batch3.commit();
    }
  } catch (e) {
    console.error('[Firestore] gagal seeding data awal', e);
  }
}

/* Data publik: boleh dibaca siapa saja (sesuai firestore.rules) */
function pbnInit() {
  pbnSubscribeCollection('articles', 'articles');
  pbnSubscribeCollection('comments', 'comments');
  pbnSubscribeCollection('likes', 'likes');
  pbnSubscribeCollection('boardCards', 'boardCards');
  pbnSubscribeDoc('settings', 'marketWidget', 'marketWidget', PBN_DEFAULT_MARKET_WIDGET);
  pbnSubscribeDoc('settings', 'shopeeAds', 'shopeeAds', PBN_DEFAULT_SHOPEE_ADS);
  pbnSubscribeDoc('settings', 'popupVideo', 'popupVideo', PBN_DEFAULT_POPUP_VIDEO);
  pbnInitAuth();
}

/* Data privat: hanya dipantau setelah login, sesuai peran */
let PBN_ME_UNSUB = null;
let PBN_PRIVATE_UNSUBS = [];
const PBN_PRIVATE_KEYS = ['users', 'lokerRequests', 'newsTips', 'adRequests'];

function pbnClearPrivate() {
  PBN_PRIVATE_UNSUBS.forEach(f => { try { f(); } catch (e) {} });
  PBN_PRIVATE_UNSUBS = [];
  PBN_PRIVATE_KEYS.forEach(k => { PBN_CACHE[k] = []; PBN_CACHE.ready[k] = false; });
}

function pbnSubscribePrivate(me) {
  pbnClearPrivate();
  const isSuper = me.role === 'superadmin';
  const isEditor = isSuper || me.role === 'admin';
  const isStaff = isEditor || me.role === 'reporter';
  const own = col => db.collection(col).where('submittedBy', '==', me.username);
  const sub = (col, q) => PBN_PRIVATE_UNSUBS.push(pbnSubscribeCollection(col, col, q));
  if (isSuper) sub('users');
  sub('lokerRequests', isEditor ? null : own('lokerRequests'));
  sub('adRequests', isEditor ? null : own('adRequests'));
  sub('newsTips', isStaff ? null : own('newsTips'));
  if (isEditor) pbnSeedIfEmpty();
}

function pbnInitAuth() {
  auth.onAuthStateChanged(fbUser => {
    if (PBN_ME_UNSUB) { PBN_ME_UNSUB(); PBN_ME_UNSUB = null; }
    if (!fbUser) {
      pbnClearPrivate();
      PBN_CACHE.me = null;
      sessionStorage.removeItem(PBN_KEYS.SESSION);
      PBN_CACHE.ready.auth = true;
      pbnNotifyChange('me');
      return;
    }
    PBN_ME_UNSUB = db.collection('users').doc(fbUser.uid).onSnapshot(snap => {
      if (!auth.currentUser || auth.currentUser.uid !== fbUser.uid) return;
      const prevRole = PBN_CACHE.me && PBN_CACHE.me.role;
      if (snap.exists) {
        PBN_CACHE.me = { id: snap.id, ...snap.data() };
        pbnSaveHint(PBN_CACHE.me);
        if (prevRole !== PBN_CACHE.me.role) pbnSubscribePrivate(PBN_CACHE.me);
      } else {
        // Profil belum dibuat (sedang daftar) atau sudah dihapus admin
        PBN_CACHE.me = null;
        pbnClearPrivate();
        sessionStorage.removeItem(PBN_KEYS.SESSION);
      }
      PBN_CACHE.ready.auth = true;
      pbnNotifyChange('me');
    }, err => {
      console.error('[Auth] gagal membaca profil', err);
      PBN_CACHE.ready.auth = true;
      pbnNotifyChange('me');
    });
  });
}

/* ---------- Articles ---------- */
function pbnGetArticles() { return PBN_CACHE.articles; }
function pbnGetArticleById(id) { return PBN_CACHE.articles.find(a => a.id === id) || null; }
function pbnUpsertArticle(article) {
  if (!article.id) article.id = pbnNewId();
  db.collection('articles').doc(article.id).set(article).catch(e => console.error(e));
}
function pbnDeleteArticle(id) {
  db.collection('articles').doc(id).delete().catch(e => console.error(e));
}
function pbnIncrementViews(id) {
  db.collection('articles').doc(id).update({ views: firebase.firestore.FieldValue.increment(1) }).catch(e => console.error(e));
}
function pbnSetAsHero(id) {
  const batch = db.batch();
  PBN_CACHE.articles.forEach(a => batch.update(db.collection('articles').doc(a.id), { isHero: a.id === id }));
  batch.commit().catch(e => console.error(e));
}
function pbnSetArticleTicker(id, ticker) {
  db.collection('articles').doc(id).update({ ticker: !!ticker }).catch(e => console.error(e));
}

/* ---------- Permintaan Loker ---------- */
function pbnGetLokerRequests() { return PBN_CACHE.lokerRequests; }
function pbnAddLokerRequest(req) {
  const id = pbnNewId();
  db.collection('lokerRequests').doc(id).set({
    businessName: req.businessName, contactName: req.contactName, phone: req.phone,
    detail: req.detail, image: req.image || null, submittedBy: req.submittedBy || null,
    submittedByName: req.submittedByName || null, date: new Date().toISOString(), status: 'baru'
  }).catch(e => console.error(e));
}
function pbnUpdateLokerRequestStatus(id, status, processor) {
  const patch = { status };
  if (status === 'diproses' && processor) { patch.processedBy = processor.username; patch.processedByName = processor.name; }
  db.collection('lokerRequests').doc(id).update(patch).catch(e => console.error(e));
}
function pbnDeleteLokerRequest(id) {
  db.collection('lokerRequests').doc(id).delete().catch(e => console.error(e));
}
function pbnSaveLokerRequests(list) {
  list.forEach(item => db.collection('lokerRequests').doc(item.id).set(item, { merge: true }).catch(e => console.error(e)));
}

/* ---------- Info Berita Warga ---------- */
function pbnGetNewsTips() { return PBN_CACHE.newsTips; }
function pbnAddNewsTip(tip) {
  const id = pbnNewId();
  db.collection('newsTips').doc(id).set({
    title: tip.title, village: tip.village, detail: tip.detail, phone: tip.phone || '',
    image: tip.image || null, submittedBy: tip.submittedBy, submittedByName: tip.submittedByName,
    date: new Date().toISOString(), status: 'baru'
  }).catch(e => console.error(e));
}
function pbnUpdateNewsTipStatus(id, status, processor) {
  const patch = { status };
  if (status === 'diproses' && processor) { patch.processedBy = processor.username; patch.processedByName = processor.name; }
  db.collection('newsTips').doc(id).update(patch).catch(e => console.error(e));
}
function pbnDeleteNewsTip(id) {
  db.collection('newsTips').doc(id).delete().catch(e => console.error(e));
}

/* ---------- Permintaan Iklan ---------- */
function pbnGetAdRequests() { return PBN_CACHE.adRequests; }
function pbnAddAdRequest(req) {
  const id = pbnNewId();
  db.collection('adRequests').doc(id).set({
    businessName: req.businessName, phone: req.phone, detail: req.detail, image: req.image || null,
    submittedBy: req.submittedBy, submittedByName: req.submittedByName,
    date: new Date().toISOString(), status: 'baru'
  }).catch(e => console.error(e));
}
function pbnUpdateAdRequestStatus(id, status, processor) {
  const patch = { status };
  if (status === 'diproses' && processor) { patch.processedBy = processor.username; patch.processedByName = processor.name; }
  db.collection('adRequests').doc(id).update(patch).catch(e => console.error(e));
}
function pbnDeleteAdRequest(id) {
  db.collection('adRequests').doc(id).delete().catch(e => console.error(e));
}
function pbnSaveAdRequests(list) {
  list.forEach(item => db.collection('adRequests').doc(item.id).set(item, { merge: true }).catch(e => console.error(e)));
}

/* ---------- Widget Harga Kelapa & Emas ---------- */
function pbnGetMarketWidget() { return PBN_CACHE.marketWidget; }
function pbnSaveMarketWidget(settings) {
  db.collection('settings').doc('marketWidget').set(settings).catch(e => console.error(e));
}

/* ---------- Iklan Promo Shopee ---------- */
function pbnGetShopeeAds() { return PBN_CACHE.shopeeAds; }
function pbnSaveShopeeAds(settings) {
  db.collection('settings').doc('shopeeAds').set(settings).catch(e => console.error(e));
}
function pbnAddShopeeAd(item) {
  const settings = pbnGetShopeeAds();
  item.id = 'shopee-' + Date.now() + '-' + Math.random().toString(36).slice(2, 8);
  item.order = (settings.items || []).length + 1;
  pbnSaveShopeeAds({ ...settings, items: [...(settings.items || []), item] });
  return item;
}
function pbnUpdateShopeeAd(id, patch) {
  const settings = pbnGetShopeeAds();
  const items = (settings.items || []).map(i => i.id === id ? { ...i, ...patch } : i);
  pbnSaveShopeeAds({ ...settings, items });
}
function pbnDeleteShopeeAd(id) {
  const settings = pbnGetShopeeAds();
  pbnSaveShopeeAds({ ...settings, items: (settings.items || []).filter(i => i.id !== id) });
}

/* ---------- Video Popup ---------- */
function pbnGetPopupVideo() { return PBN_CACHE.popupVideo; }
function pbnSavePopupVideo(data) { return db.collection('settings').doc('popupVideo').set(data); }
function pbnDeletePopupVideo() { return db.collection('settings').doc('popupVideo').delete(); }

/* ---------- Papan Informasi Desa ---------- */
function pbnGetBoardCards() { return PBN_CACHE.boardCards; }
function pbnAddBoardCard(card) {
  const id = pbnNewId();
  db.collection('boardCards').doc(id).set({
    title: (card.title || '').trim(), desc: (card.desc || '').trim(),
    items: Array.isArray(card.items) ? card.items.filter(t => t.trim()) : []
  }).catch(e => console.error(e));
}
function pbnUpdateBoardCard(id, patch) {
  db.collection('boardCards').doc(id).update(patch).catch(e => console.error(e));
}
function pbnDeleteBoardCard(id) {
  db.collection('boardCards').doc(id).delete().catch(e => console.error(e));
}

/* ---------- Komentar ---------- */
function pbnGetComments() { return PBN_CACHE.comments; }
function pbnAddComment(comment) {
  const id = pbnNewId();
  db.collection('comments').doc(id).set({
    articleId: comment.articleId, articleTitle: comment.articleTitle, text: comment.text,
    submittedBy: comment.submittedBy, submittedByName: comment.submittedByName,
    date: new Date().toISOString(), status: 'terbit'
  }).catch(e => console.error(e));
}
function pbnUpdateCommentStatus(id, status) {
  db.collection('comments').doc(id).update({ status }).catch(e => console.error(e));
}
function pbnDeleteComment(id) {
  db.collection('comments').doc(id).delete().catch(e => console.error(e));
}

/* ---------- Users / Auth (Firebase Authentication) ----------
   Login memakai EMAIL + kata sandi. Kata sandi disimpan & di-hash oleh
   Firebase Auth, TIDAK pernah disimpan di Firestore. Dokumen users/{uid}
   berisi profil + role. Username dijaga unik lewat koleksi usernames/{username}.
   Lupa kata sandi: Firebase mengirim tautan reset ke email pengguna.
   Keamanan sebenarnya dijaga oleh firestore.rules. */
function pbnAuthErrorMessage(e) {
  switch (e && e.code) {
    case 'auth/invalid-credential':
    case 'auth/user-not-found':
    case 'auth/wrong-password':
      return 'Email atau kata sandi salah. Jika belum punya akun, silakan daftar dulu di tab "Daftar Akun".';
    case 'auth/invalid-email':
    case 'auth/missing-email': return 'Format email tidak valid.';
    case 'auth/too-many-requests': return 'Terlalu banyak percobaan. Coba lagi beberapa menit lagi.';
    case 'auth/email-already-in-use': return 'Email ini sudah terdaftar. Silakan masuk, atau pakai "Lupa kata sandi?".';
    case 'auth/weak-password': return 'Kata sandi minimal 6 karakter.';
    case 'auth/network-request-failed': return 'Koneksi internet bermasalah. Coba lagi.';
    case 'auth/requires-recent-login': return 'Demi keamanan, keluar lalu masuk lagi sebelum mengganti kata sandi.';
    default: return 'Terjadi kesalahan' + (e && e.code ? ' (' + e.code + ')' : '') + '. Coba lagi.';
  }
}

function pbnPublicUser(p) {
  return { uid: p.id, username: p.username, role: p.role, name: p.name, phone: p.phone, email: p.email, avatar: p.avatar };
}
// Hint tampilan saja (agar UI tidak berkedip sebelum Firebase siap). BUKAN dasar otorisasi.
function pbnSaveHint(p) {
  try { sessionStorage.setItem(PBN_KEYS.SESSION, JSON.stringify(pbnPublicUser(p))); } catch (e) {}
}

function pbnGetUsers() { return PBN_CACHE.users; }
function pbnGetUserByUsername(username) {
  return PBN_CACHE.users.find(u => u.username === username)
    || (PBN_CACHE.me && PBN_CACHE.me.username === username ? PBN_CACHE.me : null);
}

async function pbnLogin(email, password) {
  email = (email || '').trim().toLowerCase();
  try {
    const cred = await auth.signInWithEmailAndPassword(email, password || '');
    const snap = await db.collection('users').doc(cred.user.uid).get();
    if (!snap.exists) {
      await auth.signOut();
      return { error: 'Akun tidak ditemukan atau sudah dihapus.' };
    }
    const profile = { id: snap.id, ...snap.data() };
    pbnSaveHint(profile);
    return { user: pbnPublicUser(profile) };
  } catch (e) {
    return { error: pbnAuthErrorMessage(e) };
  }
}

// Kirim tautan reset kata sandi ke email. Firebase tidak memberi tahu apakah
// email terdaftar atau tidak (sengaja, agar daftar akun tidak bisa ditebak).
async function pbnSendPasswordReset(email) {
  email = (email || '').trim().toLowerCase();
  if (!email) return { error: 'Email wajib diisi.' };
  try {
    await auth.sendPasswordResetEmail(email);
    return {};
  } catch (e) {
    return { error: pbnAuthErrorMessage(e) };
  }
}

function pbnLogout() {
  sessionStorage.removeItem(PBN_KEYS.SESSION);
  PBN_CACHE.me = null;
  PBN_CACHE.ready.auth = true;
  pbnClearPrivate();
  auth.signOut().catch(e => console.error(e));
}

function pbnCurrentUser() {
  if (PBN_CACHE.me) return pbnPublicUser(PBN_CACHE.me);
  if (!PBN_CACHE.ready.auth) {
    try { return JSON.parse(sessionStorage.getItem(PBN_KEYS.SESSION)); } catch (e) {}
  }
  return null;
}

async function pbnRegisterUser({ username, password, name, phone, email }) {
  username = (username || '').trim().toLowerCase();
  email = (email || '').trim().toLowerCase();
  if (!username || !password || !name || !email) return { error: 'Semua kolom wajib diisi.' };
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) return { error: 'Username 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.' };
  if (password.length < 6) return { error: 'Kata sandi minimal 6 karakter.' };
  let cred;
  try {
    cred = await auth.createUserWithEmailAndPassword(email, password);
  } catch (e) {
    return { error: pbnAuthErrorMessage(e) };
  }
  const uid = cred.user.uid;
  const profile = { username, role: 'pengunjung', name: name.trim(), phone: (phone || '').trim(), email, avatar: null };
  try {
    // Atomik: klaim username (gagal bila sudah dipakai) + simpan profil
    const batch = db.batch();
    batch.set(db.collection('usernames').doc(username), { uid });
    batch.set(db.collection('users').doc(uid), profile);
    await batch.commit();
  } catch (e) {
    console.error(e);
    await cred.user.delete().catch(() => {});
    return { error: e && e.code === 'permission-denied'
      ? 'Username sudah dipakai. Coba username lain.'
      : 'Gagal menyimpan profil. Coba lagi.' };
  }
  pbnSaveHint({ id: uid, ...profile });
  return { user: pbnPublicUser({ id: uid, ...profile }) };
}

function pbnUpdateUserRole(username, newRole) {
  const u = PBN_CACHE.users.find(x => x.username === username);
  if (!u) return false;
  db.collection('users').doc(u.id).update({ role: newRole }).catch(e => { console.error(e); if (typeof showToast === 'function') showToast('Gagal mengubah peran (izin ditolak).', true); });
  return true;
}

// Super admin menghapus profil user lain (username dibebaskan). Akun loginnya
// (Authentication) tetap ada sampai dihapus manual di Firebase Console, tapi
// tanpa profil ia tidak bisa masuk.
function pbnDeleteUser(username) {
  const u = PBN_CACHE.users.find(x => x.username === username);
  if (!u) return;
  const batch = db.batch();
  batch.delete(db.collection('users').doc(u.id));
  batch.delete(db.collection('usernames').doc(u.username));
  batch.commit().catch(e => console.error(e));
}

// Hapus akun milik sendiri (profil + username + akun login)
async function pbnDeleteOwnAccount() {
  const me = PBN_CACHE.me;
  if (!me || !auth.currentUser) return { error: 'Anda belum masuk.' };
  try {
    const batch = db.batch();
    batch.delete(db.collection('users').doc(me.id));
    batch.delete(db.collection('usernames').doc(me.username));
    await batch.commit();
    await auth.currentUser.delete();
    return {};
  } catch (e) {
    return { error: pbnAuthErrorMessage(e) };
  }
}

// Hanya untuk profil sendiri. Username & email (email login) tidak bisa diubah.
function pbnUpdateProfile(username, { name, phone, email, password, avatar }) {
  const me = PBN_CACHE.me;
  if (!me || me.username !== username) return null;
  const patch = {};
  if (name) patch.name = name.trim();
  if (phone !== undefined) patch.phone = phone.trim();
  if (avatar !== undefined) patch.avatar = avatar;
  PBN_CACHE.me = { ...me, ...patch };
  pbnSaveHint(PBN_CACHE.me);
  db.collection('users').doc(me.id).update(patch).catch(e => console.error(e));
  if (password) {
    if (password.length < 6) {
      if (typeof showToast === 'function') showToast('Kata sandi minimal 6 karakter (kata sandi tidak diubah).', true);
    } else if (auth.currentUser) {
      auth.currentUser.updatePassword(password).catch(e => {
        if (typeof showToast === 'function') showToast(pbnAuthErrorMessage(e), true);
      });
    }
  }
  return PBN_CACHE.me;
}

/* ---------- Suka (Like) Berita ---------- */
function pbnGetLikes() { return PBN_CACHE.likes; }
function pbnHasLiked(articleId, username) {
  if (!username) return false;
  return PBN_CACHE.likes.some(l => l.articleId === articleId && l.username === username);
}
function pbnGetLikeCount(articleId) {
  return PBN_CACHE.likes.filter(l => l.articleId === articleId).length;
}
function pbnToggleLike(articleId, username) {
  const existing = PBN_CACHE.likes.find(l => l.articleId === articleId && l.username === username);
  const currentCount = pbnGetLikeCount(articleId);
  if (existing) {
    db.collection('likes').doc(existing.id).delete().catch(e => console.error(e));
    return { liked: false, count: Math.max(0, currentCount - 1) };
  }
  const id = pbnNewId();
  db.collection('likes').doc(id).set({ articleId, username, date: new Date().toISOString() }).catch(e => console.error(e));
  return { liked: true, count: currentCount + 1 };
}

/* ---------- Util ---------- */
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

function pbnVideoEmbedHtml(url) {
  if (!url) return '';
  const yt = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([\w-]{11})/);
  if (yt) return `<div class="modal-video"><iframe src="https://www.youtube.com/embed/${yt[1]}" title="Video berita" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowfullscreen loading="lazy"></iframe></div>`;
  const fb = url.match(/facebook\.com|fb\.watch/);
  if (fb) return `<div class="modal-video"><iframe src="https://www.facebook.com/plugins/video.php?href=${encodeURIComponent(url)}" title="Video berita" allowfullscreen loading="lazy"></iframe></div>`;
  return `<div class="modal-video"><video src="${pbnEscapeHtml(url)}" controls preload="metadata"></video></div>`;
}

function pbnFormatDate(iso) {
  const d = new Date(iso);
  const bulan = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];
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
  const map = { 'Pulau Burung': 'tag-pulau', 'Berita Desa': 'tag-pulau', 'Peristiwa': 'tag-peristiwa', 'Pemerintahan': 'tag-pemerintahan', 'Ekonomi': 'tag-ekonomi', 'Pendidikan': 'tag-pendidikan', 'Olahraga': 'tag-olahraga', 'Info Loker': 'tag-loker' };
  return map[category] || 'tag-pulau';
}
function pbnEscapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str || '';
  return div.innerHTML;
}

function pbnSlugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

function pbnSlugify(str) {
  return String(str || '')
    .toLowerCase()
    .normalize('NFD').replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .slice(0, 60);
}

pbnInit();
