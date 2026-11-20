// Konfigurasi frontend SIPAS - pilih SALAH SATU backend.
//
// 1) Backend Google Spreadsheet (Apps Script) - seperti aplikasi E-Raport lama:
//      backend: 'spreadsheet',
//      apiBase: 'https://script.google.com/macros/s/XXXXXXXX/exec'   // URL Aplikasi Web dari Apps Script
//    Frontend dapat di-hosting di GitHub Pages, Cloudflare Pages, atau hosting statis apa pun.
//
// 2) Backend Cloudflare Workers + D1:
//      backend: 'cloudflare',
//      apiBase: ''   // kosong bila frontend dilayani Worker yang sama (disarankan)
window.SIPAS_CONFIG = {
  backend: 'spreadsheet',
  apiBase: 'https://script.google.com/macros/s/AKfycbwFnOATJBQlpg5LKQUduNpWzEf8M_tRfa7ugaJ1pFPXdk1ye8vnew11BDMrxmrRwXap/exec'
};
