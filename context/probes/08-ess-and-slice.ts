/**
 * Probe 8: ESS distribution & top-50 slice sensitivity
 * Tests:
 *   - Across realistic queries, what ESS values do we actually get?
 *   - Are the 8 / 5 thresholds well-positioned in the distribution?
 *   - Does slicing top-50 vs top-20 vs top-10 change estimates meaningfully?
 */
import { readFileSync } from "fs";
import {
  computeSkillIdf, weightedPercentile, computeESS, essToConfidence, confidenceFromMetrics,
  DURATION_DAYS, ANNUAL_INFLATION, MIN_SIMILARITY_THRESHOLD,
} from "../../src/lib/estimateAlgorithm";

const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

type Q = {
  projectType: string; clientType: string; expertiseLevel: string;
  projectLength: string; clientCountry?: string; projectLocation?: string;
  selectedSkills: string[];
};

const score = (project: any, q: Q, idf: Map<string, number>): number => {
  let s = 0;
  if (project.project_type === q.projectType) s += 20;
  if (project.client_type === q.clientType) s += 25;
  if (project.expertise_level === q.expertiseLevel) s += 15;
  if (project.project_length === q.projectLength) s += 10;
  const subEcon = project.client_country ?? project.project_location;
  const qEcon = q.clientCountry || q.projectLocation;
  if (subEcon === qEcon) s += 12;
  else if (project.project_location === q.projectLocation) s += 5;
  if (q.selectedSkills.length > 0) {
    const ps = new Set(project.skills);
    let mIdf = 0, tIdf = 0;
    for (const sk of q.selectedSkills) {
      const w = idf.get(sk) ?? 0;
      tIdf += w;
      if (ps.has(sk)) mIdf += w;
    }
    s += (tIdf > 0 ? mIdf / tIdf : 0) * 30;
  }
  const yrs = 2026 - project.year_completed;
  if (yrs === 0) s += 8;
  else if (yrs === 1) s += 5;
  else if (yrs === 2) s += 2;
  return s;
};

const idf = computeSkillIdf(data);

// 6 different query profiles to span use cases
const queries: { label: string; q: Q }[] = [
  { label: "TD/PM medium US senior agency", q: { projectType: "commission", clientType: "agency", expertiseLevel: "senior", projectLength: "medium", clientCountry: "United States", projectLocation: "United States", selectedSkills: ["TouchDesigner", "Projection Mapping"] } },
  { label: "Notch+UE expert performance UK festival", q: { projectType: "performance", clientType: "festival", expertiseLevel: "expert", projectLength: "performance", clientCountry: "United Kingdom", projectLocation: "United Kingdom", selectedSkills: ["Notch", "Unreal Engine"] } },
  { label: "TD short generic", q: { projectType: "commission", clientType: "musician", expertiseLevel: "mid", projectLength: "short", selectedSkills: ["TouchDesigner"] } },
  { label: "LED long Germany institution", q: { projectType: "commission", clientType: "institution", expertiseLevel: "expert", projectLength: "long", clientCountry: "Germany", projectLocation: "Germany", selectedSkills: ["LED Mapping", "Hardware Integration"] } },
  { label: "Junior workshop France small-brand", q: { projectType: "workshop", clientType: "small-brand", expertiseLevel: "junior", projectLength: "short", clientCountry: "France", projectLocation: "France", selectedSkills: ["TouchDesigner"] } },
  { label: "3D Modeling collaboration Japan", q: { projectType: "collaboration", clientType: "private", expertiseLevel: "mid", projectLength: "medium", clientCountry: "Japan", projectLocation: "Japan", selectedSkills: ["3D Modeling", "Generative Art"] } },
];

const calc = (qProjects: { p: any; s: number }[], targetLen: string) => {
  const userDays = DURATION_DAYS[targetLen] ?? 15;
  const items = qProjects.map(({ p }) => {
    const days = DURATION_DAYS[p.project_length] ?? 15;
    const daily = (p.standard_rate ?? p.your_budget) / days;
    const yrs = 2026 - p.year_completed;
    const adj = daily * Math.pow(1 + ANNUAL_INFLATION, yrs);
    return adj;
  });
  const weights = qProjects.map(({ s, p }) => {
    const repr = p.standard_rate != null ? 1.0 :
      p.rate_representativeness === "below_market" ? 0.5 :
      p.rate_representativeness === "above_market" ? 0.85 : 1.0;
    return s * repr;
  });
  const wItems = items.map((v, i) => ({ value: v, weight: weights[i] }));
  return {
    p25: weightedPercentile(wItems, 0.25) * userDays,
    p50: weightedPercentile(wItems, 0.5) * userDays,
    p75: weightedPercentile(wItems, 0.75) * userDays,
    ess: computeESS(weights),
    n: wItems.length,
  };
};

console.log(`=== ESS & Slice sensitivity ===\n`);
const allEss: number[] = [];
for (const { label, q } of queries) {
  const scored = data.map((p) => ({ p, s: score(p, q, idf) }));
  const filtered = scored.filter((x) => x.s >= MIN_SIMILARITY_THRESHOLD).sort((a, b) => b.s - a.s);

  console.log(`-- ${label} --`);
  console.log(`  passed threshold: ${filtered.length}/30`);

  for (const k of [10, 20, 50, 100]) {
    const slice = filtered.slice(0, k);
    if (slice.length === 0) { console.log(`  top-${k}: no projects`); continue; }
    const r = calc(slice, q.projectLength);
    const topScore = slice[0].s;
    const oldConf = essToConfidence(r.ess);
    const newConf = confidenceFromMetrics(r.ess, topScore);
    console.log(`  top-${k.toString().padStart(3)}: n=${r.n}  ESS=${r.ess.toFixed(2).padStart(6)}  topScore=${topScore.toFixed(1).padStart(5)}  conf(old)=${oldConf.padEnd(6)} conf(new)=${newConf.padEnd(6)} p25=$${Math.round(r.p25).toString().padStart(7)} p50=$${Math.round(r.p50).toString().padStart(7)} p75=$${Math.round(r.p75).toString().padStart(7)}`);
  }
  // Use top-50 as the "real" run's ESS
  const top50 = filtered.slice(0, 50);
  if (top50.length > 0) allEss.push(calc(top50, q.projectLength).ess);
  console.log();
}

allEss.sort((a, b) => a - b);
console.log(`=== ESS distribution across ${allEss.length} queries ===`);
console.log(`  values: ${allEss.map((e) => e.toFixed(2)).join(", ")}`);
console.log(`  min=${allEss[0].toFixed(2)} median=${allEss[Math.floor(allEss.length/2)].toFixed(2)} max=${allEss[allEss.length-1].toFixed(2)}`);
const high = allEss.filter((e) => e >= 8).length;
const med = allEss.filter((e) => e >= 5 && e < 8).length;
const low = allEss.filter((e) => e < 5).length;
console.log(`  ESS≥8 (high):  ${high}/${allEss.length}`);
console.log(`  5≤ESS<8 (med): ${med}/${allEss.length}`);
console.log(`  ESS<5 (low):   ${low}/${allEss.length}`);
