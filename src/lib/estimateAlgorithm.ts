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
  // Legacy values — kept for backward compat with existing DB entries.
  //
  // `one-off` and `performance` were originally mapped to 1 day, which produced
  // implausible per-day rates ($8000/day median for one-off, $3000/day for
  // performance) — 5–14× the rate of comparable buckets like `medium` ($556/day)
  // and `short` ($1714/day). See context/scientific-review-findings.md F4/F5
  // and probe 07. Re-mapped to bring per-day medians into the same band:
  //   - `one-off`    1 → 7  (single deliverable, ~1 week of focused work)
  //   - `performance` 1 → 3 (1 stage day + ~2 days prep)
  "one-off": 7,
  "short": 7,
  "medium": 45,
  "long": 120,
  "performance": 3,
  "tour": 30,
  "installation-temp": 30,
  "installation-perm": 60,
};

/** Derives a project_length bucket from a raw day count — used for backward-compat similarity scoring when a submission has days_of_work but no project_length */
export const daysToProjectLength = (days: number | null | undefined): string | null => {
  if (!days || days <= 0) return null;
  if (days <= 1) return "day";
  if (days <= 5) return "2-5-days";
  if (days <= 14) return "1-2-weeks";
  if (days <= 90) return "1-3-months";
  if (days <= 180) return "3-6-months";
  return "6plus-months";
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

/**
 * @deprecated Use `confidenceFromMetrics(ess, topScore)` instead.
 *
 * ESS-only confidence ignores absolute match quality. Across realistic queries
 * (probe 08, see context/scientific-review-findings.md F6), every query reports
 * "high" because ESS = (Σw)²/Σw² is large by construction once the qualifying
 * pool exceeds ~10 projects with weights in the 30–80 range — even when the
 * single best match scores ~48 out of theoretical max ~122.
 *
 * Kept for backward compat. New call sites should pass the top match score so
 * niche queries with weak matches degrade to "medium" or "low".
 */
export const essToConfidence = (ess: number): "high" | "medium" | "low" => {
  if (ess >= 8) return "high";
  if (ess >= 5) return "medium";
  return "low";
};

/**
 * Confidence gated on BOTH effective sample size AND absolute match quality.
 *
 * Floors come from probe 06 score distributions (context/scientific-review-findings.md F6):
 *   - 60: a "genuine" match — e.g. project_type (20) + client_type (25) + ≥2/3 skill weight ≈ 65
 *   - 40: a "partial" match — e.g. project_type + 1/2-skill + recency ≈ 38
 *
 * - high   when ess ≥ 8 AND topScore ≥ 60
 * - medium when ess ≥ 5 OR  topScore ≥ 40
 * - low    otherwise
 */
export const confidenceFromMetrics = (
  ess: number,
  topScore: number
): "high" | "medium" | "low" => {
  if (ess >= 8 && topScore >= 60) return "high";
  if (ess >= 5 || topScore >= 40) return "medium";
  return "low";
};
