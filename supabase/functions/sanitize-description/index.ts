import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { sanitizeDescription, SanitizationFailedError } from "../_shared/sanitizeDescription.ts";

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

    try {
      const sanitized = await sanitizeDescription(description);
      // The shared helper returns only the cleaned string; we don't surface
      // the model's `redactions` array here on purpose — failing-closed is
      // more important than UX hints for a rare flow.
      return new Response(
        JSON.stringify({ sanitized, redactions: [] }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    } catch (err) {
      if (err instanceof SanitizationFailedError) {
        return new Response(
          JSON.stringify({
            error:
              "We couldn't process your description right now. Please try again in a minute, or remove identifying details and resubmit.",
            code: "SANITIZATION_FAILED",
            reason: err.reason,
          }),
          { status: 422, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }
      throw err;
    }

  } catch (error) {
    console.error("Sanitize error:", error instanceof Error ? error.message : "unknown");
    return new Response(
      JSON.stringify({ error: "Unexpected error" }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
