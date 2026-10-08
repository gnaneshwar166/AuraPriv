import React from 'react';

export default function ExpiredPage({ roomId, onReturnHome }) {
  return (
    <div className="expired-screen-wrapper">
      <div className="expired-panel">
        <div className="expired-graphic">
          <span className="hourglass">⏳</span>
        </div>

        <h2 className="expired-heading">Room Expired &amp; Cleared</h2>
        <p className="expired-subtext">
          The temporary room <code className="room-code-tag">{roomId || 'UNKNOWN'}</code> has reached its expiration time.
        </p>

        <div className="audit-points">
          <div className="point-row">
            <span className="checkmark">✓</span>
            <span>Room URL and access token revoked</span>
          </div>
          <div className="point-row">
            <span className="checkmark">✓</span>
            <span>WebSocket broadcast channel closed</span>
          </div>
          <div className="point-row">
            <span className="checkmark">✓</span>
            <span>Application-controlled cleanup removed active room data</span>
          </div>
          <div className="point-row">
            <span className="checkmark">✓</span>
            <span>0 messages retained in active server memory</span>
          </div>
        </div>

        <button className="btn btn-primary btn-lg" onClick={onReturnHome}>
          Return to Home Page
        </button>
      </div>
    </div>
  );
}
