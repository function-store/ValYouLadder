/**
 * Pure algorithm functions for the estimation pipeline.
 * Extracted for testability — these have no React or Supabase dependencies.
 */

/** Maps project_length categories to midpoint days for rate normalization */
export const DURATION_DAYS: Record<string, number> = {
  // Current values
  "day": 1,
  "2-5-days": 3.5,
  "1-2-weeks": 7,
  "1-3-months": 45,
  "3-6-months": 90,
  "6plus-months": 180,
  // Legacy values — kept for backward compat with existing DB entries
  "one-off": 1,
  "short": 7,
  "medium": 45,
  "long": 120,
  "performance": 1,
  "tour": 30,
  "installation-temp": 30,
  "installation-perm": 60,
};

/** Projects scoring below this are excluded — prevents irrelevant data from diluting estimates */
export const MIN_SIMILARITY_THRESHOLD = 15;

/** Conservative annual rate inflation used to adjust older project budgets to current-year equivalents */
export const ANNUAL_INFLATION = 0.05;

/**
 * Compute IDF weights for skills based on how rare they are in the candidate pool.
 * Rare skills carry more signal than common ones (standard TF-IDF reasoning).
 */
export const computeSkillIdf = (
  projects: { skills: string[] }[]
): Map<string, number> => {
  const totalProjects = projects.length;
  if (totalProjects === 0) return new Map();

  const skillCounts = new Map<string, number>();

  for (const p of projects) {
    const seen = new Set(p.skills);
    for (const s of seen) {
      skillCounts.set(s, (skillCounts.get(s) || 0) + 1);
    }
  }

  const idfMap = new Map<string, number>();
  for (const [skill, count] of skillCounts) {
    idfMap.set(skill, Math.log(totalProjects / count));
  }
  return idfMap;
};

/**
 * Weighted percentile (Type 7 interpolation).
 * Sorts values by rate, accumulates weights, finds quantile by cumulative weight proportion.
 */
export const weightedPercentile = (
  items: { value: number; weight: number }[],
  p: number
): number => {
  if (items.length === 0) return 0;
  if (items.length === 1) return items[0].value;

  const sorted = [...items].sort((a, b) => a.value - b.value);
  const totalWeight = sorted.reduce((sum, item) => sum + item.weight, 0);
  const target = p * totalWeight;

  let cumulative = 0;
  for (let i = 0; i < sorted.length; i++) {
    cumulative += sorted[i].weight;
    if (cumulative >= target) {
      if (i === 0) return sorted[0].value;
      const prevCumulative = cumulative - sorted[i].weight;
      const fraction = (target - prevCumulative) / sorted[i].weight;
      return sorted[i - 1].value + fraction * (sorted[i].value - sorted[i - 1].value);
    }
  }
  return sorted[sorted.length - 1].value;
};

/**
 * Effective Sample Size accounts for weight concentration.
 * ESS = (sum weights)^2 / sum(weight^2). Tells us how many "effective" observations we have.
 */
export const computeESS = (weights: number[]): number => {
  if (weights.length === 0) return 0;
  const sumW = weights.reduce((a, b) => a + b, 0);
  const sumW2 = weights.reduce((a, w) => a + w * w, 0);
  if (sumW2 === 0) return 0;
  return (sumW * sumW) / sumW2;
};

/** Map ESS to a human-readable confidence level */
export const essToConfidence = (ess: number): "high" | "medium" | "low" => {
  if (ess >= 8) return "high";
  if (ess >= 5) return "medium";
  return "low";
};
