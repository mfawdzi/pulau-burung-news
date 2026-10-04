/* =========================================================
   Pulau Burung News — Statistik di Dashboard Redaksi
   Menampilkan: pengunjung, jumlah dibaca, jumlah dibagikan,
   konten terpopuler, dan pembaca per rubrik, dengan filter
   Hari / Bulan / Tahun. Data dibaca dari koleksi "analytics".
   Hanya tampil untuk Admin & Admin Super.
   ========================================================= */
(function () {
  const MONTHS = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const MONTHS_SHORT = ['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
  const COLORS = ['#1F4B3F', '#B23A18', '#A6742A', '#2E6B87', '#3C7361', '#7a5c8f', '#8a8a6a', '#c9862b'];

  const state = {
    mode: 'day',
    day: todayStr(),
    month: todayStr().slice(0, 7),
    year: new Date().getFullYear()
  };
  let events = [];
  let loaded = false;
  let todayVisitors = 0;
  let loadToken = 0;

  /* Hanya hitung catatan dari konten yang MASIH ADA.
     Kalau sebuah berita dihapus, statistiknya ikut hilang. */
  function liveEvents() {
    if (!(typeof PBN_CACHE !== 'undefined' && PBN_CACHE.ready && PBN_CACHE.ready.articles)) return events;
    const ids = new Set(pbnGetArticles().map(a => a.id));
    return events.filter(e => !e.articleId || ids.has(e.articleId));
  }

  function pad(n) { return String(n).padStart(2, '0'); }
  function todayStr() {
    const d = new Date();
    return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate());
  }
  function esc(s) { return pbnEscapeHtml(String(s == null ? '' : s)); }
  function fmt(n) { return Number(n || 0).toLocaleString('id-ID'); }

  function periodLabel() {
    if (state.mode === 'day') {
      const p = state.day.split('-');
      return Number(p[2]) + ' ' + MONTHS[Number(p[1]) - 1] + ' ' + p[0];
    }
    if (state.mode === 'month') {
      const p = state.month.split('-');
      return MONTHS[Number(p[1]) - 1] + ' ' + p[0];
    }
    return 'Tahun ' + state.year;
  }

  /* ---------- Membangun kerangka tampilan ---------- */
  function build(box) {
    const thisYear = new Date().getFullYear();
    let yearOpts = '';
    for (let y = thisYear; y >= thisYear - 4; y--) yearOpts += `<option value="${y}">${y}</option>`;

    box.dataset.built = '1';
    box.innerHTML = `
      <div class="pbn-an-head">
        <div>
          <span class="pbn-kicker">STATISTIK</span>
          <h2>Statistik Pembaca</h2>
          <p id="pbn-an-range"></p>
        </div>
        <div class="pbn-an-filter">
          <div class="pbn-an-tabs" id="pbn-an-tabs">
            <button type="button" data-mode="day" class="active">Hari</button>
            <button type="button" data-mode="month">Bulan</button>
            <button type="button" data-mode="year">Tahun</button>
          </div>
          <input type="date" id="pbn-an-day" value="${state.day}" max="${todayStr()}">
          <input type="month" id="pbn-an-month" value="${state.month}" max="${todayStr().slice(0, 7)}" style="display:none;">
          <select id="pbn-an-year" style="display:none;">${yearOpts}</select>
          <button type="button" class="pbn-an-refresh" id="pbn-an-refresh" title="Muat ulang">↻</button>
        </div>
      </div>
      <div class="pbn-an-cards" id="pbn-an-cards"></div>
      <div class="pbn-an-panel">
        <h3 id="pbn-an-chart-title">Grafik</h3>
        <div class="pbn-an-legend">
          <span><i style="background:#1F4B3F"></i>Dibaca</span>
          <span><i style="background:#B23A18"></i>Pengunjung</span>
          <span><i style="background:#A6742A"></i>Dibagikan</span>
        </div>
        <div id="pbn-an-chart"></div>
      </div>
      <div class="pbn-an-two">
        <div class="pbn-an-panel">
          <h3>Konten Paling Banyak Dibaca</h3>
          <div id="pbn-an-top"></div>
        </div>
        <div class="pbn-an-panel">
          <h3>Pembaca per Rubrik</h3>
          <div id="pbn-an-donut"></div>
        </div>
      </div>
      <p class="pbn-an-note">Statistik dihitung sejak fitur ini dipasang. Angka "Total Dibaca" di atas adalah total sepanjang masa, jadi bisa berbeda dengan angka di sini.</p>
    `;
    document.getElementById('pbn-an-year').value = String(state.year);

    box.querySelectorAll('#pbn-an-tabs button').forEach(btn => {
      btn.addEventListener('click', () => {
        state.mode = btn.getAttribute('data-mode');
        syncFilterUi();
        load();
      });
    });
    document.getElementById('pbn-an-day').addEventListener('change', e => {
      if (e.target.value) { state.day = e.target.value; load(); }
    });
    document.getElementById('pbn-an-month').addEventListener('change', e => {
      if (e.target.value) { state.month = e.target.value; load(); }
    });
    document.getElementById('pbn-an-year').addEventListener('change', e => {
      state.year = Number(e.target.value); load();
    });
    document.getElementById('pbn-an-refresh').addEventListener('click', () => load());
    syncFilterUi();
  }

  function syncFilterUi() {
    document.querySelectorAll('#pbn-an-tabs button').forEach(b => {
      b.classList.toggle('active', b.getAttribute('data-mode') === state.mode);
    });
    document.getElementById('pbn-an-day').style.display = state.mode === 'day' ? '' : 'none';
    document.getElementById('pbn-an-month').style.display = state.mode === 'month' ? '' : 'none';
    document.getElementById('pbn-an-year').style.display = state.mode === 'year' ? '' : 'none';
  }

  /* ---------- Mengambil data ---------- */
  async function queryEvents(field, value) {
    // Firestore membatasi 10.000 data per permintaan, jadi diambil bertahap
    const PAGE = 5000, MAX = 50000;
    const out = [];
    let last = null;
    while (out.length < MAX) {
      let q = db.collection('analytics').where(field, '==', value).limit(PAGE);
      if (last) q = q.startAfter(last);
      const snap = await q.get();
      snap.docs.forEach(d => out.push(d.data()));
      if (snap.docs.length < PAGE) break;
      last = snap.docs[snap.docs.length - 1];
    }
    return out;
  }

  async function load() {
    const token = ++loadToken;
    const cards = document.getElementById('pbn-an-cards');
    if (!cards) return;
    document.getElementById('pbn-an-range').textContent = 'Memuat data ' + periodLabel() + '...';
    try {
      const field = state.mode;                      // 'day' | 'month' | 'year'
      const value = state[state.mode];
      const data = await queryEvents(field, value);
      let today;
      if (state.mode === 'day' && state.day === todayStr()) today = data;
      else today = await queryEvents('day', todayStr());
      if (token !== loadToken) return;               // ada permintaan yang lebih baru
      events = data;
      loaded = true;
      todayVisitors = new Set(today.map(e => e.visitorId)).size;
      render();
    } catch (err) {
      if (token !== loadToken) return;
      console.error('[Statistik] gagal memuat', err);
      const denied = err && err.code === 'permission-denied';
      document.getElementById('pbn-an-range').textContent = '';
      cards.innerHTML = `<div class="pbn-an-error">${denied
        ? 'Statistik belum bisa dibaca. Perbarui aturan Firestore (koleksi "analytics") sesuai panduan, lalu muat ulang halaman.'
        : 'Gagal memuat statistik. Coba klik tombol muat ulang (↻).'}</div>`;
    }
  }

  /* ---------- Mengolah data ---------- */
  function buildBuckets() {
    let n, labels;
    if (state.mode === 'day') {
      n = 24;
      labels = Array.from({ length: 24 }, (_, i) => pad(i));
    } else if (state.mode === 'month') {
      const p = state.month.split('-');
      n = new Date(Number(p[0]), Number(p[1]), 0).getDate();
      labels = Array.from({ length: n }, (_, i) => String(i + 1));
    } else {
      n = 12;
      labels = MONTHS_SHORT.slice();
    }
    const buckets = labels.map(label => ({ label, views: 0, shares: 0, visitors: new Set() }));
    liveEvents().forEach(e => {
      let idx;
      if (state.mode === 'day') idx = Number(e.hour);
      else if (state.mode === 'month') idx = Number(String(e.day).slice(8, 10)) - 1;
      else idx = Number(String(e.month).slice(5, 7)) - 1;
      const b = buckets[idx];
      if (!b) return;
      if (e.type === 'view') b.views++;
      else if (e.type === 'share') b.shares++;
      b.visitors.add(e.visitorId);
    });
    return buckets;
  }

  function bucketTitle(b) {
    if (state.mode === 'day') return 'Pukul ' + b.label + ':00';
    if (state.mode === 'month') return b.label + ' ' + MONTHS[Number(state.month.split('-')[1]) - 1];
    return MONTHS[MONTHS_SHORT.indexOf(b.label)] + ' ' + state.year;
  }

  /* ---------- Menggambar ---------- */
  function niceMax(v) {
    if (v <= 5) return 5;
    const pow = Math.pow(10, Math.floor(Math.log10(v)));
    const f = v / pow;
    const nice = f <= 1 ? 1 : f <= 2 ? 2 : f <= 5 ? 5 : 10;
    return nice * pow;
  }

  function chartSvg(buckets) {
    const W = 760, H = 280, L = 40, R = 12, T = 12, B = 30;
    const iw = W - L - R, ih = H - T - B;
    const rawMax = Math.max(1, ...buckets.map(b => Math.max(b.views, b.shares, b.visitors.size)));
    const max = niceMax(rawMax);
    const step = iw / buckets.length;
    const x = i => L + step * i + step / 2;
    const y = v => T + ih - (v / max) * ih;

    let g = '';
    for (let i = 0; i <= 4; i++) {
      const val = (max / 4) * i;
      const yy = y(val);
      g += `<line x1="${L}" x2="${W - R}" y1="${yy}" y2="${yy}" stroke="rgba(33,29,22,0.12)"/>`;
      g += `<text x="${L - 6}" y="${yy + 3}" text-anchor="end" font-size="10" fill="#5C5745">${Math.round(val)}</text>`;
    }
    const every = buckets.length > 20 ? 3 : buckets.length > 12 ? 2 : 1;
    buckets.forEach((b, i) => {
      if (i % every === 0) g += `<text x="${x(i)}" y="${H - 10}" text-anchor="middle" font-size="10" fill="#5C5745">${esc(b.label)}</text>`;
    });

    const bw = Math.max(2, Math.min(28, step * 0.6));
    buckets.forEach((b, i) => {
      if (b.views > 0) {
        g += `<rect x="${x(i) - bw / 2}" y="${y(b.views)}" width="${bw}" height="${T + ih - y(b.views)}" fill="#1F4B3F" rx="1"/>`;
      }
    });

    const line = (key, color, dash) => {
      const pts = buckets.map((b, i) => [x(i), y(key === 'visitors' ? b.visitors.size : b[key])]);
      let s = `<polyline points="${pts.map(p => p.join(',')).join(' ')}" fill="none" stroke="${color}" stroke-width="2" ${dash ? 'stroke-dasharray="5 4"' : ''}/>`;
      pts.forEach((p, i) => {
        const v = key === 'visitors' ? buckets[i].visitors.size : buckets[i][key];
        if (v > 0) s += `<circle cx="${p[0]}" cy="${p[1]}" r="3" fill="${color}"/>`;
      });
      return s;
    };
    g += line('visitors', '#B23A18', false);
    g += line('shares', '#A6742A', true);

    // Area sentuh/hover untuk tooltip
    buckets.forEach((b, i) => {
      g += `<rect x="${L + step * i}" y="${T}" width="${step}" height="${ih}" fill="transparent"><title>${esc(bucketTitle(b))}\nDibaca: ${b.views}\nPengunjung: ${b.visitors.size}\nDibagikan: ${b.shares}</title></rect>`;
    });

    return `<svg viewBox="0 0 ${W} ${H}" width="100%" role="img" aria-label="Grafik statistik" style="display:block;">${g}</svg>`;
  }

  function topListHtml() {
    const map = new Map();
    liveEvents().forEach(e => {
      if ((e.type !== 'view' && e.type !== 'share') || !e.articleId) return;
      let r = map.get(e.articleId);
      if (!r) {
        const art = pbnGetArticleById(e.articleId);
        r = { title: (art && art.title) || e.articleTitle || '(tanpa judul)', category: (art && art.category) || e.category || '', views: 0, shares: 0 };
        map.set(e.articleId, r);
      }
      if (e.type === 'view') r.views++; else r.shares++;
    });
    const rows = [...map.values()].sort((a, b) => (b.views - a.views) || (b.shares - a.shares)).slice(0, 10);
    if (!rows.length) return '<p class="pbn-an-empty">Belum ada konten yang dibaca pada periode ini.</p>';
    const top = Math.max(1, rows[0].views);
    return rows.map((r, i) => `
      <div class="pbn-an-toprow">
        <div class="pbn-an-toprank">${i + 1}</div>
        <div class="pbn-an-topbody">
          <div class="pbn-an-toptitle">${esc(r.title)}</div>
          <div class="pbn-an-topbar"><span style="width:${Math.max(3, (r.views / top) * 100)}%"></span></div>
          <div class="pbn-an-topmeta">${esc(r.category)}${r.category ? ' · ' : ''}${fmt(r.views)} dibaca · ${fmt(r.shares)} dibagikan</div>
        </div>
      </div>`).join('');
  }

  function donutHtml() {
    const map = new Map();
    liveEvents().forEach(e => {
      if (e.type !== 'view') return;
      const c = e.category || 'Lainnya';
      map.set(c, (map.get(c) || 0) + 1);
    });
    const rows = [...map.entries()].sort((a, b) => b[1] - a[1]);
    const total = rows.reduce((s, r) => s + r[1], 0);
    if (!total) return '<p class="pbn-an-empty">Belum ada data pembaca pada periode ini.</p>';

    const R = 56, C = 2 * Math.PI * R;
    let offset = 0, arcs = '';
    rows.forEach((r, i) => {
      const len = (r[1] / total) * C;
      arcs += `<circle cx="80" cy="80" r="${R}" fill="none" stroke="${COLORS[i % COLORS.length]}" stroke-width="26" stroke-dasharray="${len} ${C - len}" stroke-dashoffset="${-offset}" transform="rotate(-90 80 80)"><title>${esc(r[0])}: ${r[1]}</title></circle>`;
      offset += len;
    });
    const legend = rows.map((r, i) => `
      <div class="pbn-an-lg"><i style="background:${COLORS[i % COLORS.length]}"></i><span>${esc(r[0])}</span><b>${fmt(r[1])} (${Math.round((r[1] / total) * 100)}%)</b></div>`).join('');
    return `<div class="pbn-an-donutwrap">
      <svg viewBox="0 0 160 160" width="160" height="160" role="img" aria-label="Diagram pembaca per rubrik">${arcs}
        <text x="80" y="78" text-anchor="middle" font-size="20" font-weight="700" fill="#211D16">${fmt(total)}</text>
        <text x="80" y="95" text-anchor="middle" font-size="9" fill="#5C5745">DIBACA</text>
      </svg>
      <div class="pbn-an-legendlist">${legend}</div>
    </div>`;
  }

  function render() {
    const evs = liveEvents();
    const views = evs.filter(e => e.type === 'view').length;
    const shares = evs.filter(e => e.type === 'share').length;
    const visitors = new Set(evs.map(e => e.visitorId)).size;
    const label = periodLabel();

    document.getElementById('pbn-an-range').textContent = 'Menampilkan data: ' + label;
    document.getElementById('pbn-an-cards').innerHTML = `
      <div class="stat-card"><div class="num">${fmt(todayVisitors)}</div><div class="label">Pengunjung Hari Ini</div></div>
      <div class="stat-card"><div class="num">${fmt(visitors)}</div><div class="label">Pengunjung · ${esc(label)}</div></div>
      <div class="stat-card"><div class="num">${fmt(views)}</div><div class="label">Dibaca · ${esc(label)}</div></div>
      <div class="stat-card"><div class="num">${fmt(shares)}</div><div class="label">Dibagikan · ${esc(label)}</div></div>`;

    const per = state.mode === 'day' ? 'per Jam' : state.mode === 'month' ? 'per Hari' : 'per Bulan';
    document.getElementById('pbn-an-chart-title').textContent = 'Grafik ' + per + ' — ' + label;
    document.getElementById('pbn-an-chart').innerHTML = chartSvg(buildBuckets());
    document.getElementById('pbn-an-top').innerHTML = topListHtml();
    document.getElementById('pbn-an-donut').innerHTML = donutHtml();
  }

  /* ---------- Aktifkan hanya untuk Admin / Admin Super ---------- */
  function ensure() {
    const box = document.getElementById('pbn-analytics');
    if (!box || typeof pbnCurrentUser !== 'function') return;
    const user = pbnCurrentUser();
    if (!user || !pbnIsEditorInChief(user.role)) { box.style.display = 'none'; return; }
    box.style.display = 'block';
    if (!box.dataset.built) { build(box); load(); }
  }

  document.addEventListener('pbn:data-changed', (e) => {
    ensure();
    // Berita ditambah/dihapus -> perbarui statistik langsung tanpa memuat ulang
    const box = document.getElementById('pbn-analytics');
    if (e.detail && e.detail.name === 'articles' && loaded && box && box.dataset.built) render();
  });
  document.addEventListener('DOMContentLoaded', ensure);

})();
