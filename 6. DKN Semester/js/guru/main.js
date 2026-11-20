// Aplikasi guru: hanya kelas & mapel yang ditugaskan (+ kelas perwalian).
import { get, qs } from '../api.js';
import { startApp, App, pageHead, changePassword } from '../app.js';
import { icon, esc, fmtNum, fmtDate, timeAgo, DataTable, statusBadge, progressBar, $, $$, openModal, loadingBlock, emptyBlock, toast, errorToast, loadScript } from '../ui.js';
import { opt, remember } from '../common.js';
import { mountGrid } from '../shared/grid.js';
import { mountDeskripsi } from '../shared/deskripsi.js';
import { mountWali } from '../shared/wali.js';
import { exportWorkbook } from '../shared/xlsx.js';
import { renderStudent, prepareQr } from '../shared/rapor.js';
import { printHtml } from '../shared/print.js';

const isActiveSem = () => App.active && App.semester && App.active.id === App.semester.id;
async function myAssignments() { return get('/assignments' + qs({ semester_id: App.semester.id })); }

// ---------- Dashboard ----------
async function dashboard(el) {
  const d = await get('/dashboard/guru' + qs({ semester_id: App.semester.id }));
  const todo = d.monitoring.filter(r => !['locked', 'submitted'].includes(r.status));
  const soon = d.ongoing.filter(t => t.end_date && (new Date(t.end_date) - Date.now()) / 864e5 <= Number(App.settings.hari_pengingat || 3) && new Date(t.end_date + 'T23:59:59') >= new Date());
  const stat = (ic, cls, v, l) => `<div class="stat"><div class="stat-icon ${cls}">${icon(ic, 'icon-lg')}</div><div><div class="stat-value">${v}</div><div class="stat-label">${l}</div></div></div>`;
  el.innerHTML = pageHead(`Halo, ${App.user.full_name.split(',')[0]}`, esc(App.semLabel()), `<a class="btn btn-gold" href="#input">${icon('edit')}Input Nilai</a>`) + `
    ${soon.map(t => `<div class="alert warn">${icon('bell')}<div><b>${esc(t.name)}</b>: batas input ${fmtDate(t.end_date)}. Segera lengkapi & kirim nilai.</div></div>`).join('')}
    ${d.monitoring.filter(r => r.status === 'returned').map(r => `<div class="alert error">${icon('undo')}<div><b>Dikembalikan admin:</b> ${esc(r.subject_name)} ${esc(r.class_name)} (${esc(r.type_name)}) — ${esc(r.return_note || '')} <a href="#input?type_id=${r.type_id}&subject_id=${r.subject_id}&class_id=${r.class_id}">Perbaiki</a></div></div>`).join('')}
    <div class="stats">
      ${stat('book', '', d.subjects.length, 'Mapel diampu')}${stat('class', 'gold', d.classes.length, 'Kelas diajar')}
      ${stat('layers', 'purple', d.ongoing.length, 'Penilaian berlangsung')}${stat('checkCircle', 'green', fmtNum(d.completeness, 1) + '%', 'Kelengkapan nilai')}
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,2fr) minmax(260px,1fr)" id="g-grid">
      <div class="card"><div class="card-head"><h3>${icon('clipboard')} Tugas Input Nilai</h3><span class="badge ${todo.length ? 'yellow' : 'green'}">${todo.length} belum selesai</span></div><div class="card-body" id="todo"></div></div>
      <div class="flex-col gap-3" style="display:flex">
        <div class="card"><div class="card-head"><h3>${icon('book')} Mapel & Kelas</h3></div><div class="card-body"><div class="chips mb-2">${d.subjects.map(s => `<span class="chip">${esc(s.name)}</span>`).join('') || '<span class="muted">Belum ada tugas mengajar</span>'}</div><div class="chips">${d.classes.map(c => `<span class="badge navy">${esc(c.name)}</span>`).join('')}</div>
          ${App.boot.homeroom_classes.length ? `<hr><div>${icon('star', 'icon-sm')} Wali kelas: <b>${App.boot.homeroom_classes.map(c => esc(c.name)).join(', ')}</b> <a href="#wali">Isi data rapor →</a></div>` : ''}</div></div>
        <div class="card"><div class="card-head"><h3>${icon('calendar')} Penilaian Berlangsung</h3></div><div class="card-body"><ul class="list-plain">${d.ongoing.map(t => `<li><span class="grow"><b>${esc(t.name)}</b><div class="muted" style="font-size:12px">${t.end_date ? 'Batas ' + fmtDate(t.end_date) : 'Tanpa batas waktu'}</div></span></li>`).join('') || '<li class="muted">Tidak ada penilaian yang dibuka</li>'}</ul></div></div>
        <div class="card"><div class="card-head"><h3>${icon('history')} Riwayat Input</h3><a class="btn btn-xs btn-ghost" href="#riwayat">Semua</a></div><div class="card-body"><ul class="list-plain" style="font-size:12.5px">${d.history.map(h => `<li style="align-items:flex-start"><div class="grow"><b>${esc(h.student_name)}</b> · ${esc(h.subject_name)} ${esc(h.class_name)}<div class="muted">${esc(h.category_name || '')}: ${h.old_score === null ? '–' : fmtNum(h.old_score)} → <b>${h.new_score === null ? '–' : fmtNum(h.new_score)}</b> · ${timeAgo(h.created_at)}</div></div></li>`).join('') || '<li class="muted">Belum ada</li>'}</ul></div></div>
      </div></div>`;
  if (window.innerWidth < 1000) $('#g-grid', el).style.gridTemplateColumns = 'minmax(0,1fr)';
  new DataTable($('#todo', el), {
    rows: d.monitoring.map(r => ({ ...r, _k: r.assignment_id + '|' + r.type_id })), rowKey: '_k', pageSize: 10, compact: true, searchKeys: ['subject_name', 'class_name', 'type_name'],
    filters: [{ key: 'status', label: 'Status', options: [['belum', 'Belum input'], ['sebagian', 'Sebagian'], ['lengkap', 'Lengkap'], ['submitted', 'Terkirim'], ['returned', 'Dikembalikan'], ['locked', 'Dikunci']].map(([value, label]) => ({ value, label })) }],
    columns: [
      { key: 'type_name', label: 'Penilaian' }, { key: 'subject_name', label: 'Mapel' }, { key: 'class_name', label: 'Kelas' },
      { key: 'percent', label: 'Kelengkapan', render: r => `<div style="min-width:110px">${progressBar(r.percent)}</div>` },
      { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
      { label: '', sortable: false, cls: 'actions', render: r => `<a class="btn btn-xs ${['locked', 'submitted'].includes(r.status) ? '' : 'btn-primary'}" href="#input?type_id=${r.type_id}&subject_id=${r.subject_id}&class_id=${r.class_id}">${icon(['locked', 'submitted'].includes(r.status) ? 'eye' : 'edit', 'icon-sm')}${['locked', 'submitted'].includes(r.status) ? 'Lihat' : 'Input'}</a>` }
    ],
    emptyText: 'Belum ada tugas input. Hubungi admin bila Anda belum ditugaskan.'
  });
}

// ---------- Kelas yang diajar ----------
async function kelas(el) {
  const asg = await myAssignments();
  const byClass = new Map();
  asg.forEach(a => { if (!byClass.has(a.class_id)) byClass.set(a.class_id, { name: a.class_name, students: a.students, items: [] }); byClass.get(a.class_id).items.push(a); });
  el.innerHTML = pageHead('Kelas yang Diajar', esc(App.semLabel())) + (byClass.size ? `<div class="grid grid-3">${[...byClass].map(([cid, c]) => `
    <div class="card"><div class="card-head"><h3>${icon('class')} ${esc(c.name)}</h3><span class="badge navy">${c.students} siswa</span></div><div class="card-body">
      <ul class="list-plain">${c.items.map(a => `<li><span class="grow"><b>${esc(a.subject_name)}</b></span><a class="btn btn-xs btn-primary" href="#input?subject_id=${a.subject_id}&class_id=${cid}">${icon('edit', 'icon-sm')}Nilai</a><a class="btn btn-xs" href="#deskripsi?subject_id=${a.subject_id}&class_id=${cid}">${icon('pen', 'icon-sm')}Deskripsi</a></li>`).join('')}</ul>
      <button class="btn btn-sm mt-2 w-100" data-students="${cid}">${icon('users', 'icon-sm')}Daftar siswa</button></div></div>`).join('')}</div>` : `<div class="card">${emptyBlock('Belum ada tugas mengajar', 'Admin belum menetapkan pembagian tugas Anda pada semester ini.', 'class')}</div>`);
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-students]');
    if (!b) return;
    const list = await get('/students' + qs({ year_id: App.semester.year_id, class_id: b.dataset.students }));
    openModal({ title: 'Daftar Siswa ' + byClass.get(b.dataset.students).name, size: 'lg', body: `<div class="table-wrap" style="max-height:60vh"><table class="tbl tbl-compact"><thead><tr><th>No</th><th>NIS</th><th>NISN</th><th>Nama</th><th>L/P</th></tr></thead><tbody>${list.map((s, i) => `<tr><td>${s.roll_no || i + 1}</td><td>${esc(s.nis || '')}</td><td>${esc(s.nisn || '')}</td><td>${esc(s.name)}</td><td>${esc(s.gender || '')}</td></tr>`).join('')}</tbody></table></div>` });
  });
}

// ---------- Pemilih penilaian/mapel/kelas ----------
async function picker(el, params, page, { withType = true } = {}) {
  const [asg, tp] = await Promise.all([myAssignments(), withType ? get('/assessment-types' + qs({ semester_id: App.semester.id })) : Promise.resolve({ types: [] })]);
  const types = tp.types;
  const last = remember(page) || {};
  const subjects = [...new Map(asg.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()];
  const want = (k, list) => [params[k], last[k]].concat(list.map(x => x.id)).find(id => id && list.some(x => x.id === id));
  const subjectId = want('subject_id', subjects);
  const classes = asg.filter(a => a.subject_id === subjectId).map(a => ({ id: a.class_id, name: a.class_name }));
  const classId = want('class_id', classes);
  const typeId = withType ? want('type_id', types) : null;
  const html = `<div class="card mb-2"><div class="card-body" style="padding:12px 16px"><div class="filters">
      ${withType ? `<div class="field"><label>Jenis penilaian</label><select id="p-t">${opt(types, 'id', t => t.name + (t.input_open ? '' : ' (ditutup)'), typeId)}</select></div>` : ''}
      <div class="field"><label>Mata pelajaran</label><select id="p-s">${opt(subjects, 'id', 'name', subjectId)}</select></div>
      <div class="field"><label>Kelas</label><select id="p-c">${opt(classes, 'id', 'name', classId)}</select></div></div></div></div>`;
  const ok = subjectId && classId && (!withType || typeId);
  if (ok) remember(page, { type_id: typeId, subject_id: subjectId, class_id: classId });
  return {
    html, ok, typeId, subjectId, classId, types, empty: !asg.length,
    bind: () => {
      const go = () => App.go(`${page}?${withType ? 'type_id=' + $('#p-t', el).value + '&' : ''}subject_id=${$('#p-s', el).value}&class_id=${$('#p-c', el).value}`);
      ['#p-t', '#p-s', '#p-c'].forEach(id => { const s = $(id, el); if (s) s.onchange = () => { if (id === '#p-s') { const c = $('#p-c', el); c.value = ''; } go(); }; });
    }
  };
}

async function inputNilai(el, params) {
  const p = await picker(el, params, 'input');
  el.innerHTML = pageHead('Input Nilai', esc(App.semLabel())) + p.html + '<div id="grid"></div>';
  p.bind();
  if (p.empty) { $('#grid', el).innerHTML = `<div class="card">${emptyBlock('Belum ada tugas mengajar', 'Hubungi admin sekolah.', 'class')}</div>`; return; }
  if (!p.types.length) { $('#grid', el).innerHTML = `<div class="card">${emptyBlock('Belum ada jenis penilaian aktif', 'Admin belum membuat jenis penilaian untuk semester ini.', 'layers')}</div>`; return; }
  if (!p.ok) return;
  await mountGrid($('#grid', el), { typeId: p.typeId, subjectId: p.subjectId, classId: p.classId, isAdmin: false });
}

// ---------- Rekap nilai ----------
async function rekap(el, params) {
  const p = await picker(el, params, 'rekap', { withType: false });
  el.innerHTML = pageHead('Rekap Nilai', 'Nilai akhir seluruh jenis penilaian untuk satu mapel & kelas.') + p.html + '<div id="out"></div>';
  p.bind();
  if (!p.ok) { $('#out', el).innerHTML = `<div class="card">${emptyBlock('Belum ada tugas mengajar', '', 'class')}</div>`; return; }
  const { types } = await get('/assessment-types' + qs({ semester_id: App.semester.id }));
  const out = $('#out', el);
  out.innerHTML = loadingBlock('Menghitung rekap...');
  const grids = await Promise.all(types.map(t => get('/grid' + qs({ type_id: t.id, subject_id: p.subjectId, class_id: p.classId })).catch(() => null)));
  const ok = grids.filter(Boolean);
  if (!ok.length) { out.innerHTML = `<div class="card">${emptyBlock('Belum ada data nilai', '', 'table')}</div>`; return; }
  const g0 = ok[0];
  const kktp = g0.kktp;
  out.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('table')} ${esc(g0.subject.name)} · ${esc(g0.class.name)}</h3><div class="btn-group"><button class="btn btn-sm" id="rk-p">${icon('printer', 'icon-sm')}Cetak</button><button class="btn btn-sm btn-success" id="rk-x">${icon('download', 'icon-sm')}Excel</button></div></div>
    <div class="card-body"><div class="table-wrap"><table class="tbl tbl-compact" id="rk-t"><thead><tr><th>No</th><th>Nama</th>${ok.map(g => `<th class="c">${esc(g.type.name)}</th>`).join('')}</tr></thead><tbody>
    ${g0.students.map((s, i) => `<tr><td>${s.roll_no || i + 1}</td><td>${esc(s.name)}</td>${ok.map(g => { const x = g.students.find(y => y.id === s.id) || {}; return `<td class="c" style="${x.final !== null && x.final < kktp ? 'color:var(--danger);font-weight:600' : ''}">${x.final === null || x.final === undefined ? '–' : fmtNum(x.final)}${x.provisional ? '<sup title="sementara">*</sup>' : ''}</td>`; }).join('')}</tr>`).join('')}
    </tbody></table></div><p class="muted mt-1" style="font-size:12px">* nilai sementara (komponen belum lengkap). Merah = di bawah KKTP ${fmtNum(kktp)}.</p></div></div>`;
  $('#rk-x', out).onclick = () => exportWorkbook(`Rekap_${g0.subject.code}_${g0.class.name}.xlsx`.replace(/\s+/g, '_'), [{ name: 'Rekap', title: `REKAP NILAI ${g0.subject.name.toUpperCase()} KELAS ${g0.class.name}`, subtitle: App.semLabel() + ' · Guru: ' + App.user.full_name, headers: ['No', 'NISN', 'Nama', ...ok.map(g => g.type.name)], rows: g0.students.map((s, i) => [s.roll_no || i + 1, s.nisn || '', s.name, ...ok.map(g => { const x = g.students.find(y => y.id === s.id) || {}; return x.final ?? ''; })]), textCols: [1], highlight: (r, c, v) => (c >= 3 && typeof v === 'number' && v < kktp ? 'FDE2E2' : null) }]);
  $('#rk-p', out).onclick = () => printHtml(`<div class="sheet-page"><div class="rep-title">REKAP NILAI ${esc(g0.subject.name.toUpperCase())} KELAS ${esc(g0.class.name)}</div><div class="rep-sub">${esc(App.semLabel())} · Guru: ${esc(App.user.full_name)}</div>${$('#rk-t', out).outerHTML.replace('tbl tbl-compact', 'rep-tbl')}</div>`, { paper: 'A4', title: 'Rekap nilai' });
}

// ---------- Deskripsi rapor ----------
async function deskripsi(el, params) {
  const p = await picker(el, params, 'deskripsi', { withType: false });
  el.innerHTML = pageHead('Deskripsi Rapor', 'Pilih kompetensi paling dikuasai & perlu ditingkatkan untuk setiap siswa.', `<a class="btn" href="#bank">${icon('book')}Bank deskripsi</a>`) + p.html + '<div class="card"><div class="card-body" id="out"></div></div>';
  p.bind();
  if (!p.ok) { $('#out', el).innerHTML = emptyBlock('Belum ada tugas mengajar', '', 'class'); return; }
  await mountDeskripsi($('#out', el), { semesterId: App.semester.id, subjectId: p.subjectId, classId: p.classId });
}

async function bank(el, params) {
  const asg = await myAssignments();
  const subs = [...new Map(asg.map(a => [a.subject_id, { id: a.subject_id, name: a.subject_name }])).values()];
  const m = await import('../admin/master.js');
  await m.bankPage(el, params, { forGuru: true, subjectsList: subs });
}

// ---------- Wali kelas ----------
async function wali(el, params) {
  const hc = App.boot.homeroom_classes;
  if (!hc.length) { el.innerHTML = pageHead('Wali Kelas') + `<div class="card">${emptyBlock('Anda bukan wali kelas', 'Menu ini untuk wali kelas pada tahun pelajaran aktif.', 'class')}</div>`; return; }
  const cid = hc.some(c => c.id === params.class_id) ? params.class_id : hc[0].id;
  const c = hc.find(x => x.id === cid);
  const tab = params.tab || 'isian';
  el.innerHTML = pageHead('Wali Kelas ' + c.name, esc(App.semLabel())) + `
    ${hc.length > 1 ? `<div class="filters mb-2"><div class="field"><label>Kelas</label><select id="w-c">${opt(hc, 'id', 'name', cid)}</select></div></div>` : ''}
    <div class="tabs"><a class="tab ${tab === 'isian' ? 'active' : ''}" href="#wali?class_id=${cid}&tab=isian">${icon('edit', 'icon-sm')}Isian rapor</a><a class="tab ${tab === 'leger' ? 'active' : ''}" href="#wali?class_id=${cid}&tab=leger">${icon('table', 'icon-sm')}Leger kelas</a><a class="tab ${tab === 'rapor' ? 'active' : ''}" href="#wali?class_id=${cid}&tab=rapor">${icon('file', 'icon-sm')}Pratinjau rapor</a></div>
    <div class="card"><div class="card-body" id="w-body">${loadingBlock()}</div></div>`;
  if ($('#w-c', el)) $('#w-c', el).onchange = e => App.go('wali?class_id=' + e.target.value + '&tab=' + tab);
  const body = $('#w-body', el);
  if (tab === 'isian') {
    if (!isActiveSem()) body.insertAdjacentHTML('beforebegin', `<div class="alert info">${icon('info')}<div>Anda melihat semester non-aktif.</div></div>`);
    await mountWali(body, { classId: cid, semesterId: App.semester.id, isAdmin: false, className: c.name });
  } else if (tab === 'leger') {
    const sem = App.semesters.find(s => s.id === App.semester.id) || {};
    if (!sem.report_assessment_type_id) { body.innerHTML = '<div class="muted">Nilai rapor semester ini belum diatur admin.</div>'; return; }
    const d = await get('/leger' + qs({ type_id: sem.report_assessment_type_id, class_id: cid }));
    body.innerHTML = `<div class="table-wrap" style="max-height:70vh"><table class="tbl tbl-compact"><thead><tr><th>No</th><th>Nama</th>${d.subjects.map(s => `<th class="c" title="${esc(s.name)}">${esc(s.code)}</th>`).join('')}<th class="c">Jumlah</th><th class="c">Rata-rata</th>${d.ranking_enabled ? '<th class="c">Peringkat</th>' : ''}</tr></thead><tbody>
      ${d.students.map((s, i) => `<tr><td>${s.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(s.name)}</td>${d.subjects.map(sb => { const v = s.scores[sb.id]; return `<td class="c" style="${v !== null && v !== undefined && v < sb.kktp_effective ? 'color:var(--danger);font-weight:600' : ''}">${fmtNum(v)}</td>`; }).join('')}<td class="c"><b>${fmtNum(s.total)}</b></td><td class="c">${s.count ? fmtNum(s.average, 2) : ''}</td>${d.ranking_enabled ? `<td class="c">${s.rank ?? ''}</td>` : ''}</tr>`).join('')}</tbody></table></div>
      <button class="btn btn-sm mt-2" id="w-x">${icon('download', 'icon-sm')}Excel</button>`;
    $('#w-x', body).onclick = () => exportWorkbook(`Leger_${c.name}.xlsx`, [{ name: 'Leger', title: 'LEGER KELAS ' + c.name, subtitle: App.semLabel(), headers: ['No', 'Nama', ...d.subjects.map(s => s.code), 'Jumlah', 'Rata-rata', 'Peringkat'], rows: d.students.map((s, i) => [s.roll_no || i + 1, s.name, ...d.subjects.map(sb => s.scores[sb.id] ?? ''), s.total, s.average, s.rank ?? '']) }]);
  } else {
    await prepareQr();
    const d = await get('/report-data' + qs({ semester_id: App.semester.id, class_id: cid }));
    let i = 0;
    body.innerHTML = `<div class="flex gap-2 mb-2 flex-wrap"><select id="w-s" style="max-width:320px">${d.students.map((s, k) => `<option value="${k}">${s.roll_no || k + 1}. ${esc(s.name)}</option>`).join('')}</select><button class="btn btn-sm" id="w-p">${icon('printer', 'icon-sm')}Cetak pratinjau</button></div><div class="rapor-preview" id="w-r"></div>`;
    const show = () => { $('#w-r', body).innerHTML = renderStudent(d, d.students[i]); };
    $('#w-s', body).onchange = e => { i = Number(e.target.value); show(); };
    $('#w-p', body).onclick = () => printHtml(renderStudent(d, d.students[i]), { paper: d.settings.ukuran_kertas_raport || 'A4', title: 'Pratinjau rapor' });
    show();
  }
}

// ---------- Riwayat input ----------
async function riwayat(el) {
  const rows = await get('/score-revisions?limit=2000');
  el.innerHTML = pageHead('Riwayat Input', 'Semua perubahan nilai yang Anda lakukan.') + '<div class="card"><div class="card-body" id="tbl"></div></div>';
  new DataTable($('#tbl', el), {
    rows, pageSize: 50, searchKeys: ['student_name', 'subject_name', 'class_name', 'type_name', 'category_name'],
    filters: [{ key: 'type_name', label: 'Penilaian', options: [...new Set(rows.map(r => r.type_name))].map(v => ({ value: v, label: v })) }, { key: 'class_name', label: 'Kelas', options: [...new Set(rows.map(r => r.class_name))].map(v => ({ value: v, label: v })) }],
    columns: [
      { key: 'created_at', label: 'Waktu', render: r => `<span class="nowrap">${fmtDate(r.created_at, true)}</span>` },
      { key: 'student_name', label: 'Siswa' }, { key: 'subject_name', label: 'Mapel · Kelas', render: r => `${esc(r.subject_name)} · ${esc(r.class_name)}` },
      { key: 'type_name', label: 'Penilaian › Kategori', render: r => `${esc(r.type_name)} › ${esc(r.category_name || '-')}` },
      { key: 'old_score', label: 'Sebelum', cls: 'num', render: r => (r.old_score === null ? '–' : fmtNum(r.old_score)) },
      { key: 'new_score', label: 'Sesudah', cls: 'num', render: r => `<b>${r.new_score === null ? '–' : fmtNum(r.new_score)}</b>` }
    ],
    emptyText: 'Belum ada riwayat input nilai'
  });
}

// ---------- Profil ----------
async function profil(el) {
  const me = await get('/auth/me');
  el.innerHTML = pageHead('Profil') + `<div class="grid grid-2"><div class="card"><div class="card-body">
    <div class="flex gap-3 mb-3"><div class="avatar" style="width:64px;height:64px;font-size:22px">${esc(me.full_name.replace(/,.*$/, '').split(' ').slice(0, 2).map(w => w[0]).join(''))}</div><div><h2 class="mb-0">${esc(me.full_name)}</h2><span class="badge navy">Guru</span></div></div>
    <dl class="kv"><dt>Username</dt><dd class="mono">${esc(me.username)}</dd><dt>NIP</dt><dd>${esc(me.teacher && me.teacher.nip || '-')}</dd><dt>NUPTK</dt><dd>${esc(me.teacher && me.teacher.nuptk || '-')}</dd><dt>No. HP</dt><dd>${esc(me.teacher && me.teacher.phone || '-')}</dd><dt>Email</dt><dd>${esc(me.teacher && me.teacher.email || '-')}</dd>
    <dt>Wali kelas</dt><dd>${App.boot.homeroom_classes.map(c => esc(c.name)).join(', ') || '-'}</dd></dl>
    <button class="btn btn-primary mt-3" id="pw">${icon('key')}Ganti Password</button>
    <p class="muted mt-2" style="font-size:12.5px">Perubahan data diri dilakukan oleh admin sekolah.</p></div></div>
    <div class="card"><div class="card-head"><h3>${icon('info')} Tips Input Nilai</h3></div><div class="card-body"><ul style="padding-left:18px;margin:0;line-height:1.8">
      <li><span class="kbd">Enter</span> pindah ke siswa berikutnya, <span class="kbd">Tab</span> ke kolom berikutnya.</li><li>Salin blok nilai dari Excel lalu tempel (<span class="kbd">Ctrl</span>+<span class="kbd">V</span>) di sel pertama.</li>
      <li>Nilai tersimpan otomatis. Saat internet putus, nilai disimpan di perangkat dan dikirim saat online.</li><li>Nilai kosong tidak dianggap nol.</li><li>Kirim nilai ke admin setelah lengkap. Nilai terkunci tidak dapat diubah.</li></ul></div></div></div>`;
  $('#pw', el).onclick = () => changePassword(false);
}

const menu = () => [
  { section: 'Menu Guru' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'kelas', label: 'Kelas yang Diajar', icon: 'class' },
  { id: 'input', label: 'Input Nilai', icon: 'edit' },
  { id: 'rekap', label: 'Rekap Nilai', icon: 'table' },
  { id: 'deskripsi', label: 'Deskripsi Rapor', icon: 'pen' },
  ...(App.boot.homeroom_classes.length ? [{ id: 'wali', label: 'Wali Kelas', icon: 'star' }] : []),
  { id: 'riwayat', label: 'Riwayat Input', icon: 'history' },
  { id: 'profil', label: 'Profil', icon: 'user' }
];

startApp({
  role: 'guru', menu, home: 'dashboard',
  pages: {
    dashboard: { title: 'Dashboard Guru', render: dashboard },
    kelas: { title: 'Kelas yang Diajar', render: kelas },
    input: { title: 'Input Nilai', render: inputNilai },
    rekap: { title: 'Rekap Nilai', render: rekap },
    deskripsi: { title: 'Deskripsi Rapor', render: deskripsi },
    bank: { title: 'Bank Deskripsi', render: bank },
    wali: { title: 'Wali Kelas', render: wali },
    riwayat: { title: 'Riwayat Input', render: riwayat, needsSemester: false },
    profil: { title: 'Profil', render: profil, needsSemester: false }
  }
});
