-- ==============================================================================
-- SmartBell: Create smartbell-audio storage bucket and enable public access
-- Run this in Supabase SQL Editor if cloud audio file hosting is desired
-- ==============================================================================

-- 1. Create public bucket 'smartbell-audio'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'smartbell-audio',
  'smartbell-audio',
  true,
  52428800, -- 50MB
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Policies for smartbell-audio bucket
DROP POLICY IF EXISTS "Public select smartbell-audio" ON storage.objects;
DROP POLICY IF EXISTS "Public insert smartbell-audio" ON storage.objects;
DROP POLICY IF EXISTS "Public update smartbell-audio" ON storage.objects;
DROP POLICY IF EXISTS "Public delete smartbell-audio" ON storage.objects;

CREATE POLICY "Public select smartbell-audio"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'smartbell-audio');

CREATE POLICY "Public insert smartbell-audio"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'smartbell-audio');

CREATE POLICY "Public update smartbell-audio"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'smartbell-audio');

CREATE POLICY "Public delete smartbell-audio"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'smartbell-audio');
