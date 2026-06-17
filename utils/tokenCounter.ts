export function estimateTokenCount(text: string): number {
  if (!text) return 0
  
  // Approximate token count estimation
  // Average: 1 token ≈ 4 characters for English text
  // This is a rough approximation similar to GPT tokenization
  
  // Count words (splitting by whitespace and punctuation)
  const words = text.trim().split(/\s+/).filter(word => word.length > 0)
  
  // Count characters (excluding spaces)
  const charCount = text.replace(/\s/g, '').length
  
  // Hybrid approach: use both word and character count
  // Most accurate approximation for general text
  const wordBasedEstimate = words.length * 1.3
  const charBasedEstimate = charCount / 4
  
  // Take average of both methods
  const estimate = Math.round((wordBasedEstimate + charBasedEstimate) / 2)
  
  return Math.max(1, estimate)
}

export interface ModelPricing {
  inputPerMillion: number
  outputPerMillion: number
}

export const MODEL_PRICING: Record<string, ModelPricing> = {
  'gemini-3.5-flash': {
    inputPerMillion: 1.5,
    outputPerMillion: 9,
  },
  'gemini-3-flash-preview': {
    inputPerMillion: 0.5,
    outputPerMillion: 3,
  },
  'gemini-3.1-pro-preview': {
    inputPerMillion: 2,
    outputPerMillion: 12,
  },
  'deep-research-preview-04-2026': {
    inputPerMillion: 2,
    outputPerMillion: 12,
  },
  'deep-research-max-preview-04-2026': {
    inputPerMillion: 2,
    outputPerMillion: 12,
  },
  'antigravity-preview-05-2026': {
    inputPerMillion: 1.5,
    outputPerMillion: 9,
  },
}

export interface UsageCost {
  inputTokens: number
  outputTokens: number
  inputCost: number
  outputCost: number
  totalCost: number
}

export function calculateUsageCost(
  modelId: string,
  inputTokens: number,
  outputTokens: number
): UsageCost | null {
  const pricing = MODEL_PRICING[modelId]

  if (!pricing) {
    return null
  }

  const inputCost = (inputTokens / 1_000_000) * pricing.inputPerMillion
  const outputCost = (outputTokens / 1_000_000) * pricing.outputPerMillion

  return {
    inputTokens,
    outputTokens,
    inputCost,
    outputCost,
    totalCost: inputCost + outputCost,
  }
}

export function formatCost(cost: number): string {
  if (cost === 0) return '$0.000000'
  if (cost < 0.000001) return '<$0.000001'

  return `$${cost.toFixed(6)}`
}
