import { supabase } from '../lib/supabase';
import { Alliance, AllianceDetail, LeaderboardEntry, PlayerTimeline } from '../types';

export async function fetchAlliances(): Promise<Alliance[]> {
  const { data, error } = await supabase
    .from('alliances')
    .select('id, tag, name, created_at')
    .order('tag');
  
  if (error) {
    console.error('Error fetching alliances:', error);
    throw error;
  }
  
  return data || [];
}

export async function fetchAllianceDetail(allianceId: string): Promise<AllianceDetail> {
  // Get basic alliance info
  const { data: alliance, error: allianceError } = await supabase
    .from('alliances')
    .select('id, tag, name, generation, season_start_date, season_end_date, created_at')
    .eq('id', allianceId)
    .single();

  if (allianceError) throw allianceError;

  // Filter by 50M+ power instead of using limit
  const POWER_THRESHOLD = 50000000;

  // Get latest scan date
  const { data: latestScan, error: scanError } = await supabase
    .from('scans')
    .select('scan_date')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  // Get member stats from latest scan
  let memberCount = 0;
  let totalPower = 0;
  let averagePower = 0;

  if (latestScan && !scanError) {
    // Get the scan ID for the latest scan
    const { data: scanData, error: scanIdError } = await supabase
      .from('scans')
      .select('id')
      .eq('alliance_id', allianceId)
      .eq('scan_date', latestScan.scan_date)
      .single();

    if (!scanIdError && scanData) {
      // Get all players with 50M+ highest_power for calculations
      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select('power, highest_power, home_server')
        .eq('scan_id', scanData.id)
        .not('home_server', 'is', null)
        .gte('highest_power', POWER_THRESHOLD)
        .order('highest_power', { ascending: false, nullsLast: true });

      if (!statsError && stats) {
        memberCount = stats.length;
        totalPower = stats.reduce((sum, stat) => sum + (stat.power || 0), 0);
        averagePower = memberCount > 0 ? Math.round(totalPower / memberCount) : 0;
      }
    }
  }
  
  // Calculate season duration
  let seasonDuration = 0;
  let isSeasonActive = false;
  let seasonProgress = 0;
  
  if (alliance.season_start_date && alliance.season_end_date) {
    const startDate = new Date(alliance.season_start_date);
    const endDate = new Date(alliance.season_end_date);
    const currentDate = new Date();
    
    seasonDuration = Math.ceil((endDate.getTime() - startDate.getTime()) / (1000 * 60 * 60 * 24));
    
    // Check if season is currently active
    isSeasonActive = currentDate >= startDate && currentDate <= endDate;
    
    // Calculate season progress percentage
    if (currentDate >= startDate) {
      const totalDuration = endDate.getTime() - startDate.getTime();
      const elapsed = Math.min(currentDate.getTime() - startDate.getTime(), totalDuration);
      seasonProgress = Math.round((elapsed / totalDuration) * 100);
    }
  }
  
  return {
    ...alliance,
    lastScanDate: latestScan?.scan_date || undefined,
    memberCount,
    totalPower,
    averagePower,
    seasonDuration,
    isSeasonActive,
    seasonProgress,
  };
}

export async function fetchLeaderboard(allianceId: string): Promise<LeaderboardEntry[]> {
  // Filter by 50M+ power instead of using limit
  const POWER_THRESHOLD = 50000000;

  // Get the latest scan for this alliance
  const { data: latestScan, error: scanError } = await supabase
    .from('scans')
    .select('id')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanError || !latestScan) {
    return [];
  }

  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      player_id,
      name,
      power,
      highest_power,
      merits,
      units_killed,
      killcount_t5,
      killcount_t1,
      units_dead,
      units_healed,
      scouted,
      helps_given,
      mana_spent,
      mana,
      home_server,
      players!inner(faction, lord_id)
    `)
    .eq('scan_id', latestScan.id)
    .not('home_server', 'is', null)
    .gte('highest_power', POWER_THRESHOLD)
    .order('highest_power', { ascending: false, nullsLast: true });
  
  if (error) throw error;
  
  return (data || []).map(stat => ({
    player_id: stat.player_id,
    name: stat.name,
    power: stat.power,
    highest_power: stat.highest_power,
    merits: stat.merits,
    units_killed: stat.units_killed,
    killcount_t5: stat.killcount_t5,
    killcount_t1: stat.killcount_t1,
    units_dead: stat.units_dead,
    units_healed: stat.units_healed,
    scouted: stat.scouted,
    helps_given: stat.helps_given,
    mana_spent: stat.mana_spent,
    mana: stat.mana,
    faction: (stat.players as any)?.faction || null,
    lord_id: (stat.players as any)?.lord_id || null,
    home_server: stat.home_server,
  }));
}

export async function fetchPlayerTimeline(playerId: string): Promise<PlayerTimeline> {
  // Get player info
  const { data: player, error: playerError } = await supabase
    .from('players')
    .select('*')
    .eq('id', playerId)
    .single();
  
  if (playerError) throw playerError;
  
  // Get player stats over time
  const { data: stats, error: statsError } = await supabase
    .from('player_stats')
    .select(`
      *,
      scans!inner(scan_date)
    `)
    .eq('player_id', playerId)
    .order('scans(scan_date)', { ascending: true });
  
  if (statsError) throw statsError;
  
  const formattedStats = (stats || []).map(stat => ({
    ...stat,
    scan_date: (stat.scans as any).scan_date,
  }));
  
  return {
    player,
    stats: formattedStats,
  };
}

export async function fetchPlayerRankings(playerId: string, allianceId: string): Promise<Record<string, { rank: number; total: number; percentile: number }>> {
  // Get the latest scan for this alliance
  const { data: latestScan, error: scanError } = await supabase
    .from('scans')
    .select('id')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle();

  if (scanError || !latestScan) {
    return {};
  }

  // Get all player stats from the latest scan
  const { data: allStats, error: statsError } = await supabase
    .from('player_stats')
    .select(`
      player_id,
      power,
      highest_power,
      merits,
      units_killed,
      killcount_t5,
      killcount_t4,
      killcount_t3,
      killcount_t2,
      killcount_t1,
      units_dead,
      units_healed,
      scouted,
      helps_given,
      mana_spent,
      mana,
      victories,
      defeats
    `)
    .eq('scan_id', latestScan.id)
    .not('home_server', 'is', null);

  if (statsError || !allStats) {
    return {};
  }

  // Find the target player's stats
  const playerStats = allStats.find(stat => stat.player_id === playerId);
  if (!playerStats) {
    return {};
  }

  const rankings: Record<string, { rank: number; total: number; percentile: number }> = {};
  const total = allStats.length;

  // Define fields to rank
  const fieldsToRank = [
    'power',
    'highest_power', 
    'merits',
    'units_killed',
    'killcount_t5',
    'killcount_t4',
    'killcount_t3',
    'killcount_t2',
    'killcount_t1',
    'units_dead',
    'units_healed',
    'scouted',
    'helps_given',
    'mana_spent',
    'mana',
    'victories',
    'defeats'
  ];

  // Calculate rankings for each field
  fieldsToRank.forEach(field => {
    const playerValue = (playerStats as any)[field] || 0;
    
    // Count how many players have higher values (for descending rank)
    const playersWithHigherValues = allStats.filter(stat => 
      ((stat as any)[field] || 0) > playerValue
    ).length;
    
    const rank = playersWithHigherValues + 1;
    const percentile = Math.round(((total - rank + 1) / total) * 100);
    
    rankings[field] = {
      rank,
      total,
      percentile
    };
  });

  return rankings;
}
export async function searchPlayers(allianceId: string, query: string): Promise<LeaderboardEntry[]> {
  // Get the latest scan for this alliance
  const { data: latestScan, error: scanError } = await supabase
    .from('scans')
    .select('id')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: false })
    .limit(1)
    .maybeSingle();
  
  if (scanError || !latestScan) return [];
  
  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      player_id,
      name,
      power,
      merits,
      units_killed,
      units_dead,
      units_healed,
      scouted,
      helps_given,
      mana_spent,
      home_server,
      players!inner(faction)
    `)
    .eq('scan_id', latestScan.id)
    .not('home_server', 'is', null)
    .ilike('name', `%${query}%`)
    .order('power', { ascending: false, nullsLast: true })
    .limit(50);
  
  if (error) throw error;
  
  return (data || []).map(stat => ({
    player_id: stat.player_id,
    name: stat.name,
    power: stat.power,
    merits: stat.merits,
    units_killed: stat.units_killed,
    units_dead: stat.units_dead,
    units_healed: stat.units_healed,
    scouted: stat.scouted,
    helps_given: stat.helps_given,
    mana_spent: stat.mana_spent,
    faction: (stat.players as any)?.faction || null,
    home_server: stat.home_server,
  }));
}

export async function fetchAllianceDateRange(allianceId: string): Promise<{ startDate: string; endDate: string; scanCount: number }> {
  const { data, error } = await supabase
    .from('scans')
    .select('scan_date')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: true });

  if (error) throw error;

  if (!data || data.length === 0) {
    throw new Error('No scans found for this alliance');
  }

  return {
    startDate: data[0].scan_date,
    endDate: data[data.length - 1].scan_date,
    scanCount: data.length,
  };
}

export async function fetchAllianceScanDates(allianceId: string): Promise<string[]> {
  const { data, error } = await supabase
    .from('scans')
    .select('scan_date')
    .eq('alliance_id', allianceId)
    .order('scan_date', { ascending: true });

  if (error) throw error;

  return (data || []).map(scan => scan.scan_date);
}

export async function fetchLeaderboardForDate(allianceId: string, scanDate: string): Promise<LeaderboardEntry[]> {
  // Filter by 50M+ power instead of using limit
  const POWER_THRESHOLD = 50000000;

  // Get the scan for this alliance and date
  const { data: scan, error: scanError } = await supabase
    .from('scans')
    .select('id')
    .eq('alliance_id', allianceId)
    .eq('scan_date', scanDate)
    .maybeSingle();

  if (scanError || !scan) {
    return [];
  }

  const { data, error } = await supabase
    .from('player_stats')
    .select(`
      player_id,
      name,
      power,
      highest_power,
      merits,
      units_killed,
      killcount_t5,
      killcount_t1,
      units_dead,
      units_healed,
      scouted,
      helps_given,
      mana_spent,
      mana,
      home_server,
      players!inner(faction, lord_id)
    `)
    .eq('scan_id', scan.id)
    .not('home_server', 'is', null)
    .gte('highest_power', POWER_THRESHOLD)
    .order('highest_power', { ascending: false, nullsLast: true });
  
  if (error) throw error;
  
  return (data || []).map(stat => ({
    player_id: stat.player_id,
    name: stat.name,
    power: stat.power,
    highest_power: stat.highest_power,
    merits: stat.merits,
    units_killed: stat.units_killed,
    killcount_t5: stat.killcount_t5,
    killcount_t1: stat.killcount_t1,
    units_dead: stat.units_dead,
    units_healed: stat.units_healed,
    scouted: stat.scouted,
    helps_given: stat.helps_given,
    mana_spent: stat.mana_spent,
    mana: stat.mana,
    faction: (stat.players as any)?.faction || null,
    lord_id: (stat.players as any)?.lord_id || null,
    home_server: stat.home_server,
  }));
}

export async function fetchOverviewStats(allianceId: string, startDate?: string, endDate?: string): Promise<{
  totalPower: number;
  averagePower: number;
  totalMerits: number;
  totalKills: number;
  totalT5Kills: number;
  totalManaSpent: number;
  totalUnitsDead: number;
  powerChange?: number;
  powerChangePercent?: number;
  meritChange?: number;
  meritChangePercent?: number;
  killChange?: number;
  killChangePercent?: number;
  manaSpentChange?: number;
  manaSpentChangePercent?: number;
  unitsDeadChange?: number;
  unitsDeadChangePercent?: number;
}> {
  // Filter by 50M+ power instead of using limit
  const POWER_THRESHOLD = 50000000;
  
  // Get scans in the date range
  let scanQuery = supabase
    .from('scans')
    .select('id, scan_date')
    .eq('alliance_id', allianceId);

  if (startDate) {
    scanQuery = scanQuery.gte('scan_date', startDate);
  }
  if (endDate) {
    scanQuery = scanQuery.lte('scan_date', endDate);
  }
  
  scanQuery = scanQuery.order('scan_date', { ascending: false });

  const { data: scans, error: scanError } = await scanQuery;
  
  if (scanError) throw scanError;
  if (!scans || scans.length === 0) {
    return {
      totalPower: 0,
      averagePower: 0,
      totalMerits: 0,
      totalKills: 0,
      totalT5Kills: 0,
      totalManaSpent: 0,
      totalUnitsDead: 0,
    };
  }

  // Get latest scan stats - players with 50M+ highest_power
  const latestScanId = scans[0].id;

  const { data: latestStats, error: latestError } = await supabase
    .from('player_stats')
    .select('power, highest_power, merits, units_killed, killcount_t5, mana_spent, units_dead, home_server')
    .eq('scan_id', latestScanId)
    .not('home_server', 'is', null)
    .gte('highest_power', POWER_THRESHOLD)
    .order('highest_power', { ascending: false, nullsLast: true });

  if (latestError) throw latestError;

  const playerCount = latestStats?.length || 0;
  const totalPower = latestStats?.reduce((sum, stat) => sum + (stat.power || 0), 0) || 0;
  const totalMerits = latestStats?.reduce((sum, stat) => sum + (stat.merits || 0), 0) || 0;
  const totalKills = latestStats?.reduce((sum, stat) => sum + (stat.units_killed || 0), 0) || 0;
  const totalT5Kills = latestStats?.reduce((sum, stat) => sum + (stat.killcount_t5 || 0), 0) || 0;
  const totalManaSpent = latestStats?.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0) || 0;
  const totalUnitsDead = latestStats?.reduce((sum, stat) => sum + (stat.units_dead || 0), 0) || 0;
  const averagePower = playerCount > 0 ? Math.round(totalPower / playerCount) : 0;

  // Calculate changes if we have multiple scans
  let powerChange: number | undefined;
  let powerChangePercent: number | undefined;
  let meritChange: number | undefined;
  let meritChangePercent: number | undefined;
  let killChange: number | undefined;
  let killChangePercent: number | undefined;
  let manaSpentChange: number | undefined;
  let manaSpentChangePercent: number | undefined;
  let unitsDeadChange: number | undefined;
  let unitsDeadChangePercent: number | undefined;

  if (scans.length > 1) {
    // Use the oldest scan in the range for comparison (first vs last)
    const oldestScanId = scans[scans.length - 1].id;
    
    const { data: previousStats, error: previousError } = await supabase
      .from('player_stats')
      .select('power, highest_power, merits, units_killed, mana_spent, units_dead, home_server')
      .eq('scan_id', oldestScanId)
      .not('home_server', 'is', null)
      .gte('highest_power', POWER_THRESHOLD)
      .order('highest_power', { ascending: false, nullsLast: true });

    if (!previousError && previousStats) {
      const previousTotalPower = previousStats.reduce((sum, stat) => sum + (stat.power || 0), 0);
      const previousTotalMerits = previousStats.reduce((sum, stat) => sum + (stat.merits || 0), 0);
      const previousTotalKills = previousStats.reduce((sum, stat) => sum + (stat.units_killed || 0), 0);
      const previousTotalManaSpent = previousStats.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0);
      const previousTotalUnitsDead = previousStats.reduce((sum, stat) => sum + (stat.units_dead || 0), 0);
      
      
      powerChange = totalPower - previousTotalPower;
      powerChangePercent = previousTotalPower > 0 ? (powerChange / previousTotalPower) * 100 : 0;
      
      meritChange = totalMerits - previousTotalMerits;
      meritChangePercent = previousTotalMerits > 0 ? (meritChange / previousTotalMerits) * 100 : 0;
      
      killChange = totalKills - previousTotalKills;
      killChangePercent = previousTotalKills > 0 ? (killChange / previousTotalKills) * 100 : 0;
      
      manaSpentChange = totalManaSpent - previousTotalManaSpent;
      manaSpentChangePercent = previousTotalManaSpent > 0 ? (manaSpentChange / previousTotalManaSpent) * 100 : 0;
      
      unitsDeadChange = totalUnitsDead - previousTotalUnitsDead;
      unitsDeadChangePercent = previousTotalUnitsDead > 0 ? (unitsDeadChange / previousTotalUnitsDead) * 100 : 0;
      
    }
  }

  return {
    totalPower,
    averagePower,
    totalMerits,
    totalKills,
    totalT5Kills,
    totalManaSpent,
    totalUnitsDead,
    powerChange,
    powerChangePercent,
    meritChange,
    meritChangePercent,
    killChange,
    killChangePercent,
    manaSpentChange,
    manaSpentChangePercent,
    unitsDeadChange,
    unitsDeadChangePercent,
  };
}