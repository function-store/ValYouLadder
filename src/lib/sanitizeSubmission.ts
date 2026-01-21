import { supabase } from "@/integrations/supabase/client";

// Fallback patterns for basic sanitization when AI is unavailable
const BASIC_PATTERNS = [
  // URLs
  /https?:\/\/[^\s]+/gi,
  // Email addresses
  /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/g,
  // Phone numbers
  /(\+?1?[-.\s]?)?\(?\d{3}\)?[-.\s]?\d{3}[-.\s]?\d{4}/g,
  // Social media handles
  /@[\w]+/g,
  // Hashtags
  /#[\w]+/g,
];

/**
 * Basic fallback sanitization for when AI is unavailable
 */
function basicSanitize(description: string): string {
  let sanitized = description;
  BASIC_PATTERNS.forEach((pattern) => {
    sanitized = sanitized.replace(pattern, "[redacted]");
  });
  sanitized = sanitized.replace(/(\[redacted\]\s*)+/g, "[redacted] ");
  return sanitized.trim().replace(/\s+/g, " ");
}

/**
 * AI-powered sanitization that intelligently identifies and redacts
 * brand names, artist names, venues, tour names while preserving
 * legitimate industry terminology
 */
export async function sanitizeDescriptionWithAI(
  description: string | undefined
): Promise<{ sanitized: string; redactions: string[] }> {
  if (!description || description.trim() === "") {
    return { sanitized: "", redactions: [] };
  }

  try {
    const { data, error } = await supabase.functions.invoke("sanitize-description", {
      body: { description },
    });

    if (error) {
      console.error("AI sanitization error:", error);
      // Fall back to basic sanitization
      return { sanitized: basicSanitize(description), redactions: [] };
    }

    return {
      sanitized: data.sanitized || basicSanitize(description),
      redactions: data.redactions || [],
    };
  } catch (err) {
    console.error("Sanitization failed:", err);
    return { sanitized: basicSanitize(description), redactions: [] };
  }
}

/**
 * Synchronous basic sanitization (for immediate feedback)
 * Use sanitizeDescriptionWithAI for full AI-powered sanitization
 */
export function sanitizeDescription(description: string | undefined): string | undefined {
  if (!description) return undefined;
  return basicSanitize(description);
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

  return warnings;
}
