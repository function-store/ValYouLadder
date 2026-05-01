# Estimation Algorithm

How ValYouLadder turns community-submitted project data into a rate estimate.

---

## Overview

The estimator is a **similarity-weighted percentile model**. It finds projects in the database that resemble the queried project, weights them by relevance, and computes a p25/p50/p75 range from the resulting distribution of inflation-adjusted daily rates. An optional AI layer (Gemini 2.5 Flash) uses this statistical range as a grounding anchor and adds qualitative reasoning.

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

Each candidate project is scored against the query. The maximum possible score is approximately **122** (all exact matches + full skill overlap + same-year recency).

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

## Step 8 — Confidence level (ESS)

Rather than using raw sample size, confidence is computed from **Effective Sample Size (ESS)** — a measure that accounts for weight concentration. If one project dominates the weights, ESS is low even with many candidates.

```
ESS = (Σ weights)² / Σ(weight²)
```

| ESS | Confidence |
|-----|------------|
| ≥ 8 | High |
| ≥ 5 | Medium |
| < 5 | Low |

---

## Step 9 — AI layer (optional)

When the user requests an AI estimate, the statistical p25/p50/p75 range from Step 7 is passed to Gemini 2.5 Flash alongside the project details and the top 10 similar projects. The model is instructed to treat the statistical range as a **directional anchor** and keep its low/mid/high within that ballpark unless there is a clear qualitative reason to deviate (unusual project scope, currency mix skew, strong expertise signal).

This grounds the AI output in the community data rather than allowing it to drift toward generic market intuitions.

Rate limiting: 5 AI estimates per IP per hour.

---

## What the algorithm does not currently do

- **Historical exchange rates** — budgets are converted to USD at today's exchange rate, not the rate at the time of the project. Combined with the 5% inflation adjustment, this is a reasonable approximation for recent projects but introduces some inaccuracy for older submissions in volatile currencies.
- **Per-region median normalization** — comparing rates as a percentile within their local market (z-score approach) would handle regional variation more precisely, but requires sufficient per-region data density to be reliable.
- **Cross-border rate suppression** — using `client_country` as the economic context assumes the rate reflects the client's market. In practice, clients sometimes leverage lower-cost regions and pay below their own market norms. If a submitter is aware their rate was below what that client would pay locally, marking it `below_market` reduces its influence (0.5× weight). But the model cannot detect this on its own — the quality of cross-border estimates depends on submitters having that awareness.
