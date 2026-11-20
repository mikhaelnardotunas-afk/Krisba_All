// =====================================================================
// MESIN RAPOR - porting dari aplikasi E-Raport lama, kini memakai data database.
// Format: kementerian (Panduan Pembelajaran & Asesmen 2025), semester (template K13: sikap,
// pengetahuan & keterampilan), mendalam (Pembelajaran Mendalam), mid (laporan tengah semester), kartu (kartu hasil belajar).
// =====================================================================
import { esc, fmtNum, loadScript } from '../ui.js';
import { scalesFor, predicateOf, describe, buildKokurikuler, ekskulDescription, faseOf, romawi, semesterAngka } from './describe.js';
import { kopHtml } from './print.js';

export const FORMATS = [
  { id: 'kementerian', name: 'Rapor Kementerian (Panduan Asesmen 2025)' },
  { id: 'semester', name: 'Rapor Semester (Sikap, Pengetahuan & Keterampilan)' },
  { id: 'mendalam', name: 'Rapor Pembelajaran Mendalam' },
  { id: 'mid', name: 'Laporan Tengah Semester' },
  { id: 'kartu', name: 'Kartu Hasil Belajar' }
];
export const THEMES = [
  { id: 'default', name: 'Default (resmi)' }, { id: 'navy', name: 'Biru Navy' }, { id: 'hijau', name: 'Hijau' },
  { id: 'marun', name: 'Marun' }, { id: 'monokrom', name: 'Hitam Putih (hemat tinta)' }
];

const v1 = v => (v === null || v === undefined ? '' : fmtNum(v, 2));
const has = v => v !== null && v !== undefined && String(v).trim() !== '';

export async function prepareQr() {
  if (!window.qrcode) await loadScript('vendor/qrcode.min.js').catch(() => {});
}

function qrDataUrl(d, st) {
  if (!window.qrcode || d.settings.tampilkan_qr !== '1') return '';
  try {
    const text = `RAPOR ${d.settings.nama_sekolah}\nNama: ${st.name}\nNISN: ${st.nisn || '-'}\nKelas: ${d.class.name}\n${d.semester.year_name} ${d.semester.name}\nRata-rata: ${fmtNum(st.average, 2)}${st.rank ? '\nPeringkat: ' + st.rank : ''}${st.card && st.card.report_number ? '\nNo: ' + st.card.report_number : ''}`;
    const qr = window.qrcode(0, 'M');
    qr.addData(text.replace(/[^\x20-\x7E\n]/g, '?'));
    qr.make();
    return qr.createDataURL(3, 0);
  } catch (e) { return ''; }
}

function groups(subjects) {
  const keys = [];
  subjects.forEach(s => { if (!keys.includes(s.group_name)) keys.push(s.group_name); });
  return keys.map(k => ({ label: /^[A-Z]$/.test(k) ? 'KELOMPOK ' + k : String(k).toUpperCase(), items: subjects.filter(s => s.group_name === k) }));
}

function waliOf(d) { return { name: d.class.homeroom_name || '', nip: d.class.homeroom_nip || '' }; }
function placeDate(d) { return [d.semester.report_place, d.semester.report_date].filter(Boolean).join(', '); }
function kelasLabel(d) { return d.class.report_label || romawi(d.class.grade_level); }

function subjectRow(d, st, sb, val, style) {
  const sc = scalesFor(d.scales, sb.id);
  const g = predicateOf(val, sc);
  const comment = (st.details[sb.id] || {}).comment;
  return { g, desk: describe({ settings: d.settings, nama: st.name, mapel: sb.name, score: val, comment, scales: sc, style }) };
}

function ekskulRows(d, st) {
  return (st.ekskul || []).map(e => ({ name: e.name, grade: e.grade || '', desc: ekskulDescription(e, d.settings) }));
}

function att(st) { return st.attendance || {}; }

function signBlock(d, st, { kepsekLabel = 'Kepala Sekolah', withParent = true, three = false } = {}) {
  const w = waliOf(d);
  const s = d.settings;
  const ttd = s.ttd_kepsek ? `<img src="${esc(s.ttd_kepsek)}" alt="">` : '';
  if (three) {
    return `<table class="sign sign-3"><tr>
      <td><br>Orang Tua/Wali Murid<div class="sign-space"></div>…………………………</td>
      <td>${kepsekLabel === 'Mengetahui,<br>Kepala Sekolah' ? '<br>' : ''}Mengetahui,<br>Kepala Sekolah<div class="sign-space">${ttd}</div><b>${esc(s.kepala_sekolah)}</b>${s.nip_kepala_sekolah ? '<br>NIP. ' + esc(s.nip_kepala_sekolah) : ''}</td>
      <td>${esc(placeDate(d))}<br>Wali Kelas<div class="sign-space"></div><b>${esc(w.name)}</b>${w.nip ? '<br>NIP. ' + esc(w.nip) : ''}</td></tr></table>`;
  }
  return `<table class="sign"><tr>
      ${withParent ? `<td><br>Orang Tua / Wali<div class="sign-space"></div>…………………………</td>` : '<td></td>'}
      <td>${esc(placeDate(d))}<br>Wali Kelas<div class="sign-space"></div><b>${esc(w.name)}</b>${w.nip ? '<br>NIP. ' + esc(w.nip) : ''}</td></tr></table>
    <div class="r-kepsek">${kepsekLabel}<div class="sign-space">${ttd}</div><b>${esc(s.kepala_sekolah)}</b>${s.nip_kepala_sekolah ? '<br>NIP. ' + esc(s.nip_kepala_sekolah) : ''}</div>`;
}

function footer(d, st) {
  const qr = qrDataUrl(d, st);
  return `<div class="r-foot"><span>${esc((st.roll_no ? st.roll_no + '. ' : '') + st.name)} · ${esc(d.class.name)}</span>${qr ? `<img src="${qr}" alt="QR verifikasi">` : ''}</div>`;
}

function nomor(st) { return st.card && st.card.report_number ? `<div class="r-nomor">No. Rapor: ${esc(st.card.report_number)}</div>` : ''; }

// ---------- Format Kementerian ----------
function kementerian(d, st) {
  const s = d.settings;
  const rows = d.subjects.map((sb, i) => {
    const v = st.grades[sb.id];
    const r = subjectRow(d, st, sb, v, 'kementerian');
    return `<tr><td>${i + 1}</td><td class="mapel">${esc(sb.name)}</td><td>${v1(v)}</td><td class="desk">${esc(r.desk)}</td></tr>`;
  }).join('');
  const card = st.card || {};
  const kk = buildKokurikuler(st.name, card, s);
  const eks = ekskulRows(d, st);
  const a = att(st);
  const hari = v => (has(v) ? esc(v) : '. . .') + ' hari';
  const genap = Number(d.semester.term) === 2;
  return `${s.tampilkan_kop === '1' ? kopHtml(s, { small: true }) : ''}${nomor(st)}
    <div class="r-title">${esc(s.judul_kementerian || 'LAPORAN HASIL BELAJAR')}</div>
    <table class="r-ident">
      <tr><td class="l">Nama Murid</td><td class="v">: <b>${esc(st.name)}</b></td><td class="l2">Kelas</td><td>: ${esc(kelasLabel(d))} (${esc(d.class.name)})</td></tr>
      <tr><td class="l">NIS / NISN</td><td class="v">: ${esc(st.nis || '-')} / ${esc(st.nisn || '-')}</td><td class="l2">Fase</td><td>: ${esc(faseOf(d.class.grade_level))}</td></tr>
      <tr><td class="l">Sekolah</td><td class="v">: ${esc(s.nama_sekolah_raport || s.nama_sekolah)}</td><td class="l2">Semester</td><td>: ${esc(semesterAngka(d.semester.term, d.semester.name))}</td></tr>
      <tr><td class="l">Alamat</td><td class="v">: ${esc(s.alamat_raport || s.alamat)}</td><td class="l2">Tahun Ajaran</td><td>: ${esc(d.semester.year_name)}</td></tr>
    </table>
    <table class="r-tbl"><colgroup><col style="width:6%"><col style="width:27%"><col style="width:11%"><col style="width:56%"></colgroup>
      <thead><tr><th>No.</th><th>Mata Pelajaran</th><th>Nilai Akhir</th><th>Capaian Kompetensi</th></tr></thead><tbody>${rows}</tbody></table>
    <table class="r-tbl"><tr><th class="l">Kokurikuler</th></tr><tr><td class="l" style="height:12mm;vertical-align:top">${kk ? esc(kk) : '&nbsp;'}</td></tr></table>
    <table class="r-tbl"><colgroup><col style="width:6%"><col style="width:30%"><col style="width:64%"></colgroup>
      <tr><th>No.</th><th>Ekstrakurikuler</th><th>Keterangan</th></tr>
      ${(eks.length ? eks : [{}, {}]).map((e, i) => `<tr><td style="height:6mm">${e.name ? i + 1 : ''}</td><td class="l">${esc(e.name || '')}</td><td class="l">${e.name ? esc(e.desc.toLowerCase().startsWith(String(e.grade).toLowerCase()) ? e.desc : (e.grade ? e.grade + '. ' : '') + e.desc) : ''}</td></tr>`).join('')}</table>
    <table class="r-two"><tr>
      <td style="width:40%"><table class="r-tbl" style="margin:0"><tr><th colspan="2" class="l">Ketidakhadiran</th></tr>
        <tr><td class="l" style="width:55%">Sakit</td><td class="l">${hari(a.sick)}</td></tr><tr><td class="l">Izin</td><td class="l">${hari(a.permit)}</td></tr><tr><td class="l">Tanpa Keterangan</td><td class="l">${hari(a.absent)}</td></tr></table></td>
      <td style="width:3%"></td>
      <td style="width:57%"><table class="r-tbl" style="margin:0"><tr><th class="l">Catatan Wali Kelas</th></tr><tr><td class="l" style="height:16mm;vertical-align:top">${esc(card.homeroom_note || '')}</td></tr></table></td>
    </tr></table>
    <table class="r-tbl mt"><tr><th class="l">Tanggapan Orang Tua/Wali Murid</th></tr><tr><td class="l" style="height:14mm;vertical-align:top">${esc(card.parent_response || '')}</td></tr></table>
    ${s.tampilkan_keputusan === '1' && genap ? `<div class="r-box"><b>Keputusan:</b>\n${esc(card.decision || s.keputusan_default)}</div>` : ''}
    ${signBlock(d, st, { three: true })}
    ${footer(d, st)}`;
}

// ---------- Format Semester (K13) & Pembelajaran Mendalam ----------
function semesterFmt(d, st, mendalam) {
  const s = d.settings;
  const card = st.card || {};
  const skillsOn = !mendalam && st.skills;
  const sikap = (pred, desk) => `<table class="r-tbl"><colgroup><col style="width:25%"><col style="width:75%"></colgroup><tr><th>Predikat</th><th>Deskripsi</th></tr><tr><td style="padding:6px">${esc(pred)}</td><td class="l" style="padding:6px 8px">${esc(desk)}</td></tr></table>`;
  const table = (label, valOf) => {
    let no = 0;
    const body = groups(d.subjects).map(g => `<tr class="grp"><td colspan="6">${esc(g.label)}</td></tr>` + g.items.map(sb => {
      no++;
      const v = valOf(sb);
      const r = subjectRow(d, st, sb, v, 'semester');
      return `<tr><td>${no}</td><td class="mapel">${esc(sb.name)}</td><td>${fmtNum(sb.kktp_effective)}</td><td>${v1(v)}</td><td>${r.g && v !== null && v !== undefined ? esc(r.g.predicate) : ''}</td><td class="desk">${esc(r.desk)}</td></tr>`;
    }).join('')).join('');
    return `<table class="r-tbl"><colgroup><col style="width:6%"><col style="width:22%"><col style="width:7%"><col style="width:8%"><col style="width:6%"><col style="width:51%"></colgroup>
      <thead>${label ? `<tr><th rowspan="2">NO</th><th rowspan="2">MATA PELAJARAN</th><th colspan="4">${label}</th></tr><tr><th>KKTP</th><th>NILAI</th><th>Pre</th><th>Deskripsi</th></tr>` : '<tr><th>NO</th><th>MATA PELAJARAN</th><th>KKTP</th><th>NILAI</th><th>Pre</th><th>Deskripsi</th></tr>'}</thead><tbody>${body}`;
  };
  const showRank = d.ranking_enabled && s.tampilkan_peringkat_raport === '1';
  const sums = `<tr class="sum"><td colspan="3">Jumlah</td><td>${fmtNum(st.total)}</td><td class="nb"></td><td class="nb"></td></tr>
    <tr class="sum"><td colspan="3">Rata-Rata${showRank ? ' / Peringkat' : ''}</td><td>${st.count ? fmtNum(st.average, 2) : '-'}</td><td>${showRank && st.rank ? st.rank : ''}</td><td class="nb"></td></tr></tbody></table>`;
  let huruf = 67;
  const bagian = t => String.fromCharCode(huruf++) + '. ' + t;
  const eks = ekskulRows(d, st);
  const a = att(st);
  const kk = buildKokurikuler(st.name, card, s);
  return `${s.tampilkan_kop === '1' ? kopHtml(s, { small: true }) : ''}${nomor(st)}
    <div class="r-title boxed">${esc(s.judul_raport || 'PENCAPAIAN KOMPETENSI PESERTA DIDIK')}</div>
    <table class="r-ident">
      <tr><td class="l"><b>Nama Siswa</b></td><td colspan="3"><b>: ${esc(st.name)}</b></td></tr>
      <tr><td class="l">Nama Sekolah</td><td class="v">: ${esc(s.nama_sekolah_raport || s.nama_sekolah)}</td><td class="l2">NIS / NISN</td><td>: ${esc(st.nis || '-')} / ${esc(st.nisn || '-')}</td></tr>
      <tr><td class="l">Alamat</td><td class="v">: ${esc(s.alamat_raport || s.alamat)}</td><td class="l2">Kelas</td><td>: ${esc(kelasLabel(d))}/${esc(d.semester.name)}</td></tr>
      <tr><td class="l">Semester</td><td class="v">: ${esc(d.semester.name)}</td><td class="l2">Thn. Pelajaran</td><td>: ${esc(d.semester.year_name)}</td></tr>
    </table>
    <div class="r-sec">A. PENILAIAN SIKAP</div><div class="r-sub">1. Sikap Spiritual</div>${sikap(card.spiritual_pred || s.sikap_spiritual_predikat, card.spiritual_desc || s.sikap_spiritual_deskripsi)}
    <div class="r-sub">2. Sikap Sosial</div>${sikap(card.social_pred || s.sikap_sosial_predikat, card.social_desc || s.sikap_sosial_deskripsi)}
    <div class="r-sec">${mendalam ? 'B. PENILAIAN' : 'B. PENILAIAN PENGETAHUAN dan KETERAMPILAN'}</div>
    ${mendalam ? table('', sb => st.grades[sb.id]) + sums
      : table('PENGETAHUAN', sb => st.grades[sb.id]) + '</tbody></table>' + table('KETERAMPILAN', sb => (skillsOn ? st.skills[sb.id] : st.grades[sb.id])) + sums}
    ${mendalam ? `<div class="r-sec">${bagian('KOKURIKULER')}</div><table class="r-tbl"><colgroup><col style="width:28%"><col style="width:14%"><col style="width:58%"></colgroup><tr><th>Kegiatan Kokurikuler</th><th>Nilai</th><th>Deskripsi</th></tr><tr><td style="height:7mm">${esc(s.kokurikuler_kegiatan)}</td><td>${esc(card.cocurricular_grade || '')}</td><td class="l">${esc(kk)}</td></tr></table>` : ''}
    <div class="r-sec">${bagian('EKSTRAKURIKULER')}</div>
    <table class="r-tbl"><colgroup><col style="width:34%"><col style="width:18%"><col style="width:48%"></colgroup><tr><th>Ekstrakurikuler</th><th>Nilai</th><th>Deskripsi</th></tr>
      ${(eks.length ? eks : [{ name: '', grade: '', desc: '' }]).map(e => `<tr><td style="height:7mm">${esc(e.name)}</td><td>${esc(e.grade)}</td><td class="l">${esc(e.desc)}</td></tr>`).join('')}</table>
    <div class="r-sec">${bagian('KEHADIRAN')}</div>
    <table class="r-two"><tr><td style="width:42%"><table class="r-tbl" style="margin:0">
      ${s.tampilkan_hadir === '1' && has(a.present) ? `<tr><td class="l" style="width:50%">Hadir</td><td>${esc(a.present)}</td><td class="l">hari</td></tr>` : ''}
      <tr><td class="l" style="width:50%">Sakit</td><td>${esc(a.sick ?? '')}</td><td class="l">hari</td></tr><tr><td class="l">Izin</td><td>${esc(a.permit ?? '')}</td><td class="l">hari</td></tr><tr><td class="l">Tanpa Keterangan</td><td>${esc(a.absent ?? '')}</td><td class="l">hari</td></tr></table></td>
      <td style="width:3%"></td><td style="width:55%">${s.tampilkan_keputusan === '1' ? `<div class="r-box"><b>KEPUTUSAN</b>\n${esc(card.decision || s.keputusan_default)}</div>` : ''}</td></tr></table>
    ${card.homeroom_note ? `<div class="r-sec">CATATAN WALI KELAS</div><div class="r-box">${esc(card.homeroom_note)}</div>` : ''}
    ${signBlock(d, st)}
    ${footer(d, st)}`;
}

// ---------- Laporan Tengah Semester ----------
function mid(d, st) {
  const s = d.settings;
  let total = 0;
  const rows = d.subjects.map((sb, i) => {
    const v = st.grades[sb.id];
    if (v !== null && v !== undefined) total += v;
    const ket = v === null || v === undefined || s.tampilkan_keterangan !== '1' ? '' : (v >= sb.kktp_effective ? 'Tuntas' : 'Belum Tuntas');
    return `<tr><td>${i + 1}</td><td class="l">${esc(sb.name)}</td><td>${fmtNum(sb.kktp_effective)}</td><td><b>${v === null || v === undefined ? '-' : v1(v)}</b></td><td>${ket}</td></tr>`;
  }).join('');
  const showRank = d.ranking_enabled && s.tampilkan_peringkat_raport === '1';
  const w = waliOf(d);
  return `${kopHtml(s)}
    <div class="mid-title">${esc(s.judul_laporan || 'LAPORAN HASIL UJIAN TENGAH SEMESTER')} ${esc(String(d.semester.name).toUpperCase())}</div>
    <div class="mid-sub">${esc(s.subjudul || '')}</div><div class="mid-sub">TAHUN AJARAN ${esc(d.semester.year_name)}</div>
    <table class="mid-ident"><tr><td>NAMA</td><td>: ${esc(st.name)}</td></tr><tr><td>KELAS</td><td>: ${esc(d.class.name)}</td></tr></table>
    <table class="mid-tbl"><thead><tr><th style="width:7%">NO</th><th>MATA PELAJARAN</th><th style="width:12%">KKTP</th><th style="width:14%">NILAI</th><th style="width:20%">KETERANGAN</th></tr></thead><tbody>${rows}
      <tr class="sum"><td colspan="3">JUMLAH</td><td>${fmtNum(total)}</td><td></td></tr>
      ${showRank ? `<tr class="sum"><td colspan="3">PERINGKAT</td><td>${st.rank || '-'}</td><td></td></tr>` : ''}</tbody></table>
    <table class="sign"><tr><td></td><td style="font-weight:bold">${esc(placeDate(d))}<br>WALI KELAS<div class="sign-space"></div>${esc(w.name)}${w.nip ? '<br><span style="font-weight:normal">NIP. ' + esc(w.nip) + '</span>' : ''}</td></tr></table>`;
}

// ---------- Kartu hasil belajar ----------
function kartu(d, st) {
  const s = d.settings;
  const rows = d.subjects.map((sb, i) => {
    const v = st.grades[sb.id];
    const g = predicateOf(v, scalesFor(d.scales, sb.id));
    return `<tr><td>${i + 1}</td><td class="l">${esc(sb.name)}</td><td>${fmtNum(sb.kktp_effective)}</td><td><b>${v1(v)}</b></td><td>${g && v !== null ? esc(g.predicate) : ''}</td><td>${v === null || v === undefined ? '' : v >= sb.kktp_effective ? 'Tuntas' : 'Belum'}</td></tr>`;
  }).join('');
  const showRank = d.ranking_enabled && s.tampilkan_peringkat_raport === '1';
  return `<div class="kartu">${kopHtml(s, { small: true })}
    <div class="r-title">KARTU HASIL BELAJAR</div>
    <table class="r-ident"><tr><td class="l">Nama</td><td class="v">: <b>${esc(st.name)}</b></td><td class="l2">Kelas</td><td>: ${esc(d.class.name)}</td></tr>
      <tr><td class="l">NIS / NISN</td><td class="v">: ${esc(st.nis || '-')} / ${esc(st.nisn || '-')}</td><td class="l2">Semester</td><td>: ${esc(d.semester.name)} ${esc(d.semester.year_name)}</td></tr></table>
    <table class="r-tbl"><thead><tr><th style="width:6%">No</th><th>Mata Pelajaran</th><th style="width:9%">KKTP</th><th style="width:10%">Nilai</th><th style="width:10%">Predikat</th><th style="width:12%">Ketuntasan</th></tr></thead><tbody>${rows}
      <tr class="sum"><td colspan="3">Jumlah / Rata-rata</td><td>${fmtNum(st.total)}</td><td colspan="2">${st.count ? fmtNum(st.average, 2) : '-'}</td></tr>
      ${showRank ? `<tr class="sum"><td colspan="3">Peringkat Kelas / Tingkat</td><td>${st.rank || '-'}</td><td colspan="2">${st.grade_rank || '-'} dari ${d.grade_size}</td></tr>` : ''}</tbody></table>
    ${signBlock(d, st, { withParent: false })}</div>`;
}

export function renderStudent(d, st, format) {
  const fmt = format || d.format || 'kementerian';
  let html;
  if (fmt === 'mid') html = mid(d, st);
  else if (fmt === 'kartu') html = kartu(d, st);
  else if (fmt === 'semester') html = semesterFmt(d, st, false);
  else if (fmt === 'mendalam') html = semesterFmt(d, st, true);
  else html = kementerian(d, st);
  return `<div class="sheet-page" data-tema="${esc(d.settings.tema_raport || 'default')}">${html}</div>`;
}

export function warnings(d, st, format) {
  const out = [];
  const empty = d.subjects.filter(sb => st.grades[sb.id] === null || st.grades[sb.id] === undefined).map(s => s.code);
  if (empty.length) out.push('Nilai belum ada: ' + empty.join(', '));
  const prov = d.subjects.filter(sb => (st.details[sb.id] || {}).provisional).map(s => s.code);
  if (prov.length) out.push('Nilai sementara (komponen belum lengkap): ' + prov.join(', '));
  const unlocked = d.subjects.filter(sb => st.grades[sb.id] !== null && st.details[sb.id] && !st.details[sb.id].locked).map(s => s.code);
  if (unlocked.length) out.push('Belum dikunci admin: ' + unlocked.join(', '));
  if (format !== 'mid' && format !== 'kartu') {
    const a = st.attendance || {};
    if (!['sick', 'permit', 'absent'].some(k => has(a[k]))) out.push('Kehadiran belum diisi');
    if (['kementerian', 'mendalam'].includes(format) && !(st.card && (st.card.cocurricular_desc || st.card.cocurricular_strong))) out.push('Kokurikuler belum diisi');
  }
  return out;
}

export async function printCss() {
  try { return await fetch('css/print.css').then(r => r.text()); } catch (e) { return ''; }
}
