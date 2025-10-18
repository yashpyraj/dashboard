import React, { useState, useEffect } from 'react';
import { Crown, Sword, Award, TrendingUp, User, Hash, Heart, Eye, HandHeart, Zap, Target, Users, Search, X, Calendar, BarChart3, RefreshCw, Download, FileText } from 'lucide-react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import Papa from 'papaparse';
import { AllianceDetail, LeaderboardEntry } from '../../types';
import { fetchLeaderboard, fetchAllianceScanDates, fetchLeaderboardForDate } from '../../utils/queries';
import { supabase } from '../../lib/supabase';
import { LoadingSpinner } from '../UI/LoadingSpinner';
import { ErrorMessage } from '../UI/ErrorMessage';
import { DataTable, Column } from '../UI/DataTable';

interface LeaderboardProps {
  alliance: AllianceDetail;
}

interface LeaderboardRow extends LeaderboardEntry {
  rank: number;
  startValue?: number;
  endValue?: number;
  changeValue?: number;
  changePercent?: number;
}

type LeaderboardTab = 'power' | 'highest_power' | 'merits' | 'units_killed' | 'killcount_t5' | 'killcount_t1' | 'units_dead' | 'units_healed' | 'scouted' | 'helps_given' | 'mana_spent' | 'mana';

export function Leaderboard({ alliance }: LeaderboardProps) {
  const navigate = useNavigate();
  const [players, setPlayers] = useState<LeaderboardRow[]>([]);
  const [activeTab, setActiveTab] = useState<LeaderboardTab>('power');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<LeaderboardRow[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  // Date range functionality
  const [viewMode, setViewMode] = useState<'current' | 'change'>('current');
  const [availableDates, setAvailableDates] = useState<string[]>([]);
  const [selectedStartDate, setSelectedStartDate] = useState<string>('');
  const [selectedEndDate, setSelectedEndDate] = useState<string>('');
  const [changeData, setChangeData] = useState<LeaderboardRow[]>([]);
  const [loadingChangeData, setLoadingChangeData] = useState(false);
  const [isExporting, setIsExporting] = useState(false);

  const loadLeaderboard = async () => {
    try {
      setLoading(true);
      setError(null);
      console.log('🔍 Loading leaderboard for alliance:', alliance.id);
      console.log('🔍 Alliance details:', alliance);
      const data = await fetchLeaderboard(alliance.id);
      console.log('📊 Leaderboard data received:', data.length, 'players');
      console.log('📋 Sample player data:', data.slice(0, 3));
      
      if (data.length === 0) {
        console.log('❌ No players found - checking scans...');
        // Check if alliance has any scans
        const { data: scans, error: scanError } = await supabase
          .from('scans')
          .select('id, scan_date')
          .eq('alliance_id', alliance.id)
          .order('scan_date', { ascending: false });
        
        console.log('📅 Available scans:', scans?.length || 0, scans);
        
        if (scans && scans.length > 0) {
          // Check if latest scan has any player stats
          const { data: stats, error: statsError } = await supabase
            .from('player_stats')
            .select('count')
            .eq('scan_id', scans[0].id);
          
          console.log('📊 Stats in latest scan:', stats, statsError);
        }
      }
      
      const rankedData = data.map((player, index) => ({
        ...player,
        rank: index + 1,
      }));
      console.log('🏆 Ranked data created:', rankedData.length, 'players');
      setPlayers(rankedData);
    } catch (err) {
      console.error('❌ Leaderboard loading error:', err);
      setError(err instanceof Error ? err.message : 'Failed to load leaderboard');
    } finally {
      setLoading(false);
    }
  };

  // Load available scan dates for the alliance
  const loadAvailableDates = async () => {
    try {
      const dates = await fetchAllianceScanDates(alliance.id);
      setAvailableDates(dates);
      
      // Set default dates if available
      if (dates.length >= 2) {
        setSelectedStartDate(dates[0]);
        setSelectedEndDate(dates[dates.length - 1]);
      }
    } catch (err) {
      console.error('Failed to load available dates:', err);
    }
  };

  // Load change data between two dates
  const loadChangeData = async () => {
    if (!selectedStartDate || !selectedEndDate) {
      setError('Please select both start and end dates');
      return;
    }

    if (selectedStartDate >= selectedEndDate) {
      setError('End date must be after start date');
      return;
    }

    try {
      setLoadingChangeData(true);
      setError(null);

      // Fetch leaderboard data for both dates
      const [startData, endData] = await Promise.all([
        fetchLeaderboardForDate(alliance.id, selectedStartDate),
        fetchLeaderboardForDate(alliance.id, selectedEndDate)
      ]);

      // Create a map of start values by player_id
      const startMap = new Map();
      startData.forEach(player => {
        startMap.set(player.player_id, player);
      });

      // Calculate changes for each player
      const changes: LeaderboardRow[] = [];
      endData.forEach((endPlayer, index) => {
        const startPlayer = startMap.get(endPlayer.player_id);
        if (startPlayer) {
          // Store all the data, we'll calculate changes dynamically based on active tab
          changes.push({
            ...endPlayer,
            rank: index + 1,
            startData: startPlayer,
            endData: endPlayer
          });
        }
      });

      setChangeData(changes);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load change data');
    } finally {
      setLoadingChangeData(false);
    }
  };

  // Export to CSV function
  const exportToCSV = async (limit: number) => {
    try {
      setIsExporting(true);
      
      const dataToExport = viewMode === 'current' ? getSortedPlayersForTab(activeTab) : getChangeDataForTab(activeTab);
      const limitedData = dataToExport.slice(0, limit);
      
      if (limitedData.length === 0) {
        setError('No data available to export');
        return;
      }

      let csvData;
      let filename;
      
      if (viewMode === 'change') {
        // Export change data
        csvData = limitedData.map(player => ({
          Rank: player.rank,
          Name: player.name,
          'Lord ID': player.lord_id || 'N/A',
          Alliance: player.alliance_tag,
          Faction: player.faction || 'Unknown',
          'Start Value': player.startValue || 0,
          'End Value': player.endValue || 0,
          'Change': player.changeValue || 0,
          'Change %': player.changePercent ? `${player.changePercent.toFixed(1)}%` : '0%',
          'Current Power': player.power || 0,
          'Highest Power': player.highest_power || 0,
          'Merits': player.merits || 0,
          'Units Killed': player.units_killed || 0,
          'T5 Kills': player.killcount_t5 || 0,
          'T1 Kills': player.killcount_t1 || 0,
          'Units Dead': player.units_dead || 0,
          'Units Healed': player.units_healed || 0,
          'Scouted': player.scouted || 0,
          'Helps Given': player.helps_given || 0,
          'Mana Spent': player.mana_spent || 0,
          'Mana Gathered': player.mana || 0
        }));
        
        const startDateStr = selectedStartDate ? new Date(selectedStartDate).toISOString().split('T')[0] : 'unknown';
        const endDateStr = selectedEndDate ? new Date(selectedEndDate).toISOString().split('T')[0] : 'unknown';
        const today = new Date().toISOString().split('T')[0];
        filename = `${alliance.tag}_changes_${activeTab}_top${limit}_${startDateStr}_to_${endDateStr}_${today}.csv`;
      } else {
        // Export current data
        csvData = limitedData.map(player => ({
          Rank: player.rank,
          Name: player.name,
          'Lord ID': player.lord_id || 'N/A',
          Alliance: player.alliance_tag,
          Faction: player.faction || 'Unknown',
          'Current Power': player.power || 0,
          'Highest Power': player.highest_power || 0,
          'Merits': player.merits || 0,
          'Units Killed': player.units_killed || 0,
          'T5 Kills': player.killcount_t5 || 0,
          'T1 Kills': player.killcount_t1 || 0,
          'Units Dead': player.units_dead || 0,
          'Units Healed': player.units_healed || 0,
          'Scouted': player.scouted || 0,
          'Helps Given': player.helps_given || 0,
          'Mana Spent': player.mana_spent || 0,
          'Mana Gathered': player.mana || 0,
          'Town Center': player.town_center || 0,
          'Home Server': player.home_server || 'Unknown',
          'Map ID': player.map_id || 0
        }));
        
        const today = new Date().toISOString().split('T')[0];
        filename = `${alliance.tag}_current_${activeTab}_top${limit}_${today}.csv`;
      }

      // Convert to CSV
      const csv = Papa.unparse(csvData);
      
      // Create and download file
      const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
    } catch (err) {
      console.error('Export error:', err);
      setError(err instanceof Error ? err.message : 'Failed to export data');
    } finally {
      setIsExporting(false);
    }
  };

  useEffect(() => {
    loadLeaderboard();
    loadAvailableDates();
  }, [alliance.id]);

  // Handle search functionality
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults([]);
      setIsSearching(false);
      return;
    }

    setIsSearching(true);
    const query = searchQuery.toLowerCase().trim();
    
    // Search through players in the current active tab only
    const currentTabPlayers = getSortedPlayersForTab(activeTab);

    // Filter by name or lord_id
    const results = currentTabPlayers.filter(player => 
      player.name.toLowerCase().includes(query) ||
      (player.lord_id && player.lord_id.toLowerCase().includes(query))
    );

    setSearchResults(results.slice(0, 10)); // Limit to top 10 results
  }, [searchQuery, players, activeTab]);

  const clearSearch = () => {
    setSearchQuery('');
    setSearchResults([]);
    setIsSearching(false);
  };

  const formatNumber = (num: number | null) => {
    if (!num) return '0';
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const tabs = [
    { id: 'power' as const, name: 'Current Power', icon: TrendingUp },
    { id: 'highest_power' as const, name: 'Highest Power', icon: Crown },
    { id: 'merits' as const, name: 'Merits', icon: Award },
    { id: 'units_killed' as const, name: 'Total Kills', icon: Sword },
    { id: 'killcount_t5' as const, name: 'T5 Kills', icon: Crown },
    { id: 'killcount_t1' as const, name: 'T1 Kills', icon: Target },
    { id: 'units_dead' as const, name: 'Deaths', icon: Sword },
    { id: 'units_healed' as const, name: 'Healed', icon: Heart },
    { id: 'scouted' as const, name: 'Scouted', icon: Eye },
    { id: 'helps_given' as const, name: 'Helps', icon: HandHeart },
    { id: 'mana_spent' as const, name: 'Mana Spent', icon: Zap },
    { id: 'mana' as const, name: 'Mana Gathered', icon: Zap },
  ];

  const combatColumns: Column<LeaderboardRow>[] = [
    {
      key: 'rank',
      label: 'RANK',
      sortable: true,
      render: (rank: number) => (
        <div className="flex items-center space-x-1 sm:space-x-2">
          {rank === 1 && (
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity }}
            >
              <Crown className="w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 text-yellow-400 animate-neon-pulse" />
            </motion.div>
          )}
          {rank === 2 && <Award className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />}
          {rank === 3 && <Award className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />}
          <span className="font-bold text-cyan-400 font-orbitron text-xs sm:text-sm">#{rank}</span>
        </div>
      ),
      className: 'text-gray-300 font-medium',
    },
    {
      key: 'name',
      label: 'OPERATIVE',
      sortable: true,
      render: (name: string, row: LeaderboardRow) => (
        <div className="flex items-center space-x-2">
          <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
          <div>
            <div className="font-bold text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
              {name}
            </div>
            <div className="text-xs text-gray-400 hidden sm:block">
              {row.faction || 'UNKNOWN FACTION'}
            </div>
          </div>
        </div>
      ),
    },
    {
      key: 'lord_id',
      label: 'LORD ID',
      sortable: false,
      render: (lordId: string | null, row: LeaderboardRow) => (
        <div className="flex items-center space-x-1">
          <Hash className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
          <span className="font-mono text-xs sm:text-sm text-purple-400 truncate max-w-[80px] sm:max-w-none">
            {lordId ? lordId.substring(0, 8) + (lordId.length > 8 ? '...' : '') : 'N/A'}
          </span>
        </div>
      ),
    },
    {
      key: 'player_id',
      label: 'ACTIONS',
      sortable: false,
      render: (playerId: string, row: LeaderboardRow) => (
        <div className="flex justify-center">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={(e) => {
              e.stopPropagation();
              navigate(`/alliance/${alliance.id}/player/${row.player_id}`);
            }}
            title="View player details"
            className="p-1.5 sm:p-2 glass-panel-light rounded-lg neon-border hover:neon-glow transition-all duration-300"
          >
            <Eye className="w-3 h-3 sm:w-4 sm:h-4 text-pink-400" />
          </motion.button>
        </div>
      ),
    },
  ];

  // Calculate change data for current active tab
  const getChangeDataForTab = (tab: LeaderboardTab) => {
    if (changeData.length === 0) return [];
    
    const changesWithCalculations = changeData.map(player => {
      const startValue = (player.startData as any)?.[tab] || 0;
      const endValue = (player.endData as any)?.[tab] || 0;
      const changeValue = endValue - startValue;
      const changePercent = startValue > 0 ? ((changeValue / startValue) * 100) : 0;
      
      return {
        ...player,
        startValue,
        endValue,
        changeValue,
        changePercent
      };
    });
    
    // Sort by change value (highest change first)
    const sortedChanges = changesWithCalculations.sort((a, b) => (b.changeValue || 0) - (a.changeValue || 0));
    
    // Re-rank based on change
    return sortedChanges.map((player, index) => ({
      ...player,
      rank: index + 1
    }));
  };

  const getSortedPlayersForTab = (tab: LeaderboardTab) => {
    console.log('🔄 Getting sorted players for tab:', tab, 'with', players.length, 'total players');
    const sortedPlayers = [...players].sort((a, b) => {
      const aValue = (a as any)[tab] || 0;
      const bValue = (b as any)[tab] || 0;
      return bValue - aValue;
    }).map((player, index) => ({
      ...player,
      rank: index + 1,
    }));
    
    console.log('📊 Sorted players for', tab, ':', sortedPlayers.length, 'players');
    if (sortedPlayers.length > 0) {
      console.log('🥇 Top 3 players:', sortedPlayers.slice(0, 3).map(p => ({ name: p.name, value: (p as any)[tab] })));
    }
    return sortedPlayers;
  };

  const getColumnsForTab = (tab: LeaderboardTab): Column<LeaderboardRow>[] => {
    const baseColumns = combatColumns;
    
    let valueColumn: Column<LeaderboardRow>;
    
    if (viewMode === 'change') {
      valueColumn = {
        key: 'changeValue',
        label: `${tabs.find(t => t.id === tab)?.name.toUpperCase()} CHANGE`,
        sortable: true,
        render: (changeValue: number | null, row: LeaderboardRow) => (
          <div className="text-right">
            <div className={`font-bold font-orbitron text-xs sm:text-sm ${
              (changeValue || 0) > 0 ? 'text-green-400' : 
              (changeValue || 0) < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {(changeValue || 0) > 0 ? '+' : ''}{formatNumber(changeValue)}
            </div>
            <div className="text-xs text-gray-400">
              {formatNumber(row.startValue)} → {formatNumber(row.endValue)}
            </div>
            <div className={`text-xs font-bold ${
              (row.changePercent || 0) > 0 ? 'text-green-400' : 
              (row.changePercent || 0) < 0 ? 'text-red-400' : 'text-gray-400'
            }`}>
              {(row.changePercent || 0) > 0 ? '+' : ''}{(row.changePercent || 0).toFixed(1)}%
            </div>
          </div>
        ),
        className: 'text-right',
      };
    } else {
      valueColumn = {
        key: tab,
        label: tabs.find(t => t.id === tab)?.name.toUpperCase() || tab.toUpperCase(),
        sortable: true,
        render: (value: number | null, row: LeaderboardRow) => (
          <div className="text-right">
            <span className="font-bold text-pink-400 font-orbitron text-xs sm:text-sm">
              {formatNumber((row as any)[tab])}
            </span>
          </div>
        ),
        className: 'text-right',
      };
    }
    
    return [...baseColumns, valueColumn];
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
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
          >
            <Crown className="w-8 h-8 text-pink-400" />
          </motion.div>
          <p className="text-blue-400 font-orbitron">RANKING OPERATIVES...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return <ErrorMessage message={error} onRetry={loadLeaderboard} />;
  }

  const currentData = viewMode === 'current' ? getSortedPlayersForTab(activeTab) : getChangeDataForTab(activeTab);
  const displayData = isSearching ? searchResults : currentData;

  return (
    <motion.div 
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="space-y-6"
    >
      <div className="flex flex-col space-y-4">
        <motion.h3 
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="text-xl font-black text-pink-400 font-orbitron"
        >
          OPERATIVE RANKINGS
        </motion.h3>
        
        {/* Tab Navigation */}
        <motion.div 
          initial={{ opacity: 0, y: -10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="space-y-4"
        >
          {/* View Mode Toggle */}
          <div className="glass-panel-light rounded-xl p-4 neon-border">
            <div className="flex flex-col space-y-4">
              <div className="flex items-center justify-between">
                <h4 className="text-sm font-bold text-cyan-400 font-orbitron">VIEW MODE</h4>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('current')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 font-orbitron ${
                      viewMode === 'current'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'glass-panel-light neon-border text-gray-300 hover:text-pink-400'
                    }`}
                  >
                    CURRENT VALUES
                  </motion.button>
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setViewMode('change')}
                    className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 font-orbitron ${
                      viewMode === 'change'
                        ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                        : 'glass-panel-light neon-border text-gray-300 hover:text-pink-400'
                    }`}
                  >
                    PERIOD CHANGES
                  </motion.button>
                </div>
              </div>
              
              {/* Export Controls */}
              <div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
                <h4 className="text-sm font-bold text-green-400 font-orbitron">EXPORT DATA</h4>
                <div className="flex items-center space-x-2">
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportToCSV(50)}
                    disabled={isExporting || (viewMode === 'current' ? players.length === 0 : changeData.length === 0)}
                    className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all duration-300"
                  >
                    <Download className="w-3 h-3" />
                    <span>TOP 50</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportToCSV(100)}
                    disabled={isExporting || (viewMode === 'current' ? players.length === 0 : changeData.length === 0)}
                    className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all duration-300"
                  >
                    <Download className="w-3 h-3" />
                    <span>TOP 100</span>
                  </motion.button>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => exportToCSV(200)}
                    disabled={isExporting || (viewMode === 'current' ? players.length === 0 : changeData.length === 0)}
                    className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all duration-300"
                  >
                    <Download className="w-3 h-3" />
                    <span>TOP 200</span>
                  </motion.button>
                </div>
              </div>
              
              {isExporting && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex items-center justify-center py-2 text-sm text-blue-400 font-orbitron"
                >
                  <FileText className="w-4 h-4 mr-2 animate-pulse" />
                  GENERATING CSV FILE...
                </motion.div>
              )}
              
              {/* Date Range Selector */}
              {viewMode === 'change' && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4"
                >
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-purple-400" />
                    <span className="text-sm text-purple-400 font-bold font-orbitron">FROM:</span>
                    <select
                      value={selectedStartDate}
                      onChange={(e) => setSelectedStartDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                    >
                      <option value="">Select start date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <div className="flex items-center space-x-2">
                    <Calendar className="w-4 h-4 text-blue-400" />
                    <span className="text-sm text-blue-400 font-bold font-orbitron">TO:</span>
                    <select
                      value={selectedEndDate}
                      onChange={(e) => setSelectedEndDate(e.target.value)}
                      className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                    >
                      <option value="">Select end date</option>
                      {availableDates.map(date => (
                        <option key={date} value={date}>
                          {new Date(date).toLocaleDateString('en-US', { 
                            month: 'short', 
                            day: 'numeric',
                            year: 'numeric'
                          })}
                        </option>
                      ))}
                    </select>
                  </div>
                  
                  <motion.button
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={loadChangeData}
                    disabled={!selectedStartDate || !selectedEndDate || loadingChangeData}
                    className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs font-orbitron transition-all duration-300"
                  >
                    {loadingChangeData ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <BarChart3 className="w-4 h-4" />
                    )}
                    <span>COMPARE</span>
                  </motion.button>
                </motion.div>
              )}
            </div>
          </div>

          {/* Search Bar */}
          <div className="glass-panel-light rounded-xl p-4 neon-border">
            <div className="flex items-center space-x-4">
              <div className="flex-1 relative">
                <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                <input
                  type="text"
                  placeholder="Search by player name or Lord ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-12 pr-12 py-3 bg-gray-800 border border-gray-600 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-pink-500 focus:border-pink-500 transition-all duration-300"
                />
                {searchQuery && (
                  <motion.button
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    onClick={clearSearch}
                    className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-pink-400 transition-colors duration-300"
                  >
                    <X className="w-5 h-5" />
                  </motion.button>
                )}
              </div>
              {isSearching && (
                <div className="flex items-center text-sm text-blue-400 font-bold font-orbitron">
                  <Search className="w-4 h-4 mr-2" />
                  {searchResults.length} FOUND
                </div>
              )}
            </div>
          </div>

          {/* Search Results */}
          {isSearching && searchResults.length > 0 && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-pink-500/10 via-purple-500/10 to-blue-500/10"></div>
              <div className="flex items-center mb-4 relative z-10">
                <Search className="w-5 h-5 text-pink-400 mr-2" />
                <h4 className="text-lg font-bold text-pink-400 font-orbitron">SEARCH RESULTS</h4>
                <span className="ml-auto text-sm text-gray-400">
                  Found {searchResults.length} players in {tabs.find(t => t.id === activeTab)?.name} rankings
                </span>
              </div>
              <div className="space-y-3 relative z-10">
                {searchResults.map((player) => (
                  <motion.div
                    key={player.player_id}
                    initial={{ opacity: 0, x: -20 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: 0.1 }}
                    className="flex items-center justify-between p-4 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300 cursor-pointer"
                    onClick={() => navigate(`/alliance/${alliance.id}/player/${player.player_id}`)}
                  >
                    <div className="flex items-center space-x-2 sm:space-x-4 flex-1 min-w-0">
                      <div className="flex items-center space-x-1 sm:space-x-2">
                        {player.rank === 1 && (
                          <Crown className="w-4 h-4 sm:w-5 sm:h-5 text-yellow-400" />
                        )}
                        <span className="font-bold text-cyan-400 font-orbitron text-xs sm:text-sm">
                          #{player.rank}
                        </span>
                        <span className="text-xs text-purple-400 font-bold px-1 sm:px-2 py-1 glass-panel rounded-lg hidden md:inline">
                          {tabs.find(t => t.id === activeTab)?.name.substring(0, 8)}
                        </span>
                      </div>
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
                        <div>
                          <div className="font-bold text-white text-xs sm:text-sm md:text-base truncate max-w-[80px] sm:max-w-[120px] md:max-w-[200px]">
                            {player.name}
                          </div>
                          <div className="text-xs text-gray-400 flex items-center hidden md:flex">
                            <Hash className="w-3 h-3 mr-1" />
                            {player.lord_id?.substring(0, 8) || 'N/A'}
                          </div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <div className="text-xs sm:text-sm font-bold text-pink-400 font-orbitron">
                        {formatNumber((player as any)[activeTab])}
                      </div>
                      <div className="text-xs text-gray-400 hidden md:block">
                        {tabs.find(t => t.id === activeTab)?.name}
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          )}

          {/* No Search Results */}
          {isSearching && searchResults.length === 0 && searchQuery.trim() && (
            <motion.div 
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel-light rounded-xl neon-border p-4 sm:p-6 text-center"
            >
              <Search className="w-8 h-8 sm:w-12 sm:h-12 text-gray-400 mx-auto mb-2 sm:mb-3" />
              <h4 className="text-base sm:text-lg font-bold text-gray-300 font-orbitron mb-2">NO RESULTS FOUND</h4>
              <p className="text-xs sm:text-sm text-gray-400 px-2">
                No players found matching "{searchQuery}" in {tabs.find(t => t.id === activeTab)?.name} rankings
              </p>
            </motion.div>
          )}

          {/* Tab Grid */}
          <div className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1 sm:gap-2 ${isSearching ? 'opacity-50' : ''}`}>
            {tabs.map((tab) => (
              <motion.button
                key={tab.id}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => setActiveTab(tab.id)}
                disabled={isSearching}
                className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl font-bold text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-orbitron min-h-[60px] sm:min-h-[80px] ${
                  activeTab === tab.id
                    ? 'bg-gradient-to-r from-purple-500 to-pink-500 text-white'
                    : 'glass-panel-light neon-border text-gray-300 hover:text-pink-400 hover:neon-glow disabled:opacity-50 disabled:cursor-not-allowed'
                }`}
              >
                <tab.icon className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mb-1 sm:mb-2 ${activeTab === tab.id ? 'text-white' : 'text-gray-400'}`} />
                <span className="text-center leading-tight text-xs sm:text-xs">
                  {tab.name.length > 8 ? tab.name.substring(0, 6) + '...' : tab.name.toUpperCase()}
                </span>
              </motion.button>
            ))}
          </div>
          
          {/* Stats Summary */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            className={`flex flex-col sm:flex-row items-start sm:items-center justify-between glass-panel-light rounded-xl p-3 sm:p-4 neon-border space-y-2 sm:space-y-0 ${isSearching ? 'opacity-50' : ''}`}
          >
            <div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
              <div className="flex items-center">
                <Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 mr-1 sm:mr-2" />
                <span className="text-xs sm:text-sm text-blue-400 font-bold font-orbitron">
                  {isSearching ? 
                    `${searchResults.length} FOUND IN ${viewMode === 'current' ? tabs.find(t => t.id === activeTab)?.name.toUpperCase() : `${tabs.find(t => t.id === activeTab)?.name.toUpperCase()} CHANGES`}` : 
                    viewMode === 'current' ? `${players.length} ACTIVE OPERATIVES` : `${changeData.length} PLAYERS WITH CHANGES`
                  }
                </span>
              </div>
              {!isSearching && (
                <div className="flex items-center">
                  <TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 mr-1 sm:mr-2" />
                  <span className="text-xs sm:text-sm text-purple-400 font-bold font-orbitron">
                    VIEWING: {viewMode === 'current' ? tabs.find(t => t.id === activeTab)?.name.toUpperCase() : `${tabs.find(t => t.id === activeTab)?.name.toUpperCase()} CHANGES`}
                  </span>
                </div>
              )}
            </div>
            <div className="text-xs text-gray-400 font-medium self-end sm:self-auto">
              {isSearching ? 'SEARCH ACTIVE' : 
               viewMode === 'current' ? 'TOP 210 BY HIGHEST POWER' : 
               `PERIOD: ${selectedStartDate ? new Date(selectedStartDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''} - ${selectedEndDate ? new Date(selectedEndDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : ''}`}
            </div>
          </motion.div>
        </motion.div>
      </div>

      {/* Data Table */}
      {!isSearching && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
        >
          <DataTable
            data={displayData}
            columns={getColumnsForTab(activeTab)}
            loading={false}
            pageSize={25}
            pageSizeOptions={[25, 50, 100]}
          />
        </motion.div>
      )}

      {/* No Data Messages */}
      {!isSearching && displayData.length === 0 && !loading && !loadingChangeData && (
        <motion.div 
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          className="text-center py-8 sm:py-12"
        >
          <motion.div
            animate={{ pulse: [1, 1.1, 1] }}
            transition={{ duration: 2, repeat: Infinity }}
            className="glass-panel-light rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-6 neon-border"
          >
            <User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-400" />
          </motion.div>
          <h3 className="text-lg sm:text-xl font-bold text-pink-400 font-orbitron mb-2">
            {viewMode === 'change' ? 'NO CHANGE DATA' : 'NO OPERATIVE DATA'}
          </h3>
          <p className="text-sm sm:text-base text-blue-400 px-4">
            {viewMode === 'change' 
              ? 'Select date range and click COMPARE to see changes'
              : 'No ranking data available for this alliance'
            }
          </p>
        </motion.div>
      )}

      {/* Loading Change Data */}
      {loadingChangeData && (
        <motion.div 
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center justify-center py-12"
        >
          <div className="text-center">
            <motion.div
              animate={{ rotate: 360 }}
              transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
            >
              <BarChart3 className="w-8 h-8 text-cyan-400" />
            </motion.div>
            <p className="text-cyan-400 font-orbitron font-bold">CALCULATING CHANGES...</p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}