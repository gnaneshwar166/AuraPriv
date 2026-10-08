import React, { useState, useRef, useEffect } from 'react';
import { useCountdown } from '../hooks/useCountdown';
import { useSocketChat } from '../hooks/useSocketChat';
import { analyzeMessageClient } from '../utils/clientPrivacyGuardian';
import MessageItem from '../components/MessageItem';
import PrivacyModal from '../components/PrivacyModal';
import PrivacyModeToggle from '../components/PrivacyModeToggle';
import DemoBar from '../components/DemoBar';

export default function ChatRoomPage({
  roomMetadata,
  senderId,
  userAlias,
  onLeaveRoom,
  onRoomExpired
}) {
  const [inputText, setInputText] = useState('');
  const [privacyModeActive, setPrivacyModeActive] = useState(false);
  const [copySuccess, setCopySuccess] = useState(false);

  // Group Member 10-Identity Switcher State
  const [activeMemberId, setActiveMemberId] = useState(1);
  const [activeMemberProfile, setActiveMemberProfile] = useState({
    id: 1, name: 'Member 1 (Alex)', avatar: '🦊', color: '#38bdf8'
  });

  // Privacy Guardian modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [activeDetection, setActiveDetection] = useState(null);
  const [pendingContent, setPendingContent] = useState('');

  const messagesEndRef = useRef(null);

  // Countdown hook using server-authoritative expiresAt
  const { formattedTime, isExpired, isUrgent } = useCountdown(
    roomMetadata.expiresAt,
    onRoomExpired
  );

  // Real-time chat socket hook
  const {
    messages,
    isConnected,
    connectionError,
    memberCount,
    isCreator,
    forcedPrivacyMode,
    typingUsers,
    sendTyping,
    sendStopTyping,
    sendMessage,
    toggleCreatorPrivacy
  } = useSocketChat(
    roomMetadata.roomId,
    senderId,
    userAlias,
    onRoomExpired
  );

  // Automatically sync Privacy Mode on Receiver screen when Room Creator toggles it
  useEffect(() => {
    if (forcedPrivacyMode) {
      setPrivacyModeActive(true);
    } else if (!isCreator) {
      setPrivacyModeActive(false);
    }
  }, [forcedPrivacyMode, isCreator]);

  // Handler for Creator Privacy Lock toggle (P2P only)
  const handleToggleCreatorPrivacy = async () => {
    try {
      await toggleCreatorPrivacy(!forcedPrivacyMode);
    } catch (err) {
      alert(err.message || 'Failed to toggle Creator Privacy Mode.');
    }
  };

  // Scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Message submission handler: PIPELINE INTERCEPTION POINT
  const handleSubmit = (e) => {
    e?.preventDefault();
    if (isExpired) return;

    const trimmed = inputText.trim();
    if (!trimmed) return;

    // Run client-side Privacy Guardian
    const analysis = analyzeMessageClient(trimmed);

    if (analysis.isSensitive) {
      // Potentially sensitive content detected: prompt user decision
      setActiveDetection(analysis);
      setPendingContent(trimmed);
      setModalOpen(true);
    } else {
      // Safe: send immediately
      sendValidatedMessage(trimmed);
      setInputText('');
    }
  };

  const sendValidatedMessage = (contentToSend) => {
    const isP2P = roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2;
    const aliasToUse = !isP2P && activeMemberProfile ? activeMemberProfile.name : userAlias;
    const avatarToUse = !isP2P && activeMemberProfile ? activeMemberProfile.avatar : '💬';
    const colorToUse = !isP2P && activeMemberProfile ? activeMemberProfile.color : '#38bdf8';

    sendMessage(contentToSend, aliasToUse, avatarToUse, colorToUse).catch((err) => {
      alert(`Message could not be sent: ${err.message}`);
    });
  };

  // User Choice 1: Edit Message
  const handleEditChoice = () => {
    setModalOpen(false);
    // Keeps text in input so user can edit it
  };

  // User Choice 2: Cancel
  const handleCancelChoice = () => {
    setModalOpen(false);
    setInputText('');
    setPendingContent('');
  };

  // User Choice 3: Send Anyway
  const handleSendAnywayChoice = () => {
    setModalOpen(false);
    sendValidatedMessage(pendingContent);
    setInputText('');
    setPendingContent('');
  };

  // Copy shareable invite URL
  const handleCopyLink = () => {
    const url = `${window.location.origin}?room=${roomMetadata.roomId}`;
    navigator.clipboard.writeText(url).then(() => {
      setCopySuccess(true);
      setTimeout(() => setCopySuccess(false), 2000);
    });
  };

  // Anti-Screenshot & Pitch Blackout Protection State
  const [screenBlackout, setScreenBlackout] = useState(false);
  const [showScreenshotAlert, setShowScreenshotAlert] = useState(false);

  // Screen protection listeners (Instant blackout on window blur, mouse leave, or screenshot key attempt)
  useEffect(() => {
    const handleBlur = () => setScreenBlackout(true);
    const handleFocus = () => setScreenBlackout(false);
    const handleMouseLeave = () => setScreenBlackout(true);
    const handleMouseEnter = () => setScreenBlackout(false);
    const handleVisibilityChange = () => {
      if (document.hidden) setScreenBlackout(true);
      else setScreenBlackout(false);
    };

    const triggerInstantBlackout = () => {
      setScreenBlackout(true);
      setShowScreenshotAlert(true);
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText('').catch(() => {}); // Wipe clipboard payload
      }
      setTimeout(() => setShowScreenshotAlert(false), 3500);
      setTimeout(() => setScreenBlackout(false), 3000); // Pitch blackout screen for 3 seconds
    };

    const handleKeyDown = (e) => {
      // Intercept PrintScreen (key === 'PrintScreen' || keyCode === 44 || key === 'Snapshot')
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.key === 'Snapshot') {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantBlackout();
        return false;
      }
      // Intercept Ctrl+P, Ctrl+S, Win/Cmd+Shift+3/4/5/S, Snipping tool (Shift+Win+S), F12
      if (
        (e.ctrlKey && (e.key === 'p' || e.key === 's' || e.key === 'P' || e.key === 'S')) ||
        (e.metaKey && e.shiftKey) ||
        (e.shiftKey && (e.key === 'S' || e.key === 's')) ||
        (e.key === 'F12')
      ) {
        e.preventDefault();
        e.stopPropagation();
        triggerInstantBlackout();
        return false;
      }
    };

    const handleKeyUp = (e) => {
      if (e.key === 'PrintScreen' || e.keyCode === 44 || e.key === 'Snapshot') {
        e.preventDefault();
        triggerInstantBlackout();
      }
    };

    window.addEventListener('blur', handleBlur);
    window.addEventListener('focus', handleFocus);
    document.addEventListener('mouseleave', handleMouseLeave);
    document.addEventListener('mouseenter', handleMouseEnter);
    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('keydown', handleKeyDown, true);
    window.addEventListener('keyup', handleKeyUp, true);
    document.addEventListener('contextmenu', (e) => e.preventDefault());

    return () => {
      window.removeEventListener('blur', handleBlur);
      window.removeEventListener('focus', handleFocus);
      document.removeEventListener('mouseleave', handleMouseLeave);
      document.removeEventListener('mouseenter', handleMouseEnter);
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('keydown', handleKeyDown, true);
      window.removeEventListener('keyup', handleKeyUp, true);
    };
  }, []);

  return (
    <div className="chatroom-wrapper anti-screenshot-shield">
      {/* 100% PITCH BLACKOUT SCREEN OVERLAY */}
      {screenBlackout && (
        <div className="pitch-blackout-shield">
          <div className="blackout-content">
            <div className="blackout-icon">🚫</div>
            <h2>SCREENSHOT & CAPTURE DENIED</h2>
            <p>Content is hidden during screen capture or window focus loss for 1-on-1 privacy protection.</p>
          </div>
        </div>
      )}

      {/* Dynamic Watermark Overlay */}
      <div className="privacy-watermark-overlay">
        {Array.from({ length: 12 }).map((_, idx) => (
          <span key={idx} className="watermark-text">
            CONFIDENTIAL 1-ON-1 • {roomMetadata.roomId} • {userAlias || 'PRIVACY'}
          </span>
        ))}
      </div>

      {/* Screenshot Interception Toast Warning */}
      {showScreenshotAlert && (
        <div className="screenshot-warning-toast">
          🛑 SCREENSHOT ATTEMPT BLOCKED & BLACKED OUT
        </div>
      )}

      {/* Top Header: Temporary Room Details */}
      <div className="room-header-panel">
        <div className="header-left">
          <span className="room-title-label">
            {(roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2) ? '🔒 P2P 1-on-1' : '👥 Group Room'}
          </span>
          <div className="room-id-tag font-mono">{roomMetadata.roomId}</div>
          {/* Live member count badge */}
          {(() => {
            const isP2P = roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2;
            const maxLimit = roomMetadata.maxParticipants || (isP2P ? 2 : 10);
            const isFull = memberCount >= maxLimit;
            return (
              <span className={`member-count-badge ${isFull ? 'badge-full' : memberCount >= Math.ceil(maxLimit * 0.7) ? 'badge-warn' : 'badge-ok'}`}>
                {isP2P ? '🔒' : '👥'} {memberCount}/{maxLimit} Members
              </span>
            );
          })()}
          <button className="btn btn-outline btn-sm" onClick={handleCopyLink}>
            {copySuccess ? '✓ Copied Link' : '📋 Copy Room Link'}
          </button>
        </div>

        {/* Server Authoritative Expiration Countdown */}
        <div className="header-center">
          <div className="countdown-pill">
            <span className="countdown-icon">⏱️</span>
            <span className={`countdown-clock font-mono ${isUrgent ? 'clock-urgent' : ''}`}>
              {formattedTime}
            </span>
            <span className="countdown-desc">remaining</span>
          </div>
        </div>

        <div className="header-right">
          {/* Creator Privacy Lock (P2P only) */}
          {(roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2) && isCreator && (
            <button
              type="button"
              className={`btn btn-sm ${forcedPrivacyMode ? 'btn-creator-lock-active' : 'btn-outline'}`}
              onClick={handleToggleCreatorPrivacy}
              title="Enforce Privacy Mode ON for both participants in this 1-on-1 room"
              id="creator-privacy-lock-btn"
            >
              {forcedPrivacyMode ? '🔒 Creator Lock: BOTH ON' : '🔒 Force Privacy for Both'}
            </button>
          )}

          <PrivacyModeToggle
            isEnabled={privacyModeActive}
            onToggle={async (val) => {
              setPrivacyModeActive(val);
              // In P2P rooms, if Creator turns Privacy Mode ON or OFF, sync it to receiver as well!
              const isP2P = roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2;
              if (isP2P && isCreator) {
                try {
                  await toggleCreatorPrivacy(val);
                } catch (err) {
                  console.error('Failed to sync creator privacy mode:', err);
                }
              }
            }}
          />
          <button className="btn btn-danger-sm" onClick={onLeaveRoom}>
            Leave Room
          </button>
        </div>
      </div>

      {connectionError && (
        <div className="connection-error-banner">⚠️ {connectionError}</div>
      )}

      {forcedPrivacyMode && (
        <div className="creator-privacy-banner">
          🔒 <strong>Room Creator Privacy Lock Active:</strong> Privacy Mode is forced ON for both participants in this 1-on-1 P2P room.
        </div>
      )}

      {/* Middle: Scrollable Message List */}
      <div className="messages-scroll-area">
        <div className="room-lifecycle-banner">
          <span className="banner-icon">⏳</span>
          <div>
            <strong>Application-Controlled Session Lifetime</strong>
            <p>
              Messages exist solely in volatile memory for the duration of this room. When the countdown hits 00:00, all messages are cleared.
            </p>
          </div>
        </div>

        {messages.map((msg, i) => (
          <MessageItem
            key={msg.messageId || i}
            message={msg}
            isOwn={msg.senderId === senderId}
            privacyModeActive={privacyModeActive}
            memberCount={memberCount}
          />
        ))}

        {/* Snapchat-Style Realtime Typing Indicator */}
        {typingUsers.length > 0 && (
          <div className="snapchat-typing-row">
            <div className="snapchat-typing-bubble">
              <span className="snapchat-typing-ghost">💬</span>
              <span className="snapchat-typing-text">
                <strong>{typingUsers.map(u => u.userAlias).join(', ')}</strong> {typingUsers.length === 1 ? 'is' : 'are'} typing
              </span>
              <span className="snapchat-dots">
                <span className="snap-dot dot1">.</span>
                <span className="snap-dot dot2">.</span>
                <span className="snap-dot dot3">.</span>
              </span>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Development Demo Helper Bar */}
      <DemoBar onSelectDemo={(text) => !isExpired && setInputText(text)} />

      {/* Group Member 10-Identity Switcher Bar */}
      {!(roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2) && (
        <div className="member-identity-bar">
          <span className="identity-bar-title">👥 Text as Member Identity:</span>
          <div className="member-chips-wrapper">
            {[
              { id: 1, name: 'Member 1 (Alex)', avatar: '🦊', color: '#38bdf8' },
              { id: 2, name: 'Member 2 (Blair)', avatar: '🐼', color: '#4ade80' },
              { id: 3, name: 'Member 3 (Charlie)', avatar: '🦁', color: '#c084fc' },
              { id: 4, name: 'Member 4 (Diana)', avatar: '🐯', color: '#f87171' },
              { id: 5, name: 'Member 5 (Ethan)', avatar: '🦅', color: '#facc15' },
              { id: 6, name: 'Member 6 (Fiona)', avatar: '🦄', color: '#f472b6' },
              { id: 7, name: 'Member 7 (George)', avatar: '🐺', color: '#fb923c' },
              { id: 8, name: 'Member 8 (Hannah)', avatar: '🐨', color: '#a78bfa' },
              { id: 9, name: 'Member 9 (Ian)', avatar: '🐸', color: '#34d399' },
              { id: 10, name: 'Member 10 (Julia)', avatar: '🦉', color: '#eab308' }
            ].map((m) => (
              <button
                key={m.id}
                type="button"
                className={`member-chip-btn ${activeMemberId === m.id ? 'active-member' : ''}`}
                style={{
                  borderColor: m.color,
                  backgroundColor: activeMemberId === m.id ? `${m.color}30` : 'rgba(30, 41, 59, 0.6)',
                  color: m.color
                }}
                onClick={() => {
                  setActiveMemberId(m.id);
                  setActiveMemberProfile(m);
                }}
              >
                <span>{m.avatar}</span>
                <span>{m.name}</span>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Bottom: Message Input & Send (or Expired Warning) */}
      <div className="input-bottom-panel">
        {isExpired ? (
          <div className="room-expired-bar">
            <span className="expired-bar-icon">🛑</span>
            <div className="expired-bar-text">
              <strong>This temporary room has expired.</strong>
              <span>New messages and participants are rejected. Active room data is cleared.</span>
            </div>
            <button className="btn btn-primary" onClick={onLeaveRoom}>
              Return Home
            </button>
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="message-form">
            <div className="input-row">
              <input
                type="text"
                className="chat-input-field"
                placeholder="Type a message... Privacy Guardian analyzes on-device before sending."
                value={inputText}
                onChange={(e) => {
                  setInputText(e.target.value);
                  if (e.target.value.trim()) {
                    const isP2P = roomMetadata.roomType === 'p2p' || roomMetadata.maxParticipants === 2;
                    const aliasToUse = !isP2P && activeMemberProfile ? activeMemberProfile.name : userAlias;
                    sendTyping(aliasToUse);
                  } else {
                    sendStopTyping();
                  }
                }}
                disabled={!isConnected || isExpired}
                maxLength={1000}
              />
              <button
                type="submit"
                className="btn btn-primary btn-send"
                disabled={!inputText.trim() || !isConnected || isExpired}
              >
                Send 📤
              </button>
            </div>
            <div className="input-subbar">
              <span className="privacy-scan-indicator">
                <span className="indicator-dot"></span> On-device Privacy Guardian active
              </span>
              <span className="char-count">{inputText.length}/1000</span>
            </div>
          </form>
        )}
      </div>

      {/* Privacy Guardian Warning Modal */}
      <PrivacyModal
        isOpen={modalOpen}
        detection={activeDetection}
        onEdit={handleEditChoice}
        onCancel={handleCancelChoice}
        onSendAnyway={handleSendAnywayChoice}
      />
    </div>
  );
}
