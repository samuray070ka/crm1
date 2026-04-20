import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { SUBJECTS, SUBJECT_ICONS } from '../utils';

export default function AuthPage() {
  const { login, register } = useAuth();
  const [isLogin, setIsLogin] = useState(true);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false); 

  // Login fields 
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPass, setShowPass] = useState(false);

  // Register fields
  const [regName, setRegName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regPhone, setRegPhone] = useState('');
  const [regParentPhone, setRegParentPhone] = useState('');
  const [regAddress, setRegAddress] = useState('');
  const [regSubject, setRegSubject] = useState('');
  const [regPassword, setRegPassword] = useState('');

  const handleLogin = async (e) => {
    e?.preventDefault();
    if (!email || !password) { setError("Barcha maydonlarni to'ldiring"); return; }
    setLoading(true); setError('');
    try {
      await login(email, password);
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Xatolik yuz berdi");
    }
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e?.preventDefault();
    if (!regName || !regEmail || !regPhone || !regPassword) {
      setError("Majburiy maydonlarni to'ldiring"); return;
    }
    if (regPassword.length < 6) {
      setError("Parol kamida 6 ta belgidan iborat bo'lishi kerak"); return;
    }
    setLoading(true); setError('');
    try {
      await register({
        full_name: regName, email: regEmail, phone: regPhone,
        parent_phone: regParentPhone, address: regAddress,
        subject: regSubject, password_hash: regPassword,
        role: 'student', is_active: true, stage: 'Bosqich 1',
        joined_date: new Date().toISOString()
      });
    } catch (err) {
      setError(err.response?.data?.detail || err.message || "Xatolik");
    }
    setLoading(false);
  };

  const demoLogin = async (demoEmail) => {
    setEmail(demoEmail); setPassword('demo123');
    setLoading(true); setError('');
    try { await login(demoEmail, 'demo123'); }
    catch (err) { setError(err.response?.data?.detail || "Demo kirish xatosi"); }
    setLoading(false);
  };

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-logo">
          <div className="auth-logo-icon">DS</div>
          <div className="auth-logo-text">
            <div className="brand-name">DataSite</div>
            <div className="brand-sub">Academy</div>
          </div>
        </div>

        {isLogin ? (
          <div className="animate-in">
            <h2 className="auth-title">Xush kelibsiz! 👋</h2>
            <p className="auth-subtitle">Hisobingizga kirish uchun ma'lumotlarni kiriting</p>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleLogin}>
              <div className="form-group">
                <label className="form-label">Email manzil</label>
                <div className="input-group">
                  <i className="fas fa-envelope input-icon" />
                  <input type="email" className="form-input" placeholder="example@email.com"
                    value={email} onChange={e => setEmail(e.target.value)} />
                </div>
              </div>
              <div className="form-group">
                <label className="form-label">Parol</label>
                <div className="input-group">
                  <i className="fas fa-lock input-icon" />
                  <input type={showPass ? 'text' : 'password'} className="form-input"
                    placeholder="Parolni kiriting" value={password} onChange={e => setPassword(e.target.value)} />
                </div>
              </div>
              <div style={{ marginBottom: 16 }}>
                <label style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 13, color: 'var(--text-secondary)', cursor: 'pointer' }}>
                  <input type="checkbox" checked={showPass} onChange={() => setShowPass(!showPass)} />
                  Parolni ko'rsatish
                </label>
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                {loading ? <><div className="spinner" style={{ width: 18, height: 18, borderWidth: 2, marginRight: 8 }} /> Kirish...</>
                  : <><i className="fas fa-sign-in-alt" /> Kirish</>}
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 20, color: 'var(--text-secondary)', fontSize: 14 }}>
              Akkauntingiz yo'qmi?{' '}
              <a href="#register" onClick={e => { e.preventDefault(); setIsLogin(false); setError(''); }}
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Ro'yxatdan o'ting</a>
            </div>
          </div>
        ) : (
          <div className="animate-in">
            <h2 className="auth-title">Ro'yxatdan o'ting ✨</h2>
            <p className="auth-subtitle">DataSite Academy'ga xush kelibsiz!</p>
            {error && <div className="alert alert-danger">{error}</div>}
            <form onSubmit={handleRegister}>
              <div className="form-group">
                <label className="form-label">To'liq ism familiya</label>
                <div className="input-group"><i className="fas fa-user input-icon" />
                  <input type="text" className="form-input" placeholder="Ism Familiya" value={regName} onChange={e => setRegName(e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Email manzil</label>
                <div className="input-group"><i className="fas fa-envelope input-icon" />
                  <input type="email" className="form-input" placeholder="email@example.com" value={regEmail} onChange={e => setRegEmail(e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Telefon raqam</label>
                <div className="input-group"><i className="fas fa-phone input-icon" />
                  <input type="tel" className="form-input" placeholder="+998 90 000 00 00" value={regPhone} onChange={e => setRegPhone(e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Ota/Ona telefon raqami</label>
                <div className="input-group"><i className="fas fa-phone-alt input-icon" />
                  <input type="tel" className="form-input" placeholder="+998 90 000 00 00" value={regParentPhone} onChange={e => setRegParentPhone(e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Manzil</label>
                <div className="input-group"><i className="fas fa-map-marker-alt input-icon" />
                  <input type="text" className="form-input" placeholder="Shahar, tuman" value={regAddress} onChange={e => setRegAddress(e.target.value)} /></div>
              </div>
              <div className="form-group">
                <label className="form-label">Fan</label>
                <select className="form-input" value={regSubject} onChange={e => setRegSubject(e.target.value)}>
                  <option value="">Fanini tanlang</option>
                  {SUBJECTS.map(s => <option key={s} value={s}>{SUBJECT_ICONS[s] || ''} {s}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label className="form-label">Parol</label>
                <div className="input-group"><i className="fas fa-lock input-icon" />
                  <input type="password" className="form-input" placeholder="Kamida 6 ta belgi" value={regPassword} onChange={e => setRegPassword(e.target.value)} /></div>
              </div>
              <button className="btn btn-primary btn-block btn-lg" type="submit" disabled={loading}>
                <i className="fas fa-user-plus" /> Ro'yxatdan o'tish
              </button>
            </form>
            <div style={{ textAlign: 'center', marginTop: 20, fontSize: 14, color: 'var(--text-secondary)' }}>
              Allaqachon akkount bormi?{' '}
              <a href="#login" onClick={e => { e.preventDefault(); setIsLogin(true); setError(''); }}
                style={{ color: 'var(--primary)', fontWeight: 600, textDecoration: 'none' }}>Kirish</a>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
