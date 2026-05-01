-- Apply the project_submissions.client_country DROP NOT NULL that the original
-- migration 20260427000000 declared but never reached production.
-- (Confirmed via probe 10 on 2026-05-01: insert without client_country still
-- failed with `null value in column "client_country" violates not-null constraint`
-- after 20260501000000 was applied.)
--
-- Idempotent: ALTER ... DROP NOT NULL is a no-op if the column is already nullable.
ALTER TABLE public.project_submissions ALTER COLUMN client_country DROP NOT NULL;
