import React, { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import { useAuth } from '../AuthContext';
import API from '../api';
import { MONTHS, SUBJECT_ICONS, getRankBadge } from '../utils';

export default function GlobalRanking({ onBack, onNavigate, activePage }) {
  const { user } = useAuth();
  const [data, setData] = useState({ globalRanking: [], monthRanking: [], bySubject: {} });
  const [activeSubject, setActiveSubject] = useState('');
  const [loading, setLoading] = useState(true);
 
  useEffect(() => { loadData(); }, []);
 
  const loadData = async () => {
    try {
      const [scoresRes, challengeRes] = await Promise.all([
        API.getAll('scores'), API.getAll('challenge_results')
      ]);
      const scores = scoresRes.data || [];
      const challengeResults = challengeRes.data || [];
      const now = new Date();

      const studentTotals = {};
      scores.forEach(s => {
        if (!studentTotals[s.student_id]) studentTotals[s.student_id] = { id: s.student_id, name: s.student_name, subject: s.subject, groupName: s.group_name, score: 0, challengeBonus: 0 };
        studentTotals[s.student_id].score += s.score;
      });
      challengeResults.forEach(r => {
        if (r.added_to_score && studentTotals[r.student_id]) studentTotals[r.student_id].challengeBonus += Math.floor((r.total_points || 0) / 7);
      });

      const monthScores = {};
      scores.forEach(s => {
        const d = new Date(s.date);
        if (d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear()) {
          if (!monthScores[s.student_id]) monthScores[s.student_id] = { id: s.student_id, name: s.student_name, subject: s.subject, score: 0 };
          monthScores[s.student_id].score += s.score;
        }
      });

      const globalRanking = Object.values(studentTotals).map(r => ({ ...r, total: r.score + r.challengeBonus })).sort((a, b) => b.total - a.total);
      const monthRanking = Object.values(monthScores).sort((a, b) => b.score - a.score);
      const bySubject = {};
      globalRanking.forEach(r => { if (!bySubject[r.subject]) bySubject[r.subject] = []; bySubject[r.subject].push(r); });
      setData({ globalRanking, monthRanking, bySubject });
      if (Object.keys(bySubject).length > 0) setActiveSubject(Object.keys(bySubject)[0]);
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  const top1 = data.monthRanking[0];
  const myRank = data.globalRanking.findIndex(r => r.id === user.id) + 1;

  return (
    <DashboardLayout activePage={activePage} onNavigate={onNavigate} title="🌍 Umumiy Reyting" subtitle="Barcha fanlar bo'yicha">
      {loading ? <div className="spinner spinner-lg" style={{ margin: '60px auto' }} /> : (
        <>
          <div className="welcome-banner animate-in" style={{ background: 'linear-gradient(135deg,#1a1a2e 0%,#16213e 50%,#0f3460 100%)' }}>
            <div className="welcome-banner-content">
              <div className="welcome-title">🌟 Umumiy Reyting</div>
              <div className="welcome-subtitle">Barcha o'quvchilar — bu oygi raqobat</div>
              <div className="welcome-stats">
                {myRank > 0 && <div className="welcome-stat"><div className="welcome-stat-value">{myRank}</div><div className="welcome-stat-label">Jami reytingdagi o'rningiz</div></div>}
                <div className="welcome-stat"><div className="welcome-stat-value">{data.globalRanking.length}</div><div className="welcome-stat-label">Ishtirokchilar</div></div>
              </div>
            </div>
          </div>

          {top1 && (
            <div className="card animate-in stagger-1" style={{ marginBottom: 20, background: 'linear-gradient(135deg,rgba(255,215,0,0.05),rgba(255,165,0,0.03))', border: '2px solid rgba(255,215,0,0.2)' }}>
              <div className="card-body" style={{ textAlign: 'center', padding: 32 }}>
                <div style={{ fontSize: 48, marginBottom: 8 }}>👑</div>
                <div style={{ fontSize: 13, fontWeight: 600, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: 1, marginBottom: 8 }}>Bu Oygi Birinchi O'rin</div>
                <div style={{ fontSize: 26, fontWeight: 900, color: 'var(--primary-dark)' }}>{top1.name}</div>
                <div style={{ fontSize: 15, color: 'var(--text-secondary)', marginTop: 4 }}>{SUBJECT_ICONS[top1.subject] || ''} {top1.subject}</div>
                <div style={{ fontSize: 40, fontWeight: 900, marginTop: 12 }} className="gold-text">{top1.score}</div>
              </div>
            </div>
          )}

          <div className="grid-2 animate-in stagger-2" style={{ gap: 20, marginBottom: 20 }}>
            <div className="card">
              <div className="card-header"><div className="card-title">🏆 Bu Oygi Reyting</div><span className="badge badge-gold">{MONTHS[new Date().getMonth()]}</span></div>
              <div className="card-body">
                <div className="ranking-list">
                  {data.monthRanking.slice(0, 10).map((r, i) => (
                    <div key={r.id} className={`ranking-item ${r.id === user.id ? 'me' : ''}`}>
                      <span className="rank-number">{getRankBadge(i + 1)}</span>
                      <div className="rank-info"><div className="rank-name">{r.name} {r.id === user.id ? '(Siz)' : ''}</div><div className="rank-detail">{SUBJECT_ICONS[r.subject] || ''} {r.subject}</div></div>
                      <div className="rank-score">{r.score}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
            <div className="card">
              <div className="card-header"><div className="card-title">🌍 Jami Reyting</div></div>
              <div className="card-body">
                <div className="ranking-list">
                  {data.globalRanking.slice(0, 10).map((r, i) => (
                    <div key={r.id} className={`ranking-item ${r.id === user.id ? 'me' : ''}`}>
                      <span className="rank-number">{getRankBadge(i + 1)}</span>
                      <div className="rank-info"><div className="rank-name">{r.name} {r.id === user.id ? '(Siz)' : ''}</div><div className="rank-detail">{SUBJECT_ICONS[r.subject] || ''} {r.subject}</div></div>
                      <div className="rank-score">{r.total}</div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          <div className="card animate-in stagger-3">
            <div className="card-header"><div className="card-title">📚 Fan Bo'yicha Top Reytinglar</div></div>
            <div className="card-body">
              <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginBottom: 20 }}>
                {Object.keys(data.bySubject).map(subj => (
                  <button key={subj} className={`subject-tab ${subj === activeSubject ? 'active' : ''}`} onClick={() => setActiveSubject(subj)}>
                    {SUBJECT_ICONS[subj] || ''} {subj}
                  </button>
                ))}
              </div>
              <div className="ranking-list">
                {(data.bySubject[activeSubject] || []).slice(0, 10).map((r, i) => (
                  <div key={r.id} className={`ranking-item ${r.id === user.id ? 'me' : ''}`}>
                    <span className="rank-number">{getRankBadge(i + 1)}</span>
                    <div className="rank-info"><div className="rank-name">{r.name}</div><div className="rank-detail">{r.groupName}</div></div>
                    <div className="rank-score">{r.total}</div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </>
      )}
    </DashboardLayout>
  );
}
