/*******************************************************************
 * ABSENSI GURU — Backend Google Apps Script (v5)
 *
 * SATU BARIS = SATU GURU PADA SATU TANGGAL
 *   Jam datang dan jam pulang ditulis di baris yang sama
 *   (kolom JamDatang & JamPulang). Tidak ada lagi baris "Pulang"
 *   yang ditambahkan berderet di bawah. Baris selalu diurutkan
 *   menurut Tanggal lalu GuruID.
 *
 * Kolom yang terlihat (sesuai sheet Anda):
 *   ID, GuruID, NamaGuru, Tanggal, Jenis, Status, JamDatang, JamPulang,
 *   KetDetail, KetBebas, WaktuInput, Deleted, Rev
 * Kolom teknis (ditambahkan otomatis & DISEMBUNYIKAN):
 *   IDPulang, StatusPulang, KetPulang, CatatanPulang, DeletedPulang, RevPulang
 *   -> dipakai aplikasi untuk menyimpan data absen pulang. Jangan diisi manual.
 *
 * Tidak perlu tab baru.
 *
 * CARA PASANG (sekali saja)
 * 1. Spreadsheet > Ekstensi > Apps Script. Hapus isi Code.gs, tempel kode ini, Simpan.
 * 2. Jalankan  rapikanAbsensi()  (izinkan akses bila diminta).
 *    - Membuat salinan cadangan tab "Absensi" (Absensi_Cadangan_tanggal).
 *    - Menggabungkan baris "Pulang" lama ke baris "Datang"-nya.
 *    - Menambah & menyembunyikan kolom teknis, mengurutkan baris.
 *    Aman dijalankan berkali-kali.
 * 3. Jalankan  tesKecepatan()  dan lihat Log eksekusi.
 * 4. Deploy > Kelola deployment > ikon pensil > Versi: Versi baru > Deploy.
 *    (Bukan "Deployment baru", agar URL /exec tetap sama.)
 *    Jalankan sebagai: Saya. Yang memiliki akses: Siapa saja.
 * 5. Password ada di sheet "Pengaturan" sel B1.
 *******************************************************************/

var SHEET_GURU = 'Guru';
var SHEET_ABSENSI = 'Absensi';
var SHEET_SET = 'Pengaturan';

var ALIAS_GURU = {
  id:      ['id','idguru','guruid','kode'],
  nama:    ['nama','namaguru','namalengkap'],
  nip:     ['nip'],
  jk:      ['jk','jeniskelamin','gender','lp'],
  nuptk:   ['nuptk'],
  mapel:   ['mapel','matapelajaran','bidangstudi','pelajaran'],
  deleted: ['deleted','dihapus','hapus'],
  rev:     ['rev','revisi','updatedat','waktuubah']
};
var WAJIB_GURU = [['deleted','Deleted'],['rev','Rev']];

/* [field, judul bila perlu dibuat, alias, tersembunyi?] — urutan = urutan kolom baru */
var KOLOM_ABSENSI = [
  ['id',            'ID',            ['id','iddatang','idabsen','kode']],
  ['guruId',        'GuruID',        ['guruid','idguru','kodeguru']],
  ['namaGuru',      'NamaGuru',      ['namaguru','nama']],
  ['tanggal',       'Tanggal',       ['tanggal','tgl','date']],
  ['jenis',         'Jenis',         ['jenis','jenisabsen','tipe']],
  ['status',        'Status',        ['status','kehadiran','statuskehadiran']],
  ['jamDatang',     'JamDatang',     ['jamdatang','jammasuk']],
  ['jamPulang',     'JamPulang',     ['jampulang','jamkeluar']],
  ['ketDetail',     'KetDetail',     ['ketdetail','keterangan','ket']],
  ['ketBebas',      'KetBebas',      ['ketbebas','catatan','catatantambahan']],
  ['waktuInput',    'WaktuInput',    ['waktuinput','timestamp','waktucatat','dibuat']],
  ['deleted',       'Deleted',       ['deleted','dihapus','hapus']],
  ['rev',           'Rev',           ['rev','revisi','waktuubah']],
  ['idPulang',      'IDPulang',      ['idpulang'], true],
  ['statusPulang',  'StatusPulang',  ['statuspulang'], true],
  ['ketPulang',     'KetPulang',     ['ketpulang'], true],
  ['catatanPulang', 'CatatanPulang', ['catatanpulang'], true],
  ['deletedPulang', 'DeletedPulang', ['deletedpulang'], true],
  ['revPulang',     'RevPulang',     ['revpulang'], true]
];
var ALIAS_JAM_LAMA = ['jam','jamabsen','pukul'];   // kolom "Jam" versi lama (jika masih ada)

/* ================= BANTUAN UMUM ================= */
var _SS = null;
function ss(){ return _SS || (_SS = SpreadsheetApp.getActiveSpreadsheet()); }
function tz(){ return ss().getSpreadsheetTimeZone() || Session.getScriptTimeZone(); }
function normal(s){ return String(s===null||s===undefined?'':s).toLowerCase().replace(/[^a-z0-9]/g,''); }
function kosong(v){ return v===''||v===null||v===undefined; }
function teks(v){ return kosong(v) ? '' : String(v).trim(); }
function bool(v){ return v===true || normal(v)==='true' || normal(v)==='ya' || normal(v)==='1'; }
function ambilSheet(nama){ return ss().getSheetByName(nama) || ss().insertSheet(nama); }
function passwordSekolah(){ var sh = ss().getSheetByName(SHEET_SET); return sh ? String(sh.getRange('B1').getValue()).trim() : ''; }
function balas(obj){ return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON); }

function tglString(v){
  if(v instanceof Date) return Utilities.formatDate(v, tz(), 'yyyy-MM-dd');
  var s = teks(v), m;
  if(/^\d{4}-\d{2}-\d{2}/.test(s)) return s.slice(0,10);
  m = s.match(/^(\d{1,2})[\/\-.](\d{1,2})[\/\-.](\d{4})/);          // 15/09/2026 (hari/bulan/tahun)
  if(m) return m[3]+'-'+('0'+m[2]).slice(-2)+'-'+('0'+m[1]).slice(-2);
  return s.slice(0,10);
}
function jamString(tampil, v){
  var m = teks(tampil).match(/(\d{1,2})[:.](\d{2})/);
  if(m) return ('0'+m[1]).slice(-2)+':'+m[2];
  if(v instanceof Date) return Utilities.formatDate(v, tz(), 'HH:mm');
  m = teks(v).match(/(\d{1,2})[:.](\d{2})/);
  return m ? ('0'+m[1]).slice(-2)+':'+m[2] : '';
}
function keWaktu(v){
  if(v instanceof Date) return v.getTime();
  var n = Number(v); if(!isNaN(n) && n>0) return n;
  var d = new Date(v); return isNaN(d.getTime()) ? 0 : d.getTime();
}
function petaDariJudul(judul, daftarAlias){
  var peta = {}, dipakai = {};
  for(var f in daftarAlias){
    for(var i=0;i<judul.length;i++){
      if(dipakai[i]) continue;
      var n = normal(judul[i]);
      if(n && daftarAlias[f].indexOf(n)!==-1){ peta[f] = i+1; dipakai[i] = true; break; }
    }
  }
  return peta;
}

/* ================= GURU ================= */
function muatGuru(){
  var sh = ambilSheet(SHEET_GURU);
  var lebar = Math.max(sh.getLastColumn(),1);
  var peta = petaDariJudul(sh.getRange(1,1,1,lebar).getValues()[0], ALIAS_GURU);
  var kurang = WAJIB_GURU.filter(function(w){ return !peta[w[0]]; }).map(function(w){ return w[1]; });
  if(kurang.length){
    sh.getRange(1, sh.getLastColumn()+1, 1, kurang.length).setValues([kurang]).setFontWeight('bold');
    lebar = sh.getLastColumn();
    peta = petaDariJudul(sh.getRange(1,1,1,lebar).getValues()[0], ALIAS_GURU);
  }
  var n = sh.getLastRow();
  return {sh:sh, peta:peta, lebar:lebar, nilai: n>=2 ? sh.getRange(2,1,n-1,lebar).getValues() : []};
}
function daftarGuru(t){
  var out = [], p = t.peta;
  if(!p.id) return out;
  t.nilai.forEach(function(r){
    if(kosong(r[p.id-1])) return;
    var g = function(f){ return p[f] ? r[p[f]-1] : ''; };
    out.push({id:teks(g('id')), nama:teks(g('nama')), nip:teks(g('nip')),
      jk: teks(g('jk')).charAt(0).toUpperCase()==='P' ? 'P' : 'L',
      nuptk:teks(g('nuptk')), mapel:teks(g('mapel')), deleted:bool(g('deleted')), rev:keWaktu(g('rev'))});
  });
  return out;
}
function simpanGuru(t, daftar){
  if(!daftar || !daftar.length || !t.peta.id) return;
  var p = t.peta, idx = {}, kotor = {}, tambah = [];
  t.nilai.forEach(function(r,i){ if(!kosong(r[p.id-1])) idx[teks(r[p.id-1])] = i; });
  daftar.forEach(function(d){
    if(!d || kosong(d.id)) return;
    var id = teks(d.id), rev = Number(d.rev) || Date.now(), baris, i = idx[id];
    if(i!==undefined){
      if(p.rev && rev < keWaktu(t.nilai[i][p.rev-1])) return;
      baris = t.nilai[i]; kotor[i] = true;
    } else { baris = []; for(var k=0;k<t.lebar;k++) baris.push(''); tambah.push(baris); }
    var isi = {id: /^\d+$/.test(id) ? Number(id) : id, nama:d.nama, nip:d.nip, jk:d.jk, nuptk:d.nuptk, mapel:d.mapel, deleted:!!d.deleted, rev:rev};
    for(var f in p){ if(isi[f]!==undefined) baris[p[f]-1] = isi[f]; }
  });
  Object.keys(kotor).forEach(function(i){ i = Number(i); t.sh.getRange(i+2,1,1,t.lebar).setValues([t.nilai[i]]); });
  if(tambah.length){ t.sh.getRange(t.nilai.length+2,1,tambah.length,t.lebar).setValues(tambah); t.nilai = t.nilai.concat(tambah); }
}

/* ================= ABSENSI: satu baris per guru per tanggal ================= */
function aliasAbsensi(){ var a = {}; KOLOM_ABSENSI.forEach(function(k){ a[k[0]] = k[2]; }); a.jamLama = ALIAS_JAM_LAMA; return a; }

/* Membaca sheet satu kali. Kolom yang belum ada ditambahkan di kanan. */
function muatAbsensi(){
  var sh = ambilSheet(SHEET_ABSENSI);
  if(sh.getLastColumn()===0) sh.getRange(1,1,1,13).setValues([KOLOM_ABSENSI.slice(0,13).map(function(k){return k[1];})]).setFontWeight('bold');
  var lebar = sh.getLastColumn();
  var peta = petaDariJudul(sh.getRange(1,1,1,lebar).getValues()[0], aliasAbsensi());
  var kurang = KOLOM_ABSENSI.filter(function(k){ return !peta[k[0]]; }).map(function(k){ return k[1]; });
  if(kurang.length){
    sh.getRange(1, lebar+1, 1, kurang.length).setValues([kurang]).setFontWeight('bold');
    lebar = sh.getLastColumn();
    peta = petaDariJudul(sh.getRange(1,1,1,lebar).getValues()[0], aliasAbsensi());
  }
  var n = sh.getLastRow();
  var nilai = n>=2 ? sh.getRange(2,1,n-1,lebar).getValues() : [];
  var tampil = n>=2 ? sh.getRange(2,1,n-1,lebar).getDisplayValues() : [];
  return {sh:sh, peta:peta, lebar:lebar, jumlahBarisAwal:nilai.length, baris: uraiAbsensi(peta, nilai, tampil)};
}

/* Mengubah isi sheet menjadi objek per guru+tanggal: {D: slot datang, P: slot pulang}.
   Baris "Pulang" lama yang terpisah otomatis digabung. */
function uraiAbsensi(peta, nilai, tampil){
  var peta2 = {}, urut = [];
  for(var i=0;i<nilai.length;i++){
    var r = nilai[i], tp = tampil[i] || [];
    var g = function(f){ return peta[f] ? r[peta[f]-1] : ''; };
    var gt = function(f){ return peta[f] ? tp[peta[f]-1] : ''; };
    var id = teks(g('id')), idP = teks(g('idPulang'));
    if(!id && !idP) continue;
    var guru = teks(g('guruId')), tgl = tglString(g('tanggal'));
    if(!guru || !tgl) continue;
    var kunci = guru+'|'+tgl;
    var o = peta2[kunci];
    if(!o){
      o = peta2[kunci] = {kunci:kunci, guruAsli:g('guruId'), tglAsli:g('tanggal'), namaGuru:g('namaGuru'),
        waktuInput:g('waktuInput'), dasar:r.slice(), D:null, P:null};
      urut.push(o);
    }
    if(kosong(o.waktuInput)) o.waktuInput = g('waktuInput');
    var jamLama = jamString(gt('jamLama'), g('jamLama'));
    var revBaris = keWaktu(g('rev')) || keWaktu(g('waktuInput'));
    var pulangLama = id && !idP && normal(g('jenis'))==='pulang';   // baris "Pulang" gaya lama
    if(id && !pulangLama){
      gabungSlot(o, 'D', {id:id, status:teks(g('status'))||'Hadir',
        jam: jamString(gt('jamDatang'), g('jamDatang')) || jamLama,
        ketDetail:teks(g('ketDetail')), ketBebas:teks(g('ketBebas')), deleted:bool(g('deleted')), rev:revBaris});
    }
    if(pulangLama){
      gabungSlot(o, 'P', {id:id, status:teks(g('status'))||'Hadir',
        jam: jamString(gt('jamPulang'), g('jamPulang')) || jamLama,
        ketDetail:teks(g('ketDetail')), ketBebas:teks(g('ketBebas')), deleted:bool(g('deleted')), rev:revBaris});
    } else if(idP){
      gabungSlot(o, 'P', {id:idP, status:teks(g('statusPulang'))||teks(g('status'))||'Hadir',
        jam: jamString(gt('jamPulang'), g('jamPulang')),
        ketDetail:teks(g('ketPulang')), ketBebas:teks(g('catatanPulang')), deleted:bool(g('deletedPulang')),
        rev: keWaktu(g('revPulang')) || revBaris});
    }
  }
  return urut;
}
/* Bila satu guru+tanggal punya dua catatan berbeda, yang aktif & terbaru dipakai */
function gabungSlot(o, s, baru){
  var lama = o[s];
  if(!lama || lama.id===baru.id){ if(!lama || baru.rev >= lama.rev) o[s] = baru; return; }
  if(lama.deleted && !baru.deleted){ o[s] = baru; return; }
  if(!lama.deleted && baru.deleted) return;
  if(baru.rev > lama.rev) o[s] = baru;
}

/* Menerapkan kiriman dari aplikasi. Mengembalikan jumlah yang diterima. */
function terapkanAbsensi(t, daftar, namaGuru){
  if(!daftar || !daftar.length) return 0;
  var perKunci = {}, perId = {}, n = 0;
  t.baris.forEach(function(o){
    perKunci[o.kunci] = o;
    if(o.D) perId[o.D.id] = {o:o, s:'D'};
    if(o.P) perId[o.P.id] = {o:o, s:'P'};
  });
  daftar.forEach(function(d){
    if(!d || kosong(d.id) || kosong(d.guruId) || !d.tanggal) return;
    var id = teks(d.id), s = d.jenis==='Pulang' ? 'P' : 'D';
    var kunci = teks(d.guruId)+'|'+tglString(d.tanggal), rev = Number(d.rev) || Date.now();
    var ada = perId[id];
    if(ada){
      var cur = ada.o[ada.s];
      if(cur && rev < cur.rev) return;                         // di sheet lebih baru
      if(ada.o.kunci!==kunci || ada.s!==s){ ada.o[ada.s] = null; delete perId[id]; }  // guru/tanggal/jenis diubah
    }
    var o = perKunci[kunci];
    if(!o){
      var gid = teks(d.guruId);
      o = perKunci[kunci] = {kunci:kunci, guruAsli: /^\d+$/.test(gid) ? Number(gid) : gid, tglAsli: tglString(d.tanggal),
        namaGuru:'', waktuInput:new Date(), dasar:[], D:null, P:null, baru:true};
      t.baris.push(o);
    }
    var slot = o[s];
    if(slot && slot.id!==id && !slot.deleted && slot.rev > rev && !d.deleted) return;   // catatan lain yang lebih baru
    o[s] = {id:id, status:teks(d.status)||'Hadir', jam: jamString('', d.jam),
      ketDetail:teks(d.ketDetail), ketBebas:teks(d.ketBebas), deleted:!!d.deleted, rev:rev};
    perId[id] = {o:o, s:s};
    if(namaGuru && namaGuru[teks(d.guruId)]) o.namaGuru = namaGuru[teks(d.guruId)];
    if(kosong(o.waktuInput)) o.waktuInput = new Date();
    n++;
  });
  return n;
}

function labelJenis(o){
  var d = o.D && !o.D.deleted, p = o.P && !o.P.deleted;
  return d && p ? 'Datang & Pulang' : d ? 'Datang' : p ? 'Pulang' : 'Dihapus';
}
function urutkanBaris(list){
  list.sort(function(a,b){
    var ta = tglString(a.tglAsli), tb = tglString(b.tglAsli);
    if(ta!==tb) return ta < tb ? -1 : 1;
    var ga = teks(a.guruAsli), gb = teks(b.guruAsli), na = Number(ga), nb = Number(gb);
    if(!isNaN(na) && !isNaN(nb) && na!==nb) return na-nb;
    return ga < gb ? -1 : ga > gb ? 1 : 0;
  });
}
/* Menyusun kembali semua baris lalu menulisnya SEKALI */
function tulisAbsensi(t){
  urutkanBaris(t.baris);
  var p = t.peta, lebar = t.lebar;
  var hasil = t.baris.filter(function(o){ return o.D || o.P; }).map(function(o){
    var r = []; for(var k=0;k<lebar;k++) r.push(o.dasar[k]!==undefined ? o.dasar[k] : '');
    var set = function(f, v){ if(p[f]) r[p[f]-1] = v; };
    var D = o.D, P = o.P, utama = D || P;
    set('id', D ? D.id : '');
    set('guruId', o.guruAsli);
    set('namaGuru', o.namaGuru);
    set('tanggal', o.tglAsli instanceof Date ? o.tglAsli : tglString(o.tglAsli));
    set('jenis', labelJenis(o));
    set('status', utama.status);
    set('jamDatang', D && !D.deleted ? D.jam : '');
    set('jamPulang', P && !P.deleted ? P.jam : '');
    set('ketDetail', D ? D.ketDetail : '');
    set('ketBebas', D ? D.ketBebas : '');
    set('waktuInput', o.waktuInput);
    set('deleted', D ? D.deleted : (P ? P.deleted : false));
    set('rev', D ? D.rev : '');
    set('idPulang', P ? P.id : '');
    set('statusPulang', P ? P.status : '');
    set('ketPulang', P ? P.ketDetail : '');
    set('catatanPulang', P ? P.ketBebas : '');
    set('deletedPulang', P ? P.deleted : '');
    set('revPulang', P ? P.rev : '');
    if(p.jamLama) r[p.jamLama-1] = '';            // kolom "Jam" lama dikosongkan, isinya sudah dipindah
    return r;
  });
  if(hasil.length) t.sh.getRange(2,1,hasil.length,lebar).setValues(hasil);
  var sisa = t.jumlahBarisAwal - hasil.length;
  if(sisa > 0) t.sh.getRange(hasil.length+2, 1, sisa, lebar).clearContent();
  t.jumlahBarisAwal = hasil.length;
}

function keRekaman(t){
  var out = [];
  t.baris.forEach(function(o){
    var guru = teks(o.guruAsli), tgl = tglString(o.tglAsli);
    [['D','Datang'],['P','Pulang']].forEach(function(x){
      var s = o[x[0]]; if(!s) return;
      out.push({id:s.id, guruId:guru, tanggal:tgl, jam:s.jam, jenis:x[1], status:s.status,
        ketDetail:s.ketDetail, ketBebas:s.ketBebas, deleted:s.deleted, rev:s.rev});
    });
  });
  return out;
}

/* ================= TITIK MASUK ================= */
function doPost(e){
  var p;
  try{ p = JSON.parse(e.postData.contents); }catch(err){ return balas({ok:false, message:'Permintaan tidak valid.'}); }
  if(String(p.password||'').trim() !== passwordSekolah()) return balas({ok:false, message:'Password salah. Cek sheet Pengaturan sel B1.'});

  if((p.action||'sync')==='pull'){                                   // hanya membaca, tanpa antre
    try{ return balas({ok:true, guru:daftarGuru(muatGuru()), absensi:keRekaman(muatAbsensi()), server:new Date().toISOString()}); }
    catch(err){ return balas({ok:false, message:'Kesalahan server: '+err}); }
  }

  var kunci = LockService.getScriptLock();
  if(!kunci.tryLock(20000)) return balas({ok:false, message:'Spreadsheet sedang dipakai perangkat lain. Coba lagi sebentar lagi.'});
  try{
    var tg = muatGuru();
    simpanGuru(tg, p.guru);
    var guru = daftarGuru(tg), nama = {};
    guru.forEach(function(g){ nama[g.id] = g.nama; });
    var ta = muatAbsensi();
    if(terapkanAbsensi(ta, p.absensi, nama) > 0 || adaBarisLama(ta)) tulisAbsensi(ta);
    SpreadsheetApp.flush();
    return balas({ok:true, guru:guru, absensi:keRekaman(ta), server:new Date().toISOString()});
  }catch(err){
    return balas({ok:false, message:'Kesalahan server: '+err});
  }finally{ kunci.releaseLock(); }
}
/* true bila sheet masih berisi baris gaya lama (belum digabung) */
function adaBarisLama(t){ return t.baris.length !== t.jumlahBarisAwal; }

function doGet(e){
  var pass = (e && e.parameter && e.parameter.pass) || '';
  if(!pass) return balas({ok:true, pesan:'Web App Absensi Guru aktif.', waktu:new Date().toISOString()});
  if(String(pass).trim() !== passwordSekolah()) return balas({ok:false, message:'Password salah.'});
  return balas({ok:true, guru:daftarGuru(muatGuru()), absensi:keRekaman(muatAbsensi()), server:new Date().toISOString()});
}

/* ================= JALANKAN MANUAL ================= */
/* Menggabungkan baris Pulang lama, merapikan & mengurutkan tab Absensi. Membuat cadangan dulu. */
function rapikanAbsensi(){
  var kunci = LockService.getScriptLock(); kunci.waitLock(30000);
  try{
    var sh = ambilSheet(SHEET_ABSENSI);
    var nama = SHEET_ABSENSI+'_Cadangan_'+Utilities.formatDate(new Date(), tz(), 'yyyyMMdd_HHmm');
    sh.copyTo(ss()).setName(nama);
    var tg = muatGuru(), namaG = {};
    daftarGuru(tg).forEach(function(g){ namaG[g.id] = g.nama; });
    var t = muatAbsensi(), sebelum = t.jumlahBarisAwal;
    t.baris.forEach(function(o){ if(!teks(o.namaGuru) && namaG[teks(o.guruAsli)]) o.namaGuru = namaG[teks(o.guruAsli)]; });
    tulisAbsensi(t);
    siapkanTampilan(t);
    Logger.log('Cadangan dibuat: '+nama);
    Logger.log('Baris sebelum: '+sebelum+', sesudah: '+t.jumlahBarisAwal+' (baris Pulang terpisah digabung).');
  } finally { kunci.releaseLock(); }
}
function siapkanTampilan(t){
  var sh = t.sh, p = t.peta, maks = sh.getMaxRows();
  if(p.tanggal) sh.getRange(2, p.tanggal, maks-1, 1).setNumberFormat('yyyy-mm-dd');
  if(p.jamDatang) sh.getRange(2, p.jamDatang, maks-1, 1).setNumberFormat('HH:mm');
  if(p.jamPulang) sh.getRange(2, p.jamPulang, maks-1, 1).setNumberFormat('HH:mm');
  if(p.waktuInput) sh.getRange(2, p.waktuInput, maks-1, 1).setNumberFormat('yyyy-mm-dd HH:mm:ss');
  KOLOM_ABSENSI.forEach(function(k){ if(k[3] && p[k[0]]) sh.hideColumns(p[k[0]]); });
  sh.setFrozenRows(1);
}
function siapkanSheet(){
  muatGuru();
  siapkanTampilan(muatAbsensi());
  if(!ss().getSheetByName(SHEET_SET)){
    var s = ss().insertSheet(SHEET_SET); s.getRange('A1').setValue('Password'); s.getRange('B1').setValue('12345');
  }
  Logger.log('Selesai.');
}
function tesKecepatan(){
  var t0 = Date.now();
  var g = daftarGuru(muatGuru()), a = keRekaman(muatAbsensi());
  Logger.log('Baca '+g.length+' guru + '+a.length+' catatan absensi: '+(Date.now()-t0)+' ms, ukuran '+Math.round(JSON.stringify({g:g,a:a}).length/1024)+' KB');
  var ada = a.filter(function(x){ return x.jam; }).length;
  Logger.log(ada+' catatan sudah punya jam.');
}