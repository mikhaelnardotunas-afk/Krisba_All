// Sistem: riwayat aktivitas & revisi nilai, backup/restore, pengaturan sekolah, impor & ekspor data.
import { get, post, put, api, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, toast, errorToast, openModal, confirmDialog, DataTable, fmtDate, fmtNum, $, $$, busy, downloadBlob, withLoading, formHtml, readForm, promptDialog } from '../ui.js';
import { refs, invalidate, remember } from '../common.js';
import { readSpreadsheet, rowsToObjects, downloadTemplate, exportWorkbook } from '../shared/xlsx.js';

// ===================== RIWAYAT AKTIVITAS =====================
export async function auditPage(el, params) {
  const tab = params.tab || 'aktivitas';
  el.innerHTML = pageHead('Riwayat Aktivitas', 'Semua aktivitas pengguna dan setiap perubahan nilai tercatat.') +
    `<div class="tabs"><a class="tab ${tab === 'aktivitas' ? 'active' : ''}" href="#aktivitas?tab=aktivitas">${icon('history', 'icon-sm')}Aktivitas Pengguna</a><a class="tab ${tab === 'nilai' ? 'active' : ''}" href="#aktivitas?tab=nilai">${icon('edit', 'icon-sm')}Riwayat Perubahan Nilai</a></div>
    <div class="card mb-2"><div class="card-body"><div class="filters"><div class="field"><label>Dari tanggal</label><input type="date" id="a-from"></div><div class="field"><label>Sampai</label><input type="date" id="a-to"></div><div class="field" style="min-width:auto"><label>&nbsp;</label><button class="btn btn-primary" id="a-go">${icon('filter')}Terapkan</button></div></div></div></div>
    <div class="card"><div class="card-body" id="tbl"></div></div>`;
  const load = async () => {
    const q = { from: $('#a-from', el).value, to: $('#a-to', el).value, limit: 3000 };
    if (tab === 'aktivitas') {
      const rows = await get('/audit' + qs(q));
      new DataTable($('#tbl', el), {
        rows, pageSize: 50, searchKeys: ['username', 'action', 'detail'],
        filters: [{ key: 'role', label: 'Peran', options: [{ value: 'admin', label: 'Admin' }, { value: 'guru', label: 'Guru' }] }, { key: 'action', label: 'Aktivitas', options: [...new Set(rows.map(r => r.action))].sort().map(v => ({ value: v, label: v })) }],
        columns: [
          { key: 'created_at', label: 'Waktu', render: r => `<span class="nowrap">${fmtDate(r.created_at, true)}</span>` },
          { key: 'username', label: 'Pengguna', render: r => `${esc(r.username || '-')} <span class="badge gray">${esc(r.role || '')}</span>` },
          { key: 'action', label: 'Aktivitas', render: r => `<b>${esc(r.action)}</b>` },
          { key: 'detail', label: 'Detail', render: r => `<span style="font-size:12.5px">${esc(r.detail || '')}</span>` },
          { key: 'ip', label: 'IP', cls: 'mono hide-sm' },
          { label: '', sortable: false, cls: 'actions', render: r => r.has_diff ? `<button class="btn btn-xs" data-act="diff">${icon('eye', 'icon-sm')}Data</button>` : '' }
        ],
        onAction: async (a, r) => {
          const full = await get('/audit/' + r.id);
          const pretty = s => { try { return esc(JSON.stringify(JSON.parse(s), null, 2)); } catch (e) { return esc(s || ''); } };
          openModal({ title: r.action, size: 'lg', body: `<div class="grid grid-2"><div><div class="label">Sebelum</div><pre class="preview-box mono" style="white-space:pre-wrap;max-height:50vh;overflow:auto">${pretty(full.before_json) || '-'}</pre></div><div><div class="label">Sesudah</div><pre class="preview-box mono" style="white-space:pre-wrap;max-height:50vh;overflow:auto">${pretty(full.after_json) || '-'}</pre></div></div>` });
        }
      });
    } else {
      const rows = await get('/score-revisions' + qs(q));
      new DataTable($('#tbl', el), {
        rows, pageSize: 50, searchKeys: ['student_name', 'changed_name', 'subject_name', 'class_name', 'type_name', 'category_name'],
        filters: [{ key: 'type_name', label: 'Penilaian', options: [...new Set(rows.map(r => r.type_name))].map(v => ({ value: v, label: v })) }, { key: 'changed_name', label: 'Pengubah', options: [...new Set(rows.map(r => r.changed_name))].sort().map(v => ({ value: v, label: v })) }],
        toolbar: `<button class="btn btn-sm" id="rv-x">${icon('download', 'icon-sm')}Excel</button>`,
        columns: [
          { key: 'created_at', label: 'Waktu', render: r => `<span class="nowrap">${fmtDate(r.created_at, true)}</span>` },
          { key: 'changed_name', label: 'Diubah oleh' }, { key: 'student_name', label: 'Siswa' },
          { key: 'subject_name', label: 'Mapel · Kelas', render: r => `${esc(r.subject_name)} · ${esc(r.class_name)}` },
          { key: 'type_name', label: 'Penilaian › Kategori', render: r => `${esc(r.type_name)} › ${esc(r.category_name || '-')}` },
          { key: 'old_score', label: 'Sebelum', cls: 'num', render: r => r.old_score === null ? '<span class="soft">kosong</span>' : fmtNum(r.old_score) },
          { key: 'new_score', label: 'Sesudah', cls: 'num', render: r => `<b>${r.new_score === null ? 'kosong' : fmtNum(r.new_score)}</b>` }
        ]
      });
      $('#rv-x', el).onclick = () => exportWorkbook('Riwayat_Perubahan_Nilai.xlsx', [{ name: 'Revisi', title: 'RIWAYAT PERUBAHAN NILAI', headers: ['Waktu', 'Diubah oleh', 'Siswa', 'NISN', 'Mapel', 'Kelas', 'Penilaian', 'Kategori', 'Sebelum', 'Sesudah'], rows: rows.map(r => [r.created_at, r.changed_name, r.student_name, r.nisn || '', r.subject_name, r.class_name, r.type_name, r.category_name || '', r.old_score ?? '', r.new_score ?? '']), textCols: [3] }]);
    }
  };
  $('#a-go', el).onclick = load;
  await load();
}

// ===================== BACKUP =====================
async function downloadBackup(note) {
  const res = await api('GET', '/backup' + qs({ note }), undefined, { raw: true, timeout: 180000 });
  const blob = await res.blob();
  const name = (res.headers.get('Content-Disposition') || '').match(/filename="([^"]+)"/);
  downloadBlob(blob, name ? name[1] : 'backup-sipas.json');
}

export async function backupPage(el) {
  const hist = await get('/backups');
  el.innerHTML = pageHead('Backup Database', 'Backup hanya membaca data — tidak menghapus atau mengubah data yang sedang berjalan.') + `
    <div class="grid grid-3">
      <div class="card"><div class="card-head"><h3>${icon('download')} Unduh Backup</h3></div><div class="card-body"><p class="muted">Seluruh tabel database dalam satu file JSON (termasuk riwayat). Simpan di tempat aman — file berisi data pribadi siswa.</p><button class="btn btn-primary w-100" id="b-dl">${icon('download')}Unduh backup sekarang</button></div></div>
      <div class="card"><div class="card-head"><h3>${icon('upload')} Restore</h3></div><div class="card-body"><p class="muted"><b>Gabung</b>: hanya menambah data yang belum ada (aman). <b>Ganti</b>: seluruh data diganti isi backup — backup data saat ini diunduh otomatis lebih dulu.</p>
        <div class="field mb-2"><select id="b-mode"><option value="merge">Gabung (aman, tidak menimpa)</option><option value="replace">Ganti seluruh data</option></select></div><button class="btn w-100" id="b-up">${icon('upload')}Pilih file backup...</button></div></div>
      <div class="card"><div class="card-head"><h3>${icon('refresh')} Dari E-Raport Lama</h3></div><div class="card-body"><p class="muted">Impor file <i>Cadangan_ERaport_*.json</i> dari aplikasi lama (Google Spreadsheet): siswa, kelas, mapel, nilai, deskripsi, kehadiran, ekskul, pengambilan.</p><button class="btn btn-gold w-100" id="b-legacy">${icon('upload')}Impor cadangan lama...</button></div></div>
    </div>
    <div class="card mt-3"><div class="card-head"><h3>${icon('history')} Riwayat Backup & Restore</h3><button class="btn btn-sm" id="b-xls">${icon('download', 'icon-sm')}Laporan seluruh data (Excel)</button></div><div class="card-body" id="tbl"></div></div>`;
  new DataTable($('#tbl', el), {
    rows: hist, pageSize: 10, columns: [
      { key: 'created_at', label: 'Waktu', render: r => fmtDate(r.created_at, true) }, { key: 'kind', label: 'Jenis', render: r => r.kind === 'download' ? '<span class="badge blue">Unduh</span>' : '<span class="badge gold">Restore</span>' },
      { key: 'created_by', label: 'Oleh' }, { key: 'size_bytes', label: 'Ukuran', render: r => r.size_bytes ? fmtNum(r.size_bytes / 1024, 0) + ' KB' : '-' },
      { key: 'tables_json', label: 'Isi', sortable: false, render: r => { try { const t = JSON.parse(r.tables_json || '{}'); return `<span style="font-size:12px">${t.students ?? 0} siswa · ${t.student_scores ?? 0} nilai · ${t.audit_logs ?? 0} log</span>`; } catch (e) { return ''; } } },
      { key: 'note', label: 'Catatan' }
    ]
  });
  $('#b-dl', el).onclick = e => busy(e.currentTarget, async () => { try { await downloadBackup(''); toast('Backup diunduh', 'success'); App.refresh(); } catch (er) { errorToast(er); } });
  const pickJson = () => new Promise(res => { const i = document.createElement('input'); i.type = 'file'; i.accept = '.json,application/json'; i.onchange = async () => { try { res(i.files[0] ? JSON.parse(await i.files[0].text()) : null); } catch (er) { toast('File JSON tidak valid', 'error'); res(null); } }; i.click(); });
  $('#b-up', el).onclick = async () => {
    const data = await pickJson();
    if (!data) return;
    if (!data.meta || data.meta.app !== 'SIPAS') return toast('Bukan file backup SIPAS. Untuk cadangan aplikasi lama gunakan "Impor cadangan lama".', 'error');
    const mode = $('#b-mode', el).value;
    const c = data.meta.counts || {};
    const info = `Backup tanggal ${fmtDate(data.meta.created_at, true)} oleh ${data.meta.created_by || '-'}\n${c.students || 0} siswa, ${c.student_scores || 0} nilai, ${c.classes || 0} kelas.`;
    try {
      if (mode === 'merge') {
        if (!(await confirmDialog(info + '\n\nData yang belum ada akan ditambahkan. Data yang sudah ada tidak diubah.'))) return;
        const r = await withLoading('Memulihkan data...', () => post('/restore', { backup: data, mode }, { timeout: 300000 }));
        toast(`${r.inserted} baris ditambahkan`, 'success');
      } else {
        const typed = await promptDialog(info + '\n\nSELURUH data saat ini akan DIGANTI. Ketik: GANTI SEMUA DATA', { title: 'Konfirmasi Restore Ganti', okText: 'Ganti data' });
        if (typed !== 'GANTI SEMUA DATA') return typed !== null && toast('Konfirmasi tidak sesuai', 'warning');
        await withLoading('Mengunduh backup data saat ini...', () => downloadBackup('Otomatis sebelum restore'));
        const r = await withLoading('Mengganti data...', () => post('/restore', { backup: data, mode, confirm: typed }, { timeout: 300000 }));
        toast(`Restore selesai (${r.inserted} baris). Silakan masuk kembali.`, 'success');
        setTimeout(() => location.replace('index.html'), 1500);
        return;
      }
      invalidate(); await App.reloadBoot(); App.refresh();
    } catch (er) { errorToast(er); }
  };
  $('#b-legacy', el).onclick = async () => {
    const data = await pickJson();
    if (!data) return;
    const d = data.data || data;
    if (!d.siswa) return toast('Bukan file cadangan E-Raport lama', 'error');
    openModal({
      title: 'Impor Cadangan E-Raport Lama', size: 'sm',
      body: `<p>Isi file: <b>${(d.siswa || []).length}</b> siswa, <b>${(d.nilai || []).length}</b> nilai, <b>${(d.mapel || []).length}</b> mapel, <b>${(d.kelas || []).length}</b> kelas.</p>
        <div class="field mb-2"><label>Masukkan ke semester</label><select id="lg-s">${App.semesters.map(s => `<option value="${s.id}"${s.id === App.semester.id ? ' selected' : ''}>${esc(App.semLabel(s))}</option>`).join('')}</select></div>
        <label class="check"><input type="checkbox" id="lg-set" checked> Ambil juga pengaturan (identitas, format deskripsi, predikat)</label>
        <p class="muted mt-2" style="font-size:12.5px">Nilai lama dibuat sebagai jenis penilaian "Nilai Rapor (Impor E-Raport)" dengan 1 kategori 100%. Data yang sudah ada tidak ditimpa.</p>`,
      buttons: [{ label: 'Batal' }, { label: 'Impor', class: 'btn-gold', onClick: async m => {
        const r = await withLoading('Mengimpor data lama...', () => post('/import/legacy', { backup: data, semester_id: $('#lg-s', m.body).value, include_settings: $('#lg-set', m.body).checked }, { timeout: 300000 }));
        openModal({ title: 'Impor selesai', body: `<ul class="list-plain">${Object.entries(r).map(([k, v]) => `<li><span class="grow">${esc(k)}</span><b>${v}</b></li>`).join('')}</ul>` });
        invalidate(); await App.reloadBoot();
      } }]
    });
  };
  $('#b-xls', el).onclick = e => busy(e.currentTarget, async () => {
    try {
      const res = await api('GET', '/backup' + qs({ note: 'Laporan Excel' }), undefined, { raw: true, timeout: 180000 });
      const all = await res.json();
      const T = all.tables;
      const cls = new Map(T.classes.map(c => [c.id, c])), yrs = new Map(T.academic_years.map(y => [y.id, y.name]));
      const hist = new Map(); T.student_class_history.forEach(h => { if (!hist.has(h.student_id)) hist.set(h.student_id, []); hist.get(h.student_id).push(`${yrs.get(h.academic_year_id)}: ${(cls.get(h.class_id) || {}).name}`); });
      await exportWorkbook(`Laporan_Data_SIPAS_${new Date().toISOString().slice(0, 10)}.xlsx`, [
        { name: 'Siswa', headers: ['NIS', 'NISN', 'Nama', 'L/P', 'Tempat Lahir', 'Tanggal Lahir', 'Status', 'Riwayat Kelas'], rows: T.students.map(s => [s.nis || '', s.nisn || '', s.name, s.gender || '', s.birth_place || '', s.birth_date || '', s.status, (hist.get(s.id) || []).join('; ')]), textCols: [0, 1] },
        { name: 'Guru', headers: ['NIP', 'NUPTK', 'Nama', 'HP', 'Aktif'], rows: T.teachers.map(t => [t.nip || '', t.nuptk || '', t.name, t.phone || '', t.active ? 'Ya' : 'Tidak']), textCols: [0, 1, 3] },
        { name: 'Kelas', headers: ['Tahun', 'Kelas', 'Tingkat'], rows: T.classes.map(c => [yrs.get(c.academic_year_id), c.name, c.grade_level]) },
        { name: 'Mapel', headers: ['Kode', 'Nama', 'Kelompok', 'KKTP', 'Aktif'], rows: T.subjects.map(s => [s.code, s.name, s.group_name, s.kktp ?? '', s.active ? 'Ya' : 'Tidak']) },
        { name: 'Jenis Penilaian', headers: ['Nama', 'Jenis', 'Mulai', 'Selesai', 'Aktif'], rows: T.assessment_types.map(t => [t.name, t.kind, t.start_date || '', t.end_date || '', t.active ? 'Ya' : 'Tidak']) },
        { name: 'Ringkasan', headers: ['Tabel', 'Jumlah baris'], rows: Object.entries(all.meta.counts) }
      ]);
    } catch (er) { errorToast(er); }
  });
}

// ===================== PENGATURAN SEKOLAH =====================
const SETTING_GROUPS = [
  ['Identitas Sekolah', 'home', [
    { name: 'nama_sekolah', label: 'Nama sekolah', full: true }, { name: 'npsn', label: 'NPSN' }, { name: 'telepon', label: 'Telepon' },
    { name: 'alamat', label: 'Alamat lengkap', type: 'textarea', full: true, rows: 2 }, { name: 'email', label: 'Email' }, { name: 'website', label: 'Website' },
    { name: 'yayasan', label: 'Baris kop 1 (yayasan/dinas)' }, { name: 'bidang', label: 'Baris kop 2' },
    { name: 'kepala_sekolah', label: 'Nama kepala sekolah' }, { name: 'nip_kepala_sekolah', label: 'NIP kepala sekolah' }
  ]],
  ['Rapor', 'file', [
    { name: 'format_raport', label: 'Format rapor bawaan', type: 'select', options: [['kementerian', 'Rapor Kementerian (2025)'], ['semester', 'Semester (Sikap, Pengetahuan & Keterampilan)'], ['mendalam', 'Pembelajaran Mendalam'], ['mid', 'Laporan Tengah Semester'], ['kartu', 'Kartu Hasil Belajar']].map(([value, label]) => ({ value, label })) },
    { name: 'tema_raport', label: 'Tema warna', type: 'select', options: [['default', 'Default'], ['navy', 'Biru Navy'], ['hijau', 'Hijau'], ['marun', 'Marun'], ['monokrom', 'Hitam Putih']].map(([value, label]) => ({ value, label })) },
    { name: 'ukuran_kertas_raport', label: 'Ukuran kertas', type: 'select', options: [{ value: 'A4', label: 'A4' }, { value: 'F4', label: 'F4 / Folio' }] },
    { name: 'mode_keterampilan', label: 'Nilai keterampilan (format semester)', type: 'select', options: [{ value: 'sama', label: 'Sama dengan nilai akhir' }, { value: 'terpisah', label: 'Terpisah (atur di semester)' }] },
    { name: 'nama_sekolah_raport', label: 'Nama sekolah di rapor' }, { name: 'alamat_raport', label: 'Alamat di rapor' },
    { name: 'judul_raport', label: 'Judul format semester' }, { name: 'judul_kementerian', label: 'Judul format kementerian' },
    { name: 'judul_laporan', label: 'Judul laporan tengah semester' }, { name: 'subjudul', label: 'Subjudul laporan tengah semester' },
    { name: 'format_nomor_raport', label: 'Format nomor rapor', help: '{NO} {KELAS} {TAHUN} {SEMESTER} {NIS}' },
    { name: 'tampilkan_kop', label: 'Tampilkan kop sekolah', type: 'switch' }, { name: 'tampilkan_qr', label: 'QR verifikasi', type: 'switch' },
    { name: 'tampilkan_keputusan', label: 'Keputusan kenaikan', type: 'switch' }, { name: 'tampilkan_hadir', label: 'Tampilkan jumlah hadir', type: 'switch' },
    { name: 'tampilkan_peringkat_raport', label: 'Tampilkan peringkat di rapor', type: 'switch' }, { name: 'tampilkan_keterangan', label: 'Kolom keterangan tuntas (lap. tengah semester)', type: 'switch' },
    { name: 'keputusan_default', label: 'Teks keputusan bawaan', type: 'textarea', full: true, rows: 2 }
  ]],
  ['Deskripsi & Sikap', 'pen', [
    { name: 'mode_deskripsi', label: 'Sumber deskripsi capaian', type: 'select', full: true, options: [{ value: 'template', label: 'Template + bank deskripsi (guru memilih), otomatis bila kosong' }, { value: 'otomatis', label: 'Otomatis berdasarkan rentang nilai / predikat' }, { value: 'manual', label: 'Manual diketik guru' }] },
    { name: 'format_deskripsi', label: 'Pola kalimat format semester', type: 'textarea', full: true, rows: 2, help: '{NAMA} {KATA} {KATA_KECIL} {PREDIKAT} {DIKUASAI} {DITINGKATKAN}' },
    { name: 'format_deskripsi_kementerian', label: 'Pola kalimat format kementerian', type: 'textarea', full: true, rows: 2 },
    { name: 'sikap_spiritual_predikat', label: 'Predikat sikap spiritual bawaan' }, { name: 'sikap_sosial_predikat', label: 'Predikat sikap sosial bawaan' },
    { name: 'sikap_spiritual_deskripsi', label: 'Deskripsi sikap spiritual bawaan', type: 'textarea', full: true, rows: 2 },
    { name: 'sikap_sosial_deskripsi', label: 'Deskripsi sikap sosial bawaan', type: 'textarea', full: true, rows: 2 },
    { name: 'ekskul_deskripsi_default', label: 'Deskripsi ekskul bawaan', type: 'textarea', full: true, rows: 2, help: '{EKSKUL} {NILAI}' }
  ]],
  ['Kokurikuler & Isian Wali Kelas', 'users', [
    { name: 'wali_kehadiran', label: 'Wali kelas mengisi kehadiran', type: 'switch' }, { name: 'wali_kokurikuler', label: 'Wali kelas mengisi kokurikuler', type: 'switch' },
    { name: 'wali_ekskul', label: 'Wali kelas mengisi ekstrakurikuler', type: 'switch' }, { name: 'wali_catatan', label: 'Wali kelas mengisi catatan & keputusan', type: 'switch' },
    { name: 'wali_sikap', label: 'Wali kelas mengisi sikap', type: 'switch' }, { name: 'hari_efektif', label: 'Jumlah hari efektif semester', type: 'number', min: 0 },
    { name: 'kokurikuler_kegiatan', label: 'Nama kegiatan kokurikuler' }, { name: 'opsi_nilai_kokurikuler', label: 'Pilihan nilai kokurikuler', help: 'Pisahkan dengan koma' },
    { name: 'opsi_nilai_ekskul', label: 'Pilihan nilai ekstrakurikuler', help: 'Pisahkan dengan koma' },
    { name: 'kokurikuler_dimensi', label: 'Dimensi profil lulusan (satu per baris)', type: 'textarea', full: true, rows: 4 },
    { name: 'format_kokurikuler', label: 'Pola kalimat kokurikuler', type: 'textarea', full: true, rows: 2, help: '{NAMA} {NILAI} {NILAI_KECIL} {KEGIATAN} {KUAT} {LEMAH}' }
  ]],
  ['Perhitungan & Peringkat', 'percent', [
    { name: 'kktp_umum', label: 'KKTP umum', type: 'number', min: 0, max: 100 }, { name: 'desimal_tampil', label: 'Desimal tampilan', type: 'number', min: 0, max: 4 },
    { name: 'peringkat_aktif', label: 'Aktifkan peringkat', type: 'switch' },
    { name: 'dasar_peringkat', label: 'Dasar peringkat', type: 'select', options: [{ value: 'jumlah', label: 'Jumlah nilai' }, { value: 'rata', label: 'Rata-rata nilai' }] },
    { name: 'hari_pengingat', label: 'Pengingat batas input (hari sebelum)', type: 'number', min: 1, max: 30 }
  ]],
  ['Halaman Cek Nilai Siswa', 'student', [
    { name: 'cek_nilai_aktif', label: 'Buka halaman cek nilai untuk siswa', type: 'switch', full: true, help: 'Alamat: /cek-nilai.html' },
    { name: 'cek_nilai_verifikasi', label: 'Verifikasi siswa', type: 'select', options: [{ value: 'nisn', label: 'Masukkan NISN (disarankan)' }, { value: 'tgl_lahir', label: 'NISN + tanggal lahir (paling aman)' }, { value: 'none', label: 'Pilih nama tanpa sandi (seperti aplikasi lama)' }] },
    { name: 'cek_nilai_ranking', label: 'Tampilkan peringkat', type: 'switch' }
  ]]
];

async function resizeImage(file, maxW, maxH) {
  const url = URL.createObjectURL(file);
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = url; });
  const r = Math.min(1, maxW / img.width, maxH / img.height);
  const c = document.createElement('canvas');
  c.width = Math.round(img.width * r); c.height = Math.round(img.height * r);
  c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return c.toDataURL('image/png');
}

export async function settingsPage(el) {
  const s = await get('/settings');
  const imgs = [['logo_kiri', 'Logo sekolah (kiri kop)'], ['logo_kanan', 'Logo kanan kop'], ['ttd_kepsek', 'Tanda tangan kepala sekolah']];
  el.innerHTML = pageHead('Pengaturan Sekolah', 'Identitas sekolah, kop, format rapor, deskripsi, isian wali kelas, dan halaman cek nilai.', `<button class="btn btn-primary" id="st-save">${icon('save')}Simpan Pengaturan</button>`) +
    `<div class="card mb-3"><div class="card-head"><h3>${icon('star')} Logo & Tanda Tangan</h3></div><div class="card-body"><div class="grid grid-3">${imgs.map(([k, l]) => `<div class="field"><label>${l}</label><div class="flex gap-2"><div style="width:90px;height:90px;border:1px dashed var(--border-strong);border-radius:10px;display:grid;place-items:center;background:#fff;overflow:hidden"><img id="im-${k}" src="${esc(s[k] || (k === 'logo_kiri' ? 'assets/logo_left.png' : k === 'logo_kanan' ? 'assets/logo_right.png' : ''))}" style="max-width:100%;max-height:100%" alt=""></div><div class="flex-col gap-1" style="display:flex"><label class="btn btn-sm">${icon('upload', 'icon-sm')}Unggah<input type="file" accept="image/*" data-img="${k}" hidden></label><button class="btn btn-sm btn-ghost" data-clear="${k}">Hapus</button></div></div></div>`).join('')}</div></div></div>` +
    SETTING_GROUPS.map(([title, ic, fields]) => `<div class="card mb-3"><div class="card-head"><h3>${icon(ic)} ${title}</h3></div><div class="card-body" data-group="${title}">${formHtml(fields, s)}</div></div>`).join('');
  const imgVals = {};
  $$('[data-img]', el).forEach(i => i.onchange = async () => {
    const f = i.files[0];
    if (!f) return;
    const k = i.dataset.img;
    imgVals[k] = await resizeImage(f, k === 'ttd_kepsek' ? 400 : 240, k === 'ttd_kepsek' ? 200 : 240);
    $('#im-' + k, el).src = imgVals[k];
  });
  $$('[data-clear]', el).forEach(b => b.onclick = () => { imgVals[b.dataset.clear] = ''; $('#im-' + b.dataset.clear, el).src = ''; });
  $('#st-save', el).onclick = e => busy(e.currentTarget, async () => {
    try {
      const patch = { ...imgVals };
      SETTING_GROUPS.forEach(([title, , fields]) => Object.assign(patch, readForm($(`[data-group="${title}"]`, el), fields)));
      Object.keys(patch).forEach(k => { patch[k] = patch[k] === null || patch[k] === undefined ? '' : String(patch[k]); });
      await put('/settings', patch);
      toast('Pengaturan disimpan', 'success');
      await App.reloadBoot();
    } catch (er) { errorToast(er); }
  });
}

// ===================== IMPOR & EKSPOR =====================
const ENTITIES = {
  students: {
    label: 'Data Siswa', map: { nis: ['nis'], nisn: ['nisn'], name: ['nama', 'namalengkap', 'namasiswa'], gender: ['jk', 'lp', 'jeniskelamin'], birth_place: ['tempatlahir'], birth_date: ['tanggallahir', 'tgllahir'], religion: ['agama'], address: ['alamat'], parent_name: ['namaorangtua', 'orangtua', 'namaortu'], parent_phone: ['hporangtua', 'nohp', 'hp'], class_name: ['kelas'], roll_no: ['noabsen', 'absen', 'no'], status: ['status'] },
    headers: ['NO ABSEN', 'NIS', 'NISN', 'NAMA', 'JK', 'TEMPAT LAHIR', 'TANGGAL LAHIR', 'AGAMA', 'ALAMAT', 'NAMA ORANG TUA', 'HP ORANG TUA', 'KELAS', 'STATUS'],
    sample: [[1, '2026001', '0012345678', 'ANDREAS LUMINTANG', 'L', 'Basaan', '2013-05-01', 'Kristen', 'Desa Basaan', 'Bapak Lumintang', '081234567890', 'VII A', 'aktif']],
    notes: ['NISN atau NIS wajib diisi dan menjadi kunci pencocokan data lama.', 'Tanggal lahir format YYYY-MM-DD.', 'JK diisi L atau P.', 'KELAS harus sudah dibuat pada tahun pelajaran yang dipilih.', 'STATUS: aktif / pindah / keluar / lulus.'],
    norm: r => ({ ...r, birth_date: normDate(r.birth_date) })
  },
  teachers: {
    label: 'Data Guru', map: { nip: ['nip'], nuptk: ['nuptk'], name: ['nama', 'namaguru', 'namalengkap'], gender: ['jk', 'lp'], phone: ['hp', 'nohp', 'telepon'], email: ['email'], username: ['username'], password: ['password', 'passwordawal'], subjects: ['mapel', 'kodemapel', 'matapelajaran'] },
    headers: ['NAMA', 'NIP', 'NUPTK', 'JK', 'HP', 'EMAIL', 'USERNAME', 'PASSWORD AWAL', 'MAPEL'],
    sample: [['Laurita Ruindungan, S.Pd.Gr', '', '', 'P', '0812...', '', 'laurita', 'Guru2026x', 'MTK, IPA']],
    notes: ['USERNAME & PASSWORD AWAL opsional; bila diisi akun login dibuat (password min. 8 karakter huruf & angka).', 'MAPEL berisi kode mapel dipisah koma.']
  },
  classes: {
    label: 'Data Kelas', map: { name: ['kelas', 'namakelas'], grade_level: ['tingkat'], report_label: ['labelrapor', 'label'], homeroom: ['walikelas', 'wali'], sort_order: ['urut', 'urutan'] },
    headers: ['KELAS', 'TINGKAT', 'LABEL RAPOR', 'WALI KELAS', 'URUT'], sample: [['VII A', 7, 'VII', 'Laurita Ruindungan, S.Pd.Gr', 1]], notes: ['WALI KELAS diisi nama/NIP/username guru yang sudah terdaftar.']
  },
  subjects: {
    label: 'Mata Pelajaran', map: { code: ['kode', 'kodemapel'], name: ['nama', 'namamapel', 'matapelajaran'], group_name: ['kelompok'], kktp: ['kktp', 'kkm'], sort_order: ['urut', 'urutan'], active: ['aktif'] },
    headers: ['KODE', 'NAMA', 'KELOMPOK', 'KKTP', 'URUT', 'AKTIF'], sample: [['MTK', 'Matematika', 'A', 70, 5, 'Y']], notes: ['AKTIF diisi Y/N.']
  },
  assignments: {
    label: 'Pembagian Tugas', map: { teacher: ['guru', 'namaguru', 'nip', 'username'], subject: ['mapel', 'kodemapel', 'matapelajaran'], class_name: ['kelas'] },
    headers: ['GURU', 'MAPEL', 'KELAS'], sample: [['Laurita Ruindungan, S.Pd.Gr', 'MTK', 'VII A']], notes: ['GURU: nama/NIP/username. MAPEL: kode atau nama. Berlaku untuk semester yang sedang dipilih.']
  },
  attendance: {
    label: 'Kehadiran Siswa', map: { nisn: ['nisn'], nis: ['nis'], name: ['nama'], present: ['hadir'], sick: ['sakit', 's'], permit: ['izin', 'ijin', 'i'], absent: ['tidakhadir', 'alpa', 'tanpaketerangan', 'a'] },
    headers: ['NO', 'NISN', 'NIS', 'NAMA', 'KELAS', 'HADIR', 'SAKIT', 'IZIN', 'TIDAK HADIR'], sample: [], notes: ['Format sama dengan aplikasi lama (NO;NISN;NIS;NAMA;KELAS;HADIR;SAKIT;IZIN;TIDAK HADIR).', 'Bisa file Excel atau CSV (pemisah ; , atau tab).', 'Berlaku untuk semester yang sedang dipilih.']
  }
};

function normDate(v) {
  const s = String(v || '').trim();
  if (!s) return '';
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
  const m = s.match(/^(\d{1,2})[/.-](\d{1,2})[/.-](\d{2,4})$/);
  if (m) { const y = m[3].length === 2 ? (Number(m[3]) > 50 ? '19' : '20') + m[3] : m[3]; return `${y}-${m[2].padStart(2, '0')}-${m[1].padStart(2, '0')}`; }
  return s;
}

export async function importPage(el, params) {
  const ent = ENTITIES[params.entity] ? params.entity : (remember('imp') || 'students');
  remember('imp', ent);
  const E = ENTITIES[ent];
  el.innerHTML = pageHead('Impor & Ekspor Data', `Impor dari Excel/CSV dengan pratinjau & validasi. Tujuan: ${esc(App.semLabel())}.`) + `
    <div class="tabs">${Object.entries(ENTITIES).map(([k, v]) => `<a class="tab ${k === ent ? 'active' : ''}" href="#impor?entity=${k}">${esc(v.label)}</a>`).join('')}</div>
    <div class="grid grid-2">
      <div class="card"><div class="card-head"><h3>${icon('upload')} Impor ${esc(E.label)}</h3></div><div class="card-body">
        <ol style="padding-left:18px;margin:0 0 12px" class="muted"><li>Unduh template, isi data.</li><li>Pilih file → periksa pratinjau & kesalahan.</li><li>Simpan.</li></ol>
        <div class="btn-group"><button class="btn" id="im-tpl">${icon('file')}Unduh template</button><label class="btn btn-primary">${icon('upload')}Pilih file Excel/CSV<input type="file" id="im-file" accept=".xlsx,.xls,.csv,.txt" hidden></label></div>
        <label class="check mt-2"><input type="checkbox" id="im-upd"> Perbarui data lama yang sudah ada (bila tidak dicentang, data lama dilewati)</label>
        <div class="mt-2 muted" style="font-size:12.5px">${E.notes.map(n => '• ' + esc(n)).join('<br>')}</div></div></div>
      <div class="card"><div class="card-head"><h3>${icon('download')} Ekspor</h3></div><div class="card-body"><div class="btn-group">
        <button class="btn" data-x="students">${icon('student')}Siswa</button><button class="btn" data-x="teachers">${icon('teacher')}Guru</button><button class="btn" data-x="classes">${icon('class')}Kelas</button>
        <button class="btn" data-x="subjects">${icon('book')}Mapel</button><button class="btn" data-x="assignments">${icon('users')}Pembagian tugas</button></div>
        <p class="muted mt-2" style="font-size:12.5px">Nilai siswa: ekspor dari <a href="#nilai">Lembar Nilai</a> atau <a href="#leger">Leger</a>. Seluruh data: menu <a href="#backup">Backup</a>.</p></div></div>
    </div><div id="im-prev" class="mt-3"></div>`;
  $('#im-tpl', el).onclick = () => downloadTemplate(`Template_${E.label.replace(/\s+/g, '_')}.xlsx`, E.headers, E.sample, E.notes);
  let parsed = null;
  $('#im-file', el).onchange = async e => {
    const f = e.target.files[0];
    if (!f) return;
    try {
      const book = await readSpreadsheet(f);
      const aoa = book.sheets[book.names[0]];
      const { rows, missing } = rowsToObjects(aoa, E.map);
      parsed = rows.map(r => (E.norm ? E.norm(r) : r));
      await preview(f.name, missing);
    } catch (er) { errorToast(er); }
    e.target.value = '';
  };
  const send = (dry, skip) => post('/import/' + ent, { rows: parsed, dry_run: dry, update_existing: $('#im-upd', el).checked, skip_errors: skip, semester_id: App.semester.id, year_id: App.semester.year_id }, { timeout: 180000 });
  async function preview(name, missing) {
    const r = await withLoading('Memvalidasi data...', () => send(true));
    const box = $('#im-prev', el);
    const s = r.summary;
    box.innerHTML = `<div class="card"><div class="card-head"><h3>${icon('eye')} Pratinjau: ${esc(name)}</h3><div class="btn-group"><span class="badge green">${s.new} baru</span><span class="badge blue">${s.update} diperbarui</span><span class="badge gray">${s.skip} dilewati</span><span class="badge red">${s.error} error</span></div></div><div class="card-body">
      ${missing.length ? `<div class="alert warn">${icon('alert')}<div>Kolom tidak ditemukan: ${missing.map(esc).join(', ')}</div></div>` : ''}
      <div class="table-wrap" style="max-height:50vh"><table class="tbl tbl-compact"><thead><tr><th>Baris</th><th>Data</th><th>Aksi</th><th>Keterangan</th></tr></thead><tbody>
      ${r.rows.map(x => `<tr><td>${parsed[x.index - 1]._row || x.index}</td><td>${esc(x.label)}</td><td>${{ new: '<span class="badge green">Baru</span>', update: '<span class="badge blue">Perbarui</span>', skip: '<span class="badge gray">Lewati</span>', error: '<span class="badge red">Error</span>' }[x.action]}</td><td style="font-size:12.5px">${x.messages.map(esc).join('; ')}</td></tr>`).join('')}</tbody></table></div>
      <div class="btn-group mt-2"><button class="btn btn-primary" id="im-go"${s.new + s.update === 0 ? ' disabled' : ''}>${icon('save')}Simpan ${s.new + s.update} baris${s.error ? ' (lewati error)' : ''}</button><button class="btn" id="im-cancel">Batal</button></div></div></div>`;
    $('#im-cancel', box).onclick = () => { box.innerHTML = ''; };
    $('#im-go', box).onclick = ev => busy(ev.currentTarget, async () => {
      try { const res = await send(false, true); toast(`Impor selesai: ${res.summary.new} baru, ${res.summary.update} diperbarui`, 'success'); box.innerHTML = ''; invalidate(); }
      catch (er) { errorToast(er); }
    });
  }
  $$('[data-x]', el).forEach(b => b.onclick = () => busy(b, async () => {
    try {
      const k = b.dataset.x;
      if (k === 'students') { const rows = await get('/students' + qs({ year_id: App.semester.year_id })); return exportWorkbook('Siswa.xlsx', [{ name: 'Siswa', headers: ENTITIES.students.headers, rows: rows.map(r => [r.roll_no || '', r.nis || '', r.nisn || '', r.name, r.gender || '', r.birth_place || '', r.birth_date || '', r.religion || '', r.address || '', r.parent_name || '', r.parent_phone || '', r.class_name || '', r.status]), textCols: [1, 2, 10] }]); }
      if (k === 'teachers') { const rows = await refs.teachers(); return exportWorkbook('Guru.xlsx', [{ name: 'Guru', headers: ['NAMA', 'NIP', 'NUPTK', 'JK', 'HP', 'EMAIL', 'USERNAME', 'MAPEL', 'WALI KELAS'], rows: rows.map(t => [t.name, t.nip || '', t.nuptk || '', t.gender || '', t.phone || '', t.email || '', t.username || '', t.subjects.map(s => s.code).join(', '), t.homeroom.join(', ')]), textCols: [1, 2, 4] }]); }
      if (k === 'classes') { const rows = await refs.classes(); return exportWorkbook('Kelas.xlsx', [{ name: 'Kelas', headers: ['KELAS', 'TINGKAT', 'LABEL RAPOR', 'WALI KELAS', 'URUT', 'JUMLAH SISWA'], rows: rows.map(c => [c.name, c.grade_level, c.report_label || '', c.homeroom_name || '', c.sort_order, c.students]) }]); }
      if (k === 'subjects') { const rows = await get('/subjects'); return exportWorkbook('Mapel.xlsx', [{ name: 'Mapel', headers: ENTITIES.subjects.headers, rows: rows.map(s => [s.code, s.name, s.group_name, s.kktp ?? '', s.sort_order, s.active ? 'Y' : 'N']) }]); }
      if (k === 'assignments') { const rows = await get('/assignments' + qs({ semester_id: App.semester.id })); return exportWorkbook('Pembagian_Tugas.xlsx', [{ name: 'Tugas', title: 'PEMBAGIAN TUGAS MENGAJAR', subtitle: App.semLabel(), headers: ['GURU', 'MAPEL', 'KELAS'], rows: rows.map(a => [a.teacher_name, a.subject_code, a.class_name]) }]); }
    } catch (er) { errorToast(er); }
  }));
}
