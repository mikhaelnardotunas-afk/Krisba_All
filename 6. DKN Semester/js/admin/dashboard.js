// Dashboard admin: kartu statistik + tabel monitoring kelengkapan nilai.
import { get, qs } from '../api.js';
import { App, pageHead } from '../app.js';
import { icon, esc, fmtNum, DataTable, statusBadge, progressBar, timeAgo, copyText } from '../ui.js';

export async function dashboardPage(el) {
  const d = await get('/dashboard/admin' + qs({ semester_id: App.semester.id }));
  const c = d.counts;
  const stat = (ic, cls, val, label) => `<div class="stat"><div class="stat-icon ${cls}">${icon(ic, 'icon-lg')}</div><div><div class="stat-value">${val}</div><div class="stat-label">${label}</div></div></div>`;
  const sc = d.status_count;
  el.innerHTML = pageHead('Dashboard', `${esc(App.semLabel())} · Selamat datang, ${esc(App.user.full_name)}`,
    `<a class="btn" href="#monitoring">${icon('monitor')}Monitoring</a><a class="btn btn-primary" href="#jenis">${icon('plus')}Jenis Penilaian</a>`) + `
    <div class="stats">
      ${stat('student', '', c.students, 'Jumlah siswa')}
      ${stat('teacher', 'gold', c.teachers, 'Jumlah guru')}
      ${stat('class', 'purple', c.classes, 'Jumlah kelas')}
      ${stat('book', '', c.subjects, 'Mata pelajaran aktif')}
      ${stat('layers', 'gold', c.active_assessments, `Penilaian aktif (${c.open_assessments} dibuka)`)}
      ${stat('users', 'green', `${c.teachers_inputting}/${c.teachers_assigned}`, 'Guru sudah menginput')}
      ${stat('checkCircle', 'green', fmtNum(c.completeness, 1) + '%', 'Kelengkapan nilai')}
      ${stat('alert', 'red', c.incomplete_scores, 'Nilai siswa belum lengkap')}
    </div>
    <div class="grid" style="grid-template-columns:minmax(0,2.2fr) minmax(280px,1fr)">
      <div class="card"><div class="card-head"><h3>${icon('monitor')} Monitoring Input Nilai</h3>
        <div class="btn-group"><button class="btn btn-sm" id="wa">${icon('copy')}Salin pengingat guru</button></div></div>
        <div class="card-body" id="mon"></div></div>
      <div class="flex-col gap-3" style="display:flex">
        <div class="card"><div class="card-head"><h3>${icon('chart')} Status Lembar Nilai</h3></div><div class="card-body">
          <div class="flex gap-3"><div class="ring" style="--p:${c.completeness}"><div><b>${fmtNum(c.completeness, 0)}%</b><span>lengkap</span></div></div>
          <ul class="list-plain grow" style="font-size:13px">
            ${[['belum', 'Belum input'], ['sebagian', 'Sebagian'], ['lengkap', 'Lengkap'], ['submitted', 'Terkirim'], ['returned', 'Dikembalikan'], ['locked', 'Dikunci']].map(([k, l]) => `<li><span class="grow">${statusBadge(k)}</span><b>${sc[k] || 0}</b></li>`).join('')}
          </ul></div></div></div>
        <div class="card"><div class="card-head"><h3>${icon('history')} Aktivitas Terbaru</h3><a href="#aktivitas" class="btn btn-xs btn-ghost">Semua</a></div><div class="card-body" style="padding-top:6px">
          <ul class="list-plain">${d.recent.map(r => `<li style="align-items:flex-start"><div class="avatar" style="width:28px;height:28px;font-size:11px;border-width:1px">${esc((r.username || '?').slice(0, 2).toUpperCase())}</div><div class="grow"><b style="font-size:13px">${esc(r.action)}</b><div class="muted" style="font-size:12px">${esc(r.username || '-')} · ${timeAgo(r.created_at)}</div>${r.detail ? `<div class="soft" style="font-size:11.5px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;max-width:240px">${esc(r.detail)}</div>` : ''}</div></li>`).join('') || '<li class="muted">Belum ada aktivitas</li>'}</ul>
        </div></div>
      </div>
    </div>`;
  if (window.innerWidth < 1100) el.querySelector('.grid').style.gridTemplateColumns = 'minmax(0,1fr)';
  new DataTable(el.querySelector('#mon'), {
    rows: d.monitoring.map(r => ({ ...r, _k: r.assignment_id + '|' + r.type_id })), rowKey: '_k', pageSize: 10, compact: true,
    searchKeys: ['teacher_name', 'subject_name', 'class_name', 'type_name'],
    filters: [
      { key: 'status', label: 'Status', options: [['belum', 'Belum input'], ['sebagian', 'Sebagian'], ['lengkap', 'Lengkap'], ['submitted', 'Terkirim'], ['returned', 'Dikembalikan'], ['locked', 'Dikunci']].map(([value, label]) => ({ value, label })) },
      { key: 'type_name', label: 'Penilaian', options: [...new Set(d.monitoring.map(r => r.type_name))].map(v => ({ value: v, label: v })) }
    ],
    columns: [
      { key: 'teacher_name', label: 'Guru' },
      { key: 'subject_name', label: 'Mata Pelajaran' },
      { key: 'class_name', label: 'Kelas' },
      { key: 'type_name', label: 'Jenis Penilaian' },
      { key: 'percent', label: 'Kelengkapan', render: r => `<div style="min-width:120px">${progressBar(r.percent)}</div>` },
      { key: 'status', label: 'Status', render: r => statusBadge(r.status) },
      { label: '', sortable: false, cls: 'actions', render: r => `<a class="btn btn-xs" href="#nilai?type_id=${r.type_id}&subject_id=${r.subject_id}&class_id=${r.class_id}">${icon('eye', 'icon-sm')}Buka</a>` }
    ],
    emptyText: 'Belum ada pembagian tugas mengajar atau jenis penilaian aktif'
  });
  el.querySelector('#wa').onclick = () => {
    const late = d.monitoring.filter(r => ['belum', 'sebagian', 'returned'].includes(r.status));
    const byT = {};
    late.forEach(r => { (byT[r.teacher_name] = byT[r.teacher_name] || []).push(`${r.subject_name} ${r.class_name} (${r.type_name}: ${fmtNum(r.percent, 0)}%)`); });
    const text = `*Pengingat Input Nilai* — ${App.semLabel()}\n\n` + Object.entries(byT).map(([t, l]) => `• ${t}\n  - ${l.join('\n  - ')}`).join('\n') + '\n\nMohon segera melengkapi dan mengirim nilai melalui SIPAS. Terima kasih.';
    copyText(late.length ? text : 'Semua nilai sudah lengkap.');
  };
}
