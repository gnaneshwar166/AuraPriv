import { ruleBasedAnalyzer } from './ruleBasedAnalyzer.js';
import { localAiAnalyzer } from './localAiAnalyzer.js';
import { safeLogger } from '../utils/security.js';

/**
 * PrivacyGuardian
 * Master privacy inspection service.
 * Combines deterministic rule-based analysis (primary baseline)
 * with optional local LLM analysis (Ollama enhancement).
 */
export class PrivacyGuardian {
  constructor(ruleEngine = ruleBasedAnalyzer, aiEngine = localAiAnalyzer) {
    this.ruleEngine = ruleEngine;
    this.aiEngine = aiEngine;
  }

  async analyze(text) {
    // 1. Always run reliable deterministic rule engine
    const baselineResult = this.ruleEngine.analyze(text);

    // 2. If AI engine is enabled, attempt optional enrichment
    try {
      const aiResult = await this.aiEngine.analyze(text);

      if (aiResult) {
        // Merge AI insights with rule-based findings
        const combinedDetectedTypes = Array.from(
          new Set([...baselineResult.detectedTypes, ...aiResult.detectedCategories])
        );

        const riskOrder = { low: 0, medium: 1, high: 2 };
        const highestRisk = riskOrder[aiResult.riskLevel] > riskOrder[baselineResult.riskLevel]
          ? aiResult.riskLevel
          : baselineResult.riskLevel;

        const recommendation = highestRisk === 'high' ? 'edit' : highestRisk === 'medium' ? 'review' : 'send';

        return {
          riskLevel: highestRisk,
          detectedTypes: combinedDetectedTypes,
          findings: baselineResult.findings,
          recommendation,
          aiEnhanced: true
        };
      }
    } catch (err) {
      safeLogger.warn('Local AI analysis failed; strictly using rule-based baseline', { error: err.message });
    }

    return {
      ...baselineResult,
      aiEnhanced: false
    };
  }
}

export const privacyGuardian = new PrivacyGuardian();
