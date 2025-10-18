/*
  # Allow players in multiple fantasy teams

  1. Database Changes
    - Remove unique constraint on team_id + position
    - Add new unique constraint on team_id + position only (not player_id)
    - This allows same player in multiple teams but ensures position uniqueness per team

  2. Security
    - Maintain existing RLS policies
    - Keep position validation (1-12)
*/

-- Remove the existing unique constraint that prevents players from being in multiple teams
ALTER TABLE fantasy_team_players DROP CONSTRAINT IF EXISTS fantasy_team_players_team_id_position_key;

-- Add back the constraint but only for team_id + position (allowing same player in multiple teams)
ALTER TABLE fantasy_team_players ADD CONSTRAINT fantasy_team_players_team_id_position_unique 
  UNIQUE (team_id, position);

-- Ensure we still have the position check constraint
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.check_constraints 
    WHERE constraint_name = 'fantasy_team_players_position_check'
  ) THEN
    ALTER TABLE fantasy_team_players ADD CONSTRAINT fantasy_team_players_position_check 
      CHECK (position >= 1 AND position <= 12);
  END IF;
END $$;