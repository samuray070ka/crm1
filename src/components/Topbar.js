import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../AuthContext';
import { ROLES, getInitials } from '../utils';

export default function Topbar({ title, subtitle, onMenuClick }) {
  const { user, logout } = useAuth();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const dropRef = useRef(null);
  const initials = getInitials(user?.full_name);
  const roleInfo = ROLES[user?.role] || {};
  const date = new Date().toLocaleDateString('uz-UZ', {
    weekday: 'long', day: 'numeric', month: 'long', year: 'numeric'
  });

  useEffect(() => {
    function handleClick(e) {
      if (dropRef.current && !dropRef.current.contains(e.target)) setDropdownOpen(false);
    }
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, []);

  return (
    <div className="topbar">
      <div className="topbar-left">
        <button className="topbar-btn mobile-menu-btn" onClick={onMenuClick}>
          <i className="fas fa-bars" />
        </button>
        <div>
          <div className="topbar-title">{title}</div>
          <div className="topbar-breadcrumb">{subtitle || date}</div>
        </div>
      </div>
      <div className="topbar-right">
        <div className="topbar-btn" style={{ position: 'relative' }}>
          <i className="fas fa-bell" />
          <div className="notification-dot" />
        </div>
        <div className="topbar-user" ref={dropRef} onClick={() => setDropdownOpen(!dropdownOpen)} style={{ position: 'relative' }}>
          <div className="topbar-avatar">{initials}</div>
          <div className="topbar-user-info">
            <div className="topbar-name">{user?.full_name || 'Foydalanuvchi'}</div>
            <div className="topbar-role">{roleInfo.label || user?.role}</div>
          </div>
          <i className="fas fa-chevron-down" style={{ fontSize: 11, color: 'var(--text-muted)', marginLeft: 4 }} />
          {dropdownOpen && (
            <div className="dropdown-menu">
              <div className="dropdown-divider" />
              <div className="dropdown-item danger" onClick={logout}>
                <i className="fas fa-sign-out-alt" /> Chiqish
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
