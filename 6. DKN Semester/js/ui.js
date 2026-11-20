// Komponen UI bersama: ikon, toast, modal, form, konfirmasi, tabel data, utilitas format & unduhan.

// ---------- Ikon (garis, gaya konsisten) ----------
const P = {
  dashboard: '<rect x="3" y="3" width="7" height="9" rx="1"/><rect x="14" y="3" width="7" height="5" rx="1"/><rect x="14" y="12" width="7" height="9" rx="1"/><rect x="3" y="16" width="7" height="5" rx="1"/>',
  calendar: '<rect x="3" y="4" width="18" height="18" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
  database: '<ellipse cx="12" cy="5" rx="9" ry="3"/><path d="M3 5v14c0 1.7 4 3 9 3s9-1.3 9-3V5"/><path d="M3 12c0 1.7 4 3 9 3s9-1.3 9-3"/>',
  users: '<path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M23 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75"/>',
  user: '<path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>',
  student: '<path d="M22 10 12 5 2 10l10 5 10-5z"/><path d="M6 12v5c3 3 9 3 12 0v-5"/>',
  teacher: '<rect x="2" y="3" width="20" height="14" rx="2"/><path d="M8 21h8M12 17v4M7 8h6M7 12h10"/>',
  class: '<path d="M3 21h18M5 21V7l7-4 7 4v14"/><path d="M9 21v-6h6v6"/>',
  book: '<path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20"/><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z"/>',
  layers: '<path d="m12 2 10 5-10 5L2 7l10-5z"/><path d="m2 17 10 5 10-5M2 12l10 5 10-5"/>',
  sliders: '<path d="M4 21v-7M4 10V3M12 21v-9M12 8V3M20 21v-5M20 12V3M1 14h6M9 8h6M17 16h6"/>',
  percent: '<path d="M19 5 5 19"/><circle cx="6.5" cy="6.5" r="2.5"/><circle cx="17.5" cy="17.5" r="2.5"/>',
  link: '<path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/><path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>',
  award: '<circle cx="12" cy="8" r="6"/><path d="M15.48 12.89 17 22l-5-3-5 3 1.52-9.11"/>',
  monitor: '<path d="M22 12h-4l-3 9L9 3l-3 9H2"/>',
  table: '<rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M3 15h18M9 3v18M15 3v18"/>',
  file: '<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><path d="M14 2v6h6M16 13H8M16 17H8M10 9H8"/>',
  chart: '<path d="M18 20V10M12 20V4M6 20v-6"/>',
  shield: '<path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>',
  history: '<path d="M3 3v5h5"/><path d="M3.05 13A9 9 0 1 0 6 5.3L3 8"/><path d="M12 7v5l4 2"/>',
  archive: '<rect x="2" y="3" width="20" height="5" rx="1"/><path d="M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4"/>',
  settings: '<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 1 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 1 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 1 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 1 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4 12.5-12.5z"/>',
  pen: '<path d="M12 19l7-7 3 3-7 7-3-3z"/><path d="M18 13l-1.5-7.5L2 2l3.5 14.5L13 18l5-5z"/><path d="M2 2l7.59 7.59"/><circle cx="11" cy="11" r="2"/>',
  trash: '<path d="M3 6h18M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6M10 11v6M14 11v6M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  search: '<circle cx="11" cy="11" r="7"/><path d="m21 21-4.35-4.35"/>',
  bell: '<path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/>',
  menu: '<path d="M3 12h18M3 6h18M3 18h18"/>',
  x: '<path d="M18 6 6 18M6 6l12 12"/>',
  check: '<path d="M20 6 9 17l-5-5"/>',
  checkCircle: '<path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"/><path d="M22 4 12 14.01l-3-3"/>',
  alert: '<path d="M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"/><path d="M12 9v4M12 17h.01"/>',
  info: '<circle cx="12" cy="12" r="10"/><path d="M12 16v-4M12 8h.01"/>',
  lock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/>',
  unlock: '<rect x="3" y="11" width="18" height="11" rx="2"/><path d="M7 11V7a5 5 0 0 1 9.9-1"/>',
  send: '<path d="M22 2 11 13M22 2l-7 20-4-9-9-4 20-7z"/>',
  undo: '<path d="M3 7v6h6"/><path d="M21 17a9 9 0 0 0-9-9 9 9 0 0 0-6 2.3L3 13"/>',
  download: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5M12 15V3"/>',
  upload: '<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12"/>',
  printer: '<path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/>',
  save: '<path d="M19 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h11l5 5v11a2 2 0 0 1-2 2z"/><path d="M17 21v-8H7v8M7 3v5h8"/>',
  refresh: '<path d="M23 4v6h-6M1 20v-6h6"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>',
  copy: '<rect x="9" y="9" width="13" height="13" rx="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/>',
  logout: '<path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9"/>',
  key: '<path d="M21 2l-2 2m-7.61 7.61a5.5 5.5 0 1 1-7.78 7.78 5.5 5.5 0 0 1 7.78-7.78zm0 0L15.5 7.5m0 0 3 3L22 7l-3-3m-3.5 3.5L19 4"/>',
  chevron: '<path d="m9 18 6-6-6-6"/>',
  chevronLeft: '<path d="m15 18-6-6 6-6"/>',
  chevronDown: '<path d="m6 9 6 6 6-6"/>',
  eye: '<path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"/><circle cx="12" cy="12" r="3"/>',
  eyeOff: '<path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19M1 1l22 22"/>',
  moon: '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>',
  sun: '<circle cx="12" cy="12" r="5"/><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42"/>',
  filter: '<path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z"/>',
  grip: '<circle cx="9" cy="5" r="1"/><circle cx="9" cy="12" r="1"/><circle cx="9" cy="19" r="1"/><circle cx="15" cy="5" r="1"/><circle cx="15" cy="12" r="1"/><circle cx="15" cy="19" r="1"/>',
  arrowUp: '<path d="M12 19V5M5 12l7-7 7 7"/>',
  arrowDown: '<path d="M12 5v14M19 12l-7 7-7-7"/>',
  zap: '<path d="M13 2 3 14h9l-1 8 10-12h-9l1-8z"/>',
  clipboard: '<path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><rect x="8" y="2" width="8" height="4" rx="1"/>',
  hand: '<path d="M18 11V6a2 2 0 0 0-4 0v5M14 10V4a2 2 0 0 0-4 0v6M10 10.5V6a2 2 0 0 0-4 0v8"/><path d="M18 8a2 2 0 1 1 4 0v6a8 8 0 0 1-8 8h-2c-2.8 0-4.5-.86-5.99-2.34l-3.6-3.6a2 2 0 0 1 2.83-2.82L7 15"/>',
  star: '<path d="m12 2 3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"/>',
  wifiOff: '<path d="M1 1l22 22M16.72 11.06A10.94 10.94 0 0 1 19 12.55M5 12.55a10.94 10.94 0 0 1 5.17-2.39M10.71 5.05A16 16 0 0 1 22.58 9M1.42 9a15.91 15.91 0 0 1 4.7-2.88M8.53 16.11a6 6 0 0 1 6.95 0M12 20h.01"/>',
  message: '<path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/>',
  home: '<path d="m3 9 9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z"/><path d="M9 22V12h6v10"/>',
  trophy: '<path d="M6 9H4.5a2.5 2.5 0 0 1 0-5H6M18 9h1.5a2.5 2.5 0 0 0 0-5H18M4 22h16M10 14.66V17c0 .55-.47.98-.97 1.21C7.85 18.75 7 20.24 7 22M14 14.66V17c0 .55.47.98.97 1.21C16.15 18.75 17 20.24 17 22"/><path d="M18 2H6v7a6 6 0 0 0 12 0V2z"/>'
};

export function icon(name, cls = '') {
  return `<svg class="icon ${cls}" viewBox="0 0 24 24" aria-hidden="true">${P[name] || P.info}</svg>`;
}

// ---------- Format & utilitas ----------
export function esc(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}

export function fmtNum(v, d = 2) {
  if (v === null || v === undefined || v === '' || isNaN(v)) return '';
  const n = Number(v);
  if (Number.isInteger(n)) return String(n);
  return n.toLocaleString('id-ID', { minimumFractionDigits: 0, maximumFractionDigits: d });
}

export function fmtDate(iso, withTime = false) {
  if (!iso) return '-';
  const d = new Date(iso.length === 10 ? iso + 'T00:00:00' : iso);
  if (isNaN(d)) return String(iso);
  return d.toLocaleString('id-ID', withTime
    ? { day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }
    : { day: '2-digit', month: 'long', year: 'numeric' });
}

export function timeAgo(iso) {
  const s = (Date.now() - new Date(iso).getTime()) / 1000;
  if (s < 60) return 'baru saja';
  if (s < 3600) return Math.floor(s / 60) + ' menit lalu';
  if (s < 86400) return Math.floor(s / 3600) + ' jam lalu';
  if (s < 86400 * 7) return Math.floor(s / 86400) + ' hari lalu';
  return fmtDate(iso);
}

export function initials(name) {
  return String(name || '?').replace(/,.*$/, '').split(/\s+/).filter(Boolean).slice(0, 2).map(w => w[0]).join('').toUpperCase();
}

export function safeFileName(s) {
  return String(s || '').replace(/[^a-zA-Z0-9 _-]/g, '').trim().replace(/\s+/g, '_');
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { a.remove(); URL.revokeObjectURL(url); }, 4000);
}

export function debounce(fn, ms = 250) {
  let t;
  return (...args) => { clearTimeout(t); t = setTimeout(() => fn(...args), ms); };
}

export const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstElementChild;
};

export const $ = (sel, root = document) => root.querySelector(sel);
export const $$ = (sel, root = document) => Array.from(root.querySelectorAll(sel));

const scriptCache = {};
export function loadScript(src) {
  if (!scriptCache[src]) {
    scriptCache[src] = new Promise((resolve, reject) => {
      const s = document.createElement('script');
      s.src = src;
      s.onload = resolve;
      s.onerror = () => { delete scriptCache[src]; reject(new Error('Gagal memuat pustaka ' + src)); };
      document.head.appendChild(s);
    });
  }
  return scriptCache[src];
}

// ---------- Tema ----------
export function applyTheme() {
  let t = 'light';
  try { t = localStorage.getItem('sipas_theme') || 'light'; } catch (e) { /* abaikan */ }
  document.documentElement.setAttribute('data-theme', t);
  return t;
}
export function toggleTheme() {
  const t = document.documentElement.getAttribute('data-theme') === 'dark' ? 'light' : 'dark';
  document.documentElement.setAttribute('data-theme', t);
  try { localStorage.setItem('sipas_theme', t); } catch (e) { /* abaikan */ }
  return t;
}

// ---------- Toast ----------
export function toast(message, type = 'info', ms) {
  let box = document.querySelector('.toasts');
  if (!box) { box = document.createElement('div'); box.className = 'toasts'; document.body.appendChild(box); }
  const ic = { success: 'checkCircle', error: 'alert', warning: 'alert', info: 'info' }[type] || 'info';
  const el = h(`<div class="toast ${type}" role="status">${icon(ic)}<div>${esc(message)}</div></div>`);
  box.appendChild(el);
  setTimeout(() => { el.style.opacity = '0'; el.style.transform = 'translateY(6px)'; setTimeout(() => el.remove(), 300); }, ms || (type === 'error' ? 6000 : 3500));
}

export function errorToast(e) {
  toast(e && e.message ? e.message : String(e), 'error');
}

// ---------- Loading ----------
let overlay = null;
export function loading(on, msg = 'Memproses...') {
  if (on) {
    if (!overlay) { overlay = h(`<div class="overlay-loading"><div class="box"><span class="spinner"></span><span class="msg"></span></div></div>`); document.body.appendChild(overlay); }
    overlay.querySelector('.msg').textContent = msg;
    overlay.style.display = 'grid';
  } else if (overlay) overlay.style.display = 'none';
}

export async function withLoading(msg, fn) {
  loading(true, msg);
  try { return await fn(); } finally { loading(false); }
}

export async function busy(btn, fn) {
  if (!btn) return fn();
  const html = btn.innerHTML;
  btn.disabled = true;
  btn.innerHTML = '<span class="spinner"></span> ' + (btn.dataset.busy || 'Memproses...');
  try { return await fn(); } finally { btn.disabled = false; btn.innerHTML = html; }
}

export const loadingBlock = (msg = 'Memuat data...') => `<div class="loading-block"><span class="spinner"></span>${esc(msg)}</div>`;
export const emptyBlock = (title, text = '', ic = 'archive') => `<div class="empty">${icon(ic)}<b>${esc(title)}</b>${text ? `<div>${text}</div>` : ''}</div>`;

// ---------- Modal ----------
export function openModal({ title, body = '', size = '', buttons = [], onOpen, onClose, dismissible = true }) {
  const ov = h(`<div class="modal-overlay"><div class="modal ${size}" role="dialog" aria-modal="true">
    <div class="modal-head"><h3>${esc(title)}</h3><button class="x-btn" data-x aria-label="Tutup">${icon('x')}</button></div>
    <div class="modal-body"></div>
    ${buttons.length ? '<div class="modal-foot"></div>' : ''}
  </div></div>`);
  const bodyEl = ov.querySelector('.modal-body');
  if (typeof body === 'string') bodyEl.innerHTML = body; else bodyEl.appendChild(body);
  let closed = false;
  const close = (v) => {
    if (closed) return;
    closed = true;
    ov.remove();
    document.removeEventListener('keydown', onKey);
    if (onClose) onClose(v);
  };
  const onKey = e => { if (e.key === 'Escape' && dismissible) close(); };
  document.addEventListener('keydown', onKey);
  ov.querySelector('[data-x]').onclick = () => close();
  ov.addEventListener('mousedown', e => { if (e.target === ov && dismissible) close(); });
  const foot = ov.querySelector('.modal-foot');
  const api = { el: ov, body: bodyEl, close, buttons: [] };
  buttons.forEach(b => {
    const btn = h(`<button class="btn ${b.class || ''}" type="button">${b.icon ? icon(b.icon) : ''}${esc(b.label)}</button>`);
    btn.onclick = async () => {
      if (!b.onClick) return close();
      try {
        const r = await busy(btn, () => b.onClick(api));
        if (r !== false) close(r);
      } catch (e) { errorToast(e); }
    };
    foot.appendChild(btn);
    api.buttons.push(btn);
  });
  document.body.appendChild(ov);
  const first = ov.querySelector('input:not([type=hidden]):not([disabled]), select, textarea');
  if (first) setTimeout(() => first.focus(), 50);
  if (onOpen) onOpen(api);
  return api;
}

export function confirmDialog(message, { title = 'Konfirmasi', okText = 'Ya, lanjutkan', danger = false, html = false } = {}) {
  return new Promise(resolve => {
    let ok = false;
    openModal({
      title, size: 'sm', body: `<div>${html ? message : esc(message).replace(/\n/g, '<br>')}</div>`,
      buttons: [{ label: 'Batal' }, { label: okText, class: danger ? 'btn-danger' : 'btn-primary', onClick: () => { ok = true; } }],
      onClose: () => resolve(ok)
    });
  });
}

export function promptDialog(message, { title = 'Isian', value = '', placeholder = '', okText = 'Simpan', multiline = false, required = true } = {}) {
  return new Promise(resolve => {
    let out = null;
    openModal({
      title, size: 'sm',
      body: `<div class="field"><label>${esc(message)}</label>${multiline ? `<textarea id="pd-v" placeholder="${esc(placeholder)}">${esc(value)}</textarea>` : `<input id="pd-v" value="${esc(value)}" placeholder="${esc(placeholder)}">`}</div>`,
      buttons: [{ label: 'Batal' }, {
        label: okText, class: 'btn-primary', onClick: m => {
          const v = m.el.querySelector('#pd-v').value.trim();
          if (required && !v) { toast('Isian wajib diisi', 'warning'); return false; }
          out = v;
        }
      }],
      onClose: () => resolve(out)
    });
  });
}

// ---------- Form builder ----------
// field: {name, label, type: text|number|password|date|select|textarea|checkbox|switch|multiselect|html, options:[{value,label}], required, help, full, placeholder, min, max, step, attrs}
export function formHtml(fields, values = {}) {
  return `<div class="form-grid">${fields.map(f => {
    if (f.type === 'html') return `<div class="${f.full ? 'full' : ''}">${f.html}</div>`;
    if (f.type === 'section') return `<div class="full"><h4 class="mt-1 mb-0" style="color:var(--primary)">${esc(f.label)}</h4></div>`;
    const v = values[f.name] ?? f.value ?? '';
    const req = f.required ? ' required' : '';
    const id = 'f-' + f.name;
    let input;
    switch (f.type) {
      case 'select':
        input = `<select id="${id}" name="${f.name}"${req}${f.disabled ? ' disabled' : ''}>${f.placeholder !== undefined ? `<option value="">${esc(f.placeholder)}</option>` : ''}${(f.options || []).map(o => `<option value="${esc(o.value)}"${String(o.value) === String(v) ? ' selected' : ''}>${esc(o.label)}</option>`).join('')}</select>`;
        break;
      case 'multiselect': {
        const set = new Set((Array.isArray(v) ? v : []).map(String));
        input = `<div class="chips" style="max-height:180px;overflow:auto;border:1px solid var(--border);border-radius:8px;padding:8px">${(f.options || []).map(o => `<label class="check" style="min-width:45%"><input type="checkbox" name="${f.name}" value="${esc(o.value)}"${set.has(String(o.value)) ? ' checked' : ''}> ${esc(o.label)}</label>`).join('')}</div>`;
        break;
      }
      case 'textarea':
        input = `<textarea id="${id}" name="${f.name}" rows="${f.rows || 3}" placeholder="${esc(f.placeholder || '')}"${req}>${esc(v)}</textarea>`;
        break;
      case 'switch':
        return `<div class="field ${f.full ? 'full' : ''}"><label class="switch"><input type="checkbox" name="${f.name}"${v === true || v === 1 || v === '1' ? ' checked' : ''}><span class="track"></span>${esc(f.label)}</label>${f.help ? `<span class="help">${f.help}</span>` : ''}</div>`;
      case 'checkbox':
        return `<div class="field ${f.full ? 'full' : ''}"><label class="check"><input type="checkbox" name="${f.name}"${v === true || v === 1 || v === '1' ? ' checked' : ''}> ${esc(f.label)}</label>${f.help ? `<span class="help">${f.help}</span>` : ''}</div>`;
      default:
        input = `<input id="${id}" name="${f.name}" type="${f.type || 'text'}" value="${esc(v)}" placeholder="${esc(f.placeholder || '')}"${req}${f.min !== undefined ? ` min="${f.min}"` : ''}${f.max !== undefined ? ` max="${f.max}"` : ''}${f.step ? ` step="${f.step}"` : ''}${f.disabled ? ' disabled' : ''}${f.autocomplete ? ` autocomplete="${f.autocomplete}"` : ''}>`;
    }
    return `<div class="field ${f.full ? 'full' : ''}"><label for="${id}">${esc(f.label)}${f.required ? ' <span class="req">*</span>' : ''}</label>${input}${f.help ? `<span class="help">${f.help}</span>` : ''}</div>`;
  }).join('')}</div>`;
}

export function readForm(root, fields) {
  const out = {};
  for (const f of fields) {
    if (!f.name || f.type === 'html' || f.type === 'section') continue;
    if (f.type === 'multiselect') { out[f.name] = $$(`input[name="${f.name}"]:checked`, root).map(i => i.value); continue; }
    const el = root.querySelector(`[name="${f.name}"]`);
    if (!el) continue;
    if (f.type === 'checkbox' || f.type === 'switch') out[f.name] = el.checked ? 1 : 0;
    else out[f.name] = el.value.trim();
    if (f.required && (out[f.name] === '' || out[f.name] === undefined)) throw new Error(`${f.label} wajib diisi`);
    if (f.type === 'number' && out[f.name] !== '') out[f.name] = Number(out[f.name]);
  }
  return out;
}

export function formModal({ title, fields, values = {}, size = '', submitText = 'Simpan', onSubmit, intro = '' }) {
  return openModal({
    title, size,
    body: (intro ? `<div class="alert info">${icon('info')}<div>${intro}</div></div>` : '') + `<form onsubmit="return false">${formHtml(fields, values)}</form>`,
    buttons: [{ label: 'Batal' }, {
      label: submitText, class: 'btn-primary', icon: 'save', onClick: async m => {
        const data = readForm(m.body, fields);
        return onSubmit(data, m);
      }
    }],
    onOpen: m => {
      m.body.querySelector('form').addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.target.tagName === 'INPUT') { e.preventDefault(); m.buttons[m.buttons.length - 1].click(); }
      });
    }
  });
}

// ---------- Tabel data (cari, filter, urut, halaman, pilih) ----------
export class DataTable {
  constructor(el, opts) {
    this.el = typeof el === 'string' ? $(el) : el;
    this.o = Object.assign({ pageSize: 25, searchKeys: [], filters: [], selectable: false, emptyText: 'Belum ada data', rowKey: 'id', toolbar: '', compact: false }, opts);
    this.rows = this.o.rows || [];
    this.q = '';
    this.fv = {};
    this.sort = this.o.sort || null;
    this.page = 1;
    this.pageSize = this.o.pageSize;
    this.selected = new Set();
    this.build();
    this.render();
  }

  build() {
    const o = this.o;
    this.el.innerHTML = `
      <div class="toolbar">
        <div class="search">${icon('search')}<input type="search" placeholder="${esc(o.searchPlaceholder || 'Cari...')}" aria-label="Cari"></div>
        ${o.filters.map(f => `<select data-filter="${f.key}" aria-label="${esc(f.label)}"><option value="">${esc(f.label)}: Semua</option>${f.options.map(op => `<option value="${esc(op.value)}">${esc(op.label)}</option>`).join('')}</select>`).join('')}
        <div class="grow"></div>
        <div class="btn-group dt-extra">${o.toolbar}</div>
      </div>
      <div class="table-wrap"><table class="tbl ${o.compact ? 'tbl-compact' : ''}"><thead></thead><tbody></tbody></table></div>
      <div class="pager"></div>`;
    $('input[type=search]', this.el).addEventListener('input', debounce(e => { this.q = e.target.value.toLowerCase().trim(); this.page = 1; this.render(); }, 200));
    $$('[data-filter]', this.el).forEach(s => s.addEventListener('change', () => { this.fv[s.dataset.filter] = s.value; this.page = 1; this.render(); }));
    $('thead', this.el).addEventListener('click', e => {
      const th = e.target.closest('th.sortable');
      if (th) {
        const k = th.dataset.key;
        this.sort = this.sort && this.sort.key === k ? { key: k, dir: this.sort.dir === 'asc' ? 'desc' : 'asc' } : { key: k, dir: 'asc' };
        this.render();
      }
      if (e.target.matches('input[data-all]')) {
        const on = e.target.checked;
        this.filtered().forEach(r => on ? this.selected.add(r[o.rowKey]) : this.selected.delete(r[o.rowKey]));
        this.render();
        this.emitSelect();
      }
    });
    $('tbody', this.el).addEventListener('click', e => {
      const cb = e.target.closest('input[data-sel]');
      if (cb) {
        cb.checked ? this.selected.add(cb.dataset.sel) : this.selected.delete(cb.dataset.sel);
        cb.closest('tr').classList.toggle('selected', cb.checked);
        this.emitSelect();
        return;
      }
      const act = e.target.closest('[data-act]');
      if (act && o.onAction) {
        const row = this.rows.find(r => String(r[o.rowKey]) === act.closest('tr').dataset.key);
        o.onAction(act.dataset.act, row, act);
      }
    });
  }

  emitSelect() { if (this.o.onSelect) this.o.onSelect([...this.selected]); }
  setRows(rows) { this.rows = rows; const keys = new Set(rows.map(r => r[this.o.rowKey])); [...this.selected].forEach(k => { if (!keys.has(k)) this.selected.delete(k); }); this.render(); }
  clearSelection() { this.selected.clear(); this.render(); this.emitSelect(); }

  filtered() {
    const o = this.o;
    let rows = this.rows;
    for (const [k, v] of Object.entries(this.fv)) {
      if (v === '' || v === undefined) continue;
      const f = o.filters.find(x => x.key === k);
      rows = rows.filter(r => (f && f.match ? f.match(r, v) : String(r[k] ?? '') === v));
    }
    if (this.q) {
      const keys = o.searchKeys.length ? o.searchKeys : o.columns.map(c => c.key).filter(Boolean);
      rows = rows.filter(r => keys.some(k => String(typeof k === 'function' ? k(r) : (r[k] ?? '')).toLowerCase().includes(this.q)));
    }
    if (this.sort) {
      const col = o.columns.find(c => c.key === this.sort.key) || {};
      const val = col.sortValue || (r => r[this.sort.key]);
      const dir = this.sort.dir === 'asc' ? 1 : -1;
      rows = rows.slice().sort((a, b) => {
        const x = val(a), y = val(b);
        if (x === y) return 0;
        if (x === null || x === undefined || x === '') return 1;
        if (y === null || y === undefined || y === '') return -1;
        return (typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y), 'id', { numeric: true })) * dir;
      });
    }
    return rows;
  }

  render() {
    const o = this.o;
    const rows = this.filtered();
    const pages = Math.max(1, Math.ceil(rows.length / this.pageSize));
    if (this.page > pages) this.page = pages;
    const start = (this.page - 1) * this.pageSize;
    const view = rows.slice(start, start + this.pageSize);
    const allSel = rows.length && rows.every(r => this.selected.has(r[o.rowKey]));
    $('thead', this.el).innerHTML = '<tr>' + (o.selectable ? `<th style="width:36px"><input type="checkbox" data-all${allSel ? ' checked' : ''} aria-label="Pilih semua"></th>` : '') +
      o.columns.map(c => {
        const sortable = c.sortable !== false && c.key;
        const sorted = this.sort && this.sort.key === c.key;
        return `<th class="${sortable ? 'sortable' : ''} ${sorted ? 'sorted' : ''} ${c.cls || ''}" data-key="${c.key || ''}" style="${c.width ? 'width:' + c.width : ''}">${esc(c.label)}${sortable ? `<span class="sort-ind">${sorted ? (this.sort.dir === 'asc' ? '▲' : '▼') : '⇅'}</span>` : ''}</th>`;
      }).join('') + '</tr>';
    const colspan = o.columns.length + (o.selectable ? 1 : 0);
    $('tbody', this.el).innerHTML = view.length ? view.map((r, i) => {
      const key = String(r[o.rowKey]);
      const sel = this.selected.has(r[o.rowKey]);
      return `<tr data-key="${esc(key)}" class="${sel ? 'selected' : ''}">` + (o.selectable ? `<td><input type="checkbox" data-sel="${esc(key)}"${sel ? ' checked' : ''}></td>` : '') +
        o.columns.map(c => `<td class="${c.cls || ''}">${c.render ? c.render(r, start + i) : esc(r[c.key] ?? '')}</td>`).join('') + '</tr>';
    }).join('') : `<tr><td colspan="${colspan}">${emptyBlock(this.q || Object.values(this.fv).some(Boolean) ? 'Tidak ada data yang cocok' : o.emptyText)}</td></tr>`;
    const pager = $('.pager', this.el);
    const btns = [];
    const add = (p, label = p, dis = false) => btns.push(`<button data-p="${p}" class="${p === this.page && label === p ? 'active' : ''}"${dis ? ' disabled' : ''}>${label}</button>`);
    add(Math.max(1, this.page - 1), '‹', this.page === 1);
    for (let p = 1; p <= pages; p++) {
      if (p === 1 || p === pages || Math.abs(p - this.page) <= 1) add(p);
      else if (Math.abs(p - this.page) === 2) btns.push('<span>…</span>');
    }
    add(Math.min(pages, this.page + 1), '›', this.page === pages);
    pager.innerHTML = `<div>${rows.length ? `${start + 1}–${Math.min(start + this.pageSize, rows.length)} dari ${rows.length} data` : '0 data'}${this.selected.size ? ` · <b>${this.selected.size} dipilih</b>` : ''}</div>
      <div class="pages"><select aria-label="Baris per halaman">${[10, 25, 50, 100, 500].map(n => `<option${n === this.pageSize ? ' selected' : ''}>${n}</option>`).join('')}</select>${btns.join('')}</div>`;
    $$('button[data-p]', pager).forEach(b => b.onclick = () => { this.page = Number(b.dataset.p); this.render(); });
    $('select', pager).onchange = e => { this.pageSize = Number(e.target.value); this.page = 1; this.render(); };
    if (o.onRender) o.onRender(rows);
  }
}

// Badge status lembar nilai
export function statusBadge(status) {
  const m = {
    belum: ['gray', 'Belum input'], sebagian: ['yellow', 'Sebagian'], lengkap: ['blue', 'Lengkap'], draft: ['gray', 'Draf'],
    submitted: ['purple', 'Terkirim'], returned: ['red', 'Dikembalikan'], locked: ['green', 'Dikunci'], final: ['green', 'Final']
  }[status] || ['gray', status];
  return `<span class="badge ${m[0]}"><span class="dot-status"></span>${m[1]}</span>`;
}

export function progressBar(pct) {
  const cls = pct >= 100 ? 'done' : pct > 0 ? '' : 'warn';
  return `<div class="progress-row"><div class="progress grow ${cls}"><div style="width:${Math.min(100, pct)}%"></div></div><span class="pct">${fmtNum(pct, 1)}%</span></div>`;
}

export function selectOptions(list, valueKey, labelKey, selected, placeholder) {
  return (placeholder !== undefined ? `<option value="">${esc(placeholder)}</option>` : '') +
    list.map(x => `<option value="${esc(x[valueKey])}"${String(x[valueKey]) === String(selected) ? ' selected' : ''}>${esc(typeof labelKey === 'function' ? labelKey(x) : x[labelKey])}</option>`).join('');
}

export function copyText(text) {
  if (navigator.clipboard) return navigator.clipboard.writeText(text).then(() => toast('Teks disalin', 'success'));
  const ta = document.createElement('textarea');
  ta.value = text;
  document.body.appendChild(ta);
  ta.select();
  document.execCommand('copy');
  ta.remove();
  toast('Teks disalin', 'success');
  return Promise.resolve();
}
