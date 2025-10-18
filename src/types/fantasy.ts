export interface FantasyEvent {
  id: string;
  name: string;
  description?: string;
  start_date: string;
  end_date: string;
  max_teams: number;
  team_size: number; // 6, 8, or 12
  max_per_server: number; // default 2
  is_active: boolean;
  created_at: string;
}

export interface FantasyEventAlliance {
  id: string;
  event_id: string;
  alliance_id: string;
  server_id: string;
  created_at: string;
  alliance?: {
    tag: string;
    name: string;
  };
}

export interface FantasyTeam {
  id: string;
  event_id: string;
  team_name: string;
  owner_lord_id: string;
  owner_name: string;
  is_complete: boolean;
  created_at: string;
  players?: FantasyTeamPlayer[];
}

export interface FantasyTeamPlayer {
  id: string;
  team_id: string;
  player_id: string;
  server_id: string;
  position: number;
  created_at: string;
  players?: {
    lord_id: string;
    current_name: string;
    faction: string | null;
  };
  stats?: {
    power: number | null;
    highest_power: number | null;
    merits: number | null;
    units_killed: number | null;
    killcount_t5: number | null;
    alliance_tag: string;
  };
}

export interface AvailablePlayer {
  player_id: string;
  lord_id: string;
  current_name: string;
  faction: string | null;
  alliance_tag: string;
  server_id: string;
  power: number | null;
  highest_power: number | null;
  merits: number | null;
  units_killed: number | null;
  killcount_t5: number | null;
}
