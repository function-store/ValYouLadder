-- Drop restrictive policies and recreate as permissive
DROP POLICY IF EXISTS "Anyone can view project submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Admins can update submissions" ON public.project_submissions;
DROP POLICY IF EXISTS "Admins can delete submissions" ON public.project_submissions;

-- Recreate as PERMISSIVE policies (default)
CREATE POLICY "Anyone can view project submissions" 
  ON public.project_submissions 
  FOR SELECT 
  USING (true);

CREATE POLICY "Admins can update submissions" 
  ON public.project_submissions 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete submissions" 
  ON public.project_submissions 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

-- Fix estimate_submissions policies too
DROP POLICY IF EXISTS "Admins can view estimates" ON public.estimate_submissions;
DROP POLICY IF EXISTS "Admins can update estimates" ON public.estimate_submissions;
DROP POLICY IF EXISTS "Admins can delete estimates" ON public.estimate_submissions;
DROP POLICY IF EXISTS "Anyone can submit estimates" ON public.estimate_submissions;

CREATE POLICY "Admins can view estimates" 
  ON public.estimate_submissions 
  FOR SELECT 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can update estimates" 
  ON public.estimate_submissions 
  FOR UPDATE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Admins can delete estimates" 
  ON public.estimate_submissions 
  FOR DELETE 
  USING (has_role(auth.uid(), 'admin'));

CREATE POLICY "Anyone can submit estimates" 
  ON public.estimate_submissions 
  FOR INSERT 
  WITH CHECK (true);