-- Columns that were added directly in production without migration files.

ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS days_of_work INTEGER;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS contracted_as TEXT;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS rate_representativeness TEXT;
ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS standard_rate INTEGER;

ALTER TABLE public.project_submissions ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT now();

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DO $$ BEGIN
  CREATE TRIGGER trg_set_updated_at
    BEFORE UPDATE ON public.project_submissions
    FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
EXCEPTION WHEN duplicate_object THEN NULL;
END $$;
