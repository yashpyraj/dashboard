import Papa from 'papaparse';
import { createHash } from 'crypto';
import { CSVRow } from '../types/database';

export interface ParsedFilename {
  tag: string;
  scanDate: string;
}

export function parseFilename(filename: string): ParsedFilename {
  const basename = filename.replace(/^.*[\\\/]/, '').replace('.csv', '');
  const match = basename.match(/^([A-Z0-9]+)-(\d{4}-\d{2}-\d{2})$/);
  
  if (!match) {
    throw new Error(`Invalid filename format. Expected: TAG-YYYY-MM-DD.csv, got: ${filename}`);
  }
  
  const [, tag, scanDate] = match;
  
  // Validate date format
  const dateObj = new Date(scanDate);
  if (isNaN(dateObj.getTime()) || dateObj.toISOString().slice(0, 10) !== scanDate) {
    throw new Error(`Invalid date in filename: ${scanDate}`);
  }
  
  return { tag, scanDate };
}

export function calculateFileHash(content: string): string {
  return createHash('sha256').update(content).digest('hex');
}

export function parseCSV(content: string): CSVRow[] {
  const result = Papa.parse<CSVRow>(content, {
    header: true,
    skipEmptyLines: true,
    transformHeader: (header) => header.trim(),
  });
  
  if (result.errors.length > 0) {
    throw new Error(`CSV parsing errors: ${result.errors.map(e => e.message).join(', ')}`);
  }
  
  if (result.data.length === 0) {
    throw new Error('CSV file contains no data rows');
  }
  
  // Validate required columns
  const requiredColumns = [
    'lord_id', 'name', 'alliance_id', 'alliance_tag', 'town_center', 
    'home_server', 'in_power_rankings', 'power', 'map_id', 'units_killed', 
    'faction', 'merits', 'highest_power', 'legion_power', 'tech_power', 
    'building_power', 'hero_power', 'units_dead', 'units_healed', 
    'city_sieges', 'defeats', 'victories', 'scouted', 'gold', 'wood', 
    'ore', 'mana', 'gems', 'resources_given', 'resources_given_count', 
    'helps_given', 'gold_spent', 'wood_spent', 'stone_spent', 
    'mana_spent', 'gems_spent', 'killcount_t5', 'killcount_t4', 
    'killcount_t3', 'killcount_t2', 'killcount_t1'
  ];
  
  const firstRow = result.data[0];
  const missingColumns = requiredColumns.filter(col => !(col in firstRow));
  
  if (missingColumns.length > 0) {
    throw new Error(`Missing required columns: ${missingColumns.join(', ')}`);
  }
  
  return result.data;
}

export function safeParseInt(value: string): number | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
    return null;
  }
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

export function safeParseBigInt(value: string): number | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
    return null;
  }
  const parsed = parseInt(value.trim(), 10);
  return isNaN(parsed) ? null : parsed;
}

export function safeParseBoolean(value: string): boolean | null {
  if (!value || value.trim() === '' || value.toLowerCase() === 'null') {
    return null;
  }
  const trimmed = value.trim().toLowerCase();
  if (trimmed === 'true' || trimmed === '1' || trimmed === 'yes') {
    return true;
  }
  if (trimmed === 'false' || trimmed === '0' || trimmed === 'no') {
    return false;
  }
  return null;
}