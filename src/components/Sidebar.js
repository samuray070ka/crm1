import React, { useState } from 'react';
import { useAuth } from '../AuthContext';
import { ROLES, getInitials } from '../utils';

const NAV_ITEMS = {
  student: [
    { id: 'overview', icon: 'fas fa-home', label: 'Bosh sahifa' },
    { id: 'schedule', icon: 'fas fa-calendar-alt', label: 'Dars jadvali' },
    { id: 'scores', icon: 'fas fa-star', label: 'Baholarim' },
    { id: 'ranking', icon: 'fas fa-trophy', label: 'Reyting' },
    { id: 'challenges', icon: 'fas fa-gamepad', label: 'Kunlik Challenge' },
    { id: 'payments', icon: 'fas fa-credit-card', label: "To'lovlar" },
    { id: 'global-ranking', icon: 'fas fa-globe', label: 'Umumiy Reyting' },
  ],
  teacher: [
    { id: 'overview', icon: 'fas fa-home', label: 'Bosh sahifa' },
    { id: 'my-groups', icon: 'fas fa-users', label: 'Mening Gruppalarim' },
    { id: 'all-groups', icon: 'fas fa-layer-group', label: 'Barcha Gruppalar' },
    { id: 'scores-manage', icon: 'fas fa-pen', label: "Ball Qo'yish" },
    { id: 'teacher-ranking', icon: 'fas fa-chart-bar', label: 'Reyting' },
    { id: 'add-challenge', icon: 'fas fa-plus-circle', label: "Challenge Qo'shish" },
    { id: 'work-plans', icon: 'fas fa-book-open', label: 'Ish Rejalari' },
    { id: 'schedule', icon: 'fas fa-clock', label: 'Dars Jadvali' },
  ],
  admin: [
    { id: 'overview', icon: 'fas fa-tachometer-alt', label: 'Dashboard' },
    { id: 'students', icon: 'fas fa-user-graduate', label: "O'quvchilar" },
    { id: 'teachers', icon: 'fas fa-chalkboard-teacher', label: "O'qituvchilar" },
    { id: 'groups', icon: 'fas fa-layer-group', label: 'Gruppalar' },
    { id: 'add-group', icon: 'fas fa-plus-circle', label: "Gruppa Qo'shish" },
    { id: 'student-payments', icon: 'fas fa-money-bill', label: "O'quvchi To'lovlar" },
    { id: 'teacher-payments', icon: 'fas fa-wallet', label: "O'qituvchi Oylik" },
    { id: 'work-plans-admin', icon: 'fas fa-book', label: 'Ish Rejalari' },
    { id: 'ranking', icon: 'fas fa-trophy', label: 'Reytinglar' },
    { id: 'analytics', icon: 'fas fa-chart-line', label: 'Statistika' },
    { id: 'challenges-admin', icon: 'fas fa-gamepad', label: 'Challenge Nazorat' },
  ],
  director: [
    { id: 'overview', icon: 'fas fa-crown', label: 'Dashboard' },
    { id: 'all-students', icon: 'fas fa-user-graduate', label: "Barcha O'quvchilar" },
    { id: 'all-teachers', icon: 'fas fa-chalkboard-teacher', label: "Barcha O'qituvchilar" },
    { id: 'all-admins', icon: 'fas fa-user-cog', label: 'Adminlar' },
    { id: 'finance', icon: 'fas fa-chart-pie', label: 'Moliya' },
    { id: 'teacher-salaries', icon: 'fas fa-money-check', label: "O'qituvchi Oylik" },
    { id: 'admin-salaries', icon: 'fas fa-hand-holding-usd', label: 'Admin Oylik' },
    { id: 'rankings', icon: 'fas fa-trophy', label: 'Reytinglar' },
    { id: 'full-analytics', icon: 'fas fa-chart-area', label: "To'liq Statistika" },
  ],
};

export default function Sidebar({ activePage, onNavigate, mobileOpen, onClose }) {
  const { user, logout } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const role = user?.role || 'student';
  const items = NAV_ITEMS[role] || [];
  const roleInfo = ROLES[role] || {};
  const initials = getInitials(user?.full_name);

  return (
    <>
      <div className={`mobile-overlay ${mobileOpen ? 'active' : ''}`} onClick={onClose} />
      <aside className={`sidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobile-open' : ''}`}>
        <div className="sidebar-header">
          <div className="sidebar-logo-icon">DS</div>
          <div className="sidebar-logo-text">
            <div className="brand">DataSite</div>
            <div className="academy">Academy</div>
          </div>
        </div>
        <div className="sidebar-user">
          <div className="sidebar-avatar">{initials}</div>
          <div className="sidebar-user-info">
            <div className="sidebar-user-name">{user?.full_name || 'Foydalanuvchi'}</div>
            <div className="sidebar-user-role">{roleInfo.label || role}</div>
          </div>
        </div>
        <nav className="sidebar-nav">
          <div className="nav-section">
            <div className="nav-section-title">Navigatsiya</div>
            {items.map(item => (
              <div
                key={item.id}
                className={`nav-item ${activePage === item.id ? 'active' : ''}`}
                onClick={() => { onNavigate(item.id); if (mobileOpen) onClose(); }}
              >
                <i className={`${item.icon} nav-icon`} />
                <span className="nav-label">{item.label}</span>
              </div>
            ))}
          </div>
        </nav>
        <div className="sidebar-footer">
          <button className="sidebar-toggle" onClick={() => setCollapsed(!collapsed)}>
            <i className={`fas fa-${collapsed ? 'expand-alt' : 'compress-alt'}`} />
            <span>{collapsed ? 'Ochish' : 'Yopish'}</span>
          </button>
          <div style={{ marginTop: 8 }}>
            <button className="sidebar-toggle" onClick={logout} style={{ color: 'rgba(239,83,80,0.8)' }}>
              <i className="fas fa-sign-out-alt" />
              <span>Chiqish</span>
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
