# Estimation Algorithm

How ValYouLadder turns community-submitted project data into a rate estimate.

---

## Overview

The estimator is a **similarity-weighted percentile model**. It finds projects in the database that resemble the queried project, weights them by relevance, and computes a p25/p50/p75 range from the resulting distribution of inflation-adjusted daily rates. An optional AI layer (Gemini 2.5 Flash) uses this statistical range as a grounding anchor and adds qualitative reasoning.

---

## Corpus state (as of 2026-05-07)

The production database currently holds **zero submissions**. Mock seed data that was previously loaded for schema validation has been removed. The estimation feature is disabled until enough real submissions accumulate to produce meaningful results.

Any quantitative figures referenced elsewhere in this document were derived against the former synthetic corpus and are **illustrative, not measurements**. They demonstrate how the algorithm behaves structurally; the numbers should be re-derived against real submissions before being treated as findings about the market. Once organic data accrues, the caveats in the closing section can be revisited empirically.

---

## Step 1 — Candidate retrieval

All approved submissions are fetched from `project_submissions`. There is no pre-filtering by project type or location at this stage — the similarity score handles relevance. This ensures the model degrades gracefully when the dataset is sparse.

---

## Step 2 — IDF skill weights

Before scoring, inverse document frequency (IDF) weights are computed across the full candidate pool:

```
IDF(skill) = log(total_projects / projects_containing_skill)
```

Skills that appear in fewer submissions carry more weight when they do match — because matching on something uncommon in the dataset is a stronger signal of relevance than matching on something almost everyone lists. This prevents the overlap score from being dominated by frequently-listed skills that offer little discriminating power.

---

## Step 3 — Similarity scoring

Each candidate project is scored against the query. The theoretical maximum score is approximately **122** (all exact matches + full skill overlap + same-year recency). In practice across the current corpus, top match scores observed in 6 representative queries ranged 47.9–84 (probe 06). Queries whose top match scores fall below ~60 cannot reach "high" confidence regardless of pool size — see Step 8.

| Signal | Points |
|--------|--------|
| Project type exact match | +20 |
| Client type exact match | +25 |
| Expertise level exact match | +15 |
| Project length exact match | +10 |
| Your role exact match | +10 |
| Economic context match (see below) | +12 |
| Project location secondary match | +5 |
| IDF-weighted skill overlap | 0–30 |
| Recency: same year | +8 |
| Recency: 1 year ago | +5 |
| Recency: 2 years ago | +2 |

### Economic context

The client's location is a stronger indicator of budget ceiling than the worker's location — a client's market largely shapes what they expect to pay, even if they sometimes leverage lower-cost regions. Using `project_location` alone can be misleading for cross-border remote work.

Each submission's economic context is therefore:

```
submission_economic_context = client_country ?? project_location
```

And for the query:

```
query_economic_context = client_country || project_location
```

A full economic context match scores **+12**. If the contexts differ but the `project_location` still matches (same local market), a secondary **+5** is awarded.

### Skill overlap

```
skill_score = sum(IDF(matching_skills)) / sum(IDF(query_skills))
```

This is IDF-weighted precision — what fraction of the query's skill signal is covered by the candidate. Scaled to a 0–30 point range.

---

## Step 4 — Threshold filter

Candidates scoring below **15** are excluded. This prevents loosely-related projects from diluting the estimate with irrelevant data.

---

## Step 5 — Rate normalization

Raw project budgets are not directly comparable — a €50,000 budget means something different for a 1-day gig vs a 6-month installation. All budgets are normalized to an **implied daily rate**.

**Resolved budget** — if the submitter provided a `standard_rate` (what they would normally charge), that takes precedence over `your_budget`. This ensures below-market or above-market one-offs don't distort the signal:

```
resolved_budget = standard_rate ?? your_budget
```

**Currency normalization** — budgets are converted to USD before any further calculation using live exchange rates (frankfurter.app, cached 1hr):

```
budget_usd = resolved_budget / rates[currency]
```

**Daily rate normalization:**

```
daily_rate = budget_usd / DURATION_DAYS[project_length]
```

`DURATION_DAYS` maps each project length category to a midpoint in days:

| Category | Days |
|----------|------|
| day | 1 |
| 2–5 days | 3.5 |
| 1–2 weeks | 7 |
| 1–3 months | 45 |
| 3–6 months | 90 |
| 6+ months | 180 |

#### Legacy duration values

Older submissions (from earlier site versions that used a different vocabulary) are still ingested by the algorithm so that data is not lost. They map to days as follows:

| Legacy category | Days | Rationale |
|---|---|---|
| `one-off` | 7 | Single deliverable ≈ 1 week of focused work |
| `short` | 7 | Equivalent to `1-2-weeks` |
| `medium` | 45 | Equivalent to `1-3-months` |
| `long` | 120 | ~4 months (between 3-6mo and 6+mo) |
| `performance` | 3 | 1 stage day + ~2 days prep |
| `tour` | 30 | Mid-length engagement, n=1 in current data |
| `installation-temp` | 30 | Average temporary install duration |
| `installation-perm` | 60 | Permanent install with commissioning |

`one-off` and `performance` were originally mapped to 1 day, which produced implausible per-day rates ($8000/day median for `one-off`, $3000/day for `performance` — 5–14× the rates in comparable buckets like `medium` at ~$556/day). Probe 07 showed the spread; the values above re-align legacy buckets with the rest of the distribution. See finding F4/F5 in `context/scientific-review-findings.md`.

When `days_of_work` is provided by the submitter, it's displayed as an implied day rate on cards and detail views, but the duration-bucket normalization is used in the algorithm (for consistency across submissions that don't have it).

**Inflation adjustment** — older projects are adjusted to current-year equivalents at 5% per year:

```
adjusted_rate = daily_rate × (1.05 ^ years_old)
```

---

## Step 6 — Representativeness weighting

Submitters flag whether their rate was standard pricing, below market (e.g. passion project, favoured client), or above market. This affects how much weight their submission carries in the percentile calculation:

| `rate_representativeness` | Weight multiplier |
|--------------------------|-------------------|
| `standard` | 1.0× |
| `above_market` | 0.85× |
| `below_market` | 0.5× |
| not provided | 1.0× |

**Exception:** if `standard_rate` is explicitly provided (regardless of the representativeness label), the multiplier is always **1.0×** — the submitter has given us their actual market rate directly, so the flag is irrelevant.

The final weight for each candidate:

```
weight = similarity_score × representativeness_multiplier
```

---

## Step 7 — Weighted percentile calculation

The normalized, inflation-adjusted daily rates are assembled into a weighted distribution and p25/p50/p75 are computed using Type 7 interpolation:

```
sorted by rate ascending
cumulative_weight accumulates until it reaches p × total_weight
interpolate between the two surrounding values
```

The percentiles are then scaled back to the queried project's duration:

```
estimate = percentile_daily_rate × DURATION_DAYS[query_project_length]
```

This gives the final **low / mid / high** range in the original currency mix of the dataset.

---

## Step 8 — Confidence level

Confidence is computed by `confidenceFromMetrics(ess, topScore)` in `src/lib/estimateAlgorithm.ts`. It combines two signals:

1. **Effective Sample Size (ESS)** — accounts for weight concentration. If one project dominates the weights, ESS is low even with many candidates.

   ```
   ESS = (Σ weights)² / Σ(weight²)
   ```

2. **Top match score** — the absolute similarity score of the single best-matching project in the pool, before any weight scaling.

The two signals are combined as follows:

| Confidence | Condition |
|------------|-----------|
| **high** | `ESS ≥ 8` AND `topScore ≥ 60` |
| **medium** | `ESS ≥ 5` OR `topScore ≥ 40` |
| **low** | otherwise |

**Why ESS alone is insufficient.** ESS measures weight concentration, not match quality. Once the qualifying pool exceeds ~10 projects with weights in the 30–80 range, `(Σw)²/Σw²` is large by construction — even when no single project is a strong match. Probe 08 illustrates the failure: a niche query (Notch+UE expert performance UK) yielded ESS = 16.28 but a top match score of only 47.9, which the old ESS-only path reported as "high." The combined gate now correctly reports that query as "medium": the pool is statistically dense, but no individual match is strong enough to warrant high confidence.

The two score floors come from probe 06 score-component analysis: 60 corresponds roughly to `project_type` (20) + `client_type` (25) + ≥2/3 of the skill-weight budget — i.e. a "genuine" match; 40 corresponds to `project_type` + half-skill + recency — i.e. a "partial" match.

**Deprecated path.** The earlier ESS-only function `essToConfidence(ess)` is retained in the codebase under `@deprecated` for backward compatibility but is no longer called by the estimate pipeline. Its thresholds — kept here for reference — were:

| ESS | Confidence (deprecated) |
|-----|--------------------------|
| ≥ 8 | High |
| ≥ 5 | Medium |
| < 5 | Low |

These remain useful only as a reference for the ESS component in isolation; the live confidence value comes from `confidenceFromMetrics`.

---

## Step 9 — AI layer (optional)

When the user requests an AI estimate, the statistical p25/p50/p75 range from Step 7 is passed to Gemini 2.5 Flash alongside the project details and the top 10 similar projects. The model is instructed to treat the statistical range as a **directional anchor** and keep its low/mid/high within that ballpark unless there is a clear qualitative reason to deviate (unusual project scope, currency mix skew, strong expertise signal).

This grounds the AI output in the community data rather than allowing it to drift toward generic market intuitions.

Rate limiting: 5 AI estimates per IP per hour.

---

## What the algorithm does not currently do

This section lists known limitations and unverified assumptions. They are not bugs — they are design choices whose empirical justification cannot yet be checked against real community data, or behaviours the model deliberately does not attempt. Each is something a careful reader should weigh when interpreting an estimate.

- **Per-region median normalization** — comparing rates as a percentile within their local market (z-score approach) would handle regional variation more precisely, but requires sufficient per-region data density to be reliable.
- **Cross-border rate suppression** — using `client_country` as the economic context assumes the rate reflects the client's market. In practice, clients sometimes leverage lower-cost regions and pay below their own market norms. If a submitter is aware their rate was below what that client would pay locally, marking it `below_market` reduces its influence (0.5× weight). But the model cannot detect this on its own — the quality of cross-border estimates depends on submitters having that awareness.
- **Historical exchange rates (F14).** Budgets are converted to USD at today's exchange rate, not the rate at the time of submission. Until 2026-05 the `currency` column was missing from the production schema and every row defaulted to USD, so this was a no-op. Now that the column exists, today's-rate FX conversion is in effect: for stable currencies (EUR, GBP, JPY, CHF) the error stays under ~10% over a two-year window, but for volatile currencies (TRY, ARS, RUB) it can reach 25–100% on submissions older than ~1 year. Frankfurter exposes historical rates; implementing per-month rate snapshots is a future improvement once non-USD submissions begin to arrive at meaningful volume.
- **DURATION_DAYS midpoints unverified (F10).** The community-usage hypothesis behind each midpoint (e.g. that "1–3 months" really averages 45 days of work) cannot yet be checked against real data. Once enough submissions arrive with `days_of_work` populated, midpoints should be re-derived as actual medians per bucket.
- **Representativeness weights are priors, not data-derived (F9).** The 0.5× / 0.85× / 1.0× multipliers in Step 6 are reasonable based on weight-downweighting literature (0.3–0.7 for "treat-as-unreliable", 0.7–0.9 for "treat-as-noisy"), but zero submissions have used the `rate_representativeness` field yet — so the specific values cannot be empirically validated against this corpus. Recheck once data accrues.
- **Top-50 cutoff sensitivity (F11).** The top-50 slice that feeds the percentile calculation has not been calibrated against a large corpus — the choice of 50 is a placeholder until corpus growth makes calibration meaningful. Within-pool slice sensitivity is real: top-10 vs top-20 can shift p75 significantly on sparse queries.
- **5% annual inflation is borrowed (F12).** Industry-specific creative-tech wage data is sparse. Public sources (US BLS, EU CBS, freelance-platform reports) suggest 3–7% YoY freelance rate growth across 2022–2025; 5% sits in the middle of that band but has not been measured against creative-tech specifically. Worth revisiting when 3+ years of submissions have accrued. Maximum distortion on the current 2024–2025 corpus is ~10%.
- **Economic context priority (F13).** The choice of `client_country ?? project_location` as the economic signal is reasoned (the client's market caps what they expect to pay), but cannot yet be confirmed empirically. It stands on the reasoning alone until enough submissions with differing client and project locations accumulate.
- **Currency conversion history (F1/F14).** Until 2026-05 the `currency` column was absent from production, so earlier submissions silently defaulted to USD. The schema is now synced and currency is recorded going forward. Estimates should be treated as USD-anchored until non-USD submissions accumulate at meaningful volume.
