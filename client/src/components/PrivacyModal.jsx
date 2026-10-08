import React from 'react';

export default function PrivacyModal({
  isOpen,
  detection,
  onEdit,
  onCancel,
  onSendAnyway
}) {
  if (!isOpen || !detection) return null;

  const riskClass = `risk-${detection.riskLevel?.toLowerCase() || 'medium'}`;

  return (
    <div className="modal-overlay" role="dialog" aria-modal="true">
      <div className="modal-container">
        {/* Header */}
        <div className="modal-header">
          <div className="modal-icon">⚠️</div>
          <div>
            <h3 className="modal-heading">Privacy Guardian</h3>
            <p className="modal-subheading">Potentially sensitive information detected.</p>
          </div>
        </div>

        {/* Local Analysis Callout */}
        <div className="local-callout">
          <span className="callout-icon">🔒</span>
          <div>
            <strong>Analyzed On-Device</strong>
            <p>This message was evaluated locally in your browser. It has not been sent yet.</p>
          </div>
        </div>

        {/* Risk Summary */}
        <div className="modal-details">
          <div className="meta-row">
            <span className="meta-label">Risk Level:</span>
            <span className={`risk-tag ${riskClass}`}>
              {detection.riskLevel?.toUpperCase() || 'MEDIUM'}
            </span>
          </div>

          <div className="meta-row">
            <span className="meta-label">Detected Categories:</span>
            <div className="categories-list">
              {detection.detectedTypes?.map((cat, idx) => (
                <span key={idx} className="category-tag">{cat}</span>
              ))}
            </div>
          </div>

          {detection.findings && detection.findings.length > 0 && (
            <div className="findings-section">
              <span className="findings-label">Flagged Preview:</span>
              <ul className="findings-list">
                {detection.findings.map((f, i) => (
                  <li key={i} className="finding-item">
                    <span className="finding-category"><strong>{f.category}:</strong></span>
                    <code className="finding-preview">{f.maskedPreview}</code>
                    <span className="finding-suggestion">{f.suggestion}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="recommendation-box">
            <span className="rec-icon">💡</span>
            <span>Recommendation: <strong>Review this message before sharing.</strong></span>
          </div>
        </div>

        <p className="modal-disclaimer">
          The Privacy Guardian provides a recommendation. You decide what to send.
        </p>

        {/* Action Buttons: [Edit] is preferred visual action */}
        <div className="modal-actions">
          <button className="btn btn-primary btn-edit-preferred" onClick={onEdit} autoFocus>
            ✏️ Edit Message
          </button>
          <button className="btn btn-outline" onClick={onCancel}>
            Cancel
          </button>
          <button className="btn btn-danger-ghost" onClick={onSendAnyway}>
            Send Anyway
          </button>
        </div>
      </div>
    </div>
  );
}
