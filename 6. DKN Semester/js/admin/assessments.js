// Pengaturan penilaian: jenis penilaian, kategori & bobot, sumber nilai, predikat & KKTP.
import { get, post, put, del, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, formModal, confirmDialog, openModal, fmtDate, fmtNum, $, $$, busy, emptyBlock } from '../ui.js';
import { refs, invalidate, opt, KIND_LABEL, SOURCE_LABEL, remember } from '../common.js';

const PALETTE = ['#16365f', '#c9a227', '#2a5a96', '#15803d', '#6d28d9', '#b45309', '#0e7490', '#be185d', '#475569', '#65a30d'];

const PRESETS = {
  kosong: { label: 'Kosong (atur sendiri)', kind: 'CUSTOM', cats: [] },
  pts: { label: 'PTS: Hasil Ujian 80% + Kehadiran 20%', kind: 'PTS', name: 'Penilaian Tengah Semester', code: 'PTS', cats: [{ name: 'Hasil Ujian', code: 'UJIAN', weight: 80 }, { name: 'Kehadiran', code: 'HADIR', weight: 20 }] },
  semester: {
    label: 'Penilaian Semester (7 komponen, MID dari PTS)', kind: 'PAS', name: 'Penilaian Akhir Semester', code: 'PAS', cats: [
      { name: 'Nilai Tugas', code: 'TGS', weight: 15 }, { name: 'Ujian Harian 1', code: 'UH1', weight: 10 }, { name: 'Ujian Harian 2', code: 'UH2', weight: 10 },
      { name: 'Ujian Harian 3', code: 'UH3', weight: 10 }, { name: 'Nilai MID', code: 'MID', weight: 20, source_type: 'assessment', fromKind: 'PTS' },
      { name: 'Ujian Tulis', code: 'UT', weight: 25 }, { name: 'Ujian Praktik', code: 'UP', weight: 10 }]
  },
  harian: { label: 'Penilaian Harian (Kuis, Tugas, Praktikum)', kind: 'PH', name: 'Penilaian Harian', code: 'PH', cats: [{ name: 'Kuis', code: 'KUIS', weight: 30 }, { name: 'Tugas', code: 'TGS', weight: 40 }, { name: 'Praktikum', code: 'PRAK', weight: 30 }] },
  pat: { label: 'PAT: Semester Ganjil 50% + Genap 50%', kind: 'PAT', name: 'Penilaian Akhir Tahun', code: 'PAT', cats: [{ name: 'Nilai Semester Ganjil', code: 'GANJIL', weight: 50, source_type: 'previous' }, { name: 'Nilai Semester Genap', code: 'GENAP', weight: 50 }] }
};

function weightBar(cats) {
  return `<div class="weight-bar">${cats.map((c, i) => `<span title="${esc(c.name)} ${fmtNum(c.weight)}%" style="width:${c.weight}%;background:${PALETTE[i % PALETTE.length]}"></span>`).join('')}</div>`;
}

// ===================== JENIS PENILAIAN =====================
export async function typesPage(el) {
  const { types } = await get('/assessment-types' + qs({ semester_id: App.semester.id }));
  const sem = App.semesters.find(s => s.id === App.semester.id) || {};
  el.innerHTML = pageHead('Jenis Penilaian', `${esc(App.semLabel())} · Setiap jenis penilaian memiliki kategori & bobot sendiri.`,
    `<button class="btn" id="copy">${icon('copy')}Salin dari semester lain</button><button class="btn btn-primary" id="add">${icon('plus')}Tambah Jenis Penilaian</button>`) +
    (!sem.report_assessment_type_id && types.length ? `<div class="alert warn">${icon('alert')}<div>Nilai akhir rapor semester ini belum ditentukan. Atur di <a href="#tahun">Tahun Pelajaran › Atur</a> atau menu Cetak Rapor.</div></div>` : '') +
    `<div class="grid grid-2" id="list"></div>`;
  const list = $('#list', el);
  list.innerHTML = types.length ? types.map(t => {
    const ok = Math.abs(t.weight_total - 100) < 0.001;
    const isReport = sem.report_assessment_type_id === t.id;
    return `<div class="card"><div class="card-head"><div><h3>${icon('layers')} ${esc(t.name)}</h3>
        <div class="flex gap-1 mt-1 flex-wrap"><span class="badge navy">${esc(KIND_LABEL[t.kind] || t.kind)}</span>${t.code ? `<span class="badge gray">${esc(t.code)}</span>` : ''}
        ${t.active ? '' : '<span class="badge gray">Nonaktif</span>'}${t.input_open ? '<span class="badge green">Input dibuka</span>' : '<span class="badge red">Input ditutup</span>'}
        ${isReport ? '<span class="badge gold">Nilai rapor</span>' : ''}${t.locked_sheets ? `<span class="badge green">${t.locked_sheets} dikunci</span>` : ''}${t.submitted_sheets ? `<span class="badge purple">${t.submitted_sheets} terkirim</span>` : ''}</div></div>
        <button class="btn btn-sm btn-ghost btn-icon" data-menu="${t.id}" aria-label="Menu">${icon('menu')}</button></div>
      <div class="card-body">
        <div class="muted mb-2" style="font-size:12.5px">${icon('calendar', 'icon-sm')} Periode input: ${t.start_date ? fmtDate(t.start_date) : 'bebas'} – ${t.end_date ? fmtDate(t.end_date) : 'tidak dibatasi'} · ${t.decimals} desimal · ${{ round: 'pembulatan biasa', floor: 'bulat ke bawah', ceil: 'bulat ke atas' }[t.rounding]}${t.require_complete ? ' · wajib lengkap' : ''}</div>
        ${t.categories.length ? weightBar(t.categories) : ''}
        <ul class="list-plain mt-1" style="font-size:13px">${t.categories.map((c, i) => `<li><span class="dot-status" style="color:${PALETTE[i % PALETTE.length]}"></span><span class="grow">${esc(c.name)}${c.source_type !== 'manual' ? ` <span class="badge blue" title="${esc(SOURCE_LABEL[c.source_type])}">${icon('link', 'icon-sm')}${esc(c.source_type_name || '')}${c.source_category_name ? ' › ' + esc(c.source_category_name) : ''} · ${c.sync_mode === 'copy' ? 'salin' : 'otomatis'}</span>` : ''}${c.required ? '' : ' <span class="soft">(opsional)</span>'}</span><b>${fmtNum(c.weight)}%</b></li>`).join('') || `<li class="muted">Belum ada kategori.</li>`}</ul>
        <div class="flex between mt-2"><span class="${ok ? 'badge green' : 'badge red'}">Total bobot ${fmtNum(t.weight_total)}%</span>
          <div class="btn-group"><a class="btn btn-sm" href="#kategori?type_id=${t.id}">${icon('sliders', 'icon-sm')}Atur kategori & bobot</a><a class="btn btn-sm" href="#monitoring?type_id=${t.id}">${icon('monitor', 'icon-sm')}Monitoring</a></div></div>
      </div></div>`;
  }).join('') : `<div class="card span-all">${emptyBlock('Belum ada jenis penilaian', 'Tambahkan PTS, Penilaian Semester, atau penilaian custom.', 'layers')}</div>`;

  list.addEventListener('click', e => {
    const b = e.target.closest('[data-menu]');
    if (!b) return;
    e.stopPropagation();
    $$('.dropdown').forEach(d => d.remove());
    const t = types.find(x => x.id === b.dataset.menu);
    const dd = document.createElement('div');
    dd.className = 'dropdown';
    dd.innerHTML = [
      ['edit', 'edit', 'Ubah informasi & periode'], ['input', t.input_open ? 'lock' : 'unlock', t.input_open ? 'Tutup penginputan' : 'Buka penginputan'],
      ['dup', 'copy', 'Duplikasi (kategori & bobot)'], ['sync', 'refresh', 'Sinkronkan sumber nilai (mode salin)'],
      ['lockSub', 'checkCircle', 'Kunci semua yang terkirim'], ['lockAll', 'lock', 'Kunci SEMUA lembar'], ['report', 'file', 'Jadikan nilai akhir rapor'], ['del', 'trash', 'Hapus']
    ].map(([k, ic, l]) => `<div class="dd-item" data-k="${k}"${k === 'del' ? ' style="color:var(--danger)"' : ''}>${icon(ic)} ${l}</div>`).join('');
    b.parentElement.style.position = 'relative';
    b.parentElement.appendChild(dd);
    dd.onclick = ev => { const k = ev.target.closest('[data-k]'); if (k) { dd.remove(); typeAction(k.dataset.k, t, types); } };
  });
  $('#add', el).onclick = () => createType(types);
  $('#copy', el).onclick = () => openModal({
    title: 'Salin Konfigurasi Penilaian', size: 'sm',
    body: `<p class="muted">Seluruh jenis penilaian beserta kategori, bobot, dan sumber nilai disalin ke <b>${esc(App.semLabel())}</b>. Sumber nilai dipetakan ke penilaian hasil salinan. Nilai siswa tidak ikut disalin.</p>
      <div class="field"><label>Dari semester</label><select id="cf">${App.semesters.filter(s => s.id !== App.semester.id).map(s => `<option value="${s.id}">${esc(App.semLabel(s))}</option>`).join('')}</select></div>`,
    buttons: [{ label: 'Batal' }, { label: 'Salin', class: 'btn-primary', onClick: async m => { const r = await post('/assessment-types/copy-semester', { from_semester_id: $('#cf', m.body).value, to_semester_id: App.semester.id }); toast(`${r.copied} jenis penilaian disalin${r.skipped ? `, ${r.skipped} dilewati (nama sudah ada)` : ''}`, 'success'); invalidate('types'); await App.reloadBoot(); App.refresh(); } }]
  });
}

const typeFields = [
  { name: 'name', label: 'Nama penilaian', required: true, full: true },
  { name: 'kind', label: 'Jenis', type: 'select', options: Object.entries(KIND_LABEL).map(([value, label]) => ({ value, label: `${value} - ${label}` })) },
  { name: 'code', label: 'Kode singkat', placeholder: 'PTS' },
  { name: 'start_date', label: 'Mulai input', type: 'date' }, { name: 'end_date', label: 'Batas akhir input', type: 'date' },
  { name: 'decimals', label: 'Jumlah desimal nilai akhir', type: 'select', options: [0, 1, 2, 3].map(v => ({ value: v, label: String(v) })) },
  { name: 'rounding', label: 'Pembulatan', type: 'select', options: [{ value: 'round', label: 'Biasa (≥ 0,5 ke atas)' }, { value: 'floor', label: 'Selalu ke bawah' }, { value: 'ceil', label: 'Selalu ke atas' }] },
  { name: 'description', label: 'Deskripsi', type: 'textarea', full: true, rows: 2 },
  { name: 'require_complete', label: 'Nilai akhir hanya dihitung bila semua komponen wajib terisi', type: 'switch', full: true, help: 'Jika dimatikan, nilai akhir sementara dihitung dari komponen yang sudah terisi (nilai kosong tidak dianggap nol).' },
  { name: 'active', label: 'Aktif', type: 'switch' }, { name: 'input_open', label: 'Penginputan dibuka', type: 'switch' }
];

function createType(types) {
  const presetOpts = Object.entries(PRESETS).map(([value, p]) => ({ value, label: p.label }));
  formModal({
    title: 'Tambah Jenis Penilaian', size: 'lg', values: { decimals: 2, rounding: 'round', active: 1, input_open: 1, kind: 'CUSTOM', preset: 'kosong' },
    fields: [{ name: 'preset', label: 'Mulai dari templat', type: 'select', options: presetOpts, full: true, help: 'Kategori & bobot tetap dapat diubah setelah dibuat.' }, ...typeFields],
    onSubmit: async d => {
      const p = PRESETS[d.preset] || PRESETS.kosong;
      if (d.preset !== 'kosong') { d.kind = d.kind === 'CUSTOM' ? p.kind : d.kind; if (!d.code) d.code = p.code; }
      const cats = p.cats.map(c => {
        if (!c.source_type) return c;
        const src = c.source_type === 'assessment' ? types.find(t => t.kind === c.fromKind) : null;
        if (c.source_type === 'assessment' && src) return { ...c, source: { assessment_type_id: src.id, sync_mode: 'live' } };
        return { name: c.name, code: c.code, weight: c.weight };
      });
      d.decimals = Number(d.decimals);
      const r = await post('/assessment-types', { ...d, semester_id: App.semester.id, categories: cats });
      toast('Jenis penilaian dibuat', 'success');
      invalidate('types');
      App.go('kategori?type_id=' + r.id);
    }
  });
  setTimeout(() => {
    const sel = document.querySelector('[name="preset"]');
    if (sel) sel.onchange = () => {
      const p = PRESETS[sel.value];
      const name = document.querySelector('[name="name"]'), code = document.querySelector('[name="code"]'), kind = document.querySelector('[name="kind"]');
      if (p.name && !name.value) name.value = p.name;
      if (p.code && !code.value) code.value = p.code;
      kind.value = p.kind;
    };
  }, 80);
}

async function typeAction(k, t, types) {
  try {
    if (k === 'edit') return formModal({
      title: 'Ubah Jenis Penilaian', size: 'lg', values: t, fields: typeFields,
      onSubmit: async d => { d.decimals = Number(d.decimals); await put('/assessment-types/' + t.id, d); toast('Disimpan', 'success'); invalidate('types'); App.refresh(); }
    });
    if (k === 'input') { await post(`/assessment-types/${t.id}/input`, { open: !t.input_open }); toast(t.input_open ? 'Penginputan ditutup' : 'Penginputan dibuka', 'success'); invalidate('types'); return App.refresh(); }
    if (k === 'dup') return openModal({
      title: 'Duplikasi Jenis Penilaian', size: 'sm',
      body: `<div class="field mb-2"><label>Nama baru</label><input id="dn" value="${esc(t.name)} (Salinan)"></div><div class="field"><label>Ke semester</label><select id="ds">${App.semesters.map(s => `<option value="${s.id}"${s.id === App.semester.id ? ' selected' : ''}>${esc(App.semLabel(s))}</option>`).join('')}</select></div>`,
      buttons: [{ label: 'Batal' }, { label: 'Duplikasi', class: 'btn-primary', onClick: async m => { await post(`/assessment-types/${t.id}/duplicate`, { name: $('#dn', m.body).value, semester_id: $('#ds', m.body).value }); toast('Diduplikasi', 'success'); invalidate('types'); App.refresh(); } }]
    });
    if (k === 'sync') { const r = await post(`/assessment-types/${t.id}/sync`); return toast(`${r.updated} nilai diperbarui dari sumber`, 'success'); }
    if (k === 'lockSub' || k === 'lockAll') {
      if (!(await confirmDialog(k === 'lockAll' ? `Kunci SEMUA lembar nilai "${t.name}" (sesuai pembagian tugas), termasuk yang belum lengkap?` : `Kunci semua lembar "${t.name}" yang sudah dikirim guru?`))) return;
      const r = await post(`/assessment-types/${t.id}/lock-all`, { only_submitted: k === 'lockSub' });
      toast(`${r.locked} lembar dikunci`, 'success'); return App.refresh();
    }
    if (k === 'report') { await put('/semesters/' + App.semester.id, { report_assessment_type_id: t.id }); toast(`"${t.name}" menjadi nilai akhir rapor`, 'success'); await App.reloadBoot(); return App.refresh(); }
    if (k === 'del') {
      if (!(await confirmDialog(`Hapus jenis penilaian "${t.name}"?`, { danger: true }))) return;
      try { await del('/assessment-types/' + t.id); }
      catch (e) {
        if (e.status === 409 && /Konfirmasi/.test(e.message)) {
          if (!(await confirmDialog(e.message + ' Semua nilai pada penilaian ini akan ikut terhapus.', { danger: true, okText: 'Hapus beserta nilai' }))) return;
          await del('/assessment-types/' + t.id + '?force=1');
        } else throw e;
      }
      toast('Dihapus', 'success'); invalidate('types'); await App.reloadBoot(); App.refresh();
    }
  } catch (e) { errorToast(e); }
}

// ===================== KATEGORI, BOBOT, SUMBER =====================
export async function configPage(el, params, mode) {
  const { types } = await get('/assessment-types' + qs({ semester_id: App.semester.id }));
  if (!types.length) { el.innerHTML = pageHead('Kategori & Bobot Penilaian') + `<div class="card">${emptyBlock('Belum ada jenis penilaian', '<a href="#jenis">Buat jenis penilaian</a> terlebih dahulu.', 'layers')}</div>`; return; }
  const typeId = params.type_id && types.some(t => t.id === params.type_id) ? params.type_id : (remember('cfg-type') && types.some(t => t.id === remember('cfg-type')) ? remember('cfg-type') : types[0].id);
  remember('cfg-type', typeId);
  const t = await get('/assessment-types/' + typeId);
  const sources = (await get('/assessment-types/source-options')).filter(x => x.id !== typeId);
  const titles = { kategori: ['Kategori Penilaian', 'Tambah, hapus, ubah nama, dan urutan kategori.'], bobot: ['Bobot Penilaian', 'Total bobot semua kategori harus 100%.'], sumber: ['Sumber Nilai', 'Kategori dapat mengambil nilai otomatis dari penilaian lain.'] };
  let cats = t.categories.map(c => ({
    id: c.id, name: c.name, code: c.code || '', weight: c.weight, required: !!c.required, source_type: c.source_type,
    source: c.source_type !== 'manual' ? { assessment_type_id: c.source_assessment_type_id, category_id: c.source_category_id, sync_mode: c.sync_mode, only_locked: !!c.only_locked } : null
  }));
  const locked = types.find(x => x.id === typeId).locked_sheets;
  el.innerHTML = pageHead(titles[mode][0], titles[mode][1], `<a class="btn" href="#jenis">${icon('layers')}Jenis Penilaian</a>`) + `
    <div class="card mb-2"><div class="card-body"><div class="filters"><div class="field" style="min-width:280px"><label>Jenis penilaian</label><select id="tsel">${opt(types, 'id', 'name', typeId)}</select></div>
      <div class="grow muted" style="font-size:12.5px;align-self:center">${esc(t.year_name)} ${esc(t.semester_name)} · ${t.decimals} desimal${t.used_as_source_by.length ? ` · Dipakai sebagai sumber oleh: <b>${t.used_as_source_by.map(x => esc(x.name)).join(', ')}</b>` : ''}</div></div>
      ${locked ? `<div class="alert warn mt-2 mb-0">${icon('lock')}<div>${locked} lembar nilai sudah dikunci. Lembar terkunci memakai snapshot sehingga tidak terpengaruh perubahan bobot.</div></div>` : ''}</div></div>
    <div class="grid" style="grid-template-columns:minmax(0,2.3fr) minmax(260px,1fr)" id="cfg-grid">
      <div class="card"><div class="card-head"><h3>${icon('sliders')} Komponen Penilaian</h3><div class="btn-group"><button class="btn btn-sm" id="even">${icon('percent', 'icon-sm')}Bagi rata</button><button class="btn btn-sm" id="addc">${icon('plus', 'icon-sm')}Tambah kategori</button></div></div>
        <div class="card-body"><div class="cat-head"><span></span><span>Nama kategori</span><span>Singkatan</span><span>Bobot %</span><span>Wajib</span><span>Sumber nilai</span><span></span></div><div id="rows"></div>
        <div class="flex between mt-2 flex-wrap gap-2"><div class="grow" style="max-width:420px"><div id="wbar"></div><div class="mt-1" id="wtot"></div></div><button class="btn btn-primary" id="save">${icon('save')}Simpan Konfigurasi</button></div></div></div>
      <div class="card"><div class="card-head"><h3>${icon('zap')} Simulasi Perhitungan</h3></div><div class="card-body" id="sim"></div></div>
    </div>`;
  if (window.innerWidth < 1100) $('#cfg-grid', el).style.gridTemplateColumns = 'minmax(0,1fr)';
  $('#tsel', el).onchange = e => App.go(`${App.page}?type_id=${e.target.value}`);

  const srcOptions = (c) => {
    const st = c.source_type;
    const pool = sources.filter(s => st === 'assessment' ? s.semester_id === t.semester_id : st === 'previous' ? s.semester_id !== t.semester_id : true);
    const src = c.source || {};
    const selType = pool.find(s => s.id === src.assessment_type_id);
    return `<select class="input-sm" data-f="src_type"><option value="">— pilih penilaian sumber —</option>${pool.map(s => `<option value="${s.id}"${s.id === src.assessment_type_id ? ' selected' : ''}>${esc(s.name)} (${esc(s.year_name)} ${esc(s.semester_name)})</option>`).join('')}</select>
      ${st === 'category' ? `<select class="input-sm mt-1" data-f="src_cat"><option value="">— pilih kategori —</option>${(selType ? selType.categories : []).map(k => `<option value="${k.id}"${k.id === src.category_id ? ' selected' : ''}>${esc(k.name)}</option>`).join('')}</select>` : ''}
      <div class="flex gap-2 mt-1 flex-wrap" style="font-size:12px"><label class="check"><input type="radio" name="sm-${c._k}" data-f="mode" value="live"${src.sync_mode !== 'copy' ? ' checked' : ''}> Ikuti otomatis</label><label class="check"><input type="radio" name="sm-${c._k}" data-f="mode" value="copy"${src.sync_mode === 'copy' ? ' checked' : ''}> Salin (nilai tetap)</label><label class="check" title="Hanya ambil nilai yang sudah dikunci admin"><input type="checkbox" data-f="only_locked"${src.only_locked ? ' checked' : ''}> Hanya yang dikunci</label></div>`;
  };
  let seq = 0;
  cats.forEach(c => { c._k = ++seq; });
  function render() {
    $('#rows', el).innerHTML = cats.map((c, i) => `<div class="cat-row ${c.source_type !== 'manual' ? 'auto' : ''}" data-i="${i}">
      <span class="handle flex-col"><button class="btn btn-xs btn-ghost btn-icon" data-mv="-1" title="Naik"${i === 0 ? ' disabled' : ''}>${icon('arrowUp', 'icon-sm')}</button><button class="btn btn-xs btn-ghost btn-icon" data-mv="1" title="Turun"${i === cats.length - 1 ? ' disabled' : ''}>${icon('arrowDown', 'icon-sm')}</button></span>
      <input class="input-sm name" data-f="name" value="${esc(c.name)}" placeholder="Nama kategori">
      <input class="input-sm" data-f="code" value="${esc(c.code)}" placeholder="Kode" maxlength="15">
      <input class="input-sm" data-f="weight" type="number" min="0" max="100" step="0.01" value="${c.weight}">
      <label class="check" style="justify-content:center"><input type="checkbox" data-f="required"${c.required ? ' checked' : ''}></label>
      <div class="src"><select class="input-sm" data-f="source_type">${Object.entries(SOURCE_LABEL).map(([v, l]) => `<option value="${v}"${v === c.source_type ? ' selected' : ''}>${esc(l)}</option>`).join('')}</select>${c.source_type !== 'manual' ? `<div class="mt-1">${srcOptions(c)}</div>` : ''}</div>
      <button class="btn btn-xs btn-icon btn-danger" data-del title="Hapus kategori">${icon('trash', 'icon-sm')}</button></div>`).join('') || `<div class="muted center" style="padding:20px">Belum ada kategori. Klik "Tambah kategori".</div>`;
    totals();
    sim();
  }
  function totals() {
    const tot = Math.round(cats.reduce((a, c) => a + (Number(c.weight) || 0), 0) * 1000) / 1000;
    $('#wbar', el).innerHTML = weightBar(cats.map(c => ({ ...c, weight: Number(c.weight) || 0 })));
    $('#wtot', el).innerHTML = Math.abs(tot - 100) < 0.001 ? `<span class="badge green">${icon('check', 'icon-sm')} Total bobot 100%</span>` : `<span class="badge red">${icon('alert', 'icon-sm')} Total bobot ${fmtNum(tot)}% (harus 100%, selisih ${fmtNum(100 - tot)}%)</span>`;
  }
  const simVals = {};
  function sim() {
    const box = $('#sim', el);
    box.innerHTML = `<p class="muted" style="font-size:12.5px">Masukkan contoh nilai untuk melihat hasil. Nilai kosong tidak dianggap nol.</p>
      ${cats.map(c => `<div class="flex gap-2 mb-1"><span class="grow" style="font-size:13px">${esc(c.name || '?')} <span class="soft">(${fmtNum(Number(c.weight) || 0)}%)</span></span><input class="input-sm" style="width:80px;text-align:center" data-sim="${c._k}" inputmode="decimal" value="${simVals[c._k] ?? ''}"></div>`).join('')}
      <hr><div id="simres"></div>`;
    calc();
    $$('[data-sim]', box).forEach(i => i.oninput = () => { simVals[i.dataset.sim] = i.value; calc(); });
  }
  function calc() {
    let sum = 0, w = 0, missing = 0;
    const parts = [];
    cats.forEach(c => {
      const raw = simVals[c._k];
      const v = raw === undefined || String(raw).trim() === '' ? null : Number(String(raw).replace(',', '.'));
      const wt = Number(c.weight) || 0;
      if (v === null || isNaN(v)) { if (c.required) missing++; return; }
      sum += v * wt; w += wt;
      parts.push(`${fmtNum(v)} × ${fmtNum(wt)}% = ${fmtNum(v * wt / 100, 4)}`);
    });
    const d = t.decimals, f = Math.pow(10, d);
    const fin = w ? Math.round(Number(((sum / w) * f).toPrecision(12))) / f : null;
    $('#simres', el).innerHTML = `<div style="font-size:12.5px" class="muted">${parts.join('<br>') || '—'}</div>
      <div class="flex between mt-2"><b>Nilai Akhir</b><b style="font-size:22px;color:var(--primary)">${fin === null || (t.require_complete && missing) ? '–' : fmtNum(fin, d)}</b></div>
      ${missing ? `<div class="badge yellow mt-1">${missing} komponen wajib kosong → ${t.require_complete ? 'nilai tidak dihitung' : 'nilai sementara'}</div>` : ''}`;
  }
  const rowsEl = $('#rows', el);
  rowsEl.addEventListener('input', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    const c = cats[Number(row.dataset.i)];
    const f = e.target.dataset.f;
    if (f === 'name' || f === 'code') { c[f] = e.target.value; if (f === 'name') sim(); }
    if (f === 'weight') { c.weight = e.target.value; totals(); calc(); }
  });
  rowsEl.addEventListener('change', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    const c = cats[Number(row.dataset.i)];
    const f = e.target.dataset.f;
    if (f === 'required') { c.required = e.target.checked; calc(); }
    if (f === 'source_type') { c.source_type = e.target.value; c.source = c.source_type === 'manual' ? null : { sync_mode: 'live', ...(c.source || {}), category_id: null }; render(); }
    if (f === 'src_type') { c.source.assessment_type_id = e.target.value; c.source.category_id = null; render(); }
    if (f === 'src_cat') c.source.category_id = e.target.value;
    if (f === 'mode') c.source.sync_mode = e.target.value;
    if (f === 'only_locked') c.source.only_locked = e.target.checked;
  });
  rowsEl.addEventListener('click', e => {
    const row = e.target.closest('.cat-row');
    if (!row) return;
    const i = Number(row.dataset.i);
    if (e.target.closest('[data-del]')) { cats.splice(i, 1); render(); }
    const mv = e.target.closest('[data-mv]');
    if (mv) { const j = i + Number(mv.dataset.mv); [cats[i], cats[j]] = [cats[j], cats[i]]; render(); }
  });
  $('#addc', el).onclick = () => { cats.push({ _k: ++seq, name: '', code: '', weight: 0, required: true, source_type: 'manual', source: null }); render(); $$('#rows input[data-f="name"]', el).pop().focus(); };
  $('#even', el).onclick = () => {
    if (!cats.length) return;
    const base = Math.floor((100 / cats.length) * 100) / 100;
    cats.forEach(c => { c.weight = base; });
    cats[cats.length - 1].weight = Math.round((100 - base * (cats.length - 1)) * 100) / 100;
    render();
  };
  $('#save', el).onclick = e => busy(e.currentTarget, async () => {
    const payload = cats.map(c => ({ id: c.id, name: c.name.trim(), code: c.code.trim(), weight: Number(c.weight), required: c.required, source_type: c.source_type, source: c.source }));
    for (const c of payload) {
      if (!c.name) return toast('Nama kategori wajib diisi', 'warning');
      if (c.source_type !== 'manual' && !(c.source && c.source.assessment_type_id)) return toast(`Pilih penilaian sumber untuk "${c.name}"`, 'warning');
    }
    try {
      try { await put(`/assessment-types/${typeId}/categories`, { categories: payload }); }
      catch (er) {
        if (er.details && er.details.needs_confirm) {
          if (!(await confirmDialog(er.message, { danger: true, okText: 'Hapus kategori & nilainya' }))) return;
          await put(`/assessment-types/${typeId}/categories`, { categories: payload, confirm_delete: true });
        } else throw er;
      }
      toast('Konfigurasi penilaian disimpan', 'success');
      invalidate('types');
      App.refresh();
    } catch (er) { errorToast(er); }
  });
  render();
}

// ===================== PREDIKAT & KKTP =====================
export async function scalesPage(el) {
  const [scales, subjects, settings] = await Promise.all([get('/grade-scales'), get('/subjects'), get('/settings')]);
  const general = scales.filter(s => !s.subject_id).sort((a, b) => b.min_score - a.min_score);
  el.innerHTML = pageHead('Predikat dan KKTP', 'Atur batas ketuntasan (KKTP), rentang predikat, dan deskripsi otomatis tiap predikat.') + `
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>${icon('award')} KKTP Umum Sekolah</h3></div><div class="card-body">
        <div class="flex gap-2"><input type="number" id="kktp" min="0" max="100" step="0.01" value="${esc(settings.kktp_umum)}" style="max-width:140px"><button class="btn btn-primary" id="kktp-save">${icon('save')}Simpan</button></div>
        <p class="muted mt-2" style="font-size:12.5px">Dipakai untuk mapel yang tidak memiliki KKTP khusus.</p>
        <h4 class="mt-3">KKTP per mata pelajaran</h4>
        <div class="table-wrap" style="max-height:320px"><table class="tbl tbl-compact"><thead><tr><th>Mapel</th><th style="width:120px">KKTP khusus</th><th>Skala</th></tr></thead><tbody>
          ${subjects.map(s => `<tr><td>${esc(s.name)}</td><td><input class="input-sm" type="number" min="0" max="100" step="0.01" data-kktp="${s.id}" value="${s.kktp ?? ''}" placeholder="umum"></td><td>${scales.some(g => g.subject_id === s.id) ? '<span class="badge gold">khusus</span>' : '<span class="soft">umum</span>'} <button class="btn btn-xs btn-ghost" data-scale="${s.id}">${icon('edit', 'icon-sm')}</button></td></tr>`).join('')}
        </tbody></table></div></div></div>
      <div class="card"><div class="card-head"><h3>${icon('star')} Predikat Umum</h3><button class="btn btn-sm" data-scale="">${icon('edit', 'icon-sm')}Ubah</button></div><div class="card-body">
        <table class="tbl tbl-compact"><thead><tr><th>Predikat</th><th>Rentang</th><th>Sebutan</th></tr></thead><tbody>
          ${general.map(g => `<tr><td><b>${esc(g.predicate)}</b></td><td>${fmtNum(g.min_score)} – ${fmtNum(g.max_score)}</td><td>${esc(g.label || '')}</td></tr>`).join('')}</tbody></table>
        <div class="mt-2">${general.map(g => g.description ? `<div class="preview-box mb-1"><b>${esc(g.predicate)}:</b> ${esc(g.description)}</div>` : '').join('')}</div>
        <p class="muted" style="font-size:12px">Penanda deskripsi otomatis: <code>{NAMA}</code> <code>{MAPEL}</code> <code>{KATA}</code> <code>{KATA_KECIL}</code> <code>{PREDIKAT}</code></p>
      </div></div>
    </div>`;
  $('#kktp-save', el).onclick = e => busy(e.currentTarget, async () => { try { await put('/settings', { kktp_umum: $('#kktp', el).value }); App.settings.kktp_umum = $('#kktp', el).value; toast('KKTP umum disimpan', 'success'); } catch (er) { errorToast(er); } });
  $$('[data-kktp]', el).forEach(i => i.onchange = async () => {
    try { await put('/subjects/' + i.dataset.kktp, { kktp: i.value === '' ? null : Number(i.value) }); toast('KKTP disimpan', 'success'); invalidate('subjects'); } catch (er) { errorToast(er); }
  });
  el.addEventListener('click', e => {
    const b = e.target.closest('[data-scale]');
    if (b) scaleEditor(b.dataset.scale || null, scales, subjects);
  });
}

function scaleEditor(subjectId, scales, subjects) {
  let rows = scales.filter(s => (subjectId ? s.subject_id === subjectId : !s.subject_id)).sort((a, b) => b.min_score - a.min_score)
    .map(g => ({ predicate: g.predicate, min_score: g.min_score, max_score: g.max_score, label: g.label || '', description: g.description || '' }));
  if (!rows.length) rows = scales.filter(s => !s.subject_id).sort((a, b) => b.min_score - a.min_score).map(g => ({ predicate: g.predicate, min_score: g.min_score, max_score: g.max_score, label: g.label || '', description: g.description || '' }));
  const sname = subjectId ? subjects.find(s => s.id === subjectId).name : 'Umum Sekolah';
  const body = document.createElement('div');
  const draw = () => {
    body.innerHTML = `${subjectId ? `<div class="alert info">${icon('info')}<div>Skala khusus untuk <b>${esc(sname)}</b>. Hapus semua baris lalu simpan untuk kembali memakai skala umum.</div></div>` : ''}
      ${rows.map((r, i) => `<div class="fieldset" data-i="${i}"><div class="form-grid" style="grid-template-columns:80px 1fr 1fr 1.5fr 40px">
        <div class="field"><label>Predikat</label><input data-k="predicate" value="${esc(r.predicate)}"></div>
        <div class="field"><label>Nilai min</label><input data-k="min_score" type="number" step="0.01" value="${r.min_score}"></div>
        <div class="field"><label>Nilai maks</label><input data-k="max_score" type="number" step="0.01" value="${r.max_score}"></div>
        <div class="field"><label>Sebutan</label><input data-k="label" value="${esc(r.label)}" placeholder="Sangat Baik"></div>
        <div class="field"><label>&nbsp;</label><button class="btn btn-icon btn-danger" data-rm>${icon('trash', 'icon-sm')}</button></div>
        <div class="field full"><label>Deskripsi otomatis</label><textarea data-k="description" rows="2">${esc(r.description)}</textarea></div></div></div>`).join('')}
      <button class="btn btn-sm" data-add>${icon('plus', 'icon-sm')}Tambah predikat</button>`;
  };
  draw();
  body.addEventListener('input', e => { const f = e.target.closest('[data-i]'); if (f && e.target.dataset.k) rows[Number(f.dataset.i)][e.target.dataset.k] = e.target.value; });
  body.addEventListener('click', e => {
    if (e.target.closest('[data-add]')) { rows.push({ predicate: '', min_score: 0, max_score: 0, label: '', description: '' }); draw(); }
    const rm = e.target.closest('[data-rm]');
    if (rm) { rows.splice(Number(rm.closest('[data-i]').dataset.i), 1); draw(); }
  });
  openModal({
    title: 'Predikat: ' + sname, size: 'lg', body,
    buttons: [{ label: 'Batal' }, { label: 'Simpan', class: 'btn-primary', onClick: async () => {
      await put('/grade-scales', { subject_id: subjectId, items: rows.map(r => ({ ...r, min_score: Number(r.min_score), max_score: Number(r.max_score) })) });
      toast('Predikat disimpan', 'success'); invalidate('scales'); App.refresh();
    } }]
  });
}
