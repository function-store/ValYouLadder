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
    const { submissionId, token, action, updates } = await req.json();

    if (!submissionId || !token || !action) {
      return new Response(
        JSON.stringify({ error: "submissionId, token, and action are required" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!["edit", "delete"].includes(action)) {
      return new Response(
        JSON.stringify({ error: "action must be 'edit' or 'delete'" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    // Validate the token
    const { data: tokenRow, error: tokenError } = await supabase
      .from("submission_tokens")
      .select("submission_id")
      .eq("submission_id", submissionId)
      .eq("token", token)
      .single();

    if (tokenError || !tokenRow) {
      return new Response(
        JSON.stringify({ error: "Invalid token" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (action === "delete") {
      // Deleting the submission cascades to the token row
      const { error } = await supabase
        .from("project_submissions")
        .delete()
        .eq("id", submissionId);

      if (error) throw error;
    }

    if (action === "edit" && updates) {
      const allowed = [
        "project_type", "client_type", "project_length", "client_country",
        "project_location", "skills", "expertise_level", "your_role",
        "contracted_as", "rate_type", "currency", "total_budget", "your_budget",
        "days_of_work", "year_completed", "description",
      ];

      const sanitized: Record<string, unknown> = {};
      for (const key of allowed) {
        if (key in updates) sanitized[key] = updates[key];
      }

      if (Object.keys(sanitized).length === 0) {
        return new Response(
          JSON.stringify({ error: "No valid fields to update" }),
          { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
      }

      const { error } = await supabase
        .from("project_submissions")
        .update(sanitized)
        .eq("id", submissionId);

      if (error) throw error;
    }

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error in manage-submission:", error);
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
