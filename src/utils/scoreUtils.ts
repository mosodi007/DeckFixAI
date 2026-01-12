/**
 * Unified score calculation utilities
 * Database stores scores in 0-100 scale
 * Display uses 0-10 scale
 */

/**
 * Normalizes a raw score from database to 0-10 scale
 * Handles both 0-100 and 0-10 scales automatically
 * @param rawScore - Score from database (0-100 or 0-10 scale)
 * @returns Score in 0-10 scale, rounded to 1 decimal
 */
export function normalizeScoreTo0To10(rawScore: number | null | undefined): number {
  if (!rawScore || isNaN(rawScore) || !isFinite(rawScore)) {
    return 0;
  }

  let score: number;
  if (rawScore > 10) {
    // Score is in 0-100 scale, convert to 0-10
    score = rawScore / 10;
  } else {
    // Score is already in 0-10 scale, use as-is
    score = rawScore;
  }

  // Round to 1 decimal and clamp to 0-10
  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

/**
 * Converts a score from 0-10 scale to 0-100 scale (for score circles)
 * @param score0To10 - Score in 0-10 scale
 * @returns Score in 0-100 scale
 */
export function normalizeScoreTo0To100(score0To10: number): number {
  if (!score0To10 || isNaN(score0To10) || !isFinite(score0To10)) {
    return 0;
  }
  return Math.round(score0To10 * 10);
}

/**
 * Formats a score for display (0-10 scale)
 * @param score0To10 - Score in 0-10 scale
 * @returns Formatted score string (e.g., "6.8" or "7.0")
 */
export function formatScore(score0To10: number): string {
  if (!score0To10 || isNaN(score0To10) || !isFinite(score0To10)) {
    return '0.0';
  }
  return parseFloat(score0To10.toFixed(1)).toString();
}

/**
 * Formats a score with suffix for display
 * @param score0To10 - Score in 0-10 scale
 * @param suffix - Suffix to append (e.g., "/10")
 * @returns Formatted score string (e.g., "6.8/10")
 */
export function formatScoreWithSuffix(score0To10: number, suffix: string = '/10'): string {
  return `${formatScore(score0To10)}${suffix}`;
}

