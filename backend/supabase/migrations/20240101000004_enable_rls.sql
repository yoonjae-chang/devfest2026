-- Enable Row Level Security (RLS) on all tables
-- Users can only view/edit their own rows based on user_id matching auth.uid()

-- Enable RLS on composition_plans table
ALTER TABLE composition_plans ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own composition plans" ON composition_plans;
DROP POLICY IF EXISTS "Users can insert their own composition plans" ON composition_plans;
DROP POLICY IF EXISTS "Users can update their own composition plans" ON composition_plans;
DROP POLICY IF EXISTS "Users can delete their own composition plans" ON composition_plans;

-- Policy: Users can SELECT their own composition plans
CREATE POLICY "Users can view their own composition plans"
ON composition_plans
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can INSERT composition plans with their own user_id
CREATE POLICY "Users can insert their own composition plans"
ON composition_plans
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can UPDATE their own composition plans
CREATE POLICY "Users can update their own composition plans"
ON composition_plans
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can DELETE their own composition plans
CREATE POLICY "Users can delete their own composition plans"
ON composition_plans
FOR DELETE
USING (user_id = auth.uid()::text);

-- Enable RLS on final_compositions table
ALTER TABLE final_compositions ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist (for idempotency)
DROP POLICY IF EXISTS "Users can view their own final compositions" ON final_compositions;
DROP POLICY IF EXISTS "Users can insert their own final compositions" ON final_compositions;
DROP POLICY IF EXISTS "Users can update their own final compositions" ON final_compositions;
DROP POLICY IF EXISTS "Users can delete their own final compositions" ON final_compositions;

-- Policy: Users can SELECT their own final compositions
CREATE POLICY "Users can view their own final compositions"
ON final_compositions
FOR SELECT
USING (user_id = auth.uid()::text);

-- Policy: Users can INSERT final compositions with their own user_id
CREATE POLICY "Users can insert their own final compositions"
ON final_compositions
FOR INSERT
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can UPDATE their own final compositions
CREATE POLICY "Users can update their own final compositions"
ON final_compositions
FOR UPDATE
USING (user_id = auth.uid()::text)
WITH CHECK (user_id = auth.uid()::text);

-- Policy: Users can DELETE their own final compositions
CREATE POLICY "Users can delete their own final compositions"
ON final_compositions
FOR DELETE
USING (user_id = auth.uid()::text);

-- Add comments for documentation
COMMENT ON POLICY "Users can view their own composition plans" ON composition_plans IS 'Allows users to view only their own composition plans';
COMMENT ON POLICY "Users can insert their own composition plans" ON composition_plans IS 'Allows users to insert composition plans with their own user_id';
COMMENT ON POLICY "Users can update their own composition plans" ON composition_plans IS 'Allows users to update only their own composition plans';
COMMENT ON POLICY "Users can delete their own composition plans" ON composition_plans IS 'Allows users to delete only their own composition plans';

COMMENT ON POLICY "Users can view their own final compositions" ON final_compositions IS 'Allows users to view only their own final compositions';
COMMENT ON POLICY "Users can insert their own final compositions" ON final_compositions IS 'Allows users to insert final compositions with their own user_id';
COMMENT ON POLICY "Users can update their own final compositions" ON final_compositions IS 'Allows users to update only their own final compositions';
COMMENT ON POLICY "Users can delete their own final compositions" ON final_compositions IS 'Allows users to delete only their own final compositions';
