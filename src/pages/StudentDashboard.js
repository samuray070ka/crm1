import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../AuthContext';
import API from '../api';
import { MONTHS, DAYS, SUBJECT_ICONS, formatCurrency, formatDate, getInitials, getScoreClass, getRankBadge, getPaymentBadgeInfo, getDayOfWeek, getCurrentWeek } from '../utils';
import ChallengeGame from './ChallengeGame';
import GlobalRanking from './GlobalRanking';

Chart.register(...registerables); 

export default function StudentDashboard() {
  const { user } = useAuth();
  const [page, setPage] = useState('overview'); 
  const [data, setData] = useState({
    enrollments: [], scores: [], payments: [], challengeResults: [], myGroups: [], allGroups: [],
    monthScore: 0, totalScore: 0, challengeBonus: 0
  });
  const [loading, setLoading] = useState(true);
  const [rankingData, setRankingData] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [enrollRes, scoresRes, paymentsRes, challengeRes, groupsRes] = await Promise.all([
        API.getAll('enrollments', { search: user.id }),
        API.getAll('scores', { search: user.id }),
        API.getAll('payments', { search: user.id }),
        API.getAll('challenge_results', { search: user.id }),
        API.getAll('groups'),
      ]);
      const enrollments = (enrollRes.data || []).filter(e => e.student_id === user.id && e.is_active);
      const scores = (scoresRes.data || []).filter(s => s.student_id === user.id);
      const payments = (paymentsRes.data || []).filter(p => p.student_id === user.id);
      const challengeResults = (challengeRes.data || []).filter(c => c.student_id === user.id);
      const allGroups = groupsRes.data || [];
      const enrolledGroupIds = enrollments.map(e => e.group_id);
      const myGroups = allGroups.filter(g => enrolledGroupIds.includes(g.id));
      const now = new Date();
      const monthScores = scores.filter(s => { const d = new Date(s.date); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
      const monthScore = monthScores.reduce((sum, s) => sum + (s.score || 0), 0);
      const totalScore = scores.reduce((sum, s) => sum + (s.score || 0), 0);
      setData({ enrollments, scores, payments, challengeResults, myGroups, allGroups, monthScore, totalScore, challengeBonus: 0 });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Init chart
  useEffect(() => {
    if (page === 'overview' && chartRef.current && data.scores.length > 0) {
      if (chartInstance.current) chartInstance.current.destroy();
      const last8 = [...data.scores].sort((a, b) => new Date(a.date) - new Date(b.date)).slice(-8);
      let cum = 0;
      chartInstance.current = new Chart(chartRef.current, {
        type: 'line',
        data: {
          labels: last8.map(s => formatDate(s.date)),
          datasets: [{ label: 'Jami Ball', data: last8.map(s => { cum += s.score; return cum; }),
            borderColor: '#184B45', backgroundColor: 'rgba(24,75,69,0.08)', borderWidth: 2.5, fill: true, tension: 0.4, pointBackgroundColor: '#184B45', pointRadius: 4
          }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } },
          scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' } } } }
      });
    }
    return () => { if (chartInstance.current) chartInstance.current.destroy(); };
  }, [page, data.scores]);

  // Load ranking data
  useEffect(() => {
    if (page === 'ranking') {
      API.getAll('scores').then(res => setRankingData(res.data || []));
    }
  }, [page]);

  const pageTitles = {
    'overview': 'Bosh Sahifa', 'schedule': 'Dars Jadvali', 'scores': 'Mening Baholarim',
    'ranking': 'Reyting', 'challenges': 'Kunlik Challenge', 'payments': "To'lovlar", 'global-ranking': 'Umumiy Reyting'
  };

  if (page === 'global-ranking') return <GlobalRanking onBack={() => setPage('overview')} onNavigate={setPage} activePage={page} />;
  if (page === 'challenges') return (
    <DashboardLayout activePage={page} onNavigate={setPage} title="Kunlik Challenge" subtitle="O'quvchi paneli">
      <ChallengeGame user={user} />
    </DashboardLayout>
  );

  const pending = data.payments.filter(p => p.status !== 'paid');
  const lastScores = [...data.scores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 5);
  const today = getDayOfWeek();
  const todayGroups = data.myGroups.filter(g => {
    const days = Array.isArray(g.days) ? g.days : (g.days || '').split(',');
    return days.some(d => d.trim() === today);
  });

  return (
    <DashboardLayout activePage={page} onNavigate={setPage} title={pageTitles[page] || 'Sahifa'} subtitle="O'quvchi paneli">
      {loading ? <div className="loading-spinner" style={{ padding: 40, justifyContent: 'center', width: '100%' }}><div className="spinner spinner-lg" /><span>Yuklanmoqda...</span></div> :
        page === 'overview' ? (
          <>
            <div className="welcome-banner animate-in">
              <div className="welcome-banner-content">
                <div className="welcome-title">Assalomu alaykum, {user.full_name?.split(' ')[0]}! 🎓</div>
                <div className="welcome-subtitle">Bugungi darsga tayyor bo'ling. Muvaffaqiyat kuchi intizomda!</div>
                <div className="welcome-stats">
                  <div className="welcome-stat"><div className="welcome-stat-value">{data.monthScore}</div><div className="welcome-stat-label">Shu oydagi ball</div></div>
                  <div className="welcome-stat"><div className="welcome-stat-value">{data.myGroups.length}</div><div className="welcome-stat-label">Gruppa</div></div>
                  <div className="welcome-stat"><div className="welcome-stat-value">{data.challengeResults.length}</div><div className="welcome-stat-label">Challenge o'yinlar</div></div>
                  {pending.length > 0 && <div className="welcome-stat" style={{ background: 'rgba(239,83,80,0.15)', borderColor: 'rgba(239,83,80,0.3)' }}>
                    <div className="welcome-stat-value">{pending.length}</div><div className="welcome-stat-label">To'lanmagan to'lov</div></div>}
                </div>
              </div>
            </div>
            <div className="stats-grid animate-in stagger-1">
              <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-star" /></div>
                <div className="stat-info"><div className="stat-value">{data.totalScore}</div><div className="stat-label">Jami ball</div></div></div>
              <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-calendar-check" /></div>
                <div className="stat-info"><div className="stat-value">{data.scores.length}</div><div className="stat-label">O'tilgan darslar</div></div></div>
              <div className="stat-card gold"><div className="stat-icon gold"><i className="fas fa-gamepad" /></div>
                <div className="stat-info"><div className="stat-value">{data.challengeResults.length}</div><div className="stat-label">Challenge o'yinlar</div></div></div>
              <div className={`stat-card ${pending.length > 0 ? 'red' : ''}`}><div className={`stat-icon ${pending.length > 0 ? 'red' : 'green'}`}>
                <i className={`fas fa-${pending.length > 0 ? 'exclamation-circle' : 'check-circle'}`} /></div>
                <div className="stat-info"><div className="stat-value">{data.payments.filter(p => p.status === 'paid').length}</div><div className="stat-label">To'langan oylar</div></div></div>
            </div>
            <div className="grid-2-1 animate-in stagger-2" style={{ gap: 20, marginBottom: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📊 Ball Dinamikasi</div></div>
                <div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">⭐ So'nggi Baholar</div>
                <a href="#scores" onClick={e => { e.preventDefault(); setPage('scores'); }} style={{ fontSize: 13, color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Barchasi</a></div>
                <div className="card-body" style={{ paddingTop: 8 }}>
                  {lastScores.length === 0 ? <div className="empty-state"><div className="empty-state-icon">📝</div><div className="empty-state-title">Hali baho yo'q</div></div> :
                    lastScores.map(s => (
                      <div key={s.id} className="activity-item">
                        <div className="activity-icon" style={{ background: s.score > 0 ? 'rgba(102,187,106,0.1)' : 'rgba(239,83,80,0.1)' }}>
                          <span style={{ fontSize: 18, fontWeight: 800, color: s.score > 0 ? 'var(--success)' : 'var(--danger)' }}>{s.score > 0 ? '+' : ''}{s.score}</span>
                        </div>
                        <div className="activity-content">
                          <div className="activity-text">{s.lesson_topic || 'Dars'}</div>
                          <div className="activity-time">{s.group_name} · {formatDate(s.date)}</div>
                        </div>
                      </div>
                    ))}
                </div>
              </div>
            </div>
            <div className="grid-2 animate-in stagger-3" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📅 Bugungi Darslar</div></div>
                <div className="card-body">
                  {todayGroups.length === 0 ? <div className="empty-state"><div className="empty-state-icon">☀️</div><div className="empty-state-title">Bugun dars yo'q</div><div className="empty-state-desc">Dam oling!</div></div> :
                    todayGroups.map(g => (
                      <div key={g.id} className="lesson-card">
                        <div className="lesson-time"><div className="lesson-time-start">{g.start_time || '09:00'}</div><div className="lesson-time-end">{g.end_time || '11:00'}</div></div>
                        <div className="lesson-divider" />
                        <div className="lesson-info"><div className="lesson-subject">{SUBJECT_ICONS[g.subject] || '📚'} {g.subject}</div>
                          <div className="lesson-details"><span className="lesson-detail-item"><i className="fas fa-chalkboard-teacher" /> {g.teacher_name}</span>
                            <span className="lesson-detail-item"><i className="fas fa-door-open" /> {g.room}</span></div></div>
                      </div>
                    ))}
                </div>
              </div>
              <div className="card"><div className="card-header"><div className="card-title">💳 To'lov Holati</div></div>
                <div className="card-body">
                  {data.payments.length === 0 ? <div className="empty-state"><div className="empty-state-icon">💳</div><div className="empty-state-title">To'lov ma'lumoti yo'q</div></div> :
                    <div className="payment-timeline">
                      {[...data.payments].sort((a, b) => new Date(b.paid_date || 0) - new Date(a.paid_date || 0)).slice(0, 4).map(p => {
                        const badge = getPaymentBadgeInfo(p.status);
                        return (
                          <div key={p.id} className="payment-item">
                            <div className={`payment-dot ${p.status}`}><i className={`fas fa-${p.status === 'paid' ? 'check' : p.status === 'pending' ? 'clock' : 'exclamation'}`} /></div>
                            <div className="payment-content">
                              <div className="payment-month">{p.month} {p.year} — {p.subject}</div>
                              <div className="payment-amount">{formatCurrency(p.amount)}</div>
                              <div className="payment-date">{p.status === 'paid' ? formatDate(p.paid_date) : <span className={`badge ${badge.class}`}><i className={`fas ${badge.icon}`} /> {badge.text}</span>}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>}
                </div>
              </div>
            </div>
          </>
        ) : page === 'schedule' ? (
          <>
            <div className="page-header"><div className="page-title">📅 Dars Jadvali</div><div className="page-subtitle">Haftalik dars jadvalingiz</div></div>
            {data.myGroups.length === 0 ? <div className="empty-state card"><div className="empty-state-icon">📅</div><div className="empty-state-title">Hali gruppalarga qo'shilmagan</div></div> :
              data.myGroups.map(group => (
                <div key={group.id} className="card animate-in" style={{ marginBottom: 16 }}>
                  <div className="card-header"><div className="card-title">{SUBJECT_ICONS[group.subject] || '📚'} {group.name}</div><span className="badge badge-primary">{group.stage}</span></div>
                  <div className="card-body">
                    <div className="grid-2" style={{ gap: 16 }}>
                      <div>
                        <div className="group-info-row"><i className="fas fa-chalkboard-teacher" /> <strong>O'qituvchi:</strong> {group.teacher_name}</div>
                        <div className="group-info-row"><i className="fas fa-door-open" /> <strong>Xona:</strong> {group.room}</div>
                        <div className="group-info-row"><i className="fas fa-clock" /> <strong>Vaqt:</strong> {group.start_time} – {group.end_time}</div>
                      </div>
                      <div>
                        <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-secondary)', marginBottom: 8 }}>Dars kunlari:</div>
                        <div className="tags">
                          {(Array.isArray(group.days) ? group.days : (group.days || '').split(',')).map(d => <span key={d} className="tag">{d.trim()}</span>)}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              ))}
          </>
        ) : page === 'scores' ? (
          <>
            <div className="page-header"><div className="page-title">⭐ Mening Baholarim</div></div>
            {(() => {
              const scoresByGroup = {};
              data.scores.forEach(s => { const k = s.group_name || 'Boshqa'; if (!scoresByGroup[k]) scoresByGroup[k] = []; scoresByGroup[k].push(s); });
              const totalPos = data.scores.filter(s => s.score > 0).reduce((a, s) => a + s.score, 0);
              const totalNeg = data.scores.filter(s => s.score < 0).reduce((a, s) => a + s.score, 0);
              return (
                <>
                  <div className="stats-grid animate-in" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="stat-card"><div className="stat-icon primary"><i className="fas fa-calculator" /></div><div className="stat-info"><div className="stat-value">{data.totalScore}</div><div className="stat-label">Jami ball</div></div></div>
                    <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-arrow-up" /></div><div className="stat-info"><div className="stat-value">+{totalPos}</div><div className="stat-label">Qo'shilgan ball</div></div></div>
                    <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-arrow-down" /></div><div className="stat-info"><div className="stat-value">{totalNeg}</div><div className="stat-label">Ayirilgan ball</div></div></div>
                  </div>
                  {Object.entries(scoresByGroup).map(([gn, scores]) => (
                    <div key={gn} className="card animate-in" style={{ marginBottom: 20 }}>
                      <div className="card-header"><div className="card-title">📚 {gn}</div><span className="badge badge-primary" style={{ fontSize: 14 }}>Jami: {scores.reduce((a, s) => a + s.score, 0)}</span></div>
                      <div className="card-body" style={{ padding: 0 }}>
                        <div className="table-wrapper"><table className="data-table"><thead><tr><th>Sana</th><th>Mavzu</th><th>Ball</th><th>Izoh</th></tr></thead>
                          <tbody>{[...scores].sort((a, b) => new Date(b.date) - new Date(a.date)).map(s => (
                            <tr key={s.id}><td>{formatDate(s.date)}</td><td><strong>{s.lesson_topic || '—'}</strong></td>
                              <td><span className={`score-indicator ${getScoreClass(s.score)}`}>{s.score > 0 ? '+' : ''}{s.score}</span></td>
                              <td style={{ color: 'var(--text-muted)', fontSize: 13 }}>{s.comment || '—'}</td></tr>
                          ))}</tbody></table></div>
                      </div>
                    </div>
                  ))}
                </>
              );
            })()}
          </>
        ) : page === 'ranking' ? (
          <>
            <div className="page-header"><div className="page-title">🏆 Reyting</div><div className="page-subtitle">Gruppadagi o'rningiz</div></div>
            {rankingData ? data.myGroups.map(group => {
              const groupScores = {};
              rankingData.filter(s => s.group_id === group.id).forEach(s => {
                if (!groupScores[s.student_id]) groupScores[s.student_id] = { name: s.student_name, score: 0 };
                groupScores[s.student_id].score += s.score;
              });
              const sorted = Object.entries(groupScores).map(([sid, d]) => ({ sid, ...d })).sort((a, b) => b.score - a.score);
              const myRank = sorted.findIndex(s => s.sid === user.id) + 1;
              return (
                <div key={group.id} className="card animate-in" style={{ marginBottom: 20 }}>
                  <div className="card-header"><div className="card-title">🏆 {group.name}</div>{myRank > 0 && <span className="badge badge-gold">{myRank}-o'rin</span>}</div>
                  <div className="card-body">
                    <div className="ranking-list">
                      {sorted.slice(0, 10).map((s, i) => (
                        <div key={s.sid} className={`ranking-item ${s.sid === user.id ? 'me' : ''}`}>
                          <span className="rank-number">{getRankBadge(i + 1)}</span>
                          <div className="rank-info"><div className="rank-name">{s.name} {s.sid === user.id ? '(Siz)' : ''}</div><div className="rank-detail">{group.subject}</div></div>
                          <div className="rank-score">{s.score}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            }) : <div className="spinner spinner-lg" />}
          </>
        ) : page === 'payments' ? (
          <>
            <div className="page-header"><div className="page-title">💳 To'lovlar</div></div>
            {(() => {
              const overdue = data.payments.filter(p => p.status === 'overdue');
              const pendingP = data.payments.filter(p => p.status === 'pending');
              const paid = data.payments.filter(p => p.status === 'paid');
              return (
                <>
                  {overdue.length > 0 && <div className="alert alert-danger animate-in"><i className="fas fa-exclamation-triangle" /><div><strong>Diqqat!</strong> {overdue.length} ta to'lovning muddati o'tgan.</div></div>}
                  <div className="stats-grid animate-in" style={{ gridTemplateColumns: 'repeat(3,1fr)' }}>
                    <div className="stat-card green"><div className="stat-icon green"><i className="fas fa-check-circle" /></div><div className="stat-info"><div className="stat-value">{paid.length}</div><div className="stat-label">To'langan</div></div></div>
                    <div className="stat-card"><div className="stat-icon gold"><i className="fas fa-clock" /></div><div className="stat-info"><div className="stat-value">{pendingP.length}</div><div className="stat-label">Kutilmoqda</div></div></div>
                    <div className="stat-card red"><div className="stat-icon red"><i className="fas fa-exclamation-circle" /></div><div className="stat-info"><div className="stat-value">{overdue.length}</div><div className="stat-label">Muddati o'tgan</div></div></div>
                  </div>
                  <div className="card animate-in"><div className="card-header"><div className="card-title">📋 To'lovlar Tarixi</div></div>
                    <div className="card-body" style={{ padding: 0 }}>
                      <div className="table-wrapper"><table className="data-table"><thead><tr><th>Oy</th><th>Fan</th><th>Summa</th><th>Sana</th><th>Holat</th></tr></thead>
                        <tbody>{[...data.payments].sort((a, b) => b.year - a.year || MONTHS.indexOf(b.month) - MONTHS.indexOf(a.month)).map(p => {
                          const badge = getPaymentBadgeInfo(p.status);
                          return <tr key={p.id}><td><strong>{p.month} {p.year}</strong></td><td>{p.subject}</td><td><strong>{formatCurrency(p.amount)}</strong></td>
                            <td>{p.paid_date ? formatDate(p.paid_date) : '—'}</td><td><span className={`badge ${badge.class}`}><i className={`fas ${badge.icon}`} /> {badge.text}</span></td></tr>;
                        })}</tbody></table></div>
                    </div>
                  </div>
                </>
              );
            })()}
          </>
        ) : <div className="empty-state"><div className="empty-state-title">Sahifa topilmadi</div></div>
      }
    </DashboardLayout>
  );
}
