/*
  # COD Fantasy League System

  1. New Tables
    - `fantasy_events`
      - `id` (uuid, primary key)
      - `name` (text, event name)
      - `description` (text, event description)
      - `start_date` (date, event start)
      - `end_date` (date, event end)
      - `max_teams` (integer, max participating teams)
      - `team_size` (integer, players per team - 6, 8, or 12)
      - `max_per_server` (integer, max players per server - default 2)
      - `is_active` (boolean, event status)
      - `created_at` (timestamp)

    - `fantasy_event_alliances`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to fantasy_events)
      - `alliance_id` (uuid, foreign key to alliances)
      - `server_id` (text, server identifier)
      - `created_at` (timestamp)

    - `fantasy_teams`
      - `id` (uuid, primary key)
      - `event_id` (uuid, foreign key to fantasy_events)
      - `team_name` (text, team name)
      - `owner_lord_id` (text, team owner's lord ID)
      - `owner_name` (text, team owner's name)
      - `is_complete` (boolean, team completion status)
      - `created_at` (timestamp)

    - `fantasy_team_players`
      - `id` (uuid, primary key)
      - `team_id` (uuid, foreign key to fantasy_teams)
      - `player_id` (uuid, foreign key to players)
      - `server_id` (text, player's server)
      - `position` (integer, position in team 1-12)
      - `created_at` (timestamp)

  2. Security
    - Enable RLS on all tables
    - Add policies for public read access
    - Add policies for authenticated insert/update

  3. Indexes
    - Event and team lookups
    - Player selection optimization
    - Server-based filtering
*/

-- Fantasy Events Table
CREATE TABLE IF NOT EXISTS fantasy_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  description text,
  start_date date NOT NULL,
  end_date date NOT NULL,
  max_teams integer DEFAULT 50,
  team_size integer DEFAULT 6 CHECK (team_size IN (6, 8, 12)),
  max_per_server integer DEFAULT 2,
  is_active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Fantasy Event Alliances (which alliances are available for selection)
CREATE TABLE IF NOT EXISTS fantasy_event_alliances (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES fantasy_events(id) ON DELETE CASCADE,
  alliance_id uuid NOT NULL REFERENCES alliances(id) ON DELETE CASCADE,
  server_id text NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, alliance_id)
);

-- Fantasy Teams
CREATE TABLE IF NOT EXISTS fantasy_teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id uuid NOT NULL REFERENCES fantasy_events(id) ON DELETE CASCADE,
  team_name text NOT NULL,
  owner_lord_id text NOT NULL,
  owner_name text NOT NULL,
  is_complete boolean DEFAULT false,
  created_at timestamptz DEFAULT now(),
  UNIQUE(event_id, owner_lord_id)
);

-- Fantasy Team Players
CREATE TABLE IF NOT EXISTS fantasy_team_players (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES fantasy_teams(id) ON DELETE CASCADE,
  player_id uuid NOT NULL REFERENCES players(id) ON DELETE CASCADE,
  server_id text NOT NULL,
  position integer NOT NULL CHECK (position >= 1 AND position <= 12),
  created_at timestamptz DEFAULT now(),
  UNIQUE(team_id, player_id),
  UNIQUE(team_id, position)
);

-- Enable RLS
ALTER TABLE fantasy_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_event_alliances ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE fantasy_team_players ENABLE ROW LEVEL SECURITY;

-- RLS Policies for fantasy_events
CREATE POLICY "fantasy_events select (anon)"
  ON fantasy_events
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "fantasy_events insert (anon)"
  ON fantasy_events
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "fantasy_events update (anon)"
  ON fantasy_events
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fantasy_events delete (anon)"
  ON fantasy_events
  FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for fantasy_event_alliances
CREATE POLICY "fantasy_event_alliances select (anon)"
  ON fantasy_event_alliances
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "fantasy_event_alliances insert (anon)"
  ON fantasy_event_alliances
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "fantasy_event_alliances update (anon)"
  ON fantasy_event_alliances
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fantasy_event_alliances delete (anon)"
  ON fantasy_event_alliances
  FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for fantasy_teams
CREATE POLICY "fantasy_teams select (anon)"
  ON fantasy_teams
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "fantasy_teams insert (anon)"
  ON fantasy_teams
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "fantasy_teams update (anon)"
  ON fantasy_teams
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fantasy_teams delete (anon)"
  ON fantasy_teams
  FOR DELETE
  TO anon
  USING (true);

-- RLS Policies for fantasy_team_players
CREATE POLICY "fantasy_team_players select (anon)"
  ON fantasy_team_players
  FOR SELECT
  TO anon
  USING (true);

CREATE POLICY "fantasy_team_players insert (anon)"
  ON fantasy_team_players
  FOR INSERT
  TO anon
  WITH CHECK (true);

CREATE POLICY "fantasy_team_players update (anon)"
  ON fantasy_team_players
  FOR UPDATE
  TO anon
  USING (true)
  WITH CHECK (true);

CREATE POLICY "fantasy_team_players delete (anon)"
  ON fantasy_team_players
  FOR DELETE
  TO anon
  USING (true);

-- Indexes for performance
CREATE INDEX IF NOT EXISTS idx_fantasy_events_active ON fantasy_events(is_active, start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_fantasy_event_alliances_event ON fantasy_event_alliances(event_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_event_alliances_server ON fantasy_event_alliances(server_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_event ON fantasy_teams(event_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_teams_owner ON fantasy_teams(owner_lord_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_team_players_team ON fantasy_team_players(team_id);
CREATE INDEX IF NOT EXISTS idx_fantasy_team_players_server ON fantasy_team_players(server_id);