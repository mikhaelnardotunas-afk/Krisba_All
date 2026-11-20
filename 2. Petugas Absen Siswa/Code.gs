/**
 * ============================================================================
 *  ABSENQR — BACKEND GOOGLE APPS SCRIPT  •  Versi 2.0
 * ============================================================================
 *  Melayani:
 *   1. Aplikasi Android "AbsenQR" (API v2: akun Admin/Petugas, sinkron 2 arah).
 *   2. Aplikasi web lama (ABSENQR/index.html & ABSEN_PETUGAS_SISWA) — semua aksi
 *      lama (login, login_petugas, sync, get_absen, update_absen, get_laporan,
 *      generate_alpa, add_siswa_bulk, update_siswa, delete_siswa) TETAP berjalan.
 *
 *  Struktur sheet lama dipakai apa adanya:
 *   LAPORAN : A No | B NIS | C Nama | D Kelas | E Tanggal | F Jam | G Mapel | H Status | I Keterangan
 *   SISWA   : A No | B NIS | C Nama | D Kelas | E JK
 *   MAPEL   : A ID | B Nama
 *   PASSWORD: A1 password guru (web), A2 password petugas (web)
 *  Kolom teknis baru ditambahkan di UJUNG KANAN (Petugas, ID, Diperbarui, No HP Ortu).
 *  Sheet baru: PENGGUNA, PENGATURAN, RIWAYAT_HAPUS, LOG_AKTIVITAS (dibuat otomatis).
 *
 *  PEMASANGAN (detail: README.md bagian 2)
 *   1. Buka proyek Apps Script lama > simpan cadangan kode lama.
 *   2. Ganti seluruh isi Code.gs dengan kode ini > Simpan.
 *      Proyek hanya boleh berisi SATU file kode: hapus file lain yang berisi kode lama.
 *   3. Pilih fungsi "siapkanSpreadsheet" > Jalankan > izinkan akses.
 *   4. Terapkan > Kelola deployment > (pensil) Edit > Versi: "Versi baru" > Terapkan.
 *      URL web app TETAP SAMA, jadi web lama & aplikasi Android memakai URL yang sama.
 *   5. Login pertama di aplikasi Android:
 *        Admin   : username  admin    password = password guru lama (PASSWORD!A1)
 *        Petugas : username  petugas  password = password petugas lama (PASSWORD!A2)
 * ============================================================================
 */

// PENTING: di proyek Apps Script hanya boleh ada SATU file berisi kode ini.
// Hapus file kode lama (yang berisi `const SHEET_ID` dan `kirimDataInduk`), jangan disimpan berdampingan.
// Semua nama global di bawah memakai `var` & nama unik agar tidak bentrok bila tidak sengaja tertempel dua kali.

// ID Spreadsheet (sama dengan kode lama)
var ABSENQR_SHEET_ID = '1tb_rJACgCw3F9JfcxTkHW8IcZENEqbC9GcNTX_vZsEA';

var VERSI_SERVER = '2.0.1';

var KONFIG = {
  IZINKAN_API_LAMA: true,      // false = aksi web lama ditolak (bila semua sudah pindah ke Android)
  MASA_TOKEN_HARI: 365,        // berapa lama login di HP berlaku tanpa login ulang
  BARIS_PER_HALAMAN: 4000,     // jumlah data absen per unduhan
  MAKS_LOG: 3000,              // baris maksimum LOG_AKTIVITAS
  ITERASI_HASH: 300
};

var STATUS_SAH = ['Hadir', 'Sakit', 'Izin', 'Alpa'];

var STRUKTUR = {
  absen: {
    nama: 'LAPORAN',
    header: ['No', 'NIS', 'Nama', 'Kelas', 'Tanggal', 'Jam', 'Mapel', 'Status', 'Keterangan'],
    tetap: { no: 0, nis: 1, nama: 2, kelas: 3, tanggal: 4, jam: 5, mapel: 6, status: 7, keterangan: 8 },
    tambahan: { petugas: 'Petugas', id: 'ID', diperbarui: 'Diperbarui' },
    teks: ['id']
  },
  siswa: {
    nama: 'SISWA',
    header: ['No', 'NIS', 'Nama', 'Kelas', 'JK'],
    tetap: { no: 0, nis: 1, nama: 2, kelas: 3, jk: 4 },
    tambahan: { hp: 'No HP Ortu', diperbarui: 'Diperbarui' },
    teks: ['nis', 'hp']
  },
  mapel: {
    nama: 'MAPEL',
    header: ['ID', 'Nama'],
    tetap: { id: 0, nama: 1 },
    tambahan: { diperbarui: 'Diperbarui' },
    teks: []
  },
  pengguna: {
    nama: 'PENGGUNA',
    header: ['Username', 'Nama', 'Peran', 'Hash Password', 'Salt', 'Aktif', 'Wajib Ganti', 'Dibuat', 'Login Terakhir', 'Sesi Sejak'],
    tetap: { username: 0, nama: 1, peran: 2, hash: 3, salt: 4, aktif: 5, wajibGanti: 6, dibuat: 7, login: 8, sesiSejak: 9 },
    tambahan: {},
    teks: ['username', 'hash', 'salt']
  },
  pengaturan: {
    nama: 'PENGATURAN',
    header: ['Kunci', 'Nilai', 'Keterangan'],
    tetap: { kunci: 0, nilai: 1, ket: 2 },
    tambahan: {},
    teks: ['kunci', 'nilai']
  },
  hapus: {
    nama: 'RIWAYAT_HAPUS',
    header: ['Jenis', 'ID', 'Waktu (ms)', 'Oleh'],
    tetap: { jenis: 0, id: 1, waktu: 2, oleh: 3 },
    tambahan: {},
    teks: ['id']
  },
  log: {
    nama: 'LOG_AKTIVITAS',
    header: ['Waktu', 'Pengguna', 'Aksi', 'Detail'],
    tetap: { waktu: 0, pengguna: 1, aksi: 2, detail: 3 },
    tambahan: {},
    teks: []
  }
};

var PENGATURAN_AWAL = [
  ['nama_sekolah', 'SMP KRISTEN BASAAN', 'Nama sekolah (tampil di aplikasi & kop laporan)'],
  ['alamat_sekolah', '', 'Alamat sekolah untuk kop laporan'],
  ['kota', 'Basaan', 'Tempat penandatanganan laporan'],
  ['tahun_ajaran', '2026/2027', 'Tahun pelajaran'],
  ['semester', 'Ganjil', 'Semester'],
  ['kepala_sekolah', '', 'Nama kepala sekolah (tanda tangan laporan)'],
  ['nip_kepala', '', 'NIP kepala sekolah'],
  ['opsi_keterangan', 'Terlambat, Bolos, Pulang Cepat', 'Pilihan keterangan, pisahkan dengan koma'],
  ['petugas_hanya_hari_ini', 'ya', 'ya = petugas hanya boleh mengabsen untuk tanggal hari ini'],
  ['jam_masuk', '07.15', 'Batas jam masuk. Scan setelah jam ini otomatis diberi keterangan Terlambat (kosongkan = nonaktif)'],
  ['sesi_terlambat', 'DATANG', 'Nama mapel/sesi yang dicek keterlambatannya']
];

// ============================================================================
//  PINTU MASUK
// ============================================================================

function doGet() {
  const lama = _kodeLamaMasihAda();
  return _json({
    ok: true, status: 'success', aplikasi: 'AbsenQR', versi: VERSI_SERVER,
    message: lama ? PESAN_KODE_LAMA : 'Server AbsenQR aktif.',
    peringatan: lama ? PESAN_KODE_LAMA : ''
  });
}

function doPost(e) {
  try {
    let req = null;
    const pd = e && e.postData;
    if (pd && pd.contents && String(pd.type || '').indexOf('x-www-form-urlencoded') < 0) {
      try { req = JSON.parse(pd.contents); } catch (err) { req = null; }
    }
    if (req && req.v2) return _json(_apiV2(req));
    return _json(_apiLama((e && e.parameter) || {}));
  } catch (err) {
    const pesan = String((err && err.message) || err);
    return _json({ ok: false, pesan: pesan, kode: (err && err.kode) || 'ERR', status: 'error', message: pesan });
  }
}

// ============================================================================
//  API V2 (APLIKASI ANDROID)
// ============================================================================

function _apiV2(req) {
  const aksi = String(req.aksi || '');
  if (aksi === 'ping') {
    return {
      ok: true, versi: VERSI_SERVER, serverTime: Date.now(), sekolah: _bacaPengaturan().nama_sekolah,
      peringatan: _kodeLamaMasihAda() ? PESAN_KODE_LAMA : ''
    };
  }
  if (aksi === 'masuk') return aksiMasuk(req);

  const user = _cekToken(req.token);
  switch (aksi) {
    case 'tarik': return aksiTarik(user, req);
    case 'kirim': return aksiKirim(user, req);
    case 'ganti_password': return aksiGantiPassword(user, req);
    case 'pengguna_daftar': _wajibAdmin(user); return { ok: true, pengguna: _semuaPengguna().map(_userKeluar) };
    case 'pengguna_simpan': _wajibAdmin(user); return aksiSimpanPengguna(user, req);
    case 'pengguna_hapus': _wajibAdmin(user); return aksiHapusPengguna(user, req);
    case 'password_web': _wajibAdmin(user); return aksiPasswordWeb(user, req);
    case 'bersihkan_ganda': _wajibAdmin(user); return _kunci(() => ({ ok: true, dihapus: _bersihkanGanda(user.username) }));
    case 'diagnosa': _wajibAdmin(user); return aksiDiagnosa();
    case 'log': _wajibAdmin(user); return aksiLog(req);
    default: throw _err('Aksi tidak dikenal: ' + aksi);
  }
}

function aksiMasuk(req) {
  const username = _s(req.username).toLowerCase();
  const password = String(req.password || '');
  if (!username || !password) throw _err('Username dan password wajib diisi.');

  const cache = CacheService.getScriptCache();
  const kunciGagal = 'gagal_' + username;
  const gagal = Number(cache.get(kunciGagal) || 0);
  if (gagal >= 8) throw _err('Terlalu banyak percobaan gagal. Coba lagi 15 menit lagi.');

  const user = _pastikanAdmin().find(u => u.username === username);
  if (!user || user.hash !== _hash(password, user.salt)) {
    cache.put(kunciGagal, String(gagal + 1), 900);
    throw _err('Username atau password salah.');
  }
  if (!user.aktif) throw _err('Akun ini dinonaktifkan oleh admin.');
  cache.remove(kunciGagal);

  const t = _tabel('pengguna');
  t.sh.getRange(user.row, t.kol.login + 1).setValue(new Date());
  _log(user.username, 'Login', _s(req.perangkat));

  return {
    ok: true,
    token: _buatToken(user),
    user: _userKeluar(user),
    serverTime: Date.now(),
    versi: VERSI_SERVER,
    pengaturan: _bacaPengaturan()
  };
}

function aksiGantiPassword(user, req) {
  const lama = String(req.lama || ''), baru = String(req.baru || '');
  if (user.hash !== _hash(lama, user.salt)) throw _err('Password lama salah.');
  if (baru.length < 6) throw _err('Password baru minimal 6 karakter.');
  return _kunci(() => {
    const t = _tabel('pengguna'), k = t.kol;
    const salt = _salt();
    const now = Date.now();
    t.sh.getRange(user.row, k.hash + 1).setValue(_hash(baru, salt));
    t.sh.getRange(user.row, k.salt + 1).setValue(salt);
    t.sh.getRange(user.row, k.wajibGanti + 1).setValue('tidak');
    t.sh.getRange(user.row, k.sesiSejak + 1).setValue(now);
    _cacheBersih();
    _log(user.username, 'Ganti password', '');
    const baruUser = Object.assign({}, user, { sesiSejak: now, wajibGanti: false });
    return { ok: true, token: _buatToken(baruUser), user: _userKeluar(baruUser) };
  });
}

/** Unduh data: siswa, mapel & pengaturan (lengkap) + absen yang berubah sejak `since`. */
function aksiTarik(user, req) {
  return _kunci(() => {
    const since = Number(req.since) || 0;
    const setelah = _s(req.setelah);
    const limit = Math.min(Math.max(Number(req.limit) || KONFIG.BARIS_PER_HALAMAN, 100), 10000);

    // stempel dulu (baris lama tanpa ID/waktu), baru tentukan batas waktu unduhan ini
    const data = _bacaAbsen(true);
    const sampai = Number(req.sampai) || Date.now();
    const cocok = data.list
      .filter(o => o.diubah > since && o.diubah <= sampai && (!setelah || o.uid > setelah))
      .sort((a, b) => (a.uid < b.uid ? -1 : a.uid > b.uid ? 1 : 0));
    const halaman = cocok.slice(0, limit);

    const res = {
      ok: true,
      serverTime: sampai,
      absen: halaman.map(_absenKeluar),
      sisa: Math.max(0, cocok.length - halaman.length),
      more: cocok.length > halaman.length,
      terakhir: halaman.length ? halaman[halaman.length - 1].uid : setelah
    };
    if (!setelah) {
      res.siswa = _semuaSiswa().map(_siswaKeluar);
      res.mapel = _semuaMapel().map(_mapelKeluar);
      res.pengaturan = _bacaPengaturan();
      res.hapus = since > 0 ? _bacaHapus(since) : [];
      res.saya = _userKeluar(user);
      res.totalAbsen = data.list.length;
    }
    return res;
  });
}

/** Kirim perubahan dari HP: absen (semua peran), siswa/mapel/pengaturan (admin). */
function aksiKirim(user, req) {
  return _kunci(() => {
    const out = {
      ok: true,
      diterima: [], digabung: [], ditolak: [],
      siswaDiterima: [], siswaDitolak: [],
      mapelDiterima: [], mapelDitolak: [],
      pengaturan: false
    };
    const adaMaster = (req.siswa && req.siswa.length) || (req.mapel && req.mapel.length) || req.pengaturan;
    if (adaMaster && user.peran !== 'admin') throw _err('Hanya admin yang boleh mengubah data induk.', 'PERAN');

    // Urutan: mapel dulu (agar rename mapel ikut ke absen), lalu siswa, pengaturan, absen.
    if (req.mapel && req.mapel.length) _kirimMapel(user, req.mapel, out);
    if (req.siswa && req.siswa.length) _kirimSiswa(user, req.siswa, out);
    if (req.pengaturan) { _simpanPengaturan(req.pengaturan); out.pengaturan = true; }
    if (req.absen && req.absen.length) _kirimAbsen(user, req.absen, out);

    const ringkas = 'absen ' + out.diterima.length + ' diterima, ' + out.digabung.length + ' digabung, ' + out.ditolak.length +
      ' ditolak; siswa ' + out.siswaDiterima.length + '; mapel ' + out.mapelDiterima.length;
    _log(user.username, 'Kirim data', ringkas + (req.perangkat ? ' (' + _s(req.perangkat) + ')' : ''));
    out.serverTime = Date.now();
    return out;
  });
}

function aksiSimpanPengguna(admin, req) {
  const username = _s(req.username).toLowerCase();
  if (!/^[a-z0-9._-]{3,30}$/.test(username)) throw _err('Username 3–30 huruf kecil/angka (boleh . _ -), tanpa spasi.');
  const nama = _s(req.nama) || username;
  const peran = req.peran === 'admin' ? 'admin' : 'petugas';
  const aktif = req.aktif !== false;
  const password = String(req.password || '');
  if (password && password.length < 6) throw _err('Password minimal 6 karakter.');

  return _kunci(() => {
    const t = _tabel('pengguna'), k = t.kol;
    const semua = _semuaPengguna();
    const ada = semua.find(u => u.username === username);
    const now = Date.now();
    if (!ada) {
      if (!password) throw _err('Password wajib diisi untuk akun baru.');
      const salt = _salt();
      const r = new Array(t.lebar).fill('');
      r[k.username] = username; r[k.nama] = nama; r[k.peran] = peran;
      r[k.hash] = _hash(password, salt); r[k.salt] = salt;
      r[k.aktif] = aktif ? 'ya' : 'tidak'; r[k.wajibGanti] = req.wajibGanti ? 'ya' : 'tidak';
      r[k.dibuat] = new Date(); r[k.sesiSejak] = 0;
      t.sh.getRange(t.sh.getLastRow() + 1, 1, 1, t.lebar).setValues([r]);
      _log(admin.username, 'Tambah akun', username + ' (' + peran + ')');
    } else {
      const adminAktifLain = semua.filter(u => u.peran === 'admin' && u.aktif && u.username !== username).length;
      if ((peran !== 'admin' || !aktif) && ada.peran === 'admin' && adminAktifLain === 0) {
        throw _err('Harus ada minimal satu admin aktif.');
      }
      if (username === admin.username && !aktif) throw _err('Anda tidak bisa menonaktifkan akun sendiri.');
      t.sh.getRange(ada.row, k.nama + 1).setValue(nama);
      t.sh.getRange(ada.row, k.peran + 1).setValue(peran);
      t.sh.getRange(ada.row, k.aktif + 1).setValue(aktif ? 'ya' : 'tidak');
      if (password) {
        const salt = _salt();
        t.sh.getRange(ada.row, k.hash + 1).setValue(_hash(password, salt));
        t.sh.getRange(ada.row, k.salt + 1).setValue(salt);
        t.sh.getRange(ada.row, k.wajibGanti + 1).setValue(req.wajibGanti ? 'ya' : 'tidak');
      }
      if (password || !aktif || peran !== ada.peran) t.sh.getRange(ada.row, k.sesiSejak + 1).setValue(now);
      _log(admin.username, 'Ubah akun', username + (password ? ' (reset password)' : ''));
    }
    _cacheBersih();
    return { ok: true, pengguna: _semuaPengguna().map(_userKeluar) };
  });
}

function aksiHapusPengguna(admin, req) {
  const username = _s(req.username).toLowerCase();
  if (username === admin.username) throw _err('Anda tidak bisa menghapus akun sendiri.');
  return _kunci(() => {
    const semua = _semuaPengguna();
    const u = semua.find(x => x.username === username);
    if (!u) throw _err('Akun tidak ditemukan.');
    if (u.peran === 'admin' && semua.filter(x => x.peran === 'admin' && x.aktif && x.username !== username).length === 0) {
      throw _err('Harus ada minimal satu admin aktif.');
    }
    _tabel('pengguna').sh.deleteRow(u.row);
    _cacheBersih();
    _log(admin.username, 'Hapus akun', username);
    return { ok: true, pengguna: _semuaPengguna().map(_userKeluar) };
  });
}

function aksiPasswordWeb(admin, req) {
  const sh = _sheetPassword();
  const guru = String(req.guru || '').trim(), petugas = String(req.petugas || '').trim();
  if (guru) sh.getRange('A1').setValue(guru);
  if (petugas) sh.getRange('A2').setValue(petugas);
  _log(admin.username, 'Ubah password web', (guru ? 'guru ' : '') + (petugas ? 'petugas' : ''));
  return { ok: true };
}

function aksiDiagnosa() {
  const ss = _ss();
  const info = {};
  Object.keys(STRUKTUR).forEach(j => {
    const t = _tabel(j);
    const kolom = {};
    Object.keys(t.kol).forEach(f => { kolom[f] = _hurufKolom(t.kol[f]); });
    info[j] = { sheet: t.sh.getName(), baris: Math.max(0, t.sh.getLastRow() - 1), kolom: kolom };
  });
  const pw = _passwordLama();
  return {
    ok: true,
    versi: VERSI_SERVER,
    spreadsheet: ss.getName(),
    zonaWaktu: _tz(),
    tabel: info,
    passwordWebGuru: !!pw.guru,
    passwordWebPetugas: !!pw.petugas,
    apiLama: KONFIG.IZINKAN_API_LAMA,
    peringatan: _kodeLamaMasihAda() ? PESAN_KODE_LAMA : ''
  };
}

function aksiLog(req) {
  const t = _tabel('log'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  if (n <= 0) return { ok: true, log: [] };
  const jml = Math.min(n, Math.max(10, Math.min(Number(req.jumlah) || 200, 1000)));
  const vals = t.sh.getRange(t.sh.getLastRow() - jml + 1, 1, jml, t.lebar).getValues();
  const tz = _tz();
  const log = vals.reverse().map(r => ({
    waktu: r[k.waktu] instanceof Date ? Utilities.formatDate(r[k.waktu], tz, 'yyyy-MM-dd HH.mm') : _s(r[k.waktu]),
    pengguna: _s(r[k.pengguna]), aksi: _s(r[k.aksi]), detail: _s(r[k.detail])
  }));
  return { ok: true, log: log };
}

// ---------------------------------------------------------------- kirim: absen
function _kirimAbsen(user, list, out) {
  const data = _bacaAbsen(true);
  const t = data.t;
  const byUid = {}, byKey = {};
  data.list.forEach(o => {
    byUid[o.uid] = o;
    const kk = _kunciAbsen(o);
    if (!byKey[kk]) byKey[kk] = o;
  });

  const now = Date.now();
  const baru = [];
  const dihapus = [];
  let no = _noBerikut(t);

  list.forEach(raw => {
    const a = _absenMasuk(raw);
    if (!a.uid) return;
    const ada = byUid[a.uid];

    if (raw.hapus) {
      if (user.peran !== 'admin') {
        out.ditolak.push({ uid: a.uid, alasan: 'Petugas tidak boleh menghapus absen.', data: ada && !ada._hapus ? _absenKeluar(ada) : null });
        return;
      }
      if (ada && !ada._hapus && !ada._r) {
        ada._hapus = true;
        dihapus.push(ada);
        const kk = _kunciAbsen(ada);
        if (byKey[kk] === ada) delete byKey[kk];
      }
      out.diterima.push(a.uid);
      return;
    }

    if (!a.nis || !a.tanggal || !a.mapel || STATUS_SAH.indexOf(a.status) < 0) {
      out.ditolak.push({ uid: a.uid, alasan: 'Data absen tidak lengkap/tidak sah.', data: null });
      return;
    }

    if (ada && !ada._hapus) {
      if (ada.status === a.status && ada.keterangan === a.keterangan) { out.diterima.push(a.uid); return; }
      if (user.peran !== 'admin') {
        out.ditolak.push({ uid: a.uid, alasan: 'Petugas tidak boleh mengubah absen yang sudah tersimpan.', data: _absenKeluar(ada) });
        return;
      }
      _ubahAbsen(t, ada, a.status, a.keterangan, now);
      out.diterima.push(a.uid);
      return;
    }

    const kk = _kunciAbsen(a);
    const lain = byKey[kk];
    if (lain) {
      // Siswa ini sudah diabsen untuk tanggal & mapel yang sama (mis. dari HP lain).
      // Aturan lama dipertahankan: status "Hadir" diutamakan.
      if (lain.status !== 'Hadir' && a.status === 'Hadir') _ubahAbsen(t, lain, 'Hadir', a.keterangan, now);
      out.digabung.push({ uid: a.uid, ke: lain.uid });
      return;
    }

    a.diubah = now;
    if (!a.petugas) a.petugas = user.username;
    const r = _barisAbsenBaru(t, a, no++);
    baru.push(r);
    const obj = Object.assign({}, a, { _r: r });
    byUid[a.uid] = obj;
    byKey[kk] = obj;
    out.diterima.push(a.uid);
  });

  if (baru.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, baru.length, t.lebar).setValues(baru);
  if (dihapus.length) {
    _hapusBaris(t.sh, dihapus.map(o => o.row));
    _catatHapus('absen', dihapus.map(o => o.uid), user.username, now);
  }
}

// ---------------------------------------------------------------- kirim: siswa
function _kirimSiswa(user, list, out) {
  const t = _tabel('siswa'), k = t.kol;
  const semua = _semuaSiswa();
  const idx = {};
  semua.forEach(s => { idx[s.nis] = s; });
  const now = Date.now();
  const baru = [], hapusRow = [];
  let no = _noBerikut(t);

  list.forEach(s => {
    const nis = _s(s.nis);
    if (!nis) return;
    const ada = idx[nis];
    if (s.hapus) {
      if (ada && ada.row) hapusRow.push(ada.row);
      delete idx[nis];
      out.siswaDiterima.push(nis);
      return;
    }
    const nama = _s(s.nama), kelas = _s(s.kelas);
    if (!nama || !kelas) { out.siswaDitolak.push({ nis: nis, alasan: 'Nama dan kelas wajib diisi.' }); return; }
    const jk = _jk(s.jk), hp = _s(s.hp);
    if (ada && ada.row) {
      if (ada.nama !== nama) t.sh.getRange(ada.row, k.nama + 1).setValue(nama);
      if (ada.kelas !== kelas) t.sh.getRange(ada.row, k.kelas + 1).setValue(kelas);
      if (ada.jk !== jk) t.sh.getRange(ada.row, k.jk + 1).setValue(jk);
      if (ada.hp !== hp) t.sh.getRange(ada.row, k.hp + 1).setValue(hp);
      t.sh.getRange(ada.row, k.diperbarui + 1).setValue(now);
      Object.assign(ada, { nama: nama, kelas: kelas, jk: jk, hp: hp });
    } else if (!ada) {
      const r = new Array(t.lebar).fill('');
      r[k.no] = no++; r[k.nis] = nis; r[k.nama] = nama; r[k.kelas] = kelas; r[k.jk] = jk; r[k.hp] = hp; r[k.diperbarui] = now;
      baru.push(r);
      idx[nis] = { nis: nis, nama: nama, kelas: kelas, jk: jk, hp: hp };
    }
    out.siswaDiterima.push(nis);
  });

  if (baru.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, baru.length, t.lebar).setValues(baru);
  if (hapusRow.length) _hapusBaris(t.sh, hapusRow);
}

// ---------------------------------------------------------------- kirim: mapel
function _kirimMapel(user, list, out) {
  const t = _tabel('mapel'), k = t.kol;
  const semua = _semuaMapel();
  const now = Date.now();
  const baru = [], hapusRow = [];

  list.forEach(m => {
    const id = _s(m.id);
    const nama = _s(m.nama);
    if (!id) return;
    const ada = semua.find(x => x.id === id && !x._hapus);
    if (m.hapus) {
      if (ada && ada.row) { hapusRow.push(ada.row); ada._hapus = true; }
      out.mapelDiterima.push(id);
      return;
    }
    if (!nama) { out.mapelDitolak.push({ id: id, alasan: 'Nama mapel kosong.' }); return; }
    const kembar = semua.find(x => !x._hapus && x.id !== id && x.nama.toLowerCase() === nama.toLowerCase());
    if (kembar) { out.mapelDitolak.push({ id: id, alasan: 'Mapel "' + nama + '" sudah ada.' }); return; }
    if (ada) {
      if (ada.nama !== nama) {
        if (ada.row) {
          t.sh.getRange(ada.row, k.nama + 1).setValue(nama);
          t.sh.getRange(ada.row, k.diperbarui + 1).setValue(now);
        }
        _gantiNamaMapelDiAbsen(ada.nama, nama, now);
        ada.nama = nama;
      }
    } else {
      const r = new Array(t.lebar).fill('');
      r[k.id] = id; r[k.nama] = nama; r[k.diperbarui] = now;
      baru.push(r);
      semua.push({ id: id, nama: nama });
    }
    out.mapelDiterima.push(id);
  });

  if (baru.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, baru.length, t.lebar).setValues(baru);
  if (hapusRow.length) _hapusBaris(t.sh, hapusRow);
}

function _gantiNamaMapelDiAbsen(lama, baru, now) {
  const t = _tabel('absen'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  if (n <= 0 || !lama) return 0;
  const kolMapel = t.sh.getRange(2, k.mapel + 1, n, 1).getValues();
  const kolWaktu = t.sh.getRange(2, k.diperbarui + 1, n, 1).getValues();
  let jml = 0;
  const l = lama.trim().toLowerCase();
  for (let i = 0; i < n; i++) {
    if (_s(kolMapel[i][0]).toLowerCase() === l) { kolMapel[i][0] = baru; kolWaktu[i][0] = now; jml++; }
  }
  if (jml) {
    t.sh.getRange(2, k.mapel + 1, n, 1).setValues(kolMapel);
    t.sh.getRange(2, k.diperbarui + 1, n, 1).setValues(kolWaktu);
  }
  return jml;
}

// ============================================================================
//  API LAMA (aplikasi web index.html & absen-petugas.html) — perilaku dipertahankan
// ============================================================================

function _apiLama(p) {
  const aksi = String(p.action || '');
  if (!KONFIG.IZINKAN_API_LAMA) {
    return { status: 'error', message: 'Aplikasi web lama sudah dinonaktifkan. Gunakan aplikasi Android AbsenQR.' };
  }
  switch (aksi) {
    case 'login': return lamaLogin(p.password, 'guru');
    case 'login_petugas': return lamaLogin(p.password, 'petugas');
    case 'sync': return lamaSync(p.data);
    case 'get_absen': return lamaGetAbsen(p.tanggal);
    case 'update_absen': return lamaUpdateAbsen(p.rowNum, p.status, p.keterangan);
    case 'get_laporan': return lamaGetLaporan(p.tglMulai, p.tglAkhir);
    case 'generate_alpa': return lamaGenerateAlpa(p.tanggal, p.mapel, p.kelas);
    case 'add_siswa_bulk': return lamaTambahSiswa(p.data);
    case 'update_siswa': return lamaUbahSiswa(p);
    case 'delete_siswa': return lamaHapusSiswa(p.nis);
    default: return { status: 'error', message: 'Aksi tidak dikenal.' };
  }
}

function lamaLogin(password, jenis) {
  const pw = _passwordLama();
  const input = String(password || '').trim();
  const benar = jenis === 'guru' ? pw.guru : pw.petugas;
  const asli = jenis === 'guru' ? pw.guruAsli : pw.petugasAsli;
  // sama seperti kode lama: cocokkan teks yang tampil ATAU nilai sel (mis. sel angka 123 untuk "0123")
  // eslint-disable-next-line eqeqeq
  const cocok = !!input && !!benar && (input === benar || input == asli);
  if (!cocok) {
    return { status: 'error', message: jenis === 'guru' ? 'Password Salah!' : 'Password Petugas Salah!' };
  }
  return {
    status: 'success',
    siswa: _semuaSiswa().map(s => ({ nis: s.nis, nama: s.nama, kelas: s.kelas, jk: s.jk })),
    mapel: _semuaMapel().map(m => ({ id: m.idAsli, nama: m.nama }))
  };
}

function lamaSync(dataJson) {
  let arr;
  try { arr = JSON.parse(dataJson || '[]'); } catch (e) { return { status: 'error', message: 'Format data salah.' }; }
  if (!Array.isArray(arr)) arr = [];
  return _kunci(() => {
    const list = arr.map(d => Object.assign({}, d, { uid: Utilities.getUuid(), petugas: d.petugas || 'web' }));
    const out = { diterima: [], digabung: [], ditolak: [] };
    _kirimAbsen({ username: 'web', peran: 'admin' }, list, out);
    _log('web', 'Sync (web lama)', out.diterima.length + ' baru, ' + out.digabung.length + ' sudah ada');
    return { status: 'success', diterima: out.diterima.length, dilewati: out.digabung.length };
  });
}

function lamaGetAbsen(tanggal) {
  const tgl = _tgl(tanggal);
  const data = _bacaAbsen(false).list
    .filter(o => o.tanggal === tgl)
    .map(o => ({ rowNum: o.row, nis: o.nis, nama: o.nama, kelas: o.kelas, tanggal: o.tanggal, jam: o.jam, mapel: o.mapel, status: o.status, keterangan: o.keterangan }));
  return { status: 'success', data: data };
}

function lamaUpdateAbsen(rowNum, status, keterangan) {
  const row = parseInt(rowNum, 10);
  if (!(row >= 2)) return { status: 'error', message: 'Baris tidak valid.' };
  return _kunci(() => {
    const t = _tabel('absen'), k = t.kol;
    if (row > t.sh.getLastRow()) return { status: 'error', message: 'Baris tidak ditemukan.' };
    t.sh.getRange(row, k.status + 1).setValue(_status(status));
    t.sh.getRange(row, k.keterangan + 1).setValue(keterangan || '');
    t.sh.getRange(row, k.diperbarui + 1).setValue(Date.now());
    const sel = t.sh.getRange(row, k.id + 1);
    if (!_s(sel.getValue())) sel.setValue(Utilities.getUuid());
    return { status: 'success' };
  });
}

function lamaGetLaporan(mulai, akhir) {
  const a = _tgl(mulai), b = _tgl(akhir);
  const data = _bacaAbsen(false).list
    .filter(o => o.tanggal && o.tanggal >= a && o.tanggal <= b)
    .map(o => ({ nis: o.nis, nama: o.nama, kelas: o.kelas, tanggal: o.tanggal, jam: o.jam, mapel: o.mapel, status: o.status, keterangan: o.keterangan }));
  return { status: 'success', data: data };
}

function lamaGenerateAlpa(tanggal, mapel, kelas) {
  const m = mapel || 'Pulang';
  const k = kelas || 'SEMUA KELAS';
  const jml = _kunci(() => _buatAlpa(_tgl(tanggal), m, k, 'web'));
  return { status: 'success', message: 'Siswa Alpa (' + k + ') berhasil ditambahkan (' + jml + ' siswa).' };
}

function lamaTambahSiswa(dataJson) {
  let arr;
  try { arr = JSON.parse(dataJson || '[]'); } catch (e) { return { status: 'error', message: 'Format data salah.' }; }
  return _kunci(() => {
    const ada = {};
    _semuaSiswa().forEach(s => { ada[s.nis] = true; });
    const list = [];
    let dilewati = 0;
    arr.forEach(s => {
      const nis = _s(s.nis);
      if (!nis || ada[nis]) { dilewati++; return; }
      ada[nis] = true;
      list.push({ nis: nis, nama: s.nama, kelas: s.kelas, jk: s.jk });
    });
    const out = { siswaDiterima: [], siswaDitolak: [] };
    if (list.length) _kirimSiswa({ username: 'web', peran: 'admin' }, list, out);
    return { status: 'success', ditambahkan: out.siswaDiterima.length, dilewati: dilewati + out.siswaDitolak.length };
  });
}

function lamaUbahSiswa(p) {
  const nis = _s(p.nis);
  return _kunci(() => {
    const s = _semuaSiswa().find(x => x.nis === nis);
    if (!s) return { status: 'error', message: 'NIS ' + nis + ' tidak ditemukan di Spreadsheet.' };
    const out = { siswaDiterima: [], siswaDitolak: [] };
    _kirimSiswa({ username: 'web', peran: 'admin' }, [{ nis: nis, nama: p.nama || '', kelas: p.kelas || '', jk: p.jk, hp: s.hp }], out);
    if (out.siswaDitolak.length) return { status: 'error', message: out.siswaDitolak[0].alasan };
    return { status: 'success' };
  });
}

function lamaHapusSiswa(nisParam) {
  const nis = _s(nisParam);
  return _kunci(() => {
    const s = _semuaSiswa().find(x => x.nis === nis);
    if (!s) return { status: 'error', message: 'NIS ' + nis + ' tidak ditemukan di Spreadsheet.' };
    _tabel('siswa').sh.deleteRow(s.row);
    return { status: 'success' };
  });
}

// ============================================================================
//  FUNGSI YANG BISA DIJALANKAN MANUAL / TRIGGER
// ============================================================================

/** Jalankan sekali setelah memasang kode: membuat sheet & kolom yang dibutuhkan. */
function siapkanSpreadsheet() {
  const ringkas = [];
  Object.keys(STRUKTUR).forEach(j => {
    const t = _tabel(j);
    ringkas.push(t.sh.getName() + ': ' + Math.max(0, t.sh.getLastRow() - 1) + ' baris');
  });
  _bacaPengaturan();
  const pengguna = _pastikanAdmin();
  const absen = _kunci(() => _bacaAbsen(true));
  const pesan = (_kodeLamaMasihAda() ? '⚠️ ' + PESAN_KODE_LAMA + '\n\n' : '') +
    'AbsenQR server v' + VERSI_SERVER + ' siap.\n\n' + ringkas.join('\n') +
    '\n\nAkun: ' + pengguna.map(u => u.username + ' (' + u.peran + ')').join(', ') +
    '\nData absen: ' + absen.list.length + ' baris.';
  Logger.log(pesan);
  try { SpreadsheetApp.getUi().alert(pesan); } catch (e) { /* dijalankan dari editor */ }
  return pesan;
}

/** Dipertahankan dari kode lama (mungkin dipakai trigger harian). */
function jalankanAlpaHariIni() {
  const hariIni = Utilities.formatDate(new Date(), _tz(), 'yyyy-MM-dd');
  _kunci(() => _buatAlpa(hariIni, 'DATANG', 'SEMUA KELAS', 'otomatis'));
}

/** Dipertahankan dari kode lama: hapus data ganda (NIS+Tanggal+Mapel), Hadir diutamakan. */
function bersihkanDataGanda() {
  return _kunci(() => _bersihkanGanda('menu'));
}

/** Atur ulang password akun admin dari menu spreadsheet. */
function resetPasswordAdmin() {
  const ui = SpreadsheetApp.getUi();
  const r1 = ui.prompt('Reset Password Admin', 'Username admin (kosong = admin):', ui.ButtonSet.OK_CANCEL);
  if (r1.getSelectedButton() !== ui.Button.OK) return;
  const username = (_s(r1.getResponseText()) || 'admin').toLowerCase();
  const r2 = ui.prompt('Reset Password Admin', 'Password baru untuk "' + username + '" (min. 6 karakter):', ui.ButtonSet.OK_CANCEL);
  if (r2.getSelectedButton() !== ui.Button.OK) return;
  const pw = String(r2.getResponseText() || '');
  if (pw.length < 6) { ui.alert('Password minimal 6 karakter.'); return; }
  const t = _tabel('pengguna'), k = t.kol;
  const u = _semuaPengguna().find(x => x.username === username);
  const salt = _salt();
  if (u) {
    t.sh.getRange(u.row, k.hash + 1).setValue(_hash(pw, salt));
    t.sh.getRange(u.row, k.salt + 1).setValue(salt);
    t.sh.getRange(u.row, k.peran + 1).setValue('admin');
    t.sh.getRange(u.row, k.aktif + 1).setValue('ya');
    t.sh.getRange(u.row, k.sesiSejak + 1).setValue(Date.now());
  } else {
    t.sh.getRange(t.sh.getLastRow() + 1, 1, 1, t.lebar).setValues([_barisPengguna(t, username, 'Administrator', 'admin', pw, false)]);
  }
  _cacheBersih();
  ui.alert('Password akun "' + username + '" berhasil diatur. Akun ini berperan Admin.');
}

function onOpen() {
  try {
    SpreadsheetApp.getUi().createMenu('AbsenQR')
      .addItem('Siapkan / periksa struktur', 'siapkanSpreadsheet')
      .addItem('Bersihkan data absen ganda', 'bersihkanDataGanda')
      .addItem('Reset password admin', 'resetPasswordAdmin')
      .addToUi();
  } catch (e) { /* abaikan */ }
}

/** Saat sel diedit langsung di spreadsheet, tandai baris agar ikut tersinkron ke HP. */
function onEdit(e) {
  try {
    if (!e || !e.range) return;
    if (e.source) _ss.cache = e.source; // trigger sederhana tidak boleh memakai openById
    const sh = e.range.getSheet();
    const nama = sh.getName().trim().toUpperCase();
    const jenis = nama === 'LAPORAN' ? 'absen' : nama === 'SISWA' ? 'siswa' : nama === 'MAPEL' ? 'mapel' : '';
    if (!jenis) return;
    const t = _tabel(jenis, false);
    if (!t || t.kol.diperbarui == null) return;
    const awal = Math.max(2, e.range.getRow());
    const akhir = e.range.getLastRow();
    if (akhir < awal) return;
    const c1 = e.range.getColumn(), c2 = e.range.getLastColumn();
    if (c1 === c2 && (c1 === t.kol.diperbarui + 1 || (t.kol.id != null && c1 === t.kol.id + 1 && jenis === 'absen'))) return;
    const n = akhir - awal + 1;
    const kunciKol = jenis === 'mapel' ? t.kol.nama : t.kol.nis;
    const isi = sh.getRange(awal, kunciKol + 1, n, 1).getValues();
    const waktu = sh.getRange(awal, t.kol.diperbarui + 1, n, 1).getValues();
    const now = Date.now();
    isi.forEach((r, i) => { if (_s(r[0])) waktu[i][0] = now; });
    sh.getRange(awal, t.kol.diperbarui + 1, n, 1).setValues(waktu);
    if (jenis === 'absen') {
      const ids = sh.getRange(awal, t.kol.id + 1, n, 1).getValues();
      let ubah = false;
      ids.forEach((r, i) => { if (!_s(r[0]) && _s(isi[i][0])) { r[0] = Utilities.getUuid(); ubah = true; } });
      if (ubah) sh.getRange(awal, t.kol.id + 1, n, 1).setValues(ids);
    }
  } catch (err) { /* jangan ganggu pengeditan */ }
}

// ============================================================================
//  ABSEN: BACA / TULIS
// ============================================================================

function _bacaAbsen(stempel) {
  const t = _tabel('absen'), k = t.kol, sh = t.sh;
  const n = sh.getLastRow() - 1;
  const hasil = { t: t, list: [] };
  if (n <= 0) return hasil;
  const vals = sh.getRange(2, 1, n, t.lebar).getValues();
  const jamTampil = sh.getRange(2, k.jam + 1, n, 1).getDisplayValues();
  const tz = _tz();
  const now = Date.now();
  let ubahId = false, ubahWaktu = false;
  for (let i = 0; i < n; i++) {
    const r = vals[i];
    const nis = _s(r[k.nis]);
    if (!nis) continue;
    let uid = _s(r[k.id]);
    let diubah = _n(r[k.diperbarui]);
    if (stempel) {
      if (!uid) { uid = Utilities.getUuid(); r[k.id] = uid; ubahId = true; }
      if (!diubah) { diubah = now; r[k.diperbarui] = now; ubahWaktu = true; }
    }
    hasil.list.push({
      row: i + 2, uid: uid, nis: nis,
      nama: _s(r[k.nama]), kelas: _s(r[k.kelas]),
      tanggal: _tgl(r[k.tanggal], tz), jam: _jam(jamTampil[i][0]),
      mapel: _s(r[k.mapel]), status: _status(r[k.status]),
      keterangan: _s(r[k.keterangan]), petugas: _s(r[k.petugas]),
      diubah: diubah
    });
  }
  if (ubahId) sh.getRange(2, k.id + 1, n, 1).setValues(vals.map(r => [r[k.id]]));
  if (ubahWaktu) sh.getRange(2, k.diperbarui + 1, n, 1).setValues(vals.map(r => [r[k.diperbarui]]));
  return hasil;
}

function _barisAbsenBaru(t, a, no) {
  const k = t.kol;
  const r = new Array(t.lebar).fill('');
  r[k.no] = no;
  r[k.nis] = a.nis;
  r[k.nama] = a.nama;
  r[k.kelas] = a.kelas;
  r[k.tanggal] = a.tanggal;
  r[k.jam] = a.jam ? "'" + a.jam : '';
  r[k.mapel] = a.mapel;
  r[k.status] = a.status;
  r[k.keterangan] = a.keterangan || '';
  r[k.petugas] = a.petugas || '';
  r[k.id] = a.uid;
  r[k.diperbarui] = a.diubah;
  return r;
}

function _ubahAbsen(t, o, status, keterangan, now) {
  const k = t.kol;
  if (o._r) {
    o._r[k.status] = status;
    o._r[k.keterangan] = keterangan || '';
  } else {
    t.sh.getRange(o.row, k.status + 1).setValue(status);
    t.sh.getRange(o.row, k.keterangan + 1).setValue(keterangan || '');
    t.sh.getRange(o.row, k.diperbarui + 1).setValue(now);
  }
  o.status = status;
  o.keterangan = keterangan || '';
  o.diubah = now;
}

function _buatAlpa(tanggal, mapel, kelas, oleh) {
  const data = _bacaAbsen(true);
  const t = data.t;
  const sudah = {};
  const m = _s(mapel).toLowerCase();
  data.list.forEach(o => { if (o.tanggal === tanggal && o.mapel.toLowerCase() === m) sudah[o.nis] = true; });
  const jam = Utilities.formatDate(new Date(), _tz(), 'HH.mm');
  const now = Date.now();
  const semuaKelas = !kelas || kelas === 'SEMUA KELAS' || kelas === 'SEMUA';
  let no = _noBerikut(t);
  const rows = [];
  _semuaSiswa().forEach(s => {
    if (!semuaKelas && s.kelas !== kelas) return;
    if (sudah[s.nis]) return;
    rows.push(_barisAbsenBaru(t, {
      uid: Utilities.getUuid(), nis: s.nis, nama: s.nama, kelas: s.kelas, tanggal: tanggal, jam: jam,
      mapel: mapel, status: 'Alpa', keterangan: '', petugas: oleh, diubah: now
    }, no++));
    sudah[s.nis] = true;
  });
  if (rows.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, rows.length, t.lebar).setValues(rows);
  _log(oleh, 'Proses Alpa', tanggal + ' ' + mapel + ' ' + (kelas || '') + ': ' + rows.length + ' siswa');
  return rows.length;
}

function _bersihkanGanda(oleh) {
  const data = _bacaAbsen(true);
  const pilih = {};
  const buang = [];
  data.list.forEach(o => {
    const kk = _kunciAbsen(o);
    const lama = pilih[kk];
    if (!lama) { pilih[kk] = o; return; }
    // aturan lama: Hadir diutamakan, sesama Hadir pakai yang terbaru
    if (o.status === 'Hadir') { buang.push(lama); pilih[kk] = o; } else { buang.push(o); }
  });
  if (buang.length) {
    _hapusBaris(data.t.sh, buang.map(o => o.row));
    _catatHapus('absen', buang.map(o => o.uid), oleh, Date.now());
    _log(oleh, 'Bersihkan data ganda', buang.length + ' baris dihapus');
  }
  return buang.length;
}

function _absenMasuk(raw) {
  return {
    uid: _s(raw.uid),
    nis: _s(raw.nis),
    nama: _s(raw.nama),
    kelas: _s(raw.kelas),
    tanggal: _tgl(raw.tanggal),
    jam: _jam(raw.jam),
    mapel: _s(raw.mapel),
    status: _status(raw.status),
    keterangan: _s(raw.keterangan),
    petugas: _s(raw.petugas)
  };
}

function _absenKeluar(o) {
  return {
    uid: o.uid, nis: o.nis, nama: o.nama, kelas: o.kelas, tanggal: o.tanggal, jam: o.jam,
    mapel: o.mapel, status: o.status, keterangan: o.keterangan, petugas: o.petugas, diubah: o.diubah
  };
}

function _kunciAbsen(o) {
  return _s(o.nis) + '|' + _s(o.tanggal) + '|' + _s(o.mapel).toLowerCase();
}

function _catatHapus(jenis, ids, oleh, waktu) {
  if (!ids.length) return;
  const t = _tabel('hapus'), k = t.kol;
  const rows = ids.map(id => {
    const r = new Array(t.lebar).fill('');
    r[k.jenis] = jenis; r[k.id] = id; r[k.waktu] = waktu; r[k.oleh] = oleh || '';
    return r;
  });
  t.sh.getRange(t.sh.getLastRow() + 1, 1, rows.length, t.lebar).setValues(rows);
}

function _bacaHapus(since) {
  const t = _tabel('hapus'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  if (n <= 0) return [];
  return t.sh.getRange(2, 1, n, t.lebar).getValues()
    .filter(r => _n(r[k.waktu]) > since && _s(r[k.id]))
    .map(r => ({ jenis: _s(r[k.jenis]), id: _s(r[k.id]) }));
}

// ============================================================================
//  SISWA, MAPEL, PENGATURAN, PENGGUNA
// ============================================================================

function _semuaSiswa() {
  const t = _tabel('siswa'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  if (n <= 0) return [];
  const out = [];
  t.sh.getRange(2, 1, n, t.lebar).getValues().forEach((r, i) => {
    const nis = _s(r[k.nis]);
    if (!nis) return;
    out.push({ row: i + 2, nis: nis, nama: _s(r[k.nama]), kelas: _s(r[k.kelas]), jk: _jk(r[k.jk]), hp: _s(r[k.hp]), diubah: _n(r[k.diperbarui]) });
  });
  return out;
}

function _siswaKeluar(s) {
  return { nis: s.nis, nama: s.nama, kelas: s.kelas, jk: s.jk, hp: s.hp, diubah: s.diubah };
}

function _semuaMapel() {
  const t = _tabel('mapel'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  if (n <= 0) return [];
  const out = [];
  t.sh.getRange(2, 1, n, t.lebar).getValues().forEach((r, i) => {
    const nama = _s(r[k.nama]);
    if (!nama) return;
    const idAsli = r[k.id] === '' || r[k.id] == null ? nama : r[k.id];
    out.push({ row: i + 2, id: _s(idAsli), idAsli: idAsli, nama: nama, urut: i });
  });
  return out;
}

function _mapelKeluar(m) {
  return { id: m.id, nama: m.nama, urut: m.urut };
}

function _bacaPengaturan() {
  const t = _tabel('pengaturan'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  const hasil = {};
  const ada = {};
  if (n > 0) {
    t.sh.getRange(2, 1, n, t.lebar).getDisplayValues().forEach(r => {
      const key = _s(r[k.kunci]);
      if (key) { hasil[key] = _s(r[k.nilai]); ada[key] = true; }
    });
  }
  const kurang = PENGATURAN_AWAL.filter(p => !ada[p[0]]);
  if (kurang.length) {
    const rows = kurang.map(p => {
      const r = new Array(t.lebar).fill('');
      r[k.kunci] = p[0]; r[k.nilai] = p[1]; r[k.ket] = p[2];
      hasil[p[0]] = p[1];
      return r;
    });
    t.sh.getRange(t.sh.getLastRow() + 1, 1, rows.length, t.lebar).setValues(rows);
  }
  return hasil;
}

function _simpanPengaturan(obj) {
  const t = _tabel('pengaturan'), k = t.kol;
  _bacaPengaturan();
  const n = t.sh.getLastRow() - 1;
  const vals = n > 0 ? t.sh.getRange(2, 1, n, t.lebar).getDisplayValues() : [];
  const baris = {};
  vals.forEach((r, i) => { const key = _s(r[k.kunci]); if (key) baris[key] = i + 2; });
  const baru = [];
  Object.keys(obj || {}).forEach(key => {
    if (!/^[a-z_]{2,40}$/.test(key)) return;
    const nilai = _s(obj[key]);
    if (baris[key]) t.sh.getRange(baris[key], k.nilai + 1).setValue(nilai);
    else { const r = new Array(t.lebar).fill(''); r[k.kunci] = key; r[k.nilai] = nilai; baru.push(r); }
  });
  if (baru.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, baru.length, t.lebar).setValues(baru);
}

function _semuaPengguna() {
  const cache = CacheService.getScriptCache();
  const c = cache.get('pengguna_v2');
  if (c) { try { return JSON.parse(c); } catch (e) { /* baca ulang */ } }
  const t = _tabel('pengguna'), k = t.kol;
  const n = t.sh.getLastRow() - 1;
  const tz = _tz();
  const out = [];
  if (n > 0) {
    t.sh.getRange(2, 1, n, t.lebar).getValues().forEach((r, i) => {
      const username = _s(r[k.username]).toLowerCase();
      if (!username) return;
      out.push({
        row: i + 2, username: username, nama: _s(r[k.nama]) || username,
        peran: _s(r[k.peran]).toLowerCase() === 'admin' ? 'admin' : 'petugas',
        hash: _s(r[k.hash]), salt: _s(r[k.salt]),
        aktif: _ya(r[k.aktif], true), wajibGanti: _ya(r[k.wajibGanti], false),
        login: r[k.login] instanceof Date ? Utilities.formatDate(r[k.login], tz, 'yyyy-MM-dd HH.mm') : _s(r[k.login]),
        sesiSejak: _n(r[k.sesiSejak])
      });
    });
  }
  try { cache.put('pengguna_v2', JSON.stringify(out), 60); } catch (e) { /* abaikan */ }
  return out;
}

function _cacheBersih() {
  CacheService.getScriptCache().remove('pengguna_v2');
}

/** Bila belum ada admin, buat akun dari password lama (sheet PASSWORD). */
function _pastikanAdmin() {
  let list = _semuaPengguna();
  if (list.some(u => u.peran === 'admin')) return list;
  return _kunci(() => {
    _cacheBersih();
    list = _semuaPengguna();
    if (list.some(u => u.peran === 'admin')) return list;
    const t = _tabel('pengguna');
    const pw = _passwordLama();
    const rows = [];
    if (!list.some(u => u.username === 'admin')) {
      rows.push(_barisPengguna(t, 'admin', 'Administrator', 'admin', pw.guru || 'admin123', !pw.guru));
    }
    if (pw.petugas && !list.some(u => u.username === 'petugas')) {
      rows.push(_barisPengguna(t, 'petugas', 'Petugas Absen', 'petugas', pw.petugas, false));
    }
    if (rows.length) t.sh.getRange(t.sh.getLastRow() + 1, 1, rows.length, t.lebar).setValues(rows);
    else {
      const u = list.find(x => x.username === 'admin');
      if (u) t.sh.getRange(u.row, t.kol.peran + 1).setValue('admin');
    }
    _cacheBersih();
    _log('sistem', 'Buat akun awal', rows.length + ' akun');
    return _semuaPengguna();
  });
}

function _barisPengguna(t, username, nama, peran, password, wajibGanti) {
  const k = t.kol;
  const salt = _salt();
  const r = new Array(t.lebar).fill('');
  r[k.username] = username; r[k.nama] = nama; r[k.peran] = peran;
  r[k.hash] = _hash(password, salt); r[k.salt] = salt;
  r[k.aktif] = 'ya'; r[k.wajibGanti] = wajibGanti ? 'ya' : 'tidak';
  r[k.dibuat] = new Date(); r[k.sesiSejak] = 0;
  return r;
}

function _userKeluar(u) {
  return { username: u.username, nama: u.nama, peran: u.peran, aktif: u.aktif, wajibGanti: u.wajibGanti, login: u.login || '' };
}

function _wajibAdmin(user) {
  if (user.peran !== 'admin') throw _err('Fitur ini khusus admin.', 'PERAN');
}

function _sheetPassword() {
  const ss = _ss();
  let sh = ss.getSheetByName('PASSWORD');
  if (!sh) sh = ss.insertSheet('PASSWORD');
  return sh;
}

function _passwordLama() {
  const sh = _ss().getSheetByName('PASSWORD');
  if (!sh) return { guru: '', petugas: '' };
  const rng = sh.getRange('A1:A2');
  const v = rng.getDisplayValues();
  const asli = rng.getValues();
  return { guru: _s(v[0][0]), petugas: _s(v[1][0]), guruAsli: asli[0][0], petugasAsli: asli[1][0] };
}

// ============================================================================
//  TOKEN & KEAMANAN
// ============================================================================

function _rahasia() {
  const p = PropertiesService.getScriptProperties();
  let r = p.getProperty('ABSENQR_RAHASIA');
  if (!r) { r = Utilities.getUuid() + Utilities.getUuid(); p.setProperty('ABSENQR_RAHASIA', r); }
  return r;
}

function _buatToken(user) {
  const isi = Utilities.base64EncodeWebSafe(JSON.stringify({ u: user.username, t: Date.now() }));
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(isi, _rahasia()));
  return isi + '.' + sig;
}

function _cekToken(token) {
  const p = String(token || '').split('.');
  if (p.length !== 2) throw _err('Sesi tidak valid. Silakan login ulang.', 'AUTH');
  const sig = Utilities.base64EncodeWebSafe(Utilities.computeHmacSha256Signature(p[0], _rahasia()));
  if (sig !== p[1]) throw _err('Sesi tidak valid. Silakan login ulang.', 'AUTH');
  let isi;
  try { isi = JSON.parse(Utilities.newBlob(Utilities.base64DecodeWebSafe(p[0])).getDataAsString()); } catch (e) { throw _err('Sesi rusak. Silakan login ulang.', 'AUTH'); }
  if (Date.now() - Number(isi.t) > KONFIG.MASA_TOKEN_HARI * 86400000) throw _err('Sesi kedaluwarsa. Silakan login ulang.', 'AUTH');
  const u = _pastikanAdmin().find(x => x.username === isi.u);
  if (!u) throw _err('Akun tidak ditemukan. Silakan login ulang.', 'AUTH');
  if (!u.aktif) throw _err('Akun Anda dinonaktifkan oleh admin.', 'AUTH');
  if (u.sesiSejak && Number(isi.t) < u.sesiSejak) throw _err('Akun Anda diperbarui (password/peran). Silakan login ulang.', 'AUTH');
  return u;
}

function _salt() {
  return Utilities.getUuid().replace(/-/g, '').slice(0, 16);
}

function _hash(password, salt) {
  let h = String(salt) + '|' + String(password);
  for (let i = 0; i < KONFIG.ITERASI_HASH; i++) {
    h = _hex(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, h, Utilities.Charset.UTF_8));
  }
  return h;
}

function _hex(bytes) {
  return bytes.map(b => ('0' + (b & 0xff).toString(16)).slice(-2)).join('');
}

// ============================================================================
//  UTILITAS
// ============================================================================

var _T = {};

function _ss() {
  if (!_ss.cache) {
    try { _ss.cache = SpreadsheetApp.openById(ABSENQR_SHEET_ID); } catch (e) { _ss.cache = SpreadsheetApp.getActiveSpreadsheet(); }
  }
  return _ss.cache;
}

/** Fungsi khas kode lama masih termuat = ada file kode lama di proyek yang harus dihapus. */
function _kodeLamaMasihAda() {
  return typeof kirimDataInduk === 'function' || typeof generateAlpaSiswa === 'function';
}

var PESAN_KODE_LAMA = 'Masih ada file kode LAMA di proyek Apps Script ini. Hapus file tersebut (sisakan hanya kode AbsenQR v2), simpan, lalu Terapkan > Kelola deployment > Edit > Versi baru.';

function _tz() {
  if (!_tz.cache) _tz.cache = _ss().getSpreadsheetTimeZone() || 'Asia/Makassar';
  return _tz.cache;
}

/** Sheet + peta kolom. Kolom tetap memakai posisi lama, kolom tambahan dicari dari judulnya. */
function _tabel(jenis, buat) {
  if (buat === undefined) buat = true;
  if (_T[jenis]) return _T[jenis];
  const def = STRUKTUR[jenis];
  const ss = _ss();
  let sh = ss.getSheetByName(def.nama);
  if (!sh) sh = ss.getSheets().filter(s => s.getName().trim().toUpperCase() === def.nama)[0] || null;
  if (!sh) {
    if (!buat) return null;
    sh = ss.insertSheet(def.nama);
    sh.getRange(1, 1, 1, def.header.length).setValues([def.header]).setFontWeight('bold').setBackground('#e0e7ff');
    sh.setFrozenRows(1);
    def.teks.forEach(f => {
      if (def.tetap[f] != null) sh.getRange(2, def.tetap[f] + 1, Math.max(sh.getMaxRows() - 1, 1), 1).setNumberFormat('@');
    });
  }

  const kol = Object.assign({}, def.tetap);
  const lebarTetap = def.header.length;
  const lastCol = sh.getLastColumn();
  const header = lastCol > 0 ? sh.getRange(1, 1, 1, lastCol).getValues()[0].map(_norm) : [];

  const tambah = [];
  Object.keys(def.tambahan).forEach(f => {
    const cari = _norm(def.tambahan[f]);
    let idx = -1;
    for (let c = lebarTetap; c < header.length; c++) { if (header[c] === cari) { idx = c; break; } }
    if (idx >= 0) kol[f] = idx; else tambah.push(f);
  });

  if (tambah.length || header.length < lebarTetap) {
    if (!buat) return null;
    // isi judul kolom tetap yang masih kosong
    for (let c = 0; c < lebarTetap; c++) {
      if (!header[c]) sh.getRange(1, c + 1).setValue(def.header[c]).setFontWeight('bold');
    }
    if (tambah.length) {
      const mulai = Math.max(sh.getLastColumn(), lebarTetap);
      const perlu = mulai + tambah.length;
      if (sh.getMaxColumns() < perlu) sh.insertColumnsAfter(sh.getMaxColumns(), perlu - sh.getMaxColumns());
      sh.getRange(1, mulai + 1, 1, tambah.length).setValues([tambah.map(f => def.tambahan[f])])
        .setFontWeight('bold').setBackground('#fef3c7');
      tambah.forEach((f, j) => {
        kol[f] = mulai + j;
        const rng = sh.getRange(2, mulai + j + 1, Math.max(sh.getMaxRows() - 1, 1), 1);
        if (f === 'diperbarui') rng.setNumberFormat('0');
        else if (def.teks.indexOf(f) >= 0) rng.setNumberFormat('@');
      });
    }
  }

  let lebar = Math.max(sh.getLastColumn(), lebarTetap);
  Object.keys(kol).forEach(f => { lebar = Math.max(lebar, kol[f] + 1); });
  _T[jenis] = { sh: sh, kol: kol, lebar: lebar };
  return _T[jenis];
}

function _noBerikut(t) {
  const last = t.sh.getLastRow();
  if (last <= 1) return 1;
  const v = Number(t.sh.getRange(last, t.kol.no + 1).getValue());
  return isNaN(v) || !v ? last : v + 1;
}

function _hapusBaris(sh, rows) {
  const unik = Array.from(new Set(rows)).sort((a, b) => b - a);
  let i = 0;
  while (i < unik.length) {
    let akhir = unik[i], awal = akhir;
    while (i + 1 < unik.length && unik[i + 1] === awal - 1) { i++; awal--; }
    sh.deleteRows(awal, akhir - awal + 1);
    i++;
  }
}

function _kunci(fn) {
  const lock = LockService.getScriptLock();
  try {
    lock.waitLock(30000);
  } catch (e) {
    throw _err('Server sedang sibuk melayani HP lain. Coba sinkron lagi sebentar.', 'SIBUK');
  }
  try { return fn(); } finally { lock.releaseLock(); }
}

function _log(pengguna, aksi, detail) {
  try {
    const t = _tabel('log'), k = t.kol;
    const r = new Array(t.lebar).fill('');
    r[k.waktu] = new Date(); r[k.pengguna] = pengguna || ''; r[k.aksi] = aksi; r[k.detail] = String(detail || '').slice(0, 500);
    t.sh.getRange(t.sh.getLastRow() + 1, 1, 1, t.lebar).setValues([r]);
    const n = t.sh.getLastRow() - 1;
    if (n > KONFIG.MAKS_LOG + 500) t.sh.deleteRows(2, n - KONFIG.MAKS_LOG);
  } catch (e) { /* log tidak boleh menggagalkan proses */ }
}

function _json(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}

function _err(pesan, kode) {
  const e = new Error(pesan);
  e.kode = kode || 'ERR';
  return e;
}

function _s(v) {
  return v === null || v === undefined ? '' : String(v).trim();
}

function _n(v) {
  const x = Number(v);
  return isNaN(x) ? 0 : x;
}

function _ya(v, bawaan) {
  const s = _s(v).toLowerCase();
  if (!s) return bawaan;
  return ['ya', 'y', 'yes', 'true', '1', 'aktif'].indexOf(s) >= 0;
}

function _norm(v) {
  return String(v === null || v === undefined ? '' : v).toLowerCase().replace(/[^a-z0-9]/g, '');
}

function _pad(n) {
  return ('0' + n).slice(-2);
}

function _tgl(v, tz) {
  if (v instanceof Date) return Utilities.formatDate(v, tz || _tz(), 'yyyy-MM-dd');
  const s = _s(v);
  let m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (m) return m[1] + '-' + _pad(m[2]) + '-' + _pad(m[3]);
  m = s.match(/^(\d{1,2})[\/.-](\d{1,2})[\/.-](\d{4})/);
  if (m) return m[3] + '-' + _pad(m[2]) + '-' + _pad(m[1]);
  return s;
}

function _jam(v) {
  const s = _s(v);
  if (!s) return '';
  let m = s.match(/(\d{1,2})[:.](\d{1,2})/);
  if (!m) m = s.match(/^(\d{1,2}),(\d{1,2})$/);
  if (!m) return s;
  let mnt = m[2];
  if (mnt.length === 1) mnt = mnt + '0';
  return _pad(Number(m[1])) + '.' + mnt;
}

function _jk(v) {
  const s = _s(v).toUpperCase();
  if (!s) return '';
  if (s === 'L' || s.indexOf('LAKI') === 0 || s === 'PRIA') return 'L';
  if (s === 'P' || s.indexOf('PEREMPUAN') === 0 || s === 'WANITA') return 'P';
  return s.charAt(0);
}

function _status(v) {
  const s = _s(v).toLowerCase();
  if (s === 'hadir' || s === 'h') return 'Hadir';
  if (s === 'sakit' || s === 's') return 'Sakit';
  if (s === 'izin' || s === 'ijin' || s === 'i') return 'Izin';
  if (s === 'alpa' || s === 'alpha' || s === 'alfa' || s === 'a') return 'Alpa';
  return _s(v);
}

function _hurufKolom(i) {
  let s = '', n = i + 1;
  while (n > 0) { const m = (n - 1) % 26; s = String.fromCharCode(65 + m) + s; n = Math.floor((n - 1) / 26); }
  return s;
}
