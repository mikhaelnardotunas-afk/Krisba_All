# Data Induk Sekolah — Panduan Pemasangan

Data Induk adalah **satu tempat** untuk mengelola data siswa & guru (lengkap dengan foto).
Saat Anda menambah, mengubah, atau menghapus siswa/guru di sini, data di spreadsheet
aplikasi 1–9 ikut disesuaikan secara otomatis.

## Cara kerja

```
 0. Data Induk (spreadsheet + Apps Script)
        │  "Sinkronkan" — otomatis setelah menyimpan, + terjadwal tiap 30 menit
        ├──► ABSEN GURU ........ sheet Guru                    (1. Absen Guru)
        ├──► SMP KR BASAAN ..... sheet SISWA                   (2. Petugas & 3. Absen Siswa)
        ├──► GitHub CSV ........ MasterAbsenSiswa.CSV          (4. Cetak Kartu)       [opsional]
        ├──► ABSEN WAJAH ....... sheet MasterAbsenSiswa        (5. Daftar Wajah & 8. Scan Wajah)
        ├──► DKN MID ........... sheet Siswa + Kelas           (5. DKN Mid Semester)
        ├──► DKN_Final_V1 ...... students/teachers/classes     (6. DKN Semester)
        ├──► Ujian PG Essay .... sheet USER                    (7. Ujian Online)
        └──► Catatan Kasus V2 .. sheet Siswa                   (9. Tata Tertib)
```

- Yang ditulis **hanya kolom identitas** (nama, NIS, NISN, kelas, JK, TTL, dst.).
  Absensi, nilai, data wajah, catatan pelanggaran, dan password akun **tidak disentuh**.
- Kode aplikasi 1–9 **tidak diubah** (kecuali Daftar Wajah, lihat di bawah).
- Siswa yang dihapus/lulus/pindah:
  - Absen Siswa, DKN Mid, Ujian, Wajah → barisnya dihapus (agar tidak kena Alpa, dll.)
  - Tata Tertib → Status diubah (Lulus/Pindah/Nonaktif), catatan pelanggaran aman
  - DKN Semester → status `lulus/pindah/keluar`, nilai & rapor aman
  - Absen Guru → guru ditandai `Deleted`, riwayat absen aman
- Data yang dihapus di Data Induk masuk ke **Arsip** dan bisa dipulihkan.

## Langkah pemasangan (sekali saja, ±15 menit)

1. **Buat spreadsheet baru** di Google Drive, beri nama `DATA INDUK SEKOLAH`.
2. Buka **Ekstensi → Apps Script**. Hapus isi `Code.gs`, tempel seluruh isi file
   `0. Data Induk/Code.gs`, lalu **Simpan**.
3. Pilih fungsi **`siapkanSheet`** → **Jalankan** → izinkan semua akses
   (Spreadsheet, Drive untuk foto, koneksi luar untuk GitHub).
   Ini membuat sheet: `PENGATURAN, SISWA, GURU, KELAS, TARGET, TAUTAN, LOG, ARSIP`
   dan folder Drive `FOTO DATA INDUK SEKOLAH`.
4. Buka sheet **PENGATURAN** → ganti `PASSWORD_ADMIN` (bawaan: `induk2026`).
5. Buka sheet **TARGET** → periksa kolom `SPREADSHEET_ID`. ID sudah terisi dari spreadsheet
   yang ditemukan di Drive Anda; pastikan benar (klik menu *Periksa koneksi*).
6. Muat ulang spreadsheet, lalu dari menu **📚 Data Induk**:
   1. *Impor data awal dari aplikasi* — mengambil siswa dari Absen Siswa (dilengkapi NISN,
      TTL, NIK dari CSV master, Tata Tertib, DKN), guru dari Absen Guru (+ gelar & NIP dari DKN),
      wali kelas dari DKN Mid. **Tidak ada aplikasi yang diubah pada langkah ini.**
   2. Periksa hasilnya di sheet SISWA / GURU / KELAS.
   3. *Pratinjau sinkronisasi* — melihat apa yang AKAN berubah, tanpa mengubah apa pun.
   4. *Sinkronkan ke semua aplikasi*.
   5. *Aktifkan sinkron otomatis* (tiap 30 menit; juga menangkap perubahan yang diketik
      langsung di sheet SISWA/GURU).
7. **Terapkan → Deployment baru → Aplikasi web**
   - Jalankan sebagai: **Saya**
   - Yang memiliki akses: **Siapa saja**
   - Salin URL yang berakhiran `/exec`.
8. Tempel URL itu di 3 tempat (cari teks `PASTE_URL_WEB_APP_DATA_INDUK`):
   - `0. Data Induk/index.html` (atau cukup isi di layar login, kolom *Alamat server*)
   - `Index.html` (portal — untuk angka statistik)
   - `5. Daftar Wajah/Daftar_Wajah.html` (`DATA_INDUK_URL`)
9. Unggah file yang baru/berubah ke hosting (GitHub) seperti biasa.

> Setelah mengubah `Code.gs`: **Terapkan → Kelola deployment → ✏️ → Versi: Versi baru → Terapkan**
> (jangan "Deployment baru", agar URL tetap sama).

## Password

- Login aplikasi Data Induk memakai `PASSWORD_ADMIN` di sheet **PENGATURAN**.
- Bisa diganti dari aplikasi (**Pengaturan → Ganti password**) atau langsung di sel spreadsheet.
- Setelah password diganti, semua perangkat otomatis harus login ulang.

## Sheet TARGET (pengaturan tiap aplikasi)

| Kolom | Arti |
|---|---|
| AKTIF | YA = ikut disinkronkan |
| SINKRON_SISWA / SINKRON_GURU | data apa yang dikirim |
| TAMBAH_BARU | siswa/guru baru ditambahkan ke aplikasi |
| HAPUS_DI_APLIKASI | yang dihapus/tidak aktif ikut dihapus atau ditandai |
| FORMAT_KELAS | `{kelas}`=7A · `{romawi}-{rombel}`=VII-A · `{tingkat}`=7 · `{rombel}`=A |
| HURUF_NAMA | ASLI / KAPITAL (nama siswa) |
| NAMA_GURU_BERGELAR | YA = "Laurita Ruindungan, S.Pd.Gr" |

Contoh: Ujian Online memakai kelas `VII-A`, maka FORMAT_KELAS-nya `{romawi}-{rombel}`.
Saat semester berganti dan DKN memakai spreadsheet baru, cukup ganti `SPREADSHEET_ID` baris DKN.

## Cetak Kartu (opsional)

Aplikasi Cetak Kartu membaca file CSV di GitHub (`NardoTuns/SMPKRISTENBASAAN2026/MasterAbsenSiswa.CSV`).
Agar ikut diperbarui otomatis:
1. GitHub → Settings → Developer settings → **Fine-grained tokens** → izin
   **Contents: Read and write** hanya untuk repo tersebut.
2. Aplikasi Data Induk → **Pengaturan → Cetak Kartu (GitHub)** → tempel token → Simpan.
3. Menu **Sinkronisasi** → target *4. Cetak Kartu* → Atur → aktifkan.

## Daftar Wajah (satu-satunya aplikasi yang diubah)

Daftar siswa di `Daftar_Wajah.html` sebelumnya **ditanam di dalam file** sehingga siswa baru
tidak pernah muncul. Sekarang daftar diambil dari Data Induk (`?action=siswa&key=KUNCI_API`),
disimpan di HP untuk offline, dan **daftar lama tetap dipakai** bila Data Induk belum diisi/gagal.
Proses pendaftaran wajah tidak berubah.

## Fungsi setup di tiap spreadsheet

| Aplikasi | Fungsi setup (Apps Script) |
|---|---|
| 0. Data Induk | `siapkanSheet` (menu 📚 Data Induk) |
| 1. Absen Guru | `siapkanSheet` / `rapikanAbsensi` |
| 2 & 3. Absen Siswa | `siapkanSpreadsheet` (menu AbsenQR) |
| 5. DKN Mid Semester | `setupSheets` |
| 6. DKN Semester | `setupSheets` |
| 7. Ujian Online | `setupSpreadsheet` (menu 🎯 Ujian) |
| 9. Tata Tertib | `setup` (menu Tata Tertib) |
| 5 & 8. Wajah | kode backend tidak ada di folder ini — tidak diubah |

## Pemecahan masalah

- **"Sheet ... tidak ditemukan"** → jalankan fungsi setup aplikasi tersebut, atau periksa ID di TARGET.
- **Nama ditemukan 2 kali** (catatan di hasil sinkron) → ada nama kembar di aplikasi; samakan NIS/NISN
  di aplikasi itu, atau isi manual sheet TAUTAN.
- **Foto tidak tampil** → domain sekolah mungkin melarang berbagi tautan; aplikasi otomatis memakai
  jalur cadangan (memuat foto lewat server).
- **Sinkron lambat** → normal ±5–15 detik per aplikasi; indikator di pojok kanan atas aplikasi.
