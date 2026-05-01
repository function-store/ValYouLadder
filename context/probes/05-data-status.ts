/**
 * Probe 5: When was data submitted? Are these test fixtures or real submissions?
 */
import { readFileSync } from "fs";
const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

const dates = data.map(r => r.created_at).sort();
console.log(`oldest: ${dates[0]}`);
console.log(`newest: ${dates[dates.length - 1]}`);

const byMonth = new Map<string, number>();
for (const r of data) {
  const m = r.created_at.slice(0, 7);
  byMonth.set(m, (byMonth.get(m) ?? 0) + 1);
}
console.log("\nBy month:");
for (const [m, c] of [...byMonth.entries()].sort()) console.log(`  ${m}: ${c}`);

// Budget range
const budgets = data.map(r => r.your_budget).filter((x): x is number => typeof x === "number");
budgets.sort((a, b) => a - b);
console.log(`\nyour_budget: min=${budgets[0]} median=${budgets[Math.floor(budgets.length/2)]} max=${budgets[budgets.length-1]} mean=${(budgets.reduce((a,b)=>a+b,0)/budgets.length).toFixed(0)}`);

// Total budget
const totals = data.map(r => r.total_budget).filter((x): x is number => typeof x === "number");
totals.sort((a, b) => a - b);
console.log(`total_budget: ${totals.length}/${data.length} present, range ${totals[0]}–${totals[totals.length-1]}`);
