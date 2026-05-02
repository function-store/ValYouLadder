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
    sanitized = sanitized.replace(pattern, "🍌");
  });
  sanitized = sanitized.replace(/(\[redacted\]\s*)+/g, "🍌 ");
  return sanitized.trim().replace(/\s+/g, " ");
}

/**
 * Thrown when AI sanitization is unavailable. Callers MUST decide whether
 * to reject the submission or drop the description — never persist the
 * unsanitized text.
 */
export class SanitizationUnavailableError extends Error {
  constructor(message = "Description sanitization is unavailable.") {
    super(message);
    this.name = "SanitizationUnavailableError";
  }
}

/**
 * AI-powered sanitization that intelligently identifies and redacts
 * brand names, artist names, venues, tour names while preserving
 * legitimate industry terminology.
 *
 * Fails CLOSED: throws SanitizationUnavailableError on any error so the
 * caller can show a clear message to the user. Never silently returns
 * the original (potentially identifying) text.
 */
export async function sanitizeDescriptionWithAI(
  description: string | undefined
): Promise<{ sanitized: string; redactions: string[] }> {
  if (!description || description.trim() === "") {
    return { sanitized: "", redactions: [] };
  }

  let response;
  try {
    response = await supabase.functions.invoke("sanitize-description", {
      body: { description },
    });
  } catch (err) {
    console.error("Sanitization request failed:", err);
    throw new SanitizationUnavailableError(
      "We couldn't reach our description-cleaning service. Please try again in a moment."
    );
  }

  const { data, error } = response;

  // Edge function returned a non-2xx — typically our fail-closed 422.
  if (error) {
    console.error("AI sanitization error:", error);
    throw new SanitizationUnavailableError(
      "We couldn't process your description right now. Please try again, or remove identifying details and resubmit."
    );
  }

  if (data?.error) {
    throw new SanitizationUnavailableError(
      typeof data.error === "string"
        ? data.error
        : "We couldn't process your description right now. Please try again, or remove identifying details and resubmit."
    );
  }

  if (typeof data?.sanitized !== "string" || data.sanitized.trim() === "") {
    throw new SanitizationUnavailableError(
      "We couldn't process your description right now. Please try again, or remove identifying details and resubmit."
    );
  }

  return {
    sanitized: data.sanitized,
    redactions: Array.isArray(data.redactions) ? data.redactions : [],
  };
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
