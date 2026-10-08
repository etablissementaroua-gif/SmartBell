-- ==============================================================================
-- SmartBell Unified SQL Setup: Storage Bucket, Public RLS & Realtime Sync
-- Run this script in Supabase SQL Editor:
-- https://supabase.com/dashboard/project/mnlmilyymnrhkuulcpfw/sql/new
-- ==============================================================================

-- 1. Create public bucket 'smartbell-audio' for cross-device sound files
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'smartbell-audio',
  'smartbell-audio',
  true,
  52428800, -- 50MB per file
  ARRAY['audio/mpeg', 'audio/mp3', 'audio/wav', 'audio/x-wav', 'audio/ogg', 'audio/flac', 'audio/x-m4a', 'audio/aac']
)
ON CONFLICT (id) DO UPDATE SET public = true;

-- 2. Storage Policies for smartbell-audio bucket (Read, Upload, Update, Delete for all)
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

-- 3. Enable Realtime Replication on intermission_tracks & bell_schedules
-- This ensures all phones, web dashboards, and speakers receive instant live updates
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'intermission_tracks'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE intermission_tracks;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables 
    WHERE pubname = 'supabase_realtime' AND tablename = 'bell_schedules'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE bell_schedules;
  END IF;
END $$;

-- 4. Clean up any invalid blob URLs stored previously so phones and other devices don't fail
UPDATE intermission_tracks 
SET audio_url = 'https://cdn.smartbell.local/audio/nasheed_knowledge.mp3' 
WHERE audio_url LIKE 'blob:%';
