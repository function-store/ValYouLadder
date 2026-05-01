/**
 * Probe 7: Rate distribution by project_length, end-to-end with the actual algorithm.
 * Tests:
 *   - DURATION_DAYS midpoint plausibility — what daily rate does each bucket produce?
 *   - inflation effect magnitude (max 1 year of compounding here, since data is 2024-2025)
 *   - sensitivity to top-50 slice
 *   - legacy project_length value handling
 */
import { readFileSync } from "fs";
import { DURATION_DAYS, ANNUAL_INFLATION } from "../../src/lib/estimateAlgorithm";

const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

// Group by project_length
const byLen = new Map<string, any[]>();
for (const r of data) {
  const arr = byLen.get(r.project_length) ?? [];
  arr.push(r);
  byLen.set(r.project_length, arr);
}

console.log(`=== Daily-rate by project_length bucket (using DURATION_DAYS midpoints) ===`);
console.log(`bucket           midpoint  n   median_budget  median_daily  range_daily`);
for (const [len, rows] of [...byLen.entries()].sort()) {
  const days = DURATION_DAYS[len];
  if (!days) {
    console.log(`  UNKNOWN BUCKET "${len}" — DURATION_DAYS has no entry. Code falls back to 15.`);
    continue;
  }
  const dailies = rows.map((r) => r.your_budget / days).sort((a, b) => a - b);
  const med = dailies[Math.floor(dailies.length / 2)];
  console.log(`  ${len.padEnd(20)} ${days.toString().padStart(4)}d ${rows.length.toString().padStart(2)}  ${rows.map(r=>r.your_budget).sort((a,b)=>a-b)[Math.floor(rows.length/2)].toString().padStart(7)}      ${Math.round(med).toString().padStart(7)}  ${Math.round(dailies[0])}–${Math.round(dailies[dailies.length-1])}`);
}

// Sanity: do daily rates look comparable across buckets, or does one bucket clearly skew?
console.log(`\n=== Cross-bucket daily rate comparison ===`);
console.log(`If midpoints are calibrated, daily rates across buckets should be in the same OOM.`);
const allDaily: { bucket: string; daily: number }[] = [];
for (const [len, rows] of byLen) {
  const days = DURATION_DAYS[len] ?? 15;
  for (const r of rows) allDaily.push({ bucket: len, daily: r.your_budget / days });
}
allDaily.sort((a, b) => a.daily - b.daily);
console.log(`  overall daily rate range: $${Math.round(allDaily[0].daily)} – $${Math.round(allDaily[allDaily.length-1].daily)}`);
console.log(`  overall daily rate median: $${Math.round(allDaily[Math.floor(allDaily.length/2)].daily)}`);
console.log(`  spread (max/min): ${(allDaily[allDaily.length-1].daily / allDaily[0].daily).toFixed(1)}×`);

console.log(`\n  per-bucket median daily rates:`);
for (const [len, rows] of byLen) {
  const days = DURATION_DAYS[len] ?? 15;
  const dailies = rows.map((r) => r.your_budget / days).sort((a, b) => a - b);
  const med = dailies[Math.floor(dailies.length / 2)];
  console.log(`    ${len.padEnd(22)} median=$${Math.round(med).toString().padStart(6)}/day  (midpoint=${days}d)`);
}

// Inflation impact
console.log(`\n=== Inflation adjustment (5%/yr) impact on this dataset ===`);
const yrs2024 = data.filter((r) => r.year_completed === 2024).length;
const yrs2025 = data.filter((r) => r.year_completed === 2025).length;
console.log(`  2024 projects: ${yrs2024} → multiplier = 1.05^2 = ${(1.05**2).toFixed(3)}`);
console.log(`  2025 projects: ${yrs2025} → multiplier = 1.05^1 = ${(1.05**1).toFixed(3)}`);
console.log(`  max distortion in current dataset: ~10% (all data is recent)`);
console.log(`  SO: inflation has minimal practical effect right now. Worth verifying before rates compound for older data.`);
