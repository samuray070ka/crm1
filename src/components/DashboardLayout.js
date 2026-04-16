import React, { useState } from 'react';
import Sidebar from './Sidebar';
import Topbar from './Topbar';

export default function DashboardLayout({ activePage, onNavigate, title, subtitle, children }) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="dashboard">
      <Sidebar
        activePage={activePage}
        onNavigate={onNavigate}
        mobileOpen={mobileOpen}
        onClose={() => setMobileOpen(false)}
      />
      <div className="main-content" id="main-content">
        <Topbar title={title} subtitle={subtitle} onMenuClick={() => setMobileOpen(!mobileOpen)} />
        <div className="page-content">
          {children}
        </div>
      </div>
    </div>
  );
}
