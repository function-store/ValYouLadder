import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { timingSafeEqualStrings } from "../_shared/timingSafeEqual.ts";

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
    const { email, token } = await req.json();

    if (!email || typeof email !== "string") {
      return new Response(JSON.stringify({ error: "Email is required" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    if (!token || typeof token !== "string") {
      // Tokens are required so the endpoint can't be used as an enumeration
      // / griefing oracle. The token comes from the unsubscribe link in the
      // user's email, never from anonymous form input.
      return new Response(
        JSON.stringify({
          error:
            "Missing unsubscribe token. Please use the link from your email, or contact us if you no longer have it.",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const normalised = email.trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(normalised)) {
      return new Response(JSON.stringify({ error: "Invalid email address" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Service role bypasses RLS so we can read/delete without being authenticated
    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: row, error: fetchError } = await supabase
      .from("mailing_list")
      .select("id, unsubscribe_token")
      .eq("email", normalised)
      .maybeSingle();

    if (fetchError) throw fetchError;

    // Always run a constant-time comparison even when the email is not
    // present, so we don't leak existence via timing. We compare against a
    // dummy token of the same length when there's no row.
    const expected = row?.unsubscribe_token ?? "00000000-0000-0000-0000-000000000000";
    const tokenOk = timingSafeEqualStrings(expected, token);

    if (!row || !tokenOk) {
      return new Response(
        JSON.stringify({
          error:
            "We couldn't verify that unsubscribe link. Please use the most recent one from your email.",
        }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: deleteError } = await supabase
      .from("mailing_list")
      .delete()
      .eq("id", row.id);

    if (deleteError) throw deleteError;

    return new Response(JSON.stringify({ success: true }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Unsubscribe error:", error);
    return new Response(
      JSON.stringify({ error: "Failed to process request" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
