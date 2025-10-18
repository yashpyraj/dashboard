#!/usr/bin/env ts-node

import { readFileSync } from 'fs';
import { supabase, testConnection } from './utils/supabaseClient';
import { parseFilename, parseCSV, calculateFileHash, safeParseInt, safeParseBigInt, safeParseBoolean } from './utils/csvParser';
import { processInChunks } from './utils/chunking';
import { Alliance, Scan, Player, PlayerStats, CSVRow, IngestionSummary } from './types/database';

const CHUNK_SIZE = parseInt(process.env.CHUNK_SIZE || '1000');

async function upsertAlliance(tag: string): Promise<string> {
  console.log(`Upserting alliance: ${tag}`);
  
  const { data, error } = await supabase
    .from('alliances')
    .upsert({ tag, name: tag }, { onConflict: 'tag' })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to upsert alliance: ${error.message}`);
  }
  
  return data.id;
}

async function upsertScan(allianceId: string, scanDate: string, filename: string, fileHash: string): Promise<string> {
  console.log(`Upserting scan for date: ${scanDate}`);
  
  const { data, error } = await supabase
    .from('scans')
    .upsert({
      alliance_id: allianceId,
      scan_date: scanDate,
      source_filename: filename,
      file_sha256: fileHash
    }, { onConflict: 'alliance_id,scan_date' })
    .select('id')
    .single();
  
  if (error) {
    throw new Error(`Failed to upsert scan: ${error.message}`);
  }
  
  return data.id;
}

async function upsertPlayersChunk(players: Partial<Player>[]): Promise<Player[]> {
  const { data, error } = await supabase
    .from('players')
    .upsert(players, { onConflict: 'lord_id' })
    .select('id, lord_id');
  
  if (error) {
    throw new Error(`Failed to upsert players: ${error.message}`);
  }
  
  return data;
}

async function insertPlayerStatsChunk(stats: PlayerStats[]): Promise<void> {
  const { error } = await supabase
    .from('player_stats')
    .upsert(stats, { onConflict: 'player_id,scan_id' });
  
  if (error) {
    throw new Error(`Failed to insert player stats: ${error.message}`);
  }
}

async function updatePlayerSeen(playerId: string, date: string, name: string): Promise<void> {
  const { error } = await supabase.rpc('update_player_seen', {
    p_player_id: playerId,
    p_date: date,
    p_name: name
  });
  
  if (error) {
    throw new Error(`Failed to update player seen: ${error.message}`);
  }
}

function transformCSVRowToPlayer(row: CSVRow, scanDate: string): Partial<Player> {
  return {
    lord_id: row.lord_id.trim(),
    current_name: row.name.trim(),
    faction: row.faction?.trim() || null,
    first_seen: scanDate,
    last_seen: scanDate
  };
}

function transformCSVRowToPlayerStats(row: CSVRow, playerId: string, scanId: string): PlayerStats {
  return {
    player_id: playerId,
    scan_id: scanId,
    alliance_tag: row.alliance_tag.trim(),
    name: row.name.trim(),
    town_center: safeParseInt(row.town_center),
    home_server: row.home_server?.trim() || null,
    map_id: safeParseInt(row.map_id),
    in_power_rankings: safeParseBoolean(row.in_power_rankings),
    power: safeParseBigInt(row.power),
    highest_power: safeParseBigInt(row.highest_power),
    merits: safeParseBigInt(row.merits),
    units_killed: safeParseBigInt(row.units_killed),
    legion_power: safeParseBigInt(row.legion_power),
    tech_power: safeParseBigInt(row.tech_power),
    building_power: safeParseBigInt(row.building_power),
    hero_power: safeParseBigInt(row.hero_power),
    units_dead: safeParseBigInt(row.units_dead),
    units_healed: safeParseBigInt(row.units_healed),
    city_sieges: safeParseBigInt(row.city_sieges),
    defeats: safeParseBigInt(row.defeats),
    victories: safeParseBigInt(row.victories),
    scouted: safeParseBigInt(row.scouted),
    gold: safeParseBigInt(row.gold),
    wood: safeParseBigInt(row.wood),
    ore: safeParseBigInt(row.ore),
    mana: safeParseBigInt(row.mana),
    gems: safeParseBigInt(row.gems),
    resources_given: safeParseBigInt(row.resources_given),
    resources_given_count: safeParseBigInt(row.resources_given_count),
    helps_given: safeParseBigInt(row.helps_given),
    gold_spent: safeParseBigInt(row.gold_spent),
    wood_spent: safeParseBigInt(row.wood_spent),
    stone_spent: safeParseBigInt(row.stone_spent),
    mana_spent: safeParseBigInt(row.mana_spent),
    gems_spent: safeParseBigInt(row.gems_spent),
    killcount_t5: safeParseBigInt(row.killcount_t5),
    killcount_t4: safeParseBigInt(row.killcount_t4),
    killcount_t3: safeParseBigInt(row.killcount_t3),
    killcount_t2: safeParseBigInt(row.killcount_t2),
    killcount_t1: safeParseBigInt(row.killcount_t1)
  };
}

export async function ingestScan(filePath: string): Promise<IngestionSummary> {
  const startTime = Date.now();
  
  try {
    // Test connection
    await testConnection();
    console.log('✓ Supabase connection verified');
    
    // Step 1: Parse filename and CSV
    const { tag, scanDate } = parseFilename(filePath);
    console.log(`Processing scan: ${tag} for ${scanDate}`);
    
    const fileContent = readFileSync(filePath, 'utf-8');
    const fileHash = calculateFileHash(fileContent);
    const csvRows = parseCSV(fileContent);
    
    console.log(`✓ Parsed ${csvRows.length} rows from CSV`);
    
    // Step 2: Upsert alliance
    const allianceId = await upsertAlliance(tag);
    
    // Step 3: Upsert scan
    const scanId = await upsertScan(allianceId, scanDate, filePath, fileHash);
    
    // Step 4: Upsert players in chunks
    console.log('Upserting players...');
    const playerData = csvRows.map(row => transformCSVRowToPlayer(row, scanDate));
    
    const upsertedPlayers = await processInChunks(
      playerData,
      CHUNK_SIZE,
      upsertPlayersChunk,
      (processed, total) => {
        console.log(`  Players: ${Math.min(processed, total)}/${total}`);
      }
    );
    
    // Step 5: Build lord_id → player_id map
    const lordIdToPlayerId = new Map<string, string>();
    upsertedPlayers.forEach(player => {
      lordIdToPlayerId.set(player.lord_id, player.id);
    });
    
    // Step 6: Insert player stats in chunks
    console.log('Inserting player stats...');
    const playerStatsData = csvRows.map(row => {
      const playerId = lordIdToPlayerId.get(row.lord_id.trim());
      if (!playerId) {
        throw new Error(`Player ID not found for lord_id: ${row.lord_id}`);
      }
      return transformCSVRowToPlayerStats(row, playerId, scanId);
    });
    
    await processInChunks(
      playerStatsData,
      CHUNK_SIZE,
      async (chunk) => {
        await insertPlayerStatsChunk(chunk);
        return chunk;
      },
      (processed, total) => {
        console.log(`  Stats: ${Math.min(processed, total)}/${total}`);
      }
    );
    
    // Step 7: Update player seen data
    console.log('Updating player seen data...');
    let updatedPlayers = 0;
    for (const row of csvRows) {
      const playerId = lordIdToPlayerId.get(row.lord_id.trim());
      if (playerId) {
        await updatePlayerSeen(playerId, scanDate, row.name.trim());
        updatedPlayers++;
      }
    }
    
    const processingTime = Date.now() - startTime;
    
    const summary: IngestionSummary = {
      alliance: tag,
      scanDate,
      insertedRows: csvRows.length,
      updatedPlayers,
      processingTime
    };
    
    console.log('\n✓ Ingestion completed successfully!');
    console.log(`  Alliance: ${summary.alliance}`);
    console.log(`  Scan Date: ${summary.scanDate}`);
    console.log(`  Rows Processed: ${summary.insertedRows}`);
    console.log(`  Players Updated: ${summary.updatedPlayers}`);
    console.log(`  Processing Time: ${summary.processingTime}ms`);
    
    return summary;
    
  } catch (error) {
    console.error('\n❌ Ingestion failed:', error instanceof Error ? error.message : error);
    throw error;
  }
}

// CLI usage
if (require.main === module) {
  const filePath = process.argv[2];
  
  if (!filePath) {
    console.error('Usage: ts-node ingestScan.ts <csv-file-path>');
    console.error('Example: ts-node ingestScan.ts ./BTX-2025-08-10.csv');
    process.exit(1);
  }
  
  ingestScan(filePath)
    .then(() => {
      console.log('\n🎉 All done!');
      process.exit(0);
    })
    .catch((error) => {
      console.error('\n💥 Fatal error:', error);
      process.exit(1);
    });
}