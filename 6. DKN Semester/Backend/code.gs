/**
 * SIPAS - Sistem Informasi Penilaian Akademik Sekolah
 * Backend Google Apps Script + Google Spreadsheet (file hasil build, jangan diedit langsung).
 * Sumber: gas/src/*.js. Dibuat: 2026-11-03T06:07:26.202Z
 *
 * Pemasangan singkat: tempel seluruh isi file ini ke Code.gs, jalankan setupSheets() sekali,
 * lalu Terapkan > Deployment baru > Aplikasi web (Jalankan sebagai: Saya, Akses: Siapa saja).
 */


/* ---------- Pengaturan bawaan (dari src/lib/settings.js) ---------- */

const DEFAULT_SETTINGS = {
  // Identitas & kop
  yayasan: 'YAYASAN DS.A.Z.WENAS',
  bidang: 'BIDANG PENDIDIKAN DAN PERSEKOLAHAN',
  nama_sekolah: 'SMP KRISTEN 65 BASAAN',
  npsn: '',
  alamat: 'Jl. Raya Belang Ratatotok, Desa Basaan I Kec. Ratatotok',
  telepon: '',
  email: '',
  website: '',
  nama_sekolah_raport: 'SMP Kristen Basaan',
  alamat_raport: 'Desa Basaan Satu',
  kepala_sekolah: 'INGGRID KAREPOWAN, S.Pd',
  nip_kepala_sekolah: '197405182008032001',
  logo_kiri: '',          // data URL; kosong = assets/logo_left.png
  logo_kanan: '',         // data URL; kosong = assets/logo_right.png
  ttd_kepsek: '',         // data URL gambar tanda tangan
  stempel: '',
  // Perhitungan
  kktp_umum: '75',
  desimal_tampil: '2',
  peringkat_aktif: '1',
  dasar_peringkat: 'jumlah',  // jumlah | rata
  // Rapor
  format_raport: 'kementerian',  // semester | mendalam | kementerian | mid
  tema_raport: 'default',
  ukuran_kertas_raport: 'F4',    // A4 | F4
  mode_keterampilan: 'sama',     // sama | terpisah
  judul_raport: 'PENCAPAIAN KOMPETENSI PESERTA DIDIK',
  judul_kementerian: 'LAPORAN HASIL BELAJAR',
  judul_laporan: 'LAPORAN HASIL UJIAN TENGAH SEMESTER',
  subjudul: '(SUMATIF / MID SEMESTER)',
  tampilkan_keterangan: '1',
  tampilkan_qr: '1',
  tampilkan_keputusan: '1',
  tampilkan_hadir: '1',
  tampilkan_kop: '1',
  tampilkan_peringkat_raport: '1',
  format_nomor_raport: '{NO}/RPT/{KELAS}/{TAHUN}',
  mode_deskripsi: 'template',   // template | otomatis | manual
  format_deskripsi: '{NAMA} {KATA} dalam {DIKUASAI}. dan Perlu Ditingkatkan {DITINGKATKAN}.',
  format_deskripsi_kementerian: 'Menunjukkan penguasaan yang {KATA_KECIL} dalam {DIKUASAI}. Perlu penguatan dalam {DITINGKATKAN}.',
  sikap_spiritual_predikat: 'Baik',
  sikap_spiritual_deskripsi: 'Sering memberi salam pada saat awal dan akhir kegiatan, menjalankan ibadah sesuai dengan agamanya dan sikap bersyukur atas nikmat dan karunia Tuhan Yang Maha Esa mulai meningkat',
  sikap_sosial_predikat: 'Baik',
  sikap_sosial_deskripsi: 'Melaksanakan dengan baik dalam sikap jujur, disiplin, tanggung jawab, santun, peduli, percaya diri, kerja sama,',
  ekskul_deskripsi_default: '{NILAI}, Aktif dalam mengikuti berbagai Kegiatan ekstra kurikuler yang di adakan sekolah terutama kegiatan Ekskul {EKSKUL}',
  keputusan_default: 'Berdasarkan Hasil yang telah dicapai, maka peserta didik dinyatakan\nTUNTAS dan NAIK KE KELAS SELANJUTNYA',
  // Kokurikuler
  kokurikuler_kegiatan: 'Kegiatan Kokurikuler',
  opsi_nilai_kokurikuler: 'Sangat Baik, Baik, Cukup, Kurang',
  kokurikuler_dimensi: 'keimanan dan ketakwaan terhadap Tuhan Yang Maha Esa\nkewargaan\npenalaran kritis\nkreativitas\nkolaborasi\nkemandirian\nkesehatan\nkomunikasi',
  format_kokurikuler: 'Ananda {NAMA} sudah {NILAI_KECIL} dalam {KUAT}. Ananda masih perlu berlatih dalam {LEMAH}.',
  opsi_nilai_ekskul: 'Sangat Baik, Baik, Cukup, Kurang',
  // Isian wali kelas di aplikasi guru
  wali_kehadiran: '1',
  wali_kokurikuler: '1',
  wali_ekskul: '1',
  wali_catatan: '1',
  wali_sikap: '0',
  hari_efektif: '',
  // Halaman cek nilai siswa
  cek_nilai_aktif: '0',
  cek_nilai_ranking: '1',
  cek_nilai_verifikasi: 'nisn',  // none | nisn | tgl_lahir
  // Notifikasi
  hari_pengingat: '3'
};

const PUBLIC_KEYS = ['nama_sekolah', 'alamat', 'logo_kiri', 'cek_nilai_aktif'];

/* ---------- Data awal (dari src/lib/seed.js) ---------- */

// Data awal opsional (diambil dari aplikasi E-Raport lama): mapel, bank deskripsi, predikat, ekskul.

const SEED_SUBJECTS = [
  ['PAK', 'Pendidikan Agama Kristen', 'A', 75], ['PKN', 'Pendidikan Kewarganegaraan', 'A', 75],
  ['BIND', 'Bahasa Indonesia', 'A', 70], ['BING', 'Bahasa Inggris', 'A', 70], ['MTK', 'Matematika', 'A', 70],
  ['IPA', 'Ilmu Pengetahuan Alam', 'A', 70], ['IPS', 'Ilmu Pengetahuan Sosial', 'A', 70],
  ['PRAK', 'Prakarya / Seni', 'B', 75], ['INF', 'Informatika', 'B', 75], ['PJOK', 'PJOK', 'B', 75],
  ['AKOR', 'Mulok - Anti Korupsi', 'B', 75], ['BDAE', 'Mulok - Bahasa Daerah', 'B', 75]
];

const SEED_BANK = {
  PAK: ['Menjelaskan karya keselamatan Allah melalui Yesus Kristus', 'Memahami karya keselamatan Allah dalam sejarah bangsa Israel',
    'Menjelaskan makna Allah sebagai Pencipta dan Pemelihara', 'Menerapkan nilai-nilai kasih dalam kehidupan sehari-hari',
    'Menjelaskan peran Roh Kudus dalam kehidupan orang percaya'],
  PKN: ['Menampilkan hasil wawancara/survei tentang toleransi', 'Menjelaskan jenis-jenis norma (agama, hukum, adat, dsb)',
    'Menjelaskan nilai-nilai Pancasila dalam kehidupan sehari-hari', 'Menganalisis hak dan kewajiban sebagai warga negara',
    'Menjelaskan makna Bhinneka Tunggal Ika'],
  BIND: ['Menyusun ringkasan teks naratif atau eksplanasi', 'Menyusun teks prosedur dengan langkah-langkah yang sistematis',
    'Menemukan gagasan utama dalam teks bacaan', 'Menulis teks deskripsi dengan kalimat yang efektif',
    'Menyampaikan pendapat secara lisan dengan santun'],
  BING: ['Memahami instruksi lisan dan tertulis sederhana dalam konteks kelas/sekolah',
    'Mengidentifikasi struktur teks dan unsur kebahasaan dalam teks prosedur sederhana (how to…)',
    'Memperkenalkan diri dan orang lain dalam bahasa Inggris', 'Menulis teks deskriptif sederhana tentang orang, benda, atau tempat',
    'Menggunakan kosakata sehari-hari dengan tepat'],
  MTK: ['Mengurutkan bilangan berdasarkan nilai mutlak dan posisi di garis bilangan', 'Menghitung luas dan keliling bangun datar',
    'Menyelesaikan operasi hitung bilangan bulat dan pecahan', 'Menyelesaikan persamaan dan pertidaksamaan linear satu variabel',
    'Menyajikan dan menafsirkan data dalam bentuk tabel dan diagram'],
  IPA: ['Menjelaskan struktur dan fungsi organ pada sistem pencernaan manusia', 'Menyebutkan besaran pokok dan satuannya dalam Sistem Internasional',
    'Mengklasifikasikan makhluk hidup berdasarkan ciri-cirinya', 'Menjelaskan perubahan wujud zat dalam kehidupan sehari-hari',
    'Melakukan pengukuran dengan alat ukur yang tepat'],
  IPS: ['Menjelaskan kondisi geologis dan astronomis wilayah Indonesia', 'Menyajikan garis waktu perkembangan kerajaan-kerajaan di Indonesia',
    'Menjelaskan interaksi sosial dalam kehidupan bermasyarakat', 'Menjelaskan kegiatan ekonomi produksi, distribusi, dan konsumsi',
    'Membaca dan menafsirkan peta wilayah Indonesia'],
  PRAK: ['Menjelaskan prinsip kerja teknologi sederhana (alat penjernih air, rangkaian listrik, dll.)',
    'Menjelaskan teknik dasar pembuatan kerajinan dari bahan alam', 'Merancang dan membuat produk kerajinan dari bahan limbah',
    'Mengapresiasi karya seni rupa daerah setempat', 'Mempresentasikan hasil karya dengan percaya diri'],
  INF: ['Menjelaskan konsep dasar jaringan komputer dan fungsi internet', 'Menyajikan data sederhana dalam bentuk tabel dan grafik',
    'Menerapkan berpikir komputasional dalam menyelesaikan masalah', 'Menggunakan aplikasi pengolah kata dan angka dengan baik',
    'Menerapkan etika dan keamanan dalam bermedia digital'],
  PJOK: ['Menjelaskan pentingnya pemanasan dan pendinginan sebelum dan setelah berolahraga',
    'Menerapkan pola hidup sehat dengan cara menjaga kebugaran fisik melalui aktivitas olahraga',
    'Mempraktikkan teknik dasar permainan bola besar', 'Mempraktikkan gerak dasar atletik (lari, lompat, lempar)',
    'Menunjukkan sikap sportif dan kerja sama dalam permainan'],
  AKOR: ['Menjelaskan pengertian dan bentuk-bentuk perilaku korupsi', 'Menerapkan nilai kejujuran dan tanggung jawab di lingkungan sekolah',
    'Menjelaskan dampak korupsi bagi masyarakat dan negara', 'Menunjukkan sikap disiplin dan sederhana dalam kehidupan sehari-hari'],
  BDAE: ['Menggunakan kosakata bahasa daerah dalam percakapan sehari-hari', 'Memahami cerita rakyat daerah setempat',
    'Menyanyikan lagu daerah dengan lafal yang tepat', 'Menulis kalimat sederhana dalam bahasa daerah']
};

// Skala predikat umum: A 90-100, B 80-89, C 70-79, D < 70
const SEED_SCALES = [
  ['A', 90, 100, 'Sangat Baik', '{NAMA} menunjukkan penguasaan yang sangat baik pada seluruh capaian pembelajaran {MAPEL}.'],
  ['B', 80, 89.99, 'Baik', '{NAMA} menunjukkan penguasaan yang baik pada sebagian besar capaian pembelajaran {MAPEL}.'],
  ['C', 70, 79.99, 'Cukup', '{NAMA} menunjukkan penguasaan yang cukup pada capaian pembelajaran {MAPEL} dan perlu terus berlatih.'],
  ['D', 0, 69.99, 'Perlu Bimbingan', '{NAMA} perlu bimbingan untuk mencapai capaian pembelajaran {MAPEL}.']
];

const SEED_EKSKUL = ['OSIS', 'IBADAH', 'Pramuka'];


/* ---------- Predikat & deskripsi (dari public/js/shared/describe.js) ---------- */

// Predikat, kalimat deskripsi capaian, kokurikuler & ekskul.
// Modul murni (tanpa DOM) - dipakai frontend dan backend (halaman cek nilai).
// Pola kalimat sama dengan aplikasi E-Raport lama ({NAMA} {KATA} {DIKUASAI} {DITINGKATKAN} ...).

function trimDot(s) {
  return String(s || '').trim().replace(/[.\s]+$/, '');
}

function listKoma(v) {
  return String(v === null || v === undefined ? '' : v).split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
}

function listBaris(v) {
  return String(v === null || v === undefined ? '' : v).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// scales: [{predicate, min_score, max_score, label, description, subject_id}]
function scalesFor(allScales, subjectId) {
  const own = allScales.filter(g => g.subject_id && g.subject_id === subjectId);
  return (own.length ? own : allScales.filter(g => !g.subject_id)).slice().sort((a, b) => b.min_score - a.min_score);
}

function predicateOf(score, scales) {
  if (score === null || score === undefined || score === '' || isNaN(score)) return null;
  const v = Number(score);
  const sorted = scales.slice().sort((a, b) => b.min_score - a.min_score);
  return sorted.find(g => v >= g.min_score) || sorted[sorted.length - 1] || null;
}

// Buang kalimat pola yang penandanya kosong
function dropSentences(tpl, missing) {
  if (!missing.length) return tpl;
  return (tpl.match(/[^.]+(\.|$)/g) || [tpl]).filter(s => !missing.some(m => s.indexOf(m) >= 0)).join('');
}

function fill(tpl, map) {
  let out = tpl;
  for (const [k, v] of Object.entries(map)) out = out.split('{' + k + '}').join(v === null || v === undefined ? '' : v);
  return out.replace(/\s+/g, ' ').trim();
}

function buildFromTemplate(tpl, { nama = '', mapel = '', score, mastered, improve, scales }) {
  if (!mastered && !improve) return '';
  const g = predicateOf(score, scales) || { predicate: 'B', label: 'Baik' };
  if (!improve) tpl = tpl.replace(/[.\s]*dan Perlu Ditingkatkan \{DITINGKATKAN\}\.?/i, '.');
  if (!mastered) tpl = tpl.replace(/\{KATA\} dalam \{DIKUASAI\}[.\s]*dan /i, '');
  tpl = dropSentences(tpl, [!mastered && '{DIKUASAI}', !improve && '{DITINGKATKAN}'].filter(Boolean));
  const kata = g.label || '';
  return fill(tpl, {
    NAMA: nama, MAPEL: mapel, KATA: kata, KATA_KECIL: kata.toLowerCase(), PREDIKAT: g.predicate,
    DIKUASAI: trimDot(mastered), DITINGKATKAN: trimDot(improve)
  });
}

function autoDescription({ nama = '', mapel = '', score, scales }) {
  const g = predicateOf(score, scales);
  if (!g || !g.description) return '';
  const kata = g.label || '';
  return fill(g.description, { NAMA: nama, MAPEL: mapel, KATA: kata, KATA_KECIL: kata.toLowerCase(), PREDIKAT: g.predicate });
}

/**
 * Deskripsi capaian 1 mapel.
 * mode: template (manual > bank/template > otomatis) | otomatis (manual > otomatis) | manual
 * style: 'semester' (pakai nama siswa) | 'kementerian' (tanpa nama)
 */
function describe({ settings, nama, mapel, score, comment, scales, style = 'semester' }) {
  comment = comment || {};
  const mode = settings.mode_deskripsi || 'template';
  if (comment.custom_text) return comment.custom_text;
  if (mode === 'manual') return '';
  const n = style === 'kementerian' ? '' : nama;
  if (mode === 'template' && (comment.mastered || comment.improve)) {
    const tpl = style === 'kementerian'
      ? (settings.format_deskripsi_kementerian || 'Menunjukkan penguasaan yang {KATA_KECIL} dalam {DIKUASAI}. Perlu penguatan dalam {DITINGKATKAN}.')
      : (settings.format_deskripsi || '{NAMA} {KATA} dalam {DIKUASAI}. dan Perlu Ditingkatkan {DITINGKATKAN}.');
    return buildFromTemplate(tpl, { nama: n, mapel, score, mastered: comment.mastered, improve: comment.improve, scales });
  }
  if (score === null || score === undefined) return '';
  return autoDescription({ nama: n || 'Ananda', mapel, score, scales });
}

// Deskripsi kokurikuler: teks tulis sendiri atau disusun dari dimensi kuat & perlu penguatan
function buildKokurikuler(nama, card, settings) {
  card = card || {};
  const isi = t => fill(String(t || ''), {
    NAMA: nama || '', NILAI: card.cocurricular_grade || '', NILAI_KECIL: String(card.cocurricular_grade || 'baik').toLowerCase(),
    KEGIATAN: settings.kokurikuler_kegiatan || '', KUAT: trimDot(card.cocurricular_strong), LEMAH: trimDot(card.cocurricular_weak)
  });
  if (card.cocurricular_desc) return isi(card.cocurricular_desc);
  if (!card.cocurricular_strong && !card.cocurricular_weak) return '';
  const tpl = settings.format_kokurikuler || 'Ananda {NAMA} sudah {NILAI_KECIL} dalam {KUAT}. Ananda masih perlu berlatih dalam {LEMAH}.';
  return isi(dropSentences(tpl, [!card.cocurricular_strong && '{KUAT}', !card.cocurricular_weak && '{LEMAH}'].filter(Boolean)));
}

function ekskulDescription(e, settings) {
  if (e.description) return e.description;
  const nilai = e.grade || 'Baik';
  return String(settings.ekskul_deskripsi_default || '').split('{EKSKUL}').join(e.name || '').split('{NILAI}').join(nilai);
}

function faseOf(grade) {
  const t = parseInt(grade, 10);
  if (!t) return '';
  if (t <= 2) return 'A';
  if (t <= 4) return 'B';
  if (t <= 6) return 'C';
  if (t <= 9) return 'D';
  return t === 10 ? 'E' : 'F';
}

function romawi(n) {
  return { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' }[parseInt(n, 10)] || String(n || '');
}

function semesterAngka(term, name) {
  return Number(term) === 2 ? '2 (Genap)' : Number(term) === 1 ? '1 (Ganjil)' : String(name || '');
}

// Peringkat dengan nilai sama -> peringkat sama
function rankRows(rows, basis = 'jumlah') {
  const key = basis === 'rata' ? 'average' : 'total';
  const sorted = rows.filter(r => r.count > 0).sort((a, b) => (b[key] - a[key]) || (b.total - a.total) || (b.average - a.average));
  let rank = 0;
  sorted.forEach((r, i) => {
    const p = sorted[i - 1];
    if (!(p && p[key] === r[key] && p.total === r.total && p.average === r.average)) rank = i + 1;
    r.rank = rank;
  });
  rows.filter(r => !r.count).forEach(r => { r.rank = null; });
  return rows;
}

function round(v, d = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const f = Math.pow(10, d);
  return Math.round(Number((v * f).toPrecision(12))) / f;
}


/* =====================================================================
   SIPAS - Backend Google Apps Script + Google Spreadsheet
   Lapisan data: setiap tabel = satu sheet (baris 1 = nama kolom).
   - Data dibaca sekali per permintaan lalu disimpan di memori.
   - Semua perubahan dibuffer dan ditulis sekaligus (flush) di akhir permintaan
     yang berhasil, sehingga permintaan yang gagal tidak meninggalkan data setengah jadi.
   ===================================================================== */

// Tipe kolom: s = teks, n = angka, j = JSON (objek)
var SCHEMA = {
  school_settings: { key: 'key', cols: 'key,value,updated_at' },
  teachers: { cols: 'id,nip,nuptk,name,gender,phone,email,active:n,created_at,updated_at' },
  users: { cols: 'id,username,password_hash,role,teacher_id,full_name,active:n,must_change_password:n,last_login_at,created_at,updated_at' },
  sessions: { cols: 'id,user_id,expires_at,created_at' },
  academic_years: { cols: 'id,name,start_date,end_date,is_active:n,created_at' },
  semesters: { cols: 'id,academic_year_id,term:n,name,start_date,end_date,is_active:n,report_place,report_date,report_assessment_type_id,skill_assessment_type_id,mid_assessment_type_id' },
  classes: { cols: 'id,academic_year_id,name,grade_level:n,report_label,homeroom_teacher_id,sort_order:n,created_at' },
  students: { cols: 'id,nis,nisn,name,gender,birth_place,birth_date,religion,address,parent_name,parent_phone,status,created_at,updated_at' },
  student_class_history: { cols: 'id,student_id,class_id,academic_year_id,roll_no:n,note,created_at' },
  subjects: { cols: 'id,code,name,group_name,kktp:n,sort_order:n,active:n,created_at' },
  teacher_subjects: { cols: 'id,teacher_id,subject_id' },
  teacher_assignments: { cols: 'id,teacher_id,subject_id,class_id,semester_id,created_at' },
  assessment_types: { cols: 'id,semester_id,name,code,kind,description,start_date,end_date,active:n,input_open:n,decimals:n,rounding,require_complete:n,sort_order:n,copied_from,created_by,created_at,updated_at' },
  assessment_categories: { cols: 'id,assessment_type_id,name,code,weight:n,required:n,source_type,sort_order:n,created_at' },
  assessment_category_sources: { cols: 'id,category_id,source_assessment_type_id,source_category_id,sync_mode,only_locked:n,last_synced_at,last_synced_by' },
  assessments: { cols: 'id,assessment_type_id,subject_id,class_id,status,submitted_at,submitted_by,locked_at,locked_by,return_note,snapshot_version:n,updated_at' },
  // 1 baris = 1 siswa pada 1 lembar nilai; nilai tiap kategori disimpan sebagai JSON {category_id: nilai}
  student_scores: { cols: 'id,assessment_id,student_id,values_json:j,origins_json:j,updated_by,updated_at' },
  score_revisions: { cols: 'id,assessment_id,category_id,student_id,old_score:n,new_score:n,changed_by,changed_name,role,created_at' },
  score_snapshots: { cols: 'id,assessment_id,student_id,version:n,components_json,final_score:n,complete:n,locked_at,locked_by' },
  grade_scales: { cols: 'id,subject_id,predicate,min_score:n,max_score:n,label,description,sort_order:n' },
  description_bank: { cols: 'id,subject_id,grade_level,text,created_by,created_at,updated_at' },
  teacher_comments: { cols: 'id,student_id,semester_id,subject_id,teacher_id,mastered,improve,custom_text,updated_by,updated_at' },
  report_cards: { cols: 'id,student_id,semester_id,spiritual_pred,spiritual_desc,social_pred,social_desc,cocurricular_grade,cocurricular_strong,cocurricular_weak,cocurricular_desc,homeroom_note,parent_response,decision,report_number,status,finalized_at,finalized_by,updated_by,updated_at' },
  attendance: { cols: 'id,student_id,semester_id,present:n,sick:n,permit:n,absent:n,updated_by,updated_at' },
  extracurriculars: { cols: 'id,name,description,active:n,sort_order:n' },
  student_extracurriculars: { cols: 'id,student_id,semester_id,extracurricular_id,grade,description,updated_at' },
  report_pickups: { cols: 'id,student_id,semester_id,status,picked_at,picker_name,relation,phone,note,officer,updated_at' },
  notifications: { cols: 'id,user_id,role,title,body,link,created_at' },
  notification_reads: { cols: 'id,notification_id,user_id,read_at' },
  audit_logs: { cols: 'id,user_id,username,role,action,entity,entity_id,detail,before_json,after_json,created_at' },
  backups: { cols: 'id,kind,note,size_bytes:n,tables_json,created_by,created_at' }
};
var TABLE_NAMES = Object.keys(SCHEMA);
var MAX_CELL = 49000; // batas 50.000 karakter per sel Google Sheets

(function () {
  TABLE_NAMES.forEach(function (n) {
    var meta = SCHEMA[n];
    meta.key = meta.key || 'id';
    meta.columns = meta.cols.split(',').map(function (c) { var p = c.split(':'); return { name: p[0], type: p[1] || 's' }; });
    meta.names = meta.columns.map(function (c) { return c.name; });
  });
})();

function uuid() { return Utilities.getUuid(); }
function nowIso() { return new Date().toISOString(); }

function spreadsheet() {
  var id = PropertiesService.getScriptProperties().getProperty('SPREADSHEET_ID');
  return id ? SpreadsheetApp.openById(id) : SpreadsheetApp.getActiveSpreadsheet();
}

function Table(name) {
  if (!SCHEMA[name]) throw new Error('Tabel tidak dikenal: ' + name);
  this.name = name;
  this.meta = SCHEMA[name];
  this._rows = null;
  this._idx = {};
  this._dirty = [];      // baris lama yang berubah
  this._new = [];        // baris baru
  this._removed = 0;     // jumlah baris dihapus
  this._sheet = null;
}

Table.prototype.sheet = function () {
  if (this._sheet) return this._sheet;
  var ss = spreadsheet();
  var sh = ss.getSheetByName(this.name);
  if (!sh) sh = createSheet(ss, this.name);
  this._sheet = sh;
  return sh;
};

function createSheet(ss, name) {
  var meta = SCHEMA[name];
  var sh = ss.insertSheet(name);
  sh.getRange(1, 1, 1, meta.names.length).setValues([meta.names]).setFontWeight('bold').setBackground('#102a4c').setFontColor('#ffffff');
  sh.setFrozenRows(1);
  // kolom teks diformat "teks biasa" agar NISN berawalan 0 & tanggal tidak diubah Google Sheets
  meta.columns.forEach(function (c, i) {
    if (c.type !== 'n') sh.getRange(1, i + 1, sh.getMaxRows(), 1).setNumberFormat('@');
  });
  return sh;
}

function pad2(n) { return (n < 10 ? '0' : '') + n; }

function fromCell(v, type) {
  if (v === '' || v === null || v === undefined) return null;
  // sel yang terlanjur diubah Google Sheets menjadi tanggal (mis. diketik manual)
  if (v instanceof Date) {
    v = v.getHours() === 0 && v.getMinutes() === 0 && v.getSeconds() === 0
      ? v.getFullYear() + '-' + pad2(v.getMonth() + 1) + '-' + pad2(v.getDate()) : v.toISOString();
  }
  if (type === 'n') { var n = Number(v); return isNaN(n) ? null : n; }
  if (type === 'j') { try { return JSON.parse(v); } catch (e) { return {}; } }
  return String(v);
}

function toCell(v, type) {
  if (v === null || v === undefined) return '';
  if (type === 'j') return JSON.stringify(v);
  if (type === 'n') return Number(v);
  var s = typeof v === 'object' ? JSON.stringify(v) : String(v);
  if (s.length > MAX_CELL) s = s.slice(0, MAX_CELL);
  // teks berawalan "=" jangan sampai dibaca sebagai rumus
  return s.charAt(0) === '=' ? "'" + s : s;
}

// Format sel per kolom: teks biasa (@) untuk kolom teks, umum untuk angka
Table.prototype.formats = function (n) {
  var row = this.meta.columns.map(function (c) { return c.type === 'n' ? 'General' : '@'; });
  var out = [];
  for (var i = 0; i < n; i++) out.push(row);
  return out;
};

Table.prototype.load = function () {
  if (this._rows) return this._rows;
  var sh = this.sheet();
  var last = sh.getLastRow();
  var meta = this.meta;
  var rows = [];
  if (last >= 2) {
    var width = Math.max(sh.getLastColumn(), 1);
    var values = sh.getRange(1, 1, last, width).getValues();
    var header = values[0].map(String);
    var pos = meta.columns.map(function (c) { return header.indexOf(c.name); });
    for (var i = 1; i < values.length; i++) {
      var r = values[i];
      var o = {};
      var empty = true;
      for (var j = 0; j < meta.columns.length; j++) {
        var c = meta.columns[j];
        var v = pos[j] >= 0 ? fromCell(r[pos[j]], c.type) : null;
        if (v !== null) empty = false;
        o[c.name] = v;
      }
      if (empty) continue;
      Object.defineProperty(o, '_r', { value: i + 1, writable: true, enumerable: false });
      rows.push(o);
    }
    this._header = header;
  }
  this._rows = rows;
  return rows;
};

Table.prototype.rows = function () { return this.load(); };
Table.prototype.filter = function (fn) { return this.load().filter(fn); };
Table.prototype.find = function (fn) { return this.load().find(fn) || null; };
Table.prototype.count = function () { return this.load().length; };

// Indeks berdasarkan kolom (dibangun saat dibutuhkan, dihapus saat data berubah)
Table.prototype.index = function (field) {
  if (!this._idx[field]) {
    var m = new Map();
    this.load().forEach(function (r) {
      var k = r[field];
      if (!m.has(k)) m.set(k, []);
      m.get(k).push(r);
    });
    this._idx[field] = m;
  }
  return this._idx[field];
};
Table.prototype.where = function (field, value) { return (this.index(field).get(value) || []).slice(); };
Table.prototype.one = function (field, value) { var l = this.index(field).get(value); return l && l.length ? l[0] : null; };
Table.prototype.get = function (id) { return id === null || id === undefined ? null : this.one(this.meta.key, String(id)); };

Table.prototype.insert = function (obj) {
  this.load();
  var row = {};
  var meta = this.meta;
  meta.columns.forEach(function (c) { row[c.name] = obj[c.name] === undefined ? null : obj[c.name]; });
  if (!row[meta.key]) row[meta.key] = uuid();
  if (meta.names.indexOf('created_at') >= 0 && !row.created_at) row.created_at = nowIso();
  Object.defineProperty(row, '_r', { value: null, writable: true, enumerable: false });
  this._rows.push(row);
  this._new.push(row);
  this._idx = {};
  return row;
};

Table.prototype.update = function (row, patch) {
  var changed = false;
  for (var k in patch) {
    if (!Object.prototype.hasOwnProperty.call(patch, k) || this.meta.names.indexOf(k) < 0) continue;
    var v = patch[k] === undefined ? null : patch[k];
    if (row[k] !== v) { row[k] = v; changed = true; }
  }
  if (changed) {
    if (row._r && this._dirty.indexOf(row) < 0) this._dirty.push(row);
    this._idx = {};
  }
  return row;
};

Table.prototype.remove = function (row) {
  var rows = this.load();
  var i = rows.indexOf(row);
  if (i < 0) return false;
  rows.splice(i, 1);
  var ni = this._new.indexOf(row);
  if (ni >= 0) this._new.splice(ni, 1); else this._removed++;
  this._idx = {};
  return true;
};

Table.prototype.removeWhere = function (fn) {
  var self = this;
  var del = this.load().filter(fn);
  del.forEach(function (r) { self.remove(r); });
  return del.length;
};

Table.prototype.clearAll = function () {
  this.load();
  this._removed += this._rows.length - this._new.length;
  this._rows = [];
  this._new = [];
  this._dirty = [];
  this._idx = {};
};

Table.prototype.rowValues = function (row) {
  return this.meta.columns.map(function (c) { return toCell(row[c.name], c.type); });
};

// Tulis perubahan ke sheet
Table.prototype.flush = function () {
  if (!this._rows) return;
  if (!this._dirty.length && !this._new.length && !this._removed) return;
  var sh = this.sheet();
  var self = this;
  var width = this.meta.names.length;
  var headerOk = this._header && this.meta.names.every(function (n, i) { return self._header[i] === n; });
  if (this._removed || !headerOk) {
    // tulis ulang seluruh tabel (penghapusan / struktur kolom lama)
    var last = sh.getLastRow();
    var lastCol = Math.max(sh.getLastColumn(), width);
    if (last > 1) sh.getRange(2, 1, last - 1, lastCol).clearContent();
    sh.getRange(1, 1, 1, width).setValues([this.meta.names]);
    if (this._rows.length) {
      var rng = sh.getRange(2, 1, this._rows.length, width);
      rng.setNumberFormats(this.formats(this._rows.length));
      rng.setValues(this._rows.map(function (r) { return self.rowValues(r); }));
    }
    this._rows.forEach(function (r, i) { r._r = i + 2; });
    this._header = this.meta.names.slice();
  } else {
    // ubah baris yang berubah, dikelompokkan per blok baris berurutan
    var dirty = this._dirty.slice().sort(function (a, b) { return a._r - b._r; });
    var i = 0;
    while (i < dirty.length) {
      var j = i;
      while (j + 1 < dirty.length && dirty[j + 1]._r === dirty[j]._r + 1) j++;
      var block = dirty.slice(i, j + 1);
      sh.getRange(block[0]._r, 1, block.length, width).setValues(block.map(function (r) { return self.rowValues(r); }));
      i = j + 1;
    }
    if (this._new.length) {
      var start = Math.max(sh.getLastRow(), 1) + 1;
      var nr = sh.getRange(start, 1, this._new.length, width);
      nr.setNumberFormats(this.formats(this._new.length));
      nr.setValues(this._new.map(function (r) { return self.rowValues(r); }));
      this._new.forEach(function (r, k) { r._r = start + k; });
    }
  }
  this._dirty = [];
  this._new = [];
  this._removed = 0;
};

// ---------- Basis data per permintaan ----------
var DB = {
  tables: {},
  reset: function () { this.tables = {}; },
  t: function (name) {
    if (!this.tables[name]) this.tables[name] = new Table(name);
    return this.tables[name];
  },
  flush: function () {
    var self = this;
    TABLE_NAMES.forEach(function (n) { if (self.tables[n]) self.tables[n].flush(); });
  }
};
function T(name) { return DB.t(name); }

function groupBy(rows, fn) {
  var m = new Map();
  rows.forEach(function (r) { var k = typeof fn === 'function' ? fn(r) : r[fn]; if (!m.has(k)) m.set(k, []); m.get(k).push(r); });
  return m;
}
function pick(row, fields) { var o = {}; fields.forEach(function (f) { o[f] = row[f]; }); return o; }
function copyRow(r) { return r ? Object.assign({}, r) : null; }
function sortBy(arr, fns) {
  return arr.sort(function (a, b) {
    for (var i = 0; i < fns.length; i++) {
      var x = fns[i](a), y = fns[i](b);
      if (x === y) continue;
      if (x === null || x === undefined) return 1;
      if (y === null || y === undefined) return -1;
      return typeof x === 'number' && typeof y === 'number' ? x - y : String(x).localeCompare(String(y));
    }
    return 0;
  });
}

// Fungsi untuk dijalankan sekali dari editor Apps Script: membuat semua sheet
function setupSheets() {
  var ss = spreadsheet();
  TABLE_NAMES.forEach(function (n) { if (!ss.getSheetByName(n)) createSheet(ss, n); });
  var def = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1') || ss.getSheetByName('Lembar 1');
  if (def && def.getLastRow() === 0 && ss.getSheets().length > 1) ss.deleteSheet(def);
  return 'Sheet database SIPAS siap (' + TABLE_NAMES.length + ' tabel).';
}


/* ---------- Galat, validasi, audit, pengaturan ---------- */

function HttpError(status, message, details) {
  this.status = status;
  this.message = message;
  this.details = details || null;
}
HttpError.prototype = Object.create(Error.prototype);
function bad(msg, details) { return new HttpError(400, msg, details); }
function forbidden(msg) { return new HttpError(403, msg || 'Anda tidak memiliki akses untuk tindakan ini'); }
function notFound(msg) { return new HttpError(404, msg || 'Data tidak ditemukan'); }
function conflict(msg, details) { return new HttpError(409, msg, details); }

var DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function convertField(name, v, rule) {
  var label = rule.label || name;
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) {
    if (rule.required) throw bad(label + ' wajib diisi');
    return rule.default !== undefined ? rule.default : null;
  }
  var s, n;
  switch (rule.type) {
    case 'string':
      s = String(v).trim();
      if (rule.max && s.length > rule.max) throw bad(label + ' maksimal ' + rule.max + ' karakter');
      if (rule.pattern && !rule.pattern.test(s)) throw bad(label + ' tidak valid');
      return rule.upper ? s.toUpperCase() : s;
    case 'text':
      s = String(v);
      if (s.length > (rule.max || 5000)) throw bad(label + ' terlalu panjang');
      return s.trim();
    case 'int':
      n = Number(v);
      if (!Number.isInteger(n)) throw bad(label + ' harus bilangan bulat');
      if (rule.min !== undefined && n < rule.min) throw bad(label + ' minimal ' + rule.min);
      if (rule.max !== undefined && n > rule.max) throw bad(label + ' maksimal ' + rule.max);
      return n;
    case 'number':
      n = typeof v === 'number' ? v : Number(String(v).replace(',', '.'));
      if (!isFinite(n)) throw bad(label + ' harus berupa angka');
      if (rule.min !== undefined && n < rule.min) throw bad(label + ' minimal ' + rule.min);
      if (rule.max !== undefined && n > rule.max) throw bad(label + ' maksimal ' + rule.max);
      return n;
    case 'bool':
      return v === true || v === 1 || v === '1' || v === 'true' || v === 'Y' || v === 'y' || v === 'ya' ? 1 : 0;
    case 'date':
      s = String(v).trim().slice(0, 10);
      if (!DATE_RE.test(s) || isNaN(new Date(s))) throw bad(label + ' harus berformat tanggal (YYYY-MM-DD)');
      return s;
    case 'enum':
      s = String(v).trim();
      if (rule.values.indexOf(s) < 0) throw bad(label + ' harus salah satu dari: ' + rule.values.join(', '));
      return s;
    case 'id':
      s = String(v).trim();
      if (!/^[A-Za-z0-9_-]{1,64}$/.test(s)) throw bad(label + ' tidak valid');
      return s;
  }
  throw new Error('tipe validasi tidak dikenal: ' + rule.type);
}

function clean(input, spec, opts) {
  var partial = opts && opts.partial;
  input = input || {};
  var out = {};
  Object.keys(spec).forEach(function (name) {
    var rule = spec[name];
    if (partial && !(name in input)) return;
    var r = partial ? Object.assign({}, rule, { default: undefined, required: rule.required && (name in input) }) : rule;
    out[name] = convertField(name, input[name], r);
  });
  return out;
}

function requireId(v, label) { label = label || 'ID'; return convertField(label, v, { type: 'id', required: true, label: label }); }
function optId(v, label) { label = label || 'ID'; return convertField(label, v, { type: 'id', label: label }); }
function arr(v, label) { if (!Array.isArray(v)) throw bad((label || 'Data') + ' harus berupa daftar'); return v; }

function parseScore(v) {
  if (v === undefined || v === null || (typeof v === 'string' && v.trim() === '')) return null;
  var n = typeof v === 'number' ? v : Number(String(v).trim().replace(',', '.'));
  if (!isFinite(n)) throw bad('Nilai "' + v + '" bukan angka');
  if (n < 0 || n > 100) throw bad('Nilai ' + n + ' di luar rentang 0-100');
  return Math.round(n * 100) / 100;
}

var ROMAN = { 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' };

// ---------- Audit ----------
function jsonOrNull(v) {
  if (v === undefined || v === null) return null;
  var s = JSON.stringify(v);
  return s.length > 20000 ? s.slice(0, 20000) : s;
}

function audit(ctx, action, o) {
  o = o || {};
  var u = ctx.user || {};
  T('audit_logs').insert({
    user_id: u.id || null, username: u.username || null, role: u.role || null, action: action,
    entity: o.entity || null, entity_id: o.entityId || null, detail: o.detail ? String(o.detail).slice(0, 1000) : null,
    before_json: jsonOrNull(o.before), after_json: jsonOrNull(o.after)
  });
}

// Riwayat dibatasi agar spreadsheet tidak melampaui batas sel
function trimLogs() {
  var lim = [['audit_logs', 8000, 6000], ['notifications', 1500, 1000], ['notification_reads', 6000, 4000]];
  lim.forEach(function (x) {
    var t = T(x[0]);
    if (t.count() > x[1]) {
      var keep = sortBy(t.rows().slice(), [function (r) { return r.created_at || r.read_at || ''; }]).slice(-x[2]);
      var set = new Set(keep);
      t.removeWhere(function (r) { return !set.has(r); });
    }
  });
}

// ---------- Pengaturan sekolah ----------
// Nilai panjang (gambar logo/tanda tangan) dipecah ke beberapa sel: kunci#0, kunci#1, ...
function getSettings() {
  var map = {};
  T('school_settings').rows().forEach(function (r) { map[r.key] = r.value === null ? '' : r.value; });
  var out = Object.assign({}, DEFAULT_SETTINGS);
  Object.keys(map).forEach(function (k) {
    if (k.indexOf('#') >= 0) return;
    var v = map[k];
    var m = /^@@chunks:(\d+)$/.exec(v);
    if (m) { var s = ''; for (var i = 0; i < Number(m[1]); i++) s += map[k + '#' + i] || ''; v = s; }
    out[k] = v;
  });
  return out;
}

function saveSettingsPatch(patch) {
  var t = T('school_settings');
  var now = nowIso();
  var put = function (k, v) {
    var r = t.get(k);
    if (r) t.update(r, { value: v, updated_at: now }); else t.insert({ key: k, value: v, updated_at: now });
  };
  Object.keys(patch).forEach(function (k) {
    var v = patch[k] === null || patch[k] === undefined ? '' : String(patch[k]);
    t.removeWhere(function (r) { return r.key.indexOf(k + '#') === 0; });
    if (v.length > 45000) {
      var n = Math.ceil(v.length / 45000);
      for (var i = 0; i < n; i++) put(k + '#' + i, v.slice(i * 45000, (i + 1) * 45000));
      put(k, '@@chunks:' + n);
    } else put(k, v);
  });
}

function truthy(v) { return v === true || v === 1 || v === '1' || v === 'true' || v === 'Y'; }


/* ---------- Autentikasi: PBKDF2-HMAC-SHA256, token sesi, pembatasan percobaan login ---------- */

// Format hash sama dengan versi Cloudflare: pbkdf2$<iterasi>$<garam>$<hash> (PBKDF2-HMAC-SHA256, 256 bit),
// sehingga akun tetap dapat login setelah data dipindah antar-backend.
var PW_ITERATIONS = 20000;
var SESSION_HOURS = 12;

function toBytes(s) { return Utilities.newBlob(String(s)).getBytes(); }   // byte bertanda (-128..127)
function signedBytes(u) { return u.map(function (b) { return b > 127 ? b - 256 : b; }); }
function b64(bytes) { return Utilities.base64EncodeWebSafe(signedBytes(bytes.map(function (b) { return b & 255; }))).replace(/=+$/, ''); }
function fromB64(s) { var p = s.length % 4 ? '===='.slice(s.length % 4) : ''; return Utilities.base64DecodeWebSafe(s + p).map(function (b) { return b & 255; }); }

// ---- SHA-256 / HMAC / PBKDF2 murni JavaScript (dioptimalkan untuk PBKDF2) ----
var SHA_K = [0x428a2f98, 0x71374491, 0xb5c0fbcf, 0xe9b5dba5, 0x3956c25b, 0x59f111f1, 0x923f82a4, 0xab1c5ed5, 0xd807aa98, 0x12835b01, 0x243185be, 0x550c7dc3,
  0x72be5d74, 0x80deb1fe, 0x9bdc06a7, 0xc19bf174, 0xe49b69c1, 0xefbe4786, 0x0fc19dc6, 0x240ca1cc, 0x2de92c6f, 0x4a7484aa, 0x5cb0a9dc, 0x76f988da,
  0x983e5152, 0xa831c66d, 0xb00327c8, 0xbf597fc7, 0xc6e00bf3, 0xd5a79147, 0x06ca6351, 0x14292967, 0x27b70a85, 0x2e1b2138, 0x4d2c6dfc, 0x53380d13,
  0x650a7354, 0x766a0abb, 0x81c2c92e, 0x92722c85, 0xa2bfe8a1, 0xa81a664b, 0xc24b8b70, 0xc76c51a3, 0xd192e819, 0xd6990624, 0xf40e3585, 0x106aa070,
  0x19a4c116, 0x1e376c08, 0x2748774c, 0x34b0bcb5, 0x391c0cb3, 0x4ed8aa4a, 0x5b9cca4f, 0x682e6ff3, 0x748f82ee, 0x78a5636f, 0x84c87814, 0x8cc70208,
  0x90befffa, 0xa4506ceb, 0xbef9a3f7, 0xc67178f2];
var SHA_H0 = [0x6a09e667, 0xbb67ae85, 0x3c6ef372, 0xa54ff53a, 0x510e527f, 0x9b05688c, 0x1f83d9ab, 0x5be0cd19];
var SHA_W = new Int32Array(64);

// state (8 kata) + blok 16 kata -> state baru
function shaCompress(st, blk) {
  var w = SHA_W, i, a, b, c, d, e, f, g, h, t1, t2, x, y;
  for (i = 0; i < 16; i++) w[i] = blk[i] | 0;
  for (i = 16; i < 64; i++) {
    x = w[i - 15]; y = w[i - 2];
    w[i] = (((x >>> 7) | (x << 25)) ^ ((x >>> 18) | (x << 14)) ^ (x >>> 3)) + w[i - 7] + (((y >>> 17) | (y << 15)) ^ ((y >>> 19) | (y << 13)) ^ (y >>> 10)) + w[i - 16] | 0;
  }
  a = st[0]; b = st[1]; c = st[2]; d = st[3]; e = st[4]; f = st[5]; g = st[6]; h = st[7];
  for (i = 0; i < 64; i++) {
    t1 = h + (((e >>> 6) | (e << 26)) ^ ((e >>> 11) | (e << 21)) ^ ((e >>> 25) | (e << 7))) + ((e & f) ^ (~e & g)) + SHA_K[i] + w[i] | 0;
    t2 = (((a >>> 2) | (a << 30)) ^ ((a >>> 13) | (a << 19)) ^ ((a >>> 22) | (a << 10))) + ((a & b) ^ (a & c) ^ (b & c)) | 0;
    h = g; g = f; f = e; e = d + t1 | 0; d = c; c = b; b = a; a = t1 + t2 | 0;
  }
  return [st[0] + a | 0, st[1] + b | 0, st[2] + c | 0, st[3] + d | 0, st[4] + e | 0, st[5] + f | 0, st[6] + g | 0, st[7] + h | 0];
}

function bytesToWords(bytes) {
  var w = [];
  for (var i = 0; i < bytes.length; i += 4) w.push(((bytes[i] & 255) << 24) | ((bytes[i + 1] & 255) << 16) | ((bytes[i + 2] & 255) << 8) | (bytes[i + 3] & 255));
  return w;
}
function wordsToBytes(w) {
  var out = [];
  w.forEach(function (x) { out.push((x >>> 24) & 255, (x >>> 16) & 255, (x >>> 8) & 255, x & 255); });
  return out;
}

// SHA-256 lanjutan dari state awal (prefixLen = jumlah byte yang sudah diproses sebelumnya)
function shaFrom(state, msg, prefixLen) {
  var bytes = msg.slice();
  var bitLen = (prefixLen + msg.length) * 8;
  bytes.push(0x80);
  while (bytes.length % 64 !== 56) bytes.push(0);
  // panjang pesan 64 bit (pesan di sini selalu < 512 MB, jadi 32 bit atas = 0)
  bytes.push(0, 0, 0, 0, (bitLen >>> 24) & 255, (bitLen >>> 16) & 255, (bitLen >>> 8) & 255, bitLen & 255);
  var st = state;
  for (var i = 0; i < bytes.length; i += 64) st = shaCompress(st, bytesToWords(bytes.slice(i, i + 64)));
  return st;
}

function pbkdf2(password, saltBytes, iterations) {
  var key = toBytes(password).map(function (b) { return b & 255; });
  if (key.length > 64) key = wordsToBytes(shaFrom(SHA_H0, key, 0));
  var ik = [], ok = [];
  for (var i = 0; i < 64; i++) { var k = key[i] || 0; ik.push(k ^ 0x36); ok.push(k ^ 0x5c); }
  var istate = shaCompress(SHA_H0, bytesToWords(ik));
  var ostate = shaCompress(SHA_H0, bytesToWords(ok));
  // U1 = HMAC(P, salt || INT(1))
  var inner = shaFrom(istate, saltBytes.concat([0, 0, 0, 1]), 64);
  var u = shaCompress(ostate, inner.concat([0x80000000, 0, 0, 0, 0, 0, 0, 768]));
  var t = u.slice();
  var blk = [0, 0, 0, 0, 0, 0, 0, 0, 0x80000000, 0, 0, 0, 0, 0, 0, 768];
  for (var n = 1; n < iterations; n++) {
    for (var j = 0; j < 8; j++) blk[j] = u[j];
    var ih = shaCompress(istate, blk);
    for (j = 0; j < 8; j++) blk[j] = ih[j];
    u = shaCompress(ostate, blk);
    for (j = 0; j < 8; j++) t[j] ^= u[j];
  }
  return wordsToBytes(t);
}

function hashPassword(password) {
  var salt = toBytes(uuid() + uuid()).map(function (b) { return b & 255; }).slice(0, 16);
  return 'pbkdf2$' + PW_ITERATIONS + '$' + b64(salt) + '$' + b64(pbkdf2(password, salt, PW_ITERATIONS));
}

function verifyPassword(password, stored) {
  var p = String(stored || '').split('$');
  if (p.length !== 4 || p[0] !== 'pbkdf2') return false;
  var it = Number(p[1]);
  if (!(it >= 1000 && it <= 200000)) return false;
  var a = pbkdf2(String(password), fromB64(p[2]), it);
  var b = fromB64(p[3]);
  if (a.length !== b.length) return false;
  var d = 0;
  for (var i = 0; i < a.length; i++) d |= (a[i] ^ b[i]);
  return d === 0;
}

function validatePassword(pw) {
  pw = String(pw || '');
  if (pw.length < 8) throw bad('Password minimal 8 karakter');
  if (pw.length > 128) throw bad('Password terlalu panjang');
  if (!/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw bad('Password harus mengandung huruf dan angka');
  return pw;
}

function sha256(text) {
  return b64(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(text), Utilities.Charset.UTF_8));
}

function createSession(user) {
  var token = (uuid() + uuid()).replace(/-/g, '');
  var expires = new Date(Date.now() + SESSION_HOURS * 3600 * 1000).toISOString();
  var t = T('sessions');
  var now = nowIso();
  t.removeWhere(function (s) { return s.expires_at < now; });
  t.insert({ id: sha256(token), user_id: user.id, expires_at: expires });
  return token;
}

function destroySession(token) {
  if (!token) return;
  var id = sha256(token);
  T('sessions').removeWhere(function (s) { return s.id === id; });
  CacheService.getScriptCache().remove('ses_' + id);
}

function destroyUserSessions(userId, exceptId) {
  T('sessions').removeWhere(function (s) {
    if (s.user_id !== userId || s.id === exceptId) return false;
    CacheService.getScriptCache().remove('ses_' + s.id);
    return true;
  });
}

function sessionUser(token) {
  if (!token || String(token).length > 100) return null;
  var id = sha256(token);
  var cache = CacheService.getScriptCache();
  var c = cache.get('ses_' + id);
  var sess;
  if (c) sess = JSON.parse(c);
  else {
    var s = T('sessions').get(id);
    if (!s) return null;
    sess = { user_id: s.user_id, expires_at: s.expires_at };
    cache.put('ses_' + id, JSON.stringify(sess), 600);
  }
  if (sess.expires_at < nowIso()) return null;
  var u = T('users').get(sess.user_id);
  if (!u || !u.active) return null;
  return {
    id: u.id, username: u.username, role: u.role, full_name: u.full_name, teacher_id: u.teacher_id,
    active: u.active, must_change_password: u.must_change_password, session_id: id
  };
}

// 5 kali gagal -> dikunci 10 menit (disimpan di CacheService)
function checkLoginAllowed(key) {
  var c = CacheService.getScriptCache().get('la_' + sha256(key));
  if (!c) return;
  var o = JSON.parse(c);
  if (o.locked_until && o.locked_until > Date.now()) {
    throw new HttpError(429, 'Terlalu banyak percobaan. Coba lagi dalam ' + Math.ceil((o.locked_until - Date.now()) / 60000) + ' menit.');
  }
}

function recordLoginFail(key) {
  var cache = CacheService.getScriptCache();
  var k = 'la_' + sha256(key);
  var o = cache.get(k) ? JSON.parse(cache.get(k)) : { count: 0 };
  o.count++;
  if (o.count >= 5) o.locked_until = Date.now() + 10 * 60000;
  cache.put(k, JSON.stringify(o), 600);
}

function clearLoginFails(key) { CacheService.getScriptCache().remove('la_' + sha256(key)); }


/* =====================================================================
   MESIN PERHITUNGAN NILAI (sama dengan versi Cloudflare)
   Nilai akhir = Σ(nilai × bobot) / Σ(bobot komponen terisi); kosong ≠ nol;
   sumber nilai live/copy; snapshot saat dikunci; cegah perhitungan melingkar.
   ===================================================================== */

function roundTo(x, decimals, mode) {
  if (x === null || x === undefined || !isFinite(x)) return null;
  var d = decimals === null || decimals === undefined ? 2 : decimals;
  var f = Math.pow(10, d);
  var v = Number((x * f).toPrecision(12));
  var r = mode === 'floor' ? Math.floor(v) : mode === 'ceil' ? Math.ceil(v) : Math.round(v);
  return r / f;
}

function computeFinal(categories, values, type) {
  var sum = 0, wsum = 0, filled = 0, missing = 0;
  categories.forEach(function (c) {
    var v = values[c.id];
    if (v === null || v === undefined) { if (c.required) missing++; return; }
    filled++; sum += v * c.weight; wsum += c.weight;
  });
  var complete = filled > 0 && missing === 0;
  if (!filled || wsum <= 0) return { final: null, complete: false, filled: filled, provisional: false };
  if (type.require_complete && !complete) return { final: null, complete: false, filled: filled, provisional: false };
  return { final: roundTo(sum / wsum, type.decimals, type.rounding || 'round'), complete: complete, filled: filled, provisional: !complete };
}

function Engine() {
  this.types = new Map();
  this.memo = new Map();
  this.loads = new Map();
}

Engine.prototype.type = function (typeId) {
  if (this.types.has(typeId)) return this.types.get(typeId);
  var at = T('assessment_types').get(typeId);
  if (!at) throw notFound('Jenis penilaian tidak ditemukan');
  var sem = T('semesters').get(at.semester_id);
  var t = Object.assign({}, at, { academic_year_id: sem.academic_year_id, term: sem.term, semester_name: sem.name });
  var srcByCat = T('assessment_category_sources').index('category_id');
  t.categories = sortBy(T('assessment_categories').where('assessment_type_id', typeId), [function (c) { return c.sort_order; }, function (c) { return c.created_at; }])
    .map(function (c) {
      var s = (srcByCat.get(c.id) || [])[0] || {};
      return {
        id: c.id, name: c.name, code: c.code, weight: c.weight, required: c.required, source_type: c.source_type, sort_order: c.sort_order,
        source_assessment_type_id: s.source_assessment_type_id || null, source_category_id: s.source_category_id || null,
        sync_mode: s.sync_mode || null, only_locked: s.only_locked || 0, last_synced_at: s.last_synced_at || null
      };
    });
  this.types.set(typeId, t);
  return t;
};

Engine.prototype.classOf = function (yearId, studentId) {
  var h = T('student_class_history').where('student_id', studentId).filter(function (x) { return x.academic_year_id === yearId; })[0];
  return h ? h.class_id : null;
};

Engine.prototype.load = function (typeId, classId) {
  var key = typeId + '|' + classId;
  if (this.loads.has(key)) return this.loads.get(key);
  var asm = T('assessments').where('assessment_type_id', typeId).filter(function (a) { return a.class_id === classId; });
  var data = { assessments: new Map(), scores: new Map(), snapshots: new Map() };
  var scoreIdx = T('student_scores').index('assessment_id');
  var snapIdx = T('score_snapshots').index('assessment_id');
  asm.forEach(function (a) {
    data.assessments.set(a.subject_id, a);
    (scoreIdx.get(a.id) || []).forEach(function (s) {
      var vals = s.values_json || {}, orig = s.origins_json || {};
      var o = {};
      Object.keys(vals).forEach(function (cid) { o[cid] = { score: vals[cid], origin: orig[cid] || 'manual' }; });
      data.scores.set(a.subject_id + '|' + s.student_id, o);
    });
    if (a.status === 'locked') {
      (snapIdx.get(a.id) || []).forEach(function (sn) { if (sn.version === a.snapshot_version) data.snapshots.set(a.id + '|' + sn.student_id, sn); });
    }
  });
  this.loads.set(key, data);
  return data;
};

Engine.prototype.results = function (typeId, studentIds, subjectIds, stack) {
  stack = stack || [];
  if (stack.indexOf(typeId) >= 0) throw bad('Terdeteksi perhitungan melingkar pada sumber nilai. Periksa pengaturan Sumber Nilai.');
  var self = this;
  var t = this.type(typeId);
  var out = new Map();
  var todo = [];
  studentIds.forEach(function (st) {
    subjectIds.forEach(function (sb) {
      var k = sb + '|' + st;
      var m = self.memo.get(typeId + '|' + k);
      if (m) out.set(k, m); else todo.push([sb, st]);
    });
  });
  if (!todo.length) return out;
  var needStudents = Array.from(new Set(todo.map(function (x) { return x[1]; })));
  var needSubjects = Array.from(new Set(todo.map(function (x) { return x[0]; })));
  var live = new Map();
  t.categories.forEach(function (c) {
    if (c.source_type !== 'manual' && c.sync_mode === 'live' && c.source_assessment_type_id) {
      live.set(c.id, self.results(c.source_assessment_type_id, needStudents, needSubjects, stack.concat([typeId])));
    }
  });
  todo.forEach(function (pair) {
    var subjectId = pair[0], studentId = pair[1];
    var classId = self.classOf(t.academic_year_id, studentId);
    var data = classId ? self.load(typeId, classId) : { assessments: new Map(), scores: new Map(), snapshots: new Map() };
    var asm = data.assessments.get(subjectId) || null;
    var r = null;
    if (asm && asm.status === 'locked') {
      var snap = data.snapshots.get(asm.id + '|' + studentId);
      if (snap) {
        var vals = {};
        try { vals = JSON.parse(snap.components_json || '{}'); } catch (e) { vals = {}; }
        var origins = {};
        t.categories.forEach(function (c) { origins[c.id] = 'snapshot'; });
        r = {
          values: vals, origins: origins, final: snap.final_score, complete: !!snap.complete,
          filled: Object.keys(vals).filter(function (k) { return vals[k] !== null && vals[k] !== undefined; }).length,
          provisional: !snap.complete && snap.final_score !== null
        };
      }
    }
    if (!r) {
      var stored = data.scores.get(subjectId + '|' + studentId) || {};
      var values = {}, orig = {};
      t.categories.forEach(function (c) {
        if (live.has(c.id)) {
          var sr = live.get(c.id).get(subjectId + '|' + studentId);
          var v = null;
          if (sr && (!c.only_locked || sr.locked)) v = c.source_category_id ? (sr.values[c.source_category_id] === undefined ? null : sr.values[c.source_category_id]) : sr.final;
          values[c.id] = v; orig[c.id] = 'live';
        } else {
          var cell = stored[c.id];
          values[c.id] = cell && cell.score !== undefined ? cell.score : null;
          orig[c.id] = cell ? cell.origin : (c.source_type !== 'manual' ? 'copy' : 'manual');
        }
      });
      r = Object.assign({ values: values, origins: orig }, computeFinal(t.categories, values, t));
    }
    r.status = asm ? asm.status : 'draft';
    r.locked = !!asm && asm.status === 'locked';
    r.class_id = classId;
    r.assessment_id = asm ? asm.id : null;
    var k = subjectId + '|' + studentId;
    self.memo.set(typeId + '|' + k, r);
    out.set(k, r);
  });
  return out;
};

function sourceGraph() {
  var g = new Map();
  var cats = T('assessment_categories');
  T('assessment_category_sources').rows().forEach(function (s) {
    var c = cats.get(s.category_id);
    if (!c) return;
    if (!g.has(c.assessment_type_id)) g.set(c.assessment_type_id, new Set());
    g.get(c.assessment_type_id).add(s.source_assessment_type_id);
  });
  return g;
}

function reaches(graph, from, target) {
  var seen = new Set(), st = [from];
  while (st.length) {
    var n = st.pop();
    if (n === target) return true;
    if (seen.has(n)) continue;
    seen.add(n);
    (graph.get(n) || new Set()).forEach(function (x) { st.push(x); });
  }
  return false;
}

function findAssessment(typeId, subjectId, classId) {
  return T('assessments').where('assessment_type_id', typeId).filter(function (a) { return a.subject_id === subjectId && a.class_id === classId; })[0] || null;
}

function ensureAssessment(typeId, subjectId, classId) {
  return findAssessment(typeId, subjectId, classId) ||
    T('assessments').insert({ assessment_type_id: typeId, subject_id: subjectId, class_id: classId, status: 'draft', snapshot_version: 0, updated_at: nowIso() });
}

function classStudents(classId) {
  var st = T('students');
  return sortBy(T('student_class_history').where('class_id', classId).map(function (h) {
    var s = st.get(h.student_id);
    return s ? { id: s.id, nis: s.nis, nisn: s.nisn, name: s.name, gender: s.gender, status: s.status, roll_no: h.roll_no } : null;
  }).filter(Boolean), [function (s) { return s.roll_no === null ? 9999 : s.roll_no; }, function (s) { return s.name; }]);
}

function scoreRow(asmId, studentId) {
  return T('student_scores').where('assessment_id', asmId).filter(function (s) { return s.student_id === studentId; })[0] || null;
}

// Simpan satu nilai (null = kosongkan) + catat revisi
function setScore(user, asm, categoryId, studentId, score, origin, changedName) {
  var row = scoreRow(asm.id, studentId);
  var vals = row ? Object.assign({}, row.values_json || {}) : {};
  var origs = row ? Object.assign({}, row.origins_json || {}) : {};
  var old = vals[categoryId] === undefined ? null : vals[categoryId];
  if (old === score) return false;
  if (score === null) { delete vals[categoryId]; delete origs[categoryId]; }
  else { vals[categoryId] = score; if (origin && origin !== 'manual') origs[categoryId] = origin; else delete origs[categoryId]; }
  var now = nowIso();
  if (row) T('student_scores').update(row, { values_json: vals, origins_json: origs, updated_by: user.id, updated_at: now });
  else T('student_scores').insert({ assessment_id: asm.id, student_id: studentId, values_json: vals, origins_json: origs, updated_by: user.id, updated_at: now });
  T('score_revisions').insert({
    assessment_id: asm.id, category_id: categoryId, student_id: studentId, old_score: old, new_score: score,
    changed_by: user.id, changed_name: changedName || user.full_name, role: user.role, created_at: now
  });
  return true;
}

function lockAssessment(user, asm) {
  var engine = new Engine();
  var students = classStudents(asm.class_id);
  var res = engine.results(asm.assessment_type_id, students.map(function (s) { return s.id; }), [asm.subject_id]);
  var version = (asm.snapshot_version || 0) + 1;
  var now = nowIso();
  students.forEach(function (s) {
    var r = res.get(asm.subject_id + '|' + s.id);
    T('score_snapshots').insert({
      assessment_id: asm.id, student_id: s.id, version: version, components_json: JSON.stringify(r.values),
      final_score: r.final, complete: r.complete ? 1 : 0, locked_at: now, locked_by: user.full_name
    });
  });
  T('assessments').update(asm, { status: 'locked', locked_at: now, locked_by: user.full_name, snapshot_version: version, updated_at: now });
  return { version: version, students: students.length };
}

function syncCopySources(user, typeId, opts) {
  opts = opts || {};
  var engine = new Engine();
  var t = engine.type(typeId);
  var copyCats = t.categories.filter(function (c) { return c.source_type !== 'manual' && c.sync_mode === 'copy' && c.source_assessment_type_id; });
  if (!copyCats.length) return { updated: 0, categories: 0 };
  var classes = opts.classId ? [{ id: opts.classId }] : T('classes').where('academic_year_id', t.academic_year_id);
  var subjects = opts.subjectId ? [opts.subjectId] : T('subjects').filter(function (s) { return s.active; }).map(function (s) { return s.id; });
  var updated = 0;
  classes.forEach(function (cl) {
    var ids = classStudents(cl.id).map(function (s) { return s.id; });
    if (!ids.length) return;
    var srcRes = new Map();
    copyCats.forEach(function (c) { srcRes.set(c.id, engine.results(c.source_assessment_type_id, ids, subjects, [typeId])); });
    subjects.forEach(function (sb) {
      var asm = findAssessment(typeId, sb, cl.id);
      copyCats.forEach(function (c) {
        ids.forEach(function (st) {
          var sr = srcRes.get(c.id).get(sb + '|' + st);
          var v = null;
          if (sr && (!c.only_locked || sr.locked)) v = c.source_category_id ? (sr.values[c.source_category_id] === undefined ? null : sr.values[c.source_category_id]) : sr.final;
          var row = asm ? scoreRow(asm.id, st) : null;
          var old = row && row.values_json && row.values_json[c.id] !== undefined ? row.values_json[c.id] : null;
          if (v === old) return;
          if (!asm) asm = ensureAssessment(typeId, sb, cl.id);
          if (asm.status === 'locked') return;
          if (setScore(user, asm, c.id, st, v, 'copy', 'Sinkronisasi: ' + user.full_name)) updated++;
        });
      });
    });
  });
  var now = nowIso();
  copyCats.forEach(function (c) {
    var s = T('assessment_category_sources').one('category_id', c.id);
    if (s) T('assessment_category_sources').update(s, { last_synced_at: now, last_synced_by: user.full_name });
  });
  return { updated: updated, categories: copyCats.length };
}

/* ---------- Monitoring kelengkapan ---------- */
var STATUS_LABEL = { belum: 'Belum input', sebagian: 'Sebagian', lengkap: 'Lengkap', submitted: 'Terkirim', returned: 'Dikembalikan', locked: 'Dikunci' };

function computeMonitoring(semester, opts) {
  opts = opts || {};
  var engine = opts.engine || new Engine();
  var teachers = T('teachers'), subjects = T('subjects'), classes = T('classes');
  var assignments = T('teacher_assignments').where('semester_id', semester.id)
    .filter(function (a) { return !opts.teacherId || a.teacher_id === opts.teacherId; })
    .map(function (a) {
      var t = teachers.get(a.teacher_id) || {}, sb = subjects.get(a.subject_id) || {}, c = classes.get(a.class_id) || {};
      return { id: a.id, teacher_id: a.teacher_id, subject_id: a.subject_id, class_id: a.class_id, teacher_name: t.name, subject_name: sb.name, subject_code: sb.code, class_name: c.name, class_order: c.sort_order, subject_order: sb.sort_order };
    });
  sortBy(assignments, [function (a) { return a.teacher_name; }, function (a) { return a.class_order; }, function (a) { return a.class_name; }, function (a) { return a.subject_order; }]);
  var types = sortBy(T('assessment_types').where('semester_id', semester.id).filter(function (t) { return t.active; }), [function (t) { return t.sort_order; }, function (t) { return t.created_at; }]);
  if (opts.typeId) types = types.filter(function (t) { return t.id === opts.typeId; });
  var classIds = Array.from(new Set(assignments.map(function (a) { return a.class_id; })));
  var rows = [];
  types.forEach(function (t) {
    var tInfo = engine.type(t.id);
    var manualCats = tInfo.categories.filter(function (c) { return c.source_type === 'manual'; });
    classIds.forEach(function (cid) {
      var studs = T('student_class_history').where('class_id', cid).map(function (h) { return h.student_id; });
      var asg = assignments.filter(function (a) { return a.class_id === cid; });
      var res = studs.length ? engine.results(t.id, studs, asg.map(function (a) { return a.subject_id; })) : new Map();
      var loaded = engine.load(t.id, cid);
      asg.forEach(function (a) {
        var complete = 0, started = 0, filledCells = 0;
        studs.forEach(function (st) {
          var r = res.get(a.subject_id + '|' + st);
          if (!r) return;
          if (r.complete) complete++;
          var mf = 0;
          manualCats.forEach(function (c) { if (r.values[c.id] !== null && r.values[c.id] !== undefined) mf++; });
          if (mf > 0) started++;
          filledCells += mf;
        });
        var asm = loaded.assessments.get(a.subject_id);
        var n = studs.length;
        var status;
        if (asm && asm.status === 'locked') status = 'locked';
        else if (asm && asm.status === 'submitted') status = 'submitted';
        else if (asm && asm.status === 'returned') status = 'returned';
        else if (n > 0 && complete === n) status = 'lengkap';
        else if (started > 0 || complete > 0) status = 'sebagian';
        else status = 'belum';
        rows.push({
          assignment_id: a.id, teacher_id: a.teacher_id, teacher_name: a.teacher_name, subject_id: a.subject_id, subject_name: a.subject_name,
          subject_code: a.subject_code, class_id: cid, class_name: a.class_name, type_id: t.id, type_name: t.name, end_date: t.end_date,
          input_open: t.input_open, students: n, complete: complete, started: started, filled_cells: filledCells, total_cells: n * manualCats.length,
          percent: n ? Math.round((complete / n) * 1000) / 10 : 0, status: status, status_label: STATUS_LABEL[status],
          assessment_id: asm ? asm.id : null, return_note: asm ? asm.return_note : null,
          submitted_at: asm ? asm.submitted_at : null, locked_at: asm ? asm.locked_at : null
        });
      });
    });
  });
  return { rows: rows, types: types, assignments: assignments };
}

/* ---------- Akses ---------- */
function semesterInfo(s) {
  if (!s) return null;
  var y = T('academic_years').get(s.academic_year_id);
  return Object.assign({}, s, { year_name: y ? y.name : '' });
}
function activeSemester() {
  var s = sortBy(T('semesters').filter(function (x) { return x.is_active; }), [function (x) { return -x.term; }])[0];
  return semesterInfo(s || null);
}
function getSemester(id) {
  var s = T('semesters').get(id);
  if (!s) throw notFound('Semester tidak ditemukan');
  return semesterInfo(s);
}
function semesterFromQuery(ctx) {
  if (ctx.query.semester_id) return getSemester(ctx.query.semester_id);
  var s = activeSemester();
  if (!s) throw bad('Belum ada semester aktif. Admin perlu membuat & mengaktifkan tahun pelajaran.');
  return s;
}
function assertSheetAccess(ctx, subjectId, classId, semesterId) {
  if (ctx.isAdmin) return true;
  var t = ctx.user.teacher_id;
  if (!t) throw forbidden();
  var ok = T('teacher_assignments').where('teacher_id', t).some(function (a) { return a.subject_id === subjectId && a.class_id === classId && a.semester_id === semesterId; });
  if (!ok) throw forbidden('Anda tidak ditugaskan mengajar mata pelajaran ini di kelas tersebut');
  return true;
}
function isHomeroom(ctx, classId) {
  if (!ctx.user.teacher_id) return false;
  var c = T('classes').get(classId);
  return !!c && c.homeroom_teacher_id === ctx.user.teacher_id;
}
function assertHomeroomOrAdmin(ctx, classId) {
  if (ctx.isAdmin || isHomeroom(ctx, classId)) return true;
  throw forbidden('Hanya wali kelas dari kelas ini atau admin yang dapat mengubah data ini');
}
function assertSubjectAccess(ctx, subjectId) {
  if (ctx.isAdmin) return true;
  var t = ctx.user.teacher_id;
  var ok = T('teacher_assignments').where('teacher_id', t).some(function (a) { return a.subject_id === subjectId }) ||
    T('teacher_subjects').where('teacher_id', t).some(function (a) { return a.subject_id === subjectId; });
  if (!ok) throw forbidden('Mata pelajaran ini bukan tanggung jawab Anda');
  return true;
}


/* ---------- Rute: autentikasi, bootstrap, pengaturan, tahun & semester, notifikasi, dashboard ---------- */
var YEAR_RE = /^\d{4}\/\d{4}$/;
var HEAVY_KEYS = ['ttd_kepsek', 'stempel', 'logo_kanan'];

function publicUser(u) {
  return { id: u.id, username: u.username, role: u.role, full_name: u.full_name, teacher_id: u.teacher_id, must_change_password: !!u.must_change_password };
}

function r_login(ctx) {
  var b = ctx.body;
  var username = String(b.username || '').trim().toLowerCase();
  var password = String(b.password || '');
  if (!username || !password) throw bad('Username dan password wajib diisi');
  checkLoginAllowed('login|' + username);
  var user = T('users').find(function (u) { return u.username.toLowerCase() === username; });
  if (!user || !verifyPassword(password, user.password_hash)) {
    recordLoginFail('login|' + username);
    audit({ user: { username: username } }, 'Login gagal', { detail: 'Username/password salah' });
    ctx.commitOnError = true;
    throw new HttpError(401, 'Username atau password salah');
  }
  if (!user.active) throw forbidden('Akun dinonaktifkan. Hubungi admin sekolah.');
  clearLoginFails('login|' + username);
  var token = createSession(user);
  var patch = { last_login_at: nowIso() };
  // hash dari backend lain (mis. Cloudflare 100.000 iterasi) diperbarui agar login berikutnya cepat
  if (String(user.password_hash).split('$')[1] !== String(PW_ITERATIONS)) patch.password_hash = hashPassword(password);
  T('users').update(user, patch);
  audit({ user: user }, 'Login', { entity: 'user', entityId: user.id });
  return { user: publicUser(user), redirect: user.role === 'admin' ? 'admin.html' : 'guru.html', token: token };
}

function r_logout(ctx) {
  destroySession(ctx.token);
  audit(ctx, 'Logout');
  return true;
}

function r_me(ctx) {
  var u = ctx.user;
  var t = u.teacher_id ? T('teachers').get(u.teacher_id) : null;
  return Object.assign(publicUser(u), { teacher: t ? pick(t, ['id', 'name', 'nip', 'nuptk', 'phone', 'email']) : null });
}

function r_changePassword(ctx) {
  var b = ctx.body;
  var row = T('users').get(ctx.user.id);
  if (!verifyPassword(String(b.old_password || ''), row.password_hash)) throw bad('Password lama salah');
  var pw = validatePassword(b.new_password);
  if (pw === b.old_password) throw bad('Password baru harus berbeda dari password lama');
  T('users').update(row, { password_hash: hashPassword(pw), must_change_password: 0, updated_at: nowIso() });
  destroyUserSessions(row.id, null);
  audit(ctx, 'Ganti password', { entity: 'user', entityId: row.id });
  return { token: createSession(row) };
}

function r_setupStatus() { return { needs_setup: T('users').count() === 0 }; }

function r_setup(ctx) {
  if (T('users').count() > 0) throw forbidden('Aplikasi sudah disiapkan');
  var b = clean(ctx.body, {
    nama_sekolah: { type: 'string', required: true, max: 150, label: 'Nama sekolah' },
    full_name: { type: 'string', required: true, max: 100, label: 'Nama admin' },
    username: { type: 'string', required: true, max: 40, pattern: /^[a-zA-Z0-9._-]{3,40}$/, label: 'Username' },
    password: { type: 'string', required: true, max: 128, label: 'Password' },
    year_name: { type: 'string', required: true, max: 9, pattern: YEAR_RE, label: 'Tahun pelajaran' },
    seed_defaults: { type: 'bool', default: 1 }
  });
  validatePassword(b.password);
  var yy = b.year_name.split('/').map(Number);
  if (yy[1] !== yy[0] + 1) throw bad('Tahun pelajaran harus berurutan, mis. 2026/2027');
  setupSheets();
  var admin = T('users').insert({ username: b.username.toLowerCase(), password_hash: hashPassword(b.password), role: 'admin', full_name: b.full_name, active: 1, must_change_password: 0 });
  var y = T('academic_years').insert({ name: b.year_name, start_date: yy[0] + '-07-01', end_date: yy[1] + '-06-30', is_active: 1 });
  T('semesters').insert({ academic_year_id: y.id, term: 1, name: 'Ganjil', start_date: yy[0] + '-07-01', end_date: yy[0] + '-12-31', is_active: 1 });
  T('semesters').insert({ academic_year_id: y.id, term: 2, name: 'Genap', start_date: yy[1] + '-01-01', end_date: yy[1] + '-06-30', is_active: 0 });
  saveSettingsPatch({ nama_sekolah: b.nama_sekolah });
  SEED_SCALES.forEach(function (g, i) { T('grade_scales').insert({ subject_id: null, predicate: g[0], min_score: g[1], max_score: g[2], label: g[3], description: g[4], sort_order: i }); });
  SEED_EKSKUL.forEach(function (n, i) { T('extracurriculars').insert({ name: n, active: 1, sort_order: i }); });
  if (b.seed_defaults) {
    SEED_SUBJECTS.forEach(function (m, i) {
      var s = T('subjects').insert({ code: m[0], name: m[1], group_name: m[2], kktp: m[3], sort_order: i + 1, active: 1 });
      (SEED_BANK[m[0]] || []).forEach(function (text) { T('description_bank').insert({ subject_id: s.id, grade_level: 'Semua', text: text, created_by: 'Bawaan' }); });
    });
  }
  audit({ user: admin }, 'Penyiapan awal aplikasi', { detail: b.nama_sekolah + ' / ' + b.year_name });
  return { ok: true };
}

function yearsWithSemesters() {
  var sems = T('semesters').rows();
  return sortBy(T('academic_years').rows().slice(), [function (y) { return y.name; }]).reverse().map(function (y) {
    return Object.assign({}, y, { semesters: sortBy(sems.filter(function (s) { return s.academic_year_id === y.id; }).map(copyRow), [function (s) { return s.term; }]) });
  });
}

function r_bootstrap(ctx) {
  var settings = getSettings();
  if (!ctx.isAdmin) HEAVY_KEYS.forEach(function (k) { delete settings[k]; });
  var active = activeSemester();
  var homeroom = [];
  if (ctx.user.teacher_id && active) {
    homeroom = T('classes').where('academic_year_id', active.academic_year_id).filter(function (c) { return c.homeroom_teacher_id === ctx.user.teacher_id; })
      .map(function (c) { return pick(c, ['id', 'name', 'grade_level']); });
  }
  return { user: publicUser(ctx.user), settings: settings, years: yearsWithSemesters(), active_semester: active, homeroom_classes: homeroom, server_time: nowIso() };
}

function r_publicInfo() {
  var s = getSettings();
  var out = {};
  PUBLIC_KEYS.forEach(function (k) { out[k] = s[k]; });
  return out;
}

function r_getSettings() { return getSettings(); }

function r_saveSettings(ctx) {
  var patch = {};
  Object.keys(ctx.body || {}).forEach(function (k) {
    if (!(k in DEFAULT_SETTINGS)) return;
    var v = ctx.body[k];
    var s = v === null || v === undefined ? '' : String(v);
    var isImage = ['logo_kiri', 'logo_kanan', 'ttd_kepsek', 'stempel'].indexOf(k) >= 0;
    if (isImage && s && !/^data:image\/(png|jpeg|gif|webp);base64,[A-Za-z0-9+/=]+$/.test(s)) throw bad('Format gambar tidak valid untuk ' + k);
    if (s.length > (isImage ? 700000 : 5000)) throw bad('Isian terlalu panjang: ' + k);
    patch[k] = s;
  });
  if (!Object.keys(patch).length) throw bad('Tidak ada pengaturan yang disimpan');
  saveSettingsPatch(patch);
  audit(ctx, 'Simpan pengaturan sekolah', { entity: 'settings', detail: Object.keys(patch).join(', ') });
  return { saved: Object.keys(patch).length };
}

var yearSpec = {
  name: { type: 'string', required: true, pattern: YEAR_RE, label: 'Tahun pelajaran' },
  start_date: { type: 'date', label: 'Tanggal mulai' },
  end_date: { type: 'date', label: 'Tanggal selesai' }
};

function r_listYears() {
  var cls = T('classes').index('academic_year_id'), hist = T('student_class_history').index('academic_year_id');
  return yearsWithSemesters().map(function (y) { return Object.assign(y, { classes: (cls.get(y.id) || []).length, students: (hist.get(y.id) || []).length }); });
}

function r_createYear(ctx) {
  var b = clean(ctx.body, yearSpec);
  var yy = b.name.split('/').map(Number);
  if (yy[1] !== yy[0] + 1) throw bad('Tahun pelajaran harus berurutan, mis. 2027/2028');
  if (T('academic_years').one('name', b.name)) throw conflict('Tahun pelajaran ' + b.name + ' sudah ada');
  var start = b.start_date || yy[0] + '-07-01', end = b.end_date || yy[1] + '-06-30';
  var y = T('academic_years').insert({ name: b.name, start_date: start, end_date: end, is_active: 0 });
  T('semesters').insert({ academic_year_id: y.id, term: 1, name: 'Ganjil', start_date: start, end_date: yy[0] + '-12-31', is_active: 0 });
  T('semesters').insert({ academic_year_id: y.id, term: 2, name: 'Genap', start_date: yy[1] + '-01-01', end_date: end, is_active: 0 });
  audit(ctx, 'Tambah tahun pelajaran', { entity: 'academic_year', entityId: y.id, after: b });
  var copied = 0;
  var from = optId(ctx.body.copy_classes_from, 'Tahun sumber');
  if (from) {
    T('classes').where('academic_year_id', from).forEach(function (c) {
      T('classes').insert({ academic_year_id: y.id, name: c.name, grade_level: c.grade_level, report_label: c.report_label, homeroom_teacher_id: c.homeroom_teacher_id, sort_order: c.sort_order });
      copied++;
    });
  }
  return { id: y.id, copied_classes: copied };
}

function r_updateYear(ctx) {
  var y = T('academic_years').get(requireId(ctx.params.id));
  if (!y) throw notFound();
  var before = copyRow(y);
  var b = clean(ctx.body, yearSpec, { partial: true });
  if (b.name && b.name !== y.name && T('academic_years').one('name', b.name)) throw conflict('Tahun pelajaran sudah ada');
  T('academic_years').update(y, b);
  audit(ctx, 'Ubah tahun pelajaran', { entity: 'academic_year', entityId: y.id, before: before, after: b });
  return { id: y.id };
}

function r_deleteYear(ctx) {
  var id = requireId(ctx.params.id);
  var y = T('academic_years').get(id);
  if (!y) throw notFound();
  if (y.is_active) throw bad('Tahun pelajaran aktif tidak dapat dihapus');
  var semIds = T('semesters').where('academic_year_id', id).map(function (s) { return s.id; });
  var used = T('classes').where('academic_year_id', id).length + T('assessment_types').filter(function (t) { return semIds.indexOf(t.semester_id) >= 0; }).length;
  if (used) throw bad('Tahun pelajaran sudah berisi kelas/penilaian. Data tahun pelajaran tidak dihapus agar riwayat tetap aman.');
  T('semesters').removeWhere(function (s) { return s.academic_year_id === id; });
  T('academic_years').remove(y);
  audit(ctx, 'Hapus tahun pelajaran', { entity: 'academic_year', entityId: id, before: y });
  return { deleted: true };
}

function activateSemesterById(ctx, semId) {
  var s = getSemester(semId);
  T('semesters').rows().forEach(function (x) { T('semesters').update(x, { is_active: x.id === semId ? 1 : 0 }); });
  T('academic_years').rows().forEach(function (y) { T('academic_years').update(y, { is_active: y.id === s.academic_year_id ? 1 : 0 }); });
  audit(ctx, 'Aktifkan semester', { entity: 'semester', entityId: semId, detail: s.year_name + ' ' + s.name });
  return { active_semester_id: semId };
}

function r_activateYear(ctx) {
  var sem = sortBy(T('semesters').where('academic_year_id', requireId(ctx.params.id)), [function (s) { return s.term; }])[0];
  if (!sem) throw notFound('Semester untuk tahun ini tidak ditemukan');
  return activateSemesterById(ctx, sem.id);
}
function r_activateSemester(ctx) { return activateSemesterById(ctx, requireId(ctx.params.id)); }

function r_updateSemester(ctx) {
  var id = requireId(ctx.params.id);
  var before = getSemester(id);
  var b = clean(ctx.body, {
    start_date: { type: 'date' }, end_date: { type: 'date' }, report_place: { type: 'string', max: 100 }, report_date: { type: 'string', max: 100 },
    report_assessment_type_id: { type: 'id' }, skill_assessment_type_id: { type: 'id' }, mid_assessment_type_id: { type: 'id' }
  }, { partial: true });
  ['report_assessment_type_id', 'skill_assessment_type_id', 'mid_assessment_type_id'].forEach(function (k) {
    if (b[k]) {
      var t = T('assessment_types').get(b[k]);
      if (!t || t.semester_id !== id) throw bad('Jenis penilaian untuk rapor harus berasal dari semester yang sama');
    }
  });
  T('semesters').update(T('semesters').get(id), b);
  audit(ctx, 'Ubah pengaturan semester', { entity: 'semester', entityId: id, before: before, after: b });
  return { id: id };
}

function visibleNotifications(u) {
  return T('notifications').filter(function (n) { return n.user_id === u.id || (!n.user_id && (!n.role || n.role === u.role)); });
}

function r_listNotifications(ctx) {
  var u = ctx.user;
  var since = new Date(Date.now() - 60 * 864e5).toISOString();
  var reads = new Set(T('notification_reads').where('user_id', u.id).map(function (r) { return r.notification_id; }));
  var stored = sortBy(visibleNotifications(u).filter(function (n) { return n.created_at >= since; }).map(function (n) { return Object.assign({}, n, { is_read: reads.has(n.id) ? 1 : 0 }); }),
    [function (n) { return n.created_at; }]).reverse().slice(0, 50);
  var generated = [];
  var sem = activeSemester();
  if (sem) {
    var days = Number(getSettings().hari_pengingat || 3);
    var today = nowIso().slice(0, 10);
    var limit = new Date(Date.now() + days * 864e5).toISOString().slice(0, 10);
    if (u.role === 'guru' && u.teacher_id) {
      var types = T('assessment_types').where('semester_id', sem.id).filter(function (t) { return t.active && t.input_open && t.end_date && t.end_date >= today && t.end_date <= limit; });
      if (types.length) {
        var mon = computeMonitoring(sem, { teacherId: u.teacher_id });
        types.forEach(function (t) {
          var pending = mon.rows.filter(function (r) { return r.type_id === t.id && ['submitted', 'locked'].indexOf(r.status) < 0; });
          if (pending.length) generated.push({ id: 'deadline-' + t.id, title: 'Batas input ' + t.name + ' segera berakhir', body: 'Batas akhir ' + t.end_date + '. ' + pending.length + ' lembar nilai belum dikirim.', link: '#input', created_at: nowIso(), is_read: 0, generated: true });
        });
      }
    }
    if (u.role === 'admin') {
      var typeIds = new Set(T('assessment_types').where('semester_id', sem.id).map(function (t) { return t.id; }));
      var n = T('assessments').filter(function (a) { return a.status === 'submitted' && typeIds.has(a.assessment_type_id); }).length;
      if (n) generated.push({ id: 'verify-' + sem.id, title: n + ' lembar nilai menunggu verifikasi', body: 'Periksa lalu kunci atau kembalikan kepada guru.', link: '#monitoring', created_at: nowIso(), is_read: 0, generated: true });
    }
  }
  var items = generated.concat(stored);
  return { items: items, unread: items.filter(function (i) { return !i.is_read; }).length };
}

function r_readNotifications(ctx) {
  var u = ctx.user;
  var ids = Array.isArray(ctx.body.ids) ? ctx.body.ids.map(String) : [];
  if (ctx.body.all) ids = visibleNotifications(u).map(function (n) { return n.id; });
  var reads = new Set(T('notification_reads').where('user_id', u.id).map(function (r) { return r.notification_id; }));
  ids.forEach(function (id) { if (!reads.has(id) && T('notifications').get(id)) T('notification_reads').insert({ notification_id: id, user_id: u.id, read_at: nowIso() }); });
  return { read: ids.length };
}

function r_sendNotification(ctx) {
  var b = clean(ctx.body, {
    title: { type: 'string', required: true, max: 150, label: 'Judul' }, body: { type: 'text', max: 1000 },
    target: { type: 'enum', values: ['guru', 'all', 'user'], default: 'guru' }, user_id: { type: 'id' }, link: { type: 'string', max: 100 }
  });
  if (b.target === 'user' && !b.user_id) throw bad('Pilih pengguna tujuan');
  var n = T('notifications').insert({ user_id: b.target === 'user' ? b.user_id : null, role: b.target === 'guru' ? 'guru' : null, title: b.title, body: b.body, link: b.link });
  audit(ctx, 'Kirim notifikasi', { entity: 'notification', entityId: n.id, detail: b.title });
  return { id: n.id };
}

function r_adminDashboard(ctx) {
  var sem = semesterFromQuery(ctx);
  var yearId = sem.academic_year_id;
  var students = T('students');
  var counts = {
    students: T('student_class_history').where('academic_year_id', yearId).filter(function (h) { var s = students.get(h.student_id); return s && s.status === 'aktif'; }).length,
    teachers: T('teachers').filter(function (t) { return t.active; }).length,
    classes: T('classes').where('academic_year_id', yearId).length,
    subjects: T('subjects').filter(function (s) { return s.active; }).length,
    active_assessments: T('assessment_types').where('semester_id', sem.id).filter(function (t) { return t.active; }).length,
    open_assessments: T('assessment_types').where('semester_id', sem.id).filter(function (t) { return t.active && t.input_open; }).length
  };
  var rows = computeMonitoring(sem).rows;
  var tIn = new Set(rows.filter(function (r) { return r.started > 0 || r.complete > 0; }).map(function (r) { return r.teacher_id; }));
  var total = rows.reduce(function (a, r) { return a + r.students; }, 0);
  var done = rows.reduce(function (a, r) { return a + r.complete; }, 0);
  var sc = {};
  rows.forEach(function (r) { sc[r.status] = (sc[r.status] || 0) + 1; });
  var recent = sortBy(T('audit_logs').rows().slice(), [function (r) { return r.created_at; }]).reverse().slice(0, 10)
    .map(function (r) { return pick(r, ['username', 'role', 'action', 'detail', 'created_at']); });
  Object.assign(counts, {
    teachers_inputting: tIn.size, teachers_assigned: new Set(rows.map(function (r) { return r.teacher_id; })).size,
    completeness: total ? Math.round((done / total) * 1000) / 10 : 0, incomplete_scores: total - done, sheets: rows.length
  });
  return { semester: sem, counts: counts, status_count: sc, monitoring: rows, recent: recent };
}

function r_guruDashboard(ctx) {
  var sem = semesterFromQuery(ctx);
  var tid = ctx.user.teacher_id;
  if (!tid) return { semester: sem, monitoring: [], subjects: [], classes: [], ongoing: [], history: [], completeness: 0 };
  var mon = computeMonitoring(sem, { teacherId: tid });
  var uniq = function (list, key) { var m = new Map(); list.forEach(function (x) { m.set(x[key], x); }); return Array.from(m.values()); };
  var subjects = uniq(mon.assignments.map(function (a) { return { id: a.subject_id, name: a.subject_name, code: a.subject_code }; }), 'id');
  var classes = uniq(mon.assignments.map(function (a) { return { id: a.class_id, name: a.class_name }; }), 'id');
  var ongoing = mon.types.filter(function (t) { return t.input_open; }).map(function (t) { return pick(t, ['id', 'name', 'start_date', 'end_date', 'kind']); });
  var history = revisionRows(T('score_revisions').where('changed_by', ctx.user.id)).slice(0, 15);
  var total = mon.rows.reduce(function (a, r) { return a + r.students; }, 0);
  var done = mon.rows.reduce(function (a, r) { return a + r.complete; }, 0);
  return { semester: sem, monitoring: mon.rows, subjects: subjects, classes: classes, ongoing: ongoing, history: history, completeness: total ? Math.round((done / total) * 1000) / 10 : 0 };
}

function revisionRows(list) {
  var asm = T('assessments'), types = T('assessment_types'), subs = T('subjects'), cls = T('classes'), st = T('students'), cats = T('assessment_categories');
  return sortBy(list.slice(), [function (r) { return r.created_at; }]).reverse().map(function (r) {
    var a = asm.get(r.assessment_id) || {};
    var s = st.get(r.student_id) || {};
    return Object.assign({}, r, {
      student_name: s.name || null, nisn: s.nisn || null, category_name: (cats.get(r.category_id) || {}).name || null,
      type_name: (types.get(a.assessment_type_id) || {}).name, subject_name: (subs.get(a.subject_id) || {}).name, class_name: (cls.get(a.class_id) || {}).name
    });
  });
}


/* ---------- Rute: data master ---------- */
var USERNAME_RE = /^[a-zA-Z0-9._-]{3,40}$/;

function yearIdFrom(raw) {
  if (raw) return requireId(raw, 'Tahun pelajaran');
  var s = activeSemester();
  if (!s) throw bad('Belum ada tahun pelajaran aktif');
  return s.academic_year_id;
}

// ===== SISWA =====
var studentSpec = {
  nis: { type: 'string', max: 30, label: 'NIS' },
  nisn: { type: 'string', max: 20, pattern: /^\d{1,20}$/, label: 'NISN' },
  name: { type: 'string', required: true, max: 120, upper: true, label: 'Nama lengkap' },
  gender: { type: 'enum', values: ['L', 'P'], label: 'Jenis kelamin' },
  birth_place: { type: 'string', max: 80, label: 'Tempat lahir' },
  birth_date: { type: 'date', label: 'Tanggal lahir' },
  religion: { type: 'string', max: 30, label: 'Agama' },
  address: { type: 'text', max: 300, label: 'Alamat' },
  parent_name: { type: 'string', max: 120, label: 'Nama orang tua' },
  parent_phone: { type: 'string', max: 30, label: 'No. HP orang tua' },
  status: { type: 'enum', values: ['aktif', 'pindah', 'keluar', 'lulus'], default: 'aktif', label: 'Status' }
};

function assertStudentUnique(b, exceptId) {
  T('students').rows().forEach(function (s) {
    if (s.id === exceptId) return;
    if (b.nisn && s.nisn === b.nisn) throw conflict('Data sudah ada (duplikat): NISN ' + b.nisn);
    if (b.nis && s.nis === b.nis) throw conflict('Data sudah ada (duplikat): NIS ' + b.nis);
  });
}

function r_listStudents(ctx) {
  var yearId = yearIdFrom(ctx.query.year_id);
  var hist = new Map(T('student_class_history').where('academic_year_id', yearId).map(function (h) { return [h.student_id, h]; }));
  var cls = T('classes');
  var allowed = null;
  if (!ctx.isAdmin) {
    var tid = ctx.user.teacher_id;
    allowed = new Set(T('teacher_assignments').where('teacher_id', tid).map(function (a) { return a.class_id; })
      .concat(T('classes').filter(function (c) { return tid && c.homeroom_teacher_id === tid; }).map(function (c) { return c.id; })));
  }
  var rows = T('students').rows().map(function (s) {
    var h = hist.get(s.id);
    var c = h ? cls.get(h.class_id) : null;
    return Object.assign({}, s, { class_id: h ? h.class_id : null, roll_no: h ? h.roll_no : null, class_name: c ? c.name : null, grade_level: c ? c.grade_level : null, _sort: c ? c.sort_order : null });
  }).filter(function (r) {
    if (ctx.query.class_id) return r.class_id === ctx.query.class_id;
    if (ctx.query.unassigned === '1') return !r.class_id;
    if (ctx.query.all !== '1' && !r.class_id) return false;
    if (allowed && !allowed.has(r.class_id)) return false;
    return true;
  }).filter(function (r) { return !allowed || allowed.has(r.class_id); });
  sortBy(rows, [function (r) { return r.grade_level; }, function (r) { return r._sort; }, function (r) { return r.class_name; }, function (r) { return r.roll_no === null ? 9999 : r.roll_no; }, function (r) { return r.name; }]);
  rows.forEach(function (r) { delete r._sort; });
  return rows;
}

function r_studentHistory(ctx) {
  var cls = T('classes'), yrs = T('academic_years');
  return sortBy(T('student_class_history').where('student_id', requireId(ctx.params.id)).map(function (h) {
    return Object.assign({}, h, { class_name: (cls.get(h.class_id) || {}).name, year_name: (yrs.get(h.academic_year_id) || {}).name });
  }), [function (h) { return h.year_name; }]);
}

function classOrThrow(id) { var c = T('classes').get(id); if (!c) throw notFound('Kelas tidak ditemukan'); return c; }

function upsertHistory(studentId, cls, rollNo) {
  var h = T('student_class_history').where('student_id', studentId).filter(function (x) { return x.academic_year_id === cls.academic_year_id; })[0];
  if (h) T('student_class_history').update(h, { class_id: cls.id, roll_no: rollNo !== null && rollNo !== undefined ? rollNo : h.roll_no });
  else T('student_class_history').insert({ student_id: studentId, class_id: cls.id, academic_year_id: cls.academic_year_id, roll_no: rollNo === undefined ? null : rollNo });
}

function r_createStudent(ctx) {
  var b = clean(ctx.body, studentSpec);
  assertStudentUnique(b, null);
  var s = T('students').insert(b);
  if (ctx.body.class_id) upsertHistory(s.id, classOrThrow(requireId(ctx.body.class_id, 'Kelas')), ctx.body.roll_no ? Number(ctx.body.roll_no) : null);
  audit(ctx, 'Tambah siswa', { entity: 'student', entityId: s.id, after: b });
  return { id: s.id };
}

function r_updateStudent(ctx) {
  var s = T('students').get(requireId(ctx.params.id));
  if (!s) throw notFound('Siswa tidak ditemukan');
  var before = copyRow(s);
  var b = clean(ctx.body, studentSpec, { partial: true });
  assertStudentUnique(b, s.id);
  b.updated_at = nowIso();
  T('students').update(s, b);
  if (ctx.body.class_id) upsertHistory(s.id, classOrThrow(requireId(ctx.body.class_id, 'Kelas')), ctx.body.roll_no !== undefined && ctx.body.roll_no !== '' ? Number(ctx.body.roll_no) : null);
  audit(ctx, 'Ubah siswa', { entity: 'student', entityId: s.id, before: before, after: b });
  return { id: s.id };
}

function deleteStudentCascade(id) {
  ['student_class_history', 'student_scores', 'score_snapshots', 'teacher_comments', 'report_cards', 'attendance', 'student_extracurriculars', 'report_pickups']
    .forEach(function (t) { T(t).removeWhere(function (r) { return r.student_id === id; }); });
  T('students').remove(T('students').get(id));
}

function deleteStudents(ctx, ids) {
  var blocked = [], deleted = 0;
  ids.forEach(function (id) {
    var s = T('students').get(id);
    if (!s) return;
    var used = T('student_scores').where('student_id', id).length + T('report_cards').where('student_id', id).length + T('score_snapshots').where('student_id', id).length;
    if (used && !ctx.query.force) { blocked.push(s.name); return; }
    deleteStudentCascade(id);
    audit(ctx, 'Hapus siswa', { entity: 'student', entityId: id, detail: s.name });
    deleted++;
  });
  return { deleted: deleted, blocked: blocked };
}

function r_deleteStudent(ctx) {
  var r = deleteStudents(ctx, [requireId(ctx.params.id)]);
  if (r.blocked.length) throw conflict('Siswa sudah memiliki nilai/rapor. Ubah status menjadi pindah/keluar agar riwayat nilai tetap tersimpan.');
  return r;
}
function r_bulkDeleteStudents(ctx) { return deleteStudents(ctx, arr(ctx.body.ids, 'Daftar siswa').map(function (x) { return requireId(x); })); }

function r_moveStudents(ctx) {
  var ids = arr(ctx.body.ids, 'Daftar siswa').map(function (x) { return requireId(x); });
  var cls = classOrThrow(requireId(ctx.body.class_id, 'Kelas tujuan'));
  ids.forEach(function (id) { if (T('students').get(id)) upsertHistory(id, cls, null); });
  audit(ctx, 'Pindah/naik kelas siswa', { entity: 'class', entityId: cls.id, detail: ids.length + ' siswa ke ' + cls.name });
  return { moved: ids.length };
}

function r_removeFromClass(ctx) {
  var ids = new Set(arr(ctx.body.ids, 'Daftar siswa').map(function (x) { return requireId(x); }));
  var yearId = yearIdFrom(ctx.body.year_id);
  T('student_class_history').removeWhere(function (h) { return ids.has(h.student_id) && h.academic_year_id === yearId; });
  audit(ctx, 'Keluarkan siswa dari kelas', { detail: ids.size + ' siswa' });
  return { removed: ids.size };
}

function r_renumber(ctx) {
  var classId = requireId(ctx.body.class_id, 'Kelas');
  var st = T('students');
  var rows = sortBy(T('student_class_history').where('class_id', classId), [function (h) { return (st.get(h.student_id) || {}).name; }]);
  rows.forEach(function (h, i) { T('student_class_history').update(h, { roll_no: i + 1 }); });
  audit(ctx, 'Urutkan nomor absen', { entity: 'class', entityId: classId });
  return { renumbered: rows.length };
}

// ===== GURU =====
var teacherSpec = {
  nip: { type: 'string', max: 30, label: 'NIP' }, nuptk: { type: 'string', max: 30, label: 'NUPTK' },
  name: { type: 'string', required: true, max: 120, label: 'Nama guru' }, gender: { type: 'enum', values: ['L', 'P'], label: 'Jenis kelamin' },
  phone: { type: 'string', max: 30, label: 'No. HP' }, email: { type: 'string', max: 120, label: 'Email' }, active: { type: 'bool', default: 1 }
};

function userByUsername(u) { u = String(u).toLowerCase(); return T('users').find(function (x) { return x.username.toLowerCase() === u; }); }

function r_listTeachers() {
  var sem = activeSemester();
  var users = T('users').index('teacher_id');
  var subs = T('subjects');
  return sortBy(T('teachers').rows().map(function (t) {
    var u = (users.get(t.id) || [])[0];
    return Object.assign({}, t, {
      user_id: u ? u.id : null, username: u ? u.username : null, user_active: u ? u.active : null, last_login_at: u ? u.last_login_at : null,
      subjects: sortBy(T('teacher_subjects').where('teacher_id', t.id).map(function (ts) { var s = subs.get(ts.subject_id); return s ? { id: s.id, name: s.name, code: s.code, _o: s.sort_order } : null; }).filter(Boolean), [function (s) { return s._o; }])
        .map(function (s) { return { id: s.id, name: s.name, code: s.code }; }),
      homeroom: sem ? T('classes').where('academic_year_id', sem.academic_year_id).filter(function (c) { return c.homeroom_teacher_id === t.id; }).map(function (c) { return c.name; }) : [],
      assignments: sem ? T('teacher_assignments').where('teacher_id', t.id).filter(function (a) { return a.semester_id === sem.id; }).length : 0
    });
  }), [function (t) { return t.name; }]);
}

function setTeacherSubjects(teacherId, ids) {
  T('teacher_subjects').removeWhere(function (r) { return r.teacher_id === teacherId; });
  ids.forEach(function (sid) { sid = requireId(sid, 'Mapel'); T('teacher_subjects').insert({ id: teacherId + '|' + sid, teacher_id: teacherId, subject_id: sid }); });
}
function addTeacherSubject(teacherId, sid) { if (!T('teacher_subjects').get(teacherId + '|' + sid)) T('teacher_subjects').insert({ id: teacherId + '|' + sid, teacher_id: teacherId, subject_id: sid }); }

function r_createTeacher(ctx) {
  var raw = ctx.body;
  var b = clean(raw, teacherSpec);
  var t = T('teachers').insert(b);
  if (raw.username) {
    var username = String(raw.username).trim().toLowerCase();
    if (!USERNAME_RE.test(username)) throw bad('Username 3-40 karakter (huruf, angka, titik, garis bawah, strip)');
    if (userByUsername(username)) throw conflict('Username sudah dipakai');
    validatePassword(raw.password);
    T('users').insert({ username: username, password_hash: hashPassword(raw.password), role: 'guru', teacher_id: t.id, full_name: b.name, active: b.active, must_change_password: raw.must_change_password === false ? 0 : 1 });
  }
  if (Array.isArray(raw.subject_ids)) setTeacherSubjects(t.id, raw.subject_ids);
  audit(ctx, 'Tambah guru', { entity: 'teacher', entityId: t.id, after: Object.assign({}, b, { username: raw.username }) });
  return { id: t.id };
}

function r_updateTeacher(ctx) {
  var t = T('teachers').get(requireId(ctx.params.id));
  if (!t) throw notFound('Guru tidak ditemukan');
  var raw = ctx.body;
  var before = copyRow(t);
  var b = clean(raw, teacherSpec, { partial: true });
  var user = T('users').one('teacher_id', t.id);
  if (raw.username !== undefined && raw.username !== '') {
    var username = String(raw.username).trim().toLowerCase();
    if (!USERNAME_RE.test(username)) throw bad('Username tidak valid');
    var dup = userByUsername(username);
    if (dup && dup.teacher_id !== t.id) throw conflict('Username sudah dipakai');
    if (user) T('users').update(user, { username: username, updated_at: nowIso() });
    else {
      validatePassword(raw.password);
      user = T('users').insert({ username: username, password_hash: hashPassword(raw.password), role: 'guru', teacher_id: t.id, full_name: b.name || t.name, active: 1, must_change_password: 1 });
      raw = Object.assign({}, raw, { password: null });
    }
  }
  b.updated_at = nowIso();
  T('teachers').update(t, b);
  if (user && raw.password) {
    validatePassword(raw.password);
    T('users').update(user, { password_hash: hashPassword(raw.password), must_change_password: 1, updated_at: nowIso() });
    destroyUserSessions(user.id, null);
  }
  if (user && (b.name || b.active !== undefined)) T('users').update(user, { full_name: b.name || user.full_name, active: b.active !== undefined ? b.active : user.active });
  if (Array.isArray(raw.subject_ids)) setTeacherSubjects(t.id, raw.subject_ids);
  audit(ctx, 'Ubah guru', { entity: 'teacher', entityId: t.id, before: before, after: Object.assign({}, b, { password: raw.password ? '(direset)' : undefined }) });
  return { id: t.id };
}

function r_deleteTeacher(ctx) {
  var t = T('teachers').get(requireId(ctx.params.id));
  if (!t) throw notFound();
  if (T('teacher_assignments').where('teacher_id', t.id).length) throw conflict('Guru masih memiliki pembagian tugas mengajar. Nonaktifkan guru atau hapus tugasnya terlebih dahulu.');
  T('users').removeWhere(function (u) { return u.teacher_id === t.id; });
  T('teacher_subjects').removeWhere(function (r) { return r.teacher_id === t.id; });
  T('classes').filter(function (c) { return c.homeroom_teacher_id === t.id; }).forEach(function (c) { T('classes').update(c, { homeroom_teacher_id: null }); });
  T('teachers').remove(t);
  audit(ctx, 'Hapus guru', { entity: 'teacher', entityId: t.id, before: t });
  return { deleted: true };
}

// ===== PENGGUNA =====
function r_listUsers() {
  var tch = T('teachers');
  return sortBy(T('users').rows().map(function (u) {
    var o = pick(u, ['id', 'username', 'role', 'full_name', 'teacher_id', 'active', 'must_change_password', 'last_login_at', 'created_at']);
    o.teacher_name = u.teacher_id ? (tch.get(u.teacher_id) || {}).name : null;
    return o;
  }), [function (u) { return u.role; }, function (u) { return u.full_name; }]);
}

function r_createUser(ctx) {
  var b = clean(ctx.body, {
    username: { type: 'string', required: true, pattern: USERNAME_RE, label: 'Username' }, full_name: { type: 'string', required: true, max: 100, label: 'Nama lengkap' },
    password: { type: 'string', required: true, max: 128, label: 'Password' }, role: { type: 'enum', values: ['admin'], default: 'admin' }
  });
  validatePassword(b.password);
  if (userByUsername(b.username)) throw conflict('Username sudah dipakai');
  var u = T('users').insert({ username: b.username.toLowerCase(), password_hash: hashPassword(b.password), role: b.role, full_name: b.full_name, active: 1, must_change_password: 1 });
  audit(ctx, 'Tambah pengguna', { entity: 'user', entityId: u.id, after: { username: u.username, role: b.role } });
  return { id: u.id };
}

function r_updateUser(ctx) {
  var u = T('users').get(requireId(ctx.params.id));
  if (!u) throw notFound();
  var raw = ctx.body;
  var b = clean(raw, { full_name: { type: 'string', max: 100 }, active: { type: 'bool' } }, { partial: true });
  if (u.id === ctx.user.id && b.active === 0) throw bad('Anda tidak dapat menonaktifkan akun sendiri');
  b.updated_at = nowIso();
  T('users').update(u, b);
  if (b.active === 0) destroyUserSessions(u.id, null);
  if (raw.password) {
    validatePassword(raw.password);
    T('users').update(u, { password_hash: hashPassword(raw.password), must_change_password: u.id === ctx.user.id ? 0 : 1 });
    if (u.id !== ctx.user.id) destroyUserSessions(u.id, null);
  }
  audit(ctx, raw.password ? 'Reset password pengguna' : 'Ubah pengguna', { entity: 'user', entityId: u.id, detail: u.username });
  return { id: u.id };
}

function r_deleteUser(ctx) {
  var id = requireId(ctx.params.id);
  if (id === ctx.user.id) throw bad('Anda tidak dapat menghapus akun sendiri');
  var u = T('users').get(id);
  if (!u) throw notFound();
  if (u.role === 'admin' && T('users').filter(function (x) { return x.role === 'admin' && x.active; }).length <= 1) throw bad('Minimal harus ada satu admin aktif');
  destroyUserSessions(id, null);
  T('users').remove(u);
  audit(ctx, 'Hapus pengguna', { entity: 'user', entityId: id, detail: u.username });
  return { deleted: true };
}

// ===== KELAS =====
var classSpec = {
  name: { type: 'string', required: true, max: 30, upper: true, label: 'Nama kelas' }, grade_level: { type: 'int', required: true, min: 1, max: 12, label: 'Tingkat' },
  report_label: { type: 'string', max: 20, label: 'Label rapor' }, homeroom_teacher_id: { type: 'id', label: 'Wali kelas' }, sort_order: { type: 'int', default: 0 }
};

function r_listClasses(ctx) {
  var yearId = yearIdFrom(ctx.query.year_id);
  var tch = T('teachers'), hist = T('student_class_history').index('class_id');
  return sortBy(T('classes').where('academic_year_id', yearId).map(function (c) {
    var t = c.homeroom_teacher_id ? tch.get(c.homeroom_teacher_id) : null;
    return Object.assign({}, c, { homeroom_name: t ? t.name : null, homeroom_nip: t ? t.nip : null, students: (hist.get(c.id) || []).length });
  }), [function (c) { return c.grade_level; }, function (c) { return c.sort_order; }, function (c) { return c.name; }]);
}

function assertClassUnique(yearId, name, exceptId) {
  if (T('classes').where('academic_year_id', yearId).some(function (c) { return c.name === name && c.id !== exceptId; })) throw conflict('Data sudah ada (duplikat): kelas ' + name);
}

function r_createClass(ctx) {
  var b = clean(ctx.body, classSpec);
  var yearId = yearIdFrom(ctx.body.academic_year_id);
  assertClassUnique(yearId, b.name, null);
  var c = T('classes').insert({ academic_year_id: yearId, name: b.name, grade_level: b.grade_level, report_label: b.report_label || ROMAN[b.grade_level] || String(b.grade_level), homeroom_teacher_id: b.homeroom_teacher_id, sort_order: b.sort_order });
  audit(ctx, 'Tambah kelas', { entity: 'class', entityId: c.id, after: b });
  return { id: c.id };
}

function r_updateClass(ctx) {
  var c = T('classes').get(requireId(ctx.params.id));
  if (!c) throw notFound();
  var before = copyRow(c);
  var b = clean(ctx.body, classSpec, { partial: true });
  if ('homeroom_teacher_id' in ctx.body && !ctx.body.homeroom_teacher_id) b.homeroom_teacher_id = null;
  if (b.name) assertClassUnique(c.academic_year_id, b.name, c.id);
  T('classes').update(c, b);
  audit(ctx, Object.keys(b).length === 1 && 'homeroom_teacher_id' in b ? 'Atur wali kelas' : 'Ubah kelas', { entity: 'class', entityId: c.id, before: before, after: b });
  return { id: c.id };
}

function r_deleteClass(ctx) {
  var c = T('classes').get(requireId(ctx.params.id));
  if (!c) throw notFound();
  var st = T('student_class_history').where('class_id', c.id).length, sh = T('assessments').where('class_id', c.id).length;
  if (st || sh) throw conflict('Kelas ' + c.name + ' masih berisi ' + st + ' siswa / ' + sh + ' lembar nilai dan tidak dapat dihapus.');
  T('teacher_assignments').removeWhere(function (a) { return a.class_id === c.id; });
  T('classes').remove(c);
  audit(ctx, 'Hapus kelas', { entity: 'class', entityId: c.id, before: c });
  return { deleted: true };
}

// ===== MATA PELAJARAN =====
var subjectSpec = {
  code: { type: 'string', required: true, max: 15, upper: true, pattern: /^[A-Za-z0-9_.-]+$/, label: 'Kode mapel' },
  name: { type: 'string', required: true, max: 120, label: 'Nama mapel' }, group_name: { type: 'string', max: 40, default: 'A', label: 'Kelompok' },
  kktp: { type: 'number', min: 0, max: 100, label: 'KKTP' }, sort_order: { type: 'int', default: 0 }, active: { type: 'bool', default: 1 }
};
function subjectByCode(code, exceptId) { code = String(code).toUpperCase(); return T('subjects').find(function (s) { return s.code.toUpperCase() === code && s.id !== exceptId; }); }

function r_listSubjects() { return sortBy(T('subjects').rows().map(copyRow), [function (s) { return s.sort_order; }, function (s) { return s.name; }]); }

function r_createSubject(ctx) {
  var b = clean(ctx.body, subjectSpec);
  if (subjectByCode(b.code)) throw conflict('Data sudah ada (duplikat): kode mapel ' + b.code);
  var s = T('subjects').insert(b);
  audit(ctx, 'Tambah mata pelajaran', { entity: 'subject', entityId: s.id, after: b });
  return { id: s.id };
}

function r_updateSubject(ctx) {
  var s = T('subjects').get(requireId(ctx.params.id));
  if (!s) throw notFound();
  var before = copyRow(s);
  var b = clean(ctx.body, subjectSpec, { partial: true });
  if ('kktp' in ctx.body && (ctx.body.kktp === '' || ctx.body.kktp === null)) b.kktp = null;
  if (b.code && subjectByCode(b.code, s.id)) throw conflict('Kode mapel sudah dipakai');
  T('subjects').update(s, b);
  audit(ctx, 'Ubah mata pelajaran', { entity: 'subject', entityId: s.id, before: before, after: b });
  return { id: s.id };
}

function r_deleteSubject(ctx) {
  var s = T('subjects').get(requireId(ctx.params.id));
  if (!s) throw notFound();
  if (T('assessments').where('subject_id', s.id).length + T('teacher_assignments').where('subject_id', s.id).length) throw conflict('Mata pelajaran sudah dipakai (tugas mengajar / nilai). Nonaktifkan saja agar riwayat nilai tetap tersimpan.');
  ['teacher_subjects', 'description_bank', 'grade_scales', 'teacher_comments'].forEach(function (t) { T(t).removeWhere(function (r) { return r.subject_id === s.id; }); });
  T('subjects').remove(s);
  audit(ctx, 'Hapus mata pelajaran', { entity: 'subject', entityId: s.id, before: s });
  return { deleted: true };
}

// ===== PEMBAGIAN TUGAS =====
function r_listAssignments(ctx) {
  var sem = ctx.query.semester_id ? getSemester(ctx.query.semester_id) : activeSemester();
  if (!sem) return [];
  var tid = ctx.isAdmin ? ctx.query.teacher_id : ctx.user.teacher_id;
  if (!ctx.isAdmin && !tid) return [];
  var tch = T('teachers'), subs = T('subjects'), cls = T('classes'), hist = T('student_class_history').index('class_id');
  return sortBy(T('teacher_assignments').where('semester_id', sem.id).filter(function (a) {
    return (!tid || a.teacher_id === tid) && (!ctx.query.class_id || a.class_id === ctx.query.class_id);
  }).map(function (a) {
    var s = subs.get(a.subject_id) || {}, c = cls.get(a.class_id) || {};
    return Object.assign({}, a, { teacher_name: (tch.get(a.teacher_id) || {}).name, subject_name: s.name, subject_code: s.code, class_name: c.name, grade_level: c.grade_level, students: (hist.get(a.class_id) || []).length, _c: c.sort_order, _s: s.sort_order });
  }), [function (a) { return a.grade_level; }, function (a) { return a._c; }, function (a) { return a.class_name; }, function (a) { return a._s; }]);
}

function findAssignment(subjectId, classId, semId) {
  return T('teacher_assignments').where('subject_id', subjectId).filter(function (a) { return a.class_id === classId && a.semester_id === semId; })[0] || null;
}

function r_saveAssignments(ctx) {
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester'));
  var items = arr(ctx.body.items, 'Daftar tugas');
  items.forEach(function (it) {
    var subjectId = requireId(it.subject_id, 'Mapel'), classId = requireId(it.class_id, 'Kelas');
    var c = classOrThrow(classId);
    if (c.academic_year_id !== sem.academic_year_id) throw bad('Kelas ' + c.name + ' bukan kelas pada tahun pelajaran ' + sem.year_name);
    var teacherId = optId(it.teacher_id, 'Guru');
    var ex = findAssignment(subjectId, classId, sem.id);
    if (teacherId) {
      if (ex) T('teacher_assignments').update(ex, { teacher_id: teacherId });
      else T('teacher_assignments').insert({ teacher_id: teacherId, subject_id: subjectId, class_id: classId, semester_id: sem.id });
      addTeacherSubject(teacherId, subjectId);
    } else if (ex) T('teacher_assignments').remove(ex);
  });
  audit(ctx, 'Simpan pembagian tugas mengajar', { entity: 'semester', entityId: sem.id, detail: items.length + ' baris' });
  return { saved: items.length };
}

function r_deleteAssignment(ctx) {
  var a = T('teacher_assignments').get(requireId(ctx.params.id));
  if (!a) throw notFound();
  T('teacher_assignments').remove(a);
  audit(ctx, 'Hapus tugas mengajar', { entity: 'assignment', entityId: a.id, before: a });
  return { deleted: true };
}

function r_copyAssignments(ctx) {
  var from = getSemester(requireId(ctx.body.from_semester_id, 'Semester sumber'));
  var to = getSemester(requireId(ctx.body.to_semester_id, 'Semester tujuan'));
  if (from.id === to.id) throw bad('Semester sumber dan tujuan sama');
  var cls = T('classes');
  var byName = new Map(cls.where('academic_year_id', to.academic_year_id).map(function (c) { return [c.name, c.id]; }));
  var copied = 0, skipped = 0;
  T('teacher_assignments').where('semester_id', from.id).forEach(function (a) {
    var classId = from.academic_year_id === to.academic_year_id ? a.class_id : byName.get((cls.get(a.class_id) || {}).name);
    if (!classId) { skipped++; return; }
    if (findAssignment(a.subject_id, classId, to.id)) return;
    T('teacher_assignments').insert({ teacher_id: a.teacher_id, subject_id: a.subject_id, class_id: classId, semester_id: to.id });
    copied++;
  });
  audit(ctx, 'Salin pembagian tugas', { detail: from.year_name + ' ' + from.name + ' -> ' + to.year_name + ' ' + to.name });
  return { copied: copied, skipped: skipped };
}

// ===== EKSTRAKURIKULER =====
var ekskulSpec = { name: { type: 'string', required: true, max: 80, label: 'Nama ekstrakurikuler' }, description: { type: 'text', max: 500 }, active: { type: 'bool', default: 1 }, sort_order: { type: 'int', default: 0 } };
function r_listEkskul() { return sortBy(T('extracurriculars').rows().map(copyRow), [function (e) { return e.sort_order; }, function (e) { return e.name; }]); }
function ekskulByName(n, except) { n = String(n).toLowerCase(); return T('extracurriculars').find(function (e) { return e.name.toLowerCase() === n && e.id !== except; }); }
function r_createEkskul(ctx) {
  var b = clean(ctx.body, ekskulSpec);
  if (ekskulByName(b.name)) throw conflict('Ekstrakurikuler sudah ada');
  var e = T('extracurriculars').insert(b);
  audit(ctx, 'Tambah ekstrakurikuler', { entity: 'extracurricular', entityId: e.id, detail: b.name });
  return { id: e.id };
}
function r_updateEkskul(ctx) {
  var e = T('extracurriculars').get(requireId(ctx.params.id));
  if (!e) throw notFound();
  var b = clean(ctx.body, ekskulSpec, { partial: true });
  if (b.name && ekskulByName(b.name, e.id)) throw conflict('Ekstrakurikuler sudah ada');
  T('extracurriculars').update(e, b);
  audit(ctx, 'Ubah ekstrakurikuler', { entity: 'extracurricular', entityId: e.id, after: b });
  return { id: e.id };
}
function r_deleteEkskul(ctx) {
  var e = T('extracurriculars').get(requireId(ctx.params.id));
  if (!e) throw notFound();
  if (T('student_extracurriculars').where('extracurricular_id', e.id).length) throw conflict('Ekstrakurikuler sudah memiliki nilai siswa. Nonaktifkan saja.');
  T('extracurriculars').remove(e);
  audit(ctx, 'Hapus ekstrakurikuler', { entity: 'extracurricular', entityId: e.id });
  return { deleted: true };
}

// ===== BANK DESKRIPSI =====
function r_listBank(ctx) {
  var subs = T('subjects');
  var rows = T('description_bank').rows();
  if (ctx.query.subject_id) {
    var sid = requireId(ctx.query.subject_id);
    assertSubjectAccess(ctx, sid);
    rows = rows.filter(function (d) { return d.subject_id === sid; });
  } else if (!ctx.isAdmin) {
    var tid = ctx.user.teacher_id;
    var allow = new Set(T('teacher_assignments').where('teacher_id', tid).map(function (a) { return a.subject_id; }).concat(T('teacher_subjects').where('teacher_id', tid).map(function (a) { return a.subject_id; })));
    rows = rows.filter(function (d) { return allow.has(d.subject_id); });
  }
  return sortBy(rows.map(function (d) { var s = subs.get(d.subject_id) || {}; return Object.assign({}, d, { subject_name: s.name, subject_code: s.code, _o: s.sort_order }); }),
    [function (d) { return d._o; }, function (d) { return d.grade_level; }, function (d) { return d.text; }]);
}

function r_saveBank(ctx) {
  var items = Array.isArray(ctx.body.items) ? ctx.body.items : [ctx.body];
  var ids = [];
  items.forEach(function (it) {
    var v = clean(it, { subject_id: { type: 'id', required: true, label: 'Mapel' }, grade_level: { type: 'string', max: 10, default: 'Semua', label: 'Tingkat' }, text: { type: 'text', required: true, max: 500, label: 'Teks deskripsi' } });
    assertSubjectAccess(ctx, v.subject_id);
    if (it.id) {
      var old = T('description_bank').get(requireId(it.id));
      if (!old) throw notFound('Deskripsi tidak ditemukan');
      assertSubjectAccess(ctx, old.subject_id);
      T('description_bank').update(old, Object.assign(v, { updated_at: nowIso() }));
      ids.push(old.id);
    } else ids.push(T('description_bank').insert(Object.assign(v, { created_by: ctx.user.full_name })).id);
  });
  audit(ctx, 'Simpan bank deskripsi', { entity: 'description_bank', detail: items.length + ' deskripsi' });
  return { ids: ids };
}

function r_deleteBank(ctx) {
  var d = T('description_bank').get(requireId(ctx.params.id));
  if (!d) throw notFound();
  assertSubjectAccess(ctx, d.subject_id);
  T('description_bank').remove(d);
  audit(ctx, 'Hapus bank deskripsi', { entity: 'description_bank', entityId: d.id, before: d });
  return { deleted: true };
}

// ===== PREDIKAT =====
function r_listScales() {
  var subs = T('subjects');
  return sortBy(T('grade_scales').rows().map(function (g) { var s = g.subject_id ? subs.get(g.subject_id) : null; return Object.assign({}, g, { subject_name: s ? s.name : null, _o: s ? s.sort_order : -1 }); }),
    [function (g) { return g._o; }, function (g) { return -g.min_score; }]);
}

function r_saveScales(ctx) {
  var subjectId = optId(ctx.body.subject_id, 'Mapel');
  var items = arr(ctx.body.items, 'Daftar predikat').map(function (it) {
    return clean(it, {
      predicate: { type: 'string', required: true, max: 5, label: 'Predikat' }, min_score: { type: 'number', required: true, min: 0, max: 100, label: 'Nilai minimal' },
      max_score: { type: 'number', required: true, min: 0, max: 100, label: 'Nilai maksimal' }, label: { type: 'string', max: 60 }, description: { type: 'text', max: 1000 }
    });
  });
  if (!subjectId && !items.length) throw bad('Skala predikat umum tidak boleh kosong');
  var sorted = items.slice().sort(function (a, c) { return a.min_score - c.min_score; });
  sorted.forEach(function (x, i) {
    if (x.min_score > x.max_score) throw bad('Rentang predikat ' + x.predicate + ' tidak valid');
    if (i > 0 && x.min_score <= sorted[i - 1].max_score) throw bad('Rentang predikat ' + sorted[i - 1].predicate + ' dan ' + x.predicate + ' tumpang tindih');
  });
  T('grade_scales').removeWhere(function (g) { return (g.subject_id || null) === subjectId; });
  items.forEach(function (it, i) { T('grade_scales').insert(Object.assign({ subject_id: subjectId, sort_order: i }, it)); });
  audit(ctx, 'Simpan predikat', { entity: 'grade_scale', entityId: subjectId, after: items });
  return { saved: items.length };
}


/* ---------- Rute: jenis penilaian, kategori & bobot, sumber nilai, duplikasi ---------- */
var KINDS = ['PTS', 'PAS', 'PAT', 'PH', 'SEMESTER', 'CUSTOM'];
var typeSpec = {
  name: { type: 'string', required: true, max: 120, label: 'Nama penilaian' }, code: { type: 'string', max: 20, upper: true, label: 'Kode' },
  kind: { type: 'enum', values: KINDS, default: 'CUSTOM', label: 'Jenis' }, description: { type: 'text', max: 1000 },
  start_date: { type: 'date', label: 'Tanggal mulai' }, end_date: { type: 'date', label: 'Tanggal selesai' },
  active: { type: 'bool', default: 1 }, input_open: { type: 'bool', default: 1 },
  decimals: { type: 'int', min: 0, max: 4, default: 2, label: 'Jumlah desimal' }, rounding: { type: 'enum', values: ['round', 'floor', 'ceil'], default: 'round', label: 'Pembulatan' },
  require_complete: { type: 'bool', default: 0 }, sort_order: { type: 'int', default: 0 }
};
var SOURCE_TYPES = ['manual', 'assessment', 'category', 'previous'];

function categoriesWithSources(typeId) {
  var srcIdx = T('assessment_category_sources').index('category_id');
  var types = T('assessment_types'), cats = T('assessment_categories'), sems = T('semesters'), yrs = T('academic_years');
  return sortBy(cats.where('assessment_type_id', typeId), [function (c) { return c.sort_order; }, function (c) { return c.created_at; }]).map(function (c) {
    var s = (srcIdx.get(c.id) || [])[0];
    var o = Object.assign({}, c, { source_assessment_type_id: null, source_category_id: null, sync_mode: null, only_locked: null, last_synced_at: null, last_synced_by: null, source_type_name: null, source_category_name: null, source_semester_name: null, source_year_name: null });
    if (s) {
      var st = types.get(s.source_assessment_type_id) || {};
      var sm = sems.get(st.semester_id) || {};
      Object.assign(o, {
        source_assessment_type_id: s.source_assessment_type_id, source_category_id: s.source_category_id, sync_mode: s.sync_mode, only_locked: s.only_locked,
        last_synced_at: s.last_synced_at, last_synced_by: s.last_synced_by, source_type_name: st.name || null,
        source_category_name: s.source_category_id ? (cats.get(s.source_category_id) || {}).name : null,
        source_semester_name: sm.name || null, source_year_name: (yrs.get(sm.academic_year_id) || {}).name || null
      });
    }
    return o;
  });
}

function r_listTypes(ctx) {
  var sem = semesterFromQuery(ctx);
  var asm = T('assessments').index('assessment_type_id');
  var types = sortBy(T('assessment_types').where('semester_id', sem.id), [function (t) { return t.sort_order; }, function (t) { return t.created_at; }]);
  if (!ctx.isAdmin) types = types.filter(function (t) { return t.active; });
  return {
    semester: sem,
    types: types.map(function (t) {
      var c = categoriesWithSources(t.id);
      var a = asm.get(t.id) || [];
      return Object.assign({}, t, {
        categories: c, weight_total: Math.round(c.reduce(function (s, x) { return s + x.weight; }, 0) * 1000) / 1000,
        locked_sheets: a.filter(function (x) { return x.status === 'locked'; }).length, submitted_sheets: a.filter(function (x) { return x.status === 'submitted'; }).length
      });
    })
  };
}

function r_getType(ctx) {
  var id = requireId(ctx.params.id);
  var t = T('assessment_types').get(id);
  if (!t) throw notFound('Jenis penilaian tidak ditemukan');
  var sem = getSemester(t.semester_id);
  var out = Object.assign({}, t, { semester_name: sem.name, academic_year_id: sem.academic_year_id, year_name: sem.year_name });
  out.categories = categoriesWithSources(id);
  out.weight_total = out.categories.reduce(function (s, c) { return s + c.weight; }, 0);
  var cats = T('assessment_categories'), types = T('assessment_types');
  var seen = new Map();
  T('assessment_category_sources').where('source_assessment_type_id', id).forEach(function (s) {
    var c = cats.get(s.category_id);
    var tt = c ? types.get(c.assessment_type_id) : null;
    if (tt) seen.set(tt.id, { id: tt.id, name: tt.name });
  });
  out.used_as_source_by = Array.from(seen.values());
  return out;
}

function r_sourceOptions() {
  var sems = T('semesters'), yrs = T('academic_years');
  var list = T('assessment_types').rows().map(function (t) {
    var s = sems.get(t.semester_id) || {};
    return { id: t.id, name: t.name, kind: t.kind, semester_id: t.semester_id, semester_name: s.name, term: s.term, year_name: (yrs.get(s.academic_year_id) || {}).name, _o: t.sort_order, _c: t.created_at };
  });
  sortBy(list, [function (t) { return t.year_name; }, function (t) { return t.term; }]).reverse();
  return list.map(function (t) {
    var o = Object.assign({}, t);
    o.categories = sortBy(T('assessment_categories').where('assessment_type_id', t.id), [function (c) { return c.sort_order; }]).map(function (c) { return { id: c.id, name: c.name, weight: c.weight }; });
    delete o._o; delete o._c;
    return o;
  });
}

function r_createType(ctx) {
  var b = clean(ctx.body, typeSpec);
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester'));
  if (b.start_date && b.end_date && b.start_date > b.end_date) throw bad('Tanggal mulai harus sebelum tanggal selesai');
  var t = T('assessment_types').insert(Object.assign({ semester_id: sem.id, created_by: ctx.user.full_name }, b));
  audit(ctx, 'Buat jenis penilaian', { entity: 'assessment_type', entityId: t.id, after: b });
  T('notifications').insert({ role: 'guru', title: 'Penilaian baru: ' + b.name, body: sem.year_name + ' semester ' + sem.name + (b.end_date ? '. Batas input ' + b.end_date + '.' : ''), link: '#input' });
  if (Array.isArray(ctx.body.categories) && ctx.body.categories.length) saveCategoriesFor(ctx, t.id, ctx.body.categories, false, false);
  return { id: t.id };
}

function r_updateType(ctx) {
  var t = T('assessment_types').get(requireId(ctx.params.id));
  if (!t) throw notFound();
  var before = copyRow(t);
  var b = clean(ctx.body, typeSpec, { partial: true });
  var start = b.start_date !== undefined ? b.start_date : t.start_date, end = b.end_date !== undefined ? b.end_date : t.end_date;
  if (start && end && start > end) throw bad('Tanggal mulai harus sebelum tanggal selesai');
  b.updated_at = nowIso();
  T('assessment_types').update(t, b);
  audit(ctx, 'Ubah jenis penilaian', { entity: 'assessment_type', entityId: t.id, before: before, after: b });
  return { id: t.id };
}

function deleteTypeCascade(id) {
  var catIds = new Set(T('assessment_categories').where('assessment_type_id', id).map(function (c) { return c.id; }));
  var asmIds = new Set(T('assessments').where('assessment_type_id', id).map(function (a) { return a.id; }));
  T('assessment_category_sources').removeWhere(function (s) { return catIds.has(s.category_id); });
  T('assessment_categories').removeWhere(function (c) { return catIds.has(c.id); });
  ['student_scores', 'score_snapshots', 'score_revisions'].forEach(function (n) { T(n).removeWhere(function (r) { return asmIds.has(r.assessment_id); }); });
  T('assessments').removeWhere(function (a) { return asmIds.has(a.id); });
  T('assessment_types').remove(T('assessment_types').get(id));
}

function r_deleteType(ctx) {
  var id = requireId(ctx.params.id);
  var t = T('assessment_types').get(id);
  if (!t) throw notFound();
  if (T('assessment_category_sources').where('source_assessment_type_id', id).length) throw conflict('Penilaian ini dipakai sebagai sumber nilai oleh penilaian lain. Ubah sumber nilai tersebut terlebih dahulu.');
  var asm = T('assessments').where('assessment_type_id', id);
  if (asm.some(function (a) { return a.status === 'locked'; })) throw conflict('Penilaian ini memiliki lembar nilai yang sudah dikunci (disahkan) dan tidak dapat dihapus.');
  var asmIds = new Set(asm.map(function (a) { return a.id; }));
  var scores = 0;
  T('student_scores').rows().forEach(function (s) { if (asmIds.has(s.assessment_id)) scores += Object.keys(s.values_json || {}).length; });
  if (scores && ctx.query.force !== '1') throw conflict('Penilaian ini sudah berisi ' + scores + ' nilai. Konfirmasi penghapusan diperlukan.');
  T('semesters').rows().forEach(function (s) {
    var p = {};
    ['report_assessment_type_id', 'skill_assessment_type_id', 'mid_assessment_type_id'].forEach(function (k) { if (s[k] === id) p[k] = null; });
    T('semesters').update(s, p);
  });
  deleteTypeCascade(id);
  audit(ctx, 'Hapus jenis penilaian', { entity: 'assessment_type', entityId: id, before: t, detail: scores + ' nilai ikut terhapus' });
  return { deleted: true };
}

function saveCategoriesFor(ctx, typeId, rawCats, requireConfirm, confirmDelete) {
  var type = T('assessment_types').get(typeId);
  if (!type) throw notFound('Jenis penilaian tidak ditemukan');
  var lockedSheets = T('assessments').where('assessment_type_id', typeId).filter(function (a) { return a.status === 'locked'; }).length;
  var existing = T('assessment_categories').where('assessment_type_id', typeId);
  var existingIds = new Set(existing.map(function (c) { return c.id; }));
  var cats = arr(rawCats, 'Kategori').map(function (c, i) {
    var v = clean(c, {
      name: { type: 'string', required: true, max: 80, label: 'Nama kategori' }, code: { type: 'string', max: 15, label: 'Singkatan' },
      weight: { type: 'number', required: true, min: 0, max: 100, label: 'Bobot' }, required: { type: 'bool', default: 1 },
      source_type: { type: 'enum', values: SOURCE_TYPES, default: 'manual', label: 'Sumber nilai' }
    });
    v.id = c.id && existingIds.has(c.id) ? c.id : null;
    v.sort_order = i;
    if (v.source_type !== 'manual') {
      var src = c.source || {};
      v.source = { assessment_type_id: requireId(src.assessment_type_id, 'Penilaian sumber'), category_id: optId(src.category_id, 'Kategori sumber'), sync_mode: src.sync_mode === 'copy' ? 'copy' : 'live', only_locked: src.only_locked ? 1 : 0 };
    }
    return v;
  });
  if (!cats.length) throw bad('Minimal satu kategori penilaian');
  var names = new Set();
  cats.forEach(function (c) { var k = c.name.toLowerCase(); if (names.has(k)) throw bad('Nama kategori "' + c.name + '" ganda'); names.add(k); });
  var total = Math.round(cats.reduce(function (a, c) { return a + c.weight; }, 0) * 1000) / 1000;
  if (Math.abs(total - 100) > 0.001) throw bad('Total bobot harus 100%. Saat ini ' + total + '%.', { total: total });

  var graph = sourceGraph();
  graph.delete(typeId);
  var used = new Set();
  cats.forEach(function (c) {
    if (!c.source) return;
    var s = c.source;
    if (s.assessment_type_id === typeId) throw bad('Kategori "' + c.name + '" tidak boleh mengambil nilai dari penilaian yang sama');
    var srcType = T('assessment_types').get(s.assessment_type_id);
    if (!srcType) throw bad('Penilaian sumber untuk "' + c.name + '" tidak ditemukan');
    if (c.source_type === 'assessment' && srcType.semester_id !== type.semester_id) throw bad('Sumber "' + c.name + '" harus penilaian pada semester yang sama (gunakan "Penilaian sebelumnya" untuk semester lain)');
    if (c.source_type === 'previous' && srcType.semester_id === type.semester_id) throw bad('Sumber "' + c.name + '" bertipe penilaian sebelumnya harus berasal dari semester lain');
    if (c.source_type === 'category') {
      if (!s.category_id) throw bad('Pilih kategori sumber untuk "' + c.name + '"');
      var sc = T('assessment_categories').get(s.category_id);
      if (!sc || sc.assessment_type_id !== s.assessment_type_id) throw bad('Kategori sumber untuk "' + c.name + '" tidak sesuai dengan penilaian sumber');
    } else s.category_id = null;
    var key = s.assessment_type_id + '|' + (s.category_id || '');
    if (used.has(key)) throw bad('Sumber nilai yang sama dipakai lebih dari satu kategori ("' + c.name + '"). Hindari pengambilan nilai berulang.');
    used.add(key);
    if (reaches(graph, s.assessment_type_id, typeId)) throw bad('Perhitungan melingkar: "' + srcType.name + '" (langsung atau tidak langsung) mengambil nilai dari penilaian ini.');
  });

  var keep = new Set(cats.filter(function (c) { return c.id; }).map(function (c) { return c.id; }));
  var removed = existing.filter(function (c) { return !keep.has(c.id); });
  if (removed.length) {
    var rmIds = new Set(removed.map(function (c) { return c.id; }));
    var asmIds = new Set(T('assessments').where('assessment_type_id', typeId).map(function (a) { return a.id; }));
    var n = 0;
    T('student_scores').rows().forEach(function (s) { if (asmIds.has(s.assessment_id)) Object.keys(s.values_json || {}).forEach(function (k) { if (rmIds.has(k)) n++; }); });
    if (n && lockedSheets) throw conflict('Kategori yang sudah berisi nilai tidak dapat dihapus karena ada lembar yang dikunci.');
    if (n && requireConfirm && !confirmDelete) {
      throw conflict('Kategori ' + removed.map(function (c) { return '"' + c.name + '"'; }).join(', ') + ' sudah berisi ' + n + ' nilai yang akan ikut terhapus. Konfirmasi diperlukan.', { needs_confirm: true });
    }
    T('student_scores').rows().forEach(function (s) {
      if (!asmIds.has(s.assessment_id)) return;
      var v = Object.assign({}, s.values_json || {}), o = Object.assign({}, s.origins_json || {}), ch = false;
      rmIds.forEach(function (k) { if (k in v) { delete v[k]; delete o[k]; ch = true; } });
      if (ch) T('student_scores').update(s, { values_json: v, origins_json: o });
    });
    T('assessment_category_sources').removeWhere(function (s) { return rmIds.has(s.category_id); });
    T('assessment_categories').removeWhere(function (c) { return rmIds.has(c.id); });
  }
  cats.forEach(function (c) {
    var row = c.id ? T('assessment_categories').get(c.id) : null;
    var data = { name: c.name, code: c.code, weight: c.weight, required: c.required, source_type: c.source_type, sort_order: c.sort_order };
    if (row) T('assessment_categories').update(row, data);
    else row = T('assessment_categories').insert(Object.assign({ assessment_type_id: typeId }, data));
    T('assessment_category_sources').removeWhere(function (s) { return s.category_id === row.id; });
    if (c.source) T('assessment_category_sources').insert({ category_id: row.id, source_assessment_type_id: c.source.assessment_type_id, source_category_id: c.source.category_id, sync_mode: c.source.sync_mode, only_locked: c.source.only_locked });
  });
  T('assessment_types').update(type, { updated_at: nowIso() });
  audit(ctx, 'Simpan kategori & bobot penilaian', {
    entity: 'assessment_type', entityId: typeId,
    before: existing.map(function (c) { return { name: c.name, weight: c.weight, source_type: c.source_type }; }),
    after: cats.map(function (c) { return { name: c.name, weight: c.weight, source_type: c.source_type, source: c.source || null }; })
  });
  if (cats.some(function (c) { return c.source && c.source.sync_mode === 'copy'; })) syncCopySources(ctx.user, typeId);
  return { saved: cats.length, removed: removed.length };
}

function r_saveCategories(ctx) { return saveCategoriesFor(ctx, requireId(ctx.params.id), ctx.body.categories, true, !!ctx.body.confirm_delete); }

function duplicateTypeInto(ctx, srcId, targetSem, name) {
  var t = T('assessment_types').get(srcId);
  if (!t) throw notFound('Penilaian sumber tidak ditemukan');
  var cats = categoriesWithSources(srcId);
  var nt = T('assessment_types').insert({
    semester_id: targetSem.id, name: name || t.name, code: t.code, kind: t.kind, description: t.description, active: 1, input_open: 1,
    decimals: t.decimals, rounding: t.rounding, require_complete: t.require_complete, sort_order: t.sort_order, copied_from: srcId, created_by: ctx.user.full_name
  });
  var catMap = new Map();
  cats.forEach(function (c) {
    var nc = T('assessment_categories').insert({ assessment_type_id: nt.id, name: c.name, code: c.code, weight: c.weight, required: c.required, source_type: c.source_type, sort_order: c.sort_order });
    catMap.set(c.id, nc.id);
  });
  return { newId: nt.id, cats: cats, catMap: catMap };
}

function remapSources(copies, typeMap, targetSem) {
  copies.forEach(function (cp) {
    cp.cats.forEach(function (c) {
      if (!c.source_assessment_type_id) return;
      var srcType = c.source_assessment_type_id, srcCat = c.source_category_id;
      var mapped = typeMap.get(srcType);
      if (mapped) { srcType = mapped.newId; srcCat = srcCat ? mapped.catMap.get(srcCat) || null : null; }
      else if (c.source_type === 'assessment') {
        var same = T('assessment_types').where('semester_id', targetSem.id).filter(function (x) { return x.name === c.source_type_name && x.id !== cp.newId; })[0];
        if (same) {
          srcType = same.id;
          if (srcCat) { var sc = T('assessment_categories').where('assessment_type_id', same.id).filter(function (x) { return x.name === c.source_category_name; })[0]; srcCat = sc ? sc.id : null; }
        }
      }
      T('assessment_category_sources').insert({ category_id: cp.catMap.get(c.id), source_assessment_type_id: srcType, source_category_id: srcCat, sync_mode: c.sync_mode, only_locked: c.only_locked || 0 });
    });
  });
}

function r_duplicateType(ctx) {
  var src = T('assessment_types').get(requireId(ctx.params.id));
  if (!src) throw notFound();
  var targetSem = getSemester(ctx.body.semester_id ? requireId(ctx.body.semester_id) : src.semester_id);
  var name = String(ctx.body.name || (targetSem.id === src.semester_id ? src.name + ' (Salinan)' : src.name)).trim().slice(0, 120);
  var cp = duplicateTypeInto(ctx, src.id, targetSem, name);
  remapSources([cp], new Map(), targetSem);
  audit(ctx, 'Duplikasi jenis penilaian', { entity: 'assessment_type', entityId: cp.newId, detail: src.name + ' -> ' + name + ' (' + targetSem.year_name + ' ' + targetSem.name + ')' });
  return { id: cp.newId };
}

function r_copySemesterConfig(ctx) {
  var from = getSemester(requireId(ctx.body.from_semester_id, 'Semester sumber'));
  var to = getSemester(requireId(ctx.body.to_semester_id, 'Semester tujuan'));
  if (from.id === to.id) throw bad('Semester sumber dan tujuan sama');
  var existing = new Set(T('assessment_types').where('semester_id', to.id).map(function (t) { return t.name; }));
  var typeMap = new Map(), copies = [], skipped = 0;
  sortBy(T('assessment_types').where('semester_id', from.id), [function (t) { return t.sort_order; }, function (t) { return t.created_at; }]).forEach(function (t) {
    if (existing.has(t.name)) { skipped++; return; }
    var cp = duplicateTypeInto(ctx, t.id, to, t.name);
    typeMap.set(t.id, cp);
    copies.push(cp);
  });
  remapSources(copies, typeMap, to);
  var semRow = T('semesters').get(to.id);
  var p = {};
  ['report_assessment_type_id', 'skill_assessment_type_id', 'mid_assessment_type_id'].forEach(function (k) {
    if (!semRow[k] && from[k] && typeMap.get(from[k])) p[k] = typeMap.get(from[k]).newId;
  });
  T('semesters').update(semRow, p);
  audit(ctx, 'Salin konfigurasi penilaian semester', { detail: from.year_name + ' ' + from.name + ' -> ' + to.year_name + ' ' + to.name + ': ' + copies.length + ' jenis' });
  return { copied: copies.length, skipped: skipped };
}

function r_setInput(ctx) {
  var t = T('assessment_types').get(requireId(ctx.params.id));
  if (!t) throw notFound();
  var open = ctx.body.open ? 1 : 0;
  T('assessment_types').update(t, { input_open: open, updated_at: nowIso() });
  audit(ctx, open ? 'Buka penginputan nilai' : 'Tutup penginputan nilai', { entity: 'assessment_type', entityId: t.id, detail: t.name });
  return { input_open: open };
}

function r_syncType(ctx) {
  var id = requireId(ctx.params.id);
  var res = syncCopySources(ctx.user, id);
  audit(ctx, 'Sinkronisasi sumber nilai', { entity: 'assessment_type', entityId: id, detail: res.updated + ' nilai diperbarui' });
  return res;
}

function r_lockAll(ctx) {
  var t = T('assessment_types').get(requireId(ctx.params.id));
  if (!t) throw notFound();
  if (!ctx.body.only_submitted) T('teacher_assignments').where('semester_id', t.semester_id).forEach(function (a) { ensureAssessment(t.id, a.subject_id, a.class_id); });
  var sheets = T('assessments').where('assessment_type_id', t.id).filter(function (a) { return ctx.body.only_submitted ? a.status === 'submitted' : a.status !== 'locked'; });
  sheets.forEach(function (a) { lockAssessment(ctx.user, a); });
  audit(ctx, 'Kunci nilai massal', { entity: 'assessment_type', entityId: t.id, detail: t.name + ': ' + sheets.length + ' lembar' });
  return { locked: sheets.length };
}


/* ---------- Rute: lembar input nilai, kirim/kunci/kembalikan, revisi, monitoring ---------- */
function todayStr() { return nowIso().slice(0, 10); }

function editability(ctx, type, asm) {
  var status = asm ? asm.status : 'draft';
  if (status === 'locked') return { editable: false, reason: 'Nilai sudah dikunci admin' };
  if (ctx.isAdmin) return { editable: true, reason: null };
  if (!type.active) return { editable: false, reason: 'Penilaian tidak aktif' };
  if (!type.input_open) return { editable: false, reason: 'Penginputan nilai sedang ditutup admin' };
  if (type.start_date && todayStr() < type.start_date) return { editable: false, reason: 'Periode input dimulai ' + type.start_date };
  if (type.end_date && todayStr() > type.end_date) return { editable: false, reason: 'Periode input berakhir ' + type.end_date };
  if (status === 'submitted') return { editable: false, reason: 'Nilai sudah dikirim ke admin. Tarik kembali untuk mengubah.' };
  return { editable: true, reason: null };
}

function sheetContext(ctx, typeId, subjectId, classId) {
  var engine = new Engine();
  var type = engine.type(requireId(typeId, 'Jenis penilaian'));
  subjectId = requireId(subjectId, 'Mapel');
  classId = requireId(classId, 'Kelas');
  var sem = getSemester(type.semester_id);
  assertSheetAccess(ctx, subjectId, classId, sem.id);
  var c = T('classes').get(classId);
  if (!c) throw notFound('Kelas tidak ditemukan');
  if (c.academic_year_id !== sem.academic_year_id) throw bad('Kelas tidak sesuai dengan tahun pelajaran penilaian');
  var t = c.homeroom_teacher_id ? T('teachers').get(c.homeroom_teacher_id) : null;
  var cls = Object.assign({}, c, { homeroom_name: t ? t.name : null });
  var subject = T('subjects').get(subjectId);
  if (!subject) throw notFound('Mapel tidak ditemukan');
  return { engine: engine, type: type, sem: sem, cls: cls, subject: copyRow(subject), asm: findAssessment(type.id, subjectId, classId) };
}

function r_getGrid(ctx) {
  var q = ctx.query;
  var s = sheetContext(ctx, q.type_id, q.subject_id, q.class_id);
  var students = classStudents(s.cls.id);
  var res = s.engine.results(s.type.id, students.map(function (x) { return x.id; }), [s.subject.id]);
  var settings = getSettings();
  var asg = findAssignment(s.subject.id, s.cls.id, s.sem.id);
  var teacher = asg ? T('teachers').get(asg.teacher_id) : null;
  var srcInfo = new Map(categoriesWithSources(s.type.id).map(function (c) { return [c.id, c]; }));
  var typeInfo = Object.assign({}, s.type);
  delete typeInfo.categories;
  var a = s.asm;
  return Object.assign({
    type: typeInfo,
    semester: { id: s.sem.id, name: s.sem.name, year_name: s.sem.year_name, academic_year_id: s.sem.academic_year_id },
    subject: s.subject, class: s.cls, teacher: teacher ? { name: teacher.name, nip: teacher.nip } : null,
    kktp: s.subject.kktp !== null && s.subject.kktp !== undefined ? s.subject.kktp : Number(settings.kktp_umum || 75),
    categories: s.type.categories.map(function (c) {
      var i = srcInfo.get(c.id) || {};
      return Object.assign({}, c, { source_type_name: i.source_type_name || null, source_category_name: i.source_category_name || null, editable: c.source_type === 'manual' });
    }),
    students: students.map(function (st) {
      var r = res.get(s.subject.id + '|' + st.id);
      return Object.assign({}, st, { values: r.values, origins: r.origins, final: r.final, complete: r.complete, provisional: r.provisional, filled: r.filled });
    }),
    assessment: a ? pick(a, ['id', 'status', 'return_note', 'submitted_at', 'locked_at', 'locked_by']) : { id: null, status: 'draft' }
  }, editability(ctx, s.type, a));
}

function r_saveGrid(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  var ed = editability(ctx, s.type, s.asm);
  if (!ed.editable) throw forbidden(ed.reason);
  var changes = arr(b.changes, 'Perubahan nilai');
  if (changes.length > 5000) throw bad('Terlalu banyak perubahan dalam satu kali simpan');
  var students = classStudents(s.cls.id);
  var studentSet = new Set(students.map(function (x) { return x.id; }));
  var manual = new Set(s.type.categories.filter(function (c) { return c.source_type === 'manual'; }).map(function (c) { return c.id; }));
  var errors = [], valid = [];
  changes.forEach(function (ch, i) {
    try {
      var sid = requireId(ch.student_id, 'Siswa'), cid = requireId(ch.category_id, 'Kategori');
      if (!studentSet.has(sid)) throw bad('Siswa tidak terdaftar di kelas ini');
      if (!manual.has(cid)) throw bad('Kategori ini diambil otomatis dari penilaian lain dan tidak dapat diisi manual');
      valid.push([sid, cid, parseScore(ch.score)]);
    } catch (e) {
      errors.push({ index: i, student_id: ch.student_id, category_id: ch.category_id, message: e.message });
    }
  });
  if (errors.length && !b.partial) throw bad(errors.length + ' nilai tidak valid. Tidak ada yang disimpan.', { errors: errors });
  var asm = s.asm || ensureAssessment(s.type.id, s.subject.id, s.cls.id);
  var changed = 0;
  valid.forEach(function (v) { if (setScore(ctx.user, asm, v[1], v[0], v[2], b.origin === 'import' ? 'import' : 'manual')) changed++; });
  var now = nowIso();
  if (changed) {
    T('assessments').update(asm, { updated_at: now });
    audit(ctx, 'Input nilai', { entity: 'assessment', entityId: asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name + ': ' + changed + ' perubahan' });
  }
  var res = new Engine().results(s.type.id, students.map(function (x) { return x.id; }), [s.subject.id]);
  return {
    saved: changed, errors: errors, saved_at: now, sem_id: s.sem.id,
    finals: students.map(function (st) { var r = res.get(s.subject.id + '|' + st.id); return { student_id: st.id, final: r.final, complete: r.complete, provisional: r.provisional, values: r.values }; })
  };
}

function notifyTeacher(asm, sem, title, body) {
  var a = findAssignment(asm.subject_id, asm.class_id, sem.id);
  var u = a ? T('users').one('teacher_id', a.teacher_id) : null;
  if (u) T('notifications').insert({ user_id: u.id, title: title, body: body, link: '#input' });
}

function r_submitSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  var ed = editability(ctx, s.type, s.asm);
  if (!ed.editable) throw forbidden(ed.reason);
  var students = classStudents(s.cls.id);
  var res = s.engine.results(s.type.id, students.map(function (x) { return x.id; }), [s.subject.id]);
  var incomplete = students.filter(function (x) { return !res.get(s.subject.id + '|' + x.id).complete; }).length;
  if (incomplete && !b.confirm) throw conflict(incomplete + ' siswa nilainya belum lengkap. Tetap kirim?', { needs_confirm: true, incomplete: incomplete });
  var asm = s.asm || ensureAssessment(s.type.id, s.subject.id, s.cls.id);
  var now = nowIso();
  T('assessments').update(asm, { status: 'submitted', submitted_at: now, submitted_by: ctx.user.full_name, updated_at: now });
  T('notifications').insert({ role: 'admin', title: 'Nilai dikirim: ' + s.subject.name + ' ' + s.cls.name, body: s.type.name + ' oleh ' + ctx.user.full_name + (incomplete ? ' (' + incomplete + ' siswa belum lengkap)' : ''), link: '#monitoring' });
  audit(ctx, 'Kirim nilai ke admin', { entity: 'assessment', entityId: asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name });
  return { status: 'submitted' };
}

function r_withdrawSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  if (!s.asm || s.asm.status !== 'submitted') throw bad('Lembar nilai tidak dalam status terkirim');
  T('assessments').update(s.asm, { status: 'draft', updated_at: nowIso() });
  audit(ctx, 'Tarik kembali kiriman nilai', { entity: 'assessment', entityId: s.asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name });
  return { status: 'draft' };
}

function r_lockSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  if (s.asm && s.asm.status === 'locked') throw bad('Lembar nilai sudah dikunci');
  var asm = s.asm || ensureAssessment(s.type.id, s.subject.id, s.cls.id);
  var r = lockAssessment(ctx.user, asm);
  notifyTeacher(asm, s.sem, 'Nilai dikunci: ' + s.subject.name + ' ' + s.cls.name, s.type.name + ' telah diverifikasi dan dikunci admin.');
  audit(ctx, 'Kunci nilai', { entity: 'assessment', entityId: asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name + ' (snapshot v' + r.version + ')' });
  return { status: 'locked', version: r.version };
}

function r_unlockSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  if (!s.asm || s.asm.status !== 'locked') throw bad('Lembar nilai tidak dalam status terkunci');
  var note = String(b.note || '').slice(0, 500) || null;
  var status = b.return_to_teacher ? 'returned' : 'draft';
  notifyTeacher(s.asm, s.sem, 'Kunci nilai dibuka: ' + s.subject.name + ' ' + s.cls.name, note || s.type.name + ' dapat diperbaiki kembali.');
  T('assessments').update(s.asm, { status: status, return_note: note, updated_at: nowIso() });
  audit(ctx, 'Buka kunci nilai', { entity: 'assessment', entityId: s.asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name + (note ? ' | ' + note : '') });
  return { status: status };
}

function r_returnSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  if (!s.asm || s.asm.status === 'locked') throw bad('Lembar yang dikunci harus dibuka kuncinya terlebih dahulu');
  var note = String(b.note || '').trim().slice(0, 500);
  if (!note) throw bad('Tuliskan catatan perbaikan untuk guru');
  notifyTeacher(s.asm, s.sem, 'Nilai dikembalikan: ' + s.subject.name + ' ' + s.cls.name, note);
  T('assessments').update(s.asm, { status: 'returned', return_note: note, updated_at: nowIso() });
  audit(ctx, 'Kembalikan nilai ke guru', { entity: 'assessment', entityId: s.asm.id, detail: s.type.name + ' | ' + s.subject.name + ' | ' + s.cls.name + ' | ' + note });
  return { status: 'returned' };
}

function r_syncSheet(ctx) {
  var b = ctx.body;
  var s = sheetContext(ctx, b.type_id, b.subject_id, b.class_id);
  var ed = editability(ctx, s.type, s.asm);
  if (!ed.editable) throw forbidden(ed.reason);
  var res = syncCopySources(ctx.user, s.type.id, { subjectId: s.subject.id, classId: s.cls.id });
  audit(ctx, 'Sinkronisasi sumber nilai', { entity: 'assessment_type', entityId: s.type.id, detail: s.subject.name + ' ' + s.cls.name + ': ' + res.updated + ' nilai' });
  return res;
}

function r_revisions(ctx) {
  var q = ctx.query;
  var list = T('score_revisions').rows();
  if (q.type_id && q.subject_id && q.class_id) {
    var s = sheetContext(ctx, q.type_id, q.subject_id, q.class_id);
    if (!s.asm) return [];
    list = T('score_revisions').where('assessment_id', s.asm.id);
  } else if (!ctx.isAdmin) list = T('score_revisions').where('changed_by', ctx.user.id);
  if (q.student_id) list = list.filter(function (r) { return r.student_id === q.student_id; });
  if (q.user_id && ctx.isAdmin) list = list.filter(function (r) { return r.changed_by === q.user_id; });
  if (q.from) list = list.filter(function (r) { return r.created_at >= String(q.from).slice(0, 10); });
  if (q.to) list = list.filter(function (r) { return r.created_at < String(q.to).slice(0, 10) + 'T23:59:59.999Z'; });
  return revisionRows(list).slice(0, Math.min(Number(q.limit) || 500, 2000));
}

function r_monitoring(ctx) {
  var sem = semesterFromQuery(ctx);
  var teacherId = ctx.isAdmin ? (ctx.query.teacher_id || null) : ctx.user.teacher_id;
  if (!ctx.isAdmin && !teacherId) return { semester: sem, rows: [], types: [] };
  var r = computeMonitoring(sem, { typeId: ctx.query.type_id || null, teacherId: teacherId });
  return { semester: sem, rows: r.rows, types: r.types.map(function (t) { return pick(t, ['id', 'name', 'input_open', 'end_date']); }) };
}


/* ---------- Rute: leger, data rapor, isian wali kelas, deskripsi guru, pengambilan rapor, cek nilai publik ---------- */

function studentsOfScope(opts) {
  if (opts.classId) {
    var c = T('classes').get(opts.classId);
    if (!c) throw notFound('Kelas tidak ditemukan');
    return { classes: [copyRow(c)], students: classStudents(c.id).map(function (s) { return Object.assign(s, { class_id: c.id, class_name: c.name }); }) };
  }
  var classes = sortBy(T('classes').where('academic_year_id', opts.yearId).filter(function (c) { return !opts.gradeLevel || c.grade_level === opts.gradeLevel; }),
    [function (c) { return c.grade_level; }, function (c) { return c.sort_order; }, function (c) { return c.name; }]).map(copyRow);
  var students = [];
  classes.forEach(function (c) { classStudents(c.id).forEach(function (s) { students.push(Object.assign(s, { class_id: c.id, class_name: c.name })); }); });
  return { classes: classes, students: students };
}

function summarize(students, subjects, res, kktpOf, extraRes) {
  return students.map(function (s) {
    var scores = {}, total = 0, count = 0, tuntas = 0;
    subjects.forEach(function (sb) {
      var r = res.get(sb.id + '|' + s.id);
      var v = r ? r.final : null;
      scores[sb.id] = v;
      if (v !== null && v !== undefined) { total += v; count++; if (v >= kktpOf(sb)) tuntas++; }
      if (extraRes) { var k = extraRes.get(sb.id + '|' + s.id); if (k && k.final !== null && k.final !== undefined) { total += k.final; count++; } }
    });
    var filledN = Object.keys(scores).filter(function (k) { return scores[k] !== null && scores[k] !== undefined; }).length;
    return {
      student_id: s.id, scores: scores, total: round(total, 2), count: count, average: count ? round(total / count, 2) : 0,
      tuntas: tuntas, belum_tuntas: filledN - tuntas, status: count === subjects.length && tuntas === subjects.length ? 'Tuntas' : 'Belum Tuntas'
    };
  });
}

function activeSubjects() { return sortBy(T('subjects').filter(function (s) { return s.active; }).map(copyRow), [function (s) { return s.sort_order; }, function (s) { return s.name; }]); }
function kktpFn(settings) { var u = Number(settings.kktp_umum || 75); return function (sb) { return sb.kktp !== null && sb.kktp !== undefined ? sb.kktp : u; }; }

function r_leger(ctx) {
  var q = ctx.query;
  var engine = new Engine();
  var type = engine.type(requireId(q.type_id, 'Jenis penilaian'));
  var sem = getSemester(type.semester_id);
  var settings = getSettings();
  var classId = optId(q.class_id, 'Kelas');
  var gradeLevel = q.grade_level ? Number(q.grade_level) : null;
  if (!ctx.isAdmin && (!classId || !isHomeroom(ctx, classId))) throw forbidden('Leger hanya untuk admin atau wali kelas');
  var scope = studentsOfScope({ classId: classId, gradeLevel: gradeLevel, yearId: sem.academic_year_id });
  var subjects = activeSubjects();
  if (q.subject_ids) { var want = new Set(String(q.subject_ids).split(',')); subjects = subjects.filter(function (s) { return want.has(s.id); }); }
  var kktpOf = kktpFn(settings);
  var ids = scope.students.map(function (s) { return s.id; });
  var res = ids.length && subjects.length ? engine.results(type.id, ids, subjects.map(function (s) { return s.id; })) : new Map();
  var rows = summarize(scope.students, subjects, res, kktpOf);
  var basis = settings.dasar_peringkat === 'rata' ? 'rata' : 'jumlah';
  rankRows(rows, basis);
  var byClass = new Map();
  rows.forEach(function (r, i) { var cid = scope.students[i].class_id; if (!byClass.has(cid)) byClass.set(cid, []); byClass.get(cid).push(Object.assign({}, r, { _i: i })); });
  byClass.forEach(function (list) { rankRows(list, basis); list.forEach(function (x) { rows[x._i].class_rank = x.rank; }); });
  var stats = subjects.map(function (sb) {
    var vals = rows.map(function (r) { return r.scores[sb.id]; }).filter(function (v) { return v !== null && v !== undefined; });
    return { subject_id: sb.id, average: vals.length ? round(vals.reduce(function (a, b) { return a + b; }, 0) / vals.length, 2) : null, max: vals.length ? Math.max.apply(null, vals) : null, min: vals.length ? Math.min.apply(null, vals) : null, filled: vals.length, tuntas: vals.filter(function (v) { return v >= kktpOf(sb); }).length };
  });
  var typeInfo = Object.assign({}, type);
  delete typeInfo.categories;
  return {
    type: typeInfo, semester: sem, classes: scope.classes, subjects: subjects.map(function (s) { return Object.assign({}, s, { kktp_effective: kktpOf(s) }); }),
    students: scope.students.map(function (s, i) { return Object.assign({ id: s.id, name: s.name, nis: s.nis, nisn: s.nisn, gender: s.gender, roll_no: s.roll_no, class_id: s.class_id, class_name: s.class_name }, rows[i]); }),
    stats: stats, sheet_status: T('assessments').where('assessment_type_id', type.id).map(function (a) { return pick(a, ['subject_id', 'class_id', 'status']); }),
    ranking_enabled: truthy(settings.peringkat_aktif), basis: basis
  };
}

function bySemesterClass(table, semId, studentSet) {
  return T(table).where('semester_id', semId).filter(function (r) { return studentSet.has(r.student_id); });
}

function r_reportData(ctx) {
  var q = ctx.query;
  var sem = q.semester_id ? getSemester(requireId(q.semester_id)) : activeSemester();
  if (!sem) throw bad('Belum ada semester aktif');
  var classId = requireId(q.class_id, 'Kelas');
  assertHomeroomOrAdmin(ctx, classId);
  var settings = getSettings();
  var format = q.format || settings.format_raport;
  var mainType = format === 'mid' ? (sem.mid_assessment_type_id || sem.report_assessment_type_id) : sem.report_assessment_type_id;
  if (!mainType) throw bad('Jenis penilaian untuk rapor belum diatur. Buka menu Rapor > Pengaturan Rapor Semester.');
  var engine = new Engine();
  var c = T('classes').get(classId);
  if (!c) throw notFound('Kelas tidak ditemukan');
  var ht = c.homeroom_teacher_id ? T('teachers').get(c.homeroom_teacher_id) : null;
  var cls = Object.assign({}, c, { homeroom_name: ht ? ht.name : null, homeroom_nip: ht ? ht.nip : null });
  var subjects = activeSubjects();
  var subjIds = subjects.map(function (s) { return s.id; });
  var scales = T('grade_scales').rows().map(copyRow);
  var students = classStudents(classId).map(function (s) { return Object.assign({}, T('students').get(s.id), { roll_no: s.roll_no, class_id: classId }); });
  var ids = students.map(function (s) { return s.id; });
  var res = engine.results(mainType, ids, subjIds);
  var skillType = settings.mode_keterampilan === 'terpisah' && format === 'semester' ? sem.skill_assessment_type_id : null;
  var skill = skillType ? engine.results(skillType, ids, subjIds) : null;
  var kktpOf = kktpFn(settings);
  var basis = settings.dasar_peringkat === 'rata' ? 'rata' : 'jumlah';
  var rows = rankRows(summarize(students, subjects, res, kktpOf, skill), basis);
  var grade = studentsOfScope({ gradeLevel: c.grade_level, yearId: c.academic_year_id });
  var gids = grade.students.map(function (s) { return s.id; });
  var gRows = rankRows(summarize(grade.students, subjects, engine.results(mainType, gids, subjIds), kktpOf, skillType ? engine.results(skillType, gids, subjIds) : null), basis);
  var gradeRank = new Map(gRows.map(function (r) { return [r.student_id, r.rank]; }));
  var set = new Set(ids);
  var comments = bySemesterClass('teacher_comments', sem.id, set);
  var cards = bySemesterClass('report_cards', sem.id, set), att = bySemesterClass('attendance', sem.id, set);
  var eksT = T('extracurriculars');
  var eks = bySemesterClass('student_extracurriculars', sem.id, set).map(function (e) { var x = eksT.get(e.extracurricular_id) || {}; return Object.assign({}, e, { name: x.name, sort_order: x.sort_order }); });
  sortBy(eks, [function (e) { return e.sort_order; }, function (e) { return e.name; }]);
  var picks = bySemesterClass('report_pickups', sem.id, set);
  var ctMap = new Map(comments.map(function (x) { return [x.student_id + '|' + x.subject_id, x]; }));
  var out = students.map(function (s, i) {
    var grades = {}, skills = {}, details = {};
    subjects.forEach(function (sb) {
      var r = res.get(sb.id + '|' + s.id);
      grades[sb.id] = r ? r.final : null;
      details[sb.id] = r ? { complete: r.complete, provisional: r.provisional, locked: r.locked } : null;
      if (skill) { var k = skill.get(sb.id + '|' + s.id); skills[sb.id] = k ? k.final : null; }
      var cm = ctMap.get(s.id + '|' + sb.id);
      if (cm) details[sb.id] = Object.assign({}, details[sb.id] || {}, { comment: { mastered: cm.mastered, improve: cm.improve, custom_text: cm.custom_text } });
    });
    return Object.assign({}, s, {
      grades: grades, skills: skill ? skills : null, details: details, total: rows[i].total, count: rows[i].count, average: rows[i].average, rank: rows[i].rank,
      grade_rank: gradeRank.get(s.id) || null, tuntas: rows[i].tuntas, status: rows[i].status,
      card: copyRow(cards.filter(function (x) { return x.student_id === s.id; })[0] || null), attendance: copyRow(att.filter(function (x) { return x.student_id === s.id; })[0] || null),
      ekskul: eks.filter(function (e) { return e.student_id === s.id; }).map(function (e) { return { name: e.name, grade: e.grade, description: e.description }; }),
      pickup: copyRow(picks.filter(function (x) { return x.student_id === s.id; })[0] || null)
    });
  });
  return {
    semester: sem, year: copyRow(T('academic_years').get(sem.academic_year_id)), class: cls, settings: settings, format: format,
    subjects: subjects.map(function (s) { return Object.assign({}, s, { kktp_effective: kktpOf(s) }); }), scales: scales, students: out, grade_size: grade.students.length,
    main_type_id: mainType, skill_type_id: skillType, ranking_enabled: truthy(settings.peringkat_aktif)
  };
}

var CARD_FIELDS = ['spiritual_pred', 'spiritual_desc', 'social_pred', 'social_desc', 'cocurricular_grade', 'cocurricular_strong', 'cocurricular_weak', 'cocurricular_desc', 'homeroom_note', 'parent_response', 'decision', 'report_number'];
var GURU_FIELD_SETTING = {
  spiritual_pred: 'wali_sikap', spiritual_desc: 'wali_sikap', social_pred: 'wali_sikap', social_desc: 'wali_sikap',
  cocurricular_grade: 'wali_kokurikuler', cocurricular_strong: 'wali_kokurikuler', cocurricular_weak: 'wali_kokurikuler', cocurricular_desc: 'wali_kokurikuler',
  homeroom_note: 'wali_catatan', decision: 'wali_catatan', parent_response: null, report_number: null
};

function rowFor(table, studentId, semId) { return T(table).where('student_id', studentId).filter(function (r) { return r.semester_id === semId; })[0] || null; }

function r_listReportCards(ctx) {
  var sem = ctx.query.semester_id ? getSemester(requireId(ctx.query.semester_id)) : activeSemester();
  if (!sem) throw bad('Belum ada semester aktif');
  var classId = requireId(ctx.query.class_id, 'Kelas');
  assertHomeroomOrAdmin(ctx, classId);
  var students = classStudents(classId);
  return {
    semester: sem,
    extracurriculars: sortBy(T('extracurriculars').filter(function (e) { return e.active; }).map(copyRow), [function (e) { return e.sort_order; }, function (e) { return e.name; }]),
    students: students.map(function (s) {
      return Object.assign({}, s, {
        card: copyRow(rowFor('report_cards', s.id, sem.id)), attendance: copyRow(rowFor('attendance', s.id, sem.id)),
        ekskul: T('student_extracurriculars').where('student_id', s.id).filter(function (e) { return e.semester_id === sem.id; }).map(copyRow)
      });
    })
  };
}

function intOrNull(v, label) {
  if (v === null || v === undefined || v === '') return null;
  var n = Number(v);
  if (!Number.isInteger(n) || n < 0 || n > 366) throw bad(label + ' harus bilangan bulat 0-366');
  return n;
}

function r_saveReportCards(ctx) {
  var b = ctx.body;
  var sem = getSemester(requireId(b.semester_id, 'Semester'));
  var classId = requireId(b.class_id, 'Kelas');
  assertHomeroomOrAdmin(ctx, classId);
  var settings = getSettings();
  var studentSet = new Set(classStudents(classId).map(function (s) { return s.id; }));
  var rows = arr(b.rows, 'Data siswa');
  var now = nowIso();
  var ops = [];
  // validasi seluruh baris dulu
  rows.forEach(function (r) {
    var sid = requireId(r.student_id, 'Siswa');
    if (!studentSet.has(sid)) throw bad('Siswa tidak terdaftar di kelas ini');
    var card = rowFor('report_cards', sid, sem.id);
    if (card && card.status === 'final' && !ctx.isAdmin) throw forbidden('Rapor siswa sudah difinalkan admin');
    var op = { sid: sid };
    if (r.attendance) {
      if (!ctx.isAdmin && !truthy(settings.wali_kehadiran)) throw forbidden('Isian kehadiran oleh wali kelas dinonaktifkan admin');
      op.att = {};
      [['present', 'Hadir'], ['sick', 'Sakit'], ['permit', 'Izin'], ['absent', 'Tanpa keterangan']].forEach(function (f) { if (f[0] in r.attendance) op.att[f[0]] = intOrNull(r.attendance[f[0]], f[1]); });
    }
    if (r.card) {
      op.card = {};
      CARD_FIELDS.forEach(function (f) {
        if (!(f in r.card)) return;
        if (!ctx.isAdmin) {
          var key = GURU_FIELD_SETTING[f];
          if (key === null && f !== 'parent_response') throw forbidden('Field ini hanya dapat diubah admin');
          if (key && !truthy(settings[key])) throw forbidden('Isian ini dinonaktifkan admin untuk wali kelas');
        }
        var v = r.card[f] === null || r.card[f] === undefined ? null : String(r.card[f]).slice(0, 3000);
        op.card[f] = v === '' ? null : v;
      });
    }
    if (Array.isArray(r.ekskul)) {
      if (!ctx.isAdmin && !truthy(settings.wali_ekskul)) throw forbidden('Isian ekstrakurikuler oleh wali kelas dinonaktifkan admin');
      op.eks = r.ekskul.map(function (e) {
        var eid = requireId(e.extracurricular_id, 'Ekstrakurikuler');
        if (!T('extracurriculars').get(eid)) throw bad('Ekstrakurikuler tidak ditemukan');
        return { eid: eid, remove: e.remove || (!e.grade && !e.description), grade: String(e.grade || '').slice(0, 40) || null, description: String(e.description || '').slice(0, 1000) || null };
      });
    }
    ops.push(op);
  });
  ops.forEach(function (op) {
    if (op.att && Object.keys(op.att).length) {
      var a = rowFor('attendance', op.sid, sem.id) || T('attendance').insert({ student_id: op.sid, semester_id: sem.id });
      T('attendance').update(a, Object.assign({}, op.att, { updated_by: ctx.user.full_name, updated_at: now }));
    }
    if (op.card && Object.keys(op.card).length) {
      var c = rowFor('report_cards', op.sid, sem.id) || T('report_cards').insert({ student_id: op.sid, semester_id: sem.id, status: 'draft' });
      T('report_cards').update(c, Object.assign({}, op.card, { updated_by: ctx.user.full_name, updated_at: now }));
    }
    (op.eks || []).forEach(function (e) {
      var ex = T('student_extracurriculars').where('student_id', op.sid).filter(function (x) { return x.semester_id === sem.id && x.extracurricular_id === e.eid; })[0];
      if (e.remove) { if (ex) T('student_extracurriculars').remove(ex); }
      else if (ex) T('student_extracurriculars').update(ex, { grade: e.grade, description: e.description, updated_at: now });
      else T('student_extracurriculars').insert({ student_id: op.sid, semester_id: sem.id, extracurricular_id: e.eid, grade: e.grade, description: e.description, updated_at: now });
    });
  });
  if (!ops.length) return { saved: 0 };
  audit(ctx, 'Simpan data rapor (wali kelas)', { entity: 'class', entityId: classId, detail: rows.length + ' siswa, ' + sem.year_name + ' ' + sem.name });
  return { saved: rows.length };
}

function r_finalizeReportCards(ctx) {
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester'));
  var cls = T('classes').get(requireId(ctx.body.class_id, 'Kelas'));
  if (!cls) throw notFound();
  var settings = getSettings();
  var final = ctx.body.final !== false;
  var fmt = settings.format_nomor_raport || '{NO}/RPT/{KELAS}/{TAHUN}';
  var now = nowIso();
  var students = classStudents(cls.id);
  students.forEach(function (st, i) {
    var c = rowFor('report_cards', st.id, sem.id) || T('report_cards').insert({ student_id: st.id, semester_id: sem.id, status: 'draft' });
    var number = fmt.split('{NO}').join(String(st.roll_no || i + 1).padStart(2, '0')).split('{KELAS}').join(cls.name)
      .split('{TAHUN}').join(sem.year_name.replace('/', '-')).split('{SEMESTER}').join(String(sem.term)).split('{NIS}').join(st.nis || '');
    T('report_cards').update(c, {
      status: final ? 'final' : 'draft', finalized_at: final ? now : null, finalized_by: final ? ctx.user.full_name : null,
      report_number: c.report_number || (final ? number : null), updated_at: now
    });
  });
  audit(ctx, final ? 'Finalisasi rapor' : 'Buka finalisasi rapor', { entity: 'class', entityId: cls.id, detail: cls.name + ' ' + sem.year_name + ' ' + sem.name });
  return { students: students.length, status: final ? 'final' : 'draft' };
}

function finalizedSet(semId) { return new Set(T('report_cards').where('semester_id', semId).filter(function (r) { return r.status === 'final'; }).map(function (r) { return r.student_id; })); }

function r_listComments(ctx) {
  var q = ctx.query;
  var sem = q.semester_id ? getSemester(requireId(q.semester_id)) : activeSemester();
  if (!sem) throw bad('Belum ada semester aktif');
  var subjectId = requireId(q.subject_id, 'Mapel'), classId = requireId(q.class_id, 'Kelas');
  assertSheetAccess(ctx, subjectId, classId, sem.id);
  var students = classStudents(classId);
  var comments = T('teacher_comments').where('semester_id', sem.id).filter(function (c) { return c.subject_id === subjectId; });
  var finals = sem.report_assessment_type_id ? new Engine().results(sem.report_assessment_type_id, students.map(function (s) { return s.id; }), [subjectId]) : new Map();
  var cls = copyRow(T('classes').get(classId));
  var fin = finalizedSet(sem.id);
  return {
    semester: sem, class: cls, report_type_set: !!sem.report_assessment_type_id, subject: copyRow(T('subjects').get(subjectId)),
    bank: sortBy(T('description_bank').where('subject_id', subjectId).filter(function (d) { return d.grade_level === 'Semua' || d.grade_level === String(cls.grade_level); }).map(copyRow), [function (d) { return d.text; }]),
    scales: T('grade_scales').rows().map(copyRow),
    students: students.map(function (s) {
      var r = finals.get(subjectId + '|' + s.id);
      return Object.assign({}, s, { final: r ? r.final : null, comment: copyRow(comments.filter(function (c) { return c.student_id === s.id; })[0] || null), finalized: fin.has(s.id) });
    })
  };
}

function r_saveComments(ctx) {
  var b = ctx.body;
  var sem = getSemester(requireId(b.semester_id, 'Semester'));
  var subjectId = requireId(b.subject_id, 'Mapel'), classId = requireId(b.class_id, 'Kelas');
  assertSheetAccess(ctx, subjectId, classId, sem.id);
  var set = new Set(classStudents(classId).map(function (s) { return s.id; }));
  var fin = finalizedSet(sem.id);
  var rows = arr(b.rows, 'Deskripsi');
  rows.forEach(function (r) {
    var sid = requireId(r.student_id, 'Siswa');
    if (!set.has(sid)) throw bad('Siswa tidak terdaftar di kelas ini');
    if (fin.has(sid) && !ctx.isAdmin) throw forbidden('Rapor siswa sudah difinalkan admin');
  });
  var now = nowIso();
  rows.forEach(function (r) {
    var v = function (k) { return r[k] === null || r[k] === undefined || String(r[k]).trim() === '' ? null : String(r[k]).trim().slice(0, 2000); };
    var ex = T('teacher_comments').where('student_id', r.student_id).filter(function (c) { return c.semester_id === sem.id && c.subject_id === subjectId; })[0];
    var data = { teacher_id: ctx.user.teacher_id || null, mastered: v('mastered'), improve: v('improve'), custom_text: v('custom_text'), updated_by: ctx.user.full_name, updated_at: now };
    if (ex) T('teacher_comments').update(ex, data); else T('teacher_comments').insert(Object.assign({ student_id: r.student_id, semester_id: sem.id, subject_id: subjectId }, data));
  });
  audit(ctx, 'Simpan deskripsi rapor', { entity: 'subject', entityId: subjectId, detail: rows.length + ' siswa' });
  return { saved: rows.length };
}

function r_listPickups(ctx) {
  var sem = ctx.query.semester_id ? getSemester(requireId(ctx.query.semester_id)) : activeSemester();
  if (!sem) throw bad('Belum ada semester aktif');
  var st = T('students'), cls = T('classes');
  var picks = new Map(T('report_pickups').where('semester_id', sem.id).map(function (p) { return [p.student_id, p]; }));
  var rows = T('student_class_history').where('academic_year_id', sem.academic_year_id).map(function (h) {
    var s = st.get(h.student_id) || {}, c = cls.get(h.class_id) || {}, p = picks.get(h.student_id) || {};
    return {
      student_id: s.id, name: s.name, nisn: s.nisn, nis: s.nis, parent_name: s.parent_name, parent_phone: s.parent_phone, class_id: c.id, class_name: c.name, grade_level: c.grade_level, roll_no: h.roll_no,
      status: p.status || null, picked_at: p.picked_at || null, picker_name: p.picker_name || null, relation: p.relation || null, phone: p.phone || null, note: p.note || null, officer: p.officer || null, updated_at: p.updated_at || null, _o: c.sort_order
    };
  });
  sortBy(rows, [function (r) { return r.grade_level; }, function (r) { return r._o; }, function (r) { return r.class_name; }, function (r) { return r.roll_no === null ? 9999 : r.roll_no; }, function (r) { return r.name; }]);
  return { semester: sem, rows: rows };
}

function r_savePickups(ctx) {
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester'));
  var rows = arr(ctx.body.rows, 'Data pengambilan');
  var now = nowIso();
  var vals = rows.map(function (r) {
    return clean(r, {
      student_id: { type: 'id', required: true, label: 'Siswa' }, status: { type: 'enum', values: ['Sudah', 'Belum'], default: 'Sudah' },
      picked_at: { type: 'string', max: 30 }, picker_name: { type: 'string', max: 120 }, relation: { type: 'string', max: 40 }, phone: { type: 'string', max: 30 }, note: { type: 'text', max: 500 }
    });
  });
  vals.forEach(function (v) {
    var data = { status: v.status, picked_at: v.status === 'Sudah' ? (v.picked_at || now) : null, picker_name: v.picker_name, relation: v.relation, phone: v.phone, note: v.note, officer: ctx.user.full_name, updated_at: now };
    var ex = rowFor('report_pickups', v.student_id, sem.id);
    if (ex) T('report_pickups').update(ex, data); else T('report_pickups').insert(Object.assign({ student_id: v.student_id, semester_id: sem.id }, data));
  });
  audit(ctx, 'Pengambilan rapor', { detail: rows.length + ' siswa' });
  return { saved: rows.length };
}

function r_deletePickups(ctx) {
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester'));
  var ids = new Set(arr(ctx.body.student_ids, 'Siswa').map(function (x) { return requireId(x); }));
  T('report_pickups').removeWhere(function (p) { return p.semester_id === sem.id && ids.has(p.student_id); });
  audit(ctx, 'Hapus catatan pengambilan rapor', { detail: ids.size + ' siswa' });
  return { deleted: ids.size };
}

function publicSettingsOrClosed() {
  var settings = getSettings();
  if (!truthy(settings.cek_nilai_aktif)) throw forbidden('Halaman cek nilai sedang ditutup oleh sekolah. Silakan coba lagi nanti.');
  var sem = activeSemester();
  if (!sem || !sem.report_assessment_type_id) throw forbidden('Nilai semester ini belum dapat dilihat.');
  return { settings: settings, sem: sem };
}

function r_cekDaftar() {
  var p = publicSettingsOrClosed();
  var mode = p.settings.cek_nilai_verifikasi || 'nisn';
  var out = { sekolah: p.settings.nama_sekolah, semester: p.sem.name, tahun: p.sem.year_name, verifikasi: mode, kelas: [] };
  if (mode === 'none') {
    out.kelas = studentsOfScope({ yearId: p.sem.academic_year_id }).classes.map(function (c) {
      return { id: c.id, name: c.name, siswa: sortBy(classStudents(c.id).filter(function (s) { return s.status === 'aktif'; }), [function (s) { return s.name; }]).map(function (s) { return { id: s.id, name: s.name }; }) };
    }).filter(function (k) { return k.siswa.length; });
  }
  return out;
}

function r_cekNilai(ctx) {
  var p = publicSettingsOrClosed();
  var settings = p.settings, sem = p.sem, b = ctx.body;
  var mode = settings.cek_nilai_verifikasi || 'nisn';
  var key = 'cek|' + String(b.nisn || b.student_id || '');
  checkLoginAllowed(key);
  var student = null;
  if (mode === 'none') student = T('students').get(requireId(b.student_id, 'Siswa'));
  else {
    var nisn = String(b.nisn || '').trim().replace(/^0+/, '');
    if (!/^\d{3,20}$/.test(nisn)) throw bad('Masukkan NISN dengan benar');
    student = T('students').find(function (s) { return s.nisn && String(s.nisn).replace(/^0+/, '') === nisn; });
    if (student && mode === 'tgl_lahir' && String(b.birth_date || '') !== String(student.birth_date || '')) student = null;
  }
  if (!student) { recordLoginFail(key); throw bad(mode === 'tgl_lahir' ? 'NISN atau tanggal lahir tidak cocok' : 'Data siswa tidak ditemukan'); }
  var h = T('student_class_history').where('student_id', student.id).filter(function (x) { return x.academic_year_id === sem.academic_year_id; })[0];
  if (!h) throw bad('Siswa tidak terdaftar pada tahun pelajaran aktif');
  var c = T('classes').get(h.class_id);
  var ht = c.homeroom_teacher_id ? T('teachers').get(c.homeroom_teacher_id) : null;
  var engine = new Engine();
  var subjects = activeSubjects();
  var subjIds = subjects.map(function (s) { return s.id; });
  var scales = T('grade_scales').rows();
  var kktpOf = kktpFn(settings);
  var basis = settings.dasar_peringkat === 'rata' ? 'rata' : 'jumlah';
  var cs = studentsOfScope({ classId: c.id });
  var rows = rankRows(summarize(cs.students, subjects, engine.results(sem.report_assessment_type_id, cs.students.map(function (s) { return s.id; }), subjIds), kktpOf), basis);
  var me = rows.filter(function (r) { return r.student_id === student.id; })[0];
  var showRank = truthy(settings.cek_nilai_ranking) && truthy(settings.peringkat_aktif);
  var rankT = null, nT = null;
  if (showRank) {
    var g = studentsOfScope({ gradeLevel: c.grade_level, yearId: sem.academic_year_id });
    var gr = rankRows(summarize(g.students, subjects, engine.results(sem.report_assessment_type_id, g.students.map(function (s) { return s.id; }), subjIds), kktpOf), basis);
    rankT = (gr.filter(function (r) { return r.student_id === student.id; })[0] || {}).rank || null;
    nT = g.students.length;
  }
  var comments = T('teacher_comments').where('student_id', student.id).filter(function (x) { return x.semester_id === sem.id; });
  var card = rowFor('report_cards', student.id, sem.id);
  var att = rowFor('attendance', student.id, sem.id);
  var eksT = T('extracurriculars');
  var eks = T('student_extracurriculars').where('student_id', student.id).filter(function (x) { return x.semester_id === sem.id; });
  var pick1 = rowFor('report_pickups', student.id, sem.id);
  return {
    siswa: { nama: student.name, nisn: student.nisn, nis: student.nis, kelas: c.name, wali: ht ? ht.name : null },
    semester: sem.name, tahun: sem.year_name, sekolah: settings.nama_sekolah,
    mapel: subjects.map(function (sb) {
      var v = me.scores[sb.id];
      var sc = scalesFor(scales, sb.id);
      var gp = predicateOf(v, sc);
      var k = kktpOf(sb);
      return {
        nama: sb.name, kelompok: sb.group_name, kktp: k, nilai: v, predikat: gp ? gp.predicate : null, tuntas: v !== null && v !== undefined ? v >= k : null,
        deskripsi: describe({ settings: settings, nama: student.name, mapel: sb.name, score: v, comment: comments.filter(function (x) { return x.subject_id === sb.id; })[0], scales: sc, style: 'kementerian' })
      };
    }),
    ringkasan: { jumlah: me.total, rata: me.average, terisi: me.count, jumlah_mapel: subjects.length, rank_kelas: showRank ? me.rank : null, jumlah_kelas: cs.students.length, rank_tingkat: rankT, jumlah_tingkat: nT },
    kokurikuler: card ? { nilai: card.cocurricular_grade, deskripsi: buildKokurikuler(student.name, card, settings) } : null,
    catatan: card ? card.homeroom_note : null,
    kehadiran: att ? pick(att, ['present', 'sick', 'permit', 'absent']) : null,
    ekskul: eks.map(function (e) { var x = eksT.get(e.extracurricular_id) || {}; return { nama: x.name, nilai: e.grade, deskripsi: ekskulDescription({ name: x.name, grade: e.grade, description: e.description }, settings) }; }),
    pengambilan: pick1 && pick1.status === 'Sudah' ? pick(pick1, ['status', 'picked_at', 'picker_name', 'relation']) : { status: 'Belum' }
  };
}


/* ---------- Rute: riwayat aktivitas, backup/restore, impor data, impor cadangan E-Raport lama ---------- */

function r_auditList(ctx) {
  var q = ctx.query;
  var rows = T('audit_logs').rows().filter(function (r) {
    if (q.from && r.created_at < String(q.from).slice(0, 10)) return false;
    if (q.to && r.created_at > String(q.to).slice(0, 10) + 'T23:59:59.999Z') return false;
    if (q.user && r.username !== q.user) return false;
    if (q.role && r.role !== q.role) return false;
    if (q.q) { var s = String(q.q).toLowerCase(); if ((r.action || '').toLowerCase().indexOf(s) < 0 && (r.detail || '').toLowerCase().indexOf(s) < 0) return false; }
    return true;
  });
  return sortBy(rows.slice(), [function (r) { return r.created_at; }]).reverse().slice(0, Math.min(Number(q.limit) || 500, 3000)).map(function (r) {
    return Object.assign(pick(r, ['id', 'username', 'role', 'action', 'entity', 'entity_id', 'detail', 'created_at']), { ip: '-', has_diff: r.before_json || r.after_json ? 1 : 0 });
  });
}

function r_auditDetail(ctx) { return copyRow(T('audit_logs').get(requireId(ctx.params.id))); }

// ---------- Backup ----------
var BACKUP_TABLES = TABLE_NAMES.filter(function (n) { return n !== 'sessions'; });

function r_backup(ctx) {
  var tables = {}, counts = {};
  BACKUP_TABLES.forEach(function (t) {
    tables[t] = T(t).rows().map(copyRow);
    counts[t] = tables[t].length;
  });
  var payload = { meta: { app: 'SIPAS', schema: 1, backend: 'spreadsheet', created_at: nowIso(), created_by: ctx.user.full_name, counts: counts }, tables: tables };
  T('backups').insert({ kind: 'download', note: ctx.query.note ? String(ctx.query.note).slice(0, 200) : null, size_bytes: JSON.stringify(payload).length, tables_json: JSON.stringify(counts), created_by: ctx.user.full_name });
  audit(ctx, 'Unduh backup database', { detail: Object.keys(counts).reduce(function (a, k) { return a + counts[k]; }, 0) + ' baris' });
  ctx.download = 'backup-sipas-' + nowIso().slice(0, 19).replace(/[:T]/g, '-') + '.json';
  return payload;
}

function r_backupHistory() {
  return sortBy(T('backups').rows().map(copyRow), [function (r) { return r.created_at; }]).reverse().slice(0, 200);
}

function r_restore(ctx) {
  var data = ctx.body.backup;
  if (!data || !data.meta || data.meta.app !== 'SIPAS' || !data.tables) throw bad('File bukan backup SIPAS yang valid');
  var mode = ctx.body.mode === 'replace' ? 'replace' : 'merge';
  if (mode === 'replace' && ctx.body.confirm !== 'GANTI SEMUA DATA') throw bad('Konfirmasi penggantian data tidak sesuai');
  Object.keys(data.tables).forEach(function (t) {
    if (BACKUP_TABLES.indexOf(t) < 0) throw bad('Tabel tidak dikenal di backup: ' + t);
    if (!Array.isArray(data.tables[t])) throw bad('Format tabel tidak valid: ' + t);
  });
  if (mode === 'replace') {
    BACKUP_TABLES.forEach(function (t) { if (t !== 'backups') T(t).clearAll(); });
    T('sessions').clearAll();
  }
  var inserted = 0;
  BACKUP_TABLES.forEach(function (t) {
    var rows = data.tables[t] || [];
    if (!rows.length) return;
    var tbl = T(t), key = tbl.meta.key;
    var have = new Set(tbl.rows().map(function (r) { return r[key]; }));
    rows.forEach(function (r) {
      // tabel berkunci gabungan di versi Cloudflare tidak memiliki kolom id
      if (r && !r.id && t === 'teacher_subjects') r = Object.assign({ id: r.teacher_id + '|' + r.subject_id }, r);
      if (r && !r.id && t === 'notification_reads') r = Object.assign({ id: r.notification_id + '|' + r.user_id }, r);
      if (!r || !r[key] || have.has(String(r[key]))) return;
      var o = {};
      tbl.meta.columns.forEach(function (c) {
        var v = r[c.name];
        if (v === undefined) v = null;
        // backup versi Cloudflare: nilai per baris kategori -> dikelompokkan di bawah
        o[c.name] = c.type === 'j' && typeof v === 'string' ? (function () { try { return JSON.parse(v); } catch (e) { return {}; } })() : v;
      });
      o[key] = String(r[key]);
      tbl.insert(o);
      have.add(o[key]);
      inserted++;
    });
  });
  // backup dari versi Cloudflare menyimpan 1 nilai per baris (category_id, score)
  if (data.meta.backend !== 'spreadsheet' && Array.isArray(data.tables.student_scores) && data.tables.student_scores.length && 'category_id' in data.tables.student_scores[0]) {
    var grouped = groupBy(data.tables.student_scores, function (r) { return r.assessment_id + '|' + r.student_id; });
    T('student_scores').removeWhere(function (r) { return !r.values_json || !Object.keys(r.values_json).length; });
    grouped.forEach(function (list) {
      var first = list[0];
      if (scoreRow(first.assessment_id, first.student_id)) return;
      var v = {}, o = {};
      list.forEach(function (x) { if (x.score !== null) { v[x.category_id] = x.score; if (x.origin && x.origin !== 'manual') o[x.category_id] = x.origin; } });
      T('student_scores').insert({ assessment_id: first.assessment_id, student_id: first.student_id, values_json: v, origins_json: o, updated_by: first.updated_by, updated_at: first.updated_at });
    });
  }
  T('backups').insert({ kind: 'restore', note: 'Mode ' + mode + '; backup ' + data.meta.created_at, tables_json: JSON.stringify(data.meta.counts || {}), created_by: ctx.user.full_name });
  audit(ctx, 'Restore database', { detail: 'Mode ' + mode + ', ' + inserted + ' baris ditambahkan dari backup ' + data.meta.created_at });
  return { mode: mode, inserted: inserted };
}

// ---------- Impor data master ----------
function nrm(v) { return v === null || v === undefined ? '' : String(v).trim(); }
function nrmNisn(v) { return nrm(v).replace(/\.0$/, ''); }
function upKey(s) { return nrm(s).toUpperCase().replace(/\s+/g, ' '); }

function lookupMaps(yearId) {
  var classes = yearId ? T('classes').where('academic_year_id', yearId) : [];
  var teachers = T('teachers').rows();
  var m = {
    classByName: new Map(), classByCompact: new Map(), subjectByKey: new Map(), teacherByKey: new Map(),
    usernames: new Set(T('users').rows().map(function (u) { return u.username.toLowerCase(); }))
  };
  classes.forEach(function (c) { m.classByName.set(upKey(c.name), c); m.classByCompact.set(upKey(c.name).replace(/\s/g, ''), c); });
  T('subjects').rows().forEach(function (s) { m.subjectByKey.set(upKey(s.code), s); m.subjectByKey.set(upKey(s.name), s); });
  teachers.forEach(function (t) { m.teacherByKey.set(upKey(t.name), t); if (t.nip) m.teacherByKey.set(upKey(t.nip), t); });
  T('users').rows().forEach(function (u) { if (u.teacher_id) { var t = T('teachers').get(u.teacher_id); if (t) m.teacherByKey.set(upKey(u.username), t); } });
  return m;
}
function findClassIn(m, name) { return m.classByName.get(upKey(name)) || m.classByCompact.get(upKey(name).replace(/\s/g, '')) || null; }

// Impor dijalankan sebagai simulasi dulu; bila dry_run, perubahan dibuang (tidak di-flush)
function r_importEntity(ctx) {
  var entity = ctx.params.entity;
  var b = ctx.body;
  var rows = arr(b.rows, 'Baris data');
  if (rows.length > 5000) throw bad('Maksimal 5000 baris per impor');
  var dry = !!b.dry_run, update = !!b.update_existing;
  var sem = b.semester_id ? getSemester(requireId(b.semester_id)) : activeSemester();
  var yearId = b.year_id ? requireId(b.year_id) : (sem ? sem.academic_year_id : null);
  var m = lookupMaps(yearId);
  var result = [], seen = new Set(), now = nowIso();
  var known = ['students', 'teachers', 'classes', 'subjects', 'assignments', 'attendance'];
  if (known.indexOf(entity) < 0) throw notFound('Jenis impor tidak dikenal');
  rows.forEach(function (r, i) {
    var out = { index: i + 1, action: 'new', messages: [], label: '' };
    try {
      if (entity === 'students') {
        var nisn = nrmNisn(r.nisn);
        var v = clean(Object.assign({}, r, { nisn: nisn, gender: nrm(r.gender).toUpperCase().slice(0, 1) || null }), studentSpec);
        out.label = v.name;
        var key = nisn || nrm(r.nis);
        if (!key) throw bad('NISN atau NIS wajib diisi');
        if (seen.has(key)) throw bad('Duplikat di dalam file');
        seen.add(key);
        var ex = nisn ? T('students').one('nisn', nisn) : T('students').one('nis', nrm(r.nis));
        var cls = null;
        if (nrm(r.class_name)) { cls = findClassIn(m, r.class_name); if (!cls) throw bad('Kelas "' + r.class_name + '" belum ada pada tahun pelajaran ini'); }
        var sid;
        if (ex && !update) { out.action = 'skip'; out.messages.push('Sudah ada (tidak diperbarui)'); }
        else if (ex) {
          out.action = 'update';
          var patch = {};
          Object.keys(studentSpec).forEach(function (k) { if (!(r[k] === undefined || r[k] === '')) patch[k] = v[k]; });
          patch.updated_at = now;
          T('students').update(ex, patch);
          sid = ex.id;
        } else sid = T('students').insert(v).id;
        if (cls && sid) upsertHistory(sid, cls, r.roll_no ? Number(r.roll_no) : null);
      } else if (entity === 'teachers') {
        var tv = clean(r, { nip: { type: 'string', max: 30 }, nuptk: { type: 'string', max: 30 }, name: { type: 'string', required: true, max: 120, label: 'Nama guru' }, gender: { type: 'enum', values: ['L', 'P'] }, phone: { type: 'string', max: 30 }, email: { type: 'string', max: 120 } });
        out.label = tv.name;
        if (seen.has(upKey(tv.name))) throw bad('Duplikat di dalam file');
        seen.add(upKey(tv.name));
        var tex = (tv.nip && m.teacherByKey.get(upKey(tv.nip))) || m.teacherByKey.get(upKey(tv.name));
        var tid = tex ? tex.id : null;
        if (tex && !update) { out.action = 'skip'; out.messages.push('Sudah ada'); }
        else if (tex) { out.action = 'update'; var tp = { name: tv.name, updated_at: now }; ['nip', 'nuptk', 'gender', 'phone', 'email'].forEach(function (k) { if (tv[k]) tp[k] = tv[k]; }); T('teachers').update(tex, tp); }
        else { var nt = T('teachers').insert(Object.assign({ active: 1 }, tv)); tid = nt.id; m.teacherByKey.set(upKey(tv.name), nt); }
        var username = nrm(r.username).toLowerCase();
        if (username && !tex && out.action !== 'skip') {
          if (!/^[a-z0-9._-]{3,40}$/.test(username)) throw bad('Username tidak valid');
          if (m.usernames.has(username)) throw bad('Username sudah dipakai');
          var pw = nrm(r.password);
          if (pw.length < 8 || !/[A-Za-z]/.test(pw) || !/\d/.test(pw)) throw bad('Password minimal 8 karakter berisi huruf dan angka');
          m.usernames.add(username);
          if (!dry) T('users').insert({ username: username, password_hash: hashPassword(pw), role: 'guru', teacher_id: tid, full_name: tv.name, active: 1, must_change_password: 1 });
          out.messages.push('Akun login dibuat: ' + username);
        }
        nrm(r.subjects).split(/[,;]/).map(function (x) { return x.trim(); }).filter(Boolean).forEach(function (code) {
          var sb = m.subjectByKey.get(upKey(code));
          if (!sb) out.messages.push('Mapel "' + code + '" tidak ditemukan (diabaikan)'); else if (tid) addTeacherSubject(tid, sb.id);
        });
      } else if (entity === 'classes') {
        if (!yearId) throw bad('Tahun pelajaran belum ada');
        var cv = clean(r, { name: { type: 'string', required: true, max: 30, upper: true, label: 'Nama kelas' }, grade_level: { type: 'int', required: true, min: 1, max: 12, label: 'Tingkat' }, report_label: { type: 'string', max: 20 }, sort_order: { type: 'int', default: 0 } });
        out.label = cv.name;
        if (seen.has(cv.name)) throw bad('Duplikat di dalam file');
        seen.add(cv.name);
        var wali = null;
        if (nrm(r.homeroom)) { wali = m.teacherByKey.get(upKey(r.homeroom)); if (!wali) out.messages.push('Wali kelas "' + r.homeroom + '" tidak ditemukan (dikosongkan)'); }
        var cex = findClassIn(m, cv.name);
        if (cex && !update) { out.action = 'skip'; out.messages.push('Sudah ada'); }
        else if (cex) { out.action = 'update'; T('classes').update(cex, { grade_level: cv.grade_level, report_label: cv.report_label || cex.report_label, homeroom_teacher_id: wali ? wali.id : cex.homeroom_teacher_id, sort_order: cv.sort_order }); }
        else { var nc = T('classes').insert({ academic_year_id: yearId, name: cv.name, grade_level: cv.grade_level, report_label: cv.report_label || ROMAN[cv.grade_level] || String(cv.grade_level), homeroom_teacher_id: wali ? wali.id : null, sort_order: cv.sort_order }); m.classByName.set(upKey(nc.name), nc); }
      } else if (entity === 'subjects') {
        var sv = clean(r, { code: { type: 'string', required: true, max: 15, upper: true, pattern: /^[A-Za-z0-9_.-]+$/, label: 'Kode' }, name: { type: 'string', required: true, max: 120, label: 'Nama mapel' }, group_name: { type: 'string', max: 40, default: 'A' }, kktp: { type: 'number', min: 0, max: 100 }, sort_order: { type: 'int', default: 0 }, active: { type: 'bool', default: 1 } });
        out.label = sv.name;
        if (seen.has(sv.code)) throw bad('Kode ganda di dalam file');
        seen.add(sv.code);
        var sex = subjectByCode(sv.code);
        if (sex && !update) { out.action = 'skip'; out.messages.push('Sudah ada'); }
        else if (sex) { out.action = 'update'; T('subjects').update(sex, sv); }
        else T('subjects').insert(sv);
      } else if (entity === 'assignments') {
        if (!sem) throw bad('Semester belum ada');
        var t = m.teacherByKey.get(upKey(r.teacher)), sb2 = m.subjectByKey.get(upKey(r.subject)), cl = findClassIn(m, r.class_name);
        out.label = nrm(r.teacher) + ' - ' + nrm(r.subject) + ' - ' + nrm(r.class_name);
        if (!t) throw bad('Guru "' + r.teacher + '" tidak ditemukan');
        if (!sb2) throw bad('Mapel "' + r.subject + '" tidak ditemukan');
        if (!cl) throw bad('Kelas "' + r.class_name + '" tidak ditemukan');
        var k2 = sb2.id + '|' + cl.id;
        if (seen.has(k2)) throw bad('Mapel & kelas yang sama muncul dua kali');
        seen.add(k2);
        var aex = findAssignment(sb2.id, cl.id, sem.id);
        if (aex && aex.teacher_id === t.id) { out.action = 'skip'; out.messages.push('Sudah sama'); }
        else if (aex && !update) { out.action = 'skip'; out.messages.push('Sudah diampu guru lain (tidak diubah)'); }
        else {
          out.action = aex ? 'update' : 'new';
          if (aex) T('teacher_assignments').update(aex, { teacher_id: t.id }); else T('teacher_assignments').insert({ teacher_id: t.id, subject_id: sb2.id, class_id: cl.id, semester_id: sem.id });
          addTeacherSubject(t.id, sb2.id);
        }
      } else if (entity === 'attendance') {
        if (!sem) throw bad('Semester belum ada');
        var an = nrmNisn(r.nisn).replace(/^0+/, '');
        var st = an ? T('students').find(function (s) { return s.nisn && String(s.nisn).replace(/^0+/, '') === an; }) : T('students').one('nis', nrm(r.nis));
        if (!st) throw bad('Siswa dengan NISN/NIS tersebut tidak ditemukan');
        out.label = st.name;
        var num = function (v, l) { if (nrm(v) === '') return null; var x = Number(v); if (!Number.isInteger(x) || x < 0 || x > 366) throw bad(l + ' harus bilangan bulat 0-366'); return x; };
        var vals = { present: num(r.present, 'Hadir'), sick: num(r.sick, 'Sakit'), permit: num(r.permit, 'Izin'), absent: num(r.absent, 'Tanpa keterangan') };
        var aex2 = rowFor('attendance', st.id, sem.id);
        out.action = aex2 ? 'update' : 'new';
        var data = Object.assign(vals, { updated_by: ctx.user.full_name, updated_at: now });
        if (aex2) T('attendance').update(aex2, data); else T('attendance').insert(Object.assign({ student_id: st.id, semester_id: sem.id }, data));
      }
    } catch (e) {
      if (!(e instanceof HttpError)) throw e;
      out.action = 'error';
      out.messages.push(e.message);
    }
    result.push(out);
  });
  var summary = { new: 0, update: 0, skip: 0, error: 0 };
  result.forEach(function (r) { summary[r.action]++; });
  if (dry) { ctx.discard = true; return { dry_run: true, summary: summary, rows: result }; }
  if (summary.error && !b.skip_errors) throw bad(summary.error + ' baris bermasalah. Perbaiki atau pilih "lewati baris bermasalah".', { rows: result.filter(function (r) { return r.action === 'error'; }) });
  audit(ctx, 'Impor data ' + entity, { detail: JSON.stringify(summary) });
  return { dry_run: false, summary: summary, rows: result };
}

// ---------- Impor cadangan aplikasi E-Raport lama ----------
function r_importLegacy(ctx) {
  var pkg = ctx.body.backup || {};
  var d = pkg.data || pkg;
  if (!d || !Array.isArray(d.siswa) || !Array.isArray(d.mapel)) throw bad('File bukan cadangan E-Raport lama (harus berisi data siswa & mapel)');
  var sem = getSemester(requireId(ctx.body.semester_id, 'Semester tujuan'));
  var now = nowIso();
  var rep = { settings: 0, teachers: 0, classes: 0, subjects: 0, students: 0, scores: 0, comments: 0, bank: 0, cards: 0, attendance: 0, ekskul: 0, pickups: 0 };
  var cfg = d.config || {};
  if (ctx.body.include_settings !== false) {
    var patch = {};
    Object.keys(cfg).forEach(function (k) { var v = cfg[k]; if (k in DEFAULT_SETTINGS && v !== undefined && v !== null && typeof v !== 'object') patch[k] = String(v); });
    ['tampilkan_keterangan', 'tampilkan_qr', 'tampilkan_keputusan', 'tampilkan_hadir', 'cek_nilai_aktif', 'cek_nilai_ranking', 'wali_kehadiran', 'wali_kokurikuler', 'wali_ekskul', 'wali_catatan'].forEach(function (k) {
      if (k in patch) patch[k] = /^(true|y|ya|1)$/i.test(patch[k]) ? '1' : '0';
    });
    if (Object.keys(patch).length) { saveSettingsPatch(patch); rep.settings = Object.keys(patch).length; }
  }
  if (cfg.predikat_a) {
    var A = Number(cfg.predikat_a) || 90, B = Number(cfg.predikat_b) || 80, C = Number(cfg.predikat_c) || 70;
    var old = T('grade_scales').filter(function (g) { return !g.subject_id; });
    var desc = function (p) { var o = old.filter(function (g) { return g.predicate === p; })[0]; return o ? o.description : null; };
    T('grade_scales').removeWhere(function (g) { return !g.subject_id; });
    [['A', A, 100, cfg.kata_a || 'Sangat Baik'], ['B', B, A - 0.01, cfg.kata_b || 'Baik'], ['C', C, B - 0.01, cfg.kata_c || 'Cukup'], ['D', 0, C - 0.01, cfg.kata_d || 'Perlu Bimbingan']]
      .forEach(function (g, i) { T('grade_scales').insert({ subject_id: null, predicate: g[0], min_score: g[1], max_score: g[2], label: g[3], description: desc(g[0]), sort_order: i }); });
  }
  var subjects = new Map(T('subjects').rows().map(function (s) { return [upKey(s.code), s]; }));
  d.mapel.forEach(function (mp) {
    var code = upKey(mp.Kode);
    if (!code || subjects.has(code)) return;
    subjects.set(code, T('subjects').insert({ code: code, name: nrm(mp.Nama) || code, group_name: upKey(mp.Kelompok) || 'A', kktp: Number(mp.KKM) || null, sort_order: Number(mp.Urut) || 0, active: /^(n|false|0|tidak)$/i.test(nrm(mp.Aktif)) ? 0 : 1 }));
    rep.subjects++;
  });
  var teachers = new Map(T('teachers').rows().map(function (t) { return [upKey(t.name), t]; }));
  var classes = new Map(T('classes').where('academic_year_id', sem.academic_year_id).map(function (c) { return [upKey(c.name), c]; }));
  var names = new Set((d.kelas || []).map(function (k) { return upKey(k.Kelas); }).concat(d.siswa.map(function (x) { return upKey(x.Kelas); })).filter(Boolean));
  names.forEach(function (name) {
    if (classes.has(name)) return;
    var k = (d.kelas || []).filter(function (x) { return upKey(x.Kelas) === name; })[0] || {};
    var wali = null;
    if (nrm(k.Wali_Kelas)) {
      wali = teachers.get(upKey(k.Wali_Kelas));
      if (!wali) { wali = T('teachers').insert({ nip: nrm(k.NIP_Wali) || null, name: nrm(k.Wali_Kelas), active: 1 }); teachers.set(upKey(k.Wali_Kelas), wali); rep.teachers++; }
    }
    classes.set(name, T('classes').insert({ academic_year_id: sem.academic_year_id, name: name, grade_level: Number((name.match(/\d+/) || [0])[0]) || 7, report_label: nrm(k.Label_Raport) || null, homeroom_teacher_id: wali ? wali.id : null, sort_order: Number(k.Urut) || 0 }));
    rep.classes++;
  });
  var byNisn = new Map();
  d.siswa.forEach(function (x) {
    var nisn = nrmNisn(x.NISN);
    if (!nisn || !nrm(x.Nama)) return;
    var bare = nisn.replace(/^0+/, '');
    var st = T('students').find(function (s) { return s.nisn && String(s.nisn).replace(/^0+/, '') === bare; });
    if (!st) { var jk = upKey(x.JK).slice(0, 1); st = T('students').insert({ nis: nrm(x.NIS) || null, nisn: nisn, name: upKey(x.Nama), gender: jk === 'L' || jk === 'P' ? jk : null, status: 'aktif' }); rep.students++; }
    byNisn.set(bare, st.id);
    var c = classes.get(upKey(x.Kelas));
    if (c) upsertHistory(st.id, c, Number(x.No_Absen) || null);
  });
  var sidOf = function (n) { return byNisn.get(nrmNisn(n).replace(/^0+/, '')); };
  var classOf = new Map(d.siswa.map(function (x) { return [sidOf(x.NISN), classes.get(upKey(x.Kelas))]; }));
  var makeType = function (name) {
    var ex = T('assessment_types').where('semester_id', sem.id).filter(function (t) { return t.name === name; })[0];
    if (ex) return { id: ex.id, cat: T('assessment_categories').where('assessment_type_id', ex.id)[0].id };
    var t = T('assessment_types').insert({ semester_id: sem.id, name: name, code: 'IMPOR', kind: 'SEMESTER', description: 'Nilai hasil impor dari aplikasi E-Raport lama', active: 1, input_open: 0, decimals: 2, rounding: 'round', require_complete: 0, sort_order: 0, created_by: ctx.user.full_name });
    var c = T('assessment_categories').insert({ assessment_type_id: t.id, name: 'Nilai Akhir', code: 'NA', weight: 100, required: 1, source_type: 'manual', sort_order: 0 });
    return { id: t.id, cat: c.id };
  };
  var nilai = (d.nilai || []).filter(function (n) { return sidOf(n.NISN) && subjects.has(upKey(n.Kode_Mapel)); });
  var main = nilai.length ? makeType('Nilai Rapor (Impor E-Raport)') : null;
  var skill = nilai.some(function (n) { return nrm(n.Nilai_Keterampilan) !== ''; }) ? makeType('Nilai Keterampilan (Impor E-Raport)') : null;
  var importer = Object.assign({}, ctx.user, { full_name: 'Impor E-Raport' });
  nilai.forEach(function (n) {
    var st = sidOf(n.NISN), sb = subjects.get(upKey(n.Kode_Mapel)), c = classOf.get(st);
    if (!c) return;
    [[main, 'Nilai'], [skill, 'Nilai_Keterampilan']].forEach(function (p) {
      if (!p[0] || nrm(n[p[1]]) === '') return;
      var v;
      try { v = parseScore(n[p[1]]); } catch (e) { return; }
      if (v === null) return;
      var asm = ensureAssessment(p[0].id, sb.id, c.id);
      if (setScore(importer, asm, p[0].cat, st, v, 'import')) rep.scores++;
    });
    if (nrm(n.Deskripsi_Dikuasai) || nrm(n.Deskripsi_Ditingkatkan)) {
      var ex = T('teacher_comments').where('student_id', st).filter(function (x) { return x.semester_id === sem.id && x.subject_id === sb.id; })[0];
      var data = { mastered: nrm(n.Deskripsi_Dikuasai) || null, improve: nrm(n.Deskripsi_Ditingkatkan) || null, updated_by: nrm(n.Guru) || 'Impor', updated_at: now };
      if (ex) T('teacher_comments').update(ex, data); else T('teacher_comments').insert(Object.assign({ student_id: st, semester_id: sem.id, subject_id: sb.id }, data));
      rep.comments++;
    }
  });
  var semRow = T('semesters').get(sem.id);
  if (main && !semRow.report_assessment_type_id) T('semesters').update(semRow, { report_assessment_type_id: main.id });
  if (skill && !semRow.skill_assessment_type_id) T('semesters').update(semRow, { skill_assessment_type_id: skill.id });
  var bankHave = new Set(T('description_bank').rows().map(function (x) { return x.subject_id + '|' + x.text; }));
  (d.deskripsi || []).forEach(function (ds) {
    var sb = subjects.get(upKey(ds.Kode_Mapel));
    if (!sb || !nrm(ds.Teks) || bankHave.has(sb.id + '|' + nrm(ds.Teks))) return;
    bankHave.add(sb.id + '|' + nrm(ds.Teks));
    T('description_bank').insert({ subject_id: sb.id, grade_level: nrm(ds.Tingkat) || 'Semua', text: nrm(ds.Teks), created_by: nrm(ds.Dibuat_Oleh) || 'Impor' });
    rep.bank++;
  });
  var ekskul = new Map(T('extracurriculars').rows().map(function (e) { return [upKey(e.name), e]; }));
  (d.pelengkap || []).forEach(function (p) {
    var st = sidOf(p.NISN);
    if (!st) return;
    if (!rowFor('report_cards', st, sem.id)) {
      var f = ['Spiritual_Predikat', 'Spiritual_Deskripsi', 'Sosial_Predikat', 'Sosial_Deskripsi', 'Kokurikuler_Nilai', 'Kokurikuler_Kuat', 'Kokurikuler_Lemah', 'Kokurikuler_Deskripsi', 'Catatan_Wali', 'Keputusan'].map(function (k) { return nrm(p[k]) || null; });
      T('report_cards').insert({ student_id: st, semester_id: sem.id, spiritual_pred: f[0], spiritual_desc: f[1], social_pred: f[2], social_desc: f[3], cocurricular_grade: f[4], cocurricular_strong: f[5], cocurricular_weak: f[6], cocurricular_desc: f[7], homeroom_note: f[8], decision: f[9], status: 'draft', updated_by: 'Impor', updated_at: now });
      rep.cards++;
    }
    var nn = function (k) { return nrm(p[k]) === '' || isNaN(Number(p[k])) ? null : Math.max(0, Math.round(Number(p[k]))); };
    if (['Hadir', 'Sakit', 'Izin', 'Alpa'].some(function (k) { return nn(k) !== null; }) && !rowFor('attendance', st, sem.id)) {
      T('attendance').insert({ student_id: st, semester_id: sem.id, present: nn('Hadir'), sick: nn('Sakit'), permit: nn('Izin'), absent: nn('Alpa'), updated_by: 'Impor', updated_at: now });
      rep.attendance++;
    }
    [['Ekskul1', 'Ekskul1_Nilai', 'Ekskul1_Deskripsi'], ['Ekskul2', 'Ekskul2_Nilai', 'Ekskul2_Deskripsi']].forEach(function (k) {
      if (!nrm(p[k[0]])) return;
      var e = ekskul.get(upKey(p[k[0]]));
      if (!e) { e = T('extracurriculars').insert({ name: nrm(p[k[0]]), active: 1, sort_order: 0 }); ekskul.set(upKey(p[k[0]]), e); }
      var has = T('student_extracurriculars').where('student_id', st).some(function (x) { return x.semester_id === sem.id && x.extracurricular_id === e.id; });
      if (!has) { T('student_extracurriculars').insert({ student_id: st, semester_id: sem.id, extracurricular_id: e.id, grade: nrm(p[k[1]]) || null, description: nrm(p[k[2]]) || null, updated_at: now }); rep.ekskul++; }
    });
  });
  (d.pengambilan || []).forEach(function (p) {
    var st = sidOf(p.NISN);
    if (!st || rowFor('report_pickups', st, sem.id)) return;
    T('report_pickups').insert({ student_id: st, semester_id: sem.id, status: nrm(p.Status) === 'Sudah' ? 'Sudah' : 'Belum', picked_at: nrm(p.Tanggal) || null, picker_name: nrm(p.Pengambil) || null, relation: nrm(p.Hubungan) || null, phone: nrm(p.No_HP) || null, note: nrm(p.Catatan) || null, officer: nrm(p.Petugas) || null, updated_at: now });
    rep.pickups++;
  });
  audit(ctx, 'Impor cadangan E-Raport lama', { detail: JSON.stringify(rep) });
  return rep;
}


/* =====================================================================
   ENTRY POINT Apps Script Web App
   Frontend mengirim POST (Content-Type text/plain agar tanpa preflight CORS):
     { method, path, query, body, token }
   Balasan: { ok, status, data } atau { ok:false, status, message, details }
   ===================================================================== */
var ROUTES = [];

function route(method, path, handler, auth) {
  var keys = [];
  var re = new RegExp('^' + path.replace(/:(\w+)/g, function (_, k) { keys.push(k); return '([^/]+)'; }) + '/?$');
  ROUTES.push({ method: method, re: re, keys: keys, handler: handler, auth: auth || 'admin' });
}

(function registerRoutes() {
  // autentikasi & umum
  route('POST', '/auth/login', r_login, 'public');
  route('POST', '/auth/logout', r_logout, 'any');
  route('GET', '/auth/me', r_me, 'any');
  route('POST', '/auth/change-password', r_changePassword, 'any');
  route('GET', '/auth/setup-status', r_setupStatus, 'public');
  route('POST', '/auth/setup', r_setup, 'public');
  route('GET', '/bootstrap', r_bootstrap, 'any');
  route('GET', '/public/info', r_publicInfo, 'public');
  route('GET', '/settings', r_getSettings);
  route('PUT', '/settings', r_saveSettings);
  route('GET', '/years', r_listYears, 'any');
  route('POST', '/years', r_createYear);
  route('PUT', '/years/:id', r_updateYear);
  route('DELETE', '/years/:id', r_deleteYear);
  route('POST', '/years/:id/activate', r_activateYear);
  route('PUT', '/semesters/:id', r_updateSemester);
  route('POST', '/semesters/:id/activate', r_activateSemester);
  route('GET', '/notifications', r_listNotifications, 'any');
  route('POST', '/notifications/read', r_readNotifications, 'any');
  route('POST', '/notifications', r_sendNotification);
  route('GET', '/dashboard/admin', r_adminDashboard);
  route('GET', '/dashboard/guru', r_guruDashboard, 'guru');
  // data master
  route('GET', '/students', r_listStudents, 'guru');
  route('POST', '/students', r_createStudent);
  route('PUT', '/students/:id', r_updateStudent);
  route('DELETE', '/students/:id', r_deleteStudent);
  route('GET', '/students/:id/history', r_studentHistory);
  route('POST', '/students/bulk-delete', r_bulkDeleteStudents);
  route('POST', '/students/move', r_moveStudents);
  route('POST', '/students/remove-class', r_removeFromClass);
  route('POST', '/students/renumber', r_renumber);
  route('GET', '/teachers', r_listTeachers);
  route('POST', '/teachers', r_createTeacher);
  route('PUT', '/teachers/:id', r_updateTeacher);
  route('DELETE', '/teachers/:id', r_deleteTeacher);
  route('GET', '/users', r_listUsers);
  route('POST', '/users', r_createUser);
  route('PUT', '/users/:id', r_updateUser);
  route('DELETE', '/users/:id', r_deleteUser);
  route('GET', '/classes', r_listClasses, 'guru');
  route('POST', '/classes', r_createClass);
  route('PUT', '/classes/:id', r_updateClass);
  route('DELETE', '/classes/:id', r_deleteClass);
  route('GET', '/subjects', r_listSubjects, 'guru');
  route('POST', '/subjects', r_createSubject);
  route('PUT', '/subjects/:id', r_updateSubject);
  route('DELETE', '/subjects/:id', r_deleteSubject);
  route('GET', '/assignments', r_listAssignments, 'guru');
  route('PUT', '/assignments', r_saveAssignments);
  route('DELETE', '/assignments/:id', r_deleteAssignment);
  route('POST', '/assignments/copy', r_copyAssignments);
  route('GET', '/extracurriculars', r_listEkskul, 'guru');
  route('POST', '/extracurriculars', r_createEkskul);
  route('PUT', '/extracurriculars/:id', r_updateEkskul);
  route('DELETE', '/extracurriculars/:id', r_deleteEkskul);
  route('GET', '/description-bank', r_listBank, 'guru');
  route('POST', '/description-bank', r_saveBank, 'guru');
  route('DELETE', '/description-bank/:id', r_deleteBank, 'guru');
  route('GET', '/grade-scales', r_listScales, 'guru');
  route('PUT', '/grade-scales', r_saveScales);
  // penilaian
  route('GET', '/assessment-types', r_listTypes, 'guru');
  route('GET', '/assessment-types/source-options', r_sourceOptions);
  route('POST', '/assessment-types/copy-semester', r_copySemesterConfig);
  route('GET', '/assessment-types/:id', r_getType, 'guru');
  route('POST', '/assessment-types', r_createType);
  route('PUT', '/assessment-types/:id', r_updateType);
  route('DELETE', '/assessment-types/:id', r_deleteType);
  route('PUT', '/assessment-types/:id/categories', r_saveCategories);
  route('POST', '/assessment-types/:id/duplicate', r_duplicateType);
  route('POST', '/assessment-types/:id/input', r_setInput);
  route('POST', '/assessment-types/:id/sync', r_syncType);
  route('POST', '/assessment-types/:id/lock-all', r_lockAll);
  // nilai
  route('GET', '/grid', r_getGrid, 'guru');
  route('PUT', '/grid', r_saveGrid, 'guru');
  route('POST', '/grid/submit', r_submitSheet, 'guru');
  route('POST', '/grid/withdraw', r_withdrawSheet, 'guru');
  route('POST', '/grid/sync', r_syncSheet, 'guru');
  route('POST', '/grid/lock', r_lockSheet);
  route('POST', '/grid/unlock', r_unlockSheet);
  route('POST', '/grid/return', r_returnSheet);
  route('GET', '/score-revisions', r_revisions, 'guru');
  route('GET', '/monitoring', r_monitoring, 'guru');
  // laporan & rapor
  route('GET', '/leger', r_leger, 'guru');
  route('GET', '/report-data', r_reportData, 'guru');
  route('GET', '/report-cards', r_listReportCards, 'guru');
  route('PUT', '/report-cards', r_saveReportCards, 'guru');
  route('POST', '/report-cards/finalize', r_finalizeReportCards);
  route('GET', '/comments', r_listComments, 'guru');
  route('PUT', '/comments', r_saveComments, 'guru');
  route('GET', '/pickups', r_listPickups);
  route('PUT', '/pickups', r_savePickups);
  route('POST', '/pickups/delete', r_deletePickups);
  route('GET', '/public/cek/daftar', r_cekDaftar, 'public');
  route('POST', '/public/cek/nilai', r_cekNilai, 'public');
  // sistem
  route('GET', '/audit', r_auditList);
  route('GET', '/audit/:id', r_auditDetail);
  route('GET', '/backup', r_backup);
  route('GET', '/backups', r_backupHistory);
  route('POST', '/restore', r_restore);
  route('POST', '/import/legacy', r_importLegacy);
  route('POST', '/import/:entity', r_importEntity);
})();

function handleRequest(req) {
  DB.reset();
  var method = String(req.method || 'GET').toUpperCase();
  var path = String(req.path || '/').split('?')[0].replace(/^\/api/, '') || '/';
  var matched = null, params = {}, mismatch = false;
  for (var i = 0; i < ROUTES.length; i++) {
    var r = ROUTES[i];
    var m = path.match(r.re);
    if (!m) continue;
    if (r.method !== method) { mismatch = true; continue; }
    matched = r;
    r.keys.forEach(function (k, j) { params[k] = decodeURIComponent(m[j + 1]); });
    break;
  }
  var ctx = { params: params, query: req.query || {}, body: req.body || {}, token: req.token || null, user: null, isAdmin: false };
  var lock = null;
  try {
    if (!matched) throw new HttpError(mismatch ? 405 : 404, mismatch ? 'Metode tidak diizinkan' : 'Endpoint tidak ditemukan');
    if (matched.auth !== 'public') {
      ctx.user = sessionUser(ctx.token);
      if (!ctx.user) throw new HttpError(401, 'Sesi berakhir. Silakan masuk kembali.');
      if (matched.auth === 'admin' && ctx.user.role !== 'admin') throw forbidden('Hanya admin yang dapat mengakses fitur ini');
      ctx.isAdmin = ctx.user.role === 'admin';
    }
    if (method !== 'GET') {
      lock = LockService.getScriptLock();
      if (!lock.tryLock(30000)) throw new HttpError(503, 'Server sedang sibuk menyimpan data lain. Coba lagi sebentar.');
      DB.reset(); // baca ulang data setelah mendapat kunci
    }
    var data = matched.handler(ctx);
    if (method !== 'GET' || ctx.download) {
      if (!ctx.discard) { trimLogs(); DB.flush(); }
    }
    var out = { ok: true, status: 200, data: data === undefined ? null : data };
    if (ctx.download) out.download = ctx.download;
    return out;
  } catch (err) {
    if (ctx.commitOnError) { try { DB.flush(); } catch (e2) { /* abaikan */ } }
    if (err instanceof HttpError) return { ok: false, status: err.status, message: err.message, details: err.details };
    console.error(err && err.stack ? err.stack : err);
    return { ok: false, status: 500, message: 'Terjadi kesalahan pada server: ' + (err && err.message ? err.message : err) };
  } finally {
    if (lock) { try { lock.releaseLock(); } catch (e3) { /* abaikan */ } }
  }
}

function doPost(e) {
  var req;
  try { req = JSON.parse(e.postData.contents); }
  catch (err) { return jsonOut({ ok: false, status: 400, message: 'Format permintaan tidak valid' }); }
  return jsonOut(handleRequest(req));
}

function doGet(e) {
  if (e && e.parameter && e.parameter.ping) return jsonOut({ ok: true, status: 200, data: { app: 'SIPAS', backend: 'spreadsheet', time: nowIso() } });
  return ContentService.createTextOutput('API SIPAS (Google Apps Script) aktif. Buka aplikasi web SIPAS untuk menggunakan.');
}

function jsonOut(o) {
  return ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);
}
