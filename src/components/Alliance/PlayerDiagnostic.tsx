import React, { useState } from 'react';
import { Search, User, AlertCircle, CheckCircle, Database, Calendar } from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../UI/LoadingSpinner';

interface DiagnosticResult {
  playerExists: boolean;
  playerData?: any;
  hasStats: boolean;
  statsData?: any[];
  latestScan?: any;
  allScans?: any[];
  inCorrectAlliance: boolean;
  possibleIssues: string[];
}

interface PlayerDiagnosticProps {
  allianceId: string;
  allianceTag: string;
}

export function PlayerDiagnostic({ allianceId, allianceTag }: PlayerDiagnosticProps) {
  const [lordId, setLordId] = useState('9613202');
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<DiagnosticResult | null>(null);

  const runDiagnostic = async () => {
    if (!lordId.trim()) return;

    try {
      setLoading(true);
      const issues: string[] = [];

      // 1. Check if player exists in players table
      const { data: playerData, error: playerError } = await supabase
        .from('players')
        .select('*')
        .eq('lord_id', lordId.trim())
       .maybeSingle();

      const playerExists = !playerError && !!playerData;
      if (!playerExists) {
        issues.push('Player not found in players table');
      }

      // 2. Get latest scan for the alliance
      const { data: latestScan, error: scanError } = await supabase
        .from('scans')
        .select('*')
        .eq('alliance_id', allianceId)
        .order('scan_date', { ascending: false })
        .limit(1)
       .maybeSingle();

      if (scanError || !latestScan) {
        issues.push('No scans found for this alliance');
      }

      // 3. Get all scans for the alliance
      const { data: allScans } = await supabase
        .from('scans')
        .select('*')
        .eq('alliance_id', allianceId)
        .order('scan_date', { ascending: false });

      // 4. Check if player has stats in latest scan
      let hasStats = false;
      let statsData: any[] = [];
      let inCorrectAlliance = false;

      if (playerExists && latestScan) {
        const { data: stats, error: statsError } = await supabase
          .from('player_stats')
          .select('*')
          .eq('player_id', playerData.id)
          .eq('scan_id', latestScan.id);

        hasStats = !statsError && stats && stats.length > 0;
        if (hasStats) {
          statsData = stats;
          inCorrectAlliance = stats.some(s => s.alliance_tag === allianceTag);
          if (!inCorrectAlliance) {
            issues.push(`Player found but in different alliance: ${stats[0]?.alliance_tag}`);
          }
        } else {
          issues.push('Player has no stats in latest scan');
        }
      }

      // 5. Check if player exists in ANY recent scans for this alliance
      if (playerExists && allScans) {
        const { data: anyStats } = await supabase
          .from('player_stats')
          .select('*, scans!inner(scan_date)')
          .eq('player_id', playerData.id)
          .in('scan_id', allScans.map(s => s.id))
          .order('scans(scan_date)', { ascending: false });

        if (anyStats && anyStats.length > 0) {
          const latestPlayerScan = anyStats[0];
          issues.push(`Player last seen in scan: ${(latestPlayerScan.scans as any).scan_date}`);
        }
      }

      // 6. Search by name in case lord_id changed
      if (latestScan) {
        const { data: nameSearch } = await supabase
          .from('player_stats')
          .select('*, players!inner(lord_id)')
          .eq('scan_id', latestScan.id)
          .eq('alliance_tag', allianceTag)
          .ilike('name', `%${lordId}%`);

        if (nameSearch && nameSearch.length > 0) {
          issues.push(`Found similar names in alliance: ${nameSearch.map(p => `${p.name} (${(p.players as any).lord_id})`).join(', ')}`);
        }
      }

      setResult({
        playerExists,
        playerData,
        hasStats,
        statsData,
        latestScan,
        allScans,
        inCorrectAlliance,
        possibleIssues: issues,
      });

    } catch (err) {
      console.error('Diagnostic error:', err);
      setResult({
        playerExists: false,
        hasStats: false,
        inCorrectAlliance: false,
        possibleIssues: [`Diagnostic failed: ${err instanceof Error ? err.message : 'Unknown error'}`],
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel rounded-2xl p-6 relative overflow-hidden mb-6"
    >
      <div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-red-500/10"></div>
      
      <div className="flex items-center mb-6 relative z-10">
        <Search className="w-6 h-6 text-orange-400 mr-3" />
        <h3 className="text-xl font-black text-orange-400 font-orbitron">
          MISSING PLAYER DIAGNOSTIC
        </h3>
      </div>

      <div className="space-y-4 relative z-10">
        <div className="flex items-center space-x-4">
          <div className="flex-1">
            <label className="block text-sm font-bold text-orange-400 font-orbitron mb-2">
              LORD ID TO SEARCH
            </label>
            <input
              type="text"
              value={lordId}
              onChange={(e) => setLordId(e.target.value)}
              placeholder="Enter Lord ID (e.g., 9613202)"
              className="w-full px-4 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300"
            />
          </div>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runDiagnostic}
            disabled={loading || !lordId.trim()}
            className="px-6 py-3 bg-orange-600 hover:bg-orange-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-xl font-bold transition-colors flex items-center space-x-2"
          >
            {loading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Search className="w-5 h-5" />
            )}
            <span>DIAGNOSE</span>
          </motion.button>
        </div>

        {result && (
          <motion.div 
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="space-y-4"
          >
            {/* Status Overview */}
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className={`p-4 rounded-xl border-2 ${result.playerExists ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20'}`}>
                <div className="flex items-center space-x-2">
                  {result.playerExists ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-bold text-white font-orbitron">PLAYER EXISTS</span>
                </div>
                <div className={`text-sm mt-1 ${result.playerExists ? 'text-green-400' : 'text-red-400'}`}>
                  {result.playerExists ? 'Found in database' : 'Not found in players table'}
                </div>
              </div>

              <div className={`p-4 rounded-xl border-2 ${result.hasStats ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20'}`}>
                <div className="flex items-center space-x-2">
                  {result.hasStats ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-bold text-white font-orbitron">HAS STATS</span>
                </div>
                <div className={`text-sm mt-1 ${result.hasStats ? 'text-green-400' : 'text-red-400'}`}>
                  {result.hasStats ? 'Stats found in latest scan' : 'No stats in latest scan'}
                </div>
              </div>

              <div className={`p-4 rounded-xl border-2 ${result.inCorrectAlliance ? 'border-green-400 bg-green-500/20' : 'border-red-400 bg-red-500/20'}`}>
                <div className="flex items-center space-x-2">
                  {result.inCorrectAlliance ? (
                    <CheckCircle className="w-5 h-5 text-green-400" />
                  ) : (
                    <AlertCircle className="w-5 h-5 text-red-400" />
                  )}
                  <span className="font-bold text-white font-orbitron">CORRECT ALLIANCE</span>
                </div>
                <div className={`text-sm mt-1 ${result.inCorrectAlliance ? 'text-green-400' : 'text-red-400'}`}>
                  {result.inCorrectAlliance ? `In ${allianceTag}` : 'Wrong alliance or missing'}
                </div>
              </div>
            </div>

            {/* Player Data */}
            {result.playerData && (
              <div className="glass-panel-light rounded-xl p-4 neon-border">
                <h4 className="text-lg font-bold text-blue-400 font-orbitron mb-3">PLAYER DATA</h4>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Name:</span>
                    <span className="ml-2 text-white font-bold">{result.playerData.current_name}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Lord ID:</span>
                    <span className="ml-2 text-purple-400 font-mono">{result.playerData.lord_id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Faction:</span>
                    <span className="ml-2 text-cyan-400">{result.playerData.faction || 'Unknown'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">First Seen:</span>
                    <span className="ml-2 text-green-400">{new Date(result.playerData.first_seen).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Last Seen:</span>
                    <span className="ml-2 text-yellow-400">{new Date(result.playerData.last_seen).toLocaleDateString()}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Latest Stats */}
            {result.statsData && result.statsData.length > 0 && (
              <div className="glass-panel-light rounded-xl p-4 neon-border">
                <h4 className="text-lg font-bold text-purple-400 font-orbitron mb-3">LATEST STATS</h4>
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Power:</span>
                    <span className="ml-2 text-blue-400 font-bold">{(result.statsData[0].power || 0).toLocaleString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Alliance:</span>
                    <span className="ml-2 text-pink-400 font-bold">[{result.statsData[0].alliance_tag}]</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Home Server:</span>
                    <span className="ml-2 text-cyan-400">{result.statsData[0].home_server || 'NULL'}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Name in Stats:</span>
                    <span className="ml-2 text-white">{result.statsData[0].name}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Scan Information */}
            {result.latestScan && (
              <div className="glass-panel-light rounded-xl p-4 neon-border">
                <h4 className="text-lg font-bold text-cyan-400 font-orbitron mb-3">LATEST SCAN INFO</h4>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Scan Date:</span>
                    <span className="ml-2 text-white">{new Date(result.latestScan.scan_date).toLocaleDateString()}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Scan ID:</span>
                    <span className="ml-2 text-purple-400 font-mono">{result.latestScan.id}</span>
                  </div>
                  <div>
                    <span className="text-gray-400">Source File:</span>
                    <span className="ml-2 text-cyan-400">{result.latestScan.source_filename}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Issues */}
            {result.possibleIssues.length > 0 && (
              <div className="glass-panel-light rounded-xl p-4 neon-border border-yellow-400 bg-yellow-500/10">
                <h4 className="text-lg font-bold text-yellow-400 font-orbitron mb-3">POSSIBLE ISSUES</h4>
                <ul className="space-y-2">
                  {result.possibleIssues.map((issue, index) => (
                    <li key={index} className="flex items-start space-x-2 text-sm">
                      <AlertCircle className="w-4 h-4 text-yellow-400 mt-0.5 flex-shrink-0" />
                      <span className="text-yellow-300">{issue}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Recommendations */}
            <div className="glass-panel-light rounded-xl p-4 neon-border border-blue-400 bg-blue-500/10">
              <h4 className="text-lg font-bold text-blue-400 font-orbitron mb-3">RECOMMENDATIONS</h4>
              <div className="space-y-2 text-sm">
                {!result.playerExists && (
                  <div className="flex items-start space-x-2">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span className="text-blue-300">Player needs to be added to the database via CSV upload</span>
                  </div>
                )}
                {result.playerExists && !result.hasStats && (
                  <div className="flex items-start space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span className="text-blue-300">Player exists but missing from latest scan - check if they left the alliance</span>
                  </div>
                )}
                {result.playerExists && result.hasStats && !result.inCorrectAlliance && (
                  <div className="flex items-start space-x-2">
                    <User className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span className="text-blue-300">Player moved to different alliance - check their current alliance tag</span>
                  </div>
                )}
                {result.statsData && result.statsData[0]?.home_server === null && (
                  <div className="flex items-start space-x-2">
                    <AlertCircle className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span className="text-blue-300">Player has NULL home_server - they are filtered out of leaderboard (top 210 filter)</span>
                  </div>
                )}
                {result.playerExists && result.hasStats && result.inCorrectAlliance && result.statsData && (
                  <div className="flex items-start space-x-2">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5" />
                    <div>
                      <span className="text-blue-300">Player found in latest scan. Checking leaderboard filters:</span>
                      <div className="ml-4 space-y-1 text-xs">
                        <div>• Home Server: <span className="text-cyan-400">{result.statsData[0]?.home_server || 'NULL'}</span></div>
                        <div>• Highest Power: <span className="text-cyan-400">{(result.statsData[0]?.highest_power || 0).toLocaleString()}</span></div>
                        <div>• Current Power: <span className="text-cyan-400">{(result.statsData[0]?.power || 0).toLocaleString()}</span></div>
                      </div>
                    </div>
                  </div>
                )}
                {result.statsData && result.statsData[0]?.home_server !== null && (
                  <div className="flex items-start space-x-2">
                    <Database className="w-4 h-4 text-blue-400 mt-0.5" />
                    <span className="text-blue-300">Player has valid home_server but may be outside top 210 by highest_power ranking</span>
                  </div>
                )}
              </div>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
}