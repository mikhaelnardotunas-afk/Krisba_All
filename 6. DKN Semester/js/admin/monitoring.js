// Monitoring kelengkapan nilai & lembar nilai (admin dapat melihat, mengedit, mengunci, mengembalikan).
import { get, post, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, DataTable, statusBadge, progressBar, fmtNum, $, copyText, confirmDialog, fmtDate, formModal } from '../ui.js';
import { refs, opt, remember } from '../common.js';
import { mountGrid } from '../shared/grid.js';
import { exportWorkbook } from '../shared/xlsx.js';

export async function monitoringPage(el, params) {
  const d = await get('/monitoring' + qs({ semester_id: App.semester.id, type_id: params.type_id }));
  const rows = d.rows.map(r => ({ ...r, _k: r.assignment_id + '|' + r.type_id }));
  const count = s => rows.filter(r => r.status === s).length;
  el.innerHTML = pageHead('Monitoring Nilai', `${esc(App.semLabel())} · Pantau guru yang belum input, sebagian, lengkap, terkirim, dan dikunci.`,
    `<button class="btn" id="notify">${icon('bell')}Kirim pengingat</button><button class="btn" id="wa">${icon('copy')}Salin pesan WA</button><button class="btn" id="xls">${icon('download')}Ekspor</button>`) + `
    <div class="stats">${[['belum', 'Belum input', 'alert', 'red'], ['sebagian', 'Sebagian', 'edit', 'gold'], ['lengkap', 'Lengkap', 'checkCircle', ''], ['submitted', 'Terkirim (perlu verifikasi)', 'send', 'purple'], ['returned', 'Dikembalikan', 'undo', 'red'], ['locked', 'Dikunci', 'lock', 'green']]
      .map(([k, l, ic, c]) => `<div class="stat" style="cursor:pointer" data-f="${k}"><div class="stat-icon ${c}">${icon(ic, 'icon-lg')}</div><div><div class="stat-value">${count(k)}</div><div class="stat-label">${l}</div></div></div>`).join('')}</div>
    <div class="card"><div class="card-body" id="tbl"></div></div>`;
  const dt = new DataTable($('#tbl', el), {
    rows, rowKey: '_k', pageSize: 50, selectable: true,
    searchKeys: ['teacher_name', 'subject_name', 'class_name', 'type_name'],
    filters: [
      { key: 'type_id', label: 'Penilaian', options: d.types.map(t => ({ value: t.id, label: t.name })) },
      { key: 'status', label: 'Status', options: [['belum', 'Belum input'], ['sebagian', 'Sebagian'], ['lengkap', 'Lengkap'], ['submitted', 'Terkirim'], ['returned', 'Dikembalikan'], ['locked', 'Dikunci']].map(([value, label]) => ({ value, label })) },
      { key: 'class_name', label: 'Kelas', options: [...new Set(rows.map(r => r.class_name))].map(v => ({ value: v, label: v })) },
      { key: 'teacher_name', label: 'Guru', options: [...new Set(rows.map(r => r.teacher_name))].sort().map(v => ({ value: v, label: v })) }
    ],
    toolbar: `<button class="btn btn-sm btn-success" id="lock-sel" disabled>${icon('lock', 'icon-sm')}Kunci terpilih</button>`,
    columns: [
      { key: 'teacher_name', label: 'Guru' }, { key: 'subject_name', label: 'Mata Pelajaran' }, { key: 'class_name', label: 'Kelas' },
      { key: 'type_name', label: 'Jenis Penilaian' },
      { key: 'percent', label: 'Kelengkapan', render: r => `<div style="min-width:140px">${progressBar(r.percent)}<div class="soft" style="font-size:11px">${r.complete}/${r.students} siswa lengkap</div></div>` },
      { key: 'status', label: 'Status', render: r => statusBadge(r.status) + (r.return_note ? `<div class="soft" style="font-size:11px;max-width:200px">${esc(r.return_note)}</div>` : '') },
      { key: 'submitted_at', label: 'Dikirim', render: r => r.submitted_at ? `<span style="font-size:12px">${fmtDate(r.submitted_at, true)}</span>` : '<span class="soft">—</span>' },
      { label: '', sortable: false, cls: 'actions', render: r => `<a class="btn btn-xs ${r.status === 'submitted' ? 'btn-gold' : ''}" href="#nilai?type_id=${r.type_id}&subject_id=${r.subject_id}&class_id=${r.class_id}">${icon(r.status === 'submitted' ? 'checkCircle' : 'eye', 'icon-sm')}${r.status === 'submitted' ? 'Verifikasi' : 'Buka'}</a>` }
    ],
    onSelect: ids => { $('#lock-sel', el).disabled = !ids.length; },
    emptyText: 'Belum ada pembagian tugas atau jenis penilaian aktif pada semester ini'
  });
  if (params.type_id) { dt.fv.type_id = params.type_id; const s = el.querySelector('[data-filter="type_id"]'); if (s) s.value = params.type_id; dt.render(); }
  el.querySelectorAll('[data-f]').forEach(s => s.onclick = () => { dt.fv.status = s.dataset.f; el.querySelector('[data-filter="status"]').value = s.dataset.f; dt.page = 1; dt.render(); });
  $('#lock-sel', el).onclick = async () => {
    const sel = rows.filter(r => dt.selected.has(r._k) && r.status !== 'locked');
    if (!sel.length) return toast('Tidak ada lembar yang dapat dikunci', 'warning');
    if (!(await confirmDialog(`Kunci ${sel.length} lembar nilai terpilih?`))) return;
    let ok = 0;
    for (const r of sel) { try { await post('/grid/lock', { type_id: r.type_id, subject_id: r.subject_id, class_id: r.class_id }); ok++; } catch (e) { errorToast(e); } }
    toast(`${ok} lembar dikunci`, 'success'); App.refresh();
  };
  const late = () => dt.filtered().filter(r => ['belum', 'sebagian', 'returned'].includes(r.status));
  $('#wa', el).onclick = () => {
    const byT = {};
    late().forEach(r => { (byT[r.teacher_name] = byT[r.teacher_name] || []).push(`${r.subject_name} ${r.class_name} - ${r.type_name} (${fmtNum(r.percent, 0)}%)`); });
    copyText(`*Pengingat Input Nilai* ${App.semLabel()}\n\n` + Object.entries(byT).map(([t, l]) => `• ${t}\n  - ${l.join('\n  - ')}`).join('\n') + '\n\nMohon segera dilengkapi melalui SIPAS. Terima kasih.');
  };
  $('#notify', el).onclick = () => formModal({
    title: 'Kirim Notifikasi Pengingat ke Guru', values: { title: 'Pengingat input nilai', body: `Mohon segera melengkapi dan mengirim nilai ${App.semLabel()}. ${late().length} lembar nilai belum lengkap.` },
    fields: [{ name: 'title', label: 'Judul', required: true, full: true }, { name: 'body', label: 'Pesan', type: 'textarea', full: true }],
    onSubmit: async dd => { await post('/notifications', { ...dd, target: 'guru', link: '#input' }); toast('Notifikasi dikirim ke semua guru', 'success'); }
  });
  $('#xls', el).onclick = () => exportWorkbook(`Monitoring_Nilai_${App.semLabel().replace(/[^\w]+/g, '_')}.xlsx`, [{
    name: 'Monitoring', title: 'MONITORING INPUT NILAI', subtitle: App.semLabel(),
    headers: ['Guru', 'Mata Pelajaran', 'Kelas', 'Jenis Penilaian', 'Siswa', 'Lengkap', 'Kelengkapan (%)', 'Status'],
    rows: dt.filtered().map(r => [r.teacher_name, r.subject_name, r.class_name, r.type_name, r.students, r.complete, r.percent, r.status_label]),
    widths: [28, 26, 10, 26, 8, 9, 14, 14]
  }]);
}

// Lembar nilai (admin): pilih penilaian, mapel, kelas
export async function sheetPage(el, params) {
  const [{ types }, classes, subjects] = await Promise.all([refs.types(), refs.classes(), refs.subjects()]);
  const last = remember('sheet') || {};
  const pick = (want, list) => [want].concat(list.map(x => x.id)).find(id => id && list.some(x => x.id === id));
  const typeId = pick(params.type_id || last.type_id, types);
  const subjectId = pick(params.subject_id || last.subject_id, subjects.filter(s => s.active));
  const classId = pick(params.class_id || last.class_id, classes);
  el.innerHTML = pageHead('Lembar Nilai', 'Admin dapat melihat & mengedit semua nilai, memverifikasi, mengunci, membuka kunci, atau mengembalikan ke guru.', `<a class="btn" href="#monitoring">${icon('monitor')}Monitoring</a>`) +
    `<div class="card mb-2"><div class="card-body"><div class="filters">
      <div class="field"><label>Jenis penilaian</label><select id="s-t">${opt(types, 'id', 'name', typeId)}</select></div>
      <div class="field"><label>Mata pelajaran</label><select id="s-s">${opt(subjects.filter(s => s.active), 'id', 'name', subjectId)}</select></div>
      <div class="field"><label>Kelas</label><select id="s-c">${opt(classes, 'id', 'name', classId)}</select></div>
    </div></div></div><div id="grid"></div>`;
  const go = () => App.go(`nilai?type_id=${$('#s-t', el).value}&subject_id=${$('#s-s', el).value}&class_id=${$('#s-c', el).value}`);
  ['#s-t', '#s-s', '#s-c'].forEach(s => { $(s, el).onchange = go; });
  if (!typeId || !subjectId || !classId) { $('#grid', el).innerHTML = '<div class="card card-body muted">Lengkapi jenis penilaian, mapel, dan kelas terlebih dahulu.</div>'; return; }
  remember('sheet', { type_id: typeId, subject_id: subjectId, class_id: classId });
  await mountGrid($('#grid', el), { typeId, subjectId, classId, isAdmin: true });
}
