// Isian wali kelas / data rapor siswa: kehadiran, kokurikuler, ekstrakurikuler, catatan & keputusan, sikap.
import { get, put, qs } from '../api.js';
import { App } from '../app.js';
import { icon, esc, toast, errorToast, openModal, $, $$, busy, fmtNum, confirmDialog } from '../ui.js';
import { listKoma, listBaris, buildKokurikuler } from './describe.js';
import { exportWorkbook } from './xlsx.js';

const on = v => v === '1' || v === 1 || v === true;

export async function mountWali(root, { classId, semesterId, isAdmin = false, className = '' }) {
  const s = App.settings;
  let data = await get('/report-cards' + qs({ class_id: classId, semester_id: semesterId }));
  const dirty = new Map(); // studentId -> {attendance:{}, card:{}, ekskul:{eid: {grade, description}}}
  const tabs = [
    (isAdmin || on(s.wali_kehadiran)) && ['hadir', 'Kehadiran', 'calendar'],
    (isAdmin || on(s.wali_kokurikuler)) && ['kokurikuler', 'Kokurikuler', 'star'],
    (isAdmin || on(s.wali_ekskul)) && ['ekskul', 'Ekstrakurikuler', 'award'],
    (isAdmin || on(s.wali_catatan)) && ['catatan', 'Catatan & Keputusan', 'message'],
    (isAdmin || on(s.wali_sikap)) && ['sikap', 'Sikap', 'user']
  ].filter(Boolean);
  if (!tabs.length) { root.innerHTML = '<div class="card card-body muted">Admin belum mengaktifkan isian wali kelas.</div>'; return; }
  let tab = tabs[0][0];
  const finalized = data.students.some(x => x.card && x.card.status === 'final');
  const locked = finalized && !isAdmin;
  const optsK = listKoma(s.opsi_nilai_kokurikuler);
  const optsE = listKoma(s.opsi_nilai_ekskul);
  const dims = listBaris(s.kokurikuler_dimensi);
  const efektif = Number(s.hari_efektif) || 0;

  const patch = (sid, part, field, value) => {
    if (!dirty.has(sid)) dirty.set(sid, { attendance: {}, card: {}, ekskul: {} });
    dirty.get(sid)[part][field] = value;
    updateSave();
  };
  const cur = (st, part, field) => {
    const d = dirty.get(st.id);
    if (d && field in d[part]) return d[part][field];
    if (part === 'attendance') return st.attendance ? st.attendance[field] : null;
    if (part === 'card') return st.card ? st.card[field] : null;
    return null;
  };
  const ekCur = (st, eid) => {
    const d = dirty.get(st.id);
    if (d && d.ekskul[eid]) return d.ekskul[eid];
    const e = (st.ekskul || []).find(x => x.extracurricular_id === eid);
    return e ? { grade: e.grade || '', description: e.description || '' } : { grade: '', description: '' };
  };
  const optHtml = (list, v, ph = '—') => `<option value="">${ph}</option>` + list.map(o => `<option${o === v ? ' selected' : ''}>${esc(o)}</option>`).join('') + (v && !list.includes(v) ? `<option selected>${esc(v)}</option>` : '');
  const inp = (st, part, f, type = 'text', extra = '') => {
    const v = cur(st, part, f);
    return type === 'textarea' ? `<textarea class="input-sm" rows="2" data-p="${part}" data-f="${f}" ${extra}${locked ? ' disabled' : ''}>${esc(v ?? '')}</textarea>`
      : `<input class="input-sm" type="${type}" data-p="${part}" data-f="${f}" value="${esc(v ?? '')}" ${extra}${locked ? ' disabled' : ''}>`;
  };

  function render() {
    root.innerHTML = `
      ${locked ? `<div class="alert info">${icon('lock')}<div>Rapor kelas ini sudah difinalkan admin. Isian tidak dapat diubah.</div></div>` : ''}
      <div class="tabs">${tabs.map(([k, l, ic]) => `<div class="tab ${k === tab ? 'active' : ''}" data-t="${k}">${icon(ic, 'icon-sm')}${l}</div>`).join('')}</div>
      <div class="toolbar"><span class="muted" id="w-prog"></span><div class="grow"></div><div class="btn-group" id="w-tools"></div>
        <button class="btn btn-primary btn-sm" id="w-save" disabled>${icon('save')}Simpan</button></div>
      <div class="table-wrap" style="max-height:65vh"><table class="tbl tbl-compact" id="w-tbl"></table></div>`;
    $$('.tab', root).forEach(t => t.onclick = () => { tab = t.dataset.t; render(); });
    $('#w-save', root).onclick = e => busy(e.currentTarget, save);
    drawTab();
    updateSave();
  }

  function drawTab() {
    const tbl = $('#w-tbl', root);
    const tools = $('#w-tools', root);
    const st = data.students;
    let filled = 0;
    if (tab === 'hadir') {
      tools.innerHTML = `${efektif ? `<button class="btn btn-sm" data-tool="auto">${icon('zap', 'icon-sm')}Isi Hadir otomatis (${efektif} hari efektif)</button>` : '<span class="soft" style="font-size:12px">Atur hari efektif di Pengaturan Sekolah untuk mengisi Hadir otomatis</span>'}<button class="btn btn-sm" data-tool="zero">${icon('check', 'icon-sm')}Kosong → 0</button><button class="btn btn-sm" data-tool="xls">${icon('download', 'icon-sm')}Excel</button>`;
      tbl.innerHTML = `<thead><tr><th>No</th><th>Nama Siswa</th><th>Hadir</th><th>Sakit</th><th>Izin</th><th>Tanpa Ket.</th><th>% Hadir</th></tr></thead><tbody>${st.map((x, i) => {
        const a = ['present', 'sick', 'permit', 'absent'].map(f => cur(x, 'attendance', f));
        if (a.slice(1).some(v => v !== null && v !== undefined && v !== '')) filled++;
        return `<tr data-sid="${x.id}"><td>${x.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(x.name)}</td>${['present', 'sick', 'permit', 'absent'].map(f => `<td style="width:90px">${inp(x, 'attendance', f, 'number', 'min="0" max="366" style="width:80px;text-align:center"')}</td>`).join('')}<td class="c" data-pct>${pct(x)}</td></tr>`;
      }).join('')}</tbody>`;
    } else if (tab === 'kokurikuler') {
      tools.innerHTML = `<button class="btn btn-sm" data-tool="massK">${icon('zap', 'icon-sm')}Isi massal</button>`;
      tbl.innerHTML = `<thead><tr><th>No</th><th>Nama</th><th>Nilai</th><th style="min-width:200px">Dimensi sudah baik</th><th style="min-width:200px">Perlu penguatan</th><th style="min-width:260px">Deskripsi (otomatis / tulis sendiri)</th></tr></thead><tbody>${st.map((x, i) => {
        if (cur(x, 'card', 'cocurricular_grade') || cur(x, 'card', 'cocurricular_desc')) filled++;
        const card = { cocurricular_grade: cur(x, 'card', 'cocurricular_grade'), cocurricular_strong: cur(x, 'card', 'cocurricular_strong'), cocurricular_weak: cur(x, 'card', 'cocurricular_weak'), cocurricular_desc: cur(x, 'card', 'cocurricular_desc') };
        return `<tr data-sid="${x.id}"><td>${x.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(x.name)}</td>
          <td><select class="input-sm" data-p="card" data-f="cocurricular_grade"${locked ? ' disabled' : ''}>${optHtml(optsK, card.cocurricular_grade)}</select></td>
          <td><select class="input-sm" data-p="card" data-f="cocurricular_strong"${locked ? ' disabled' : ''}>${optHtml(dims, card.cocurricular_strong, '— pilih —')}</select></td>
          <td><select class="input-sm" data-p="card" data-f="cocurricular_weak"${locked ? ' disabled' : ''}>${optHtml(dims, card.cocurricular_weak, '— pilih —')}</select></td>
          <td>${inp(x, 'card', 'cocurricular_desc', 'textarea', 'placeholder="Kosongkan untuk kalimat otomatis"')}<div class="soft" style="font-size:11.5px" data-prev>${esc(buildKokurikuler(x.name, card, s))}</div></td></tr>`;
      }).join('')}</tbody>`;
    } else if (tab === 'ekskul') {
      const ek = data.extracurriculars;
      tools.innerHTML = `<button class="btn btn-sm" data-tool="massE">${icon('zap', 'icon-sm')}Isi massal</button>`;
      tbl.innerHTML = `<thead><tr><th>No</th><th>Nama</th>${ek.map(e => `<th style="min-width:150px">${esc(e.name)}</th>`).join('')}</tr></thead><tbody>${st.map((x, i) => {
        if (ek.some(e => ekCur(x, e.id).grade)) filled++;
        return `<tr data-sid="${x.id}"><td>${x.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(x.name)}</td>${ek.map(e => { const v = ekCur(x, e.id); return `<td><select class="input-sm" data-ek="${e.id}"${locked ? ' disabled' : ''}>${optHtml(optsE, v.grade, '— tidak ikut —')}</select></td>`; }).join('')}</tr>`;
      }).join('')}</tbody>`;
    } else if (tab === 'catatan') {
      tools.innerHTML = `<button class="btn btn-sm" data-tool="massC">${icon('zap', 'icon-sm')}Isi massal catatan</button>`;
      tbl.innerHTML = `<thead><tr><th>No</th><th>Nama</th><th style="min-width:320px">Catatan wali kelas</th><th style="min-width:240px">Keputusan (semester genap)</th>${isAdmin ? '<th style="min-width:200px">Tanggapan orang tua</th><th>No. rapor</th>' : ''}</tr></thead><tbody>${st.map((x, i) => {
        if (cur(x, 'card', 'homeroom_note')) filled++;
        return `<tr data-sid="${x.id}"><td>${x.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(x.name)}</td><td>${inp(x, 'card', 'homeroom_note', 'textarea')}</td><td>${inp(x, 'card', 'decision', 'textarea', `placeholder="${esc((s.keputusan_default || '').replace(/\n/g, ' '))}"`)}</td>${isAdmin ? `<td>${inp(x, 'card', 'parent_response', 'textarea')}</td><td>${inp(x, 'card', 'report_number')}</td>` : ''}</tr>`;
      }).join('')}</tbody>`;
    } else if (tab === 'sikap') {
      tools.innerHTML = '';
      tbl.innerHTML = `<thead><tr><th>No</th><th>Nama</th><th>Predikat spiritual</th><th style="min-width:240px">Deskripsi spiritual</th><th>Predikat sosial</th><th style="min-width:240px">Deskripsi sosial</th></tr></thead><tbody>${st.map((x, i) => {
        if (cur(x, 'card', 'spiritual_pred')) filled++;
        return `<tr data-sid="${x.id}"><td>${x.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(x.name)}</td><td>${inp(x, 'card', 'spiritual_pred', 'text', `placeholder="${esc(s.sikap_spiritual_predikat)}" style="width:110px"`)}</td><td>${inp(x, 'card', 'spiritual_desc', 'textarea', 'placeholder="(bawaan sekolah)"')}</td><td>${inp(x, 'card', 'social_pred', 'text', `placeholder="${esc(s.sikap_sosial_predikat)}" style="width:110px"`)}</td><td>${inp(x, 'card', 'social_desc', 'textarea', 'placeholder="(bawaan sekolah)"')}</td></tr>`;
      }).join('')}</tbody>`;
    }
    $('#w-prog', root).innerHTML = `${icon('checkCircle', 'icon-sm')} ${filled}/${st.length} siswa terisi`;
  }

  function pct(x) {
    const a = ['present', 'sick', 'permit', 'absent'].map(f => Number(cur(x, 'attendance', f)) || 0);
    const tot = a.reduce((p, c) => p + c, 0);
    return tot ? fmtNum((a[0] / tot) * 100, 1) + '%' : '–';
  }

  function updateSave() {
    const b = $('#w-save', root);
    if (b) { b.disabled = !dirty.size || locked; b.innerHTML = `${icon('save')}Simpan${dirty.size ? ` (${dirty.size})` : ''}`; }
  }

  root.addEventListener('input', e => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr || locked) return;
    const sid = tr.dataset.sid;
    if (e.target.dataset.p) {
      const v = e.target.value;
      patch(sid, e.target.dataset.p, e.target.dataset.f, e.target.type === 'number' ? (v === '' ? null : Number(v)) : v);
      if (tab === 'hadir') tr.querySelector('[data-pct]').textContent = pct(data.students.find(x => x.id === sid));
      if (tab === 'kokurikuler') {
        const x = data.students.find(y => y.id === sid);
        tr.querySelector('[data-prev]').textContent = buildKokurikuler(x.name, { cocurricular_grade: cur(x, 'card', 'cocurricular_grade'), cocurricular_strong: cur(x, 'card', 'cocurricular_strong'), cocurricular_weak: cur(x, 'card', 'cocurricular_weak'), cocurricular_desc: cur(x, 'card', 'cocurricular_desc') }, s);
      }
      e.target.style.background = '#fff8e1';
    }
    if (e.target.dataset.ek) {
      if (!dirty.has(sid)) dirty.set(sid, { attendance: {}, card: {}, ekskul: {} });
      dirty.get(sid).ekskul[e.target.dataset.ek] = { grade: e.target.value, description: '' };
      e.target.style.background = '#fff8e1';
      updateSave();
    }
  });
  root.addEventListener('change', e => { if (e.target.matches('select')) e.target.dispatchEvent(new Event('input', { bubbles: true })); });

  root.addEventListener('click', async e => {
    const t = e.target.closest('[data-tool]');
    if (!t || locked) return;
    const st = data.students;
    if (t.dataset.tool === 'auto') {
      st.forEach(x => { const sum = ['sick', 'permit', 'absent'].reduce((a, f) => a + (Number(cur(x, 'attendance', f)) || 0), 0); patch(x.id, 'attendance', 'present', Math.max(0, efektif - sum)); });
      drawTab(); toast('Hadir dihitung: hari efektif − sakit − izin − tanpa keterangan', 'success');
    }
    if (t.dataset.tool === 'zero') {
      st.forEach(x => ['sick', 'permit', 'absent'].forEach(f => { const v = cur(x, 'attendance', f); if (v === null || v === undefined || v === '') patch(x.id, 'attendance', f, 0); }));
      drawTab();
    }
    if (t.dataset.tool === 'xls') {
      exportWorkbook(`Kehadiran_${className}.xlsx`.replace(/\s+/g, '_'), [{ name: 'Kehadiran', title: 'REKAP KEHADIRAN ' + className, subtitle: App.semLabel(), headers: ['NO', 'NISN', 'NIS', 'NAMA', 'KELAS', 'HADIR', 'SAKIT', 'IZIN', 'TIDAK HADIR'], rows: st.map((x, i) => [x.roll_no || i + 1, x.nisn || '', x.nis || '', x.name, className, ...['present', 'sick', 'permit', 'absent'].map(f => cur(x, 'attendance', f) ?? '')]), textCols: [1, 2], widths: [5, 13, 10, 32, 8, 8, 8, 8, 12] }]);
    }
    if (t.dataset.tool === 'massK' || t.dataset.tool === 'massE' || t.dataset.tool === 'massC') massDialog(t.dataset.tool);
  });

  function massDialog(kind) {
    let body;
    if (kind === 'massK') body = `<div class="field mb-2"><label>Nilai</label><select id="m1">${optHtml(optsK, '')}</select></div><div class="field mb-2"><label>Sudah baik</label><select id="m2">${optHtml(dims, '')}</select></div><div class="field mb-2"><label>Perlu penguatan</label><select id="m3">${optHtml(dims, '')}</select></div>`;
    if (kind === 'massE') body = `<div class="field mb-2"><label>Ekstrakurikuler</label><select id="m1">${data.extracurriculars.map(e => `<option value="${e.id}">${esc(e.name)}</option>`).join('')}</select></div><div class="field mb-2"><label>Nilai</label><select id="m2">${optHtml(optsE, '')}</select></div>`;
    if (kind === 'massC') body = `<div class="field mb-2"><label>Catatan wali kelas</label><textarea id="m1" rows="3"></textarea></div>`;
    openModal({
      title: 'Isi Massal', size: 'sm', body: body + '<label class="check"><input type="checkbox" id="m-empty" checked> Hanya yang masih kosong</label>',
      buttons: [{ label: 'Batal' }, { label: 'Terapkan', class: 'btn-primary', onClick: m => {
        const only = $('#m-empty', m.body).checked;
        data.students.forEach(x => {
          if (kind === 'massK') {
            if (only && cur(x, 'card', 'cocurricular_grade')) return;
            const [a, b, c] = ['#m1', '#m2', '#m3'].map(sel => $(sel, m.body).value);
            if (a) patch(x.id, 'card', 'cocurricular_grade', a); if (b) patch(x.id, 'card', 'cocurricular_strong', b); if (c) patch(x.id, 'card', 'cocurricular_weak', c);
          }
          if (kind === 'massE') {
            const eid = $('#m1', m.body).value;
            if (only && ekCur(x, eid).grade) return;
            if (!dirty.has(x.id)) dirty.set(x.id, { attendance: {}, card: {}, ekskul: {} });
            dirty.get(x.id).ekskul[eid] = { grade: $('#m2', m.body).value, description: '' };
          }
          if (kind === 'massC') { if (only && cur(x, 'card', 'homeroom_note')) return; patch(x.id, 'card', 'homeroom_note', $('#m1', m.body).value); }
        });
        drawTab(); updateSave();
      } }]
    });
  }

  async function save() {
    const rows = [...dirty].map(([sid, d]) => {
      const r = { student_id: sid };
      if (Object.keys(d.attendance).length) r.attendance = d.attendance;
      if (Object.keys(d.card).length) r.card = d.card;
      if (Object.keys(d.ekskul).length) r.ekskul = Object.entries(d.ekskul).map(([eid, v]) => ({ extracurricular_id: eid, grade: v.grade, description: v.description, remove: !v.grade }));
      return r;
    });
    try {
      await put('/report-cards', { semester_id: semesterId, class_id: classId, rows });
      toast(`Data ${rows.length} siswa disimpan`, 'success');
      dirty.clear();
      data = await get('/report-cards' + qs({ class_id: classId, semester_id: semesterId }));
      render();
    } catch (e) { errorToast(e); }
  }
  render();
  return { get dirty() { return dirty.size; } };
}
