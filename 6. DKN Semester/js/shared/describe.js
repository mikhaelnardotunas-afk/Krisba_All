// Predikat, kalimat deskripsi capaian, kokurikuler & ekskul.
// Modul murni (tanpa DOM) - dipakai frontend dan backend (halaman cek nilai).
// Pola kalimat sama dengan aplikasi E-Raport lama ({NAMA} {KATA} {DIKUASAI} {DITINGKATKAN} ...).

export function trimDot(s) {
  return String(s || '').trim().replace(/[.\s]+$/, '');
}

export function listKoma(v) {
  return String(v === null || v === undefined ? '' : v).split(/\r?\n|,|;/).map(s => s.trim()).filter(Boolean);
}

export function listBaris(v) {
  return String(v === null || v === undefined ? '' : v).split(/\r?\n/).map(s => s.trim()).filter(Boolean);
}

// scales: [{predicate, min_score, max_score, label, description, subject_id}]
export function scalesFor(allScales, subjectId) {
  const own = allScales.filter(g => g.subject_id && g.subject_id === subjectId);
  return (own.length ? own : allScales.filter(g => !g.subject_id)).slice().sort((a, b) => b.min_score - a.min_score);
}

export function predicateOf(score, scales) {
  if (score === null || score === undefined || score === '' || isNaN(score)) return null;
  const v = Number(score);
  const sorted = scales.slice().sort((a, b) => b.min_score - a.min_score);
  return sorted.find(g => v >= g.min_score) || sorted[sorted.length - 1] || null;
}

// Buang kalimat pola yang penandanya kosong
function dropSentences(tpl, missing) {
  if (!missing.length) return tpl;
  return (tpl.match(/[^.]+(\.|$)/g) || [tpl]).filter(s => !missing.some(m => s.indexOf(m) >= 0)).join('');
}

function fill(tpl, map) {
  let out = tpl;
  for (const [k, v] of Object.entries(map)) out = out.split('{' + k + '}').join(v === null || v === undefined ? '' : v);
  return out.replace(/\s+/g, ' ').trim();
}

export function buildFromTemplate(tpl, { nama = '', mapel = '', score, mastered, improve, scales }) {
  if (!mastered && !improve) return '';
  const g = predicateOf(score, scales) || { predicate: 'B', label: 'Baik' };
  if (!improve) tpl = tpl.replace(/[.\s]*dan Perlu Ditingkatkan \{DITINGKATKAN\}\.?/i, '.');
  if (!mastered) tpl = tpl.replace(/\{KATA\} dalam \{DIKUASAI\}[.\s]*dan /i, '');
  tpl = dropSentences(tpl, [!mastered && '{DIKUASAI}', !improve && '{DITINGKATKAN}'].filter(Boolean));
  const kata = g.label || '';
  return fill(tpl, {
    NAMA: nama, MAPEL: mapel, KATA: kata, KATA_KECIL: kata.toLowerCase(), PREDIKAT: g.predicate,
    DIKUASAI: trimDot(mastered), DITINGKATKAN: trimDot(improve)
  });
}

export function autoDescription({ nama = '', mapel = '', score, scales }) {
  const g = predicateOf(score, scales);
  if (!g || !g.description) return '';
  const kata = g.label || '';
  return fill(g.description, { NAMA: nama, MAPEL: mapel, KATA: kata, KATA_KECIL: kata.toLowerCase(), PREDIKAT: g.predicate });
}

/**
 * Deskripsi capaian 1 mapel.
 * mode: template (manual > bank/template > otomatis) | otomatis (manual > otomatis) | manual
 * style: 'semester' (pakai nama siswa) | 'kementerian' (tanpa nama)
 */
export function describe({ settings, nama, mapel, score, comment, scales, style = 'semester' }) {
  comment = comment || {};
  const mode = settings.mode_deskripsi || 'template';
  if (comment.custom_text) return comment.custom_text;
  if (mode === 'manual') return '';
  const n = style === 'kementerian' ? '' : nama;
  if (mode === 'template' && (comment.mastered || comment.improve)) {
    const tpl = style === 'kementerian'
      ? (settings.format_deskripsi_kementerian || 'Menunjukkan penguasaan yang {KATA_KECIL} dalam {DIKUASAI}. Perlu penguatan dalam {DITINGKATKAN}.')
      : (settings.format_deskripsi || '{NAMA} {KATA} dalam {DIKUASAI}. dan Perlu Ditingkatkan {DITINGKATKAN}.');
    return buildFromTemplate(tpl, { nama: n, mapel, score, mastered: comment.mastered, improve: comment.improve, scales });
  }
  if (score === null || score === undefined) return '';
  return autoDescription({ nama: n || 'Ananda', mapel, score, scales });
}

// Deskripsi kokurikuler: teks tulis sendiri atau disusun dari dimensi kuat & perlu penguatan
export function buildKokurikuler(nama, card, settings) {
  card = card || {};
  const isi = t => fill(String(t || ''), {
    NAMA: nama || '', NILAI: card.cocurricular_grade || '', NILAI_KECIL: String(card.cocurricular_grade || 'baik').toLowerCase(),
    KEGIATAN: settings.kokurikuler_kegiatan || '', KUAT: trimDot(card.cocurricular_strong), LEMAH: trimDot(card.cocurricular_weak)
  });
  if (card.cocurricular_desc) return isi(card.cocurricular_desc);
  if (!card.cocurricular_strong && !card.cocurricular_weak) return '';
  const tpl = settings.format_kokurikuler || 'Ananda {NAMA} sudah {NILAI_KECIL} dalam {KUAT}. Ananda masih perlu berlatih dalam {LEMAH}.';
  return isi(dropSentences(tpl, [!card.cocurricular_strong && '{KUAT}', !card.cocurricular_weak && '{LEMAH}'].filter(Boolean)));
}

export function ekskulDescription(e, settings) {
  if (e.description) return e.description;
  const nilai = e.grade || 'Baik';
  return String(settings.ekskul_deskripsi_default || '').split('{EKSKUL}').join(e.name || '').split('{NILAI}').join(nilai);
}

export function faseOf(grade) {
  const t = parseInt(grade, 10);
  if (!t) return '';
  if (t <= 2) return 'A';
  if (t <= 4) return 'B';
  if (t <= 6) return 'C';
  if (t <= 9) return 'D';
  return t === 10 ? 'E' : 'F';
}

export function romawi(n) {
  return { 1: 'I', 2: 'II', 3: 'III', 4: 'IV', 5: 'V', 6: 'VI', 7: 'VII', 8: 'VIII', 9: 'IX', 10: 'X', 11: 'XI', 12: 'XII' }[parseInt(n, 10)] || String(n || '');
}

export function semesterAngka(term, name) {
  return Number(term) === 2 ? '2 (Genap)' : Number(term) === 1 ? '1 (Ganjil)' : String(name || '');
}

// Peringkat dengan nilai sama -> peringkat sama
export function rankRows(rows, basis = 'jumlah') {
  const key = basis === 'rata' ? 'average' : 'total';
  const sorted = rows.filter(r => r.count > 0).sort((a, b) => (b[key] - a[key]) || (b.total - a.total) || (b.average - a.average));
  let rank = 0;
  sorted.forEach((r, i) => {
    const p = sorted[i - 1];
    if (!(p && p[key] === r[key] && p.total === r.total && p.average === r.average)) rank = i + 1;
    r.rank = rank;
  });
  rows.filter(r => !r.count).forEach(r => { r.rank = null; });
  return rows;
}

export function round(v, d = 2) {
  if (v === null || v === undefined || !Number.isFinite(v)) return null;
  const f = Math.pow(10, d);
  return Math.round(Number((v * f).toPrecision(12))) / f;
}
