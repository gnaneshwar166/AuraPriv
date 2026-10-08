import { useState, useEffect } from 'react';

/**
 * useCountdown
 * Derives accurate remaining time from the server-authoritative expiresAt timestamp.
 */
export function useCountdown(expiresAt, onExpired) {
  const [secondsLeft, setSecondsLeft] = useState(() => {
    if (!expiresAt) return 0;
    return Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
  });

  useEffect(() => {
    if (!expiresAt) return;

    const tick = () => {
      const remaining = Math.max(0, Math.floor((expiresAt - Date.now()) / 1000));
      setSecondsLeft(remaining);

      if (remaining <= 0) {
        if (typeof onExpired === 'function') {
          onExpired();
        }
      }
    };

    tick();
    const interval = setInterval(tick, 1000);
    return () => clearInterval(interval);
  }, [expiresAt, onExpired]);

  const minutes = Math.floor(secondsLeft / 60);
  const seconds = secondsLeft % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const isExpired = secondsLeft <= 0;
  const isUrgent = secondsLeft > 0 && secondsLeft <= 120; // last 2 minutes

  return {
    secondsLeft,
    formattedTime,
    isExpired,
    isUrgent
  };
}
