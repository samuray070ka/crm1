import React from 'react';

export default function Modal({ title, children, onClose, onSave, saveText = 'Saqlash' }) {
  return (
    <div className="modal-overlay" onClick={e => { if (e.target === e.currentTarget) onClose(); }}>
      <div className="modal">
        <div className="modal-header">
          <div className="modal-title">{title}</div>
          <button className="modal-close" onClick={onClose}><i className="fas fa-times" /></button>
        </div>
        <div className="modal-body">{children}</div>
        {onSave && (
          <div style={{ padding: '0 28px 24px', display: 'flex', gap: 12, justifyContent: 'flex-end' }}>
            <button className="btn btn-ghost" onClick={onClose}>Bekor qilish</button>
            <button className="btn btn-primary" onClick={onSave}><i className="fas fa-save" /> {saveText}</button>
          </div>
        )}
      </div>
    </div>
  );
}
