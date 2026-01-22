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

    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) {
      throw new Error("LOVABLE_API_KEY is not configured");
    }

    const systemPrompt = `You are an expert rate estimation assistant for creative technology projects (TouchDesigner, Notch, projection mapping, LED installations, live visuals, etc.).

Given project details and a list of similar past projects, analyze the data and provide a rate estimate.

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
- Similar project budgets in the data`;

    const userPrompt = `Project Details:
- Type: ${projectDetails.projectType}
- Client Type: ${projectDetails.clientType}
- Project Length: ${projectDetails.projectLength}
- Expertise Level: ${projectDetails.expertiseLevel}
- Location: ${projectDetails.projectLocation}
- Client Country: ${projectDetails.clientCountry}
- Skills Required: ${projectDetails.skills.join(", ")}

Similar Projects (${similarProjects.length} found):
${similarProjects
  .slice(0, 10)
  .map(
    (p: any, i: number) =>
      `${i + 1}. ${p.projectType} for ${p.clientType} in ${p.location} - $${p.budget} (${p.expertiseLevel})`
  )
  .join("\n")}

Based on this data, provide your rate estimate.`;

    const response = await fetch(
      "https://ai.gateway.lovable.dev/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${LOVABLE_API_KEY}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "google/gemini-3-flash-preview",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userPrompt },
          ],
          temperature: 0.3,
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
      if (response.status === 402) {
        return new Response(
          JSON.stringify({ error: "Payment required, please add credits." }),
          {
            status: 402,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
      const errorText = await response.text();
      console.error("AI gateway error:", response.status, errorText);
      throw new Error(`AI gateway error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.choices?.[0]?.message?.content;

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
