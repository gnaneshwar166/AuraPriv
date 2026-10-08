import { describe, it } from 'node:test';
import assert from 'node:assert';
import { sanitizeText, isValidRoomId, RateLimiter } from '../src/utils/security.js';

describe('Security Utilities & Sanitization Tests', () => {
  it('sanitizes potential HTML injection attacks', () => {
    const raw = '<script>alert("hack")</script><img src="x" onerror="steal()" />';
    const clean = sanitizeText(raw);
    assert.strictEqual(clean.includes('<script>'), false);
    assert.strictEqual(clean.includes('&lt;script&gt;'), true);
  });

  it('validates strictly alphanumeric room IDs', () => {
    assert.strictEqual(isValidRoomId('AB3K9P'), true);
    assert.strictEqual(isValidRoomId('99AABBCC'), true);
    assert.strictEqual(isValidRoomId('invalid!@#$'), false);
    assert.strictEqual(isValidRoomId('<script>'), false);
    assert.strictEqual(isValidRoomId('../../etc/passwd'), false);
  });

  it('enforces rate limits on consecutive requests', () => {
    const limiter = new RateLimiter(1000, 3);
    assert.strictEqual(limiter.isAllowed('ip-test-1'), true);
    assert.strictEqual(limiter.isAllowed('ip-test-1'), true);
    assert.strictEqual(limiter.isAllowed('ip-test-1'), true);
    assert.strictEqual(limiter.isAllowed('ip-test-1'), false, '4th hit within window must be rejected');

    // Separate IP should still be allowed
    assert.strictEqual(limiter.isAllowed('ip-test-2'), true);
  });
});
