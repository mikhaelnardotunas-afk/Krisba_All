// =====================================================================
// LEMBAR INPUT NILAI (dipakai guru & admin)
// - Ketik langsung; Enter = turun, Shift+Enter = naik, Tab = kolom berikut, panah = pindah sel
// - Tempel blok nilai dari Excel (Ctrl+V)
// - Simpan otomatis (jeda 1,5 detik) atau tombol Simpan; indikator tersimpan
// - Bila offline / gagal: perubahan disimpan di perangkat (localStorage) dan dikirim ulang otomatis
// - Kolom menyesuaikan kategori jenis penilaian; kolom sumber otomatis hanya-baca
// =====================================================================
import { get, put, post, qs } from '../api.js';
import { icon, esc, fmtNum, toast, errorToast, openModal, confirmDialog, promptDialog, debounce, $, $$, statusBadge, busy, fmtDate, h } from '../ui.js';
import { exportWorkbook, readSpreadsheet, normHeader, downloadTemplate } from './xlsx.js';
import { round } from './describe.js';

const AUTOSAVE_MS = 1500;

function parseVal(raw) {
  const s = String(raw ?? '').trim().replace(',', '.');
  if (s === '') return { ok: true, v: null };
  if (!/^\d{1,3}(\.\d{1,2})?$/.test(s)) return { ok: false };
  const n = Number(s);
  if (n < 0 || n > 100) return { ok: false };
  return { ok: true, v: n };
}

function computeLocal(cats, values, type) {
  let sum = 0, w = 0, filled = 0, missing = 0;
  for (const c of cats) {
    const v = values[c.id];
    if (v === null || v === undefined) { if (c.required) missing++; continue; }
    filled++; sum += v * c.weight; w += c.weight;
  }
  const complete = filled > 0 && missing === 0;
  if (!filled || w <= 0 || (type.require_complete && !complete)) return { final: null, complete, provisional: false };
  const d = type.decimals ?? 2;
  const f = Math.pow(10, d);
  const raw = Number(((sum / w) * f).toPrecision(12));
  const r = type.rounding === 'floor' ? Math.floor(raw) : type.rounding === 'ceil' ? Math.ceil(raw) : Math.round(raw);
  return { final: r / f, complete, provisional: !complete };
}

export async function mountGrid(root, { typeId, subjectId, classId, isAdmin = false, onStatus }) {
  const q = qs({ type_id: typeId, subject_id: subjectId, class_id: classId });
  const storeKey = `sipas_pending_${typeId}_${subjectId}_${classId}`;
  let data = await get('/grid' + q);
  const pending = new Map();     // "studentId|catId" -> nilai (belum terkirim)
  let saving = false, timer = null, autosave = true;
  try { autosave = localStorage.getItem('sipas_autosave') !== '0'; } catch (e) { /* abaikan */ }
  let filter = { q: '', mode: 'all' };

  const loadStored = () => { try { return JSON.parse(localStorage.getItem(storeKey) || '{}'); } catch (e) { return {}; } };
  const persist = () => {
    try {
      if (pending.size) localStorage.setItem(storeKey, JSON.stringify(Object.fromEntries(pending)));
      else localStorage.removeItem(storeKey);
    } catch (e) { /* penyimpanan penuh */ }
  };

  function render() {
    const cats = data.categories;
    const editableCats = cats.filter(c => c.editable);
    const st = data.assessment.status;
    const steps = ['draft', 'submitted', 'locked'];
    const stepIdx = st === 'returned' ? 0 : steps.indexOf(st);
    const hasCopy = cats.some(c => c.source_type !== 'manual' && c.sync_mode === 'copy');
    root.innerHTML = `
      <div class="card mb-2"><div class="card-body" style="padding:14px 18px">
        <div class="flex between flex-wrap gap-2">
          <div>
            <h3 class="mb-0">${esc(data.subject.name)} · ${esc(data.class.name)}</h3>
            <div class="muted" style="font-size:12.5px">${esc(data.type.name)} · ${esc(data.semester.year_name)} ${esc(data.semester.name)} · KKTP ${fmtNum(data.kktp)}${data.teacher ? ' · Guru: ' + esc(data.teacher.name) : ''}${data.type.end_date ? ' · Batas input ' + fmtDate(data.type.end_date) : ''}</div>
          </div>
          <div class="flex gap-2 flex-wrap">
            ${statusBadge(st)}
            <div class="status-track">${['Draf', 'Dikirim', 'Dikunci'].map((l, i) => `<span class="step ${i < stepIdx ? 'done' : i === stepIdx ? 'cur' : ''}">${icon(i < stepIdx ? 'checkCircle' : 'chevron', 'icon-sm')}${l}</span>`).join('')}</div>
          </div>
        </div>
        ${st === 'returned' && data.assessment.return_note ? `<div class="alert warn mt-2 mb-0">${icon('message')}<div><b>Catatan admin:</b> ${esc(data.assessment.return_note)}</div></div>` : ''}
        ${!data.editable ? `<div class="alert info mt-2 mb-0">${icon('lock')}<div>${esc(data.reason || 'Lembar tidak dapat diubah')}</div></div>` : ''}
      </div></div>
      <div class="toolbar">
        <div class="search">${icon('search')}<input type="search" id="g-q" placeholder="Cari nama siswa..." value="${esc(filter.q)}"></div>
        <select id="g-filter" style="width:auto"><option value="all">Semua siswa</option><option value="incomplete">Belum lengkap</option><option value="low">Di bawah KKTP</option></select>
        <span class="save-ind" id="g-ind"></span>
        <div class="grow"></div>
        <div class="btn-group">
          ${data.editable ? `<label class="switch" title="Simpan otomatis"><input type="checkbox" id="g-auto"${autosave ? ' checked' : ''}><span class="track"></span><span class="hide-sm">Otomatis</span></label>
            <button class="btn btn-primary btn-sm" id="g-save">${icon('save')}Simpan</button>` : ''}
          <button class="btn btn-sm" id="g-more">${icon('menu')}<span class="hide-sm">Lainnya</span></button>
        </div>
      </div>
      <div class="sheet-wrap"><table class="sheet ${data.editable ? '' : 'readonly'}" id="g-table">
        <thead><tr><th class="stk c-no">No</th><th class="stk c-name" style="text-align:left">Nama Siswa</th>
          ${cats.map(c => `<th class="${c.editable ? '' : 'auto'}" title="${esc(c.name)}${c.editable ? '' : ' (otomatis)'}">${esc(c.code || c.name)}<span class="w">${fmtNum(c.weight)}%${c.required ? '' : ' · opsional'}</span>${!c.editable ? `<span class="src">${icon('link', 'icon-sm')} ${esc(c.source_type_name || '')}${c.source_category_name ? ' › ' + esc(c.source_category_name) : ''}</span>` : ''}</th>`).join('')}
          <th>Nilai Akhir</th><th>Status</th></tr></thead>
        <tbody></tbody>
      </table></div>
      <div class="flex between flex-wrap gap-2 mt-2">
        <div class="legend"><span><i style="background:#fff8e1"></i>Belum tersimpan</span><span><i style="background:var(--navy-50)"></i>Otomatis dari penilaian lain</span><span><i style="background:var(--gold-100)"></i>Nilai akhir</span><span><i style="background:var(--danger-soft)"></i>Tidak valid</span></div>
        <div class="muted" style="font-size:12px"><span class="kbd">Enter</span> turun · <span class="kbd">Tab</span> kanan · <span class="kbd">Ctrl+V</span> tempel dari Excel</div>
      </div>
      <div class="card mt-2"><div class="card-body" style="padding:12px 16px" id="g-actions"></div></div>`;
    $('#g-filter', root).value = filter.mode;
    renderBody();
    renderActions();
    bind();
    updateIndicator();
  }

  function rowVisible(s) {
    if (filter.q && !s.name.toLowerCase().includes(filter.q) && !String(s.nisn || '').includes(filter.q)) return false;
    if (filter.mode === 'incomplete') return !s.complete;
    if (filter.mode === 'low') return s.final !== null && s.final < data.kktp;
    return true;
  }

  function cellValue(s, c) {
    const k = s.id + '|' + c.id;
    return pending.has(k) ? pending.get(k) : s.values[c.id];
  }

  function rowHtml(s, i) {
    const cats = data.categories;
    return `<tr data-sid="${s.id}" class="${s.complete ? '' : 'incomplete'}">
      <td class="stk c-no">${s.roll_no || i + 1}</td>
      <td class="stk c-name"><span class="nm" title="${esc(s.name)}">${esc(s.name)}</span><span class="sub">${esc(s.nisn || s.nis || '')}</span></td>
      ${cats.map(c => {
        const v = cellValue(s, c);
        const low = v !== null && v !== undefined && v < data.kktp;
        if (!c.editable) return `<td class="cell auto ${low ? 'low' : ''}"><span class="v" title="Otomatis dari ${esc(c.source_type_name || '')}">${v === null || v === undefined ? '–' : fmtNum(v)}</span></td>`;
        const dirty = pending.has(s.id + '|' + c.id);
        return `<td class="cell ${dirty ? 'dirty' : ''} ${low ? 'low' : ''}"><input data-c="${c.id}" inputmode="decimal" autocomplete="off" value="${v === null || v === undefined ? '' : String(v).replace('.', ',')}"${data.editable ? '' : ' disabled'} aria-label="${esc(c.name)} ${esc(s.name)}"></td>`;
      }).join('')}
      ${finalCells(s)}
    </tr>`;
  }

  function finalCells(s) {
    const low = s.final !== null && s.final < data.kktp;
    return `<td class="final ${s.provisional ? 'prov' : ''} ${low ? 'low' : ''}" title="${s.provisional ? 'Nilai sementara (komponen belum lengkap)' : ''}">${s.final === null ? '–' : fmtNum(s.final, data.type.decimals)}</td>
      <td class="st">${s.complete ? (low ? '<span class="badge red">Belum tuntas</span>' : '<span class="badge green">Lengkap</span>') : `<span class="badge yellow">${s.filled ? 'Belum lengkap' : 'Kosong'}</span>`}</td>`;
  }

  function renderBody() {
    const tb = $('#g-table tbody', root);
    const rows = data.students.filter(rowVisible);
    tb.innerHTML = rows.length ? rows.map((s) => rowHtml(s, data.students.indexOf(s))).join('') : `<tr><td colspan="${data.categories.length + 4}" class="center muted" style="padding:30px">Tidak ada siswa${filter.q || filter.mode !== 'all' ? ' yang cocok' : ' di kelas ini'}</td></tr>`;
  }

  function refreshRow(sid) {
    const s = data.students.find(x => x.id === sid);
    const tr = $(`tr[data-sid="${sid}"]`, root);
    if (!s || !tr) return;
    const vals = {};
    data.categories.forEach(c => { vals[c.id] = cellValue(s, c); });
    const loc = computeLocal(data.categories, vals, data.type);
    const view = { ...s, final: loc.final, complete: loc.complete, provisional: loc.provisional, filled: Object.values(vals).filter(v => v !== null && v !== undefined).length };
    const cells = tr.querySelectorAll('td');
    const n = cells.length;
    const [fin, stat] = h(`<table><tr>${finalCells(view)}</tr></table>`).querySelectorAll('td');
    cells[n - 2].replaceWith(fin);
    cells[n - 1].replaceWith(stat);
    tr.classList.toggle('incomplete', !loc.complete);
  }

  function renderActions() {
    const st = data.assessment.status;
    const el = $('#g-actions', root);
    const n = data.students.length;
    const done = data.students.filter(s => s.complete).length;
    const btns = [];
    if (!isAdmin) {
      if (data.editable) btns.push(`<button class="btn btn-gold" data-a="submit">${icon('send')}Kirim ke Admin</button>`);
      if (st === 'submitted') btns.push(`<button class="btn" data-a="withdraw">${icon('undo')}Tarik Kembali</button>`);
    } else {
      if (st !== 'locked') btns.push(`<button class="btn btn-success" data-a="lock">${icon('lock')}Verifikasi & Kunci</button>`);
      if (st === 'submitted') btns.push(`<button class="btn btn-danger" data-a="return">${icon('undo')}Kembalikan ke Guru</button>`);
      if (st === 'locked') btns.push(`<button class="btn" data-a="unlock">${icon('unlock')}Buka Kunci</button>`);
    }
    el.innerHTML = `<div class="flex between flex-wrap gap-2"><div style="min-width:220px" class="grow"><div class="flex between" style="font-size:12.5px"><span>Kelengkapan nilai</span><b>${done}/${n} siswa</b></div><div class="progress mt-1 ${done === n && n ? 'done' : ''}"><div style="width:${n ? (done / n) * 100 : 0}%"></div></div></div><div class="btn-group">${btns.join('')}</div></div>`;
    $$('[data-a]', el).forEach(b => b.onclick = () => action(b.dataset.a, b));
  }

  function updateIndicator(state, msg) {
    const ind = $('#g-ind', root);
    if (!ind) return;
    if (!state) state = pending.size ? (navigator.onLine ? 'pending' : 'offline') : 'ok';
    const map = {
      ok: ['ok', 'checkCircle', msg || (data._savedAt ? 'Tersimpan ' + new Date(data._savedAt).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : 'Semua nilai tersimpan')],
      pending: ['pending', 'save', `${pending.size} perubahan belum disimpan`],
      saving: ['', 'refresh', 'Menyimpan...'],
      offline: ['pending', 'wifiOff', `${pending.size} perubahan tersimpan di perangkat (offline)`],
      err: ['err', 'alert', msg || 'Gagal menyimpan']
    };
    const m = map[state];
    ind.className = 'save-ind ' + m[0];
    ind.innerHTML = (state === 'saving' ? '<span class="spinner" style="width:14px;height:14px;border-width:2px"></span>' : icon(m[1], 'icon-sm')) + esc(m[2]);
    if (onStatus) onStatus({ pending: pending.size, status: data.assessment.status });
  }

  function setCell(sid, cid, raw, input) {
    const r = parseVal(raw);
    const td = input ? input.closest('td') : null;
    if (!r.ok) { if (td) td.classList.add('err'); return false; }
    if (td) td.classList.remove('err');
    const s = data.students.find(x => x.id === sid);
    const orig = s.values[cid];
    const k = sid + '|' + cid;
    if ((orig ?? null) === r.v) pending.delete(k); else pending.set(k, r.v);
    if (td) td.classList.toggle('dirty', pending.has(k));
    if (td) td.classList.toggle('low', r.v !== null && r.v < data.kktp);
    return true;
  }

  function schedule() {
    persist();
    updateIndicator();
    clearTimeout(timer);
    if (autosave && data.editable) timer = setTimeout(save, AUTOSAVE_MS);
  }

  async function save() {
    clearTimeout(timer);
    if (saving || !pending.size || !data.editable) { updateIndicator(); return; }
    if ($$('td.cell.err', root).length) { updateIndicator('err', 'Perbaiki nilai yang tidak valid (0–100)'); return; }
    saving = true;
    updateIndicator('saving');
    const snapshot = new Map(pending);
    const changes = [...snapshot].map(([k, v]) => { const [student_id, category_id] = k.split('|'); return { student_id, category_id, score: v }; });
    try {
      const res = await put('/grid', { type_id: typeId, subject_id: subjectId, class_id: classId, changes });
      for (const [k, v] of snapshot) {
        const [sid, cid] = k.split('|');
        const s = data.students.find(x => x.id === sid);
        if (s) s.values[cid] = v;
        if (pending.get(k) === v) pending.delete(k);
        const inp = $(`tr[data-sid="${sid}"] input[data-c="${cid}"]`, root);
        if (inp) { const td = inp.closest('td'); td.classList.remove('dirty'); td.classList.add('saved'); setTimeout(() => td.classList.remove('saved'), 1300); }
      }
      res.finals.forEach(f => {
        const s = data.students.find(x => x.id === f.student_id);
        if (s) { Object.assign(s, { final: f.final, complete: f.complete, provisional: f.provisional }); s.values = { ...s.values, ...f.values }; s.filled = Object.values(s.values).filter(v => v !== null && v !== undefined).length; }
      });
      data._savedAt = res.saved_at;
      persist();
      data.students.forEach(s => refreshRow(s.id));
      renderActions();
      updateIndicator();
    } catch (e) {
      persist();
      if (e.status === 0) updateIndicator('offline');
      else { updateIndicator('err', e.message); errorToast(e); }
    } finally {
      saving = false;
      if (pending.size && autosave && navigator.onLine) {
        const anyNew = [...pending].some(([k, v]) => snapshot.get(k) !== v);
        if (anyNew) timer = setTimeout(save, AUTOSAVE_MS);
      }
    }
  }

  function inputs() { return $$('#g-table tbody input:not([disabled])', root); }

  function move(inp, dr, dc) {
    const tr = inp.closest('tr');
    const rowInputs = $$('input:not([disabled])', tr);
    const ci = rowInputs.indexOf(inp);
    if (dc) {
      const t = rowInputs[ci + dc];
      if (t) { t.focus(); t.select(); }
      return;
    }
    let r = tr;
    do { r = dr > 0 ? r.nextElementSibling : r.previousElementSibling; } while (r && !$('input', r));
    if (r) { const t = $$('input:not([disabled])', r)[ci]; if (t) { t.focus(); t.select(); } }
  }

  function bind() {
    const tb = $('#g-table tbody', root);
    tb.addEventListener('input', e => {
      const inp = e.target.closest('input[data-c]');
      if (!inp) return;
      const sid = inp.closest('tr').dataset.sid;
      if (setCell(sid, inp.dataset.c, inp.value, inp)) { refreshRow(sid); schedule(); }
      else updateIndicator('err', 'Nilai harus angka 0–100');
    });
    tb.addEventListener('focusin', e => { if (e.target.matches('input')) e.target.select(); });
    tb.addEventListener('keydown', e => {
      const inp = e.target.closest('input[data-c]');
      if (!inp) return;
      if (e.key === 'Enter') { e.preventDefault(); move(inp, e.shiftKey ? -1 : 1, 0); }
      else if (e.key === 'ArrowDown') { e.preventDefault(); move(inp, 1, 0); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); move(inp, -1, 0); }
      else if (e.key === 'ArrowRight' && inp.selectionStart === inp.value.length) { e.preventDefault(); move(inp, 0, 1); }
      else if (e.key === 'ArrowLeft' && inp.selectionStart === 0 && inp.selectionEnd === 0) { e.preventDefault(); move(inp, 0, -1); }
      else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') { e.preventDefault(); save(); }
    });
    tb.addEventListener('paste', e => {
      const inp = e.target.closest('input[data-c]');
      if (!inp) return;
      const text = (e.clipboardData || window.clipboardData).getData('text');
      if (!/[\t\n]/.test(text.trim())) return; // satu nilai: biarkan bawaan
      e.preventDefault();
      const lines = text.replace(/\r/g, '').replace(/\n$/, '').split('\n').map(l => l.split('\t'));
      const editable = data.categories.filter(c => c.editable).map(c => c.id);
      const startCol = editable.indexOf(inp.dataset.c);
      let tr = inp.closest('tr');
      let bad = 0, n = 0;
      for (const line of lines) {
        if (!tr) break;
        const sid = tr.dataset.sid;
        line.forEach((val, j) => {
          const cid = editable[startCol + j];
          if (!cid) return;
          const target = $(`input[data-c="${cid}"]`, tr);
          if (target) target.value = String(val).trim();
          if (setCell(sid, cid, val, target)) n++; else bad++;
        });
        refreshRow(sid);
        tr = tr.nextElementSibling;
      }
      schedule();
      toast(`${n} nilai ditempel${bad ? `, ${bad} tidak valid` : ''}`, bad ? 'warning' : 'success');
    });
    $('#g-q', root).addEventListener('input', debounce(e => { filter.q = e.target.value.toLowerCase().trim(); renderBody(); }, 200));
    $('#g-filter', root).onchange = e => { filter.mode = e.target.value; renderBody(); };
    const sb = $('#g-save', root);
    if (sb) sb.onclick = () => busy(sb, save);
    const au = $('#g-auto', root);
    if (au) au.onchange = () => { autosave = au.checked; try { localStorage.setItem('sipas_autosave', autosave ? '1' : '0'); } catch (e) { /* abaikan */ } if (autosave) schedule(); };
    $('#g-more', root).onclick = ev => { ev.stopPropagation(); moreMenu(ev.currentTarget); };
  }

  function moreMenu(btn) {
    $$('.dropdown').forEach(d => d.remove());
    const hasCopy = data.categories.some(c => c.source_type !== 'manual' && c.sync_mode === 'copy');
    const dd = h(`<div class="dropdown" style="right:0">
      ${data.editable ? `<div class="dd-item" data-m="fill">${icon('zap')} Isi massal satu kolom</div>` : ''}
      ${data.editable ? `<div class="dd-item" data-m="import">${icon('upload')} Impor dari Excel/CSV</div>` : ''}
      <div class="dd-item" data-m="template">${icon('file')} Unduh template Excel</div>
      <div class="dd-item" data-m="export">${icon('download')} Ekspor ke Excel</div>
      ${hasCopy && data.editable ? `<div class="dd-item" data-m="sync">${icon('refresh')} Sinkronkan nilai sumber</div>` : ''}
      <div class="dd-item" data-m="history">${icon('history')} Riwayat perubahan nilai</div>
      <div class="dd-item" data-m="reload">${icon('refresh')} Muat ulang dari server</div></div>`);
    btn.parentElement.style.position = 'relative';
    btn.parentElement.appendChild(dd);
    dd.onclick = e => { const m = e.target.closest('[data-m]'); if (!m) return; dd.remove(); menuAction(m.dataset.m); };
  }

  async function menuAction(m) {
    try {
      if (m === 'export') return exportExcel();
      if (m === 'template') return templateExcel();
      if (m === 'import') return importFile();
      if (m === 'fill') return fillColumn();
      if (m === 'history') return history();
      if (m === 'reload') { if (pending.size && !(await confirmDialog('Perubahan yang belum disimpan akan dibuang. Lanjutkan?', { danger: true }))) return; pending.clear(); persist(); return reload(); }
      if (m === 'sync') { const r = await post('/grid/sync', { type_id: typeId, subject_id: subjectId, class_id: classId }); toast(`${r.updated} nilai sumber diperbarui`, 'success'); return reload(); }
    } catch (e) { errorToast(e); }
  }

  async function reload() {
    data = await get('/grid' + q);
    render();
  }

  async function action(a, btn) {
    try {
      if (pending.size && ['submit', 'lock'].includes(a)) await save();
      if (pending.size && ['submit', 'lock'].includes(a)) { toast('Masih ada nilai yang belum tersimpan', 'warning'); return; }
      const body = { type_id: typeId, subject_id: subjectId, class_id: classId };
      if (a === 'submit') {
        if (!(await confirmDialog('Kirim nilai ini ke admin untuk diverifikasi? Setelah dikirim, nilai tidak dapat diubah kecuali ditarik kembali atau dikembalikan admin.'))) return;
        try { await busy(btn, () => post('/grid/submit', body)); }
        catch (e) {
          if (e.details && e.details.needs_confirm) {
            if (!(await confirmDialog(e.message, { okText: 'Tetap kirim' }))) return;
            await busy(btn, () => post('/grid/submit', { ...body, confirm: true }));
          } else throw e;
        }
        toast('Nilai terkirim ke admin', 'success');
      } else if (a === 'withdraw') {
        await busy(btn, () => post('/grid/withdraw', body));
        toast('Kiriman ditarik kembali. Nilai dapat diubah lagi.', 'success');
      } else if (a === 'lock') {
        if (!(await confirmDialog('Kunci lembar nilai ini? Nilai akan disahkan (snapshot) dan dapat dipakai sebagai sumber nilai penilaian lain.'))) return;
        await busy(btn, () => post('/grid/lock', body));
        toast('Nilai dikunci', 'success');
      } else if (a === 'return') {
        const note = await promptDialog('Catatan perbaikan untuk guru', { title: 'Kembalikan Nilai', multiline: true, okText: 'Kembalikan' });
        if (!note) return;
        await busy(btn, () => post('/grid/return', { ...body, note }));
        toast('Nilai dikembalikan ke guru', 'success');
      } else if (a === 'unlock') {
        const note = await promptDialog('Alasan membuka kunci (dikirim ke guru)', { title: 'Buka Kunci', multiline: true, okText: 'Buka kunci', required: false });
        if (note === null) return;
        const back = await confirmDialog('Kembalikan juga ke guru untuk diperbaiki? (Pilih Batal agar hanya admin yang mengubah)', { okText: 'Ya, kembalikan ke guru' });
        await busy(btn, () => post('/grid/unlock', { ...body, note, return_to_teacher: back }));
        toast('Kunci dibuka', 'success');
      }
      await reload();
    } catch (e) { errorToast(e); }
  }

  async function fillColumn() {
    const cats = data.categories.filter(c => c.editable);
    openModal({
      title: 'Isi Massal Satu Kolom', size: 'sm',
      body: `<div class="field mb-2"><label>Kolom</label><select id="fc-c">${cats.map(c => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}</select></div>
        <div class="field mb-2"><label>Nilai (0–100, kosongkan untuk menghapus)</label><input id="fc-v" inputmode="decimal"></div>
        <label class="check"><input type="checkbox" id="fc-empty" checked> Hanya sel yang masih kosong</label>`,
      buttons: [{ label: 'Batal' }, {
        label: 'Terapkan', class: 'btn-primary', onClick: m => {
          const cid = $('#fc-c', m.body).value, raw = $('#fc-v', m.body).value;
          const onlyEmpty = $('#fc-empty', m.body).checked;
          if (!parseVal(raw).ok) { toast('Nilai tidak valid', 'error'); return false; }
          let n = 0;
          data.students.filter(rowVisible).forEach(s => {
            const cur = cellValue(s, { id: cid });
            if (onlyEmpty && cur !== null && cur !== undefined) return;
            setCell(s.id, cid, raw); n++;
          });
          renderBody(); schedule();
          toast(`${n} sel diisi`, 'success');
        }
      }]
    });
  }

  function sheetTitle() { return `${data.type.name} - ${data.subject.name} - ${data.class.name}`; }

  async function exportExcel() {
    const cats = data.categories;
    const headers = ['No', 'NISN', 'Nama Siswa', ...cats.map(c => `${c.code || c.name} (${fmtNum(c.weight)}%)`), 'Nilai Akhir', 'Status'];
    const rows = data.students.map((s, i) => [s.roll_no || i + 1, s.nisn || '', s.name, ...cats.map(c => cellValue(s, c) ?? ''), s.final ?? '', s.complete ? (s.final < data.kktp ? 'Belum tuntas' : 'Lengkap') : 'Belum lengkap']);
    await exportWorkbook(`Nilai_${data.subject.code}_${data.class.name}_${data.type.code || data.type.name}.xlsx`.replace(/\s+/g, '_'), [{
      name: 'Nilai', title: sheetTitle(), subtitle: `${data.semester.year_name} ${data.semester.name} · KKTP ${data.kktp}${data.teacher ? ' · ' + data.teacher.name : ''}`,
      headers, rows, widths: [5, 14, 34, ...cats.map(() => 12), 12, 14], textCols: [1],
      highlight: (r, c, v) => (c >= 3 && typeof v === 'number' && v < data.kktp ? 'FDE2E2' : null)
    }]);
  }

  async function templateExcel() {
    const cats = data.categories.filter(c => c.editable);
    await downloadTemplate(`Template_Nilai_${data.subject.code}_${data.class.name}.xlsx`.replace(/\s+/g, '_'),
      ['No', 'NISN', 'Nama Siswa', ...cats.map(c => c.code || c.name)],
      data.students.map((s, i) => [s.roll_no || i + 1, s.nisn || '', s.name, ...cats.map(c => cellValue(s, c) ?? '')]),
      ['Isi nilai 0-100 pada kolom kategori. Kosongkan bila belum ada nilai (tidak dianggap nol).', 'Siswa dicocokkan berdasarkan NISN, atau nama bila NISN kosong.', 'Jangan mengubah judul kolom.', 'Kolom yang diambil otomatis dari penilaian lain tidak perlu diisi.']);
  }

  function importFile() {
    const inp = document.createElement('input');
    inp.type = 'file';
    inp.accept = '.xlsx,.xls,.csv';
    inp.onchange = async () => {
      const file = inp.files[0];
      if (!file) return;
      try {
        const book = await readSpreadsheet(file);
        const aoa = book.sheets[book.names[0]];
        const cats = data.categories.filter(c => c.editable);
        // cari baris judul
        let hi = aoa.findIndex(r => r.some(v => /nama/i.test(v)) && r.some(v => cats.some(c => normHeader(v) === normHeader(c.code || c.name) || normHeader(v) === normHeader(c.name))));
        if (hi < 0) throw new Error('Judul kolom kategori tidak ditemukan. Gunakan template dari menu Lainnya.');
        const hdr = aoa[hi].map(normHeader);
        const iN = hdr.findIndex(x => x.includes('nama')), iS = hdr.findIndex(x => x === 'nisn');
        const colMap = cats.map(c => [c, hdr.findIndex(x => x === normHeader(c.code || c.name) || x === normHeader(c.name) || x.startsWith(normHeader(c.code || c.name)))]).filter(x => x[1] >= 0);
        const changes = [], errors = [];
        for (let i = hi + 1; i < aoa.length; i++) {
          const r = aoa[i];
          if (!r || r.every(v => String(v).trim() === '')) continue;
          const nisn = iS >= 0 ? String(r[iS]).trim().replace(/^0+/, '') : '';
          const name = iN >= 0 ? String(r[iN]).trim().toUpperCase() : '';
          const s = data.students.find(x => (nisn && String(x.nisn || '').replace(/^0+/, '') === nisn) || (name && x.name.toUpperCase() === name));
          if (!s) { errors.push(`Baris ${i + 1}: siswa "${name || nisn}" tidak ditemukan di kelas ini`); continue; }
          colMap.forEach(([c, j]) => {
            const p = parseVal(r[j]);
            if (!p.ok) errors.push(`Baris ${i + 1} (${s.name}) kolom ${c.code || c.name}: "${r[j]}" bukan nilai 0-100`);
            else if (p.v !== (s.values[c.id] ?? null)) changes.push([s, c, p.v]);
          });
        }
        openModal({
          title: 'Pratinjau Impor Nilai', size: 'lg',
          body: `<p>File <b>${esc(file.name)}</b>: <b>${changes.length}</b> nilai berubah, <b>${errors.length}</b> masalah. Kolom dikenali: ${colMap.map(([c]) => `<span class="chip">${esc(c.code || c.name)}</span>`).join(' ') || '-'}</p>
            ${errors.length ? `<div class="alert warn">${icon('alert')}<div>${errors.slice(0, 30).map(esc).join('<br>')}${errors.length > 30 ? '<br>…' : ''}</div></div>` : ''}
            <div class="table-wrap" style="max-height:300px"><table class="tbl tbl-compact"><thead><tr><th>Siswa</th><th>Kolom</th><th class="num">Lama</th><th class="num">Baru</th></tr></thead><tbody>
            ${changes.slice(0, 300).map(([s, c, v]) => `<tr><td>${esc(s.name)}</td><td>${esc(c.code || c.name)}</td><td class="num">${fmtNum(s.values[c.id])}</td><td class="num"><b>${v === null ? '(kosong)' : fmtNum(v)}</b></td></tr>`).join('')}</tbody></table></div>`,
          buttons: [{ label: 'Batal' }, {
            label: `Terapkan ${changes.length} nilai`, class: 'btn-primary', onClick: async () => {
              changes.forEach(([s, c, v]) => setCell(s.id, c.id, v === null ? '' : String(v)));
              renderBody();
              persist();
              await save();
              toast('Nilai hasil impor disimpan', 'success');
            }
          }]
        });
      } catch (e) { errorToast(e); }
    };
    inp.click();
  }

  async function history() {
    const rows = await get('/score-revisions' + q);
    openModal({
      title: 'Riwayat Perubahan Nilai', size: 'lg',
      body: rows.length ? `<div class="table-wrap" style="max-height:60vh"><table class="tbl tbl-compact"><thead><tr><th>Waktu</th><th>Siswa</th><th>Kolom</th><th class="num">Sebelum</th><th class="num">Sesudah</th><th>Oleh</th></tr></thead><tbody>
        ${rows.map(r => `<tr><td class="nowrap">${fmtDate(r.created_at, true)}</td><td>${esc(r.student_name)}</td><td>${esc(r.category_name || '-')}</td><td class="num">${r.old_score === null ? '–' : fmtNum(r.old_score)}</td><td class="num"><b>${r.new_score === null ? '–' : fmtNum(r.new_score)}</b></td><td>${esc(r.changed_name)}</td></tr>`).join('')}</tbody></table></div>`
        : '<div class="empty">Belum ada perubahan nilai.</div>'
    });
  }

  // nilai tersimpan di perangkat dari sesi sebelumnya
  const stored = loadStored();
  const storedKeys = Object.keys(stored);
  if (storedKeys.length) {
    storedKeys.forEach(k => { const [sid, cid] = k.split('|'); if (data.students.some(s => s.id === sid) && data.categories.some(c => c.id === cid && c.editable)) pending.set(k, stored[k]); });
    if (pending.size) toast(`${pending.size} nilai yang tersimpan di perangkat dipulihkan dan akan dikirim.`, 'info');
  }
  render();
  if (pending.size && data.editable && navigator.onLine) setTimeout(save, 500);
  const onOnline = () => { if (pending.size) save(); };
  window.addEventListener('online', onOnline);
  const retry = setInterval(() => { if (pending.size && navigator.onLine && !saving && autosave) save(); }, 30000);
  const beforeUnload = e => { if (pending.size) { persist(); e.preventDefault(); e.returnValue = ''; } };
  window.addEventListener('beforeunload', beforeUnload);
  const cleanupWatch = setInterval(() => {
    if (!document.body.contains(root)) {
      window.removeEventListener('online', onOnline);
      window.removeEventListener('beforeunload', beforeUnload);
      clearInterval(retry);
      clearInterval(cleanupWatch);
    }
  }, 2000);

  return { reload, save, get pending() { return pending.size; }, data: () => data };
}
