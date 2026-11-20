// Aplikasi admin: daftar menu & halaman.
import { startApp } from '../app.js';
import { dashboardPage } from './dashboard.js';
import { yearsPage } from './years.js';
import { studentsPage, teachersPage, classesPage, subjectsPage, homeroomPage, assignmentsPage, ekskulPage, bankPage, usersPage } from './master.js';
import { typesPage, configPage, scalesPage } from './assessments.js';
import { monitoringPage, sheetPage } from './monitoring.js';
import { legerPage } from './leger.js';
import { raporPage, isianPage, pickupPage, deskripsiAdminPage } from './rapor.js';
import { reportsPage } from './reports.js';
import { auditPage, backupPage, settingsPage, importPage } from './system.js';

const menu = [
  { section: 'Utama' },
  { id: 'dashboard', label: 'Dashboard', icon: 'dashboard' },
  { id: 'tahun', label: 'Tahun Pelajaran', icon: 'calendar' },
  {
    id: 'g-master', label: 'Data Master', icon: 'database', children: [
      { id: 'siswa', label: 'Data Siswa' }, { id: 'guru', label: 'Data Guru' }, { id: 'kelas', label: 'Data Kelas' },
      { id: 'mapel', label: 'Mata Pelajaran' }, { id: 'wali', label: 'Wali Kelas' }, { id: 'tugas', label: 'Pembagian Tugas' },
      { id: 'ekskul', label: 'Ekstrakurikuler' }, { id: 'bank', label: 'Bank Deskripsi' }, { id: 'impor', label: 'Impor & Ekspor Data' }
    ]
  },
  {
    id: 'g-nilai', label: 'Pengaturan Penilaian', icon: 'sliders', children: [
      { id: 'jenis', label: 'Jenis Penilaian' }, { id: 'kategori', label: 'Kategori Penilaian' }, { id: 'bobot', label: 'Bobot Penilaian' },
      { id: 'sumber', label: 'Sumber Nilai' }, { id: 'predikat', label: 'Predikat dan KKTP' }
    ]
  },
  { section: 'Penilaian & Laporan' },
  { id: 'monitoring', label: 'Monitoring Nilai', icon: 'monitor' },
  { id: 'leger', label: 'Leger', icon: 'table' },
  {
    id: 'g-rapor', label: 'Rapor', icon: 'file', children: [
      { id: 'rapor', label: 'Cetak Rapor' }, { id: 'isian', label: 'Kehadiran & Isian Wali' }, { id: 'deskripsi', label: 'Deskripsi Mapel' },
      { id: 'pengambilan', label: 'Pengambilan Rapor' }
    ]
  },
  { id: 'laporan', label: 'Laporan', icon: 'chart' },
  { section: 'Sistem' },
  { id: 'pengguna', label: 'Pengguna', icon: 'users' },
  { id: 'aktivitas', label: 'Riwayat Aktivitas', icon: 'history' },
  { id: 'backup', label: 'Backup Database', icon: 'archive' },
  { id: 'pengaturan', label: 'Pengaturan Sekolah', icon: 'settings' }
];

const pages = {
  dashboard: { title: 'Dashboard', render: dashboardPage },
  tahun: { title: 'Tahun Pelajaran', render: yearsPage, needsSemester: false },
  siswa: { title: 'Data Siswa', render: studentsPage },
  guru: { title: 'Data Guru', render: teachersPage, needsSemester: false },
  kelas: { title: 'Data Kelas', render: classesPage },
  mapel: { title: 'Mata Pelajaran', render: subjectsPage, needsSemester: false },
  wali: { title: 'Wali Kelas', render: homeroomPage },
  tugas: { title: 'Pembagian Tugas Mengajar', render: assignmentsPage },
  ekskul: { title: 'Ekstrakurikuler', render: ekskulPage, needsSemester: false },
  bank: { title: 'Bank Deskripsi', render: bankPage, needsSemester: false },
  impor: { title: 'Impor & Ekspor Data', render: importPage },
  jenis: { title: 'Jenis Penilaian', render: typesPage },
  kategori: { title: 'Kategori Penilaian', render: (el, p) => configPage(el, p, 'kategori') },
  bobot: { title: 'Bobot Penilaian', render: (el, p) => configPage(el, p, 'bobot') },
  sumber: { title: 'Sumber Nilai', render: (el, p) => configPage(el, p, 'sumber') },
  predikat: { title: 'Predikat dan KKTP', render: scalesPage, needsSemester: false },
  monitoring: { title: 'Monitoring Nilai', render: monitoringPage },
  nilai: { title: 'Lembar Nilai', render: sheetPage },
  leger: { title: 'Leger Nilai', render: legerPage },
  rapor: { title: 'Cetak Rapor', render: raporPage },
  isian: { title: 'Kehadiran & Isian Wali Kelas', render: isianPage },
  deskripsi: { title: 'Deskripsi Rapor per Mapel', render: deskripsiAdminPage },
  pengambilan: { title: 'Pengambilan Rapor', render: pickupPage },
  laporan: { title: 'Laporan', render: reportsPage },
  pengguna: { title: 'Pengguna', render: usersPage, needsSemester: false },
  aktivitas: { title: 'Riwayat Aktivitas', render: auditPage, needsSemester: false },
  backup: { title: 'Backup Database', render: backupPage, needsSemester: false },
  pengaturan: { title: 'Pengaturan Sekolah', render: settingsPage, needsSemester: false }
};

startApp({ role: 'admin', menu, pages, home: 'dashboard' });
