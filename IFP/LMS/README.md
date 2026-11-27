# LMS Kelas Digital

Learning Management System untuk sekolah. Tampilan di-host di **GitHub Pages** (gratis), dan seluruh data disimpan di **Google Spreadsheet** melalui Google Apps Script.

**Fitur:** 3 peran (Admin, Guru, Siswa) · kelas dengan kode gabung · materi (teks, gambar, tautan) · tugas dengan tenggat + unggah foto · kuis pilihan ganda dinilai otomatis (timer, soal diacak, analisis butir soal) · Buku Nilai (salin ke Excel) · pengumuman · diskusi kelas · agenda · responsif di HP, laptop, dan IFP.

```
lms/
├── index.html          ← aplikasi (unggah ke GitHub)
├── config.js           ← isi URL Apps Script (unggah ke GitHub)
├── README.md
└── apps-script/
    ├── Code.gs         ← backend (tempel ke Apps Script, BUKAN ke GitHub)
    └── appsscript.json ← opsional
```

---

## Langkah 1 — Siapkan Spreadsheet (backend)

1. Buka <https://sheets.new> → beri nama, mis. **Database LMS**.
2. Menu **Ekstensi → Apps Script**.
3. Hapus semua kode di `Kode.gs`, lalu **tempel seluruh isi `apps-script/Code.gs`** → klik 💾 Simpan.
4. Klik ⚙️ **Setelan Project** → atur **Zona waktu** ke `(GMT+08:00) Makassar` (atau WIB/WIT sesuai daerah).
5. Kembali ke editor ⟨⟩, pilih fungsi **`setup`** di menu tarik-turun bagian atas → klik **▶ Jalankan**.
   - Pertama kali, Google akan meminta izin: **Tinjau izin → pilih akun → Lanjutan → Buka (tidak aman) → Izinkan**. Ini wajar karena script milik Anda sendiri.
6. Buka Spreadsheet lagi. Sheet **Pengguna, Kelas, Materi, Tugas, Pengumpulan, Kuis, HasilKuis, Diskusi, Pengumuman, Pengaturan** sudah dibuat otomatis, ditambah folder Drive *LMS Kelas Digital - Lampiran* untuk gambar.

## Langkah 2 — Terapkan sebagai Aplikasi Web

1. Di Apps Script: **Terapkan → Deployment baru**.
2. Klik ⚙️ di samping "Pilih jenis" → **Aplikasi web**.
3. Isi:
   - **Jalankan sebagai:** *Saya*
   - **Yang memiliki akses:** *Siapa saja*
4. **Terapkan** → salin **URL Aplikasi web** (berakhiran `/exec`).
5. Uji: buka URL itu di browser. Harus muncul `{"ok":true,...,"pesan":"Backend aktif..."}`.

## Langkah 3 — Unggah ke GitHub

1. Buka `config.js`, lalu tempel URL tadi di antara tanda kutip:
   ```js
   window.LMS_CONFIG = {
     API_URL: "https://script.google.com/macros/s/AKfy.../exec"
   };
   ```
2. Di GitHub: **New repository** → nama mis. `lms` → Public → Create.
3. **Add file → Upload files** → seret `index.html`, `config.js`, `README.md` → **Commit changes**.
   (Folder `apps-script` tidak perlu diunggah.)
4. **Settings → Pages** → Source: *Deploy from a branch* → Branch: `main` / `(root)` → **Save**.
5. Tunggu 1–2 menit. Aplikasi bisa dibuka di `https://USERNAME-ANDA.github.io/lms/`.

## Langkah 4 — Mulai pakai

1. Masuk dengan **admin / admin123**, lalu langsung buka **Pengaturan** untuk mengganti kata sandi dan nama sekolah.
2. Menu **Pengguna** → tambah akun guru (peran Guru).
3. **Impor massal** → tempel daftar siswa dari Excel (Nama ⇥ Kelas). Kata sandi awal siswa: `siswa123`.
4. Guru masuk → **Buat kelas** → bagikan **kode kelas** ke siswa. Guru juga bisa langsung menambahkan siswa dari tab **Anggota**.

---

## Memperbarui backend

Jika `Code.gs` diubah: **Terapkan → Kelola deployment → ✏️ Edit → Versi: Versi baru → Terapkan**. URL tetap sama, jadi `config.js` tidak perlu diubah.

## Catatan penting

- **Gambar** (materi dan foto tugas siswa) disimpan di Google Drive dan dibagikan "siapa saja yang memiliki link". Akun dari domain tertentu (mis. **belajar.id**) membatasi berbagi ke luar, sehingga gambar bisa tidak tampil bagi siswa. Jika begitu, gunakan akun Gmail pribadi sebagai pemilik Spreadsheet.
- **Keamanan:**
  - Kata sandi disimpan dalam bentuk hash (SHA-256 + salt).
  - Kunci jawaban kuis tidak pernah dikirim ke siswa sebelum mereka selesai, dan kuis dinilai di server.
  - Sesi login berlaku 6 jam.
- **Kapasitas:** cocok untuk sekolah dengan ratusan siswa. Apps Script punya kuota harian (±20.000 permintaan/hari untuk Gmail biasa), cukup untuk pemakaian sehari-hari.
- **Cadangan:** buka Spreadsheet → **File → Buat salinan** secara berkala.
- **Lupa kata sandi admin:** buka Spreadsheet → menu **LMS** → *Reset kata sandi admin → admin123*.
- Jangan mengubah kolom `pass` atau urutan kolom di sheet secara manual. Data lain (nama, kelas, nilai) boleh diperbaiki langsung di Spreadsheet bila perlu, lalu muat ulang aplikasi lewat tombol ↻.
