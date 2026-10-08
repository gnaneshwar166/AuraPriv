import React, { useState } from 'react';

export default function MessageItem({ message, isOwn, privacyModeActive, memberCount = 1 }) {
  const [isRevealed, setIsRevealed] = useState(false);

  if (message.isSystem) {
    return (
      <div className="message-system-row">
        <span className="system-pill">ℹ️ {message.content}</span>
      </div>
    );
  }

  const shouldBlur = privacyModeActive && !isRevealed;
  const isOpenedByRecipient = isOwn && memberCount >= 2;
  const memberColor = message.userColor || (isOwn ? '#818cf8' : '#38bdf8');
  const avatarEmoji = message.userAvatar || (isOwn ? '💬' : '👥');

  return (
    <div className={`message-row ${isOwn ? 'message-outgoing' : 'message-incoming'}`}>
      <div className="message-card">
        <div className="message-meta">
          <span className="sender-avatar-badge" style={{ backgroundColor: `${memberColor}25`, borderColor: memberColor, color: memberColor }}>
            <span className="avatar-icon">{avatarEmoji}</span>
            <span className="sender-name" style={{ color: memberColor }}>{message.userAlias || 'Anonymous'}</span>
          </span>
          <span className="timestamp">
            {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </span>
        </div>

        <div
          className={`message-body ${shouldBlur ? 'blurred-content' : ''}`}
          onClick={() => privacyModeActive && setIsRevealed(!isRevealed)}
          title={shouldBlur ? 'Click or hover to reveal message' : ''}
        >
          {message.content}
        </div>

        {/* Snapchat-Style Message Status Badge */}
        <div className="snapchat-status-row">
          {isOwn ? (
            isOpenedByRecipient ? (
              <span className="snapchat-badge snap-opened" title="Opened by recipient">
                <span className="snap-icon">▷</span> Opened
              </span>
            ) : (
              <span className="snapchat-badge snap-delivered" title="Delivered to room">
                <span className="snap-icon">▶</span> Delivered
              </span>
            )
          ) : (
            <span className="snapchat-badge snap-received" title="Received text message" style={{ borderColor: `${memberColor}40`, color: memberColor }}>
              <span className="snap-icon">{avatarEmoji}</span> Received
            </span>
          )}

          {shouldBlur && (
            <span className="blur-hint">👁️ Click to peek</span>
          )}
        </div>
      </div>
    </div>
  );
}
