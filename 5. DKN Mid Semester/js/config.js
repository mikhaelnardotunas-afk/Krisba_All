/**
 * KONFIGURASI APLIKASI E-RAPORT (MID SEMESTER)
 * Ubah nilai di bawah ini sesuai kebutuhan sekolah.
 */
window.APP_CONFIG = {
  // URL Aplikasi Web dari Google Apps Script (Terapkan -> Deployment baru -> Aplikasi Web).
  // Gunakan spreadsheet TERPISAH dari E-Raport Semester agar nilai tidak tercampur.
  // Kosongkan ('') untuk mencoba aplikasi dalam Mode Demo tanpa spreadsheet.
  API_URL: 'https://script.google.com/macros/s/AKfycby_fPPU8HPUpAkaQiiSsvk5vfiniNI8ZB3p7h33lEtIYZDVE4kbhqOIMLVlFiBcJwPb/exec',

  // Harus sama dengan KUNCI_API di backend/Code.gs
  API_KEY: 'krisba-mid-2026',

  // Password masuk aplikasi
  PASSWORD_GURU: 'guru123',
  PASSWORD_ADMIN: 'admin123',

  NAMA_APLIKASI: 'E-Raport Mid Semester SMP Kristen 65 Basaan',
  VERSI: '3.1.0-mid'
};
