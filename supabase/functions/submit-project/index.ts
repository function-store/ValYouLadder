import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    const body = await req.json();

    const required = [
      "projectType", "clientType", "projectLength", "projectLocation",
      "skills", "expertiseLevel", "yourRole", "rateType", "currency",
      "yourBudget", "yearCompleted",
    ];

    for (const field of required) {
      if (body[field] === undefined || body[field] === null || body[field] === "") {
        return new Response(
          JSON.stringify({ error: `Missing required field: ${field}` }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Insert the submission
    const { data: submission, error: submissionError } = await supabase
      .from("project_submissions")
      .insert({
        project_type: body.projectType,
        client_type: body.clientType,
        project_length: body.projectLength,
        client_country: body.clientCountry || null,
        project_location: body.projectLocation,
        skills: body.skills,
        expertise_level: body.expertiseLevel,
        your_role: body.yourRole,
        contracted_as: body.contractedAs || null,
        rate_type: body.rateType,
        currency: body.currency,
        total_budget: body.totalBudget ?? null,
        your_budget: body.yourBudget,
        days_of_work: body.daysOfWork ?? null,
        year_completed: body.yearCompleted,
        description: body.description || null,
      })
      .select("id")
      .single();

    if (submissionError) throw submissionError;

    // Generate and store a management token
    const token = crypto.randomUUID();

    const { error: tokenError } = await supabase
      .from("submission_tokens")
      .insert({ submission_id: submission.id, token });

    if (tokenError) throw tokenError;

    return new Response(
      JSON.stringify({ submissionId: submission.id, token }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Error in submit-project:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
