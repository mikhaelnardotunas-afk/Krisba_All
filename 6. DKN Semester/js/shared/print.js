// Cetak & PDF: membuka jendela cetak dengan ukuran kertas/orientasi pilihan, atau membuat PDF (html2pdf).
import { loadScript, toast, loading, esc } from '../ui.js';

export const PAPERS = {
  A4: { w: 210, h: 297, label: 'A4 (210 × 297 mm)' },
  F4: { w: 215, h: 330, label: 'F4 / Folio (215 × 330 mm)' },
  Letter: { w: 216, h: 279, label: 'Letter (216 × 279 mm)' },
  Legal: { w: 216, h: 356, label: 'Legal (216 × 356 mm)' }
};

function cssHref(name) {
  return new URL('css/' + name, location.href).href;
}

/**
 * html: isi halaman (boleh berisi beberapa .page)
 * opts: { title, paper: 'A4'|'F4'.., orientation: 'portrait'|'landscape', margin: mm, extraCss }
 */
export function printHtml(html, opts = {}) {
  const p = PAPERS[opts.paper] || PAPERS.A4;
  const land = opts.orientation === 'landscape';
  const size = land ? `${p.h}mm ${p.w}mm` : `${p.w}mm ${p.h}mm`;
  const margin = opts.margin ?? 12;
  const w = window.open('', '_blank');
  if (!w) { toast('Pop-up diblokir browser. Izinkan pop-up untuk mencetak.', 'warning'); return; }
  w.document.write(`<!doctype html><html lang="id"><head><meta charset="utf-8"><title>${esc(opts.title || 'Cetak')}</title>
    <link rel="stylesheet" href="${cssHref('print.css')}">
    <style>@page { size: ${size}; margin: ${margin}mm; } ${opts.extraCss || ''}</style></head>
    <body class="print-body ${land ? 'landscape' : ''}">${html}
    <script>window.onload = function () { setTimeout(function () { window.focus(); window.print(); }, 350); };<\/script></body></html>`);
  w.document.close();
}

export async function ensurePdf() {
  if (!window.html2pdf) await loadScript('vendor/html2pdf.bundle.min.js');
  return window.html2pdf;
}

/**
 * Buat PDF dari daftar halaman HTML (tiap item = 1 halaman atau lebih).
 * mode: 'save' | 'open'
 */
export async function makePdf(pages, filename, opts = {}) {
  const html2pdf = await ensurePdf();
  const p = PAPERS[opts.paper] || PAPERS.A4;
  const land = opts.orientation === 'landscape';
  const margin = opts.margin ?? 12;
  const holder = document.createElement('div');
  holder.style.cssText = 'position:fixed;left:-10000px;top:0;';
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = cssHref('print.css');
  document.head.appendChild(link);
  await new Promise(r => { link.onload = r; setTimeout(r, 800); });
  const contentW = (land ? p.h : p.w) - margin * 2;
  const mk = html => {
    const d = document.createElement('div');
    d.className = 'print-body pdf-page';
    d.style.width = contentW + 'mm';
    d.style.background = '#fff';
    d.innerHTML = html;
    return d;
  };
  const opt = {
    margin, filename, image: { type: 'jpeg', quality: 0.95 },
    html2canvas: { scale: 2, useCORS: true, backgroundColor: '#ffffff' },
    jsPDF: { unit: 'mm', format: [p.w, p.h], orientation: land ? 'landscape' : 'portrait' },
    pagebreak: { mode: ['css', 'legacy'], before: '.page-break' }
  };
  document.body.appendChild(holder);
  loading(true, `Membuat PDF (1/${pages.length})...`);
  try {
    let worker = html2pdf().set(opt).from(mk(pages[0])).toPdf();
    pages.slice(1).forEach((html, i) => {
      worker = worker.get('pdf').then(pdf => { pdf.addPage(); loading(true, `Membuat PDF (${i + 2}/${pages.length})...`); }).from(mk(html)).toContainer().toCanvas().toPdf();
    });
    if (opts.mode === 'open') {
      const url = await worker.output('bloburl');
      window.open(url, '_blank');
    } else {
      await worker.save();
      toast('PDF disimpan: ' + filename, 'success');
    }
  } finally {
    loading(false);
    holder.remove();
    link.remove();
  }
}

// Dokumen Word (.doc berbasis HTML; dapat dibuka & diedit di MS Word)
export function wordBlob(bodyHtml, css, paper = 'A4') {
  const p = PAPERS[paper] || PAPERS.A4;
  const html = `<html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:w="urn:schemas-microsoft-com:office:word" xmlns="http://www.w3.org/TR/REC-html40">
    <head><meta charset="utf-8"><title>Dokumen</title><!--[if gte mso 9]><xml><w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom></w:WordDocument></xml><![endif]-->
    <style>@page Section1 { size: ${p.w / 10}cm ${p.h / 10}cm; margin: 1.2cm 1.4cm; } div.Section1 { page: Section1; } ${css}</style></head>
    <body><div class="Section1">${bodyHtml}</div></body></html>`;
  return new Blob(['﻿', html], { type: 'application/msword' });
}

export function kopHtml(settings, { small = false } = {}) {
  const l = settings.logo_kiri || new URL('assets/logo_left.png', location.href).href;
  const r = settings.logo_kanan || new URL('assets/logo_right.png', location.href).href;
  return `<div class="kop ${small ? 'kop-sm' : ''}"><img src="${esc(l)}" alt=""><div class="kop-text">
    ${settings.yayasan ? `<div class="kop-1">${esc(settings.yayasan)}</div>` : ''}${settings.bidang ? `<div class="kop-2">${esc(settings.bidang)}</div>` : ''}
    <div class="kop-3">${esc(settings.nama_sekolah)}</div><div class="kop-4">${esc(settings.alamat || '')}${settings.telepon ? ' · Telp. ' + esc(settings.telepon) : ''}${settings.email ? ' · ' + esc(settings.email) : ''}</div>
    </div><img src="${esc(r)}" alt=""></div><div class="kop-line"></div>`;
}

// Blok tanda tangan kepala sekolah (dan opsional wali kelas)
export function signatureHtml(settings, { place = '', date = '', wali = null, kepsek = true } = {}) {
  const ttd = settings.ttd_kepsek ? `<img src="${esc(settings.ttd_kepsek)}" alt="">` : '';
  return `<table class="sign"><tr>
    ${wali ? `<td>Mengetahui,<br>Wali Kelas<div class="sign-space"></div><b>${esc(wali.name || '')}</b>${wali.nip ? `<br>NIP. ${esc(wali.nip)}` : ''}</td>` : '<td></td>'}
    ${kepsek ? `<td>${esc(place)}${place && date ? ', ' : ''}${esc(date)}<br>Kepala Sekolah<div class="sign-space">${ttd}</div><b>${esc(settings.kepala_sekolah || '')}</b>${settings.nip_kepala_sekolah ? `<br>NIP. ${esc(settings.nip_kepala_sekolah)}` : ''}</td>` : ''}
  </tr></table>`;
}
