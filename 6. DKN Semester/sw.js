// Service worker: menyimpan file aplikasi (bukan data API) agar halaman tetap terbuka saat sinyal lemah.
// Data nilai yang belum terkirim disimpan sementara di localStorage oleh halaman input nilai.
const CACHE = 'sipas-v1';
const CORE = ['index.html', 'admin.html', 'guru.html', 'cek-nilai.html', 'css/app.css', 'css/print.css', 'js/config.js', 'js/api.js', 'js/ui.js', 'js/app.js',
  'js/shared/describe.js', 'js/shared/grid.js', 'js/shared/rapor.js', 'js/shared/xlsx.js', 'js/shared/print.js', 'assets/logo_left.png', 'assets/logo_right.png'];

self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(CORE).catch(() => {})).then(() => self.skipWaiting()));
});

self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method !== 'GET' || url.origin !== location.origin || url.pathname.startsWith('/api/')) return;
  // jaringan dulu, cadangan dari cache
  e.respondWith(fetch(e.request).then(res => {
    if (res.ok) { const copy = res.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return res;
  }).catch(() => caches.match(e.request)));
});
