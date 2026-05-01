# Algorithm Scientific Review — Findings

**Date:** 2026-05-01
**Probed by:** orchestrator (mission `algorithm-scientific-review`, run 20)
**Method:** Live queries against production Supabase (`ecflucezmmvzpereikik`), end-to-end algorithm runs on the real candidate pool, edge-function smoke test.
**Probe scripts:** `context/probes/01–10`. All numbers below are reproducible from `context/probes/data.json` (snapshot of `project_submissions` taken 2026-05-01).

---

## TL;DR

The algorithm has been audited against the **real production database**. The most consequential finding is a **broken schema migration** — half the algorithm features described in `ALGORITHM.md` cannot fire because the columns they read don't exist. A second order of findings concerns calibration assumptions (ESS thresholds, legacy duration midpoints, scoring weights) that are out of step with what the data shows.

| # | Finding | Severity | Status |
|---|---------|----------|--------|
| F1 | Migration `20260427000000` never applied → `currency`, `rate_type`, `your_role` columns missing in production. **Submissions return PGRST204.** | **Critical (blocks all submits)** | Fix required |
| F2 | TS types declare `currency: string` (non-null) but column doesn't exist. Code reads `p.currency ?? "USD"` and silently no-ops. | **Critical** | Fix required |
| F3 | `team_size` still exists in production despite migration declaring `DROP COLUMN`. Stale data. | Low | Document |
| F4 | Legacy `project_length` value `one-off` mapped to **1 day** produces median $8000/day rate vs `medium` bucket's $556/day — 14× spread. Cross-bucket queries with `one-off` matches will return absurd estimates. | **High** | Fix required |
| F5 | Legacy `performance` mapped to 1 day; "performance" gigs include unpaid prep — median $3000/day vs medium's $556/day. Same class of bug as F4. | High | Fix required |
| F6 | ESS thresholds (≥8 high, ≥5 medium) never trigger anything below "high" on this dataset. Real ESS distribution across 6 representative queries: 16.28–25.51. **Confidence signal currently useless.** | High | Fix required |
| F7 | `MIN_SIMILARITY_THRESHOLD = 15` filters 1–12 rows out of 30 in realistic queries — too lenient. With weak matches scoring ~30, threshold of 15 admits noise. | Medium | Fix or document |
| F8 | `your_role` similarity (10 pt) **never fires** (0/90 observations) because the column doesn't exist in DB → scoring max in practice is ~112, not 122. | Medium (cascade of F1) | Resolved by F1 fix |
| F9 | `rate_representativeness` multiplier (0.5/0.85/1.0) never applied — 0/30 rows have a value. **The 0.5 and 0.85 numbers cannot be empirically validated** with current data. | Medium (data thin) | Document |
| F10 | `days_of_work` is null for all 30 rows → `DURATION_DAYS` midpoint plausibility cannot be empirically verified. | Medium (data thin) | Document |
| F11 | Top-50 slice never bites with 30-row dataset, but slice sensitivity *within* the qualifying pool is meaningful: top-10 vs top-20 changes p75 by up to 76% (TD/PM US Senior query). Sensitivity exists but cutoff value unverifiable until corpus grows. | Low | Document |
| F12 | 5% annual inflation is a 10% max distortion on this dataset (all 2024–2025). Plausible for creative tech but borrowed from general intuition; no creative-tech-specific source. | Low | Document |
| F13 | Economic context priority (`client_country ?? project_location`) — only 3/30 rows differ. Variance reduction test inconclusive (within-group stdev ≈ total stdev for both groupings). Cannot verify the choice. | Low (data thin) | Document |
| F14 | Historical FX rates: irrelevant *now* (no `currency` column = nothing converts), but once F1 is fixed, the today's-rate approximation introduces 5–100% error for volatile-currency submissions older than 1 yr. | Low → High after F1 | Document |

---

## Detailed Findings

### F1 — Migration `20260427000000_revise_schema_fields.sql` not applied to production

**Evidence:**
- Probe `04-schema-probe.ts` enumerates every expected column. Result:
  - `currency` MISSING — `column project_submissions.currency does not exist`
  - `rate_type` MISSING
  - `your_role` MISSING
  - `team_size` STILL EXISTS (migration declares `DROP COLUMN`)
- Probe `10-submit-attempt.ts` attempts an actual insert mimicking the edge function. Result: `PGRST204 — Could not find the 'currency' column of 'project_submissions' in the schema cache`.
- The form (`SubmitProject.tsx` line 149) requires `currency`. The edge function (`supabase/functions/submit-project/index.ts` lines 96–115) inserts `currency`, `rate_type`, `your_role`. **Every real submission attempt to production currently fails.**
- This explains why all 30 rows in the DB are dated `2026-04-27T18:28:00.750001` — they're a single seed batch loaded before the migration was authored. Zero real submissions have arrived since.

**Why the previous agent missed it:** It reasoned about whether currency conversion was *important* without checking whether currency was *populated*. `p.currency ?? "USD"` silently degrades to "always USD" when the column is missing, so the "modest distortion" framing was technically right for the live data — but only because the algorithm never gets to do conversion at all.

**Fix:** Apply the migration to production. Confirm submissions go through. Then the currency normalization, role-similarity, and rate_type code paths can actually exercise.

---

### F4/F5 — Legacy `one-off` and `performance` mapped to 1 day produce gross overestimates

**Evidence (probe 07):**

| bucket | midpoint | n | median budget | median daily rate |
|---|---|---|---|---|
| medium | 45 | 7 | $25,000 | **$556/day** |
| short | 7 | 6 | $12,000 | $1,714/day |
| long | 120 | 3 | $90,000 | $750/day |
| installation-perm | 60 | 2 | $75,000 | $1,250/day |
| installation-temp | 30 | 2 | $35,000 | $1,167/day |
| **one-off** | **1** | 7 | $8,000 | **$8,000/day** |
| **performance** | **1** | 2 | $3,000 | **$3,000/day** |
| tour | 30 | 1 | $60,000 | $2,000/day |

**The problem:** When a query for `medium` (45 days) matches some `one-off` projects, the algorithm normalizes those projects to $8000/day, computes a percentile, then multiplies by 45 → it can output $360k as the "estimate" for what should be a ~$25k project. The semantic mismatch between "one-off = single deliverable, not literally one day" and the 1-day code mapping is a real bug.

**Recommendation:** Re-map legacy values:
- `one-off` → **7 days** (typical: 1 deliverable taking ~1 week of focused work)
- `performance` → **3 days** (1 day stage + 2 days prep, average across data)
- Keep `tour` at 30 (the one record fits)

These should be data-informed, not arbitrary. With n=7 for `one-off` we have weak but real signal: the actual median budget is $8k for a "one-off," and if the rest of the dataset's cross-bucket median daily is around $1,000–$2,500, then `one-off` ≈ 4–8 days produces consistent rates. **7 is in that band and matches the ad-hoc convention "a week's work for a single deliverable."**

For `performance`: with only n=2, this is a judgment call. 3 days encodes "1 show + 2 days prep" which is the realistic minimum.

---

### F6 — ESS thresholds are too low for current dataset shape

**Evidence (probe 08):** Across 6 representative queries:

| Query | Pool size | ESS (top-50) | Reported confidence |
|---|---|---|---|
| TD/PM medium US Senior agency | 29 | 25.51 | high |
| Notch+UE expert performance UK | 18 | 16.28 | high |
| TD short generic | 27 | 23.40 | high |
| LED long Germany institution | 27 | 22.91 | high |
| Junior workshop France small-brand | 21 | 17.15 | high |
| 3D Modeling collaboration Japan | 20 | 16.53 | high |

**Every query reports "high" confidence.** The Notch+UE query has only 18 weak matches (max score 47.9 out of theoretical max ~112) and yet ESS = 16.28 → "high." This is a calibration mismatch.

**Why:** The thresholds (8/5) were set when the algorithm used the top-20 slice with smaller weights. With weights of 30–80 (unnormalized scores) and 18+ qualifying projects, ESS = (Σw)² / Σw² is large by construction.

**Recommendation:** Either
- Recalibrate thresholds to be percentile-based against current pool: e.g. top quartile of ESS observed = high, bottom quartile = low; OR
- Normalize weights to sum to 1 before computing ESS so threshold has a stable interpretation independent of score magnitudes; OR
- Augment ESS check with an *absolute* match-quality floor (e.g. require top match score ≥ 60 for "high").

The third is simplest and most defensible. **Suggested fix: confidence = high iff (ESS ≥ 8 AND top score ≥ 60); medium iff (ESS ≥ 5 OR top score ≥ 40); else low.** This maintains the ESS check while gating it on absolute match quality.

---

### F7 — MIN_SIMILARITY_THRESHOLD = 15 is too lenient

**Evidence (probe 06):** For 3 queries, the threshold of 15 admits the following fractions:

| Query | ≥15 | ≥20 | ≥25 | ≥30 | ≥40 | ≥50 |
|---|---|---|---|---|---|---|
| TD US Senior | 29 | 26 | 25 | 25 | 17 | 8 |
| Notch+UE expert | 18 | 13 | 10 | 7 | 1 | 0 |
| TD short generic | 27 | 25 | 21 | 20 | 17 | 14 |

A threshold of 15 admits projects matching only on `project_type` (20pt) OR `expertise + recency` (15+8=23) OR `clientType + recency` (25+5=30). It does NOT admit a single-skill weak match (skill=2-5pt + recency=5pt = 7-10pt).

**The 15-point floor admits weak signals but excludes near-zeroes.** That's the right intent. But for the niche query, 18/30 passing = 60% of the corpus is "above noise floor," which means the threshold barely filters when the query is actually niche. A **higher floor (e.g. 25)** would: cut the niche query from 18 → 10, cut the generic query from 27 → 21, and force users with thin matches to confront low ESS rather than getting a false "high confidence."

**Recommendation:** Raise to **25**, OR keep 15 but rely on the F6 confidence fix to gate the message.

---

### F8 — `your_role` scoring never fires (cascade of F1)

Probe 06 shows 0/90 observations had `role` matches. Resolved automatically when F1 is fixed.

---

### F9 — Representativeness multipliers (0.5×, 0.85×) cannot be validated

0/30 rows have `rate_representativeness`. **The 0.5 and 0.85 numbers were chosen by intuition and have never been applied.** They are not broken; they are simply unverified.

**Recommendation:** Document this honestly. The values are reasonable priors:
- 0.5 for `below_market`: encodes "this rate is half-real" — strong but not zero
- 0.85 for `above_market`: encodes "this rate is somewhat inflated"

Statistical literature on weight downweighting (e.g. trimmed-mean influence) supports values in the 0.3–0.7 range for "treat-as-unreliable" and 0.7–0.9 for "treat-as-noisy." Current values are in the right ballpark. Recheck once data accrues.

---

### F10 — DURATION_DAYS midpoints unverifiable

`days_of_work` is null for all 30 rows. The midpoints (45 for 1-3mo, 90 for 3-6mo, 180 for 6+mo) are reasonable arithmetic centers but cannot be empirically calibrated against community usage.

**Recommendation:** Document explicitly. Once 50+ submissions arrive with `days_of_work` populated, recompute midpoints as actual median `days_of_work` per bucket.

---

### F11 — Top-50 slice never bites; within-pool slice sensitivity exists

With 30 rows total, top-50 == "all that pass threshold." Top-50 vs top-100 is irrelevant.

But **within-pool**, top-10 vs top-20 changes estimates significantly:
- TD/PM US Senior: top-10 p75 = $71,708; top-20 p75 = $126,387 (+76%)
- LED long DE: top-10 p75 = $152,291; top-20 p75 = $226,869 (+49%)

This means the cutoff *within the qualifying pool* matters. The current "top 50" cutoff is generous and includes more weakly-matching projects. **Whether this is right depends on whether you trust the long tail of qualifying matches.** A tighter cutoff (top 10 or 15) gives narrower, less variance-padded estimates but uses less data. With current corpus size, this trade-off is moot.

**Recommendation:** Keep top-50 (it's effectively no-op with current data). Document that the cutoff has not been calibrated against a large corpus.

---

### F12 — 5% annual inflation is a borrowed assumption

Current dataset (2024–2025) → max distortion of 10%. Industry-specific creative-tech wage growth data is sparse. Dutch CBS, US BLS, and freelance platform reports suggest creative/tech freelance rates grew 3–7% YoY 2022–2025 in nominal terms. **5% is a reasonable midpoint but is a borrowed prior, not a measured one.**

**Recommendation:** Document as an assumption with rationale. Revisit when 3+ years of data accrue.

---

### F13 — Economic context priority weak signal

Only 3/30 rows have `client_country ≠ project_location`. The variance-reduction test (probe 09) shows neither grouping reduces variance below the overall total. **Cannot empirically validate the `client_country ?? project_location` choice with this data.**

**Recommendation:** Keep the choice — the *reasoning* is sound (client market caps budget) — but document that it's unverified.

---

### F14 — Historical FX rates

Only relevant once F1 is fixed and submissions begin including currency. With today's rate approach:
- Stable currencies (EUR, GBP, JPY, CHF): error < 10% over 2-year window
- Volatile currencies (TRY, ARS, RUB): error 25–100% over 2-year window
- The 5% inflation adjustment is *not* a substitute — it does not undo currency depreciation

**Recommendation:** After F1 is fixed and submissions begin coming in, monitor the currency mix. If >5% of submissions are in volatile currencies, implement historical-rate conversion (cache per-month rate snapshots from frankfurter.app/eurofxref).

---

## Summary of Fixes Required (for the fix step)

The worker should implement these in priority order:

1. **F1 — Apply the schema migration to production** (CRITICAL — blocks all submits). Either run the existing migration `20260427000000_revise_schema_fields.sql` against production, or write a new corrective migration. Confirm via probe `04-schema-probe.ts` that all expected columns exist after applying.
2. **F4/F5 — Fix legacy `DURATION_DAYS` mappings** in `src/lib/estimateAlgorithm.ts`:
   - `one-off`: 1 → 7 days
   - `performance`: 1 → 3 days
3. **F6 — Gate confidence on absolute match quality**: in `essToConfidence`, require both ESS threshold AND top-match score floor. Recommend new signature `confidenceFromMetrics(ess, topScore)` returning high/medium/low. Adjust call sites.
4. **F7 — Optionally raise `MIN_SIMILARITY_THRESHOLD` to 25**, OR leave at 15 if F6 fix sufficiently gates user-facing confidence. Worker's judgment.

The remaining findings (F9, F10, F11, F12, F13, F14) are **documentation-only** — they're risks worth disclosing but cannot be fixed without more data.

## Documentation Required (for the document step)

`ALGORITHM.md` must:
1. Acknowledge that `currency` was historically not stored — fixed in 2026-05.
2. Update the `DURATION_DAYS` table to reflect the new legacy mappings.
3. Re-derive the "max possible score" — with `your_role`, the max is 122; without (current state), 112.
4. Add a "Confidence — what 'high' / 'medium' / 'low' actually mean" section reflecting the F6 fix.
5. Add a "Caveats — what this algorithm cannot yet verify" section listing F9, F10, F11, F12, F13, F14 explicitly. Don't bury these.
6. Note that the current corpus is 30 seed records; estimates from queries that hit < 5 strong matches should be considered indicative, not authoritative.
