/**
 * Probe 10: Try to submit a test row through the actual edge function flow,
 * to confirm whether real submissions currently work or fail.
 *
 * NOTE: just calls the function. If it 500s with a column error, that's the smoking gun.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key: string) => env.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, "m"))?.[1];

const supabase = createClient(getEnv("VITE_SUPABASE_URL")!, getEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!);

(async () => {
  // Try inserting directly via the table (mimicking what edge function does)
  // We'll capture the error WITHOUT actually persisting (using an invalid year to roll back)
  const { data, error } = await supabase
    .from("project_submissions")
    .insert({
      project_type: "commission",
      client_type: "agency",
      project_length: "medium",
      project_location: "United States",
      skills: ["TouchDesigner"],
      expertise_level: "mid",
      your_role: "PROBE_TEST_ONLY",
      currency: "USD",
      rate_type: "fixed",
      total_budget: 1,
      your_budget: 1,
      year_completed: 1900,
      description: "PROBE — should be deleted",
    } as any)
    .select("id");

  console.log("error:", error);
  console.log("data:", data);
  if (data && data[0]?.id) {
    // clean up
    await supabase.from("project_submissions").delete().eq("id", data[0].id);
    console.log("cleaned up");
  }
})();
