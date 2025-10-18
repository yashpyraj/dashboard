/*
  # Alliance Analytics Schema

  Creates a comprehensive database schema for weekly alliance CSV scans supporting progress tracking, leaderboards, and player timelines.

  ## 1. New Tables

  ### alliances
  - `id` (uuid, primary key) - Unique alliance identifier
  - `tag` (text, unique, not null) - Alliance tag/abbreviation
  - `name` (text, not null) - Full alliance name
  - `created_at` (timestamptz, default now()) - Record creation timestamp

  ### scans
  - `id` (uuid, primary key) - Unique scan identifier
  - `alliance_id` (uuid, foreign key) - References alliances table
  - `scan_date` (date, not null) - Date of the CSV scan
  - `source_filename` (text, not null) - Original CSV filename
  - `file_sha256` (text, not null) - File hash for integrity verification
  - `created_at` (timestamptz, default now()) - Record creation timestamp
  - Unique constraint on (alliance_id, scan_date) to prevent duplicate scans

  ### players
  - `id` (uuid, primary key) - Unique player identifier
  - `lord_id` (text, unique, not null) - Game's unique player identifier
  - `current_name` (text, not null) - Most recent player name
  - `faction` (text) - Player's faction
  - `first_seen` (date, not null) - First appearance in scans
  - `last_seen` (date, not null) - Most recent appearance in scans
  - `created_at` (timestamptz, default now()) - Record creation timestamp

  ### player_stats
  - `id` (bigserial, primary key) - Unique stat record identifier
  - `player_id` (uuid, foreign key) - References players table
  - `scan_id` (uuid, foreign key) - References scans table
  - `alliance_tag` (text, not null) - Alliance tag at time of scan
  - `name` (text, not null) - Player name at time of scan
  - Core game stats (power, resources, combat metrics) - All bigint for large values
  - Geographic data (town_center int, home_server text, map_id int)
  - Boolean flags (in_power_rankings)
  - Unique constraint on (player_id, scan_id) to prevent duplicate stats

  ## 2. Security
  - Enable RLS on all tables
  - Add policies for authenticated users to read their alliance data
  - Service role policies for data import operations

  ## 3. Performance
  - Optimized indexes for common query patterns:
    - scans(alliance_id, scan_date desc) for timeline queries
    - player_stats(scan_id) for scan-based analysis
    - player_stats(player_id) for player timelines
    - player_stats(alliance_tag, scan_id) for alliance leaderboards

  ## 4. Functions
  - `update_player_seen()` for efficient player metadata updates
</*/

-- Enable required extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Create alliances table
CREATE TABLE IF NOT EXISTS alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tag text UNIQUE NOT NULL,
  name text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create scans table
CREATE TABLE IF NOT EXISTS scans (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  alliance_id uuid NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  scan_date date NOT NULL,
  source_filename text NOT NULL,
  file_sha256 text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(alliance_id, scan_date)
);

-- Create players table
CREATE TABLE IF NOT EXISTS players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  lord_id text UNIQUE NOT NULL,
  current_name text NOT NULL,
  faction text,
  first_seen date NOT NULL,
  last_seen date NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Create player_stats table
CREATE TABLE IF NOT EXISTS player_stats (
  id bigserial PRIMARY KEY,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  scan_id uuid NOT NULL REFERENCES scans(id) ON DELETE CASCADE,
  alliance_tag text NOT NULL,
  name text NOT NULL,
  town_center int,
  home_server text,
  map_id int,
  in_power_rankings boolean DEFAULT false,
  
  -- Power metrics (bigint for large values)
  power bigint,
  highest_power bigint,
  merits bigint,
  
  -- Combat metrics
  units_killed bigint,
  legion_power bigint,
  tech_power bigint,
  building_power bigint,
  hero_power bigint,
  units_dead bigint,
  units_healed bigint,
  city_sieges bigint,
  defeats bigint,
  victories bigint,
  scouted bigint,
  
  -- Resources
  gold bigint,
  wood bigint,
  ore bigint,
  mana bigint,
  gems bigint,
  
  -- Alliance contributions
  resources_given bigint,
  resources_given_count bigint,
  helps_given bigint,
  
  -- Resource spending
  gold_spent bigint,
  wood_spent bigint,
  stone_spent bigint,
  mana_spent bigint,
  gems_spent bigint,
  
  -- Unit kill counts by tier
  killcount_t5 bigint,
  killcount_t4 bigint,
  killcount_t3 bigint,
  killcount_t2 bigint,
  killcount_t1 bigint,
  
  created_at timestamptz DEFAULT now(),
  UNIQUE(player_id, scan_id)
);

-- Create performance indexes
CREATE INDEX IF NOT EXISTS idx_scans_alliance_date 
  ON scans(alliance_id, scan_date DESC);

CREATE INDEX IF NOT EXISTS idx_player_stats_scan 
  ON player_stats(scan_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_player 
  ON player_stats(player_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_alliance_scan 
  ON player_stats(alliance_tag, scan_id);

-- Additional performance indexes for common queries
CREATE INDEX IF NOT EXISTS idx_players_lord_id 
  ON players(lord_id);

CREATE INDEX IF NOT EXISTS idx_player_stats_power 
  ON player_stats(power DESC) 
  WHERE power IS NOT NULL;

-- Function to update player seen dates and name
CREATE OR REPLACE FUNCTION update_player_seen(
  p_player_id uuid,
  p_date date,
  p_name text
) RETURNS void AS $$
BEGIN
  UPDATE players 
  SET 
    current_name = p_name,
    first_seen = LEAST(first_seen, p_date),
    last_seen = GREATEST(last_seen, p_date)
  WHERE id = p_player_id;
  
  -- If no rows were updated, the player doesn't exist
  IF NOT FOUND THEN
    RAISE EXCEPTION 'Player with id % not found', p_player_id;
  END IF;
END;
$$ LANGUAGE plpgsql;

-- Enable Row Level Security
ALTER TABLE alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE scans ENABLE ROW LEVEL SECURITY;
ALTER TABLE players ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_stats ENABLE ROW LEVEL SECURITY;

-- Basic RLS policies for authenticated users
CREATE POLICY "Users can read alliance data"
  ON alliances
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read scan data"
  ON scans
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read player data"
  ON players
  FOR SELECT
  TO authenticated
  USING (true);

CREATE POLICY "Users can read player stats"
  ON player_stats
  FOR SELECT
  TO authenticated
  USING (true);

-- Service role policies for data import operations
CREATE POLICY "Service role can manage alliances"
  ON alliances
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage scans"
  ON scans
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage players"
  ON players
  FOR ALL
  TO service_role
  USING (true);

CREATE POLICY "Service role can manage player stats"
  ON player_stats
  FOR ALL
  TO service_role
  USING (true);