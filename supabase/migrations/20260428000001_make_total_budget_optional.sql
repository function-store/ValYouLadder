-- Make total_budget optional — most freelancers don't know the full production budget
ALTER TABLE public.project_submissions ALTER COLUMN total_budget DROP NOT NULL;
