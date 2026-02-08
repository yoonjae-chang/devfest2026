-- Add storage_path column to final_compositions table
-- This will store the path to the audio file in Supabase storage
ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS storage_path TEXT;

-- Add comment for documentation
COMMENT ON COLUMN final_compositions.storage_path IS 'Path to the audio file in Supabase storage bucket';

-- Create storage bucket for music files (create if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('music', 'music', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files under their own user_id folder
-- Allow users to read their own music files
DROP POLICY IF EXISTS "Users can read own music files" ON storage.objects;
CREATE POLICY "Users can read own music files"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to upload their own music files
DROP POLICY IF EXISTS "Users can upload own music files" ON storage.objects;
CREATE POLICY "Users can upload own music files"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to update their own music files
DROP POLICY IF EXISTS "Users can update own music files" ON storage.objects;
CREATE POLICY "Users can update own music files"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow users to delete their own music files
DROP POLICY IF EXISTS "Users can delete own music files" ON storage.objects;
CREATE POLICY "Users can delete own music files"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'music' AND (storage.foldername(name))[1] = auth.uid()::text);
