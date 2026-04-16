import React, { useState, useEffect, useRef, useCallback } from 'react';
import API from '../api';
import { getCurrentWeek } from '../utils';

export default function ChallengeGame({ user }) {
  const [questions, setQuestions] = useState([]);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [score, setScore] = useState(0);
  const [correct, setCorrect] = useState(0);
  const [started, setStarted] = useState(false); 
  const [finished, setFinished] = useState(false);
  const [timeLeft, setTimeLeft] = useState(10);
  const [weeklyStats, setWeeklyStats] = useState([]);
  const timerRef = useRef(null);
  const QUESTION_TIME = 10;
  const questionsRef = useRef([]);

  const loadQuestions = useCallback(async () => {
    try {
      const [qRes, resRes] = await Promise.all([
        API.getAll('challenge_questions'), API.getAll('challenge_results')
      ]);
      let qs = (qRes.data || []).filter(q => q.is_active && (!user.subject || q.subject === user.subject));
      if (qs.length === 0) qs = (qRes.data || []).filter(q => q.is_active);
      const sliced = qs.slice(0, 10);
      setQuestions(sliced);
      questionsRef.current = sliced;
      setWeeklyStats((resRes.data || []).filter(r => r.student_id === user.id).sort((a, b) => b.week_number - a.week_number));
    } catch (e) { console.error(e); }
  }, [user.id, user.subject]);

  useEffect(() => {
    loadQuestions();
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [loadQuestions]);

  const startTimer = useCallback(() => {
    if (timerRef.current) clearInterval(timerRef.current);
    let t = QUESTION_TIME;
    setTimeLeft(t);
    timerRef.current = setInterval(() => {
      t--;
      setTimeLeft(t);
      if (t <= 0) {
        clearInterval(timerRef.current);
        setCurrentIdx(prev => {
          const next = prev + 1;
          if (next >= questionsRef.current.length) {
            setFinished(true);
            return prev;
          }
          return next;
        });
      }
    }, 1000);
  }, []);

  // Re-start timer when currentIdx changes and game is active
  useEffect(() => {
    if (started && !finished && currentIdx < questionsRef.current.length) {
      startTimer();
    }
    return () => { if (timerRef.current) clearInterval(timerRef.current); };
  }, [currentIdx, started, finished, startTimer]);

  const startGame = () => {
    setStarted(true); setCurrentIdx(0); setScore(0); setCorrect(0); setFinished(false);
    setTimeLeft(QUESTION_TIME);
  };

  const answerQuestion = (optionIndex) => {
    if (finished) return;
    const q = questions[currentIdx];
    const isCorrect = optionIndex === q.correct_answer;
    if (isCorrect) { setScore(s => s + (q.points || 2)); setCorrect(c => c + 1); }
    if (timerRef.current) clearInterval(timerRef.current);
    setTimeout(() => {
      if (currentIdx + 1 >= questions.length) { setFinished(true); }
      else { setCurrentIdx(i => i + 1); }
    }, 400);
  };

  // Save result when finished
  useEffect(() => {
    if (finished && started) {
      API.create('challenge_results', {
        student_id: user.id, student_name: user.full_name,
        subject: user.subject || 'Umumiy', stage: user.stage || 'Bosqich 1',
        week_number: getCurrentWeek(), year: new Date().getFullYear(),
        total_points: score, added_to_score: false, date: new Date().toISOString()
      }).then(() => loadQuestions());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [finished]);

  const resetGame = () => {
    setStarted(false); setFinished(false); setCurrentIdx(0); setScore(0); setCorrect(0);
    if (timerRef.current) clearInterval(timerRef.current);
  };

  const letters = ['A', 'B', 'C', 'D'];
  const q = questions[currentIdx];

  return (
    <div className="challenge-container animate-in">
      <div className="challenge-header-card">
        <div className="challenge-icon">🎮</div>
        <div className="challenge-title">Kunlik Challenge</div>
        <div className="challenge-desc">{user.subject || 'Barcha fanlar'} • {user.stage || 'Bosqich 1'}</div>
        <div style={{ display: 'flex', gap: 16, justifyContent: 'center', marginTop: 20 }}>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{weeklyStats.length}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Haftalik o'yinlar</div>
          </div>
          <div style={{ background: 'rgba(255,255,255,0.12)', borderRadius: 'var(--radius-md)', padding: '12px 20px', border: '1px solid rgba(255,255,255,0.2)' }}>
            <div style={{ fontSize: 22, fontWeight: 800 }}>{weeklyStats.reduce((s, r) => s + (r.total_points || 0), 0)}</div>
            <div style={{ fontSize: 12, opacity: 0.8 }}>Jami challenge ball</div>
          </div>
        </div>
      </div>

      {finished ? (
        <div className="card animate-in">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            <div style={{ fontSize: 64, marginBottom: 16 }}>{score >= 16 ? '🏆' : score >= 12 ? '⭐' : '💪'}</div>
            <div style={{ fontSize: 26, fontWeight: 800, marginBottom: 8 }}>{score >= 16 ? "Zo'r natija!" : score >= 12 ? "Yaxshi!" : "Davom eting!"}</div>
            <div style={{ display: 'flex', gap: 20, justifyContent: 'center', margin: '24px 0', flexWrap: 'wrap' }}>
              <div style={{ padding: '20px 28px', background: 'rgba(24,75,69,0.08)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(24,75,69,0.15)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--primary)' }}>{score}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Ball</div>
              </div>
              <div style={{ padding: '20px 28px', background: 'rgba(102,187,106,0.1)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(102,187,106,0.3)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--success)' }}>{correct}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>To'g'ri javob</div>
              </div>
              <div style={{ padding: '20px 28px', background: 'rgba(239,83,80,0.06)', borderRadius: 'var(--radius-lg)', border: '2px solid rgba(239,83,80,0.15)' }}>
                <div style={{ fontSize: 36, fontWeight: 900, color: 'var(--danger)' }}>{questions.length - correct}</div><div style={{ fontSize: 13, color: 'var(--text-secondary)' }}>Noto'g'ri</div>
              </div>
            </div>
            <button className="btn btn-primary btn-lg" onClick={resetGame}><i className="fas fa-redo" /> Qayta O'ynash</button>
          </div>
        </div>
      ) : started && q ? (
        <div className="animate-in">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16 }}>
            <div style={{ fontSize: 14, fontWeight: 600, color: 'var(--text-secondary)' }}>{currentIdx + 1} / {questions.length} savol</div>
            <div style={{ fontSize: 14, fontWeight: 700, color: 'var(--primary)' }}>Jami: {score} ball</div>
          </div>
          <div className="progress-bar-container"><div className="progress-bar" style={{ width: `${(currentIdx / questions.length) * 100}%` }} /></div>
          <div style={{ textAlign: 'center', marginBottom: 20 }}>
            <div className={`timer-circle ${timeLeft <= 3 ? 'urgent' : ''}`}><div className="timer-value">{timeLeft}</div></div>
          </div>
          <div className="question-card">
            <div className="question-number">Savol {currentIdx + 1}</div>
            <div className="question-text">{q.question}</div>
            <div className="options-grid">
              {(Array.isArray(q.options) ? q.options : []).map((opt, idx) => (
                <button key={idx} className="option-btn" onClick={() => answerQuestion(idx)}>
                  <span className="option-letter">{letters[idx]}</span><span>{opt}</span>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : (
        <div className="card animate-in">
          <div className="card-body" style={{ textAlign: 'center', padding: 40 }}>
            {questions.length === 0 ? (
              <><div style={{ fontSize: 48, marginBottom: 16 }}>😔</div><div style={{ fontSize: 20, fontWeight: 700, marginBottom: 8 }}>Hali savol qo'shilmagan</div></>
            ) : (
              <>
                <div style={{ fontSize: 56, marginBottom: 16 }}>🚀</div>
                <div style={{ fontSize: 22, fontWeight: 800, marginBottom: 12 }}>Challengega tayyor bo'ling!</div>
                <div style={{ color: 'var(--text-secondary)', marginBottom: 24 }}><strong>{questions.length}</strong> ta savol • Har savolga <strong>10 sekund</strong> • To'g'ri javob uchun <strong>2 ball</strong></div>
                <button className="btn btn-primary btn-lg" onClick={startGame}><i className="fas fa-play" /> Challengeni Boshlash</button>
              </>
            )}
          </div>
        </div>
      )}

      {weeklyStats.length > 0 && (
        <div className="card" style={{ marginTop: 24 }}>
          <div className="card-header"><div className="card-title">📋 O'yin Tarixi</div></div>
          <div className="card-body" style={{ padding: 0 }}>
            <div className="table-wrapper"><table className="data-table"><thead><tr><th>Hafta</th><th>Ball</th><th>Bonus (÷7)</th><th>Holat</th></tr></thead>
              <tbody>{weeklyStats.map(r => (
                <tr key={r.id}><td>{r.week_number}-hafta, {r.year}</td><td><strong style={{ color: 'var(--primary)' }}>{r.total_points}</strong>/100</td>
                  <td style={{ fontWeight: 700, color: 'var(--success)' }}>+{Math.floor((r.total_points || 0) / 7)}</td>
                  <td><span className={`badge ${r.added_to_score ? 'badge-success' : 'badge-warning'}`}>{r.added_to_score ? "Qo'shildi" : 'Kutilmoqda'}</span></td></tr>
              ))}</tbody></table></div>
          </div>
        </div>
      )}
    </div>
  );
}
