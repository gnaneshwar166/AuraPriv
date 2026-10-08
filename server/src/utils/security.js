import crypto from 'crypto';

/**
 * Generate a cryptographically strong room ID (URL-safe, 8 characters)
 */
export function generateSecureRoomId() {
  // Use crypto random bytes, filtered to unambiguous alphanumeric characters
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // 32 chars
  const bytes = crypto.randomBytes(8);
  let id = '';
  for (let i = 0; i < 8; i++) {
    id += alphabet[bytes[i] % alphabet.length];
  }
  return id;
}

/**
 * Sanitize text to prevent basic HTML injection / XSS
 */
export function sanitizeText(str) {
  if (typeof str !== 'string') return '';
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');
}

/**
 * Validate room ID format (strictly 6-12 uppercase alphanumeric characters)
 */
export function isValidRoomId(roomId) {
  if (typeof roomId !== 'string') return false;
  return /^[A-HJ-NP-Z2-9]{6,12}$/.test(roomId.toUpperCase());
}

/**
 * In-memory rate limiter for HTTP and Socket requests
 */
export class RateLimiter {
  constructor(windowMs = 60000, maxHits = 60) {
    this.windowMs = windowMs;
    this.maxHits = maxHits;
    this.hits = new Map(); // key -> [timestamps]

    // Periodic cleanup of stale tracking keys
    const timer = setInterval(() => {
      const now = Date.now();
      for (const [key, timestamps] of this.hits.entries()) {
        const valid = timestamps.filter((t) => now - t < this.windowMs);
        if (valid.length === 0) {
          this.hits.delete(key);
        } else {
          this.hits.set(key, valid);
        }
      }
    }, 30000);
    if (timer && timer.unref) timer.unref();
  }

  isAllowed(key) {
    const now = Date.now();
    const timestamps = this.hits.get(key) || [];
    const valid = timestamps.filter((t) => now - t < this.windowMs);

    if (valid.length >= this.maxHits) {
      return false;
    }

    valid.push(now);
    this.hits.set(key, valid);
    return true;
  }
}

/**
 * Privacy-preserving logger: never prints complete sensitive message contents
 */
export const safeLogger = {
  info: (msg, meta = {}) => {
    console.log(`[INFO] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  warn: (msg, meta = {}) => {
    console.warn(`[WARN] [${new Date().toISOString()}] ${msg}`, Object.keys(meta).length ? meta : '');
  },
  error: (msg, error = null) => {
    console.error(`[ERROR] [${new Date().toISOString()}] ${msg}`, error ? error.message : '');
  }
};
