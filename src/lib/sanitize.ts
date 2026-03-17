/**
 * URL sanitization utilities to prevent DOM-based XSS via protocol injection.
 * Only allows http: and https: protocols — blocks javascript:, data:, vbscript:, etc.
 */
export const isSafeUrl = (url: string): boolean => {
  try {
    const parsed = new URL(url);
    return ['https:', 'http:'].includes(parsed.protocol);
  } catch {
    return false;
  }
};

/**
 * Validates that a Challonge tournament URL slug contains only safe characters.
 * Matches Challonge's own format: alphanumeric + underscores only.
 */
export const isSafeTournamentSlug = (slug: string): boolean => {
  return /^[a-zA-Z0-9_]+$/.test(slug);
};
