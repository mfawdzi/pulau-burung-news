/* =========================================================
   Pulau Burung News — Logic situs publik (index.html)
   ========================================================= */

let PBN_ACTIVE_CATEGORY = null;
let PBN_PROFILE_AVATAR = null; // menampung foto baru yang dipilih di modal profil sebelum disimpan
let PBN_TERBARU_EXPANDED = false; // true = sedang menampilkan semua berita terbaru (bukan cuma 5)
let PBN_TERPOPULER_EXPANDED = false; // true = sedang menampilkan semua berita terpopuler (bukan cuma 5)
const PBN_DEFAULT_AVATAR = 'data:image/svg+xml;utf8,' + encodeURIComponent(
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 56 56"><rect width="56" height="56" fill="#E3DAC4"/><circle cx="28" cy="22" r="10" fill="#5C5745"/><path d="M8 50c2-12 12-18 20-18s18 6 20 18" fill="#5C5745"/></svg>'
);

console.log('PBN MAIN.JS VERSION: TEST-999');

document.addEventListener('DOMContentLoaded', () => {
  renderDate();
  renderAll();
  bindNav();
  bindStickyTicker();
  bindModal();
  bindSearch();
  bindLokerForm();
  renderAuthArea();
  renderNavProfileMini();
  bindNavProfileScroll();
  bindProfileModal();
  bindAdModal();
  bindMarketWidget();
  initShopeeWidget();
  openArticleFromHash();
  // Cek tiap 30 detik apakah giliran iklan (rotasi 5 menit) sudah berganti
  setInterval(() => {
    renderAdSlots(getPublished());
  }, 30000);
});

function getPublished() {
  return pbnGetArticles().filter(a => a.status === 'published');
}

function renderDate() {
  const el = document.getElementById('current-date');
  if (!el) return;
  const hari = ['Minggu','Senin','Selasa','Rabu','Kamis','Jumat','Sabtu'];
  const bulan = ['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
  const d = new Date();
  el.textContent = `${hari[d.getDay()]}, ${d.getDate()} ${bulan[d.getMonth()]} ${d.getFullYear()} · Kec. Pulau Burung, Indragiri Hilir`;
}

function renderAll() {
  const all = getPublished();
  const berita = all.filter(a => a.type === 'berita');
  const papan = all.filter(a => a.type === 'papan');

  const filtered = PBN_ACTIVE_CATEGORY
    ? berita.filter(a => a.category === PBN_ACTIVE_CATEGORY)
    : berita;

  renderFilterBanner();
  renderTicker(berita);
  renderHero(filtered);
  renderTerbaru(filtered);
  renderTerpopuler(filtered);
  renderPapan(papan);
  renderPeristiwa(berita);
  renderLoker(berita);
  renderAdSlots(all);
}

/* Style latar untuk menampilkan foto yang diunggah pada kartu/thumbnail.
   Jika tidak ada foto, kembalikan string kosong sehingga pola placeholder bawaan tetap tampil. */
function pbnImageStyle(article) {
  return article && article.image
    ? ` style="background-image:url('${article.image}');background-size:cover;background-position:center;"`
    : '';
}

/* ---------- Filter banner ---------- */
function renderFilterBanner() {
  const el = document.getElementById('filter-banner');
  if (!el) return;
  if (!PBN_ACTIVE_CATEGORY) {
    el.style.display = 'none';
    return;
  }
  el.style.display = 'flex';
  el.innerHTML = `
    <span>Menampilkan rubrik: <strong>${pbnEscapeHtml(PBN_ACTIVE_CATEGORY)}</strong></span>
    <button id="clear-filter">HAPUS FILTER ×</button>
  `;
  document.getElementById('clear-filter').addEventListener('click', () => {
    PBN_ACTIVE_CATEGORY = null;
    renderAll();
    window.scrollTo({ top: 0, behavior: 'smooth' });
  });
}

/* ---------- Ticker ---------- */
function renderTicker(berita) {
  const track = document.getElementById('ticker-move');
  const trackSticky = document.getElementById('ticker-move-sticky');
  if (!track) return;
  const items = berita.filter(a => a.ticker).slice(0, 6);
  const source = items.length ? items : berita.slice(0, 3);
  const html = source.map(a => `<span>${pbnEscapeHtml(a.title)}</span>`).join('');
  track.innerHTML = html;
  if (trackSticky) trackSticky.innerHTML = html;
}

/* ---------- Hero ---------- */
function renderHero(list) {
  const heroWrap = document.getElementById('hero-content');
  const sideWrap = document.getElementById('hero-side');
  if (!heroWrap || !sideWrap) return;

  if (!list.length) {
    heroWrap.innerHTML = '<p class="empty-note">Belum ada berita pada rubrik ini.</p>';
    sideWrap.innerHTML = '';
    return;
  }

  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  const hero = sorted.find(a => a.isHero) || sorted[0];
  const rest = sorted.filter(a => a.id !== hero.id).slice(0, 3);

  heroWrap.innerHTML = `
    <div class="hero-figure" data-id="${hero.id}"${pbnImageStyle(hero)}>${hero.image ? '' : '<span class="cap">FOTO — LOKASI KEJADIAN</span>'}</div>
    <span class="tag ${pbnCategoryTagClass(hero.category)}">${pbnEscapeHtml(hero.category)}</span>
    <h1 data-id="${hero.id}" style="margin-top:12px;">${pbnEscapeHtml(hero.title)}</h1>
    <div class="byline">
      <span>Oleh ${pbnEscapeHtml(hero.author)}</span><span class="dot">·</span><span>${pbnFormatDate(hero.date)}</span><span class="dot">·</span><span>${pbnEscapeHtml(hero.village || '')}</span>
    </div>
    <div class="ad-slot ad-small" id="ad-slot-hero" style="margin:16px 0;"></div>
    <p class="dek">${pbnEscapeHtml(hero.excerpt)}</p>
    <button type="button" class="hero-readmore" data-id="${hero.id}">Baca Selengkapnya →</button>
  `;

  sideWrap.innerHTML = rest.map(a => `
    <div class="side-item" data-id="${a.id}">
      <div class="side-thumb"${pbnImageStyle(a)}></div>
      <div>
        <span class="tag ${pbnCategoryTagClass(a.category)}">${pbnEscapeHtml(a.category)}</span>
        <h3 style="margin-top:8px;">${pbnEscapeHtml(a.title)}</h3>
        <div class="meta">${pbnRelativeTime(a.date)}</div>
      </div>
    </div>
  `).join('');

  bindClickable(heroWrap);
  bindClickable(sideWrap);
}

/* ---------- Berita terbaru ---------- */
function renderTerbaru(list) {
  const wrap = document.getElementById('terbaru-list');
  if (!wrap) return;
  const sorted = [...list].sort((a, b) => new Date(b.date) - new Date(a.date));
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-note">Belum ada berita terbaru.</p>';
    return;
  }
  const visible = PBN_TERBARU_EXPANDED ? sorted : sorted.slice(0, 5);
  wrap.innerHTML = visible.map(a => `
    <div class="news-row" data-id="${a.id}">
      <div class="news-thumb"${pbnImageStyle(a)}></div>
      <div>
        <span class="tag ${pbnCategoryTagClass(a.category)}">${pbnEscapeHtml(a.category)}</span>
        <h3>${pbnEscapeHtml(a.title)}</h3>
        <div class="meta">${pbnRelativeTime(a.date)} · ${pbnEscapeHtml(a.author)}</div>
      </div>
    </div>
  `).join('') + (sorted.length > 5 ? `
    <button type="button" id="terbaru-see-more" style="width:100%;margin-top:12px;padding:10px;border:1px solid var(--line);background:none;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.05em;cursor:pointer;">
      ${PBN_TERBARU_EXPANDED ? 'SEMBUNYIKAN ↑' : 'SELENGKAPNYA →'}
    </button>
  ` : '');
  bindClickable(wrap);

  const seeMoreBtn = document.getElementById('terbaru-see-more');
  if (seeMoreBtn) {
    seeMoreBtn.addEventListener('click', () => {
      PBN_TERBARU_EXPANDED = !PBN_TERBARU_EXPANDED;
      renderTerbaru(list);
    });
  }
}

/* ---------- Terpopuler ---------- */
function renderTerpopuler(list) {
  const wrap = document.getElementById('terpopuler-list');
  if (!wrap) return;
  const sorted = [...list].sort((a, b) => (b.views || 0) - (a.views || 0));
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-note">Belum ada data.</p>';
    return;
  }
  const visible = PBN_TERPOPULER_EXPANDED ? sorted : sorted.slice(0, 5);
  wrap.innerHTML = visible.map((a, i) => `
    <div class="rank-item" data-id="${a.id}">
      <div class="rank-num">${String(i + 1).padStart(2, '0')}</div>
      <div>
        <h3>${pbnEscapeHtml(a.title)}</h3>
        <div class="meta">${(a.views || 0).toLocaleString('id-ID')} dibaca</div>
      </div>
    </div>
  `).join('') + (sorted.length > 5 ? `
    <button type="button" id="terpopuler-see-more" style="width:100%;margin-top:12px;padding:10px;border:1px solid var(--line);background:none;font-family:'IBM Plex Mono',monospace;font-size:12px;letter-spacing:0.05em;cursor:pointer;">
      ${PBN_TERPOPULER_EXPANDED ? 'SEMBUNYIKAN ↑' : 'SELENGKAPNYA →'}
    </button>
  ` : '');
  bindClickable(wrap);

  const seeMoreBtn = document.getElementById('terpopuler-see-more');
  if (seeMoreBtn) {
    seeMoreBtn.addEventListener('click', () => {
      PBN_TERPOPULER_EXPANDED = !PBN_TERPOPULER_EXPANDED;
      renderTerpopuler(list);
    });
  }
}

/* ---------- Papan Informasi Desa → Showcase Usulan Fitur (statis, geser 1x1) ---------- */
const PBN_BOARD_SHOWCASE = [
  {
    title: 'Jajak Pendapat Warga (Polling)',
    desc: "Bikin warga lebih terlibat — redaksi bisa tanya pendapat soal isu lokal (mis. 'Setuju jalan desa diperbaiki lewat swadaya?') dan lihat hasilnya real-time.",
    items: [
      'Pertanyaan + beberapa pilihan jawaban',
      'Warga vote satu kali per akun',
      'Hasil ditampilkan sebagai persentase/grafik'
    ]
  },
  {
    title: 'Kontak Darurat & Layanan Publik',
    desc: 'Daftar nomor penting yang sering dicari warga — puskesmas, polsek, damkar, kantor desa — daripada nyari-nyari di WA grup.',
    items: [
      'Nama layanan (Puskesmas, Polsek, dll)',
      'Nomor telepon/WA',
      'Jam operasional'
    ]
  },
  {
    title: 'Direktori UMKM & Usaha Lokal',
    desc: "Katalog toko/usaha kecil di kecamatan — beda dari Info Loker (lowongan kerja) dan Iklan (promosi berbayar), ini lebih ke 'buku alamat' usaha yang bisa dicari warga.",
    items: [
      'Nama usaha & jenis (warung, bengkel, dll)',
      'Desa/lokasi usaha',
      'Nomor WhatsApp kontak'
    ]
  },
  {
    title: 'Info Cuaca & Pasang Surut Air Laut',
    desc: 'Sangat relevan buat daerah pesisir kayak Pulau Burung — nelayan & warga yang mau bepergian pakai speedboat butuh info ini tiap hari.',
    items: [
      'Kondisi cuaca hari ini/besok',
      'Jadwal pasang-surut air laut',
      'Peringatan gelombang tinggi (kalau ada)'
    ]
  },
  {
    title: 'Agenda Kegiatan Desa',
    desc: 'Kalender kegiatan per desa — musyawarah, gotong royong, posyandu, turnamen, dll. Warga bisa tahu kapan & di mana acara berlangsung.',
    items: [
      'Tanggal & waktu kegiatan',
      'Nama desa penyelenggara',
      'Lokasi (mis. Balai Desa)'
    ]
  }
];

let PBN_BOARD_INDEX = 0;
const PBN_BOARD_PER_VIEW = 1;

function renderPapan() {
  const track = document.getElementById('board-rows');
  const dotsWrap = document.getElementById('board-dots');
  if (!track) return;

  const items = pbnGetBoardCards();

  if (!items.length) {
    track.innerHTML = '<div class="board-card"><p class="board-card-desc">Belum ada informasi di papan desa.</p></div>';
    if (dotsWrap) dotsWrap.innerHTML = '';
    return;
  }

  track.innerHTML = items.map(card => `
    <div class="board-card">
      <h3 class="board-card-title">${pbnEscapeHtml(card.title)}</h3>
      <p class="board-card-desc">${pbnEscapeHtml(card.desc)}</p>
      <div class="board-card-items">
        ${card.items.map(t => `<div class="board-card-item">${pbnEscapeHtml(t)}</div>`).join('')}
      </div>
    </div>
  `).join('');

  PBN_BOARD_INDEX = 0;
  renderBoardDots(items.length);
  updateBoardPosition();
  bindBoardCarousel(items.length);
}

function renderBoardDots(total) {
  const dotsWrap = document.getElementById('board-dots');
  if (!dotsWrap) return;
  if (total <= 1) { dotsWrap.innerHTML = ''; return; }
  dotsWrap.innerHTML = Array.from({ length: total }).map((_, i) =>
    `<button type="button" class="board-dot ${i === PBN_BOARD_INDEX ? 'active' : ''}" data-index="${i}"></button>`
  ).join('');
  dotsWrap.querySelectorAll('.board-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Number(btn.getAttribute('data-index'));
      updateBoardPosition();
    });
  });
}

function updateBoardPosition() {
  const track = document.getElementById('board-rows');
  const dotsWrap = document.getElementById('board-dots');
  const prevBtn = document.getElementById('board-prev');
  const nextBtn = document.getElementById('board-next');
  if (!track) return;

  const cards = track.querySelectorAll('.board-card');
  if (!cards.length) return;

  const cardWidth = cards[0].getBoundingClientRect().width;
  const gap = 16;
  const offset = PBN_BOARD_INDEX * (cardWidth + gap);
  track.style.transform = `translateX(-${offset}px)`;

  const maxIndex = cards.length - 1;
  if (prevBtn) prevBtn.disabled = PBN_BOARD_INDEX <= 0;
  if (nextBtn) nextBtn.disabled = PBN_BOARD_INDEX >= maxIndex;

  if (dotsWrap) {
    dotsWrap.querySelectorAll('.board-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === PBN_BOARD_INDEX);
    });
  }
}

function bindBoardCarousel(total) {
  const track = document.getElementById('board-rows');
  const prevBtn = document.getElementById('board-prev');
  const nextBtn = document.getElementById('board-next');
  if (!track) return;

  const maxIndex = total - 1;

  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = '1';
    prevBtn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Math.max(0, PBN_BOARD_INDEX - 1);
      updateBoardPosition();
    });
  }
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = '1';
    nextBtn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Math.min(maxIndex, PBN_BOARD_INDEX + 1);
      updateBoardPosition();
    });
  }

  if (!track.dataset.dragBound) {
    track.dataset.dragBound = '1';
    let startX = 0;
    let dragging = false;

    const onStart = (x) => {
      dragging = true;
      startX = x;
      track.classList.add('dragging');
    };
    const onEnd = (x) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      const diff = startX - x;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          PBN_BOARD_INDEX = Math.min(maxIndex, PBN_BOARD_INDEX + 1);
        } else {
          PBN_BOARD_INDEX = Math.max(0, PBN_BOARD_INDEX - 1);
        }
      }
      updateBoardPosition();
    };

    track.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    track.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX));

    track.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX); });
    window.addEventListener('mouseup', (e) => { if (dragging) onEnd(e.clientX); });
  }

  if (!window._pbnBoardResizeBound) {
    window._pbnBoardResizeBound = true;
    window.addEventListener('resize', () => updateBoardPosition());
  }
}

function renderBoardDots(total) {
  const dotsWrap = document.getElementById('board-dots');
  if (!dotsWrap) return;
  const maxIndex = Math.max(0, total - PBN_BOARD_PER_VIEW);
  const dotCount = maxIndex + 1;
  if (dotCount <= 1) { dotsWrap.innerHTML = ''; return; }
  dotsWrap.innerHTML = Array.from({ length: dotCount }).map((_, i) =>
    `<button type="button" class="board-dot ${i === PBN_BOARD_INDEX ? 'active' : ''}" data-index="${i}"></button>`
  ).join('');
  dotsWrap.querySelectorAll('.board-dot').forEach(btn => {
    btn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Number(btn.getAttribute('data-index'));
      updateBoardPosition();
    });
  });
}

function updateBoardPosition() {
  const track = document.getElementById('board-rows');
  const viewport = document.getElementById('board-viewport');
  const dotsWrap = document.getElementById('board-dots');
  const prevBtn = document.getElementById('board-prev');
  const nextBtn = document.getElementById('board-next');
  if (!track) return;

  const cards = track.querySelectorAll('.board-card');
  if (!cards.length) return;

  const cardWidth = cards[0].getBoundingClientRect().width;
  const gap = 16;
  const offset = PBN_BOARD_INDEX * (cardWidth + gap);
  track.style.transform = `translateX(-${offset}px)`;

  // Tinggi viewport mengikuti kartu yang sedang aktif saja,
  // supaya kartu pendek tidak menyisakan ruang kosong di bawahnya.
  const activeCard = cards[PBN_BOARD_INDEX];
  if (viewport && activeCard) {
    viewport.style.height = activeCard.offsetHeight + 'px';
  }

  const maxIndex = Math.max(0, cards.length - PBN_BOARD_PER_VIEW);
  if (prevBtn) prevBtn.disabled = PBN_BOARD_INDEX <= 0;
  if (nextBtn) nextBtn.disabled = PBN_BOARD_INDEX >= maxIndex;

  if (dotsWrap) {
    dotsWrap.querySelectorAll('.board-dot').forEach((dot, i) => {
      dot.classList.toggle('active', i === PBN_BOARD_INDEX);
    });
  }
}

function bindBoardCarousel(total) {
  const track = document.getElementById('board-rows');
  const prevBtn = document.getElementById('board-prev');
  const nextBtn = document.getElementById('board-next');
  if (!track) return;

  const maxIndex = () => Math.max(0, total - PBN_BOARD_PER_VIEW);

  if (prevBtn && !prevBtn.dataset.bound) {
    prevBtn.dataset.bound = '1';
    prevBtn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Math.max(0, PBN_BOARD_INDEX - 1);
      updateBoardPosition();
    });
  }
  if (nextBtn && !nextBtn.dataset.bound) {
    nextBtn.dataset.bound = '1';
    nextBtn.addEventListener('click', () => {
      PBN_BOARD_INDEX = Math.min(maxIndex(), PBN_BOARD_INDEX + 1);
      updateBoardPosition();
    });
  }

  if (!track.dataset.dragBound) {
    track.dataset.dragBound = '1';
    let startX = 0;
    let dragging = false;

    const onStart = (x) => {
      dragging = true;
      startX = x;
      track.classList.add('dragging');
    };
    const onEnd = (x) => {
      if (!dragging) return;
      dragging = false;
      track.classList.remove('dragging');
      const diff = startX - x;
      if (Math.abs(diff) > 40) {
        if (diff > 0) {
          PBN_BOARD_INDEX = Math.min(maxIndex(), PBN_BOARD_INDEX + 1);
        } else {
          PBN_BOARD_INDEX = Math.max(0, PBN_BOARD_INDEX - 1);
        }
      }
      updateBoardPosition();
    };

    track.addEventListener('touchstart', (e) => onStart(e.touches[0].clientX), { passive: true });
    track.addEventListener('touchend', (e) => onEnd(e.changedTouches[0].clientX));

    track.addEventListener('mousedown', (e) => { e.preventDefault(); onStart(e.clientX); });
    window.addEventListener('mouseup', (e) => { if (dragging) onEnd(e.clientX); });
  }

  if (!window._pbnBoardResizeBound) {
    window._pbnBoardResizeBound = true;
    window.addEventListener('resize', () => {
      const newPerView = pbnBoardPerView();
      if (newPerView !== PBN_BOARD_PER_VIEW) {
        PBN_BOARD_PER_VIEW = newPerView;
        PBN_BOARD_INDEX = 0;
        renderBoardDots(total);
      }
      updateBoardPosition();
    });
  }
}

/* ---------- Peristiwa grid ---------- */
function renderPeristiwa(berita) {
  const wrap = document.getElementById('peristiwa-grid');
  if (!wrap) return;
  const sorted = berita
    .filter(a => a.category === 'Peristiwa')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 3);
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-note">Belum ada berita peristiwa.</p>';
    return;
  }
  wrap.innerHTML = sorted.map(a => `
    <div class="grid-card" data-id="${a.id}">
      <div class="thumb"${pbnImageStyle(a)}></div>
      <span class="tag ${pbnCategoryTagClass(a.category)}">${pbnEscapeHtml(a.category)}</span>
      <h3 style="margin-top:8px;">${pbnEscapeHtml(a.title)}</h3>
      <div class="meta">${pbnFormatDate(a.date).split(',')[0]}</div>
    </div>
  `).join('');
  bindClickable(wrap);
}

/* ---------- Info Loker ---------- */
function renderLoker(berita) {
  const wrap = document.getElementById('loker-grid');
  if (!wrap) return;
  const sorted = berita
    .filter(a => a.category === 'Info Loker')
    .sort((a, b) => new Date(b.date) - new Date(a.date))
    .slice(0, 6);
  if (!sorted.length) {
    wrap.innerHTML = '<p class="empty-note">Belum ada info loker. Jadilah yang pertama mengajukan lewat tombol di atas.</p>';
    return;
  }
  wrap.innerHTML = sorted.map(a => `
    <div class="grid-card" data-id="${a.id}">
      <div class="thumb"${pbnImageStyle(a)}></div>
      <span class="tag ${pbnCategoryTagClass(a.category)}">${pbnEscapeHtml(a.category)}</span>
      <h3 style="margin-top:8px;">${pbnEscapeHtml(a.title)}</h3>
      <div class="meta">${pbnEscapeHtml(a.village || '')} · ${pbnFormatDate(a.date).split(',')[0]}</div>
    </div>
  `).join('');
  bindClickable(wrap);
}

/* ---------- Slot Iklan (menampilkan banner Iklan yang sudah diterbitkan) ---------- */
/* Mengatur giliran iklan antar 2 tempat (hero & posisi lama), berganti tiap 5 menit.
   Semua pengunjung yang membuka situs pada jendela waktu yang sama akan melihat
   urutan yang sama, karena dihitung dari waktu sekarang (bukan acak). */
const PBN_AD_ROTATION_MS = 5 * 60 * 1000; // 5 menit

function pbnGetRotatedAds(list) {
  const n = list.length;
  if (n === 0) return [];
  const windowIndex = Math.floor(Date.now() / PBN_AD_ROTATION_MS);
  const shift = windowIndex % n;
  return list.map((_, i) => list[(i - shift + n) % n]);
}

function renderAdSlots(all) {
  const iklan = all
    .filter(a => a.type === 'iklan' && a.status === 'published')
    .sort((a, b) => new Date(a.date) - new Date(b.date));

  const rotated = pbnGetRotatedAds(iklan);

  renderOneAdSlot('ad-slot-hero', rotated[0] || null, 'RUANG IKLAN', 'pasang iklan bisnis lokal Anda di sini · hubungi redaksi');
  renderOneAdSlot('ad-slot-besar', rotated[1] || null, 'RUANG IKLAN — 728×90', 'pasang iklan bisnis lokal Anda di sini · hubungi redaksi');
}

function renderOneAdSlot(elId, ad, placeholderTitle, placeholderSub) {
  const el = document.getElementById(elId);
  if (!el) return;

  if (!ad) {
    if (el._pbnPromoTimer) clearInterval(el._pbnPromoTimer);
    el.classList.remove('has-ad');
    el.innerHTML = `${placeholderTitle}<span>${placeholderSub}</span>`;
    return;
  }

  el.classList.add('has-ad');

  const imgHtml = ad.image
    ? `<img src="${ad.image}" alt="${pbnEscapeHtml(ad.title)}">`
    : '';

  // =====================================================
  // NOMOR WHATSAPP
  // =====================================================

  const phone = ad.phone
    ? String(ad.phone)
        .replace(/\D/g, '')
        .replace(/^0/, '62')
    : '';

  const whatsappLink = phone
    ? `https://wa.me/${phone}`
    : '';

  // =====================================================
  // TEKS PROMOSI
  // Satu baris = satu kalimat
  // =====================================================

  const promoTexts =
    Array.isArray(ad.promoTexts) && ad.promoTexts.length
      ? ad.promoTexts
      : [
          ad.detail ||
          ad.content ||
          ad.excerpt ||
          'Hubungi kami untuk informasi lebih lanjut.'
        ];

  let promoIndex = 0;

  // =====================================================
  // TAMPILKAN IKLAN
  // =====================================================

  el.innerHTML = `
    <div
      class="pbn-ad-slider"
      data-id="${ad.id}"
      style="cursor:pointer;"
    >

      <div class="pbn-ad-image">
        ${imgHtml}
      </div>

      <div class="pbn-ad-overlay">

        <div class="pbn-ad-small">
          IKLAN PROMOSI
        </div>

        <div class="pbn-ad-title">
          ${pbnEscapeHtml(ad.title)}
        </div>

        <div class="pbn-ad-description pbn-ad-promo-text">
          ${pbnEscapeHtml(promoTexts[0])}
        </div>

        ${
          whatsappLink
            ? `
              <a
                href="${whatsappLink}"
                target="_blank"
                rel="noopener"
                class="pbn-ad-whatsapp"
                onclick="event.stopPropagation();"
              >
                💬 HUBUNGI PENJUAL
              </a>
            `
            : ''
        }

      </div>

    </div>
  `;

  // =====================================================
  // EFEK GANTI TEKS
  // SETIAP 4 DETIK
  // =====================================================

  const promoElement =
    el.querySelector('.pbn-ad-promo-text');

  if (promoElement && promoTexts.length > 1) {

    if (el._pbnPromoTimer) {
      clearInterval(el._pbnPromoTimer);
    }

    el._pbnPromoTimer = setInterval(() => {

      // Hilangkan teks lama
      promoElement.classList.remove(
        'pbn-ad-promo-show'
      );

      promoElement.classList.add(
        'pbn-ad-promo-hide'
      );

      setTimeout(() => {

        promoIndex++;

        if (promoIndex >= promoTexts.length) {
          promoIndex = 0;
        }

        // Ganti teks
        promoElement.textContent =
          promoTexts[promoIndex];

        // Munculkan teks baru
        promoElement.classList.remove(
          'pbn-ad-promo-hide'
        );

        promoElement.classList.add(
          'pbn-ad-promo-show'
        );

      }, 350);

    }, 4000);

  }

  // =====================================================
  // KLIK IKLAN
  // =====================================================

  const slider =
    el.querySelector('.pbn-ad-slider');

  if (slider) {

    slider.addEventListener('click', () => {
      openAdModal(ad);
    });

  }
}

/* ---------- Klik untuk buka modal ---------- */
function bindClickable(container) {
  container.querySelectorAll('[data-id]').forEach(el => {
    el.addEventListener('click', () => openArticle(el.getAttribute('data-id')));
  });
}

function bindNav() {
  document.querySelectorAll('a[data-category]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const cat = link.getAttribute('data-category');
      PBN_ACTIVE_CATEGORY = cat || null;
      document.querySelectorAll('nav.primary a').forEach(a => a.classList.remove('active'));
      const navMatch = document.querySelector(`nav.primary a[data-category="${cat}"]`);
      if (navMatch) navMatch.classList.add('active');
      const moreMenu = document.getElementById('nav-more-menu');
      if (moreMenu) moreMenu.classList.remove('open');
      renderAll();
      window.scrollTo({ top: 0, behavior: 'smooth' });
    });
  });

  const moreBtn = document.getElementById('nav-more-btn');
  const moreMenu = document.getElementById('nav-more-menu');
  if (moreBtn && moreMenu) {
    moreBtn.addEventListener('click', (e) => {
      e.stopPropagation();
      moreMenu.classList.toggle('open');
    });
    document.addEventListener('click', () => moreMenu.classList.remove('open'));
  }

  pbnUpdateNavOverflow();
  window.addEventListener('resize', () => {
    clearTimeout(window._pbnNavResizeTimer);
    window._pbnNavResizeTimer = setTimeout(pbnUpdateNavOverflow, 150);
  });
}

/* Memindahkan menu yang tidak muat dalam satu baris ke dropdown "Lainnya",
   supaya menu tidak pernah turun ke baris kedua. */
function pbnUpdateNavOverflow() {
  const wrap = document.querySelector('nav.primary .wrap');
  const moreWrap = document.getElementById('nav-more');
  const moreBtn = document.getElementById('nav-more-btn');
  const moreMenu = document.getElementById('nav-more-menu');
  if (!wrap || !moreWrap || !moreBtn || !moreMenu) return;

  // Jarak aman: offsetWidth dibulatkan ke piksel bulat, padahal render
  // font sesungguhnya bisa subpixel, jadi hitungan "pas muat" kadang
  // sebenarnya sudah kelebihan beberapa piksel di layar nyata. Buffer ini
  // sengaja membuat perhitungan lebih ketat, supaya item dipindah ke
  // "Lainnya" sedikit lebih awal daripada mepet dan berisiko terpotong.
  const SAFETY_BUFFER = 32;

  // Kembalikan dulu semua item dari "Lainnya" ke baris utama sebelum diukur ulang
  Array.from(moreMenu.querySelectorAll('a[data-category]')).forEach(a => {
    wrap.insertBefore(a, moreWrap);
  });
  moreWrap.style.display = 'none';

  const items = Array.from(wrap.children).filter(el => el.tagName === 'A');
  const available = wrap.clientWidth - SAFETY_BUFFER;
  const totalWidth = items.reduce((sum, a) => sum + a.offsetWidth, 0);

  if (totalWidth <= available) return; // semua muat (dengan jarak aman), tidak perlu "Lainnya"

  moreWrap.style.display = 'flex';
  const moreBtnWidth = moreBtn.offsetWidth;
  let running = 0;
  const overflowItems = [];
  items.forEach(a => {
    running += a.offsetWidth;
    if (running > available - moreBtnWidth) {
      overflowItems.push(a);
    }
  });
  overflowItems.forEach(a => moreMenu.appendChild(a));
}

/* Ikon profil di nav: tersembunyi total (lebar 0) di posisi paling atas
   halaman, muncul dengan animasi lebar setelah nav menempel sticky.
   Perhitungan ulang menu "Lainnya" dipicu oleh event transitionend —
   yaitu TEPAT saat animasi lebar ikon selesai — bukan tebakan waktu,
   supaya hasilnya konsisten di semua kondisi. */
function bindNavProfileScroll() {
  const el = document.getElementById('nav-profile-mini');
  const nav = document.querySelector('nav.primary');
  if (!el || !nav) return;

  el.classList.remove('nav-profile-mini-visible');
  let wasStuck = false;

  function update() {
    // Ambil ulang posisi nav secara langsung tiap kali dipanggil.
    const navTop = nav.getBoundingClientRect().top;
    const stuck = navTop <= 0;

    console.log('[PBN nav-profile] navTop=' + navTop.toFixed(1) + ' stuck=' + stuck + ' wasStuck=' + wasStuck);

    if (stuck === wasStuck) return;
    wasStuck = stuck;
    el.classList.toggle('nav-profile-mini-visible', stuck);
  }

  // Tunda pengecekan pertama ke frame render berikutnya, supaya layout
  // (gambar, font, ticker) sudah selesai settle dulu sebelum status awal
  // dihitung — mencegah salah baca posisi nav saat DOM baru selesai dibuat.
  requestAnimationFrame(() => {
    requestAnimationFrame(update);
  });

  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);

  el.addEventListener('transitionend', (e) => {
    if (e.propertyName !== 'width') return;
    if (typeof pbnUpdateNavOverflow === 'function') pbnUpdateNavOverflow();
  });
}

/* Tampilkan bar ticker "clone" tepat di bawah nav (tanpa jeda), hanya
   ketika ticker asli sudah sepenuhnya tergeser ke belakang nav sticky. */
function bindStickyTicker() {
  const clone = document.getElementById('ticker-sticky-clone');
  const nav = document.querySelector('nav.primary');
  if (!clone || !nav) return;

  function update() {
    const navRect = nav.getBoundingClientRect();
    clone.style.top = navRect.height + 'px';

    // Nav baru dianggap "nempel sempurna" kalau posisi atasnya sudah
    // pas 0 (benar-benar menyentuh puncak layar), bukan sekadar
    // ticker asli sudah lewat di belakangnya.
    const navStuck = navRect.top <= 0;
    clone.style.display = navStuck ? 'block' : 'none';
  }

  update();
  window.addEventListener('scroll', update, { passive: true });
  window.addEventListener('resize', update);
}

/* ---------- Modal artikel ---------- */
function bindModal() {
  const overlay = document.getElementById('modal-overlay');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeArticle();
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') closeArticle();
  });
}

function openArticle(id) {
  const article = pbnGetArticleById(id);
  if (!article) return;
  pbnIncrementViews(id);
  triggerShopeeAdOnClick();

  const currentUser = pbnCurrentUser();
  const overlay = document.getElementById('modal-overlay');
  const box = document.getElementById('modal-content');

  const allParagraphs = (article.content || article.excerpt || '')
    .split('\n')
    .filter(p => p.trim());
  const previewParagraphs = allParagraphs.slice(0, 1);
  const restParagraphs = allParagraphs.slice(1);
  const previewHtml = previewParagraphs.map(p => `<p>${pbnEscapeHtml(p)}</p>`).join('') || '<p>Isi berita belum tersedia.</p>';
  const restHtml = restParagraphs.map(p => `<p>${pbnEscapeHtml(p)}</p>`).join('');

  const liked = currentUser ? pbnHasLiked(id, currentUser.username) : false;
  const likeCount = pbnGetLikeCount(id);

  box.innerHTML = `
    <button class="modal-close" id="modal-close">×</button>
    <span class="tag ${pbnCategoryTagClass(article.category)}">${pbnEscapeHtml(article.category)}</span>
    <h1>${pbnEscapeHtml(article.title)}</h1>
    <div class="byline">
      <span>Oleh ${pbnEscapeHtml(article.author)}</span><span class="dot">·</span><span>${pbnFormatDate(article.date)}</span><span class="dot">·</span><span>${pbnEscapeHtml(article.village || '')}</span>
    </div>
    <div class="ad-slot ad-small" id="ad-slot-modal" style="margin:16px 0;"></div>
    <div class="modal-figure"${pbnImageStyle(article)}></div>
    ${pbnVideoEmbedHtml(article.videoUrl)}
    <div class="modal-body">${previewHtml}</div>
    ${restParagraphs.length ? `
      <div class="modal-body" id="modal-body-rest" style="display:none;">${restHtml}</div>
      <button type="button" class="hero-readmore" id="modal-readmore-btn" style="margin-bottom:20px;">Baca Selengkapnya →</button>
    ` : ''}

    ${article.type === 'iklan' && article.phone ? `
      <div style="margin:20px 0;">
        <a
          href="https://wa.me/${String(article.phone).replace(/\D/g, '').replace(/^0/, '62')}"
          target="_blank"
          rel="noopener"
          class="action-btn"
          style="
            display:block;
            width:100%;
            box-sizing:border-box;
            text-align:center;
            text-decoration:none;
            background:#128C7E;
            color:white;
            font-weight:bold;
            padding:14px 18px;
            border-radius:6px;
          "
        >
          📱 HUBUNGI PENJUAL VIA WHATSAPP
        </a>
      </div>
    ` : ''}

    <div class="article-actions">
      <button type="button" class="action-btn like-btn ${liked ? 'liked' : ''}" id="like-btn">♥ Suka (<span class="like-count">${likeCount}</span>)</button>
      <button type="button" class="action-btn" id="share-btn">↗ Bagikan Link</button>
    </div>

    <div class="comments-section">
      <h3 id="comments-heading">Komentar</h3>
      <div id="comments-list"></div>
      ${currentUser
        ? `<form id="comment-form-inline" class="comment-form">
             <textarea id="comment-text-inline" placeholder="Tulis komentar Anda..." required></textarea>
             <button type="submit" class="btn" style="border:none;">KIRIM KOMENTAR</button>
           </form>`
        : `<p class="comment-login-note"><a href="admin.html">Masuk atau daftar</a> untuk menulis komentar.</p>`}
    </div>
  `;
  document.getElementById('modal-close').addEventListener('click', closeArticle);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
  history.pushState(null, '', '#berita-' + id);

  const readmoreBtn = document.getElementById('modal-readmore-btn');
  if (readmoreBtn) {
    readmoreBtn.addEventListener('click', () => {
      document.getElementById('modal-body-rest').style.display = 'block';
      readmoreBtn.style.display = 'none';
    });
  }

  const modalIklanPool = getPublished()
    .filter(a => a.type === 'iklan')
    .sort((a, b) => new Date(a.date) - new Date(b.date));
  renderOneAdSlot('ad-slot-modal', pbnGetRotatedAds(modalIklanPool)[0] || null, 'RUANG IKLAN', 'pasang iklan bisnis lokal Anda di sini · hubungi redaksi');

  bindArticleActions(article);

  // refresh ranking angka baca tanpa reload seluruh halaman
  renderTerpopuler((PBN_ACTIVE_CATEGORY
    ? getPublished().filter(a => a.type === 'berita' && a.category === PBN_ACTIVE_CATEGORY)
    : getPublished().filter(a => a.type === 'berita')));
}

function closeArticle() {
  document.getElementById('modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
  history.pushState(null, '', window.location.pathname + window.location.search);
}

/* ---------- Modal khusus iklan (terpisah dari modal berita) ---------- */
function bindAdModal() {
  const overlay = document.getElementById('ad-modal-overlay');
  if (!overlay) return;
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeAdModal();
  });
}

function openAdModal(ad) {
  if (!ad) return;
  pbnIncrementViews(ad.id);
  triggerShopeeAdOnClick();

  const overlay = document.getElementById('ad-modal-overlay');
  const box = document.getElementById('ad-modal-content');
  if (!overlay || !box) return;

  const phone = ad.phone
    ? String(ad.phone).replace(/\D/g, '').replace(/^0/, '62')
    : '';
  const whatsappLink = phone ? `https://wa.me/${phone}` : '';

  const desc = ad.detail || ad.content || ad.excerpt || '';

  box.innerHTML = `
    <button class="modal-close" id="ad-modal-close">×</button>
    <span class="tag ${pbnCategoryTagClass(ad.category)}">IKLAN</span>
    <h1 style="margin-top:12px;">${pbnEscapeHtml(ad.title)}</h1>
    <div class="modal-figure"${pbnImageStyle(ad)}></div>
    <div class="modal-body"><p>${pbnEscapeHtml(desc)}</p></div>
    ${whatsappLink ? `
      <a href="${whatsappLink}" target="_blank" rel="noopener" class="action-btn"
        style="display:block;width:100%;box-sizing:border-box;text-align:center;text-decoration:none;background:#128C7E;color:white;font-weight:bold;padding:14px 18px;border-radius:6px;margin-top:16px;">
        📱 HUBUNGI PENJUAL VIA WHATSAPP
      </a>
    ` : ''}
  `;

  document.getElementById('ad-modal-close').addEventListener('click', closeAdModal);
  overlay.classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeAdModal() {
  document.getElementById('ad-modal-overlay').classList.remove('open');
  // Kalau modal berita masih terbuka di baliknya, jangan buka scroll body.
  const articleModalOpen = document.getElementById('modal-overlay').classList.contains('open');
  if (!articleModalOpen) {
    document.body.style.overflow = '';
  }
}

/* ---------- Pencarian sederhana ---------- */
function bindSearch() {
  const input = document.getElementById('search-input');
  if (!input) return;
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      const q = input.value.trim().toLowerCase();
      if (!q) return;
      const hit = getPublished().find(a => a.type === 'berita' && a.title.toLowerCase().includes(q));
      if (hit) {
        openArticle(hit.id);
      } else {
        alert('Berita tidak ditemukan untuk kata kunci: ' + input.value);
      }
    }
  });
}

/* ---------- Form ajukan pasang info loker ---------- */
function bindLokerForm() {
  const openBtn = document.getElementById('open-loker-form');
  const overlay = document.getElementById('loker-modal-overlay');
  const closeBtn = document.getElementById('loker-modal-close');
  const form = document.getElementById('loker-request-form');
  if (!openBtn || !overlay || !form) return;

  openBtn.addEventListener('click', () => {
    overlay.classList.add('open');
    document.body.style.overflow = 'hidden';
  });
  closeBtn.addEventListener('click', closeLokerForm);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeLokerForm();
  });

  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    const submitBtn = form.querySelector('button[type="submit"]');
    const imageInput = document.getElementById('loker-image');
    let image = null;
    try {
      image = await pbnReadFileAsDataURL(imageInput.files[0], 1 * 1024 * 1024);
    } catch (err) {
      showToast(err.message, true);
      return;
    }
    if (submitBtn) submitBtn.disabled = true;
    pbnAddLokerRequest({
      businessName: document.getElementById('loker-business').value.trim(),
      contactName: document.getElementById('loker-contact').value.trim(),
      phone: document.getElementById('loker-phone').value.trim(),
      detail: document.getElementById('loker-detail').value.trim(),
      image
    });
    form.reset();
    closeLokerForm();
    if (submitBtn) submitBtn.disabled = false;
    alert('Terima kasih! Permintaan pasang info loker sudah dikirim ke admin redaksi. Kami akan menghubungi Anda melalui WhatsApp untuk konfirmasi.');
  });
}

function closeLokerForm() {
  document.getElementById('loker-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* =========================================================
   Area akun: "Masuk Redaksi" (belum login) atau
   "Profil Kita" dengan dropdown Perbarui Profil / Keluar (sudah login)
   ========================================================= */
function renderAuthArea() {
  const wrap = document.getElementById('auth-area');
  if (!wrap) return;
  const user = pbnCurrentUser();

  if (!user) {
    wrap.innerHTML = `<a href="admin.html" class="redaksi-link">Masuk Redaksi</a>`;
    return;
  }

  const avatarImg = user.avatar ? `<img src="${user.avatar}" class="avatar-thumb" alt="">` : '';
  const displayName = pbnEscapeHtml(user.name || user.username);
  const dropdownAvatar = user.avatar
    ? `<img src="${user.avatar}" class="profile-dropdown-avatar" alt="">`
    : `<span class="profile-dropdown-avatar profile-dropdown-avatar-fallback">${displayName.charAt(0).toUpperCase()}</span>`;

  wrap.innerHTML = `
    <button type="button" class="redaksi-link" id="profile-toggle">${avatarImg}${displayName} ▾</button>
    <div class="profile-dropdown" id="profile-dropdown">
      <div class="profile-dropdown-header">
        ${dropdownAvatar}
        <div>
          <div class="profile-dropdown-name">${displayName}</div>
          <div class="profile-dropdown-role">${pbnEscapeHtml(pbnRoleLabel(user.role))}</div>
        </div>
      </div>
      <button type="button" id="profile-dashboard-btn"><span class="profile-dropdown-icon">◎</span>Profil Saya</button>
      <button type="button" id="profile-logout-btn"><span class="profile-dropdown-icon">↪</span>Keluar</button>
    </div>
  `;

  const toggle = document.getElementById('profile-toggle');
  const dropdown = document.getElementById('profile-dropdown');
  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  document.getElementById('profile-dashboard-btn').addEventListener('click', () => {
  dropdown.classList.remove('open');
  window.location.href = 'admin.html';
});
    document.getElementById('profile-logout-btn').addEventListener('click', () => {
    pbnLogout();
    renderAuthArea();
    renderNavProfileMini();
    showToast('Anda telah keluar.');
  });
}

/* ---------- Ikon Profil Kecil (pojok kanan nav, "Lainnya" otomatis geser ke kirinya) ---------- */
function renderNavProfileMini() {
  const wrap = document.getElementById('nav-profile-mini');
  if (!wrap) return;
  const user = pbnCurrentUser();

  if (!user) {
    wrap.innerHTML = `
      <a href="admin.html" class="nav-profile-mini-icon" aria-label="Masuk Redaksi">
        <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
          <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
          <circle cx="12" cy="7" r="4"></circle>
        </svg>
      </a>
    `;
    return;
  }

    const displayName = pbnEscapeHtml(user.name || user.username);
  const initial = displayName.charAt(0).toUpperCase();
  const personIconSvg = `
    <svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
      <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
      <circle cx="12" cy="7" r="4"></circle>
    </svg>
  `;
  const avatarSmall = user.avatar
    ? `<img src="${user.avatar}" alt="">`
    : personIconSvg;
  const avatarDropdown = user.avatar
    ? `<img src="${user.avatar}" class="profile-dropdown-avatar" alt="">`
    : `<span class="profile-dropdown-avatar profile-dropdown-avatar-fallback">${initial}</span>`;

  wrap.innerHTML = `
    <button type="button" class="nav-profile-mini-icon" id="nav-profile-mini-btn" aria-label="Profil Saya">${avatarSmall}</button>
    <div class="profile-dropdown" id="nav-profile-dropdown">
      <div class="profile-dropdown-header">
        ${avatarDropdown}
        <div>
          <div class="profile-dropdown-name">${displayName}</div>
          <div class="profile-dropdown-role">${pbnEscapeHtml(pbnRoleLabel(user.role))}</div>
        </div>
      </div>
      <button type="button" id="nav-profile-dashboard-btn"><span class="profile-dropdown-icon">◎</span>Profil Saya</button>
      <button type="button" id="nav-profile-logout-btn"><span class="profile-dropdown-icon">↪</span>Keluar</button>
    </div>
  `;

  const btn = document.getElementById('nav-profile-mini-btn');
  const dropdown = document.getElementById('nav-profile-dropdown');
  btn.addEventListener('click', (e) => {
    e.stopPropagation();
    dropdown.classList.toggle('open');
  });
  document.addEventListener('click', () => dropdown.classList.remove('open'));

  document.getElementById('nav-profile-dashboard-btn').addEventListener('click', () => {
    dropdown.classList.remove('open');
    window.location.href = 'admin.html';
  });
  document.getElementById('nav-profile-logout-btn').addEventListener('click', () => {
    pbnLogout();
    renderAuthArea();
    renderNavProfileMini();
    showToast('Anda telah keluar.');
  });
}

/* ---------- Modal Perbarui Profil ---------- */
function bindProfileModal() {
  const overlay = document.getElementById('profile-modal-overlay');
  const closeBtn = document.getElementById('profile-modal-close');
  const form = document.getElementById('profile-form');
  const avatarInput = document.getElementById('profile-avatar');
  if (!overlay || !form) return;

  closeBtn.addEventListener('click', closeProfileModal);
  overlay.addEventListener('click', (e) => {
    if (e.target === overlay) closeProfileModal();
  });

  if (avatarInput) {
    avatarInput.addEventListener('change', () => {
      const file = avatarInput.files[0];
      if (!file) return;
      if (file.size > 1024 * 1024) {
        showToast('Ukuran foto maksimal 1MB.', true);
        avatarInput.value = '';
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        PBN_PROFILE_AVATAR = reader.result;
        document.getElementById('profile-avatar-preview').src = reader.result;
      };
      reader.readAsDataURL(file);
    });
  }

  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const user = pbnCurrentUser();
    if (!user) return;
    pbnUpdateProfile(user.username, {
      name: document.getElementById('profile-name').value.trim(),
      phone: document.getElementById('profile-phone').value.trim(),
      password: document.getElementById('profile-password').value,
      avatar: PBN_PROFILE_AVATAR
    });
    closeProfileModal();
    renderAuthArea();
    showToast('Profil berhasil diperbarui.');
  });
}

function openProfileModal(user) {
  const fullUser = pbnGetUserByUsername(user.username) || user;
  PBN_PROFILE_AVATAR = fullUser.avatar || null;
  document.getElementById('profile-name').value = fullUser.name || '';
  document.getElementById('profile-phone').value = fullUser.phone || '';
  document.getElementById('profile-password').value = '';
  document.getElementById('profile-avatar').value = '';
  document.getElementById('profile-avatar-preview').src = fullUser.avatar || PBN_DEFAULT_AVATAR;
  document.getElementById('profile-modal-overlay').classList.add('open');
  document.body.style.overflow = 'hidden';
}

function closeProfileModal() {
  document.getElementById('profile-modal-overlay').classList.remove('open');
  document.body.style.overflow = '';
}

/* =========================================================
   Suka, Bagikan & Komentar pada tiap berita
   ========================================================= */
function bindArticleActions(article) {
  const user = pbnCurrentUser();

  const likeBtn = document.getElementById('like-btn');
  if (likeBtn) {
    likeBtn.addEventListener('click', () => {
      if (!user) {
        showToast('Masuk dulu untuk menyukai berita ini.', true);
        return;
      }
      const result = pbnToggleLike(article.id, user.username);
      likeBtn.classList.toggle('liked', result.liked);
      likeBtn.querySelector('.like-count').textContent = result.count;
    });
  }

  const shareBtn = document.getElementById('share-btn');
  if (shareBtn) {
    shareBtn.addEventListener('click', () => {
      const url = window.location.href;
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(url).then(
          () => showToast('Link berita disalin!'),
          () => showToast('Gagal menyalin link.', true)
        );
      } else {
        showToast('Link: ' + url);
      }
    });
  }

  renderComments(article.id);

  const commentForm = document.getElementById('comment-form-inline');
  if (commentForm) {
    commentForm.addEventListener('submit', (e) => {
      e.preventDefault();
      const text = document.getElementById('comment-text-inline').value.trim();
      if (!text) return;
      pbnAddComment({
        articleId: article.id,
        articleTitle: article.title,
        text,
        submittedBy: user.username,
        submittedByName: user.name
      });
      document.getElementById('comment-text-inline').value = '';
      renderComments(article.id);
      showToast('Komentar terkirim.');
    });
  }
}

function renderComments(articleId) {
  const list = document.getElementById('comments-list');
  if (!list) return;
  const comments = pbnGetComments()
    .filter(c => c.articleId === articleId && c.status === 'terbit')
    .sort((a, b) => new Date(b.date) - new Date(a.date));

  const heading = document.getElementById('comments-heading');
  if (heading) heading.textContent = `Komentar (${comments.length})`;

  if (!comments.length) {
    list.innerHTML = `<p class="comment-empty">Belum ada komentar. Jadilah yang pertama berkomentar.</p>`;
    return;
  }

  list.innerHTML = comments.map(c => `
    <div class="comment-item">
      <span class="comment-author">${pbnEscapeHtml(c.submittedByName || c.submittedBy)}</span>
      <span class="comment-date">${pbnRelativeTime(c.date)}</span>
      <div class="comment-text">${pbnEscapeHtml(c.text)}</div>
    </div>
  `).join('');
}

/* ---------- Deep-link berita lewat hash (#berita-<id>), dipakai untuk bagikan link ---------- */
function openArticleFromHash() {
  const hash = window.location.hash || '';
  const match = hash.match(/^#berita-(.+)$/);
  if (match) {
    const article = pbnGetArticleById(match[1]);
    if (article) openArticle(match[1]);
  }
}

/* ---------- Toast ---------- */
let pbnToastTimer = null;
function showToast(msg, isError) {
  const el = document.getElementById('toast');
  if (!el) return;
  el.textContent = msg;
  el.style.background = isError ? 'var(--rust)' : 'var(--pine)';
  el.classList.add('show');
  clearTimeout(pbnToastTimer);
  pbnToastTimer = setTimeout(() => el.classList.remove('show'), 2600);
}

/* =========================================================
   FLOATING HARGA KELAPA & EMAS
   ========================================================= */

let PBN_MARKET_HIDE_TIMER = null;
let PBN_MARKET_SCROLL_TIMER = null;

function bindMarketWidget() {

  const widget =
    document.getElementById('market-widget');

  const buttons =
    document.getElementById('market-widget-buttons');

  const card =
    document.getElementById('market-widget-card');

  const content =
    document.getElementById('market-widget-content');

  const close =
    document.getElementById('market-widget-close');

  if (!widget || !buttons || !card || !content) {
    return;
  }

  const settings = pbnGetMarketWidget();

  if (!settings.enabled) {
    widget.style.display = 'none';
    return;
  }

  const kelapaBtn =
    buttons.querySelector('[data-market="kelapa"]');

  const emasBtn =
    buttons.querySelector('[data-market="emas"]');

  if (kelapaBtn) {
    kelapaBtn.style.display =
      settings.kelapa.enabled ? 'flex' : 'none';
  }

  if (emasBtn) {
    emasBtn.style.display =
      settings.emas.enabled ? 'flex' : 'none';
  }

  if (
    !settings.kelapa.enabled &&
    !settings.emas.enabled
  ) {
    widget.style.display = 'none';
    return;
  }

  widget.style.display = 'block';

  /* =====================================================
     KLIK TOMBOL
     ===================================================== */

  buttons
    .querySelectorAll('[data-market]')
    .forEach(btn => {

      btn.onclick = () => {

        const type =
          btn.getAttribute('data-market');

        openMarketCard(type);

      };

    });

  /* =====================================================
     TOMBOL CLOSE
     ===================================================== */

  if (close) {

    close.onclick = () => {

      card.style.display = 'none';

      buttons.style.display = 'flex';

      widget.classList.remove('market-hidden');

      mulaiTimerSembunyikanWidget();

    };

  }

  /* =====================================================
     SCROLL
     
     Saat user scroll:
     - tombol muncul
     - timer di-reset
     
     Setelah berhenti:
     - tombol menghilang
     ===================================================== */

 window.addEventListener('scroll', () => {

  // Saat scroll, tombol langsung muncul
  widget.classList.remove('market-hidden');

  // Hapus timer sebelumnya
  clearTimeout(PBN_MARKET_SCROLL_TIMER);

  // Kalau kartu sedang terbuka, jangan sembunyikan
  if (card.style.display === 'block') {
    return;
  }

  // Setelah scroll berhenti, langsung sembunyikan
PBN_MARKET_SCROLL_TIMER = setTimeout(() => {
  widget.classList.add('market-hidden');
}, 2000);
}, { passive: true });


  /* =====================================================
     AWAL HALAMAN
     TAMPIL SEBENTAR → KEMUDIAN HILANG
     ===================================================== */

  widget.classList.remove('market-hidden');

  mulaiTimerSembunyikanWidget();
}


/* =========================================================
   TIMER SEMBUNYIKAN WIDGET
   ========================================================= */

function mulaiTimerSembunyikanWidget() {

  const widget =
    document.getElementById('market-widget');

  const card =
    document.getElementById('market-widget-card');

  if (!widget || !card) return;

  const settings = pbnGetMarketWidget();

  clearTimeout(PBN_MARKET_HIDE_TIMER);

  PBN_MARKET_HIDE_TIMER = setTimeout(() => {

    if (card.style.display !== 'block') {

      widget.classList.add('market-hidden');

    }

  }, (Number(settings.autoHide) || 5) * 1000);
}


function openMarketCard(type) {

  const settings = pbnGetMarketWidget();

  const card =
    document.getElementById('market-widget-card');

  const content =
    document.getElementById('market-widget-content');

  const buttons =
    document.getElementById('market-widget-buttons');

  if (!card || !content || !buttons) return;

  let data = null;

  if (type === 'kelapa') {
    data = settings.kelapa;
  }

  if (type === 'emas') {
    data = settings.emas;
  }

  if (!data || !data.enabled) {
    return;
  }


  /* =====================================================
     KLIK INFO HARGA EMAS
     ===================================================== */

 if (type === 'emas') {

  const denominations = Array.isArray(data.denominations) && data.denominations.length
    ? data.denominations
    : [{ label: 'per gram', price: 'Harga belum tersedia', buyback: '-' }];

  const update = data.updatedAt || '-';

  // Nomor / link WhatsApp penjual
  const whatsapp = data.buyLink || '';

  const denomRowsHtml = denominations.map(d => `
    <div class="market-gold-denom-row">
      <div class="market-gold-denom-label">
        ${pbnEscapeHtml(d.label || '')}
      </div>
      <div class="market-gold-denom-prices">
        <div class="market-gold-denom-sell">
          <span>Jual</span>
          <strong>${pbnEscapeHtml(d.price || '-')}</strong>
        </div>
        <div class="market-gold-denom-buyback">
          <span>Buyback</span>
          <strong>${pbnEscapeHtml(d.buyback || '-')}</strong>
        </div>
      </div>
    </div>
  `).join('');

  content.innerHTML = `

    <div class="market-gold-card">

      <div class="market-gold-header">

        <div class="market-gold-icon">
          🪙
        </div>

        <div>
          <div class="market-widget-title">
            HARGA EMAS ANTAM
          </div>

          <div class="market-gold-source">
            Logam Mulia ANTAM
          </div>
        </div>

      </div>


      <div class="market-gold-denom-list">
        ${denomRowsHtml}
      </div>


      <div class="market-widget-note">
        ${pbnEscapeHtml(
          data.note || 'Harga emas terbaru.'
        )}
      </div>


      <div class="market-gold-update">
        🕐 Update:
        ${pbnEscapeHtml(update)}
      </div>


      ${
        whatsapp
          ? `
            <a
              href="${pbnEscapeHtml(whatsapp)}"
              target="_blank"
              rel="noopener noreferrer"
              class="market-buy-btn"
            >
              📱 PESAN SEKARANG
            </a>
          `
          : ''
      }

    </div>

  `;

  buttons.style.display = 'none';
  card.style.display = 'block';

  return;
}


  /* =====================================================
     KLIK INFO HARGA KELAPA
     ===================================================== */

  content.innerHTML = `

    <h3 class="market-widget-title">
      ${pbnEscapeHtml(data.title)}
    </h3>

    <div class="market-widget-price">
      ${pbnEscapeHtml(data.price)}
    </div>

    <div class="market-widget-unit">
      ${pbnEscapeHtml(data.unit)}
    </div>

    <div class="market-widget-note">
      ${pbnEscapeHtml(data.note)}
    </div>

  `;

  buttons.style.display = 'none';
  card.style.display = 'block';
}
/* =========================================================
   FLOATING IKLAN PROMO SHOPEE
   — muncul pojok kanan atas, bergantian otomatis tiap 3 menit,
     dan tetap muncul lagi di rotasi berikutnya meski sempat
     di-minimize (klik X) oleh pengunjung.
   ========================================================= */
let PBN_SHOPEE_ITEMS = [];
let PBN_SHOPEE_INDEX = 0;
let PBN_SHOPEE_ROTATE_TIMER = null;

/* Jadwalkan pergantian ke iklan berikutnya setelah delayMs.
   Dipanggil ulang setiap kali timer berjalan (rotasi terus-menerus),
   dan di-reset (dipanggil ulang dari awal) tiap kali user menutup (klik ×). */
function scheduleShopeeRotate(delayMs) {
  clearTimeout(PBN_SHOPEE_ROTATE_TIMER);
  if (!PBN_SHOPEE_ITEMS.length) return;
  PBN_SHOPEE_ROTATE_TIMER = setTimeout(() => {
    PBN_SHOPEE_INDEX = (PBN_SHOPEE_INDEX + 1) % PBN_SHOPEE_ITEMS.length;
    showShopeeAd(PBN_SHOPEE_INDEX);
    scheduleShopeeRotate(30 * 1000);
  }, delayMs);
}

function initShopeeWidget() {
  const widget = document.getElementById('shopee-widget');
  const closeBtn = document.getElementById('shopee-widget-close');
  if (!widget || !closeBtn) return;

  const settings = pbnGetShopeeAds();
  PBN_SHOPEE_ITEMS = (settings.items || [])
    .filter(i => i.enabled !== false && i.mediaUrl)
    .sort((a, b) => (a.order || 0) - (b.order || 0));

  // Tidak ada iklan aktif / widget dimatikan superadmin -> jangan tampilkan apa pun
  if (!settings.enabled || !PBN_SHOPEE_ITEMS.length) {
    widget.style.display = 'none';
    return;
  }

  // Tampilan pertama muncul 3 detik setelah halaman dibuka
  setTimeout(() => showShopeeAd(0), 3000);

  // Ganti ke iklan berikutnya setiap 30 detik, berputar terus-menerus.
  scheduleShopeeRotate(30 * 1000);

  if (!closeBtn.dataset.bound) {
    closeBtn.dataset.bound = '1';
    closeBtn.addEventListener('click', (e) => {
      e.preventDefault();
      e.stopPropagation();
      widget.classList.remove('is-visible');
      setTimeout(() => { widget.style.display = 'none'; }, 220);

      // Reset hitungan mundur: 30 detik sejak ditutup, baru muncul iklan berikutnya.
      scheduleShopeeRotate(30 * 1000);
    });
  }
}

function showShopeeAd(index) {
  const widget = document.getElementById('shopee-widget');
  const ad = PBN_SHOPEE_ITEMS[index];
  if (!widget || !ad) return;

  PBN_SHOPEE_INDEX = index;

  const applyAndShow = () => {
    const mediaEl = document.getElementById('shopee-widget-media');
    if (ad.mediaType === 'video') {
      mediaEl.style.backgroundImage = '';
      mediaEl.innerHTML = `<video src="${ad.mediaUrl}" autoplay muted loop playsinline style="width:100%;height:100%;object-fit:cover;display:block;"></video>`;
    } else {
      mediaEl.innerHTML = '';
      mediaEl.style.backgroundImage = `url('${ad.mediaUrl}')`;
    }
    document.getElementById('shopee-widget-caption').textContent = ad.caption || '';
    document.getElementById('shopee-widget-link').href = ad.shopeeLink || '#';

    widget.style.display = 'block';
    requestAnimationFrame(() => widget.classList.add('is-visible'));
  };

  // Kalau widget sedang tampil, fade-out dulu sebelum ganti konten.
  // Kalau sedang tersembunyi (baru pertama kali / habis di-close), langsung tampilkan.
  if (widget.classList.contains('is-visible')) {
    widget.classList.remove('is-visible');
    setTimeout(applyAndShow, 220);
  } else {
    applyAndShow();
  }
}

/* Dipanggil setiap pengunjung membuka berita atau info loker (lihat openArticle()).
   Kalau widget sedang tersembunyi/di-minimize, langsung tampilkan iklan yang sedang
   berjalan. Kalau sudah tampil, dibiarkan saja supaya tidak "berkedip" berulang. */
function triggerShopeeAdOnClick() {
  if (!PBN_SHOPEE_ITEMS.length) return;
  const widget = document.getElementById('shopee-widget');
  if (widget && widget.classList.contains('is-visible')) return;
  showShopeeAd(PBN_SHOPEE_INDEX);
}
