import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDetails, similarProjects } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert rate estimation assistant for creative technology projects (TouchDesigner, Notch, projection mapping, LED installations, live visuals, etc.).

Given project details and a list of similar past projects, analyze the data and provide a rate estimate.

IMPORTANT CONTEXT about the data you receive:
- Similar projects have been pre-filtered by a minimum similarity threshold (score >= 15) so low-relevance matches are already excluded.
- Projects are ranked by a weighted similarity score that uses IDF-weighted skill overlap (rare skills count more), exact field matches, and recency.
- Budgets shown are the respondent's share (your_budget). The client-side algorithm normalizes these to daily rates for percentile calculation, but you see raw totals.
- Each project includes a similarityScore field — higher scores indicate stronger relevance. Weight your analysis accordingly.
- Budgets in similar projects may be in different currencies. Adjust your reasoning accordingly.

Your response must be valid JSON with this exact structure:
{
  "low": number (conservative estimate in USD),
  "mid": number (recommended estimate in USD),
  "high": number (premium estimate in USD),
  "reasoning": string (brief 1-2 sentence explanation),
  "confidenceLevel": "low" | "medium" | "high",
  "keyFactors": string[] (3-5 key factors that influenced the estimate)
}

Consider these factors:
- Client type and budget capacity
- Project complexity and duration
- Required expertise level
- Market rates for the location
- Skills required and their rarity
- Similar project budgets in the data (weighted by similarity score)
- Project length when comparing budgets (a 6-month project budget is not comparable to a 1-day gig)
- Rate structure: a day rate vs project fee vs retainer implies different total value
- Role: solo operators carry full project risk; subcontractors typically earn less than leads`;

    const userPrompt = `Project Details:
- Type: ${projectDetails.projectType}
- Client Type: ${projectDetails.clientType}
- Project Length: ${projectDetails.projectLength}
- Expertise Level: ${projectDetails.expertiseLevel}
- Location: ${projectDetails.projectLocation}
${projectDetails.clientCountry ? `- Client Country: ${projectDetails.clientCountry}` : ""}
${projectDetails.rateType ? `- Rate Structure: ${projectDetails.rateType}` : ""}
${projectDetails.yourRole ? `- Your Role: ${projectDetails.yourRole}` : ""}
- Skills Required: ${projectDetails.skills.join(", ")}
${projectDetails.description ? `\nProject Description:\n${projectDetails.description}` : ""}

Similar Projects (${similarProjects.length} found, pre-filtered by similarity threshold, ranked by weighted score):
${similarProjects
  .slice(0, 10)
  .map(
    (p: any, i: number) =>
      `${i + 1}. [score:${p.similarityScore?.toFixed(1) ?? "N/A"}] ${p.projectType} for ${p.clientType} in ${p.location} - ${p.currency ?? "USD"} ${p.budget} (${p.expertiseLevel}, ${p.projectLength}${p.yourRole ? `, ${p.yourRole}` : ""})`
  )
  .join("\n")}

Based on this data, provide your rate estimate in USD.`;

    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: systemPrompt }] },
          contents: [{ role: "user", parts: [{ text: userPrompt }] }],
          generationConfig: {
            temperature: 0.3,
            responseMimeType: "application/json",
          },
        }),
      }
    );

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(
          JSON.stringify({ error: "Rate limits exceeded, please try again later." }),
          {
            status: 429,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("Gemini API error:", response.status, errorText);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    // Parse the JSON from the response
    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("Could not parse JSON from AI response");
    }

    const estimate = JSON.parse(jsonMatch[0]);

    return new Response(JSON.stringify(estimate), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in estimate-rate function:", error);
    return new Response(
      JSON.stringify({
        error: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
