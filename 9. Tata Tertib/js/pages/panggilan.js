// Surat Panggilan Orang Tua (manual).
// Satu siswa: pilih siswa → pilih pelanggaran dari catatan (dan/atau tambah manual — tidak masuk database) →
// kronologi (dari catatan / tulis sendiri) → teks lain → tanggal surat, tanggal datang, waktu, tempat →
// penanda tangan → templat. Banyak siswa: satu kesalahan & tanggal yang sama untuk banyak siswa sekaligus.
// Hasil dibuka di lembar dokumen yang sama dengan surat lain (PDF, PNG, Word, WhatsApp, cetak).
// Riwayat surat disimpan di HP ini (IndexedDB) — tidak mengubah data pelanggaran di server.
import { h, icon, btn, iconBtn, sheet, dialog, toast, confirmDialog, pickFile, downloadText } from '../ui/dom.js';
import { avatar, emptyState, levelBadge, pageHead } from '../ui/widgets.js';
import { go } from '../ui/nav.js';
import { openDoc } from '../ui/export.js';
import { PAPER_OPTIONS } from '../ui/paper.js';
import { S, D, me, saveSettingsMap } from '../store.js';
import * as db from '../db.js';
import { syncNow } from '../sync.js';
import { isMgr, canAdmin, kelasWali } from '../core/perm.js';
import { byTime } from '../core/points.js';
import { addDays, cmpKelas, cmpNama, debounce, fmtTgl, isYmd, matches, toCSV, uid, waNumber, ymd, stamp } from '../core/util.js';
import {
  SP_DEFAULTS, SP_LABELS, TEMPLATES, WARNA, spSet, tplOf, ensureLogos, logoSrc, LOGO_FILES,
  tanggalDatang, formatNomor, jamPlus, isiPenanda, suratHtml, daftarHadirHtml,
} from '../ui/surat-panggilan.js';

export const meta = { title: 'Surat Panggilan' };

const KV_DRAFT = 'spDraft.v1';
const KV_RIWAYAT = 'spRiwayat.v1';
const MAX_RIWAYAT = 400;

/** Admin, Kepala Sekolah, Guru BK (semua kelas) dan Wali Kelas (kelasnya sendiri). */
export const canPanggil = (u) => isMgr(u) || (!!u && u.peran === 'Wali Kelas');

const st = { loaded: false, loading: null, tab: 'satu', draft: { satu: null, massal: null }, riwayat: [], prevIdx: 0 };

async function loadState() {
  if (st.loaded) return;
  if (!st.loading) {
    st.loading = (async () => {
      const [dr, rw] = await Promise.all([db.kvGet(KV_DRAFT, null), db.kvGet(KV_RIWAYAT, [])]);
      if (dr?.satu) st.draft.satu = upgrade(dr.satu, 'satu');
      if (dr?.massal) st.draft.massal = upgrade(dr.massal, 'massal');
      if (dr?.tab) st.tab = dr.tab;
      st.riwayat = Array.isArray(rw) ? rw : [];
      st.loaded = true;
      ensureLogos();
    })();
  }
  return st.loading;
}
const saveDraft = debounce(() => db.kvSet(KV_DRAFT, { tab: st.tab, satu: st.draft.satu, massal: st.draft.massal }).catch(() => {}), 500);
const saveRiwayat = () => db.kvSet(KV_RIWAYAT, st.riwayat.slice(0, MAX_RIWAYAT)).catch((e) => toast('Riwayat tidak dapat disimpan: ' + e.message));

// ------------------------------------------------------------------ draf
const textDefaults = () => ({
  salam: spSet('spSalam'), pembuka: spSet('spPembuka'), pengantar: spSet('spPengantar'), ajakan: spSet('spAjakan'), penutup1: spSet('spPenutup1'), penutup2: spSet('spPenutup2'),
});

function blankDraft(mode) {
  const tgl = ymd();
  return {
    id: uid('sp'), mode,
    siswaId: '', siswaIds: [],
    rows: [], items: [], tglKesalahan: tgl, kronSiswa: {}, pakaiKronSiswa: true,
    tglSurat: tgl, tglDatang: tanggalDatang(tgl), datangOtomatis: true,
    waktu: spSet('spWaktu'), tempat: spSet('spTempat'), menemui: '', keperluan: '', selang: 0, jamMulai: '08:30',
    nomor: '', nomorUrut: false, nomorMulai: 1, lampiran: '-', perihal: spSet('spPerihal'), judul: spSet('spJudul'),
    teks: textDefaults(), tambahan: '', kronUmum: '', tembusan: '',
    template: tplOf(spSet('spTemplate')).kode, warna: spSet('spWarna'),
    opsi: { kolomKron: true, kolomPoin: true, akumulasi: true, tahap: false, slip: false, barisKosong: 0, daftarHadir: true },
    ttd: { wali: true, bk: false, kepsek: false, saya: false, ortu: false, waliNama: '', waliNip: '', lain: [] },
  };
}
function upgrade(d, mode) {
  const b = blankDraft(mode);
  return { ...b, ...d, mode, teks: { ...b.teks, ...(d.teks || {}) }, opsi: { ...b.opsi, ...(d.opsi || {}) }, ttd: { ...b.ttd, ...(d.ttd || {}) } };
}
const clone = (x) => JSON.parse(JSON.stringify(x));
const draftOf = (mode) => (st.draft[mode] ||= blankDraft(mode));

// ------------------------------------------------------------------ data siswa & surat
function scopeSiswa(u) {
  const d = D();
  if (isMgr(u)) return d.aktif;
  const mine = kelasWali(u);
  return d.aktif.filter((s) => mine.includes(String(s.kelas || '').toLowerCase()));
}
const waliOf = (kelas) => S.d.users.find((u) => u.peran === 'Wali Kelas' && String(u.kelasWali || '').toLowerCase().split(/[,;]\s*/).includes(String(kelas || '').toLowerCase()));

/** Pelanggaran yang pernah dimasukkan ke surat (dari riwayat HP ini): idCatatan → tanggal surat. */
function disurati() {
  const m = new Map();
  for (const e of st.riwayat) for (const r of e.draft?.rows || []) if (r.on && r.recId && !m.has(r.recId)) m.set(r.recId, e.tglSurat);
  return m;
}

function recRow(r, on) {
  return { key: 'r:' + r.id, src: 'catatan', recId: r.id, on, tanggal: r.tanggal, uraian: String(r.uraian || '').replace(/\.\s*$/, ''), poin: Number(r.poin) || 0, kronAsli: r.kronologi || '', kron: r.kronologi || '' };
}

/** Pilih siswa (satu): isi daftar pelanggaran dari catatan; yang belum pernah disurati langsung dicentang. */
function setSiswa(dr, siswa) {
  const sent = disurati();
  const recs = (D().summaries.get(siswa.id)?.recs || []).slice().sort(byTime).reverse();
  const manual = dr.rows.filter((r) => r.src === 'manual');
  dr.siswaId = siswa.id;
  dr.rows = [...recs.map((r) => recRow(r, !sent.has(r.id))), ...manual];
  const w = waliOf(siswa.kelas);
  dr.ttd.waliNama = w?.nama || '';
  dr.ttd.waliNip = w?.nip || '';
}

function ttdCols(dr, siswa) {
  const s = S.settings;
  const u = me();
  const w = waliOf(siswa?.kelas);
  const t = dr.ttd;
  const cols = [];
  if (t.ortu) cols.push({ key: 'sp-ortu', role: 'Orang Tua/Wali', name: siswa?.ortu || '' });
  if (t.kepsek) cols.push({ key: 'sp-kepsek', top: 'Mengetahui,', role: 'Kepala Sekolah', name: s.kepalaSekolah, nip: s.nipKepsek });
  if (t.bk) cols.push({ key: 'sp-bk', role: 'Guru BK', name: s.guruBK, nip: s.nipBK });
  if (t.saya && u) cols.push({ key: 'sp-saya', role: u.peran === 'Admin' ? 'Admin Tata Tertib' : u.peran, name: u.nama, nip: u.nip });
  (t.lain || []).forEach((x, i) => { if (x.role || x.name) cols.push({ key: 'sp-lain' + i, top: x.top, role: x.role, name: x.name, nip: x.nip }); });
  if (t.wali) cols.push({ key: 'sp-wali', role: 'Wali Kelas', name: (dr.mode === 'satu' && t.waliNama) || w?.nama || '', nip: (dr.mode === 'satu' && t.waliNip) || w?.nip || '' });
  // custom: pilihan di formulir ini yang menentukan siapa yang dicetak (tidak ditimpa ingatan lembar pratinjau).
  return cols.map((c) => ({ ...c, custom: true }));
}

const numPoin = (v) => (v === '' || v == null || isNaN(Number(v)) ? 0 : Number(v));

/** Data lengkap satu surat untuk templat. */
function letterFor(dr, siswa, idx = 0) {
  const d = D();
  const sum = d.summaries.get(siswa.id);
  let rows;
  if (dr.mode === 'satu') rows = dr.rows.filter((r) => r.on).map((r) => ({ tanggal: r.tanggal, uraian: r.uraian, poin: r.poin, kron: r.kron }));
  else {
    const own = dr.pakaiKronSiswa ? String(dr.kronSiswa?.[siswa.id] || '').trim() : '';
    rows = dr.items.map((it) => ({ tanggal: it.tanggal, uraian: it.uraian, poin: it.poin, kron: own || isiPenanda(it.kron, { siswa }) }));
  }
  rows.sort((a, b) => String(a.tanggal || '').localeCompare(String(b.tanggal || '')));
  const zona = S.settings.zonaWaktu || '';
  const waktu = dr.mode === 'massal' && Number(dr.selang) > 0 ? `${jamPlus(dr.jamMulai, Number(dr.selang) * idx)} ${zona}`.trim() : dr.waktu;
  const nomor = dr.mode === 'massal' && dr.nomorUrut ? formatNomor(spSet('spNomorFormat'), (Number(dr.nomorMulai) || 1) + idx, dr.tglSurat) : dr.nomor;
  return {
    template: dr.template, warna: dr.warna, tglSurat: dr.tglSurat, nomor, lampiran: dr.lampiran, perihal: dr.perihal, judul: dr.judul,
    siswa, rows, totalPoin: rows.reduce((t, r) => t + numPoin(r.poin), 0), akumulasi: sum?.total ?? 0, tahap: sum?.level?.label || 'Aman',
    opsi: dr.opsi, teks: dr.teks, tambahan: dr.tambahan, kronUmum: dr.kronUmum, tembusan: dr.tembusan,
    jadwal: { tanggal: dr.tglDatang, waktu, tempat: dr.tempat, menemui: dr.menemui, keperluan: dr.keperluan },
    ttd: ttdCols(dr, siswa),
  };
}

const CONTOH = { id: '__contoh', nama: 'NAMA SISWA', nis: '0000', nisn: '0000000000', jk: 'L', kelas: '9A', ortu: 'Nama Orang Tua' };
function targets(dr) {
  const d = D();
  if (dr.mode === 'satu') { const s = d.siswaMap.get(dr.siswaId); return s ? [s] : []; }
  return dr.siswaIds.map((id) => d.siswaMap.get(id)).filter(Boolean);
}
function lettersOf(dr) { return targets(dr).map((s, i) => letterFor(dr, s, i)); }
function docHtml(dr) {
  const L = lettersOf(dr);
  let html = L.map(suratHtml).join('');
  if (dr.mode === 'massal' && dr.opsi.daftarHadir && L.length > 1) {
    const s = S.settings;
    html += daftarHadirHtml(L, { ttd: [{ key: 'sp-bk', role: 'Guru BK', name: s.guruBK, nip: s.nipBK, custom: true }, { key: 'sp-kepsek', top: 'Mengetahui,', role: 'Kepala Sekolah', name: s.kepalaSekolah, nip: s.nipKepsek, custom: true }] });
  }
  return html;
}

function waText(dr, siswa, L) {
  const s = S.settings;
  return `Yth. Bapak/Ibu ${siswa.ortu || 'Orang Tua/Wali'} dari ${siswa.nama} (kelas ${siswa.kelas}),\n\n` +
    `Dengan hormat, kami mengundang Bapak/Ibu untuk hadir di sekolah pada:\n` +
    `• Hari/tanggal: ${dr.tglDatang ? fmtTgl(dr.tglDatang, { hari: true }) : '-'}\n• Waktu: ${L?.jadwal.waktu || dr.waktu || '-'}\n• Tempat: ${dr.tempat || '-'}\n\n` +
    `Perihal: ${dr.perihal || 'panggilan orang tua/wali'} terkait catatan pelanggaran tata tertib ananda. Surat panggilan resmi kami lampirkan / dititipkan melalui ananda.\n` +
    `Mohon kehadirannya. Terima kasih.\n\n— ${me()?.nama || 'Guru'}, ${s.namaSekolah}`;
}

// ------------------------------------------------------------------ halaman
let viewRef = null;
export function render(view, route) {
  viewRef = view;
  const u = me();
  if (!u) { view.append(emptyState('lock', 'Masuk terlebih dahulu', 'Surat panggilan orang tua hanya untuk guru yang login.', btn('Masuk', () => go('login', { next: 'panggilan' }), { kind: 'primary', ic: 'login' }))); return; }
  if (!canPanggil(u)) { view.append(emptyState('lock', 'Tidak memiliki akses', 'Surat panggilan dibuat oleh Admin, Kepala Sekolah, Guru BK, atau Wali Kelas.')); return; }
  if (!st.loaded) {
    view.append(h('div', { class: 'empty' }, h('div', { class: 'empty-ic' }, icon('spark', 'spin')), h('p', { class: 'muted', text: 'Memuat…' })));
    loadState().then(() => { if (viewRef === view && view.isConnected) { view.replaceChildren(); render(view, route); } });
    return;
  }
  const pre = route.query.siswa;
  if (pre && D().siswaMap.has(pre)) {
    st.tab = 'satu';
    const dr = draftOf('satu');
    if (dr.siswaId !== pre) setSiswa(dr, D().siswaMap.get(pre));
    history.replaceState(history.state, '', '#/panggilan');
  }
  const rerender = () => { const y = scrollY; view.replaceChildren(); render(view, { ...route, query: {} }); scrollTo(0, y); };

  view.append(pageHead('Surat Panggilan Orang Tua', 'Buat surat panggilan manual: pilih siswa & pelanggaran, kronologi, jadwal, penanda tangan, dan templat — lalu cetak, unduh PDF/Word, atau kirim WhatsApp.',
    canAdmin(u) ? btn('Pengaturan surat', () => openSettings(rerender), { ic: 'settings', kind: 'tonal' }) : null));

  const tab = (k, label, ic, extra) => h('button', { type: 'button', class: st.tab === k ? 'on' : '', 'aria-pressed': String(st.tab === k), onclick: () => { st.tab = k; st.prevIdx = 0; saveDraft(); rerender(); } }, icon(ic), h('span', { text: label }), extra);
  view.append(h('div', { class: 'sp-tabs' }, h('div', { class: 'seg' },
    tab('satu', 'Satu siswa', 'user'), tab('massal', 'Banyak siswa', 'users'),
    tab('riwayat', 'Riwayat', 'calendar', st.riwayat.length ? h('span', { class: 'sp-count', text: String(st.riwayat.length) }) : null))));

  if (st.tab === 'riwayat') return renderRiwayat(view, rerender);
  editor(view, draftOf(st.tab), rerender);
}

// ------------------------------------------------------------------ penyunting
function editor(view, dr, rerender) {
  const u = me();
  const d = D();
  const pool = scopeSiswa(u);
  const isSatu = dr.mode === 'satu';
  const form = h('div', { class: 'sp-form' });
  const side = h('aside', { class: 'sp-side' });
  const footer = h('div', { class: 'form-footer sp-footer' });
  view.append(h('div', { class: 'sp-layout' }, form, side), footer);

  if (!pool.length) {
    form.append(emptyState('users', 'Belum ada siswa', isMgr(u) ? 'Data siswa belum ada di HP ini. Sinkronkan atau impor siswa di Kelola.' : 'Tidak ada siswa aktif di kelas perwalian Anda.'));
    return;
  }

  // ---- pratinjau (kanan di layar lebar)
  const prevBox = h('div', { class: 'sp-prev-paper docs' });
  const prevScaler = h('div', { class: 'sp-prev-scale' }, prevBox);
  const prevNav = h('div', { class: 'sp-prev-nav' });
  side.append(h('div', { class: 'card sp-prev-card' },
    h('div', { class: 'row gap-sm sp-prev-head' }, icon('eye'), h('strong', { class: 'grow', text: 'Pratinjau langsung' }), prevNav),
    h('div', { class: 'sp-prev-wrap' }, prevScaler),
    btn('Pratinjau & Cetak', () => doPrint(dr, rerender), { kind: 'primary', ic: 'printer', class: 'btn primary block' })));

  const refreshPreview = () => {
    const tg = targets(dr);
    const n = tg.length;
    if (st.prevIdx >= n) st.prevIdx = Math.max(0, n - 1);
    const s = tg[st.prevIdx] || CONTOH;
    prevBox.innerHTML = suratHtml(letterFor(dr, s, st.prevIdx));
    prevNav.replaceChildren(n > 1 ? [iconBtn('left', 'Surat sebelumnya', () => { st.prevIdx = (st.prevIdx - 1 + n) % n; refreshPreview(); }),
      h('span', { class: 'muted small', text: `${st.prevIdx + 1}/${n}` }), iconBtn('right', 'Surat berikutnya', () => { st.prevIdx = (st.prevIdx + 1) % n; refreshPreview(); })] : null);
    requestAnimationFrame(() => {
      const w = prevScaler.parentElement?.clientWidth || 360;
      const sc = Math.min(1, w / 794);
      prevBox.style.transform = `scale(${sc})`;
      prevScaler.style.height = Math.min(prevBox.offsetHeight * sc, 2400) + 'px';
    });
  };
  const preview = debounce(refreshPreview, 250);
  let thumbRefresh = () => {};
  const changed = () => { saveDraft(); preview(); drawFooter(); thumbRefresh(); };

  // ---- bagian formulir
  const sec = (n, title, sub, ...content) => h('section', { class: 'card sp-sec' },
    h('div', { class: 'sp-sec-h' }, h('span', { class: 'sp-n', text: String(n) }), h('div', { class: 'grow' }, h('h3', { text: title }), sub ? h('p', { class: 'muted small', text: sub }) : null)),
    ...content);
  const secSiswa = h('div'); const secPel = h('div'); const secTeks = h('div'); const secJadwal = h('div'); const secTtd = h('div'); const secTpl = h('div');
  form.append(secSiswa, secPel, secTeks, secJadwal, secTtd, secTpl);

  const inp = (obj, key, attrs = {}, after) => h('input', { type: 'text', value: obj[key] ?? '', ...attrs, oninput: (e) => { obj[key] = attrs.type === 'number' ? e.target.value : e.target.value; after?.(); changed(); } });
  const area = (obj, key, rows = 2, attrs = {}, after) => { const t = h('textarea', { rows, ...attrs, oninput: (e) => { obj[key] = e.target.value; after?.(); changed(); } }); t.value = obj[key] ?? ''; return t; };
  const fld = (label, control, hint) => h('label', { class: 'field' }, h('span', { class: 'lbl', text: label }), control, hint ? h('span', { class: 'hint', text: hint }) : null);
  const sw = (label, get, set, hint) => h('label', { class: 'switch small sp-sw' }, h('input', { type: 'checkbox', checked: !!get(), onchange: (e) => { set(e.target.checked); changed(); } }), h('span', null, h('span', { text: label }), hint ? h('span', { class: 'hint block', text: hint }) : null));

  // ================================================================ 1. siswa
  let sq = '', sk = '';
  function drawSiswa() {
    if (isSatu) {
      const s = d.siswaMap.get(dr.siswaId);
      if (s && pool.includes(s)) {
        const sum = d.summaries.get(s.id);
        secSiswa.replaceChildren(sec(1, 'Siswa', null,
          h('div', { class: 'sp-chosen' }, avatar(s.nama, s.jk === 'P' ? 'f' : ''),
            h('div', { class: 'grow min0' }, h('strong', { class: 'block', text: s.nama }),
              h('span', { class: 'muted small', text: `Kelas ${s.kelas} · NIS ${s.nis || '-'}${s.nisn ? ` · NISN ${s.nisn}` : ''} · ${sum.total} poin` }),
              h('span', { class: 'muted small block', text: `Orang tua/wali: ${s.ortu || '-'}${s.hpOrtu ? ` · ${s.hpOrtu}` : ''}` })),
            levelBadge(sum.level, { small: true }),
            btn('Ganti', () => { dr.siswaId = ''; dr.rows = dr.rows.filter((r) => r.src === 'manual'); changed(); drawAll(); }, { small: true, kind: 'text', ic: 'edit' }))));
        return;
      }
    }
    const listBox = h('div');
    const chosenBox = h('div');
    const toggle = (s) => {
      if (isSatu) { setSiswa(dr, s); changed(); drawAll(); return; }
      const i = dr.siswaIds.indexOf(s.id);
      if (i >= 0) dr.siswaIds.splice(i, 1); else dr.siswaIds.push(s.id);
      changed(); drawList(); drawChosen();
    };
    const visible = () => pool.filter((s) => (!sk || s.kelas === sk) && (!sq || matches(sq, s.nama, s.nis, s.nisn, s.kelas))).sort((a, b) => cmpKelas(a.kelas, b.kelas) || cmpNama(a.nama, b.nama));
    const drawChosen = () => chosenBox.replaceChildren(!isSatu && dr.siswaIds.length ? h('div', { class: 'stack-sm' },
      h('div', { class: 'row gap-sm wrap' }, h('strong', { class: 'grow', text: `${dr.siswaIds.length} siswa dipilih` }),
        btn('Kosongkan', () => { dr.siswaIds = []; dr.kronSiswa = {}; changed(); drawList(); drawChosen(); }, { small: true, kind: 'text', ic: 'x' })),
      h('div', { class: 'chips' }, ...dr.siswaIds.map((id) => d.siswaMap.get(id)).filter(Boolean).map((s) =>
        h('button', { class: 'chip on', type: 'button', 'aria-label': `Hapus ${s.nama}`, onclick: () => toggle(s) }, h('span', { text: `${s.nama} · ${s.kelas}` }), icon('x'))))) : null);
    const drawList = () => {
      const all = visible();
      const list = all.slice(0, sq || sk ? 120 : 30);
      listBox.replaceChildren(
        !isSatu && (sq || sk) && all.length ? h('div', { class: 'row gap-sm wrap sp-bulk-actions' },
          btn(`Pilih semua yang tampil (${all.length})`, () => { for (const s of all) if (!dr.siswaIds.includes(s.id)) dr.siswaIds.push(s.id); changed(); drawList(); drawChosen(); }, { small: true, ic: 'check' }),
          btn('Batalkan yang tampil', () => { const ids = new Set(all.map((s) => s.id)); dr.siswaIds = dr.siswaIds.filter((id) => !ids.has(id)); changed(); drawList(); drawChosen(); }, { small: true, kind: 'text' })) : null,
        !sq && !sk ? h('p', { class: 'muted small list-label', text: 'Ketik nama/NIS siswa, atau pilih kelas.' }) : null,
        list.length ? h('div', { class: 'pick-list sp-pick' }, ...list.map((s) => {
          const on = isSatu ? dr.siswaId === s.id : dr.siswaIds.includes(s.id);
          const sum = d.summaries.get(s.id);
          return h('button', { class: 'pick' + (on ? ' on' : ''), type: 'button', 'aria-pressed': String(on), onclick: () => toggle(s) },
            avatar(s.nama, s.jk === 'P' ? 'f' : ''),
            h('span', { class: 'grow min0' }, h('span', { class: 'block ellipsis pick-name', text: s.nama }), h('span', { class: 'muted small', text: `Kelas ${s.kelas} · ${sum.total} poin · ${sum.count} pelanggaran` })),
            sum.level ? levelBadge(sum.level, { small: true }) : null,
            h('span', { class: 'check' + (isSatu ? ' round' : '') }, on ? icon('check') : null));
        })) : (sq || sk) ? h('p', { class: 'muted small', text: 'Tidak ada siswa yang cocok.' }) : null);
    };
    const kelasList = [...new Set(pool.map((s) => s.kelas).filter(Boolean))].sort(cmpKelas);
    const search = h('input', { type: 'search', placeholder: 'Cari nama atau NIS siswa…', value: sq, 'aria-label': 'Cari siswa', autocomplete: 'off', oninput: debounce((e) => { sq = e.target.value; drawList(); }, 120) });
    secSiswa.replaceChildren(sec(1, isSatu ? 'Pilih siswa' : 'Pilih siswa (banyak)', isSatu ? 'Data siswa diambil dari database siswa.' : 'Centang siswa yang menerima surat. Bisa juga diambil otomatis dari catatan pelanggaran pada tanggal tertentu.',
      !isSatu ? fromCatatan() : null,
      h('label', { class: 'fsel search block' }, icon('search'), search),
      kelasList.length > 1 ? h('div', { class: 'chips scroll' },
        h('button', { class: 'chip' + (sk ? '' : ' on'), type: 'button', onclick: () => { sk = ''; drawSiswa(); } }, h('span', { text: 'Semua kelas' })),
        ...kelasList.map((k) => h('button', { class: 'chip' + (sk === k ? ' on' : ''), type: 'button', onclick: () => { sk = sk === k ? '' : k; drawSiswa(); } }, h('span', { text: k })))) : null,
      chosenBox, listBox));
    drawChosen(); drawList();
  }

  /** Massal: ambil siswa & pelanggaran dari catatan pada tanggal tertentu (opsional: satu jenis pelanggaran). */
  function fromCatatan() {
    const f = { tgl: dr.tglKesalahan || ymd(), jenis: '' };
    const out = h('div', { class: 'stack-sm' });
    const ids = new Set(pool.map((s) => s.id));
    const find = () => S.d.pelanggaran.filter((r) => !r.batal && r.tanggal === f.tgl && ids.has(r.siswaId) && (!f.jenis || String(r.jenisKode) === f.jenis));
    const add = (recs, withItems) => {
      const siswa = [...new Set(recs.map((r) => r.siswaId))];
      for (const id of siswa) if (!dr.siswaIds.includes(id)) dr.siswaIds.push(id);
      if (withItems) {
        for (const r of new Map(recs.map((x) => [String(x.jenisKode), x])).values()) {
          const uraian = String(r.uraian).replace(/\.\s*$/, '');
          if (!dr.items.some((it) => it.uraian === uraian && it.tanggal === r.tanggal)) dr.items.push({ key: uid('i'), tanggal: r.tanggal, uraian, poin: Number(r.poin) || 0, kron: '' });
        }
      }
      for (const id of siswa) {
        const k = recs.filter((r) => r.siswaId === id && String(r.kronologi || '').trim()).map((r) => r.kronologi.trim());
        if (k.length) dr.kronSiswa[id] = k.join('\n');
      }
      dr.tglKesalahan = f.tgl;
      changed(); drawAll();
      toast(`${siswa.length} siswa ditambahkan.`);
    };
    const draw = () => {
      const recs = find();
      const all = S.d.pelanggaran.filter((r) => !r.batal && r.tanggal === f.tgl && ids.has(r.siswaId));
      const siswa = new Set(recs.map((r) => r.siswaId));
      const perJenis = [...all.reduce((m, r) => m.set(String(r.jenisKode), [...(m.get(String(r.jenisKode)) || []), r]), new Map())];
      const nJenis = new Set(recs.map((r) => String(r.jenisKode))).size;
      out.replaceChildren(
        all.length ? h('div', { class: 'chips' }, ...perJenis.map(([kode, rs]) => h('button', { class: 'chip' + (f.jenis === kode ? ' on' : ''), type: 'button', title: rs[0].uraian,
          onclick: () => { f.jenis = f.jenis === kode ? '' : kode; jenisSel.value = f.jenis; draw(); } },
        h('strong', { text: String(new Set(rs.map((r) => r.siswaId)).size) }), h('span', { text: String(rs[0].uraian).slice(0, 38) + (String(rs[0].uraian).length > 38 ? '…' : '') })))) : null,
        h('p', { class: 'small', text: recs.length ? `Ditemukan ${recs.length} catatan · ${siswa.size} siswa · ${nJenis} jenis pelanggaran.${nJenis > 1 ? ' Pilih satu jenis di atas agar semua surat memuat kesalahan yang sama.' : ''}` : 'Tidak ada catatan pelanggaran pada tanggal ini.' }),
        recs.length ? h('div', { class: 'row gap-sm wrap' },
          btn(`Tambahkan ${siswa.size} siswa + ${nJenis} pelanggaran`, () => add(recs, true), { small: true, kind: 'primary', ic: 'plus' }),
          btn('Siswanya saja', () => add(recs, false), { small: true, kind: 'text' })) : null);
    };
    const jenisSel = h('select', { onchange: (e) => { f.jenis = e.target.value; draw(); } },
      h('option', { value: '', text: 'Semua jenis pelanggaran' }), ...D().jenis.map((j) => h('option', { value: String(j.kode), text: `${j.kode}. ${j.uraian.slice(0, 70)}` })));
    draw();
    return h('details', { class: 'sp-details' }, h('summary', null, icon('clipboard'), h('span', { class: 'grow', text: 'Ambil dari catatan pelanggaran (tanggal yang sama)' }), icon('down')),
      h('div', { class: 'stack-sm sp-details-body' },
        h('div', { class: 'form-row' }, fld('Tanggal kesalahan', h('input', { type: 'date', value: f.tgl, oninput: (e) => { f.tgl = e.target.value; draw(); } })), fld('Jenis pelanggaran', jenisSel)),
        out));
  }

  // ================================================================ 2. pelanggaran & kronologi
  function drawPel() {
    const sent = disurati();
    const jenisOpts = () => h('datalist', { id: 'sp-jenis-list' }, ...D().jenis.filter((j) => j.aktif !== false).map((j) => h('option', { value: String(j.uraian).replace(/\.\s*$/, '') })));
    const poinOf = (uraian) => { const j = D().jenis.find((x) => String(x.uraian).replace(/\.\s*$/, '') === uraian); return j ? (j.zt ? 100 : Number(j.poin) || 0) : null; };
    const manualCard = (r, onRemove) => {
      // Poin terisi otomatis saat uraian cocok dengan tata tertib (selama poin belum diubah sendiri).
      const poinInp = inp(r, 'poin', { type: 'number', min: 0, max: 100, inputmode: 'numeric' }, () => { r.autoPoin = r.poin === ''; });
      return h('div', { class: 'sp-man' },
        h('div', { class: 'row gap-sm' }, h('span', { class: 'badge sm st-info', text: isSatu ? 'Manual · tidak masuk database' : 'Pelanggaran' }), h('span', { class: 'grow' }), iconBtn('trash', 'Hapus baris', onRemove)),
        h('div', { class: 'form-row sp-man-row' },
          fld('Tanggal', inp(r, 'tanggal', { type: 'date' })),
          fld('Poin', poinInp, 'Kosongkan bila tanpa poin')),
        fld('Pelanggaran', inp(r, 'uraian', { list: 'sp-jenis-list', placeholder: 'Pilih dari tata tertib atau ketik sendiri…' }, () => {
          const pz = poinOf(r.uraian);
          if (pz != null && (r.poin === '' || r.poin == null || r.autoPoin)) { r.poin = pz; r.autoPoin = true; poinInp.value = pz; }
        })),
        fld('Kronologi', area(r, 'kron', 2, { placeholder: isSatu ? 'Tulis kronologi kejadian (opsional)…' : 'Kronologi (opsional). Bisa memakai {nama} dan {kelas}.' })));
    };

    if (isSatu) {
      const s = d.siswaMap.get(dr.siswaId);
      const recRows = dr.rows.filter((r) => r.src === 'catatan');
      const manRows = dr.rows.filter((r) => r.src === 'manual');
      const otherKron = [...new Set(recRows.map((r) => r.kronAsli).filter(Boolean))];
      const quick = (label, fn) => h('button', { class: 'chip', type: 'button', onclick: () => { fn(); changed(); drawPel(); } }, h('span', { text: label }));
      const recList = recRows.map((r) => {
        const sentAt = sent.get(r.recId);
        const head = h('label', { class: 'sp-rec-h' },
          h('input', { type: 'checkbox', checked: r.on, onchange: (e) => { r.on = e.target.checked; changed(); drawPel(); } }),
          h('span', { class: 'grow min0' },
            h('span', { class: 'block sp-rec-t', text: r.uraian }),
            h('span', { class: 'muted small', text: `${fmtTgl(r.tanggal, { hari: true })} · ${r.poin} poin` }),
            sentAt ? h('span', { class: 'badge sm st-ok sp-sent', text: `sudah disurati ${fmtTgl(sentAt, { short: true })}` }) : null));
        if (!r.on) return h('div', { class: 'sp-rec' }, head);
        const kron = area(r, 'kron', 2, { placeholder: 'Kronologi (kosongkan bila tidak perlu)…' });
        const reuse = otherKron.filter((k) => k !== r.kron);
        return h('div', { class: 'sp-rec on' }, head,
          h('div', { class: 'sp-kron' },
            h('div', { class: 'row gap-sm wrap sp-kron-h' }, h('span', { class: 'lbl grow', text: 'Kronologi untuk surat' }),
              r.kronAsli && r.kron !== r.kronAsli ? btn('Dari catatan', () => { r.kron = r.kronAsli; kron.value = r.kron; changed(); }, { small: true, kind: 'text', ic: 'undo' }) : null,
              r.kron ? btn('Kosongkan', () => { r.kron = ''; kron.value = ''; changed(); }, { small: true, kind: 'text' }) : null,
              reuse.length ? h('select', { class: 'sp-reuse', 'aria-label': 'Ambil kronologi dari catatan lain', onchange: (e) => { if (e.target.value) { r.kron = e.target.value; kron.value = r.kron; e.target.value = ''; changed(); } } },
                h('option', { value: '', text: 'Ambil dari catatan lain…' }), ...reuse.map((k) => h('option', { value: k, text: k.length > 60 ? k.slice(0, 58) + '…' : k }))) : null),
            kron,
            !r.kronAsli ? h('span', { class: 'hint', text: 'Catatan ini belum punya kronologi — tulis manual bila perlu (tidak mengubah database).' }) : null));
      });
      secPel.replaceChildren(sec(2, 'Pelanggaran & kronologi', 'Centang pelanggaran yang dimasukkan ke surat. Kronologi bisa diambil dari catatan atau ditulis manual. Baris manual hanya untuk surat ini — tidak masuk database pelanggaran.',
        jenisOpts(),
        !s ? h('p', { class: 'muted small', text: 'Pilih siswa terlebih dahulu untuk melihat catatan pelanggarannya. Pelanggaran manual tetap bisa ditambahkan.' }) : null,
        s && recRows.length ? h('div', { class: 'chips' },
          quick('Semua', () => recRows.forEach((r) => { r.on = true; })),
          quick('Belum pernah disurati', () => recRows.forEach((r) => { r.on = !sent.has(r.recId); })),
          quick('30 hari terakhir', () => recRows.forEach((r) => { r.on = r.tanggal >= addDays(ymd(), -30); })),
          quick('Kosongkan', () => recRows.forEach((r) => { r.on = false; }))) : null,
        s && !recRows.length ? h('div', { class: 'notice info sm' }, icon('info'), h('p', { class: 'small', text: 'Siswa ini belum memiliki catatan pelanggaran. Tambahkan pelanggaran manual di bawah.' })) : null,
        recList.length ? h('div', { class: 'sp-recs' }, ...recList) : null,
        ...manRows.map((r) => manualCard(r, () => { dr.rows.splice(dr.rows.indexOf(r), 1); changed(); drawPel(); })),
        h('div', { class: 'row gap-sm wrap' },
          btn('Tambah pelanggaran manual', () => { dr.rows.push({ key: uid('m'), src: 'manual', on: true, tanggal: ymd(), uraian: '', poin: '', kron: '', autoPoin: true }); changed(); drawPel(); }, { ic: 'plus', small: true }),
          btn('Dari daftar tata tertib', () => pickJenis((j) => { dr.rows.push({ key: uid('m'), src: 'manual', on: true, tanggal: ymd(), uraian: String(j.uraian).replace(/\.\s*$/, ''), poin: j.zt ? 100 : Number(j.poin) || 0, kron: '' }); changed(); drawPel(); }), { ic: 'book', small: true, kind: 'text' }))));
    } else {
      const setAllTgl = (v) => { dr.tglKesalahan = v; for (const it of dr.items) it.tanggal = v; changed(); drawPel(); };
      const withKron = Object.keys(dr.kronSiswa || {}).filter((id) => dr.siswaIds.includes(id)).length;
      secPel.replaceChildren(sec(2, 'Kesalahan yang sama', 'Pelanggaran & tanggal kesalahan ini dicetak di surat setiap siswa terpilih. Hanya untuk surat — tidak masuk database pelanggaran.',
        jenisOpts(),
        h('div', { class: 'form-row' }, fld('Tanggal kesalahan (semua baris)', h('input', { type: 'date', value: dr.tglKesalahan, onchange: (e) => setAllTgl(e.target.value) }))),
        ...dr.items.map((it) => manualCard(it, () => { dr.items.splice(dr.items.indexOf(it), 1); changed(); drawPel(); })),
        !dr.items.length ? h('p', { class: 'muted small', text: 'Belum ada pelanggaran. Tambahkan dari daftar tata tertib atau tulis manual.' }) : null,
        h('div', { class: 'row gap-sm wrap' },
          btn('Dari daftar tata tertib', () => pickJenis((j) => { dr.items.push({ key: uid('i'), tanggal: dr.tglKesalahan, uraian: String(j.uraian).replace(/\.\s*$/, ''), poin: j.zt ? 100 : Number(j.poin) || 0, kron: '' }); changed(); drawPel(); }), { ic: 'book', small: true }),
          btn('Tulis manual', () => { dr.items.push({ key: uid('i'), tanggal: dr.tglKesalahan, uraian: '', poin: '', kron: '', autoPoin: true }); changed(); drawPel(); }, { ic: 'plus', small: true, kind: 'text' })),
        withKron ? sw(`Pakai kronologi dari catatan masing-masing siswa (${withKron} siswa)`, () => dr.pakaiKronSiswa, (v) => { dr.pakaiKronSiswa = v; }, 'Bila siswa punya kronologi di catatan pada tanggal itu, kronologi tersebut yang dicetak di suratnya.') : null));
    }
  }

  // ================================================================ 3. teks surat
  let teksOpen = false;
  function drawTeks() {
    const t = dr.teks;
    const insert = (target, text) => { dr[target] = (dr[target] ? dr[target].replace(/\s*$/, '') + '\n' : '') + text; changed(); drawTeks(); };
    const QUICK = ['Mohon membawa buku penghubung / kartu pelajar siswa.', 'Apabila berhalangan hadir, mohon menghubungi Wali Kelas sebelum tanggal tersebut.', 'Siswa yang bersangkutan diharapkan hadir bersama orang tua/wali.', 'Kehadiran Bapak/Ibu tidak dapat diwakilkan.'];
    const selKron = isSatu ? dr.rows.filter((r) => r.on && r.kron).map((r) => r.kron) : [];
    const tpl = tplOf(dr.template);
    secTeks.replaceChildren(sec(3, 'Teks surat', 'Tambahkan kronologi umum dan teks lainnya. Kalimat surat dapat diubah; penanda {nama}, {kelas}, {ortu}, {tempat}, {tanggal}, {waktu}, {sekolah} terisi otomatis.',
      fld('Kronologi umum (opsional, dicetak di bawah tabel)', area(dr, 'kronUmum', 3, { placeholder: 'Ringkasan kejadian secara keseluruhan…' })),
      selKron.length ? h('div', { class: 'row gap-sm' }, btn('Isi dari kronologi pelanggaran terpilih', () => { dr.kronUmum = selKron.join('\n'); changed(); drawTeks(); }, { small: true, kind: 'text', ic: 'clipboard' })) : null,
      fld('Teks tambahan (opsional)', area(dr, 'tambahan', 3, { placeholder: 'mis. Mohon membawa buku penghubung siswa.' })),
      h('div', { class: 'chips' }, ...QUICK.map((q) => h('button', { class: 'chip', type: 'button', title: 'Tambahkan ke teks tambahan', onclick: () => insert('tambahan', q) }, icon('plus'), h('span', { text: q.length > 44 ? q.slice(0, 42) + '…' : q })))),
      h('details', { class: 'sp-details', open: teksOpen, ontoggle: (e) => { teksOpen = e.target.open; } }, h('summary', null, icon('edit'), h('span', { class: 'grow', text: 'Nomor, perihal & kalimat surat' }), icon('down')),
        h('div', { class: 'stack-sm sp-details-body' },
          isSatu ? h('div', { class: 'form-row' },
            fld('Nomor surat', inp(dr, 'nomor', { placeholder: 'Kosongkan bila tidak perlu' })),
            h('div', { class: 'field sp-end' }, btn('Isi nomor otomatis', () => { dr.nomor = formatNomor(spSet('spNomorFormat'), nextNo(dr.tglSurat), dr.tglSurat); changed(); drawTeks(); }, { small: true, ic: 'spark' })))
            : h('div', { class: 'stack-sm' },
              sw('Nomor surat berurutan untuk tiap siswa', () => dr.nomorUrut, (v) => { dr.nomorUrut = v; if (v && (!dr.nomorMulai || dr.nomorMulai < 1)) dr.nomorMulai = nextNo(dr.tglSurat); drawTeks(); }, `Format: ${spSet('spNomorFormat')}`),
              dr.nomorUrut ? fld('Mulai dari nomor', inp(dr, 'nomorMulai', { type: 'number', min: 1, inputmode: 'numeric' })) : fld('Nomor surat (sama untuk semua)', inp(dr, 'nomor', { placeholder: 'Kosongkan bila tidak perlu' }))),
          h('div', { class: 'form-row' }, fld('Lampiran', inp(dr, 'lampiran')), fld('Perihal', inp(dr, 'perihal'))),
          fld('Judul surat', inp(dr, 'judul', { placeholder: tpl.judul || '(templat Utama tanpa judul, sesuai Excel)' }), 'Kosongkan untuk judul bawaan templat.'),
          fld(SP_LABELS.spSalam, inp(t, 'salam')),
          fld(SP_LABELS.spPembuka, area(t, 'pembuka', 3)),
          fld(SP_LABELS.spPengantar, area(t, 'pengantar', 2)),
          fld(SP_LABELS.spAjakan, area(t, 'ajakan', 2)),
          fld(SP_LABELS.spPenutup1, area(t, 'penutup1', 2)),
          fld(SP_LABELS.spPenutup2, area(t, 'penutup2', 2)),
          fld('Tembusan (satu per baris, opsional)', area(dr, 'tembusan', 2, { placeholder: 'Kepala Sekolah\nArsip' })),
          btn('Kembalikan kalimat bawaan', () => { dr.teks = textDefaults(); dr.perihal = spSet('spPerihal'); dr.judul = spSet('spJudul'); changed(); drawTeks(); }, { small: true, kind: 'text', ic: 'undo' })))));
  }

  // ================================================================ 4. tanggal, waktu, tempat
  function drawJadwal() {
    const datang = h('input', { type: 'date', value: dr.tglDatang, oninput: (e) => { dr.tglDatang = e.target.value; dr.datangOtomatis = false; hint.textContent = hintText(); changed(); } });
    const hintText = () => (dr.tglDatang ? `${fmtTgl(dr.tglDatang, { hari: true })}${dr.datangOtomatis ? ` · otomatis ${spSet('spJarakHari')} hari setelah tanggal surat (Minggu → Senin)` : ''}` : '');
    const hint = h('span', { class: 'hint', text: hintText() });
    const surat = h('input', { type: 'date', value: dr.tglSurat, oninput: (e) => {
      dr.tglSurat = e.target.value;
      if (dr.datangOtomatis && isYmd(dr.tglSurat)) { dr.tglDatang = tanggalDatang(dr.tglSurat); datang.value = dr.tglDatang; }
      hint.textContent = hintText(); changed();
    } });
    const waktuInp = inp(dr, 'waktu', { placeholder: 'mis. 08.30 Pagi', list: 'sp-waktu-list' });
    const tempatInp = inp(dr, 'tempat', { list: 'sp-tempat-list' });
    const quickDays = [['Besok', 1], ['Lusa', 2], ['3 hari', 3], ['Minggu depan', 7]];
    secJadwal.replaceChildren(sec(4, 'Tanggal, waktu & tempat', null,
      h('datalist', { id: 'sp-waktu-list' }, ...['07.30 Pagi', '08.00 Pagi', '08.30 Pagi', '09.00 Pagi', '10.00 Pagi', '11.00 Siang', '12.00 Siang', '13.00 Siang'].map((v) => h('option', { value: v }))),
      h('datalist', { id: 'sp-tempat-list' }, ...[spSet('spTempat'), `Ruang BK ${S.settings.namaSekolah}`, `Ruang Kepala Sekolah ${S.settings.namaSekolah}`, `Ruang Guru ${S.settings.namaSekolah}`].map((v) => h('option', { value: v }))),
      h('div', { class: 'form-row' }, fld('Tanggal surat', surat), fld('Tanggal orang tua datang', datang, null)),
      hint,
      h('div', { class: 'chips' }, ...quickDays.map(([l, n]) => h('button', { class: 'chip', type: 'button', onclick: () => { dr.tglDatang = tanggalDatang(dr.tglSurat, n); dr.datangOtomatis = false; datang.value = dr.tglDatang; hint.textContent = hintText(); changed(); } }, h('span', { text: l }))),
        h('button', { class: 'chip' + (dr.datangOtomatis ? ' on' : ''), type: 'button', onclick: () => { dr.datangOtomatis = true; dr.tglDatang = tanggalDatang(dr.tglSurat); datang.value = dr.tglDatang; hint.textContent = hintText(); changed(); drawJadwal(); } }, icon('sync'), h('span', { text: 'Otomatis' }))),
      !isSatu ? sw('Waktu berbeda untuk tiap siswa (bergiliran)', () => Number(dr.selang) > 0, (v) => { dr.selang = v ? 15 : 0; drawJadwal(); }, 'Agar orang tua tidak datang bersamaan.') : null,
      !isSatu && Number(dr.selang) > 0 ? h('div', { class: 'form-row' }, fld('Jam mulai', inp(dr, 'jamMulai', { type: 'time' })), fld('Selang (menit)', inp(dr, 'selang', { type: 'number', min: 5, max: 120, step: 5, inputmode: 'numeric' })))
        : fld('Waktu', waktuInp),
      fld('Tempat', tempatInp),
      h('div', { class: 'form-row' }, fld('Menemui (opsional)', inp(dr, 'menemui', { placeholder: 'mis. Guru BK / Wali Kelas' })), fld('Keperluan (opsional)', inp(dr, 'keperluan', { placeholder: 'mis. Pembinaan siswa' })))));
  }

  // ================================================================ 5. penanda tangan
  function drawTtd() {
    const t = dr.ttd;
    const s = S.settings;
    const siswa = isSatu ? d.siswaMap.get(dr.siswaId) : null;
    const w = siswa ? waliOf(siswa.kelas) : null;
    const opt = (key, label, who) => h('label', { class: 'sp-ttd-opt' + (t[key] ? ' on' : '') },
      h('input', { type: 'checkbox', checked: !!t[key], onchange: (e) => { t[key] = e.target.checked; changed(); drawTtd(); } }),
      h('span', { class: 'grow min0' }, h('strong', { class: 'block', text: label }), h('span', { class: 'muted small', text: who })));
    secTtd.replaceChildren(sec(5, 'Yang bertanda tangan', 'Centang pihak yang menandatangani surat. Nama & jabatan masih bisa diubah di lembar pratinjau sebelum dicetak.',
      h('div', { class: 'sp-ttd-grid' },
        opt('wali', 'Wali Kelas', isSatu ? (siswa ? (t.waliNama || w?.nama || '(nama wali belum ada)') : 'sesuai kelas siswa') : 'otomatis sesuai kelas tiap siswa'),
        opt('bk', 'Guru BK', s.guruBK || '(atur di Kelola → Pengaturan)'),
        opt('kepsek', 'Kepala Sekolah (Mengetahui)', s.kepalaSekolah || '(atur di Kelola → Pengaturan)'),
        opt('saya', 'Saya sendiri', `${me().nama} · ${me().peran}`),
        opt('ortu', 'Orang Tua/Wali', 'kolom tanda tangan orang tua')),
      isSatu && t.wali ? h('div', { class: 'form-row' }, fld('Nama Wali Kelas', inp(t, 'waliNama', { placeholder: '(kosong = garis titik-titik)' })), fld('NIP Wali Kelas', inp(t, 'waliNip', { placeholder: 'Boleh dikosongkan' }))) : null,
      ...(t.lain || []).map((x, i) => h('div', { class: 'sp-man' },
        h('div', { class: 'row gap-sm' }, h('span', { class: 'badge sm st-info', text: 'Penanda tangan lain' }), h('span', { class: 'grow' }), iconBtn('trash', 'Hapus', () => { t.lain.splice(i, 1); changed(); drawTtd(); })),
        h('div', { class: 'form-row' }, fld('Keterangan atas', inp(x, 'top', { placeholder: 'mis. Mengetahui,' })), fld('Jabatan', inp(x, 'role'))),
        h('div', { class: 'form-row' }, fld('Nama', inp(x, 'name')), fld('NIP / NIY', inp(x, 'nip'))))),
      btn('Tambah penanda tangan lain', () => { (t.lain ||= []).push({ top: '', role: 'Koordinator Kesiswaan', name: '', nip: '' }); changed(); drawTtd(); }, { small: true, kind: 'text', ic: 'plus' })));
  }

  // ================================================================ 6. templat & tampilan
  function drawTpl() {
    const tpl = tplOf(dr.template);
    const sample = targets(dr)[0] || CONTOH;
    const thumbs = [];
    const cards = TEMPLATES.map((T) => {
      const box = h('div', { class: 'sp-thumb-doc docs' });
      thumbs.push([T, box]);
      return h('button', { type: 'button', class: 'sp-tpl' + (T.kode === dr.template ? ' on' : ''), 'aria-pressed': String(T.kode === dr.template), title: T.ket,
        onclick: () => { dr.template = T.kode; changed(); drawTpl(); refreshPreview(); } },
      h('div', { class: 'sp-thumb' }, box), h('span', { class: 'sp-tpl-l' }, T.kode === dr.template ? icon('check') : null, h('span', { text: T.label })));
    });
    const paint = () => { for (const [T, box] of thumbs) box.innerHTML = suratHtml({ ...letterFor(dr, sample, 0), template: T.kode }); };
    thumbRefresh = debounce(paint, 900);
    secTpl.replaceChildren(sec(6, 'Templat & tampilan', tpl.ket,
      h('div', { class: 'sp-tpls' }, ...cards),
      tpl.warna ? h('div', { class: 'stack-sm' }, h('span', { class: 'lbl', text: 'Warna aksen' }),
        h('div', { class: 'sp-swatches' }, ...WARNA.map((w) => h('button', { type: 'button', class: 'sp-swatch' + (dr.warna === w.kode ? ' on' : ''), title: w.label, 'aria-label': w.label, style: { background: w.hex },
          onclick: () => { dr.warna = w.kode; changed(); drawTpl(); refreshPreview(); } }, dr.warna === w.kode ? icon('check') : null)))) : null,
      h('div', { class: 'sp-opts' },
        sw('Kolom kronologi di tabel', () => dr.opsi.kolomKron, (v) => { dr.opsi.kolomKron = v; }),
        sw('Kolom poin & jumlah poin', () => dr.opsi.kolomPoin, (v) => { dr.opsi.kolomPoin = v; drawTpl(); }),
        dr.opsi.kolomPoin ? sw('Baris akumulasi poin seluruh pelanggaran', () => dr.opsi.akumulasi, (v) => { dr.opsi.akumulasi = v; }) : null,
        dr.opsi.kolomPoin ? sw('Baris tahap sanksi saat ini', () => dr.opsi.tahap, (v) => { dr.opsi.tahap = v; }) : null,
        sw('Potongan tanda terima untuk orang tua', () => dr.opsi.slip, (v) => { dr.opsi.slip = v; }, 'Lembar kecil di bawah surat untuk dikembalikan ke sekolah.'),
        !isSatu ? sw('Lampirkan daftar hadir orang tua', () => dr.opsi.daftarHadir, (v) => { dr.opsi.daftarHadir = v; }) : null,
        fld('Baris kosong minimal di tabel', inp(dr.opsi, 'barisKosong', { type: 'number', min: 0, max: 12, inputmode: 'numeric' }), 'Seperti Excel (6 baris). 0 = tanpa baris kosong.'))));
    requestAnimationFrame(paint);
  }

  // ---- bawah
  function drawFooter() {
    const tg = targets(dr);
    const nRows = isSatu ? dr.rows.filter((r) => r.on).length : dr.items.length;
    const siswa = isSatu ? tg[0] : null;
    const L = siswa ? letterFor(dr, siswa) : null;
    const wa = siswa ? waNumber(siswa.hpOrtu) : '';
    footer.replaceChildren(
      h('span', { class: 'grow small footer-info sp-foot-info' },
        h('strong', { class: 'block', text: tg.length ? (isSatu ? tg[0].nama : `${tg.length} surat`) : (isSatu ? 'Belum memilih siswa' : 'Belum ada siswa') }),
        h('span', { class: 'muted', text: `${nRows} pelanggaran · datang ${dr.tglDatang ? fmtTgl(dr.tglDatang, { hari: true, short: true }) : '-'}` })),
      wa ? h('a', { class: 'btn tonal sp-wa', href: `https://wa.me/${wa}?text=${encodeURIComponent(waText(dr, siswa, L))}`, target: '_blank', rel: 'noopener', title: 'Kirim pemberitahuan teks ke WhatsApp orang tua' }, icon('wa'), h('span', { class: 'sp-hide-sm', text: 'WA ortu' })) : null,
      !isSatu && tg.length ? btn('WA massal', () => waMassal(dr), { ic: 'wa', kind: 'tonal', class: 'btn tonal sp-hide-xs' }) : null,
      iconBtn('trash', 'Mulai surat baru (kosongkan formulir)', async () => {
        if (!(await confirmDialog('Mulai surat baru?', 'Isian formulir ini dikosongkan. Surat yang sudah dicetak tetap ada di Riwayat.', 'Kosongkan'))) return;
        st.draft[dr.mode] = blankDraft(dr.mode); st.prevIdx = 0; saveDraft(); rerender();
      }),
      h('button', { class: 'btn primary', type: 'button', onclick: () => doPrint(dr, rerender) }, icon('printer'), h('span', null, h('span', { class: 'sp-hide-sm', text: 'Pratinjau & ' }), h('span', { text: 'Cetak' }))));
  }

  function drawAll() { drawSiswa(); drawPel(); drawTeks(); drawJadwal(); drawTtd(); drawTpl(); drawFooter(); refreshPreview(); }
  drawAll();
  new ResizeObserver(debounce(refreshPreview, 150)).observe(side);
}

/** Nomor urut berikutnya pada tahun surat (dihitung dari riwayat di HP ini). */
function nextNo(tgl) {
  const y = String(tgl || ymd()).slice(0, 4);
  return st.riwayat.filter((e) => String(e.tglSurat || '').startsWith(y)).reduce((t, e) => t + (e.siswa?.length || 1), 0) + 1;
}

/** Pilih bentuk pelanggaran dari daftar tata tertib. */
function pickJenis(onPick) {
  let q = '';
  sheet((b, close) => {
    const list = h('div', { class: 'pick-list' });
    const draw = () => list.replaceChildren(...D().jenis.filter((j) => j.aktif !== false && (!q || matches(q, j.uraian, j.kode))).map((j) =>
      h('button', { class: 'pick jenis', type: 'button', onclick: () => { onPick(j); close(); } },
        h('span', { class: 'rule-no', text: j.kode }), h('span', { class: 'grow', text: j.uraian }), h('span', { class: 'pick-pts' }, h('strong', { text: String(j.zt ? 100 : j.poin) })))));
    b.append(h('label', { class: 'fsel search block' }, icon('search'), h('input', { type: 'search', placeholder: 'Cari pelanggaran…', autofocus: true, oninput: debounce((e) => { q = e.target.value; draw(); }, 100) })), list);
    draw();
  }, { title: 'Pilih dari tata tertib' });
}

// ------------------------------------------------------------------ cetak & riwayat
async function doPrint(dr, rerender) {
  const tg = targets(dr);
  if (!tg.length) { toast(dr.mode === 'satu' ? 'Pilih siswa terlebih dahulu.' : 'Pilih minimal satu siswa.'); return; }
  const nRows = dr.mode === 'satu' ? dr.rows.filter((r) => r.on).length : dr.items.length;
  if (!nRows && !(await confirmDialog('Tanpa daftar pelanggaran?', 'Belum ada pelanggaran yang dipilih. Surat tetap dibuat dengan tabel kosong?', 'Tetap buat'))) return;
  if (!isYmd(dr.tglDatang) && !(await confirmDialog('Tanggal datang kosong', 'Tanggal orang tua datang belum diisi. Lanjutkan (dicetak titik-titik)?', 'Lanjutkan'))) return;
  await ensureLogos();
  const html = docHtml(dr);
  const first = tg[0];
  const title = dr.mode === 'satu' ? `Surat Panggilan ${first.nama}` : `Surat Panggilan ${tg.length} siswa`;
  const wa = dr.mode === 'satu' ? waNumber(first.hpOrtu) : '';
  // Simpan ke riwayat (dibuka ulang dari draf yang sama = memperbarui entri).
  const prev = st.riwayat.find((e) => e.id === dr.id);
  const entry = {
    id: dr.id, at: stamp(), by: me()?.nama || '', mode: dr.mode, template: dr.template,
    siswa: tg.map((s) => ({ id: s.id, nama: s.nama, kelas: s.kelas })), tglSurat: dr.tglSurat, tglDatang: dr.tglDatang, waktu: dr.waktu, tempat: dr.tempat,
    nomor: dr.mode === 'massal' && dr.nomorUrut ? `${formatNomor(spSet('spNomorFormat'), dr.nomorMulai, dr.tglSurat)} dst.` : dr.nomor,
    pelanggaran: dr.mode === 'satu' ? dr.rows.filter((r) => r.on).map((r) => r.uraian) : dr.items.map((r) => r.uraian),
    hadir: prev?.hadir || {}, catatan: prev?.catatan || '', draft: clone(dr),
  };
  st.riwayat = [entry, ...st.riwayat.filter((e) => e.id !== dr.id)].slice(0, MAX_RIWAYAT);
  saveRiwayat();
  openDoc(title, html, {
    paper: spSet('spKertas'),
    fileBase: `${title} ${dr.tglSurat}`,
    waNumber: wa, waTo: wa ? `${first.ortu || 'Orang tua/wali'} (${first.hpOrtu})` : '',
    waText: dr.mode === 'satu' ? waText(dr, first, letterFor(dr, first)) : `Surat panggilan orang tua/wali — ${S.settings.namaSekolah}`,
  });
  toast('Surat disimpan di Riwayat (HP ini).');
}

function waMassal(dr) {
  const L = lettersOf(dr);
  sheet((b) => {
    b.append(h('p', { class: 'muted small', text: 'Kirim pemberitahuan teks ke WhatsApp orang tua satu per satu. Surat resmi (PDF) dapat dilampirkan dari lembar pratinjau.' }),
      h('div', { class: 'list' }, ...L.map((l) => {
        const n = waNumber(l.siswa.hpOrtu);
        return h('div', { class: 'row-item static' },
          h('div', { class: 'grow min0' }, h('div', { class: 'row-title', text: l.siswa.nama }), h('div', { class: 'muted small', text: `${l.siswa.kelas} · ${l.siswa.ortu || 'Orang tua'} · ${l.siswa.hpOrtu || 'no. HP belum ada'} · ${l.jadwal.waktu}` })),
          n ? h('a', { class: 'btn small tonal', href: `https://wa.me/${n}?text=${encodeURIComponent(waText({ ...dr, waktu: l.jadwal.waktu }, l.siswa, l))}`, target: '_blank', rel: 'noopener' }, icon('wa'), h('span', { text: 'Kirim' })) : h('span', { class: 'muted small', text: '—' }));
      })));
  }, { title: 'WhatsApp orang tua' });
}

const HADIR = ['Belum', 'Hadir', 'Tidak hadir', 'Dijadwalkan ulang'];
const hadirTone = { Belum: 'warn', Hadir: 'ok', 'Tidak hadir': 'critical', 'Dijadwalkan ulang': 'info' };

function renderRiwayat(view, rerender) {
  let q = '';
  const listBox = h('div', { class: 'stack-sm' });
  const draw = () => {
    const list = st.riwayat.filter((e) => !q || matches(q, e.siswa.map((s) => `${s.nama} ${s.kelas}`).join(' '), e.nomor, e.by, (e.pelanggaran || []).join(' ')));
    listBox.replaceChildren(...(list.length ? list.map((e) => riwayatCard(e, rerender)) : [emptyState('calendar', st.riwayat.length ? 'Tidak ada yang cocok' : 'Belum ada riwayat', 'Surat yang dibuat (tombol Pratinjau & Cetak) tersimpan di sini — di HP/komputer ini saja.')]));
  };
  view.append(h('div', { class: 'filters' },
    h('label', { class: 'fsel search' }, icon('search'), h('input', { type: 'search', placeholder: 'Cari nama siswa, nomor surat, pelanggaran…', 'aria-label': 'Cari riwayat', oninput: debounce((e) => { q = e.target.value; draw(); }, 120) })),
    st.riwayat.length ? btn('Unduh CSV (Excel)', () => exportCsv(), { ic: 'download', kind: 'tonal' }) : null),
  h('div', { class: 'notice info sm' }, icon('info'), h('p', { class: 'small', text: 'Riwayat surat tersimpan di perangkat ini saja dan tidak mengubah data pelanggaran. Tandai kehadiran orang tua setelah pertemuan.' })),
  listBox);
  draw();
}

function riwayatCard(e, rerender) {
  const n = e.siswa.length;
  const counts = HADIR.map((k) => [k, e.siswa.filter((s) => (e.hadir?.[s.id] || 'Belum') === k).length]).filter(([, c]) => c);
  const reopen = (copy) => {
    const dr = upgrade(clone(e.draft), e.mode);
    if (copy) { dr.id = uid('sp'); dr.tglSurat = ymd(); if (dr.datangOtomatis) dr.tglDatang = tanggalDatang(dr.tglSurat); if (dr.mode === 'satu') dr.nomor = ''; }
    st.draft[e.mode] = dr; st.tab = e.mode; st.prevIdx = 0; saveDraft(); rerender(); scrollTo(0, 0);
    toast(copy ? 'Salinan surat dibuka — ubah lalu cetak.' : 'Surat dibuka untuk diubah.');
  };
  return h('div', { class: 'card sp-hist' },
    h('div', { class: 'sp-hist-top' },
      h('span', { class: 'sp-hist-ic' }, icon(n > 1 ? 'users' : 'user')),
      h('div', { class: 'grow min0' },
        h('strong', { class: 'block ellipsis', text: n > 1 ? `${n} siswa: ${e.siswa.slice(0, 3).map((s) => s.nama).join(', ')}${n > 3 ? ', …' : ''}` : `${e.siswa[0]?.nama} · ${e.siswa[0]?.kelas}` }),
        h('span', { class: 'muted small block', text: `Surat ${fmtTgl(e.tglSurat, { short: true })} · datang ${e.tglDatang ? fmtTgl(e.tglDatang, { hari: true, short: true }) : '-'}${e.waktu ? `, ${e.waktu}` : ''}${e.nomor ? ` · No. ${e.nomor}` : ''}` }),
        h('span', { class: 'muted small block ellipsis', text: `${tplOf(e.template).label} · ${(e.pelanggaran || []).length} pelanggaran${(e.pelanggaran || []).length ? `: ${e.pelanggaran.join('; ')}` : ''}` }),
        h('span', { class: 'muted small', text: `Dibuat ${e.at}${e.by ? ` oleh ${e.by}` : ''}` })),
      h('div', { class: 'row gap-sm wrap sp-hist-st' }, ...counts.map(([k, c]) => h('span', { class: `badge sm st-${hadirTone[k]}`, text: n > 1 ? `${k} ${c}` : k })))),
    e.catatan ? h('p', { class: 'small sp-hist-note', text: e.catatan }) : null,
    h('div', { class: 'row gap-sm wrap sp-hist-actions' },
      btn('Kehadiran', () => kehadiran(e, rerender), { small: true, ic: 'checklist', kind: 'tonal' }),
      btn('Cetak ulang', async () => { await ensureLogos(); const dr = upgrade(clone(e.draft), e.mode); openDoc(`Surat Panggilan ${n > 1 ? n + ' siswa' : e.siswa[0]?.nama}`, docHtml(dr), { paper: spSet('spKertas'), fileBase: `Surat Panggilan ${e.siswa[0]?.nama || ''} ${e.tglSurat}` }); }, { small: true, ic: 'printer', kind: 'tonal' }),
      btn('Ubah', () => reopen(false), { small: true, ic: 'edit', kind: 'text' }),
      btn('Duplikat', () => reopen(true), { small: true, ic: 'plus', kind: 'text' }),
      btn('Hapus', async () => {
        if (!(await confirmDialog('Hapus dari riwayat?', 'Entri riwayat surat ini dihapus dari perangkat ini. Data pelanggaran tidak berubah.', 'Hapus', 'danger'))) return;
        st.riwayat = st.riwayat.filter((x) => x.id !== e.id); saveRiwayat(); rerender();
      }, { small: true, ic: 'trash', kind: 'text' })));
}

function kehadiran(e, rerender) {
  const hadir = { ...(e.hadir || {}) };
  let catatan = e.catatan || '';
  sheet((b, close) => {
    b.append(h('div', { class: 'list' }, ...e.siswa.map((s) => {
      const sel = h('select', { 'aria-label': `Kehadiran orang tua ${s.nama}`, onchange: (ev) => { hadir[s.id] = ev.target.value; } }, ...HADIR.map((k) => h('option', { value: k, text: k, selected: (hadir[s.id] || 'Belum') === k })));
      return h('div', { class: 'row-item static' }, h('div', { class: 'grow min0' }, h('div', { class: 'row-title', text: s.nama }), h('div', { class: 'muted small', text: `Kelas ${s.kelas}` })), h('div', { class: 'sp-hadir-sel' }, sel));
    })),
    e.siswa.length > 1 ? h('div', { class: 'row gap-sm wrap' }, ...HADIR.slice(1, 3).map((k) => btn(`Semua ${k.toLowerCase()}`, () => { e.siswa.forEach((s) => { hadir[s.id] = k; }); b.querySelectorAll('select').forEach((x) => { x.value = k; }); }, { small: true, kind: 'text' }))) : null,
    h('label', { class: 'field' }, h('span', { class: 'lbl', text: 'Catatan hasil pertemuan' }), (() => { const t = h('textarea', { rows: 3, placeholder: 'Kesepakatan, pembinaan, dsb.', oninput: (ev) => { catatan = ev.target.value; } }); t.value = catatan; return t; })()),
    h('div', { class: 'sheet-actions' }, btn('Simpan', () => { e.hadir = hadir; e.catatan = catatan.trim(); saveRiwayat(); close(); rerender(); toast('Kehadiran tersimpan.'); }, { kind: 'primary', ic: 'check' })));
  }, { title: 'Kehadiran orang tua/wali' });
}

function exportCsv() {
  const rows = [['Tanggal surat', 'Nomor', 'Nama siswa', 'Kelas', 'Tanggal datang', 'Waktu', 'Tempat', 'Pelanggaran', 'Kehadiran', 'Catatan', 'Templat', 'Dibuat', 'Oleh']];
  for (const e of st.riwayat) for (const s of e.siswa) rows.push([e.tglSurat, e.nomor, s.nama, s.kelas, e.tglDatang, e.waktu, e.tempat, (e.pelanggaran || []).join('; '), e.hadir?.[s.id] || 'Belum', e.catatan, tplOf(e.template).label, e.at, e.by]);
  downloadText(toCSV(rows), `Riwayat Surat Panggilan ${ymd()}.csv`);
}

// ------------------------------------------------------------------ pengaturan surat (Admin → sheet Pengaturan)
function openSettings(rerender) {
  const f = Object.fromEntries(Object.keys(SP_DEFAULTS).map((k) => [k, spSet(k)]));
  const changed = new Set();
  const set = (k, v) => { f[k] = v; changed.add(k); };
  const fld = (label, control, hint) => h('label', { class: 'field' }, h('span', { class: 'lbl', text: label }), control, hint ? h('span', { class: 'hint', text: hint }) : null);
  const inp = (k, attrs = {}) => fld(SP_LABELS[k] || k, h('input', { type: 'text', value: f[k], oninput: (e) => set(k, e.target.value), ...attrs }));
  const area = (k) => { const t = h('textarea', { rows: 2, oninput: (e) => set(k, e.target.value) }); t.value = f[k]; return fld(SP_LABELS[k] || k, t); };
  const logoBox = (side, key) => {
    const img = h('img', { class: 'logo-prev', alt: `Logo ${side}` });
    const show = () => { const v = f[key]; img.hidden = v === '-'; img.src = v === '-' ? '' : /^data:/.test(v) ? v : LOGO_FILES[side]; };
    show();
    return h('div', { class: 'logo-row' }, img, h('div', { class: 'stack-sm' }, h('span', { class: 'lbl', text: `Logo ${side}` }),
      h('div', { class: 'row gap-sm wrap' },
        btn('Unggah', async () => { const file = await pickFile({ accept: 'image/*' }); if (!file) return; try { set(key, await shrinkImage(file)); show(); } catch (e) { toast(e.message); } }, { ic: 'upload', small: true }),
        btn('Bawaan', () => { set(key, ''); show(); }, { small: true, kind: 'text' }),
        btn('Tanpa logo', () => { set(key, '-'); show(); }, { small: true, kind: 'text' }))));
  };
  sheet((b, close) => {
    const body = h('div', { class: 'stack' });
    const draw = () => body.replaceChildren(
      h('p', { class: 'muted small', text: 'Pengaturan ini dipakai sebagai isian awal setiap surat panggilan baru dan disimpan ke sheet "Pengaturan" (berlaku di semua perangkat setelah sinkron).' }),
      h('section', { class: 'stack' }, h('h3', { text: 'Kop surat' }), inp('spKop1'), inp('spKop2'), inp('spKop3'), inp('spKop4'), inp('spAlamatKop'),
        h('div', { class: 'form-row' }, logoBox('kiri', 'spLogoKiri'), logoBox('kanan', 'spLogoKanan'))),
      h('section', { class: 'stack' }, h('h3', { text: 'Isian bawaan' }),
        h('div', { class: 'form-row' }, inp('spKota'), inp('spJarakHari', { type: 'number', min: 0, max: 30 })),
        h('div', { class: 'form-row' }, inp('spTempat'), inp('spWaktu')),
        inp('spNomorFormat'), h('p', { class: 'hint', text: 'Penanda nomor: {no} nomor urut, {bln} bulan romawi, {bulan} bulan angka, {thn} tahun.' }),
        h('div', { class: 'form-row' },
          fld('Templat bawaan', h('select', { onchange: (e) => set('spTemplate', e.target.value) }, ...TEMPLATES.map((t) => h('option', { value: t.kode, text: t.label, selected: t.kode === f.spTemplate })))),
          fld('Warna aksen bawaan', h('select', { onchange: (e) => set('spWarna', e.target.value) }, ...WARNA.map((w) => h('option', { value: w.kode, text: w.label, selected: w.kode === f.spWarna }))))),
        fld(SP_LABELS.spKertas, h('select', { onchange: (e) => set('spKertas', e.target.value) }, ...PAPER_OPTIONS.map((o) => h('option', { value: o.value, text: o.label, selected: o.value === f.spKertas }))), 'Bawaan F4/Folio seperti file Excel. Tetap bisa diganti per surat di lembar pratinjau.')),
      h('section', { class: 'stack' }, h('h3', { text: 'Kalimat surat bawaan' }), inp('spJudul', { placeholder: 'Kosong = judul bawaan templat' }), inp('spPerihal'), inp('spSalam'),
        area('spPembuka'), area('spPengantar'), area('spAjakan'), area('spPenutup1'), area('spPenutup2'),
        btn('Kembalikan semua ke format Excel', () => {
          for (const k of Object.keys(SP_DEFAULTS)) set(k, k === 'spKota' ? (S.settings.kota || 'Basaan') : SP_DEFAULTS[k]);
          draw(); toast('Isian dikembalikan ke format Excel — tekan Simpan untuk menyimpan.');
        }, { small: true, kind: 'text', ic: 'undo' })),
      h('div', { class: 'sheet-actions' },
        btn('Simpan', async () => {
          if (!changed.size) { close(); return; }
          await saveSettingsMap(Object.fromEntries([...changed].map((k) => [k, f[k]])));
          if (!S.demo && S.serverUrl) syncNow();
          toast('Pengaturan surat tersimpan. Berlaku untuk surat baru.');
          close(); rerender();
        }, { kind: 'primary', ic: 'check' })));
    b.append(body);
    draw();
  }, { title: 'Pengaturan surat panggilan', wide: true });
}

async function shrinkImage(file) {
  const img = await new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('Gambar tidak dapat dibaca.')); i.src = URL.createObjectURL(file); });
  for (const size of [220, 180, 140, 110]) {
    const scale = Math.min(1, size / Math.max(img.width, img.height));
    const c = document.createElement('canvas');
    c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
    const ctx = c.getContext('2d');
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, c.width, c.height);
    ctx.drawImage(img, 0, 0, c.width, c.height);
    for (const [type, q] of [['image/png'], ['image/jpeg', 0.85]]) {
      const url = c.toDataURL(type, q);
      if (url.startsWith(`data:${type}`) && url.length < 45000) return url;
    }
  }
  throw new Error('Gambar terlalu besar. Gunakan logo yang lebih sederhana.');
}
