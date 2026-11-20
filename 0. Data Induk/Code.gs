/**
 * =============================================================================
 *  DATA INDUK SEKOLAH — SMP KRISTEN BASAAN                        Server v1.0.0
 *  Backend Google Apps Script: SATU sumber data siswa & guru untuk semua aplikasi.
 * =============================================================================
 *  Cara kerja singkat
 *   - Siswa, guru, dan kelas dikelola di spreadsheet ini (lewat aplikasi web
 *     0. Data Induk/index.html atau langsung di sheet).
 *   - Saat "Sinkronkan", server ini membuka spreadsheet tiap aplikasi (daftarnya di
 *     sheet TARGET) dan menyesuaikan sheet siswa/guru di sana: menambah, mengubah,
 *     menghapus/menonaktifkan — dengan format kolom masing-masing aplikasi.
 *   - Yang ditulis HANYA kolom identitas (nama, NIS, NISN, kelas, JK, dst.). Data
 *     milik aplikasi (absensi, nilai, data wajah, pelanggaran, password akun) tidak
 *     disentuh. Kode aplikasi lain TIDAK perlu diubah.
 *
 *  PEMASANGAN (lengkapnya di PANDUAN.md)
 *   1. Buat Google Spreadsheet baru, beri nama "DATA INDUK SEKOLAH".
 *   2. Ekstensi → Apps Script → hapus isi Code.gs → tempel file ini → Simpan.
 *   3. Pilih fungsi  siapkanSheet  → Jalankan → izinkan semua akses.
 *   4. Buka spreadsheet → menu "📚 Data Induk":
 *        a. Impor data awal dari aplikasi
 *        b. Pratinjau sinkronisasi (tidak mengubah apa pun)
 *        c. Sinkronkan ke semua aplikasi
 *        d. Aktifkan sinkron otomatis
 *   5. Terapkan → Deployment baru → Aplikasi web → Jalankan sebagai: Saya →
 *      Yang memiliki akses: Siapa saja → salin URL /exec.
 *   Password login ada di sheet PENGATURAN baris PASSWORD_ADMIN (boleh diganti di
 *   sheet langsung, atau dari aplikasi: Pengaturan → Ganti Password).
 *   Setelah kode ini diubah: Terapkan → Kelola deployment → pensil → Versi baru.
 * =============================================================================
 */

var VERSI = '1.0.0';

var SH = {
  PENGATURAN: 'PENGATURAN', SISWA: 'SISWA', GURU: 'GURU', KELAS: 'KELAS',
  TARGET: 'TARGET', TAUTAN: 'TAUTAN', LOG: 'LOG', ARSIP: 'ARSIP'
};

var STATUS_SISWA = ['Aktif', 'Lulus', 'Pindah', 'Keluar', 'Nonaktif'];
var STATUS_GURU = ['Aktif', 'Nonaktif', 'Pindah', 'Pensiun'];
var AGAMA = ['Kristen', 'Katolik', 'Islam', 'Hindu', 'Buddha', 'Konghucu'];

// [field, judul kolom di sheet]
var KOLOM = {
  PENGATURAN: [['kunci', 'KUNCI'], ['nilai', 'NILAI'], ['ket', 'KETERANGAN']],
  SISWA: [['id', 'ID'], ['nis', 'NIS'], ['nisn', 'NISN'], ['nama', 'NAMA'], ['jk', 'JK'],
    ['tempatLahir', 'TEMPAT_LAHIR'], ['tanggalLahir', 'TANGGAL_LAHIR'], ['nik', 'NIK'], ['agama', 'AGAMA'],
    ['kelas', 'KELAS'], ['noAbsen', 'NO_ABSEN'], ['tahunMasuk', 'TAHUN_MASUK'], ['alamat', 'ALAMAT'],
    ['namaAyah', 'NAMA_AYAH'], ['namaIbu', 'NAMA_IBU'], ['namaWali', 'NAMA_WALI'], ['hpOrtu', 'NO_HP_ORTU'],
    ['status', 'STATUS'], ['fotoId', 'FOTO_ID'], ['fotoUrl', 'FOTO_URL'], ['catatan', 'CATATAN'],
    ['dibuat', 'DIBUAT'], ['diubah', 'DIUBAH']],
  GURU: [['id', 'ID'], ['nama', 'NAMA'], ['gelarDepan', 'GELAR_DEPAN'], ['gelarBelakang', 'GELAR_BELAKANG'],
    ['nip', 'NIP'], ['nuptk', 'NUPTK'], ['jk', 'JK'], ['tempatLahir', 'TEMPAT_LAHIR'], ['tanggalLahir', 'TANGGAL_LAHIR'],
    ['agama', 'AGAMA'], ['jabatan', 'JABATAN'], ['mapel', 'MAPEL'], ['hp', 'NO_HP'], ['email', 'EMAIL'],
    ['alamat', 'ALAMAT'], ['status', 'STATUS'], ['fotoId', 'FOTO_ID'], ['fotoUrl', 'FOTO_URL'],
    ['dibuat', 'DIBUAT'], ['diubah', 'DIUBAH']],
  KELAS: [['kelas', 'KELAS'], ['tingkat', 'TINGKAT'], ['rombel', 'ROMBEL'], ['waliId', 'WALI_KELAS_ID'],
    ['waliNama', 'WALI_KELAS_NAMA (otomatis)'], ['urut', 'URUT']],
  TARGET: [['kode', 'KODE'], ['aplikasi', 'APLIKASI'], ['jenis', 'JENIS'], ['spreadsheetId', 'SPREADSHEET_ID'],
    ['aktif', 'AKTIF'], ['siswa', 'SINKRON_SISWA'], ['guru', 'SINKRON_GURU'], ['tambah', 'TAMBAH_BARU'],
    ['hapus', 'HAPUS_DI_APLIKASI'], ['formatKelas', 'FORMAT_KELAS'], ['hurufNama', 'HURUF_NAMA'],
    ['gelar', 'NAMA_GURU_BERGELAR'], ['terakhir', 'TERAKHIR_SINKRON'], ['hasil', 'HASIL_TERAKHIR'], ['catatan', 'CATATAN']],
  TAUTAN: [['kode', 'KODE_TARGET'], ['entitas', 'JENIS'], ['idInduk', 'ID_INDUK'], ['kunci', 'KUNCI_DI_APLIKASI'], ['waktu', 'DIPERBARUI']],
  LOG: [['waktu', 'WAKTU'], ['aksi', 'AKSI'], ['detail', 'DETAIL'], ['oleh', 'OLEH']],
  ARSIP: [['waktu', 'WAKTU_HAPUS'], ['entitas', 'JENIS'], ['id', 'ID'], ['nama', 'NAMA'], ['data', 'DATA_JSON'], ['oleh', 'OLEH']]
};

var PENGATURAN_AWAL = [
  ['PASSWORD_ADMIN', 'induk2026', 'Password login aplikasi Data Induk. Boleh diganti langsung di sel ini (semua sesi login otomatis keluar).'],
  ['NAMA_SEKOLAH', 'SMP KRISTEN BASAAN', 'Nama sekolah'],
  ['ALAMAT_SEKOLAH', 'Desa Basaan Satu, Kec. Ratatotok, Kab. Minahasa Tenggara', 'Alamat sekolah'],
  ['TAHUN_PELAJARAN', '2026/2027', 'Tahun pelajaran berjalan'],
  ['SEMESTER', 'Ganjil', 'Semester berjalan'],
  ['KEPALA_SEKOLAH', '', 'Nama kepala sekolah'],
  ['NIP_KEPALA', '', 'NIP kepala sekolah'],
  ['KUNCI_API', 'krisba-induk-2026', 'Kunci baca untuk aplikasi lain (Daftar Wajah). Jika diganti, ganti juga di Daftar_Wajah.html'],
  ['SINKRON_OTOMATIS', 'YA', 'YA = setelah menyimpan data, aplikasi langsung menyinkronkan ke semua aplikasi'],
  ['INTERVAL_SINKRON_MENIT', '30', 'Jeda sinkron otomatis terjadwal (15 / 30 / 60). Aktifkan lewat menu 📚 Data Induk'],
  ['FOLDER_FOTO_ID', '', 'Folder Google Drive untuk foto (dibuat otomatis)'],
  ['GITHUB_REPO', 'NardoTuns/SMPKRISTENBASAAN2026', 'Repo GitHub berisi CSV untuk aplikasi Cetak Kartu (pemilik/nama-repo)'],
  ['GITHUB_PATH', 'MasterAbsenSiswa.CSV', 'Nama file CSV di repo GitHub'],
  ['GITHUB_BRANCH', 'main', 'Branch GitHub'],
  ['SUMBER_CSV_IMPOR', 'https://raw.githubusercontent.com/NardoTuns/SMPKRISTENBASAAN2026/main/MasterAbsenSiswa.CSV', 'Dipakai sekali saat "Impor data awal" untuk melengkapi NISN, TTL, NIK, tahun masuk']
];

// Spreadsheet aplikasi yang ditemukan di Google Drive (periksa kembali!)
var TARGET_AWAL = [
  ['ABSEN_GURU', '1. Absen Guru', 'absenGuru', '1RYjXlJIXiR5w19tNqPuFCFxsMYbdrwgMFcC5WzT46lU', 'YA', 'TIDAK', 'YA', 'YA', 'YA', '{kelas}', 'ASLI', 'TIDAK', 'Spreadsheet "ABSEN GURU" — sheet Guru. Guru yang dihapus ditandai Deleted (riwayat absen aman).'],
  ['ABSEN_SISWA', '2. Petugas Absen Siswa & 3. Absen Siswa', 'absenSiswa', '1tb_rJACgCw3F9JfcxTkHW8IcZENEqbC9GcNTX_vZsEA', 'YA', 'YA', 'TIDAK', 'YA', 'YA', '{kelas}', 'ASLI', 'TIDAK', 'Spreadsheet "SMP KR BASAAN" — sheet SISWA (dipakai bersama no 2 & 3). Hanya siswa ber-NIS.'],
  ['CETAK_KARTU', '4. Cetak Kartu (CSV GitHub)', 'githubCsv', '', 'TIDAK', 'YA', 'TIDAK', 'YA', 'YA', '{kelas}', 'ASLI', 'TIDAK', 'Menulis file CSV di GitHub yang dibaca Cetak Kartu. Aktifkan setelah token GitHub diatur.'],
  ['WAJAH', '5. Daftar Wajah & 8. Scan Wajah', 'wajah', '1P5PVrtcuitNw9DuNgIxreVrxRrLw4u4p1h4pRHGe7Gw', 'YA', 'YA', 'TIDAK', 'TIDAK', 'YA', '{kelas}', 'ASLI', 'TIDAK', 'Spreadsheet "ABSEN WAJAH" — sheet MasterAbsenSiswa hanya berisi siswa yang SUDAH daftar wajah, jadi tidak ditambah; hanya diperbarui/dihapus.'],
  ['DKN_MID', '5. DKN Mid Semester', 'dknMid', '1K6uQHdXlzF5MVeZCoHCexfbl8BV63G0XSanasstC0ww', 'YA', 'YA', 'YA', 'YA', 'YA', '{kelas}', 'KAPITAL', 'YA', 'Spreadsheet "DKN MID GANJIL 2026-2027" — sheet Siswa & Kelas (wali kelas). Ganti ID tiap semester baru.'],
  ['DKN_SEMESTER', '6. DKN Semester (SIPAS)', 'sipas', '18oNGrWNKEwNzEQGX5f-wMFVGiCPJnbcAEEQzCl2UbTk', 'YA', 'YA', 'YA', 'YA', 'YA', '{kelas}', 'KAPITAL', 'YA', 'Spreadsheet "DKN_Final_V1" — sheet students, teachers, classes, student_class_history. Siswa dihapus → status "keluar" (nilai aman).'],
  ['UJIAN', '7. Ujian PG dan Essay Online', 'ujian', '1F_kYP96bymMP6WWrSHm1yFWAEFu1NSdzuurzxPwRIfk', 'YA', 'YA', 'TIDAK', 'YA', 'YA', '{romawi}-{rombel}', 'ASLI', 'TIDAK', 'Spreadsheet "Ujian PG dan Essay New V1" — sheet USER. Siswa baru diberi username & password otomatis; password lama tidak pernah diubah.'],
  ['TATA_TERTIB', '9. Tata Tertib', 'tatib', '1PuiH4AhK4i4IAt3Qm3RobfMpCkirW8JhOQgn6lgpIo0', 'YA', 'YA', 'TIDAK', 'YA', 'YA', '{kelas}', 'ASLI', 'TIDAK', 'Spreadsheet "Catatan Kasus V2" — sheet Siswa. Siswa dihapus → Status Nonaktif (catatan pelanggaran aman).'],
  ['DKN_SEM_LAMA', 'DKN Semester format lama (cadangan)', 'dknMid', '18xoq-zLQNaCILNvX7HmY5zkhadkIOOlrWyRH8DPVD2M', 'TIDAK', 'YA', 'YA', 'YA', 'YA', '{kelas}', 'KAPITAL', 'YA', 'Spreadsheet "DKN SEM GANJIL 2026-2027" (format sama dengan DKN Mid). Aktifkan bila masih dipakai.']
];

var SHEET_PERLU = {
  absenGuru: ['Guru'], absenSiswa: ['SISWA'], wajah: ['MasterAbsenSiswa'], dknMid: ['Siswa', 'Kelas'],
  sipas: ['students', 'teachers', 'classes', 'student_class_history', 'academic_years'], ujian: ['USER'], tatib: ['Siswa'], githubCsv: []
};

var STATUS_TATIB = { Aktif: 'Aktif', Lulus: 'Lulus', Pindah: 'Pindah', Keluar: 'Dikeluarkan', Nonaktif: 'Nonaktif' };
var STATUS_SIPAS = { Aktif: 'aktif', Lulus: 'lulus', Pindah: 'pindah', Keluar: 'keluar', Nonaktif: 'keluar' };

/* =============================================================================
   PINTU MASUK WEB APP
   ============================================================================= */

function doGet(e) {
  var p = (e && e.parameter) || {};
  try {
    if (p.action === 'ping') return json_({ ok: true, aplikasi: 'Data Induk', versi: VERSI, waktu: Date.now() });
    if (p.action === 'ringkasan') return json_(ringkasanPublik_());
    if (p.action === 'siswa' || p.action === 'csv') {
      if (!s_(p.key) || s_(p.key) !== s_(pengaturan_().KUNCI_API)) return json_({ ok: false, message: 'Kunci API salah.' });
      if (p.action === 'csv') return ContentService.createTextOutput(buatCsv_('{kelas}')).setMimeType(ContentService.MimeType.CSV);
      return json_({ ok: true, data: siswaUntukAplikasi_(), serverTime: new Date().toISOString() });
    }
    return json_({ ok: true, aplikasi: 'Data Induk Sekolah', versi: VERSI, pesan: 'Server Data Induk aktif. Gunakan aplikasi untuk mengelola data.' });
  } catch (x) {
    return json_({ ok: false, message: x.message || String(x) });
  }
}

function doPost(e) {
  var req;
  try { req = JSON.parse((e && e.postData && e.postData.contents) || '{}'); } catch (x) { return json_({ ok: false, pesan: 'Format permintaan tidak valid.' }); }
  try {
    var a = s_(req.aksi);
    if (a === 'ping') return json_({ ok: true, versi: VERSI, sekolah: pengaturan_().NAMA_SEKOLAH });
    if (a === 'masuk') return json_(aksiMasuk_(req));
    cekToken_(req.token);
    var fn = API_[a];
    if (!fn) throw err_('Aksi tidak dikenal: ' + a);
    var out = fn(req) || {};
    out.ok = true;
    return json_(out);
  } catch (x) {
    return json_({ ok: false, pesan: x.message || String(x), kode: x.kode || 'ERR' });
  }
}

var API_ = {
  data: function () { return aksiData_(); },
  simpanSiswa: function (r) { return aksiSimpanOrang_(SH.SISWA, r.data); },
  simpanGuru: function (r) { return aksiSimpanOrang_(SH.GURU, r.data); },
  hapusSiswa: function (r) { return aksiHapusOrang_(SH.SISWA, r.ids); },
  hapusGuru: function (r) { return aksiHapusOrang_(SH.GURU, r.ids); },
  arsip: function (r) { return { arsip: daftarArsip_(r.jumlah) }; },
  pulihkan: function (r) { return aksiPulihkan_(r.baris); },
  imporSiswa: function (r) { return aksiImpor_(SH.SISWA, r.rows); },
  imporGuru: function (r) { return aksiImpor_(SH.GURU, r.rows); },
  massal: function (r) { return aksiMassal_(r); },
  simpanKelas: function (r) { return aksiSimpanKelas_(r.rows); },
  unggahFoto: function (r) { return aksiUnggahFoto_(r); },
  hapusFoto: function (r) { return aksiHapusFoto_(r); },
  foto: function (r) { return aksiFoto_(r); },
  gantiPassword: function (r) { return aksiGantiPassword_(r); },
  simpanPengaturan: function (r) { return aksiSimpanPengaturan_(r.data); },
  simpanTarget: function (r) { return aksiSimpanTarget_(r.kode, r.data); },
  aturGithub: function (r) { return aksiAturGithub_(r.tokenGithub); },
  aturOtomatis: function (r) { return aksiAturOtomatis_(r.aktif); },
  pratinjau: function (r) { return { hasil: [jalankanTarget_(s_(r.kode), true)] }; },
  sinkron: function (r) {
    var h = jalankanTarget_(s_(r.kode), false);
    if (r.akhir) PropertiesService.getScriptProperties().setProperty('SINKRON_AKHIR', String(Date.now()));
    return { hasil: [h] };
  },
  diagnosa: function (r) { return { hasil: diagnosa_(s_(r.kode)) }; },
  imporAwal: function (r) { return imporAwal_({ lengkapi: !!r.lengkapi }); },
  log: function (r) { return { log: bacaLog_(r.jumlah) }; }
};

/* =============================================================================
   LOGIN & TOKEN
   ============================================================================= */

function passwordAdmin_() {
  var pw = s_(pengaturan_(true).PASSWORD_ADMIN);
  if (!pw) throw err_('PASSWORD_ADMIN di sheet PENGATURAN masih kosong.');
  return pw;
}

function aksiMasuk_(req) {
  var cache = CacheService.getScriptCache();
  var gagal = Number(cache.get('gagal_login') || 0);
  if (gagal >= 10) throw err_('Terlalu banyak percobaan gagal. Coba lagi 10 menit lagi.');
  if (String(req.password || '').trim() !== passwordAdmin_()) {
    cache.put('gagal_login', String(gagal + 1), 600);
    throw err_('Password salah.');
  }
  cache.remove('gagal_login');
  log_('Login', s_(req.perangkat).slice(0, 120), 'admin');
  return { ok: true, token: buatToken_(), sekolah: pengaturan_().NAMA_SEKOLAH, versi: VERSI };
}

function rahasia_() {
  var p = PropertiesService.getScriptProperties();
  var r = p.getProperty('RAHASIA');
  if (!r) { r = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('RAHASIA', r); }
  return r;
}
function sidikPw_(pw) {
  return hex_(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, 'pw|' + pw, Utilities.Charset.UTF_8)).slice(0, 16);
}
function buatToken_() {
  var isi = Utilities.base64EncodeWebSafe(JSON.stringify({ t: Date.now(), h: sidikPw_(passwordAdmin_()) }));
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(isi, rahasia_()));
  return isi + '.' + sig;
}
function cekToken_(token) {
  var p = String(token || '').split('.');
  if (p.length !== 2) throw err_('Sesi tidak valid. Silakan login.', 'AUTH');
  var sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p[0], rahasia_()));
  if (sig !== p[1]) throw err_('Sesi tidak valid. Silakan login.', 'AUTH');
  var isi;
  try { isi = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString()); } catch (x) { throw err_('Sesi rusak. Silakan login.', 'AUTH'); }
  if (Date.now() - Number(isi.t) > 30 * 86400000) throw err_('Sesi kedaluwarsa. Silakan login ulang.', 'AUTH');
  if (isi.h !== sidikPw_(passwordAdmin_())) throw err_('Password telah diganti. Silakan login ulang.', 'AUTH');
}

function aksiGantiPassword_(req) {
  var lama = String(req.lama || '').trim(), baru = String(req.baru || '').trim();
  if (lama !== passwordAdmin_()) throw err_('Password lama salah.');
  if (baru.length < 6) throw err_('Password baru minimal 6 karakter.');
  setPengaturan_('PASSWORD_ADMIN', baru);
  log_('Ganti password', '', 'admin');
  return { token: buatToken_() };
}

/* =============================================================================
   DATA UNTUK APLIKASI DATA INDUK
   ============================================================================= */

function aksiData_() {
  var p = pengaturan_();
  var publik = {};
  Object.keys(p).forEach(function (k) { if (k !== 'PASSWORD_ADMIN') publik[k] = p[k]; });
  var props = PropertiesService.getScriptProperties();
  var adaTrigger = ScriptApp.getProjectTriggers().some(function (t) { return t.getHandlerFunction() === 'sinkronOtomatis'; });
  return {
    versi: VERSI,
    siswa: semuaSiswa_(),
    guru: semuaGuru_(),
    kelas: kelasLengkap_(),
    target: daftarTarget_().map(function (t) {
      return { kode: t.kode, aplikasi: t.aplikasi, jenis: t.jenis, spreadsheetId: t.spreadsheetId, aktif: t.aktif, siswa: t.siswa,
        guru: t.guru, tambah: t.tambah, hapus: t.hapus, formatKelas: t.formatKelas, hurufNama: t.hurufNama, gelar: t.gelar,
        terakhir: t.terakhir, hasil: t.hasil, catatan: t.catatan };
    }),
    pengaturan: publik,
    github: { adaToken: !!props.getProperty('GITHUB_TOKEN') },
    otomatis: adaTrigger,
    serverTime: new Date().toISOString()
  };
}

function semuaSiswa_() {
  return baca_(SH.SISWA).map(function (o) { o.tanggalLahir = tgl_(o.tanggalLahir); o.status = o.status || 'Aktif'; return o; });
}
function semuaGuru_() {
  return baca_(SH.GURU).map(function (o) { o.tanggalLahir = tgl_(o.tanggalLahir); o.status = o.status || 'Aktif'; return o; });
}

function ringkasanPublik_() {
  var cache = CacheService.getScriptCache();
  var c = cache.get('ringkasan');
  if (c) return JSON.parse(c);
  var p = pengaturan_();
  var siswa = semuaSiswa_().filter(function (s) { return s.status === 'Aktif'; });
  var guru = semuaGuru_().filter(function (g) { return g.status === 'Aktif'; });
  var per = {};
  siswa.forEach(function (s) { per[s.kelas] = (per[s.kelas] || 0) + 1; });
  var out = {
    ok: true, sekolah: p.NAMA_SEKOLAH, tahunPelajaran: p.TAHUN_PELAJARAN, semester: p.SEMESTER,
    siswaAktif: siswa.length,
    siswaL: siswa.filter(function (s) { return s.jk === 'L'; }).length,
    siswaP: siswa.filter(function (s) { return s.jk === 'P'; }).length,
    guruAktif: guru.length,
    jumlahKelas: Object.keys(per).length,
    perKelas: Object.keys(per).sort(urutKelas_).map(function (k) { return { kelas: k, jumlah: per[k] }; }),
    terakhirSinkron: PropertiesService.getScriptProperties().getProperty('SINKRON_AKHIR') || '',
    waktu: new Date().toISOString()
  };
  try { cache.put('ringkasan', JSON.stringify(out), 300); } catch (x) { /* abaikan */ }
  return out;
}

/** Data siswa aktif dalam bentuk yang dipakai aplikasi Daftar Wajah. */
function siswaUntukAplikasi_() {
  var tg = targetAtauNull_('WAJAH');
  var tpl = tg ? tg.formatKelas : '{kelas}';
  var km = petaKelas_();
  return urutkanSiswa_(semuaSiswa_().filter(function (s) { return s.status === 'Aktif'; })).map(function (s, i) {
    return { no: String(i + 1), nama: s.nama, jenisKelamin: s.jk, nis: s.nis, nisn: s.nisn, tempatLahir: s.tempatLahir,
      tanggalLahir: s.tanggalLahir, nik: s.nik, tahunMasuk: s.tahunMasuk, kelas: formatKelas_(s.kelas, tpl, km), foto: s.fotoUrl };
  });
}

function buatCsv_(tpl) {
  var km = petaKelas_();
  var bersih = function (v) { return s_(v).replace(/[,;\r\n"]/g, ' ').replace(/\s+/g, ' ').trim(); };
  var baris = ['NO,NAMA,JENIS KELAMIN,NIS,NISN,TEMPAT LAHIR,TANGGAL LAHIR,NIK,TAHUN MASUK,KELAS'];
  urutkanSiswa_(semuaSiswa_().filter(function (s) { return s.status === 'Aktif'; })).forEach(function (s, i) {
    baris.push([i + 1, s.nama, s.jk, s.nis, s.nisn, s.tempatLahir, s.tanggalLahir, s.nik, s.tahunMasuk, formatKelas_(s.kelas, tpl, km)].map(bersih).join(','));
  });
  return baris.join('\n') + '\n';
}

/* =============================================================================
   SIMPAN / HAPUS SISWA & GURU
   ============================================================================= */

function rapikanSiswa_(d) {
  var o = {};
  KOLOM.SISWA.forEach(function (c) { o[c[0]] = s_(d[c[0]]); });
  o.nama = o.nama.replace(/\s+/g, ' ');
  o.jk = jk_(o.jk);
  o.kelas = o.kelas.toUpperCase().replace(/\s+/g, ' ');
  o.tanggalLahir = tgl_(o.tanggalLahir);
  o.status = pilih_(o.status, STATUS_SISWA) || 'Aktif';
  o.agama = pilih_(o.agama, AGAMA) || o.agama;
  o.nis = bersihAngka_(o.nis);
  o.nisn = bersihAngka_(o.nisn);
  if (/^\d{7,9}$/.test(o.nisn)) o.nisn = ('0000000000' + o.nisn).slice(-10);
  o.nik = bersihAngka_(o.nik);
  if (/^\d{14,15}$/.test(o.nik)) o.nik = ('0000000000000000' + o.nik).slice(-16);
  o.hpOrtu = o.hpOrtu.replace(/[^\d+]/g, '');
  o.noAbsen = o.noAbsen.replace(/[^\d]/g, '');
  return o;
}

function rapikanGuru_(d) {
  var o = {};
  KOLOM.GURU.forEach(function (c) { o[c[0]] = s_(d[c[0]]); });
  o.nama = o.nama.replace(/\s+/g, ' ');
  o.jk = jk_(o.jk);
  o.tanggalLahir = tgl_(o.tanggalLahir);
  o.status = pilih_(o.status, STATUS_GURU) || 'Aktif';
  o.agama = pilih_(o.agama, AGAMA) || o.agama;
  o.nip = bersihAngka_(o.nip);
  o.nuptk = bersihAngka_(o.nuptk);
  if (o.nip === '0' || o.nip === '-') o.nip = '';
  if (o.nuptk === '0' || o.nuptk === '-') o.nuptk = '';
  o.hp = o.hp.replace(/[^\d+]/g, '');
  return o;
}

function validasi_(nama, o, semua) {
  if (!o.nama) throw err_('Nama wajib diisi.');
  if (nama === SH.SISWA) {
    if (o.status === 'Aktif' && !o.kelas) throw err_('Kelas wajib diisi untuk siswa aktif (' + o.nama + ').');
    if (o.nis && !/^[0-9A-Za-z.\-\/]+$/.test(o.nis)) throw err_('NIS tidak valid (' + o.nama + ').');
    if (o.nisn && !/^\d+$/.test(o.nisn)) throw err_('NISN hanya boleh angka (' + o.nama + ').');
  }
  semua.forEach(function (x) {
    if (x.id === o.id) return;
    if (nama === SH.SISWA) {
      if (o.nis && x.nis === o.nis) throw err_('NIS ' + o.nis + ' sudah dipakai oleh ' + x.nama + '.');
      if (o.nisn && x.nisn === o.nisn) throw err_('NISN ' + o.nisn + ' sudah dipakai oleh ' + x.nama + '.');
    } else if (o.nip && x.nip === o.nip) throw err_('NIP ' + o.nip + ' sudah dipakai oleh ' + x.nama + '.');
  });
}

function aksiSimpanOrang_(nama, data) {
  if (!data) throw err_('Data kosong.');
  return kunci_(function () {
    var semua = baca_(nama);
    var lama = data.id ? semua.filter(function (x) { return x.id === s_(data.id); })[0] : null;
    if (data.id && !lama) throw err_('Data tidak ditemukan (mungkin sudah dihapus). Muat ulang aplikasi.');
    var gabung = {};
    if (lama) KOLOM[nama].forEach(function (c) { gabung[c[0]] = lama[c[0]]; });
    Object.keys(data).forEach(function (k) { if (k !== 'fotoId' && k !== 'fotoUrl' && k !== 'dibuat' && k !== 'diubah') gabung[k] = data[k]; });
    var o = nama === SH.SISWA ? rapikanSiswa_(gabung) : rapikanGuru_(gabung);
    if (!lama) { o.id = idBaru_(nama === SH.SISWA ? 'S' : 'G', semua); o.dibuat = stamp_(); }
    o.diubah = stamp_();
    validasi_(nama, o, semua);
    if (lama) Object.defineProperty(o, '_r', { value: lama._r, writable: true, enumerable: false });
    tulis_(nama, o);
    if (nama === SH.SISWA && o.kelas) pastikanKelas_([o.kelas]);
    tandaiPerubahan_();
    log_(lama ? 'Ubah ' + jenisLabel_(nama) : 'Tambah ' + jenisLabel_(nama), o.nama + (o.kelas ? ' (' + o.kelas + ')' : ''), 'admin');
    return { data: o };
  });
}

function aksiHapusOrang_(nama, ids) {
  ids = (ids || []).map(s_).filter(Boolean);
  if (!ids.length) throw err_('Tidak ada data yang dipilih.');
  return kunci_(function () {
    var set = {}; ids.forEach(function (i) { set[i] = true; });
    var semua = baca_(nama), hapus = semua.filter(function (x) { return set[x.id]; });
    if (!hapus.length) throw err_('Data tidak ditemukan.');
    var arsip = hapus.map(function (x) {
      var d = {}; KOLOM[nama].forEach(function (c) { d[c[0]] = x[c[0]]; });
      return { waktu: stamp_(), entitas: nama, id: x.id, nama: x.nama, data: JSON.stringify(d), oleh: 'admin' };
    });
    tambahBanyak_(SH.ARSIP, arsip);
    hapusBaris_(tabel_(nama).sh, hapus.map(function (x) { return x._r; }));
    if (nama === SH.GURU) {
      var kls = baca_(SH.KELAS), ubah = false;
      kls.forEach(function (k) { if (set[k.waliId]) { k.waliId = ''; k.waliNama = ''; ubah = true; } });
      if (ubah) tulisUlang_(SH.KELAS, kls);
    }
    tandaiPerubahan_();
    log_('Hapus ' + jenisLabel_(nama), hapus.map(function (x) { return x.nama; }).join(', ').slice(0, 450), 'admin');
    return { dihapus: hapus.length };
  });
}

function daftarArsip_(n) {
  var a = baca_(SH.ARSIP);
  return a.slice(-Math.min(Number(n) || 200, 1000)).reverse().map(function (x) {
    return { baris: x._r, waktu: x.waktu, entitas: x.entitas, id: x.id, nama: x.nama };
  });
}

function aksiPulihkan_(baris) {
  return kunci_(function () {
    var a = baca_(SH.ARSIP).filter(function (x) { return x._r === Number(baris); })[0];
    if (!a) throw err_('Arsip tidak ditemukan.');
    var nama = a.entitas === SH.GURU ? SH.GURU : SH.SISWA;
    var d = JSON.parse(a.data || '{}');
    var semua = baca_(nama);
    var o = nama === SH.SISWA ? rapikanSiswa_(d) : rapikanGuru_(d);
    if (semua.some(function (x) { return x.id === o.id; })) o.id = idBaru_(nama === SH.SISWA ? 'S' : 'G', semua);
    o.diubah = stamp_();
    validasi_(nama, o, semua);
    tulis_(nama, o);
    hapusBaris_(tabel_(SH.ARSIP).sh, [a._r]);
    tandaiPerubahan_();
    log_('Pulihkan ' + jenisLabel_(nama), o.nama, 'admin');
    return { data: o };
  });
}

/** Impor dari Excel/CSV (sudah dipetakan ke nama field di aplikasi). Cocok: ID → NIS → NISN (guru: ID → NIP → nama). */
function aksiImpor_(nama, rows) {
  rows = rows || [];
  if (!rows.length) throw err_('Tidak ada baris untuk diimpor.');
  if (rows.length > 2000) throw err_('Maksimal 2000 baris sekali impor.');
  return kunci_(function () {
    var semua = baca_(nama), baru = 0, ubah = 0, gagal = [];
    var cari = function (o) {
      return semua.filter(function (x) {
        if (o.id && x.id === o.id) return true;
        if (nama === SH.SISWA) return (o.nis && x.nis === o.nis) || (o.nisn && x.nisn === o.nisn);
        return (o.nip && x.nip === o.nip) || (!o.nip && normNama_(x.nama) === normNama_(o.nama));
      })[0];
    };
    var tambahan = [], diubah = [];
    rows.forEach(function (raw, i) {
      try {
        var tmp = nama === SH.SISWA ? rapikanSiswa_(raw) : rapikanGuru_(raw);
        var ada = cari(tmp);
        var o;
        if (ada) {
          o = {}; KOLOM[nama].forEach(function (c) { o[c[0]] = ada[c[0]]; });
          Object.keys(raw).forEach(function (k) { if (s_(raw[k]) !== '' && k !== 'id' && k !== 'fotoId' && k !== 'fotoUrl') o[k] = raw[k]; });
          o = nama === SH.SISWA ? rapikanSiswa_(o) : rapikanGuru_(o);
          o.id = ada.id; o.dibuat = ada.dibuat;
        } else {
          o = tmp;
          o.id = idBaru_(nama === SH.SISWA ? 'S' : 'G', semua);
          o.dibuat = stamp_();
          if (!raw.status) o.status = 'Aktif';
        }
        o.diubah = stamp_();
        validasi_(nama, o, semua);
        if (ada) {
          Object.defineProperty(o, '_r', { value: ada._r, writable: true, enumerable: false });
          semua[semua.indexOf(ada)] = o; diubah.push(o); ubah++;
        } else { semua.push(o); tambahan.push(o); baru++; }
      } catch (x) { gagal.push('Baris ' + (i + 2) + ': ' + x.message); }
    });
    diubah.forEach(function (o) { tulis_(nama, o); });
    tambahBanyak_(nama, tambahan);
    if (nama === SH.SISWA) pastikanKelas_(semua.map(function (s) { return s.kelas; }));
    tandaiPerubahan_();
    log_('Impor ' + jenisLabel_(nama), baru + ' baru, ' + ubah + ' diperbarui, ' + gagal.length + ' gagal', 'admin');
    return { baru: baru, ubah: ubah, gagal: gagal.slice(0, 50) };
  });
}

/** Aksi massal: pindahKelas, ubahStatus, naikKelas (semua siswa aktif naik 1 tingkat; tingkat akhir → Lulus). */
function aksiMassal_(r) {
  return kunci_(function () {
    var semua = baca_(SH.SISWA), set = {};
    (r.ids || []).forEach(function (i) { set[s_(i)] = true; });
    var rencana = [];
    if (r.jenis === 'pindahKelas') {
      var k = s_(r.kelas).toUpperCase().replace(/\s+/g, ' ');
      if (!k) throw err_('Kelas tujuan wajib diisi.');
      semua.forEach(function (s) { if (set[s.id] && s.kelas !== k) rencana.push({ s: s, kelas: k, status: s.status || 'Aktif' }); });
    } else if (r.jenis === 'ubahStatus') {
      var st = pilih_(r.status, STATUS_SISWA);
      if (!st) throw err_('Status tidak valid.');
      semua.forEach(function (s) { if (set[s.id] && s.status !== st) rencana.push({ s: s, kelas: s.kelas, status: st }); });
    } else if (r.jenis === 'naikKelas') {
      var akhir = Number(r.tingkatAkhir) || 9;
      var km = petaKelas_();
      semua.forEach(function (s) {
        if ((s.status || 'Aktif') !== 'Aktif') return;
        var k = km[s.kelas.toUpperCase()] || uraiKelas_(s.kelas);
        if (!k.tingkat) return;
        if (k.tingkat >= akhir) rencana.push({ s: s, kelas: s.kelas, status: 'Lulus' });
        else {
          var tujuan = String(k.tingkat + 1) + (k.rombel || '');
          if (/^[IVX]+/i.test(s.kelas)) tujuan = keRomawi_(k.tingkat + 1) + (s.kelas.match(/[-\s]/) ? s.kelas.match(/[-\s]/)[0] : ' ') + k.rombel;
          rencana.push({ s: s, kelas: tujuan, status: 'Aktif' });
        }
      });
    } else throw err_('Jenis aksi massal tidak dikenal.');
    if (r.pratinjau) {
      return { rencana: rencana.map(function (x) { return { id: x.s.id, nama: x.s.nama, dari: x.s.kelas + ' (' + (x.s.status || 'Aktif') + ')', ke: x.kelas + ' (' + x.status + ')' }; }) };
    }
    rencana.forEach(function (x) { x.s.kelas = x.kelas; x.s.status = x.status; x.s.diubah = stamp_(); tulis_(SH.SISWA, x.s); });
    pastikanKelas_(rencana.map(function (x) { return x.kelas; }));
    tandaiPerubahan_();
    log_('Aksi massal: ' + r.jenis, rencana.length + ' siswa', 'admin');
    return { diubah: rencana.length };
  });
}

/* ------------------------------------------------------------------ KELAS */
function petaKelas_() {
  var m = {};
  baca_(SH.KELAS).forEach(function (k) {
    if (!k.kelas) return;
    var u = uraiKelas_(k.kelas);
    m[k.kelas.toUpperCase()] = { kelas: k.kelas, tingkat: Number(k.tingkat) || u.tingkat, rombel: k.rombel || u.rombel, waliId: k.waliId, urut: Number(k.urut) || 0 };
  });
  return m;
}

function kelasLengkap_() {
  var guru = {}; baca_(SH.GURU).forEach(function (g) { guru[g.id] = g; });
  var jml = {};
  baca_(SH.SISWA).forEach(function (s) { if ((s.status || 'Aktif') === 'Aktif') jml[s.kelas] = (jml[s.kelas] || 0) + 1; });
  return baca_(SH.KELAS).filter(function (k) { return k.kelas; }).map(function (k) {
    var g = guru[k.waliId];
    return { kelas: k.kelas, tingkat: k.tingkat, rombel: k.rombel, waliId: k.waliId, waliNama: g ? namaBergelar_(g) : '', urut: k.urut, jumlah: jml[k.kelas] || 0 };
  }).sort(function (a, b) { return (Number(a.urut) || 99) - (Number(b.urut) || 99) || urutKelas_(a.kelas, b.kelas); });
}

function pastikanKelas_(daftar) {
  var ada = {}, kls = baca_(SH.KELAS);
  kls.forEach(function (k) { ada[k.kelas.toUpperCase()] = true; });
  var baru = [];
  (daftar || []).forEach(function (k) {
    k = s_(k).toUpperCase();
    if (!k || ada[k]) return;
    ada[k] = true;
    var u = uraiKelas_(k);
    baru.push({ kelas: k, tingkat: u.tingkat ? String(u.tingkat) : '', rombel: u.rombel, waliId: '', waliNama: '', urut: '' });
  });
  if (baru.length) {
    tambahBanyak_(SH.KELAS, baru);
    // urutkan ulang nomor URUT bila kosong
    var semua = baca_(SH.KELAS).sort(function (a, b) { return urutKelas_(a.kelas, b.kelas); });
    var perlu = semua.some(function (k) { return !k.urut; });
    if (perlu) { semua.forEach(function (k, i) { k.urut = String(i + 1); }); tulisUlang_(SH.KELAS, semua); }
  }
}

function aksiSimpanKelas_(rows) {
  rows = rows || [];
  return kunci_(function () {
    var siswa = baca_(SH.SISWA), guru = {}, out = [], nama = {};
    baca_(SH.GURU).forEach(function (g) { guru[g.id] = g; });
    rows.forEach(function (r, i) {
      var k = s_(r.kelas).toUpperCase().replace(/\s+/g, ' ');
      if (!k) throw err_('Nama kelas baris ' + (i + 1) + ' kosong.');
      if (nama[k]) throw err_('Kelas ' + k + ' tercantum dua kali.');
      nama[k] = true;
      var u = uraiKelas_(k);
      out.push({ kelas: k, tingkat: s_(r.tingkat) || (u.tingkat ? String(u.tingkat) : ''), rombel: s_(r.rombel).toUpperCase() || u.rombel,
        waliId: guru[s_(r.waliId)] ? s_(r.waliId) : '', waliNama: guru[s_(r.waliId)] ? namaBergelar_(guru[s_(r.waliId)]) : '',
        urut: s_(r.urut) || String(i + 1), asal: s_(r.asal).toUpperCase() });
    });
    // ganti nama kelas → ikut ubah kelas siswa
    var ganti = 0;
    out.forEach(function (k) {
      if (k.asal && k.asal !== k.kelas) siswa.forEach(function (s) { if (s.kelas.toUpperCase() === k.asal) { s.kelas = k.kelas; s.diubah = stamp_(); tulis_(SH.SISWA, s); ganti++; } });
    });
    var dipakai = {};
    siswa.forEach(function (s) { if ((s.status || 'Aktif') === 'Aktif' && s.kelas) dipakai[s.kelas.toUpperCase()] = (dipakai[s.kelas.toUpperCase()] || 0) + 1; });
    Object.keys(dipakai).forEach(function (k) { if (!nama[k]) throw err_('Kelas ' + k + ' masih berisi ' + dipakai[k] + ' siswa aktif. Pindahkan siswanya dulu sebelum menghapus kelas.'); });
    tulisUlang_(SH.KELAS, out);
    tandaiPerubahan_();
    log_('Simpan kelas', out.length + ' kelas' + (ganti ? ', ' + ganti + ' siswa ikut ganti nama kelas' : ''), 'admin');
    return { kelas: kelasLengkap_() };
  });
}

/* ------------------------------------------------------------------ FOTO */
function folderFoto_() {
  var id = s_(pengaturan_().FOLDER_FOTO_ID);
  if (id) { try { return DriveApp.getFolderById(id); } catch (x) { /* buat baru */ } }
  var f = DriveApp.createFolder('FOTO DATA INDUK SEKOLAH');
  setPengaturan_('FOLDER_FOTO_ID', f.getId());
  return f;
}

function aksiUnggahFoto_(req) {
  var nama = req.entitas === 'guru' ? SH.GURU : SH.SISWA;
  var m = /^data:(image\/(?:jpeg|png|webp));base64,(.+)$/.exec(String(req.dataUrl || ''));
  if (!m) throw err_('Format foto tidak valid (gunakan JPG/PNG).');
  var bytes = Utilities.base64Decode(m[2]);
  if (bytes.length > 3 * 1024 * 1024) throw err_('Ukuran foto maksimal 3 MB.');
  return kunci_(function () {
    var rec = baca_(nama).filter(function (x) { return x.id === s_(req.id); })[0];
    if (!rec) throw err_('Data tidak ditemukan. Simpan data dulu sebelum menambah foto.');
    var folder = folderFoto_();
    var ext = m[1] === 'image/png' ? 'png' : m[1] === 'image/webp' ? 'webp' : 'jpg';
    var kode = nama === SH.SISWA ? 'SISWA_' + (rec.nis || rec.id) : 'GURU_' + (rec.nip || rec.id);
    var file = folder.createFile(Utilities.newBlob(bytes, m[1], kode + '_' + rec.nama.replace(/[^\w\s-]/g, '').replace(/\s+/g, '_') + '.' + ext));
    try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (x) { /* kebijakan domain */ }
    if (rec.fotoId) { try { DriveApp.getFileById(rec.fotoId).setTrashed(true); } catch (x) { /* abaikan */ } }
    rec.fotoId = file.getId();
    rec.fotoUrl = 'https://drive.google.com/thumbnail?id=' + rec.fotoId + '&sz=w600';
    rec.diubah = stamp_();
    tulis_(nama, rec);
    log_('Foto ' + jenisLabel_(nama), rec.nama, 'admin');
    return { fotoId: rec.fotoId, fotoUrl: rec.fotoUrl };
  });
}

function aksiHapusFoto_(req) {
  var nama = req.entitas === 'guru' ? SH.GURU : SH.SISWA;
  return kunci_(function () {
    var rec = baca_(nama).filter(function (x) { return x.id === s_(req.id); })[0];
    if (!rec) throw err_('Data tidak ditemukan.');
    if (rec.fotoId) { try { DriveApp.getFileById(rec.fotoId).setTrashed(true); } catch (x) { /* abaikan */ } }
    rec.fotoId = ''; rec.fotoUrl = ''; rec.diubah = stamp_();
    tulis_(nama, rec);
    return {};
  });
}

/** Cadangan bila gambar thumbnail Drive tidak bisa tampil (berbagi tautan diblokir). */
function aksiFoto_(req) {
  var f = DriveApp.getFileById(s_(req.id));
  var folderId = s_(pengaturan_().FOLDER_FOTO_ID), boleh = false, it = f.getParents();
  while (it.hasNext()) if (it.next().getId() === folderId) boleh = true;
  if (!boleh) throw err_('Foto tidak ditemukan di folder foto Data Induk.');
  var b = f.getBlob();
  return { dataUrl: 'data:' + b.getContentType() + ';base64,' + Utilities.base64Encode(b.getBytes()) };
}

/* ------------------------------------------------------------------ PENGATURAN & TARGET */
var KUNCI_BOLEH = ['NAMA_SEKOLAH', 'ALAMAT_SEKOLAH', 'TAHUN_PELAJARAN', 'SEMESTER', 'KEPALA_SEKOLAH', 'NIP_KEPALA', 'KUNCI_API',
  'SINKRON_OTOMATIS', 'INTERVAL_SINKRON_MENIT', 'GITHUB_REPO', 'GITHUB_PATH', 'GITHUB_BRANCH', 'SUMBER_CSV_IMPOR'];

function aksiSimpanPengaturan_(data) {
  data = data || {};
  return kunci_(function () {
    Object.keys(data).forEach(function (k) { if (KUNCI_BOLEH.indexOf(k) >= 0) setPengaturan_(k, s_(data[k])); });
    log_('Simpan pengaturan', Object.keys(data).join(', '), 'admin');
    return {};
  });
}

function aksiSimpanTarget_(kode, data) {
  data = data || {};
  return kunci_(function () {
    var list = baca_(SH.TARGET), t = list.filter(function (x) { return x.kode === s_(kode); })[0];
    if (!t) throw err_('Target ' + kode + ' tidak ditemukan.');
    var bool = ['aktif', 'siswa', 'guru', 'tambah', 'hapus', 'gelar'];
    ['spreadsheetId', 'aktif', 'siswa', 'guru', 'tambah', 'hapus', 'formatKelas', 'hurufNama', 'gelar', 'catatan'].forEach(function (f) {
      if (data[f] === undefined) return;
      t[f] = bool.indexOf(f) >= 0 ? (data[f] === true || ya_(data[f]) ? 'YA' : 'TIDAK') : s_(data[f]);
    });
    t.spreadsheetId = idDariUrl_(t.spreadsheetId);
    if (t.hurufNama !== 'KAPITAL') t.hurufNama = 'ASLI';
    tulis_(SH.TARGET, t);
    log_('Ubah target', kode, 'admin');
    return {};
  });
}

function aksiAturGithub_(token) {
  var p = PropertiesService.getScriptProperties();
  token = s_(token);
  if (token) p.setProperty('GITHUB_TOKEN', token); else p.deleteProperty('GITHUB_TOKEN');
  log_('Token GitHub', token ? 'diatur' : 'dihapus', 'admin');
  return { adaToken: !!token };
}

function aksiAturOtomatis_(aktif) {
  if (aktif) aktifkanSinkronOtomatis(true); else matikanSinkronOtomatis(true);
  return { otomatis: !!aktif };
}

/* =============================================================================
   MESIN SINKRONISASI
   ============================================================================= */

function daftarTarget_() {
  return baca_(SH.TARGET).filter(function (t) { return t.kode; }).map(function (t) {
    return { kode: t.kode, aplikasi: t.aplikasi || t.kode, jenis: t.jenis, spreadsheetId: idDariUrl_(t.spreadsheetId),
      aktif: ya_(t.aktif), siswa: ya_(t.siswa), guru: ya_(t.guru), tambah: ya_(t.tambah), hapus: ya_(t.hapus),
      formatKelas: t.formatKelas || '{kelas}', hurufNama: (t.hurufNama || 'ASLI').toUpperCase(), gelar: ya_(t.gelar),
      terakhir: t.terakhir, hasil: t.hasil, catatan: t.catatan, _r: t._r };
  });
}
function targetAtauNull_(kode) { return daftarTarget_().filter(function (t) { return t.kode === kode; })[0] || null; }

function sinkronSemua_(simulasi) {
  var out = [];
  daftarTarget_().filter(function (t) { return t.aktif; }).forEach(function (t) { out.push(jalankanTarget_(t.kode, simulasi)); });
  if (!simulasi) PropertiesService.getScriptProperties().setProperty('SINKRON_AKHIR', String(Date.now()));
  return out;
}

function jalankanTarget_(kode, simulasi) {
  var t0 = Date.now();
  var tg = targetAtauNull_(kode);
  var hasil = { kode: kode, aplikasi: tg ? tg.aplikasi : kode, ok: true, simulasi: !!simulasi, rincian: [], peringatan: [], pesan: '', durasi: 0 };
  var kerja = function () {
    if (!tg) throw err_('Target ' + kode + ' tidak ada di sheet TARGET.');
    if (!ADAPTER[tg.jenis]) throw err_('JENIS "' + tg.jenis + '" tidak dikenal.');
    var ctx = { tg: tg, simulasi: !!simulasi, hasil: hasil, tautan: Tautan_(), data: dataSinkron_(), stamp: stamp_(), now: Date.now(), iso: new Date().toISOString() };
    ctx.peringatan = function (m) { if (hasil.peringatan.length < 40) hasil.peringatan.push(m); };
    if (tg.jenis !== 'githubCsv') ctx.ss = bukaTarget_(tg);
    ADAPTER[tg.jenis](ctx);
    if (!simulasi) { ctx.tautan.simpan(); SpreadsheetApp.flush(); }
  };
  try {
    if (simulasi) kerja(); else kunci_(kerja);
  } catch (x) { hasil.ok = false; hasil.pesan = x.message || String(x); }
  hasil.durasi = Date.now() - t0;
  if (!simulasi && tg) {
    try {
      var tt = baca_(SH.TARGET).filter(function (x) { return x.kode === kode; })[0];
      if (tt) { tt.terakhir = stamp_(); tt.hasil = ringkasHasil_(hasil); tulis_(SH.TARGET, tt); }
      log_('Sinkron ' + kode, ringkasHasil_(hasil), 'sistem');
    } catch (x) { /* abaikan */ }
  }
  return hasil;
}

function ringkasHasil_(h) {
  if (!h.ok) return 'GAGAL: ' + h.pesan;
  var t = { tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0 };
  h.rincian.forEach(function (r) { Object.keys(t).forEach(function (k) { t[k] += r[k] || 0; }); });
  return 'OK — tambah ' + t.tambah + ', ubah ' + t.ubah + ', hapus/nonaktif ' + t.hapus +
    (t.lewati ? ', dilewati ' + t.lewati : '') + (t.belum ? ', tidak ditambah ' + t.belum : '') + (h.peringatan.length ? ' (' + h.peringatan.length + ' catatan)' : '');
}

function dataSinkron_() {
  if (_C.dataSinkron) return _C.dataSinkron;
  var guru = semuaGuru_();
  var byId = {}; guru.forEach(function (g) { byId[g.id] = g; });
  _C.dataSinkron = { siswa: semuaSiswa_(), guru: guru, guruById: byId, kelas: kelasLengkap_(), kelasMap: petaKelas_() };
  return _C.dataSinkron;
}

function bukaTarget_(tg) {
  if (!tg.spreadsheetId) throw err_('SPREADSHEET_ID untuk ' + tg.kode + ' belum diisi di sheet TARGET.');
  try { return SpreadsheetApp.openById(tg.spreadsheetId); } catch (x) { throw err_('Spreadsheet ' + tg.kode + ' tidak bisa dibuka (periksa ID & akses): ' + x.message); }
}

function cariSheet_(ss, nama) {
  var sh = ss.getSheetByName(nama);
  if (sh) return sh;
  var n = nama.trim().toUpperCase();
  return ss.getSheets().filter(function (s) { return s.getName().trim().toUpperCase() === n; })[0] || null;
}

/* ------------------------------------------------------------------ baca & tulis sheet aplikasi */
function muatLembar_(ss, namaSheet, alias) {
  var sh = cariSheet_(ss, namaSheet);
  if (!sh) throw err_('Sheet "' + namaSheet + '" tidak ditemukan di spreadsheet "' + ss.getName() + '". Jalankan dulu fungsi setup di aplikasi tersebut.');
  var lebar = Math.max(sh.getLastColumn(), 1), akhir = sh.getLastRow();
  var head = sh.getRange(1, 1, 1, lebar).getDisplayValues()[0];
  var kol = {}, dipakai = {};
  Object.keys(alias).forEach(function (f) {
    for (var a = 0; a < alias[f].length && kol[f] === undefined; a++) {
      for (var i = 0; i < head.length; i++) {
        if (!dipakai[i] && norm_(head[i]) === alias[f][a]) { kol[f] = i; dipakai[i] = true; break; }
      }
    }
  });
  var n = Math.max(akhir - 1, 0);
  var rng = n ? sh.getRange(2, 1, n, lebar) : null;
  var vals = rng ? rng.getValues() : [], disp = rng ? rng.getDisplayValues() : [];
  var rumus = rng ? rng.getFormulas() : [], fmt = rng ? rng.getNumberFormats() : [];
  var L = { sh: sh, nama: namaSheet, head: head, kol: kol, lebar: lebar, rumus: rumus, fmtContoh: fmt[0] || null, baris: [], baru: [], hapus: [], kotor: [] };
  for (var r = 0; r < n; r++) {
    if (!disp[r].some(function (v) { return String(v).trim() !== ''; })) continue;
    var o = {};
    Object.keys(kol).forEach(function (f) { o[f] = String(disp[r][kol[f]]).trim(); });
    L.baris.push({ i: r, r: r + 2, arr: vals[r], disp: disp[r], fmt: fmt[r], obj: o, pakai: false, kotor: null });
  }
  return L;
}

function barisBaru_(L) {
  var arr = [], disp = [], fmt = [];
  for (var c = 0; c < L.lebar; c++) {
    arr.push(''); disp.push('');
    var f = L.fmtContoh ? L.fmtContoh[c] : 'General';
    fmt.push(f === '@' ? 'General' : (f || 'General'));
  }
  return { baru: true, arr: arr, disp: disp, fmt: fmt, obj: {}, pakai: true };
}

/** list: [[field, nilai, tipe, opsional]]  tipe: t teks · k kode angka (0 di depan diabaikan) · d tanggal · n angka · b ya/tidak */
function terapkanNilai_(L, b, list) {
  var berubah = false;
  (list || []).forEach(function (x) {
    var f = x[0], v = x[1], tipe = x[2] || 't', ops = x[3];
    var c = L.kol[f];
    if (c === undefined) return;
    if (ops && (v === '' || v === null || v === undefined)) return;
    var lama = b.disp[c];
    if (samaNilai_(lama, v, tipe)) return;
    var tulis;
    if (tipe === 'n') tulis = (v === '' || v === null || v === undefined || isNaN(Number(v))) ? '' : Number(v);
    else if (tipe === 'b') tulis = !!v;
    else tulis = s_(v);
    b.arr[c] = tulis;
    b.disp[c] = tipe === 'b' ? (tulis ? 'TRUE' : 'FALSE') : String(tulis);
    if (tipe === 't' || tipe === 'k' || tipe === 'd') b.fmt[c] = '@';
    b.obj[f] = String(b.disp[c]);
    if (!b.baru) {
      if (!b.kotor) { b.kotor = {}; L.kotor.push(b); }
      b.kotor[c] = true;
    }
    berubah = true;
  });
  return berubah;
}

function samaNilai_(lama, v, tipe) {
  var a = s_(lama);
  if (tipe === 'b') return bool_(a) === !!v;
  if (tipe === 'n') {
    if (v === '' || v === null || v === undefined) return a === '';
    var na = Number(a.replace(/,/g, '.')); return !isNaN(na) && na === Number(v);
  }
  if (tipe === 'd') return tgl_(a) === tgl_(v);
  if (tipe === 'k') return a.replace(/^0+/, '') === s_(v).replace(/^0+/, '');
  return a === s_(v);
}

function tulisLembar_(L, simulasi) {
  if (simulasi) return;
  var sh = L.sh, dihapus = {};
  L.hapus.forEach(function (b) { dihapus[b.r] = true; });
  // 1. ubah sel yang berubah
  L.kotor.forEach(function (b) {
    if (dihapus[b.r]) return;
    var cols = Object.keys(b.kotor).map(Number).sort(function (x, y) { return x - y; });
    var c1 = cols[0], c2 = cols[cols.length - 1], adaRumus = false;
    for (var c = c1; c <= c2; c++) if (!b.kotor[c] && L.rumus[b.i] && L.rumus[b.i][c]) adaRumus = true;
    if (adaRumus || (c2 - c1 + 1) > cols.length + 6) {
      cols.forEach(function (c) { var g = sh.getRange(b.r, c + 1); g.setNumberFormat(b.fmt[c] || 'General'); g.setValue(b.arr[c]); });
    } else {
      var g = sh.getRange(b.r, c1 + 1, 1, c2 - c1 + 1);
      g.setNumberFormats([b.fmt.slice(c1, c2 + 1)]);
      g.setValues([b.arr.slice(c1, c2 + 1)]);
    }
  });
  // 2. hapus baris (dari bawah)
  var rows = L.hapus.map(function (b) { return b.r; });
  if (rows.length) hapusBaris_(sh, rows);
  // 3. tambah baris baru di bawah
  if (L.baru.length) {
    var mulai = sh.getLastRow() + 1;
    var perlu = mulai + L.baru.length - 1;
    if (sh.getMaxRows() < perlu) sh.insertRowsAfter(sh.getMaxRows(), perlu - sh.getMaxRows());
    var g = sh.getRange(mulai, 1, L.baru.length, L.lebar);
    g.setNumberFormats(L.baru.map(function (b) { return b.fmt; }));
    g.setValues(L.baru.map(function (b) { return b.arr; }));
  }
}

/* ------------------------------------------------------------------ tautan (ingatan baris mana milik siswa/guru mana) */
function Tautan_() {
  var peta = {}, ubah = false;
  baca_(SH.TAUTAN).forEach(function (r) { if (r.kode && r.idInduk) peta[r.kode + '|' + r.entitas + '|' + r.idInduk] = { kode: r.kode, entitas: r.entitas, idInduk: r.idInduk, kunci: r.kunci, waktu: r.waktu }; });
  return {
    ambil: function (k, e, id) { var x = peta[k + '|' + e + '|' + id]; return x ? x.kunci : ''; },
    set: function (k, e, id, kunci) {
      kunci = s_(kunci); if (!kunci) return;
      var key = k + '|' + e + '|' + id, x = peta[key];
      if (x && x.kunci === kunci) return;
      peta[key] = { kode: k, entitas: e, idInduk: id, kunci: kunci, waktu: stamp_() }; ubah = true;
    },
    hapus: function (k, e, id) { var key = k + '|' + e + '|' + id; if (peta[key]) { delete peta[key]; ubah = true; } },
    daftar: function (k, e) { return Object.keys(peta).map(function (x) { return peta[x]; }).filter(function (x) { return x.kode === k && x.entitas === e; }); },
    simpan: function () { if (ubah) { tulisUlang_(SH.TAUTAN, Object.keys(peta).map(function (x) { return peta[x]; })); ubah = false; } }
  };
}

/**
 * Sinkron satu sheet "datar" (satu baris = satu orang).
 * Urutan pencocokan: tautan tersimpan → kunci (NIS/NISN/NIP) → nama.
 */
function sinkronDatar_(ctx, spec) {
  var L = muatLembar_(ctx.ss, spec.sheet, spec.alias);
  (spec.wajib || []).forEach(function (f) {
    if (L.kol[f] === undefined) throw err_('Kolom "' + f + '" tidak ditemukan di sheet ' + spec.sheet + ' (' + ctx.tg.aplikasi + ').');
  });
  var bag = { bagian: spec.label, tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
  var contoh = function (t) { if (bag.contoh.length < 12) bag.contoh.push(t); };
  var T = ctx.tautan, ent = spec.entitas, kode = ctx.tg.kode;
  var sumber = ent === 'siswa' ? ctx.data.siswa : ctx.data.guru;
  var rek = sumber.map(function (r) { return { r: r, b: null }; });
  var fNama = spec.fieldNama || 'nama';
  var indeks = {};
  L.baris.forEach(function (b) { var k = s_(spec.kunciTautan(b.obj)); if (k && !indeks[k]) indeks[k] = b; });
  var pasang = function (x, b) { x.b = b; b.pakai = true; };

  // 1. tautan tersimpan
  rek.forEach(function (x) { var k = T.ambil(kode, ent, x.r.id); var b = k && indeks[k]; if (b && !b.pakai) pasang(x, b); });
  // 2. kunci identitas
  (spec.kunci || []).forEach(function (f) {
    if (L.kol[f] === undefined) return;
    var peta = {};
    L.baris.forEach(function (b) { if (b.pakai) return; var v = normKunci_(b.obj[f]); if (v) (peta[v] = peta[v] || []).push(b); });
    rek.forEach(function (x) {
      if (x.b) return;
      var v = normKunci_(x.r[f]);
      var l = v && peta[v];
      if (!l) return;
      var b = l.filter(function (y) { return !y.pakai; })[0];
      if (b) pasang(x, b);
    });
  });
  // 3. nama (siswa: nama persis; guru: nama tanpa gelar / nama depan + belakang)
  if (spec.cocokNama && L.kol[fNama] !== undefined) {
    rek.forEach(function (x) {
      if (x.b) return;
      var calon = L.baris.filter(function (b) { return !b.pakai && namaCocok_(ent, x.r.nama, b.obj[fNama]); });
      if (calon.length > 1 && spec.fieldKelas && L.kol[spec.fieldKelas] !== undefined) {
        var kk = norm_(formatKelas_(x.r.kelas, ctx.tg.formatKelas, ctx.data.kelasMap));
        calon = calon.filter(function (b) { return norm_(b.obj[spec.fieldKelas]) === kk; });
      }
      if (calon.length === 1) pasang(x, calon[0]);
      else if (calon.length > 1) ctx.peringatan(spec.sheet + ': nama "' + x.r.nama + '" ditemukan ' + calon.length + ' kali — tidak dicocokkan otomatis.');
    });
  }

  var tidakAktif = function (b, r) {
    var aksi = spec.tidakAktif ? spec.tidakAktif(r, ctx) : 'hapus';
    if (aksi === 'hapus') {
      if (L.hapus.indexOf(b) < 0) { L.hapus.push(b); bag.hapus++; contoh('− ' + (r ? r.nama : b.obj[fNama])); }
      return 'hapus';
    }
    if (terapkanNilai_(L, b, aksi)) {
      if (spec.stempel) terapkanNilai_(L, b, spec.stempel(ctx));
      bag.hapus++; contoh('⊘ ' + (r ? r.nama : b.obj[fNama]));
    }
    return 'tandai';
  };

  rek.forEach(function (x) {
    var r = x.r, aktif = (r.status || 'Aktif') === 'Aktif';
    if (x.b) {
      if (!aktif && spec.nonAktif !== 'perbarui') {
        if (ctx.tg.hapus) { if (tidakAktif(x.b, r) === 'hapus') T.hapus(kode, ent, r.id); else T.set(kode, ent, r.id, spec.kunciTautan(x.b.obj)); }
        return;
      }
      var kunciLama = s_(spec.kunciTautan(x.b.obj));
      var ubah = terapkanNilai_(L, x.b, spec.nilai(r, ctx));
      if (ubah && spec.stempel) terapkanNilai_(L, x.b, spec.stempel(ctx));
      if (ubah) { bag.ubah++; contoh('✎ ' + r.nama); }
      var kunciBaru = s_(spec.kunciTautan(x.b.obj));
      if (spec.gantiKunci && kunciLama && kunciBaru && kunciLama !== kunciBaru) spec.gantiKunci(kunciLama, kunciBaru);
      T.set(kode, ent, r.id, kunciBaru);
      return;
    }
    if (!aktif) return;
    var alasan = spec.syarat ? spec.syarat(r, ctx) : '';
    if (alasan) { bag.lewati++; ctx.peringatan(r.nama + ': ' + alasan); return; }
    if (spec.tambah === false) return;            // mis. sheet wajah: hanya siswa yang sudah daftar
    if (!ctx.tg.tambah) { bag.belum++; return; }
    var nb = barisBaru_(L);
    if (spec.baru) terapkanNilai_(L, nb, spec.baru(r, ctx, L));
    terapkanNilai_(L, nb, spec.nilai(r, ctx));
    if (spec.stempel) terapkanNilai_(L, nb, spec.stempel(ctx));
    L.baru.push(nb);
    bag.tambah++; contoh('+ ' + r.nama);
    T.set(kode, ent, r.id, spec.kunciTautan(nb.obj));
  });

  // 4. sudah dihapus dari Data Induk (masih tercatat di tautan)
  var adaId = {};
  sumber.forEach(function (r) { adaId[r.id] = true; });
  T.daftar(kode, ent).forEach(function (t) {
    if (adaId[t.idInduk]) return;
    var b = indeks[t.kunci];
    if (b && !b.pakai && ctx.tg.hapus) { tidakAktif(b, null); b.pakai = true; }
    T.hapus(kode, ent, t.idInduk);
  });

  tulisLembar_(L, ctx.simulasi);
  ctx.hasil.rincian.push(bag);
  return L;
}

/* ------------------------------------------------------------------ ADAPTER TIAP APLIKASI */
var ADAPTER = {
  absenGuru: function (ctx) {
    if (!ctx.tg.guru) return;
    sinkronDatar_(ctx, {
      label: 'Guru (sheet Guru)', sheet: 'Guru', entitas: 'guru',
      alias: { id: ['id', 'idguru', 'guruid', 'kode'], nama: ['nama', 'namaguru', 'namalengkap'], nip: ['nip'], jk: ['jk', 'jeniskelamin', 'gender', 'lp'],
        nuptk: ['nuptk'], mapel: ['mapel', 'matapelajaran', 'bidangstudi', 'pelajaran'], deleted: ['deleted', 'dihapus', 'hapus'], rev: ['rev', 'revisi', 'updatedat', 'waktuubah'] },
      wajib: ['id', 'nama'], kunci: ['nip'], cocokNama: true, kunciTautan: function (o) { return o.id; },
      nilai: function (g, ctx) {
        return [['nama', namaGuru_(g, ctx.tg), 't'], ['nip', g.nip, 't', true], ['jk', g.jk, 't', true], ['nuptk', g.nuptk, 't', true],
          ['mapel', g.mapel, 't', true], ['deleted', false, 'b']];
      },
      baru: function (g, ctx, L) { return [['id', angkaBerikut_(L, 'id', 1), 'n']]; },
      stempel: function (ctx) { return [['rev', ctx.now, 'n']]; },
      tidakAktif: function () { return [['deleted', true, 'b']]; }
    });
  },

  absenSiswa: function (ctx) {
    if (!ctx.tg.siswa) return;
    sinkronDatar_(ctx, {
      label: 'Siswa (sheet SISWA)', sheet: 'SISWA', entitas: 'siswa',
      alias: { no: ['no'], nis: ['nis'], nama: ['nama'], kelas: ['kelas'], jk: ['jk', 'jeniskelamin', 'lp'], hp: ['nohportu', 'hportu'], diperbarui: ['diperbarui'] },
      wajib: ['nis', 'nama', 'kelas'], kunci: ['nis'], cocokNama: true, fieldKelas: 'kelas', kunciTautan: function (o) { return o.nis; },
      syarat: function (s) { return s.nis ? '' : 'belum punya NIS (wajib untuk Absen Siswa)'; },
      nilai: function (s, ctx) {
        return [['nis', s.nis, 't', true], ['nama', namaSiswa_(s, ctx.tg), 't'], ['kelas', kelasApp_(s.kelas, ctx), 't'],
          ['jk', s.jk, 't', true], ['hp', s.hpOrtu, 't', true]];
      },
      baru: function (s, ctx, L) { return [['no', angkaBerikut_(L, 'no', 1), 'n']]; },
      stempel: function (ctx) { return [['diperbarui', ctx.now, 'n']]; },
      tidakAktif: function () { return 'hapus'; }
    });
  },

  wajah: function (ctx) {
    if (!ctx.tg.siswa) return;
    sinkronDatar_(ctx, {
      label: 'Siswa terdaftar wajah (sheet MasterAbsenSiswa)', sheet: 'MasterAbsenSiswa', entitas: 'siswa', tambah: false,
      alias: { no: ['no'], nama: ['nama'], jk: ['jeniskelamin', 'jk'], nisn: ['nisn'], nis: ['nis'], tempatLahir: ['tempatlahir'],
        tanggalLahir: ['tanggallahir'], nik: ['nik'], tahunMasuk: ['tahunmasuk'], kelas: ['kelas'] },
      wajib: ['nis', 'nama'], kunci: ['nis', 'nisn'], cocokNama: true, fieldKelas: 'kelas',
      kunciTautan: function (o) { return o.nis || o.nisn; },
      nilai: function (s, ctx) {
        return [['nama', namaSiswa_(s, ctx.tg), 't'], ['jk', s.jk, 't', true], ['nis', s.nis, 't', true], ['nisn', s.nisn, 'k', true],
          ['tempatLahir', s.tempatLahir, 't', true], ['tanggalLahir', s.tanggalLahir, 'd', true], ['nik', s.nik, 'k', true],
          ['tahunMasuk', s.tahunMasuk, 't', true], ['kelas', kelasApp_(s.kelas, ctx), 't']];
      },
      tidakAktif: function () { return 'hapus'; }
    });
  },

  dknMid: function (ctx) {
    var ganti = [];
    if (ctx.tg.siswa) {
      sinkronDatar_(ctx, {
        label: 'Siswa (sheet Siswa)', sheet: 'Siswa', entitas: 'siswa',
        alias: { nisn: ['nisn'], nis: ['nis'], nama: ['nama'], kelas: ['kelas'], jk: ['jk'], noAbsen: ['noabsen'] },
        wajib: ['nisn', 'nama', 'kelas'], kunci: ['nisn', 'nis'], cocokNama: true, fieldKelas: 'kelas',
        kunciTautan: function (o) { return o.nisn; },
        syarat: function (s) { return (s.nisn || s.nis) ? '' : 'belum punya NISN/NIS'; },
        nilai: function (s, ctx) {
          return [['nisn', s.nisn, 't', true], ['nis', s.nis, 't', true], ['nama', namaSiswa_(s, ctx.tg), 't'], ['kelas', kelasApp_(s.kelas, ctx), 't'],
            ['jk', s.jk, 't', true], ['noAbsen', s.noAbsen, 't', true]];
        },
        baru: function (s, ctx, L) {
          var k = kelasApp_(s.kelas, ctx);
          return [['nisn', s.nisn || s.nis, 't'], ['noAbsen', s.noAbsen || String(noAbsenBerikut_(L, k)), 't']];
        },
        gantiKunci: function (lama, baru) { ganti.push([lama, baru]); },
        tidakAktif: function () { return 'hapus'; }
      });
      if (ganti.length) gantiNisnDkn_(ctx, ganti);
    }
    if (ctx.tg.guru || ctx.tg.siswa) sinkronKelasDkn_(ctx);
  },

  sipas: function (ctx) {
    var ALS = function (cols) { var o = {}; cols.forEach(function (c) { o[c] = [norm_(c)]; }); return o; };
    if (ctx.tg.guru) {
      sinkronDatar_(ctx, {
        label: 'Guru (sheet teachers)', sheet: 'teachers', entitas: 'guru', fieldNama: 'name', nonAktif: 'perbarui',
        alias: ALS(['id', 'nip', 'nuptk', 'name', 'gender', 'phone', 'email', 'active', 'created_at', 'updated_at']),
        wajib: ['id', 'name'], kunci: ['nip'], cocokNama: true, kunciTautan: function (o) { return o.id; },
        nilai: function (g, ctx) {
          return [['nip', g.nip, 't', true], ['nuptk', g.nuptk, 't', true], ['name', namaGuru_(g, ctx.tg), 't'], ['gender', g.jk, 't', true],
            ['phone', g.hp, 't', true], ['email', g.email, 't', true], ['active', (g.status || 'Aktif') === 'Aktif' ? 1 : 0, 'n']];
        },
        baru: function (g, ctx) { return [['id', Utilities.getUuid(), 't'], ['created_at', ctx.iso, 't']]; },
        stempel: function (ctx) { return [['updated_at', ctx.iso, 't']]; },
        tidakAktif: function () { return [['active', 0, 'n']]; }
      });
    }
    if (ctx.tg.siswa) {
      sinkronDatar_(ctx, {
        label: 'Siswa (sheet students)', sheet: 'students', entitas: 'siswa', fieldNama: 'name', nonAktif: 'perbarui',
        alias: ALS(['id', 'nis', 'nisn', 'name', 'gender', 'birth_place', 'birth_date', 'religion', 'address', 'parent_name', 'parent_phone', 'status', 'created_at', 'updated_at']),
        wajib: ['id', 'name', 'status'], kunci: ['nisn', 'nis'], cocokNama: true, kunciTautan: function (o) { return o.id; },
        nilai: function (s, ctx) {
          return [['nis', s.nis, 't', true], ['nisn', s.nisn, 't', true], ['name', namaSiswa_(s, ctx.tg), 't'], ['gender', s.jk, 't', true],
            ['birth_place', s.tempatLahir, 't', true], ['birth_date', s.tanggalLahir, 'd', true], ['religion', s.agama, 't', true],
            ['address', s.alamat, 't', true], ['parent_name', s.namaWali || s.namaAyah || s.namaIbu, 't', true],
            ['parent_phone', s.hpOrtu, 't', true], ['status', STATUS_SIPAS[s.status] || 'aktif', 't']];
        },
        baru: function (s, ctx) { return [['id', Utilities.getUuid(), 't'], ['created_at', ctx.iso, 't']]; },
        stempel: function (ctx) { return [['updated_at', ctx.iso, 't']]; },
        tidakAktif: function () { return [['status', 'keluar', 't']]; }
      });
    }
    if (ctx.tg.siswa || ctx.tg.guru) sinkronKelasSipas_(ctx, ALS);
  },

  ujian: function (ctx) {
    if (!ctx.tg.siswa) return;
    sinkronDatar_(ctx, {
      label: 'Akun siswa (sheet USER)', sheet: 'USER', entitas: 'siswa',
      alias: { username: ['username'], password: ['password'], nama: ['nama'], kelas: ['kelas'] },
      wajib: ['username', 'password', 'nama', 'kelas'], kunci: [], cocokNama: true, fieldKelas: 'kelas',
      kunciTautan: function (o) { return o.username; },
      nilai: function (s, ctx) { return [['nama', namaSiswa_(s, ctx.tg), 't'], ['kelas', kelasApp_(s.kelas, ctx), 't']]; },
      baru: function (s, ctx, L) { return [['username', usernameBerikut_(L), 't'], ['password', sandiAcak_(6), 't']]; },
      tidakAktif: function () { return 'hapus'; }
    });
  },

  tatib: function (ctx) {
    if (!ctx.tg.siswa) return;
    sinkronDatar_(ctx, {
      label: 'Siswa (sheet Siswa)', sheet: 'Siswa', entitas: 'siswa', nonAktif: 'perbarui',
      alias: { id: ['id'], nis: ['nis'], nisn: ['nisn'], nama: ['namalengkap', 'nama'], kelas: ['kelas'], jk: ['lp', 'jk'],
        tahunMasuk: ['tahunmasuk', 'angkatan'], ortu: ['namaorangtuawali', 'ortu'], hpOrtu: ['nohporangtua', 'hportu'],
        alamat: ['alamat'], status: ['status'], diubahPada: ['diubahpada'], diubahOleh: ['diubaholeh'] },
      wajib: ['id', 'nama', 'kelas'], kunci: ['nis', 'nisn'], cocokNama: true, fieldKelas: 'kelas',
      kunciTautan: function (o) { return o.id; },
      nilai: function (s, ctx) {
        return [['nis', s.nis, 't', true], ['nisn', s.nisn, 't', true], ['nama', namaSiswa_(s, ctx.tg), 't'], ['kelas', kelasApp_(s.kelas, ctx), 't'],
          ['jk', s.jk, 't', true], ['tahunMasuk', s.tahunMasuk, 't', true], ['ortu', s.namaWali || s.namaAyah || s.namaIbu, 't', true],
          ['hpOrtu', s.hpOrtu, 't', true], ['alamat', s.alamat, 't', true], ['status', STATUS_TATIB[s.status] || 'Aktif', 't']];
      },
      baru: function (s, ctx, L) { return [['id', String(angkaBerikut_(L, 'id', 1001)), 't']]; },
      stempel: function (ctx) { return [['diubahPada', ctx.stamp, 't'], ['diubahOleh', 'datainduk', 't']]; },
      tidakAktif: function () { return [['status', 'Nonaktif', 't']]; }
    });
  },

  githubCsv: function (ctx) {
    var p = pengaturan_();
    var token = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN');
    var repo = s_(p.GITHUB_REPO), path = s_(p.GITHUB_PATH), branch = s_(p.GITHUB_BRANCH) || 'main';
    if (!repo || !path) throw err_('GITHUB_REPO / GITHUB_PATH belum diisi di PENGATURAN.');
    if (!token) throw err_('Token GitHub belum diatur (aplikasi Data Induk → Pengaturan → GitHub).');
    var bag = { bagian: 'File ' + repo + '/' + path, tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
    var csv = buatCsv_(ctx.tg.formatKelas);
    var url = 'https://api.github.com/repos/' + repo + '/contents/' + path.split('/').map(encodeURIComponent).join('/');
    var head = { Authorization: 'Bearer ' + token, Accept: 'application/vnd.github+json', 'X-GitHub-Api-Version': '2022-11-28' };
    var res = UrlFetchApp.fetch(url + '?ref=' + encodeURIComponent(branch), { headers: head, muteHttpExceptions: true });
    var kodeHttp = res.getResponseCode(), sha = null, lama = '';
    if (kodeHttp === 200) {
      var j = JSON.parse(res.getContentText());
      sha = j.sha;
      if (j.content) lama = Utilities.newBlob(Utilities.base64Decode(String(j.content).replace(/\s/g, ''))).getDataAsString('UTF-8');
    } else if (kodeHttp !== 404) throw err_('GitHub menolak (' + kodeHttp + '): ' + res.getContentText().slice(0, 200));
    if (lama.replace(/\r/g, '') !== csv) {
      bag.ubah = 1; bag.contoh.push(csv.split('\n').length - 2 + ' siswa aktif');
      if (!ctx.simulasi) {
        var body = { message: 'Data siswa dari Data Induk ' + ctx.stamp, content: Utilities.base64Encode(csv, Utilities.Charset.UTF_8), branch: branch };
        if (sha) body.sha = sha;
        var put = UrlFetchApp.fetch(url, { method: 'put', headers: head, contentType: 'application/json', payload: JSON.stringify(body), muteHttpExceptions: true });
        if (put.getResponseCode() !== 200 && put.getResponseCode() !== 201) throw err_('Gagal menulis ke GitHub (' + put.getResponseCode() + '): ' + put.getContentText().slice(0, 200));
      }
    }
    ctx.hasil.rincian.push(bag);
  }
};

/** DKN Mid: sheet Kelas (label raport, wali kelas, NIP wali). */
function sinkronKelasDkn_(ctx) {
  if (!ctx.data.kelas.length) return;
  var L;
  try { L = muatLembar_(ctx.ss, 'Kelas', { kelas: ['kelas'], label: ['labelraport'], wali: ['walikelas'], nipWali: ['nipwali'], urut: ['urut'] }); }
  catch (x) { ctx.peringatan(x.message); return; }
  if (L.kol.kelas === undefined) return;
  var bag = { bagian: 'Kelas & wali kelas (sheet Kelas)', tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
  var peta = {};
  L.baris.forEach(function (b) { peta[norm_(b.obj.kelas)] = b; });
  ctx.data.kelas.forEach(function (k) {
    var nm = kelasApp_(k.kelas, ctx);
    var u = ctx.data.kelasMap[k.kelas.toUpperCase()] || uraiKelas_(k.kelas);
    var g = ctx.data.guruById[k.waliId];
    var isi = [['label', u.tingkat ? keRomawi_(u.tingkat) : '', 't', true], ['urut', k.urut, 'n', true]];
    if (g && ctx.tg.guru) isi.push(['wali', namaGuru_(g, ctx.tg), 't'], ['nipWali', g.nip, 't', true]);
    var b = peta[norm_(nm)];
    if (b) { if (terapkanNilai_(L, b, isi)) { bag.ubah++; bag.contoh.push('✎ ' + nm); } }
    else if (ctx.tg.tambah && k.jumlah > 0) {
      b = barisBaru_(L); terapkanNilai_(L, b, [['kelas', nm, 't']].concat(isi)); L.baru.push(b); peta[norm_(nm)] = b;
      bag.tambah++; bag.contoh.push('+ ' + nm);
    }
  });
  tulisLembar_(L, ctx.simulasi);
  ctx.hasil.rincian.push(bag);
}

/** DKN Mid memakai NISN sebagai kunci nilai — bila NISN siswa berubah, nilai & pengambilan raport ikut dipindah. */
function gantiNisnDkn_(ctx, pasangan) {
  var peta = {}; pasangan.forEach(function (p) { peta[p[0]] = p[1]; });
  var bag = { bagian: 'Penyesuaian NISN di Nilai/Pengambilan', tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
  [['Nilai', true], ['Pengambilan', false]].forEach(function (x) {
    var L;
    try { L = muatLembar_(ctx.ss, x[0], { id: ['id'], nisn: ['nisn'], kode: ['kodemapel'] }); } catch (e) { return; }
    if (L.kol.nisn === undefined) return;
    L.baris.forEach(function (b) {
      var baru = peta[b.obj.nisn];
      if (!baru) return;
      var isi = [['nisn', baru, 't']];
      if (x[1] && L.kol.id !== undefined) isi.push(['id', baru + '|' + b.obj.kode, 't']);
      if (terapkanNilai_(L, b, isi)) bag.ubah++;
    });
    tulisLembar_(L, ctx.simulasi);
  });
  ctx.hasil.rincian.push(bag);
}

/** DKN Semester (SIPAS): kelas tahun ajaran aktif, wali kelas, dan anggota kelas (student_class_history). */
function sinkronKelasSipas_(ctx, ALS) {
  var Y = muatLembar_(ctx.ss, 'academic_years', ALS(['id', 'name', 'is_active']));
  var ay = Y.baris.filter(function (b) { return bool_(b.obj.is_active); })[0];
  if (!ay) { ctx.peringatan('DKN Semester: belum ada tahun ajaran aktif — kelas siswa tidak disinkronkan.'); return; }
  var ayId = ay.obj.id;
  var C = muatLembar_(ctx.ss, 'classes', ALS(['id', 'academic_year_id', 'name', 'grade_level', 'report_label', 'homeroom_teacher_id', 'sort_order', 'created_at']));
  var bag = { bagian: 'Kelas ' + ay.obj.name + ' & wali kelas (classes)', tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
  var kelasByNama = {};
  C.baris.forEach(function (b) { if (b.obj.academic_year_id === ayId) kelasByNama[norm_(b.obj.name)] = b; });
  var aktif = ctx.data.siswa.filter(function (s) { return (s.status || 'Aktif') === 'Aktif'; });
  var perlu = {};
  aktif.forEach(function (s) { if (s.kelas) perlu[kelasApp_(s.kelas, ctx)] = s.kelas; });
  ctx.data.kelas.forEach(function (k) { if (k.jumlah > 0) perlu[kelasApp_(k.kelas, ctx)] = k.kelas; });
  Object.keys(perlu).forEach(function (nm) {
    var asal = perlu[nm];
    var u = ctx.data.kelasMap[asal.toUpperCase()] || uraiKelas_(asal);
    var waliSipas = (ctx.tg.guru && u.waliId) ? ctx.tautan.ambil(ctx.tg.kode, 'guru', u.waliId) : '';
    var b = kelasByNama[norm_(nm)];
    if (!b) {
      if (!ctx.tg.tambah) return;
      b = barisBaru_(C);
      terapkanNilai_(C, b, [['id', Utilities.getUuid(), 't'], ['academic_year_id', ayId, 't'], ['name', nm, 't'], ['grade_level', u.tingkat || '', 'n'],
        ['report_label', u.tingkat ? keRomawi_(u.tingkat) : '', 't'], ['homeroom_teacher_id', waliSipas, 't', true], ['sort_order', u.urut || '', 'n'], ['created_at', ctx.iso, 't']]);
      C.baru.push(b); kelasByNama[norm_(nm)] = b; bag.tambah++; bag.contoh.push('+ ' + nm);
    } else if (waliSipas && terapkanNilai_(C, b, [['homeroom_teacher_id', waliSipas, 't']])) { bag.ubah++; bag.contoh.push('✎ wali ' + nm); }
  });
  tulisLembar_(C, ctx.simulasi);
  ctx.hasil.rincian.push(bag);
  if (!ctx.tg.siswa) return;

  var H = muatLembar_(ctx.ss, 'student_class_history', ALS(['id', 'student_id', 'class_id', 'academic_year_id', 'roll_no', 'note', 'created_at']));
  var bag2 = { bagian: 'Anggota kelas ' + ay.obj.name + ' (student_class_history)', tambah: 0, ubah: 0, hapus: 0, belum: 0, lewati: 0, contoh: [] };
  var hb = {};
  H.baris.forEach(function (b) { if (b.obj.academic_year_id === ayId && !hb[b.obj.student_id]) hb[b.obj.student_id] = b; });
  aktif.forEach(function (s) {
    var sid = ctx.tautan.ambil(ctx.tg.kode, 'siswa', s.id);
    var kb = kelasByNama[norm_(kelasApp_(s.kelas, ctx))];
    if (!sid || !kb) return;
    var b = hb[sid];
    if (!b) {
      b = barisBaru_(H);
      terapkanNilai_(H, b, [['id', Utilities.getUuid(), 't'], ['student_id', sid, 't'], ['class_id', kb.obj.id, 't'], ['academic_year_id', ayId, 't'],
        ['roll_no', s.noAbsen || '', 'n'], ['note', '', 't'], ['created_at', ctx.iso, 't']]);
      H.baru.push(b); hb[sid] = b; bag2.tambah++; bag2.contoh.push('+ ' + s.nama + ' → ' + kb.obj.name);
    } else if (terapkanNilai_(H, b, [['class_id', kb.obj.id, 't'], ['roll_no', s.noAbsen, 'n', true]])) { bag2.ubah++; bag2.contoh.push('✎ ' + s.nama + ' → ' + kb.obj.name); }
  });
  tulisLembar_(H, ctx.simulasi);
  ctx.hasil.rincian.push(bag2);
}

/* ------------------------------------------------------------------ bantu adapter */
function kelasApp_(kelas, ctx) { return formatKelas_(kelas, ctx.tg.formatKelas, ctx.data.kelasMap); }
function namaSiswa_(s, tg) { return tg.hurufNama === 'KAPITAL' ? s.nama.toUpperCase() : s.nama; }
// HURUF_NAMA (KAPITAL) hanya untuk nama siswa — nama guru & gelar ditulis apa adanya (mis. "S.Pd.Gr" di rapor)
function namaGuru_(g, tg) { return tg.gelar ? namaBergelar_(g) : g.nama; }
function namaBergelar_(g) { return (g.gelarDepan ? g.gelarDepan + ' ' : '') + g.nama + (g.gelarBelakang ? ', ' + g.gelarBelakang : ''); }

function angkaBerikut_(L, f, awal) {
  var maks = 0;
  L.baris.concat(L.baru).forEach(function (b) { var n = Number(String(b.obj[f] || '').replace(/[^\d]/g, '')); if (n > maks) maks = n; });
  return maks ? maks + 1 : awal;
}
function noAbsenBerikut_(L, kelas) {
  var maks = 0;
  L.baris.concat(L.baru).forEach(function (b) { if (norm_(b.obj.kelas) === norm_(kelas)) { var n = Number(b.obj.noAbsen) || 0; if (n > maks) maks = n; } });
  return maks + 1;
}
function usernameBerikut_(L) {
  var semua = L.baris.concat(L.baru).map(function (b) { return s_(b.obj.username); });
  var hit = {};
  semua.forEach(function (u) { var m = /^(.*?)(\d+)$/.exec(u); if (m) hit[m[1]] = (hit[m[1]] || 0) + 1; });
  var pref = Object.keys(hit).sort(function (a, b) { return hit[b] - hit[a]; })[0];
  if (pref === undefined) pref = 'murid';
  var maks = 0, lebar = 3;
  semua.forEach(function (u) { if (u.indexOf(pref) === 0) { var d = u.slice(pref.length); if (/^\d+$/.test(d)) { maks = Math.max(maks, Number(d)); lebar = Math.max(lebar, d.length); } } });
  var ada = {}; semua.forEach(function (u) { ada[u.toLowerCase()] = true; });
  var n = maks + 1, cal;
  do { cal = pref + ('000000000' + n).slice(-lebar); n++; } while (ada[cal.toLowerCase()]);
  return cal;
}
function sandiAcak_(n) {
  var ch = 'abcdefghjkmnpqrstuvwxyz23456789', s = '';
  for (var i = 0; i < n; i++) s += ch.charAt(Math.floor(Math.random() * ch.length));
  return s;
}

/* ------------------------------------------------------------------ diagnosa */
function diagnosa_(kode) {
  return daftarTarget_().filter(function (t) { return !kode || kode === 'SEMUA' || t.kode === kode; }).map(function (t) {
    var o = { kode: t.kode, aplikasi: t.aplikasi, aktif: t.aktif, ok: true, spreadsheet: '', sheet: [], kurang: [], pesan: '' };
    try {
      if (t.jenis === 'githubCsv') {
        o.spreadsheet = '(GitHub) ' + pengaturan_().GITHUB_REPO + '/' + pengaturan_().GITHUB_PATH;
        o.pesan = PropertiesService.getScriptProperties().getProperty('GITHUB_TOKEN') ? 'Token GitHub sudah diatur.' : 'Token GitHub belum diatur.';
        o.ok = o.pesan.indexOf('sudah') >= 0;
        return o;
      }
      var ss = bukaTarget_(t);
      o.spreadsheet = ss.getName();
      o.sheet = ss.getSheets().map(function (s) { return s.getName() + ' (' + Math.max(s.getLastRow() - 1, 0) + ' baris)'; });
      (SHEET_PERLU[t.jenis] || []).forEach(function (n) { if (!cariSheet_(ss, n)) o.kurang.push(n); });
      if (o.kurang.length) { o.ok = false; o.pesan = 'Sheet belum ada: ' + o.kurang.join(', ') + '. Jalankan fungsi setup di aplikasi tersebut.'; }
      else o.pesan = 'Spreadsheet dapat dibuka dan semua sheet yang dibutuhkan ada.';
    } catch (x) { o.ok = false; o.pesan = x.message; }
    return o;
  });
}

/* =============================================================================
   IMPOR DATA AWAL (sekali, dari aplikasi yang sudah berjalan)
   ============================================================================= */

function imporAwal_(opsi) {
  opsi = opsi || {};
  return kunci_(function () {
    var catatan = [];
    var siswa = baca_(SH.SISWA), guru = baca_(SH.GURU);
    var kosongSiswa = !siswa.length, kosongGuru = !guru.length;
    if (!kosongSiswa && !kosongGuru && !opsi.lengkapi) throw err_('Data Induk sudah berisi siswa & guru. Gunakan opsi "lengkapi data yang kosong" bila ingin melengkapi.');
    var tgs = {}; daftarTarget_().forEach(function (t) { tgs[t.kode] = t; });
    var bukaAman = function (kode) { var t = tgs[kode]; if (!t || !t.spreadsheetId) return null; try { return SpreadsheetApp.openById(t.spreadsheetId); } catch (x) { catatan.push(kode + ': tidak bisa dibuka (' + x.message + ')'); return null; } };
    var lembarAman = function (ss, n, alias) { if (!ss) return null; try { return muatLembar_(ss, n, alias); } catch (x) { catatan.push(x.message); return null; } };

    /* ---------------- SISWA ---------------- */
    var daftar = siswa.map(function (s) { return s; });
    var tambahBaru = kosongSiswa;
    var tidakCocok = [];
    var cari = function (nis, nisn, nama) {
      var a = normKunci_(nis), b = normKunci_(nisn), c = normNama_(nama);
      return (a && daftar.filter(function (x) { return normKunci_(x.nis) === a; })[0]) ||
        (b && daftar.filter(function (x) { return normKunci_(x.nisn) === b; })[0]) ||
        (c && daftar.filter(function (x) { return normNama_(x.nama) === c; })[0]) || null;
    };
    var lengkapi = function (rec, d) { Object.keys(d).forEach(function (k) { var v = s_(d[k]); if (v && v.toUpperCase() !== 'NULL' && v !== '0' && !s_(rec[k])) rec[k] = v; }); };
    var masukkan = function (d, bolehBaru, sumber) {
      if (!s_(d.nama)) return;
      var rec = cari(d.nis, d.nisn, d.nama);
      if (rec) { lengkapi(rec, d); return; }
      if (!bolehBaru) { if (tidakCocok.length < 60) tidakCocok.push(sumber + ': ' + d.nama); return; }
      rec = { status: 'Aktif', _baru: true }; lengkapi(rec, d); daftar.push(rec);
    };
    var nSiswaAwal = daftar.length;

    // 1. Absen Siswa (paling mutakhir) → dasar
    var ssA = bukaAman('ABSEN_SISWA');
    var LA = lembarAman(ssA, 'SISWA', { nis: ['nis'], nama: ['nama'], kelas: ['kelas'], jk: ['jk'], hp: ['nohportu'] });
    if (LA) { LA.baris.forEach(function (b) { masukkan({ nis: b.obj.nis, nama: b.obj.nama, kelas: b.obj.kelas, jk: b.obj.jk, hpOrtu: b.obj.hp }, tambahBaru, 'Absen Siswa'); }); catatan.push('Absen Siswa (SISWA): ' + LA.baris.length + ' baris dibaca.'); }
    var dasarAda = daftar.length > nSiswaAwal || !tambahBaru;
    // 2. CSV master (NISN, TTL, NIK, tahun masuk)
    var url = s_(pengaturan_().SUMBER_CSV_IMPOR);
    if (url) {
      try {
        var res = UrlFetchApp.fetch(url + (url.indexOf('?') < 0 ? '?t=' : '&t=') + Date.now(), { muteHttpExceptions: true });
        if (res.getResponseCode() === 200) {
          var lines = res.getContentText('UTF-8').split(/\r?\n/), n = 0;
          for (var i = 1; i < lines.length; i++) {
            if (!lines[i].trim()) continue;
            var c = lines[i].split(/[,;]/);
            if (c.length < 10) continue;
            masukkan({ nama: c[1], jk: c[2], nis: c[3], nisn: c[4], tempatLahir: c[5], tanggalLahir: c[6], nik: c[7], tahunMasuk: c[8], kelas: c[9] }, !dasarAda, 'CSV');
            n++;
          }
          catatan.push('CSV master: ' + n + ' baris dibaca.');
        } else catatan.push('CSV master tidak bisa diunduh (HTTP ' + res.getResponseCode() + ').');
      } catch (x) { catatan.push('CSV master: ' + x.message); }
    }
    dasarAda = dasarAda || daftar.length > nSiswaAwal;
    // 3. Tata Tertib
    var LT = lembarAman(bukaAman('TATA_TERTIB'), 'Siswa', { nis: ['nis'], nisn: ['nisn'], nama: ['namalengkap', 'nama'], kelas: ['kelas'], jk: ['lp'], tahunMasuk: ['tahunmasuk'], ortu: ['namaorangtuawali'], hp: ['nohporangtua'], alamat: ['alamat'] });
    if (LT) { LT.baris.forEach(function (b) { var o = b.obj; masukkan({ nis: o.nis, nisn: o.nisn, nama: o.nama, kelas: o.kelas, jk: o.jk, tahunMasuk: o.tahunMasuk, namaWali: o.ortu, hpOrtu: o.hp, alamat: o.alamat }, !dasarAda, 'Tata Tertib'); }); catatan.push('Tata Tertib (Siswa): ' + LT.baris.length + ' baris dibaca.'); }
    dasarAda = dasarAda || daftar.length > nSiswaAwal;
    // 4. DKN Mid
    var ssM = bukaAman('DKN_MID');
    var LM = lembarAman(ssM, 'Siswa', { nisn: ['nisn'], nis: ['nis'], nama: ['nama'], kelas: ['kelas'], jk: ['jk'], noAbsen: ['noabsen'] });
    if (LM) { LM.baris.forEach(function (b) { var o = b.obj; masukkan({ nisn: o.nisn, nis: o.nis, nama: o.nama, kelas: o.kelas, jk: o.jk, noAbsen: o.noAbsen }, !dasarAda, 'DKN Mid'); }); catatan.push('DKN Mid (Siswa): ' + LM.baris.length + ' baris dibaca.'); }
    // 5. DKN Semester (SIPAS)
    var ssS = bukaAman('DKN_SEMESTER');
    var LS = lembarAman(ssS, 'students', { nis: ['nis'], nisn: ['nisn'], nama: ['name'], jk: ['gender'], tempat: ['birthplace'], tgl: ['birthdate'], agama: ['religion'], alamat: ['address'], ortu: ['parentname'], hp: ['parentphone'], status: ['status'] });
    if (LS) { LS.baris.forEach(function (b) { var o = b.obj; if (o.status && o.status !== 'aktif') return; masukkan({ nis: o.nis, nisn: o.nisn, nama: o.nama, jk: o.jk, tempatLahir: o.tempat, tanggalLahir: o.tgl, agama: o.agama, alamat: o.alamat, namaWali: o.ortu, hpOrtu: o.hp }, false, 'DKN Semester'); }); catatan.push('DKN Semester (students): ' + LS.baris.length + ' baris dibaca.'); }
    // 6. Wajah
    var LW = lembarAman(bukaAman('WAJAH'), 'MasterAbsenSiswa', { nama: ['nama'], jk: ['jeniskelamin'], nisn: ['nisn'], nis: ['nis'], tempat: ['tempatlahir'], tgl: ['tanggallahir'], nik: ['nik'], tahun: ['tahunmasuk'], kelas: ['kelas'] });
    if (LW) LW.baris.forEach(function (b) { var o = b.obj; masukkan({ nama: o.nama, jk: o.jk, nisn: o.nisn, nis: o.nis, tempatLahir: o.tempat, tanggalLahir: o.tgl, nik: o.nik, tahunMasuk: o.tahun }, false, 'Wajah'); });

    // simpan siswa
    var semuaAda = baca_(SH.SISWA);
    var baruS = [], nUbahS = 0;
    daftar.forEach(function (raw) {
      var o = rapikanSiswa_(raw);
      if (raw._baru) { o.id = idBaru_('S', semuaAda.concat(baruS)); o.dibuat = stamp_(); o.diubah = stamp_(); o.status = 'Aktif'; baruS.push(o); }
      else if (raw._r) { Object.defineProperty(o, '_r', { value: raw._r, writable: true, enumerable: false }); o.id = raw.id; tulis_(SH.SISWA, o); nUbahS++; }
    });
    // NIS/NISN ganda dari sumber berbeda → kosongkan yang ganda agar validasi tidak gagal
    var pakai = { nis: {}, nisn: {} };
    semuaAda.concat(baruS).forEach(function (o) {
      ['nis', 'nisn'].forEach(function (f) { if (!o[f]) return; if (pakai[f][o[f]]) { catatan.push('Ganda ' + f.toUpperCase() + ' ' + o[f] + ': ' + pakai[f][o[f]] + ' & ' + o.nama + ' (dikosongkan pada yang kedua, periksa manual).'); o[f] = ''; } else pakai[f][o[f]] = o.nama; });
    });
    tambahBanyak_(SH.SISWA, baruS);

    /* ---------------- GURU ---------------- */
    var dGuru = guru.map(function (g) { return g; });
    var cariGuru = function (nip, nama) {
      var a = normKunci_(nip);
      return (a && dGuru.filter(function (x) { return normKunci_(x.nip) === a; })[0]) ||
        dGuru.filter(function (x) { return namaCocok_('guru', x.nama, nama); })[0] || null;
    };
    var masukGuru = function (d, bolehBaru) {
      var urai = uraiGelar_(d.namaLengkap || d.nama);
      if (!urai.nama) return null;
      var rec = cariGuru(d.nip, urai.nama);
      if (!rec) { if (!bolehBaru) return null; rec = { status: 'Aktif', _baru: true }; dGuru.push(rec); }
      if (urai.gelarDepan && !rec.gelarDepan) rec.gelarDepan = urai.gelarDepan;
      if (urai.gelarBelakang && !rec.gelarBelakang) rec.gelarBelakang = urai.gelarBelakang;
      if (!rec.nama) rec.nama = urai.nama;
      else if (rec.nama === rec.nama.toUpperCase() && urai.nama !== urai.nama.toUpperCase() && normNama_(rec.nama) === normNama_(urai.nama)) rec.nama = urai.nama;
      ['nip', 'nuptk', 'jk', 'hp', 'email', 'mapel'].forEach(function (k) { var v = s_(d[k]); if (v && v !== '0' && v !== '-' && !s_(rec[k])) rec[k] = v; });
      return rec;
    };
    var LG = lembarAman(bukaAman('ABSEN_GURU'), 'Guru', { id: ['id'], nama: ['nama'], nip: ['nip'], jk: ['jk'], nuptk: ['nuptk'], mapel: ['mapel'], deleted: ['deleted'] });
    if (LG) { LG.baris.forEach(function (b) { var o = b.obj; if (bool_(o.deleted)) return; masukGuru({ nama: o.nama, nip: o.nip, jk: o.jk, nuptk: o.nuptk && o.nuptk.length >= 10 ? o.nuptk : '', mapel: o.mapel }, kosongGuru); }); catatan.push('Absen Guru (Guru): ' + LG.baris.length + ' baris dibaca.'); }
    var LTe = lembarAman(ssS, 'teachers', { nama: ['name'], nip: ['nip'], nuptk: ['nuptk'], jk: ['gender'], hp: ['phone'], email: ['email'], active: ['active'] });
    if (LTe) { LTe.baris.forEach(function (b) { var o = b.obj; masukGuru({ namaLengkap: o.nama, nip: o.nip, nuptk: o.nuptk, jk: o.jk, hp: o.hp, email: o.email }, kosongGuru && !LG); }); catatan.push('DKN Semester (teachers): ' + LTe.baris.length + ' baris dibaca.'); }
    var LK = lembarAman(ssM, 'Kelas', { kelas: ['kelas'], wali: ['walikelas'], nip: ['nipwali'], urut: ['urut'] });
    var waliKelas = {};
    if (LK) LK.baris.forEach(function (b) { var g = masukGuru({ namaLengkap: b.obj.wali, nip: b.obj.nip }, false); if (g && b.obj.kelas) waliKelas[b.obj.kelas.toUpperCase()] = g; });
    var LP = lembarAman(bukaAman('TATA_TERTIB'), 'Pengguna', { nama: ['namalengkap'], nip: ['nip'], hp: ['nohp'], peran: ['peran'], kelasWali: ['kelaswali'] });
    if (LP) LP.baris.forEach(function (b) { if (b.obj.peran === 'Admin') return; var g = masukGuru({ namaLengkap: b.obj.nama, nip: b.obj.nip, hp: b.obj.hp }, false); if (g && b.obj.kelasWali && !waliKelas[b.obj.kelasWali.toUpperCase()]) waliKelas[b.obj.kelasWali.toUpperCase()] = g; });

    var semuaG = baca_(SH.GURU), baruG = [];
    dGuru.forEach(function (raw) {
      var o = rapikanGuru_(raw);
      if (raw._baru) { o.id = idBaru_('G', semuaG.concat(baruG)); o.dibuat = stamp_(); o.diubah = stamp_(); raw.id = o.id; baruG.push(o); }
      else if (raw._r) { Object.defineProperty(o, '_r', { value: raw._r, writable: true, enumerable: false }); o.id = raw.id; tulis_(SH.GURU, o); }
    });
    var pakaiNip = {};
    semuaG.concat(baruG).forEach(function (o) { if (!o.nip) return; if (pakaiNip[o.nip]) { catatan.push('NIP ganda ' + o.nip + ' (' + o.nama + ') dikosongkan.'); o.nip = ''; } else pakaiNip[o.nip] = true; });
    tambahBanyak_(SH.GURU, baruG);

    /* ---------------- KELAS ---------------- */
    pastikanKelas_(baca_(SH.SISWA).map(function (s) { return s.kelas; }));
    var kls = baca_(SH.KELAS), ubahK = false;
    kls.forEach(function (k) { var g = waliKelas[k.kelas.toUpperCase()]; if (g && g.id && !k.waliId) { k.waliId = g.id; k.waliNama = namaBergelar_(rapikanGuru_(g)); ubahK = true; } });
    if (ubahK) tulisUlang_(SH.KELAS, kls);

    tandaiPerubahan_();
    var ringkas = 'Siswa baru ' + baruS.length + ', siswa dilengkapi ' + nUbahS + ', guru baru ' + baruG.length + ', kelas ' + baca_(SH.KELAS).length;
    log_('Impor data awal', ringkas, 'admin');
    return { ringkasan: ringkas, catatan: catatan, tidakCocok: tidakCocok };
  });
}

/* =============================================================================
   MENU SPREADSHEET, SETUP, TRIGGER
   ============================================================================= */

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('📚 Data Induk')
      .addItem('1. Siapkan / perbaiki sheet', 'siapkanSheet')
      .addItem('2. Impor data awal dari aplikasi', 'menuImporAwal')
      .addItem('3. Periksa koneksi ke aplikasi', 'menuDiagnosa')
      .addSeparator()
      .addItem('Pratinjau sinkronisasi (tanpa mengubah)', 'menuPratinjau')
      .addItem('Sinkronkan ke semua aplikasi', 'menuSinkron')
      .addSeparator()
      .addItem('Aktifkan sinkron otomatis', 'aktifkanSinkronOtomatis')
      .addItem('Matikan sinkron otomatis', 'matikanSinkronOtomatis')
      .addItem('Atur token GitHub (Cetak Kartu)', 'menuAturGithub')
      .addToUi();
  } catch (x) { /* dijalankan dari editor */ }
}

/** SETUP: jalankan sekali dari editor. Aman dijalankan ulang (hanya melengkapi yang kurang). */
function siapkanSheet() {
  _C = {};
  var ss = ss_();
  PropertiesService.getScriptProperties().setProperty('DATA_INDUK_ID', ss.getId());
  ss.setSpreadsheetTimeZone(ss.getSpreadsheetTimeZone() || 'Asia/Makassar');
  Object.keys(KOLOM).forEach(function (n) { tabel_(n); });
  // pengaturan bawaan
  var ada = {}; baca_(SH.PENGATURAN).forEach(function (r) { ada[r.kunci] = true; });
  var kurangP = PENGATURAN_AWAL.filter(function (p) { return !ada[p[0]]; }).map(function (p) { return { kunci: p[0], nilai: p[1], ket: p[2] }; });
  if (kurangP.length) tambahBanyak_(SH.PENGATURAN, kurangP);
  // target bawaan
  var adaT = {}; baca_(SH.TARGET).forEach(function (r) { adaT[r.kode] = true; });
  var kurangT = TARGET_AWAL.filter(function (t) { return !adaT[t[0]]; }).map(function (t) {
    return { kode: t[0], aplikasi: t[1], jenis: t[2], spreadsheetId: t[3], aktif: t[4], siswa: t[5], guru: t[6], tambah: t[7], hapus: t[8],
      formatKelas: t[9], hurufNama: t[10], gelar: t[11], terakhir: '', hasil: '', catatan: t[12] };
  });
  if (kurangT.length) tambahBanyak_(SH.TARGET, kurangT);
  _C = {};
  folderFoto_();
  rahasia_();
  // tampilan
  var lebarKolom = { SISWA: { NAMA: 260, ALAMAT: 260, FOTO_URL: 200, CATATAN: 220 }, GURU: { NAMA: 220, ALAMAT: 240, FOTO_URL: 200 },
    PENGATURAN: { KUNCI: 210, NILAI: 300, KETERANGAN: 520 }, TARGET: { APLIKASI: 260, SPREADSHEET_ID: 330, HASIL_TERAKHIR: 360, CATATAN: 520 },
    LOG: { DETAIL: 520 }, ARSIP: { DATA_JSON: 400 } };
  Object.keys(KOLOM).forEach(function (n) {
    var t = tabel_(n);
    gayaHeader_(t.sh);
    var lk = lebarKolom[n] || {};
    KOLOM[n].forEach(function (c) { t.sh.setColumnWidth(t.idx[c[0]] + 1, lk[c[1]] || 130); });
  });
  var tt = tabel_(SH.TAUTAN).sh;
  tt.getRange('A1').setNote('Diisi otomatis oleh sinkronisasi: baris mana di aplikasi milik siswa/guru mana. Jangan diubah kecuali paham.');
  try { ss.getSheets().forEach(function (s) { if ((s.getName() === 'Sheet1' || s.getName() === 'Lembar1' || s.getName() === 'Lembar 1') && s.getLastRow() === 0) ss.deleteSheet(s); }); } catch (x) { /* abaikan */ }
  var pesan = 'Data Induk v' + VERSI + ' siap ✅\n\n' +
    'Password login: lihat sheet PENGATURAN (PASSWORD_ADMIN). Segera ganti.\n' +
    'Periksa sheet TARGET: ID spreadsheet tiap aplikasi.\n\n' +
    'Langkah berikutnya (menu 📚 Data Induk):\n 2. Impor data awal dari aplikasi\n 3. Periksa koneksi ke aplikasi\n • Pratinjau sinkronisasi\n • Sinkronkan ke semua aplikasi\n • Aktifkan sinkron otomatis\n\nLalu: Terapkan → Deployment baru → Aplikasi web.';
  tampil_(pesan);
  return pesan;
}

function menuImporAwal() {
  var siswa = baca_(SH.SISWA).length, guru = baca_(SH.GURU).length;
  var lengkapi = false;
  if (siswa || guru) {
    var ui = SpreadsheetApp.getUi();
    var j = ui.alert('Impor data awal', 'Data Induk sudah berisi ' + siswa + ' siswa & ' + guru + ' guru.\nLanjutkan untuk MELENGKAPI kolom yang masih kosong saja (data yang ada tidak ditimpa)?', ui.ButtonSet.YES_NO);
    if (j !== ui.Button.YES) return;
    lengkapi = true;
  }
  var h = imporAwal_({ lengkapi: lengkapi });
  tampil_(h.ringkasan + '\n\n' + h.catatan.join('\n') + (h.tidakCocok.length ? '\n\nTidak dicocokkan (abaikan bila memang bukan siswa aktif):\n' + h.tidakCocok.slice(0, 25).join('\n') : ''));
}

function menuDiagnosa() {
  tampil_(diagnosa_('SEMUA').map(function (d) { return (d.ok ? '✅ ' : '❌ ') + d.kode + (d.aktif ? '' : ' (nonaktif)') + ' — ' + (d.spreadsheet || '-') + '\n    ' + d.pesan; }).join('\n'));
}

function menuPratinjau() { tampil_(teksHasil_(sinkronSemua_(true), true)); }
function menuSinkron() { tampil_(teksHasil_(sinkronSemua_(false), false)); }

function teksHasil_(list, simulasi) {
  return (simulasi ? 'PRATINJAU (belum ada yang diubah)\n\n' : 'HASIL SINKRONISASI\n\n') + list.map(function (h) {
    var t = (h.ok ? '✅ ' : '❌ ') + h.aplikasi + ' — ' + ringkasHasil_(h);
    h.rincian.forEach(function (r) { t += '\n    • ' + r.bagian + ': +' + r.tambah + ' ✎' + r.ubah + ' −' + r.hapus + (r.contoh.length ? '  [' + r.contoh.slice(0, 6).join(', ') + ']' : ''); });
    h.peringatan.slice(0, 5).forEach(function (p) { t += '\n    ⚠ ' + p; });
    return t;
  }).join('\n\n');
}

function menuAturGithub() {
  var ui = SpreadsheetApp.getUi();
  var r = ui.prompt('Token GitHub', 'Tempel Personal Access Token GitHub (izin Contents: Read and write pada repo ' + pengaturan_().GITHUB_REPO + ').\nKosongkan untuk menghapus token. Token disimpan di Script Properties (tidak terlihat di sheet).', ui.ButtonSet.OK_CANCEL);
  if (r.getSelectedButton() !== ui.Button.OK) return;
  aksiAturGithub_(r.getResponseText());
  ui.alert('Token GitHub ' + (s_(r.getResponseText()) ? 'tersimpan ✅. Aktifkan target CETAK_KARTU di sheet TARGET.' : 'dihapus.'));
}

function aktifkanSinkronOtomatis(diam) {
  matikanSinkronOtomatis(true);
  var m = Number(pengaturan_().INTERVAL_SINKRON_MENIT) || 30;
  var b = ScriptApp.newTrigger('sinkronOtomatis').timeBased();
  if (m >= 60) b.everyHours(Math.max(1, Math.round(m / 60))); else b.everyMinutes(m <= 15 ? 15 : 30);
  b.create();
  if (diam !== true) tampil_('Sinkron otomatis aktif ✅\nSetiap ±' + (m >= 60 ? Math.round(m / 60) + ' jam' : (m <= 15 ? 15 : 30) + ' menit') + ', perubahan di Data Induk (termasuk yang diketik langsung di sheet) dikirim ke semua aplikasi.');
}

function matikanSinkronOtomatis(diam) {
  ScriptApp.getProjectTriggers().forEach(function (t) { if (t.getHandlerFunction() === 'sinkronOtomatis') ScriptApp.deleteTrigger(t); });
  if (diam !== true) tampil_('Sinkron otomatis dimatikan.');
}

/** Dipanggil trigger waktu: hanya bekerja bila ada perubahan sejak sinkron terakhir (atau 6 jam sekali). */
function sinkronOtomatis() {
  var p = PropertiesService.getScriptProperties();
  var ubah = Number(p.getProperty('PERUBAHAN') || 0), akhir = Number(p.getProperty('SINKRON_AKHIR') || 0);
  if (ubah <= akhir && Date.now() - akhir < 6 * 3600000) return;
  sinkronSemua_(false);
}

/** Pemicu sederhana: baris yang diketik langsung di sheet SISWA/GURU diberi ID, status, dan waktu ubah. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    var sh = e.range.getSheet(), n = sh.getName();
    if (n !== SH.SISWA && n !== SH.GURU && n !== SH.KELAS) return;
    try { PropertiesService.getScriptProperties().setProperty('PERUBAHAN', String(Date.now())); } catch (x) { /* abaikan */ }
    if (n === SH.KELAS) return;
    var r1 = Math.max(2, e.range.getRow()), r2 = e.range.getLastRow();
    if (r2 < r1) return;
    var lebar = sh.getLastColumn();
    var head = sh.getRange(1, 1, 1, lebar).getDisplayValues()[0].map(norm_);
    var cId = head.indexOf('id'), cNama = head.indexOf('nama'), cStatus = head.indexOf('status'), cUbah = head.indexOf('diubah'), cBuat = head.indexOf('dibuat');
    if (cId < 0 || cNama < 0) return;
    var rng = sh.getRange(r1, 1, r2 - r1 + 1, lebar), v = rng.getDisplayValues();
    var ids = sh.getRange(2, cId + 1, Math.max(sh.getLastRow() - 1, 1), 1).getDisplayValues().map(function (x) { return { id: x[0] }; });
    var now = stamp_(), pref = n === SH.SISWA ? 'S' : 'G';
    v.forEach(function (row, i) {
      if (!String(row[cNama]).trim()) return;
      var r = r1 + i;
      if (!String(row[cId]).trim()) { var id = idBaru_(pref, ids); ids.push({ id: id }); sh.getRange(r, cId + 1).setNumberFormat('@').setValue(id); }
      if (cStatus >= 0 && !String(row[cStatus]).trim()) sh.getRange(r, cStatus + 1).setValue('Aktif');
      if (cBuat >= 0 && !String(row[cBuat]).trim()) sh.getRange(r, cBuat + 1).setNumberFormat('@').setValue(now);
      if (cUbah >= 0 && e.range.getColumn() !== cUbah + 1) sh.getRange(r, cUbah + 1).setNumberFormat('@').setValue(now);
    });
  } catch (x) { /* jangan ganggu pengetikan */ }
}

/* =============================================================================
   AKSES SHEET DATA INDUK
   ============================================================================= */

var _C = {};

function ss_() {
  if (!_C.ss) {
    var id = PropertiesService.getScriptProperties().getProperty('DATA_INDUK_ID');
    var aktif = null;
    try { aktif = SpreadsheetApp.getActiveSpreadsheet(); } catch (x) { aktif = null; }
    _C.ss = aktif || (id ? SpreadsheetApp.openById(id) : null);
    if (!_C.ss) throw err_('Spreadsheet Data Induk tidak ditemukan. Jalankan siapkanSheet dari editor Apps Script spreadsheet ini.');
  }
  return _C.ss;
}

function tabel_(nama) {
  if (_C['t:' + nama]) return _C['t:' + nama];
  var def = KOLOM[nama], ss = ss_();
  var sh = ss.getSheetByName(nama) || ss.insertSheet(nama);
  var lebar = Math.max(sh.getLastColumn(), 1);
  var head = sh.getRange(1, 1, 1, lebar).getDisplayValues()[0];
  var kosong = head.every(function (h) { return !String(h).trim(); });
  var idx = {};
  def.forEach(function (c) { for (var i = 0; i < head.length; i++) if (norm_(head[i]) === norm_(c[1])) { idx[c[0]] = i; break; } });
  var kurang = def.filter(function (c) { return idx[c[0]] === undefined; });
  if (kurang.length) {
    var mulai = kosong ? 0 : sh.getLastColumn();
    if (sh.getMaxColumns() < mulai + kurang.length) sh.insertColumnsAfter(sh.getMaxColumns(), mulai + kurang.length - sh.getMaxColumns());
    sh.getRange(1, mulai + 1, 1, kurang.length).setValues([kurang.map(function (c) { return c[1]; })]);
    sh.getRange(2, mulai + 1, Math.max(sh.getMaxRows() - 1, 1), kurang.length).setNumberFormat('@');
    kurang.forEach(function (c, j) { idx[c[0]] = mulai + j; });
    gayaHeader_(sh);
  }
  var t = { nama: nama, sh: sh, idx: idx, lebar: Math.max(sh.getLastColumn(), 1) };
  _C['t:' + nama] = t;
  return t;
}

function gayaHeader_(sh) {
  var w = Math.max(sh.getLastColumn(), 1);
  sh.getRange(1, 1, 1, w).setFontWeight('bold').setBackground('#0b2a4a').setFontColor('#ffffff').setVerticalAlignment('middle');
  sh.setFrozenRows(1);
}

function baca_(nama) {
  var key = 'b:' + nama;
  var t = tabel_(nama), n = t.sh.getLastRow() - 1;
  if (n <= 0) return [];
  var v = t.sh.getRange(2, 1, n, t.lebar).getDisplayValues();
  var out = [];
  v.forEach(function (r, i) {
    if (!r.some(function (x) { return String(x).trim() !== ''; })) return;
    var o = {};
    KOLOM[nama].forEach(function (c) { var x = r[t.idx[c[0]]]; o[c[0]] = x === undefined || x === null ? '' : String(x).trim(); });
    Object.defineProperty(o, '_r', { value: i + 2, writable: true, enumerable: false });
    out.push(o);
  });
  return out;
}

function barisDari_(t, nama, o, dasar) {
  var arr = dasar ? dasar.slice() : [];
  while (arr.length < t.lebar) arr.push('');
  KOLOM[nama].forEach(function (c) { if (o[c[0]] !== undefined) arr[t.idx[c[0]]] = o[c[0]] === null ? '' : String(o[c[0]]); });
  return arr;
}

function tulis_(nama, o) {
  var t = tabel_(nama);
  if (o._r) {
    var g = t.sh.getRange(o._r, 1, 1, t.lebar);
    g.setValues([barisDari_(t, nama, o, g.getValues()[0])]);
  } else {
    var r = t.sh.getLastRow() + 1;
    if (t.sh.getMaxRows() < r) t.sh.insertRowsAfter(t.sh.getMaxRows(), 50);
    t.sh.getRange(r, 1, 1, t.lebar).setNumberFormat('@').setValues([barisDari_(t, nama, o, null)]);
    Object.defineProperty(o, '_r', { value: r, writable: true, enumerable: false });
  }
  delete _C.dataSinkron;
}

function tambahBanyak_(nama, list) {
  if (!list || !list.length) return;
  var t = tabel_(nama), r = t.sh.getLastRow() + 1;
  var perlu = r + list.length - 1;
  if (t.sh.getMaxRows() < perlu) t.sh.insertRowsAfter(t.sh.getMaxRows(), perlu - t.sh.getMaxRows() + 20);
  t.sh.getRange(r, 1, list.length, t.lebar).setNumberFormat('@').setValues(list.map(function (o) { return barisDari_(t, nama, o, null); }));
  list.forEach(function (o, i) { try { Object.defineProperty(o, '_r', { value: r + i, writable: true, enumerable: false }); } catch (x) { /* abaikan */ } });
  delete _C.dataSinkron;
}

/** Tulis ulang seluruh isi tabel (dipakai untuk KELAS & TAUTAN yang kecil). */
function tulisUlang_(nama, list) {
  var t = tabel_(nama), n = t.sh.getLastRow() - 1;
  if (n > 0) t.sh.getRange(2, 1, n, t.lebar).clearContent();
  if (list.length) {
    var perlu = list.length + 1;
    if (t.sh.getMaxRows() < perlu) t.sh.insertRowsAfter(t.sh.getMaxRows(), perlu - t.sh.getMaxRows() + 20);
    t.sh.getRange(2, 1, list.length, t.lebar).setNumberFormat('@').setValues(list.map(function (o) { return barisDari_(t, nama, o, null); }));
  }
  delete _C.dataSinkron;
}

function hapusBaris_(sh, rows) {
  var unik = rows.filter(function (r, i) { return r && rows.indexOf(r) === i; }).sort(function (a, b) { return b - a; });
  var i = 0;
  while (i < unik.length) {
    var akhir = unik[i], awal = akhir;
    while (i + 1 < unik.length && unik[i + 1] === awal - 1) { i++; awal--; }
    try { sh.deleteRows(awal, akhir - awal + 1); }
    catch (x) { sh.getRange(awal, 1, akhir - awal + 1, Math.max(sh.getLastColumn(), 1)).clearContent(); }
    i++;
  }
  delete _C.dataSinkron;
}

function pengaturan_(segar) {
  if (_C.p && !segar) return _C.p;
  var p = {};
  PENGATURAN_AWAL.forEach(function (x) { p[x[0]] = x[1]; });
  baca_(SH.PENGATURAN).forEach(function (r) { if (r.kunci) p[r.kunci.toUpperCase()] = r.nilai; });
  _C.p = p;
  return p;
}

function setPengaturan_(kunci, nilai) {
  var r = baca_(SH.PENGATURAN).filter(function (x) { return x.kunci.toUpperCase() === kunci; })[0];
  if (r) { r.nilai = nilai; tulis_(SH.PENGATURAN, r); }
  else {
    var d = PENGATURAN_AWAL.filter(function (x) { return x[0] === kunci; })[0];
    tulis_(SH.PENGATURAN, { kunci: kunci, nilai: nilai, ket: d ? d[2] : '' });
  }
  delete _C.p;
  try { CacheService.getScriptCache().remove('ringkasan'); } catch (x) { /* abaikan */ }
}

function log_(aksi, detail, oleh) {
  try {
    tambahBanyak_(SH.LOG, [{ waktu: stamp_(), aksi: aksi, detail: String(detail || '').slice(0, 500), oleh: oleh || '' }]);
    var sh = tabel_(SH.LOG).sh, n = sh.getLastRow() - 1;
    if (n > 3500) sh.deleteRows(2, n - 3000);
  } catch (x) { /* log tidak boleh menggagalkan proses */ }
}

function bacaLog_(n) {
  return baca_(SH.LOG).slice(-Math.min(Number(n) || 200, 1000)).reverse();
}

function tandaiPerubahan_() {
  PropertiesService.getScriptProperties().setProperty('PERUBAHAN', String(Date.now()));
  try { CacheService.getScriptCache().remove('ringkasan'); } catch (x) { /* abaikan */ }
  delete _C.dataSinkron;
}

function kunci_(fn) {
  if (_C.terkunci) return fn();
  var lock = LockService.getScriptLock();
  try { lock.waitLock(30000); } catch (x) { throw err_('Server sedang sibuk (sinkronisasi berjalan). Coba lagi sebentar.', 'SIBUK'); }
  _C.terkunci = true;
  try { return fn(); } finally { _C.terkunci = false; lock.releaseLock(); }
}

/* =============================================================================
   UTILITAS
   ============================================================================= */

function json_(o) { return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON); }
function err_(m, kode) { var e = new Error(m); e.kode = kode || 'ERR'; return e; }
function s_(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function norm_(v) { return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, ''); }
function ya_(v) { return v === true || ['ya', 'y', 'yes', 'true', '1', 'aktif'].indexOf(s_(v).toLowerCase()) >= 0; }
function bool_(v) { return v === true || ['true', 'ya', 'y', '1', 'yes'].indexOf(s_(v).toLowerCase()) >= 0; }
function hex_(b) { return b.map(function (x) { return ('0' + (x & 0xff).toString(16)).slice(-2); }).join(''); }
function tz_() { return ss_().getSpreadsheetTimeZone() || 'Asia/Makassar'; }
function stamp_() { return Utilities.formatDate(new Date(), tz_(), 'yyyy-MM-dd HH:mm:ss'); }
function pad2_(n) { return ('0' + n).slice(-2); }
function jenisLabel_(nama) { return nama === SH.GURU ? 'guru' : 'siswa'; }
function bersihAngka_(v) { return s_(v).replace(/\s+/g, '').replace(/^'/, ''); }
function tampil_(m) { try { SpreadsheetApp.getUi().alert(m); } catch (x) { Logger.log(m); } }

function idDariUrl_(v) {
  var s = s_(v), m = /\/d\/([a-zA-Z0-9_-]{20,})/.exec(s);
  return m ? m[1] : s;
}

function pilih_(v, daftar) {
  var s = s_(v).toLowerCase();
  if (!s) return '';
  for (var i = 0; i < daftar.length; i++) if (daftar[i].toLowerCase() === s) return daftar[i];
  return '';
}

function jk_(v) {
  var s = s_(v).toUpperCase();
  if (!s) return '';
  if (s === 'L' || s.indexOf('LAKI') === 0 || s === 'PRIA' || s === 'M') return 'L';
  if (s === 'P' || s.indexOf('PEREMPUAN') === 0 || s === 'WANITA' || s === 'F') return 'P';
  return s.charAt(0) === 'L' || s.charAt(0) === 'P' ? s.charAt(0) : '';
}

function tgl_(v) {
  if (v instanceof Date) return Utilities.formatDate(v, tz_(), 'yyyy-MM-dd');
  var s = s_(v), m;
  if (!s) return '';
  if ((m = /^(\d{4})-(\d{1,2})-(\d{1,2})/.exec(s))) return m[1] + '-' + pad2_(m[2]) + '-' + pad2_(m[3]);
  if ((m = /^(\d{1,2})[\/.\-](\d{1,2})[\/.\-](\d{4})$/.exec(s))) return m[3] + '-' + pad2_(m[2]) + '-' + pad2_(m[1]);
  var bln = { jan: 1, januari: 1, feb: 2, februari: 2, mar: 3, maret: 3, apr: 4, april: 4, mei: 5, may: 5, jun: 6, juni: 6, jul: 7, juli: 7,
    agu: 8, agt: 8, agustus: 8, aug: 8, sep: 9, september: 9, okt: 10, oktober: 10, oct: 10, nov: 11, november: 11, des: 12, desember: 12, dec: 12 };
  if ((m = /^(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})$/.exec(s)) && bln[m[2].toLowerCase()]) return m[3] + '-' + pad2_(bln[m[2].toLowerCase()]) + '-' + pad2_(m[1]);
  return s;
}

function idBaru_(pref, list) {
  var maks = 0, re = new RegExp('^' + pref + '(\\d+)$');
  (list || []).forEach(function (x) { var m = re.exec(s_(x.id)); if (m) maks = Math.max(maks, Number(m[1])); });
  var n = String(maks + 1), w = pref === 'S' ? 4 : 3;
  while (n.length < w) n = '0' + n;
  return pref + n;
}

function normKunci_(v) {
  var s = s_(v).replace(/\s+/g, '').toUpperCase();
  if (!s || s === '0' || s === '-' || s === 'NULL') return '';
  s = s.replace(/^0+/, '');
  return s.length >= 3 ? s : '';
}

function normNama_(v) { return s_(v).toUpperCase().replace(/[^A-Z\s]/g, ' ').replace(/\s+/g, ' ').trim(); }

/** Nama guru tanpa gelar: "Drs. Mikhael N. Tunas, S.Pd" → token [MIKHAEL, TUNAS] */
function tokenGuru_(v) {
  var s = s_(v).split(',')[0];
  return s.split(/\s+/).filter(function (t) { return t && !/\./.test(t); }).map(function (t) { return t.toUpperCase().replace(/[^A-Z]/g, ''); }).filter(function (t) { return t.length > 1; });
}

function namaCocok_(ent, a, b) {
  if (ent !== 'guru') { var x = normNama_(a); return !!x && x === normNama_(b); }
  var ta = tokenGuru_(a), tb = tokenGuru_(b);
  if (!ta.length || !tb.length) return false;
  if (ta.join(' ') === tb.join(' ')) return true;
  return ta.length >= 2 && tb.length >= 2 && ta[0] === tb[0] && ta[ta.length - 1] === tb[tb.length - 1];
}

/** "Drs. Budi Santoso, S.Pd., M.Pd" → {gelarDepan:'Drs.', nama:'Budi Santoso', gelarBelakang:'S.Pd., M.Pd'} */
function uraiGelar_(v) {
  var s = s_(v).replace(/\s+/g, ' ');
  if (!s) return { nama: '', gelarDepan: '', gelarBelakang: '' };
  var i = s.indexOf(',');
  var depan = i >= 0 ? s.slice(0, i) : s, belakang = i >= 0 ? s.slice(i + 1).trim() : '';
  var tok = depan.split(' '), gd = [];
  while (tok.length > 1 && /^(drs?|dra|ir|hj?|prof|pdt|pnt|dr)\.?$/i.test(tok[0])) gd.push(tok.shift());
  return { nama: tok.join(' ').trim(), gelarDepan: gd.join(' '), gelarBelakang: belakang };
}

function keRomawi_(n) {
  n = Number(n);
  if (!n || n < 1 || n > 20) return '';
  var r = [['X', 10], ['IX', 9], ['V', 5], ['IV', 4], ['I', 1]], s = '';
  r.forEach(function (x) { while (n >= x[1]) { s += x[0]; n -= x[1]; } });
  return s;
}
function dariRomawi_(s) {
  var m = { I: 1, V: 5, X: 10 }, t = 0, u = String(s).toUpperCase();
  for (var i = 0; i < u.length; i++) { var a = m[u[i]], b = m[u[i + 1]]; if (!a) return 0; t += b > a ? -a : a; }
  return t;
}

/** "7A" / "VII-A" / "VII A" / "8" → {tingkat:7, rombel:'A'} */
function uraiKelas_(k) {
  var s = s_(k).toUpperCase().replace(/\s+/g, ' ');
  var m = /^(\d{1,2}|[IVX]{1,5})\s*[-.\s]?\s*([A-Z0-9]{0,3})$/.exec(s);
  if (!m) return { kelas: s, tingkat: 0, rombel: '' };
  var t = /^\d+$/.test(m[1]) ? Number(m[1]) : dariRomawi_(m[1]);
  return { kelas: s, tingkat: t, rombel: m[2] || '' };
}

/** Template: {kelas} 7A · {tingkat} 7 · {romawi} VII · {rombel} A   contoh "{romawi}-{rombel}" → VII-A */
function formatKelas_(kelas, tpl, km) {
  kelas = s_(kelas);
  if (!kelas) return '';
  tpl = s_(tpl) || '{kelas}';
  if (tpl === '{kelas}') return kelas;
  var k = (km && km[kelas.toUpperCase()]) || uraiKelas_(kelas);
  if (!k.tingkat) return kelas;
  return tpl.replace(/\{kelas\}/g, kelas).replace(/\{tingkat\}/g, String(k.tingkat)).replace(/\{romawi\}/g, keRomawi_(k.tingkat)).replace(/\{rombel\}/g, k.rombel || '');
}

function urutKelas_(a, b) {
  var x = uraiKelas_(a), y = uraiKelas_(b);
  return (x.tingkat - y.tingkat) || String(x.rombel).localeCompare(String(y.rombel)) || String(a).localeCompare(String(b));
}
function urutkanSiswa_(list) {
  return list.slice().sort(function (a, b) { return urutKelas_(a.kelas, b.kelas) || a.nama.localeCompare(b.nama); });
}
