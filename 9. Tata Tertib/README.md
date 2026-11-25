# Tata Tertib SMP Kristen Basaan

Buku Kedisiplinan Siswa digital — PWA offline dengan data di Google Sheets.

- **Aplikasi guru** (`index.html`): dasbor, riwayat per siswa/kelas/tanggal, laporan; guru login (pilih nama + password, bisa offline) lalu mencatat pelanggaran dalam 3 langkah — poin bisa disesuaikan, saran lokasi & tindakan langsung.
- **Halaman Siswa & Orang Tua** (`DashboardSiswa.html`): tanpa login — ringkasan sekolah, rekap kelas, cek perkembangan anak dengan NIS, tata tertib, info & pengumuman.
- Akumulasi poin & tahap sanksi otomatis, tindak lanjut (SP 1/2/3, perjanjian, pengembalian), BAP.
- **Surat Panggilan Orang Tua (manual)**: satu atau banyak siswa sekaligus, 6 templat (termasuk format Excel sekolah), riwayat & kehadiran orang tua.
- Semua dokumen & laporan: **unduh PDF/PNG, kirim ke WhatsApp**, atau cetak.
- Admin mengelola bentuk pelanggaran, kategori, tahap sanksi, siswa (impor Excel), pengguna, dan pengaturan.
- Bisa dipasang di HP, berjalan tanpa internet, tombol **Update** untuk data & versi terbaru.

Cara pasang & pakai: **[PANDUAN.md](PANDUAN.md)**. Server: [`apps-script/Code.gs`](apps-script/Code.gs) (v1.1.0).
