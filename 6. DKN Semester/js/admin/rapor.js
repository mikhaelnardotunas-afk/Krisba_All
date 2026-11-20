// Rapor: pratinjau & cetak (5 format), PDF, Word, ZIP; finalisasi; isian wali; deskripsi mapel; pengambilan rapor.
import { get, put, post, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, openModal, formModal, confirmDialog, $, $$, busy, fmtNum, fmtDate, DataTable, loadScript, downloadBlob, safeFileName, loadingBlock, withLoading, copyText } from '../ui.js';
import { refs, opt, remember, invalidate } from '../common.js';
import { FORMATS, THEMES, renderStudent, warnings, prepareQr, printCss } from '../shared/rapor.js';
import { printHtml, makePdf, wordBlob, PAPERS, kopHtml, signatureHtml } from '../shared/print.js';
import { mountWali } from '../shared/wali.js';
import { mountDeskripsi } from '../shared/deskripsi.js';
import { exportWorkbook } from '../shared/xlsx.js';

// ===================== CETAK RAPOR =====================
export async function raporPage(el, params) {
  const classes = await refs.classes();
  if (!classes.length) { el.innerHTML = pageHead('Cetak Rapor') + '<div class="card card-body">Belum ada kelas.</div>'; return; }
  const s = App.settings;
  const st = Object.assign({ class_id: classes[0].id, format: s.format_raport || 'kementerian', theme: s.tema_raport || 'default', paper: s.ukuran_kertas_raport || 'F4' }, remember('rapor') || {}, params);
  if (!classes.some(c => c.id === st.class_id)) st.class_id = classes[0].id;
  const sem = App.semesters.find(x => x.id === App.semester.id) || {};
  el.innerHTML = pageHead('Cetak Rapor', esc(App.semLabel()), `<button class="btn" id="r-set">${icon('settings')}Pengaturan rapor semester</button>`) + `
    <div class="card mb-2"><div class="card-body"><div class="filters">
      <div class="field"><label>Kelas</label><select id="r-class">${opt(classes, 'id', 'name', st.class_id)}</select></div>
      <div class="field" style="min-width:260px"><label>Format</label><select id="r-format">${FORMATS.map(f => `<option value="${f.id}"${f.id === st.format ? ' selected' : ''}>${f.name}</option>`).join('')}</select></div>
      <div class="field"><label>Tema warna</label><select id="r-theme">${THEMES.map(t => `<option value="${t.id}"${t.id === st.theme ? ' selected' : ''}>${t.name}</option>`).join('')}</select></div>
      <div class="field"><label>Kertas</label><select id="r-paper">${['A4', 'F4'].map(p => `<option${p === st.paper ? ' selected' : ''}>${p}</option>`).join('')}</select></div>
    </div></div></div><div id="r-body">${loadingBlock('Menyiapkan data rapor...')}</div>`;
  $('#r-set', el).onclick = () => reportSettings(sem);
  ['#r-class', '#r-format', '#r-theme', '#r-paper'].forEach(id => { $(id, el).onchange = () => { remember('rapor', { class_id: $('#r-class', el).value, format: $('#r-format', el).value, theme: $('#r-theme', el).value, paper: $('#r-paper', el).value }); App.refresh(); }; });
  const body = $('#r-body', el);
  let d;
  try {
    await prepareQr();
    d = await get('/report-data' + qs({ semester_id: App.semester.id, class_id: st.class_id, format: st.format }));
  } catch (e) {
    body.innerHTML = `<div class="card card-body"><div class="alert warn">${icon('alert')}<div>${esc(e.message)}</div></div><button class="btn btn-primary" id="r-set2">${icon('settings')}Atur sekarang</button></div>`;
    $('#r-set2', el).onclick = () => reportSettings(sem);
    return;
  }
  d.settings = { ...d.settings, tema_raport: st.theme };
  const studs = d.students;
  if (!studs.length) { body.innerHTML = '<div class="card card-body">Belum ada siswa di kelas ini.</div>'; return; }
  let idx = Math.max(0, studs.findIndex(x => x.id === params.student_id));
  const finalized = studs.filter(x => x.card && x.card.status === 'final').length;
  body.innerHTML = `
    <div class="card mb-2"><div class="card-body" style="padding:12px 16px"><div class="flex between flex-wrap gap-2">
      <div class="flex gap-1 flex-wrap"><button class="btn btn-sm btn-icon" id="r-prev" title="Sebelumnya">${icon('chevronLeft')}</button>
        <select id="r-stud" style="min-width:240px">${studs.map((x, i) => `<option value="${i}">${x.roll_no || i + 1}. ${esc(x.name)}${x.rank ? ' [#' + x.rank + ']' : ''}</option>`).join('')}</select>
        <button class="btn btn-sm btn-icon" id="r-next" title="Berikutnya">${icon('chevron')}</button></div>
      <div class="btn-group">
        <button class="btn btn-sm btn-primary" data-a="print1">${icon('printer', 'icon-sm')}Cetak</button><button class="btn btn-sm" data-a="pdf1">${icon('download', 'icon-sm')}PDF</button><button class="btn btn-sm" data-a="doc1">${icon('file', 'icon-sm')}Word</button>
        <span class="soft">|</span><b style="font-size:12.5px">1 kelas:</b>
        <button class="btn btn-sm btn-success" data-a="printAll">${icon('printer', 'icon-sm')}Cetak</button><button class="btn btn-sm" data-a="pdfAll">${icon('download', 'icon-sm')}PDF</button><button class="btn btn-sm" data-a="docAll">${icon('file', 'icon-sm')}Word</button><button class="btn btn-sm" data-a="zip">${icon('archive', 'icon-sm')}ZIP Word</button>
        <button class="btn btn-sm ${finalized === studs.length ? '' : 'btn-gold'}" data-a="final">${icon(finalized === studs.length ? 'unlock' : 'lock', 'icon-sm')}${finalized === studs.length ? 'Buka finalisasi' : 'Finalisasi rapor kelas'}</button>
      </div></div><div id="r-warn" class="mt-2"></div></div></div>
    <div class="rapor-preview" id="r-prev-box"></div>`;
  const show = () => {
    const x = studs[idx];
    $('#r-stud', el).value = idx;
    $('#r-prev-box', el).innerHTML = renderStudent(d, x, st.format);
    const w = warnings(d, x, st.format);
    $('#r-warn', el).innerHTML = (finalized ? `<span class="badge green">${icon('lock', 'icon-sm')} ${finalized}/${studs.length} rapor difinalkan</span> ` : '') + (w.length ? `<div class="alert warn mb-0 mt-1">${icon('alert')}<div>${w.map(esc).join('<br>')}</div></div>` : '');
  };
  $('#r-stud', el).onchange = e => { idx = Number(e.target.value); show(); };
  $('#r-prev', el).onclick = () => { if (idx > 0) { idx--; show(); } };
  $('#r-next', el).onclick = () => { if (idx < studs.length - 1) { idx++; show(); } };
  show();
  const pages = list => list.map(x => renderStudent(d, x, st.format));
  const fname = x => `Rapor_${d.class.name}_${x ? safeFileName(x.name) : 'Kelas'}`.replace(/\s+/g, '_');
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-a]');
    if (!b) return;
    const one = [studs[idx]];
    try {
      switch (b.dataset.a) {
        case 'print1': return printHtml(pages(one).join(''), { title: fname(one[0]), paper: st.paper, margin: 10 });
        case 'printAll': return printHtml(pages(studs).join('<div class="page-break"></div>'), { title: fname(), paper: st.paper, margin: 10 });
        case 'pdf1': return await busy(b, () => makePdf(pages(one), fname(one[0]) + '.pdf', { paper: st.paper, margin: 10 }));
        case 'pdfAll': return await busy(b, () => makePdf(pages(studs), fname() + '.pdf', { paper: st.paper, margin: 10 }));
        case 'doc1': return downloadBlob(wordBlob(pages(one).join(''), await printCss(), st.paper), fname(one[0]) + '.doc');
        case 'docAll': return downloadBlob(wordBlob(pages(studs).join('<br clear="all" style="page-break-before:always">'), await printCss(), st.paper), fname() + '.doc');
        case 'zip': {
          await withLoading('Menyiapkan ZIP...', async () => {
            if (!window.JSZip) await loadScript('vendor/jszip.min.js');
            const zip = new window.JSZip();
            const css = await printCss();
            studs.forEach((x, i) => zip.file(`${String(x.roll_no || i + 1).padStart(2, '0')}_${safeFileName(x.name)}.doc`, wordBlob(renderStudent(d, x, st.format), css, st.paper)));
            downloadBlob(await zip.generateAsync({ type: 'blob' }), fname() + '_Word.zip');
          });
          return toast('ZIP diunduh', 'success');
        }
        case 'final': {
          const all = finalized === studs.length;
          if (!(await confirmDialog(all ? 'Buka kembali finalisasi rapor kelas ini? Wali kelas dapat mengubah isian lagi.' : 'Finalisasi rapor kelas ini? Isian wali kelas & deskripsi guru dikunci dan nomor rapor dibuat otomatis.'))) return;
          await post('/report-cards/finalize', { semester_id: App.semester.id, class_id: st.class_id, final: !all });
          toast(all ? 'Finalisasi dibuka' : 'Rapor kelas difinalkan', 'success');
          return App.refresh();
        }
      }
    } catch (er) { errorToast(er); }
  });
}

async function reportSettings(sem) {
  const { types } = await get('/assessment-types' + qs({ semester_id: App.semester.id }));
  const topts = types.map(t => ({ value: t.id, label: t.name }));
  formModal({
    title: 'Pengaturan Rapor Semester ' + App.semLabel(), size: 'lg', values: sem,
    intro: 'Jenis penilaian yang dipilih menjadi <b>Nilai Akhir</b> setiap mata pelajaran pada rapor. Pastikan lembar nilainya sudah dikunci agar rapor tidak berubah.',
    fields: [
      { name: 'report_assessment_type_id', label: 'Nilai akhir rapor', type: 'select', placeholder: '(belum diatur)', options: topts, required: true, full: true },
      { name: 'mid_assessment_type_id', label: 'Laporan tengah semester', type: 'select', placeholder: '(sama dengan rapor)', options: topts },
      { name: 'skill_assessment_type_id', label: 'Nilai keterampilan (format K13 terpisah)', type: 'select', placeholder: '(tidak dipakai)', options: topts },
      { name: 'report_place', label: 'Tempat', placeholder: 'Basaan' }, { name: 'report_date', label: 'Tanggal rapor', placeholder: '20 Desember 2026' }
    ],
    onSubmit: async v => { await put('/semesters/' + App.semester.id, v); toast('Pengaturan rapor disimpan', 'success'); await App.reloadBoot(); App.refresh(); }
  });
}

// ===================== ISIAN WALI KELAS (ADMIN) =====================
export async function isianPage(el, params) {
  const classes = await refs.classes();
  if (!classes.length) { el.innerHTML = '<div class="card card-body">Belum ada kelas.</div>'; return; }
  const cid = classes.some(c => c.id === (params.class_id || remember('isian'))) ? (params.class_id || remember('isian')) : classes[0].id;
  remember('isian', cid);
  const c = classes.find(x => x.id === cid);
  el.innerHTML = pageHead('Kehadiran & Isian Wali Kelas', `${esc(App.semLabel())} · Admin dapat melihat & melengkapi isian semua kelas.`,
    `<a class="btn" href="#impor?entity=attendance">${icon('upload')}Impor kehadiran (Excel/CSV)</a>`) + `
    <div class="card mb-2"><div class="card-body"><div class="filters"><div class="field"><label>Kelas</label><select id="i-c">${opt(classes, 'id', c2 => `${c2.name}${c2.homeroom_name ? ' · ' + c2.homeroom_name : ''}`, cid)}</select></div></div></div></div>
    <div class="card"><div class="card-body" id="i-body">${loadingBlock()}</div></div>`;
  $('#i-c', el).onchange = e => App.go('isian?class_id=' + e.target.value);
  await mountWali($('#i-body', el), { classId: cid, semesterId: App.semester.id, isAdmin: true, className: c.name });
}

// ===================== DESKRIPSI MAPEL (ADMIN) =====================
export async function deskripsiAdminPage(el, params) {
  const [classes, subjects] = await Promise.all([refs.classes(), refs.subjects()]);
  const act = subjects.filter(s => s.active);
  const last = remember('desk') || {};
  const cid = classes.some(c => c.id === (params.class_id || last.class_id)) ? (params.class_id || last.class_id) : classes[0] && classes[0].id;
  const sid = act.some(s => s.id === (params.subject_id || last.subject_id)) ? (params.subject_id || last.subject_id) : act[0] && act[0].id;
  el.innerHTML = pageHead('Deskripsi Rapor per Mapel', 'Biasanya diisi guru mapel. Admin dapat memeriksa dan melengkapi.') + `
    <div class="card mb-2"><div class="card-body"><div class="filters"><div class="field"><label>Kelas</label><select id="d-c">${opt(classes, 'id', 'name', cid)}</select></div><div class="field"><label>Mapel</label><select id="d-s">${opt(act, 'id', 'name', sid)}</select></div></div></div></div>
    <div class="card"><div class="card-body" id="d-body"></div></div>`;
  const go = () => App.go(`deskripsi?class_id=${$('#d-c', el).value}&subject_id=${$('#d-s', el).value}`);
  $('#d-c', el).onchange = go; $('#d-s', el).onchange = go;
  if (!cid || !sid) return;
  remember('desk', { class_id: cid, subject_id: sid });
  await mountDeskripsi($('#d-body', el), { semesterId: App.semester.id, subjectId: sid, classId: cid });
}

// ===================== PENGAMBILAN RAPOR =====================
export async function pickupPage(el) {
  let d = await get('/pickups' + qs({ semester_id: App.semester.id }));
  const classes = [...new Set(d.rows.map(r => r.class_name))];
  const rows = () => d.rows.map(r => ({ ...r, status: r.status || 'Belum' }));
  const count = () => { const r = rows(); return { sudah: r.filter(x => x.status === 'Sudah').length, total: r.length }; };
  const c0 = count();
  el.innerHTML = pageHead('Pengambilan Rapor', `${esc(App.semLabel())} · Catat siswa/orang tua yang mengambil rapor.`,
    `<button class="btn" id="p-wa">${icon('copy')}Pengumuman WA (belum ambil)</button><button class="btn" id="p-print">${icon('printer')}Cetak</button><button class="btn" id="p-xls">${icon('download')}Excel</button>`) + `
    <div class="stats"><div class="stat"><div class="stat-icon green">${icon('checkCircle', 'icon-lg')}</div><div><div class="stat-value" id="p-s">${c0.sudah}</div><div class="stat-label">Sudah mengambil</div></div></div>
      <div class="stat"><div class="stat-icon red">${icon('alert', 'icon-lg')}</div><div><div class="stat-value" id="p-b">${c0.total - c0.sudah}</div><div class="stat-label">Belum mengambil</div></div></div></div>
    <div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { d = await get('/pickups' + qs({ semester_id: App.semester.id })); dt.setRows(rows()); const c = count(); $('#p-s', el).textContent = c.sudah; $('#p-b', el).textContent = c.total - c.sudah; };
  const mark = async (list, form = {}) => { await put('/pickups', { semester_id: App.semester.id, rows: list.map(r => ({ student_id: r.student_id, status: 'Sudah', picker_name: form.picker_name || r.parent_name || 'Orang tua/wali', relation: form.relation || 'Orang tua', phone: form.phone || r.parent_phone || '', note: form.note || '' })) }); toast(`${list.length} siswa ditandai sudah mengambil`, 'success'); await reload(); };
  const dt = new DataTable($('#tbl', el), {
    rows: rows(), rowKey: 'student_id', selectable: true, pageSize: 50, searchKeys: ['name', 'nisn', 'picker_name'], searchPlaceholder: 'Cari nama / NISN lalu Enter...',
    filters: [{ key: 'class_name', label: 'Kelas', options: classes.map(v => ({ value: v, label: v })) }, { key: 'status', label: 'Status', options: [{ value: 'Sudah', label: 'Sudah' }, { value: 'Belum', label: 'Belum' }] }],
    toolbar: `<button class="btn btn-sm btn-success" id="p-bulk" disabled>${icon('check', 'icon-sm')}Tandai terpilih sudah ambil</button>`,
    columns: [
      { key: 'class_name', label: 'Kelas' }, { key: 'name', label: 'Nama Siswa', render: r => `<b>${esc(r.name)}</b><div class="soft mono" style="font-size:11px">${esc(r.nisn || '')}</div>` },
      { key: 'status', label: 'Status', render: r => r.status === 'Sudah' ? '<span class="badge green">Sudah</span>' : '<span class="badge red">Belum</span>' },
      { key: 'picked_at', label: 'Waktu', render: r => r.picked_at ? fmtDate(r.picked_at, true) : '' },
      { key: 'picker_name', label: 'Pengambil', render: r => esc([r.picker_name, r.relation].filter(Boolean).join(' · ')) },
      { key: 'phone', label: 'No. HP' },
      { label: '', sortable: false, cls: 'actions', render: r => r.status === 'Sudah' ? `<button class="btn btn-xs" data-act="edit">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs" data-act="slip">${icon('printer', 'icon-sm')}Tanda terima</button><button class="btn btn-xs btn-danger btn-icon" data-act="undo" title="Batalkan">${icon('undo', 'icon-sm')}</button>` : `<button class="btn btn-xs btn-success" data-act="quick">${icon('check', 'icon-sm')}Cepat</button><button class="btn btn-xs" data-act="edit">${icon('edit', 'icon-sm')}Detail</button>` }
    ],
    onSelect: ids => { $('#p-bulk', el).disabled = !ids.length; },
    onAction: async (a, r) => {
      try {
        if (a === 'quick') await mark([r]);
        if (a === 'undo') { if (await confirmDialog('Batalkan catatan pengambilan ' + r.name + '?')) { await post('/pickups/delete', { semester_id: App.semester.id, student_ids: [r.student_id] }); await reload(); } }
        if (a === 'slip') printHtml(slipHtml(r), { paper: 'A4', title: 'Tanda terima rapor' });
        if (a === 'edit') formModal({
          title: 'Pengambilan Rapor: ' + r.name, values: { picker_name: r.picker_name || r.parent_name || '', relation: r.relation || 'Orang tua', phone: r.phone || r.parent_phone || '', note: r.note || '' },
          fields: [{ name: 'picker_name', label: 'Nama pengambil', required: true }, { name: 'relation', label: 'Hubungan', type: 'select', options: ['Orang tua', 'Ayah', 'Ibu', 'Wali', 'Kakak', 'Siswa sendiri', 'Lainnya'].map(v => ({ value: v, label: v })) }, { name: 'phone', label: 'No. HP' }, { name: 'note', label: 'Catatan', type: 'textarea', full: true }],
          onSubmit: async f => mark([r], f)
        });
      } catch (e) { errorToast(e); }
    }
  });
  const search = el.querySelector('.toolbar input[type=search]');
  search.addEventListener('keydown', async e => { if (e.key === 'Enter') { const m = dt.filtered().filter(r => r.status !== 'Sudah'); if (m.length === 1) { await mark(m); search.value = ''; search.dispatchEvent(new Event('input')); } else if (m.length > 1) toast(`${m.length} siswa cocok, perjelas pencarian`, 'info'); } });
  $('#p-bulk', el).onclick = async () => { const sel = rows().filter(r => dt.selected.has(r.student_id) && r.status !== 'Sudah'); if (sel.length) { await mark(sel); dt.clearSelection(); } };
  $('#p-wa', el).onclick = () => {
    const belum = dt.filtered().filter(r => r.status !== 'Sudah');
    const byC = {};
    belum.forEach(r => { (byC[r.class_name] = byC[r.class_name] || []).push(r.name); });
    copyText(`*PENGUMUMAN PENGAMBILAN RAPOR*\n${App.settings.nama_sekolah} · ${App.semLabel()}\n\nSiswa yang rapornya belum diambil:\n` + Object.entries(byC).map(([c, l]) => `\n*Kelas ${c}*\n${l.map((n, i) => `${i + 1}. ${n}`).join('\n')}`).join('\n') + '\n\nMohon orang tua/wali segera mengambil rapor di sekolah. Terima kasih.');
  };
  $('#p-xls', el).onclick = () => exportWorkbook('Pengambilan_Rapor.xlsx', [{ name: 'Pengambilan', title: 'PENGAMBILAN RAPOR', subtitle: App.semLabel(), headers: ['Kelas', 'NISN', 'Nama', 'Status', 'Waktu', 'Pengambil', 'Hubungan', 'No HP', 'Catatan', 'Petugas'], rows: dt.filtered().map(r => [r.class_name, r.nisn || '', r.name, r.status, r.picked_at || '', r.picker_name || '', r.relation || '', r.phone || '', r.note || '', r.officer || '']), textCols: [1, 7], widths: [8, 13, 30, 8, 18, 22, 12, 14, 24, 18], highlight: (ri, c, v) => (c === 3 ? (v === 'Sudah' ? 'DCFCE7' : 'FEE2E2') : null) }]);
  $('#p-print', el).onclick = () => openModal({
    title: 'Cetak Pengambilan Rapor', size: 'sm',
    body: `<div class="field mb-2"><label>Jenis cetakan</label><select id="pc-k"><option value="lap">Laporan (sesuai filter)</option><option value="ttd">Daftar tanda tangan per kelas</option><option value="rekap">Rekap per kelas</option></select></div>`,
    buttons: [{ label: 'Batal' }, { label: 'Cetak', class: 'btn-primary', onClick: m => printPickup($('#pc-k', m.body).value, dt.filtered(), rows()) }]
  });
}

function slipHtml(r) {
  const s = App.settings;
  return `<div class="sheet-page">${kopHtml(s, { small: true })}<div class="rep-title">TANDA TERIMA RAPOR</div><div class="rep-sub">${esc(App.semLabel())}</div>
    <table class="r-ident" style="font-size:11pt;margin-top:14px"><tr><td class="l">Nama siswa</td><td>: <b>${esc(r.name)}</b></td></tr><tr><td class="l">Kelas</td><td>: ${esc(r.class_name)}</td></tr><tr><td class="l">NISN</td><td>: ${esc(r.nisn || '-')}</td></tr>
    <tr><td class="l">Diambil oleh</td><td>: ${esc(r.picker_name || '')} (${esc(r.relation || '')})</td></tr><tr><td class="l">Waktu</td><td>: ${fmtDate(r.picked_at, true)}</td></tr><tr><td class="l">No. HP</td><td>: ${esc(r.phone || '-')}</td></tr></table>
    <table class="sign"><tr><td>Yang menerima<div class="sign-space"></div><b>${esc(r.picker_name || '')}</b></td><td>Petugas<div class="sign-space"></div><b>${esc(r.officer || App.user.full_name)}</b></td></tr></table></div>`;
}

function printPickup(kind, filtered, all) {
  const s = App.settings;
  const head = t => `${kopHtml(s, { small: true })}<div class="rep-title">${t}</div><div class="rep-sub">${esc(App.semLabel())}</div>`;
  let html = '';
  if (kind === 'lap') html = `<div class="sheet-page">${head('LAPORAN PENGAMBILAN RAPOR')}<table class="rep-tbl"><thead><tr><th>No</th><th>Kelas</th><th>Nama</th><th>Status</th><th>Waktu</th><th>Pengambil</th><th>Hubungan</th></tr></thead><tbody>${filtered.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.class_name)}</td><td class="l">${esc(r.name)}</td><td>${r.status}</td><td>${r.picked_at ? fmtDate(r.picked_at, true) : ''}</td><td class="l">${esc(r.picker_name || '')}</td><td>${esc(r.relation || '')}</td></tr>`).join('')}</tbody></table></div>`;
  if (kind === 'ttd') {
    const byC = {};
    filtered.forEach(r => { (byC[r.class_name] = byC[r.class_name] || []).push(r); });
    html = Object.entries(byC).map(([c, l], ci) => `${ci ? '<div class="page-break"></div>' : ''}<div class="sheet-page">${head('DAFTAR TANDA TANGAN PENGAMBILAN RAPOR · KELAS ' + esc(c))}<table class="rep-tbl"><thead><tr><th>No</th><th>Nama Siswa</th><th>Nama Pengambil</th><th>Tanggal</th><th style="width:30%">Tanda Tangan</th></tr></thead><tbody>${l.map((r, i) => `<tr style="height:9mm"><td>${i + 1}</td><td class="l">${esc(r.name)}</td><td class="l">${esc(r.picker_name || '')}</td><td>${r.picked_at ? fmtDate(r.picked_at) : ''}</td><td style="text-align:${i % 2 ? 'right' : 'left'}">${i + 1}. ....................</td></tr>`).join('')}</tbody></table>${signatureHtml(s, {})}</div>`).join('');
  }
  if (kind === 'rekap') {
    const byC = {};
    all.forEach(r => { const x = byC[r.class_name] = byC[r.class_name] || { total: 0, sudah: 0 }; x.total++; if (r.status === 'Sudah') x.sudah++; });
    html = `<div class="sheet-page">${head('REKAP PENGAMBILAN RAPOR PER KELAS')}<table class="rep-tbl"><thead><tr><th>Kelas</th><th>Jumlah Siswa</th><th>Sudah</th><th>Belum</th><th>Persentase</th></tr></thead><tbody>${Object.entries(byC).map(([c, x]) => `<tr><td>${esc(c)}</td><td>${x.total}</td><td>${x.sudah}</td><td>${x.total - x.sudah}</td><td>${fmtNum((x.sudah / x.total) * 100, 1)}%</td></tr>`).join('')}</tbody></table></div>`;
  }
  printHtml(html, { paper: 'A4', title: 'Pengambilan rapor' });
}
