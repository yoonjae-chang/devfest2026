-- Create composition_plans table
-- This table stores composition plans generated from user prompts

CREATE TABLE IF NOT EXISTS composition_plans (
    id BIGSERIAL PRIMARY KEY,
    user_id TEXT NOT NULL,
    run_id TEXT NOT NULL,
    user_prompt TEXT NOT NULL,
    user_styles TEXT[] DEFAULT '{}',
    lyrics_exists BOOLEAN NOT NULL DEFAULT false,
    composition_plan JSONB NOT NULL,
    better_than_id BIGINT REFERENCES composition_plans(id) ON DELETE SET NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Create indexes for better query performance
CREATE INDEX IF NOT EXISTS idx_composition_plans_user_id ON composition_plans(user_id);
CREATE INDEX IF NOT EXISTS idx_composition_plans_run_id ON composition_plans(run_id);
CREATE INDEX IF NOT EXISTS idx_composition_plans_better_than_id ON composition_plans(better_than_id);
CREATE INDEX IF NOT EXISTS idx_composition_plans_created_at ON composition_plans(created_at DESC);

-- Create a function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create trigger to automatically update updated_at
CREATE TRIGGER update_composition_plans_updated_at
    BEFORE UPDATE ON composition_plans
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- Add comments for documentation
COMMENT ON TABLE composition_plans IS 'Stores composition plans generated from user prompts and their customization iterations';
COMMENT ON COLUMN composition_plans.user_id IS 'Identifier for the user who created this composition plan';
COMMENT ON COLUMN composition_plans.run_id IS 'Identifier for the workflow/session this composition belongs to';
COMMENT ON COLUMN composition_plans.user_prompt IS 'The original user prompt that generated this composition plan';
COMMENT ON COLUMN composition_plans.user_styles IS 'List of styles provided by the user';
COMMENT ON COLUMN composition_plans.lyrics_exists IS 'Whether lyrics were included in the original request';
COMMENT ON COLUMN composition_plans.composition_plan IS 'The actual composition plan JSON object';
COMMENT ON COLUMN composition_plans.better_than_id IS 'Reference to the composition plan this one improves upon (for customization iterations)';
