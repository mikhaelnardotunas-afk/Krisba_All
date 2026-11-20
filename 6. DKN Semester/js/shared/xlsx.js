// Excel/CSV: ekspor berwarna, template, dan pembacaan file (xlsx-js-style / SheetJS 0.18.5, dimuat saat dibutuhkan).
import { loadScript, toast } from '../ui.js';

export async function ensureXlsx() {
  if (!window.XLSX || !window.XLSX.utils) await loadScript('vendor/xlsx-style.bundle.js');
  return window.XLSX;
}

const NAVY = '102A4C', GOLD = 'C9A227';
const border = { top: { style: 'thin', color: { rgb: 'B0B8C4' } }, bottom: { style: 'thin', color: { rgb: 'B0B8C4' } }, left: { style: 'thin', color: { rgb: 'B0B8C4' } }, right: { style: 'thin', color: { rgb: 'B0B8C4' } } };

/**
 * sheets: [{ name, title?, subtitle?, headers: [..], rows: [[..]], widths?: [..], textCols?: [idx], highlight?: (r, c, v) => 'FFE0E0' }]
 */
export async function exportWorkbook(filename, sheets) {
  const XLSX = await ensureXlsx();
  const wb = XLSX.utils.book_new();
  for (const sh of sheets) {
    const aoa = [];
    const top = [];
    if (sh.title) { aoa.push([sh.title]); top.push('title'); }
    if (sh.subtitle) { aoa.push([sh.subtitle]); top.push('sub'); }
    if (top.length) { aoa.push([]); top.push('blank'); }
    const headerRow = aoa.length;
    aoa.push(sh.headers);
    sh.rows.forEach(r => aoa.push(r.map(v => (v === null || v === undefined ? '' : v))));
    const ws = XLSX.utils.aoa_to_sheet(aoa);
    const ncol = sh.headers.length;
    ws['!cols'] = (sh.widths || sh.headers.map(h => Math.max(8, Math.min(40, String(h).length + 4)))).map(w => ({ wch: w }));
    if (sh.title) {
      ws['!merges'] = [{ s: { r: 0, c: 0 }, e: { r: 0, c: Math.max(0, ncol - 1) } }];
      if (sh.subtitle) ws['!merges'].push({ s: { r: 1, c: 0 }, e: { r: 1, c: Math.max(0, ncol - 1) } });
      ws[XLSX.utils.encode_cell({ r: 0, c: 0 })].s = { font: { bold: true, sz: 14, color: { rgb: NAVY } } };
      if (sh.subtitle) ws[XLSX.utils.encode_cell({ r: 1, c: 0 })].s = { font: { sz: 11, color: { rgb: '475569' } } };
    }
    for (let c = 0; c < ncol; c++) {
      const cell = ws[XLSX.utils.encode_cell({ r: headerRow, c })];
      if (cell) cell.s = { font: { bold: true, color: { rgb: 'FFFFFF' } }, fill: { fgColor: { rgb: NAVY } }, alignment: { horizontal: 'center', vertical: 'center', wrapText: true }, border: { ...border, bottom: { style: 'medium', color: { rgb: GOLD } } } };
    }
    sh.rows.forEach((row, ri) => {
      row.forEach((v, c) => {
        const ref = XLSX.utils.encode_cell({ r: headerRow + 1 + ri, c });
        const cell = ws[ref];
        if (!cell) return;
        if ((sh.textCols || []).includes(c)) { cell.t = 's'; cell.v = String(v ?? ''); }
        const fill = sh.highlight ? sh.highlight(ri, c, v) : null;
        cell.s = {
          border, alignment: { vertical: 'center', horizontal: typeof v === 'number' ? 'center' : 'left', wrapText: !!sh.wrap },
          ...(fill ? { fill: { fgColor: { rgb: fill } } } : ri % 2 ? { fill: { fgColor: { rgb: 'F4F7FB' } } } : {}),
          ...(sh.boldRows && sh.boldRows.includes(ri) ? { font: { bold: true } } : {})
        };
      });
    });
    ws['!freeze'] = { xSplit: 0, ySplit: headerRow + 1 };
    XLSX.utils.book_append_sheet(wb, ws, String(sh.name || 'Sheet').replace(/[\\/?*[\]:]/g, '').slice(0, 31));
  }
  XLSX.writeFile(wb, filename);
}

// Baca file Excel / CSV -> {sheets: {nama: [[...]]}}
export async function readSpreadsheet(file) {
  const XLSX = await ensureXlsx();
  const name = file.name.toLowerCase();
  let wb;
  if (name.endsWith('.csv') || name.endsWith('.txt')) {
    const text = await file.text();
    const first = text.split(/\r?\n/)[0] || '';
    const counts = { ';': (first.match(/;/g) || []).length, ',': (first.match(/,/g) || []).length, '\t': (first.match(/\t/g) || []).length };
    const FS = Object.entries(counts).sort((a, b) => b[1] - a[1])[0][0];
    wb = XLSX.read(text.replace(/^﻿/, ''), { type: 'string', FS, raw: true });
  } else {
    wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
  }
  const sheets = {};
  wb.SheetNames.forEach(n => { sheets[n] = XLSX.utils.sheet_to_json(wb.Sheets[n], { header: 1, defval: '', raw: false }); });
  return { names: wb.SheetNames, sheets };
}

export const normHeader = s => String(s || '').toLowerCase().replace(/[^a-z0-9]/g, '');

/**
 * Ubah baris (array of arrays) menjadi objek berdasarkan peta kolom.
 * map: { field: ['nama header 1', 'alias', ...] }
 * Baris judul dicari otomatis (baris pertama yang memuat minimal 1 header yang dikenal).
 */
export function rowsToObjects(aoa, map) {
  const want = Object.entries(map).map(([k, alias]) => [k, alias.map(normHeader)]);
  let hi = -1, idx = {};
  for (let i = 0; i < Math.min(aoa.length, 15); i++) {
    const hdr = (aoa[i] || []).map(normHeader);
    const found = {};
    want.forEach(([k, al]) => { const j = hdr.findIndex(x => al.includes(x)); if (j >= 0) found[k] = j; });
    if (Object.keys(found).length >= Math.min(2, want.length)) { hi = i; idx = found; break; }
  }
  if (hi < 0) throw new Error('Baris judul kolom tidak ditemukan. Gunakan template yang disediakan.');
  const out = [];
  for (let i = hi + 1; i < aoa.length; i++) {
    const r = aoa[i] || [];
    if (r.every(v => String(v).trim() === '')) continue;
    const o = { _row: i + 1 };
    Object.entries(idx).forEach(([k, j]) => { o[k] = String(r[j] ?? '').trim(); });
    out.push(o);
  }
  return { rows: out, missing: want.filter(([k]) => !(k in idx)).map(([k]) => k) };
}

export async function downloadTemplate(filename, headers, sample = [], notes = []) {
  const sheets = [{ name: 'Data', headers, rows: sample, textCols: headers.map((h, i) => (/nisn|nis\b|nip|nuptk|hp|telepon|username|kode/i.test(h) ? i : -1)).filter(i => i >= 0) }];
  if (notes.length) sheets.push({ name: 'Petunjuk', headers: ['Petunjuk Pengisian'], rows: notes.map(n => [n]), widths: [100] });
  await exportWorkbook(filename, sheets);
  toast('Template diunduh', 'success');
}
