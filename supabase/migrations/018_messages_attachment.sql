-- Add optional attachment_url to messages and relax NOT NULL on content.
-- A message may have content, an attachment, or both.

ALTER TABLE public.messages
  ADD COLUMN IF NOT EXISTS attachment_url TEXT;

-- Allow content to be null when an attachment_url is present.
ALTER TABLE public.messages
  ALTER COLUMN content DROP NOT NULL;

ALTER TABLE public.messages
  ADD CONSTRAINT messages_content_or_attachment
    CHECK (content IS NOT NULL OR attachment_url IS NOT NULL);
