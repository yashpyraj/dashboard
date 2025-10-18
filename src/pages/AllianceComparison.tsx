import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Calendar, 
  TrendingUp, 
  Award, 
  Sword, 
  Heart, 
  Zap, 
  Users,
  BarChart3,
  Target,
  Shield,
  Activity
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { fetchAllianceDetail } from '../utils/queries';
import { AllianceDetail } from '../types';

interface ComparisonStats {
  totalPower: number;
  totalMerits: number;
  totalKills: number;
  totalUnitsHealed: number;
  totalManaSpent: number;
  memberCount: number;
  averagePower: number;
  scanDate: string;
}

interface ComparisonData {
  startDate: ComparisonStats;
  endDate: ComparisonStats;
  changes: {
    powerChange: number;
    powerChangePercent: number;
    meritsChange: number;
    meritsChangePercent: number;
    killsChange: number;
    killsChangePercent: number;
    healedChange: number;
    healedChangePercent: number;
    manaChange: number;
    manaChangePercent: number;
    memberChange: number;
    avgPowerChange: number;
    avgPowerChangePercent: number;
  };
}

export function AllianceComparison() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  
  const [alliance, setAlliance] = useState<AllianceDetail | null>(null);
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAllianceAndDates = async () => {
    if (!id) return;
    
    try {
      setLoading(true);
      setError(null);
      
      // Load alliance details
      const allianceData = await fetchAllianceDetail(id);
      setAlliance(allianceData);
      
      // Load available scan dates
      const { data: scans, error: scanError } = await supabase
        .from('scans')
        .select('scan_date')
        .eq('alliance_id', id)
        .order('scan_date', { ascending: true });
      
      if (scanError) throw scanError;
      
      const dates = (scans || []).map(scan => scan.scan_date);
      setAvailableDates(dates);
      
      // Set default dates (first and last)
      if (dates.length >= 2) {
        setSelectedStartDate(dates[0]);
        setSelectedEndDate(dates[dates.length - 1]);
      }
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alliance data');
    } finally {
      setLoading(false);
    }
  };

  const getStatsForDate = async (date: string): Promise<ComparisonStats | null> => {
    if (!id) return null;
    
    try {
      // Filter by 50M+ power instead of using limit
      const POWER_THRESHOLD = 50000000;

      // Get scan for this date
      const { data: scan, error: scanError } = await supabase
        .from('scans')
        .select('id')
        .eq('alliance_id', id)
        .eq('scan_date', date)
        .single();

      if (scanError || !scan) return null;

      // Get player stats for this scan
      const { data: stats, error: statsError } = await supabase
        .from('player_stats')
        .select('power, highest_power, merits, units_killed, units_healed, mana_spent, home_server')
        .eq('scan_id', scan.id)
        .not('home_server', 'is', null)
        .gte('highest_power', POWER_THRESHOLD)
        .order('highest_power', { ascending: false, nullsLast: true });
      
      if (statsError || !stats) return null;
      
      const totalPower = stats.reduce((sum, stat) => sum + (stat.power || 0), 0);
      const totalMerits = stats.reduce((sum, stat) => sum + (stat.merits || 0), 0);
      const totalKills = stats.reduce((sum, stat) => sum + (stat.units_killed || 0), 0);
      const totalUnitsHealed = stats.reduce((sum, stat) => sum + (stat.units_healed || 0), 0);
      const totalManaSpent = stats.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0);
      const memberCount = stats.length;
      const averagePower = memberCount > 0 ? Math.round(totalPower / memberCount) : 0;
      
      return {
        totalPower,
        totalMerits,
        totalKills,
        totalUnitsHealed,
        totalManaSpent,
        memberCount,
        averagePower,
        scanDate: date,
      };
    } catch (err) {
      console.error('Error getting stats for date:', err);
      return null;
    }
  };

  const runComparison = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      setError('Please select both start and end dates');
      return;
    }
    
    if (selectedStartDate >= selectedEndDate) {
      setError('End date must be after start date');
      return;
    }
    
    try {
      setComparing(true);
      setError(null);
      
      const [startStats, endStats] = await Promise.all([
        getStatsForDate(selectedStartDate),
        getStatsForDate(selectedEndDate)
      ]);
      
      if (!startStats || !endStats) {
        setError('Failed to load stats for selected dates');
        return;
      }
      
      // Calculate changes
      const powerChange = endStats.totalPower - startStats.totalPower;
      const powerChangePercent = startStats.totalPower > 0 ? (powerChange / startStats.totalPower) * 100 : 0;
      
      const meritsChange = endStats.totalMerits - startStats.totalMerits;
      const meritsChangePercent = startStats.totalMerits > 0 ? (meritsChange / startStats.totalMerits) * 100 : 0;
      
      const killsChange = endStats.totalKills - startStats.totalKills;
      const killsChangePercent = startStats.totalKills > 0 ? (killsChange / startStats.totalKills) * 100 : 0;
      
      const healedChange = endStats.totalUnitsHealed - startStats.totalUnitsHealed;
      const healedChangePercent = startStats.totalUnitsHealed > 0 ? (healedChange / startStats.totalUnitsHealed) * 100 : 0;
      
      const manaChange = endStats.totalManaSpent - startStats.totalManaSpent;
      const manaChangePercent = startStats.totalManaSpent > 0 ? (manaChange / startStats.totalManaSpent) * 100 : 0;
      
      const memberChange = endStats.memberCount - startStats.memberCount;
      const avgPowerChange = endStats.averagePower - startStats.averagePower;
      const avgPowerChangePercent = startStats.averagePower > 0 ? (avgPowerChange / startStats.averagePower) * 100 : 0;
      
      setComparison({
        startDate: startStats,
        endDate: endStats,
        changes: {
          powerChange,
          powerChangePercent,
          meritsChange,
          meritsChangePercent,
          killsChange,
          killsChangePercent,
          healedChange,
          healedChangePercent,
          manaChange,
          manaChangePercent,
          memberChange,
          avgPowerChange,
          avgPowerChangePercent,
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run comparison');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    loadAllianceAndDates();
  }, [id]);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

  const getChangeColor = (change: number) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getChangeIcon = (change: number) => {
    if (change > 0) return '↗';
    if (change < 0) return '↘';
    return '→';
  };

  if (loading) {
    return (
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center justify-center min-h-96"
      >
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
          >
            <BarChart3 className="w-8 h-8 text-cyan-400" />
          </motion.div>
          <p className="text-cyan-400 font-orbitron font-bold">LOADING COMPARISON DATA...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAllianceAndDates} />;
  }

  if (!alliance) {
    return <ErrorMessage message="Alliance not found" />;
  }

  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="p-3 sm:p-4 md:p-6 space-y-4 sm:space-y-6 relative overflow-hidden"
    >
      {/* Background Characters */}
      <div className="absolute right-0 top-20 opacity-40 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Background Character"
          className="w-48 sm:w-64 md:w-72 h-auto transform rotate-15"
        />
      </div>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 via-blue-500/10 to-purple-500/10"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate(`/alliance/${id}`)}
              className="glass-panel-light rounded-xl p-2 sm:p-3 neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <BarChart3 className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-cyan-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-cyan-400">ALLIANCE</span> <span className="text-blue-400">COMPARISON</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Compare [{alliance.tag}] statistics between two dates
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Date Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
        <div className="flex items-center mb-4 sm:mb-6 relative z-10">
          <Calendar className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
            SELECT COMPARISON PERIOD
          </h3>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 relative z-10">
          <div>
            <label className="block text-sm font-bold text-blue-400 font-orbitron mb-2">
              START DATE (BASELINE)
            </label>
            <select
              value={selectedStartDate}
              onChange={(e) => setSelectedStartDate(e.target.value)}
              className="w-full px-4 py-3 glass-panel-light border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
            >
              <option value="">Select start date...</option>
              {availableDates.map(date => (
                <option key={date} value={date} className="bg-gray-800">
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
          
          <div>
            <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
              END DATE (COMPARISON)
            </label>
            <select
              value={selectedEndDate}
              onChange={(e) => setSelectedEndDate(e.target.value)}
              className="w-full px-4 py-3 glass-panel-light border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
            >
              <option value="">Select end date...</option>
              {availableDates.map(date => (
                <option key={date} value={date} className="bg-gray-800">
                  {formatDate(date)}
                </option>
              ))}
            </select>
          </div>
          
          <div className="flex items-end">
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={runComparison}
              disabled={!selectedStartDate || !selectedEndDate || comparing}
              className="w-full px-6 py-3 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center justify-center space-x-2"
            >
              {comparing ? (
                <LoadingSpinner size="sm" />
              ) : (
                <BarChart3 className="w-5 h-5" />
              )}
              <span className="font-orbitron">
                {comparing ? 'ANALYZING...' : 'COMPARE'}
              </span>
            </motion.button>
          </div>
        </div>
      </motion.div>

      {/* Comparison Results */}
      {comparison && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="space-y-6"
        >
          {/* Period Summary */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
            <div className="flex items-center mb-4 sm:mb-6 relative z-10">
              <Activity className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mr-2 sm:mr-3" />
              <h3 className="text-lg sm:text-xl font-black text-yellow-400 font-orbitron">
                COMPARISON PERIOD
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 sm:gap-6 relative z-10">
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border border-blue-400 bg-blue-500/10">
                <Calendar className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                <div className="text-sm text-blue-400 font-bold font-orbitron mb-1">START DATE</div>
                <div className="text-lg font-black text-white font-orbitron">
                  {formatDate(selectedStartDate)}
                </div>
                <div className="text-xs text-gray-400">Baseline measurements</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border border-green-400 bg-green-500/10">
                <Calendar className="w-5 h-5 text-green-400 mx-auto mb-2" />
                <div className="text-sm text-green-400 font-bold font-orbitron mb-1">END DATE</div>
                <div className="text-lg font-black text-white font-orbitron">
                  {formatDate(selectedEndDate)}
                </div>
                <div className="text-xs text-gray-400">Comparison measurements</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border border-purple-400 bg-purple-500/10">
                <Target className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">DURATION</div>
                <div className="text-lg font-black text-white font-orbitron">
                  {Math.ceil((new Date(selectedEndDate).getTime() - new Date(selectedStartDate).getTime()) / (1000 * 60 * 60 * 24))}
                </div>
                <div className="text-xs text-gray-400">Days analyzed</div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass-panel rounded-2xl neon-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 via-blue-500/5 to-purple-500/5"></div>
            
            <div className="p-4 sm:p-6 border-b border-gray-700/50 relative z-10">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl sm:text-2xl font-black text-cyan-400 font-orbitron">
                  STATISTICAL COMPARISON
                </h3>
              </div>
            </div>

            <div className="relative z-10 overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="border-b-2 border-cyan-400/50">
                    <th className="text-left py-4 px-6 text-cyan-400 font-orbitron font-bold text-sm">METRIC</th>
                    <th className="text-center py-4 px-4 text-blue-400 font-orbitron font-bold text-sm">
                      START DATE<br />
                      <span className="text-xs text-gray-400">{formatDate(selectedStartDate)}</span>
                    </th>
                    <th className="text-center py-4 px-4 text-green-400 font-orbitron font-bold text-sm">
                      END DATE<br />
                      <span className="text-xs text-gray-400">{formatDate(selectedEndDate)}</span>
                    </th>
                    <th className="text-center py-4 px-4 text-yellow-400 font-orbitron font-bold text-sm">
                      NET CHANGE
                    </th>
                    <th className="text-center py-4 px-4 text-purple-400 font-orbitron font-bold text-sm">
                      % CHANGE
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {/* Total Power */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="border-l-4 border-blue-400 bg-blue-500/10 hover:bg-blue-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <TrendingUp className="w-5 h-5 text-blue-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">TOTAL POWER</div>
                          <div className="text-xs text-gray-400">Combined alliance power</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.totalPower)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.totalPower)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.powerChange)}`}>
                        {getChangeIcon(comparison.changes.powerChange)} {formatNumber(Math.abs(comparison.changes.powerChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.powerChange)}`}>
                        {comparison.changes.powerChangePercent > 0 ? '+' : ''}{comparison.changes.powerChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Total Merits */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.2 }}
                    className="border-l-4 border-purple-400 bg-purple-500/10 hover:bg-purple-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Award className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">TOTAL MERITS</div>
                          <div className="text-xs text-gray-400">Achievement points earned</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.totalMerits)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.totalMerits)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.meritsChange)}`}>
                        {getChangeIcon(comparison.changes.meritsChange)} {formatNumber(Math.abs(comparison.changes.meritsChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.meritsChange)}`}>
                        {comparison.changes.meritsChangePercent > 0 ? '+' : ''}{comparison.changes.meritsChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Total Kills */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.3 }}
                    className="border-l-4 border-red-400 bg-red-500/10 hover:bg-red-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Sword className="w-5 h-5 text-red-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">TROOPS KILLED</div>
                          <div className="text-xs text-gray-400">Enemy units eliminated</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.totalKills)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.totalKills)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.killsChange)}`}>
                        {getChangeIcon(comparison.changes.killsChange)} {formatNumber(Math.abs(comparison.changes.killsChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.killsChange)}`}>
                        {comparison.changes.killsChangePercent > 0 ? '+' : ''}{comparison.changes.killsChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Units Healed */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.4 }}
                    className="border-l-4 border-green-400 bg-green-500/10 hover:bg-green-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Heart className="w-5 h-5 text-green-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">TROOPS HEALED</div>
                          <div className="text-xs text-gray-400">Allied units restored</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.totalUnitsHealed)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.totalUnitsHealed)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.healedChange)}`}>
                        {getChangeIcon(comparison.changes.healedChange)} {formatNumber(Math.abs(comparison.changes.healedChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.healedChange)}`}>
                        {comparison.changes.healedChangePercent > 0 ? '+' : ''}{comparison.changes.healedChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Mana Spent */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.5 }}
                    className="border-l-4 border-pink-400 bg-pink-500/10 hover:bg-pink-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Zap className="w-5 h-5 text-pink-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">MANA SPENT</div>
                          <div className="text-xs text-gray-400">Resources invested</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.totalManaSpent)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.totalManaSpent)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.manaChange)}`}>
                        {getChangeIcon(comparison.changes.manaChange)} {formatNumber(Math.abs(comparison.changes.manaChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.manaChange)}`}>
                        {comparison.changes.manaChangePercent > 0 ? '+' : ''}{comparison.changes.manaChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Average Power */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.6 }}
                    className="border-l-4 border-cyan-400 bg-cyan-500/10 hover:bg-cyan-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Activity className="w-5 h-5 text-cyan-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">AVERAGE POWER</div>
                          <div className="text-xs text-gray-400">Power per member</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{formatNumber(comparison.startDate.averagePower)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{formatNumber(comparison.endDate.averagePower)}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.avgPowerChange)}`}>
                        {getChangeIcon(comparison.changes.avgPowerChange)} {formatNumber(Math.abs(comparison.changes.avgPowerChange))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.avgPowerChange)}`}>
                        {comparison.changes.avgPowerChangePercent > 0 ? '+' : ''}{comparison.changes.avgPowerChangePercent.toFixed(1)}%
                      </div>
                    </td>
                  </motion.tr>

                  {/* Member Count */}
                  <motion.tr
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.7 }}
                    className="border-l-4 border-orange-400 bg-orange-500/10 hover:bg-orange-500/20 transition-all duration-300"
                  >
                    <td className="py-4 px-6">
                      <div className="flex items-center space-x-3">
                        <Users className="w-5 h-5 text-orange-400" />
                        <div>
                          <div className="font-bold text-white font-orbitron">MEMBER COUNT</div>
                          <div className="text-xs text-gray-400">Active alliance members</div>
                        </div>
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-blue-400 font-orbitron">{comparison.startDate.memberCount}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-green-400 font-orbitron">{comparison.endDate.memberCount}</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron ${getChangeColor(comparison.changes.memberChange)}`}>
                        {getChangeIcon(comparison.changes.memberChange)} {Math.abs(comparison.changes.memberChange)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-gray-400 font-orbitron">-</div>
                    </td>
                  </motion.tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Calculation Showcase */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
            <div className="flex items-center mb-4 sm:mb-6 relative z-10">
              <Target className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
              <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
                CALCULATION BREAKDOWN
              </h3>
            </div>
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
              {/* Power Analysis */}
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <h4 className="text-md font-bold text-blue-400 font-orbitron mb-4">📊 POWER ANALYSIS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-blue-400">Start Power:</span>
                    <span className="text-white">{comparison.startDate.totalPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">End Power:</span>
                    <span className="text-white">{comparison.endDate.totalPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-500/20 p-3 rounded-lg border border-blue-400">
                    <span className="text-cyan-400 font-bold">Net Change:</span>
                    <span className={`font-bold ${getChangeColor(comparison.changes.powerChange)}`}>
                      {comparison.changes.powerChange > 0 ? '+' : ''}{comparison.changes.powerChange.toLocaleString()}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-purple-400">Formula:</span>
                    <span className="text-white text-xs">({comparison.endDate.totalPower.toLocaleString()} - {comparison.startDate.totalPower.toLocaleString()}) ÷ {comparison.startDate.totalPower.toLocaleString()} × 100</span>
                  </div>
                </div>
              </div>

              {/* Combat Analysis */}
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-red-500/10 to-pink-500/10">
                <h4 className="text-md font-bold text-red-400 font-orbitron mb-4">⚔️ COMBAT ANALYSIS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-red-400">Kills Gained:</span>
                    <span className="text-white">{comparison.changes.killsChange.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">Units Healed:</span>
                    <span className="text-white">{comparison.changes.healedChange.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-500/20 p-3 rounded-lg border border-red-400">
                    <span className="text-pink-400 font-bold">Combat Ratio:</span>
                    <span className="text-white font-bold">
                      {comparison.changes.healedChange > 0 ? (comparison.changes.killsChange / comparison.changes.healedChange).toFixed(2) : 'N/A'}
                    </span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-purple-400">Mana Investment:</span>
                    <span className="text-white">{comparison.changes.manaChange.toLocaleString()}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Summary Insights */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
            <div className="flex items-center mb-4 sm:mb-6 relative z-10">
              <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mr-2 sm:mr-3" />
              <h3 className="text-lg sm:text-xl font-black text-yellow-400 font-orbitron">
                PERFORMANCE SUMMARY
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${getChangeColor(comparison.changes.powerChange)}`}>
                  {comparison.changes.powerChangePercent > 0 ? '+' : ''}{comparison.changes.powerChangePercent.toFixed(1)}%
                </div>
                <div className="text-sm text-blue-400 font-bold font-orbitron">POWER GROWTH</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${getChangeColor(comparison.changes.meritsChange)}`}>
                  {formatNumber(comparison.changes.meritsChange)}
                </div>
                <div className="text-sm text-purple-400 font-bold font-orbitron">MERITS GAINED</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${getChangeColor(comparison.changes.killsChange)}`}>
                  {formatNumber(comparison.changes.killsChange)}
                </div>
                <div className="text-sm text-red-400 font-bold font-orbitron">KILLS GAINED</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${getChangeColor(comparison.changes.manaChange)}`}>
                  {formatNumber(comparison.changes.manaChange)}
                </div>
                <div className="text-sm text-pink-400 font-bold font-orbitron">MANA INVESTED</div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Data Message */}
      {availableDates.length < 2 && !loading && (
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
            <Calendar className="w-12 h-12 text-cyan-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-cyan-400 font-orbitron mb-2">
            INSUFFICIENT DATA
          </h3>
          <p className="text-gray-400">
            Need at least 2 scan dates to perform comparison analysis
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}