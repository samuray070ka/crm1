import { useState, useCallback } from 'react';

let _showToast = () => {};

export function showToast(title, message = '', type = 'success') {
  _showToast({ title, message, type, id: Date.now() });
}

export default function ToastContainer() {
  const [toasts, setToasts] = useState([]);

  _showToast = useCallback((toast) => {
    setToasts(prev => [...prev, toast]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== toast.id));
    }, 4000);
  }, []);

  const iconMap = {
    success: { icon: 'fa-check-circle', color: '#66BB6A' },
    error: { icon: 'fa-times-circle', color: '#EF5350' },
    info: { icon: 'fa-info-circle', color: '#29B6F6' },
    warning: { icon: 'fa-exclamation-triangle', color: '#FFA726' },
  };

  return (
    <div style={{ position: 'fixed', top: 20, right: 20, zIndex: 10000, display: 'flex', flexDirection: 'column', gap: 8 }}>
      {toasts.map(t => {
        const ic = iconMap[t.type] || iconMap.info;
        return (
          <div key={t.id} className="notification-toast">
            <div className={`toast-icon toast-${t.type}`}>
              <i className={`fas ${ic.icon}`} style={{ color: ic.color }} />
            </div>
            <div className="toast-content">
              <div className="toast-title">{t.title}</div>
              {t.message && <div className="toast-message">{t.message}</div>}
            </div>
            <button onClick={() => setToasts(prev => prev.filter(x => x.id !== t.id))}
              style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', fontSize: 18, padding: 0 }}>
              &times;
            </button>
          </div>
        );
      })}
    </div>
  );
}
