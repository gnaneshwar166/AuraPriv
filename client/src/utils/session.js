/**
 * session.js
 * Generates volatile client-side anonymous session identifiers.
 * No account, email, phone, or password required.
 */

const STORAGE_KEY = 'aurapriv_anonymous_session';

export function getOrCreateSessionId() {
  try {
    let sessionId = sessionStorage.getItem(STORAGE_KEY);
    if (!sessionId) {
      sessionId = `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
      sessionStorage.setItem(STORAGE_KEY, sessionId);
    }
    return sessionId;
  } catch (err) {
    return `anon_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
  }
}
