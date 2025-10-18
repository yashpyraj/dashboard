import React from 'react';
import { X, User, TrendingUp, Award, Sword } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { PlayerTimeline } from '../../types';

interface PlayerDrawerProps {
  player: PlayerTimeline | null;
  isOpen: boolean;
  onClose: () => void;
}

export function PlayerDrawer({ player, isOpen, onClose }: PlayerDrawerProps) {
  if (!isOpen || !player) return null;

  const formatNumber = (num: number | null | undefined) => {
    const n = Number(num ?? 0);
    if (!n) return '0';
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toString();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pctChange = (oldVal?: number | null, newVal?: number | null) => {
    const a = Number(oldVal ?? 0);
    const b = Number(newVal ?? 0);
    if (a <= 0) return 0;
    return ((b - a) / a) * 100;
  };

  // Prepare chart data
  const chartData = player.stats.map((stat) => ({
    date: stat.scan_date,
    power: stat.power || 0,
    merits: stat.merits || 0,
    units_killed: stat.units_killed || 0,
  }));

  const latestStats = player.stats[player.stats.length - 1];
  const firstStats = player.stats[0];

  // Calculate growth (safe)
  const powerGrowth = pctChange(firstStats?.power, latestStats?.power);
  const meritGrowth = pctChange(firstStats?.merits, latestStats?.merits);
  const killGrowth = pctChange(firstStats?.units_killed, latestStats?.units_killed);

  return (
    <div className="glass-panel h-full overflow-y-auto neon-border neon-glow relative overflow-hidden">
      {/* Background Character */}
      <div className="absolute right-0 bottom-0 opacity-40 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Player Background"
          className="w-72 h-auto transform rotate-12"
        />
      </div>
      <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10"></div>
      <div className="p-8 relative z-20">
          {/* Header */}
          <motion.div 
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-8"
          >
            <div className="flex items-center space-x-3">
              <motion.div 
                animate={{ rotate: [0, 5, -5, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
                className="p-3 glass-panel-light rounded-xl neon-border neon-glow"
              >
                <User className="w-8 h-8 text-blue-400" />
              </motion.div>
              <div>
                <h2 className="text-2xl font-black glow-pink font-orbitron neon-text">
                  {player.player.current_name}
                </h2>
                <h2 className="text-2xl font-black text-pink-400 font-orbitron">
                  {player.player.current_name}
                </h2>
                <p className="text-sm glow-cyan font-medium">
                  {player.player.faction || 'UNKNOWN FACTION'} • LORD ID: {player.player.lord_id}
                </p>
                <p className="text-sm text-blue-400 font-medium">
                  {player.player.faction || 'UNKNOWN FACTION'} • LORD ID: {player.player.lord_id}
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500"
            >
              <X className="w-6 h-6 text-pink-400" />
            </motion.button>
          </motion.div>

          {/* Quick Stats */}
          <div className="grid grid-cols-3 gap-6 mb-8">
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
                <span className="text-sm font-bold text-blue-400 font-orbitron">POWER</span>
              </div>
              <p className="text-2xl font-black text-blue-400 font-orbitron relative z-10">
                {formatNumber(latestStats.power)}
              </p>
              <p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
                {powerGrowth !== 0 && `${powerGrowth > 0 ? '+' : ''}${powerGrowth.toFixed(1)}%`}
              </p>
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
                <span className="text-sm font-bold text-purple-400 font-orbitron">MERITS</span>
              </div>
              <p className="text-2xl font-black text-purple-400 font-orbitron relative z-10">
                {formatNumber(latestStats.merits)}
              </p>
              <p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
                {meritGrowth !== 0 && `${meritGrowth > 0 ? '+' : ''}${meritGrowth.toFixed(1)}%`}
              </p>
            </motion.div>

            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.3 }}
              whileHover={{ scale: 1.05 }}
              className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 relative overflow-hidden group"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
              <div className="flex items-center mb-3 relative z-10">
                <Sword className="w-5 h-5 text-pink-400 mr-2" />
                <span className="text-sm font-bold text-pink-400 font-orbitron">ELIMINATIONS</span>
              </div>
              <p className="text-2xl font-black text-pink-400 font-orbitron relative z-10">
                {formatNumber(latestStats.units_killed)}
              </p>
              <p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
                {killGrowth !== 0 && `${killGrowth > 0 ? '+' : ''}${killGrowth.toFixed(1)}%`}
              </p>
            </motion.div>
          </div>

          {/* Timeline Chart */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4 }}
            className="glass-panel rounded-2xl neon-border p-8 mb-8 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5"></div>
            <h3 className="text-xl font-black text-pink-400 font-orbitron mb-6 relative z-10">PERFORMANCE TIMELINE</h3>
            <div className="h-80 relative z-10">
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={chartData} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="rgba(255, 255, 255, 0.1)" />
                  <XAxis 
                    dataKey="date" 
                    tickFormatter={formatDate}
                    tick={{ fill: '#60a5fa', fontSize: 12, fontWeight: 'bold' }}
                    axisLine={{ stroke: '#8338ec' }}
                  />
                  <YAxis 
                    tickFormatter={formatNumber}
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
                    labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    formatter={(value: number, name: string) => [
                      formatNumber(value),
                      name === 'power' ? 'Power' : name === 'merits' ? 'Merits' : 'Units Killed',
                    ]}
                  />
                  <Legend />
                  <Line
                    type="monotone"
                    dataKey="power"
                    stroke="#3a86ff"
                    strokeWidth={3}
                    dot={{ fill: '#3a86ff', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#3a86ff', strokeWidth: 3, fill: '#fff' }}
                    name="Power"
                    filter="drop-shadow(0 0 6px #3a86ff)"
                  />
                  <Line
                    type="monotone"
                    dataKey="merits"
                    stroke="#9333ea"
                    strokeWidth={3}
                    dot={{ fill: '#9333ea', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#9333ea', strokeWidth: 3, fill: '#fff' }}
                    name="Merits"
                    filter="drop-shadow(0 0 6px #9333ea)"
                  />
                  <Line
                    type="monotone"
                    dataKey="units_killed"
                    stroke="#ff006e"
                    strokeWidth={3}
                    dot={{ fill: '#ff006e', r: 5, strokeWidth: 2, stroke: '#fff' }}
                    activeDot={{ r: 8, stroke: '#ff006e', strokeWidth: 3, fill: '#fff' }}
                    name="Units Killed"
                    filter="drop-shadow(0 0 6px #ff006e)"
                  />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </motion.div>

          {/* Player Details */}
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.6 }}
            className="glass-panel-light rounded-xl neon-border p-6 relative overflow-hidden"
          >
            <div className="absolute inset-0 bg-gradient-to-r from-cyan-500/5 to-purple-500/5"></div>
            <h4 className="text-lg font-bold text-cyan-400 font-orbitron mb-4 relative z-10">OPERATIVE INTEL</h4>
            <div className="grid grid-cols-2 gap-6 text-sm relative z-10">
              <div>
                <span className="text-purple-400 font-bold">FIRST CONTACT:</span>
                <span className="ml-2 font-bold text-cyan-400">
                  {new Date(player.player.first_seen).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-purple-400 font-bold">LAST CONTACT:</span>
                <span className="ml-2 font-bold text-cyan-400">
                  {new Date(player.player.last_seen).toLocaleDateString()}
                </span>
              </div>
              <div>
                <span className="text-purple-400 font-bold">INTEL REPORTS:</span>
                <span className="ml-2 font-bold text-cyan-400">{player.stats.length}</span>
              </div>
              <div>
                <span className="text-purple-400 font-bold">CURRENT ALLIANCE:</span>
                <span className="ml-2 font-bold text-pink-400">[{latestStats.alliance_tag}]</span>
              </div>
            </div>
          </motion.div>
        </div>
    </div>
  );
}
