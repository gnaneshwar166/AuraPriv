import React, { useState } from 'react';

export default function PrivacyModeToggle({ isEnabled, onToggle }) {
  const [showInfo, setShowInfo] = useState(false);

  return (
    <div className="privacy-mode-control">
      <div className="toggle-wrapper" title="Reduces accidental on-screen exposure of recent messages.">
        <label className="switch">
          <input
            type="checkbox"
            checked={isEnabled}
            onChange={(e) => onToggle(e.target.checked)}
          />
          <span className="slider"></span>
        </label>
        <span className="toggle-label">
          {isEnabled ? '👁️‍🗨️ Privacy Mode: ON' : '👁️ Privacy Mode: OFF'}
        </span>
        <button
          type="button"
          className="info-btn"
          onClick={() => setShowInfo(!showInfo)}
          title="About Privacy Mode"
        >
          ℹ️
        </button>
      </div>

      {showInfo && (
        <div className="privacy-mode-info-card">
          <div className="info-header">
            <strong>About Privacy Mode</strong>
            <button className="close-mini-btn" onClick={() => setShowInfo(false)}>✕</button>
          </div>
          <p>
            When enabled, messages in the chat are visually blurred on your screen to reduce accidental exposure to passersby. You can hover or tap any message to momentarily reveal it.
          </p>
          <div className="honest-limits">
            <span className="limits-title">⚠️ Realistic Limitations:</span>
            <ul>
              <li>This is a UI comfort feature, NOT an encryption mechanism.</li>
              <li>Actual message data sent over the network is unaffected.</li>
              <li>Does NOT prevent screenshots, malware, browser extensions, or physical recording.</li>
            </ul>
          </div>
        </div>
      )}
    </div>
  );
}
