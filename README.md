# Creative Cost Compass

Rate benchmarking platform for creative professionals — TouchDesigner, Notch, projection mapping, LED installations, and live visuals. Community-submitted project data powers a similarity-weighted estimation engine, optionally enhanced by Gemini AI.

## Stack

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS, shadcn/ui, TanStack Query
- **Backend:** Supabase (PostgreSQL + Row Level Security + Auth)
- **Edge Functions:** Deno (deployed on Supabase)
- **AI:** Google Gemini 2.5 Flash — rate estimation and PII sanitization

## Prerequisites

- Node.js 18+
- A [Supabase](https://supabase.com) project
- A [Google AI Studio](https://aistudio.google.com/apikey) API key (for Gemini)

## Getting started

```sh
npm install
npm run dev
```

Dev server starts at `http://localhost:8080`.

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

## Environment variables

Create a `.env` file in the project root:

```env
VITE_SUPABASE_URL=https://your-project.supabase.co
VITE_SUPABASE_PUBLISHABLE_KEY=your-anon-jwt-key
VITE_SUPABASE_PROJECT_ID=your-project-ref
```

The `VITE_SUPABASE_PUBLISHABLE_KEY` must be the JWT-format anon key (starts with `eyJ...`), found in your Supabase dashboard under **Settings > API > Project API keys**.

## Supabase setup

### Database schema

Run all migration files in order via the Supabase **SQL Editor** (or using the Supabase CLI). Migrations are in `supabase/migrations/`:

| Migration | Purpose |
|-----------|---------|
| `20260125…` | `project_submissions` table, RLS policies, indexes |
| `20260128…` | `user_roles` table, `app_role` enum, `has_role()` RPC, `estimate_submissions` table, admin policies |
| `20260130…` | Recreate policies as permissive |
| `20260427…` | Replace `teamSize` with `yourRole`, `rateType`, `currency` fields |
| `20260428…_make_total_budget_optional` | Make `total_budget` nullable |
| `20260428…_mailing_list` | `mailing_list` table for newsletter subscriptions |

### Edge functions

Two Deno edge functions live in `supabase/functions/`:

| Function | Purpose |
|----------|---------|
| `estimate-rate` | Sends project details + similar projects to Gemini, returns `{low, mid, high, reasoning, confidenceLevel, keyFactors}` |
| `sanitize-description` | Sends project descriptions to Gemini to redact PII (brand names, artist names, venues, etc.) |

**Deploying edge functions:**

Option A — via Supabase CLI:
```sh
npx supabase functions deploy estimate-rate --project-ref your-project-ref
npx supabase functions deploy sanitize-description --project-ref your-project-ref
```

Option B — via the Supabase dashboard: **Edge Functions > New Function**, paste the code from each `index.ts`.

### Secrets

Set the Gemini API key as a Supabase secret (edge functions read it at runtime):

```sh
npx supabase secrets set GEMINI_API_KEY=your-gemini-api-key --project-ref your-project-ref
```

Or add it in the dashboard under **Settings > Edge Functions > Secrets**.

## Project structure

```
src/
  pages/            Route pages (Index, Estimate, Database, SubmitProject, Admin, Auth, Privacy, About)
  components/
    ui/             shadcn/ui primitives (Button, Dialog, Table, etc.)
    layout/         Layout shell, Header, Footer
    estimate/       Estimation form and results display
    database/       Project detail dialog
    admin/          Admin edit dialog
    gdpr/           Cookie consent, privacy checkbox
    home/           Landing page sections
  contexts/         AuthContext (Supabase auth + admin role check)
  hooks/            Custom hooks (useMobile, useToast)
  integrations/
    supabase/       Supabase client init + auto-generated DB types
  lib/              Estimation algorithm, project type constants, utilities
supabase/
  functions/        Deno edge functions (estimate-rate, sanitize-description)
  migrations/       SQL migration files
```

## Key features

- **Estimation engine:** IDF-weighted skill similarity, recency-adjusted daily rates, weighted percentile calculations
- **AI enhancement:** Optional Gemini-powered estimation that considers similar project data
- **Privacy:** Automatic PII redaction on project descriptions via AI, GDPR cookie consent
- **Admin panel:** Role-based access, bulk selection with type-to-confirm delete, inline editing
- **Mailing list:** Popup triggered after meaningful interactions (estimate, submission, viewing project details)
- **Under-construction banner:** Shown on Database page when fewer than 30 projects exist

## Deployment

The frontend is a static SPA. Build with `npm run build` and deploy the `dist/` folder to any static host (Vercel, Netlify, Cloudflare Pages, etc.).

For Vercel:
```sh
npx vercel deploy --prod
```

Edge functions are deployed separately to Supabase (see above).

## Admin access

1. Create an account via the `/auth` page
2. In the Supabase SQL Editor, grant yourself the admin role:
   ```sql
   INSERT INTO user_roles (user_id, role)
   VALUES ('your-auth-user-uuid', 'admin');
   ```
3. Navigate to `/admin`
