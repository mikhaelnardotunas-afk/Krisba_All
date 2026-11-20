// Data master: siswa, guru, kelas, mapel, wali kelas, pembagian tugas, ekskul, bank deskripsi, pengguna.
import { get, post, put, del, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, formModal, confirmDialog, openModal, DataTable, fmtDate, $, $$, busy, promptDialog, fmtNum } from '../ui.js';
import { refs, invalidate, opt } from '../common.js';
import { exportWorkbook } from '../shared/xlsx.js';

const statusBadgeS = s => `<span class="badge ${{ aktif: 'green', pindah: 'yellow', keluar: 'red', lulus: 'blue' }[s] || 'gray'}">${esc(s)}</span>`;

// ===================== SISWA =====================
export async function studentsPage(el) {
  const classes = await refs.classes();
  let rows = await get('/students' + qs({ year_id: App.semester.year_id, all: 1 }));
  el.innerHTML = pageHead('Data Siswa', `${esc(App.semester.year_name)} · ${rows.filter(r => r.class_id).length} siswa berkelas`,
    `<a class="btn" href="#impor?entity=students">${icon('upload')}Impor Excel</a><button class="btn" id="exp">${icon('download')}Ekspor</button><button class="btn btn-primary" id="add">${icon('plus')}Tambah Siswa</button>`) +
    `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const fields = (isNew) => [
    { name: 'nis', label: 'NIS' }, { name: 'nisn', label: 'NISN', help: 'Angka saja' },
    { name: 'name', label: 'Nama lengkap', required: true, full: true },
    { name: 'gender', label: 'Jenis kelamin', type: 'select', placeholder: '-', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
    { name: 'religion', label: 'Agama' },
    { name: 'birth_place', label: 'Tempat lahir' }, { name: 'birth_date', label: 'Tanggal lahir', type: 'date' },
    { name: 'address', label: 'Alamat', type: 'textarea', full: true, rows: 2 },
    { name: 'parent_name', label: 'Nama orang tua/wali' }, { name: 'parent_phone', label: 'No. HP orang tua' },
    { name: 'class_id', label: `Kelas (${App.semester.year_name})`, type: 'select', placeholder: '— belum berkelas —', options: classes.map(c => ({ value: c.id, label: c.name })) },
    { name: 'roll_no', label: 'No. absen', type: 'number', min: 1 },
    { name: 'status', label: 'Status siswa', type: 'select', options: ['aktif', 'pindah', 'keluar', 'lulus'].map(v => ({ value: v, label: v })), value: 'aktif' }
  ];
  const reload = async () => { rows = await get('/students' + qs({ year_id: App.semester.year_id, all: 1 })); dt.setRows(rows); };
  const edit = (r) => formModal({
    title: r ? 'Ubah Data Siswa' : 'Tambah Siswa', size: 'lg', fields: fields(!r), values: r || { status: 'aktif' },
    onSubmit: async d => {
      if (d.roll_no === '') delete d.roll_no;
      if (!d.class_id) delete d.class_id;
      if (r) await put('/students/' + r.id, d); else await post('/students', d);
      toast('Data siswa disimpan', 'success'); invalidate('classes'); await reload();
    }
  });
  const dt = new DataTable($('#tbl', el), {
    rows, selectable: true, pageSize: 50,
    searchKeys: ['name', 'nis', 'nisn', 'class_name'], searchPlaceholder: 'Cari nama, NIS, NISN...',
    filters: [
      { key: 'class_id', label: 'Kelas', options: [...classes.map(c => ({ value: c.id, label: c.name })), { value: '__none', label: 'Belum berkelas' }], match: (r, v) => (v === '__none' ? !r.class_id : r.class_id === v) },
      { key: 'status', label: 'Status', options: ['aktif', 'pindah', 'keluar', 'lulus'].map(v => ({ value: v, label: v })) },
      { key: 'gender', label: 'L/P', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] }
    ],
    toolbar: `<button class="btn btn-sm" data-bulk="move" disabled>${icon('arrowUp', 'icon-sm')}Pindah kelas</button><button class="btn btn-sm" data-bulk="renum">${icon('sliders', 'icon-sm')}Urutkan absen A–Z</button><button class="btn btn-sm btn-danger" data-bulk="del" disabled>${icon('trash', 'icon-sm')}Hapus</button>`,
    columns: [
      { key: 'roll_no', label: 'No', width: '50px', cls: 'c' },
      { key: 'nis', label: 'NIS', cls: 'mono' }, { key: 'nisn', label: 'NISN', cls: 'mono' },
      { key: 'name', label: 'Nama Lengkap', render: r => `<b>${esc(r.name)}</b>` },
      { key: 'gender', label: 'L/P', cls: 'c' },
      { key: 'class_name', label: 'Kelas', render: r => r.class_name ? `<span class="chip">${esc(r.class_name)}</span>` : '<span class="soft">—</span>' },
      { key: 'birth_date', label: 'Tempat, Tgl Lahir', render: r => esc([r.birth_place, r.birth_date ? fmtDate(r.birth_date) : ''].filter(Boolean).join(', ')) },
      { key: 'status', label: 'Status', render: r => statusBadgeS(r.status) },
      { label: '', sortable: false, cls: 'actions', render: () => `<button class="btn btn-xs btn-icon" data-act="hist" title="Riwayat kelas">${icon('history', 'icon-sm')}</button><button class="btn btn-xs btn-icon" data-act="edit" title="Ubah">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del" title="Hapus">${icon('trash', 'icon-sm')}</button>` }
    ],
    onSelect: ids => $$('[data-bulk="move"],[data-bulk="del"]', el).forEach(b => { b.disabled = !ids.length; }),
    onAction: async (a, r) => {
      try {
        if (a === 'edit') edit(r);
        if (a === 'hist') {
          const h = await get(`/students/${r.id}/history`);
          openModal({ title: 'Riwayat Kelas: ' + r.name, body: h.length ? `<ul class="list-plain">${h.map(x => `<li><b>${esc(x.year_name)}</b><span class="grow"></span><span class="chip">${esc(x.class_name)}</span>${x.roll_no ? ` No. ${x.roll_no}` : ''}</li>`).join('')}</ul>` : 'Belum ada riwayat kelas.' });
        }
        if (a === 'del') {
          if (!(await confirmDialog(`Hapus siswa ${r.name}? Siswa yang sudah memiliki nilai tidak dapat dihapus (ubah status menjadi pindah/keluar).`, { danger: true }))) return;
          await del('/students/' + r.id); toast('Siswa dihapus', 'success'); await reload();
        }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => edit(null);
  $('#exp', el).onclick = () => exportWorkbook(`Data_Siswa_${App.semester.year_name.replace('/', '-')}.xlsx`, [{
    name: 'Siswa', title: 'DATA SISWA ' + App.settings.nama_sekolah, subtitle: 'Tahun Pelajaran ' + App.semester.year_name,
    headers: ['No', 'NIS', 'NISN', 'Nama', 'L/P', 'Kelas', 'No Absen', 'Tempat Lahir', 'Tanggal Lahir', 'Agama', 'Alamat', 'Orang Tua', 'HP Orang Tua', 'Status'],
    rows: dt.filtered().map((r, i) => [i + 1, r.nis || '', r.nisn || '', r.name, r.gender || '', r.class_name || '', r.roll_no || '', r.birth_place || '', r.birth_date || '', r.religion || '', r.address || '', r.parent_name || '', r.parent_phone || '', r.status]),
    textCols: [1, 2, 12], widths: [5, 10, 13, 32, 5, 8, 8, 14, 12, 10, 30, 22, 14, 9]
  }]);
  el.addEventListener('click', async e => {
    const b = e.target.closest('[data-bulk]');
    if (!b) return;
    const ids = [...dt.selected];
    try {
      if (b.dataset.bulk === 'move') {
        openModal({
          title: `Pindah ${ids.length} siswa ke kelas`, size: 'sm',
          body: `<div class="field"><label>Kelas tujuan (${esc(App.semester.year_name)})</label><select id="mv">${opt(classes, 'id', 'name')}</select></div>`,
          buttons: [{ label: 'Batal' }, { label: 'Pindahkan', class: 'btn-primary', onClick: async m => { await post('/students/move', { ids, class_id: $('#mv', m.body).value }); toast('Siswa dipindahkan', 'success'); dt.clearSelection(); invalidate('classes'); await reload(); } }]
        });
      } else if (b.dataset.bulk === 'del') {
        if (!(await confirmDialog(`Hapus ${ids.length} siswa terpilih? Siswa yang sudah memiliki nilai akan dilewati.`, { danger: true }))) return;
        const r = await post('/students/bulk-delete', { ids });
        toast(`${r.deleted} siswa dihapus${r.blocked.length ? `, ${r.blocked.length} dilewati karena sudah memiliki nilai` : ''}`, r.blocked.length ? 'warning' : 'success');
        dt.clearSelection(); await reload();
      } else if (b.dataset.bulk === 'renum') {
        const cid = dt.fv.class_id;
        if (!cid || cid === '__none') return toast('Pilih filter kelas terlebih dahulu', 'warning');
        if (!(await confirmDialog('Urutkan ulang nomor absen kelas ini berdasarkan abjad nama?'))) return;
        await post('/students/renumber', { class_id: cid }); toast('Nomor absen diurutkan', 'success'); await reload();
      }
    } catch (er) { errorToast(er); }
  });
}

// ===================== GURU =====================
export async function teachersPage(el) {
  const subjects = await refs.subjects();
  let rows = await get('/teachers');
  el.innerHTML = pageHead('Data Guru', 'Akun login guru dibuat bersama data guru.',
    `<a class="btn" href="#impor?entity=teachers">${icon('upload')}Impor Excel</a><button class="btn btn-primary" id="add">${icon('plus')}Tambah Guru</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { invalidate('teachers'); rows = await get('/teachers'); dt.setRows(rows); };
  const subjOpts = subjects.map(s => ({ value: s.id, label: s.name }));
  const edit = r => formModal({
    title: r ? 'Ubah Data Guru' : 'Tambah Guru', size: 'lg',
    values: r ? { ...r, subject_ids: r.subjects.map(s => s.id) } : { active: 1 },
    fields: [
      { name: 'name', label: 'Nama lengkap (dengan gelar)', required: true, full: true },
      { name: 'nip', label: 'NIP' }, { name: 'nuptk', label: 'NUPTK' },
      { name: 'gender', label: 'Jenis kelamin', type: 'select', placeholder: '-', options: [{ value: 'L', label: 'Laki-laki' }, { value: 'P', label: 'Perempuan' }] },
      { name: 'phone', label: 'No. HP' }, { name: 'email', label: 'Email', type: 'email' },
      { name: 'active', label: 'Guru aktif (dapat login)', type: 'switch' },
      { type: 'section', label: 'Akun login' },
      { name: 'username', label: 'Username', required: !r || !r.username, autocomplete: 'off' },
      { name: 'password', label: r ? 'Reset password (kosongkan bila tidak diubah)' : 'Password awal', type: 'password', required: !r, help: 'Min. 8 karakter, huruf & angka. Guru wajib menggantinya saat login pertama.', autocomplete: 'new-password' },
      { name: 'subject_ids', label: 'Mata pelajaran yang diampu', type: 'multiselect', options: subjOpts, full: true }
    ],
    onSubmit: async d => {
      if (!d.password) delete d.password;
      if (r) await put('/teachers/' + r.id, d); else await post('/teachers', d);
      toast('Data guru disimpan', 'success'); await reload();
    }
  });
  const dt = new DataTable($('#tbl', el), {
    rows, searchKeys: ['name', 'nip', 'nuptk', 'username'],
    filters: [{ key: 'active', label: 'Status', options: [{ value: '1', label: 'Aktif' }, { value: '0', label: 'Nonaktif' }], match: (r, v) => String(r.active) === v }],
    columns: [
      { key: 'name', label: 'Nama Guru', render: r => `<b>${esc(r.name)}</b><div class="soft mono" style="font-size:11.5px">${esc(r.nip ? 'NIP ' + r.nip : r.nuptk ? 'NUPTK ' + r.nuptk : '')}</div>` },
      { key: 'username', label: 'Username', render: r => r.username ? `<span class="mono">${esc(r.username)}</span>` : '<span class="badge yellow">Belum ada akun</span>' },
      { key: 'subjects', label: 'Mapel diampu', sortable: false, render: r => `<div class="chips">${r.subjects.map(s => `<span class="chip">${esc(s.code)}</span>`).join('') || '<span class="soft">—</span>'}</div>` },
      { key: 'homeroom', label: 'Wali kelas', sortValue: r => r.homeroom.join(','), render: r => esc(r.homeroom.join(', ') || '—') },
      { key: 'assignments', label: 'Tugas', cls: 'c' },
      { key: 'last_login_at', label: 'Login terakhir', render: r => r.last_login_at ? fmtDate(r.last_login_at, true) : '<span class="soft">—</span>' },
      { key: 'active', label: 'Status', render: r => r.active ? '<span class="badge green">Aktif</span>' : '<span class="badge gray">Nonaktif</span>' },
      { label: '', sortable: false, cls: 'actions', render: () => `<button class="btn btn-xs btn-icon" data-act="edit" title="Ubah">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del" title="Hapus">${icon('trash', 'icon-sm')}</button>` }
    ],
    onAction: async (a, r) => {
      try {
        if (a === 'edit') edit(r);
        if (a === 'del') {
          if (!(await confirmDialog(`Hapus guru ${r.name} beserta akun login-nya?`, { danger: true }))) return;
          await del('/teachers/' + r.id); toast('Guru dihapus', 'success'); await reload();
        }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => edit(null);
}

// ===================== KELAS =====================
export async function classesPage(el) {
  const teachers = await refs.teachers();
  let rows = await refs.classes();
  el.innerHTML = pageHead('Data Kelas', `Tahun pelajaran ${esc(App.semester.year_name)}`,
    `<a class="btn" href="#impor?entity=classes">${icon('upload')}Impor Excel</a><button class="btn btn-primary" id="add">${icon('plus')}Tambah Kelas</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { invalidate('classes'); rows = await refs.classes(); dt.setRows(rows); };
  const edit = r => formModal({
    title: r ? 'Ubah Kelas' : 'Tambah Kelas', values: r || { grade_level: 7, sort_order: 0 },
    fields: [
      { name: 'name', label: 'Nama kelas', required: true, placeholder: 'VII A' },
      { name: 'grade_level', label: 'Tingkat', type: 'select', required: true, options: [7, 8, 9, 10, 11, 12, 1, 2, 3, 4, 5, 6].map(v => ({ value: v, label: 'Kelas ' + v })) },
      { name: 'report_label', label: 'Label kelas di rapor', placeholder: 'VII' },
      { name: 'sort_order', label: 'Urutan', type: 'number' },
      { name: 'homeroom_teacher_id', label: 'Wali kelas', type: 'select', placeholder: '— belum ada —', options: teachers.filter(t => t.active).map(t => ({ value: t.id, label: t.name })), full: true }
    ],
    onSubmit: async d => {
      d.grade_level = Number(d.grade_level);
      d.sort_order = Number(d.sort_order || 0);
      if (r) await put('/classes/' + r.id, d); else await post('/classes', { ...d, academic_year_id: App.semester.year_id });
      toast('Kelas disimpan', 'success'); invalidate('teachers'); await reload();
    }
  });
  const dt = new DataTable($('#tbl', el), {
    rows, searchKeys: ['name', 'homeroom_name'],
    filters: [{ key: 'grade_level', label: 'Tingkat', options: [...new Set(rows.map(r => r.grade_level))].map(v => ({ value: String(v), label: 'Kelas ' + v })), match: (r, v) => String(r.grade_level) === v }],
    columns: [
      { key: 'name', label: 'Kelas', render: r => `<b>${esc(r.name)}</b>` },
      { key: 'grade_level', label: 'Tingkat', cls: 'c' },
      { key: 'report_label', label: 'Label rapor' },
      { key: 'homeroom_name', label: 'Wali Kelas', render: r => esc(r.homeroom_name || '—') },
      { key: 'students', label: 'Siswa', cls: 'c' },
      { label: '', sortable: false, cls: 'actions', render: r => `<a class="btn btn-xs" href="#siswa">${icon('student', 'icon-sm')}</a><button class="btn btn-xs btn-icon" data-act="edit">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del">${icon('trash', 'icon-sm')}</button>` }
    ],
    onAction: async (a, r) => {
      try {
        if (a === 'edit') edit(r);
        if (a === 'del') { if (!(await confirmDialog(`Hapus kelas ${r.name}?`, { danger: true }))) return; await del('/classes/' + r.id); toast('Kelas dihapus', 'success'); await reload(); }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => edit(null);
}

// ===================== MATA PELAJARAN =====================
export async function subjectsPage(el) {
  let rows = await get('/subjects');
  el.innerHTML = pageHead('Mata Pelajaran', `KKTP kosong = memakai KKTP umum sekolah (${esc(App.settings.kktp_umum)})`,
    `<a class="btn" href="#impor?entity=subjects">${icon('upload')}Impor Excel</a><button class="btn btn-primary" id="add">${icon('plus')}Tambah Mapel</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { invalidate('subjects'); rows = await get('/subjects'); dt.setRows(rows); };
  const edit = r => formModal({
    title: r ? 'Ubah Mata Pelajaran' : 'Tambah Mata Pelajaran', values: r || { group_name: 'A', active: 1, sort_order: rows.length + 1 },
    fields: [
      { name: 'code', label: 'Kode', required: true, placeholder: 'MTK' }, { name: 'name', label: 'Nama mata pelajaran', required: true },
      { name: 'group_name', label: 'Kelompok', help: 'A, B, Muatan Lokal, dst.' }, { name: 'kktp', label: 'KKTP khusus mapel', type: 'number', min: 0, max: 100, step: '0.01' },
      { name: 'sort_order', label: 'Urutan di rapor/leger', type: 'number' }, { name: 'active', label: 'Aktif', type: 'switch' }
    ],
    onSubmit: async d => {
      d.sort_order = Number(d.sort_order || 0);
      if (r) await put('/subjects/' + r.id, d); else await post('/subjects', d);
      toast('Mata pelajaran disimpan', 'success'); await reload();
    }
  });
  const dt = new DataTable($('#tbl', el), {
    rows, sort: { key: 'sort_order', dir: 'asc' }, searchKeys: ['code', 'name', 'group_name'],
    filters: [{ key: 'group_name', label: 'Kelompok', options: [...new Set(rows.map(r => r.group_name))].map(v => ({ value: v, label: v })) }],
    columns: [
      { key: 'sort_order', label: 'Urut', cls: 'c', width: '60px' }, { key: 'code', label: 'Kode', cls: 'mono' },
      { key: 'name', label: 'Nama Mata Pelajaran', render: r => `<b>${esc(r.name)}</b>` }, { key: 'group_name', label: 'Kelompok' },
      { key: 'kktp', label: 'KKTP', cls: 'c', render: r => r.kktp === null ? `<span class="soft">${esc(App.settings.kktp_umum)} (umum)</span>` : fmtNum(r.kktp) },
      { key: 'active', label: 'Status', render: r => r.active ? '<span class="badge green">Aktif</span>' : '<span class="badge gray">Nonaktif</span>' },
      { label: '', sortable: false, cls: 'actions', render: () => `<button class="btn btn-xs btn-icon" data-act="edit">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del">${icon('trash', 'icon-sm')}</button>` }
    ],
    onAction: async (a, r) => {
      try {
        if (a === 'edit') edit(r);
        if (a === 'del') { if (!(await confirmDialog(`Hapus mapel ${r.name}?`, { danger: true }))) return; await del('/subjects/' + r.id); toast('Dihapus', 'success'); await reload(); }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => edit(null);
}

// ===================== WALI KELAS =====================
export async function homeroomPage(el) {
  const [classes, teachers] = await Promise.all([refs.classes(), refs.teachers()]);
  el.innerHTML = pageHead('Wali Kelas', `Atur wali kelas untuk tahun pelajaran ${esc(App.semester.year_name)}. Wali kelas mengisi kehadiran, kokurikuler, ekskul, dan catatan rapor.`) +
    `<div class="card"><div class="table-wrap" style="border:0"><table class="tbl"><thead><tr><th>Kelas</th><th>Tingkat</th><th>Siswa</th><th style="min-width:260px">Wali Kelas</th><th></th></tr></thead><tbody>
    ${classes.map(c => `<tr><td><b>${esc(c.name)}</b></td><td>${c.grade_level}</td><td>${c.students}</td><td><select data-c="${c.id}">${opt(teachers.filter(t => t.active), 'id', 'name', c.homeroom_teacher_id, '— belum ada —')}</select></td><td class="actions"><span class="save-ind" data-ind="${c.id}"></span></td></tr>`).join('') || '<tr><td colspan="5" class="center muted">Belum ada kelas</td></tr>'}
    </tbody></table></div></div>`;
  $$('select[data-c]', el).forEach(s => s.onchange = async () => {
    const ind = $(`[data-ind="${s.dataset.c}"]`, el);
    try { await put('/classes/' + s.dataset.c, { homeroom_teacher_id: s.value || null }); ind.className = 'save-ind ok'; ind.innerHTML = icon('checkCircle', 'icon-sm') + 'Tersimpan'; invalidate('classes', 'teachers'); }
    catch (e) { errorToast(e); ind.className = 'save-ind err'; ind.textContent = 'Gagal'; }
  });
}

// ===================== PEMBAGIAN TUGAS =====================
export async function assignmentsPage(el) {
  const [classes, subjects, teachers] = await Promise.all([refs.classes(), refs.subjects(), refs.teachers()]);
  let asg = await get('/assignments' + qs({ semester_id: App.semester.id }));
  const act = subjects.filter(s => s.active);
  const tActive = teachers.filter(t => t.active);
  const key = (s, c) => s + '|' + c;
  const map = new Map(asg.map(a => [key(a.subject_id, a.class_id), a.teacher_id]));
  const changed = new Map();
  el.innerHTML = pageHead('Pembagian Tugas Mengajar', `${esc(App.semLabel())} · Satu guru per mapel per kelas. Guru dapat mengampu banyak kelas & mapel.`,
    `<button class="btn" id="copy">${icon('copy')}Salin dari semester lain</button><a class="btn" href="#impor?entity=assignments">${icon('upload')}Impor</a><button class="btn btn-primary" id="save" disabled>${icon('save')}Simpan Perubahan</button>`) +
    `<div class="tabs"><div class="tab active" data-v="matrix">${icon('table', 'icon-sm')}Matriks Kelas × Mapel</div><div class="tab" data-v="list">${icon('users', 'icon-sm')}Per Guru</div></div><div id="view"></div>`;
  const tOpts = sel => `<option value="">—</option>` + tActive.map(t => `<option value="${t.id}"${t.id === sel ? ' selected' : ''}>${esc(t.name)}</option>`).join('');
  const matrix = () => `<div class="card"><div class="card-body"><div class="toolbar"><div class="field" style="min-width:220px"><label>Isi cepat: guru untuk satu mapel di semua kelas</label><div class="flex gap-1"><select id="q-s">${opt(act, 'id', 'name')}</select><select id="q-t">${tOpts('')}</select><button class="btn" id="q-go">Terapkan</button></div></div></div>
    <div class="table-wrap" style="max-height:65vh"><table class="tbl tbl-compact"><thead><tr><th style="position:sticky;left:0;z-index:3">Mata Pelajaran</th>${classes.map(c => `<th>${esc(c.name)}</th>`).join('')}</tr></thead><tbody>
    ${act.map(s => `<tr><td style="position:sticky;left:0;background:var(--surface);z-index:1"><b>${esc(s.code)}</b> <span class="muted">${esc(s.name)}</span></td>${classes.map(c => `<td><select class="input-sm" data-s="${s.id}" data-c="${c.id}" style="min-width:150px">${tOpts(changed.has(key(s.id, c.id)) ? changed.get(key(s.id, c.id)) : map.get(key(s.id, c.id)))}</select></td>`).join('')}</tr>`).join('')}
    </tbody></table></div></div></div>`;
  const list = () => {
    const byT = new Map();
    asg.forEach(a => { if (!byT.has(a.teacher_id)) byT.set(a.teacher_id, { name: a.teacher_name, items: [] }); byT.get(a.teacher_id).items.push(a); });
    return `<div class="grid grid-2">${[...byT.values()].sort((a, b) => a.name.localeCompare(b.name)).map(t => `<div class="card"><div class="card-head"><h3>${icon('teacher')} ${esc(t.name)}</h3><span class="badge navy">${t.items.length} tugas</span></div><div class="card-body"><div class="chips">${t.items.map(a => `<span class="chip">${esc(a.subject_code)} · ${esc(a.class_name)}</span>`).join('')}</div></div></div>`).join('') || '<div class="card card-body">Belum ada pembagian tugas.</div>'}</div>`;
  };
  let view = 'matrix';
  const render = () => {
    $('#view', el).innerHTML = view === 'matrix' ? matrix() : list();
    if (view !== 'matrix') return;
    $$('select[data-s]', el).forEach(s => s.onchange = () => {
      const k = key(s.dataset.s, s.dataset.c);
      if ((map.get(k) || '') === s.value) changed.delete(k); else changed.set(k, s.value);
      s.style.background = changed.has(k) ? '#fff8e1' : '';
      $('#save', el).disabled = !changed.size;
    });
    $('#q-go', el).onclick = () => {
      const sid = $('#q-s', el).value, tid = $('#q-t', el).value;
      $$(`select[data-s="${sid}"]`, el).forEach(s => { s.value = tid; s.dispatchEvent(new Event('change')); });
    };
  };
  $$('.tab', el).forEach(t => t.onclick = () => { $$('.tab', el).forEach(x => x.classList.remove('active')); t.classList.add('active'); view = t.dataset.v; render(); });
  render();
  $('#save', el).onclick = e => busy(e.currentTarget, async () => {
    try {
      const items = [...changed].map(([k, t]) => { const [subject_id, class_id] = k.split('|'); return { subject_id, class_id, teacher_id: t || null }; });
      await put('/assignments', { semester_id: App.semester.id, items });
      toast(`${items.length} perubahan tugas disimpan`, 'success');
      invalidate('assignments', 'teachers');
      asg = await get('/assignments' + qs({ semester_id: App.semester.id }));
      map.clear(); asg.forEach(a => map.set(key(a.subject_id, a.class_id), a.teacher_id));
      changed.clear(); $('#save', el).disabled = true; render();
    } catch (er) { errorToast(er); }
  });
  $('#copy', el).onclick = () => openModal({
    title: 'Salin Pembagian Tugas', size: 'sm',
    body: `<div class="field"><label>Salin dari semester</label><select id="cf">${App.semesters.filter(s => s.id !== App.semester.id).map(s => `<option value="${s.id}">${esc(App.semLabel(s))}</option>`).join('')}</select><span class="help">Ke: ${esc(App.semLabel())}. Kelas dicocokkan berdasarkan nama bila berbeda tahun. Tugas yang sudah ada tidak ditimpa.</span></div>`,
    buttons: [{ label: 'Batal' }, { label: 'Salin', class: 'btn-primary', onClick: async m => { const r = await post('/assignments/copy', { from_semester_id: $('#cf', m.body).value, to_semester_id: App.semester.id }); toast(`${r.copied} tugas disalin${r.skipped ? `, ${r.skipped} dilewati` : ''}`, 'success'); invalidate('assignments'); App.refresh(); } }]
  });
}

// ===================== EKSTRAKURIKULER =====================
export async function ekskulPage(el) {
  let rows = await get('/extracurriculars');
  el.innerHTML = pageHead('Ekstrakurikuler', 'Daftar ekstrakurikuler yang dinilai di rapor.', `<button class="btn btn-primary" id="add">${icon('plus')}Tambah</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { invalidate('ekskul'); rows = await get('/extracurriculars'); dt.setRows(rows); };
  const edit = r => formModal({
    title: r ? 'Ubah Ekstrakurikuler' : 'Tambah Ekstrakurikuler', values: r || { active: 1, sort_order: rows.length },
    fields: [{ name: 'name', label: 'Nama', required: true }, { name: 'sort_order', label: 'Urutan', type: 'number' }, { name: 'description', label: 'Keterangan', type: 'textarea', full: true }, { name: 'active', label: 'Aktif', type: 'switch' }],
    onSubmit: async d => { d.sort_order = Number(d.sort_order || 0); if (r) await put('/extracurriculars/' + r.id, d); else await post('/extracurriculars', d); toast('Disimpan', 'success'); await reload(); }
  });
  const dt = new DataTable($('#tbl', el), {
    rows, columns: [
      { key: 'sort_order', label: 'Urut', cls: 'c', width: '60px' }, { key: 'name', label: 'Nama', render: r => `<b>${esc(r.name)}</b>` }, { key: 'description', label: 'Keterangan' },
      { key: 'active', label: 'Status', render: r => r.active ? '<span class="badge green">Aktif</span>' : '<span class="badge gray">Nonaktif</span>' },
      { label: '', sortable: false, cls: 'actions', render: () => `<button class="btn btn-xs btn-icon" data-act="edit">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del">${icon('trash', 'icon-sm')}</button>` }
    ],
    onAction: async (a, r) => { try { if (a === 'edit') edit(r); if (a === 'del') { if (!(await confirmDialog('Hapus ' + r.name + '?', { danger: true }))) return; await del('/extracurriculars/' + r.id); await reload(); } } catch (e) { errorToast(e); } }
  });
  $('#add', el).onclick = () => edit(null);
}

// ===================== BANK DESKRIPSI =====================
export async function bankPage(el, params, { forGuru = false, subjectsList = null } = {}) {
  const subjects = subjectsList || await refs.subjects();
  let rows = await get('/description-bank');
  el.innerHTML = pageHead('Bank Deskripsi Capaian', 'Kalimat capaian yang dipilih guru sebagai "paling dikuasai" dan "perlu ditingkatkan" pada deskripsi rapor.',
    `<button class="btn btn-primary" id="add">${icon('plus')}Tambah Deskripsi</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { rows = await get('/description-bank'); dt.setRows(rows); };
  const levels = ['Semua', '7', '8', '9'].map(v => ({ value: v, label: v === 'Semua' ? 'Semua tingkat' : 'Kelas ' + v }));
  const dt = new DataTable($('#tbl', el), {
    rows, searchKeys: ['text', 'subject_name'],
    filters: [{ key: 'subject_id', label: 'Mapel', options: subjects.map(s => ({ value: s.id, label: s.name })) }, { key: 'grade_level', label: 'Tingkat', options: levels }],
    columns: [
      { key: 'subject_name', label: 'Mapel', render: r => `<span class="chip">${esc(r.subject_code)}</span>` },
      { key: 'grade_level', label: 'Tingkat', cls: 'c' },
      { key: 'text', label: 'Teks Deskripsi', render: r => esc(r.text) },
      { key: 'created_by', label: 'Dibuat oleh', render: r => `<span class="muted">${esc(r.created_by || '')}</span>` },
      { label: '', sortable: false, cls: 'actions', render: () => `<button class="btn btn-xs btn-icon" data-act="edit">${icon('edit', 'icon-sm')}</button><button class="btn btn-xs btn-icon btn-danger" data-act="del">${icon('trash', 'icon-sm')}</button>` }
    ],
    onAction: async (a, r) => {
      try {
        if (a === 'edit') formModal({
          title: 'Ubah Deskripsi', values: r, fields: [{ name: 'subject_id', label: 'Mapel', type: 'select', options: subjects.map(s => ({ value: s.id, label: s.name })) }, { name: 'grade_level', label: 'Tingkat', type: 'select', options: levels }, { name: 'text', label: 'Teks', type: 'textarea', full: true, required: true }],
          onSubmit: async d => { await post('/description-bank', { ...d, id: r.id }); toast('Disimpan', 'success'); await reload(); }
        });
        if (a === 'del') { if (!(await confirmDialog('Hapus deskripsi ini?', { danger: true }))) return; await del('/description-bank/' + r.id); await reload(); }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => formModal({
    title: 'Tambah Deskripsi (bisa banyak sekaligus)', size: 'lg',
    fields: [{ name: 'subject_id', label: 'Mapel', type: 'select', required: true, options: subjects.map(s => ({ value: s.id, label: s.name })), value: dt.fv.subject_id }, { name: 'grade_level', label: 'Tingkat', type: 'select', options: levels }, { name: 'text', label: 'Teks deskripsi (satu baris = satu deskripsi)', type: 'textarea', rows: 6, full: true, required: true }],
    onSubmit: async d => {
      const items = d.text.split(/\r?\n/).map(t => t.trim()).filter(Boolean).map(text => ({ subject_id: d.subject_id, grade_level: d.grade_level, text }));
      await post('/description-bank', { items }); toast(`${items.length} deskripsi ditambahkan`, 'success'); await reload();
    }
  });
}

// ===================== PENGGUNA =====================
export async function usersPage(el) {
  let rows = await get('/users');
  el.innerHTML = pageHead('Pengguna', 'Akun admin dikelola di sini. Akun guru dikelola melalui menu Data Guru.',
    `<button class="btn" id="pw">${icon('key')}Ganti password saya</button><button class="btn btn-primary" id="add">${icon('plus')}Tambah Admin</button>`) + `<div class="card"><div class="card-body" id="tbl"></div></div>`;
  const reload = async () => { rows = await get('/users'); dt.setRows(rows); };
  const dt = new DataTable($('#tbl', el), {
    rows, searchKeys: ['username', 'full_name'],
    filters: [{ key: 'role', label: 'Peran', options: [{ value: 'admin', label: 'Admin' }, { value: 'guru', label: 'Guru' }] }],
    columns: [
      { key: 'full_name', label: 'Nama', render: r => `<b>${esc(r.full_name)}</b>${r.id === App.user.id ? ' <span class="badge gold">Anda</span>' : ''}` },
      { key: 'username', label: 'Username', cls: 'mono' },
      { key: 'role', label: 'Peran', render: r => `<span class="badge ${r.role === 'admin' ? 'navy' : 'blue'}">${r.role === 'admin' ? 'Admin' : 'Guru'}</span>` },
      { key: 'last_login_at', label: 'Login terakhir', render: r => r.last_login_at ? fmtDate(r.last_login_at, true) : '<span class="soft">belum pernah</span>' },
      { key: 'must_change_password', label: 'Password', render: r => r.must_change_password ? '<span class="badge yellow">Wajib ganti</span>' : '<span class="badge green">OK</span>' },
      { key: 'active', label: 'Status', render: r => r.active ? '<span class="badge green">Aktif</span>' : '<span class="badge gray">Nonaktif</span>' },
      { label: '', sortable: false, cls: 'actions', render: r => `<button class="btn btn-xs" data-act="reset">${icon('key', 'icon-sm')}Reset</button><button class="btn btn-xs btn-icon" data-act="toggle" title="Aktif/nonaktif">${icon(r.active ? 'lock' : 'unlock', 'icon-sm')}</button>${r.role === 'admin' ? `<button class="btn btn-xs btn-icon btn-danger" data-act="del">${icon('trash', 'icon-sm')}</button>` : ''}` }
    ],
    onAction: async (a, r) => {
      try {
        if (a === 'reset') formModal({
          title: 'Reset Password: ' + r.username, fields: [{ name: 'password', label: 'Password baru', type: 'password', required: true, help: 'Pengguna wajib menggantinya saat login berikutnya.', autocomplete: 'new-password' }],
          onSubmit: async d => { await put('/users/' + r.id, d); toast('Password direset', 'success'); await reload(); }
        });
        if (a === 'toggle') { await put('/users/' + r.id, { active: r.active ? 0 : 1 }); toast(r.active ? 'Akun dinonaktifkan' : 'Akun diaktifkan', 'success'); await reload(); }
        if (a === 'del') { if (!(await confirmDialog('Hapus akun ' + r.username + '?', { danger: true }))) return; await del('/users/' + r.id); await reload(); }
      } catch (e) { errorToast(e); }
    }
  });
  $('#add', el).onclick = () => formModal({
    title: 'Tambah Admin', fields: [{ name: 'full_name', label: 'Nama lengkap', required: true }, { name: 'username', label: 'Username', required: true }, { name: 'password', label: 'Password awal', type: 'password', required: true, help: 'Min. 8 karakter, huruf & angka', autocomplete: 'new-password' }],
    onSubmit: async d => { await post('/users', d); toast('Admin ditambahkan', 'success'); await reload(); }
  });
  $('#pw', el).onclick = () => import('../app.js').then(m => m.changePassword(false));
}
