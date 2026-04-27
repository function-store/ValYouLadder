# Algorithm Audit Findings

**Date:** 2026-04-27  
**Scope:** Cost estimation pipeline (`src/pages/Estimate.tsx`) and AI edge function (`supabase/functions/estimate-rate/index.ts`)

---

## Executive Summary

The current estimation system uses a hand-crafted additive similarity score to rank projects, then computes unweighted percentiles over the top 20 matches. Six structural weaknesses reduce estimate quality and calibration. All are fixable in pure TypeScript without external dependencies.

---

## Finding 1: Equal-Weight Percentiles

**Severity:** High  
**Location:** `Estimate.tsx` lines 135–154 (`calculateFromRealData`)

**Problem:** After scoring and ranking, the top 20 projects all contribute equally to percentile calculation regardless of their similarity score. A project scoring 8/120 has the same influence as one scoring 110/120.

**Impact:** Estimates are pulled toward irrelevant data points that happened to rank in the top 20 due to the limited candidate pool.

**Recommendation:** Use *similarity-weighted percentiles*. For each sorted budget value, accumulate the project's similarity score as its weight. The 25th/50th/75th percentiles are found at the points where cumulative weight reaches 25%/50%/75% of total weight. This is the standard weighted quantile algorithm (Type 7 interpolation).

---

## Finding 2: No Minimum Score Threshold

**Severity:** High  
**Location:** `Estimate.tsx` lines 110–131 (`fetchSimilarProjects`)

**Problem:** All 100 fetched projects are scored and the top 20 are used — even if the "best" match scores 5/120. There is no floor below which a project is considered irrelevant.

**Impact:** When few good matches exist, the estimate pool is padded with near-random data. The user receives no signal that the estimate is unreliable.

**Recommendation:**  
1. Set a minimum similarity threshold (suggested: 15 points, ~12.5% of max). Projects below this are excluded.  
2. Expose an effective sample size (count of projects above threshold) as a confidence signal.  
3. When effective sample size < 5, surface a "low confidence" indicator to the UI (feeds into existing `confidenceLevel` field).

---

## Finding 3: Unnormalized Budgets

**Severity:** High  
**Location:** `Estimate.tsx` line 140 (`projects.map(p => p.budget)`)

**Problem:** `your_budget` is the total amount paid to the respondent for the entire project. A 3-month engagement at $15k and a 1-day gig at $500 are treated as comparable numbers. `project_length` and `team_size` fields exist in the DB but aren't used to normalize.

**Impact:** Percentiles mix fundamentally different rate structures, making the estimate unreliable when the match pool spans heterogeneous project lengths.

**Recommendation:** Normalize to a *daily effective rate*:
```
effective_rate = your_budget / (duration_in_days * team_size_factor)
```
Where `duration_in_days` maps `project_length` categories to midpoint days:
- "Less than a day" → 0.5
- "1-3 days" → 2
- "1 week" → 5
- "2-4 weeks" → 15
- "1-3 months" → 45
- "3-6 months" → 90  
- "6+ months" → 180

And `team_size_factor` = 1 (since `your_budget` already represents the respondent's share, team_size normalization is unnecessary — the field represents how many people were on the project, not how many split the budget).

After computing percentiles on normalized rates, scale the final estimate back to the user's requested `project_length`.

---

## Finding 4: Flat Skill Weighting (No IDF)

**Severity:** Medium  
**Location:** `Estimate.tsx` lines 77–82

**Problem:** Skills are weighted purely by overlap ratio: `matchingSkills.length / selectedSkills.length`. Matching on "Ableton Live" (common) counts the same as matching on "Notch" (rare/specialized). Rare skill matches are stronger relevance signals.

**Impact:** Common skills dominate similarity scores, reducing the system's ability to differentiate specialized projects.

**Recommendation:** Apply TF-IDF-style weighting:
```
skill_weight(s) = log(N / count_of_projects_with_skill_s)
weighted_overlap = sum(skill_weight for matching skills) / sum(skill_weight for all selected skills)
```
Where `N` is the total project count in the candidate pool. This upweights rare skills and downweights ubiquitous ones.

---

## Finding 5: Thin-Data Silence

**Severity:** Medium  
**Location:** `Estimate.tsx` lines 257–272

**Problem:** When 1–4 projects are in the match pool, the system produces an estimate with no confidence signal. With 1 project, Q1 = Q3 = median = that single value. The user has no way to know the estimate is unreliable.

**Impact:** Users may anchor on low-confidence estimates, leading to poor pricing decisions.

**Recommendation:**  
1. Compute an *effective sample size* (ESS) = `(sum of weights)^2 / sum(weights^2)`. This accounts for the fact that weighted estimates with highly skewed weights have fewer effective observations.  
2. Map ESS to confidence: ESS >= 8 → "high", 5–7 → "medium", < 5 → "low".  
3. Surface this in the existing `confidenceLevel` field, even when AI is not used.  
4. When ESS < 3, show an explicit warning: "Very few comparable projects found. This estimate has high uncertainty."

---

## Finding 6: Weak Recency Adjustment

**Severity:** Low  
**Location:** `Estimate.tsx` lines 84–87

**Problem:** Recency contributes only +5/+3 points (4%/2.5% of max score). Industry rate inflation of 5–15% per year is not reflected in budget values.

**Impact:** Old budgets drag estimates down. A 2022 project budget doesn't represent 2026 market rates.

**Recommendation:**  
1. Apply an inflation adjustment to normalized rates before percentile calculation: `adjusted_rate = rate * (1 + annual_inflation)^(current_year - project_year)`. Use `annual_inflation = 0.05` (conservative 5%).  
2. Increase recency weight in similarity scoring to +8/+5/+2 for current/prev/2-years-ago (tapering rather than cliff).

---

## Finding 7: Limited Candidate Pool (100 most recent)

**Severity:** Medium  
**Location:** `Estimate.tsx` lines 94–98

**Problem:** Only the 100 most recent submissions are fetched. Older but highly relevant projects are completely excluded.

**Impact:** As the database grows, the effective recall drops. A niche skill may have its best matches beyond position 100.

**Recommendation:** Fetch up to 500 projects (or use server-side pre-filtering via Supabase RPC with `project_type` and/or GIN skill array overlap). This is a performance concern — 500 records scored client-side is still fast, and server-side filtering is even better. For now, increasing to 500 is the minimal fix.

---

## Priority Order for Implementation

| Priority | Finding | Rationale |
|----------|---------|-----------|
| 1 | F3 (Budget normalization) | Fundamental correctness — comparing apples to oranges |
| 2 | F1 (Weighted percentiles) | Core statistical improvement |
| 3 | F2 (Score threshold) | Prevents garbage-in dilution |
| 4 | F5 (Confidence signal) | User trust and decision quality |
| 5 | F4 (Skill IDF) | Moderate improvement to relevance |
| 6 | F6 (Recency) | Rate inflation correction |
| 7 | F7 (Candidate pool) | Scalability fix |

---

## Implementation Constraints

- No schema migrations (columns stay stable)
- All computation in pure TypeScript (client-side + Deno edge function)
- Confidence signal should feed into existing `confidenceLevel` field
- Don't touch sanitization pipeline or auth surfaces
- `project_length` category → days mapping must be maintained as a constant
