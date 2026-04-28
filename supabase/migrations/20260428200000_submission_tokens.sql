-- Private token table — lets submitters edit/delete their own entries
-- No public RLS policies: only service-role (edge functions) can access this table
CREATE TABLE public.submission_tokens (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  submission_id UUID UNIQUE NOT NULL REFERENCES public.project_submissions(id) ON DELETE CASCADE,
  token UUID NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.submission_tokens ENABLE ROW LEVEL SECURITY;
-- Intentionally no policies — anon and authenticated roles get no access
