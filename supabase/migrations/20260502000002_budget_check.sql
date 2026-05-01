-- Reject zero / negative budgets at the DB level. The client form already
-- has min validation, but the algorithm relies on positive budgets to
-- compute meaningful daily rates without producing NaN edge cases.

ALTER TABLE public.project_submissions
  ADD CONSTRAINT project_submissions_your_budget_positive
  CHECK (your_budget > 0)
  NOT VALID;

-- Validate against existing rows. If any seed/legacy rows violate this,
-- this migration fails loudly so it can be cleaned up before continuing.
ALTER TABLE public.project_submissions
  VALIDATE CONSTRAINT project_submissions_your_budget_positive;

ALTER TABLE public.project_submissions
  ADD CONSTRAINT project_submissions_standard_rate_positive
  CHECK (standard_rate IS NULL OR standard_rate > 0)
  NOT VALID;

ALTER TABLE public.project_submissions
  VALIDATE CONSTRAINT project_submissions_standard_rate_positive;
