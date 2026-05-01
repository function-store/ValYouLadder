/**
 * Probe 9: Economic context & FX rates
 * - Does client_country differ from project_location often enough to matter?
 * - For the rows where they differ, do client_country-grouped rates separate better?
 * - FX: even though no `currency` column exists, what would the error from
 *   today's-rate vs historical rates be IF currency varied?
 */
import { readFileSync } from "fs";
const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

let same = 0, diff = 0, missing = 0;
for (const r of data) {
  if (!r.client_country) { missing++; continue; }
  if (r.client_country === r.project_location) same++; else diff++;
}
console.log(`=== client_country vs project_location ===`);
console.log(`  same:    ${same}/${data.length}`);
console.log(`  diff:    ${diff}/${data.length}`);
console.log(`  missing: ${missing}/${data.length}`);

console.log(`\n  examples where they differ:`);
for (const r of data.filter((x) => x.client_country && x.client_country !== x.project_location).slice(0, 5)) {
  console.log(`    client=${r.client_country.padEnd(20)} location=${r.project_location.padEnd(20)} budget=$${r.your_budget} length=${r.project_length}`);
}

// Median rate by client_country (ignoring length difference here, just for signal)
console.log(`\n=== Daily rate signal by client_country (with DURATION_DAYS normalization) ===`);
const DURATION_DAYS: Record<string, number> = {
  "day": 1, "2-5-days": 3.5, "1-2-weeks": 7, "1-3-months": 45, "3-6-months": 90, "6plus-months": 180,
  "one-off": 1, "short": 7, "medium": 45, "long": 120, "performance": 1, "tour": 30,
  "installation-temp": 30, "installation-perm": 60,
};
const byCC = new Map<string, number[]>();
const byPL = new Map<string, number[]>();
for (const r of data) {
  const days = DURATION_DAYS[r.project_length] ?? 15;
  const daily = r.your_budget / days;
  if (r.client_country) {
    const arr = byCC.get(r.client_country) ?? [];
    arr.push(daily); byCC.set(r.client_country, arr);
  }
  const arr2 = byPL.get(r.project_location) ?? [];
  arr2.push(daily); byPL.set(r.project_location, arr2);
}
const med = (xs: number[]) => { const s = [...xs].sort((a, b) => a - b); return s[Math.floor(s.length / 2)]; };

console.log(`  By client_country (n>=2):`);
for (const [cc, xs] of [...byCC.entries()].filter(([_, xs]) => xs.length >= 2).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`    ${cc.padEnd(20)} n=${xs.length}  median=$${Math.round(med(xs))}/d`);
}
console.log(`  By project_location (n>=2):`);
for (const [pl, xs] of [...byPL.entries()].filter(([_, xs]) => xs.length >= 2).sort((a,b)=>b[1].length-a[1].length)) {
  console.log(`    ${pl.padEnd(20)} n=${xs.length}  median=$${Math.round(med(xs))}/d`);
}

// Does the data show that rates correlate more with client_country or project_location?
// Simple test: variance reduction (within-group / total) — lower means the grouping explains more variance.
const allDaily = data.map((r) => r.your_budget / (DURATION_DAYS[r.project_length] ?? 15));
const totalVar = (() => {
  const m = allDaily.reduce((a, b) => a + b, 0) / allDaily.length;
  return allDaily.reduce((s, x) => s + (x - m) * (x - m), 0) / allDaily.length;
})();
const groupVar = (groups: Map<string, number[]>) => {
  let total = 0, n = 0;
  for (const xs of groups.values()) {
    if (xs.length < 2) continue;
    const m = xs.reduce((a, b) => a + b, 0) / xs.length;
    total += xs.reduce((s, x) => s + (x - m) * (x - m), 0);
    n += xs.length;
  }
  return total / n;
};
console.log(`\n=== Variance reduction test (lower within-group variance => better grouping) ===`);
console.log(`  total variance:                $${Math.round(Math.sqrt(totalVar))}² stdev`);
console.log(`  within-group var by client_country:    $${Math.round(Math.sqrt(groupVar(byCC)))}² stdev (groups n>=2)`);
console.log(`  within-group var by project_location:  $${Math.round(Math.sqrt(groupVar(byPL)))}² stdev (groups n>=2)`);
console.log(`  → if client_country reduces variance more, it's a stronger rate signal`);

// FX rate hypothetical
console.log(`\n=== FX rate impact estimation ===`);
console.log(`  Current data: 0/30 have currency column populated (column does not exist in production DB)`);
console.log(`  Hypothetical: if a 2024 project was submitted in TRY (Turkish lira) at 30,000 TRY:`);
console.log(`    - 2024 avg TRY/USD: ~32 → $937 USD value at submission time`);
console.log(`    - 2026 today: ~40 → $750 USD using today's rate`);
console.log(`    - error: 25% understatement of historical USD value`);
console.log(`  For stable currencies (EUR, GBP, JPY): typical ±5-10% drift over 1-2 years`);
console.log(`  For volatile (TRY, ARS, RUB): can be 30-100% over 2 years`);
console.log(`  CONCLUSION: error magnitude depends entirely on what currencies are submitted.`);
console.log(`  Once currency column exists and submissions arrive, this needs revisiting.`);
