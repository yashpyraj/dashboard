/*
  # Fix RLS policies for public read access

  1. Security Updates
    - Enable public SELECT access on all tables for dashboard functionality
    - Maintain admin-only write access
    - Fix policies that were blocking anonymous users

  2. Policy Updates
    - Update alliances table policies for public read
    - Update scans table policies for public read  
    - Update players table policies for public read
    - Update player_stats table policies for public read

  3. Notes
    - Anonymous users can now read all data for dashboard
    - Only authenticated admins can write/modify data
    - Service role maintains full access for ingestion
*/

-- Drop existing restrictive policies and recreate with public read access

-- Alliances table policies
DROP POLICY IF EXISTS "Users can read alliance data" ON alliances;
DROP POLICY IF EXISTS "Service role can manage alliances" ON alliances;

CREATE POLICY "Public can read alliances"
  ON alliances
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage alliances"
  ON alliances
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );

CREATE POLICY "Service role full access on alliances"
  ON alliances
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Scans table policies  
DROP POLICY IF EXISTS "Users can read scan data" ON scans;
DROP POLICY IF EXISTS "Service role can manage scans" ON scans;

CREATE POLICY "Public can read scans"
  ON scans
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage scans"
  ON scans
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );

CREATE POLICY "Service role full access on scans"
  ON scans
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Players table policies
DROP POLICY IF EXISTS "Users can read player data" ON players;
DROP POLICY IF EXISTS "Service role can manage players" ON players;

CREATE POLICY "Public can read players"
  ON players
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage players"
  ON players
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );

CREATE POLICY "Service role full access on players"
  ON players
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Player stats table policies
DROP POLICY IF EXISTS "Users can read player stats" ON player_stats;
DROP POLICY IF EXISTS "Service role can manage player stats" ON player_stats;

CREATE POLICY "Public can read player_stats"
  ON player_stats
  FOR SELECT
  TO anon, authenticated
  USING (true);

CREATE POLICY "Admins can manage player_stats"
  ON player_stats
  FOR ALL
  TO authenticated
  USING (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  )
  WITH CHECK (
    auth.jwt() ->> 'role' = 'service_role' OR
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'admin'
  );

CREATE POLICY "Service role full access on player_stats"
  ON player_stats
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);