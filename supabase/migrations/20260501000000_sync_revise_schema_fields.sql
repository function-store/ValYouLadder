-- Corrective sync of 20260427000000_revise_schema_fields.sql
--
-- Production state (verified 2026-05-01 via context/probes/04-schema-probe.ts):
--   - `currency`, `rate_type`, `your_role` MISSING despite migration record
--   - `team_size` STILL PRESENT despite DROP COLUMN in original migration
--   - All real submissions currently 500 with PGRST204 (the `currency` column
--     of `project_submissions` not in schema cache) — see findings F1.
--
-- The original migration file (20260427000000) is recorded as applied in
-- the supabase_migrations.schema_migrations table, so re-running it would
-- conflict. This migration uses IF NOT EXISTS / IF EXISTS guards and is
-- idempotent so it can sync any deployment regardless of partial state.

-- project_submissions: drop legacy column, add new columns
ALTER TABLE public.project_submissions DROP COLUMN IF EXISTS team_size;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS rate_type TEXT;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS currency TEXT NOT NULL DEFAULT 'USD';
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS your_role TEXT;

-- project_submissions: client_country must be optional (original migration intent)
ALTER TABLE public.project_submissions ALTER COLUMN client_country DROP NOT NULL;

-- estimate_submissions: mirror new fields (nullable for backward compat)
ALTER TABLE public.estimate_submissions ADD COLUMN IF NOT EXISTS rate_type TEXT;
ALTER TABLE public.estimate_submissions ADD COLUMN IF NOT EXISTS currency TEXT;
ALTER TABLE public.estimate_submissions ADD COLUMN IF NOT EXISTS your_role TEXT;

-- Indexes
CREATE INDEX IF NOT EXISTS idx_project_submissions_your_role
  ON public.project_submissions(your_role);
CREATE INDEX IF NOT EXISTS idx_project_submissions_currency
  ON public.project_submissions(currency);
CREATE INDEX IF NOT EXISTS idx_project_submissions_rate_type
  ON public.project_submissions(rate_type);
