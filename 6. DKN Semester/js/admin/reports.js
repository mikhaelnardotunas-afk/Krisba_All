// Laporan: analisis nilai, peringkat (kelas/tingkat/sekolah, juara, nilai tertinggi), lembar kontrol kelengkapan, rekap angkatan.
import { get, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, fmtNum, $, $$, loadScript, loadingBlock, toast, errorToast } from '../ui.js';
import { refs, opt, remember } from '../common.js';
import { printHtml, kopHtml, signatureHtml } from '../shared/print.js';
import { exportWorkbook } from '../shared/xlsx.js';
import { scalesFor, predicateOf } from '../shared/describe.js';

const TABS = [['analisis', 'Analisis Nilai', 'chart'], ['peringkat', 'Peringkat', 'trophy'], ['kontrol', 'Lembar Kontrol Kelengkapan', 'clipboard'], ['angkatan', 'Rekap per Angkatan', 'layers']];

export async function reportsPage(el, params) {
  const tab = params.tab || remember('rep-tab') || 'analisis';
  remember('rep-tab', tab);
  el.innerHTML = pageHead('Laporan', esc(App.semLabel())) + `<div class="tabs">${TABS.map(([k, l, ic]) => `<a class="tab ${k === tab ? 'active' : ''}" href="#laporan?tab=${k}">${icon(ic, 'icon-sm')}${l}</a>`).join('')}</div><div id="rep"></div>`;
  const box = $('#rep', el);
  const [{ types }, classes, scales] = await Promise.all([refs.types(), refs.classes(), refs.scales()]);
  const sem = App.semesters.find(s => s.id === App.semester.id) || {};
  const defType = sem.report_assessment_type_id || (types[0] && types[0].id);
  if (!types.length) { box.innerHTML = '<div class="card card-body">Belum ada jenis penilaian.</div>'; return; }
  if (tab === 'analisis') return analisis(box, types, classes, defType, scales);
  if (tab === 'peringkat') return peringkat(box, types, classes, defType);
  if (tab === 'kontrol') return kontrol(box, classes);
  if (tab === 'angkatan') return angkatan(box, types, classes, defType);
}

function controls(id, types, classes, defType, extra = '') {
  return `<div class="card mb-2"><div class="card-body"><div class="filters">
    <div class="field"><label>Jenis penilaian</label><select id="${id}-t">${opt(types, 'id', 'name', defType)}</select></div>
    ${classes ? `<div class="field"><label>Kelas</label><select id="${id}-c">${opt(classes, 'id', 'name')}</select></div>` : ''}${extra}
    <div class="field" style="min-width:auto"><label>&nbsp;</label><button class="btn btn-primary" id="${id}-go">${icon('refresh')}Tampilkan</button></div></div></div></div><div id="${id}-out"></div>`;
}

// ---------- Analisis ----------
async function analisis(box, types, classes, defType, scales) {
  box.innerHTML = controls('an', types, classes, defType);
  const run = async () => {
    const out = $('#an-out', box);
    out.innerHTML = loadingBlock('Menganalisis...');
    try {
      const d = await get('/leger' + qs({ type_id: $('#an-t', box).value, class_id: $('#an-c', box).value }));
      if (!window.Chart) await loadScript('vendor/chart.umd.min.js');
      const subs = d.subjects;
      const preds = {};
      const remedial = [];
      d.students.forEach(s => subs.forEach(sb => {
        const v = s.scores[sb.id];
        if (v === null || v === undefined) return;
        const g = predicateOf(v, scalesFor(scales, sb.id));
        if (g) preds[g.predicate] = (preds[g.predicate] || 0) + 1;
        if (v < sb.kktp_effective) remedial.push({ name: s.name, subject: sb.name, v, kktp: sb.kktp_effective });
      }));
      const avgAll = d.students.filter(s => s.count).map(s => s.average);
      const classAvg = avgAll.length ? avgAll.reduce((a, b) => a + b, 0) / avgAll.length : 0;
      const top = d.students.filter(s => s.rank === 1).map(s => s.name).join(', ');
      out.innerHTML = `<div class="stats">
          <div class="stat"><div class="stat-icon">${icon('chart', 'icon-lg')}</div><div><div class="stat-value">${fmtNum(classAvg, 2)}</div><div class="stat-label">Rata-rata kelas</div></div></div>
          <div class="stat"><div class="stat-icon gold">${icon('trophy', 'icon-lg')}</div><div><div class="stat-value" style="font-size:15px">${esc(top || '-')}</div><div class="stat-label">Peringkat 1</div></div></div>
          <div class="stat"><div class="stat-icon red">${icon('alert', 'icon-lg')}</div><div><div class="stat-value">${remedial.length}</div><div class="stat-label">Nilai di bawah KKTP</div></div></div>
          <div class="stat"><div class="stat-icon green">${icon('checkCircle', 'icon-lg')}</div><div><div class="stat-value">${d.students.filter(s => s.status === 'Tuntas').length}/${d.students.length}</div><div class="stat-label">Siswa tuntas semua mapel</div></div></div></div>
        <div class="grid grid-2"><div class="card"><div class="card-head"><h3>Rata-rata per mata pelajaran</h3></div><div class="card-body"><canvas id="c1" height="240"></canvas></div></div>
          <div class="card"><div class="card-head"><h3>Sebaran predikat</h3></div><div class="card-body"><canvas id="c2" height="240"></canvas></div></div></div>
        <div class="card mt-3"><div class="card-head"><h3>${icon('alert')} Daftar siswa perlu remedial</h3><div class="btn-group"><button class="btn btn-sm" id="an-print">${icon('printer', 'icon-sm')}Cetak analisis</button><button class="btn btn-sm" id="an-xls">${icon('download', 'icon-sm')}Excel</button></div></div>
          <div class="card-body"><div class="table-wrap" style="max-height:400px"><table class="tbl tbl-compact"><thead><tr><th>Nama</th><th>Mapel</th><th class="num">Nilai</th><th class="num">KKTP</th><th class="num">Selisih</th></tr></thead><tbody>
          ${remedial.sort((a, b) => a.name.localeCompare(b.name)).map(r => `<tr><td>${esc(r.name)}</td><td>${esc(r.subject)}</td><td class="num" style="color:var(--danger)"><b>${fmtNum(r.v)}</b></td><td class="num">${fmtNum(r.kktp)}</td><td class="num">${fmtNum(r.v - r.kktp, 2)}</td></tr>`).join('') || '<tr><td colspan="5" class="center muted">Tidak ada nilai di bawah KKTP</td></tr>'}</tbody></table></div></div></div>`;
      const dark = document.documentElement.getAttribute('data-theme') === 'dark';
      const tc = dark ? '#cbd5e1' : '#334155';
      new window.Chart($('#c1', out), { type: 'bar', data: { labels: subs.map(s => s.code), datasets: [{ label: 'Rata-rata', data: d.stats.map(x => x.average), backgroundColor: '#16365f', borderRadius: 6 }, { label: 'KKTP', data: subs.map(s => s.kktp_effective), type: 'line', borderColor: '#c9a227', backgroundColor: '#c9a227', pointRadius: 2 }] }, options: { plugins: { legend: { labels: { color: tc } } }, scales: { y: { min: 0, max: 100, ticks: { color: tc } }, x: { ticks: { color: tc } } } } });
      const pk = Object.keys(preds).sort();
      new window.Chart($('#c2', out), { type: 'doughnut', data: { labels: pk.map(k => 'Predikat ' + k), datasets: [{ data: pk.map(k => preds[k]), backgroundColor: ['#15803d', '#2a5a96', '#c9a227', '#b91c1c', '#6d28d9'] }] }, options: { plugins: { legend: { position: 'bottom', labels: { color: tc } } } } });
      $('#an-xls', out).onclick = () => exportWorkbook('Analisis_Remedial.xlsx', [{ name: 'Remedial', title: 'DAFTAR REMEDIAL ' + d.classes[0].name, subtitle: d.type.name, headers: ['Nama', 'Mapel', 'Nilai', 'KKTP'], rows: remedial.map(r => [r.name, r.subject, r.v, r.kktp]), widths: [32, 30, 8, 8] }]);
      $('#an-print', out).onclick = () => printHtml(`<div class="sheet-page">${kopHtml(App.settings, { small: true })}<div class="rep-title">ANALISIS NILAI KELAS ${esc(d.classes[0].name)}</div><div class="rep-sub">${esc(d.type.name)} · ${esc(App.semLabel())}</div>
        <table class="rep-tbl"><thead><tr><th>Mapel</th><th>Rata-rata</th><th>Tertinggi</th><th>Terendah</th><th>Tuntas</th><th>KKTP</th></tr></thead><tbody>${subs.map((s, i) => `<tr><td class="l">${esc(s.name)}</td><td>${fmtNum(d.stats[i].average, 2)}</td><td>${fmtNum(d.stats[i].max)}</td><td>${fmtNum(d.stats[i].min)}</td><td>${d.stats[i].tuntas}/${d.stats[i].filled}</td><td>${fmtNum(s.kktp_effective)}</td></tr>`).join('')}</tbody></table>
        <div class="rep-title" style="margin-top:14px;font-size:11pt">Siswa Perlu Remedial</div><table class="rep-tbl"><thead><tr><th>No</th><th>Nama</th><th>Mapel</th><th>Nilai</th><th>KKTP</th></tr></thead><tbody>${remedial.map((r, i) => `<tr><td>${i + 1}</td><td class="l">${esc(r.name)}</td><td class="l">${esc(r.subject)}</td><td>${fmtNum(r.v)}</td><td>${fmtNum(r.kktp)}</td></tr>`).join('')}</tbody></table></div>`, { paper: 'A4', title: 'Analisis nilai' });
    } catch (e) { out.innerHTML = `<div class="alert error">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  };
  $('#an-go', box).onclick = run;
  run();
}

// ---------- Peringkat ----------
async function peringkat(box, types, classes, defType) {
  const grades = [...new Set(classes.map(c => c.grade_level))];
  box.innerHTML = controls('pr', types, null, defType, `
    <div class="field"><label>Cakupan</label><select id="pr-s"><option value="kelas">Per kelas</option>${grades.map(g => `<option value="g${g}">Tingkat kelas ${g} (gabungan rombel)</option>`).join('')}<option value="all">Seluruh sekolah</option></select></div>
    <div class="field" id="pr-cw"><label>Kelas</label><select id="pr-c">${opt(classes, 'id', 'name')}</select></div>
    <div class="field"><label>Tampilkan</label><select id="pr-n"><option value="0">Semua</option><option value="3">3 besar</option><option value="5">5 besar</option><option value="10" selected>10 besar</option><option value="20">20 besar</option></select></div>`);
  $('#pr-s', box).onchange = e => { $('#pr-cw', box).style.display = e.target.value === 'kelas' ? '' : 'none'; };
  let data = null;
  const run = async () => {
    const out = $('#pr-out', box);
    out.innerHTML = loadingBlock('Menghitung peringkat...');
    try {
      const scope = $('#pr-s', box).value;
      const q = { type_id: $('#pr-t', box).value };
      if (scope === 'kelas') q.class_id = $('#pr-c', box).value; else if (scope !== 'all') q.grade_level = scope.slice(1);
      data = await get('/leger' + qs(q));
      const n = Number($('#pr-n', box).value);
      const list = data.students.filter(s => s.rank).sort((a, b) => a.rank - b.rank).filter(s => !n || s.rank <= n);
      const medal = r => (r === 1 ? '🥇' : r === 2 ? '🥈' : r === 3 ? '🥉' : r);
      out.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('trophy')} Peringkat ${esc(scope === 'kelas' ? 'Kelas ' + data.classes[0].name : scope === 'all' ? 'Seluruh Sekolah' : 'Tingkat ' + scope.slice(1))}</h3>
        <div class="btn-group"><button class="btn btn-sm" data-p="rank">${icon('printer', 'icon-sm')}Cetak peringkat</button><button class="btn btn-sm" data-p="juara">${icon('award', 'icon-sm')}Juara 1–3 tiap kelas</button><button class="btn btn-sm" data-p="top">${icon('star', 'icon-sm')}Nilai tertinggi per mapel</button><button class="btn btn-sm btn-success" data-p="xls">${icon('download', 'icon-sm')}Excel</button></div></div>
        <div class="card-body"><p class="muted" style="font-size:12.5px">Dasar peringkat: <b>${data.basis === 'rata' ? 'rata-rata' : 'jumlah nilai'}</b>. Nilai sama mendapat peringkat sama.</p>
        <div class="table-wrap"><table class="tbl"><thead><tr><th class="c">Peringkat</th><th>Nama</th><th>Kelas</th><th class="num">Jumlah</th><th class="num">Rata-rata</th><th class="num">Mapel terisi</th>${data.classes.length > 1 ? '<th class="c">Peringkat kelas</th>' : ''}</tr></thead><tbody>
        ${list.map(s => `<tr><td class="c" style="font-size:16px"><b>${medal(s.rank)}</b></td><td><b>${esc(s.name)}</b></td><td>${esc(s.class_name)}</td><td class="num">${fmtNum(s.total)}</td><td class="num">${fmtNum(s.average, 2)}</td><td class="num">${s.count}/${data.subjects.length}</td>${data.classes.length > 1 ? `<td class="c">${s.class_rank ?? ''}</td>` : ''}</tr>`).join('') || '<tr><td colspan="7" class="center muted">Belum ada nilai</td></tr>'}</tbody></table></div></div></div>`;
      $$('[data-p]', out).forEach(b => b.onclick = () => printRank(b.dataset.p, data, list));
    } catch (e) { out.innerHTML = `<div class="alert error">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  };
  $('#pr-go', box).onclick = run;
  run();
}

function printRank(kind, d, list) {
  const s = App.settings;
  const sem = App.semesters.find(x => x.id === App.semester.id) || {};
  const head = t => `${kopHtml(s, { small: true })}<div class="rep-title">${t}</div><div class="rep-sub">${esc(d.type.name)} · ${esc(App.semLabel())}</div>`;
  const sign = signatureHtml(s, { place: sem.report_place || '', date: sem.report_date || '' });
  if (kind === 'xls') {
    return exportWorkbook('Peringkat.xlsx', [{ name: 'Peringkat', title: 'PERINGKAT ' + d.type.name, subtitle: App.semLabel(), headers: ['Peringkat', 'Nama', 'Kelas', 'Jumlah', 'Rata-rata', 'Peringkat Kelas'], rows: d.students.filter(x => x.rank).sort((a, b) => a.rank - b.rank).map(x => [x.rank, x.name, x.class_name, x.total, x.average, x.class_rank ?? '']), widths: [10, 32, 8, 10, 10, 14], highlight: (r, c, v) => null }]);
  }
  let html = '';
  if (kind === 'rank') html = `<div class="sheet-page">${head('DAFTAR PERINGKAT SISWA')}<table class="rep-tbl"><thead><tr><th>Peringkat</th><th>Nama</th><th>Kelas</th><th>Jumlah</th><th>Rata-rata</th></tr></thead><tbody>${list.map(x => `<tr class="${x.rank <= 3 ? 'rank1' : ''}"><td>${x.rank}</td><td class="l">${esc(x.name)}</td><td>${esc(x.class_name)}</td><td>${fmtNum(x.total)}</td><td>${fmtNum(x.average, 2)}</td></tr>`).join('')}</tbody></table>${sign}</div>`;
  if (kind === 'juara') {
    const byC = {};
    d.students.forEach(x => { if (x.class_rank && x.class_rank <= 3) (byC[x.class_name] = byC[x.class_name] || []).push(x); });
    html = `<div class="sheet-page">${head('JUARA 1–3 TIAP KELAS')}<table class="rep-tbl"><thead><tr><th>Kelas</th><th>Juara</th><th>Nama</th><th>Jumlah</th><th>Rata-rata</th></tr></thead><tbody>${Object.entries(byC).map(([c, l]) => l.sort((a, b) => a.class_rank - b.class_rank).map((x, i) => `<tr>${i === 0 ? `<td rowspan="${l.length}"><b>${esc(c)}</b></td>` : ''}<td>${x.class_rank}</td><td class="l">${esc(x.name)}</td><td>${fmtNum(x.total)}</td><td>${fmtNum(x.average, 2)}</td></tr>`).join('')).join('')}</tbody></table>${sign}</div>`;
  }
  if (kind === 'top') {
    html = `<div class="sheet-page">${head('NILAI TERTINGGI PER MATA PELAJARAN')}<table class="rep-tbl"><thead><tr><th>Mata Pelajaran</th><th>Nilai</th><th>Nama Siswa</th><th>Kelas</th></tr></thead><tbody>${d.subjects.map(sb => {
      const max = Math.max(...d.students.map(x => x.scores[sb.id] ?? -1));
      const who = d.students.filter(x => x.scores[sb.id] === max && max >= 0);
      return `<tr><td class="l">${esc(sb.name)}</td><td><b>${max >= 0 ? fmtNum(max) : '-'}</b></td><td class="l">${who.map(x => esc(x.name)).join('<br>')}</td><td>${who.map(x => esc(x.class_name)).join('<br>')}</td></tr>`;
    }).join('')}</tbody></table>${sign}</div>`;
  }
  printHtml(html, { paper: 'A4', title: 'Peringkat' });
}

// ---------- Lembar kontrol kelengkapan ----------
async function kontrol(box, classes) {
  const d = await get('/monitoring' + qs({ semester_id: App.semester.id }));
  const types = d.types;
  const byClass = {};
  d.rows.forEach(r => { (byClass[r.class_name] = byClass[r.class_name] || []).push(r); });
  const cell = r => r ? `<span class="badge ${{ locked: 'green', submitted: 'purple', lengkap: 'blue', sebagian: 'yellow', returned: 'red', belum: 'gray' }[r.status]}" title="${esc(r.status_label)}">${r.status === 'locked' ? '✔' : fmtNum(r.percent, 0) + '%'}</span>` : '<span class="soft">–</span>';
  box.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('clipboard')} Lembar Kontrol Kelengkapan Nilai</h3><button class="btn btn-sm" id="k-print">${icon('printer', 'icon-sm')}Cetak</button></div><div class="card-body">
    <div class="legend mb-2"><span>${cell({ status: 'locked' })} Dikunci</span><span>${cell({ status: 'submitted', percent: 100 })} Terkirim</span><span>${cell({ status: 'sebagian', percent: 50 })} Persentase siswa lengkap</span></div>
    ${Object.entries(byClass).map(([c, rows]) => {
      const subs = [...new Map(rows.map(r => [r.subject_id, r])).values()];
      return `<h4 class="mt-2">Kelas ${esc(c)}</h4><div class="table-wrap mb-2"><table class="tbl tbl-compact"><thead><tr><th>Mata Pelajaran</th><th>Guru</th>${types.map(t => `<th class="c">${esc(t.name)}</th>`).join('')}</tr></thead><tbody>
        ${subs.map(sr => `<tr><td>${esc(sr.subject_name)}</td><td>${esc(sr.teacher_name)}</td>${types.map(t => `<td class="c">${cell(rows.find(r => r.subject_id === sr.subject_id && r.type_id === t.id))}</td>`).join('')}</tr>`).join('')}</tbody></table></div>`;
    }).join('') || '<div class="muted">Belum ada pembagian tugas.</div>'}</div></div>`;
  $('#k-print', box).onclick = () => {
    const s = App.settings;
    printHtml(`<div class="sheet-page">${kopHtml(s, { small: true })}<div class="rep-title">LEMBAR KONTROL KELENGKAPAN NILAI</div><div class="rep-sub">${esc(App.semLabel())}</div>
      ${Object.entries(byClass).map(([c, rows]) => { const subs = [...new Map(rows.map(r => [r.subject_id, r])).values()]; return `<div style="font-weight:bold;margin:8px 0 3px">Kelas ${esc(c)}</div><table class="rep-tbl"><thead><tr><th>Mapel</th><th>Guru</th>${types.map(t => `<th>${esc(t.name)}</th>`).join('')}<th>Paraf</th></tr></thead><tbody>${subs.map(sr => `<tr><td class="l">${esc(sr.subject_name)}</td><td class="l">${esc(sr.teacher_name)}</td>${types.map(t => { const r = rows.find(x => x.subject_id === sr.subject_id && x.type_id === t.id); return `<td>${r ? (r.status === 'locked' ? 'Dikunci' : fmtNum(r.percent, 0) + '%') : '-'}</td>`; }).join('')}<td style="width:60px"></td></tr>`).join('')}</tbody></table>`; }).join('')}
      ${signatureHtml(s, {})}</div>`, { paper: 'A4', orientation: types.length > 3 ? 'landscape' : 'portrait', title: 'Lembar kontrol' });
  };
}

// ---------- Rekap per angkatan ----------
async function angkatan(box, types, classes, defType) {
  const grades = [...new Set(classes.map(c => c.grade_level))];
  box.innerHTML = controls('ag', types, null, defType, `<div class="field"><label>Angkatan</label><select id="ag-g">${grades.map(g => `<option>${g}</option>`).join('')}</select></div>`);
  const run = async () => {
    const out = $('#ag-out', box);
    out.innerHTML = loadingBlock();
    try {
      const d = await get('/leger' + qs({ type_id: $('#ag-t', box).value, grade_level: $('#ag-g', box).value }));
      const rows = d.classes.map(c => {
        const st = d.students.filter(s => s.class_id === c.id);
        const avgOf = sid => { const v = st.map(s => s.scores[sid]).filter(x => x !== null && x !== undefined); return v.length ? v.reduce((a, b) => a + b, 0) / v.length : null; };
        const all = st.filter(s => s.count).map(s => s.average);
        return { c, n: st.length, avgs: d.subjects.map(sb => avgOf(sb.id)), avg: all.length ? all.reduce((a, b) => a + b, 0) / all.length : null, tuntas: st.filter(s => s.status === 'Tuntas').length };
      });
      out.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('layers')} Rekap rata-rata nilai angkatan kelas ${esc($('#ag-g', box).value)}</h3><div class="btn-group"><a class="btn btn-sm" href="#leger?mode=angkatan&grade=${esc($('#ag-g', box).value)}">${icon('table', 'icon-sm')}Leger angkatan lengkap</a><button class="btn btn-sm btn-success" id="ag-x">${icon('download', 'icon-sm')}Excel</button></div></div><div class="card-body">
        <div class="table-wrap"><table class="tbl tbl-compact"><thead><tr><th>Kelas</th><th class="c">Siswa</th>${d.subjects.map(s => `<th class="c" title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}<th class="c">Rata-rata</th><th class="c">Tuntas</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td><b>${esc(r.c.name)}</b></td><td class="c">${r.n}</td>${r.avgs.map(v => `<td class="c">${fmtNum(v, 1)}</td>`).join('')}<td class="c"><b>${fmtNum(r.avg, 2)}</b></td><td class="c">${r.tuntas}/${r.n}</td></tr>`).join('')}
        <tr style="background:var(--gold-100)"><td><b>Angkatan</b></td><td class="c">${d.students.length}</td>${d.stats.map(x => `<td class="c"><b>${fmtNum(x.average, 1)}</b></td>`).join('')}<td></td><td></td></tr></tbody></table></div></div></div>`;
      $('#ag-x', out).onclick = () => exportWorkbook(`Rekap_Angkatan_${$('#ag-g', box).value}.xlsx`, [{ name: 'Rekap', title: 'REKAP NILAI ANGKATAN KELAS ' + $('#ag-g', box).value, subtitle: d.type.name + ' · ' + App.semLabel(), headers: ['Kelas', 'Siswa', ...d.subjects.map(s => s.code), 'Rata-rata', 'Tuntas'], rows: rows.map(r => [r.c.name, r.n, ...r.avgs.map(v => (v === null ? '' : Math.round(v * 100) / 100)), r.avg === null ? '' : Math.round(r.avg * 100) / 100, r.tuntas]) }]);
    } catch (e) { out.innerHTML = `<div class="alert error">${icon('alert')}<div>${esc(e.message)}</div></div>`; }
  };
  $('#ag-go', box).onclick = run;
  run();
}
