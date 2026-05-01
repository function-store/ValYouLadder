import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-vyl-session",
};

const IS_PRODUCTION = Deno.env.get("SITE_URL") === "https://valyouladder.com";
const RATE_LIMIT = 5;
const WINDOW_HOURS = 1;

async function sha256Hex(input: string): Promise<string> {
  const data = new TextEncoder().encode(input);
  const buf = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(buf))
    .map((b) => b.toString(16).padStart(2, "0"))
    .join("");
}

/**
 * Resolve the request's caller "fingerprint" in a way that can't be
 * trivially spoofed by setting a single header.
 *
 * Strategy:
 *  1. Prefer the runtime peer address surfaced by Deno.serve's `info`
 *     (passed through to the handler). This is the actual TCP peer and
 *     is set by the runtime, not the client.
 *  2. Fall back to a hash of (peer-or-forwarded-ip + user-agent). Spoofing
 *     a single x-forwarded-for header is no longer enough — an attacker
 *     would also have to vary the user-agent every request.
 */
async function fingerprintFromRequest(
  req: Request,
  info: { remoteAddr?: { hostname?: string } } | undefined
): Promise<string> {
  const runtimePeer = info?.remoteAddr?.hostname;
  const forwarded =
    req.headers.get("x-forwarded-for")?.split(",")[0].trim() ||
    req.headers.get("cf-connecting-ip") ||
    req.headers.get("x-real-ip") ||
    "unknown";
  const ua = req.headers.get("user-agent") ?? "unknown";

  // The runtime peer is authoritative when present. We still fold the
  // forwarded value + UA in so a shared NAT egress IP doesn't all collapse
  // to a single bucket.
  const composite = `${runtimePeer ?? "no-peer"}|${forwarded}|${ua}`;
  return await sha256Hex(composite);
}

function isUuidLike(value: string): boolean {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value);
}

interface AiEstimateResponse {
  low: number;
  mid: number;
  high: number;
  reasoning: string;
  confidenceLevel: "low" | "medium" | "high";
  keyFactors: string[];
}

function isAiEstimateResponse(value: unknown): value is AiEstimateResponse {
  if (!value || typeof value !== "object") return false;
  const v = value as Record<string, unknown>;
  return (
    typeof v.low === "number" && Number.isFinite(v.low) &&
    typeof v.mid === "number" && Number.isFinite(v.mid) &&
    typeof v.high === "number" && Number.isFinite(v.high) &&
    typeof v.reasoning === "string" &&
    typeof v.confidenceLevel === "string" &&
    ["low", "medium", "high"].includes(v.confidenceLevel) &&
    Array.isArray(v.keyFactors) &&
    v.keyFactors.every((k) => typeof k === "string")
  );
}

serve(async (req, info) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const { projectDetails, similarProjects, statisticalEstimate } = await req.json();

    const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY");
    if (!GEMINI_API_KEY) {
      throw new Error("GEMINI_API_KEY is not configured");
    }

    const ipHash = await fingerprintFromRequest(
      req,
      info as unknown as { remoteAddr?: { hostname?: string } }
    );

    // Per-browser session id, supplied by the SPA. Mostly defends against
    // header rotation: even if the IP fingerprint shifts, the same browser
    // (same localStorage session id) still hits the same counter.
    const rawSession = req.headers.get("x-vyl-session") ?? "";
    const sessionId = isUuidLike(rawSession) ? rawSession : null;

    const windowStart = new Date(
      Date.now() - WINDOW_HOURS * 60 * 60 * 1000
    ).toISOString();

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const ipCountQuery = supabase
      .from("rate_limit_log")
      .select("*", { count: "exact", head: true })
      .eq("ip_hash", ipHash)
      .gte("created_at", windowStart);

    const sessionCountQuery = sessionId
      ? supabase
          .from("rate_limit_log")
          .select("*", { count: "exact", head: true })
          .eq("session_id", sessionId)
          .gte("created_at", windowStart)
      : Promise.resolve({ count: 0 });

    const [{ count: ipCount }, sessionResult] = await Promise.all([
      ipCountQuery,
      sessionCountQuery,
    ]);
    const sessionCount = (sessionResult as { count?: number | null }).count ?? 0;
    const effectiveCount = Math.max(ipCount ?? 0, sessionCount);

    if (IS_PRODUCTION && effectiveCount >= RATE_LIMIT) {
      return new Response(
        JSON.stringify({
          error: "You've used your 5 AI estimates for this hour. Please try again later.",
          code: "RATE_LIMITED",
        }),
        {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
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
- Role: solo operators carry full project risk; subcontractors typically earn less than leads
- If a "Data-based percentile estimate" is provided in the user message, treat it as a strong directional anchor derived from the same similar-project data you see. Your low/mid/high should stay in that ballpark unless you have a clear qualitative reason to deviate (e.g. the project description reveals unusual scope, the currency mix is skewed, or expertise level signals a premium market)`;

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
${statisticalEstimate
  ? `\nData-based percentile estimate (p25 / p50 / p75 of similarity-weighted, inflation-adjusted daily rates scaled to this project's duration — mixed currencies, treat as directional anchor): $${statisticalEstimate.low.toLocaleString()} / $${statisticalEstimate.mid.toLocaleString()} / $${statisticalEstimate.high.toLocaleString()}`
  : ""}

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
      // Don't echo the upstream body — it can include prompt fragments.
      console.error("Gemini API error: status", response.status);
      throw new Error(`Gemini API error: ${response.status}`);
    }

    const data = await response.json();
    const content = data.candidates?.[0]?.content?.parts?.[0]?.text;

    if (!content) {
      throw new Error("No content in AI response");
    }

    const jsonMatch = content.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      console.error("Gemini parse: no JSON object in response");
      return new Response(
        JSON.stringify({
          error: "AI provider returned an unexpected shape",
          code: "AI_INVALID_SHAPE",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    let estimate: unknown;
    try {
      estimate = JSON.parse(jsonMatch[0]);
    } catch (err) {
      console.error("Gemini parse: invalid JSON", err instanceof Error ? err.message : "");
      return new Response(
        JSON.stringify({
          error: "AI provider returned an unexpected shape",
          code: "AI_INVALID_SHAPE",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!isAiEstimateResponse(estimate)) {
      console.error("Gemini parse: schema mismatch");
      return new Response(
        JSON.stringify({
          error: "AI provider returned an unexpected shape",
          code: "AI_INVALID_SHAPE",
        }),
        { status: 502, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Log this request and clean up expired entries
    await supabase
      .from("rate_limit_log")
      .insert({ ip_hash: ipHash, session_id: sessionId });
    supabase.from("rate_limit_log").delete().lt("created_at", windowStart).then(() => {});

    return new Response(JSON.stringify(estimate), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in estimate-rate function:", error instanceof Error ? error.message : "unknown");
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
