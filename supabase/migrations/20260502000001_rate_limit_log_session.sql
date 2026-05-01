-- Track a per-browser session id alongside the IP hash so the AI estimate
-- rate limit can't be trivially bypassed by spoofing forwarded-for headers.
-- The client mints the session id once (UUID) and stores it in localStorage;
-- we store it here so the count is per-browser as well as per-IP.

ALTER TABLE public.rate_limit_log
  ADD COLUMN IF NOT EXISTS session_id TEXT;

CREATE INDEX IF NOT EXISTS rate_limit_log_session_id_created_at_idx
  ON public.rate_limit_log (session_id, created_at DESC);

-- Make policy intent explicit. The table is service-role-only; revoking
-- from anon/authenticated removes any chance of accidental exposure if a
-- future maintainer adds a permissive policy.
ALTER TABLE public.rate_limit_log ENABLE ROW LEVEL SECURITY;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE tablename = 'rate_limit_log' AND policyname = 'service role only'
  ) THEN
    CREATE POLICY "service role only"
      ON public.rate_limit_log FOR ALL
      TO service_role
      USING (true)
      WITH CHECK (true);
  END IF;
END $$;

REVOKE ALL ON public.rate_limit_log FROM anon, authenticated;
