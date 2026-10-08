import React from 'react';

export default function DemoBar({ onSelectDemo }) {
  const demoSnippets = [
    { label: 'Normal Message', text: 'Can we meet tomorrow at 5?' },
    { label: 'Demo Email', text: 'Please contact me at demo@example.com' },
    { label: 'Demo Phone', text: 'My demo number is 9876543210' },
    { label: '📞 Phone as Words', text: 'my number is nine eight seven six five four three two one zero' },
    { label: '🔐 OTP as Words', text: 'verification code four five six seven' },
    { label: 'Demo UPI', text: 'Please send payment to demo.user@upi' },
    { label: 'Demo API Key', text: 'Temporary test key: API_KEY=DEMO_TEST_VALUE_992' },
    { label: 'Demo Bank', text: 'Transfer to demo bank account 4092819283745612' }
  ];


  return (
    <div className="demo-bar-container">
      <span className="demo-bar-label">⚡ Judge Demo Scenarios (Safe Synthetic Data):</span>
      <div className="demo-buttons-wrapper">
        {demoSnippets.map((s, idx) => (
          <button
            key={idx}
            type="button"
            className="demo-chip-btn"
            onClick={() => onSelectDemo(s.text)}
          >
            {s.label}
          </button>
        ))}
      </div>
    </div>
  );
}
