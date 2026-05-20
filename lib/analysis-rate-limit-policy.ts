export const ANALYSIS_RATE_LIMIT_WINDOW_MS = 10 * 60 * 1000;
export const ANALYSIS_RATE_LIMIT_MAX_REQUESTS = 5;
export const RATE_LIMIT_MESSAGE =
  "Забагато запитів на LLM-аналіз. Зачекайте кілька хвилин і повторіть спробу.";

export function isAnalysisRateLimited(recentRequestCount: number) {
  return recentRequestCount >= ANALYSIS_RATE_LIMIT_MAX_REQUESTS;
}
