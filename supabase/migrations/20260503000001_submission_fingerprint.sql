-- Add IP fingerprint and manual flag columns to project_submissions.
-- ip_hash: SHA-256 of (runtime peer | forwarded IP | user-agent), stored at submit time.
--   Useful for clustering submissions from the same source without storing raw IPs.
-- flagged: admin-settable boolean for suspicious submissions; excluded from estimates
--   once the estimation layer is taught to filter on this column.

ALTER TABLE public.project_submissions
  ADD COLUMN IF NOT EXISTS ip_hash TEXT,
  ADD COLUMN IF NOT EXISTS flagged BOOLEAN NOT NULL DEFAULT FALSE;

CREATE INDEX IF NOT EXISTS project_submissions_ip_hash_idx
  ON public.project_submissions (ip_hash);

-- Partial index — only flagged rows, keeps it tiny
CREATE INDEX IF NOT EXISTS project_submissions_flagged_idx
  ON public.project_submissions (flagged) WHERE flagged = TRUE;
