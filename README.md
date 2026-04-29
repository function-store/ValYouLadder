# ValYouLadder

Rate benchmarking platform for creative professionals — TouchDesigner, Notch, projection mapping, LED installations, and live visuals. Community-submitted project data powers a similarity-weighted estimation engine, optionally enhanced by Gemini AI.

Live: [valyouladder.com](https://valyouladder.com)  
Built by [Function Store](https://functionstore.xyz/link-in-bio) · [Support on Patreon](https://patreon.com/function_store)

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

## Getting started

```sh
npm install
npm run dev
```

Dev server starts at `http://localhost:5173`.

## Scripts

| Command | Description |
|---------|-------------|
| `npm run dev` | Start Vite dev server with HMR |
| `npm run build` | Production build to `dist/` |
| `npm run build:dev` | Development build (unminified, with source maps) |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint |
| `npm test` | Run tests once (Vitest) |
| `npm run test:watch` | Run tests in watch mode |

---

## Environment variables

Create a `.env` file in the project root (see `.env.example`):

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-jwt-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
VITE_PRE_PROD=false
```

| Variable | Description |
|----------|-------------|
| `VITE_SUPABASE_URL` | Supabase project URL |
| `VITE_SUPABASE_PUBLISHABLE_KEY` | Supabase anon key (starts with `eyJ…`) — found under **Settings > API** |
| `VITE_SUPABASE_PROJECT_ID` | Supabase project ref |
| `VITE_PRE_PROD` | Set to `true` to show preview banners (mock data warnings, submission lock) |

`.env` is gitignored. Never commit real keys.

---

## Supabase setup

### Database migrations

Run migrations in order via the Supabase CLI (`npx supabase db push`) or the SQL Editor. Files are in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `20260125…` | `project_submissions` table, RLS policies, indexes |
| `20260128…` | `user_roles` table, `app_role` enum, `has_role()` RPC, `estimate_submissions` table, admin policies |
| `20260130…` | Recreate policies as permissive |
| `20260427…` | Replace `teamSize` with `yourRole`, `rateType`, `currency` fields |
| `20260428…_make_total_budget_optional` | Make `total_budget` nullable |
| `20260428…_mailing_list` | `mailing_list` table for newsletter subscriptions |
| `20260428…_submission_tokens` | `submission_tokens` table for anonymous edit/delete access |
| `20260429…_submission_updated_at` | `updated_at` column + trigger on `project_submissions` |

The following columns were added directly (no migration file, dev mode):

```sql
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS days_of_work INTEGER;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS contracted_as TEXT;
```

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

## Project structure

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
  contexts/
    AuthContext     Supabase auth + admin role check
    CurrencyContext Live exchange rates (frankfurter.app, 1hr cache), format()
  hooks/            useMobile, useToast
  integrations/
    supabase/       Supabase client + auto-generated DB types
  lib/
    estimation      IDF-weighted similarity algorithm
    projectTypes    Shared constants (project types, skills, countries, etc.)
    mySubmissions   localStorage token store for anonymous submission management
    sanitize        Client-side PII validation
    config          IS_PRE_PROD flag
  components/
    BananaParticles Canvas particle background (mouse repulsion, constellation lines, click ripples)
    NewsletterSignup Inline newsletter signup (compact for footer, full for landing)
    PreProdBanner   Preview mode warning banner
supabase/
  functions/        Deno edge functions
  migrations/       SQL migration files
public/
  favicon.svg       🪜 ladder emoji SVG favicon
```

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
| `rate_type` | TEXT | project / daily / hourly / retainer |
| `currency` | TEXT | ISO code, default USD |
| `your_budget` | INTEGER | what the submitter personally received |
| `total_budget` | INTEGER | nullable — full production budget if known |
| `days_of_work` | INTEGER | nullable — actual working days invested; used to compute implied day rate |
| `year_completed` | INTEGER | |
| `description` | TEXT | nullable — AI-sanitized of PII before storage |
| `created_at` | TIMESTAMPTZ | |
| `updated_at` | TIMESTAMPTZ | auto-updated via trigger |

---

## Key features

- **Estimation engine:** IDF-weighted skill similarity, recency-adjusted daily rates, weighted percentile calculations
- **AI enhancement:** Optional Gemini-powered estimation that considers similar project data
- **Implied day rate:** When `days_of_work` is provided, displayed as a subtext on database cards, detail dialogs, and similar project results — computed as `your_budget / days_of_work`
- **Freelancer vs studio split:** `contracted_as` field distinguishes who the client contracted with, enabling rate comparisons across commercial structures
- **Currency selector:** Live exchange rates via frankfurter.app, cached 1hr in localStorage, displayed in header
- **Anonymous submissions:** No account required — edit token stored in browser localStorage and optionally emailed
- **Email edit link:** On submit, users can opt in to receive a one-time private edit link via Brevo. Email is deleted after sending and never stored.
- **Newsletter:** Separate opt-in on submit, About page, homepage CTA, and footer — managed via Brevo contacts
- **Privacy:** Automatic PII redaction on project descriptions via AI, GDPR-compliant right to erasure via `/unsubscribe`
- **Admin panel:** Role-based access via `user_roles` table, bulk selection with type-to-confirm delete, inline editing, `updated_at` tracking. All writes go through the `admin-manage` edge function (service role) to bypass RLS correctly.
- **Submission gate:** `SUBMISSIONS_OPEN` constant at the top of `src/pages/SubmitProject.tsx` — set to `false` for preview mode (form is explorable but submit button is disabled)
- **Pre-prod mode:** `VITE_PRE_PROD=true` shows mock-data warnings across Database, Estimate, and hero sections
- **Interactive background:** Canvas-based banana particles with mouse repulsion, constellation lines, and click ripples

---

## Deployment

The frontend is a static SPA — build with `npm run build` and deploy `dist/` to any static host.

```sh
npx vercel deploy --prod
```

After deploying, make sure the `SITE_URL` secret in Supabase matches the live URL so email edit links resolve correctly.

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
