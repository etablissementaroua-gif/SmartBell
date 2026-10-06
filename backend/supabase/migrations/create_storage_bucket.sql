-- ==============================================================================
-- SmartBell: Create media_files storage bucket and enable public access
-- Run this in Supabase SQL Editor if cloud audio file hosting is desired
-- ==============================================================================

-- 1. Create public bucket 'media_files'
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'media_files',
  'media_files',
  true,
  52428800, -- 50MB
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Policies for media_files bucket
DROP POLICY IF EXISTS "Public select media_files" ON storage.objects;
DROP POLICY IF EXISTS "Public insert media_files" ON storage.objects;
DROP POLICY IF EXISTS "Public update media_files" ON storage.objects;
DROP POLICY IF EXISTS "Public delete media_files" ON storage.objects;

CREATE POLICY "Public select media_files"
  ON storage.objects FOR SELECT
  TO public
  USING (bucket_id = 'media_files');

CREATE POLICY "Public insert media_files"
  ON storage.objects FOR INSERT
  TO public
  WITH CHECK (bucket_id = 'media_files');

CREATE POLICY "Public update media_files"
  ON storage.objects FOR UPDATE
  TO public
  USING (bucket_id = 'media_files');

CREATE POLICY "Public delete media_files"
  ON storage.objects FOR DELETE
  TO public
  USING (bucket_id = 'media_files');
