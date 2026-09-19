/* =========================================================
   Pulau Burung News — Logic dashboard redaksi (admin.html)
   Peran (dari yang paling tinggi wewenangnya):
   - superadmin : kelola semua konten + kelola peran pengguna
   - admin      : kelola semua konten, tandai Hero/Ticker, moderasi
                  loker/info berita/iklan/komentar
   - reporter   : kelola berita miliknya sendiri
   - pengunjung : akun terdaftar untuk komentar, kirim info berita,
                  ajukan info loker, dan ajukan pasang iklan
   ========================================================= */

let PBN_EDIT_ID = null; // id artikel yang sedang diedit, null = mode tambah baru
let PBN_FORM_IMAGE = null; // foto yang sedang dipilih di form Tambah/Ubah Konten (data URL base64)
let PBN_FORM_CONTRIBUTOR = null; // nama pengunjung asli, diisi saat konten berasal dari Info Berita Warga
document.addEventListener('DOMContentLoaded', () => {
  const user = pbnCurrentUser();
  if (user) {
    showDashboard(user);
  } else {
    showLogin();
  }
  bindAuthTabs();
  bindLoginForm();
  bindRegisterForm();
  bindPasswordToggles();
  bindForgotPassword();
  bindUserDetailModal();

  if (window.location.hash === '#daftar') {
    document.getElementById('tab-register-btn').click();
  }
});

/* ---------- Tab Masuk / Daftar ---------- */
function bindAuthTabs() {
  const tabLogin = document.getElementById('tab-login-btn');
  const tabRegister = document.getElementById('tab-register-btn');
  const loginPanel = document.getElementById('login-panel');
  const registerPanel = document.getElementById('register-panel');
  if (!tabLogin || !tabRegister) return;

  tabLogin.addEventListener('click', () => {
    tabLogin.classList.add('active');
    tabRegister.classList.remove('active');
    loginPanel.style.display = 'block';
    registerPanel.style.display = 'none';
  });
  tabRegister.addEventListener('click', () => {
    tabRegister.classList.add('active');
    tabLogin.classList.remove('active');
    registerPanel.style.display = 'block';
    loginPanel.style.display = 'none';
  });
}

/* ---------- LOGIN ---------- */
function showLogin() {
  document.getElementById('login-view').style.display = 'flex';
  document.getElementById('dashboard-view').style.display = 'none';
}

function bindLoginForm() {
  const form = document.getElementById('login-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('login-username').value.trim();
    const password = document.getElementById('login-password').value;
    const user = pbnLogin(username, password);
    const errBox = document.getElementById('login-error');
    if (user) {
      errBox.style.display = 'none';
      showDashboard(user);
    } else {
      errBox.textContent = 'Username atau kata sandi salah.';
      errBox.style.display = 'block';
    }
  });
}

/* ---------- DAFTAR (akun pengunjung) ---------- */
function bindRegisterForm() {
  const form = document.getElementById('register-form');
  if (!form) return;
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const name = document.getElementById('register-name').value.trim();
    const username = document.getElementById('register-username').value.trim();
    const phone = document.getElementById('register-phone').value.trim();
    const password = document.getElementById('register-password').value;
    const email =
  document.getElementById('register-email').value.trim();
    const errBox = document.getElementById('register-error');

    const result = pbnRegisterUser({
  name,
  username,
  password,
  phone,
  email
});
    if (result.error) {
      errBox.textContent = result.error;
      errBox.style.display = 'block';
      return;
    }
    errBox.style.display = 'none';
    pbnLogin(username, password);
    form.reset();
    // Pengunjung baru langsung diarahkan ke situs biasa, bukan dashboard redaksi
    window.location.href = 'index.html';
  });
}

/* ---------- Lihat/sembunyikan kata sandi ---------- */
function bindPasswordToggles() {
  document.querySelectorAll('.password-toggle').forEach(btn => {
    btn.addEventListener('click', () => {
      const input = document.getElementById(btn.getAttribute('data-target'));
      if (!input) return;
      const showing = input.type === 'text';
      input.type = showing ? 'password' : 'text';
      btn.textContent = showing ? '👁' : '🙈';
      btn.setAttribute('aria-label', showing ? 'Lihat kata sandi' : 'Sembunyikan kata sandi');
    });
  });
}

/* ---------- Lupa Kata Sandi (verifikasi username + email + WA, tanpa OTP) ---------- */
let PBN_FORGOT_VERIFIED_USERNAME = null;

function bindForgotPassword() {
  const openBtn = document.getElementById('open-forgot-password');
  const overlay = document.getElementById('forgot-password-overlay');
  const closeBtn = document.getElementById('forgot-password-close');
  const verifyForm = document.getElementById('forgot-verify-form');
  const resetForm = document.getElementById('forgot-reset-form');
  if (!openBtn || !overlay) return;

  function resetModal() {
    PBN_FORGOT_VERIFIED_USERNAME = null;
    document.getElementById('forgot-step-verify').style.display = 'block';
    document.getElementById('forgot-step-reset').style.display = 'none';
    document.getElementById('forgot-verify-error').style.display = 'none';
    document.getElementById('forgot-reset-error').style.display = 'none';
    verifyForm.reset();
    resetForm.reset();
  }

  openBtn.addEventListener('click', () => {
    resetModal();
    overlay.classList.add('open');
  });
  closeBtn.addEventListener('click', () => overlay.classList.remove('open'));
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) overlay.classList.remove('open');
  });

  verifyForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const username = document.getElementById('forgot-username').value.trim();
    const email = document.getElementById('forgot-email').value.trim();
    const phone = document.getElementById('forgot-phone').value.trim();
    const errBox = document.getElementById('forgot-verify-error');

    const user = pbnVerifyIdentity(username, email, phone);
    if (!user) {
      errBox.textContent = 'Data tidak cocok. Periksa kembali username, email, dan nomor WhatsApp Anda.';
      errBox.style.display = 'block';
      return;
    }

    errBox.style.display = 'none';
    PBN_FORGOT_VERIFIED_USERNAME = user.username;
    document.getElementById('forgot-step-verify').style.display = 'none';
    document.getElementById('forgot-step-reset').style.display = 'block';
  });

  resetForm.addEventListener('submit', (e) => {
    e.preventDefault();
    const pw1 = document.getElementById('forgot-new-password').value;
    const pw2 = document.getElementById('forgot-new-password-confirm').value;
    const errBox = document.getElementById('forgot-reset-error');

    if (!PBN_FORGOT_VERIFIED_USERNAME) {
      errBox.textContent = 'Sesi verifikasi tidak valid, silakan ulangi dari awal.';
      errBox.style.display = 'block';
      return;
    }
    if (pw1 !== pw2) {
      errBox.textContent = 'Kata sandi baru dan konfirmasinya tidak sama.';
      errBox.style.display = 'block';
      return;
    }
    if (pw1.length < 4) {
      errBox.textContent = 'Kata sandi minimal 4 karakter.';
      errBox.style.display = 'block';
      return;
    }

    pbnResetPassword(PBN_FORGOT_VERIFIED_USERNAME, pw1);
    errBox.style.display = 'none';
    overlay.classList.remove('open');
    showToast('Kata sandi berhasil diperbarui. Silakan masuk dengan kata sandi baru.');
  });
}

function doLogout() {
  pbnLogout();
  PBN_EDIT_ID = null;
  showLogin();
  document.getElementById('login-form').reset();
}

/* ---------- DASHBOARD (router peran) ---------- */
function showDashboard(user) {
  document.getElementById('login-view').style.display = 'none';
  document.getElementById('dashboard-view').style.display = 'block';
    bindDashboardProfile(user);

  const dashName = user.name || user.username;
  document.getElementById('dash-username').textContent = dashName;
  document.getElementById('dash-role').textContent = pbnRoleLabel(user.role);
  const dashAdminLabel = document.getElementById('dash-admin-label');
  if (dashAdminLabel) {
    dashAdminLabel.textContent = user.role === 'superadmin' ? 'Admin Super PBN' : (pbnRoleLabel(user.role) + ' PBN');
  }
  const avatar = document.getElementById('pbn-admin-avatar');
  if (avatar) avatar.textContent = (dashName || 'P').trim().charAt(0).toUpperCase();

  const logoutBtn = document.getElementById('logout-btn');
  if (logoutBtn) logoutBtn.onclick = doLogout;

  const menuToggleBtn = document.getElementById('pbn-menu-toggle');
  const dashHead = document.querySelector('.dash-head');

  if (user.role === 'pengunjung') {
    document.getElementById('dash-title').textContent = 'Dashboard Pengunjung';
    document.getElementById('redaksi-section').style.display = 'none';
    document.getElementById('pengunjung-section').style.display = 'block';

    // Pengunjung tidak melihat elemen dashboard redaksi sama sekali.
    if (dashHead) dashHead.style.display = 'none';
    if (menuToggleBtn) menuToggleBtn.style.display = 'none';

    const modPanelsGuard = document.getElementById('moderation-panels');
    if (modPanelsGuard) modPanelsGuard.style.display = 'none';

    renderPengunjungDashboard(user);
  } else {
    document.getElementById('dash-title').textContent = 'Dashboard Redaksi';
    document.getElementById('pengunjung-section').style.display = 'none';
    document.getElementById('redaksi-section').style.display = 'block';

    if (dashHead) dashHead.style.display = '';
    if (menuToggleBtn) menuToggleBtn.style.display = '';

    renderRedaksiDashboard(user);
  }
}

/* =========================================================
   REDAKSI: admin super / admin / reporter
   ========================================================= */
function renderRedaksiDashboard(user) {
  populateCategoryOptions();
  resetForm();
  renderStats(user);
  renderTable(user);
  bindDashboardEvents(user);
  toggleAdminOnlyFields(user);

  const showModeration = pbnIsEditorInChief(user.role);
const canReceiveNewsTips =
  user.role === 'superadmin' ||
  user.role === 'admin' ||
  user.role === 'reporter';

document.getElementById('moderation-panels').style.display =
  (showModeration || canReceiveNewsTips) ? 'block' : 'none';

if (canReceiveNewsTips) {
  renderTips(user);
}

if (showModeration) {
  renderComments(true);
}

  const isEditorInChief = pbnIsEditorInChief(user.role);
  const isSuperadmin = user.role === 'superadmin';
  document.getElementById('loker-panel').style.display = isEditorInChief ? 'block' : 'none';
  document.getElementById('ads-panel').style.display = isEditorInChief ? 'block' : 'none';
if (isEditorInChief) {
    renderLiveSettingsPanel(user);
    renderLokerRequests(user);
    renderAds(user);

        renderPapanDesaPanel();
    bindPapanDesaPanel();

    renderShopeeAdsPanel();
    bindShopeeAdsPanel();

    bindLokerCreateForm(user);
    bindAdCreateForm(user);

    bindLokerEditForm();
    bindAdEditForm();

    const lokerCreatePanel =
        document.getElementById('loker-create-panel');

    const adsCreatePanel =
        document.getElementById('ads-create-panel');

    if (lokerCreatePanel) {
        lokerCreatePanel.style.display = 'block';
    }

    if (adsCreatePanel) {
        adsCreatePanel.style.display = 'block';
    }
}

if (isSuperadmin) {
    renderMarketWidgetSettings();
    bindMarketWidgetSettings();
}

const showUsers = pbnCanManageUsers(user.role);

if (showUsers) {
  bindUsersSearch(user);
  renderUsers(user);
}

pbnUpdateInboxBadge(user);

setTimeout(function(){ setupPbnRedaksiLayout(user); }, 0);
}


function populateCategoryOptions() {
  const sel = document.getElementById('field-category');
  const filterSel = document.getElementById('filter-category');
  if (sel && sel.children.length === 0) {
    sel.innerHTML = PBN_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  }
  if (filterSel && filterSel.children.length <= 1) {
    filterSel.innerHTML = '<option value="">Semua Rubrik</option>' +
      PBN_CATEGORIES.map(c => `<option value="${c}">${c}</option>`).join('');
  }
}

function renderStats(user) {
  const all = pbnGetArticles();
  const mine = pbnIsEditorInChief(user.role) ? all : all.filter(a => a.author === user.name || a.fromVisitor);
  const published = mine.filter(a => a.status === 'published').length;
  const draft = mine.filter(a => a.status === 'draft').length;
  const totalViews = mine.reduce((sum, a) => sum + (a.views || 0), 0);

  const statRow = document.getElementById('stat-row');
  statRow.innerHTML = `
    <div class="stat-card"><div class="num">${mine.length}</div><div class="label">Total Konten</div></div>
    <div class="stat-card"><div class="num">${published}</div><div class="label">Terbit</div></div>
    <div class="stat-card"><div class="num">${draft}</div><div class="label">Draf</div></div>
    <div class="stat-card"><div class="num">${totalViews.toLocaleString('id-ID')}</div><div class="label">Total Dibaca</div></div>
  `;
}

function renderTable(user) {
  const tbody = document.getElementById('article-tbody');
  const catFilter = document.getElementById('filter-category')?.value || '';
  const statusFilter = document.getElementById('filter-status')?.value || '';

  let list = pbnGetArticles();
  if (!pbnIsEditorInChief(user.role)) {
    list = list.filter(a => a.author === user.name || a.fromVisitor);
  }
  if (catFilter) list = list.filter(a => a.category === catFilter);
  if (statusFilter) list = list.filter(a => a.status === statusFilter);

  list = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada konten. Gunakan formulir di sebelah kanan untuk menambahkan berita.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(a => {
    const canManage = pbnIsEditorInChief(user.role) || a.author === user.name || (a.fromVisitor && pbnCanManageContent(user.role));
    const typeLabel = a.type === 'papan' ? 'Papan Desa' : a.type === 'iklan' ? 'Iklan' : 'Berita';
    return `
      <tr>
        <td>
          <div class="art-title">${pbnEscapeHtml(a.title)}</div>
          <div class="art-meta">${typeLabel} · ${pbnEscapeHtml(a.category)} ${a.isHero ? '· ⭐ Hero' : ''} ${a.ticker ? '· 📰 Ticker' : ''}</div>
          ${a.fromVisitor && a.publishedBy ? `<div class="art-meta" style="margin-top:3px;">Diterbitkan oleh: ${pbnEscapeHtml(a.publishedBy)}</div>` : ''}
        </td>
        <td class="art-meta">${pbnEscapeHtml(a.author)}</td>
        <td class="art-meta">${pbnFormatDate(a.date)}</td>
        <td><span class="status-pill status-${a.status}">${a.status === 'published' ? 'Terbit' : 'Draf'}</span></td>
        <td>
          <div class="row-actions">
            ${canManage ? `<button class="primary" data-action="edit" data-id="${a.id}">Ubah</button>` : ''}
            ${canManage ? `<button data-action="toggle-status" data-id="${a.id}">${a.status === 'published' ? 'Jadikan Draf' : 'Terbitkan'}</button>` : ''}
            ${canManage ? `<button class="danger" data-action="delete" data-id="${a.id}">Hapus</button>` : ''}
            ${!canManage ? `<span class="art-meta">Hanya lihat</span>` : ''}
          </div>
        </td>
      </tr>
    `;
  }).join('');

  tbody.querySelectorAll('button[data-action]').forEach(btn => {
    btn.addEventListener('click', () => handleTableAction(btn, user));
  });
}

function handleTableAction(btn, user) {
  const id = btn.getAttribute('data-id');
  const action = btn.getAttribute('data-action');
  const article = pbnGetArticleById(id);
  if (!article) return;

  const canManage = pbnIsEditorInChief(user.role) || article.author === user.name;
  if (!canManage) return;

  if (action === 'edit') {
    loadFormForEdit(article, user);

    const contributorNote = document.getElementById('form-contributor-note');
    if (contributorNote) {
      if (article.fromVisitor && article.author) {
        contributorNote.textContent = 'Konten ini kiriman pengunjung, kontribusi dari: ' + article.author;
        contributorNote.style.display = 'block';
      } else {
        contributorNote.style.display = 'none';
      }
    }

    const createNav = document.querySelector('[data-pbn-view="create"]');
    if (createNav) createNav.click();

    setTimeout(() => {
      const formPanel = document.getElementById('form-panel');
      if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }, 100);
  } else if (action === 'delete') {
    if (confirm(`Hapus konten "${article.title}"? Tindakan ini tidak bisa dibatalkan.`)) {
      pbnDeleteArticle(id);
      renderStats(user);
      renderTable(user);
      showToast('Konten berhasil dihapus.');
    }
  } else if (action === 'toggle-status') {
    article.status = article.status === 'published' ? 'draft' : 'published';
    pbnUpsertArticle(article);
    pbnMaybeSetHero(article);
    renderStats(user);
    renderTable(user);
    showToast(article.status === 'published' ? 'Konten diterbitkan.' : 'Konten dijadikan draf.');
  }
}

/* ---------- Permintaan Pasang Info Loker (moderasi) ---------- */
function renderLokerRequests(user) {
  const tbody = document.getElementById('loker-request-tbody');
  if (!tbody) return;
  const list = pbnGetLokerRequests()
    .filter(r => r.status === 'baru' || r.status === 'diproses')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Belum ada permintaan pasang info loker.</td></tr>`;
    return;
  }

  const statusLabel = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' };

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.image ? `<img src="${r.image}" class="req-thumb" alt="">` : '<span class="art-meta">-</span>'}</td>
      <td>
        <div class="art-title">${pbnEscapeHtml(r.businessName)}</div>
        <div class="art-meta">PJ: ${pbnEscapeHtml(r.contactName || '-')}</div>
      </td>
      <td class="art-meta">${pbnEscapeHtml(r.phone)}</td>
      <td class="art-meta">${pbnEscapeHtml(r.detail)}</td>
      <td class="art-meta">${pbnFormatDate(r.date)}</td>
      <td>
        <span class="status-pill ${r.status === 'selesai' ? 'status-published' : 'status-draft'}" ${r.status === 'diproses' ? 'style="background:#f5a623;color:#fff;"' : ''}>${statusLabel[r.status] || r.status}</span>
        ${r.status === 'diproses' && r.processedByName ? `<div class="art-meta" style="margin-top:4px;">Diproses oleh: ${pbnEscapeHtml(r.processedByName)}</div>` : ''}
      </td>
      <td>
    <div class="row-actions">

  <button
    class="primary"
    data-loker-action="edit"
    data-loker-id="${r.id}">
    Ubah
  </button>

  ${r.status !== 'diproses'
    ? `<button data-loker-action="diproses" data-loker-id="${r.id}">Diproses</button>`
    : ''}

  ${r.status !== 'selesai'
    ? `<button class="primary" data-loker-action="selesai" data-loker-id="${r.id}">Selesai</button>`
    : ''}

  <button
    class="danger"
    data-loker-action="delete"
    data-loker-id="${r.id}">
    Hapus
  </button>

</div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-loker-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-loker-id');
      const action = btn.getAttribute('data-loker-action');

if (action === 'edit') {
  openLokerEditForm(id);
  return;
}
if (action === 'delete') {
  if (confirm('Hapus permintaan ini?')) {
    pbnDeleteLokerRequest(id);
    renderLokerRequests(user);
    pbnUpdateInboxBadge(user);
    showToast('Permintaan dihapus.');
  }
  return;
}

if (action === 'selesai') {
  const req = pbnGetLokerRequests().find(x => x.id === id);
  if (req) {
    const article = {
      id: pbnNewId(),
      type: 'berita',
      title: req.businessName,
      category: 'Info Loker',
      village: '',
      author: req.submittedByName || req.contactName || 'Pengunjung',
      date: new Date().toISOString(),
      excerpt: (req.detail || '').length > 180 ? req.detail.substring(0, 180) + '...' : (req.detail || ''),
      content: 'Penanggung Jawab: ' + (req.contactName || '-') + '\nWhatsApp: ' + (req.phone || '-') + '\n\n' + (req.detail || ''),
      image: req.image || null,
      videoUrl: '',
        status: 'published',
      ticker: false,
      isHero: false,
      verifikasi: '',
      adSize: null,
      linkUrl: '',
      views: 0,
      fromVisitor: true,
      publishedBy: user.name
    };
    pbnPublishAndOpenArticle(article, user);
  }
}

pbnUpdateLokerRequestStatus(id, action, { username: user.username, name: user.name });
renderLokerRequests(user);
pbnUpdateInboxBadge(user);
showToast('Status permintaan diperbarui.');
    });
  });
}
function editLokerRequest(id) {
  const list = pbnGetLokerRequests();
  const item = list.find(r => r.id === id);

  if (!item) return;

  const businessName = prompt(
    'Nama Perusahaan / Instansi:',
    item.businessName || ''
  );

  if (businessName === null) return;

  const contactName = prompt(
    'Nama Penanggung Jawab:',
    item.contactName || ''
  );

  if (contactName === null) return;

  const phone = prompt(
    'Nomor Telepon:',
    item.phone || ''
  );

  if (phone === null) return;

  const detail = prompt(
    'Detail / Deskripsi Loker:',
    item.detail || ''
  );

  if (detail === null) return;

  item.businessName = businessName.trim();
  item.contactName = contactName.trim();
  item.phone = phone.trim();
  item.detail = detail.trim();

  pbnSaveLokerRequests(list);
  renderLokerRequests();

  showToast('Data loker berhasil diperbarui.');
}
function openLokerEditForm(id) {
  const item = pbnGetLokerRequests().find(r => r.id === id);

  if (!item) {
    showToast('Data loker tidak ditemukan.', true);
    return;
  }

  document.getElementById('loker-edit-id').value = item.id;
  document.getElementById('loker-edit-business').value = item.businessName || '';
  document.getElementById('loker-edit-phone').value = item.phone || '';
  document.getElementById('loker-edit-detail').value = item.detail || '';

  document.getElementById('loker-edit-image').value = '';

  const panel = document.getElementById('loker-edit-panel');

  panel.style.display = 'block';

  panel.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

/* ---------- Info Berita dari Warga (moderasi) ---------- */
function renderTips(user) {
  const tbody = document.getElementById('tips-tbody');
  if (!tbody) return;
  const list = pbnGetNewsTips()
    .filter(t => t.status === 'baru' || t.status === 'diproses')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Belum ada info berita dari warga.</td></tr>`;
    return;
  }

  const statusLabel = { baru: 'Baru', diproses: 'Diproses', diterbitkan: 'Diterbitkan', ditolak: 'Ditolak' };
  const statusClass = { baru: 'status-draft', diproses: 'status-draft', diterbitkan: 'status-published', ditolak: 'status-draft' };

  tbody.innerHTML = list.map(t => `
    <tr>
      <td>${t.image ? `<img src="${t.image}" class="req-thumb" alt="">` : '<span class="art-meta">-</span>'}</td>
      <td>
        <div class="art-title">${pbnEscapeHtml(t.title)}</div>
        <div class="art-meta">${pbnEscapeHtml(t.detail)}</div>
      </td>
     <td class="art-meta">${pbnEscapeHtml(t.village || '-')}</td>
      <td class="art-meta">
        ${pbnEscapeHtml(t.submittedByName || t.submittedBy)}
        ${t.phone ? `<div style="margin-top:4px;">WA: ${pbnEscapeHtml(t.phone)}</div>` : ''}
      </td>
      <td class="art-meta">${pbnFormatDate(t.date)}</td>
      <td>
        <span class="status-pill ${statusClass[t.status] || 'status-draft'}" ${t.status === 'diproses' ? 'style="background:#f5a623;color:#fff;"' : ''}>${statusLabel[t.status] || t.status}</span>
        ${t.status === 'diproses' && t.processedByName ? `<div class="art-meta" style="margin-top:4px;">Diproses oleh: ${pbnEscapeHtml(t.processedByName)}</div>` : ''}
      </td>
      <td>
        <div class="row-actions">
          ${t.status !== 'diproses' ? `<button data-tip-action="diproses" data-tip-id="${t.id}">Diproses</button>` : ''}
          ${t.status !== 'diterbitkan' ? `<button class="primary" data-tip-action="diterbitkan" data-tip-id="${t.id}">Diterbitkan</button>` : ''}
          ${t.status !== 'ditolak' ? `<button data-tip-action="ditolak" data-tip-id="${t.id}">Tolak</button>` : ''}
          <button class="danger" data-tip-action="delete" data-tip-id="${t.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-tip-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-tip-id');
      const action = btn.getAttribute('data-tip-action');
      if (action === 'delete') {
        if (confirm('Hapus info berita ini?')) {
          pbnDeleteNewsTip(id);
          renderTips(user);
          pbnUpdateInboxBadge(user);
          showToast('Info berita dihapus.');
        }
      } else if (action === 'diterbitkan') {
        const tip = pbnGetNewsTips().find(x => x.id === id);
        if (tip) {
          const article = {
            id: pbnNewId(),
            type: 'berita',
            title: tip.title,
            category: 'Peristiwa',
            village: tip.village || '',
            author: tip.submittedByName || tip.submittedBy || 'Pengunjung',
            date: new Date().toISOString(),
            excerpt: (tip.detail || '').length > 180 ? tip.detail.substring(0, 180) + '...' : (tip.detail || ''),
            content: tip.detail || '',
            image: tip.image || null,
            videoUrl: '',
            status: 'published',
            ticker: false,
            isHero: false,
            verifikasi: 'Terverifikasi',
            adSize: null,
            linkUrl: '',
            views: 0,
            fromVisitor: true,
            publishedBy: user.name
          };
          pbnPublishAndOpenArticle(article, user);
        }
        pbnUpdateNewsTipStatus(id, action, { username: user.username, name: user.name });
        renderTips(user);
        pbnUpdateInboxBadge(user);
        showToast('Berita sudah terbit dan langsung tampil di Kelola Konten.');
      } else {
        pbnUpdateNewsTipStatus(id, action, { username: user.username, name: user.name });
        renderTips(user);
        pbnUpdateInboxBadge(user);
        showToast('Status info berita diperbarui.');
      }
    });
  });
}

/* ---------- Permintaan Pasang Iklan (moderasi) ---------- */
function renderAds(user) {
  const tbody = document.getElementById('ads-tbody');
  if (!tbody) return;
  const list = pbnGetAdRequests()
    .filter(r => r.status === 'baru' || r.status === 'diproses')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty">Belum ada permintaan pasang iklan.</td></tr>`;
    return;
  }

  const statusLabel = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' };

  tbody.innerHTML = list.map(r => `
    <tr>
      <td>${r.image ? `<img src="${r.image}" class="req-thumb" alt="">` : '<span class="art-meta">-</span>'}</td>
      <td>
        <div class="art-title">${pbnEscapeHtml(r.businessName)}</div>
      </td>
      <td class="art-meta">${pbnEscapeHtml(r.phone)}</td>
      <td class="art-meta">${pbnEscapeHtml(r.detail)}</td>
      <td class="art-meta">${pbnFormatDate(r.date)}</td>
      <td>
        <span class="status-pill ${r.status === 'selesai' ? 'status-published' : 'status-draft'}" ${r.status === 'diproses' ? 'style="background:#f5a623;color:#fff;"' : ''}>${statusLabel[r.status] || r.status}</span>
        ${r.status === 'diproses' && r.processedByName ? `<div class="art-meta" style="margin-top:4px;">Diproses oleh: ${pbnEscapeHtml(r.processedByName)}</div>` : ''}
      </td>
      <td>
      <div class="row-actions">

  <button
    class="primary"
    data-ad-action="edit"
    data-ad-id="${r.id}">
    Ubah
  </button>

  ${r.status !== 'diproses'
    ? `<button data-ad-action="diproses" data-ad-id="${r.id}">Diproses</button>`
    : ''}

  ${r.status !== 'selesai'
    ? `<button class="primary" data-ad-action="selesai" data-ad-id="${r.id}">Selesai</button>`
    : ''}

  <button
    class="danger"
    data-ad-action="delete"
    data-ad-id="${r.id}">
    Hapus
  </button>

</div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-ad-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-ad-id');
      const action = btn.getAttribute('data-ad-action');
 if (action === 'edit') {
  openAdEditForm(id);
  return;
}
if (action === 'delete') {
  if (confirm('Hapus permintaan iklan ini?')) {
    pbnDeleteAdRequest(id);
    renderAds(user);
    pbnUpdateInboxBadge(user);
    showToast('Permintaan iklan dihapus.');
  }
  return;
}

if (action === 'selesai') {
  const req = pbnGetAdRequests().find(x => x.id === id);
  if (req) {
    const article = {
      id: pbnNewId(),
      type: 'iklan',
      title: req.businessName,
      category: 'Iklan',
      village: '',
      author: req.submittedByName || 'Pengunjung',
      date: new Date().toISOString(),
      excerpt: req.detail || '',
      content: req.detail || '',
      image: req.image || null,
      videoUrl: '',
      status: 'published',
      ticker: false,
      isHero: false,
      verifikasi: '',
      adSize: 'besar',
      linkUrl: '',
      businessName: req.businessName,
      phone: req.phone,
      detail: req.detail,
      promoTexts: [],
      views: 0,
      fromVisitor: true,
      publishedBy: user.name
    };
    pbnPublishAndOpenArticle(article, user);
  }
}

pbnUpdateAdRequestStatus(id, action, { username: user.username, name: user.name });
renderAds(user);
pbnUpdateInboxBadge(user);
showToast('Status permintaan iklan diperbarui.');
    });
  });
}

function bindAdEditForm() {
  const form = document.getElementById('ads-edit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('ads-edit-id').value;

    const list = pbnGetAdRequests();
    const item = list.find(r => r.id === id);

    if (!item) {
      showToast('Data iklan tidak ditemukan.', true);
      return;
    }

    item.businessName =
      document.getElementById('ads-edit-business').value.trim();

    item.phone =
      document.getElementById('ads-edit-phone').value.trim();

item.detail =
  document.getElementById('ads-edit-detail').value.trim();

const promoRaw =
  document.getElementById('ads-edit-promo').value.trim();

item.promoTexts = promoRaw
  ? promoRaw
      .split('\n')
      .map(text => text.trim())
      .filter(text => text.length > 0)
  : [];

item.status =
  document.getElementById('ads-edit-status').value;

    const file =
      document.getElementById('ads-edit-image').files[0];

    if (file) {
      try {
        item.image = await pbnReadFileAsDataURL(
          file,
          1.5 * 1024 * 1024
        );
      } catch (err) {
        showToast(err.message, true);
        return;
      }
    }

    pbnSaveAdRequests(list);

    renderAds();

    form.reset();

    document.getElementById('ads-edit-panel').style.display = 'none';

    showToast('Data iklan berhasil diperbarui.');
  });

  document
    .getElementById('ads-edit-cancel')
    .addEventListener('click', () => {

      form.reset();

      document.getElementById('ads-edit-panel').style.display = 'none';
    });
}


function editAdRequest(id) {
  openAdEditForm(id);
}
/* ---------- Komentar (moderasi) ---------- */
function renderComments() {
  const tbody = document.getElementById('comments-tbody');
  if (!tbody) return;
  const list = [...pbnGetComments()].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="6" class="table-empty">Belum ada komentar dari pengunjung.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(c => `
    <tr>
      <td class="art-meta">${pbnEscapeHtml(c.articleTitle)}</td>
      <td class="art-meta">${pbnEscapeHtml(c.text)}</td>
      <td class="art-meta">${pbnEscapeHtml(c.submittedByName || c.submittedBy)}</td>
      <td class="art-meta">${pbnFormatDate(c.date)}</td>
      <td><span class="status-pill ${c.status === 'terbit' ? 'status-published' : 'status-draft'}">${c.status === 'terbit' ? 'Tampil' : 'Disembunyikan'}</span></td>
      <td>
        <div class="row-actions">
          ${c.status === 'terbit'
            ? `<button data-comment-action="disembunyikan" data-comment-id="${c.id}">Sembunyikan</button>`
            : `<button class="primary" data-comment-action="terbit" data-comment-id="${c.id}">Tampilkan</button>`}
          <button class="danger" data-comment-action="delete" data-comment-id="${c.id}">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-comment-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.getAttribute('data-comment-id');
      const action = btn.getAttribute('data-comment-action');
      if (action === 'delete') {
        if (confirm('Hapus komentar ini?')) {
          pbnDeleteComment(id);
          renderComments();
          showToast('Komentar dihapus.');
        }
      } else {
        pbnUpdateCommentStatus(id, action);
        renderComments();
        showToast('Status komentar diperbarui.');
      }
    });
  });
}

/* ---------- Setting: Berita Live (Hero & Ticker) ---------- */
function renderLiveSettingsPanel(user) {
  const panel = document.getElementById('live-settings-panel');
  if (!panel) return;
  panel.style.display = 'block';

  const articles = pbnGetArticles()
    .filter(a => a.type === 'berita' && a.status === 'published')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const heroList = document.getElementById('live-hero-list');
  const tickerList = document.getElementById('live-ticker-list');
  if (!heroList || !tickerList) return;

  if (!articles.length) {
    heroList.innerHTML = `<p class="form-note">Belum ada berita berstatus Terbit.</p>`;
    tickerList.innerHTML = '';
    return;
  }

  const rowStyle = 'display:flex;align-items:center;gap:10px;padding:10px 12px;border:1px solid #e3dac4;border-radius:8px;margin-bottom:8px;cursor:pointer;';

  heroList.innerHTML = articles.map(a => `
    <label style="${rowStyle}">
      <input type="radio" name="live-hero-radio" value="${a.id}" ${a.isHero ? 'checked' : ''}>
      <span style="flex:1;">
        <div class="art-title" style="font-size:14px;">${pbnEscapeHtml(a.title)}</div>
        <div class="art-meta">${pbnEscapeHtml(a.category)} · ${pbnFormatDate(a.date)}</div>
      </span>
      ${a.isHero ? '<span style="font-size:11px;font-weight:700;color:#b8860b;">⭐ AKTIF</span>' : ''}
    </label>
  `).join('');

  tickerList.innerHTML = articles.map(a => `
    <label style="${rowStyle}">
      <input type="checkbox" data-ticker-id="${a.id}" ${a.ticker ? 'checked' : ''}>
      <span style="flex:1;">
        <div class="art-title" style="font-size:14px;">${pbnEscapeHtml(a.title)}</div>
        <div class="art-meta">${pbnEscapeHtml(a.category)} · ${pbnFormatDate(a.date)}</div>
      </span>
      ${a.ticker ? '<span style="font-size:11px;font-weight:700;color:#c0392b;">🔴 LIVE</span>' : ''}
    </label>
  `).join('');

  heroList.querySelectorAll('input[name="live-hero-radio"]').forEach(radio => {
    radio.addEventListener('change', () => {
      pbnSetAsHero(radio.value);
      renderLiveSettingsPanel(user);
      renderTable(user);
      showToast('Berita utama (Hero) diperbarui.');
    });
  });

  tickerList.querySelectorAll('input[data-ticker-id]').forEach(cb => {
    cb.addEventListener('change', () => {
      const id = cb.getAttribute('data-ticker-id');
      pbnSetArticleTicker(id, cb.checked);
      renderLiveSettingsPanel(user);
      renderTable(user);
      showToast(cb.checked ? 'Ditambahkan ke running text.' : 'Dihapus dari running text.');
    });
  });
}

/* ---------- Manajemen Pengguna (admin super saja) ---------- */
const PBN_ROLE_ORDER = { superadmin: 0, admin: 1, reporter: 2, pengunjung: 3 };

function renderUsersStats() {
  const statRow = document.getElementById('users-stat-row');
  if (!statRow) return;
  const all = pbnGetUsers();
  const countByRole = role => all.filter(u => u.role === role).length;

  statRow.innerHTML = `
    <div class="stat-card"><div class="num">${all.length}</div><div class="label">Total Pengguna</div></div>
    <div class="stat-card"><div class="num">${countByRole('superadmin')}</div><div class="label">Admin Super</div></div>
    <div class="stat-card"><div class="num">${countByRole('admin')}</div><div class="label">Admin</div></div>
    <div class="stat-card"><div class="num">${countByRole('reporter')}</div><div class="label">Reporter</div></div>
    <div class="stat-card"><div class="num">${countByRole('pengunjung')}</div><div class="label">Pengunjung</div></div>
  `;
}

function renderUsers(currentUser) {
  const tbody = document.getElementById('users-tbody');
  if (!tbody) return;

  renderUsersStats();

  const searchInput = document.getElementById('users-search');
  const query = (searchInput ? searchInput.value : '').trim().toLowerCase();

  const totalAll = pbnGetUsers().length;
  let users = pbnGetUsers();

  if (query) {
    users = users.filter(u =>
      (u.name || '').toLowerCase().includes(query) ||
      (u.username || '').toLowerCase().includes(query) ||
      (u.email || '').toLowerCase().includes(query) ||
      (u.phone || '').toLowerCase().includes(query)
    );
  }

  users = [...users].sort((a, b) => {
    const orderA = PBN_ROLE_ORDER[a.role] ?? 99;
    const orderB = PBN_ROLE_ORDER[b.role] ?? 99;
    if (orderA !== orderB) return orderA - orderB;
    return (a.name || '').localeCompare(b.name || '');
  });

  const countLabel = document.getElementById('users-count-label');
  if (countLabel) {
    countLabel.textContent = query
      ? `Menampilkan ${users.length} dari ${totalAll} pengguna`
      : `Total ${totalAll} pengguna`;
  }

  if (!users.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Tidak ada pengguna yang cocok dengan pencarian.</td></tr>`;
    return;
  }

  tbody.innerHTML = users.map(u => `
    <tr>
      <td class="art-title">${pbnEscapeHtml(u.name)}</td>
      <td class="art-meta">${pbnEscapeHtml(u.username)}</td>
      <td>
        <select class="role-select" data-user-username="${u.username}" ${u.username === currentUser.username ? 'disabled' : ''}>
          ${PBN_ROLES.map(r => `<option value="${r.id}" ${r.id === u.role ? 'selected' : ''}>${r.label}</option>`).join('')}
        </select>
      </td>
      <td>
        <div class="row-actions">
          <button data-detail-user="${u.username}">Detail</button>
          ${u.username === currentUser.username
            ? `<span class="art-meta">Akun Anda</span>`
            : `<button class="danger" data-delete-user="${u.username}">Hapus</button>`}
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('select.role-select').forEach(sel => {
    sel.addEventListener('change', () => {
      const username = sel.getAttribute('data-user-username');
      pbnUpdateUserRole(username, sel.value);
      showToast(`Peran ${username} diubah jadi ${pbnRoleLabel(sel.value)}.`);
      renderUsers(currentUser);
    });
  });

  tbody.querySelectorAll('button[data-delete-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      const username = btn.getAttribute('data-delete-user');
      if (confirm(`Hapus akun "${username}"? Tindakan ini tidak bisa dibatalkan.`)) {
        pbnDeleteUser(username);
        renderUsers(currentUser);
        showToast('Akun dihapus.');
      }
    });
  });

  tbody.querySelectorAll('button[data-detail-user]').forEach(btn => {
    btn.addEventListener('click', () => {
      openUserDetailModal(btn.getAttribute('data-detail-user'));
    });
  });
}

function bindUsersSearch(currentUser) {
  const input = document.getElementById('users-search');
  if (!input || input.dataset.bound) return;
  input.dataset.bound = '1';
  input.addEventListener('input', () => renderUsers(currentUser));
}

/* ---------- Modal Detail Pengguna ---------- */
function openUserDetailModal(username) {
  const user = pbnGetUserByUsername(username);
  if (!user) {
    showToast('Data pengguna tidak ditemukan.', true);
    return;
  }

  document.getElementById('user-detail-name').value = user.name || '-';
  document.getElementById('user-detail-username').value = user.username || '-';
  document.getElementById('user-detail-role').value = pbnRoleLabel(user.role);
  document.getElementById('user-detail-email').value = user.email || '-';
  document.getElementById('user-detail-phone').value = user.phone || '-';

  const pwInput = document.getElementById('user-detail-password');
  pwInput.value = user.password || '-';
  pwInput.type = 'password';
  const pwToggle = document.querySelector('.password-toggle[data-target="user-detail-password"]');
  if (pwToggle) { pwToggle.textContent = '👁'; pwToggle.setAttribute('aria-label', 'Lihat kata sandi'); }

  document.getElementById('user-detail-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeUserDetailModal() {
  document.getElementById('user-detail-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

function bindUserDetailModal() {
  const overlay = document.getElementById('user-detail-overlay');
  const closeBtn = document.getElementById('user-detail-close');
  const closeBtn2 = document.getElementById('user-detail-close-btn');
  if (!overlay) return;

  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeUserDetailModal();
  });
  if (closeBtn) closeBtn.addEventListener('click', closeUserDetailModal);
  if (closeBtn2) closeBtn2.addEventListener('click', closeUserDetailModal);
}

/* ---------- Form tambah/ubah konten ---------- */
function bindDashboardEvents(user) {
  const typeSel = document.getElementById('field-type');
  if (typeSel) typeSel.onchange = () => toggleTypeFields(typeSel.value);

  const form = document.getElementById('article-form');
  if (form) {
    form.onsubmit = (e) => {
      e.preventDefault();
      submitForm(user);
    };
  }

  const resetBtn = document.getElementById('form-reset');
  if (resetBtn) resetBtn.onclick = () => resetForm();

  const filterCat = document.getElementById('filter-category');
  const filterStatus = document.getElementById('filter-status');
  if (filterCat) filterCat.onchange = () => renderTable(user);
  if (filterStatus) filterStatus.onchange = () => renderTable(user);

  const imageInput = document.getElementById('field-image');
  const imagePreview = document.getElementById('field-image-preview');
  if (imageInput) {
    imageInput.addEventListener('change', async () => {
      const file = imageInput.files[0];
      if (!file) return;
      try {
        const dataUrl = await pbnReadFileAsDataURL(file, 1.5 * 1024 * 1024);
        PBN_FORM_IMAGE = dataUrl;
        imagePreview.src = dataUrl;
        imagePreview.style.display = 'block';
      } catch (err) {
        showToast(err.message, true);
        imageInput.value = '';
      }
    });
  }
  const imageClearBtn = document.getElementById('field-image-clear');
  if (imageClearBtn) {
    imageClearBtn.addEventListener('click', () => {
      PBN_FORM_IMAGE = null;
      if (imageInput) imageInput.value = '';
      if (imagePreview) {
        imagePreview.src = '';
        imagePreview.style.display = 'none';
      }
    });
  }

  toggleTypeFields(typeSel ? typeSel.value : 'berita');
}

function toggleTypeFields(type) {
  const isPapan = type === 'papan';
  const isIklan = type === 'iklan';
  document.getElementById('group-excerpt').style.display = (isPapan || isIklan) ? 'none' : 'block';
  document.getElementById('group-content').style.display = (isPapan || isIklan) ? 'none' : 'block';
  document.getElementById('group-verifikasi').style.display = isPapan ? 'block' : 'none';
  document.getElementById('group-hero-ticker').style.display = (isPapan || isIklan) ? 'none' : 'flex';
  document.getElementById('group-category-wrap').style.display = isIklan ? 'none' : 'block';
  document.getElementById('group-iklan').style.display = isIklan ? 'block' : 'none';

  const villageLabel = document.getElementById('field-village-label');
  const villageInput = document.getElementById('field-village');
  if (isIklan) {
    villageLabel.textContent = 'Nama Pengiklan';
    villageInput.placeholder = 'mis. Toko Sumber Rejeki';
  } else {
    villageLabel.textContent = 'Desa';
    villageInput.placeholder = 'mis. Sungai Simbar';
  }
}

function toggleAdminOnlyFields(user) {
  const heroWrap = document.getElementById('check-hero-wrap');
  if (!heroWrap) return;
  heroWrap.style.display = pbnIsEditorInChief(user.role) ? 'flex' : 'none';
}

function resetForm() {
  PBN_EDIT_ID = null;
  PBN_FORM_IMAGE = null;
  PBN_FORM_CONTRIBUTOR = null;
  const form = document.getElementById('article-form');
  if (!form) return;
  form.reset();
  document.getElementById('field-type').value = 'berita';
  toggleTypeFields('berita');
  const preview = document.getElementById('field-image-preview');
  if (preview) { preview.src = ''; preview.style.display = 'none'; }
  document.getElementById('form-title-label').textContent = 'Tambah Konten Baru';
  document.getElementById('form-submit-btn').textContent = 'Publikasikan / Simpan';
  const contributorNote = document.getElementById('form-contributor-note');
  if (contributorNote) { contributorNote.style.display = 'none'; contributorNote.textContent = ''; }
}

/* Simpan langsung kiriman pengunjung sebagai artikel Terbit (supaya
   langsung muncul di Kelola Konten), lalu buka form supaya admin/reporter
   tinggal merapikan sebelum menutup. */
function pbnMaybeSetHero(article) {
  if (article && article.type === 'berita' && article.status === 'published') {
    pbnSetAsHero(article.id);
  }
}

function pbnPublishAndOpenArticle(article, user) {
  pbnUpsertArticle(article);
  pbnMaybeSetHero(article);
  renderStats(user);
  renderTable(user);

  loadFormForEdit(article, user);

  const contributorNote = document.getElementById('form-contributor-note');
  if (contributorNote) {
    if (article.fromVisitor && article.author) {
      contributorNote.textContent = 'Konten ini kiriman pengunjung, diterbitkan sebagai kontribusi dari: ' + article.author;
      contributorNote.style.display = 'block';
    } else {
      contributorNote.style.display = 'none';
    }
  }

  const createNav = document.querySelector('[data-pbn-view="create"]');
  if (createNav) createNav.click();

  setTimeout(() => {
    const formPanel = document.getElementById('form-panel');
    if (formPanel) formPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }, 100);
}

function loadFormForEdit(article, user) {
  PBN_EDIT_ID = article.id;
  document.getElementById('field-type').value = article.type;
  toggleTypeFields(article.type);
  document.getElementById('field-title').value = article.title || '';
  document.getElementById('field-category').value = article.category || PBN_CATEGORIES[0];
  document.getElementById('field-village').value = article.village || '';
  document.getElementById('field-excerpt').value = article.excerpt || '';
  document.getElementById('field-content').value = article.content || '';
  document.getElementById('field-status').value = article.status || 'draft';
  document.getElementById('field-verifikasi').value = article.verifikasi || 'Menunggu Verifikasi';
  document.getElementById('field-ticker').checked = !!article.ticker;
  document.getElementById('field-video').value = article.videoUrl || '';
  document.getElementById('field-ad-size').value = article.adSize || 'besar';
  document.getElementById('field-link').value = article.linkUrl || '';
  if (pbnIsEditorInChief(user.role)) {
    document.getElementById('field-hero').checked = !!article.isHero;
  }

  PBN_FORM_IMAGE = article.image || null;
  const preview = document.getElementById('field-image-preview');
  const imageInput = document.getElementById('field-image');
  if (imageInput) imageInput.value = '';
  if (preview) {
    if (PBN_FORM_IMAGE) {
      preview.src = PBN_FORM_IMAGE;
      preview.style.display = 'block';
    } else {
      preview.src = '';
      preview.style.display = 'none';
    }
  }

  document.getElementById('form-title-label').textContent = 'Ubah Konten';
  document.getElementById('form-submit-btn').textContent = 'Simpan Perubahan';
}

function submitForm(user) {
  const type = document.getElementById('field-type').value;
  const title = document.getElementById('field-title').value.trim();
  const category = document.getElementById('field-category').value;
  const village = document.getElementById('field-village').value.trim();
  const excerpt = document.getElementById('field-excerpt').value.trim();
  const content = document.getElementById('field-content').value.trim();
  const status = document.getElementById('field-status').value;
  const verifikasi = document.getElementById('field-verifikasi').value;
  const ticker = document.getElementById('field-ticker').checked;
  const isHero = pbnIsEditorInChief(user.role) ? document.getElementById('field-hero').checked : false;
  const videoUrl = document.getElementById('field-video').value.trim();
  const adSize = document.getElementById('field-ad-size').value;
  const linkUrl = document.getElementById('field-link').value.trim();

  if (!title) {
    showToast('Judul wajib diisi.', true);
    return;
  }
  if (type === 'iklan' && !PBN_FORM_IMAGE) {
    showToast('Unggah foto/gambar untuk iklan terlebih dahulu.', true);
    return;
  }

  let article;
  if (PBN_EDIT_ID) {
    article = pbnGetArticleById(PBN_EDIT_ID);
    if (!article) return;
    const canManage = pbnIsEditorInChief(user.role) || article.author === user.name;
    if (!canManage) {
      showToast('Anda tidak berhak mengubah konten ini.', true);
      return;
    }
  } else {
    article = {
      id: pbnNewId(),
      author: PBN_FORM_CONTRIBUTOR || user.name,
      date: new Date().toISOString(),
      views: 0
    };
  }

  article.type = type;
  article.title = title;
  article.category = type === 'iklan' ? 'Iklan' : category;
  article.village = village;
  article.status = status;
  article.ticker = type === 'berita' ? ticker : false;
  article.isHero = type === 'berita' ? isHero : false;
  article.image = PBN_FORM_IMAGE || null;
  article.videoUrl = type === 'iklan' ? '' : videoUrl;

  if (type === 'papan') {
    article.verifikasi = verifikasi;
    article.excerpt = '';
    article.content = '';
    article.adSize = null;
    article.linkUrl = '';
  } else if (type === 'iklan') {
    article.excerpt = '';
    article.content = '';
    article.verifikasi = '';
    article.adSize = adSize;
    article.linkUrl = linkUrl;
  } else {
    article.excerpt = excerpt;
    article.content = content;
    article.adSize = null;
    article.linkUrl = '';
  }

const isEdit = !!PBN_EDIT_ID;

pbnUpsertArticle(article);
pbnMaybeSetHero(article);

resetForm();
renderStats(user);
renderTable(user);
showToast(
  isEdit
    ? 'Perubahan disimpan.'
    : 'Konten baru ditambahkan.'
);
}

/* =========================================================
   PENGUNJUNG: kirim info berita, ajukan loker, ajukan iklan,
   dan tulis komentar
   ========================================================= */
function renderPengunjungDashboard(user) {
  renderMySubmissions(user);
  bindPengunjungForms(user);
}

function renderMySubmissions(user) {
  const tbody = document.getElementById('my-submissions-tbody');
  if (!tbody) return;

  const tipStatusLabel = { baru: 'Baru', diproses: 'Diproses', diterbitkan: 'Diterbitkan', ditolak: 'Ditolak' };
  const genericStatusLabel = { baru: 'Baru', diproses: 'Diproses', selesai: 'Selesai' };

  const rows = [
    ...pbnGetNewsTips().filter(t => t.submittedBy === user.username)
      .map(t => ({ jenis: 'Info Berita', ringkasan: t.title, date: t.date, status: tipStatusLabel[t.status] || t.status })),
    ...pbnGetLokerRequests().filter(r => r.submittedBy === user.username)
      .map(r => ({ jenis: 'Info Loker', ringkasan: r.businessName, date: r.date, status: genericStatusLabel[r.status] || r.status })),
    ...pbnGetAdRequests().filter(r => r.submittedBy === user.username)
      .map(r => ({ jenis: 'Permintaan Iklan', ringkasan: r.businessName, date: r.date, status: genericStatusLabel[r.status] || r.status })),
    ...pbnGetComments().filter(c => c.submittedBy === user.username)
      .map(c => ({ jenis: 'Komentar', ringkasan: `${c.articleTitle}: ${c.text}`, date: c.date, status: c.status === 'terbit' ? 'Tampil' : 'Disembunyikan' }))
  ].sort((a, b) => new Date(b.date) - new Date(a.date));

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Anda belum pernah mengirim apa pun. Gunakan formulir di sebelah kanan.</td></tr>`;
    return;
  }

  tbody.innerHTML = rows.map(r => `
    <tr>
      <td class="art-meta">${r.jenis}</td>
      <td class="art-title" style="font-size:13px;">${pbnEscapeHtml(r.ringkasan)}</td>
      <td class="art-meta">${pbnFormatDate(r.date)}</td>
      <td><span class="status-pill status-draft">${r.status}</span></td>
    </tr>
  `).join('');
}

function bindLokerCreateForm(user) {
  const form = document.getElementById('loker-create-form');
  if (!form) return;

  form.onsubmit = async function (e) {
    e.preventDefault();

    const businessName = document
      .getElementById('loker-create-business')
      .value
      .trim();

    const contactName = document
      .getElementById('loker-create-contact')
      .value
      .trim();

    const phone = document
      .getElementById('loker-create-phone')
      .value
      .trim();

    const detail = document
      .getElementById('loker-create-detail')
      .value
      .trim();

    const status = document
      .getElementById('loker-create-status')
      .value;

    const file = document
      .getElementById('loker-create-image')
      .files[0];

    if (!businessName || !contactName || !phone || !detail) {
      showToast('Lengkapi data loker terlebih dahulu.', true);
      return;
    }

    let image = null;

    if (file) {
      try {
        image = await pbnReadFileAsDataURL(
          file,
          1.5 * 1024 * 1024
        );
      } catch (err) {
        showToast(err.message, true);
        return;
      }
    }

    const article = {
      id: pbnNewId(),
      type: 'berita',
      title: businessName,
      category: 'Info Loker',
      village: '',
      author: user.name,
      date: new Date().toISOString(),

      excerpt:
        detail.length > 180
          ? detail.substring(0, 180) + '...'
          : detail,

      content:
        'Penanggung Jawab: ' +
        contactName +
        '\nWhatsApp: ' +
        phone +
        '\n\n' +
        detail,

      image: image,
      videoUrl: '',

      status:
        status === 'selesai'
          ? 'published'
          : 'draft',

      ticker: false,
      isHero: false,
      verifikasi: '',
      adSize: null,
      linkUrl: '',
      views: 0
    };

    pbnUpsertArticle(article);

    form.reset();

    renderStats(user);
    renderTable(user);

    showToast(
      article.status === 'published'
        ? 'Info loker berhasil diterbitkan.'
        : 'Info loker berhasil disimpan sebagai draf.'
    );
  };
}

function bindLokerEditForm() {
  const form = document.getElementById('loker-edit-form');
  if (!form) return;

  form.addEventListener('submit', async (e) => {
    e.preventDefault();

    const id = document.getElementById('loker-edit-id').value;

    const list = pbnGetLokerRequests();
    const item = list.find(r => r.id === id);

    if (!item) {
      showToast('Data loker tidak ditemukan.', true);
      return;
    }

    item.businessName =
      document.getElementById('loker-edit-business').value.trim();

    item.phone =
      document.getElementById('loker-edit-phone').value.trim();

    item.detail =
      document.getElementById('loker-edit-detail').value.trim();

    const file =
      document.getElementById('loker-edit-image').files[0];

    if (file) {
      try {
        item.image = await pbnReadFileAsDataURL(
          file,
          1.5 * 1024 * 1024
        );
      } catch (err) {
        showToast(err.message, true);
        return;
      }
    }

    pbnSaveLokerRequests(list);

    renderLokerRequests();

    form.reset();

    document.getElementById('loker-edit-panel').style.display = 'none';

    showToast('Info loker berhasil diperbarui.');
  });

  document
    .getElementById('loker-edit-cancel')
    .addEventListener('click', () => {

      form.reset();

      document.getElementById('loker-edit-panel').style.display = 'none';
    });
}

function bindAdCreateForm(user) {
  const form = document.getElementById('ads-create-form');
  if (!form) return;

  form.onsubmit = async function (e) {
    e.preventDefault();

    const title = document.getElementById('ads-create-title').value.trim();
    const businessName = document.getElementById('ads-create-business').value.trim();
    const phone = document.getElementById('ads-create-phone').value.trim();
    const detail = document.getElementById('ads-create-detail').value.trim();

    const promoRaw = document.getElementById('ads-create-promo').value.trim();

    const promoTexts = promoRaw
      ? promoRaw
          .split('\n')
          .map(text => text.trim())
          .filter(text => text.length > 0)
      : [];

    const adSize = document.getElementById('ads-create-size').value;
    const linkUrl = document.getElementById('ads-create-link').value.trim();
    const status = document.getElementById('ads-create-status').value;

    const file = document.getElementById('ads-create-image').files[0];

    if (!title || !businessName || !phone || !detail || !file) {
      showToast(
        'Lengkapi semua data iklan dan pilih gambar.',
        true
      );
      return;
    }

    let image;

    try {
      image = await pbnReadFileAsDataURL(
        file,
        1.5 * 1024 * 1024
      );
    } catch (err) {
      showToast(err.message, true);
      return;
    }

    const article = {
      id: pbnNewId(),
      type: 'iklan',
      title: title,
      category: 'Iklan',
      village: '',
      author: user.name,
      date: new Date().toISOString(),

      excerpt: detail,
      content: detail,

      image: image,
      videoUrl: '',

      status: status === 'published'
        ? 'published'
        : 'draft',

      ticker: false,
      isHero: false,
      verifikasi: '',

      adSize: adSize,
      linkUrl: linkUrl,

      businessName: businessName,
      phone: phone,
      detail: detail,

      promoTexts: promoTexts,

      views: 0
    };

    pbnUpsertArticle(article);

    form.reset();

    renderStats(user);
    renderTable(user);

    showToast(
      article.status === 'published'
        ? 'Iklan berhasil diterbitkan.'
        : 'Iklan berhasil disimpan sebagai draf.'
    );
  };
}

function openAdEditForm(id) {
  const item = pbnGetAdRequests().find(r => r.id === id);

  if (!item) {
    showToast('Data iklan tidak ditemukan.', true);
    return;
  }

  document.getElementById('ads-edit-id').value = item.id;
  document.getElementById('ads-edit-business').value =
    item.businessName || '';

  document.getElementById('ads-edit-phone').value =
    item.phone || '';

  document.getElementById('ads-edit-detail').value =
  item.detail || '';

document.getElementById('ads-edit-promo').value =
  Array.isArray(item.promoTexts)
    ? item.promoTexts.join('\n')
    : '';

document.getElementById('ads-edit-status').value =
  item.status || 'baru';

  document.getElementById('ads-edit-image').value = '';

  const panel = document.getElementById('ads-edit-panel');

  panel.style.display = 'block';

  panel.scrollIntoView({
    behavior: 'smooth',
    block: 'start'
  });
}

function bindPengunjungForms(user) {
  const tipForm = document.getElementById('tip-form');
  if (tipForm) {
    tipForm.onsubmit = async (e) => {
      e.preventDefault();
      let image = null;
      try {
        image = await pbnReadFileAsDataURL(document.getElementById('tip-image').files[0], 1 * 1024 * 1024);
      } catch (err) {
        showToast(err.message, true);
        return;
      }
      pbnAddNewsTip({
        title: document.getElementById('tip-title').value.trim(),
        village: document.getElementById('tip-village').value.trim(),
        detail: document.getElementById('tip-detail').value.trim(),
        phone: document.getElementById('tip-phone').value.trim(),
        image,
        submittedBy: user.username,
        submittedByName: user.name
      });
      tipForm.reset();
      renderMySubmissions(user);
      showToast('Info berita terkirim ke redaksi. Terima kasih!');
    };
  }

  const lokerForm = document.getElementById('pv-loker-form');
  if (lokerForm) {
    lokerForm.onsubmit = async (e) => {
      e.preventDefault();
      let image = null;
      try {
        image = await pbnReadFileAsDataURL(document.getElementById('pv-loker-image').files[0], 1 * 1024 * 1024);
      } catch (err) {
        showToast(err.message, true);
        return;
      }
      pbnAddLokerRequest({
        businessName: document.getElementById('pv-loker-business').value.trim(),
        contactName: user.name,
        phone: document.getElementById('pv-loker-phone').value.trim(),
        detail: document.getElementById('pv-loker-detail').value.trim(),
        image,
        submittedBy: user.username,
        submittedByName: user.name
      });
      lokerForm.reset();
      renderMySubmissions(user);
      showToast('Permintaan info loker terkirim. Admin akan menghubungi Anda.');
    };
  }

  const adForm = document.getElementById('ad-form');
  if (adForm) {
    adForm.onsubmit = async (e) => {
      e.preventDefault();
      let image = null;
      try {
        image = await pbnReadFileAsDataURL(document.getElementById('ad-image').files[0], 1 * 1024 * 1024);
      } catch (err) {
        showToast(err.message, true);
        return;
      }
      pbnAddAdRequest({
        businessName: document.getElementById('ad-business').value.trim(),
        phone: document.getElementById('ad-phone').value.trim(),
        detail: document.getElementById('ad-detail').value.trim(),
        image,
        submittedBy: user.username,
        submittedByName: user.name
      });
      adForm.reset();
      renderMySubmissions(user);
      showToast('Permintaan pasang iklan terkirim. Admin akan menghubungi Anda.');
    };
  }
}

/* ---------- Notifikasi Permintaan Masuk (badge merah) ---------- */
function pbnGetInboxCounts(user) {
  if (!user) return 0;
  let count = 0;
  if (pbnIsEditorInChief(user.role)) {
    count += pbnGetNewsTips().filter(t => t.status === 'baru').length;
    count += pbnGetLokerRequests().filter(r => r.status === 'baru').length;
    count += pbnGetAdRequests().filter(r => r.status === 'baru').length;
  } else if (user.role === 'reporter') {
    count += pbnGetNewsTips().filter(t => t.status === 'baru').length;
  }
  return count;
}

function pbnUpdateInboxBadge(user) {
  const count = pbnGetInboxCounts(user);
  document.querySelectorAll('.pbn-inbox-badge').forEach(el => {
    el.textContent = count > 99 ? '99+' : String(count);
    el.style.display = count > 0 ? 'inline-block' : 'none';
  });
}

/* ---------- Toast ---------- */
let toastTimer = null;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? 'var(--rust)' : 'var(--pine)';
  el.classList.add('show');
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}
/* =========================================================
   PROFIL SAYA — DASHBOARD
   ========================================================= */

let PBN_DASHBOARD_PROFILE_AVATAR = null;

function bindDashboardProfile(user) {

  const openBtn =
    document.getElementById(
      'profile-dashboard-btn'
    );

  const overlay =
    document.getElementById(
      'dashboard-profile-overlay'
    );

  const closeBtn =
    document.getElementById(
      'dashboard-profile-close'
    );

  const cancelBtn =
    document.getElementById(
      'dashboard-profile-cancel'
    );

  const form =
    document.getElementById(
      'dashboard-profile-form'
    );

  const avatarInput =
    document.getElementById(
      'dashboard-profile-avatar'
    );

  const deleteBtn =
    document.getElementById(
      'dashboard-profile-delete'
    );

  if (!openBtn || !overlay || !form) {
    return;
  }

  /* Hindari event listener ganda */
  openBtn.onclick = () => {
    openDashboardProfile(user);
  };

  closeBtn.onclick = () => {
    closeDashboardProfile();
  };

  cancelBtn.onclick = () => {
    closeDashboardProfile();
  };

  overlay.onclick = (e) => {
    if (e.target === overlay) {
      closeDashboardProfile();
    }
  };

  avatarInput.onchange = () => {

    const file = avatarInput.files[0];

    if (!file) return;

    if (file.size > 1024 * 1024) {

      showToast(
        'Ukuran foto maksimal 1MB.',
        true
      );

      avatarInput.value = '';

      return;
    }

    const reader = new FileReader();

    reader.onload = () => {

      PBN_DASHBOARD_PROFILE_AVATAR =
        reader.result;

      document.getElementById(
        'dashboard-profile-avatar-preview'
      ).src = reader.result;
    };

    reader.readAsDataURL(file);
  };

  form.onsubmit = (e) => {

    e.preventDefault();

    saveDashboardProfile(user);
  };

  deleteBtn.onclick = () => {

    deleteDashboardProfile(user);
  };
}


function openDashboardProfile(user) {

  const fullUser =
    pbnGetUserByUsername(user.username) || user;

  PBN_DASHBOARD_PROFILE_AVATAR =
    fullUser.avatar || null;

  document.getElementById(
    'dashboard-profile-username'
  ).value =
    fullUser.username || '';

  document.getElementById(
    'dashboard-profile-name'
  ).value =
    fullUser.name || '';

  document.getElementById(
    'dashboard-profile-phone'
  ).value =
    fullUser.phone || '';

  document.getElementById(
    'dashboard-profile-email'
  ).value =
    fullUser.email || '';

  document.getElementById(
    'dashboard-profile-password'
  ).value = '';

  document.getElementById(
    'dashboard-profile-avatar'
  ).value = '';

  document.getElementById(
    'dashboard-profile-avatar-preview'
  ).src =
    fullUser.avatar ||
    'data:image/svg+xml;charset=UTF-8,' +
    encodeURIComponent(
      '<svg xmlns="http://www.w3.org/2000/svg" width="120" height="120">' +
      '<rect width="120" height="120" fill="#E3DAC4"/>' +
      '<text x="60" y="68" text-anchor="middle" font-size="38" fill="#1F4B3F">PBN</text>' +
      '</svg>'
    );
  document.getElementById(
    'dashboard-profile-overlay'
  ).classList.add('open');

  document.body.style.overflow = 'hidden';
}


function closeDashboardProfile() {

  document.getElementById(
    'dashboard-profile-overlay'
  ).classList.remove('open');

  document.body.style.overflow = '';
}


function saveDashboardProfile(user) {

  const newUsername =
    document.getElementById(
      'dashboard-profile-username'
    ).value.trim().toLowerCase();

  const name =
    document.getElementById(
      'dashboard-profile-name'
    ).value.trim();

  const phone =
    document.getElementById(
      'dashboard-profile-phone'
    ).value.trim();

  const email =
    document.getElementById(
      'dashboard-profile-email'
    ).value.trim();

  const password =
    document.getElementById(
      'dashboard-profile-password'
    ).value;

  const avatar =
    PBN_DASHBOARD_PROFILE_AVATAR;

  if (!newUsername) {
    showToast('Username wajib diisi.', true);
    return;
  }

  if (!/^[a-z0-9._-]{3,30}$/.test(newUsername)) {
    showToast('Username 3–30 karakter: huruf kecil, angka, titik, garis bawah, atau tanda hubung.', true);
    return;
  }

  if (!name) {

    showToast(
      'Nama lengkap wajib diisi.',
      true
    );

    return;
  }

  if (newUsername !== user.username && pbnGetUserByUsername(newUsername)) {
    showToast('Username sudah dipakai. Silakan pilih username lain.', true);
    return;
  }

  const changes = {
    username: newUsername,
    name,
    phone,
    email,
    avatar
  };

  if (password) {
    changes.password = password;
  }
  /* SEMUA PERAN */
  pbnUpdateProfile(
    user.username,
    {
      username: newUsername,
      name,
      phone,
      email,
      password,
      avatar
    }
  );

  const freshUser =
    pbnGetUserByUsername(
      newUsername
    );

  if (freshUser) {

    user.username = freshUser.username;
    user.name = freshUser.name;
    user.phone = freshUser.phone;
    user.email = freshUser.email;
    user.avatar = freshUser.avatar;

    sessionStorage.setItem(
      PBN_KEYS.SESSION,
      JSON.stringify(user)
    );
  }

  document.getElementById(
    'dash-username'
  ).textContent =
    freshUser.name || freshUser.username;

  closeDashboardProfile();

  showToast(
    'Profil berhasil diperbarui.'
  );
}


function deleteDashboardProfile(user) {

  /* Super Admin tidak boleh menghapus dirinya sendiri */
  if (user.role === 'superadmin') {

    showToast(
      'Super Admin tidak dapat menghapus akun ini dari dashboard.',
      true
    );

    return;
  }

  const yakin = confirm(
    'Apakah Anda yakin ingin menghapus akun Anda?\n\n' +
    'Tindakan ini tidak dapat dibatalkan.'
  );

  if (!yakin) return;
  /* SEMUA AKUN NON-SUPER ADMIN DIHAPUS LANGSUNG */
  pbnDeleteUser(
    user.username
  );

  pbnLogout();

  closeDashboardProfile();

  showToast(
    'Akun Anda telah dihapus.'
  );

  setTimeout(() => {
    showLogin();
  }, 500);
}
/* =========================================================
   PENGATURAN HARGA KELAPA & EMAS
   KHUSUS SUPER ADMIN
   ========================================================= */

function renderMarketWidgetSettings() {

  const panel =
    document.getElementById('market-widget-panel');

  if (!panel) return;

  panel.style.display = 'block';

  const settings =
    pbnGetMarketWidget();

  document.getElementById(
    'market-enabled'
  ).checked =
    settings.enabled;

  document.getElementById(
    'market-kelapa-enabled'
  ).checked =
    settings.kelapa.enabled;

  document.getElementById(
    'market-kelapa-title'
  ).value =
    settings.kelapa.title || '';

  document.getElementById(
    'market-kelapa-price'
  ).value =
    settings.kelapa.price || '';

  document.getElementById(
    'market-kelapa-unit'
  ).value =
    settings.kelapa.unit || '';

  document.getElementById(
    'market-kelapa-note'
  ).value =
    settings.kelapa.note || '';

  document.getElementById(
    'market-emas-enabled'
  ).checked =
    settings.emas.enabled;

  document.getElementById(
    'market-emas-title'
  ).value =
    settings.emas.title || '';

  document.getElementById(
    'market-emas-note'
  ).value =
    settings.emas.note || '';

  renderEmasDenomList(settings.emas.denominations || []);

  document.getElementById(
    'market-emas-link'
  ).value =
    settings.emas.buyLink || '';
  document.getElementById(
  'market-emas-phone'
).value =
  settings.emas.phone || '';
  
  document.getElementById(
    'market-auto-hide'
  ).value =
    String(settings.autoHide || 10);
}


/* ---------- Daftar pecahan harga emas (dinamis: bisa tambah/hapus baris) ---------- */
function emasDenomRowHtml(denom) {
  denom = denom || {};
  const id = denom.id || ('emas-' + Date.now() + '-' + Math.floor(Math.random() * 1000));
  return `
    <div class="emas-denom-row" data-id="${pbnEscapeHtml(id)}">
      <input type="text" class="denom-label" placeholder="Label (mis. 1 gram)" value="${pbnEscapeHtml(denom.label || '')}">
      <input type="text" class="denom-price" placeholder="Harga jual (mis. Rp 2.450.000)" value="${pbnEscapeHtml(denom.price || '')}">
      <input type="text" class="denom-buyback" placeholder="Harga buyback (mis. Rp 2.300.000)" value="${pbnEscapeHtml(denom.buyback || '')}">
      <button type="button" class="emas-denom-remove" title="Hapus pecahan ini">✕</button>
    </div>
  `;
}

function renderEmasDenomList(denominations) {
  const list = document.getElementById('emas-denom-list');
  if (!list) return;

  list.innerHTML = (denominations && denominations.length)
    ? denominations.map(emasDenomRowHtml).join('')
    : emasDenomRowHtml({});

  bindEmasDenomRemoveButtons();
}

function bindEmasDenomRemoveButtons() {
  document.querySelectorAll('#emas-denom-list .emas-denom-remove').forEach(btn => {
    btn.onclick = () => {
      const rows = document.querySelectorAll('#emas-denom-list .emas-denom-row');
      // Selalu sisakan minimal 1 baris supaya form tidak kosong total
      if (rows.length <= 1) {
        btn.closest('.emas-denom-row').querySelectorAll('input').forEach(i => i.value = '');
        return;
      }
      btn.closest('.emas-denom-row').remove();
    };
  });
}

function bindEmasDenomAddButton() {
  const addBtn = document.getElementById('emas-denom-add');
  if (!addBtn || addBtn.dataset.bound === '1') return;
  addBtn.dataset.bound = '1';

  addBtn.onclick = () => {
    const list = document.getElementById('emas-denom-list');
    list.insertAdjacentHTML('beforeend', emasDenomRowHtml({}));
    bindEmasDenomRemoveButtons();
  };
}

function collectEmasDenominations() {
  return Array.from(
    document.querySelectorAll('#emas-denom-list .emas-denom-row')
  ).map(row => ({
    id: row.dataset.id,
    label: row.querySelector('.denom-label').value.trim(),
    price: row.querySelector('.denom-price').value.trim(),
    buyback: row.querySelector('.denom-buyback').value.trim()
  })).filter(d => d.label || d.price || d.buyback);
}

function bindMarketWidgetSettings() {

  const form =
    document.getElementById(
      'market-widget-form'
    );

  if (!form) return;

  bindEmasDenomAddButton();

  form.onsubmit = (e) => {

    e.preventDefault();

    const settings = {

      enabled:
        document.getElementById(
          'market-enabled'
        ).checked,

      kelapa: {

        enabled:
          document.getElementById(
            'market-kelapa-enabled'
          ).checked,

        title:
          document.getElementById(
            'market-kelapa-title'
          ).value.trim(),

        price:
          document.getElementById(
            'market-kelapa-price'
          ).value.trim(),

        unit:
          document.getElementById(
            'market-kelapa-unit'
          ).value.trim(),

        note:
          document.getElementById(
            'market-kelapa-note'
          ).value.trim()

      },

      emas: {

        enabled:
          document.getElementById(
            'market-emas-enabled'
          ).checked,

        title:
          document.getElementById(
            'market-emas-title'
          ).value.trim(),

        note:
          document.getElementById(
            'market-emas-note'
          ).value.trim(),

        denominations: collectEmasDenominations(),

        buyLink:
  document.getElementById(
    'market-emas-link'
  ).value.trim(),

phone:
  document.getElementById(
    'market-emas-phone'
  ).value.trim(),

updatedAt:
  new Date().toLocaleString('id-ID', {
    day: '2-digit',
    month: 'long',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  }) + ' WIB'

      },

      autoHide:
        Number(
          document.getElementById(
            'market-auto-hide'
          ).value
        ) || 10

    };

    pbnSaveMarketWidget(settings);

    showToast(
      'Pengaturan harga kelapa dan emas berhasil disimpan.'
    );
  };
}

/* =========================================================
   PANEL ADMIN: PAPAN INFORMASI DESA
   ========================================================= */
let PBN_PAPAN_DESA_EDIT_ID = null;

function renderPapanDesaPanel() {
  const tbody = document.getElementById('papan-desa-tbody');
  if (!tbody) return;

  const list = pbnGetBoardCards();

  if (!list.length) {
    tbody.innerHTML = `<tr><td colspan="4" class="table-empty">Belum ada kartu. Tambahkan lewat form di bawah.</td></tr>`;
    return;
  }

  tbody.innerHTML = list.map(card => `
    <tr data-papan-id="${pbnEscapeHtml(card.id)}">
      <td class="art-title">${pbnEscapeHtml(card.title)}</td>
      <td class="art-meta" style="max-width:280px;">${pbnEscapeHtml(card.desc)}</td>
      <td class="art-meta">${(card.items || []).length}</td>
      <td>
        <div class="row-actions">
          <button class="primary" data-papan-action="edit">Ubah</button>
          <button class="danger" data-papan-action="delete">Hapus</button>
        </div>
      </td>
    </tr>
  `).join('');

  tbody.querySelectorAll('button[data-papan-action]').forEach(btn => {
    btn.addEventListener('click', () => {
      const id = btn.closest('tr').getAttribute('data-papan-id');
      const action = btn.getAttribute('data-papan-action');
      if (action === 'edit') {
        openPapanDesaEditForm(id);
      } else if (action === 'delete') {
        if (confirm('Hapus kartu papan informasi ini?')) {
          pbnDeleteBoardCard(id);
          renderPapanDesaPanel();
          showToast('Kartu berhasil dihapus.');
        }
      }
    });
  });
}

function openPapanDesaEditForm(id) {
  const card = pbnGetBoardCards().find(c => c.id === id);
  if (!card) return;

  PBN_PAPAN_DESA_EDIT_ID = id;
  document.getElementById('papan-desa-edit-id').value = id;
  document.getElementById('papan-desa-title').value = card.title || '';
  document.getElementById('papan-desa-desc').value = card.desc || '';
  document.getElementById('papan-desa-items').value = (card.items || []).join('\n');
  document.getElementById('papan-desa-form-title').textContent = '✏️ Ubah Kartu';
  document.getElementById('papan-desa-submit-btn').textContent = 'SIMPAN PERUBAHAN';
  document.getElementById('papan-desa-cancel-btn').style.display = 'inline-block';

  const panel = document.getElementById('papan-desa-panel');
  if (panel) panel.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

function resetPapanDesaForm() {
  PBN_PAPAN_DESA_EDIT_ID = null;
  const form = document.getElementById('papan-desa-form');
  if (form) form.reset();
  document.getElementById('papan-desa-edit-id').value = '';
  document.getElementById('papan-desa-form-title').textContent = '➕ Tambah Kartu Baru';
  document.getElementById('papan-desa-submit-btn').textContent = 'SIMPAN KARTU';
  document.getElementById('papan-desa-cancel-btn').style.display = 'none';
}

function bindPapanDesaPanel() {
  const form = document.getElementById('papan-desa-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.addEventListener('submit', (e) => {
    e.preventDefault();

    const title = document.getElementById('papan-desa-title').value.trim();
    const desc = document.getElementById('papan-desa-desc').value.trim();
    const itemsRaw = document.getElementById('papan-desa-items').value.trim();
    const items = itemsRaw
      ? itemsRaw.split('\n').map(t => t.trim()).filter(t => t.length > 0)
      : [];

    if (!title || !desc) {
      showToast('Judul dan deskripsi wajib diisi.', true);
      return;
    }

    if (PBN_PAPAN_DESA_EDIT_ID) {
      pbnUpdateBoardCard(PBN_PAPAN_DESA_EDIT_ID, { title, desc, items });
      showToast('Kartu berhasil diperbarui.');
    } else {
      pbnAddBoardCard({ title, desc, items });
      showToast('Kartu baru berhasil ditambahkan.');
    }

    resetPapanDesaForm();
    renderPapanDesaPanel();
  });

  const cancelBtn = document.getElementById('papan-desa-cancel-btn');
  if (cancelBtn && !cancelBtn.dataset.bound) {
    cancelBtn.dataset.bound = '1';
    cancelBtn.addEventListener('click', resetPapanDesaForm);
  }
}

/* =========================================================
   PANEL ADMIN: IKLAN PROMO SHOPEE
   ========================================================= */

function renderShopeeAdsPanel() {
  const panel = document.getElementById('shopee-ads-panel');
  if (!panel) return;
  panel.style.display = 'block';

  const settings = pbnGetShopeeAds();

  document.getElementById('shopee-enabled').checked = settings.enabled;

  const tbody = document.getElementById('shopee-ads-tbody');
  if (!settings.items.length) {
    tbody.innerHTML = `<tr><td colspan="5" class="table-empty">Belum ada iklan Shopee. Tambahkan lewat form di bawah.</td></tr>`;
    return;
  }

  tbody.innerHTML = settings.items
    .slice()
    .sort((a, b) => (a.order || 0) - (b.order || 0))
    .map(item => `
     <tr data-shopee-id="${pbnEscapeHtml(item.id)}">
        <td>${item.mediaType === 'video'
          ? `<video src="${item.mediaUrl}" muted style="width:52px;height:52px;object-fit:cover;border-radius:6px;"></video>`
          : `<img src="${item.mediaUrl}" alt="" style="width:52px;height:52px;object-fit:cover;border-radius:6px;">`}</td>
        <td style="max-width:180px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">
          <a href="${pbnEscapeHtml(item.shopeeLink)}" target="_blank" rel="noopener noreferrer">${pbnEscapeHtml(item.shopeeLink || '')}</a>
        </td>
        <td>
          <label style="display:flex; align-items:center; gap:6px;">
            <input type="checkbox" class="shopee-item-toggle" ${item.enabled !== false ? 'checked' : ''}>
            Aktif
          </label>
        </td>
        <td>
          <button type="button" class="btn-secondary shopee-item-delete">🗑 Hapus</button>
        </td>
      </tr>
    `).join('');
}

function bindShopeeAdsPanel() {
  const enabledBox = document.getElementById('shopee-enabled');
  if (enabledBox && !enabledBox.dataset.bound) {
    enabledBox.dataset.bound = '1';
    enabledBox.onchange = () => {
      const settings = pbnGetShopeeAds();
      settings.enabled = enabledBox.checked;
      pbnSaveShopeeAds(settings);
      showToast('Pengaturan widget Iklan Shopee disimpan.');
    };
  }

  const tbody = document.getElementById('shopee-ads-tbody');
  if (tbody && !tbody.dataset.bound) {
    tbody.dataset.bound = '1';
    tbody.addEventListener('change', (e) => {
      if (!e.target.classList.contains('shopee-item-toggle')) return;
      const id = e.target.closest('tr').dataset.shopeeId;
      pbnUpdateShopeeAd(id, { enabled: e.target.checked });
      showToast('Status iklan diperbarui.');
    });
    tbody.addEventListener('click', (e) => {
      if (!e.target.classList.contains('shopee-item-delete')) return;
      const id = e.target.closest('tr').dataset.shopeeId;
      if (!confirm('Hapus iklan Shopee ini?')) return;
      pbnDeleteShopeeAd(id);
      renderShopeeAdsPanel();
      showToast('Iklan Shopee dihapus.');
    });
  }

  const form = document.getElementById('shopee-ad-form');
  if (!form || form.dataset.bound) return;
  form.dataset.bound = '1';

  form.onsubmit = (e) => {
    e.preventDefault();

    const fileInput = document.getElementById('shopee-ad-image');
    const caption = document.getElementById('shopee-ad-caption').value.trim();
    const link = document.getElementById('shopee-ad-link').value.trim();
    const file = fileInput.files[0];

    if (!file) {
      showToast('Pilih foto atau video produk terlebih dahulu.', true);
      return;
    }

    const isVideo = file.type.startsWith('video/');
    const maxSize = isVideo ? 5 * 1024 * 1024 : 1024 * 1024;

    if (file.size > maxSize) {
      showToast(isVideo ? 'Ukuran video maksimal 5MB.' : 'Ukuran foto maksimal 1MB.', true);
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      pbnAddShopeeAd({
        mediaUrl: reader.result,
        mediaType: isVideo ? 'video' : 'image',
        caption,
        shopeeLink: link,
        enabled: true
      });
      form.reset();
      renderShopeeAdsPanel();
      showToast('Iklan Shopee berhasil ditambahkan.');
    };
    reader.readAsDataURL(file);
  };
}

/* ===== STRUCTURED REDAKSI NAVIGATION ===== */
function setupPbnRedaksiLayout(user){
  const root=document.getElementById('redaksi-section');
  if(!root || root.dataset.structured==='1') return;
  root.dataset.structured='1';

  const moveToTarget=(el,target)=>{
    const t=root.querySelector('[data-pbn-target="'+target+'"]');
    if(el && t) t.appendChild(el);
  };

  const moveToHome=(el,targetId)=>{
    const t=document.getElementById(targetId);
    if(el && t) t.appendChild(el);
  };

  // Konten utama tetap dipisahkan: Semua Konten dan Tambah Konten.
  const grid=root.querySelector('.dash-grid');
  // Ambil panel pengguna SEBELUM dash-grid dihapus dari DOM.
  const usersPanel = root.querySelector('#users-panel');
  if(grid){
    const panels=Array.from(grid.children);
    if(panels[0]) moveToTarget(panels[0],'content');
    if(panels[1]) moveToTarget(panels[1],'create');
    grid.remove();
  }

  // Jangan memindahkan seluruh moderation-panels karena di dalamnya
  // terdapat beberapa jenis request yang sekarang harus tampil di Ringkasan.
  const mod=root.querySelector('#moderation-panels');
  const loker=root.querySelector('#loker-panel');
  const lokerCreate=root.querySelector('#loker-create-panel');
  const ads=root.querySelector('#ads-panel');
  const adsCreate=root.querySelector('#ads-create-panel');

  // Tiga informasi masuk langsung ke Dashboard/Ringkasan.
  const tips=root.querySelector('#tips-tbody');
  if(tips){ const panel=tips.closest('.panel'); if(panel) moveToHome(panel,'pbn-home-tips'); }
  if(loker) moveToHome(loker,'pbn-home-loker');
  if(ads) moveToHome(ads,'pbn-home-ads');

  // Form pembuatan tetap berada di menu masing-masing.
   if(lokerCreate) moveToTarget(lokerCreate,'loker');
  if(adsCreate) moveToTarget(adsCreate,'ads');

  const papanDesaPanel=root.querySelector('#papan-desa-panel');
  if(papanDesaPanel) moveToTarget(papanDesaPanel,'papan-desa');

  // Komentar tetap di menu Moderasi.
  const comments=root.querySelector('#comments-tbody');
  if(comments){ const panel=comments.closest('.panel'); if(panel) moveToTarget(panel,'moderation'); }

  // Jika masih ada elemen lain di moderation-panels, pindahkan ke Moderasi.
  if(mod){
    const remaining=Array.from(mod.children).filter(el=>
      el !== loker && el !== lokerCreate && el !== ads && el !== adsCreate &&
      !(comments && el === comments.closest('.panel')) &&
      !(tips && el === tips.closest('.panel'))
    );
    remaining.forEach(el=>moveToTarget(el,'moderation'));
    if(!mod.children.length) mod.remove();
  }

  // Panel Berita Live (Hero & Ticker) punya menu sendiri.
  const liveSettings=root.querySelector('#live-settings-panel');
  if(liveSettings) moveToTarget(liveSettings,'live-settings');

  // Pengaturan widget harga tetap di navigasi Pengaturan.
  const mw=root.querySelector('#market-widget-panel');
  if(mw) moveToTarget(mw,'settings');
  const shopeeAds=root.querySelector('#shopee-ads-panel');
  if(shopeeAds) moveToTarget(shopeeAds,'shopee-ads');
  // Manajemen Pengguna hanya berada di halaman Pengguna.
  // Panel sudah diambil sebelum dash-grid dihapus.
  if(usersPanel){
    moveToTarget(usersPanel,'users');
    usersPanel.dataset.pbnUserPanel='1';
  }
root.querySelectorAll('[data-pbn-view]').forEach(b=>{
    b.onclick=()=>{
      showPbnView(b.dataset.pbnView);
      closePbnNav();
    };
  });

  // Navigasi hamburger sederhana: sidebar muncul hanya saat diminta.
  const menuToggle = document.getElementById('pbn-menu-toggle');
  const sidebar = document.getElementById('pbn-redaksi-sidebar');
  const backdrop = document.getElementById('pbn-nav-backdrop');
  const closeBtn = document.getElementById('pbn-sidebar-close');
  const openPbnNav = ()=>{
    if(!sidebar) return;
    sidebar.classList.add('is-open');
    if(backdrop) backdrop.classList.add('is-visible');
    if(menuToggle) menuToggle.setAttribute('aria-expanded','true');
  };
  function closePbnNav(){
    if(sidebar) sidebar.classList.remove('is-open');
    if(backdrop) backdrop.classList.remove('is-visible');
    if(menuToggle) menuToggle.setAttribute('aria-expanded','false');
  }
  if(menuToggle && !menuToggle.dataset.bound){
    menuToggle.dataset.bound='1';
    menuToggle.onclick=()=> sidebar && sidebar.classList.contains('is-open') ? closePbnNav() : openPbnNav();
  }
  if(closeBtn && !closeBtn.dataset.bound){ closeBtn.dataset.bound='1'; closeBtn.onclick=closePbnNav; }
  if(backdrop && !backdrop.dataset.bound){ backdrop.dataset.bound='1'; backdrop.onclick=closePbnNav; }
  document.addEventListener('keydown', e=>{ if(e.key==='Escape') closePbnNav(); });

  function showPbnView(v){
    // Aktifkan tepat satu halaman. Untuk halaman Pengguna, pastikan
    // target benar-benar terlihat dan kedua panel akun berada di dalamnya.
    root.querySelectorAll('.pbn-view').forEach(x=>{
      const active = x.classList.contains('pbn-view-summary')
        ? v === 'summary'
        : x.dataset.pbnTarget === v;
      x.classList.toggle('active', active);
      x.setAttribute('aria-hidden', active ? 'false' : 'true');
      if(active) x.style.setProperty('display','block','important');
      else x.style.removeProperty('display');
    });

    root.querySelectorAll('.pbn-side-btn').forEach(x=>{
      x.classList.toggle('active',x.dataset.pbnView===v);
    });
    window.scrollTo({top:0,behavior:'smooth'});
  }

  const profileTarget=root.querySelector('[data-pbn-target="profiles"]');
  if(profileTarget) profileTarget.style.display='none';

  root.querySelectorAll('[data-pbn-role="superadmin"]').forEach(x=>{
    x.style.display=user.role==='superadmin'?'block':'none';
  });
  root.querySelectorAll('[data-pbn-role="editor"]').forEach(x=>{
    x.style.display=pbnIsEditorInChief(user.role)?'block':'none';
  });

  // Default saat dashboard dibuka: selalu Ringkasan.
  showPbnView('summary');

  // Ringkasan statistik sederhana.
  try{
    const articles=typeof pbnGetArticles==='function'?pbnGetArticles():[];
    const users=typeof pbnGetUsers==='function'?pbnGetUsers():[];
    const box=root.querySelector('#pbn-summary-cards');
    if(box){
      box.innerHTML=
        '<div class="pbn-summary-card"><small>Total Konten</small><strong>'+articles.length+'</strong></div>'+
        '<div class="pbn-summary-card"><small>Pengguna</small><strong>'+users.length+'</strong></div>'+
        '<div class="pbn-summary-card"><small>Berita</small><strong>'+articles.filter(a=>a.type!=="iklan").length+'</strong></div>'+
        '<div class="pbn-summary-card"><small>Status Redaksi</small><strong>Aktif</strong></div>';
    }
  }catch(e){}
}
