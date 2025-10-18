export interface Alliance {
  id: string;
  tag: string;
  name: string;
  generation?: string;
  season_start_date?: string;
  season_end_date?: string;
  season_name?: string;
  created_at?: string;
}

export interface AllianceDetail extends Alliance {
  lastScanDate?: string;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  seasonDuration?: number; // days
  isSeasonActive?: boolean;
  seasonProgress?: number; // percentage
}

export interface Player {
  id: string;
  lord_id: string;
  current_name: string;
  faction: string | null;
  first_seen: string;
  last_seen: string;
}

export interface PlayerStats {
  id: number;
  player_id: string;
  scan_id: string;
  alliance_tag: string;
  name: string;
  power: number | null;
  highest_power: number | null;
  merits: number | null;
  units_killed: number | null;
  scan_date: string;
}

export interface PlayerTimeline {
  player: Player;
  stats: PlayerStats[];
}

export interface LeaderboardEntry {
  player_id: string;
  name: string;
  power: number | null;
  highest_power: number | null;
  merits: number | null;
  units_killed: number | null;
  faction: string | null;
  killcount_t5?: number | null;
  killcount_t1?: number | null;
  units_dead?: number | null;
  units_healed?: number | null;
  scouted?: number | null;
  helps_given?: number | null;
  mana_spent?: number | null;
  mana?: number | null;
  lord_id?: string | null;
  home_server?: string | null;
}