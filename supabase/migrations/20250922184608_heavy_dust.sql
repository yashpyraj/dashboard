/*
  # Allow players in multiple fantasy teams

  1. Changes
    - Remove unique constraint on (team_id, player_id) in fantasy_team_players
    - Keep unique constraint on (team_id, position) to prevent duplicate positions
    - Allow same player to be drafted by multiple teams

  2. Security
    - Maintain existing RLS policies
    - Keep position constraints (1-12)
*/

-- Remove the unique constraint that prevents players from being in multiple teams
ALTER TABLE fantasy_team_players DROP CONSTRAINT IF EXISTS fantasy_team_players_team_id_player_id_key;

-- Drop the corresponding unique index
DROP INDEX IF EXISTS fantasy_team_players_team_id_player_id_key;

-- Keep the position constraint (each team can only have one player per position)
-- This constraint should remain: fantasy_team_players_team_id_position_key