-- Add cover_image_url field to portfolio_items table (only if table exists)
DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'portfolio_items') THEN
    ALTER TABLE portfolio_items ADD COLUMN IF NOT EXISTS cover_image_url TEXT;
    COMMENT ON COLUMN portfolio_items.cover_image_url IS 'URL of the AI-generated album cover image stored in Supabase Storage';
  END IF;
END $$;

-- Storage bucket for album covers (create if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('album-covers', 'album-covers', true)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files under their own user_id folder
DROP POLICY IF EXISTS "Users can read own album covers" ON storage.objects;
CREATE POLICY "Users can read own album covers"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'album-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can upload own album covers" ON storage.objects;
CREATE POLICY "Users can upload own album covers"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'album-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can update own album covers" ON storage.objects;
CREATE POLICY "Users can update own album covers"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'album-covers' AND (storage.foldername(name))[1] = auth.uid()::text)
    WITH CHECK (bucket_id = 'album-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

DROP POLICY IF EXISTS "Users can delete own album covers" ON storage.objects;
CREATE POLICY "Users can delete own album covers"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'album-covers' AND (storage.foldername(name))[1] = auth.uid()::text);

-- Allow public read access to album covers (since bucket is public)
DROP POLICY IF EXISTS "Public can read album covers" ON storage.objects;
CREATE POLICY "Public can read album covers"
    ON storage.objects FOR SELECT
    TO public
    USING (bucket_id = 'album-covers');
