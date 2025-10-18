import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  ArrowLeft, 
  Shield, 
  TrendingUp, 
  Award, 
  Sword, 
  Heart, 
  Zap, 
  Users,
  BarChart3,
  Target,
  Activity,
  Search,
  X,
  Crown,
  Swords
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { fetchAlliances, fetchAllianceDetail } from '../utils/queries';
import { Alliance, AllianceDetail } from '../types';

interface AllianceStats {
  id: string;
  tag: string;
  name: string;
  generation: string;
  totalPower: number;
  totalMerits: number;
  totalKills: number;
  totalUnitsHealed: number;
  totalManaSpent: number;
  memberCount: number;
  averagePower: number;
  startDate: string;
  endDate: string;
  scanCount: number;
  // Raw values for display
  startTotalPower?: number;
  endTotalPower?: number;
  startTotalMerits?: number;
  endTotalMerits?: number;
  startTotalKills?: number;
  endTotalKills?: number;
  startTotalUnitsHealed?: number;
  endTotalUnitsHealed?: number;
  startTotalManaSpent?: number;
  endTotalManaSpent?: number;
}

interface ComparisonData {
  allianceA: AllianceStats;
  allianceB: AllianceStats;
  differences: {
    powerDifference: number;
    powerRatio: number;
    meritsDifference: number;
    meritsRatio: number;
    killsDifference: number;
    killsRatio: number;
    healedDifference: number;
    healedRatio: number;
    manaDifference: number;
    manaRatio: number;
    memberDifference: number;
    avgPowerDifference: number;
    avgPowerRatio: number;
  };
}

export function AllianceVsAlliance() {
  const navigate = useNavigate();
  
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [selectedAllianceA, setSelectedAllianceA] = useState<Alliance | null>(null);
  const [selectedAllianceB, setSelectedAllianceB] = useState<Alliance | null>(null);
  const [availableDatesA, setAvailableDatesA] = useState<string[]>([]);
  const [availableDatesB, setAvailableDatesB] = useState<string[]>([]);
  const [allianceAStartDate, setAllianceAStartDate] = useState<string>('');
  const [allianceAEndDate, setAllianceAEndDate] = useState<string>('');
  const [allianceBStartDate, setAllianceBStartDate] = useState<string>('');
  const [allianceBEndDate, setAllianceBEndDate] = useState<string>('');
  const [searchQueryA, setSearchQueryA] = useState('');
  const [searchQueryB, setSearchQueryB] = useState('');
  const [comparison, setComparison] = useState<ComparisonData | null>(null);
  const [loading, setLoading] = useState(true);
  const [comparing, setComparing] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const loadAlliances = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await fetchAlliances();
      setAlliances(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load alliances');
    } finally {
      setLoading(false);
    }
  };

  // Load available dates for an alliance
  const loadAvailableDates = async (allianceId: string): Promise<string[]> => {
    try {
      const { data: scans, error } = await supabase
        .from('scans')
        .select('scan_date')
        .eq('alliance_id', allianceId)
        .order('scan_date', { ascending: true });
      
      if (error) throw error;
      return (scans || []).map(scan => scan.scan_date);
    } catch (err) {
      console.error('Error loading dates:', err);
      return [];
    }
  };

  const getStatsForDateRange = async (allianceId: string, startDate: string, endDate: string): Promise<AllianceStats | null> => {
    try {
      // Filter by 50M+ power instead of using limit
      const POWER_THRESHOLD = 50000000;

      // Get alliance generation
      const { data: allianceData, error: allianceError } = await supabase
        .from('alliances')
        .select('generation')
        .eq('id', allianceId)
        .single();

      // Get start date scan
      const { data: startScan, error: startScanError } = await supabase
        .from('scans')
        .select('id, scan_date')
        .eq('alliance_id', allianceId)
        .eq('scan_date', startDate)
        .single();

      // Get end date scan
      const { data: endScan, error: endScanError } = await supabase
        .from('scans')
        .select('id, scan_date')
        .eq('alliance_id', allianceId)
        .eq('scan_date', endDate)
        .single();

      if (startScanError || endScanError || !startScan || !endScan) return null;

      // Get player stats for start date (50M+ power)
      const { data: startStats, error: startStatsError } = await supabase
        .from('player_stats')
        .select('power, merits, units_killed, units_healed, mana_spent, home_server, highest_power')
        .eq('scan_id', startScan.id)
        .not('home_server', 'is', null)
        .gte('highest_power', POWER_THRESHOLD)
        .order('highest_power', { ascending: false, nullsLast: true });

      // Get player stats for end date (50M+ power)
      const { data: endStats, error: endStatsError } = await supabase
        .from('player_stats')
        .select('power, merits, units_killed, units_healed, mana_spent, home_server, highest_power')
        .eq('scan_id', endScan.id)
        .not('home_server', 'is', null)
        .gte('highest_power', POWER_THRESHOLD)
        .order('highest_power', { ascending: false, nullsLast: true });
      
      if (startStatsError || endStatsError || !startStats || !endStats) return null;
      
      // Calculate start totals
      const startTotalPower = startStats.reduce((sum, stat) => sum + (stat.power || 0), 0);
      const startTotalMerits = startStats.reduce((sum, stat) => sum + (stat.merits || 0), 0);
      const startTotalKills = startStats.reduce((sum, stat) => sum + (stat.units_killed || 0), 0);
      const startTotalUnitsHealed = startStats.reduce((sum, stat) => sum + (stat.units_healed || 0), 0);
      const startTotalManaSpent = startStats.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0);
      
      // Calculate end totals
      const endTotalPower = endStats.reduce((sum, stat) => sum + (stat.power || 0), 0);
      const endTotalMerits = endStats.reduce((sum, stat) => sum + (stat.merits || 0), 0);
      const endTotalKills = endStats.reduce((sum, stat) => sum + (stat.units_killed || 0), 0);
      const endTotalUnitsHealed = endStats.reduce((sum, stat) => sum + (stat.units_healed || 0), 0);
      const endTotalManaSpent = endStats.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0);

      // Calculate net changes
      const totalPower = endTotalPower - startTotalPower;
      const totalMerits = endTotalMerits - startTotalMerits;
      const totalKills = endTotalKills - startTotalKills;
      const totalUnitsHealed = endTotalUnitsHealed - startTotalUnitsHealed;
      const totalManaSpent = endTotalManaSpent - startTotalManaSpent;

      // All stats are already filtered to 50M+
      const memberCount = endStats.length;
      const averagePower = memberCount > 0 ? Math.round(endTotalPower / memberCount) : 0;
      
      return {
        id: allianceId,
        tag: '',
        name: '',
        generation: allianceData?.generation || 'G2',
        totalPower,
        totalMerits,
        totalKills,
        totalUnitsHealed,
        totalManaSpent,
        memberCount,
        averagePower,
        startDate,
        endDate,
        scanCount: 2, // Start and end scans
        // Store the raw values for display
        startTotalPower,
        endTotalPower,
        startTotalMerits,
        endTotalMerits,
        startTotalKills,
        endTotalKills,
        startTotalUnitsHealed,
        endTotalUnitsHealed,
        startTotalManaSpent,
        endTotalManaSpent,
      };
    } catch (err) {
      console.error('Error getting stats for alliance:', err);
      return null;
    }
  };

  // Handle alliance A selection
  const handleAllianceASelection = async (alliance: Alliance) => {
    setSelectedAllianceA(alliance);
    setSearchQueryA('');
    setAllianceAStartDate('');
    setAllianceAEndDate('');
    
    // Load available dates for this alliance
    const dates = await loadAvailableDates(alliance.id);
    setAvailableDatesA(dates);
    
    // Set default dates (first and last)
    if (dates.length >= 2) {
      setAllianceAStartDate(''); // Let user choose
      setAllianceAEndDate(''); // Let user choose
    } else if (dates.length === 1) {
      setAllianceAStartDate(dates[0]);
      setAllianceAEndDate(dates[0]);
    }
  };

  // Handle alliance B selection
  const handleAllianceBSelection = async (alliance: Alliance) => {
    setSelectedAllianceB(alliance);
    setSearchQueryB('');
    setAllianceBStartDate('');
    setAllianceBEndDate('');
    
    // Load available dates for this alliance
    const dates = await loadAvailableDates(alliance.id);
    setAvailableDatesB(dates);
    
    // Set default dates (first and last)
    if (dates.length >= 2) {
      setAllianceBStartDate(''); // Let user choose
      setAllianceBEndDate(''); // Let user choose
    } else if (dates.length === 1) {
      setAllianceBStartDate(dates[0]);
      setAllianceBEndDate(dates[0]);
    }
  };

  const runComparison = async () => {
    if (!selectedAllianceA || !selectedAllianceB || !allianceAStartDate || !allianceAEndDate || !allianceBStartDate || !allianceBEndDate) {
      setError('Please select both alliances and their date ranges');
      return;
    }
    
    if (selectedAllianceA.id === selectedAllianceB.id) {
      setError('Please select two different alliances');
      return;
    }
    
    try {
      setComparing(true);
      setError(null);
      
      const [statsA, statsB] = await Promise.all([
        getStatsForDateRange(selectedAllianceA.id, allianceAStartDate, allianceAEndDate),
        getStatsForDateRange(selectedAllianceB.id, allianceBStartDate, allianceBEndDate)
      ]);
      
      if (!statsA || !statsB) {
        setError('Failed to load stats for selected date ranges');
        return;
      }
      
      // Add alliance info to stats
      statsA.tag = selectedAllianceA.tag;
      statsA.name = selectedAllianceA.name;
      statsB.tag = selectedAllianceB.tag;
      statsB.name = selectedAllianceB.name;
      
      // Calculate differences and ratios
      const powerDifference = statsA.totalPower - statsB.totalPower;
      const powerRatio = statsB.totalPower > 0 ? statsA.totalPower / statsB.totalPower : 0;
      
      const meritsDifference = statsA.totalMerits - statsB.totalMerits;
      const meritsRatio = statsB.totalMerits > 0 ? statsA.totalMerits / statsB.totalMerits : 0;
      
      const killsDifference = statsA.totalKills - statsB.totalKills;
      const killsRatio = statsB.totalKills > 0 ? statsA.totalKills / statsB.totalKills : 0;
      
      const healedDifference = statsA.totalUnitsHealed - statsB.totalUnitsHealed;
      const healedRatio = statsB.totalUnitsHealed > 0 ? statsA.totalUnitsHealed / statsB.totalUnitsHealed : 0;
      
      const manaDifference = statsA.totalManaSpent - statsB.totalManaSpent;
      const manaRatio = statsB.totalManaSpent > 0 ? statsA.totalManaSpent / statsB.totalManaSpent : 0;
      
      const memberDifference = statsA.memberCount - statsB.memberCount;
      const avgPowerDifference = statsA.averagePower - statsB.averagePower;
      const avgPowerRatio = statsB.averagePower > 0 ? statsA.averagePower / statsB.averagePower : 0;
      
      setComparison({
        allianceA: statsA,
        allianceB: statsB,
        differences: {
          powerDifference,
          powerRatio,
          meritsDifference,
          meritsRatio,
          killsDifference,
          killsRatio,
          healedDifference,
          healedRatio,
          manaDifference,
          manaRatio,
          memberDifference,
          avgPowerDifference,
          avgPowerRatio,
        }
      });
      
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to run comparison');
    } finally {
      setComparing(false);
    }
  };

  useEffect(() => {
    loadAlliances();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  const formatNumberWithCommas = (num: number) => {
    return num.toLocaleString();
  };

  const formatDate = (dateStr: string) =>
    new Date(dateStr).toLocaleDateString('en-US', { 
      month: 'short', 
      day: 'numeric', 
      year: 'numeric' 
    });

  const getComparisonColor = (difference: number) => {
    if (difference > 0) return 'text-green-400';
    if (difference < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const getComparisonIcon = (difference: number) => {
    if (difference > 0) return '↗';
    if (difference < 0) return '↘';
    return '=';
  };

  const getFilteredAlliances = (query: string, exclude?: Alliance) => {
    let filtered = alliances;
    
    if (exclude) {
      filtered = filtered.filter(a => a.id !== exclude.id);
    }
    
    if (query.trim()) {
      const q = query.toLowerCase();
      filtered = filtered.filter(alliance => 
        alliance.tag.toLowerCase().includes(q) ||
        alliance.name.toLowerCase().includes(q)
      );
    }
    
    return filtered;
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
            <Swords className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-purple-400 font-orbitron font-bold">LOADING ALLIANCE COMPARISON...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadAlliances} />;
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
      <div className="absolute left-0 bottom-20 opacity-35 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Background Character"
          className="w-40 sm:w-56 md:w-64 h-auto transform -rotate-20 scale-x-[-1]"
        />
      </div>
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ delay: 0.1 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="glass-panel-light rounded-xl p-2 sm:p-3 neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <Swords className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-purple-400">ALLIANCE</span> <span className="text-pink-400">VS</span> <span className="text-blue-400">ALLIANCE</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Compare statistics between two different alliances
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Alliance Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-red-500/10"></div>
        <div className="flex items-center mb-4 sm:mb-6 relative z-10">
          <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-blue-400 font-orbitron">
            SELECT ALLIANCES TO COMPARE
          </h3>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 relative z-10">
          {/* Alliance A Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Shield className="w-5 h-5 text-blue-400" />
              <h4 className="text-lg font-bold text-blue-400 font-orbitron">ALLIANCE A</h4>
            </div>
            
            {/* Search for Alliance A */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search alliances by tag or name..."
                value={searchQueryA}
                onChange={(e) => setSearchQueryA(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-all duration-300"
              />
              {searchQueryA && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQueryA('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-blue-400 transition-colors duration-300"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>

            {/* Selected Alliance A */}
            {selectedAllianceA && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel-light rounded-xl p-4 neon-border border-blue-400 bg-blue-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Shield className="w-5 h-5 text-blue-400" />
                    <div>
                      <div className="font-bold text-white font-orbitron">[{selectedAllianceA.tag}]</div>
                      <div className="text-sm text-gray-400">{selectedAllianceA.name}</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedAllianceA(null);
                      setAvailableDatesA([]);
                      setAllianceAStartDate('');
                      setAllianceAEndDate('');
                    }}
                    className="p-2 glass-panel rounded-lg neon-border hover:neon-glow transition-all duration-300"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </motion.button>
                </div>
                
                {/* Date Range Selection for Alliance A */}
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-cyan-400 font-orbitron mb-2">
                      START DATE FOR [{selectedAllianceA.tag}]
                    </label>
                    <select
                      value={allianceAStartDate}
                      onChange={(e) => setAllianceAStartDate(e.target.value)}
                      className="w-full px-4 py-3 glass-panel border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-300"
                    >
                      <option value="">Select start date...</option>
                      {availableDatesA.map(date => (
                        <option key={date} value={date} className="bg-gray-800">
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
                      END DATE FOR [{selectedAllianceA.tag}]
                    </label>
                    <select
                      value={allianceAEndDate}
                      onChange={(e) => setAllianceAEndDate(e.target.value)}
                      className="w-full px-4 py-3 glass-panel border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    >
                      <option value="">Select end date...</option>
                      {availableDatesA.map(date => (
                        <option key={date} value={date} className="bg-gray-800">
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Alliance A Options */}
            {!selectedAllianceA && (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {getFilteredAlliances(searchQueryA, selectedAllianceB).map((alliance) => (
                  <motion.button
                    key={alliance.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAllianceASelection(alliance)}
                    className="flex items-center justify-between p-3 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Shield className="w-4 h-4 text-blue-400" />
                      <div>
                        <div className="font-bold text-white text-sm">[{alliance.tag}]</div>
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">{alliance.name}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>

          {/* Alliance B Selection */}
          <div className="space-y-4">
            <div className="flex items-center space-x-2">
              <Sword className="w-5 h-5 text-red-400" />
              <h4 className="text-lg font-bold text-red-400 font-orbitron">ALLIANCE B</h4>
            </div>
            
            {/* Search for Alliance B */}
            <div className="relative">
              <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
              <input
                type="text"
                placeholder="Search alliances by tag or name..."
                value={searchQueryB}
                onChange={(e) => setSearchQueryB(e.target.value)}
                className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-red-500 focus:border-red-500 transition-all duration-300"
              />
              {searchQueryB && (
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setSearchQueryB('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-red-400 transition-colors duration-300"
                >
                  <X className="w-5 h-5" />
                </motion.button>
              )}
            </div>

            {/* Selected Alliance B */}
            {selectedAllianceB && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="glass-panel-light rounded-xl p-4 neon-border border-red-400 bg-red-500/10"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Sword className="w-5 h-5 text-red-400" />
                    <div>
                      <div className="font-bold text-white font-orbitron">[{selectedAllianceB.tag}]</div>
                      <div className="text-sm text-gray-400">{selectedAllianceB.name}</div>
                    </div>
                  </div>
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={() => {
                      setSelectedAllianceB(null);
                      setAvailableDatesB([]);
                      setAllianceBStartDate('');
                      setAllianceBEndDate('');
                    }}
                    className="p-2 glass-panel rounded-lg neon-border hover:neon-glow transition-all duration-300"
                  >
                    <X className="w-4 h-4 text-red-400" />
                  </motion.button>
                </div>
                
                {/* Date Range Selection for Alliance B */}
                <div className="mt-4 space-y-4">
                  <div>
                    <label className="block text-sm font-bold text-cyan-400 font-orbitron mb-2">
                      START DATE FOR [{selectedAllianceB.tag}]
                    </label>
                    <select
                      value={allianceBStartDate}
                      onChange={(e) => setAllianceBStartDate(e.target.value)}
                      className="w-full px-4 py-3 glass-panel border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-cyan-500 transition-all duration-300"
                    >
                      <option value="">Select start date...</option>
                      {availableDatesB.map(date => (
                        <option key={date} value={date} className="bg-gray-800">
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div>
                    <label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
                      END DATE FOR [{selectedAllianceB.tag}]
                    </label>
                    <select
                      value={allianceBEndDate}
                      onChange={(e) => setAllianceBEndDate(e.target.value)}
                      className="w-full px-4 py-3 glass-panel border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
                    >
                      <option value="">Select end date...</option>
                      {availableDatesB.map(date => (
                        <option key={date} value={date} className="bg-gray-800">
                          {formatDate(date)}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>
              </motion.div>
            )}

            {/* Alliance B Options */}
            {!selectedAllianceB && (
              <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                {getFilteredAlliances(searchQueryB, selectedAllianceA).map((alliance) => (
                  <motion.button
                    key={alliance.id}
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => handleAllianceBSelection(alliance)}
                    className="flex items-center justify-between p-3 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300 text-left"
                  >
                    <div className="flex items-center space-x-3">
                      <Sword className="w-4 h-4 text-red-400" />
                      <div>
                        <div className="font-bold text-white text-sm">[{alliance.tag}]</div>
                        <div className="text-xs text-gray-400 truncate max-w-[150px]">{alliance.name}</div>
                      </div>
                    </div>
                  </motion.button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Compare Button */}
        <div className="text-center mt-6 relative z-10">
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={runComparison}
            disabled={
              !selectedAllianceA || !selectedAllianceB || 
              !allianceAStartDate || !allianceAEndDate || 
              !allianceBStartDate || !allianceBEndDate || 
              comparing
            }
            className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-3"
          >
            {comparing ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Swords className="w-5 h-5" />
            )}
            <span className="font-orbitron">
              {comparing ? 'ANALYZING...' : 'COMPARE ALLIANCES'}
            </span>
          </motion.button>
          <p className="text-xs text-gray-400 mt-2">
            Select both alliances and their date ranges to compare
          </p>
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
          {/* Alliance Overview */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Alliance A Overview */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border-blue-400 bg-blue-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"></div>
              <div className="flex items-center mb-4 relative z-10">
                <Shield className="w-6 h-6 text-blue-400 mr-3" />
                <h3 className="text-xl font-black text-blue-400 font-orbitron">
                  [{comparison.allianceA.tag}]
                </h3>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="text-sm text-gray-400">{comparison.allianceA.name}</div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    {comparison.allianceA.generation}
                  </span>
                  <span className="text-xs text-gray-400">
                    Data from {formatDate(comparison.allianceA.startDate)} - {formatDate(comparison.allianceA.endDate)}
                    <br />({comparison.allianceA.scanCount} scans)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 glass-panel-light rounded-lg neon-border">
                    <div className="text-lg font-bold text-blue-400 font-orbitron">{formatNumber(comparison.allianceA.totalPower)}</div>
                    <div className="text-xs text-gray-400">Net Power Change</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(comparison.allianceA.endTotalPower || 0)} - {formatNumber(comparison.allianceA.startTotalPower || 0)}
                    </div>
                  </div>
                  <div className="text-center p-3 glass-panel-light rounded-lg neon-border">
                    <div className="text-lg font-bold text-green-400 font-orbitron">{comparison.allianceA.memberCount}</div>
                    <div className="text-xs text-gray-400">Active Members</div>
                    <div className="text-xs text-gray-500 mt-1">≥50M Power</div>
                  </div>
                </div>
              </div>
            </div>

            {/* Alliance B Overview */}
            <div className="glass-panel rounded-2xl p-6 relative overflow-hidden border-red-400 bg-red-500/10">
              <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10"></div>
              <div className="flex items-center mb-4 relative z-10">
                <Sword className="w-6 h-6 text-red-400 mr-3" />
                <h3 className="text-xl font-black text-red-400 font-orbitron">
                  [{comparison.allianceB.tag}]
                </h3>
              </div>
              <div className="space-y-3 relative z-10">
                <div className="text-sm text-gray-400">{comparison.allianceB.name}</div>
                <div className="flex items-center space-x-2">
                  <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                    {comparison.allianceB.generation}
                  </span>
                  <span className="text-xs text-gray-400">
                    Data from {formatDate(comparison.allianceB.startDate)} - {formatDate(comparison.allianceB.endDate)}
                    <br />({comparison.allianceB.scanCount} scans)
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-4 mt-4">
                  <div className="text-center p-3 glass-panel-light rounded-lg neon-border">
                    <div className="text-lg font-bold text-red-400 font-orbitron">{formatNumber(comparison.allianceB.totalPower)}</div>
                    <div className="text-xs text-gray-400">Net Power Change</div>
                    <div className="text-xs text-gray-500 mt-1">
                      {formatNumber(comparison.allianceB.endTotalPower || 0)} - {formatNumber(comparison.allianceB.startTotalPower || 0)}
                    </div>
                  </div>
                  <div className="text-center p-3 glass-panel-light rounded-lg neon-border">
                    <div className="text-lg font-bold text-green-400 font-orbitron">{comparison.allianceB.memberCount}</div>
                    <div className="text-xs text-gray-400">Active Members</div>
                    <div className="text-xs text-gray-500 mt-1">≥50M Power</div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Comparison Table */}
          <div className="glass-panel rounded-2xl neon-border relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-pink-500/5 to-blue-500/5"></div>
            
            <div className="p-4 sm:p-6 border-b border-gray-700/50 relative z-10">
              <div className="flex items-center space-x-3">
                <BarChart3 className="w-6 h-6 text-purple-400" />
                <h3 className="text-xl sm:text-2xl font-black text-purple-400 font-orbitron">
                  STATISTICAL COMPARISON
                </h3>
              </div>
            </div>

            <div className="relative z-10 overflow-x-auto">
              <table className="w-full border-collapse" style={{ minWidth: '800px' }}>
                <thead>
                  <tr className="border-b-2 border-purple-400/50">
                    <th className="text-left py-4 px-6 text-purple-400 font-orbitron font-bold text-sm">METRIC</th>
                    <th className="text-center py-4 px-4 text-blue-400 font-orbitron font-bold text-sm">
                      [{comparison.allianceA.tag}] NET CHANGE<br />
                      <span className="text-xs text-gray-400">
                        {formatDate(comparison.allianceA.startDate)} - {formatDate(comparison.allianceA.endDate)}
                        <br />({comparison.allianceA.scanCount} scans)
                      </span>
                    </th>
                    <th className="text-center py-4 px-4 text-red-400 font-orbitron font-bold text-sm">
                      [{comparison.allianceB.tag}] NET CHANGE<br />
                      <span className="text-xs text-gray-400">
                        {formatDate(comparison.allianceB.startDate)} - {formatDate(comparison.allianceB.endDate)}
                        <br />({comparison.allianceB.scanCount} scans)
                      </span>
                    </th>
                    <th className="text-center py-4 px-4 text-yellow-400 font-orbitron font-bold text-sm">
                      DIFFERENCE
                    </th>
                    <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">
                      RATIO
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.totalPower)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceA.endTotalPower || 0)} - {formatNumber(comparison.allianceA.startTotalPower || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.totalPower)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceB.endTotalPower || 0)} - {formatNumber(comparison.allianceB.startTotalPower || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.powerDifference)}`}>
                        {getComparisonIcon(comparison.differences.powerDifference)} {formatNumber(Math.abs(comparison.differences.powerDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.powerDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.powerRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.totalMerits)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceA.endTotalMerits || 0)} - {formatNumber(comparison.allianceA.startTotalMerits || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.totalMerits)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceB.endTotalMerits || 0)} - {formatNumber(comparison.allianceB.startTotalMerits || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.meritsDifference)}`}>
                        {getComparisonIcon(comparison.differences.meritsDifference)} {formatNumber(Math.abs(comparison.differences.meritsDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.meritsDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.meritsRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.totalKills)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceA.endTotalKills || 0)} - {formatNumber(comparison.allianceA.startTotalKills || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.totalKills)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceB.endTotalKills || 0)} - {formatNumber(comparison.allianceB.startTotalKills || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.killsDifference)}`}>
                        {getComparisonIcon(comparison.differences.killsDifference)} {formatNumber(Math.abs(comparison.differences.killsDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.killsDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.killsRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.totalUnitsHealed)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceA.endTotalUnitsHealed || 0)} - {formatNumber(comparison.allianceA.startTotalUnitsHealed || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.totalUnitsHealed)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceB.endTotalUnitsHealed || 0)} - {formatNumber(comparison.allianceB.startTotalUnitsHealed || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.healedDifference)}`}>
                        {getComparisonIcon(comparison.differences.healedDifference)} {formatNumber(Math.abs(comparison.differences.healedDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.healedDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.healedRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.totalManaSpent)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceA.endTotalManaSpent || 0)} - {formatNumber(comparison.allianceA.startTotalManaSpent || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.totalManaSpent)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumber(comparison.allianceB.endTotalManaSpent || 0)} - {formatNumber(comparison.allianceB.startTotalManaSpent || 0)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.manaDifference)}`}>
                        {getComparisonIcon(comparison.differences.manaDifference)} {formatNumber(Math.abs(comparison.differences.manaDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.manaDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.manaRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{formatNumber(comparison.allianceA.averagePower)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumberWithCommas(comparison.allianceA.averagePower)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{formatNumber(comparison.allianceB.averagePower)}</div>
                      <div className="text-xs text-gray-400 mt-1 font-mono">
                        {formatNumberWithCommas(comparison.allianceB.averagePower)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.avgPowerDifference)}`}>
                        {getComparisonIcon(comparison.differences.avgPowerDifference)} {formatNumber(Math.abs(comparison.differences.avgPowerDifference))}
                      </div>
                      <div className="text-xs text-gray-400 mt-1">
                        {formatNumberWithCommas(Math.abs(comparison.differences.avgPowerDifference))}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-cyan-500/20 rounded-lg border border-cyan-400/50">
                        <div className="font-bold font-orbitron text-cyan-400 text-lg">
                          {comparison.differences.avgPowerRatio.toFixed(2)}:1
                        </div>
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
                      <div className="font-bold text-blue-400 font-orbitron text-lg">{comparison.allianceA.memberCount}</div>
                      <div className="text-xs text-gray-400 mt-1">≥50M Power</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="font-bold text-red-400 font-orbitron text-lg">{comparison.allianceB.memberCount}</div>
                      <div className="text-xs text-gray-400 mt-1">≥50M Power</div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className={`font-bold font-orbitron text-lg ${getComparisonColor(comparison.differences.memberDifference)}`}>
                        {getComparisonIcon(comparison.differences.memberDifference)} {Math.abs(comparison.differences.memberDifference)}
                      </div>
                    </td>
                    <td className="text-center py-4 px-4">
                      <div className="px-3 py-2 bg-gray-500/20 rounded-lg border border-gray-400/50">
                        <div className="font-bold text-gray-400 font-orbitron text-lg">-</div>
                      </div>
                    </td>
                  </motion.tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Winner Analysis */}
          <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
            <div className="flex items-center mb-4 sm:mb-6 relative z-10">
              <Crown className="w-5 h-5 sm:w-6 sm:h-6 text-yellow-400 mr-2 sm:mr-3" />
              <h3 className="text-lg sm:text-xl font-black text-yellow-400 font-orbitron">
                DOMINANCE ANALYSIS
              </h3>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 sm:gap-6 relative z-10">
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${comparison.differences.powerDifference > 0 ? 'text-blue-400' : comparison.differences.powerDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {comparison.differences.powerDifference > 0 ? `[${comparison.allianceA.tag}]` : comparison.differences.powerDifference < 0 ? `[${comparison.allianceB.tag}]` : 'TIE'}
                </div>
                <div className="text-sm text-blue-400 font-bold font-orbitron">POWER LEADER</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${comparison.differences.meritsDifference > 0 ? 'text-blue-400' : comparison.differences.meritsDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {comparison.differences.meritsDifference > 0 ? `[${comparison.allianceA.tag}]` : comparison.differences.meritsDifference < 0 ? `[${comparison.allianceB.tag}]` : 'TIE'}
                </div>
                <div className="text-sm text-purple-400 font-bold font-orbitron">MERIT LEADER</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${comparison.differences.killsDifference > 0 ? 'text-blue-400' : comparison.differences.killsDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {comparison.differences.killsDifference > 0 ? `[${comparison.allianceA.tag}]` : comparison.differences.killsDifference < 0 ? `[${comparison.allianceB.tag}]` : 'TIE'}
                </div>
                <div className="text-sm text-red-400 font-bold font-orbitron">COMBAT LEADER</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${comparison.differences.manaDifference > 0 ? 'text-blue-400' : comparison.differences.manaDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {comparison.differences.manaDifference > 0 ? `[${comparison.allianceA.tag}]` : comparison.differences.manaDifference < 0 ? `[${comparison.allianceB.tag}]` : 'TIE'}
                </div>
                <div className="text-sm text-pink-400 font-bold font-orbitron">INVESTMENT LEADER</div>
              </div>
              
              <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                <div className={`text-2xl font-black font-orbitron mb-2 ${comparison.differences.avgPowerDifference > 0 ? 'text-blue-400' : comparison.differences.avgPowerDifference < 0 ? 'text-red-400' : 'text-gray-400'}`}>
                  {comparison.differences.avgPowerDifference > 0 ? `[${comparison.allianceA.tag}]` : comparison.differences.avgPowerDifference < 0 ? `[${comparison.allianceB.tag}]` : 'TIE'}
                </div>
                <div className="text-sm text-cyan-400 font-bold font-orbitron">EFFICIENCY LEADER</div>
              </div>
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
              {/* Alliance A Analysis */}
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-blue-500/10 to-cyan-500/10">
                <h4 className="text-md font-bold text-blue-400 font-orbitron mb-4">📊 [{comparison.allianceA.tag}] ANALYSIS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-blue-400">Date Range:</span>
                    <span className="text-white">{formatDate(comparison.allianceA.startDate)} - {formatDate(comparison.allianceA.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-cyan-400">Scans Analyzed:</span>
                    <span className="text-white">{comparison.allianceA.scanCount} scans</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">Net Power Change:</span>
                    <span className="text-white font-bold">{formatNumber(comparison.allianceA.totalPower)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-yellow-400">End Total Power:</span>
                    <span className="text-white">{formatNumber(comparison.allianceA.endTotalPower || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-purple-400">Active Members:</span>
                    <span className="text-white">{comparison.allianceA.memberCount} (≥50M)</span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-500/20 p-3 rounded-lg border border-blue-400">
                    <span className="text-blue-400 font-bold">Avg Power:</span>
                    <span className="text-blue-400 font-bold">{formatNumber(comparison.allianceA.averagePower)}</span>
                  </div>
                </div>
              </div>
              
              {/* Alliance B Analysis */}
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-red-500/10 to-pink-500/10">
                <h4 className="text-md font-bold text-red-400 font-orbitron mb-4">⚔️ [{comparison.allianceB.tag}] ANALYSIS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-red-400">Date Range:</span>
                    <span className="text-white">{formatDate(comparison.allianceB.startDate)} - {formatDate(comparison.allianceB.endDate)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-cyan-400">Scans Analyzed:</span>
                    <span className="text-white">{comparison.allianceB.scanCount} scans</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">Net Power Change:</span>
                    <span className="text-white font-bold">{formatNumber(comparison.allianceB.totalPower)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-yellow-400">End Total Power:</span>
                    <span className="text-white">{formatNumber(comparison.allianceB.endTotalPower || 0)}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-purple-400">Active Members:</span>
                    <span className="text-white">{comparison.allianceB.memberCount} (≥50M)</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-500/20 p-3 rounded-lg border border-red-400">
                    <span className="text-red-400 font-bold">Avg Power:</span>
                    <span className="text-red-400 font-bold">{formatNumber(comparison.allianceB.averagePower)}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* No Selection Message */}
      {!selectedAllianceA && !selectedAllianceB && !loading && (
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
            <Swords className="w-12 h-12 text-purple-400" />
          </motion.div>
          <h3 className="text-xl font-bold text-purple-400 font-orbitron mb-2">
            SELECT ALLIANCES TO COMPARE
          </h3>
          <p className="text-gray-400">
            Choose two alliances and their date ranges to begin comparison analysis
          </p>
        </motion.div>
      )}
    </motion.div>
  );
}