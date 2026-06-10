/**
 * Rough token estimator for French/Arabic text.
 * ~1 token per 4 characters for French, ~1 per 3 for Arabic.
 * Good enough for cost tracking — not exact billing.
 */
export function estimateTokens(text: string): number {
  if (!text) return 0;
  // Count Arabic vs Latin characters
  const arabicChars = (text.match(/[\u0600-\u06FF\u0750-\u077F\u08A0-\u08FF]/g) || []).length;
  const totalChars = text.length;
  const latinChars = totalChars - arabicChars;

  const latinTokens = Math.ceil(latinChars / 4);
  const arabicTokens = Math.ceil(arabicChars / 3);

  return latinTokens + arabicTokens;
}

/**
 * Estimate tokens for a full API call (system + user messages + response).
 */
export function estimateApiTokens(
  systemPrompt: string,
  userMessage: string,
  responseText: string,
  toolResults?: Record<string, unknown>
): { prompt: number; completion: number; total: number } {
  const prompt = estimateTokens(systemPrompt) + estimateTokens(userMessage);

  let completionText = responseText;
  if (toolResults) {
    completionText += ' ' + JSON.stringify(toolResults);
  }
  const completion = estimateTokens(completionText);

  return { prompt, completion, total: prompt + completion };
}
