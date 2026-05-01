/**
 * Probe 6: Run the real scoring function on real data with realistic queries.
 * Tests:
 *   - distribution of similarity scores
 *   - what % of pool is filtered by MIN_SIMILARITY_THRESHOLD = 15
 *   - whether top-50 cap is even reached
 *   - which weight components dominate
 */
import { readFileSync } from "fs";
import { computeSkillIdf } from "../../src/lib/estimateAlgorithm";

const data = JSON.parse(readFileSync("context/probes/data.json", "utf8")) as any[];

// Replicate calculateSimilarityScore from Estimate.tsx
type Q = {
  projectType: string;
  clientType: string;
  expertiseLevel: string;
  projectLength: string;
  yourRole?: string;
  clientCountry?: string;
  projectLocation?: string;
  selectedSkills: string[];
};

type ScoreBreakdown = {
  projectType: number;
  clientType: number;
  expertise: number;
  length: number;
  role: number;
  econContext: number;
  locSecondary: number;
  skill: number;
  recency: number;
  total: number;
};

const score = (project: any, q: Q, idf: Map<string, number>): ScoreBreakdown => {
  const b: ScoreBreakdown = {
    projectType: 0, clientType: 0, expertise: 0, length: 0, role: 0,
    econContext: 0, locSecondary: 0, skill: 0, recency: 0, total: 0,
  };

  if (project.project_type === q.projectType) b.projectType = 20;
  if (project.client_type === q.clientType) b.clientType = 25;
  if (project.expertise_level === q.expertiseLevel) b.expertise = 15;
  if (project.project_length === q.projectLength) b.length = 10;
  if (project.your_role && q.yourRole && project.your_role === q.yourRole) b.role = 10;

  const subEcon = project.client_country ?? project.project_location;
  const qEcon = q.clientCountry || q.projectLocation;
  if (subEcon === qEcon) b.econContext = 12;
  else if (project.project_location === q.projectLocation) b.locSecondary = 5;

  if (q.selectedSkills.length > 0) {
    const ps = new Set(project.skills);
    let mIdf = 0, tIdf = 0;
    for (const s of q.selectedSkills) {
      const w = idf.get(s) ?? 0;
      tIdf += w;
      if (ps.has(s)) mIdf += w;
    }
    const skillScore = tIdf > 0 ? mIdf / tIdf
      : ps.size > 0 ? q.selectedSkills.filter(s => ps.has(s)).length / q.selectedSkills.length
      : 0;
    b.skill = skillScore * 30;
  }

  const yrs = 2026 - project.year_completed;
  if (yrs === 0) b.recency = 8;
  else if (yrs === 1) b.recency = 5;
  else if (yrs === 2) b.recency = 2;

  b.total = b.projectType + b.clientType + b.expertise + b.length + b.role +
    b.econContext + b.locSecondary + b.skill + b.recency;
  return b;
};

const idf = computeSkillIdf(data);

// Three realistic queries
const queries: { label: string; q: Q }[] = [
  {
    label: "TouchDesigner mid project, US, Senior",
    q: {
      projectType: "commission",
      clientType: "agency",
      expertiseLevel: "senior",
      projectLength: "medium",
      clientCountry: "United States",
      projectLocation: "United States",
      selectedSkills: ["TouchDesigner", "Projection Mapping"],
    },
  },
  {
    label: "Niche: Notch+Unreal expert performance, UK",
    q: {
      projectType: "performance",
      clientType: "festival",
      expertiseLevel: "expert",
      projectLength: "performance",
      clientCountry: "United Kingdom",
      projectLocation: "United Kingdom",
      selectedSkills: ["Notch", "Unreal Engine"],
    },
  },
  {
    label: "Generic: TouchDesigner short, anywhere",
    q: {
      projectType: "commission",
      clientType: "musician",
      expertiseLevel: "mid",
      projectLength: "short",
      selectedSkills: ["TouchDesigner"],
    },
  },
];

for (const { label, q } of queries) {
  console.log(`\n=== ${label} ===`);
  const scored = data.map((p) => ({ p, s: score(p, q, idf) }));
  scored.sort((a, b) => b.s.total - a.s.total);

  // Distribution
  const totals = scored.map((x) => x.s.total).sort((a, b) => a - b);
  console.log(`  score range: min=${totals[0].toFixed(1)} median=${totals[Math.floor(totals.length / 2)].toFixed(1)} max=${totals[totals.length - 1].toFixed(1)}`);

  // Threshold filter analysis
  const above15 = scored.filter((x) => x.s.total >= 15).length;
  const above20 = scored.filter((x) => x.s.total >= 20).length;
  const above25 = scored.filter((x) => x.s.total >= 25).length;
  const above30 = scored.filter((x) => x.s.total >= 30).length;
  const above40 = scored.filter((x) => x.s.total >= 40).length;
  const above50 = scored.filter((x) => x.s.total >= 50).length;
  console.log(`  ≥15: ${above15}/30   ≥20: ${above20}   ≥25: ${above25}   ≥30: ${above30}   ≥40: ${above40}   ≥50: ${above50}`);

  // Top 5 with breakdown
  console.log(`  TOP 5 SCORES:`);
  for (let i = 0; i < Math.min(5, scored.length); i++) {
    const { p, s } = scored[i];
    console.log(`    ${s.total.toFixed(1).padStart(6)}: pt=${s.projectType} ct=${s.clientType} ex=${s.expertise} len=${s.length} role=${s.role} econ=${s.econContext} loc2=${s.locSecondary} skill=${s.skill.toFixed(1)} rec=${s.recency} | ${p.project_type}/${p.client_type}/${p.expertise_level}/${p.project_length} ${p.client_country}`);
  }
}

// Component magnitude analysis: across all queries, which signal contributes most?
console.log(`\n=== COMPONENT MAGNITUDES (across 3 queries × 30 projects = 90 obs) ===`);
const allBreakdowns: ScoreBreakdown[] = [];
for (const { q } of queries) {
  for (const p of data) allBreakdowns.push(score(p, q, idf));
}
const fields: (keyof ScoreBreakdown)[] = ["projectType", "clientType", "expertise", "length", "role", "econContext", "locSecondary", "skill", "recency"];
for (const f of fields) {
  const vals = allBreakdowns.map((b) => b[f]);
  const sum = vals.reduce((a, b) => a + b, 0);
  const nz = vals.filter((v) => v > 0).length;
  const mean = sum / vals.length;
  const meanWhenHit = nz ? sum / nz : 0;
  console.log(`  ${f.padEnd(14)} hits=${nz}/90 (${((nz/90)*100).toFixed(0)}%)  sum=${sum.toFixed(1)}  mean=${mean.toFixed(2)}  mean-when-hit=${meanWhenHit.toFixed(2)}`);
}
