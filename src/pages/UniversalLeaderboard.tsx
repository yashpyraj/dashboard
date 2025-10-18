import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Crown, 
  Award, 
  Sword, 
  Target, 
  Heart, 
  Zap, 
  User, 
  Shield, 
  Eye, 
  Hash, 
  ArrowLeft,
  Trophy,
  Users,
  TrendingUp
} from 'lucide-react';
import { motion } from 'framer-motion';
import { supabase } from '../lib/supabase';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';
import { DataTable, Column } from '../components/UI/DataTable';

interface UniversalPlayer {
  player_id: string;
  name: string;
  alliance_tag: string;
  alliance_id: string;
  highest_power: number | null;
  power: number | null;
  merits: number | null;
  units_killed: number | null;
  killcount_t5: number | null;
  killcount_t1: number | null;
  killcount_t4: number | null;
  mana_spent: number | null;
  mana: number | null;
  units_dead: number | null;
  faction: string | null;
  lord_id: string | null;
  home_server: string | null;
  scan_date: string;
  rank: number;
}

type UniversalLeaderboardTab = 'highest_power' | 'merits' | 'units_killed' | 'killcount_t5' | 'killcount_t1' | 'killcount_t4' | 'mana_spent' | 'mana' | 'units_dead';

export function UniversalLeaderboard() {
  const navigate = useNavigate();
  const [universalPlayers, setUniversalPlayers] = useState<UniversalPlayer[]>([]);
  const [universalActiveTab, setUniversalActiveTab] = useState<UniversalLeaderboardTab>('highest_power');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const loadUniversalLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);

      console.log('Loading universal leaderboard - getting ALL alliances...');
      
      // Get all alliances
      const { data: alliances, error: alliancesError } = await supabase
        .from('alliances')
        .select('id, tag, name, generation');

      if (alliancesError) throw alliancesError;
      console.log(`Found ${alliances?.length || 0} alliances`);

      const allPlayersData: UniversalPlayer[] = [];

      // For each alliance, get their latest scan and top players
      for (const alliance of alliances || []) {
        try {
          // Get latest scan for this alliance
          const { data: latestScan, error: scanError } = await supabase
            .from('scans')
            .select('id, scan_date')
            .eq('alliance_id', alliance.id)
            .order('scan_date', { ascending: false })
            .limit(1)
           .maybeSingle();

          if (scanError || !latestScan) {
            console.log(`No scans found for alliance ${alliance.tag}`);
            continue;
          }

          // Get ALL players from this alliance's latest scan (no limit)
          const { data: alliancePlayers, error: playersError } = await supabase
            .from('player_stats')
            .select(`
              player_id,
              name,
              alliance_tag,
              highest_power,
              power,
              merits,
              units_killed,
              killcount_t5,
              killcount_t1,
              killcount_t4,
              mana_spent,
              mana,
              units_dead,
              home_server,
              players!inner(faction, lord_id)
            `)
            .eq('scan_id', latestScan.id)
            .not('home_server', 'is', null);

          if (playersError) {
            console.error(`Error loading players for ${alliance.tag}:`, playersError);
            continue;
          }

          // Transform and add to global list
          const transformedPlayers = (alliancePlayers || []).map(stat => ({
            player_id: stat.player_id,
            name: stat.name,
            alliance_tag: stat.alliance_tag,
            alliance_id: alliance.id,
            highest_power: stat.highest_power,
            power: stat.power,
            merits: stat.merits,
            units_killed: stat.units_killed,
            killcount_t5: stat.killcount_t5,
            killcount_t1: stat.killcount_t1,
            killcount_t4: stat.killcount_t4,
            mana_spent: stat.mana_spent,
            mana: stat.mana,
            units_dead: stat.units_dead,
            faction: (stat.players as any)?.faction || null,
            lord_id: (stat.players as any)?.lord_id || null,
            home_server: stat.home_server,
            scan_date: latestScan.scan_date,
            rank: 0, // Will be set after sorting
          }));

          allPlayersData.push(...transformedPlayers);
          console.log(`Loaded ${transformedPlayers.length} players from ${alliance.tag}`);

        } catch (err) {
          console.error(`Error processing alliance ${alliance.tag}:`, err);
          continue;
        }
      }

      console.log('Total players loaded from all alliances:', allPlayersData.length);
      console.log('Sample T1 kills values:', allPlayersData.slice(0, 10).map(p => ({ name: p.name, alliance: p.alliance_tag, t1: p.killcount_t1 })));
      
      // Find the highest T1 killer for verification
      const topT1Killer = allPlayersData.reduce((max, player) => 
        (player.killcount_t1 || 0) > (max.killcount_t1 || 0) ? player : max
      , allPlayersData[0]);
      
      if (topT1Killer) {
        console.log('Top T1 killer found:', {
          name: topT1Killer.name,
          alliance: topT1Killer.alliance_tag,
          t1_kills: topT1Killer.killcount_t1,
          scan_date: topT1Killer.scan_date
        });
      }

      setUniversalPlayers(allPlayersData);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load universal leaderboard');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUniversalLeaderboard();
  }, []);

  const getSortedUniversalPlayers = () => {
    const sorted = [...universalPlayers].sort((a, b) => {
      const aValue = (a as any)[universalActiveTab] || 0;
      const bValue = (b as any)[universalActiveTab] || 0;
      return bValue - aValue;
    });
    
    // Debug logging for T1 kills
    if (universalActiveTab === 'killcount_t1') {
      console.log('Top 10 T1 killers:', sorted.slice(0, 10).map(p => ({ 
        name: p.name, 
        alliance: p.alliance_tag, 
        t1: p.killcount_t1 
      })));
    }
    
    return sorted.slice(0, 50).map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
  };

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const universalTabs = [
    { id: 'highest_power' as const, name: 'Highest Power', icon: Crown, color: 'text-yellow-400' },
    { id: 'merits' as const, name: 'Merits', icon: Award, color: 'text-purple-400' },
    { id: 'units_killed' as const, name: 'Total Kills', icon: Sword, color: 'text-red-400' },
    { id: 'killcount_t5' as const, name: 'T5 Kills', icon: Crown, color: 'text-orange-400' },
    { id: 'killcount_t1' as const, name: 'T1 Kills', icon: Target, color: 'text-green-400' },
    { id: 'killcount_t4' as const, name: 'T4 Kills', icon: Target, color: 'text-blue-400' },
    { id: 'mana_spent' as const, name: 'Mana Spent', icon: Zap, color: 'text-purple-400' },
    { id: 'mana' as const, name: 'Mana Gathered', icon: Zap, color: 'text-cyan-400' },
    { id: 'units_dead' as const, name: 'Deaths', icon: Heart, color: 'text-pink-400' },
  ];

  const universalColumns: Column<UniversalPlayer>[] = [
    {
      key: 'rank',
      label: 'RANK',
      sortable: false,
      render: (rank: number) => (
        <div className="flex items-center space-x-2">
          {rank === 1 && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-5 h-5 text-yellow-400 animate-neon-pulse" />
            </motion.div>
          )}
          {rank === 2 && <Award className="w-4 h-4 text-gray-300" />}
          {rank === 3 && <Award className="w-4 h-4 text-orange-400" />}
          <span className="font-bold text-cyan-400 font-orbitron">#{rank}</span>
        </div>
      ),
    },
    {
      key: 'name',
      label: 'OPERATIVE',
      sortable: false,
      render: (name: string, row: UniversalPlayer) => (
        <div className="flex items-center space-x-3">
          <User className="w-4 h-4 text-blue-400" />
          <div>
            <div className="font-bold text-white text-sm truncate max-w-[150px]">
              {name}
            </div>
            <div className="text-xs text-gray-400">
              {row.faction || 'UNKNOWN FACTION'}
            </div>
            <div className="flex items-center mt-1">
              <Hash className="w-3 h-3 text-purple-400 mr-1" />
              <span className="font-mono text-xs text-purple-400">
                {row.lord_id?.substring(0, 8) || 'N/A'}
              </span>
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'alliance_tag',
      label: 'ALLIANCE',
      sortable: false,
      render: (tag: string, row: UniversalPlayer) => (
        <div className="flex items-center space-x-2">
          <Shield className="w-4 h-4 text-orange-400" />
          <span className="font-bold text-orange-400 font-orbitron">[{tag}]</span>
        </div>
      ),
    },
    {
      key: universalActiveTab,
      label: universalTabs.find(t => t.id === universalActiveTab)?.name.toUpperCase() || 'VALUE',
      sortable: false,
      render: (value: number | null, row: UniversalPlayer) => {
        if (universalActiveTab === 'highest_power') {
          return (
            <div className="text-right">
              <div className="font-bold text-yellow-400 font-orbitron text-sm">
                {formatNumber(row.highest_power)} HP
              </div>
              <div className="font-bold text-blue-400 font-orbitron text-xs">
                {formatNumber(row.power)} CP
              </div>
            </div>
          );
        }
        return (
          <div className="text-right">
            <span className="font-bold text-pink-400 font-orbitron">
              {formatNumber((row as any)[universalActiveTab])}
            </span>
          </div>
        );
      },
      className: 'text-right',
    },
    {
      key: 'player_id',
      label: 'ACTIONS',
      sortable: false,
      render: (playerId: string, row: UniversalPlayer) => (
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/alliance/${row.alliance_id}/player/${row.player_id}`);
            }}
            title="View player details"
            className="p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
          >
            <Eye className="w-4 h-4 text-pink-400" />
          </motion.button>
        </div>
      ),
    },
  ];

  const activeConfig = universalTabs.find(t => t.id === universalActiveTab);

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
            <Crown className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-purple-400 font-orbitron font-bold">CALCULATING GLOBAL RANKINGS...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadUniversalLeaderboard} />;
  }

  const sortedPlayers = getSortedUniversalPlayers();

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
              className="p-2 sm:p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <Crown className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-purple-400">UNIVERSAL</span> <span className="text-pink-400">LEADERBOARD</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Top 50 elite operatives across all alliances and generations
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
          <Trophy className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
            RANKING CATEGORIES
          </h3>
        </div>
        
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-8 gap-2 sm:gap-3 relative z-10">
          {universalTabs.map((tab) => (
            <motion.button
              key={tab.id}
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setUniversalActiveTab(tab.id)}
              className={`flex flex-col items-center justify-center p-3 sm:p-4 rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 font-orbitron min-h-[80px] sm:min-h-[100px] ${
                universalActiveTab === tab.id
                  ? 'neon-button text-white neon-glow glass-panel'
                  : 'glass-panel-light neon-border text-gray-300 hover:text-purple-400 hover:neon-glow'
              }`}
            >
              <tab.icon className={`w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 mb-2 ${universalActiveTab === tab.id ? 'text-white' : tab.color}`} />
              <span className="text-center leading-tight">
                {tab.name.length > 8 ? tab.name.substring(0, 6) + '...' : tab.name.toUpperCase()}
              </span>
            </motion.button>
          ))}
        </div>
      </motion.div>

      {/* Leaderboard Table */}
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="glass-panel rounded-2xl neon-border relative overflow-hidden"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/5 via-purple-500/5 to-pink-500/5"></div>
        
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
              <span className="text-purple-400 font-bold">50</span> elite operatives
            </div>
          </div>
        </div>

        <div className="p-3 sm:p-4 md:p-6 relative z-10">
          <DataTable
            data={sortedPlayers}
            columns={universalColumns}
            loading={false}
            pageSize={25}
            pageSizeOptions={[25, 50]}
          />
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
          <TrendingUp className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 mr-2 sm:mr-3" />
          <h3 className="text-lg sm:text-xl font-black text-cyan-400 font-orbitron">
            GLOBAL STATISTICS
          </h3>
        </div>
        
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 sm:gap-6 relative z-10">
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Crown className="w-5 h-5 text-yellow-400 mx-auto mb-2" />
            <div className="text-sm text-yellow-400 font-bold font-orbitron mb-1">TOP POWER</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(sortedPlayers[0]?.highest_power || 0)}
            </div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Award className="w-5 h-5 text-purple-400 mx-auto mb-2" />
            <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">TOP MERITS</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(Math.max(...universalPlayers.map(p => p.merits || 0)))}
            </div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Sword className="w-5 h-5 text-red-400 mx-auto mb-2" />
            <div className="text-sm text-red-400 font-bold font-orbitron mb-1">TOP KILLS</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {formatNumber(Math.max(...universalPlayers.map(p => p.units_killed || 0)))}
            </div>
          </div>
          
          <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
            <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
            <div className="text-sm text-green-400 font-bold font-orbitron mb-1">ALLIANCES</div>
            <div className="text-xl sm:text-2xl font-black text-white font-orbitron">
              {new Set(universalPlayers.map(p => p.alliance_tag)).size}
            </div>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
}