-- Create project_submissions table for storing community rate data
CREATE TABLE public.project_submissions (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  project_type TEXT NOT NULL,
  client_type TEXT NOT NULL,
  project_length TEXT NOT NULL,
  client_country TEXT NOT NULL,
  project_location TEXT NOT NULL,
  skills TEXT[] NOT NULL DEFAULT '{}',
  expertise_level TEXT NOT NULL,
  total_budget INTEGER NOT NULL,
  your_budget INTEGER NOT NULL,
  team_size INTEGER NOT NULL DEFAULT 1,
  year_completed INTEGER NOT NULL,
  description TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.project_submissions ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read submissions (anonymous community data)
CREATE POLICY "Anyone can view project submissions"
  ON public.project_submissions
  FOR SELECT
  USING (true);

-- Allow anyone to insert submissions (anonymous contributions)
CREATE POLICY "Anyone can submit projects"
  ON public.project_submissions
  FOR INSERT
  WITH CHECK (true);

-- Create indexes for efficient querying
CREATE INDEX idx_project_submissions_project_type ON public.project_submissions(project_type);
CREATE INDEX idx_project_submissions_client_type ON public.project_submissions(client_type);
CREATE INDEX idx_project_submissions_expertise_level ON public.project_submissions(expertise_level);
CREATE INDEX idx_project_submissions_skills ON public.project_submissions USING GIN(skills);