/**
 * ruleBasedAnalyzer.js
 * Deterministic rule-based sensitive data detection engine.
 * Baseline privacy risk detector using regular expressions and contextual validation.
 */

// Helper: Luhn checksum validator for credit/debit card numbers
function passesLuhnCheck(numStr) {
  const clean = numStr.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;

  let sum = 0;
  let alternate = false;
  for (let i = clean.length - 1; i >= 0; i--) {
    let digit = parseInt(clean.charAt(i), 10);
    if (alternate) {
      digit *= 2;
      if (digit > 9) digit -= 9;
    }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

export const DETECTOR_RULES = [
  {
    type: 'credit_card',
    label: 'Credit / Debit Card Number',
    risk: 'high',
    regex: /\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    validate: (match) => passesLuhnCheck(match),
    suggestion: 'Avoid sending financial payment card details over chat.'
  },
  {
    type: 'bank_account',
    label: 'Bank Account Number',
    risk: 'high',
    regex: /(?:\b(?:bank|account|acc|acct|iban|swift|routing)\s*(?:#|num|number|code)?\s*[:=\s]?\s*\d{8,18}\b)/i,
    validate: () => true,
    suggestion: 'Consider masking account numbers before sharing.'
  },
  {
    type: 'upi_id',
    label: 'UPI Virtual Payment Address',
    risk: 'medium',
    regex: /\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|icici|ybl|axl|apl|paytm|upi|[a-zA-Z]{2,30})\b/i,
    validate: (match) => {
      const parts = match.split('@');
      if (parts.length !== 2) return false;
      const handle = parts[1].toLowerCase();
      const knownHandles = ['upi', 'paytm', 'okhdfcbank', 'okaxis', 'oksbi', 'icici', 'ybl', 'axl', 'apl', 'barodampay', 'federal'];
      return knownHandles.some((k) => handle.includes(k)) || handle.length >= 3;
    },
    suggestion: 'Verify the intended recipient before sharing payment handles.'
  },
  {
    type: 'api_credential',
    label: 'API Key / Secret Token',
    risk: 'high',
    regex: /(?:api[_-]?key|secret|token|bearer|access_token|private_key)\s*[:=]\s*['"]?[a-zA-Z0-9_\-.]{12,}['"]?/i,
    validate: () => true,
    suggestion: 'Never transmit production secret keys or tokens over chat.'
  },
  {
    type: 'password',
    label: 'Password / Passphrase',
    risk: 'high',
    regex: /(?:password|passwd|pwd)\s*[:=]\s*\S{6,}/i,
    validate: () => true,
    suggestion: 'Use a password manager rather than sending credentials in plain text.'
  },
  {
    type: 'government_id',
    label: 'Government ID (Aadhaar / PAN / SSN)',
    risk: 'high',
    regex: /\b(?:\d{4}\s\d{4}\s\d{4}|[A-Z]{5}[0-9]{4}[A-Z]|\d{3}-\d{2}-\d{4})\b/,
    validate: () => true,
    suggestion: 'National identity numbers can be misused for identity theft.'
  },
  {
    type: 'phone_number',
    label: 'Phone / Mobile Number',
    risk: 'medium',
    regex: /(?:\+?\d{1,3}[\s-.]?)?(?:\(?\d{2,5}\)?[\s-.]?\d{3,5}[\s-.]?\d{4}|\b[6-9]\d{9}\b|\b\d{10}\b)/,
    validate: (match) => {
      const digitsOnly = match.replace(/\D/g, '');
      return digitsOnly.length >= 10 && digitsOnly.length <= 13;
    },
    suggestion: 'Share telephone numbers only with trusted participants.'
  },
  {
    type: 'email_address',
    label: 'Email Address',
    risk: 'medium',
    regex: /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    validate: () => true,
    suggestion: 'Be mindful of sharing personal email addresses in temporary spaces.'
  }
];

export class RuleBasedAnalyzer {
  analyze(text) {
    if (!text || typeof text !== 'string') {
      return {
        riskLevel: 'low',
        detectedTypes: [],
        findings: [],
        recommendation: 'send'
      };
    }

    const trimmed = text.trim();
    if (trimmed.length < 3) {
      return {
        riskLevel: 'low',
        detectedTypes: [],
        findings: [],
        recommendation: 'send'
      };
    }

    const findings = [];
    const detectedTypesSet = new Set();
    let hasHighRisk = false;
    let hasMediumRisk = false;

    for (const rule of DETECTOR_RULES) {
      const match = trimmed.match(rule.regex);
      if (match && rule.validate(match[0])) {
        detectedTypesSet.add(rule.label);

        // Never expose the full raw sensitive value in findings
        const rawSnippet = match[0];
        const maskedPreview = rawSnippet.length > 6
          ? `${rawSnippet.slice(0, 2)}****${rawSnippet.slice(-2)}`
          : '****';

        findings.push({
          type: rule.type,
          category: rule.label,
          risk: rule.risk,
          maskedPreview,
          suggestion: rule.suggestion
        });

        if (rule.risk === 'high') hasHighRisk = true;
        if (rule.risk === 'medium') hasMediumRisk = true;
      }
    }

    let riskLevel = 'low';
    let recommendation = 'send';

    if (hasHighRisk) {
      riskLevel = 'high';
      recommendation = 'edit';
    } else if (hasMediumRisk) {
      riskLevel = 'medium';
      recommendation = 'review';
    }

    return {
      riskLevel,
      detectedTypes: Array.from(detectedTypesSet),
      findings,
      recommendation
    };
  }
}

export const ruleBasedAnalyzer = new RuleBasedAnalyzer();
