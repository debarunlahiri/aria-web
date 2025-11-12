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

