/**
 * Sanitizes a project description using Gemini to redact PII.
 * Returns the sanitized string, or the original if AI is unavailable.
 */
export async function sanitizeDescription(description: string): Promise<string> {
  if (!description || description.trim() === "") return description;

  const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
  if (!GEMINI_API_KEY) return description;

  const systemPrompt = `You are a privacy protection agent for an anonymous pricing database in the visual arts/VJ/TouchDesigner industry.

Your task: Analyze the description and identify ANY identifying information that should be redacted.

MUST REDACT (replace with [redacted]):
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

DO NOT REDACT (these are legitimate industry terms):
- Generic terms like "brand activation", "festival stage", "arena show", "world tour"
- Generic client types like "global brand", "tech company", "fashion brand"
- Generic venue types like "arena", "stadium", "club", "gallery"
- Technical terms like "LED wall", "projection mapping", "generative visuals"
- Countries (these are allowed for reference)

Return a JSON object with:
1. "sanitized": The description with identifying info replaced by [redacted]
2. "redactions": Array of what was redacted (for transparency)`;

  try {
    const response = await fetch(
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

    if (!response.ok) return description;

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    if (!content) return description;

    const result = JSON.parse(content.trim());
    return result.sanitized || description;
  } catch {
    return description;
  }
}
