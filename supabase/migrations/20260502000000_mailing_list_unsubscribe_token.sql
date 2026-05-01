-- Add per-row unsubscribe tokens so the unsubscribe endpoint cannot
-- be abused as an enumeration / griefing oracle.

ALTER TABLE public.mailing_list
  ADD COLUMN IF NOT EXISTS unsubscribe_token UUID NOT NULL DEFAULT gen_random_uuid();

-- Backfill any pre-existing rows (DEFAULT covers new inserts).
UPDATE public.mailing_list
SET unsubscribe_token = gen_random_uuid()
WHERE unsubscribe_token IS NULL;

-- Helpful for the unsubscribe lookup
CREATE INDEX IF NOT EXISTS mailing_list_unsubscribe_token_idx
  ON public.mailing_list (unsubscribe_token);
