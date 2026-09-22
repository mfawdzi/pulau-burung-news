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

const PBN_DEFAULT_USERS = [
  { username: 'superadmin', password: 'super123', role: 'superadmin', name: 'Admin Super PBN' },
  { username: 'admin', password: 'admin123', role: 'admin', name: 'Admin Redaksi' },
  { username: 'reporter', password: 'reporter123', role: 'reporter', name: 'Reporter PBN' },
  { username: 'pengunjung', password: 'pengunjung123', role: 'pengunjung', name: 'Warga PBN' }
];

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
  autoHide: 10
};

const PBN_DEFAULT_SHOPEE_ADS = { enabled: true, items: [] };

const PBN_DEFAULT_BOARD_CARDS = [
  { id: 'board-1', title: 'Jajak Pendapat Warga (Polling)', desc: 'Bikin warga lebih terlibat lewat jajak pendapat isu lokal.', items: ['Pertanyaan + beberapa pilihan jawaban', 'Warga vote satu kali per akun', 'Hasil ditampilkan sebagai persentase/grafik'] },
  { id: 'board-2', title: 'Kontak Darurat & Layanan Publik', desc: 'Daftar nomor penting yang sering dicari warga.', items: ['Nama layanan (Puskesmas, Polsek, dll)', 'Nomor telepon/WA', 'Jam operasional'] }
];

/* ---------- Cache lokal, disinkronkan real-time dari Firestore ---------- */
const PBN_CACHE = {
  articles: [], users: [], lokerRequests: [], newsTips: [], adRequests: [],
  comments: [], likes: [], boardCards: [],
  marketWidget: JSON.parse(JSON.stringify(PBN_DEFAULT_MARKET_WIDGET)),
  shopeeAds: JSON.parse(JSON.stringify(PBN_DEFAULT_SHOPEE_ADS)),
  ready: {}
};

function pbnNotifyChange(name) {
  document.dispatchEvent(new CustomEvent('pbn:data-changed', { detail: { name } }));
}

function pbnNewId() {
  return 'id' + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

function pbnSubscribeCollection(colName, cacheKey) {
  db.collection(colName).onSnapshot(snap => {
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
    const userSnap = await db.collection('users').limit(1).get();
    if (userSnap.empty) {
      const batch2 = db.batch();
      PBN_DEFAULT_USERS.forEach(u => batch2.set(db.collection('users').doc(u.username), u));
      await batch2.commit();
    }
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

function pbnInit() {
  pbnSubscribeCollection('articles', 'articles');
  pbnSubscribeCollection('users', 'users');
  pbnSubscribeCollection('lokerRequests', 'lokerRequests');
  pbnSubscribeCollection('newsTips', 'newsTips');
  pbnSubscribeCollection('adRequests', 'adRequests');
  pbnSubscribeCollection('comments', 'comments');
  pbnSubscribeCollection('likes', 'likes');
  pbnSubscribeCollection('boardCards', 'boardCards');
  pbnSubscribeDoc('settings', 'marketWidget', 'marketWidget', PBN_DEFAULT_MARKET_WIDGET);
  pbnSubscribeDoc('settings', 'shopeeAds', 'shopeeAds', PBN_DEFAULT_SHOPEE_ADS);
  pbnSeedIfEmpty();
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

/* ---------- Users / Auth (login berbasis cache, bukan Firebase Auth) ---------- */
function pbnGetUsers() { return PBN_CACHE.users; }
function pbnGetUserByUsername(username) { return PBN_CACHE.users.find(u => u.username === username) || null; }

function pbnLogin(username, password) {
  username = (username || '').trim().toLowerCase();
  password = (password || '').trim();
  const user = PBN_CACHE.users.find(u => u.username === username && u.password === password);
  if (user) {
    sessionStorage.setItem(PBN_KEYS.SESSION, JSON.stringify({ username: user.username, role: user.role, name: user.name }));
    return user;
  }
  return null;
}
function pbnLogout() { sessionStorage.removeItem(PBN_KEYS.SESSION); }
function pbnCurrentUser() {
  try { return JSON.parse(sessionStorage.getItem(PBN_KEYS.SESSION)); } catch (e) { return null; }
}

function pbnRegisterUser({ username, password, name, phone, email }) {
  username = (username || '').trim().toLowerCase();
  if (!username || !password || !name) return { error: 'Semua kolom wajib diisi.' };
  if (pbnGetUserByUsername(username)) return { error: 'Username sudah dipakai, coba yang lain.' };
  const newUser = { username, password, role: 'pengunjung', name: name.trim(), phone: (phone || '').trim(), email: (email || '').trim(), avatar: null };
  db.collection('users').doc(username).set(newUser).catch(e => console.error(e));
  return { user: newUser };
}

function pbnUpdateUserRole(username, newRole) {
  if (!pbnGetUserByUsername(username)) return false;
  db.collection('users').doc(username).update({ role: newRole }).catch(e => console.error(e));
  return true;
}
function pbnDeleteUser(username) {
  db.collection('users').doc(username).delete().catch(e => console.error(e));
}

function pbnUpdateProfile(username, { username: newUsername, name, phone, email, password, avatar }) {
  const user = pbnGetUserByUsername(username);
  if (!user) return null;
  const updated = { ...user };
  if (newUsername && newUsername !== user.username) {
    const norm = newUsername.trim().toLowerCase();
    if (!/^[a-z0-9._-]{3,30}$/.test(norm)) return null;
    if (pbnGetUserByUsername(norm)) return null;
    updated.username = norm;
  }
  if (name) updated.name = name.trim();
  if (phone !== undefined) updated.phone = phone.trim();
  if (email !== undefined) updated.email = email.trim();
  if (password) updated.password = password;
  if (avatar !== undefined) updated.avatar = avatar;

  if (updated.username !== user.username) {
    const batch = db.batch();
    batch.delete(db.collection('users').doc(user.username));
    batch.set(db.collection('users').doc(updated.username), updated);
    batch.commit().catch(e => console.error(e));
  } else {
    db.collection('users').doc(user.username).set(updated, { merge: true }).catch(e => console.error(e));
  }

  const session = pbnCurrentUser();
  if (session && session.username === username) {
    sessionStorage.setItem(PBN_KEYS.SESSION, JSON.stringify({
      username: updated.username, role: updated.role, name: updated.name,
      phone: updated.phone, email: updated.email, avatar: updated.avatar
    }));
  }
  return updated;
}

function pbnVerifyIdentity(username, email, phone) {
  const user = pbnGetUserByUsername((username || '').trim().toLowerCase());
  if (!user) return null;
  const emailMatch = (user.email || '').trim().toLowerCase() === (email || '').trim().toLowerCase();
  const phoneMatch = (user.phone || '').replace(/\D/g, '') === (phone || '').replace(/\D/g, '');
  if (emailMatch && phoneMatch && user.email && user.phone) return user;
  return null;
}
function pbnResetPassword(username, newPassword) {
  if (!pbnGetUserByUsername(username)) return false;
  db.collection('users').doc(username).update({ password: newPassword }).catch(e => console.error(e));
  return true;
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

pbnInit();
