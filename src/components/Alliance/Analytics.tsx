import React, { useState, useEffect } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, LineChart, Line, Legend } from 'recharts';
import { motion } from 'framer-motion';
import { TrendingUp, Users, Award, Sword, Crown, Activity, BarChart3 } from 'lucide-react';
import { AllianceDetail, LeaderboardEntry } from '../../types';
import { fetchLeaderboard } from '../../utils/queries';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ErrorMessage } from '../UI/ErrorMessage';

interface AnalyticsProps {
  alliance: AllianceDetail;
}

export function Analytics({ alliance }: AnalyticsProps) {
  const [players, setPlayers] = useState<LeaderboardEntry[]>([]);
  const [scanDate, setScanDate] = useState<string>('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);

      const data = await fetchLeaderboard(alliance.id);
      setPlayers(data);
      
      // Get the latest scan date for this alliance
      const { data: latestScan, error: scanError } = await supabase
        .from('scans')
        .select('scan_date')
        .eq('alliance_id', alliance.id)
        .order('scan_date', { ascending: false })
        .limit(1)
        .single();
      
      if (!scanError && latestScan) {
        setScanDate(latestScan.scan_date);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load analytics data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [alliance.id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-center">
          <LoadingSpinner size="lg" className="mx-auto mb-4" />
          <p className="text-gray-600">Loading analytics...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadData} />;
  }

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Power distribution analysis
  const powerRanges = [
    { range: '0-25M', min: 0, max: 25000000, color: '#ef4444' },
    { range: '25-50M', min: 25000000, max: 50000000, color: '#f97316' },
    { range: '50-75M', min: 50000000, max: 75000000, color: '#eab308' },
    { range: '75-100M', min: 75000000, max: 100000000, color: '#22c55e' },
    { range: '100-125M', min: 100000000, max: 125000000, color: '#3b82f6' },
    { range: '125-150M', min: 125000000, max: 150000000, color: '#8b5cf6' },
    { range: '150-175M', min: 150000000, max: 175000000, color: '#06b6d4' },
    { range: '175-200M', min: 175000000, max: 200000000, color: '#84cc16' },
    { range: '200-225M', min: 200000000, max: 225000000, color: '#f59e0b' },
    { range: '225-250M', min: 225000000, max: 250000000, color: '#ec4899' },
    { range: '250-275M', min: 250000000, max: 275000000, color: '#10b981' },
    { range: '275-300M', min: 275000000, max: 300000000, color: '#6366f1' },
    { range: '300M+', min: 300000000, max: Infinity, color: '#dc2626' },
  ];

  const powerDistribution = powerRanges.map(range => ({
    range: range.range,
    count: players.filter(p => 
      (p.power || 0) >= range.min && (p.power || 0) < range.max
    ).length,
    color: range.color,
  }));

  // Faction distribution
  const factionStats = players.reduce((acc, player) => {
    const faction = player.faction || 'Unknown';
    acc[faction] = (acc[faction] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  const factionData = Object.entries(factionStats).map(([faction, count]) => ({
    faction,
    count,
  }));

  // Top performers data
  const topPowerPlayers = [...players]
    .sort((a, b) => (b.power || 0) - (a.power || 0))
    .slice(0, 10)
    .map((player, index) => ({
      rank: index + 1,
      name: player.name,
      power: player.power || 0,
    }));

  const topMeritPlayers = [...players]
    .sort((a, b) => (b.merits || 0) - (a.merits || 0))
    .slice(0, 10)
    .map((player, index) => ({
      rank: index + 1,
      name: player.name,
      merits: player.merits || 0,
    }));

  // Calculate statistics
  const totalPower = players.reduce((sum, p) => sum + (p.power || 0), 0);
  const totalMerits = players.reduce((sum, p) => sum + (p.merits || 0), 0);
  const totalKills = players.reduce((sum, p) => sum + (p.units_killed || 0), 0);
  const avgPower = players.length > 0 ? totalPower / players.length : 0;

  const COLORS = ['#3b82f6', '#ef4444', '#10b981', '#f59e0b', '#8b5cf6', '#06b6d4'];

  return (
    <>
      <div className="space-y-6">
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-black text-pink-400 font-orbitron">
            ALLIANCE ANALYTICS
          </h3>
          {scanDate && (
            <div className="glass-panel-light rounded-xl px-4 py-2 neon-border">
              <div className="flex items-center space-x-2">
                <Activity className="w-4 h-4 text-cyan-400" />
                <span className="text-sm font-bold text-cyan-400 font-orbitron">
                  DATA FROM: {new Date(scanDate).toLocaleDateString('en-US', { 
                    month: 'short', 
                    day: 'numeric', 
                    year: 'numeric' 
                  })}
                </span>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.1 }}
          whileHover={{ scale: 1.05 }}
          className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center mb-3 relative z-10">
            <TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
            <span className="text-sm font-bold text-blue-400 font-orbitron">TOTAL POWER</span>
          </div>
          <p className="text-2xl font-black text-white font-orbitron relative z-10">{formatNumber(totalPower)}</p>
          <p className="text-xs text-cyan-400 font-bold relative z-10">Avg: {formatNumber(avgPower)}</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.2 }}
          whileHover={{ scale: 1.05 }}
          className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center mb-3 relative z-10">
            <Award className="w-5 h-5 text-purple-400 mr-2" />
            <span className="text-sm font-bold text-purple-400 font-orbitron">TOTAL MERITS</span>
          </div>
          <p className="text-2xl font-black text-white font-orbitron relative z-10">{formatNumber(totalMerits)}</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.3 }}
          whileHover={{ scale: 1.05 }}
          className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center mb-3 relative z-10">
            <Sword className="w-5 h-5 text-red-400 mr-2" />
            <span className="text-sm font-bold text-red-400 font-orbitron">TOTAL KILLS</span>
          </div>
          <p className="text-2xl font-black text-white font-orbitron relative z-10">{formatNumber(totalKills)}</p>
        </motion.div>
        
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.4 }}
          whileHover={{ scale: 1.05 }}
          className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 relative overflow-hidden group"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
          <div className="flex items-center mb-3 relative z-10">
            <Users className="w-5 h-5 text-green-400 mr-2" />
            <span className="text-sm font-bold text-green-400 font-orbitron">ACTIVE MEMBERS</span>
          </div>
          <p className="text-2xl font-black text-white font-orbitron relative z-10">{players.length}</p>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Power Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.5 }}
          className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-purple-500/5"></div>
          <div className="flex items-center mb-6 relative z-10">
            <BarChart3 className="w-6 h-6 text-blue-400 mr-3" />
            <h4 className="text-lg font-bold text-white font-orbitron">Power Distribution</h4>
          </div>
          <div className="h-64 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={powerDistribution} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                <XAxis 
                  dataKey="range" 
                  tick={{ fill: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}
                  axisLine={{ stroke: '#8338ec' }}
                />
                <YAxis 
                  tick={{ fill: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}
                  axisLine={{ stroke: '#8338ec' }}
                />
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid #ff006e',
                    borderRadius: 12,
                    color: '#fff',
                    boxShadow: '0 0 20px rgba(255, 0, 110, 0.3)',
                    backdropFilter: 'blur(20px)',
                  }}
                  formatter={(value: number) => [`${value} players`, 'Count']}
                />
                <Bar 
                  dataKey="count" 
                  fill="#3b82f6" 
                  radius={[4, 4, 0, 0]}
                  stroke="#60a5fa"
                  strokeWidth={1}
                />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </motion.div>

        {/* Faction Distribution */}
        <motion.div 
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.6 }}
          className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <div className="flex items-center mb-6 relative z-10">
            <Crown className="w-6 h-6 text-purple-400 mr-3" />
            <h4 className="text-lg font-bold text-white font-orbitron">Faction Distribution</h4>
          </div>
          <div className="h-64 relative z-10">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={factionData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ faction, percent }) => `${faction} ${(percent * 100).toFixed(0)}%`}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="count"
                >
                  {factionData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{
                    backgroundColor: 'rgba(15, 15, 35, 0.95)',
                    border: '1px solid #ff006e',
                    borderRadius: 12,
                    color: '#fff',
                  }}
                  formatter={(value: number) => [`${value} players`, 'Count']} />
              </PieChart>
            </ResponsiveContainer>
          </div>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Top Power Players */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.7 }}
          className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/5 to-cyan-500/5"></div>
          <div className="flex items-center mb-6 relative z-10">
            <TrendingUp className="w-6 h-6 text-blue-400 mr-3" />
            <h4 className="text-lg font-bold text-white font-orbitron">Top Power Players</h4>
          </div>
          <div className="space-y-3 relative z-10">
            {topPowerPlayers.map((player) => (
              <motion.div 
                key={player.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * player.rank }}
                className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-b-0 hover:bg-blue-500/10 rounded-lg px-3 transition-all duration-300"
              >
                <div className="flex items-center">
                  <span className="w-8 h-8 glass-panel-light neon-border rounded-full flex items-center justify-center text-xs font-bold mr-3 text-blue-400">
                    {player.rank}
                  </span>
                  <span className="font-bold text-white">{player.name}</span>
                </div>
                <span className="text-sm font-bold text-blue-400 font-orbitron">{formatNumber(player.power)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Top Merit Players */}
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8 }}
          className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
          <div className="flex items-center mb-6 relative z-10">
            <Award className="w-6 h-6 text-purple-400 mr-3" />
            <h4 className="text-lg font-bold text-white font-orbitron">Top Merit Players</h4>
          </div>
          <div className="space-y-3 relative z-10">
            {topMeritPlayers.map((player) => (
              <motion.div 
                key={player.rank}
                initial={{ opacity: 0, x: -10 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 * player.rank }}
                className="flex items-center justify-between py-3 border-b border-gray-700/30 last:border-b-0 hover:bg-purple-500/10 rounded-lg px-3 transition-all duration-300"
              >
                <div className="flex items-center">
                  <span className="w-8 h-8 glass-panel-light neon-border rounded-full flex items-center justify-center text-xs font-bold mr-3 text-purple-400">
                    {player.rank}
                  </span>
                  <span className="font-bold text-white">{player.name}</span>
                </div>
                <span className="text-sm font-bold text-purple-400 font-orbitron">{formatNumber(player.merits)}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      </div>

      {/* Math Calculation Showcase */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.0 }}
        className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
        <div className="flex items-center mb-6 relative z-10">
          <Activity className="w-6 h-6 text-cyan-400 mr-3" />
          <h4 className="text-lg font-bold text-white font-orbitron">CALCULATION SHOWCASE</h4>
        </div>
        <div className="space-y-6 relative z-10">
          {/* Total Power Calculation */}
          <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
            <h5 className="text-md font-bold text-blue-400 font-orbitron mb-4">📊 TOTAL POWER CALCULATION</h5>
            <div className="space-y-3 font-mono text-sm">
              <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <span className="text-blue-400">Formula:</span>
                <span className="text-white">Sum of all player power values</span>
              </div>
              <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <span className="text-purple-400">Players Count:</span>
                <span className="text-white">{players.length} active members</span>
              </div>
              <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <span className="text-green-400">Total Power:</span>
                <span className="text-white">{totalPower.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                <span className="text-yellow-400">Average Power:</span>
                <span className="text-white">{totalPower.toLocaleString()} ÷ {players.length} = {avgPower.toLocaleString()}</span>
              </div>
            </div>
          </div>

          {/* Merit and Kill Calculations */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
              <h5 className="text-md font-bold text-purple-400 font-orbitron mb-4">🏆 MERIT CALCULATION</h5>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-purple-400">Formula:</span>
                  <span className="text-white text-xs">Σ(player.merits)</span>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-cyan-400">Total Merits:</span>
                  <span className="text-white">{totalMerits.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-yellow-400">Per Member:</span>
                  <span className="text-white">{Math.round(totalMerits / players.length).toLocaleString()}</span>
                </div>
              </div>
            </div>

            <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-red-500/10 to-orange-500/10">
              <h5 className="text-md font-bold text-red-400 font-orbitron mb-4">⚔️ KILL CALCULATION</h5>
              <div className="space-y-3 font-mono text-sm">
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-red-400">Formula:</span>
                  <span className="text-white text-xs">Σ(player.units_killed)</span>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-cyan-400">Total Kills:</span>
                  <span className="text-white">{totalKills.toLocaleString()}</span>
                </div>
                <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                  <span className="text-yellow-400">Per Member:</span>
                  <span className="text-white">{Math.round(totalKills / players.length).toLocaleString()}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Power Distribution Math */}
          <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-green-500/10 to-teal-500/10">
            <h5 className="text-md font-bold text-green-400 font-orbitron mb-4">📈 POWER DISTRIBUTION ANALYSIS</h5>
            <div className="grid grid-cols-1 md:grid-cols-3 lg:grid-cols-6 gap-4">
              {powerDistribution.map((range, index) => (
                <div key={range.range} className="bg-gray-800/50 p-4 rounded-lg">
                  <div className="text-sm font-bold text-cyan-400 mb-2">{range.range} Power</div>
                  <div className="space-y-2 font-mono text-xs">
                    <div className="flex justify-between">
                      <span className="text-gray-400">Players:</span>
                      <span className="text-white">{range.count}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Percentage:</span>
                      <span className="text-white">{((range.count / players.length) * 100).toFixed(1)}%</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-400">Formula:</span>
                      <span className="text-white text-xs">({range.count} ÷ {players.length}) × 100</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Statistical Summary */}
          <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-yellow-500/10 to-orange-500/10">
            <h5 className="text-md font-bold text-yellow-400 font-orbitron mb-4">📋 STATISTICAL SUMMARY</h5>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-3">
                <h6 className="text-sm font-bold text-cyan-400 font-orbitron">AGGREGATION METHODS</h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Total Power:</span>
                    <span className="text-white font-mono">SUM(power)</span>
                  </div>
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Average Power:</span>
                    <span className="text-white font-mono">SUM(power) ÷ COUNT(*)</span>
                  </div>
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Distribution:</span>
                    <span className="text-white font-mono">COUNT(range) ÷ TOTAL × 100</span>
                  </div>
                </div>
              </div>
              <div className="space-y-3">
                <h6 className="text-sm font-bold text-purple-400 font-orbitron">DATA SOURCES</h6>
                <div className="space-y-2 text-sm">
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Player Count:</span>
                    <span className="text-white">Players with 50M+ highest_power</span>
                  </div>
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Filter:</span>
                    <span className="text-white">home_server IS NOT NULL</span>
                  </div>
                  <div className="flex justify-between bg-gray-800/50 p-2 rounded">
                    <span className="text-gray-400">Sort Order:</span>
                    <span className="text-white">highest_power DESC</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Performance Insights */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.1 }}
        className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-green-500/5 to-blue-500/5"></div>
        <div className="flex items-center mb-6 relative z-10">
          <Activity className="w-6 h-6 text-green-400 mr-3" />
          <h4 className="text-lg font-bold text-white font-orbitron">Performance Insights</h4>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 relative z-10">
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <p className="text-sm text-blue-400 font-bold mb-2 font-orbitron">POWER PER MEMBER</p>
            <p className="text-xl font-black text-white font-orbitron">{formatNumber(avgPower)}</p>
          </div>
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <p className="text-sm text-purple-400 font-bold mb-2 font-orbitron">MERIT PER MEMBER</p>
            <p className="text-xl font-black text-white font-orbitron">{formatNumber(totalMerits / players.length)}</p>
          </div>
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <p className="text-sm text-red-400 font-bold mb-2 font-orbitron">KILLS PER MEMBER</p>
            <p className="text-xl font-black text-white font-orbitron">{formatNumber(totalKills / players.length)}</p>
          </div>
        </div>
      </motion.div>
    </div>
    </>
  );
}