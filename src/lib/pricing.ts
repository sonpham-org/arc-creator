/**
 * Cost estimation for LLM API calls.
 * Prices are per 1M tokens (input/output averaged for simplicity).
 */

interface PricingEntry {
  inputPer1M: number;
  outputPer1M: number;
}

// Pricing table: provider -> model pattern -> cost per 1M tokens
const PRICING: Record<string, Record<string, PricingEntry>> = {
  anthropic: {
    'claude-3-5-sonnet': { inputPer1M: 3, outputPer1M: 15 },
    'claude-3-5-haiku': { inputPer1M: 0.8, outputPer1M: 4 },
    'claude-3-opus': { inputPer1M: 15, outputPer1M: 75 },
    'claude-sonnet-4': { inputPer1M: 3, outputPer1M: 15 },
    'claude-haiku-4': { inputPer1M: 0.8, outputPer1M: 4 },
    'claude-opus-4': { inputPer1M: 15, outputPer1M: 75 },
  },
  openai: {
    'gpt-4o-mini': { inputPer1M: 0.15, outputPer1M: 0.6 },
    'gpt-4o': { inputPer1M: 2.5, outputPer1M: 10 },
    'o1': { inputPer1M: 15, outputPer1M: 60 },
    'o1-preview': { inputPer1M: 15, outputPer1M: 60 },
    'o3-mini': { inputPer1M: 1.1, outputPer1M: 4.4 },
  },
  // Free-tier providers
  groq: {},
  gemini: {},
  mistral: {},
  cerebras: {},
  openrouter: {},
};

/**
 * Estimate the USD cost for a model run.
 * Free-tier providers return $0. Unknown models return $0.
 * Uses a simple heuristic: assumes 30% input / 70% output token split.
 */
export function estimateCost(
  provider: string,
  model: string,
  totalTokens: number
): number {
  const providerPricing = PRICING[provider];
  if (!providerPricing || Object.keys(providerPricing).length === 0) {
    return 0; // Free-tier provider
  }

  // Find matching pricing entry (model name contains the pattern)
  let entry: PricingEntry | null = null;
  for (const [pattern, pricing] of Object.entries(providerPricing)) {
    if (model.includes(pattern)) {
      entry = pricing;
      break;
    }
  }

  if (!entry) return 0; // Unknown model, assume free

  // Estimate split: ~30% input, ~70% output
  const inputTokens = totalTokens * 0.3;
  const outputTokens = totalTokens * 0.7;

  const cost =
    (inputTokens / 1_000_000) * entry.inputPer1M +
    (outputTokens / 1_000_000) * entry.outputPer1M;

  return cost;
}
