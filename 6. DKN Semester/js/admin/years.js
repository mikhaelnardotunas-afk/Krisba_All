// Tahun pelajaran, semester (aktivasi & pengaturan rapor), kenaikan kelas.
import { get, post, put, del, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, formModal, confirmDialog, openModal, fmtDate, $, $$, busy } from '../ui.js';
import { invalidate, opt } from '../common.js';

export async function yearsPage(el) {
  const years = await get('/years');
  el.innerHTML = pageHead('Tahun Pelajaran', 'Data setiap tahun pelajaran tersimpan permanen dan dapat dibuka kembali kapan saja.',
    `<button class="btn btn-primary" id="add">${icon('plus')}Tambah Tahun Pelajaran</button>`) +
    `<div class="grid grid-2" id="years"></div>
     <div class="card mt-3"><div class="card-head"><h3>${icon('arrowUp')} Kenaikan Kelas / Penempatan Siswa ke Tahun Baru</h3></div><div class="card-body" id="promo"></div></div>`;
  const box = $('#years', el);
  box.innerHTML = years.length ? years.map(y => `
    <div class="card"><div class="card-head"><h3>${icon('calendar')} ${esc(y.name)} ${y.is_active ? '<span class="badge green">Aktif</span>' : ''}</h3>
      <div class="btn-group"><button class="btn btn-xs" data-edit="${y.id}">${icon('edit', 'icon-sm')}Ubah</button>${!y.is_active ? `<button class="btn btn-xs btn-danger" data-del="${y.id}">${icon('trash', 'icon-sm')}</button>` : ''}</div></div>
      <div class="card-body">
        <div class="muted mb-2" style="font-size:12.5px">${fmtDate(y.start_date)} – ${fmtDate(y.end_date)} · ${y.classes} kelas · ${y.students} siswa</div>
        ${y.semesters.map(s => `<div class="flex between" style="padding:10px 0;border-top:1px solid var(--border)">
          <div><b>Semester ${esc(s.name)}</b> ${s.is_active ? '<span class="badge green">Semester aktif</span>' : ''}<div class="muted" style="font-size:12px">${fmtDate(s.start_date)} – ${fmtDate(s.end_date)}${s.report_date ? ' · Rapor: ' + esc(s.report_date) : ''}</div></div>
          <div class="btn-group">${!s.is_active ? `<button class="btn btn-xs btn-gold" data-act="${s.id}">Aktifkan</button>` : ''}<button class="btn btn-xs" data-sem="${s.id}">${icon('settings', 'icon-sm')}Atur</button><button class="btn btn-xs btn-ghost" data-view="${s.id}">${icon('eye', 'icon-sm')}Buka</button></div>
        </div>`).join('')}
      </div></div>`).join('') : `<div class="card card-body">Belum ada tahun pelajaran.</div>`;

  $('#add', el).onclick = () => formModal({
    title: 'Tambah Tahun Pelajaran',
    fields: [
      { name: 'name', label: 'Tahun pelajaran', required: true, placeholder: '2027/2028', help: 'Format: 2027/2028' },
      { name: 'copy_classes_from', label: 'Salin daftar kelas & wali dari', type: 'select', placeholder: '(tidak menyalin)', options: years.map(y => ({ value: y.id, label: y.name })) },
      { name: 'start_date', label: 'Tanggal mulai', type: 'date' },
      { name: 'end_date', label: 'Tanggal selesai', type: 'date' }
    ],
    intro: 'Semester Ganjil dan Genap dibuat otomatis. Data tahun sebelumnya tidak berubah.',
    onSubmit: async d => {
      const r = await post('/years', d);
      toast(`Tahun pelajaran ${d.name} dibuat${r.copied_classes ? `, ${r.copied_classes} kelas disalin` : ''}`, 'success');
      await App.reloadBoot(); App.refresh();
    }
  });
  box.addEventListener('click', async e => {
    const b = e.target.closest('button');
    if (!b) return;
    try {
      if (b.dataset.act) {
        const s = App.semesters.find(x => x.id === b.dataset.act);
        if (!(await confirmDialog(`Jadikan ${s.year_name} semester ${s.name} sebagai semester AKTIF? Guru akan bekerja pada semester ini.`))) return;
        await post(`/semesters/${s.id}/activate`);
        toast('Semester aktif diganti', 'success');
        App.semester = null;
        try { localStorage.removeItem('sipas_sem_view'); } catch (er) { /* abaikan */ }
        await App.reloadBoot(); invalidate(); App.refresh();
      } else if (b.dataset.view) {
        App.semester = App.semesters.find(x => x.id === b.dataset.view);
        try { localStorage.setItem('sipas_sem_view', App.semester.id); } catch (er) { /* abaikan */ }
        document.getElementById('sem-select').value = App.semester.id;
        document.getElementById('sem-select').dispatchEvent(new Event('change'));
        App.go('dashboard');
      } else if (b.dataset.sem) semesterSettings(b.dataset.sem);
      else if (b.dataset.edit) {
        const y = years.find(x => x.id === b.dataset.edit);
        formModal({
          title: 'Ubah Tahun Pelajaran', values: y,
          fields: [{ name: 'name', label: 'Tahun pelajaran', required: true }, { name: 'start_date', label: 'Tanggal mulai', type: 'date' }, { name: 'end_date', label: 'Tanggal selesai', type: 'date' }],
          onSubmit: async d => { await put('/years/' + y.id, d); toast('Disimpan', 'success'); await App.reloadBoot(); App.refresh(); }
        });
      } else if (b.dataset.del) {
        if (!(await confirmDialog('Hapus tahun pelajaran ini? Hanya tahun yang belum berisi data yang dapat dihapus.', { danger: true }))) return;
        await del('/years/' + b.dataset.del);
        toast('Dihapus', 'success'); await App.reloadBoot(); App.refresh();
      }
    } catch (er) { errorToast(er); }
  });
  promotion($('#promo', el), years);
}

async function semesterSettings(semId) {
  const s = App.semesters.find(x => x.id === semId);
  const { types } = await get('/assessment-types' + qs({ semester_id: semId }));
  const topts = types.map(t => ({ value: t.id, label: t.name }));
  formModal({
    title: `Pengaturan Semester ${s.name} ${s.year_name}`, size: 'lg', values: s,
    intro: 'Tentukan jenis penilaian yang menjadi <b>nilai akhir rapor</b>. Leger per semester dan halaman cek nilai juga memakai pengaturan ini.',
    fields: [
      { name: 'start_date', label: 'Tanggal mulai', type: 'date' }, { name: 'end_date', label: 'Tanggal selesai', type: 'date' },
      { name: 'report_place', label: 'Tempat penandatanganan rapor', placeholder: 'Basaan' },
      { name: 'report_date', label: 'Tanggal rapor (teks)', placeholder: '20 Desember 2026' },
      { name: 'report_assessment_type_id', label: 'Nilai akhir rapor diambil dari', type: 'select', placeholder: '(belum diatur)', options: topts, full: true },
      { name: 'mid_assessment_type_id', label: 'Laporan tengah semester diambil dari', type: 'select', placeholder: '(sama dengan rapor)', options: topts },
      { name: 'skill_assessment_type_id', label: 'Nilai keterampilan (format K13 terpisah)', type: 'select', placeholder: '(tidak dipakai)', options: topts }
    ],
    onSubmit: async d => {
      await put('/semesters/' + semId, d);
      toast('Pengaturan semester disimpan', 'success');
      await App.reloadBoot(); App.refresh();
    }
  });
}

async function promotion(box, years) {
  if (years.length < 1) { box.innerHTML = '<p class="muted">Belum ada tahun pelajaran.</p>'; return; }
  const yopt = (sel) => opt(years, 'id', 'name', sel);
  const cur = years.find(y => y.is_active) || years[0];
  const next = years.find(y => y.name > cur.name) || cur;
  box.innerHTML = `<p class="muted">Pilih kelas asal (tahun lama) lalu kelas tujuan (tahun baru). Riwayat kelas tahun sebelumnya tetap tersimpan.</p>
    <div class="filters">
      <div class="field"><label>Tahun asal</label><select id="p-y1">${yopt(cur.id)}</select></div>
      <div class="field"><label>Kelas asal</label><select id="p-c1"></select></div>
      <div class="field"><label>Tahun tujuan</label><select id="p-y2">${yopt(next.id)}</select></div>
      <div class="field"><label>Kelas tujuan</label><select id="p-c2"></select></div>
    </div><div id="p-list" class="mt-2"></div>`;
  const loadClasses = async (yid, sel) => { const cls = await get('/classes' + qs({ year_id: yid })); $(sel, box).innerHTML = opt(cls, 'id', c => `${c.name} (${c.students} siswa)`, null, '— pilih kelas —'); };
  await loadClasses($('#p-y1', box).value, '#p-c1');
  await loadClasses($('#p-y2', box).value, '#p-c2');
  $('#p-y1', box).onchange = e => loadClasses(e.target.value, '#p-c1');
  $('#p-y2', box).onchange = e => loadClasses(e.target.value, '#p-c2');
  $('#p-c1', box).onchange = async e => {
    const list = $('#p-list', box);
    if (!e.target.value) { list.innerHTML = ''; return; }
    const st = await get('/students' + qs({ year_id: $('#p-y1', box).value, class_id: e.target.value }));
    list.innerHTML = `<div class="table-wrap" style="max-height:320px"><table class="tbl tbl-compact"><thead><tr><th><input type="checkbox" id="p-all" checked></th><th>No</th><th>Nama</th><th>NISN</th><th>Status</th></tr></thead><tbody>
      ${st.map(s => `<tr><td><input type="checkbox" class="p-s" value="${s.id}"${s.status === 'aktif' ? ' checked' : ''}></td><td>${s.roll_no || ''}</td><td>${esc(s.name)}</td><td>${esc(s.nisn || '')}</td><td>${esc(s.status)}</td></tr>`).join('')}</tbody></table></div>
      <div class="btn-group mt-2"><button class="btn btn-primary" id="p-go">${icon('arrowUp')}Pindahkan siswa terpilih</button></div>`;
    $('#p-all', list).onchange = ev => $$('.p-s', list).forEach(c => { c.checked = ev.target.checked; });
    $('#p-go', list).onclick = ev => busy(ev.currentTarget, async () => {
      const ids = $$('.p-s:checked', list).map(c => c.value);
      const to = $('#p-c2', box).value;
      if (!to) return toast('Pilih kelas tujuan', 'warning');
      if (!ids.length) return toast('Pilih siswa', 'warning');
      try { const r = await post('/students/move', { ids, class_id: to }); toast(`${r.moved} siswa ditempatkan`, 'success'); invalidate('classes'); await loadClasses($('#p-y2', box).value, '#p-c2'); }
      catch (er) { errorToast(er); }
    });
  };
}
