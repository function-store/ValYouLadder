/**
 * Probe 3: Explicitly fetch currency and check what's there.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key: string) => env.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, "m"))?.[1];

const supabase = createClient(getEnv("VITE_SUPABASE_URL")!, getEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!);

(async () => {
  const { data, error } = await supabase
    .from("project_submissions")
    .select("id, currency, your_budget, total_budget, year_completed, project_length, days_of_work, standard_rate, rate_representativeness, contracted_as");

  console.log(`error: ${JSON.stringify(error)}`);
  console.log(`rows: ${data?.length}\n`);

  // currency distribution
  const ccount = new Map<string, number>();
  for (const r of data ?? []) {
    const v = String((r as any).currency ?? "<null>");
    ccount.set(v, (ccount.get(v) ?? 0) + 1);
  }
  console.log("CURRENCY DISTRIBUTION:");
  for (const [v, c] of [...ccount.entries()].sort((a, b) => b[1] - a[1])) {
    console.log(`  ${c}× ${v}`);
  }

  console.log("\nFIRST 3 ROWS RAW:");
  for (const r of (data ?? []).slice(0, 3)) console.log(r);
})();
