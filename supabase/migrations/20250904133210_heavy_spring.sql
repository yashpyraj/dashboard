/*
  # Add season naming system

  1. New Columns
    - `season_name` (text) - Human readable season name like "Season 1"
    
  2. Updates
    - Set default season name for existing generations
    - Add index for season queries
    
  3. Security
    - No changes to RLS policies needed
*/

-- Add season_name column to alliances table
ALTER TABLE alliances ADD COLUMN IF NOT EXISTS season_name text DEFAULT 'Season 1';

-- Update existing alliances with default season names based on generation
UPDATE alliances SET season_name = 
  CASE 
    WHEN generation = 'G1' THEN 'Season 1'
    WHEN generation = 'G2' THEN 'Season 1' 
    WHEN generation = 'G3' THEN 'Season 1'
    ELSE 'Season 1'
  END
WHERE season_name IS NULL OR season_name = 'Season 1';

-- Add index for season queries
CREATE INDEX IF NOT EXISTS idx_alliances_season_name ON alliances(season_name);
CREATE INDEX IF NOT EXISTS idx_alliances_generation_season ON alliances(generation, season_name);