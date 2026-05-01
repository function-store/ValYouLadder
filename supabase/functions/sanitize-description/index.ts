import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    let { description } = await req.json();

    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ sanitized: description || '', redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    description = description.slice(0, 500);

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      console.error("GEMINI_API_KEY is not configured");
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [], error: "AI not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const systemPrompt = `You are a content processing agent for an anonymous pricing database in the visual arts/VJ/TouchDesigner industry. You perform three tasks in one pass:

1. REDACT identifying information (replace with [redacted]):
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

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: `Analyze and sanitize this description:\n\n"${description}"` }] }],
          generationConfig: {
            temperature: 0.1,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ sanitized: description, redactions: [], error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [], error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;
    
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    try {
      const result = JSON.parse(content.trim());
      
      return new Response(
        JSON.stringify({
          sanitized: result.sanitized || description,
          redactions: result.redactions || []
        }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (parseError) {
      console.error("Failed to parse AI response:", content, parseError);
      // If parsing fails, return the original
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    console.error("Sanitize error:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
