// Klien API SIPAS. Mendukung dua backend dengan antarmuka yang sama:
//  - cloudflare  : REST /api/* di Cloudflare Worker, sesi cookie HttpOnly + header X-Requested-With (CSRF)
//  - spreadsheet : Google Apps Script Web App; semua permintaan dikirim sebagai POST text/plain
//                  {method, path, query, body, token} ke URL /exec, token sesi disimpan di perangkat
const CFG = window.SIPAS_CONFIG || {};
export const API_BASE = (CFG.apiBase || '').replace(/\/$/, '');
export const BACKEND = CFG.backend === 'spreadsheet' || /script\.google(usercontent)?\.com/.test(API_BASE) ? 'spreadsheet' : 'cloudflare';

export class ApiError extends Error {
  constructor(message, status, details) {
    super(message);
    this.status = status;
    this.details = details;
  }
}

const TOKEN_KEY = 'sipas_token';
function getToken() {
  try { return (BACKEND === 'spreadsheet' ? localStorage : sessionStorage).getItem(TOKEN_KEY); } catch (e) { return null; }
}
function setToken(t) {
  try {
    const st = BACKEND === 'spreadsheet' ? localStorage : sessionStorage;
    if (t) st.setItem(TOKEN_KEY, t); else st.removeItem(TOKEN_KEY);
  } catch (e) { /* abaikan */ }
}
export function clearToken() { setToken(null); }

function tokenHeader() {
  // hanya dipakai bila frontend & API Cloudflare berbeda domain (lihat README "Opsi B")
  const t = getToken();
  return t ? { Authorization: 'Bearer ' + t } : {};
}

function splitPath(path) {
  const [p, q] = path.split('?');
  return { path: p, query: Object.fromEntries(new URLSearchParams(q || '')) };
}

async function send(url, init, timeout) {
  if (!navigator.onLine) throw new ApiError('Tidak ada koneksi internet', 0);
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), timeout);
  try {
    return await fetch(url, { ...init, signal: ctrl.signal });
  } catch (e) {
    throw new ApiError(e.name === 'AbortError' ? 'Server terlalu lama merespons. Coba lagi.' : 'Gagal terhubung ke server. Periksa koneksi internet.', 0);
  } finally {
    clearTimeout(timer);
  }
}

function afterAuth(path, data) {
  if ((path.startsWith('/auth/login') || path.startsWith('/auth/change-password')) && data && data.token && (BACKEND === 'spreadsheet' || API_BASE)) setToken(data.token);
}

async function apiSpreadsheet(method, path, body, { raw, timeout }) {
  if (!/^https?:\/\//.test(API_BASE)) throw new ApiError('URL Aplikasi Web Apps Script belum diisi di file js/config.js (apiBase).', 0);
  const sp = splitPath(path);
  const res = await send(API_BASE, {
    method: 'POST',
    headers: { 'Content-Type': 'text/plain;charset=utf-8' },
    body: JSON.stringify({ method, path: sp.path, query: sp.query, body: body || {}, token: getToken() }),
    redirect: 'follow'
  }, timeout);
  let json;
  try { json = await res.json(); } catch (e) { throw new ApiError('Respons server tidak valid. Pastikan Apps Script sudah di-deploy sebagai Aplikasi Web (akses: Siapa saja).', res.status); }
  if (sp.path === '/auth/logout') clearToken();
  if (json.status === 401 && !sp.path.startsWith('/auth/login') && !sp.path.startsWith('/public')) {
    clearToken();
    window.dispatchEvent(new CustomEvent('sipas:unauthorized'));
  }
  if (!json.ok) throw new ApiError(json.message || 'Terjadi kesalahan', json.status, json.details);
  afterAuth(sp.path, json.data);
  if (raw) return new Response(JSON.stringify(json.data), { headers: { 'Content-Type': 'application/json', 'Content-Disposition': `attachment; filename="${json.download || 'data.json'}"` } });
  return json.data;
}

export async function api(method, path, body, { raw = false, timeout = 90000 } = {}) {
  if (BACKEND === 'spreadsheet') return apiSpreadsheet(method, path, body, { raw, timeout });
  const res = await send(API_BASE + '/api' + path, {
    method,
    credentials: 'include',
    headers: { 'Content-Type': 'application/json', 'X-Requested-With': 'SIPAS', ...tokenHeader() },
    body: body === undefined ? undefined : JSON.stringify(body)
  }, timeout);
  if (path === '/auth/logout') clearToken();
  if (raw) {
    if (!res.ok) {
      let msg = 'Permintaan gagal';
      try { msg = (await res.json()).message || msg; } catch (e) { /* abaikan */ }
      throw new ApiError(msg, res.status);
    }
    return res;
  }
  let json;
  try { json = await res.json(); } catch (e) { throw new ApiError('Respons server tidak valid', res.status); }
  if (res.status === 401 && !path.startsWith('/auth/login') && !path.startsWith('/public')) {
    window.dispatchEvent(new CustomEvent('sipas:unauthorized'));
  }
  if (!json.ok) throw new ApiError(json.message || 'Terjadi kesalahan', res.status, json.details);
  afterAuth(path, json.data);
  return json.data;
}

export const get = (p, opts) => api('GET', p, undefined, opts);
export const post = (p, b, opts) => api('POST', p, b || {}, opts);
export const put = (p, b, opts) => api('PUT', p, b || {}, opts);
export const del = (p, opts) => api('DELETE', p, undefined, opts);

export function qs(params) {
  const s = Object.entries(params).filter(([, v]) => v !== undefined && v !== null && v !== '').map(([k, v]) => encodeURIComponent(k) + '=' + encodeURIComponent(v)).join('&');
  return s ? '?' + s : '';
}
