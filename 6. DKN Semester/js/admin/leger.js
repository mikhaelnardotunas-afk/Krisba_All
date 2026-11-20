// Leger nilai: per mapel, satu kelas seluruh mapel, per semester, per jenis penilaian, per angkatan.
// Pilihan kolom, cetak (ukuran & orientasi kertas), PDF, dan Excel berwarna.
import { get, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, fmtNum, $, $$, toast, errorToast, loadingBlock, emptyBlock, busy } from '../ui.js';
import { refs, opt, remember } from '../common.js';
import { printHtml, makePdf, kopHtml, signatureHtml, PAPERS } from '../shared/print.js';
import { exportWorkbook } from '../shared/xlsx.js';

const MODES = [
  { id: 'kelas', label: 'Seluruh mapel satu kelas' },
  { id: 'semester', label: 'Per semester (nilai rapor)' },
  { id: 'jenis', label: 'Per jenis penilaian' },
  { id: 'mapel', label: 'Per mata pelajaran (rincian kategori)' },
  { id: 'angkatan', label: 'Seluruh siswa satu angkatan' }
];

export async function legerPage(el, params) {
  const [{ types }, classes, subjects] = await Promise.all([refs.types(), refs.classes(), refs.subjects()]);
  const sem = App.semesters.find(s => s.id === App.semester.id) || {};
  const st = Object.assign({ mode: 'kelas', type_id: sem.report_assessment_type_id || (types[0] && types[0].id), class_id: classes[0] && classes[0].id, grade: classes[0] && classes[0].grade_level, subject_id: subjects[0] && subjects[0].id, paper: 'F4', orient: 'landscape', cols: { nis: true, gender: true, total: true, avg: true, rank: true, tuntas: true, stats: true }, hidden: [] }, remember('leger') || {}, params);
  if (!types.some(t => t.id === st.type_id)) st.type_id = sem.report_assessment_type_id || (types[0] && types[0].id);
  if (!classes.some(c => c.id === st.class_id)) st.class_id = classes[0] && classes[0].id;
  const grades = [...new Set(classes.map(c => c.grade_level))];
  el.innerHTML = pageHead('Leger Nilai', esc(App.semLabel())) + `
    <div class="card mb-2"><div class="card-body">
      <div class="filters">
        <div class="field"><label>Jenis leger</label><select id="l-mode">${MODES.map(m => `<option value="${m.id}"${m.id === st.mode ? ' selected' : ''}>${m.label}</option>`).join('')}</select></div>
        <div class="field" data-for="kelas jenis mapel angkatan"><label>Jenis penilaian</label><select id="l-type">${opt(types, 'id', 'name', st.type_id)}</select></div>
        <div class="field" data-for="kelas semester jenis mapel"><label>Kelas</label><select id="l-class">${opt(classes, 'id', 'name', st.class_id)}</select></div>
        <div class="field" data-for="angkatan"><label>Angkatan / tingkat</label><select id="l-grade">${grades.map(g => `<option value="${g}"${String(g) === String(st.grade) ? ' selected' : ''}>Kelas ${g}</option>`).join('')}</select></div>
        <div class="field" data-for="mapel"><label>Mata pelajaran</label><select id="l-subj">${opt(subjects.filter(s => s.active), 'id', 'name', st.subject_id)}</select></div>
        <div class="field" style="min-width:auto"><label>&nbsp;</label><button class="btn btn-primary" id="l-go">${icon('table')}Tampilkan</button></div>
      </div>
      <details class="mt-2"><summary style="cursor:pointer;font-weight:600;font-size:13px">${icon('filter', 'icon-sm')} Pilih kolom & pengaturan cetak</summary>
        <div class="grid grid-2 mt-2">
          <div><div class="label mb-1">Kolom ditampilkan</div><div class="chips" id="l-cols">
            ${[['nis', 'NIS/NISN'], ['gender', 'L/P'], ['total', 'Jumlah'], ['avg', 'Rata-rata'], ['rank', 'Peringkat'], ['tuntas', 'Ketuntasan'], ['stats', 'Baris statistik']].map(([k, l]) => `<label class="check" style="min-width:110px"><input type="checkbox" data-col="${k}"${st.cols[k] ? ' checked' : ''}> ${l}</label>`).join('')}</div>
            <div class="label mt-2 mb-1">Mata pelajaran</div><div class="chips" id="l-subjs">${subjects.filter(s => s.active).map(s => `<label class="check" style="min-width:90px"><input type="checkbox" data-subj="${s.id}"${st.hidden.includes(s.id) ? '' : ' checked'}> ${esc(s.code)}</label>`).join('')}</div></div>
          <div class="form-grid"><div class="field"><label>Ukuran kertas</label><select id="l-paper">${Object.entries(PAPERS).map(([k, p]) => `<option value="${k}"${k === st.paper ? ' selected' : ''}>${p.label}</option>`).join('')}</select></div>
            <div class="field"><label>Orientasi</label><select id="l-orient"><option value="landscape"${st.orient === 'landscape' ? ' selected' : ''}>Lanskap</option><option value="portrait"${st.orient === 'portrait' ? ' selected' : ''}>Potret</option></select></div></div>
        </div></details>
    </div></div>
    <div class="card"><div class="card-head"><h3 id="l-title">${icon('table')} Leger</h3><div class="btn-group"><button class="btn btn-sm" id="l-print">${icon('printer', 'icon-sm')}Cetak</button><button class="btn btn-sm" id="l-pdf">${icon('download', 'icon-sm')}PDF</button><button class="btn btn-sm btn-success" id="l-xls">${icon('download', 'icon-sm')}Excel</button></div></div>
      <div class="card-body" id="l-out">${emptyBlock('Pilih pengaturan lalu klik Tampilkan', '', 'table')}</div></div>`;
  let current = null;
  const sync = () => {
    st.mode = $('#l-mode', el).value;
    $$('[data-for]', el).forEach(f => { f.style.display = f.dataset.for.split(' ').includes(st.mode) ? '' : 'none'; });
  };
  $('#l-mode', el).onchange = sync;
  sync();
  const readState = () => {
    Object.assign(st, { type_id: $('#l-type', el).value, class_id: $('#l-class', el).value, grade: $('#l-grade', el).value, subject_id: $('#l-subj', el).value, paper: $('#l-paper', el).value, orient: $('#l-orient', el).value });
    $$('[data-col]', el).forEach(c => { st.cols[c.dataset.col] = c.checked; });
    st.hidden = $$('[data-subj]', el).filter(c => !c.checked).map(c => c.dataset.subj);
    remember('leger', { ...st });
  };
  const load = async () => {
    readState();
    const out = $('#l-out', el);
    out.innerHTML = loadingBlock('Menghitung leger...');
    try {
      if (st.mode === 'mapel') {
        const g = await get('/grid' + qs({ type_id: st.type_id, subject_id: st.subject_id, class_id: st.class_id }));
        current = { kind: 'mapel', g };
      } else {
        const typeId = st.mode === 'semester' ? sem.report_assessment_type_id : st.type_id;
        if (!typeId) { out.innerHTML = `<div class="alert warn">${icon('alert')}<div>Nilai rapor semester ini belum diatur. Atur di <a href="#tahun">Tahun Pelajaran › Atur</a>.</div></div>`; return; }
        const subjIds = subjects.filter(s => s.active && !st.hidden.includes(s.id)).map(s => s.id).join(',');
        const d = await get('/leger' + qs(st.mode === 'angkatan' ? { type_id: typeId, grade_level: st.grade, subject_ids: subjIds } : { type_id: typeId, class_id: st.class_id, subject_ids: subjIds }));
        current = { kind: 'leger', d };
      }
      out.innerHTML = `<div class="table-wrap" style="max-height:70vh">${tableHtml(current, st, false)}</div>`;
      $('#l-title', el).innerHTML = icon('table') + ' ' + esc(titleOf(current, st).join(' · '));
    } catch (e) { out.innerHTML = `<div class="alert error">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  };
  $('#l-go', el).onclick = load;
  const need = () => { if (!current) { toast('Tampilkan leger terlebih dahulu', 'warning'); return false; } readState(); return true; };
  const printDoc = () => `<div class="sheet-page">${kopHtml(App.settings, { small: true })}<div class="rep-title">${esc(titleOf(current, st)[0])}</div><div class="rep-sub">${esc(titleOf(current, st).slice(1).join(' · '))}</div>${tableHtml(current, st, true)}${signatureHtml(App.settings, { place: sem.report_place || '', date: sem.report_date || '', wali: current.kind === 'leger' && current.d.classes.length === 1 ? { name: current.d.classes[0].homeroom_name } : null })}</div>`;
  $('#l-print', el).onclick = async () => { if (!need()) return; const cls = await refs.classes(); if (current.kind === 'leger') current.d.classes = current.d.classes.map(c => ({ ...c, homeroom_name: (cls.find(x => x.id === c.id) || {}).homeroom_name })); printHtml(printDoc(), { title: titleOf(current, st)[0], paper: st.paper, orientation: st.orient, margin: 10 }); };
  $('#l-pdf', el).onclick = e => busy(e.currentTarget, async () => { if (!need()) return; try { await makePdf([printDoc()], `Leger_${titleOf(current, st).join('_').replace(/[^\w]+/g, '_')}.pdf`, { paper: st.paper, orientation: st.orient, margin: 8 }); } catch (er) { errorToast(er); } });
  $('#l-xls', el).onclick = () => { if (need()) exportLeger(current, st); };
  if (params.auto || st.type_id) load();
}

function titleOf(cur, st) {
  if (cur.kind === 'mapel') return [`LEGER ${cur.g.subject.name.toUpperCase()}`, cur.g.type.name, `Kelas ${cur.g.class.name}`, `${cur.g.semester.year_name} ${cur.g.semester.name}`];
  const d = cur.d;
  const scope = st.mode === 'angkatan' ? `Angkatan Kelas ${st.grade}` : `Kelas ${d.classes.map(c => c.name).join(', ')}`;
  return [`LEGER NILAI ${st.mode === 'semester' ? 'SEMESTER' : d.type.name.toUpperCase()}`, scope, `${d.semester.year_name} Semester ${d.semester.name}`];
}

function tableHtml(cur, st, print) {
  const cls = print ? 'rep-tbl' : 'tbl tbl-compact';
  if (cur.kind === 'mapel') {
    const g = cur.g;
    return `<table class="${cls}"><thead><tr><th>No</th>${st.cols.nis ? '<th>NISN</th>' : ''}<th>Nama Siswa</th>${g.categories.map(c => `<th>${esc(c.code || c.name)}<br><small>${fmtNum(c.weight)}%</small></th>`).join('')}<th>Nilai Akhir</th>${st.cols.tuntas ? '<th>Ketuntasan</th>' : ''}</tr></thead><tbody>
      ${g.students.map((s, i) => `<tr><td>${s.roll_no || i + 1}</td>${st.cols.nis ? `<td>${esc(s.nisn || '')}</td>` : ''}<td class="l" style="text-align:left">${esc(s.name)}</td>${g.categories.map(c => `<td class="c ${s.values[c.id] !== null && s.values[c.id] < g.kktp ? 'low' : ''}">${fmtNum(s.values[c.id])}</td>`).join('')}<td class="c"><b>${fmtNum(s.final, g.type.decimals)}</b></td>${st.cols.tuntas ? `<td class="c">${s.final === null ? '' : s.final >= g.kktp ? 'Tuntas' : 'Belum'}</td>` : ''}</tr>`).join('')}
      </tbody></table>`;
  }
  const d = cur.d;
  const subs = d.subjects;
  const multi = d.classes.length > 1;
  const showRank = st.cols.rank && d.ranking_enabled;
  const head = `<tr><th>No</th>${st.cols.nis ? '<th>NIS</th><th>NISN</th>' : ''}<th>Nama Siswa</th>${st.cols.gender ? '<th>L/P</th>' : ''}${multi ? '<th>Kelas</th>' : ''}${subs.map(s => `<th title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}${st.cols.total ? '<th>Jumlah</th>' : ''}${st.cols.avg ? '<th>Rata-rata</th>' : ''}${showRank ? `<th>Peringkat${multi ? ' Angkatan' : ''}</th>${multi ? '<th>Peringkat Kelas</th>' : ''}` : ''}${st.cols.tuntas ? '<th>Tuntas</th><th>Status</th>' : ''}</tr>`;
  const body = d.students.map((s, i) => `<tr class="${showRank && s.rank === 1 ? 'rank1' : ''}"><td class="c">${multi ? i + 1 : (s.roll_no || i + 1)}</td>${st.cols.nis ? `<td>${esc(s.nis || '')}</td><td>${esc(s.nisn || '')}</td>` : ''}<td class="l" style="text-align:left;white-space:nowrap">${esc(s.name)}</td>${st.cols.gender ? `<td class="c">${esc(s.gender || '')}</td>` : ''}${multi ? `<td class="c">${esc(s.class_name)}</td>` : ''}
    ${subs.map(sb => { const v = s.scores[sb.id]; return `<td class="c ${v !== null && v !== undefined && v < sb.kktp_effective ? 'low' : ''}" ${!print && v !== null && v !== undefined && v < sb.kktp_effective ? 'style="color:var(--danger);font-weight:600"' : ''}>${fmtNum(v)}</td>`; }).join('')}
    ${st.cols.total ? `<td class="c"><b>${fmtNum(s.total)}</b></td>` : ''}${st.cols.avg ? `<td class="c">${s.count ? fmtNum(s.average, 2) : ''}</td>` : ''}${showRank ? `<td class="c"><b>${s.rank ?? ''}</b></td>${multi ? `<td class="c">${s.class_rank ?? ''}</td>` : ''}` : ''}${st.cols.tuntas ? `<td class="c">${s.tuntas}/${subs.length}</td><td class="c">${s.status === 'Tuntas' ? 'Tuntas' : '<span style="color:#b91c1c">Belum</span>'}</td>` : ''}</tr>`).join('');
  const span = 2 + (st.cols.nis ? 2 : 0) + (st.cols.gender ? 1 : 0) + (multi ? 1 : 0);
  const stats = st.cols.stats ? [['Rata-rata', 'average'], ['Tertinggi', 'max'], ['Terendah', 'min'], ['Tuntas', 'tuntas']].map(([l, k]) => `<tr class="foot"><td colspan="${span}" style="text-align:right"><b>${l}</b></td>${d.stats.map(x => `<td class="c">${k === 'average' ? fmtNum(x[k], 2) : fmtNum(x[k])}</td>`).join('')}<td colspan="${(st.cols.total ? 1 : 0) + (st.cols.avg ? 1 : 0) + (showRank ? (multi ? 2 : 1) : 0) + (st.cols.tuntas ? 2 : 0)}"></td></tr>`).join('') : '';
  const legend = print ? `<div class="rep-meta" style="margin-top:6px">${subs.map(s => `${esc(s.code)} = ${esc(s.name)} (KKTP ${fmtNum(s.kktp_effective)})`).join(' · ')}</div>` : '';
  return `<table class="${cls}"><thead>${head}</thead><tbody>${body || `<tr><td colspan="99" class="center muted">Tidak ada siswa</td></tr>`}${stats}</tbody></table>${legend}`;
}

async function exportLeger(cur, st) {
  const [title, ...sub] = titleOf(cur, st);
  if (cur.kind === 'mapel') {
    const g = cur.g;
    return exportWorkbook(`Leger_${g.subject.code}_${g.class.name}.xlsx`.replace(/\s+/g, '_'), [{
      name: 'Leger', title, subtitle: sub.join(' · '),
      headers: ['No', 'NISN', 'Nama', ...g.categories.map(c => `${c.code || c.name} (${c.weight}%)`), 'Nilai Akhir', 'Ketuntasan'],
      rows: g.students.map((s, i) => [s.roll_no || i + 1, s.nisn || '', s.name, ...g.categories.map(c => s.values[c.id] ?? ''), s.final ?? '', s.final === null ? '' : s.final >= g.kktp ? 'Tuntas' : 'Belum']),
      textCols: [1], widths: [5, 13, 32, ...g.categories.map(() => 11), 11, 11],
      highlight: (r, c, v) => (c >= 3 && typeof v === 'number' && v < g.kktp ? 'FDE2E2' : null)
    }]);
  }
  const d = cur.d;
  const multi = d.classes.length > 1;
  const headers = ['No', 'NIS', 'NISN', 'Nama', 'L/P', ...(multi ? ['Kelas'] : []), ...d.subjects.map(s => s.code), 'Jumlah', 'Rata-rata', 'Peringkat', ...(multi ? ['Peringkat Kelas'] : []), 'Tuntas', 'Status'];
  const off = multi ? 6 : 5;
  const rows = d.students.map((s, i) => [i + 1, s.nis || '', s.nisn || '', s.name, s.gender || '', ...(multi ? [s.class_name] : []), ...d.subjects.map(sb => s.scores[sb.id] ?? ''), s.total, s.count ? s.average : '', s.rank ?? '', ...(multi ? [s.class_rank ?? ''] : []), `${s.tuntas}/${d.subjects.length}`, s.status]);
  const statRows = [['Rata-rata', 'average'], ['Tertinggi', 'max'], ['Terendah', 'min']].map(([l, k]) => ['', '', '', l, '', ...(multi ? [''] : []), ...d.stats.map(x => x[k] ?? '')]);
  await exportWorkbook(`Leger_${sub.join('_').replace(/[^\w]+/g, '_')}.xlsx`, [
    {
      name: 'Leger', title, subtitle: sub.join(' · '), headers, rows: [...rows, ...statRows], textCols: [1, 2],
      widths: [5, 10, 13, 30, 5, ...(multi ? [8] : []), ...d.subjects.map(() => 7), 9, 9, 9, ...(multi ? [9] : []), 8, 12],
      boldRows: statRows.map((_, i) => rows.length + i),
      highlight: (r, c, v) => (r < rows.length && c >= off && c < off + d.subjects.length && typeof v === 'number' && v < d.subjects[c - off].kktp_effective ? 'FDE2E2' : r < rows.length && rows[r][headers.indexOf('Peringkat')] === 1 ? 'FFF3C4' : null)
    },
    { name: 'Keterangan', headers: ['Kode', 'Mata Pelajaran', 'KKTP'], rows: d.subjects.map(s => [s.code, s.name, s.kktp_effective]), widths: [10, 40, 8] }
  ]);
}
