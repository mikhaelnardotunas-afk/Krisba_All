// Deskripsi rapor per mapel: pilih kompetensi paling dikuasai & perlu ditingkatkan dari bank deskripsi,
// atau tulis manual. Pratinjau kalimat sesuai pengaturan format deskripsi.
import { get, put, post, qs } from '../api.js';
import { App } from '../app.js';
import { icon, esc, toast, errorToast, openModal, $, $$, busy, fmtNum, promptDialog } from '../ui.js';
import { describe, scalesFor, predicateOf } from './describe.js';

export async function mountDeskripsi(root, { semesterId, subjectId, classId }) {
  let data = await get('/comments' + qs({ semester_id: semesterId, subject_id: subjectId, class_id: classId }));
  const dirty = new Map();
  const s = App.settings;
  const sc = scalesFor(data.scales, subjectId);
  const val = (st, f) => (dirty.has(st.id) && f in dirty.get(st.id) ? dirty.get(st.id)[f] : (st.comment ? st.comment[f] || '' : ''));
  const sentence = st => describe({ settings: s, nama: st.name, mapel: data.subject.name, score: st.final, comment: { mastered: val(st, 'mastered'), improve: val(st, 'improve'), custom_text: val(st, 'custom_text') }, scales: sc, style: s.format_raport === 'kementerian' ? 'kementerian' : 'semester' });
  const bankOpts = cur => `<option value="">— pilih —</option>` + data.bank.map(b => `<option${b.text === cur ? ' selected' : ''}>${esc(b.text)}</option>`).join('') + (cur && !data.bank.some(b => b.text === cur) ? `<option selected>${esc(cur)}</option>` : '');

  function render() {
    const filled = data.students.filter(st => val(st, 'mastered') || val(st, 'custom_text')).length;
    root.innerHTML = `
      ${!data.report_type_set ? `<div class="alert warn">${icon('info')}<div>Nilai akhir rapor semester ini belum ditentukan admin, sehingga predikat belum tampil.</div></div>` : ''}
      <div class="toolbar"><span class="muted">${icon('checkCircle', 'icon-sm')} ${filled}/${data.students.length} siswa berdeskripsi · Mode: <b>${esc({ template: 'template + bank deskripsi', otomatis: 'otomatis dari predikat', manual: 'manual' }[s.mode_deskripsi] || s.mode_deskripsi)}</b></span><div class="grow"></div>
        <button class="btn btn-sm" id="d-bank">${icon('plus', 'icon-sm')}Tambah ke bank</button><button class="btn btn-sm" id="d-mass">${icon('zap', 'icon-sm')}Isi massal</button><button class="btn btn-primary btn-sm" id="d-save" disabled>${icon('save')}Simpan</button></div>
      <div class="table-wrap" style="max-height:68vh"><table class="tbl tbl-compact"><thead><tr><th>No</th><th>Nama</th><th>Nilai</th><th style="min-width:220px">Paling dikuasai</th><th style="min-width:220px">Perlu ditingkatkan</th><th style="min-width:300px">Kalimat rapor</th></tr></thead><tbody>
      ${data.students.map((st, i) => {
        const g = predicateOf(st.final, sc);
        const dis = st.finalized ? ' disabled' : '';
        return `<tr data-sid="${st.id}"><td>${st.roll_no || i + 1}</td><td style="white-space:nowrap">${esc(st.name)}</td><td class="c"><b>${fmtNum(st.final)}</b>${g ? `<div class="badge navy">${esc(g.predicate)}</div>` : ''}</td>
          <td><select class="input-sm" data-f="mastered"${dis}>${bankOpts(val(st, 'mastered'))}</select></td>
          <td><select class="input-sm" data-f="improve"${dis}>${bankOpts(val(st, 'improve'))}</select></td>
          <td><div data-prev style="font-size:12.5px">${esc(sentence(st)) || '<span class="soft">—</span>'}</div><button class="btn btn-xs btn-ghost mt-1" data-manual${dis}>${icon('pen', 'icon-sm')}${val(st, 'custom_text') ? 'Ubah teks manual' : 'Tulis manual'}</button></td></tr>`;
      }).join('')}</tbody></table></div>`;
    $('#d-save', root).onclick = e => busy(e.currentTarget, save);
    $('#d-mass', root).onclick = mass;
    $('#d-bank', root).onclick = addBank;
    upd();
  }
  const upd = () => { const b = $('#d-save', root); if (b) { b.disabled = !dirty.size; b.innerHTML = `${icon('save')}Simpan${dirty.size ? ` (${dirty.size})` : ''}`; } };
  const setF = (sid, f, v) => { if (!dirty.has(sid)) dirty.set(sid, {}); dirty.get(sid)[f] = v; upd(); };
  root.addEventListener('change', e => {
    const tr = e.target.closest('tr[data-sid]');
    if (!tr || !e.target.dataset.f) return;
    setF(tr.dataset.sid, e.target.dataset.f, e.target.value);
    const st = data.students.find(x => x.id === tr.dataset.sid);
    $('[data-prev]', tr).textContent = sentence(st);
    e.target.style.background = '#fff8e1';
  });
  root.addEventListener('click', async e => {
    const b = e.target.closest('[data-manual]');
    if (!b) return;
    const tr = b.closest('tr');
    const st = data.students.find(x => x.id === tr.dataset.sid);
    const v = await promptDialog('Deskripsi manual (kosongkan untuk kembali memakai template)', { title: st.name, value: val(st, 'custom_text') || sentence(st), multiline: true, required: false });
    if (v === null) return;
    setF(st.id, 'custom_text', v);
    $('[data-prev]', tr).textContent = sentence(st);
  });
  function mass() {
    openModal({
      title: 'Isi Massal Deskripsi', size: 'sm',
      body: `<div class="field mb-2"><label>Paling dikuasai</label><select id="m1">${bankOpts('')}</select></div><div class="field mb-2"><label>Perlu ditingkatkan</label><select id="m2">${bankOpts('')}</select></div><label class="check"><input type="checkbox" id="m3" checked> Hanya siswa yang masih kosong</label>`,
      buttons: [{ label: 'Batal' }, { label: 'Terapkan', class: 'btn-primary', onClick: m => {
        const a = $('#m1', m.body).value, b = $('#m2', m.body).value, only = $('#m3', m.body).checked;
        data.students.forEach(st => { if (st.finalized || (only && val(st, 'mastered'))) return; if (a) setF(st.id, 'mastered', a); if (b) setF(st.id, 'improve', b); });
        render();
      } }]
    });
  }
  async function addBank() {
    const t = await promptDialog('Teks deskripsi baru (satu baris = satu deskripsi)', { title: 'Tambah ke Bank Deskripsi ' + data.subject.name, multiline: true });
    if (!t) return;
    try {
      const items = t.split(/\r?\n/).map(x => x.trim()).filter(Boolean).map(text => ({ subject_id: subjectId, grade_level: String(data.class.grade_level), text }));
      await post('/description-bank', { items });
      const fresh = await get('/comments' + qs({ semester_id: semesterId, subject_id: subjectId, class_id: classId }));
      data.bank = fresh.bank;
      render();
      toast(`${items.length} deskripsi ditambahkan`, 'success');
    } catch (e) { errorToast(e); }
  }
  async function save() {
    try {
      const rows = [...dirty].map(([sid, d]) => {
        const st = data.students.find(x => x.id === sid);
        return { student_id: sid, mastered: d.mastered ?? val(st, 'mastered'), improve: d.improve ?? val(st, 'improve'), custom_text: d.custom_text ?? val(st, 'custom_text') };
      });
      await put('/comments', { semester_id: semesterId, subject_id: subjectId, class_id: classId, rows });
      toast(`Deskripsi ${rows.length} siswa disimpan`, 'success');
      dirty.clear();
      data = await get('/comments' + qs({ semester_id: semesterId, subject_id: subjectId, class_id: classId }));
      render();
    } catch (e) { errorToast(e); }
  }
  render();
}
