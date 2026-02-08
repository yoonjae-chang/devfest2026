-- Add cover_image_url column to final_compositions table
-- This stores the public URL of the album cover image

ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS cover_image_url TEXT;

COMMENT ON COLUMN final_compositions.cover_image_url IS 'Public URL of the AI-generated album cover image stored in Supabase Storage';
