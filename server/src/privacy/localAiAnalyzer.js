import { config } from '../config/index.js';
import { safeLogger } from '../utils/security.js';

/**
 * LocalAiAnalyzer (Optional Ollama Enhancement)
 * Sends message to a local LLM instance if enabled.
 * Falls back silently if Ollama is unreachable.
 */
export class LocalAiAnalyzer {
  constructor(options = config.ollama) {
    this.enabled = options.enabled;
    this.baseUrl = options.baseUrl;
    this.model = options.model;
    this.timeoutMs = options.timeoutMs || 3000;
  }

  async analyze(text) {
    if (!this.enabled || !text) return null;

    const prompt = `You are a privacy safety assistant. Analyze this single message for sensitive information (credentials, authentication secrets, financial information, contact info, government identifiers, API keys/tokens).
Message to inspect: "${text.slice(0, 300)}"

Respond ONLY with valid JSON in this exact structure:
{
  "riskLevel": "LOW" | "MEDIUM" | "HIGH",
  "detectedCategories": ["Category1", "Category2"],
  "reason": "short explanation",
  "recommendation": "send" | "review" | "edit",
  "confidence": 0.0 to 1.0
}`;

    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), this.timeoutMs);

    try {
      const response = await fetch(`${this.baseUrl}/api/generate`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: this.model,
          prompt,
          stream: false,
          format: 'json'
        }),
        signal: controller.signal
      });

      clearTimeout(timer);

      if (!response.ok) {
        safeLogger.warn('Local AI responded with non-200 status', { status: response.status });
        return null;
      }

      const data = await response.json();
      const rawOutput = data.response;
      const parsed = JSON.parse(rawOutput);

      // Validate AI response structure
      const validRisks = ['LOW', 'MEDIUM', 'HIGH'];
      const riskLevel = validRisks.includes(parsed.riskLevel?.toUpperCase())
        ? parsed.riskLevel.toLowerCase()
        : 'low';

      return {
        riskLevel,
        detectedCategories: Array.isArray(parsed.detectedCategories) ? parsed.detectedCategories : [],
        reason: typeof parsed.reason === 'string' ? parsed.reason.slice(0, 200) : '',
        recommendation: ['send', 'review', 'edit'].includes(parsed.recommendation)
          ? parsed.recommendation
          : 'review',
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.8
      };
    } catch (err) {
      clearTimeout(timer);
      // Expected fallback if Ollama service is not running locally
      safeLogger.info('Local AI service unavailable, using rule-based detector as primary.');
      return null;
    }
  }
}

export const localAiAnalyzer = new LocalAiAnalyzer();
