// Patterns that might identify clients, brands, or specific projects
const IDENTIFYING_PATTERNS = [
  // Brand/company indicators
  /\b(client|brand|company|agency|studio|firm|corp|corporation|inc|ltd|llc|gmbh)\s*:?\s*\w+/gi,
  // Names (preceded by for, with, at)
  /\b(for|with|at)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/g,
  // Specific event names (common patterns)
  /\b(super\s?bowl|world\s?cup|coachella|burning\s?man|sxsw|ces\s|e3\s|grammy|oscar|emmy)/gi,
  // Famous venues
  /\b(madison\s?square|staples\s?center|wembley|msg|o2\s?arena)/gi,
  // URLs
  /https?:\/\/[^\s]+/gi,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers
  /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // Dates with specific format that might identify events
  /\b(january|february|march|april|may|june|july|august|september|october|november|december)\s+\d{1,2}(st|nd|rd|th)?,?\s*\d{4}/gi,
  // Tour names
  /\b\w+\s+(tour|world\s?tour|concert\s?tour)\s+\d{4}/gi,
  // Artist/musician names (common patterns - just flag potential names)
  // Social media handles
  /@[\w]+/g,
  // Hashtags
  /#[\w]+/g,
];

// Words that should be redacted if followed by a name-like pattern
const CONTEXT_SENSITIVE = [
  "worked with",
  "hired by",
  "contracted by",
  "project for",
  "created for",
  "designed for",
  "built for",
];

/**
 * Sanitizes user-submitted description to remove potentially identifying information
 */
export function sanitizeDescription(description: string | undefined): string | undefined {
  if (!description) return undefined;

  let sanitized = description;

  // Apply each pattern
  IDENTIFYING_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[redacted]");
  });

  // Handle context-sensitive patterns
  CONTEXT_SENSITIVE.forEach((phrase) => {
    const regex = new RegExp(`(${phrase})\\s+[A-Z][\\w\\s]*`, "gi");
    sanitized = sanitized.replace(regex, "$1 [redacted]");
  });

  // Clean up multiple consecutive [redacted] tags
  sanitized = sanitized.replace(/(\[redacted\]\s*)+/g, "[redacted] ");

  // Trim and clean up
  sanitized = sanitized.trim().replace(/\s+/g, " ");

  return sanitized;
}

/**
 * Validates that a description doesn't contain obvious identifying info
 * Returns warnings for the user if potential issues found
 */
export function validateDescription(description: string): string[] {
  const warnings: string[] = [];

  if (/https?:\/\//i.test(description)) {
    warnings.push("URLs detected - these will be removed");
  }

  if (/@[\w]+/.test(description)) {
    warnings.push("Social media handles detected - these will be removed");
  }

  if (/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(description)) {
    warnings.push("Email addresses detected - these will be removed");
  }

  // Check for potential brand/client mentions
  const brandPattern = /\b(for|with|worked)\s+[A-Z][a-z]+(\s+[A-Z][a-z]+)*/;
  if (brandPattern.test(description)) {
    warnings.push("Potential client/brand names detected - these may be redacted");
  }

  return warnings;
}
