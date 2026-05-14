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
- **Feature gates** — three independent env-var flags (`VITE_DB_OPEN`, `VITE_SUBMISSIONS_OPEN`, `VITE_ESTIMATES_OPEN`) to control what's live

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

## Development

### Getting started

```sh
npm install
npm run dev
```

Dev server starts at `http://localhost:5173`

### Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR (uses `.env`) |
| `npm run dev:staging` | Dev server pointing at the staging Supabase project (uses `.env.staging`) |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build (unminified, with source maps) |
| `npm run build:staging` | Build against the staging Supabase project |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

### Environment variables

Copy `.env.example` to `.env` and fill in your Supabase credentials:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-jwt-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (starts with `eyJ…`) — found under **Settings > API** |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_DB_OPEN` | Set to `false` to hide the database (default: open) |
| `VITE_SUBMISSIONS_OPEN` | Set to `false` to disable new submissions (default: open) |
| `VITE_ESTIMATES_OPEN` | Set to `false` to disable the estimation tool (default: open) |

`.env` and `.env.production` are gitignored. Never commit real keys. See [Staging / pre-production](#staging--pre-production) for the multi-environment setup.

### Project structure

```
src/
  pages/            Route pages
                      Index, Database, Estimate, SubmitProject,
                      MySubmissions, Admin, Auth, About, Privacy
  components/
    ui/             shadcn/ui primitives (Button, Dialog, Table, etc.)
    layout/         Layout shell, Header (with currency selector), Footer
    estimate/       Estimation form, results, similar projects list
    database/       Project detail dialog
    admin/          Admin edit dialog
    submit/         Edit submission dialog, verification step
    gdpr/           Privacy consent checkbox
    home/           Landing page sections (Hero, Features, CTA, etc.)
    BrandName       Renders "ValYouLadder" with the "You" accent — use everywhere the brand name appears
    BananaParticles Canvas particle background (mouse repulsion, constellation lines, click ripples)
    NewsletterSignup Inline newsletter signup (compact for footer, full for landing)
    PreProdBanner   Yellow warning banner — rendered by callers when a feature gate is closed
  contexts/
    AuthContext     Supabase auth + admin role check
    CurrencyContext Live exchange rates (frankfurter.app, 1hr cache), locale-inferred default, format()
  hooks/            useMobile, useToast
  integrations/
    supabase/       Supabase client + auto-generated DB types
  lib/
    estimation      IDF-weighted similarity algorithm
    projectTypes    Shared constants (project types, skills, countries, currencies, etc.)
    mySubmissions   localStorage token store for anonymous submission management
    sanitize        Client-side PII validation
    config          Feature gates: IS_DB_OPEN, IS_SUBMISSIONS_OPEN, IS_ESTIMATES_OPEN, SUPABASE_PROJECT_ID
supabase/
  functions/        Deno edge functions
  migrations/       SQL migration files
public/
  favicon.svg       ladder emoji SVG favicon
```

---

## Supabase setup

### Database migrations

Run migrations in order via the Supabase CLI (`npx supabase db push`) or the SQL Editor. Files are in `supabase/migrations/`.

### Edge functions

| Function | Purpose |
|----------|---------|
| `submit-project` | Inserts submission, generates edit token, sends Brevo email if requested |
| `manage-submission` | Token-authenticated edit and delete for anonymous submitters |
| `admin-manage` | Admin-only bulk delete, single delete, and edit |
| `estimate-rate` | Sends project details + similar projects to Gemini, returns `{low, mid, high, reasoning, confidenceLevel, keyFactors}` |
| `sanitize-description` | Sends project descriptions to Gemini to redact PII |
| `unsubscribe` | Handles mailing list opt-out |

**Deploy all functions:**

```sh
npx supabase functions deploy submit-project
npx supabase functions deploy manage-submission
npx supabase functions deploy admin-manage
npx supabase functions deploy estimate-rate
npx supabase functions deploy sanitize-description
npx supabase functions deploy unsubscribe
```

### Supabase secrets

Set these in the Supabase dashboard under **Settings > Edge Functions > Secrets**, or via CLI:

```sh
npx supabase secrets set GEMINI_API_KEY=your-gemini-key
npx supabase secrets set BREVO_API_KEY=your-brevo-key
npx supabase secrets set SITE_URL=https://valyouladder.com
```

| Secret | Used by | Description |
|--------|---------|-------------|
| `GEMINI_API_KEY` | `estimate-rate`, `sanitize-description` | Google AI Studio key |
| `BREVO_API_KEY` | `submit-project` | Brevo transactional email + contact list |
| `SITE_URL` | `submit-project` | Base URL for edit links in emails |

---

## Data schema — `project_submissions`

| Column | Type | Notes |
|--------|------|-------|
| `id` | UUID | PK, auto-generated |
| `project_type` | TEXT | commission, collaboration, technical, live-performance, tour, installation-temp/perm, etc. |
| `client_type` | TEXT | global-brand, institution, festival, musician, agency, private, etc. |
| `project_length` | TEXT | day, 2-5-days, 1-2-weeks, 1-3-months, 3-6-months, 6plus-months |
| `client_country` | TEXT | nullable — where the client is based |
| `project_location` | TEXT | where the work took place |
| `skills` | TEXT[] | multi-select from a curated list |
| `expertise_level` | TEXT | junior / mid / senior / expert |
| `your_role` | TEXT | solo / lead / key-contributor / subcontractor |
| `contracted_as` | TEXT | freelancer / studio — who the client contracted with |
| `rate_representativeness` | TEXT | nullable — standard / below_market / above_market |
| `standard_rate` | INTEGER | nullable — what the submitter would normally charge (when below/above market) |
| `rate_type` | TEXT | project / daily / hourly / retainer |
| `currency` | TEXT | ISO code, default USD |
| `your_budget` | INTEGER | what the submitter personally received |
| `total_budget` | INTEGER | nullable — full production budget if known |
| `days_of_work` | INTEGER | nullable — actual working days invested; used to compute implied day rate |
| `year_completed` | INTEGER | |
| `description` | TEXT | nullable — AI-processed before storage: PII redacted, vulgar language removed, translated to English |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | auto-updated via trigger |

---

## Deployment

The frontend is a static SPA — build with `npm run build` and deploy `dist/` to any static host.

```sh
npx vercel deploy --prod
```

After deploying, make sure the `SITE_URL` secret in Supabase matches the live URL so email edit links resolve correctly.

---

## Staging / pre-production

The project uses two Supabase projects (staging and production) and Vercel's preview deployments to keep untested changes off the live site.

### Architecture

```
┌─────────────────────┐       ┌──────────────────────────┐
│  Feature branch      │──────▶│  Vercel preview deploy    │
│  (any non-main)      │       │  → staging Supabase        │
└─────────────────────┘       └──────────────────────────┘

┌─────────────────────┐       ┌──────────────────────────┐
│  main branch         │──────▶│  Vercel production deploy │
│                      │       │  → production Supabase     │
└─────────────────────┘       └──────────────────────────┘
```

### Setting up the staging Supabase project

1. Create a new project in the [Supabase dashboard](https://supabase.com/dashboard) (e.g. "creative-compass-staging"). The free tier is sufficient.
2. Apply all migrations:
   ```sh
   npx supabase link --project-ref <staging-project-id>
   npx supabase db push
   ```
3. Set edge function secrets:
   ```sh
   npx supabase secrets set \
     GEMINI_API_KEY=your-key \
     BREVO_API_KEY=your-key \
     SITE_URL=https://your-vercel-preview-url \
     --project-ref <staging-project-id>
   ```
4. Deploy edge functions:
   ```sh
   npx supabase functions deploy --project-ref <staging-project-id>
   ```
5. Re-link to production when done:
   ```sh
   npx supabase link --project-ref <production-project-ref>
   ```

### Configuring Vercel environment variables

In the Vercel dashboard under **Settings > Environment Variables**, set each variable with the appropriate scope:

| Variable | Production scope | Preview scope |
|----------|-----------------|---------------|
| `VITE_SUPABASE_URL` | `https://<prod>.supabase.co` | `https://<staging>.supabase.co` |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | prod anon key | staging anon key |
| `VITE_SUPABASE_PROJECT_ID` | prod project ref | staging project ref |
| `VITE_DB_OPEN` | _(omit — open by default)_ | `false` to hide staging data |
| `VITE_SUBMISSIONS_OPEN` | _(omit — open by default)_ | `false` to block staging submissions |
| `VITE_ESTIMATES_OPEN` | _(omit — open by default)_ | `false` to disable staging estimates |

After this, every push to a non-main branch gets a Vercel preview deployment that talks to the staging database. Merges to `main` deploy to production with the production database.

### Local development with staging

Fill in `.env.staging` with the staging project credentials, then:

```sh
npm run dev:staging     # dev server → staging Supabase
npm run build:staging   # build against staging Supabase
```

The default `npm run dev` uses `.env` (which should contain whichever project you work against most often).

Vite's mode system loads the env file matching the mode: `--mode staging` loads `.env.staging`, the default production build loads `.env.production` (if present), and development loads `.env`.

### Deploying schema changes

Always apply migrations to staging first, verify, then apply to production:

```sh
# 1. Apply to staging
npx supabase db push --project-ref <staging-project-id>

# 2. Test on a preview deployment or locally via dev:staging

# 3. Apply to production
npx supabase db push --project-ref <production-project-ref>
```

If the migration adds or changes edge function behavior, deploy edge functions to both projects in the same order.

### Deploying edge functions to a specific project

```sh
# Staging
npx supabase functions deploy --project-ref <staging-project-id>

# Production
npx supabase functions deploy --project-ref <production-project-ref>
```

### Feature gates on preview deployments

Each feature can be toggled independently via env vars. Set any to `false` in the Vercel Preview scope to close that section on staging while leaving production unaffected. A yellow `PreProdBanner` is shown on the relevant page when a gate is closed, displaying the Supabase project ID so it's obvious which backend you're connected to.

---

## Admin access

There is no public sign-up. To grant admin access:

1. Create a user directly in the Supabase dashboard under **Authentication > Users**
2. Grant the admin role via SQL:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-auth-user-uuid', 'admin');
   ```
3. Sign in at `/auth` (not linked publicly)
4. Navigate to `/admin`
