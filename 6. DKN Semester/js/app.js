// Kerangka aplikasi: sidebar, header, router berbasis hash, pilihan tahun/semester, notifikasi, sesi.
import { get, post } from './api.js';
import { icon, esc, h, $, $$, toast, errorToast, applyTheme, toggleTheme, initials, timeAgo, openModal, formModal, loadingBlock } from './ui.js';

export const App = {
  boot: null,
  user: null,
  settings: {},
  semester: null,        // semester yang sedang dilihat
  active: null,          // semester aktif sekolah
  semesters: [],
  page: null,
  params: {},
  get isArchive() { return this.semester && this.active && this.semester.id !== this.active.id; },
  go(hash) { location.hash = hash; },
  async reloadBoot() {
    this.boot = await get('/bootstrap');
    this.user = this.boot.user;
    this.settings = this.boot.settings;
    this.active = this.boot.active_semester;
    this.semesters = [];
    this.boot.years.forEach(y => y.semesters.forEach(s => this.semesters.push({ ...s, year_name: y.name, year_id: y.id })));
    const saved = (() => { try { return localStorage.getItem('sipas_sem_view'); } catch (e) { return null; } })();
    const cur = this.semester && this.semesters.find(s => s.id === this.semester.id);
    this.semester = cur || this.semesters.find(s => s.id === saved) || (this.active && this.semesters.find(s => s.id === this.active.id)) || this.semesters[0] || null;
    renderYearChip();
  },
  semLabel(s) { s = s || this.semester; return s ? `${s.year_name} · ${s.name}` : '-'; },
  refresh() { route(); }
};

let cfg = null;

export async function startApp(config) {
  cfg = config;
  applyTheme();
  window.addEventListener('sipas:unauthorized', () => { location.replace('index.html?expired=1'); });
  try {
    await App.reloadBoot();
  } catch (e) {
    if (e.status === 401 || e.status === 0) { location.replace('index.html' + (e.status === 401 ? '?expired=1' : '')); return; }
    document.body.innerHTML = `<div class="empty">${icon('alert')}<b>Gagal memuat aplikasi</b>${esc(e.message)}</div>`;
    return;
  }
  if (App.user.role !== config.role) { location.replace(App.user.role === 'admin' ? 'admin.html' : 'guru.html'); return; }
  renderShell();
  window.addEventListener('hashchange', route);
  route();
  loadNotifications();
  setInterval(loadNotifications, 120000);
  window.addEventListener('offline', () => toast('Koneksi internet terputus. Perubahan nilai disimpan sementara di perangkat.', 'warning'));
  window.addEventListener('online', () => toast('Koneksi internet kembali', 'success'));
  if (App.user.must_change_password) setTimeout(() => changePassword(true), 400);
  if ('serviceWorker' in navigator && location.protocol.startsWith('http')) navigator.serviceWorker.register('sw.js').catch(() => {});
}

function menuHtml(items) {
  return items.map(it => {
    if (it.section) return `<div class="nav-section">${esc(it.section)}</div>`;
    if (it.children) {
      return `<div class="nav-group" data-group="${it.id}"><a class="nav-item" data-toggle="${it.id}">${icon(it.icon)}<span>${esc(it.label)}</span>${icon('chevron', 'icon-sm chev')}</a>
        <div class="nav-children">${it.children.map(c => `<a class="nav-item" href="#${c.id}" data-page="${c.id}">${esc(c.label)}</a>`).join('')}</div></div>`;
    }
    return `<a class="nav-item" href="#${it.id}" data-page="${it.id}">${icon(it.icon)}<span>${esc(it.label)}</span>${it.badge ? `<span class="nav-badge" data-badge="${it.id}"></span>` : ''}</a>`;
  }).join('');
}

function renderShell() {
  const s = App.settings;
  const logo = s.logo_kiri || 'assets/logo_left.png';
  const menu = typeof cfg.menu === 'function' ? cfg.menu() : cfg.menu;
  document.body.innerHTML = `
  <div class="app">
    <aside class="sidebar" aria-label="Navigasi">
      <div class="sidebar-brand"><img src="${esc(logo)}" alt="Logo"><div class="brand-text"><b>SIPAS</b><span>${esc(s.nama_sekolah || 'Sistem Penilaian Akademik')}</span></div></div>
      <nav class="nav">${menuHtml(menu)}</nav>
      <div class="sidebar-foot">Sistem Informasi Penilaian Akademik Sekolah</div>
    </aside>
    <div class="backdrop"></div>
    <div class="main">
      <header class="header">
        <button class="hdr-btn burger" id="btn-burger" aria-label="Menu">${icon('menu')}</button>
        <div class="header-title grow" id="hdr-title">SIPAS<small></small></div>
        <div class="year-chip" id="year-chip" title="Tahun pelajaran & semester yang ditampilkan"><span class="dot"></span><span class="lbl">TP</span><select id="sem-select" aria-label="Pilih semester"></select></div>
        <div style="position:relative"><button class="hdr-btn" id="btn-notif" aria-label="Notifikasi">${icon('bell')}<span class="count hidden" id="notif-count"></span></button></div>
        <button class="hdr-btn hide-sm" id="btn-theme" aria-label="Ganti tema">${icon('moon')}</button>
        <div style="position:relative"><div class="user-chip" id="user-chip" tabindex="0"><div class="avatar">${esc(initials(App.user.full_name))}</div><div class="who"><b>${esc(App.user.full_name)}</b><span>${App.user.role === 'admin' ? 'Administrator' : 'Guru'}</span></div>${icon('chevronDown', 'icon-sm')}</div></div>
      </header>
      <main class="content" id="content"></main>
    </div>
  </div>`;
  renderYearChip();
  $('#btn-burger').onclick = () => document.body.classList.toggle('nav-open');
  $('.backdrop').onclick = () => document.body.classList.remove('nav-open');
  $('#btn-theme').onclick = () => { const t = toggleTheme(); $('#btn-theme').innerHTML = icon(t === 'dark' ? 'sun' : 'moon'); };
  $('#btn-theme').innerHTML = icon(document.documentElement.getAttribute('data-theme') === 'dark' ? 'sun' : 'moon');
  $('.nav').addEventListener('click', e => {
    const t = e.target.closest('[data-toggle]');
    if (t) { t.parentElement.classList.toggle('open'); return; }
    if (e.target.closest('[data-page]')) document.body.classList.remove('nav-open');
  });
  $('#sem-select').onchange = e => {
    App.semester = App.semesters.find(s => s.id === e.target.value);
    try { localStorage.setItem('sipas_sem_view', App.semester.id); } catch (er) { /* abaikan */ }
    renderYearChip();
    route();
  };
  $('#user-chip').onclick = e => { e.stopPropagation(); userMenu(); };
  $('#btn-notif').onclick = e => { e.stopPropagation(); notifPanel(); };
  document.addEventListener('click', () => $$('.dropdown').forEach(d => d.remove()));
}

function renderYearChip() {
  const sel = document.getElementById('sem-select');
  if (!sel) return;
  sel.innerHTML = App.semesters.map(s => `<option value="${s.id}"${App.semester && s.id === App.semester.id ? ' selected' : ''}>${esc(s.year_name)} · ${esc(s.name)}${App.active && s.id === App.active.id ? ' (aktif)' : ''}</option>`).join('') || '<option>Belum ada tahun pelajaran</option>';
  document.getElementById('year-chip').classList.toggle('archive', App.isArchive);
}

function userMenu() {
  $$('.dropdown').forEach(d => d.remove());
  const dd = h(`<div class="dropdown">
    <div class="dd-item" data-a="profile">${icon('user')} Profil</div>
    <div class="dd-item" data-a="pw">${icon('key')} Ganti Password</div>
    <div class="dd-item" data-a="theme">${icon('moon')} Mode Gelap/Terang</div>
    <div class="dd-item" data-a="logout" style="color:var(--danger)">${icon('logout')} Keluar</div></div>`);
  $('#user-chip').parentElement.appendChild(dd);
  dd.onclick = async e => {
    const a = e.target.closest('[data-a]');
    if (!a) return;
    dd.remove();
    if (a.dataset.a === 'logout') logout();
    if (a.dataset.a === 'pw') changePassword(false);
    if (a.dataset.a === 'theme') toggleTheme();
    if (a.dataset.a === 'profile') App.go(App.user.role === 'admin' ? 'pengguna' : 'profil');
  };
}

export async function logout() {
  try { await post('/auth/logout'); } catch (e) { /* abaikan */ }
  try { sessionStorage.removeItem('sipas_token'); } catch (e) { /* abaikan */ }
  location.replace('index.html');
}

export function changePassword(forced) {
  formModal({
    title: forced ? 'Ganti Password Awal' : 'Ganti Password',
    intro: forced ? 'Demi keamanan, ganti password bawaan yang diberikan admin sebelum melanjutkan.' : '',
    fields: [
      { name: 'old_password', label: 'Password lama', type: 'password', required: true, full: true, autocomplete: 'current-password' },
      { name: 'new_password', label: 'Password baru', type: 'password', required: true, help: 'Minimal 8 karakter, berisi huruf dan angka', autocomplete: 'new-password' },
      { name: 'confirm', label: 'Ulangi password baru', type: 'password', required: true, autocomplete: 'new-password' }
    ],
    onSubmit: async d => {
      if (d.new_password !== d.confirm) throw new Error('Ulangi password tidak sama');
      await post('/auth/change-password', { old_password: d.old_password, new_password: d.new_password });
      App.user.must_change_password = false;
      toast('Password berhasil diganti', 'success');
    }
  });
}

// ---------- Notifikasi ----------
let notifCache = { items: [], unread: 0 };
async function loadNotifications() {
  try {
    notifCache = await get('/notifications');
    const c = document.getElementById('notif-count');
    if (c) { c.textContent = notifCache.unread > 9 ? '9+' : notifCache.unread; c.classList.toggle('hidden', !notifCache.unread); }
  } catch (e) { /* diam */ }
}

function notifPanel() {
  $$('.dropdown').forEach(d => d.remove());
  const dd = h(`<div class="dropdown notif-panel"><div class="flex between" style="padding:12px 14px;border-bottom:1px solid var(--border)"><b>Notifikasi</b><button class="btn btn-xs btn-ghost" data-all>Tandai dibaca</button></div>
    <div class="notif-list">${notifCache.items.length ? notifCache.items.map(n => `<div class="notif ${n.is_read ? '' : 'unread'}" data-id="${esc(n.id)}" data-link="${esc(n.link || '')}" data-gen="${n.generated ? 1 : 0}">
      <b>${esc(n.title)}</b>${n.body ? `<p>${esc(n.body)}</p>` : ''}<time>${timeAgo(n.created_at)}</time></div>`).join('') : '<div class="empty" style="padding:24px">Tidak ada notifikasi</div>'}</div></div>`);
  $('#btn-notif').parentElement.appendChild(dd);
  dd.addEventListener('click', async e => {
    e.stopPropagation();
    if (e.target.closest('[data-all]')) { await post('/notifications/read', { all: true }); dd.remove(); loadNotifications(); return; }
    const n = e.target.closest('.notif');
    if (!n) return;
    if (n.dataset.gen !== '1') post('/notifications/read', { ids: [n.dataset.id] }).then(loadNotifications).catch(() => {});
    dd.remove();
    if (n.dataset.link) location.hash = n.dataset.link;
  });
}

// ---------- Router ----------
function parseHash() {
  const raw = location.hash.replace(/^#/, '');
  const [id, query] = raw.split('?');
  const params = Object.fromEntries(new URLSearchParams(query || ''));
  return { id: id || cfg.home, params };
}

let routeToken = 0;
async function route() {
  const { id, params } = parseHash();
  const page = cfg.pages[id] || cfg.pages[cfg.home];
  const pid = cfg.pages[id] ? id : cfg.home;
  App.page = pid;
  App.params = params;
  $$('.nav-item[data-page]').forEach(a => a.classList.toggle('active', a.dataset.page === pid));
  const act = $(`.nav-item[data-page="${pid}"]`);
  if (act) { const g = act.closest('.nav-group'); if (g) g.classList.add('open'); }
  const title = typeof page.title === 'function' ? page.title(params) : page.title;
  $('#hdr-title').innerHTML = `${esc(title)}<small>${esc(App.settings.nama_sekolah || '')}</small>`;
  document.title = `${title} · SIPAS`;
  const el = $('#content');
  el.innerHTML = loadingBlock();
  el.style.animation = 'none'; void el.offsetWidth; el.style.animation = '';
  const token = ++routeToken;
  try {
    const node = document.createElement('div');
    if (App.isArchive && !page.noArchiveBanner) node.innerHTML = `<div class="archive-banner">${icon('archive')} Anda sedang melihat data <b>${esc(App.semLabel())}</b> (bukan semester aktif).</div>`;
    const body = document.createElement('div');
    node.appendChild(body);
    if (!App.semester && page.needsSemester !== false) {
      body.innerHTML = `<div class="card card-body">${icon('info')} Belum ada tahun pelajaran. ${App.user.role === 'admin' ? 'Buat di menu <a href="#tahun">Tahun Pelajaran</a>.' : 'Hubungi admin sekolah.'}</div>`;
    } else {
      await page.render(body, params);
    }
    if (token !== routeToken) return;
    el.innerHTML = '';
    el.appendChild(node);
  } catch (e) {
    if (token !== routeToken) return;
    console.error(e);
    el.innerHTML = `<div class="card card-body"><div class="alert error">${icon('alert')}<div><b>Gagal memuat halaman.</b><br>${esc(e.message)}</div></div><button class="btn" onclick="location.reload()">${icon('refresh')} Muat ulang</button></div>`;
  }
}

export function pageHead(title, subtitle = '', actions = '') {
  return `<div class="page-head"><div><h1>${esc(title)}</h1>${subtitle ? `<p>${subtitle}</p>` : ''}</div><div class="btn-group">${actions}</div></div>`;
}

export { loadNotifications, openModal };
