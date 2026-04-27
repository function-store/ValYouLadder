-- Remove team_size: ambiguous and replaced by your_role
ALTER TABLE public.project_submissions DROP COLUMN team_size;

-- Make client_country optional (informative but not always known)
ALTER TABLE public.project_submissions ALTER COLUMN client_country DROP NOT NULL;

-- Add rate_type, currency, your_role to project_submissions
ALTER TABLE public.project_submissions
  ADD COLUMN rate_type TEXT,
  ADD COLUMN currency TEXT NOT NULL DEFAULT 'USD',
  ADD COLUMN your_role TEXT;

-- Mirror new fields on estimate_submissions (nullable — backward compat)
ALTER TABLE public.estimate_submissions
  ADD COLUMN rate_type TEXT,
  ADD COLUMN currency TEXT,
  ADD COLUMN your_role TEXT;

-- Indexes for the new filterable fields
CREATE INDEX idx_project_submissions_your_role ON public.project_submissions(your_role);
CREATE INDEX idx_project_submissions_currency ON public.project_submissions(currency);
CREATE INDEX idx_project_submissions_rate_type ON public.project_submissions(rate_type);
