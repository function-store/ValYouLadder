/**
 * Sanitization helper used by edge functions before persisting any
 * user-provided description text.
 *
 * Fails CLOSED: every error path throws `SanitizationFailedError`, never
 * returns the original (potentially identifying) text. Callers MUST decide
 * whether to reject the request or fall back to storing `null` — silent
 * fall-through to the unsanitized string is not allowed.
 */

export class SanitizationFailedError extends Error {
  public readonly reason: string;

  constructor(reason: string) {
    super(`Description sanitization failed: ${reason}`);
    this.name = "SanitizationFailedError";
    this.reason = reason;
  }
}

export async function sanitizeDescription(description: string): Promise<string> {
  if (!description || description.trim() === "") return description;

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) {
    console.error("sanitizeDescription: GEMINI_API_KEY not configured");
    throw new SanitizationFailedError("ai_unavailable");
  }

  const systemPrompt = `You are a content processing agent for an anonymous pricing database in the visual arts/VJ/TouchDesigner industry. You perform three tasks in one pass:

1. REDACT identifying information (replace with 🍌):
- Brand names (Nike, Coca-Cola, Apple, Samsung, Mercedes, etc.)
- Artist/musician names (Beyoncé, Drake, Taylor Swift, Coldplay, etc.)
- Tour names ("Eras Tour", "Renaissance World Tour", etc.)
- Venue names (Madison Square Garden, Wembley Stadium, O2 Arena, etc.)
- Festival names when referring to specific editions (Coachella 2024, etc.)
- Event names (Super Bowl LVIII, Grammy Awards 2024, etc.)
- Company/agency names
- Location specifics that could identify a project (addresses, specific cities paired with dates)
- Personal names
- URLs, emails, social media handles
- Specific dates that could identify an event

DO NOT REDACT:
- Generic terms like "brand activation", "festival stage", "arena show", "world tour"
- Generic client types like "global brand", "tech company", "fashion brand"
- Generic venue types like "arena", "stadium", "club", "gallery"
- Technical terms like "LED wall", "projection mapping", "generative visuals"
- Countries (these are allowed for reference)

2. REMOVE vulgar, offensive, or inappropriate language. Replace with a neutral equivalent where possible, or remove entirely if no neutral equivalent exists.

3. TRANSLATE to English if the text is in another language. Preserve meaning and tone — do not summarize.

Apply all three steps in order and return the final result.

Return a JSON object with:
1. "sanitized": The fully processed English description
2. "redactions": Array of what was redacted or changed (include "translated from [language]" if applicable)`;

  let response: Response;
  try {
    response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: `Analyze and sanitize this description:\n\n"${description.slice(0, 500)}"` }] }],
          generationConfig: { temperature: 0.1, responseMimeType: "application/json" },
        }),
      }
    );
  } catch (err) {
    console.error("sanitizeDescription: network error", err instanceof Error ? err.message : err);
    throw new SanitizationFailedError("network_error");
  }

  if (!response.ok) {
    console.error("sanitizeDescription: upstream non-OK", response.status);
    throw new SanitizationFailedError(`upstream_${response.status}`);
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (err) {
    console.error("sanitizeDescription: invalid JSON envelope", err instanceof Error ? err.message : err);
    throw new SanitizationFailedError("invalid_envelope");
  }

  const content =
    (data as { candidates?: Array<{ content?: { parts?: Array<{ text?: string }> } }> })
      ?.candidates?.[0]?.content?.parts?.[0]?.text;

  if (!content) {
    throw new SanitizationFailedError("empty_response");
  }

  let result: { sanitized?: unknown };
  try {
    result = JSON.parse(content.trim());
  } catch (err) {
    console.error("sanitizeDescription: failed to parse model output", err instanceof Error ? err.message : err);
    throw new SanitizationFailedError("parse_failed");
  }

  if (typeof result.sanitized !== "string" || result.sanitized.trim() === "") {
    throw new SanitizationFailedError("missing_sanitized_field");
  }

  return result.sanitized;
}
