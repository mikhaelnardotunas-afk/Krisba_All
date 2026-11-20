/* Service worker KHUSUS halaman portal (Index.html).
 * Didaftarkan dengan scope "./Index.html" sehingga HANYA halaman portal yang dikendalikan.
 * Halaman aplikasi 0–9 berada di luar lingkup ini → perilaku aplikasi dan service worker
 * milik masing-masing aplikasi tetap seperti semula.
 * Strategi: selalu ambil dari jaringan (versi terbaru); bila offline pakai salinan terakhir.
 */
const CACHE = 'portal-v1';

self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys()
    .then(ks => Promise.all(ks.filter(k => k.indexOf('portal-') === 0 && k !== CACHE).map(k => caches.delete(k))))
    .then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (url.origin !== location.origin) return;            // font Google dll. → biarkan browser
  const kunci = url.origin + url.pathname;               // abaikan ?v= / ?t=
  const versi = /\/versi\.json$/i.test(url.pathname);
  e.respondWith(
    fetch(req, { cache: 'no-store' }).then(res => {
      if (res.ok && !versi) { const c = res.clone(); caches.open(CACHE).then(x => x.put(kunci, c)); }
      return res;
    }).catch(() => caches.match(kunci).then(r => r || Response.error()))
  );
});
