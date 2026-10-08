import { describe, it } from 'node:test';
import assert from 'node:assert';
import { ruleBasedAnalyzer } from '../src/privacy/ruleBasedAnalyzer.js';
import { privacyGuardian } from '../src/privacy/privacyGuardian.js';

describe('Privacy Guardian Sensitive Data Detection Tests', () => {
  it('passes normal everyday messages with low risk', async () => {
    const normalTexts = [
      'Can we meet tomorrow at 5?',
      'Let us study for the hackathon together.',
      'The weather is really nice today.'
    ];

    for (const text of normalTexts) {
      const res = await privacyGuardian.analyze(text);
      assert.strictEqual(res.riskLevel, 'low');
      assert.strictEqual(res.detectedTypes.length, 0);
      assert.strictEqual(res.recommendation, 'send');
    }
  });

  it('detects synthetic email addresses', async () => {
    const res = await privacyGuardian.analyze('Please contact me at demo@example.com for notes.');
    assert.ok(res.detectedTypes.includes('Email Address'));
    assert.strictEqual(res.riskLevel, 'medium');
  });

  it('detects synthetic phone numbers', async () => {
    const res = await privacyGuardian.analyze('Reach my demo mobile line at +91 98765 43210.');
    assert.ok(res.detectedTypes.includes('Phone / Mobile Number'));
    assert.strictEqual(res.riskLevel, 'medium');
  });

  it('detects synthetic UPI IDs', async () => {
    const res = await privacyGuardian.analyze('Send payment split to demo.user@okhdfcbank');
    assert.ok(res.detectedTypes.includes('UPI Virtual Payment Address'));
    assert.strictEqual(res.riskLevel, 'medium');
  });

  it('detects synthetic bank account patterns', async () => {
    const res = await privacyGuardian.analyze('Account number for transfer: bank account 4092819283745612');
    assert.ok(res.detectedTypes.includes('Bank Account Number'));
    assert.strictEqual(res.riskLevel, 'high');
    assert.strictEqual(res.recommendation, 'edit');
  });

  it('detects synthetic API keys and tokens', async () => {
    const res = await privacyGuardian.analyze('Here is the token: api_key="DEMO_API_KEY_VALUE_TESTING123"');
    assert.ok(res.detectedTypes.includes('API Key / Secret Token'));
    assert.strictEqual(res.riskLevel, 'high');
  });

  it('detects synthetic passwords', async () => {
    const res = await privacyGuardian.analyze('Server login password: password=DemoSecretPass123!');
    assert.ok(res.detectedTypes.includes('Password / Passphrase'));
    assert.strictEqual(res.riskLevel, 'high');
  });

  it('detects synthetic government IDs', async () => {
    const res = await privacyGuardian.analyze('Demo national ID: 1234 5678 9012');
    assert.ok(res.detectedTypes.includes('Government ID (Aadhaar / PAN / SSN)'));
    assert.strictEqual(res.riskLevel, 'high');
  });

  it('never returns full raw sensitive values in findings preview', async () => {
    const res = await privacyGuardian.analyze('api_key="DEMO_SECRET_TOKEN_987654"');
    for (const finding of res.findings) {
      assert.ok(finding.maskedPreview.includes('****'), 'Finding preview must be masked');
      assert.strictEqual(finding.maskedPreview.includes('DEMO_SECRET_TOKEN_987654'), false);
    }
  });
});
