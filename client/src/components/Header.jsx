import React from 'react';

export default function Header({ inRoom, onLeaveRoom }) {
  return (
    <header className="navbar">
      <div className="nav-brand">
        <div className="logo-badge">🛡️</div>
        <div>
          <span className="brand-title">Aura<span className="brand-highlight">Priv</span></span>
          <span className="brand-subtitle">AI-Adaptive Ephemeral Privacy System</span>
        </div>
      </div>

      <div className="nav-controls">
        <div className="guardian-pill" title="Privacy Guardian scans outgoing messages on-device before transmission.">
          <span className="pulse-dot"></span>
          <span className="pill-text">Local Guardian Active</span>
        </div>

        {inRoom && (
          <button className="btn btn-outline-danger btn-sm" onClick={onLeaveRoom}>
            Leave Room
          </button>
        )}
      </div>
    </header>
  );
}
