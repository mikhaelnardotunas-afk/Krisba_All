/**
 * LMS Kelas Digital — Backend Google Apps Script
 * ------------------------------------------------
 * Data disimpan di Spreadsheet tempat script ini dipasang.
 * Langkah: Ekstensi > Apps Script > tempel file ini > Simpan > jalankan fungsi `setup` sekali
 * > Terapkan > Deployment baru > Aplikasi web (Jalankan sebagai: Saya, Akses: Siapa saja).
 */

// Nama sheet & kolom. Jangan ubah urutan kolom setelah data terisi.
const SHEETS = {
  users:      ['Pengguna',    ['id','nama','username','pass','role','kelas','mapel']],
  courses:    ['Kelas',       ['id','nama','kelas','guruId','kode','warna','deskripsi','siswa']],
  materi:     ['Materi',      ['id','courseId','judul','isi','link','img','tgl']],
  tugas:      ['Tugas',       ['id','courseId','judul','instruksi','deadline','poin','tgl']],
  kumpul:     ['Pengumpulan', ['id','tugasId','siswaId','isi','img','link','tgl','nilai','feedback']],
  kuis:       ['Kuis',        ['id','courseId','judul','durasi','buka','acak','tgl','soal']],
  hasil:      ['HasilKuis',   ['id','kuisId','siswaId','skor','benar','jawaban','tgl']],
  diskusi:    ['Diskusi',     ['id','courseId','userId','isi','tgl','balas']],
  pengumuman: ['Pengumuman',  ['id','courseId','userId','judul','isi','tgl']],
  settings:   ['Pengaturan',  ['key','value']]
};
const JSONF = ['siswa','soal','jawaban','balas'];
const NUMF  = ['poin','nilai','durasi','skor','benar'];
const BOOLF = ['buka','acak'];
const SESSION_SECONDS = 21600; // 6 jam (batas maksimal CacheService)

/* ===================== MENU & SETUP ===================== */
function onOpen() {
  SpreadsheetApp.getUi().createMenu('LMS')
    .addItem('Siapkan database', 'setup')
    .addItem('Reset kata sandi admin → admin123', 'resetAdmin')
    .addToUi();
}

function setup() {
  const s = ss();
  Object.keys(SHEETS).forEach(function (k) {
    const name = SHEETS[k][0], head = SHEETS[k][1];
    let sh = s.getSheetByName(name);
    if (!sh) sh = s.insertSheet(name);
    sh.getRange(1, 1, Math.max(sh.getMaxRows(), 2), head.length).setNumberFormat('@');
    sh.getRange(1, 1, 1, head.length).setValues([head])
      .setFontWeight('bold').setBackground('#1d3fbb').setFontColor('#ffffff');
    sh.setFrozenRows(1);
  });
  ['Sheet1', 'Lembar1', 'Sheet 1'].forEach(function (n) {
    const d = s.getSheetByName(n);
    if (d && d.getLastRow() === 0 && s.getSheets().length > 1) s.deleteSheet(d);
  });
  const p = PropertiesService.getScriptProperties();
  if (!p.getProperty('SALT')) p.setProperty('SALT', Utilities.getUuid());
  const db = loadAll();
  if (!db.users.some(function (u) { return u.role === 'admin'; })) {
    db.users.push({ id: uid(), nama: 'Administrator', username: 'admin', pass: hash('admin123'), role: 'admin', kelas: '', mapel: '' });
    writeT('users', db.users);
  }
  if (!db.settings.some(function (r) { return r.key === 'sekolah'; })) {
    db.settings.push({ key: 'sekolah', value: 'Nama Sekolah' });
    writeT('settings', db.settings);
  }
  folder();
  try { SpreadsheetApp.getUi().alert('Database LMS siap.\n\nLogin awal: admin / admin123\nSegera ganti kata sandinya setelah masuk.'); } catch (e) {}
}

function resetAdmin() {
  const db = loadAll();
  const a = db.users.find(function (u) { return u.username === 'admin'; });
  if (a) { a.pass = hash('admin123'); a.role = 'admin'; }
  else db.users.push({ id: uid(), nama: 'Administrator', username: 'admin', pass: hash('admin123'), role: 'admin', kelas: '', mapel: '' });
  writeT('users', db.users);
  try { SpreadsheetApp.getUi().alert('Akun admin: admin / admin123'); } catch (e) {}
}

/* ===================== HTTP ===================== */
function doGet() {
  return json({ ok: true, app: 'LMS Kelas Digital', pesan: 'Backend aktif. Tempel URL ini ke config.js.' });
}

function doPost(e) {
  let out;
  try {
    const q = JSON.parse(e.postData.contents || '{}');
    out = handle(q);
  } catch (err) {
    out = { ok: false, error: String(err && err.message || err) };
  }
  return json(out);
}

function json(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}

function handle(q) {
  const cache = CacheService.getScriptCache();
  if (q.action === 'ping') return { ok: true };

  if (q.action === 'login') {
    const db = loadAll();
    const un = String(q.username || '').trim().toLowerCase();
    const u = db.users.find(function (x) { return String(x.username).toLowerCase() === un; });
    if (!u || u.pass !== hash(String(q.password || ''))) throw new Error('Nama pengguna atau kata sandi salah.');
    const tok = Utilities.getUuid() + Utilities.getUuid();
    cache.put('t_' + tok, u.id, SESSION_SECONDS);
    return { ok: true, token: tok, meId: u.id, db: view(db, u) };
  }

  const myId = q.token ? cache.get('t_' + q.token) : null;
  if (!myId) throw new Error('SESI_HABIS');
  cache.put('t_' + q.token, myId, SESSION_SECONDS); // perpanjang sesi

  if (q.action === 'logout') { cache.remove('t_' + q.token); return { ok: true }; }
  if (q.action === 'sync') {
    const db = loadAll();
    const me = db.users.find(function (u) { return u.id === myId; });
    if (!me) throw new Error('SESI_HABIS');
    return { ok: true, db: view(db, me) };
  }

  const fn = ACT[q.action];
  if (!fn) throw new Error('Aksi tidak dikenal: ' + q.action);
  const lock = LockService.getScriptLock();
  lock.waitLock(25000);
  try {
    const db = loadAll();
    const me = db.users.find(function (u) { return u.id === myId; });
    if (!me) throw new Error('SESI_HABIS');
    const dirty = {};
    const extra = fn(db, me, q.data || {}, dirty) || {};
    Object.keys(dirty).forEach(function (k) { writeT(k, db[k]); });
    SpreadsheetApp.flush();
    const meNow = db.users.find(function (u) { return u.id === myId; }) || me;
    return Object.assign({ ok: true, db: view(db, meNow) }, extra);
  } finally {
    lock.releaseLock();
  }
}

/* ===================== DATA VIEW PER PERAN ===================== */
function view(db, me) {
  const r = me.role;
  const courses = r === 'admin' ? db.courses
    : r === 'guru' ? db.courses.filter(function (c) { return c.guruId === me.id; })
    : db.courses.filter(function (c) { return c.siswa.indexOf(me.id) >= 0; });
  const cid = courses.map(function (c) { return c.id; });
  const inC = function (x) { return cid.indexOf(x.courseId) >= 0; };
  const tugas = db.tugas.filter(inC);
  const tid = tugas.map(function (t) { return t.id; });
  let kumpul = db.kumpul.filter(function (k) { return tid.indexOf(k.tugasId) >= 0; });
  let kuis = db.kuis.filter(inC);
  const qid = kuis.map(function (x) { return x.id; });
  let hasil = db.hasil.filter(function (h) { return qid.indexOf(h.kuisId) >= 0; });
  let users = db.users;

  if (r === 'siswa') {
    kumpul = kumpul.filter(function (k) { return k.siswaId === me.id; });
    hasil = hasil.filter(function (h) { return h.siswaId === me.id; });
    const done = hasil.map(function (h) { return h.kuisId; });
    // kunci jawaban hanya dikirim setelah siswa selesai; soal hanya dikirim saat kuis dibuka
    kuis = kuis.map(function (x) {
      if (done.indexOf(x.id) >= 0) return x;
      const soal = x.buka ? x.soal.map(function (s) { return { t: s.t, o: s.o }; })
        : x.soal.map(function () { return { t: '', o: ['', '', '', ''] }; });
      return Object.assign({}, x, { soal: soal });
    });
    const mates = {};
    courses.forEach(function (c) { c.siswa.forEach(function (s) { mates[s] = 1; }); });
    users = users.filter(function (u) { return u.role !== 'siswa' || mates[u.id]; });
  }
  const pub = users.map(function (u) {
    return { id: u.id, nama: u.nama, role: u.role, kelas: u.kelas, mapel: u.mapel,
      username: (r === 'admin' || u.id === me.id) ? u.username : '' };
  });
  const sek = db.settings.find(function (x) { return x.key === 'sekolah'; });
  return {
    sekolah: sek ? sek.value : 'Nama Sekolah',
    users: pub,
    courses: r === 'siswa' ? courses : courses,
    materi: db.materi.filter(inC),
    tugas: tugas, kumpul: kumpul, kuis: kuis, hasil: hasil,
    diskusi: db.diskusi.filter(inC),
    pengumuman: db.pengumuman.filter(function (p) { return r === 'admin' || !p.courseId || cid.indexOf(p.courseId) >= 0; }),
    sheetUrl: r === 'admin' ? ss().getUrl() : '',
    serverTime: now()
  };
}

/* ===================== AKSI ===================== */
const ACT = {
  /* ----- kelas ----- */
  saveCourse: function (db, me, d, w) {
    need(me, 'guru', 'admin');
    if (!str(d.nama) || !str(d.kelas)) throw new Error('Nama dan kelas wajib diisi.');
    if (d.id) {
      const c = own(db, me, d.id);
      c.nama = str(d.nama); c.kelas = str(d.kelas); c.deskripsi = str(d.deskripsi, 2000); c.warna = color(d.warna);
      if (me.role === 'admin' && d.guruId && isRole(db, d.guruId, 'guru')) c.guruId = d.guruId;
    } else {
      db.courses.push({ id: uid(), nama: str(d.nama), kelas: str(d.kelas), deskripsi: str(d.deskripsi, 2000), warna: color(d.warna),
        guruId: (me.role === 'admin' && d.guruId && isRole(db, d.guruId, 'guru')) ? d.guruId : me.id, kode: kode(db), siswa: [] });
    }
    w.courses = 1;
  },
  delCourse: function (db, me, d, w) {
    own(db, me, d.id);
    const tids = db.tugas.filter(function (t) { return t.courseId === d.id; }).map(function (t) { return t.id; });
    const qids = db.kuis.filter(function (t) { return t.courseId === d.id; }).map(function (t) { return t.id; });
    db.courses = db.courses.filter(function (c) { return c.id !== d.id; });
    ['materi', 'tugas', 'kuis', 'diskusi', 'pengumuman'].forEach(function (k) {
      db[k] = db[k].filter(function (x) { return x.courseId !== d.id; }); w[k] = 1;
    });
    db.kumpul = db.kumpul.filter(function (k) { return tids.indexOf(k.tugasId) < 0; });
    db.hasil = db.hasil.filter(function (h) { return qids.indexOf(h.kuisId) < 0; });
    w.courses = w.kumpul = w.hasil = 1;
  },
  join: function (db, me, d, w) {
    need(me, 'siswa');
    const k = String(d.kode || '').trim().toUpperCase();
    const c = db.courses.find(function (x) { return String(x.kode).toUpperCase() === k; });
    if (!c) throw new Error('Kode kelas tidak ditemukan.');
    if (c.siswa.indexOf(me.id) >= 0) throw new Error('Kamu sudah ada di kelas ini.');
    c.siswa.push(me.id); w.courses = 1;
    return { pesan: 'Berhasil bergabung ke ' + c.nama };
  },
  addMembers: function (db, me, d, w) {
    const c = own(db, me, d.courseId);
    (d.ids || []).forEach(function (id) { if (isRole(db, id, 'siswa') && c.siswa.indexOf(id) < 0) c.siswa.push(id); });
    w.courses = 1;
  },
  rmMember: function (db, me, d, w) {
    const c = own(db, me, d.courseId);
    c.siswa = c.siswa.filter(function (s) { return s !== d.id; }); w.courses = 1;
  },

  /* ----- materi ----- */
  saveMateri: function (db, me, d, w) {
    const ex = d.id ? db.materi.find(function (x) { return x.id === d.id; }) : null;
    own(db, me, ex ? ex.courseId : d.courseId);
    if (!str(d.judul)) throw new Error('Judul wajib diisi.');
    let img = ex ? ex.img : '';
    if (d.img) img = storeImg(d.img);
    if (d.rmimg) img = '';
    const o = { judul: str(d.judul), isi: str(d.isi, 45000), link: url(d.link), img: img };
    if (ex) Object.assign(ex, o);
    else db.materi.push(Object.assign({ id: uid(), courseId: d.courseId, tgl: now() }, o));
    w.materi = 1;
  },
  delMateri: function (db, me, d, w) {
    const x = find(db.materi, d.id); own(db, me, x.courseId);
    db.materi = db.materi.filter(function (m) { return m.id !== d.id; }); w.materi = 1;
  },

  /* ----- tugas ----- */
  saveTugas: function (db, me, d, w) {
    const ex = d.id ? db.tugas.find(function (x) { return x.id === d.id; }) : null;
    own(db, me, ex ? ex.courseId : d.courseId);
    if (!str(d.judul) || !str(d.deadline)) throw new Error('Judul dan tenggat wajib diisi.');
    const o = { judul: str(d.judul), instruksi: str(d.instruksi, 20000), deadline: str(d.deadline).slice(0, 16), poin: Math.max(1, Number(d.poin) || 100) };
    if (ex) Object.assign(ex, o);
    else db.tugas.push(Object.assign({ id: uid(), courseId: d.courseId, tgl: now() }, o));
    w.tugas = 1;
  },
  delTugas: function (db, me, d, w) {
    const t = find(db.tugas, d.id); own(db, me, t.courseId);
    db.tugas = db.tugas.filter(function (x) { return x.id !== d.id; });
    db.kumpul = db.kumpul.filter(function (k) { return k.tugasId !== d.id; });
    w.tugas = w.kumpul = 1;
  },
  submit: function (db, me, d, w) {
    need(me, 'siswa');
    const t = find(db.tugas, d.tugasId);
    member(db, me, t.courseId);
    let k = db.kumpul.find(function (x) { return x.tugasId === t.id && x.siswaId === me.id; });
    if (k && k.nilai !== null && k.nilai !== '') throw new Error('Tugas sudah dinilai, jawaban tidak bisa diubah.');
    let img = k ? k.img : '';
    if (d.img) img = storeImg(d.img);
    const isi = str(d.isi, 20000), link = url(d.link);
    if (!isi && !img && !link) throw new Error('Isi jawaban, foto, atau tautan.');
    const o = { isi: isi, img: img, link: link, tgl: now() };
    if (k) Object.assign(k, o);
    else db.kumpul.push(Object.assign({ id: uid(), tugasId: t.id, siswaId: me.id, nilai: null, feedback: '' }, o));
    w.kumpul = 1;
  },
  grade: function (db, me, d, w) {
    const k = find(db.kumpul, d.id), t = find(db.tugas, k.tugasId);
    own(db, me, t.courseId);
    k.nilai = (d.nilai === '' || d.nilai === null || d.nilai === undefined) ? null : Math.max(0, Math.min(t.poin, Number(d.nilai)));
    k.feedback = str(d.feedback, 3000); w.kumpul = 1;
  },

  /* ----- kuis ----- */
  saveKuis: function (db, me, d, w) {
    const ex = d.id ? db.kuis.find(function (x) { return x.id === d.id; }) : null;
    own(db, me, ex ? ex.courseId : d.courseId);
    const soal = (d.soal || []).map(function (s) {
      return { t: str(s.t, 3000), o: [0, 1, 2, 3].map(function (i) { return str((s.o || [])[i], 1000); }), k: Math.max(0, Math.min(3, Number(s.k) || 0)) };
    }).filter(function (s) { return s.t; });
    if (!str(d.judul) || !soal.length) throw new Error('Isi judul dan minimal 1 soal.');
    if (soal.some(function (s) { return s.o.some(function (o) { return !o; }); })) throw new Error('Lengkapi semua pilihan A–D.');
    const o = { judul: str(d.judul), durasi: Math.max(1, Math.min(300, Number(d.durasi) || 15)), acak: !!d.acak, soal: soal };
    if (ex) Object.assign(ex, o);
    else db.kuis.push(Object.assign({ id: uid(), courseId: d.courseId, buka: false, tgl: now() }, o));
    w.kuis = 1;
  },
  toggleKuis: function (db, me, d, w) {
    const q = find(db.kuis, d.id); own(db, me, q.courseId);
    q.buka = !q.buka; if (q.buka) q.tgl = now(); w.kuis = 1;
  },
  delKuis: function (db, me, d, w) {
    const q = find(db.kuis, d.id); own(db, me, q.courseId);
    db.kuis = db.kuis.filter(function (x) { return x.id !== d.id; });
    db.hasil = db.hasil.filter(function (h) { return h.kuisId !== d.id; });
    w.kuis = w.hasil = 1;
  },
  quizSubmit: function (db, me, d, w) {
    need(me, 'siswa');
    const q = find(db.kuis, d.kuisId);
    member(db, me, q.courseId);
    if (!q.buka) throw new Error('Kuis sudah ditutup oleh guru.');
    if (db.hasil.some(function (h) { return h.kuisId === q.id && h.siswaId === me.id; })) throw new Error('Kuis ini sudah kamu kerjakan.');
    const ans = q.soal.map(function (s, i) { const a = (d.jawaban || [])[i]; return (a === null || a === undefined || a === '') ? null : Number(a); });
    const benar = q.soal.filter(function (s, i) { return ans[i] === s.k; }).length;
    const skor = Math.round(benar / q.soal.length * 100);
    db.hasil.push({ id: uid(), kuisId: q.id, siswaId: me.id, skor: skor, benar: benar, jawaban: ans, tgl: now() });
    w.hasil = 1;
    return { hasil: { skor: skor, benar: benar, total: q.soal.length } };
  },
  quizReset: function (db, me, d, w) {
    const h = find(db.hasil, d.id), q = find(db.kuis, h.kuisId);
    own(db, me, q.courseId);
    db.hasil = db.hasil.filter(function (x) { return x.id !== d.id; }); w.hasil = 1;
  },

  /* ----- diskusi ----- */
  post: function (db, me, d, w) {
    member(db, me, d.courseId);
    const isi = str(d.isi, 5000); if (!isi) throw new Error('Tulis pesan dulu.');
    db.diskusi.push({ id: uid(), courseId: d.courseId, userId: me.id, isi: isi, tgl: now(), balas: [] }); w.diskusi = 1;
  },
  reply: function (db, me, d, w) {
    const x = find(db.diskusi, d.id); member(db, me, x.courseId);
    const isi = str(d.isi, 5000); if (!isi) throw new Error('Tulis balasan dulu.');
    x.balas.push({ userId: me.id, isi: isi, tgl: now() }); w.diskusi = 1;
  },
  delPost: function (db, me, d, w) {
    const x = find(db.diskusi, d.id);
    if (x.userId !== me.id) own(db, me, x.courseId);
    db.diskusi = db.diskusi.filter(function (p) { return p.id !== d.id; }); w.diskusi = 1;
  },

  /* ----- pengumuman ----- */
  savePengumuman: function (db, me, d, w) {
    need(me, 'guru', 'admin');
    if (d.courseId) own(db, me, d.courseId); else need(me, 'admin');
    if (!str(d.judul)) throw new Error('Judul wajib diisi.');
    db.pengumuman.push({ id: uid(), courseId: d.courseId || '', userId: me.id, judul: str(d.judul), isi: str(d.isi, 10000), tgl: now() });
    w.pengumuman = 1;
  },
  delPengumuman: function (db, me, d, w) {
    const p = find(db.pengumuman, d.id);
    if (me.role !== 'admin' && p.userId !== me.id) throw new Error('Tidak diizinkan.');
    db.pengumuman = db.pengumuman.filter(function (x) { return x.id !== d.id; }); w.pengumuman = 1;
  },

  /* ----- pengguna ----- */
  saveUser: function (db, me, d, w) {
    need(me, 'admin');
    const un = String(d.username || '').trim().toLowerCase();
    if (!str(d.nama) || !un) throw new Error('Nama dan username wajib diisi.');
    if (['admin', 'guru', 'siswa'].indexOf(d.role) < 0) throw new Error('Peran tidak valid.');
    const ex = d.id ? find(db.users, d.id) : null;
    if (db.users.some(function (u) { return String(u.username).toLowerCase() === un && u !== ex; })) throw new Error('Username sudah dipakai.');
    if (ex && ex.id === me.id && d.role !== 'admin') throw new Error('Anda tidak bisa menurunkan peran akun sendiri.');
    const o = { nama: str(d.nama), username: un, role: d.role, kelas: d.role === 'siswa' ? str(d.extra) : '', mapel: d.role === 'guru' ? str(d.extra) : '' };
    if (d.pass) { if (String(d.pass).length < 6) throw new Error('Kata sandi minimal 6 karakter.'); o.pass = hash(String(d.pass)); }
    if (ex) Object.assign(ex, o);
    else { if (!d.pass) throw new Error('Kata sandi wajib untuk akun baru.'); db.users.push(Object.assign({ id: uid() }, o)); }
    w.users = 1;
  },
  delUser: function (db, me, d, w) {
    need(me, 'admin');
    if (d.id === me.id) throw new Error('Tidak bisa menghapus akun sendiri.');
    db.users = db.users.filter(function (u) { return u.id !== d.id; });
    db.courses.forEach(function (c) { c.siswa = c.siswa.filter(function (s) { return s !== d.id; }); });
    db.kumpul = db.kumpul.filter(function (k) { return k.siswaId !== d.id; });
    db.hasil = db.hasil.filter(function (h) { return h.siswaId !== d.id; });
    w.users = w.courses = w.kumpul = w.hasil = 1;
  },
  bulkUsers: function (db, me, d, w) {
    need(me, 'admin');
    let n = 0;
    const def = hash('siswa123');
    (d.rows || []).forEach(function (r) {
      const nama = str(r[0]); if (!nama) return;
      let base = String(r[2] || nama.split(' ')[0]).toLowerCase().replace(/[^a-z0-9.]/g, '') || 'siswa', un = base, i = 2;
      while (db.users.some(function (u) { return u.username === un; })) un = base + (i++);
      db.users.push({ id: uid(), nama: nama, username: un, pass: def, role: 'siswa', kelas: str(r[1]), mapel: '' }); n++;
    });
    w.users = 1;
    return { pesan: n + ' siswa diimpor (kata sandi awal: siswa123)' };
  },
  changePw: function (db, me, d, w) {
    if (me.pass !== hash(String(d.old || ''))) throw new Error('Kata sandi lama salah.');
    if (String(d.baru || '').length < 6) throw new Error('Kata sandi baru minimal 6 karakter.');
    me.pass = hash(String(d.baru)); w.users = 1;
  },
  setSekolah: function (db, me, d, w) {
    need(me, 'admin');
    const r = db.settings.find(function (x) { return x.key === 'sekolah'; });
    if (r) r.value = str(d.nama); else db.settings.push({ key: 'sekolah', value: str(d.nama) });
    w.settings = 1;
  }
};

/* ===================== PENYIMPANAN ===================== */
function ss() { return SpreadsheetApp.getActiveSpreadsheet(); }

function loadAll() {
  const db = {};
  Object.keys(SHEETS).forEach(function (k) { db[k] = loadT(k); });
  return db;
}

function loadT(k) {
  const sh = ss().getSheetByName(SHEETS[k][0]);
  if (!sh) throw new Error('Sheet "' + SHEETS[k][0] + '" belum ada. Jalankan menu LMS > Siapkan database.');
  const v = sh.getDataRange().getDisplayValues();
  const h = v.shift() || [];
  return v.filter(function (r) { return r[0] !== ''; }).map(function (r) {
    const o = {};
    h.forEach(function (key, i) {
      let x = r[i];
      if (JSONF.indexOf(key) >= 0) { try { x = x ? JSON.parse(x) : []; } catch (e) { x = []; } }
      else if (NUMF.indexOf(key) >= 0) x = x === '' ? null : Number(x);
      else if (BOOLF.indexOf(key) >= 0) x = String(x).toUpperCase() === 'TRUE';
      o[key] = x;
    });
    return o;
  });
}

function writeT(k, rows) {
  const sh = ss().getSheetByName(SHEETS[k][0]);
  const h = SHEETS[k][1];
  const last = sh.getLastRow();
  if (last > 1) sh.getRange(2, 1, last - 1, h.length).clearContent();
  if (!rows.length) return;
  const vals = rows.map(function (o) {
    return h.map(function (key) {
      const x = o[key];
      if (JSONF.indexOf(key) >= 0) return JSON.stringify(x || []);
      if (BOOLF.indexOf(key) >= 0) return x ? 'TRUE' : 'FALSE';
      if (x === null || x === undefined) return '';
      return String(x);
    });
  });
  sh.getRange(2, 1, vals.length, h.length).setNumberFormat('@').setValues(vals);
}

/* ===================== GAMBAR → GOOGLE DRIVE ===================== */
function folder() {
  const p = PropertiesService.getScriptProperties();
  let id = p.getProperty('FOLDER_ID');
  if (id) { try { return DriveApp.getFolderById(id); } catch (e) {} }
  const f = DriveApp.createFolder('LMS Kelas Digital - Lampiran');
  p.setProperty('FOLDER_ID', f.getId());
  return f;
}

function storeImg(v) {
  v = String(v || '');
  if (/^https:\/\//.test(v)) return v;
  const m = v.match(/^data:(image\/(png|jpeg|jpg|webp|gif));base64,(.+)$/);
  if (!m) throw new Error('Format gambar tidak didukung.');
  if (m[3].length > 4 * 1024 * 1024) throw new Error('Gambar terlalu besar (maks. ±3 MB).');
  const blob = Utilities.newBlob(Utilities.base64Decode(m[3]), m[1], 'img_' + Date.now() + '.' + (m[2] === 'jpeg' ? 'jpg' : m[2]));
  const file = folder().createFile(blob);
  try { file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW); } catch (e) {}
  return 'https://drive.google.com/thumbnail?id=' + file.getId() + '&sz=w1200';
}

/* ===================== BANTUAN ===================== */
function uid() { return Utilities.getUuid().replace(/-/g, '').slice(0, 12); }
function now() { return Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd'T'HH:mm"); }
function hash(s) {
  const salt = PropertiesService.getScriptProperties().getProperty('SALT') || '';
  return Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, salt + '|' + s, Utilities.Charset.UTF_8)
    .map(function (b) { return ('0' + (b & 255).toString(16)).slice(-2); }).join('');
}
function str(v, max) { return String(v === null || v === undefined ? '' : v).trim().slice(0, max || 300); }
function url(v) { v = str(v, 2000); return /^https?:\/\//i.test(v) ? v : ''; }
function color(v) { return /^#[0-9a-f]{6}$/i.test(v || '') ? v : '#1d3fbb'; }
function need(me) { const roles = [].slice.call(arguments, 1); if (roles.indexOf(me.role) < 0) throw new Error('Tidak diizinkan.'); }
function isRole(db, id, role) { return db.users.some(function (u) { return u.id === id && u.role === role; }); }
function find(arr, id) { const x = arr.find(function (a) { return a.id === id; }); if (!x) throw new Error('Data tidak ditemukan (mungkin sudah dihapus).'); return x; }
function own(db, me, courseId) {
  const c = find(db.courses, courseId);
  if (me.role !== 'admin' && !(me.role === 'guru' && c.guruId === me.id)) throw new Error('Tidak diizinkan.');
  return c;
}
function member(db, me, courseId) {
  const c = find(db.courses, courseId);
  if (c.siswa.indexOf(me.id) >= 0 || me.role === 'admin' || c.guruId === me.id) return c;
  throw new Error('Kamu bukan anggota kelas ini.');
}
function kode(db) {
  const ch = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let k;
  do { k = ''; for (let i = 0; i < 6; i++) k += ch[Math.floor(Math.random() * ch.length)]; }
  while (db.courses.some(function (c) { return c.kode === k; }));
  return k;
}
