-- Add lyrics field to portfolio_items table
ALTER TABLE portfolio_items 
ADD COLUMN IF NOT EXISTS lyrics TEXT NOT NULL DEFAULT '';

COMMENT ON COLUMN portfolio_items.lyrics IS 'Lyrics for the portfolio track';
