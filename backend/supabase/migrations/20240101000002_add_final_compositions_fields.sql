-- Add missing columns to final_compositions table
-- These columns are used in the generate_music.py router

-- Add uuid column
ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS uuid UUID;

-- Add title column
ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS title TEXT;

-- Add composition_plan column (JSONB for storing the full composition plan)
ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS composition_plan JSONB;

-- Add cover_image_path column
ALTER TABLE final_compositions 
ADD COLUMN IF NOT EXISTS cover_image_path TEXT;

-- Add comments for documentation
COMMENT ON COLUMN final_compositions.uuid IS 'Unique identifier (UUID) for the composition';
COMMENT ON COLUMN final_compositions.title IS 'Title of the composition';
COMMENT ON COLUMN final_compositions.composition_plan IS 'Full composition plan with lyrics and structure (JSON)';
COMMENT ON COLUMN final_compositions.cover_image_path IS 'Path to the cover image file';
