import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

const SENDER_EMAIL = "molnarda26@gmail.com";
const SENDER_NAME = "ValYouLadder";

async function sendEditLinkEmail(brevoKey: string, to: string, editUrl: string) {
  await fetch("https://api.brevo.com/v3/smtp/email", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      sender: { name: SENDER_NAME, email: SENDER_EMAIL },
      to: [{ email: to }],
      subject: "Your ValYouLadder submission edit link",
      htmlContent: `
        <!DOCTYPE html>
        <html>
        <body style="font-family: monospace; background: #0d0d12; color: #e5e5e5; padding: 40px 20px; margin: 0;">
          <div style="max-width: 480px; margin: 0 auto;">
            <p style="font-size: 22px; font-weight: bold; margin-bottom: 8px;">🪜 ValYouLadder</p>
            <p style="color: #888; margin-bottom: 32px;">Rate benchmarking for creatives</p>

            <p style="margin-bottom: 16px;">Thanks for contributing to the community.</p>
            <p style="margin-bottom: 24px;">Here's your private link to edit or delete your submission:</p>

            <a href="${editUrl}" style="display: inline-block; background: #e6b800; color: #0d0d12; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; margin-bottom: 24px;">
              Manage My Submission
            </a>

            <p style="color: #888; font-size: 12px; margin-top: 32px; border-top: 1px solid #333; padding-top: 16px;">
              Bookmark this email or the link above — this is the only copy. Your email address was deleted immediately after sending and is not stored or linked to your submission.
            </p>
          </div>
        </body>
        </html>
      `,
    }),
  });
}

async function addBrevoContact(brevoKey: string, email: string) {
  await fetch("https://api.brevo.com/v3/contacts", {
    method: "POST",
    headers: { "api-key": brevoKey, "Content-Type": "application/json" },
    body: JSON.stringify({
      email,
      updateEnabled: true,
      attributes: { SOURCE: "submission" },
    }),
  });
}

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
        rate_representativeness: body.rateRepresentativeness || null,
        standard_rate: body.standardRate ?? null,
        rate_type: body.rateType,
        currency: body.currency,
        total_budget: body.totalBudget ?? null,
        your_budget: body.yourBudget,
        days_of_work: body.daysOfWork ?? null,
        year_completed: body.yearCompleted,
        description: body.description ? body.description.slice(0, 500) : null,
      })
      .select("id")
      .single();

    if (submissionError) throw submissionError;

    const token = crypto.randomUUID();

    const { error: tokenError } = await supabase
      .from("submission_tokens")
      .insert({ submission_id: submission.id, token });

    if (tokenError) throw tokenError;

    // Handle email — transient, never stored
    const { contactEmail, sendEditLink, newsletterOptIn } = body;
    if (contactEmail && (sendEditLink || newsletterOptIn)) {
      const brevoKey = Deno.env.get("BREVO_API_KEY");
      if (brevoKey) {
        const siteUrl = Deno.env.get("SITE_URL") ?? "https://valyouladder.com";
        const editUrl = `${siteUrl}/my-submissions?id=${submission.id}&token=${token}`;

        const tasks: Promise<void>[] = [];
        if (sendEditLink) tasks.push(sendEditLinkEmail(brevoKey, contactEmail, editUrl));
        if (newsletterOptIn) tasks.push(addBrevoContact(brevoKey, contactEmail));
        await Promise.all(tasks);
      }
    }

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
