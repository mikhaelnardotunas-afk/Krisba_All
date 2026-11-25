// Surat Panggilan Orang Tua (manual): pengaturan bawaan, templat surat, dan daftar hadir.
// Templat "Utama" mengikuti format sheet CETAK pada "Surat Panggilan Sederhana V3.xlsm" (kop dua logo,
// tabel Tanggal–Pelanggaran–Kronologi–Poin, jadwal Hari/Tanggal–Waktu–Tempat, tanda tangan Wali Kelas).
// Semua templat memakai kelas dokumen yang sama dengan dokumen lain (.doc, .kop, .ident, .tbl-print, .sign-block)
// sehingga pratinjau, PDF, PNG, Word, WhatsApp, dan cetak bekerja lewat openDoc() tanpa perubahan.
import { S } from '../store.js';
import { esc, fmtTgl, addDays, parseYmd, ymd, pad2 } from '../core/util.js';
import { signHtml } from './sign.js';

// ------------------------------------------------------------------ pengaturan bawaan (dari sheet DATA Excel)
export const SP_DEFAULTS = {
  spKop1: 'YAYASAN GMIM DS.A.Z.R.WENAS',
  spKop2: 'BIDANG PENDIDIKAN DAN PERSEKOLAHAN',
  spKop3: 'SMP KRISTEN 65 BASAAN KECAMATAN RATATOTOK',
  spKop4: 'JALAN RAYA BASAAN',
  spAlamatKop: 'Jl. Raya Basaan, Desa Basaan Satu Kec. Ratatotok',
  spLogoKiri: '', // '' = logo bawaan, '-' = tanpa logo, data:image/… = logo unggahan
  spLogoKanan: '',
  spKota: '',
  spTempat: 'SMP Kristen Basaan',
  spWaktu: '08.30 Pagi',
  spJarakHari: '2',
  spTemplate: 'utama',
  spWarna: 'navy',
  spKertas: 'F4', // Excel CETAK memakai kertas Folio/F4
  spNomorFormat: '{no}/SPO/SMPK-B/{bln}/{thn}',
  spJudul: '',
  spPerihal: 'Panggilan Orang Tua/Wali Siswa',
  spSalam: 'Salam Sejahtera',
  spPembuka: 'Dalam rangka peningkatan hubungan antara Orang Tua dan Pihak sekolah, dengan tujuan perkembangan Siswa maka melalui surat ini disampaikan kepada Orang tua/wali dari :',
  spPengantar: 'Bahwa siswa yang tersebut diatas telah memiliki Catatan Pelanggaran Tata-Tertib Sekolah sebagai Berikut :',
  spAjakan: 'Maka diharapkan Orang Tua dari Siswa yang bersangkutan untuk datang di {tempat} pada :',
  spPenutup1: 'Mengingat Pentingnya Surat ini, Kami sangat berharap kehadiran dari Orang Tua, demi Kebaikan dan Perkembangan siswa.',
  spPenutup2: 'Demikian surat ini dibuat untuk diketahui oleh orang tua/wali siswa yang bersangkutan. Atas perhatiannya diucapkan terima kasih',
};

/** Keterangan tiap kunci pengaturan (dipakai lembar Pengaturan Surat). */
export const SP_LABELS = {
  spKop1: 'Kop baris 1', spKop2: 'Kop baris 2', spKop3: 'Kop baris 3', spKop4: 'Kop baris 4', spAlamatKop: 'Alamat (baris kecil di kop)',
  spKota: 'Kota (tanggal surat)', spTempat: 'Tempat pertemuan', spWaktu: 'Waktu pertemuan', spJarakHari: 'Orang tua datang … hari setelah tanggal surat',
  spNomorFormat: 'Format nomor surat', spKertas: 'Ukuran kertas surat', spJudul: 'Judul surat', spPerihal: 'Perihal', spSalam: 'Salam pembuka', spPembuka: 'Paragraf pembuka',
  spPengantar: 'Kalimat sebelum tabel pelanggaran', spAjakan: 'Kalimat ajakan datang', spPenutup1: 'Paragraf penutup 1', spPenutup2: 'Paragraf penutup 2',
};

export const spSet = (k) => {
  const v = S.settings?.[k];
  if (v != null && v !== '') return String(v);
  if (k === 'spKota') return S.settings?.kota || 'Basaan';
  return SP_DEFAULTS[k] ?? '';
};

// ------------------------------------------------------------------ templat & warna
export const TEMPLATES = [
  { kode: 'utama', label: 'Utama (format sekolah)', ket: 'Persis format Excel sheet CETAK: kop dua logo, tabel pelanggaran, jadwal, tanda tangan Wali Kelas.', judul: '' },
  { kode: 'resmi', label: 'Resmi Bernomor', ket: 'Gaya surat dinas: kop bergaris ganda, Nomor/Lampiran/Perihal, "Dengan hormat", tembusan.', judul: 'Surat Panggilan Orang Tua/Wali' },
  { kode: 'modern', label: 'Modern Berwarna', ket: 'Judul berpita warna, kartu data siswa & jadwal berdampingan, tabel berwarna.', judul: 'Surat Panggilan Orang Tua/Wali', warna: true },
  { kode: 'bingkai', label: 'Elegan Berbingkai', ket: 'Bingkai ganda di tepi halaman, ornamen, jadwal dalam kotak di tengah.', judul: 'Surat Panggilan Orang Tua/Wali', warna: true },
  { kode: 'ringkas', label: 'Ringkas Hemat Kertas', ket: 'Huruf sedikit lebih kecil & rapat, data siswa dan jadwal dua kolom — muat satu halaman.', judul: 'Surat Panggilan Orang Tua/Wali' },
  { kode: 'undangan', label: 'Undangan Bersahabat', ket: 'Bahasa ramah "undangan pertemuan", huruf modern, kotak jadwal membulat.', judul: 'Undangan Pertemuan Orang Tua/Wali', warna: true },
];
export const tplOf = (kode) => TEMPLATES.find((t) => t.kode === kode) || TEMPLATES[0];

export const WARNA = [
  { kode: 'navy', label: 'Biru dongker', hex: '#0b3a6e' },
  { kode: 'hijau', label: 'Hijau', hex: '#047857' },
  { kode: 'merah', label: 'Merah marun', hex: '#9f1d2b' },
  { kode: 'ungu', label: 'Ungu', hex: '#5b21b6' },
  { kode: 'coklat', label: 'Cokelat', hex: '#7c4a1e' },
  { kode: 'hitam', label: 'Hitam', hex: '#1f2937' },
];
const warnaOf = (k) => (WARNA.some((w) => w.kode === k) ? k : 'navy');

// ------------------------------------------------------------------ logo (dari file Excel, ikut tersimpan offline)
export const LOGO_FILES = { kiri: 'icons/logo-surat-kiri.png', kanan: 'icons/logo-surat-kanan.png' };
const logoData = {};
let logoP = null;
/** Muat logo bawaan sebagai data URL (perlu untuk Word). Aman dipanggil berkali-kali. */
export function ensureLogos() {
  if (!logoP) {
    logoP = Promise.all(Object.entries(LOGO_FILES).map(async ([k, url]) => {
      try {
        const blob = await (await fetch(url)).blob();
        logoData[k] = await new Promise((res, rej) => { const fr = new FileReader(); fr.onload = () => res(fr.result); fr.onerror = rej; fr.readAsDataURL(blob); });
      } catch { /* tetap pakai alamat file */ }
    }));
  }
  return logoP;
}
/** Sumber gambar logo: '' bila disembunyikan. */
export function logoSrc(side) {
  const v = spSet(side === 'kiri' ? 'spLogoKiri' : 'spLogoKanan');
  if (v === '-') return '';
  if (/^data:image\//.test(v)) return v;
  return logoData[side] || LOGO_FILES[side];
}

// ------------------------------------------------------------------ bantu
const nl = (t) => esc(t).replace(/\r?\n/g, '<br>');
const jkText = (jk) => (jk === 'P' ? 'Perempuan' : jk === 'L' ? 'Laki-laki' : jk || '-');
export const ROMAWI = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X', 'XI', 'XII'];

/** Tanggal datang bawaan: tanggal surat + jarak hari; hari Minggu digeser ke Senin (sama seperti Excel). */
export function tanggalDatang(tglSurat, jarak = Number(spSet('spJarakHari')) || 0) {
  let d = addDays(tglSurat || ymd(), jarak);
  if (parseYmd(d).getDay() === 0) d = addDays(d, 1);
  return d;
}

/** Nomor surat dari format: {no} {bln} (romawi) {bulan} (angka) {thn}. */
export function formatNomor(fmt, no, tgl = ymd()) {
  const d = parseYmd(tgl) || new Date();
  return String(fmt || '').replace(/\{no\}/g, String(no).padStart(3, '0')).replace(/\{bln\}/g, ROMAWI[d.getMonth()])
    .replace(/\{bulan\}/g, pad2(d.getMonth() + 1)).replace(/\{thn\}/g, String(d.getFullYear()));
}

/** Jam "08:30" + selang menit → "08.45". */
export function jamPlus(jam, menit) {
  const m = /^(\d{1,2})[:.](\d{2})/.exec(jam || '');
  if (!m) return jam || '';
  const t = (+m[1]) * 60 + (+m[2]) + (Number(menit) || 0);
  return `${pad2(Math.floor(t / 60) % 24)}.${pad2(t % 60)}`;
}

/** Ganti penanda {nama} {kelas} {tempat} {sekolah} {ortu} {tanggal} {waktu} di kalimat surat. */
export function isiPenanda(text, L) {
  const map = {
    nama: L.siswa?.nama || '', kelas: L.siswa?.kelas || '', ortu: L.siswa?.ortu || 'Orang Tua/Wali', sekolah: S.settings?.namaSekolah || '',
    tempat: L.jadwal?.tempat || '', waktu: L.jadwal?.waktu || '', tanggal: L.jadwal?.tanggal ? fmtTgl(L.jadwal.tanggal, { hari: true }) : '',
  };
  return String(text || '').replace(/\{(nama|kelas|ortu|sekolah|tempat|waktu|tanggal)\}/gi, (_, k) => map[k.toLowerCase()]);
}

// ------------------------------------------------------------------ potongan surat
function kopHtml() {
  const L = logoSrc('kiri'), R = logoSrc('kanan');
  const lines = [['spKop1', 'k1', 26, true], ['spKop2', 'k2', 24, true], ['spKop3', 'k3', 24, true], ['spKop4', 'k4', 24, true], ['spAlamatKop', 'ka', 20, false, true]]
    .map(([k, c, sz, b, i]) => [spSet(k), c, sz, b, i]).filter(([t]) => t);
  return `<div class="kop sp-kop">${L ? `<img class="kop-logo" src="${esc(L)}" alt="">` : '<div class="kop-logo kop-pad"></div>'}
    <div class="kop-text">${lines.map(([t, c, sz, b, i]) => `<div class="kop-line ${c}" data-sz="${sz}"${b ? ' data-b="1"' : ''}${i ? ' data-i="1"' : ''}>${esc(t)}</div>`).join('')}</div>
    ${R ? `<img class="kop-logo kop-logo-r" src="${esc(R)}" alt="">` : '<div class="kop-logo kop-pad"></div>'}</div>`;
}

const tglSurat = (L) => `${esc(spSet('spKota'))}, ${fmtTgl(L.tglSurat)}`;

function identSiswa(L, { ortu = false, nis = false } = {}) {
  const s = L.siswa;
  const rows = [
    ['Nama', `<b>${esc(s.nama)}</b>`],
    nis ? ['NIS / NISN', esc([s.nis, s.nisn].filter(Boolean).join(' / ') || '-')] : ['NISN', esc(s.nisn || (s.nis ? `${s.nis} (NIS)` : '-'))],
    ['Jenis Kelamin', esc(jkText(s.jk))],
    ['Kelas', esc(s.kelas || '-')],
    ortu ? ['Orang Tua/Wali', esc(s.ortu || '-')] : null,
  ].filter(Boolean);
  return `<table class="ident sp-ident">${rows.map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${v}</td></tr>`).join('')}</table>`;
}

function jadwalRows(L) {
  const j = L.jadwal;
  return [
    ['Hari / Tanggal', j.tanggal ? fmtTgl(j.tanggal, { hari: true }) : '..........................................'],
    ['Waktu', j.waktu || '..........................................'],
    ['Tempat', j.tempat || '..........................................'],
    j.menemui ? ['Menemui', j.menemui] : null,
    j.keperluan ? ['Keperluan', j.keperluan] : null,
  ].filter(Boolean);
}
const jadwalIdent = (L, cls = '') => `<table class="ident sp-jadwal ${cls}">${jadwalRows(L).map(([k, v]) => `<tr><td>${esc(k)}</td><td>:</td><td>${k === 'Hari / Tanggal' ? `<b>${esc(v)}</b>` : esc(v)}</td></tr>`).join('')}</table>`;

/** Tabel pelanggaran: Tanggal | Pelanggaran | Kronologi | Poin (+ baris jumlah & akumulasi). */
function pelTable(L, { no = false } = {}) {
  const o = L.opsi;
  const rows = L.rows;
  const cols = 2 + (no ? 1 : 0) + (o.kolomKron ? 1 : 0) + (o.kolomPoin ? 1 : 0);
  const blank = Math.max(0, (Number(o.barisKosong) || 0) - rows.length);
  const body = rows.map((r, i) => `<tr>${no ? `<td class="no">${i + 1}</td>` : ''}<td class="sp-c-tgl">${r.tanggal ? esc(fmtTgl(r.tanggal)) : esc(r.tanggalTeks || '-')}</td><td>${nl(r.uraian)}</td>${o.kolomKron ? `<td>${nl(r.kron || '')}</td>` : ''}${o.kolomPoin ? `<td class="sp-c-poin">${r.poin === '' || r.poin == null ? '' : esc(r.poin)}</td>` : ''}</tr>`).join('')
    + Array.from({ length: blank }, () => `<tr class="sp-blank">${'<td>&nbsp;</td>'.repeat(cols)}</tr>`).join('');
  const span = cols - 1;
  const sums = o.kolomPoin ? [
    `<tr class="sp-sum"><td colspan="${span}" class="num"><b>Jumlah Poin pada surat ini</b></td><td class="sp-c-poin"><b>${L.totalPoin}</b></td></tr>`,
    o.akumulasi ? `<tr class="sp-sum"><td colspan="${span}" class="num"><b>Akumulasi Poin seluruh pelanggaran siswa</b></td><td class="sp-c-poin"><b>${L.akumulasi}</b></td></tr>` : '',
    o.tahap && L.tahap ? `<tr class="sp-sum"><td colspan="${span}" class="num"><b>Tahap sanksi saat ini</b></td><td class="sp-c-poin sp-c-tahap"><b>${esc(L.tahap)}</b></td></tr>` : '',
  ].join('') : '';
  return `<table class="tbl-print sp-tbl"><thead><tr>${no ? '<th class="no">No</th>' : ''}<th class="sp-c-tgl">Tanggal</th><th>Pelanggaran</th>${o.kolomKron ? '<th>Kronologi</th>' : ''}${o.kolomPoin ? '<th class="sp-c-poin">Poin</th>' : ''}</tr></thead>
    <tbody>${body || `<tr><td colspan="${cols}"><em>(belum ada pelanggaran dipilih)</em></td></tr>`}${sums}</tbody></table>`;
}

const p = (t, cls = '') => (String(t || '').trim() ? `<p${cls ? ` class="${cls}"` : ''}>${nl(t)}</p>` : '');
const tambahan = (L) => `${L.kronUmum ? `<p class="sp-kron-umum"><b>Kronologi kejadian:</b><br>${nl(L.kronUmum)}</p>` : ''}${p(L.tambahan)}`;
const tembusan = (L) => {
  const list = String(L.tembusan || '').split(/\r?\n/).map((x) => x.trim()).filter(Boolean);
  return list.length ? `<p class="small sp-tembusan"><b>Tembusan:</b><br>${list.map((x, i) => `${i + 1}. ${esc(x)}`).join('<br>')}</p>` : '';
};

function slipHtml(L) {
  if (!L.opsi.slip) return '';
  return `<div class="sp-slip"><div class="sp-cut">- - - - - - - - - - - - - - - - - - - - - - - - - - - potong di sini - - - - - - - - - - - - - - - - - - - - - - - - - - -</div>
    <div class="sp-slip-h">TANDA TERIMA SURAT PANGGILAN</div>
    <table class="ident"><tr><td>Nama siswa</td><td>:</td><td><b>${esc(L.siswa.nama)}</b> (Kelas ${esc(L.siswa.kelas || '-')})</td></tr>
    <tr><td>Jadwal</td><td>:</td><td>${L.jadwal.tanggal ? esc(fmtTgl(L.jadwal.tanggal, { hari: true })) : '-'}${L.jadwal.waktu ? `, ${esc(L.jadwal.waktu)}` : ''}</td></tr>
    <tr><td>Kesediaan hadir</td><td>:</td><td>Bersedia hadir / Berhalangan *) ...........................................</td></tr></table>
    <p class="right small">.................., ...........................<br>Orang Tua/Wali,<br><br><br>(.......................................................)</p>
    <p class="small"><i>*) coret yang tidak perlu. Potongan ini dikembalikan ke sekolah melalui siswa.</i></p></div>`;
}

const nomorBlock = (L, perihal = true) => `<table class="ident sp-nomor"><tr><td>Nomor</td><td>:</td><td>${L.nomor ? esc(L.nomor) : '........................................'}</td></tr>
  <tr><td>Lampiran</td><td>:</td><td>${esc(L.lampiran || '-')}</td></tr>${perihal ? `<tr><td>Perihal</td><td>:</td><td><b>${esc(L.perihal || '-')}</b></td></tr>` : ''}</table>`;

const kepadaOrtu = (L) => `<p class="sp-kepada">Kepada Yth.<br>Bapak/Ibu Orang Tua/Wali dari <b>${esc(L.siswa.nama)}</b>${L.siswa.ortu ? ` (${esc(L.siswa.ortu)})` : ''}<br>di Tempat</p>`;

// ------------------------------------------------------------------ templat
const BUILD = {
  // Format sheet CETAK (Excel).
  utama: (L) => `${kopHtml()}
    ${L.nomor ? `<p class="sp-nomor-line">Nomor : ${esc(L.nomor)}</p>` : ''}
    <p class="right sp-tgl">${tglSurat(L)}</p>
    <p class="sp-kepada">Kepada Yth<br><span class="sp-ind">Orang Tua/ Wali dari</span></p>
    <table class="ident sp-ident-to"><tr><td>Siswa</td><td>:</td><td><b>${esc(L.siswa.nama)}</b></td></tr></table>
    ${p(L.teks.salam)}${p(L.teks.pembuka)}${identSiswa(L)}${p(L.teks.pengantar)}${pelTable(L)}${tambahan(L)}
    ${p(L.teks.ajakan)}${jadwalIdent(L)}${p(L.teks.penutup1)}${p(L.teks.penutup2)}
    ${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,

  resmi: (L) => `${kopHtml()}<div class="kop-rule"></div>
    <p class="right sp-tgl">${tglSurat(L)}</p>${nomorBlock(L)}${kepadaOrtu(L)}
    ${p(L.teks.salam && L.teks.salam !== 'Salam Sejahtera' ? L.teks.salam : 'Dengan hormat,')}
    ${p(L.teks.pembuka)}${identSiswa(L, { ortu: true, nis: true })}${p(L.teks.pengantar)}${pelTable(L, { no: true })}${tambahan(L)}
    ${p(L.teks.ajakan)}${jadwalIdent(L)}${p(L.teks.penutup1)}${p(L.teks.penutup2)}
    ${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,

  modern: (L) => `${kopHtml()}<div class="sp-rule"></div>
    <h1 class="doc-title sp-title">${esc(L.judul)}</h1>
    <div class="sp-meta"><span>Nomor: <b>${L.nomor ? esc(L.nomor) : '....................'}</b></span><span>${tglSurat(L)}</span></div>
    ${p(L.teks.salam)}${p(L.teks.pembuka)}
    <div class="sp-cards"><div class="sp-card"><div class="sp-card-h">Data siswa</div>${identSiswa(L, { ortu: true })}</div>
      <div class="sp-card sp-card-acc"><div class="sp-card-h">Jadwal pertemuan</div>${jadwalIdent(L)}</div></div>
    ${p(L.teks.pengantar)}${pelTable(L, { no: true })}${tambahan(L)}
    ${p(L.teks.ajakan)}${p(L.teks.penutup1)}${p(L.teks.penutup2)}
    ${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,

  bingkai: (L) => `${kopHtml()}<div class="kop-rule"></div>
    <h1 class="doc-title sp-title">${esc(L.judul)}</h1>
    <div class="sp-orn">&#9670; &#9670; &#9670;</div>
    ${L.nomor ? `<p class="doc-no">Nomor: ${esc(L.nomor)}</p>` : ''}
    <p class="sp-kepada">Kepada Yth.<br>Orang Tua/Wali dari <b>${esc(L.siswa.nama)}</b><br>di Tempat</p>
    ${p(L.teks.salam)}${p(L.teks.pembuka)}${identSiswa(L)}${p(L.teks.pengantar)}${pelTable(L)}${tambahan(L)}
    ${p(L.teks.ajakan)}<div class="sp-box">${jadwalIdent(L)}</div>${p(L.teks.penutup1)}${p(L.teks.penutup2)}
    <p class="right sp-tgl">${tglSurat(L)}</p>${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,

  ringkas: (L) => `${kopHtml()}<div class="kop-rule"></div>
    <div class="sp-meta"><span>Nomor: ${L.nomor ? esc(L.nomor) : '....................'} · Perihal: <b>${esc(L.perihal || '-')}</b></span><span>${tglSurat(L)}</span></div>
    <p class="sp-kepada">Kepada Yth. Orang Tua/Wali dari <b>${esc(L.siswa.nama)}</b> — di Tempat</p>
    ${p(L.teks.salam)}${p(L.teks.pembuka)}
    <div class="sp-2col"><div>${identSiswa(L)}</div><div><div class="sp-card-h">Jadwal pertemuan</div>${jadwalIdent(L)}</div></div>
    ${p(L.teks.pengantar)}${pelTable(L)}${tambahan(L)}${p(L.teks.ajakan)}${p(`${L.teks.penutup1} ${L.teks.penutup2}`)}
    ${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,

  undangan: (L) => `${kopHtml()}<div class="sp-rule"></div>
    <h1 class="doc-title sp-title">${esc(L.judul)}</h1>
    ${L.nomor ? `<p class="doc-no">Nomor: ${esc(L.nomor)}</p>` : ''}
    <p class="right sp-tgl">${tglSurat(L)}</p>
    <p class="sp-kepada">Kepada Yth.<br>Bapak/Ibu Orang Tua/Wali dari ananda <b>${esc(L.siswa.nama)}</b> (Kelas ${esc(L.siswa.kelas || '-')})<br>di Tempat</p>
    ${p(L.teks.salam)}${p(L.teks.pembuka)}${identSiswa(L)}${p(L.teks.pengantar)}${pelTable(L)}${tambahan(L)}
    ${p(L.teks.ajakan)}<div class="sp-box sp-box-round"><div class="sp-card-h">Kami nantikan kehadiran Bapak/Ibu pada</div>${jadwalIdent(L)}</div>
    ${p(L.teks.penutup1)}${p(L.teks.penutup2)}${signHtml(L.ttd)}${tembusan(L)}${slipHtml(L)}`,
};

/**
 * HTML satu surat.
 * L: {template, warna, tglSurat, nomor, lampiran, perihal, judul, siswa, rows:[{tanggal, uraian, poin, kron}], totalPoin, akumulasi, tahap,
 *     opsi:{kolomKron, kolomPoin, akumulasi, tahap, slip, barisKosong}, teks:{salam, pembuka, pengantar, ajakan, penutup1, penutup2},
 *     tambahan, kronUmum, tembusan, jadwal:{tanggal, waktu, tempat, menemui, keperluan}, ttd:[kolom tanda tangan]}
 */
export function suratHtml(L) {
  const t = tplOf(L.template);
  const Lx = {
    ...L,
    judul: isiPenanda(L.judul || t.judul || 'Surat Panggilan Orang Tua/Wali', L),
    tambahan: isiPenanda(L.tambahan, L),
    kronUmum: isiPenanda(L.kronUmum, L),
    teks: Object.fromEntries(Object.entries(L.teks || {}).map(([k, v]) => [k, isiPenanda(v, L)])),
  };
  return `<div class="doc sp sp-${t.kode} sp-c-${warnaOf(L.warna)}">${BUILD[t.kode](Lx)}</div>`;
}

/** Daftar hadir orang tua/wali untuk surat massal. */
export function daftarHadirHtml(letters, { judul = 'Daftar Hadir Orang Tua/Wali', ttd = [] } = {}) {
  const first = letters[0];
  const tgl = first?.jadwal?.tanggal;
  return `<div class="doc sp sp-hadir">${kopHtml()}<div class="kop-rule"></div>
    <h1 class="doc-title">${esc(judul)}</h1>
    <p class="doc-no">${tgl ? esc(fmtTgl(tgl, { hari: true })) : ''}${first?.jadwal?.tempat ? ` · ${esc(first.jadwal.tempat)}` : ''}</p>
    <table class="tbl-print"><thead><tr><th class="no">No</th><th>Nama Siswa</th><th>Kelas</th><th>Orang Tua/Wali</th><th>Waktu</th><th style="width:22%">Tanda Tangan</th><th>Ket.</th></tr></thead><tbody>
    ${letters.map((L, i) => `<tr><td class="no">${i + 1}</td><td>${esc(L.siswa.nama)}</td><td>${esc(L.siswa.kelas || '')}</td><td>${esc(L.siswa.ortu || '')}</td><td class="nw">${esc(L.jadwal.waktu || '')}</td><td>${i % 2 ? '<span class="sp-ttd-r">' : ''}${i + 1}. ..................${i % 2 ? '</span>' : ''}</td><td></td></tr>`).join('')}
    </tbody></table>
    <p class="right">${esc(spSet('spKota'))}, ${fmtTgl(first?.tglSurat || ymd())}</p>${signHtml(ttd)}</div>`;
}
