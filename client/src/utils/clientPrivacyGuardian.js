/**
 * clientPrivacyGuardian.js
 * On-Device Privacy Guardian Analysis Engine
 * Runs 100% locally in the browser before message is broadcasted.
 * Enhanced: Detects numbers/OTPs written as spoken digit-words.
 */

function passesLuhnCheck(numStr) {
  var clean = numStr.replace(/\D/g, '');
  if (clean.length < 13 || clean.length > 19) return false;
  var sum = 0, alternate = false;
  for (var i = clean.length - 1; i >= 0; i--) {
    var digit = parseInt(clean.charAt(i), 10);
    if (alternate) { digit *= 2; if (digit > 9) digit -= 9; }
    sum += digit;
    alternate = !alternate;
  }
  return sum % 10 === 0;
}

var WORD_TO_DIGIT = {
  zero:'0',one:'1',two:'2',three:'3',four:'4',
  five:'5',six:'6',seven:'7',eight:'8',nine:'9',
  nought:'0',oh:'0'
};

var DW_WORDS = 'zero|one|two|three|four|five|six|seven|eight|nine|nought|oh';
var DW = '(?:' + DW_WORDS + ')';

function normalizeWordDigits(text) {
  var runRe = new RegExp('\\b(?:' + DW + '(?:[\\s,\-]+)){3,}' + DW + '\\b', 'gi');
  return text.replace(runRe, function(match) {
    return match.toLowerCase().split(/[\s,\-]+/).filter(Boolean)
      .map(function(w) { return WORD_TO_DIGIT[w] !== undefined ? WORD_TO_DIGIT[w] : w; }).join('');
  });
}

function extractOTPFromWords(text) {
  var CTX = '(?:otp|verification[\\s-]*code|auth(?:entication)?[\\s-]*code|pin[\\s-]*code|2fa[\\s-]*code|passcode|one[\\s-]*time[\\s-]*pass(?:word|code)?)';
  var digitRe = new RegExp('\\b' + CTX + '\\s*(?:is|:|=|was)?\\s*((?:\\d[\\s,\-]*){4,8})', 'i');
  var wordRe = new RegExp('\\b' + CTX + '\\s*(?:is|:|=|was)?\\s*((?:' + DW + '[\\s,\-]*){4,8})', 'i');
  var m1 = text.match(digitRe);
  if (m1) { var d1 = m1[1].replace(/[\s,\-]/g,''); if (d1.length>=4&&d1.length<=8) return d1; }
  var m2 = text.match(wordRe);
  if (m2) {
    var d2 = m2[1].toLowerCase().split(/[\s,\-]+/).filter(Boolean)
      .map(function(w){return WORD_TO_DIGIT[w]!==undefined?WORD_TO_DIGIT[w]:'';}).join('');
    if (d2.length>=4&&d2.length<=8) return d2;
  }
  return null;
}

export var PII_RULES = [
  { type:'credit_card', category:'Credit / Debit Card Number', icon:'💳', risk:'high',
    regex:/\b(?:4[0-9]{12}(?:[0-9]{3})?|5[1-5][0-9]{14}|3[47][0-9]{13}|6(?:011|5[0-9]{2})[0-9]{12})\b/,
    validate:function(m){return passesLuhnCheck(m);},
    suggestion:'Avoid sending financial payment card details over chat.' },
  { type:'bank_account', category:'Bank Account Number', icon:'🏦', risk:'high',
    regex:/(?:\b(?:bank|account|acc|acct|iban|swift|routing)\s*(?:#|num|number|code)?\s*[:=\s]?\s*\d{8,18}\b)/i,
    validate:function(){return true;},
    suggestion:'Consider masking account numbers before sharing.' },
  { type:'upi_id', category:'UPI Payment Virtual Address', icon:'⚡', risk:'medium',
    regex:/\b[a-zA-Z0-9.\-_]{2,64}@(okhdfcbank|okaxis|oksbi|icici|ybl|axl|apl|paytm|upi|[a-zA-Z]{2,30})\b/i,
    validate:function(m){
      var p=m.split('@'); if(p.length!==2) return false;
      var h=p[1].toLowerCase();
      var known=['upi','paytm','okhdfcbank','okaxis','oksbi','icici','ybl','axl','apl','barodampay','federal'];
      return known.some(function(k){return h.includes(k);})||h.length>=3;
    },
    suggestion:'Verify the intended recipient before sharing payment handles.' },
  { type:'api_credential', category:'API Key / Secret Token', icon:'🔑', risk:'high',
    regex:/(?:api[_-]?key|secret|token|bearer|access_token|private_key)\s*[:=]\s*['""]?[a-zA-Z0-9_\-.]{12,}['""]?/i,
    validate:function(){return true;},
    suggestion:'Never transmit production secret keys or tokens over chat.' },
  { type:'password', category:'Password / Passphrase', icon:'🔒', risk:'high',
    regex:/(?:password|passwd|pwd)\s*[:=]\s*\S{6,}/i,
    validate:function(){return true;},
    suggestion:'Use a password manager rather than sending credentials in plain text.' },
  { type:'government_id', category:'Government ID (Aadhaar / PAN / SSN)', icon:'🪪', risk:'high',
    regex:/\b(?:\d{4}\s\d{4}\s\d{4}|[A-Z]{5}[0-9]{4}[A-Z]|\d{3}-\d{2}-\d{4})\b/,
    validate:function(){return true;},
    suggestion:'National identity numbers can be misused for identity theft.' },
  { type:'phone_number', category:'Phone / Mobile Number', icon:'📞', risk:'medium',
    regex:/(?:\+?\d{1,3}[\s-.]?)?(?:\(?\d{2,5}\)?[\s-.]?\d{3,5}[\s-.]?\d{4}|\b[6-9]\d{9}\b|\b\d{10}\b)/,
    validate:function(m){ var d=m.replace(/\D/g,''); return d.length>=10&&d.length<=13; },
    suggestion:'Share telephone numbers only with trusted participants.' },
  { type:'email_address', category:'Email Address', icon:'📧', risk:'medium',
    regex:/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/,
    validate:function(){return true;},
    suggestion:'Be mindful of sharing personal email addresses in temporary rooms.' }
];

var OTP_META = {
  type:'otp_code', category:'OTP / Verification Code', icon:'🔐', risk:'high',
  suggestion:'Never share OTPs or one-time codes — they grant account access to attackers.'
};

export function analyzeMessageClient(text) {
  if (!text||typeof text!=='string') return {isSensitive:false,riskLevel:'low',detectedTypes:[],findings:[],recommendation:'send'};
  var trimmed=text.trim();
  if (trimmed.length<3) return {isSensitive:false,riskLevel:'low',detectedTypes:[],findings:[],recommendation:'send'};
  var findings=[], detectedTypesSet=new Set(), hasHigh=false, hasMed=false;
  var normalized=normalizeWordDigits(trimmed);
  var otpExtracted=extractOTPFromWords(trimmed);
  if (otpExtracted) {
    detectedTypesSet.add(OTP_META.category);
    findings.push({type:OTP_META.type,category:OTP_META.category,icon:OTP_META.icon,risk:OTP_META.risk,
      maskedPreview:otpExtracted.slice(0,1)+'*'.repeat(Math.max(otpExtracted.length-1,3)),
      suggestion:OTP_META.suggestion,detectedVia:'otp-context'});
    hasHigh=true;
  }
  var textsToCheck=[{src:trimmed,via:'literal'}];
  if (normalized!==trimmed) textsToCheck.push({src:normalized,via:'word-form'});
  for (var ri=0;ri<PII_RULES.length;ri++) {
    var rule=PII_RULES[ri];
    if (detectedTypesSet.has(rule.category)) continue;
    for (var ti=0;ti<textsToCheck.length;ti++) {
      var src=textsToCheck[ti].src, via=textsToCheck[ti].via;
      var match=src.match(rule.regex);
      if (match&&rule.validate(match[0])) {
        detectedTypesSet.add(rule.category);
        var snippet=match[0];
        var masked=snippet.length>6?snippet.slice(0,2)+'****'+snippet.slice(-2):'****';
        findings.push({type:rule.type,
          category:via==='word-form'?rule.category+' (spoken as words)':rule.category,
          icon:rule.icon,risk:rule.risk,maskedPreview:masked,
          suggestion:via==='word-form'?'⚠️ Detected as spoken digits. '+rule.suggestion:rule.suggestion,
          detectedVia:via});
        if (rule.risk==='high') hasHigh=true;
        if (rule.risk==='medium') hasMed=true;
        break;
      }
    }
  }
  if (findings.length>0) {
    var riskLevel=hasHigh?'high':hasMed?'medium':'low';
    var recommendation=hasHigh?'edit':hasMed?'review':'send';
    return {isSensitive:true,riskLevel:riskLevel,detectedTypes:Array.from(detectedTypesSet),findings:findings,recommendation:recommendation};
  }
  return {isSensitive:false,riskLevel:'low',detectedTypes:[],findings:[],recommendation:'send'};
}

export function maskSensitiveText(text) {
  var masked=text;
  for (var i=0;i<PII_RULES.length;i++) {
    var rule=PII_RULES[i];
    masked=masked.replace(rule.regex,function(m){
      if (!rule.validate(m)) return m;
      if (m.length<=4) return '****';
      return m.slice(0,2)+'*'.repeat(m.length-4)+m.slice(-2);
    });
  }
  return masked;
}