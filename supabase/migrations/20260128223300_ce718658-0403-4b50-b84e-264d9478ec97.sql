-- Create app_role enum for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'user');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Enable RLS on user_roles
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

-- Security definer function to check roles (prevents RLS recursion)
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.user_roles
    WHERE user_id = _user_id
      AND role = _role
  )
$$;

-- RLS policies for user_roles (only admins can view/manage)
CREATE POLICY "Admins can view all roles"
ON public.user_roles
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can manage roles"
ON public.user_roles
FOR ALL
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create estimate_submissions table (hidden from public)
CREATE TABLE public.estimate_submissions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    project_type TEXT NOT NULL,
    client_type TEXT NOT NULL,
    project_length TEXT NOT NULL,
    client_country TEXT,
    project_location TEXT,
    skills TEXT[] NOT NULL DEFAULT '{}',
    expertise_level TEXT NOT NULL,
    low_estimate INTEGER NOT NULL,
    mid_estimate INTEGER NOT NULL,
    high_estimate INTEGER NOT NULL,
    used_ai BOOLEAN NOT NULL DEFAULT false,
    sample_size INTEGER NOT NULL DEFAULT 0,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on estimate_submissions
ALTER TABLE public.estimate_submissions ENABLE ROW LEVEL SECURITY;

-- Only admins can view estimates
CREATE POLICY "Admins can view estimates"
ON public.estimate_submissions
FOR SELECT
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Anyone can insert estimates (anonymous tracking)
CREATE POLICY "Anyone can submit estimates"
ON public.estimate_submissions
FOR INSERT
WITH CHECK (true);

-- Only admins can update/delete estimates
CREATE POLICY "Admins can update estimates"
ON public.estimate_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete estimates"
ON public.estimate_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Add admin policies to project_submissions for edit/delete
CREATE POLICY "Admins can update submissions"
ON public.project_submissions
FOR UPDATE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete submissions"
ON public.project_submissions
FOR DELETE
TO authenticated
USING (public.has_role(auth.uid(), 'admin'));

-- Create indexes for performance
CREATE INDEX idx_estimate_submissions_created_at ON public.estimate_submissions(created_at DESC);
CREATE INDEX idx_estimate_submissions_client_type ON public.estimate_submissions(client_type);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);