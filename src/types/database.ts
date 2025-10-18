export interface Alliance {
  id: string;
  tag: string;
  name: string;
  created_at?: string;
}

export interface Scan {
  id: string;
  alliance_id: string;
  scan_date: string;
  source_filename: string;
  file_sha256: string;
  created_at?: string;
}

export interface Player {
  id: string;
  lord_id: string;
  current_name: string;
  faction: string | null;
  first_seen: string;
  last_seen: string;
  created_at?: string;
}

export interface PlayerStats {
  id?: number;
  player_id: string;
  scan_id: string;
  alliance_tag: string;
  name: string;
  town_center: number | null;
  home_server: string | null;
  map_id: number | null;
  in_power_rankings: boolean | null;
  power: number | null;
  highest_power: number | null;
  merits: number | null;
  units_killed: number | null;
  legion_power: number | null;
  tech_power: number | null;
  building_power: number | null;
  hero_power: number | null;
  units_dead: number | null;
  units_healed: number | null;
  city_sieges: number | null;
  defeats: number | null;
  victories: number | null;
  scouted: number | null;
  gold: number | null;
  wood: number | null;
  ore: number | null;
  mana: number | null;
  gems: number | null;
  resources_given: number | null;
  resources_given_count: number | null;
  helps_given: number | null;
  gold_spent: number | null;
  wood_spent: number | null;
  stone_spent: number | null;
  mana_spent: number | null;
  gems_spent: number | null;
  killcount_t5: number | null;
  killcount_t4: number | null;
  killcount_t3: number | null;
  killcount_t2: number | null;
  killcount_t1: number | null;
  created_at?: string;
}

export interface CSVRow {
  lord_id: string;
  name: string;
  alliance_id: string;
  alliance_tag: string;
  town_center: string;
  home_server: string;
  in_power_rankings: string;
  power: string;
  map_id: string;
  units_killed: string;
  faction: string;
  merits: string;
  highest_power: string;
  legion_power: string;
  tech_power: string;
  building_power: string;
  hero_power: string;
  units_dead: string;
  units_healed: string;
  city_sieges: string;
  defeats: string;
  victories: string;
  scouted: string;
  gold: string;
  wood: string;
  ore: string;
  mana: string;
  gems: string;
  resources_given: string;
  resources_given_count: string;
  helps_given: string;
  gold_spent: string;
  wood_spent: string;
  stone_spent: string;
  mana_spent: string;
  gems_spent: string;
  killcount_t5: string;
  killcount_t4: string;
  killcount_t3: string;
  killcount_t2: string;
  killcount_t1: string;
}

export interface IngestionSummary {
  alliance: string;
  scanDate: string;
  insertedRows: number;
  updatedPlayers: number;
  processingTime: number;
}