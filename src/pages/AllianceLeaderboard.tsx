import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Trophy, 
  Crown, 
  Award, 
  Sword, 
  TrendingUp, 
  Users, 
  ArrowLeft,
  Medal,
  Target,
  Zap,
  Heart,
  HandHeart,
  Eye,
  Shield
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';

interface AllianceRanking {
  id: string;
  tag: string;
  name: string;
  generation: string;
  memberCount: number;
  totalPower: number;
  averagePower: number;
  totalMerits: number;
  totalKills: number;
  totalT5Kills: number;
  totalT1Kills: number;
  totalManaSpent: number;
  totalUnitsDead: number;
  totalUnitsHealed: number;
  totalHelpsGiven: number;
  totalScouted: number;
  lastScanDate: string;
}

type RankingCategory = 'totalPower' | 'averagePower' | 'totalMerits' | 'totalKills' | 'totalT5Kills' | 'totalT1Kills' | 'totalManaSpent';

export function AllianceLeaderboard() {
  const navigate = useNavigate();
  const [rankings, setRankings] = useState<AllianceRanking[]>([]);
  const [activeCategory, setActiveCategory] = useState<RankingCategory>('totalPower');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const categories = [
    { id: 'totalPower' as const, name: 'Total Power', icon: TrendingUp, color: 'text-blue-400' },
    { id: 'averagePower' as const, name: 'Average Power', icon: Crown, color: 'text-yellow-400' },
    { id: 'totalMerits' as const, name: 'Total Merits', icon: Award, color: 'text-purple-400' },
    { id: 'totalKills' as const, name: 'Total Kills', icon: Sword, color: 'text-red-400' },
    { id: 'totalT5Kills' as const, name: 'T5 Kills', icon: Target, color: 'text-orange-400' },
    { id: 'totalT1Kills' as const, name: 'T1 Kills', icon: Target, color: 'text-green-400' },
    { id: 'totalManaSpent' as const, name: 'Mana Spent', icon: Zap, color: 'text-cyan-400' },
  ];

  const loadRankings = async () => {
    try {
      setLoading(true);
      setError(null);

      // Get all alliances
      const { data: alliances, error: allianceError } = await supabase
        .from('alliances')
        .select('id, tag, name, generation')
        .order('tag');

      if (allianceError) throw allianceError;

      const rankingsData: AllianceRanking[] = [];

      // For each alliance, get their latest scan stats
      for (const alliance of alliances || []) {
        try {
          // Get latest scan
          const { data: latestScan, error: scanError } = await supabase
            .from('scans')
            .select('id, scan_date')
            .eq('alliance_id', alliance.id)
            .order('scan_date', { ascending: false })
            .limit(1)
           .maybeSingle();

          if (scanError || !latestScan) continue;

          // Get aggregated stats from top 210 players
          const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select(`
              power, 
              merits, 
              units_killed, 
              killcount_t5,
              killcount_t1,
              mana_spent,
              units_dead,
              units_healed,
              helps_given,
              scouted,
              home_server
            `)
            .eq('scan_id', latestScan.id)
            .not('home_server', 'is', null)
            .gte('highest_power', 50000000)
            .order('highest_power', { ascending: false, nullsLast: true });

          if (statsError || !stats) continue;

          const memberCount = stats.length;
          const totalPower = stats.reduce((sum, stat) => sum + (stat.power || 0), 0);
          const totalMerits = stats.reduce((sum, stat) => sum + (stat.merits || 0), 0);
          const totalKills = stats.reduce((sum, stat) => sum + (stat.units_killed || 0), 0);
          const totalT5Kills = stats.reduce((sum, stat) => sum + (stat.killcount_t5 || 0), 0);
          const totalT1Kills = stats.reduce((sum, stat) => sum + (stat.killcount_t1 || 0), 0);
          const totalManaSpent = stats.reduce((sum, stat) => sum + (stat.mana_spent || 0), 0);
          const totalUnitsDead = stats.reduce((sum, stat) => sum + (stat.units_dead || 0), 0);
          const totalUnitsHealed = stats.reduce((sum, stat) => sum + (stat.units_healed || 0), 0);
          const totalHelpsGiven = stats.reduce((sum, stat) => sum + (stat.helps_given || 0), 0);
          const totalScouted = stats.reduce((sum, stat) => sum + (stat.scouted || 0), 0);
         
          const averagePower = memberCount > 0 ? Math.round(totalPower / memberCount) : 0;

          rankingsData.push({
            id: alliance.id,
            tag: alliance.tag,
            name: alliance.name,
            generation: alliance.generation || 'G2',
            memberCount,
            totalPower,
            averagePower,
            totalMerits,
            totalKills,
            totalT5Kills,
            totalT1Kills,
            totalManaSpent,
            totalUnitsDead,
            totalUnitsHealed,
            totalHelpsGiven,
            totalScouted,
            lastScanDate: latestScan.scan_date,
          });
        } catch (err) {
          console.error(`Error processing alliance ${alliance.tag}:`, err);
          continue;
        }
      }

      setRankings(rankingsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load rankings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadRankings();
  }, []);

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const getSortedRankings = () => {
    return [...rankings].sort((a, b) => {
      const aValue = a[activeCategory];
      const bValue = b[activeCategory];
      return bValue - aValue;
    });
  };

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-5 h-5 text-yellow-400" />;
      case 2:
        return <Medal className="w-5 h-5 text-gray-300" />;
      case 3:
        return <Medal className="w-5 h-5 text-orange-400" />;
      default:
        return <span className="w-5 h-5 flex items-center justify-center text-xs font-bold text-gray-400">#{rank}</span>;
    }
  };

  const activeConfig = categories.find(c => c.id === activeCategory);

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
            <Trophy className="w-8 h-8 text-yellow-400" />
          </motion.div>
          <p className="text-yellow-400 font-orbitron font-bold">CALCULATING RANKINGS...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadRankings} />;
  }

  const sortedRankings = getSortedRankings();

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
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10"></div>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/')}
              className="p-2 sm:p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <Trophy className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-yellow-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-yellow-400">ALLIANCE</span> <span className="text-orange-400">LEADERBOARD</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Global alliance rankings across all statistics
              </p>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Category Selection */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
        <div className="flex items-center mb-4 sm:mb-6 relative z-10">
          <Medal className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
            RANKING CATEGORIES
          </h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-7 gap-2 sm:gap-3 relative z-10">
          {categories.map((category) => (
            <motion.button
              key={category.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setActiveCategory(category.id)}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 font-orbitron min-h-[80px] sm:min-h-[100px] ${
                activeCategory === category.id
                  ? 'neon-button text-white neon-glow glass-panel'
                  : 'glass-panel-light neon-border text-gray-300 hover:text-purple-400 hover:neon-glow'
              }`}
            >
              <category.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mb-2 ${activeCategory === category.id ? 'text-white' : category.color}`} />
              <span className="text-center leading-tight">
                {category.name.toUpperCase()}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Rankings Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl neon-border relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-orange-500/5 to-red-500/5"></div>
        
        {/* Table Header */}
        <div className="p-4 sm:p-6 border-b border-gray-700/50 relative z-10">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              {activeConfig && <activeConfig.icon className={`w-6 h-6 ${activeConfig.color}`} />}
              <h3 className="text-xl sm:text-2xl font-black text-white font-orbitron">
                {activeConfig?.name.toUpperCase()} RANKINGS
              </h3>
            </div>
            <div className="text-sm text-gray-400">
              <span className="text-blue-400 font-bold">{rankings.length.toLocaleString()}</span> alliances
            </div>
          </div>
        </div>

        {/* Rankings List */}
        <div className="relative z-10 overflow-x-auto">
          <div className="min-h-[400px]">
            {sortedRankings.length > 0 ? (
              <div className="space-y-2 p-4 sm:p-6">
                {sortedRankings.map((alliance, index) => {
                  const rank = index + 1;
                  const value = alliance[activeCategory];
                  
                  return (
                    <motion.div
                      key={alliance.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.05, duration: 0.3 }}
                      whileHover={{ scale: 1.02, x: 5 }}
                      onClick={() => navigate(`/alliance/${alliance.id}`)}
                      className={`flex items-center justify-between p-4 sm:p-6 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300 cursor-pointer ${
                        rank === 1 ? 'border-yellow-400 bg-yellow-500/10' :
                        rank === 2 ? 'border-gray-300 bg-gray-500/10' :
                        rank === 3 ? 'border-orange-400 bg-orange-500/10' :
                        'hover:border-purple-400'
                      }`}
                    >
                      <div className="flex items-center space-x-3 sm:space-x-4 flex-1 min-w-0">
                        {/* Rank */}
                        <div className="flex items-center space-x-2">
                          {getRankIcon(rank)}
                          <span className={`font-bold font-orbitron text-sm sm:text-base ${
                            rank === 1 ? 'text-yellow-400' :
                            rank === 2 ? 'text-gray-300' :
                            rank === 3 ? 'text-orange-400' :
                            'text-cyan-400'
                          }`}>
                            #{rank}
                          </span>
                        </div>

                        {/* Alliance Info */}
                        <div className="flex items-center space-x-3 flex-1 min-w-0">
                          <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                          <div className="min-w-0">
                            <div className="font-bold text-white text-sm sm:text-base font-orbitron truncate">
                                [{alliance.tag}]
                            </div>
                            <div className="flex items-center space-x-2 mt-1">
                              <span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full flex-shrink-0">
                                {alliance.generation}
                              </span>
                            </div>
                            <div className="text-xs sm:text-sm text-gray-400 truncate mt-1">
                              {alliance.name}
                            </div>
                            <div className="text-xs text-gray-500 flex items-center space-x-3 mt-1">
                              <span>{alliance.memberCount} members</span>
                              <span>•</span>
                              <span>{new Date(alliance.lastScanDate).toLocaleDateString('en-US', { 
                                month: 'short', 
                                day: 'numeric' 
                              })}</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      {/* Value */}
                      <div className="text-right flex-shrink-0">
                        <div className={`text-lg sm:text-xl md:text-2xl font-black font-orbitron ${
                          rank === 1 ? 'text-yellow-400' :
                          rank === 2 ? 'text-gray-300' :
                          rank === 3 ? 'text-orange-400' :
                          activeConfig?.color || 'text-white'
                        }`}>
                          {formatNumber(value)}
                        </div>
                        <div className="text-xs text-gray-400">
                          {activeConfig?.name}
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            ) : (
              <div className="flex items-center justify-center py-12">
                <div className="text-center">
                  <Trophy className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                  <h3 className="text-lg font-bold text-gray-300 font-orbitron mb-2">NO RANKINGS AVAILABLE</h3>
                  <p className="text-gray-400">No alliance data found for rankings</p>
                </div>
              </div>
            )}
          </div>
        </div>
      </motion.div>

      {/* Statistics Summary */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.4 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
        <div className="flex items-center mb-4 sm:mb-6 relative z-10">
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-cyan-400 font-orbitron">
            LEADERBOARD STATISTICS
          </h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Trophy className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-sm text-yellow-400 font-bold font-orbitron mb-1">TOTAL ALLIANCES</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">{rankings.length}</div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-sm text-green-400 font-bold font-orbitron mb-1">TOTAL MEMBERS</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(rankings.reduce((sum, a) => sum + (a.memberCount || 0), 0))}
            </div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
            <div className="text-sm text-blue-400 font-bold font-orbitron mb-1">COMBINED POWER</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(rankings.reduce((sum, a) => sum + a.totalPower, 0))}
            </div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Sword className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <div className="text-sm text-red-400 font-bold font-orbitron mb-1">TOTAL KILLS</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(rankings.reduce((sum, a) => sum + a.totalKills, 0))}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}