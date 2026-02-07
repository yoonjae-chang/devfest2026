-- Create final_compositions table
-- This table stores the final generated music compositions

CREATE TABLE IF NOT EXISTS final_compositions (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    composition_plan_id BIGINT NOT NULL REFERENCES composition_plans(id) ON DELETE CASCADE,
    audio_path TEXT NOT NULL,
    audio_filename TEXT NOT NULL,
    track_metadata JSONB,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_final_compositions_user_id ON final_compositions(user_id);
CREATE INDEX IF NOT EXISTS idx_final_compositions_run_id ON final_compositions(run_id);
CREATE INDEX IF NOT EXISTS idx_final_compositions_composition_plan_id ON final_compositions(composition_plan_id);
CREATE INDEX IF NOT EXISTS idx_final_compositions_created_at ON final_compositions(created_at DESC);

-- Add comments for documentation
COMMENT ON TABLE final_compositions IS 'Stores final generated music compositions with their audio files and metadata';
COMMENT ON COLUMN final_compositions.user_id IS 'Identifier for the user who generated this composition';
COMMENT ON COLUMN final_compositions.run_id IS 'Identifier for the workflow/session this composition belongs to';
COMMENT ON COLUMN final_compositions.composition_plan_id IS 'Reference to the composition plan used to generate this music';
COMMENT ON COLUMN final_compositions.audio_path IS 'Local file path where the audio file is stored';
COMMENT ON COLUMN final_compositions.audio_filename IS 'Filename of the audio file';
COMMENT ON COLUMN final_compositions.track_metadata IS 'JSON metadata about the generated track (duration, etc.)';
