/**
 * Standalone validation script — runs the old and new estimation algorithms
 * on synthetic but realistic test scenarios to produce comparison data.
 *
 * Run: npx tsx context/validation-calc.ts
 */

// ── Algorithm constants (mirrored from src/lib/estimateAlgorithm.ts) ──────

const DURATION_DAYS: Record<string, number> = {
  "Less than a day": 0.5,
  "1-3 days": 2,
  "1 week": 5,
  "2-4 weeks": 15,
  "1-3 months": 45,
  "3-6 months": 90,
  "6+ months": 180,
};

const MIN_SIMILARITY_THRESHOLD = 15;
const ANNUAL_INFLATION = 0.05;

// ── Algorithm functions ───────────────────────────────────────────────────

function computeSkillIdf(projects: { skills: string[] }[]): Map<string, number> {
  const total = projects.length;
  if (total === 0) return new Map();
  const counts = new Map<string, number>();
  for (const p of projects) {
    const seen = new Set(p.skills);
    for (const s of seen) counts.set(s, (counts.get(s) || 0) + 1);
  }
  const idf = new Map<string, number>();
  for (const [skill, count] of counts) idf.set(skill, Math.log(total / count));
  return idf;
}

function weightedPercentile(items: { value: number; weight: number }[], p: number): number {
  if (items.length === 0) return 0;
  if (items.length === 1) return items[0].value;
  const sorted = [...items].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((s, i) => s + i.weight, 0);
  const target = p * totalWeight;
  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].weight;
    if (cumulative >= target) {
      if (i === 0) return sorted[0].value;
      const prev = cumulative - sorted[i].weight;
      const frac = (target - prev) / sorted[i].weight;
      return sorted[i - 1].value + frac * (sorted[i].value - sorted[i - 1].value);
    }
  }
  return sorted[sorted.length - 1].value;
}

function computeESS(weights: number[]): number {
  if (weights.length === 0) return 0;
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumW2 = weights.reduce((a, w) => a + w * w, 0);
  if (sumW2 === 0) return 0;
  return (sumW * sumW) / sumW2;
}

function essToConfidence(ess: number): string {
  if (ess >= 8) return "high";
  if (ess >= 5) return "medium";
  return "low";
}

// ── Unweighted percentile (old algorithm) ─────────────────────────────────

function unweightedPercentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = p * (sorted.length - 1);
  const lo = Math.floor(idx);
  const hi = Math.ceil(idx);
  if (lo === hi) return sorted[lo];
  return sorted[lo] + (idx - lo) * (sorted[hi] - sorted[lo]);
}

// ── Project type ──────────────────────────────────────────────────────────

interface Project {
  id: string;
  project_type: string;
  client_type: string;
  project_length: string;
  skills: string[];
  expertise_level: string;
  your_budget: number;
  year_completed: number;
  team_size: number;
  client_country: string;
  project_location: string;
}

interface Query {
  projectType: string;
  clientType: string;
  projectLength: string;
  skills: string[];
  expertiseLevel: string;
  clientCountry: string;
  projectLocation: string;
}

// ── Old algorithm (pre-audit) ─────────────────────────────────────────────

function oldSimilarityScore(project: Project, query: Query): number {
  let score = 0;
  if (project.project_type === query.projectType) score += 20;
  if (project.client_type === query.clientType) score += 25;
  if (project.expertise_level === query.expertiseLevel) score += 15;
  if (project.project_length === query.projectLength) score += 10;
  if (project.project_location === query.projectLocation) score += 10;
  if (project.client_country === query.clientCountry) score += 5;

  // Flat skill ratio (no IDF)
  if (query.skills.length > 0) {
    const projSkills = new Set(project.skills);
    const matching = query.skills.filter(s => projSkills.has(s)).length;
    score += (matching / query.skills.length) * 30;
  }

  // Weak recency (+5/+3)
  const yearsAgo = 2026 - project.year_completed;
  if (yearsAgo === 0) score += 5;
  else if (yearsAgo === 1) score += 3;

  return score;
}

function oldEstimate(pool: Project[], query: Query) {
  // Score all, take top 20 (no threshold)
  const scored = pool
    .map(p => ({ p, score: oldSimilarityScore(p, query) }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 20);

  // Unweighted percentiles on raw budget (no normalization)
  const budgets = scored.map(s => s.p.your_budget);
  return {
    low: Math.round(unweightedPercentile(budgets, 0.25)),
    mid: Math.round(unweightedPercentile(budgets, 0.5)),
    high: Math.round(unweightedPercentile(budgets, 0.75)),
    sampleSize: scored.length,
    scores: scored.map(s => s.score),
    minScore: Math.min(...scored.map(s => s.score)),
    maxScore: Math.max(...scored.map(s => s.score)),
    confidence: "none (not computed)",
  };
}

// ── New algorithm (post-audit) ────────────────────────────────────────────

function newSimilarityScore(project: Project, query: Query, skillIdf: Map<string, number>): number {
  let score = 0;
  if (project.project_type === query.projectType) score += 20;
  if (project.client_type === query.clientType) score += 25;
  if (project.expertise_level === query.expertiseLevel) score += 15;
  if (project.project_length === query.projectLength) score += 10;
  if (project.project_location === query.projectLocation) score += 10;
  if (project.client_country === query.clientCountry) score += 5;

  // IDF-weighted skill overlap
  if (query.skills.length > 0) {
    const projSkills = new Set(project.skills);
    let matchIdf = 0, totalIdf = 0;
    for (const s of query.skills) {
      const idf = skillIdf.get(s) || 0;
      totalIdf += idf;
      if (projSkills.has(s)) matchIdf += idf;
    }
    const skillScore = totalIdf > 0 ? matchIdf / totalIdf : 0;
    score += skillScore * 30;
  }

  // Improved recency (+8/+5/+2)
  const yearsAgo = 2026 - project.year_completed;
  if (yearsAgo === 0) score += 8;
  else if (yearsAgo === 1) score += 5;
  else if (yearsAgo === 2) score += 2;

  return score;
}

function newEstimate(pool: Project[], query: Query) {
  const skillIdf = computeSkillIdf(pool);
  const scored = pool
    .map(p => ({ p, score: newSimilarityScore(p, query, skillIdf) }))
    .filter(s => s.score >= MIN_SIMILARITY_THRESHOLD)
    .sort((a, b) => b.score - a.score)
    .slice(0, 50);

  if (scored.length === 0) {
    return { low: 0, mid: 0, high: 0, sampleSize: 0, scores: [] as number[], minScore: 0, maxScore: 0, confidence: "none (no matches)", ess: 0 };
  }

  const userDays = DURATION_DAYS[query.projectLength] || 15;

  // Normalize to daily rate + inflation adjustment
  const weightedItems = scored.map(s => {
    const days = DURATION_DAYS[s.p.project_length] || 15;
    const dailyRate = s.p.your_budget / days;
    const yearsOld = 2026 - s.p.year_completed;
    const adjusted = dailyRate * Math.pow(1 + ANNUAL_INFLATION, yearsOld);
    return { value: adjusted, weight: s.score };
  });

  const low = weightedPercentile(weightedItems, 0.25) * userDays;
  const mid = weightedPercentile(weightedItems, 0.5) * userDays;
  const high = weightedPercentile(weightedItems, 0.75) * userDays;
  const ess = computeESS(scored.map(s => s.score));
  const confidence = essToConfidence(ess);

  return {
    low: Math.round(low),
    mid: Math.round(mid),
    high: Math.round(high),
    sampleSize: scored.length,
    scores: scored.map(s => s.score),
    minScore: Math.min(...scored.map(s => s.score)),
    maxScore: Math.max(...scored.map(s => s.score)),
    confidence,
    ess: Math.round(ess * 10) / 10,
  };
}

// ── Test Scenarios ────────────────────────────────────────────────────────

const COMMON_SKILLS = ["Ableton Live", "Pro Tools", "Logic Pro", "FL Studio", "Cubase"];
const RARE_SKILLS = ["Notch", "TouchDesigner", "Unreal Engine"];

function makeProject(overrides: Partial<Project> & { id: string }): Project {
  return {
    project_type: "Music Production",
    client_type: "Agency",
    project_length: "2-4 weeks",
    skills: ["Ableton Live"],
    expertise_level: "Mid-Level",
    your_budget: 3000,
    year_completed: 2025,
    team_size: 1,
    client_country: "US",
    project_location: "Remote",
    ...overrides,
  };
}

// ── Scenario 1: Niche Specialist ──────────────────────────────────────────

function scenario1() {
  const query: Query = {
    projectType: "Live Visual Performance",
    clientType: "Direct Client",
    projectLength: "1-3 days",
    skills: ["Notch", "TouchDesigner"],
    expertiseLevel: "Expert",
    clientCountry: "UK",
    projectLocation: "On-site",
  };

  const pool: Project[] = [
    makeProject({ id: "n1", project_type: "Live Visual Performance", client_type: "Direct Client", project_length: "1-3 days", skills: ["Notch", "TouchDesigner", "Ableton Live"], expertise_level: "Expert", your_budget: 2000, year_completed: 2025, client_country: "UK", project_location: "On-site" }),
    makeProject({ id: "n2", project_type: "Live Visual Performance", client_type: "Direct Client", project_length: "1 week", skills: ["Notch"], expertise_level: "Expert", your_budget: 4500, year_completed: 2024, client_country: "US", project_location: "On-site" }),
    makeProject({ id: "n3", project_type: "Live Visual Performance", client_type: "Agency", project_length: "1-3 days", skills: ["TouchDesigner"], expertise_level: "Mid-Level", your_budget: 1200, year_completed: 2026, client_country: "UK", project_location: "Remote" }),
    ...Array.from({ length: 17 }, (_, i) => makeProject({
      id: `fill-${i}`,
      project_type: "Music Production",
      client_type: "Agency",
      project_length: ["2-4 weeks", "1-3 months", "3-6 months"][i % 3],
      skills: COMMON_SKILLS.slice(0, 2 + (i % 3)),
      expertise_level: "Mid-Level",
      your_budget: 2000 + i * 500,
      year_completed: 2023 + (i % 4),
      client_country: "US",
      project_location: "Remote",
    })),
  ];

  return { name: "Scenario 1: Niche Specialist (Notch + TouchDesigner, 1-3 day gig)", query, pool };
}

// ── Scenario 2: Generic Common Project ────────────────────────────────────

function scenario2() {
  const query: Query = {
    projectType: "Music Production",
    clientType: "Agency",
    projectLength: "2-4 weeks",
    skills: ["Ableton Live", "Pro Tools"],
    expertiseLevel: "Mid-Level",
    clientCountry: "US",
    projectLocation: "Remote",
  };

  const pool: Project[] = Array.from({ length: 30 }, (_, i) => makeProject({
    id: `gen-${i}`,
    project_type: "Music Production",
    client_type: i < 20 ? "Agency" : "Direct Client",
    project_length: i < 15 ? "2-4 weeks" : (i < 22 ? "1-3 months" : "1 week"),
    skills: i < 18 ? ["Ableton Live", "Pro Tools"] : ["Ableton Live", "Logic Pro"],
    expertise_level: i < 20 ? "Mid-Level" : "Expert",
    your_budget: 2500 + (i * 300) + (i % 3 === 0 ? 500 : 0),
    year_completed: 2023 + (i % 4),
    client_country: "US",
    project_location: i < 25 ? "Remote" : "On-site",
  }));

  return { name: "Scenario 2: Generic Common Project (Ableton + Pro Tools, 2-4 weeks)", query, pool };
}

// ── Scenario 3: Thin Data ─────────────────────────────────────────────────

function scenario3() {
  const query: Query = {
    projectType: "Sound Design for VR",
    clientType: "Direct Client",
    projectLength: "1-3 months",
    skills: ["Unreal Engine", "Notch"],
    expertiseLevel: "Expert",
    clientCountry: "DE",
    projectLocation: "Remote",
  };

  const pool: Project[] = [
    makeProject({ id: "t1", project_type: "Sound Design for VR", client_type: "Direct Client", project_length: "1-3 months", skills: ["Unreal Engine"], expertise_level: "Expert", your_budget: 12000, year_completed: 2025, client_country: "DE", project_location: "Remote" }),
    makeProject({ id: "t2", project_type: "Sound Design for VR", client_type: "Agency", project_length: "2-4 weeks", skills: ["Unreal Engine", "Notch"], expertise_level: "Mid-Level", your_budget: 5500, year_completed: 2024, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "t3", project_type: "Music Production", client_type: "Direct Client", project_length: "1-3 months", skills: ["Notch"], expertise_level: "Expert", your_budget: 8000, year_completed: 2023, client_country: "UK", project_location: "On-site" }),
    ...Array.from({ length: 17 }, (_, i) => makeProject({
      id: `noise-${i}`,
      project_type: "Music Production",
      client_type: "Agency",
      project_length: "2-4 weeks",
      skills: ["FL Studio", "Cubase"],
      expertise_level: "Junior",
      your_budget: 800 + i * 200,
      year_completed: 2022 + (i % 3),
    })),
  ];

  return { name: "Scenario 3: Thin Data (VR Sound Design, only 3 relevant matches)", query, pool };
}

// ── Scenario 4: Mixed Duration Pool ───────────────────────────────────────

function scenario4() {
  const query: Query = {
    projectType: "Music Production",
    clientType: "Direct Client",
    projectLength: "1 week",
    skills: ["Ableton Live", "Pro Tools", "Logic Pro"],
    expertiseLevel: "Mid-Level",
    clientCountry: "US",
    projectLocation: "Remote",
  };

  const pool: Project[] = [
    makeProject({ id: "d1", project_type: "Music Production", client_type: "Direct Client", project_length: "Less than a day", skills: ["Ableton Live", "Pro Tools"], expertise_level: "Mid-Level", your_budget: 400, year_completed: 2025, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d2", project_type: "Music Production", client_type: "Direct Client", project_length: "1-3 days", skills: ["Ableton Live", "Pro Tools", "Logic Pro"], expertise_level: "Mid-Level", your_budget: 1500, year_completed: 2026, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d3", project_type: "Music Production", client_type: "Direct Client", project_length: "1 week", skills: ["Ableton Live", "Logic Pro"], expertise_level: "Mid-Level", your_budget: 3000, year_completed: 2025, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d4", project_type: "Music Production", client_type: "Direct Client", project_length: "2-4 weeks", skills: ["Ableton Live", "Pro Tools"], expertise_level: "Mid-Level", your_budget: 7500, year_completed: 2024, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d5", project_type: "Music Production", client_type: "Direct Client", project_length: "1-3 months", skills: ["Ableton Live", "Pro Tools", "Logic Pro"], expertise_level: "Mid-Level", your_budget: 18000, year_completed: 2025, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d6", project_type: "Music Production", client_type: "Direct Client", project_length: "3-6 months", skills: ["Ableton Live"], expertise_level: "Expert", your_budget: 45000, year_completed: 2023, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d7", project_type: "Music Production", client_type: "Agency", project_length: "6+ months", skills: ["Pro Tools", "Logic Pro"], expertise_level: "Mid-Level", your_budget: 72000, year_completed: 2024, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d8", project_type: "Music Production", client_type: "Direct Client", project_length: "1 week", skills: ["Ableton Live", "Pro Tools"], expertise_level: "Mid-Level", your_budget: 3500, year_completed: 2026, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d9", project_type: "Music Production", client_type: "Direct Client", project_length: "1-3 months", skills: ["Ableton Live", "Pro Tools"], expertise_level: "Mid-Level", your_budget: 15000, year_completed: 2026, client_country: "US", project_location: "Remote" }),
    makeProject({ id: "d10", project_type: "Music Production", client_type: "Direct Client", project_length: "1-3 days", skills: ["Ableton Live", "Logic Pro"], expertise_level: "Mid-Level", your_budget: 1200, year_completed: 2025, client_country: "US", project_location: "Remote" }),
  ];

  return { name: "Scenario 4: Mixed-Duration Pool (query = 1 week, pool spans <1 day to 6+ months)", query, pool };
}

// ── Run all scenarios ─────────────────────────────────────────────────────

for (const scenarioFn of [scenario1, scenario2, scenario3, scenario4]) {
  const { name, query, pool } = scenarioFn();
  console.log(`\n${"=".repeat(80)}`);
  console.log(name);
  console.log(`${"=".repeat(80)}`);
  console.log(`Query: ${query.projectType} | ${query.skills.join(", ")} | ${query.projectLength} | ${query.expertiseLevel}`);
  console.log(`Pool size: ${pool.length} projects`);

  const oldResult = oldEstimate(pool, query);
  const newResult = newEstimate(pool, query);

  console.log(`\n--- OLD Algorithm ---`);
  console.log(`  Sample used: ${oldResult.sampleSize} (no threshold)`);
  console.log(`  Score range: ${oldResult.minScore.toFixed(1)} – ${oldResult.maxScore.toFixed(1)}`);
  console.log(`  Low (P25): $${oldResult.low.toLocaleString()}`);
  console.log(`  Mid (P50): $${oldResult.mid.toLocaleString()}`);
  console.log(`  High (P75): $${oldResult.high.toLocaleString()}`);
  console.log(`  Confidence: ${oldResult.confidence}`);

  console.log(`\n--- NEW Algorithm ---`);
  console.log(`  Sample used: ${newResult.sampleSize} (threshold >= ${MIN_SIMILARITY_THRESHOLD})`);
  console.log(`  Score range: ${newResult.minScore.toFixed(1)} – ${newResult.maxScore.toFixed(1)}`);
  console.log(`  Low (P25): $${newResult.low.toLocaleString()}`);
  console.log(`  Mid (P50): $${newResult.mid.toLocaleString()}`);
  console.log(`  High (P75): $${newResult.high.toLocaleString()}`);
  console.log(`  Confidence: ${newResult.confidence} (ESS=${newResult.ess || "N/A"})`);
}
