-- project_length is no longer collected on new submissions.
-- days_of_work is now required at the form level and used directly for rate normalization.
-- project_length kept for backward compat with existing rows; new rows leave it NULL.
ALTER TABLE public.project_submissions
  ALTER COLUMN project_length DROP NOT NULL;
