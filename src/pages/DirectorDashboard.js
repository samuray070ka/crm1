import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../AuthContext';
import API from '../api';
import { MONTHS, SUBJECT_ICONS, formatCurrency, formatDate, getInitials, getRankBadge, getPaymentBadgeInfo } from '../utils';

Chart.register(...registerables);

export default function DirectorDashboard() { 
  const { user } = useAuth();
  const [page, setPage] = useState('overview');
  const [data, setData] = useState({ students: [], teachers: [], admins: [], groups: [], scores: [], payments: [], teacherPayments: [], enrollments: [], monthRevenue: 0, totalRevenue: 0, totalExpenses: 0 });
  const [loading, setLoading] = useState(true);
  const charts = useRef({});
  const chartRef1 = useRef(null);
  const chartRef2 = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [usersRes, groupsRes, scoresRes, paymentsRes, tpayRes, enrollRes] = await Promise.all([
        API.getAll('users'), API.getAll('groups'), API.getAll('scores'), API.getAll('payments'), API.getAll('teacher_payments'), API.getAll('enrollments')
      ]);
      const allUsers = usersRes.data || [];
      const payments = paymentsRes.data || [];
      const teacherPayments = tpayRes.data || [];
      const now = new Date();
      setData({
        students: allUsers.filter(u => u.role === 'student'), teachers: allUsers.filter(u => u.role === 'teacher'),
        admins: allUsers.filter(u => u.role === 'admin'), groups: groupsRes.data || [], scores: scoresRes.data || [],
        payments, teacherPayments, enrollments: enrollRes.data || [],
        monthRevenue: payments.filter(p => p.status === 'paid' && p.month === MONTHS[now.getMonth()] && p.year === now.getFullYear()).reduce((s, p) => s + (p.amount || 0), 0),
        totalRevenue: payments.filter(p => p.status === 'paid').reduce((s, p) => s + (p.amount || 0), 0),
        totalExpenses: teacherPayments.reduce((s, p) => s + (p.amount || 0), 0)
      });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  useEffect(() => {
    if (page === 'overview' || page === 'finance' || page === 'full-analytics') {
      const now = new Date();
      const months = MONTHS.slice(0, now.getMonth() + 1);
      if (chartRef1.current) {
        if (charts.current.c1) charts.current.c1.destroy();
        charts.current.c1 = new Chart(chartRef1.current, {
          type: 'bar', data: { labels: months.map(m => m.slice(0, 3)), datasets: [
            { label: 'Daromad', data: months.map(m => data.payments.filter(p => p.status === 'paid' && p.month === m && p.year === now.getFullYear()).reduce((s, p) => s + p.amount, 0)), backgroundColor: 'rgba(102,187,106,0.7)', borderRadius: 6 },
            { label: 'Xarajat', data: months.map(m => data.teacherPayments.filter(p => { const d = new Date(p.paid_date); return MONTHS[d.getMonth()] === m && d.getFullYear() === now.getFullYear(); }).reduce((s, p) => s + p.amount, 0)), backgroundColor: 'rgba(239,83,80,0.7)', borderRadius: 6 }
          ] }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: 'top' } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' } } } }
        });
      }
      if (chartRef2.current) {
        if (charts.current.c2) charts.current.c2.destroy();
        charts.current.c2 = new Chart(chartRef2.current, {
          type: 'line', data: { labels: months.map(m => m.slice(0, 3)), datasets: [{ label: "O'quvchilar",
            data: months.map((m, i) => data.students.filter(s => { if (!s.joined_date) return false; const d = new Date(s.joined_date); return d.getMonth() <= i && d.getFullYear() <= now.getFullYear(); }).length),
            borderColor: '#184B45', backgroundColor: 'rgba(24,75,69,0.08)', borderWidth: 2.5, fill: true, tension: 0.4 }] },
          options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' }, beginAtZero: true } } }
        });
      }
    }
  }, [page, data]);

  const pageTitles = { 'overview': 'Direktor Dashboard', 'all-students': "Barcha O'quvchilar", 'all-teachers': "Barcha O'qituvchilar", 'all-admins': 'Adminlar', 'finance': 'Moliya', 'teacher-salaries': "O'qituvchi Oylik", 'admin-salaries': 'Admin Oylik', 'rankings': 'Reytinglar', 'full-analytics': "To'liq Statistika" };

  const now = new Date();
  const monthExpenses = data.teacherPayments.filter(p => { const d = new Date(p.paid_date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); }).reduce((s, p) => s + p.amount, 0);
  const profit = data.monthRevenue - monthExpenses;

  return (
    <DashboardLayout activePage={page} onNavigate={setPage} title={pageTitles[page] || 'Sahifa'} subtitle="Direktor paneli">
      {loading ? <div className="loading-spinner" style={{ padding: 40, justifyContent: 'center', width: '100%' }}><div className="spinner spinner-lg" /></div> :
        page === 'overview' ? (
          <>
            <div className="welcome-banner animate-in" style={{ background: 'linear-gradient(135deg,#0a2a26 0%,#103B36 50%,#184B45 100%)' }}>
              <div className="welcome-banner-content">
                <div className="welcome-title">👔 Direktor Paneli</div>
                <div className="welcome-subtitle">DataSite Academy — To'liq nazorat markazi</div>
                <div className="welcome-stats">
                  <div className="welcome-stat"><div className="welcome-stat-value">{data.students.length}</div><div className="welcome-stat-label">Jami o'quvchilar</div></div>
                  <div className="welcome-stat"><div className="welcome-stat-value">{data.teachers.length}</div><div className="welcome-stat-label">O'qituvchilar</div></div>
                  <div className="welcome-stat"><div className="welcome-stat-value">{formatCurrency(data.monthRevenue)}</div><div className="welcome-stat-label">Bu oy daromad</div></div>
                  <div className="welcome-stat" style={{ background: profit >= 0 ? 'rgba(102,187,106,0.15)' : 'rgba(239,83,80,0.15)' }}>
                    <div className="welcome-stat-value">{formatCurrency(Math.abs(profit))}</div><div className="welcome-stat-label">Bu oy foyda</div></div>
                </div>
              </div>
            </div>
            <div className="stats-grid animate-in stagger-1">
              <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-user-graduate" /></div><div className="stat-info"><div className="stat-value">{data.students.length}</div><div className="stat-label">O'quvchilar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-chalkboard-teacher" /></div><div className="stat-info"><div className="stat-value">{data.teachers.length}</div><div className="stat-label">O'qituvchilar</div></div></div>
              <div className="stat-card blue"><div className="stat-icon blue"><i className="fas fa-user-cog" /></div><div className="stat-info"><div className="stat-value">{data.admins.length}</div><div className="stat-label">Adminlar</div></div></div>
              <div className="stat-card gold"><div className="stat-icon gold"><i className="fas fa-layer-group" /></div><div className="stat-info"><div className="stat-value">{data.groups.length}</div><div className="stat-label">Gruppalar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-money-bill-wave" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.totalRevenue)}</div><div className="stat-label">Jami daromad</div></div></div>
              <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-hand-holding-usd" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.totalExpenses)}</div><div className="stat-label">Jami oyliklar</div></div></div>
            </div>
            <div className="grid-2 animate-in stagger-2" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📈 Daromad vs Xarajat</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef1} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">👥 O'quvchilar Dinamikasi</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef2} /></div></div></div>
            </div>
          </>
        ) : page === 'all-students' ? (
          <>
            <div className="page-header"><div className="page-title">🎓 Barcha O'quvchilar</div><div className="page-subtitle">Jami {data.students.length} ta</div></div>
            <div className="card animate-in"><div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Ism</th><th>Fan</th><th>Bosqich</th><th>Ball</th><th>Holat</th></tr></thead>
                <tbody>{data.students.map((s, i) => { const scoreTotal = data.scores.filter(sc => sc.student_id === s.id).reduce((sum, sc) => sum + sc.score, 0);
                  return <tr key={s.id}><td>{i + 1}</td><td><div style={{ fontWeight: 600 }}>{s.full_name}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>{s.email}</div></td>
                    <td>{s.subject || '—'}</td><td><span className="badge badge-info">{s.stage || '—'}</span></td>
                    <td><strong style={{ color: 'var(--primary)' }}>{scoreTotal}</strong></td>
                    <td><span className={`badge ${s.is_active ? 'badge-success' : 'badge-danger'}`}>{s.is_active ? 'Faol' : 'Nofaol'}</span></td></tr>; })}</tbody></table></div>
            </div></div>
          </>
        ) : page === 'all-teachers' ? (
          <>
            <div className="page-header"><div className="page-title">👩‍🏫 Barcha O'qituvchilar</div></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.teachers.map(t => { const tGroups = data.groups.filter(g => g.teacher_id === t.id); const totalSt = tGroups.reduce((s, g) => s + (g.current_students || 0), 0);
                return <div key={t.id} className="card animate-in"><div className="card-body">
                  <div style={{ display: 'flex', alignItems: 'center', gap: 14, marginBottom: 16 }}>
                    <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,var(--primary),var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: 18 }}>{getInitials(t.full_name)}</div>
                    <div><div style={{ fontSize: 16, fontWeight: 700 }}>{t.full_name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>{t.subject || '—'}</div></div></div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
                    <div style={{ textAlign: 'center', padding: 10, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--primary)' }}>{tGroups.length}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>Gruppa</div></div>
                    <div style={{ textAlign: 'center', padding: 10, background: 'var(--bg-main)', borderRadius: 'var(--radius-sm)' }}><div style={{ fontSize: 20, fontWeight: 800, color: 'var(--success)' }}>{totalSt}</div><div style={{ fontSize: 11, color: 'var(--text-muted)' }}>O'quvchi</div></div></div>
                </div></div>; })}
            </div>
          </>
        ) : page === 'all-admins' ? (
          <>
            <div className="page-header"><div className="page-title">⚙️ Adminlar</div></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.admins.map(a => <div key={a.id} className="card animate-in"><div className="card-body">
                <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <div style={{ width: 52, height: 52, borderRadius: '50%', background: 'linear-gradient(135deg,#215c55,var(--primary-dark))', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--accent)', fontWeight: 800, fontSize: 18 }}>{getInitials(a.full_name)}</div>
                  <div><div style={{ fontSize: 16, fontWeight: 700 }}>{a.full_name}</div><div style={{ fontSize: 13, color: 'var(--text-muted)' }}>Administrator</div><div style={{ fontSize: 12, color: 'var(--text-muted)', marginTop: 4 }}>{a.email}</div></div></div>
              </div></div>)}
            </div>
          </>
        ) : page === 'finance' ? (
          <>
            <div className="page-header"><div className="page-title">💹 Moliya</div></div>
            <div className="stats-grid animate-in">
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-arrow-up" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.monthRevenue)}</div><div className="stat-label">Bu oy daromad</div></div></div>
              <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-arrow-down" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(monthExpenses)}</div><div className="stat-label">Bu oy xarajat</div></div></div>
              <div className={`stat-card ${profit >= 0 ? 'green' : 'red'}`}><div className={`stat-icon ${profit >= 0 ? 'green' : 'red'}`}><i className="fas fa-chart-line" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(Math.abs(profit))}</div><div className="stat-label">Bu oy {profit >= 0 ? 'foyda' : 'zarar'}</div></div></div>
              <div className="stat-card gold"><div className="stat-icon gold"><i className="fas fa-coins" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.totalRevenue - data.totalExpenses)}</div><div className="stat-label">Jami sof foyda</div></div></div>
            </div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📊 Oylik Moliya</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef1} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">📋 Bu Oy To'lovlar</div></div><div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>O'quvchi</th><th>Summa</th><th>Sana</th></tr></thead>
                  <tbody>{data.payments.filter(p => p.status === 'paid' && p.month === MONTHS[now.getMonth()] && p.year === now.getFullYear()).slice(0, 10).map(p =>
                    <tr key={p.id}><td>{p.student_name}</td><td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td><td>{formatDate(p.paid_date)}</td></tr>)}</tbody></table></div>
              </div></div>
            </div>
          </>
        ) : page === 'teacher-salaries' ? (
          <>
            <div className="page-header"><div className="page-title">💼 O'qituvchi Oylik</div></div>
            <div className="card animate-in"><div className="card-body" style={{ padding: 0 }}>
              <div className="table-wrapper"><table className="data-table"><thead><tr><th>O'qituvchi</th><th>Fan</th><th>Tur</th><th>Oy</th><th>Summa</th><th>Sana</th></tr></thead>
                <tbody>{[...data.teacherPayments].sort((a, b) => new Date(b.paid_date) - new Date(a.paid_date)).map(p =>
                  <tr key={p.id}><td><strong>{p.teacher_name}</strong></td><td>{p.subject}</td>
                    <td><span className={`badge ${p.type === 'salary' ? 'badge-success' : 'badge-warning'}`}>{p.type === 'salary' ? '💰 Oylik' : '⚡ Avans'}</span></td>
                    <td>{p.month} {p.year}</td><td style={{ fontWeight: 700 }}>{formatCurrency(p.amount)}</td><td>{formatDate(p.paid_date)}</td></tr>)}</tbody></table></div>
            </div></div>
          </>
        ) : page === 'admin-salaries' ? (
          <>
            <div className="page-header"><div className="page-title">💼 Admin Oylik</div><div className="page-subtitle">Adminlar to'lovlari</div></div>
            {data.admins.length === 0 ? <div className="card animate-in"><div className="card-body"><div className="empty-state"><div className="empty-state-icon">👤</div><div className="empty-state-title">Admin topilmadi</div></div></div></div> :
              <div className="card animate-in"><div className="card-body" style={{ padding: 0 }}>
                <div className="table-wrapper"><table className="data-table"><thead><tr><th>#</th><th>Admin</th><th>Email</th><th>Telefon</th><th>Holat</th></tr></thead>
                  <tbody>{data.admins.map((a, i) => <tr key={a.id}><td>{i + 1}</td><td><strong>{a.full_name}</strong></td><td>{a.email}</td><td>{a.phone || '—'}</td>
                    <td><span className={`badge ${a.is_active ? 'badge-success' : 'badge-danger'}`}>{a.is_active ? 'Faol' : 'Nofaol'}</span></td></tr>)}</tbody></table></div>
              </div></div>}
          </>
        ) : page === 'rankings' ? (
          <>
            <div className="page-header"><div className="page-title">🏆 Reytinglar</div></div>
            {(() => { const ss = {}; data.scores.forEach(s => { if (!ss[s.student_id]) ss[s.student_id] = { name: s.student_name, score: 0, subject: s.subject, groupName: s.group_name }; ss[s.student_id].score += s.score; });
              return <div className="card animate-in"><div className="card-header"><div className="card-title">🌟 Global Reyting — Top 20</div></div><div className="card-body">
                <div className="ranking-list">{Object.values(ss).sort((a, b) => b.score - a.score).slice(0, 20).map((r, i) =>
                  <div key={i} className={`ranking-item ${i === 0 ? '' : ''}`} style={i === 0 ? { background: 'linear-gradient(135deg,rgba(255,215,0,0.08),rgba(255,165,0,0.05))', border: '2px solid rgba(255,215,0,0.3)' } : {}}>
                    <span className="rank-number">{getRankBadge(i + 1)}</span><div className="rank-info"><div className="rank-name">{r.name} {i === 0 ? '👑' : ''}</div><div className="rank-detail">{SUBJECT_ICONS[r.subject] || ''} {r.subject}</div></div>
                    <div className="rank-score">{r.score}</div></div>)}</div></div></div>;
            })()}
          </>
        ) : page === 'full-analytics' ? (
          <>
            <div className="page-header"><div className="page-title">📊 To'liq Statistika</div></div>
            <div className="stats-grid animate-in">
              <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-users" /></div><div className="stat-info"><div className="stat-value">{data.students.length}</div><div className="stat-label">O'quvchilar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-chalkboard-teacher" /></div><div className="stat-info"><div className="stat-value">{data.teachers.length}</div><div className="stat-label">O'qituvchilar</div></div></div>
              <div className="stat-card blue"><div className="stat-icon blue"><i className="fas fa-layer-group" /></div><div className="stat-info"><div className="stat-value">{data.groups.length}</div><div className="stat-label">Gruppalar</div></div></div>
              <div className="stat-card gold"><div className="stat-icon gold"><i className="fas fa-star" /></div><div className="stat-info"><div className="stat-value">{data.scores.length}</div><div className="stat-label">Jami baholar</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-money-bill" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.totalRevenue)}</div><div className="stat-label">Jami daromad</div></div></div>
              <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-wallet" /></div><div className="stat-info"><div className="stat-value">{formatCurrency(data.totalExpenses)}</div><div className="stat-label">Jami xarajat</div></div></div>
            </div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">💰 Oylik Moliya Oqimi</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef1} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">👥 O'quvchilar Dinamikasi</div></div><div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef2} /></div></div></div>
            </div>
          </>
        ) : <div className="empty-state"><div className="empty-state-title">Sahifa topilmadi</div></div>}
    </DashboardLayout>
  );
}
