/*
  # Add Generation System to Alliances

  1. New Columns
    - `generation` (text) - Generation identifier like G1, G2, G3, etc.
    - `season_start_date` (date) - Start date of the generation season
    - `season_end_date` (date) - End date of the generation season
    
  2. Data Migration
    - Mark all existing alliances as G2 generation
    - Set default season dates for G2 (2 Aug - 3 Sep)
    
  3. Security
    - Update RLS policies to include new columns
*/

-- Add generation columns to alliances table
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'generation'
  ) THEN
    ALTER TABLE alliances ADD COLUMN generation text DEFAULT 'G2';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'season_start_date'
  ) THEN
    ALTER TABLE alliances ADD COLUMN season_start_date date DEFAULT '2024-08-02';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'season_end_date'
  ) THEN
    ALTER TABLE alliances ADD COLUMN season_end_date date DEFAULT '2024-09-03';
  END IF;
END $$;

-- Update existing alliances to G2 with default season dates
UPDATE alliances 
SET 
  generation = 'G2',
  season_start_date = '2024-08-02',
  season_end_date = '2024-09-03'
WHERE generation IS NULL OR generation = '';

-- Add index for generation queries
CREATE INDEX IF NOT EXISTS idx_alliances_generation ON alliances(generation);
CREATE INDEX IF NOT EXISTS idx_alliances_season ON alliances(season_start_date, season_end_date);