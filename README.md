# ValYouLadder

Rate benchmarking platform for creative professionals — TouchDesigner, Notch, projection mapping, LED installations, and live visuals.

Live: [valyouladder.com](https://valyouladder.com)  
Built by [Function Store](https://functionstore.xyz/link-in-bio) · [Support on Patreon](https://patreon.com/function_store)  
License: [AGPL-3.0](LICENSE)

---

## Why

Freelancers and contractors in creative tech have no shared language around rates. Clients set budgets based on what they've gotten away with before, and professionals price blind — leading to underpricing, burnout, and a race to the bottom.

ValYouLadder exists to fix that. Community-submitted project data powers a similarity-weighted estimation engine, optionally enhanced by Gemini AI. The code is open source because a tool about transparency should itself be transparent.

---

## Features

- **Community database** — anonymous, crowd-sourced project rate data from real creative-tech professionals
- **Estimation engine** — IDF-weighted skill similarity, recency-adjusted daily rates, weighted percentile calculations (p25/p50/p75). See [ALGORITHM.md](./ALGORITHM.md) for the full breakdown.
- **AI enhancement** — optional Gemini 2.5 Flash layer. The statistical estimate is pre-computed and passed to Gemini as a grounding anchor, keeping AI output consistent with the data while allowing qualitative adjustments
- **Rate representativeness** — submitters flag whether a rate was standard / below market / above market, with weighting applied in the algorithm
- **Currency support** — searchable selector with live exchange rates (frankfurter.app), default inferred from browser locale
- **Privacy-first** — no accounts required. Descriptions are AI-processed before storage (PII redacted, vulgar language removed, non-English translated). GDPR-compliant right to erasure
- **Feature gates** — three independent env-var flags to control what's live

---

## Roadmap

- **Database read** — after 50 submissions, open the database for public reading
- **Estimates open** — after 50 submissions, fine-tuning of estimates can begin. When estimates open is determined by the perceived accuracy of the algorithm
- **Estimate feedback loop** — after receiving an estimate, users can return once the project is won to report the actual rate. Closing the loop improves the algorithm and builds a ground-truth dataset over time

---

## Stack

| Layer | Technology |
|-------|------------|
| Frontend | React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, React Router 6 |
| Forms | React Hook Form + Zod |
| Data fetching | TanStack Query |
| Backend | Supabase (PostgreSQL + RLS + Auth) |
| Edge Functions | Deno (deployed on Supabase) |
| AI | Google Gemini 2.5 Flash — rate estimation and PII sanitization |
| Email | Brevo — transactional edit links + newsletter |
| Exchange rates | [frankfurter.app](https://frankfurter.app) (ECB data, no API key required) |
| Analytics | Vercel Analytics |

---

## Contributing

See [CONTRIBUTING.md](./CONTRIBUTING.md) for development setup, environment variables, project structure, Supabase configuration, deployment, and the staging workflow.
