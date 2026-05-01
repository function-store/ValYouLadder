/**
 * Probe 4: Test which expected columns actually exist in production by selecting each one individually.
 */
import { createClient } from "@supabase/supabase-js";
import { readFileSync } from "fs";

const env = readFileSync(".env", "utf8");
const getEnv = (key: string) => env.match(new RegExp(`^${key}=["']?([^"'\n]+)["']?`, "m"))?.[1];

const supabase = createClient(getEnv("VITE_SUPABASE_URL")!, getEnv("VITE_SUPABASE_PUBLISHABLE_KEY")!);

const expected = [
  "id",
  "project_type",
  "client_type",
  "project_length",
  "client_country",
  "project_location",
  "skills",
  "expertise_level",
  "total_budget",
  "your_budget",
  "currency",
  "rate_type",
  "your_role",
  "contracted_as",
  "rate_representativeness",
  "standard_rate",
  "days_of_work",
  "year_completed",
  "description",
  "created_at",
  "updated_at",
  "team_size",
];

(async () => {
  for (const col of expected) {
    const { error } = await supabase.from("project_submissions").select(col).limit(1);
    const status = error ? `MISSING (${error.message})` : "exists";
    console.log(`  ${col.padEnd(28)} ${status}`);
  }
})();
