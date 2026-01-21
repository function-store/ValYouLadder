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
    const { description } = await req.json();
    
    if (!description || typeof description !== 'string') {
      return new Response(
        JSON.stringify({ sanitized: description || '', redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      console.error("LOVABLE_API_KEY is not configured");
      // Fall back to basic sanitization
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [], error: "AI not configured" }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

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
2. "redactions": Array of what was redacted (for transparency)

Example input: "Created visuals for Nike's brand activation at Coachella 2024, worked with the Martin Garrix team"
Example output: {"sanitized": "Created visuals for [redacted]'s brand activation at [redacted], worked with the [redacted] team", "redactions": ["Nike", "Coachella 2024", "Martin Garrix"]}

Be thorough but don't over-redact. Industry terminology should remain.`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          { role: "user", content: `Analyze and sanitize this description:\n\n"${description}"` }
        ],
        temperature: 0.1,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        console.error("Rate limit exceeded");
        return new Response(
          JSON.stringify({ sanitized: description, redactions: [], error: "Rate limit exceeded" }),
          { status: 429, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      if (response.status === 402) {
        console.error("Payment required");
        return new Response(
          JSON.stringify({ sanitized: description, redactions: [], error: "Payment required" }),
          { status: 402, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [], error: "AI processing failed" }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;
    
    if (!content) {
      console.error("No content in AI response");
      return new Response(
        JSON.stringify({ sanitized: description, redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Parse the JSON response from the AI
    try {
      // Clean up markdown code blocks if present
      let cleanContent = content.trim();
      if (cleanContent.startsWith('```json')) {
        cleanContent = cleanContent.slice(7);
      } else if (cleanContent.startsWith('```')) {
        cleanContent = cleanContent.slice(3);
      }
      if (cleanContent.endsWith('```')) {
        cleanContent = cleanContent.slice(0, -3);
      }
      cleanContent = cleanContent.trim();

      const result = JSON.parse(cleanContent);
      console.log("Sanitization result:", result);
      
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
