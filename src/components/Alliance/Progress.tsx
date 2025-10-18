import React from 'react';
import {
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, BarChart, Bar, Legend
} from 'recharts';
import { TrendingUp, BarChart3, Activity, ChevronDown, ChevronRight, Award, Sword, Zap, Target, Heart, HandHeart, Eye, Users } from 'lucide-react';
import { AllianceDetail, LeaderboardEntry } from '../../types';
import { fetchLeaderboard, fetchAllianceScanDates } from '../../utils/queries';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ErrorMessage } from '../UI/ErrorMessage';
import { motion, AnimatePresence } from 'framer-motion';
import { SeasonProgress } from './SeasonProgress';

interface ProgressProps {
  alliance: AllianceDetail;
}

interface ScanData {
  date: string;
  totalPower: number;
  totalMerits: number;
  totalKills: number;
  memberCount: number;
}

interface SeasonData {
  seasonName: string;
  generation: string;
  startDate: string;
  endDate: string;
  isActive: boolean;
  isCompleted: boolean;
  progress: number;
  scans: Array<{
    date: string;
    totalPower: number;
    totalMerits: number;
    totalKills: number;
    totalT5Kills: number;
    totalManaSpent: number;
    totalUnitsDead: number;
    totalUnitsHealed: number;
    totalHelpsGiven: number;
    totalScouted: number;
    totalVictories: number;
    totalDefeats: number;
    averagePower: number;
    memberCount: number;
  }>;
  totalScans: number;
}

export function Progress({ alliance }: ProgressProps) {
  const [seasonData, setSeasonData] = React.useState<SeasonData[]>([]);
  const [expandedSeasons, setExpandedSeasons] = React.useState<Set<string>>(new Set());
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  const loadProgressData = async () => {
    try {
      setLoading(true);
      setError(null);

      // Filter by 50M+ power instead of using limit
      const POWER_THRESHOLD = 50000000;

      // Get alliance info
      const { data: allianceData, error: allianceError } = await supabase
        .from('alliances')
        .select('season_start_date, season_end_date, season_name, generation')
        .eq('id', alliance.id)
        .single();

      if (allianceError) throw allianceError;

      // Get alliance with season info
      // Get all scans for this alliance
      const { data: scans, error: scanError } = await supabase
        .from('scans')
        .select('id, scan_date')
        .eq('alliance_id', alliance.id)
        .order('scan_date', { ascending: true });

      if (scanError) throw scanError;
      if (!scans || scans.length === 0 || !allianceData) {
        setSeasonData([]);
        return;
      }

      // Calculate season info
      const currentDate = new Date();
      const startDate = allianceData.season_start_date ? new Date(allianceData.season_start_date) : null;
      const endDate = allianceData.season_end_date ? new Date(allianceData.season_end_date) : null;
      
      let isActive = false;
      let isCompleted = false;
      let progress = 0;
      
      if (startDate && endDate) {
        isActive = currentDate >= startDate && currentDate <= endDate;
        isCompleted = currentDate > endDate;
        
        if (currentDate >= startDate) {
          const totalDuration = endDate.getTime() - startDate.getTime();
          const elapsed = Math.min(currentDate.getTime() - startDate.getTime(), totalDuration);
          progress = Math.round((elapsed / totalDuration) * 100);
        }
      }

      // Filter scans within season dates
      const seasonScans = startDate && endDate 
        ? scans.filter(scan => {
            const scanDate = new Date(scan.scan_date);
            return scanDate >= startDate && scanDate <= endDate;
          })
        : scans;

      // For each scan, get aggregated stats from players with 50M+ power
      const scanDataPromises = scans.map(async (scan) => {
        const { data: stats, error: statsError } = await supabase
          .from('player_stats')
          .select(`
            power,
            highest_power,
            merits,
            units_killed,
            killcount_t5,
            mana_spent,
            units_dead,
            units_healed,
            helps_given,
            scouted,
            victories,
            defeats,
            home_server
          `)
          .eq('scan_id', scan.id)
          .not('home_server', 'is', null)
          .gte('highest_power', POWER_THRESHOLD)
          .order('highest_power', { ascending: false, nullsLast: true });

        if (statsError) throw statsError;

        const totalPower = stats?.reduce((sum, stat) => sum + (stat.power || 0), 0) || 0;
        const totalMerits = stats?.reduce((sum, stat) => sum + (stat.merits || 0), 0) || 0;
        const totalKills = stats?.reduce((sum, stat) => sum + (stat.units_killed || 0), 0) || 0;
        const totalT5Kills = stats?.reduce((sum, stat) => sum + (stat.killcount_t5 || 0), 0) || 0;
        const totalManaSpent = stats?.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0) || 0;
        const totalUnitsDead = stats?.reduce((sum, stat) => sum + (stat.units_dead || 0), 0) || 0;
        const totalUnitsHealed = stats?.reduce((sum, stat) => sum + (stat.units_healed || 0), 0) || 0;
        const totalHelpsGiven = stats?.reduce((sum, stat) => sum + (stat.helps_given || 0), 0) || 0;
        const totalScouted = stats?.reduce((sum, stat) => sum + (stat.scouted || 0), 0) || 0;
        const totalVictories = stats?.reduce((sum, stat) => sum + (stat.victories || 0), 0) || 0;
        const totalDefeats = stats?.reduce((sum, stat) => sum + (stat.defeats || 0), 0) || 0;
        const memberCount = stats?.length || 0;
        const averagePower = memberCount > 0 ? Math.round(totalPower / memberCount) : 0;

        return {
          date: scan.scan_date,
          totalPower,
          totalMerits,
          totalKills,
          totalT5Kills,
          totalManaSpent,
          totalUnitsDead,
          totalUnitsHealed,
          totalHelpsGiven,
          totalScouted,
          totalVictories,
          totalDefeats,
          averagePower,
          memberCount,
        };
      });

      const scanData = await Promise.all(scanDataPromises);
      
      // Create season data structure
      const seasonInfo: SeasonData = {
        seasonName: allianceData.season_name || 'Season 1',
        generation: allianceData.generation || 'G2',
        startDate: allianceData.season_start_date || '',
        endDate: allianceData.season_end_date || '',
        isActive,
        isCompleted,
        progress,
        scans: scanData,
        totalScans: scanData.length,
      };
      
      setSeasonData([seasonInfo]);
      
      // Auto-expand if season is active or completed
      if (isActive || isCompleted) {
        setExpandedSeasons(new Set([seasonInfo.seasonName]));
      }

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load progress data');
    } finally {
      setLoading(false);
    }
  };

  React.useEffect(() => {
    loadProgressData();
  }, [alliance.id, alliance.season_start_date, alliance.season_end_date, alliance.season_name]);

  const formatNumber = (num: number) => {
    const n = Number(num || 0);
    if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
    if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
    if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
    return n.toString();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });

  const pctChange = (prev: number, curr: number) => {
    if (!prev) return 0;
    return ((curr - prev) / prev) * 100;
  };

  const toggleSeason = (seasonName: string) => {
    setExpandedSeasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(seasonName)) {
        newSet.delete(seasonName);
      } else {
        newSet.add(seasonName);
      }
      return newSet;
    });
  };

  const renderSeasonAccordion = (season: SeasonData) => {
    const isExpanded = expandedSeasons.has(season.seasonName);
    const hasData = season.scans.length > 0;

    if (!hasData) return null;

    // Calculate summary stats
    const latestScan = season.scans[season.scans.length - 1];
    const firstScan = season.scans[0];
    
    const summaryStats = [
      {
        label: 'Total Power',
        value: formatNumber(latestScan?.totalPower || 0),
        change: firstScan ? pctChange(firstScan.totalPower, latestScan?.totalPower || 0) : 0,
        icon: Zap,
        color: 'text-yellow-400'
      },
      {
        label: 'Total Merits',
        value: formatNumber(latestScan?.totalMerits || 0),
        change: firstScan ? pctChange(firstScan.totalMerits, latestScan?.totalMerits || 0) : 0,
        icon: Award,
        color: 'text-purple-400'
      },
      {
        label: 'Total Kills',
        value: formatNumber(latestScan?.totalKills || 0),
        change: firstScan ? pctChange(firstScan.totalKills, latestScan?.totalKills || 0) : 0,
        icon: Sword,
        color: 'text-red-400'
      },
      {
        label: 'Members',
        value: latestScan?.memberCount?.toString() || '0',
        change: firstScan ? pctChange(firstScan.memberCount, latestScan?.memberCount || 0) : 0,
        icon: Users,
        color: 'text-blue-400'
      }
    ];

    return (
      <motion.div
        key={season.seasonName}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-panel neon-border rounded-xl overflow-hidden"
      >
        {/* Season Header */}
        <motion.button
          onClick={() => toggleSeason(season.seasonName)}
          className="w-full p-6 flex items-center justify-between hover:bg-white/5 transition-colors"
          whileHover={{ scale: 1.01 }}
          whileTap={{ scale: 0.99 }}
        >
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              {isExpanded ? (
                <ChevronDown className="w-6 h-6 glow-cyan" />
              ) : (
                <ChevronRight className="w-6 h-6 glow-cyan" />
              )}
              <h3 className="text-2xl font-black text-pink-400 font-orbitron">
                {season.seasonName}
              </h3>
            </div>
            
            <div className="flex items-center space-x-3">
              <span className="px-3 py-1 rounded-full text-xs font-bold bg-gradient-to-r from-purple-500 to-pink-500 text-white">
                {season.generation}
              </span>
              
              {season.isActive && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                  ACTIVE
                </span>
              )}
              
              {season.isCompleted && (
                <span className="px-3 py-1 rounded-full text-xs font-bold bg-blue-500/20 text-blue-400 border border-blue-500/30">
                  COMPLETED
                </span>
              )}
            </div>
          </div>

          <div className="text-right">
            <div className="text-sm text-gray-400">
              {formatDate(season.startDate)} - {formatDate(season.endDate)}
            </div>
            <div className="text-xs text-gray-500">
              {season.totalScans} scans • {season.scans[season.scans.length - 1]?.memberCount || 0} members
            </div>
          </div>
        </motion.button>

        {/* Season Content */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ height: 0, opacity: 0 }}
              animate={{ height: 'auto', opacity: 1 }}
              exit={{ height: 0, opacity: 0 }}
              transition={{ duration: 0.3 }}
              className="border-t border-white/10"
            >
              <div className="p-6 space-y-8">
                {/* Summary Stats */}
                <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
                  {summaryStats.map((stat, index) => (
                    <motion.div
                      key={stat.label}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="glass-panel-light rounded-lg p-4"
                    >
                      <div className="flex items-center justify-between mb-2">
                        <stat.icon className={`w-5 h-5 ${stat.color}`} />
                        <span className={`text-xs font-bold ${
                          stat.change > 0 ? 'text-green-400' : stat.change < 0 ? 'text-red-400' : 'text-gray-400'
                        }`}>
                          {stat.change > 0 ? '+' : ''}{stat.change.toFixed(1)}%
                        </span>
                      </div>
                      <div className="text-2xl font-bold text-white mb-1">
                        {stat.value}
                      </div>
                      <div className="text-xs text-gray-400">
                        {stat.label}
                      </div>
                    </motion.div>
                  ))}
                </div>

                {/* Charts Grid */}
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  {/* Total Power Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.2 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Total Power
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Total Power']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalPower" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Average Power Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.3 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Activity className="w-5 h-5 mr-2" />
                      Average Power
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Average Power']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="averagePower" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Total Merits Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.4 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Total Merits
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Total Merits']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalMerits" 
                          stroke="#8B5CF6" 
                          strokeWidth={2}
                          dot={{ fill: '#8B5CF6', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Total Kills Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.5 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Sword className="w-5 h-5 mr-2" />
                      Total Kills
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Total Kills']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalKills" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* T5 Kills Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.6 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      T5 Kills
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'T5 Kills']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalT5Kills" 
                          stroke="#F97316" 
                          strokeWidth={2}
                          dot={{ fill: '#F97316', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Mana Spent Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.7 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Zap className="w-5 h-5 mr-2" />
                      Mana Spent
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Mana Spent']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalManaSpent" 
                          stroke="#06B6D4" 
                          strokeWidth={2}
                          dot={{ fill: '#06B6D4', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Units Dead Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.8 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Heart className="w-5 h-5 mr-2" />
                      Units Dead
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Units Dead']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalUnitsDead" 
                          stroke="#DC2626" 
                          strokeWidth={2}
                          dot={{ fill: '#DC2626', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Units Healed Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 0.9 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <HandHeart className="w-5 h-5 mr-2" />
                      Units Healed
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Units Healed']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalUnitsHealed" 
                          stroke="#059669" 
                          strokeWidth={2}
                          dot={{ fill: '#059669', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Helps Given Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.0 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <HandHeart className="w-5 h-5 mr-2" />
                      Helps Given
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Helps Given']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalHelpsGiven" 
                          stroke="#7C3AED" 
                          strokeWidth={2}
                          dot={{ fill: '#7C3AED', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Scouted Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.1 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Eye className="w-5 h-5 mr-2" />
                      Scouted
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Scouted']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalScouted" 
                          stroke="#F59E0B" 
                          strokeWidth={2}
                          dot={{ fill: '#F59E0B', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Victories Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.2 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Award className="w-5 h-5 mr-2" />
                      Victories
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Victories']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalVictories" 
                          stroke="#10B981" 
                          strokeWidth={2}
                          dot={{ fill: '#10B981', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>

                  {/* Defeats Chart */}
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ delay: 1.3 }}
                    className="glass-panel-light rounded-lg p-4"
                  >
                    <h4 className="text-lg font-bold text-pink-400 mb-4 flex items-center">
                      <Target className="w-5 h-5 mr-2" />
                      Defeats
                    </h4>
                    <ResponsiveContainer width="100%" height={200}>
                      <LineChart data={season.scans}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                        <XAxis 
                          dataKey="date" 
                          tickFormatter={formatDate}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <YAxis 
                          tickFormatter={formatNumber}
                          stroke="#9CA3AF"
                          fontSize={12}
                        />
                        <Tooltip 
                          formatter={(value: number) => [formatNumber(value), 'Defeats']}
                          labelFormatter={(label) => formatDate(label)}
                          contentStyle={{
                            backgroundColor: 'rgba(17, 24, 39, 0.95)',
                            border: '1px solid rgba(59, 130, 246, 0.3)',
                            borderRadius: '8px'
                          }}
                        />
                        <Line 
                          type="monotone" 
                          dataKey="totalDefeats" 
                          stroke="#EF4444" 
                          strokeWidth={2}
                          dot={{ fill: '#EF4444', strokeWidth: 2, r: 4 }}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </motion.div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center py-12"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: 'linear' }}
            className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
          >
            <TrendingUp className="w-8 h-8 glow-blue" />
          </motion.div>
          <p className="glow-cyan font-orbitron">ANALYZING PROGRESS...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadProgressData} />;
  }

  if (seasonData.length === 0) {
    return (
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="text-center py-12"
      >
        <motion.div
          animate={{ scale: [1, 1.1, 1] }}
          transition={{ duration: 2, repeat: Infinity }}
          className="glass-panel-light rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 neon-border"
        >
          <TrendingUp className="w-12 h-12 glow-blue" />
        </motion.div>
        <h3 className="text-xl font-bold text-pink-400 font-orbitron mb-2">
          NO PROGRESS DATA
        </h3>
        <p className="text-blue-400">
          No season data available for this alliance
        </p>
      </motion.div>
    );
  }

  return (
    <>
      <SeasonProgress alliance={alliance} />
      
      <motion.div
        initial={{ opacity: 0, x: -20 }}
        animate={{ opacity: 1, x: 0 }}
      >
        <h3 className="text-2xl font-black text-pink-400 font-orbitron mb-6 flex items-center">
          <TrendingUp className="w-6 h-6 mr-3" />
          SEASON ANALYTICS
        </h3>
        <p className="text-gray-400 mb-8">
          Detailed performance metrics and trends for each season period
        </p>
      </motion.div>

      {/* Season Accordions */}
      <div className="space-y-6">
        {seasonData.map(season => renderSeasonAccordion(season))}
      </div>
    </>
  );
}