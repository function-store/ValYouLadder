CREATE TABLE public.mailing_list (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT NOT NULL UNIQUE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.mailing_list ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Anyone can subscribe"
  ON public.mailing_list FOR INSERT WITH CHECK (true);

CREATE POLICY "Admins can view subscribers"
  ON public.mailing_list FOR SELECT TO authenticated
  USING (has_role(auth.uid(), 'admin'));
