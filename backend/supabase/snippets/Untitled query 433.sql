-- Portfolio items table (metadata); audio files go in Storage bucket portfolio-audio.
-- If the bucket insert fails (e.g. local Supabase), create bucket "portfolio-audio" (private) in Dashboard > Storage.
CREATE TABLE IF NOT EXISTS portfolio_items (
    id TEXT PRIMARY KEY,
    user_id TEXT NOT NULL,
    color_class TEXT NOT NULL,
    title TEXT NOT NULL,
    duration NUMERIC NULL,
    featured BOOLEAN NOT NULL DEFAULT false,
    description TEXT NOT NULL DEFAULT '',
    file_name TEXT NOT NULL,
    file_size BIGINT NOT NULL,
    file_last_modified BIGINT NOT NULL,
    storage_path TEXT NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_portfolio_items_user_id ON portfolio_items(user_id);

COMMENT ON TABLE portfolio_items IS 'Portfolio track metadata; audio stored in Storage bucket portfolio-audio';

-- RLS: users can only read/write their own rows
ALTER TABLE portfolio_items ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can read own portfolio items"
    ON portfolio_items FOR SELECT
    TO authenticated
    USING (auth.uid()::text = user_id);

CREATE POLICY "Users can insert own portfolio items"
    ON portfolio_items FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can update own portfolio items"
    ON portfolio_items FOR UPDATE
    TO authenticated
    USING (auth.uid()::text = user_id)
    WITH CHECK (auth.uid()::text = user_id);

CREATE POLICY "Users can delete own portfolio items"
    ON portfolio_items FOR DELETE
    TO authenticated
    USING (auth.uid()::text = user_id);

-- Storage bucket for portfolio audio (create if not exists)
INSERT INTO storage.buckets (id, name, public)
VALUES ('portfolio-audio', 'portfolio-audio', false)
ON CONFLICT (id) DO NOTHING;

-- Storage RLS: users can only access files under their own user_id folder
CREATE POLICY "Users can read own portfolio audio"
    ON storage.objects FOR SELECT
    TO authenticated
    USING (bucket_id = 'portfolio-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can upload own portfolio audio"
    ON storage.objects FOR INSERT
    TO authenticated
    WITH CHECK (bucket_id = 'portfolio-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can update own portfolio audio"
    ON storage.objects FOR UPDATE
    TO authenticated
    USING (bucket_id = 'portfolio-audio' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can delete own portfolio audio"
    ON storage.objects FOR DELETE
    TO authenticated
    USING (bucket_id = 'portfolio-audio' AND (storage.foldername(name))[1] = auth.uid()::text);
