import React, { useState } from 'react';

export default function LandingPage({ onCreateRoom, onJoinRoom, isLoading, error }) {
  const [showJoinInput, setShowJoinInput] = useState(false);
  const [joinRoomId, setJoinRoomId] = useState('');
  const [userAlias, setUserAlias] = useState('');
  const [selectedTtl, setSelectedTtl] = useState(15);
  const [roomType, setRoomType] = useState('group'); // 'p2p' | 'group'

  const handleCreate = (e) => {
    e.preventDefault();
    onCreateRoom(selectedTtl, userAlias.trim() || 'Room Creator', roomType);
  };

  const handleJoin = (e) => {
    e.preventDefault();
    let cleaned = joinRoomId.trim().toUpperCase();
    if (cleaned.includes('/room/')) {
      cleaned = cleaned.split('/room/')[1].substring(0, 8);
    } else if (cleaned.includes('?room=')) {
      cleaned = cleaned.split('?room=')[1].substring(0, 8);
    }
    if (!cleaned) {
      alert('Please enter a valid room ID.');
      return;
    }
    onJoinRoom(cleaned, userAlias.trim() || 'Participant');
  };

  return (
    <div className="landing-container">
      {/* Hero Section */}
      <section className="hero-box">
        <h1 className="hero-title">Private. Temporary. Simple.</h1>
        <p className="hero-subtitle">
          Create a temporary communication room without creating an account.
        </p>

        {error && <div className="error-alert">{error}</div>}

        {/* Room Type Selector */}
        {!showJoinInput && (
          <div className="room-type-selector">
            <p className="room-type-label">Choose Room Type:</p>
            <div className="room-type-cards">
              {/* P2P Card */}
              <div
                className={`room-type-card ${roomType === 'p2p' ? 'room-type-active' : ''}`}
                onClick={() => setRoomType('p2p')}
                id="room-type-p2p"
              >
                <div className="room-type-icon">🔒</div>
                <div className="room-type-name">Person-to-Person</div>
                <div className="room-type-limit">Max 2 Members</div>
                <div className="room-type-desc">
                  Strictly private, 1-on-1 encrypted conversation. No third party can join.
                </div>
                {roomType === 'p2p' && (
                  <div className="room-type-check">✓ Selected</div>
                )}
              </div>

              {/* Group Card */}
              <div
                className={`room-type-card ${roomType === 'group' ? 'room-type-active room-type-active-group' : ''}`}
                onClick={() => setRoomType('group')}
                id="room-type-group"
              >
                <div className="room-type-icon">👥</div>
                <div className="room-type-name">Group Room</div>
                <div className="room-type-limit">Max 10 Members</div>
                <div className="room-type-desc">
                  Ephemeral group chat. Up to 10 participants can join with the invite link.
                </div>
                {roomType === 'group' && (
                  <div className="room-type-check">✓ Selected</div>
                )}
              </div>
            </div>
          </div>
        )}

        <div className="hero-cta-area">
          {!showJoinInput ? (
            <div className="cta-buttons-row">
              <button
                className={`btn btn-lg ${roomType === 'p2p' ? 'btn-p2p' : 'btn-primary'}`}
                onClick={handleCreate}
                disabled={isLoading}
                id="create-room-btn"
              >
                {isLoading
                  ? 'Creating Room...'
                  : roomType === 'p2p'
                  ? '🔒 Create P2P Room'
                  : '👥 Create Group Room'}
              </button>
              <button
                className="btn btn-secondary btn-lg"
                onClick={() => setShowJoinInput(true)}
                id="join-room-btn"
              >
                Join Existing Room
              </button>
            </div>
          ) : (
            <form onSubmit={handleJoin} className="join-form-box">
              <input
                type="text"
                className="form-input font-mono"
                placeholder="Enter 8-character Room ID or Invite Link"
                value={joinRoomId}
                onChange={(e) => setJoinRoomId(e.target.value)}
                autoFocus
                required
              />
              <button type="submit" className="btn btn-primary" disabled={isLoading} id="enter-room-btn">
                {isLoading ? 'Connecting...' : 'Enter Room'}
              </button>
              <button
                type="button"
                className="btn btn-outline"
                onClick={() => setShowJoinInput(false)}
                id="back-btn"
              >
                Back
              </button>
            </form>
          )}

          <div className="alias-optional-row">
            <label htmlFor="aliasInput">Your Alias (Optional — No Account Required):</label>
            <input
              id="aliasInput"
              type="text"
              className="form-input form-input-sm"
              placeholder="e.g. Alice"
              value={userAlias}
              onChange={(e) => setUserAlias(e.target.value)}
            />
            <div className="ttl-select-wrapper">
              <label htmlFor="ttlSelect">Room Lifetime:</label>
              <select
                id="ttlSelect"
                className="form-select form-input-sm"
                value={selectedTtl}
                onChange={(e) => setSelectedTtl(Number(e.target.value))}
              >
                <option value={2}>2 Minutes (Fast Demo)</option>
                <option value={5}>5 Minutes</option>
                <option value={15}>15 Minutes (Standard)</option>
                <option value={30}>30 Minutes</option>
              </select>
            </div>
          </div>
        </div>
      </section>

      {/* 3 Privacy Pillars Cards */}
      <section className="pillars-section">
        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-step">01</span>
            <span className="pillar-phase">BEFORE SHARING</span>
          </div>
          <h3 className="pillar-title">Privacy Guardian</h3>
          <p className="pillar-desc">
            Privacy Guardian checks outgoing messages for potentially sensitive information.
          </p>
          <div className="pillar-meta">
            <span>Runs locally</span>
            <span>Detects PII &amp; credentials</span>
          </div>
        </div>

        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-step">02</span>
            <span className="pillar-phase">DURING SESSION</span>
          </div>
          <h3 className="pillar-title">Privacy Mode</h3>
          <p className="pillar-desc">
            Privacy Mode can reduce accidental on-screen exposure of recent messages.
          </p>
          <div className="pillar-meta">
            <span>On-screen masking</span>
            <span>Hover-to-reveal</span>
          </div>
        </div>

        <div className="pillar-card">
          <div className="pillar-header">
            <span className="pillar-step">03</span>
            <span className="pillar-phase">AFTER SESSION</span>
          </div>
          <h3 className="pillar-title">Ephemeral Expiration</h3>
          <p className="pillar-desc">
            The temporary room expires and application-controlled cleanup removes active room data.
          </p>
          <div className="pillar-meta">
            <span>Authoritative timer</span>
            <span>In-memory purge</span>
          </div>
        </div>
      </section>

      {/* Technical Honesty Disclaimer */}
      <section className="honesty-section">
        <div className="honesty-badge">🛡️ Security Posture</div>
        <p>
          AuraPriv implements application-controlled lifecycle expiration and client-side data minimization.
          We practice defense-in-depth: we do not claim to be 100% unhackable or capable of physical erasure from low-level infrastructure backups.
        </p>
      </section>
    </div>
  );
}
