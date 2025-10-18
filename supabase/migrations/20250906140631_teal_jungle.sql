/*
  # Add configurable player limit per alliance

  1. New Columns
    - `player_limit` (integer, default 210) - Maximum number of players to include in leaderboard calculations
    - `custom_limit_enabled` (boolean, default false) - Whether to use custom limit or default 210

  2. Changes
    - Add player_limit column to alliances table with default value of 210
    - Add custom_limit_enabled column to track if custom limit is active
    - Update existing alliances to use default values

  3. Security
    - No RLS changes needed as alliances table already has proper policies
*/

-- Add player_limit column with default of 210
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'player_limit'
  ) THEN
    ALTER TABLE alliances ADD COLUMN player_limit integer DEFAULT 210;
  END IF;
END $$;

-- Add custom_limit_enabled column with default of false
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'alliances' AND column_name = 'custom_limit_enabled'
  ) THEN
    ALTER TABLE alliances ADD COLUMN custom_limit_enabled boolean DEFAULT false;
  END IF;
END $$;

-- Update existing alliances to have default values
UPDATE alliances 
SET 
  player_limit = 210,
  custom_limit_enabled = false
WHERE 
  player_limit IS NULL 
  OR custom_limit_enabled IS NULL;