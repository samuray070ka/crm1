import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
// import { useAuth } from '../AuthContext';
import API from '../api';
import { MONTHS, DAYS, SUBJECTS, STAGES, ROOMS, SUBJECT_ICONS, formatCurrency, formatDate, getInitials,  getRankBadge, getPaymentBadgeInfo } from '../utils';

Chart.register(...registerables);
 
export default function AdminDashboard() {
  // const { user } = useAuth();
  const [page, setPage] = useState('overview');
  const [data, setData] = useState({ students: [], teachers: [], admins: [], groups: [], scores: [], payments: [], teacherPayments: [], workPlans: [], challengeQ: [], enrollments: [], overduePayments: [], monthRevenue: 0 });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterSubject, setFilterSubject] = useState('');
  const [filterStatus, setFilterStatus] = useState('');
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);
  const charts = useRef({});

  // Form states
  const [form, setForm] = useState({});

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes, scoresRes, paymentsRes, tpayRes, workRes, cqRes, enrollRes] = await Promise.all([
        API.getAll('users'), API.getAll('groups'), API.getAll('scores'), API.getAll('payments'),
        API.getAll('teacher_payments'), API.getAll('work_plans'), API.getAll('challenge_questions'), API.getAll('enrollments')
      ]);
      const allUsers = usersRes.data || [];
      const students = allUsers.filter(u => u.role === 'student');
      const teachers = allUsers.filter(u => u.role === 'teacher');
      const admins = allUsers.filter(u => u.role === 'admin');
      const payments = paymentsRes.data || [];
      const now = new Date();
      const overduePayments = payments.filter(p => p.status === 'overdue');
      const monthRevenue = payments.filter(p => p.status === 'paid' && p.month === MONTHS[now.getMonth()] && p.year === now.getFullYear()).reduce((s, p) => s + (p.amount || 0), 0);
      setData({ allUsers, students, teachers, admins, groups: groupsRes.data || [], scores: scoresRes.data || [], payments, teacherPayments: tpayRes.data || [], workPlans: workRes.data || [], challengeQ: cqRes.data || [], enrollments: enrollRes.data || [], overduePayments, monthRevenue });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Charts
  useEffect(() => {
    if (page === 'overview') {
      const now = new Date();
      const months = MONTHS.slice(0, now.getMonth() + 1);
      if (chartRef1.current) {
        if (charts.current.rev) charts.current.rev.destroy();
        charts.current.rev = new Chart(chartRef1.current, { type: 'bar', data: { labels: months.map(m => m.slice(0, 3)),
          datasets: [{ label: 'Daromad', data: months.map(m => data.payments.filter(p => p.status === 'paid' && p.month === m && p.year === now.getFullYear()).reduce((s, p) => s + p.amount, 0)), backgroundColor: 'rgba(24,75,69,0.7)', borderRadius: 6 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' } } } } });
      }
      if (chartRef2.current) {
        if (charts.current.stu) charts.current.stu.destroy();
        charts.current.stu = new Chart(chartRef2.current, { type: 'line', data: { labels: months.map(m => m.slice(0, 3)),
          datasets: [{ label: "O'quvchilar", data: months.map((m, i) => data.students.filter(s => { if (!s.joined_date) return false; const d = new Date(s.joined_date); return d.getMonth() <= i && d.getFullYear() <= now.getFullYear(); }).length),
            borderColor: '#66BB6A', backgroundColor: 'rgba(102,187,106,0.1)', borderWidth: 2.5, fill: true, tension: 0.4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' }, beginAtZero: true } } } });
      }
    }
  }, [page, data]);

  const addStudent = async () => {
    if (!form.full_name || !form.email || !form.password_hash) { showToast('Xato', "Majburiy maydonlarni to'ldiring", 'error'); return; }
    await API.create('users', { ...form, role: 'student', is_active: true, joined_date: new Date().toISOString() });
    showToast("O'quvchi qo'shildi!", form.full_name); setModal(null); setForm({}); await loadData();
  };

  const toggleStudent = async (id, newStatus) => {
    await API.patch('users', id, { is_active: newStatus });
    showToast(newStatus ? 'Faollashtirildi' : 'Bloklandi', '', newStatus ? 'success' : 'warning'); await loadData();
  };

  const markAsPaid = async (id) => {
    await API.patch('payments', id, { status: 'paid', paid_date: new Date().toISOString() });
    showToast("To'lov tasdiqlandi!"); await loadData();
  };

  const addPayment = async () => {
    const [sid, sname] = (form.student || '').split('|');
    const [tid, tname] = (form.teacher || '').split('|');
    await API.create('payments', { student_id: sid, student_name: sname, teacher_id: tid, teacher_name: tname, subject: form.subject, month: form.month, year: parseInt(form.year || new Date().getFullYear()), amount: parseInt(form.amount || 0), status: form.status || 'pending', paid_date: form.status === 'paid' ? new Date().toISOString() : '' });
    showToast("To'lov qo'shildi!"); setModal(null); setForm({}); await loadData();
  };

  const addTeacherPayment = async () => {
    const [tid, tname, tsubj] = (form.teacher || '').split('|');
    await API.create('teacher_payments', { teacher_id: tid, teacher_name: tname, subject: tsubj, type: form.type || 'salary', month: form.month, year: parseInt(form.year || new Date().getFullYear()), amount: parseInt(form.amount || 0), paid_date: new Date().toISOString(), note: form.note || '' });
    showToast("To'lov qo'shildi!"); setModal(null); setForm({}); await loadData();
  };

  const saveGroup = async () => {
    const [tid, tname] = (form.teacher || '').split('|');
    const selectedDays = form.days || [];
    if (!form.name || !form.subject || !tid || selectedDays.length === 0) { showToast('Xato', "Barcha maydonlarni to'ldiring", 'error'); return; }
    await API.create('groups', { name: form.name, subject: form.subject, stage: form.stage || STAGES[0], teacher_id: tid, teacher_name: tname, room: form.room || ROOMS[0], days: selectedDays, start_time: form.start_time || '09:00', end_time: form.end_time || '11:00', max_students: parseInt(form.max_students || 15), current_students: 0, is_active: true });
    showToast('Gruppa yaratildi!', form.name); setForm({}); await loadData(); setPage('groups');
  };

  const enrollStudent = async (groupId) => {
    if (!form.enrollStudentId) { showToast('Xato', "O'quvchi tanlang", 'error'); return; }
    await API.create('enrollments', { student_id: form.enrollStudentId, group_id: groupId, enrolled_date: new Date().toISOString(), is_active: true });
    const group = data.groups.find(g => g.id === groupId);
    if (group) await API.patch('groups', groupId, { current_students: (group.current_students || 0) + 1 });
    showToast("O'quvchi qo'shildi!"); setModal(null); setForm({}); await loadData();
  };

  const pageTitles = { 'overview': 'Admin Dashboard', 'students': "O'quvchilar", 'teachers': "O'qituvchilar", 'groups': 'Gruppalar', 'add-group': "Gruppa Qo'shish", 'student-payments': "O'quvchi To'lovlar", 'teacher-payments': "O'qituvchi Oylik", 'work-plans-admin': 'Ish Rejalari', 'ranking': 'Reytinglar', 'analytics': 'Statistika', 'challenges-admin': 'Challenge Nazorat' };

  const filteredStudents = data.students.filter(s => {
    const ms = !searchTerm || s.full_name?.toLowerCase().includes(searchTerm.toLowerCase()) || s.email?.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = !filterSubject || s.subject === filterSubject;
    return ms && mf;
  });

  const filteredPayments = data.payments.filter(p => {
    const ms = !searchTerm || p.student_name?.toLowerCase().includes(searchTerm.toLowerCase());
    const mf = !filterStatus || p.status === filterStatus;
    return ms && mf;
  });

  return (
    <DashboardLayout activePage={page} onNavigate={p => { setPage(p); setSearchTerm(''); setFilterSubject(''); setFilterStatus(''); }} title={pageTitles[page] || 'Sahifa'} subtitle="Admin paneli">
      {loading ? <div className="loading-spinner" style={{ padding: 40, justifyContent: 'center', width: '100%' }}><div className="spinner spinner-lg" /></div> :
        page === 'overview' ? (
          <>
            <div className="welcome-banner animate-in"><div className="welcome-banner-content">
              <div className="welcome-title">Admin Panel 🛡️</div>
              <div className="welcome-stats">
                <div className="welcome-stat"><div className="welcome-stat-value">{data.students.length}</div><div className="welcome-stat-label">Jami o'quvchilar</div></div>
                <div className="welcome-stat"><div className="welcome-stat-value">{data.groups.length}</div><div className="welcome-stat-label">Gruppalar</div></div>
                {/* <div className="welcome-stat"><div className="welcome-stat-value">{formatCurrency(data.monthRevenue)}</div><div className="welcome-stat-label">Bu oylik daromad</div></div> */}
              </div></div></div>
            <div className="stats-grid animate-in stagger-1">
              <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-user-graduate" /></div><div className="stat-info"><div className="stat-value">{data.students.length}</div><div className="stat-label">O'quvchilar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-chalkboard-teacher" /></div><div className="stat-info"><div className="stat-value">{data.teachers.length}</div><div className="stat-label">O'qituvchilar</div></div></div>
              <div className="stat-card blue"><div className="stat-icon blue"><i className="fas fa-layer-group" /></div><div className="stat-info"><div className="stat-value">{data.groups.length}</div><div className="stat-label">Gruppalar</div></div></div>
              <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-exclamation-circle" /></div><div className="stat-info"><div className="stat-value">{data.overduePayments.length}</div><div className="stat-label">Muddati o'tgan</div></div></div>
            </div>
            <div className="grid-2 animate-in stagger-2" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📊 Oylik Daromad</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef1} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">👥 O'quvchilar Dinamikasi</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef2} /></div></div></div>
            </div>
          </>
        ) : page === 'students' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div><div className="page-title">🎓 O'quvchilar</div><div className="page-subtitle">Jami {data.students.length} ta</div></div>
              <button className="btn btn-primary" onClick={() => { setForm({}); setModal('add-student'); }}><i className="fas fa-user-plus" /> O'quvchi Qo'sh</button>
            </div>
            <div className="card animate-in">
              <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                <div className="search-input" style={{ flex: 1, maxWidth: 300 }}><i className="fas fa-search" /><input type="text" placeholder="Ism, email..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
                <select className="filter-select" value={filterSubject} onChange={e => setFilterSubject(e.target.value)}><option value="">Barcha fanlar</option>{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select>
              </div>
              <div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Ism</th><th>Fan</th><th>Bosqich</th><th>Telefon</th><th>Holat</th><th>Amal</th></tr></thead>
                  <tbody>{filteredStudents.map((s, i) => <tr key={s.id}><td>{i + 1}</td><td><div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                    <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 700, fontSize: 12, flexShrink: 0 }}>{getInitials(s.full_name)}</div>
                    <div><div style={{ fontWeight: 600 }}>{s.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div></div></div></td>
                    <td>{s.subject || '—'}</td><td><span className="badge badge-info">{s.stage || '—'}</span></td><td>{s.phone || '—'}</td>
                    <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Faol' : 'Nofaol'}</span></td>
                    <td><button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => toggleStudent(s.id, !s.is_active)}><i className={`fas fa-${s.is_active ? 'ban' : 'check'}`} /></button></td></tr>)}</tbody></table></div>
              </div>
            </div>
          </>
        ) : page === 'teachers' ? (
          <>
            <div className="page-header"><div className="page-title">👩‍🏫 O'qituvchilar</div></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.teachers.map(t => { const myGroups = data.groups.filter(g => g.teacher_id === t.id); const totalSt = myGroups.reduce((s, g) => s + (g.current_students || 0), 0);
                return <div key={t.id} className="card animate-in"><div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: 18 }}>{getInitials(t.full_name)}</div>
                    <div><div style={{ fontSize: 16, fontWeight: 700 }}>{t.full_name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.subject || '—'}</div></div></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 10 }}>
                    <div style={{ textAlign: 'center', padding: 10, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{myGroups.length}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gruppa</div></div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{totalSt}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>O'quvchi</div></div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--info)' }}>{data.challengeQ.filter(q => q.created_by === t.id).length}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Savol</div></div></div>
                </div></div>; })}
            </div>
          </>
        ) : page === 'groups' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div className="page-title">📚 Gruppalar</div></div>
              <button className="btn btn-primary" onClick={() => setPage('add-group')}><i className="fas fa-plus" /> Gruppa Qo'sh</button></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.groups.map(g => <div key={g.id} className="group-card animate-in">
                <div className="group-card-header"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: 16, fontWeight: 800 }}>{SUBJECT_ICONS[g.subject] || '📚'} {g.name}</div><div style={{ fontSize: 12, opacity: 0.8, marginTop: 4 }}>{g.subject}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{g.current_students || 0}</div><div style={{ fontSize: 11, opacity: 0.75 }}>/{g.max_students}</div></div></div></div>
                <div className="group-card-body">
                  <div className="group-info-row"><i className="fas fa-chalkboard-teacher" /> {g.teacher_name}</div>
                  <div className="group-info-row"><i className="fas fa-door-open" /> {g.room}</div>
                  <div className="group-info-row"><i className="fas fa-clock" /> {g.start_time}–{g.end_time}</div>
                  <div className="group-info-row"><i className="fas fa-calendar" /><div className="tags" style={{ gap: 4 }}>{(Array.isArray(g.days) ? g.days : (g.days || '').split(',')).map(d => <span key={d} className="tag" style={{ fontSize: 11, padding: '2px 8px' }}>{d.trim()}</span>)}</div></div>
                  <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
                    <button className="btn btn-ghost btn-sm" onClick={() => { setForm({ enrollGroupId: g.id, enrollStudentId: '' }); setModal('enroll'); }}><i className="fas fa-user-plus" /> Qo'sh</button></div>
                </div></div>)}
            </div>
          </>
        ) : page === 'add-group' ? (
          <>
            <div className="page-header"><div className="page-title">➕ Yangi Gruppa Yaratish</div></div>
            <div className="card animate-in" style={{ maxWidth: 640 }}><div className="card-body">
              <div className="grid-2" style={{ gap: 16 }}>
                <div className="form-group"><label className="form-label">Gruppa nomi *</label><input type="text" className="form-input" value={form.name || ''} onChange={e => setForm({ ...form, name: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Fan *</label><select className="form-input" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}><option value="">Tanlang</option>{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Bosqich</label><select className="form-input" value={form.stage || STAGES[0]} onChange={e => setForm({ ...form, stage: e.target.value })}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">O'qituvchi *</label><select className="form-input" value={form.teacher || ''} onChange={e => setForm({ ...form, teacher: e.target.value })}><option value="">Tanlang</option>{data.teachers.map(t => <option key={t.id} value={`${t.id}|${t.full_name}`}>{t.full_name}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Xona</label><select className="form-input" value={form.room || ROOMS[0]} onChange={e => setForm({ ...form, room: e.target.value })}>{ROOMS.map(r => <option key={r} value={r}>{r}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Max o'quvchi</label><input type="number" className="form-input" value={form.max_students || 15} onChange={e => setForm({ ...form, max_students: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Boshlanish vaqti</label><input type="time" className="form-input" value={form.start_time || '09:00'} onChange={e => setForm({ ...form, start_time: e.target.value })} /></div>
                <div className="form-group"><label className="form-label">Tugash vaqti</label><input type="time" className="form-input" value={form.end_time || '11:00'} onChange={e => setForm({ ...form, end_time: e.target.value })} /></div>
              </div>
              <div className="form-group"><label className="form-label">Dars kunlari *</label><div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {DAYS.map(d => { const selected = (form.days || []).includes(d); return <label key={d} style={{ display: 'flex', alignItems: 'center', gap: 6, padding: '8px 14px', border: `2px solid ${selected ? 'var(--primary)' : 'var(--border)'}`, borderRadius: 20, cursor: 'pointer', fontSize: 13, fontWeight: 600, background: selected ? 'rgba(24,75,69,0.08)' : '', color: selected ? 'var(--primary)' : '' }}>
                  <input type="checkbox" style={{ display: 'none' }} checked={selected} onChange={() => { const ds = form.days || []; setForm({ ...form, days: selected ? ds.filter(x => x !== d) : [...ds, d] }); }} />{d}</label>; })}</div></div>
              <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
                <button className="btn btn-ghost" onClick={() => setPage('groups')}>Bekor qilish</button>
                <button className="btn btn-primary" onClick={saveGroup}><i className="fas fa-save" /> Gruppa Yaratish</button></div>
            </div></div>
          </>
        ) : page === 'student-payments' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
              <div><div className="page-title">💰 O'quvchi To'lovlar</div></div>
              <button className="btn btn-primary" onClick={() => { setForm({ month: MONTHS[new Date().getMonth()], year: String(new Date().getFullYear()), status: 'paid' }); setModal('add-payment'); }}><i className="fas fa-plus" /> To'lov Qo'sh</button></div>
            <div className="stats-grid animate-in" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-check-circle" /></div><div className="stat-info"><div className="stat-value">{data.payments.filter(p => p.status === 'paid').length}</div><div className="stat-label">To'langan</div></div></div>
              <div className="stat-card"><div className="stat-icon gold"><i className="fas fa-clock" /></div><div className="stat-info"><div className="stat-value">{data.payments.filter(p => p.status === 'pending').length}</div><div className="stat-label">Kutilmoqda</div></div></div>
              <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-exclamation-circle" /></div><div className="stat-info"><div className="stat-value">{data.overduePayments.length}</div><div className="stat-label">Muddati o'tgan</div></div></div>
            </div>
            <div className="card animate-in"><div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
              <div className="search-input" style={{ flex: 1, maxWidth: 300 }}><i className="fas fa-search" /><input type="text" placeholder="O'quvchi..." value={searchTerm} onChange={e => setSearchTerm(e.target.value)} /></div>
              <select className="filter-select" value={filterStatus} onChange={e => setFilterStatus(e.target.value)}><option value="">Barcha</option><option value="paid">To'langan</option><option value="pending">Kutilmoqda</option><option value="overdue">Muddati o'tgan</option></select></div>
              <div className="card-body" style={{ padding: 0 }}><div className="table-wrapper"><table className="data-table"><thead><tr><th>O'quvchi</th><th>Fan</th><th>Oy</th><th>Summa</th><th>Holat</th><th>Amal</th></tr></thead>
                <tbody>{[...filteredPayments].sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month)).map(p => {
                  const badge = getPaymentBadgeInfo(p.status);
                  return <tr key={p.id}><td><strong>{p.student_name}</strong></td><td>{p.subject}</td><td><strong>{p.month} {p.year}</strong></td><td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                    <td><span className={`badge ${badge.class}`}><i className={`fas ${badge.icon}`} /> {badge.text}</span></td>
                    <td>{p.status !== 'paid' && <button className="btn btn-primary btn-sm" onClick={() => markAsPaid(p.id)}>To'landi</button>}</td></tr>;
                })}</tbody></table></div></div></div>
          </>
        ) : page === 'teacher-payments' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div className="page-title">💼 O'qituvchi Oylik</div></div>
              <button className="btn btn-primary" onClick={() => { setForm({ type: 'salary', month: MONTHS[new Date().getMonth()], year: String(new Date().getFullYear()) }); setModal('add-tpay'); }}><i className="fas fa-plus" /> To'lov Qo'sh</button></div>
            <div className="card animate-in"><div className="card-body" style={{ padding: 0 }}><div className="table-wrapper"><table className="data-table"><thead><tr><th>O'qituvchi</th><th>Fan</th><th>Oy</th><th>Summa</th><th>Tur</th><th>Sana</th></tr></thead>
              <tbody>{[...data.teacherPayments].sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date)).map(p => <tr key={p.id}><td><strong>{p.teacher_name}</strong></td><td>{p.subject}</td>
                <td>{p.month} {p.year}</td><td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td>
                <td><span className={`badge ${p.type === 'salary' ? 'badge-success' : 'badge-warning'}`}>{p.type === 'salary' ? '💰 Oylik' : '⚡ Avans'}</span></td>
                <td>{formatDate(p.paid_date)}</td></tr>)}</tbody></table></div></div></div>
          </>
        ) : page === 'ranking' ? (
          <>
            <div className="page-header"><div className="page-title">🏆 Reytinglar</div></div>
            {(() => {
              const ss = {}; data.scores.forEach(s => { const k = `${s.student_id}|${s.subject}`; if (!ss[k]) ss[k] = { name: s.student_name, subject: s.subject, groupName: s.group_name, score: 0 }; ss[k].score += s.score; });
              return <div className="card animate-in"><div className="card-header"><div className="card-title">🌟 Top O'quvchilar</div></div><div className="card-body">
                <div className="ranking-list">{Object.values(ss).sort((a, b) => b.score - a.score).slice(0, 15).map((r, i) => <div key={i} className="ranking-item">
                  <span className="rank-number">{getRankBadge(i + 1)}</span><div className="rank-info"><div className="rank-name">{r.name}</div><div className="rank-detail">{SUBJECT_ICONS[r.subject] || ''} {r.subject}</div></div>
                  <div className="rank-score">{r.score}</div></div>)}</div></div></div>;
            })()}
          </>
        ) : page === 'work-plans-admin' ? (
          <>
            <div className="page-header"><div className="page-title">📖 Ish Rejalari</div><div className="page-subtitle">Barcha fanlar bo'yicha o'quv rejalari</div></div>
            {data.workPlans.length === 0 ? <div className="card animate-in"><div className="card-body"><div className="empty-state"><div className="empty-state-icon">📖</div><div className="empty-state-title">Hali ish rejasi yo'q</div><div className="empty-state-desc">O'qituvchilar ish rejalarini qo'shgandan so'ng bu yerda ko'rinadi</div></div></div></div> :
              data.workPlans.map(wp => {
                const weeks = Array.isArray(wp.weeks) ? wp.weeks : [];
                return <div key={wp.id} className="card animate-in" style={{ marginBottom: 20 }}>
                  <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div className="card-title">{SUBJECT_ICONS[wp.subject] || '📚'} {wp.title}</div>
                    <div style={{ display: 'flex', gap: 8 }}><span className="badge badge-primary">{wp.subject}</span><span className="badge badge-info">{wp.teacher_name}</span></div>
                  </div>
                  <div className="card-body">
                    {wp.description && <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>{wp.description}</div>}
                    {weeks.length > 0 && <div className="table-wrapper"><table className="data-table"><thead><tr><th>Hafta</th><th>Mavzu</th><th>Tavsif</th><th>Resurslar</th></tr></thead>
                      <tbody>{weeks.map((w, i) => <tr key={i}><td><strong>{w.week}-hafta</strong></td><td style={{ fontWeight: 600 }}>{w.title}</td><td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.description}</td><td style={{ fontSize: 12 }}>{w.resources || '—'}</td></tr>)}</tbody></table></div>}
                  </div>
                </div>;
              })}
          </>
        ) : page === 'analytics' ? (
          <>
            <div className="page-header"><div className="page-title">📊 Statistika</div><div className="page-subtitle">Umumiy ko'rsatkichlar</div></div>
            <div className="stats-grid animate-in">
              <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-user-graduate" /></div><div className="stat-info"><div className="stat-value">{data.students.length}</div><div className="stat-label">Jami o'quvchilar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-user-check" /></div><div className="stat-info"><div className="stat-value">{data.students.filter(s => s.is_active).length}</div><div className="stat-label">Faol o'quvchilar</div></div></div>
              <div className="stat-card blue"><div className="stat-icon blue"><i className="fas fa-layer-group" /></div><div className="stat-info"><div className="stat-value">{data.groups.length}</div><div className="stat-label">Gruppalar</div></div></div>
              <div className="stat-card gold"><div className="stat-icon gold"><i className="fas fa-star" /></div><div className="stat-info"><div className="stat-value">{data.scores.length}</div><div className="stat-label">Jami baholar</div></div></div>
            </div>
            <div className="grid-2 animate-in stagger-1" style={{ gap: 20, marginBottom: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📊 Oylik Daromad</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef1} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">👥 O'quvchilar Dinamikasi</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef2} /></div></div></div>
            </div>
            <div className="grid-2 animate-in stagger-2" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📚 Fanlar bo'yicha o'quvchilar</div></div><div className="card-body">
                {(() => { const bySubj = {}; data.students.forEach(s => { const subj = s.subject || 'Boshqa'; if (!bySubj[subj]) bySubj[subj] = 0; bySubj[subj]++; });
                  return Object.entries(bySubj).sort((a, b) => b[1] - a[1]).map(([subj, count]) => <div key={subj} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '12px 0', borderBottom: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}><span style={{ fontSize: 20 }}>{SUBJECT_ICONS[subj] || '📚'}</span><span style={{ fontWeight: 600 }}>{subj}</span></div>
                    <span className="badge badge-primary">{count} ta</span></div>);
                })()}
              </div></div>
              <div className="card"><div className="card-header"><div className="card-title">💰 To'lov statistikasi</div></div><div className="card-body">
                <div style={{ display: 'grid', gap: 12 }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(102,187,106,0.08)', borderRadius: 'var(--radius-sm)' }}><span style={{ fontWeight: 600 }}>✅ To'langan</span><strong>{data.payments.filter(p => p.status === 'paid').length} ta — {formatCurrency(data.payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0))}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(255,167,38,0.08)', borderRadius: 'var(--radius-sm)' }}><span style={{ fontWeight: 600 }}>⏳ Kutilmoqda</span><strong>{data.payments.filter(p => p.status === 'pending').length} ta — {formatCurrency(data.payments.filter(p => p.status === 'pending').reduce((s, p) => s + (p.amount || 0), 0))}</strong></div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', padding: 12, background: 'rgba(239,83,80,0.08)', borderRadius: 'var(--radius-sm)' }}><span style={{ fontWeight: 600 }}>❌ Muddati o'tgan</span><strong>{data.overduePayments.length} ta — {formatCurrency(data.overduePayments.reduce((s, p) => s + (p.amount || 0), 0))}</strong></div>
                </div>
              </div></div>
            </div>
          </>
        ) : page === 'challenges-admin' ? (
          <>
            <div className="page-header"><div className="page-title">🎮 Challenge Nazorat</div></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.teachers.map(t => { const qs = data.challengeQ.filter(q => q.created_by === t.id); const isActive = qs.length > 0;
                return <div key={t.id} className="card animate-in" style={{ borderLeft: `4px solid ${isActive ? 'var(--success)' : 'var(--danger)'}` }}><div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 12 }}>
                    <div style={{ width: 44, height: 44, borderRadius: '50%', background: isActive ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.1)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20 }}>{isActive ? '✅' : '❌'}</div>
                    <div><div style={{ fontWeight: 700 }}>{t.full_name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{t.subject}</div></div>
                    <span className={`badge ${isActive ? 'badge-success' : 'badge-danger'}`} style={{ marginLeft: 'auto' }}>{qs.length} savol</span></div>
                </div></div>; })}
            </div>
          </>
        ) : <div className="empty-state"><div className="empty-state-title">Sahifa topilmadi</div></div>}

      {/* Modals */}
      {modal === 'add-student' && <Modal title="Yangi O'quvchi" onClose={() => setModal(null)} onSave={addStudent}>
        <div className="form-group"><label className="form-label">Ism *</label><input className="form-input" value={form.full_name || ''} onChange={e => setForm({ ...form, full_name: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Email *</label><input className="form-input" value={form.email || ''} onChange={e => setForm({ ...form, email: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Telefon</label><input className="form-input" value={form.phone || ''} onChange={e => setForm({ ...form, phone: e.target.value })} /></div>
        <div className="form-group"><label className="form-label">Fan</label><select className="form-input" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}><option value="">Tanlang</option>{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Bosqich</label><select className="form-input" value={form.stage || STAGES[0]} onChange={e => setForm({ ...form, stage: e.target.value })}>{STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Parol *</label><input type="password" className="form-input" value={form.password_hash || ''} onChange={e => setForm({ ...form, password_hash: e.target.value })} /></div>
      </Modal>}

      {modal === 'add-payment' && <Modal title="To'lov Qo'shish" onClose={() => setModal(null)} onSave={addPayment}>
        <div className="form-group"><label className="form-label">O'quvchi</label><select className="form-input" value={form.student || ''} onChange={e => setForm({ ...form, student: e.target.value })}><option value="">Tanlang</option>{data.students.map(s => <option key={s.id} value={`${s.id}|${s.full_name}`}>{s.full_name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">O'qituvchi</label><select className="form-input" value={form.teacher || ''} onChange={e => setForm({ ...form, teacher: e.target.value })}><option value="">Tanlang</option>{data.teachers.map(t => <option key={t.id} value={`${t.id}|${t.full_name}`}>{t.full_name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Fan</label><select className="form-input" value={form.subject || ''} onChange={e => setForm({ ...form, subject: e.target.value })}><option value="">Tanlang</option>{SUBJECTS.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
        <div className="grid-2" style={{ gap: 12 }}><div className="form-group"><label className="form-label">Oy</label><select className="form-input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Yil</label><input type="number" className="form-input" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Summa</label><input type="number" className="form-input" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} placeholder="500000" /></div>
        <div className="form-group"><label className="form-label">Holat</label><select className="form-input" value={form.status} onChange={e => setForm({ ...form, status: e.target.value })}><option value="paid">To'langan</option><option value="pending">Kutilmoqda</option><option value="overdue">Muddati o'tgan</option></select></div>
      </Modal>}

      {modal === 'add-tpay' && <Modal title="O'qituvchi To'lovi" onClose={() => setModal(null)} onSave={addTeacherPayment}>
        <div className="form-group"><label className="form-label">O'qituvchi</label><select className="form-input" value={form.teacher || ''} onChange={e => setForm({ ...form, teacher: e.target.value })}><option value="">Tanlang</option>{data.teachers.map(t => <option key={t.id} value={`${t.id}|${t.full_name}|${t.subject}`}>{t.full_name}</option>)}</select></div>
        <div className="form-group"><label className="form-label">Tur</label><select className="form-input" value={form.type} onChange={e => setForm({ ...form, type: e.target.value })}><option value="salary">Oylik</option><option value="advance">Avans</option></select></div>
        <div className="grid-2" style={{ gap: 12 }}><div className="form-group"><label className="form-label">Oy</label><select className="form-input" value={form.month} onChange={e => setForm({ ...form, month: e.target.value })}>{MONTHS.map(m => <option key={m} value={m}>{m}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Yil</label><input type="number" className="form-input" value={form.year} onChange={e => setForm({ ...form, year: e.target.value })} /></div></div>
        <div className="form-group"><label className="form-label">Summa</label><input type="number" className="form-input" value={form.amount || ''} onChange={e => setForm({ ...form, amount: e.target.value })} /></div>
      </Modal>}

      {modal === 'enroll' && <Modal title="O'quvchi Qo'shish" onClose={() => setModal(null)} onSave={() => enrollStudent(form.enrollGroupId)}>
        <div className="form-group"><label className="form-label">O'quvchi</label><select className="form-input" value={form.enrollStudentId || ''} onChange={e => setForm({ ...form, enrollStudentId: e.target.value })}>
          <option value="">Tanlang</option>{data.students.filter(s => !data.enrollments.some(e => e.student_id === s.id && e.group_id === form.enrollGroupId && e.is_active)).map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
      </Modal>}
    </DashboardLayout>
  );
}
