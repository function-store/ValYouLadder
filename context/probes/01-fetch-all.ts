/**
 * Probe 1: Fetch all approved project_submissions and dump as JSON.
 * This is the substrate for every other probe — query once, analyze locally.
 *
 * Run: npx tsx context/probes/01-fetch-all.ts
 */
import { createClient } from "@supabase/supabase-js";
import { writeFileSync, readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key: string) =>
  env.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, "m"))?.[1];

const url = getEnv("VITE_SUPABASE_URL")!;
const key = getEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!;

if (!url || !key) {
  console.error("Missing env: VITE_SUPABASE_URL or VITE_SUPABASE_PUBLISHABLE_KEY");
  process.exit(1);
}

const supabase = createClient(url, key);

(async () => {
  const { data, error, count } = await supabase
    .from("project_submissions")
    .select("*", { count: "exact" })
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Query error:", error);
    process.exit(1);
  }

  console.log(`Fetched ${data?.length ?? 0} rows (count: ${count})`);

  writeFileSync(
    "context/probes/data.json",
    JSON.stringify(data, null, 2)
  );
  console.log("Wrote context/probes/data.json");
})();
