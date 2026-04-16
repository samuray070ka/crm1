import React, { useState, useEffect, useRef } from 'react';
import { Chart, registerables } from 'chart.js';
import DashboardLayout from '../components/DashboardLayout';
import Modal from '../components/Modal';
import { showToast } from '../components/Toast';
import { useAuth } from '../AuthContext';
import API from '../api';
import { MONTHS, DAYS, SUBJECTS, STAGES, SUBJECT_ICONS, formatDate, getScoreClass, getRankBadge } from '../utils';

Chart.register(...registerables);

export default function TeacherDashboard() { 
  const { user } = useAuth();
  const [page, setPage] = useState('overview');
  const [data, setData] = useState({ myGroups: [], allGroups: [], myScores: [], allScores: [], myStudents: [], allStudents: [], myChallengeQ: [], myEnrollments: [], myWorkPlans: [] });
  const [loading, setLoading] = useState(true);
  const [modal, setModal] = useState(null);
  const chartRef = useRef(null);
  const chartInstance = useRef(null);

  // Score form
  const [scoreGroupId, setScoreGroupId] = useState('');
  const [scoreStudentId, setScoreStudentId] = useState('');
  const [scoreTopic, setScoreTopic] = useState('');
  const [scoreValue, setScoreValue] = useState(5);
  const [scoreComment, setScoreComment] = useState('');
  const [groupStudents, setGroupStudents] = useState([]);

  // Work plan form
  const [wpTitle, setWpTitle] = useState('');
  const [wpDesc, setWpDesc] = useState('');
  const [wpWeeks, setWpWeeks] = useState([{ week: 1, title: '', description: '', resources: '' }]);

  // Challenge form
  const [cqSubject, setCqSubject] = useState(SUBJECTS[0]);
  const [cqStage, setCqStage] = useState(STAGES[0]);
  const [cqQuestion, setCqQuestion] = useState('');
  const [cqOpts, setCqOpts] = useState(['', '', '', '']);
  const [cqCorrect, setCqCorrect] = useState(0);

  useEffect(() => { loadData(); }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [groupsRes, scoresRes, usersRes, cqRes, enrollRes, wpRes] = await Promise.all([
        API.getAll('groups'), API.getAll('scores'), API.getAll('users'), API.getAll('challenge_questions'), API.getAll('enrollments'), API.getAll('work_plans')
      ]);
      const allGroups = groupsRes.data || [];
      const myGroups = allGroups.filter(g => g.teacher_id === user.id);
      const allScores = scoresRes.data || [];
      const myScores = allScores.filter(s => s.teacher_id === user.id);
      const allUsers = usersRes.data || [];
      const allStudents = allUsers.filter(u => u.role === 'student');
      const myChallengeQ = (cqRes.data || []).filter(q => q.created_by === user.id);
      const myGroupIds = myGroups.map(g => g.id);
      const allEnroll = enrollRes.data || [];
      const myEnrollments = allEnroll.filter(e => myGroupIds.includes(e.group_id) && e.is_active);
      const myStudentIds = [...new Set(myEnrollments.map(e => e.student_id))];
      const myStudents = allStudents.filter(s => myStudentIds.includes(s.id));
      const myWorkPlans = (wpRes.data || []).filter(wp => wp.teacher_name === user.full_name || wp.subject === user.subject);
      setData({ myGroups, allGroups, myScores, allScores, allStudents, myStudents, myChallengeQ, myEnrollments, myWorkPlans });
    } catch (e) { console.error(e); }
    setLoading(false);
  };

  // Chart
  useEffect(() => {
    if (page === 'overview' && chartRef.current) {
      if (chartInstance.current) chartInstance.current.destroy();
      const months = MONTHS.slice(0, new Date().getMonth() + 1);
      chartInstance.current = new Chart(chartRef.current, {
        type: 'bar', data: {
          labels: months.map(m => m.slice(0, 3)),
          datasets: [{ label: "Qo'yilgan baholar", data: months.map(m => data.myScores.filter(s => { const d = new Date(s.date); return MONTHS[d.getMonth()] === m && d.getFullYear() === new Date().getFullYear(); }).length),
            backgroundColor: 'rgba(24,75,69,0.7)', borderRadius: 6 }]
        }, options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { grid: { display: false } }, y: { grid: { color: '#f0f0f0' }, ticks: { stepSize: 1 } } } }
      });
    }
  }, [page, data.myScores]);

  const loadGroupStudentsList = async (groupId) => {
    if (!groupId) { setGroupStudents([]); return; }
    const res = await API.getAll('enrollments');
    const enrolled = (res.data || []).filter(e => e.group_id === groupId && e.is_active);
    const sids = enrolled.map(e => e.student_id);
    setGroupStudents(data.allStudents.filter(s => sids.includes(s.id)));
  };

  const handleSaveScore = async () => {
    if (!scoreGroupId || !scoreStudentId) { showToast('Xato', "Gruppa va o'quvchi tanlang", 'error'); return; }
    if (isNaN(scoreValue) || scoreValue < -5 || scoreValue > 5) { showToast('Xato', 'Ball -5 dan +5 gacha', 'error'); return; }
    const group = data.myGroups.find(g => g.id === scoreGroupId);
    const student = data.allStudents.find(s => s.id === scoreStudentId);
    await API.create('scores', {
      student_id: scoreStudentId, student_name: student?.full_name || '', group_id: scoreGroupId,
      group_name: group?.name || '', teacher_id: user.id, subject: group?.subject || user.subject,
      score: parseInt(scoreValue), comment: scoreComment, date: new Date().toISOString(), lesson_topic: scoreTopic
    });
    showToast("Ball qo'yildi!", `${student?.full_name} uchun ${scoreValue > 0 ? '+' : ''}${scoreValue} ball`);
    setModal(null); await loadData();
  };

  const handleSaveChallenge = async () => {
    if (!cqQuestion || !cqOpts[0] || !cqOpts[1]) { showToast('Xato', 'Kamida savol va 2 variant kiriting', 'error'); return; }
    await API.create('challenge_questions', {
      subject: cqSubject, stage: cqStage, question: cqQuestion, options: cqOpts.filter(o => o),
      correct_answer: cqCorrect, points: 2, created_by: user.id, week_number: getCurrentWeekNum(), year: new Date().getFullYear(), is_active: true
    });
    showToast('Savol saqlandi!', `${cqSubject} fani uchun`);
    setCqQuestion(''); setCqOpts(['', '', '', '']); await loadData();
  };

  const handleSaveWorkPlan = async () => {
    if (!wpTitle) { showToast('Xato', 'Sarlavha kiriting', 'error'); return; }
    await API.create('work_plans', {
      subject: user.subject || SUBJECTS[0], teacher_name: user.full_name,
      title: wpTitle, description: wpDesc,
      weeks: wpWeeks.filter(w => w.title), is_active: true,
      created_at: new Date().toISOString(), updated_at: new Date().toISOString()
    });
    showToast('Ish rejasi saqlandi!', wpTitle);
    setWpTitle(''); setWpDesc(''); setWpWeeks([{ week: 1, title: '', description: '', resources: '' }]);
    setModal(null); await loadData();
  };

  const deleteChallenge = async (id) => {
    if (!window.confirm("Savolni o'chirishni tasdiqlaysizmi?")) return;
    await API.delete('challenge_questions', id);
    showToast("O'chirildi", '', 'info'); await loadData();
  };

  const getCurrentWeekNum = () => { const now = new Date(); const start = new Date(now.getFullYear(), 0, 1); return Math.ceil((now - start) / (7 * 24 * 60 * 60 * 1000)); };

  const pageTitles = { 'overview': 'Bosh Sahifa', 'my-groups': 'Mening Gruppalarim', 'all-groups': 'Barcha Gruppalar', 'scores-manage': "Ball Qo'yish", 'teacher-ranking': 'Reyting', 'add-challenge': "Challenge Qo'shish", 'work-plans': 'Ish Rejalari', 'schedule': 'Dars Jadvali' };

  const recentScores = [...data.myScores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 6);

  // Top students helper
  const getTopStudents = () => {
    const ss = {}; data.myScores.forEach(s => { if (!ss[s.student_id]) ss[s.student_id] = { name: s.student_name, score: 0 }; ss[s.student_id].score += s.score; });
    return Object.values(ss).sort((a, b) => b.score - a.score).slice(0, 5);
  };

  return (
    <DashboardLayout activePage={page} onNavigate={setPage} title={pageTitles[page] || 'Sahifa'} subtitle="O'qituvchi paneli">
      {loading ? <div className="loading-spinner" style={{ padding: 40, justifyContent: 'center', width: '100%' }}><div className="spinner spinner-lg" /></div> :
        page === 'overview' ? (
          <>
            <div className="welcome-banner animate-in"><div className="welcome-banner-content">
              <div className="welcome-title">Assalomu alaykum, {user.full_name?.split(' ')[0]}! 👩‍🏫</div>
              <div className="welcome-subtitle">Sizning {data.myGroups.length} ta gruppangiz va {data.myStudents.length} ta o'quvchingiz mavjud</div>
              <div className="welcome-stats">
                <div className="welcome-stat"><div className="welcome-stat-value">{data.myGroups.length}</div><div className="welcome-stat-label">Gruppalarim</div></div>
                <div className="welcome-stat"><div className="welcome-stat-value">{data.myStudents.length}</div><div className="welcome-stat-label">O'quvchilar</div></div>
                <div className="welcome-stat"><div className="welcome-stat-value">{data.myChallengeQ.length}</div><div className="welcome-stat-label">Challenge savollar</div></div>
              </div>
            </div></div>
            <div className="grid-2-1 animate-in stagger-2" style={{ gap: 20, marginBottom: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">📊 Oylik Ball Statistikasi</div></div>
                <div className="card-body"><div className="chart-wrapper"><canvas ref={chartRef} /></div></div></div>
              <div className="card"><div className="card-header"><div className="card-title">📋 So'nggi Baholar</div></div>
                <div className="card-body" style={{ paddingTop: 8 }}>
                  {recentScores.map(s => <div key={s.id} className="activity-item">
                    <div className="activity-icon" style={{ background: s.score > 0 ? 'rgba(102,187,106,0.1)' : 'rgba(239,83,80,0.1)' }}>
                      <span style={{ fontSize: 16, fontWeight: 800, color: s.score > 0 ? 'var(--success)' : 'var(--danger)' }}>{s.score > 0 ? '+' : ''}{s.score}</span></div>
                    <div className="activity-content"><div className="activity-text"><strong>{s.student_name}</strong> — {s.lesson_topic || 'Dars'}</div>
                      <div className="activity-time">{s.group_name} · {formatDate(s.date)}</div></div>
                  </div>)}
                </div></div>
            </div>
            <div className="grid-2 animate-in stagger-3" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">🎓 Gruppalarim</div></div><div className="card-body">
                {data.myGroups.map(g => <div key={g.id} className="group-info-row"><div style={{ fontSize: 20 }}>{SUBJECT_ICONS[g.subject] || '📚'}</div>
                  <div><div style={{ fontWeight: 600, fontSize: 14 }}>{g.name}</div><div style={{ fontSize: 12, color: 'var(--text-muted)' }}>{g.current_students} o'quvchi · {g.start_time}–{g.end_time}</div></div>
                  <span className="badge badge-primary" style={{ marginLeft: 'auto' }}>{g.stage}</span></div>)}</div></div>
              <div className="card"><div className="card-header"><div className="card-title">👥 O'quvchilar Top-5</div></div><div className="card-body">
                <div className="ranking-list">{getTopStudents().map((s, i) => <div key={i} className="ranking-item"><span className="rank-number">{getRankBadge(i + 1)}</span>
                  <div className="rank-info"><div className="rank-name">{s.name}</div></div><div className="rank-score">{s.score}</div></div>)}</div></div></div>
            </div>
          </>
        ) : page === 'scores-manage' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div className="page-title">⭐ Ball Qo'yish</div></div>
              <button className="btn btn-primary" onClick={() => { setScoreGroupId(''); setScoreStudentId(''); setScoreTopic(''); setScoreValue(5); setScoreComment(''); setModal('score'); }}>
                <i className="fas fa-plus" /> Ball Qo'y</button>
            </div>
            {data.myGroups.map(g => {
              const scores = data.myScores.filter(s => s.group_id === g.id);
              const recent = [...scores].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 10);
              return <div key={g.id} className="card animate-in" style={{ marginBottom: 20 }}>
                <div className="card-header"><div className="card-title">{SUBJECT_ICONS[g.subject] || '📚'} {g.name}</div></div>
                <div className="card-body" style={{ padding: 0 }}>
                  {recent.length === 0 ? <div className="empty-state" style={{ padding: 24 }}><div className="empty-state-title">Hali baho yo'q</div></div> :
                    <div className="table-wrapper"><table className="data-table"><thead><tr><th>O'quvchi</th><th>Mavzu</th><th>Ball</th><th>Izoh</th><th>Sana</th></tr></thead>
                      <tbody>{recent.map(s => <tr key={s.id}><td><strong>{s.student_name}</strong></td><td>{s.lesson_topic || '—'}</td>
                        <td><span className={`score-indicator ${getScoreClass(s.score)}`}>{s.score > 0 ? '+' : ''}{s.score}</span></td>
                        <td style={{ fontSize: 13, color: 'var(--text-muted)' }}>{s.comment || '—'}</td><td>{formatDate(s.date)}</td></tr>)}</tbody></table></div>}
                </div></div>;
            })}
          </>
        ) : page === 'add-challenge' ? (
          <>
            <div className="page-header"><div className="page-title">🎮 Challenge Savol Qo'shish</div></div>
            <div className="grid-2-1 animate-in" style={{ gap: 20 }}>
              <div className="card"><div className="card-header"><div className="card-title">➕ Yangi Savol</div></div><div className="card-body">
                <div className="form-group"><label className="form-label">Fan</label><select className="form-input" value={cqSubject} onChange={e => setCqSubject(e.target.value)}>
                  {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_ICONS[s] || ''} {s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Bosqich</label><select className="form-input" value={cqStage} onChange={e => setCqStage(e.target.value)}>
                  {STAGES.map(s => <option key={s} value={s}>{s}</option>)}</select></div>
                <div className="form-group"><label className="form-label">Savol matni</label><textarea className="form-input" rows={3} value={cqQuestion} onChange={e => setCqQuestion(e.target.value)} placeholder="Savol matnini kiriting..." /></div>
                <div style={{ marginBottom: 12 }}><label className="form-label">Javob variantlari</label>
                  {['A', 'B', 'C', 'D'].map((l, i) => <input key={i} type="text" className="form-input" placeholder={`${l} variant`} style={{ marginBottom: 8 }} value={cqOpts[i]} onChange={e => { const o = [...cqOpts]; o[i] = e.target.value; setCqOpts(o); }} />)}</div>
                <div className="form-group"><label className="form-label">To'g'ri javob</label><select className="form-input" value={cqCorrect} onChange={e => setCqCorrect(parseInt(e.target.value))}>
                  <option value={0}>A variant</option><option value={1}>B variant</option><option value={2}>C variant</option><option value={3}>D variant</option></select></div>
                <button className="btn btn-primary btn-block" onClick={handleSaveChallenge}><i className="fas fa-save" /> Savolni Saqlash</button>
              </div></div>
              <div className="card"><div className="card-header"><div className="card-title">📋 Mening Savollarim ({data.myChallengeQ.length})</div></div><div className="card-body" style={{ paddingTop: 8 }}>
                {data.myChallengeQ.length === 0 ? <div className="empty-state"><div className="empty-state-icon">❓</div><div className="empty-state-title">Hali savol yo'q</div></div> :
                  data.myChallengeQ.map(q => <div key={q.id} style={{ padding: 12, background: 'var(--bg-main)', borderRadius: 'var(--radius-md)', marginBottom: 8 }}>
                    <div style={{ fontSize: 13, fontWeight: 600, marginBottom: 4 }}>{q.question?.slice(0, 60)}{q.question?.length > 60 ? '...' : ''}</div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}><span className="badge badge-info">{q.subject}</span><span className="badge badge-primary">{q.stage}</span>
                      <button onClick={() => deleteChallenge(q.id)} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--danger)', fontSize: 12, marginLeft: 'auto' }}><i className="fas fa-trash" /></button></div>
                  </div>)}</div></div>
            </div>
          </>
        ) : page === 'schedule' ? (
          <>
            <div className="page-header"><div className="page-title">🗓️ Dars Jadvali</div></div>
            {DAYS.map(day => {
              const dayGroups = data.myGroups.filter(g => { const ds = Array.isArray(g.days) ? g.days : (g.days || '').split(','); return ds.some(d => d.trim() === day); });
              if (dayGroups.length === 0) return null;
              return <div key={day} className="card animate-in" style={{ marginBottom: 16 }}>
                <div className="card-header"><div className="card-title">📅 {day}</div><span className="badge badge-primary">{dayGroups.length} dars</span></div>
                <div className="card-body">{dayGroups.map(g => <div key={g.id} className="lesson-card">
                  <div className="lesson-time"><div className="lesson-time-start">{g.start_time}</div><div className="lesson-time-end">{g.end_time}</div></div>
                  <div className="lesson-divider" /><div className="lesson-info"><div className="lesson-subject">{SUBJECT_ICONS[g.subject] || '📚'} {g.name}</div>
                    <div className="lesson-details"><span className="lesson-detail-item"><i className="fas fa-door-open" /> {g.room}</span><span className="lesson-detail-item"><i className="fas fa-users" /> {g.current_students} o'quvchi</span></div></div></div>)}</div></div>;
            }).filter(Boolean)}
          </>
        ) : page === 'my-groups' ? (
          <>
            <div className="page-header"><div className="page-title">🎓 Mening Gruppalarim</div></div>
            <div className="grid-2 animate-in" style={{ gap: 20 }}>
              {data.myGroups.map(g => <div key={g.id} className="group-card animate-in">
                <div className="group-card-header"><div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <div><div style={{ fontSize: 18, fontWeight: 800 }}>{SUBJECT_ICONS[g.subject] || '📚'} {g.name}</div><div style={{ fontSize: 13, opacity: 0.8, marginTop: 4 }}>{g.stage}</div></div>
                  <div style={{ textAlign: 'right' }}><div style={{ fontSize: 22, fontWeight: 800 }}>{g.current_students}</div><div style={{ fontSize: 11, opacity: 0.75 }}>O'quvchi</div></div></div></div>
                <div className="group-card-body">
                  <div className="group-info-row"><i className="fas fa-clock" /> {g.start_time} – {g.end_time}</div>
                  <div className="group-info-row"><i className="fas fa-door-open" /> {g.room}</div>
                  <div className="group-info-row"><i className="fas fa-calendar" /><div className="tags" style={{ gap: 4 }}>
                    {(Array.isArray(g.days) ? g.days : (g.days || '').split(',')).map(d => <span key={d} className="tag" style={{ fontSize: 11, padding: '2px 8px' }}>{d.trim()}</span>)}</div></div>
                </div></div>)}
            </div>
          </>
        ) : page === 'all-groups' ? (
          <>
            <div className="page-header"><div className="page-title">📚 Barcha Gruppalar</div></div>
            {(() => { const bySubj = {}; data.allGroups.forEach(g => { if (!bySubj[g.subject]) bySubj[g.subject] = []; bySubj[g.subject].push(g); });
              return Object.entries(bySubj).map(([subj, groups]) => <div key={subj} className="card animate-in" style={{ marginBottom: 20 }}>
                <div className="card-header"><div className="card-title">{SUBJECT_ICONS[subj] || '📚'} {subj}</div><span className="badge badge-primary">{groups.length} gruppa</span></div>
                <div className="card-body" style={{ padding: 0 }}><div className="table-wrapper"><table className="data-table"><thead><tr><th>Nomi</th><th>O'qituvchi</th><th>Bosqich</th><th>O'quvchilar</th><th>Xona</th><th>Vaqt</th></tr></thead>
                  <tbody>{groups.map(g => <tr key={g.id}><td><strong>{g.name}</strong></td><td>{g.teacher_id === user.id ? <span style={{ color: 'var(--primary)', fontWeight: 600 }}>{g.teacher_name} (Siz)</span> : g.teacher_name}</td>
                    <td><span className="badge badge-info">{g.stage}</span></td><td>{g.current_students}/{g.max_students}</td><td>{g.room}</td><td>{g.start_time}–{g.end_time}</td></tr>)}</tbody></table></div></div></div>);
            })()}
          </>
        ) : page === 'work-plans' ? (
          <>
            <div className="page-header" style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div><div className="page-title">📖 Ish Rejalari</div><div className="page-subtitle">O'quv rejalari va dars mavzulari</div></div>
              <button className="btn btn-primary" onClick={() => setModal('add-workplan')}><i className="fas fa-plus" /> Reja Qo'sh</button>
            </div>
            {data.myWorkPlans.length === 0 ? <div className="card animate-in"><div className="card-body"><div className="empty-state"><div className="empty-state-icon">📖</div><div className="empty-state-title">Hali ish rejasi yo'q</div><div className="empty-state-desc">Yangi ish rejasi qo'shish uchun yuqoridagi tugmani bosing</div></div></div></div> :
              data.myWorkPlans.map(wp => {
                const weeks = Array.isArray(wp.weeks) ? wp.weeks : [];
                return <div key={wp.id} className="card animate-in" style={{ marginBottom: 20 }}>
                  <div className="card-header" style={{ flexWrap: 'wrap', gap: 8 }}>
                    <div className="card-title">{SUBJECT_ICONS[wp.subject] || '📚'} {wp.title}</div>
                    <span className="badge badge-primary">{wp.subject}</span>
                  </div>
                  <div className="card-body">
                    {wp.description && <div style={{ marginBottom: 16, color: 'var(--text-secondary)', fontSize: 14 }}>{wp.description}</div>}
                    {weeks.length > 0 && <div className="table-wrapper"><table className="data-table"><thead><tr><th>Hafta</th><th>Mavzu</th><th>Tavsif</th><th>Resurslar</th></tr></thead>
                      <tbody>{weeks.map((w, i) => <tr key={i}><td><strong>{w.week}-hafta</strong></td><td style={{ fontWeight: 600 }}>{w.title}</td><td style={{ fontSize: 13, color: 'var(--text-secondary)' }}>{w.description}</td><td style={{ fontSize: 12 }}>{w.resources || '—'}</td></tr>)}</tbody></table></div>}
                  </div>
                </div>;
              })}
          </>
        ) : page === 'teacher-ranking' ? (
          <>
            <div className="page-header"><div className="page-title">🏆 Reyting</div></div>
            {data.myGroups.map(group => {
              const ranking = {}; data.allScores.filter(s => s.group_id === group.id).forEach(s => {
                if (!ranking[s.student_id]) ranking[s.student_id] = { name: s.student_name, score: 0 }; ranking[s.student_id].score += s.score; });
              const sorted = Object.values(ranking).sort((a, b) => b.score - a.score);
              return <div key={group.id} className="card animate-in" style={{ marginBottom: 20 }}>
                <div className="card-header"><div className="card-title">🏆 {group.name} — {group.stage}</div><span className="badge badge-primary">{sorted.length} o'quvchi</span></div>
                <div className="card-body"><div className="ranking-list">{sorted.slice(0, 10).map((s, i) => <div key={i} className="ranking-item">
                  <span className="rank-number">{getRankBadge(i + 1)}</span><div className="rank-info"><div className="rank-name">{s.name}</div></div><div className="rank-score">{s.score}</div></div>)}</div></div></div>;
            })}
          </>
        ) : <div className="empty-state"><div className="empty-state-title">Sahifa topilmadi</div></div>}

      {modal === 'add-workplan' && (
        <Modal title="Yangi Ish Rejasi" onClose={() => setModal(null)} onSave={handleSaveWorkPlan}>
          <div className="form-group"><label className="form-label">Sarlavha *</label><input type="text" className="form-input" value={wpTitle} onChange={e => setWpTitle(e.target.value)} placeholder="O'quv rejasi nomi" /></div>
          <div className="form-group"><label className="form-label">Tavsif</label><textarea className="form-input" rows={2} value={wpDesc} onChange={e => setWpDesc(e.target.value)} placeholder="Qisqacha tavsif" /></div>
          <div className="form-group"><label className="form-label">Haftalik rejalar</label>
            {wpWeeks.map((w, i) => <div key={i} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 1fr 1fr 40px', gap: 8, marginBottom: 8, alignItems: 'center' }}>
              <span style={{ fontWeight: 700, fontSize: 13, textAlign: 'center' }}>{w.week}-h</span>
              <input type="text" className="form-input" placeholder="Mavzu" value={w.title} onChange={e => { const nw = [...wpWeeks]; nw[i].title = e.target.value; setWpWeeks(nw); }} />
              <input type="text" className="form-input" placeholder="Tavsif" value={w.description} onChange={e => { const nw = [...wpWeeks]; nw[i].description = e.target.value; setWpWeeks(nw); }} />
              <input type="text" className="form-input" placeholder="Resurs" value={w.resources} onChange={e => { const nw = [...wpWeeks]; nw[i].resources = e.target.value; setWpWeeks(nw); }} />
              {i > 0 && <button className="btn btn-ghost btn-sm" style={{ color: 'var(--danger)' }} onClick={() => setWpWeeks(wpWeeks.filter((_, j) => j !== i))}><i className="fas fa-times" /></button>}
            </div>)}
            <button className="btn btn-ghost btn-sm" onClick={() => setWpWeeks([...wpWeeks, { week: wpWeeks.length + 1, title: '', description: '', resources: '' }])}><i className="fas fa-plus" /> Hafta qo'sh</button>
          </div>
        </Modal>
      )}

      {modal === 'score' && (
        <Modal title="Ball Qo'yish" onClose={() => setModal(null)} onSave={handleSaveScore}>
          <div className="form-group"><label className="form-label">Gruppa</label>
            <select className="form-input" value={scoreGroupId} onChange={e => { setScoreGroupId(e.target.value); loadGroupStudentsList(e.target.value); }}>
              <option value="">Gruppa tanlang</option>{data.myGroups.map(g => <option key={g.id} value={g.id}>{g.name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">O'quvchi</label>
            <select className="form-input" value={scoreStudentId} onChange={e => setScoreStudentId(e.target.value)}>
              <option value="">O'quvchi tanlang</option>{groupStudents.map(s => <option key={s.id} value={s.id}>{s.full_name}</option>)}</select></div>
          <div className="form-group"><label className="form-label">Dars mavzusi</label><input type="text" className="form-input" value={scoreTopic} onChange={e => setScoreTopic(e.target.value)} placeholder="Mavzu nomi" /></div>
          <div className="form-group"><label className="form-label">Ball (-5 dan +5 gacha)</label><input type="number" className="form-input" min={-5} max={5} value={scoreValue} onChange={e => setScoreValue(e.target.value)} /></div>
          <div className="form-group"><label className="form-label">Izoh</label><input type="text" className="form-input" value={scoreComment} onChange={e => setScoreComment(e.target.value)} /></div>
        </Modal>
      )}
    </DashboardLayout>
  );
}
