-- Create the media storage bucket and RLS policies for file attachments.
-- Supports images (jpeg, png, gif, webp) and audio (mp3, ogg, wav) for soundboard clips.

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media',
  'media',
  true,
  52428800, -- 50 MB per file
  ARRAY[
    'image/jpeg', 'image/png', 'image/gif', 'image/webp',
    'audio/mpeg', 'audio/ogg', 'audio/wav'
  ]
) ON CONFLICT (id) DO NOTHING;

-- Authenticated users can upload to their own namespace.
CREATE POLICY "Authenticated users can upload media"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'media');

-- Authenticated users can delete their own uploads.
CREATE POLICY "Users can delete own media"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'media' AND auth.uid()::text = (storage.foldername(name))[1]);

-- Media objects are publicly readable.
CREATE POLICY "Media is publicly readable"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media');
