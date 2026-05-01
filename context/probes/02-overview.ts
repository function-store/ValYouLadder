/**
 * Probe 2: Dataset overview — distributions of every field that feeds the algorithm.
 */
import { readFileSync } from "fs";

const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

console.log(`\n=== DATASET OVERVIEW (n=${data.length}) ===\n`);

const counter = (key: string) => {
  const counts = new Map<string, number>();
  for (const row of data) {
    const v = String(row[key] ?? "<null>");
    counts.set(v, (counts.get(v) ?? 0) + 1);
  }
  return [...counts.entries()].sort((a, b) => b[1] - a[1]);
};

const printDist = (label: string, counts: [string, number][]) => {
  console.log(`-- ${label} --`);
  for (const [v, c] of counts) {
    const pct = ((c / data.length) * 100).toFixed(1);
    console.log(`  ${c.toString().padStart(3)} (${pct}%)  ${v}`);
  }
  console.log();
};

printDist("currency", counter("currency"));
printDist("project_length", counter("project_length"));
printDist("year_completed", counter("year_completed"));
printDist("rate_representativeness", counter("rate_representativeness"));
printDist("client_country", counter("client_country"));
printDist("project_location", counter("project_location"));
printDist("expertise_level", counter("expertise_level"));
printDist("project_type", counter("project_type"));
printDist("client_type", counter("client_type"));

// Check coverage of standard_rate
const withStd = data.filter((r) => r.standard_rate != null).length;
const withDays = data.filter((r) => r.days_of_work != null).length;
const withClientCountry = data.filter((r) => r.client_country != null).length;
const withRepr = data.filter((r) => r.rate_representativeness != null).length;

console.log(`-- field coverage --`);
console.log(`  standard_rate provided:           ${withStd}/${data.length} (${((withStd / data.length) * 100).toFixed(0)}%)`);
console.log(`  days_of_work provided:            ${withDays}/${data.length} (${((withDays / data.length) * 100).toFixed(0)}%)`);
console.log(`  client_country provided:          ${withClientCountry}/${data.length} (${((withClientCountry / data.length) * 100).toFixed(0)}%)`);
console.log(`  rate_representativeness provided: ${withRepr}/${data.length} (${((withRepr / data.length) * 100).toFixed(0)}%)`);

// Skill stats
const skillCount = new Map<string, number>();
let totalSkillTokens = 0;
for (const row of data) {
  for (const s of row.skills ?? []) {
    skillCount.set(s, (skillCount.get(s) ?? 0) + 1);
    totalSkillTokens++;
  }
}
console.log(`\n-- skills --`);
console.log(`  unique skills: ${skillCount.size}`);
console.log(`  total skill tokens: ${totalSkillTokens}`);
console.log(`  avg skills per project: ${(totalSkillTokens / data.length).toFixed(2)}`);
console.log(`  top skills:`);
for (const [s, c] of [...skillCount.entries()].sort((a, b) => b[1] - a[1]).slice(0, 10)) {
  const idf = Math.log(data.length / c).toFixed(2);
  console.log(`    ${c.toString().padStart(3)}× (idf=${idf})  ${s}`);
}
