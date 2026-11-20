// Data referensi bersama (kelas, mapel, guru, jenis penilaian) dengan cache per semester.
import { get, qs } from './api.js';
import { App } from './app.js';
import { esc } from './ui.js';

const cache = new Map();

export function invalidate(...keys) {
  if (!keys.length) cache.clear();
  else for (const k of [...cache.keys()]) if (keys.some(x => k.startsWith(x))) cache.delete(k);
}

async function cached(key, fn) {
  if (!cache.has(key)) cache.set(key, fn().catch(e => { cache.delete(key); throw e; }));
  return cache.get(key);
}

export const refs = {
  classes: (yearId = App.semester && App.semester.year_id) => cached('classes:' + yearId, () => get('/classes' + qs({ year_id: yearId }))),
  subjects: () => cached('subjects', () => get('/subjects')),
  teachers: () => cached('teachers', () => get('/teachers')),
  ekskul: () => cached('ekskul', () => get('/extracurriculars')),
  types: (semId = App.semester && App.semester.id) => cached('types:' + semId, () => get('/assessment-types' + qs({ semester_id: semId }))),
  assignments: (semId = App.semester && App.semester.id) => cached('assignments:' + semId, () => get('/assignments' + qs({ semester_id: semId }))),
  scales: () => cached('scales', () => get('/grade-scales'))
};

export function opt(list, val, lab, sel, ph) {
  return (ph !== undefined ? `<option value="">${esc(ph)}</option>` : '') + list.map(x => `<option value="${esc(x[val])}"${String(x[val]) === String(sel ?? '') ? ' selected' : ''}>${esc(typeof lab === 'function' ? lab(x) : x[lab])}</option>`).join('');
}

// Ingat pilihan terakhir (kelas/mapel/jenis penilaian) per halaman
export function remember(key, value) {
  try {
    if (value === undefined) return JSON.parse(localStorage.getItem('sipas_pick_' + key) || 'null');
    localStorage.setItem('sipas_pick_' + key, JSON.stringify(value));
  } catch (e) { return null; }
  return value;
}

export const KIND_LABEL = { PTS: 'Tengah Semester', PAS: 'Akhir Semester', PAT: 'Akhir Tahun', PH: 'Harian', SEMESTER: 'Semester', CUSTOM: 'Custom' };
export const SOURCE_LABEL = { manual: 'Input manual guru', assessment: 'Nilai akhir penilaian lain (semester ini)', category: 'Kategori tertentu dari penilaian lain', previous: 'Hasil penilaian semester/tahun sebelumnya' };
