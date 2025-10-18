import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sword, Shield, Users, TrendingUp, Award, Target, Plus, X, ArrowRight, ArrowLeft, Search, Scale, Info, Calculator, Skull, Heart, Shuffle } from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alliance } from '../types';
import { fetchAlliances, fetchLeaderboard } from '../utils/queries';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';

interface MatchupConfig {
  camps: 2 | 3 | 4;
  teamA: Alliance[];
  teamB: Alliance[];
}

interface TeamStats {
  totalPower: number;
  memberCount: number;
  averagePower: number;
}

interface FairnessAnalysis {
  powerDifference: number;
  powerRatio: number;
  memberDifference: number;
  fairnessScore: number; // 0-100, higher is more fair
  verdict: 'very-fair' | 'fair' | 'unbalanced' | 'very-unbalanced';
}

const MATCHUP_STORAGE_KEY = 'yammy_matchup_config';

export function CreateMatchup() {
  const navigate = useNavigate();
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedCamps, setSelectedCamps] = useState<2 | 3 | null>(null);
  const [memeMode, setMemeMode] = useState(false);
  const [allianceSearchQuery, setAllianceSearchQuery] = useState('');
  const [matchup, setMatchup] = useState<MatchupConfig>({
    camps: 2,
    teamA: [],
    teamB: []
  });
  const [isDiploWin, setIsDiploWin] = useState(false);
  const [teamAStats, setTeamAStats] = useState<TeamStats | null>(null);
  const [teamBStats, setTeamBStats] = useState<TeamStats | null>(null);
  const [fairnessAnalysis, setFairnessAnalysis] = useState<FairnessAnalysis | null>(null);
  const [loadingStats, setLoadingStats] = useState(false);
  const [autoMatchupLoading, setAutoMatchupLoading] = useState(false);

  // Load saved matchup state on component mount
  useEffect(() => {
    try {
      const savedMatchup = localStorage.getItem(MATCHUP_STORAGE_KEY);
      if (savedMatchup) {
        const parsed = JSON.parse(savedMatchup);
        setMatchup(parsed.matchup);
        setSelectedCamps(parsed.selectedCamps);
        setIsDiploWin(parsed.isDiploWin);
        setMemeMode(parsed.memeMode || false);
        console.log('Restored matchup state:', parsed);
      }
    } catch (err) {
      console.error('Failed to restore matchup state:', err);
      // Clear invalid data
      localStorage.removeItem(MATCHUP_STORAGE_KEY);
    }
  }, []);

  // Save matchup state whenever it changes
  useEffect(() => {
    if (selectedCamps !== null) {
      const stateToSave = {
        matchup,
        selectedCamps,
        isDiploWin,
        memeMode,
        timestamp: Date.now()
      };
      localStorage.setItem(MATCHUP_STORAGE_KEY, JSON.stringify(stateToSave));
    }
  }, [matchup, selectedCamps, isDiploWin, memeMode]);

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

  useEffect(() => {
    loadAlliances();
  }, []);

  // Calculate team stats whenever teams change
  useEffect(() => {
    if (matchup.teamA.length > 0 || matchup.teamB.length > 0) {
      calculateTeamStats();
    } else {
      setTeamAStats(null);
      setTeamBStats(null);
      setFairnessAnalysis(null);
    }
  }, [matchup.teamA, matchup.teamB]);

  const calculateTeamStats = async () => {
    try {
      setLoadingStats(true);
      
      const [teamAData, teamBData] = await Promise.all([
        Promise.all(matchup.teamA.map(alliance => fetchLeaderboard(alliance.id))),
        Promise.all(matchup.teamB.map(alliance => fetchLeaderboard(alliance.id)))
      ]);
      
      // Flatten and filter battle-ready players (50M+)
      const teamAPlayers = teamAData.flat().filter(p => (p.highest_power || 0) >= 50_000_000);
      const teamBPlayers = teamBData.flat().filter(p => (p.highest_power || 0) >= 50_000_000);
      
      const teamAStatsCalc: TeamStats = {
        totalPower: teamAPlayers.reduce((sum, p) => sum + (p.power || 0), 0),
        memberCount: teamAPlayers.length,
        averagePower: teamAPlayers.length > 0 ? Math.round(teamAPlayers.reduce((sum, p) => sum + (p.power || 0), 0) / teamAPlayers.length) : 0
      };
      
      const teamBStatsCalc: TeamStats = {
        totalPower: teamBPlayers.reduce((sum, p) => sum + (p.power || 0), 0),
        memberCount: teamBPlayers.length,
        averagePower: teamBPlayers.length > 0 ? Math.round(teamBPlayers.reduce((sum, p) => sum + (p.power || 0), 0) / teamBPlayers.length) : 0
      };
      
      setTeamAStats(teamAStatsCalc);
      setTeamBStats(teamBStatsCalc);
      
      // Calculate fairness
      if (teamAStatsCalc.totalPower > 0 && teamBStatsCalc.totalPower > 0) {
        const powerDifference = Math.abs(teamAStatsCalc.totalPower - teamBStatsCalc.totalPower);
        const powerRatio = Math.min(teamAStatsCalc.totalPower, teamBStatsCalc.totalPower) / Math.max(teamAStatsCalc.totalPower, teamBStatsCalc.totalPower);
        const memberDifference = Math.abs(teamAStatsCalc.memberCount - teamBStatsCalc.memberCount);
        
        // Fairness score (0-100, higher is more fair)
        const powerFairness = powerRatio * 100; // 100 = equal power, 50 = 2:1 ratio
        const memberFairness = Math.max(0, 100 - (memberDifference * 2)); // Penalty for member difference
        const fairnessScore = Math.round((powerFairness + memberFairness) / 2);
        
        let verdict: FairnessAnalysis['verdict'];
        if (fairnessScore >= 85) verdict = 'very-fair';
        else if (fairnessScore >= 70) verdict = 'fair';
        else if (fairnessScore >= 50) verdict = 'unbalanced';
        else verdict = 'very-unbalanced';
        
        setFairnessAnalysis({
          powerDifference,
          powerRatio,
          memberDifference,
          fairnessScore,
          verdict
        });
      }
      
    } catch (err) {
      console.error('Failed to calculate team stats:', err);
    } finally {
      setLoadingStats(false);
    }
  };

  const handleCampSelection = (camps: 2 | 3) => {
    setSelectedCamps(camps);
    setIsDiploWin(false);
    setMatchup({
      camps,
      teamA: [],
      teamB: []
    });
  };

  const handleDiploWinSelection = () => {
    setSelectedCamps(2); // Use 2 as base but mark as diplo win
    setIsDiploWin(true);
    setMatchup({
      camps: 4, // 2v4 format
      teamA: [],
      teamB: []
    });
  };
  const addToTeam = (alliance: Alliance, team: 'A' | 'B') => {
    // Meme mode restrictions
    if (memeMode) {
      const restrictedAlliances = ['ECHO', 'EIS'];
      const currentTeam = team === 'A' ? matchup.teamA : matchup.teamB;
      
      // Check if trying to add a restricted alliance to a team that already has another restricted alliance
      if (restrictedAlliances.includes(alliance.tag)) {
        const hasRestrictedAlliance = currentTeam.some(a => restrictedAlliances.includes(a.tag));
        if (hasRestrictedAlliance) {
          alert("dont try it wont happen");
          return;
        }
      }
      
      // Check if trying to add any alliance to a team that already has ECHO or EIS
      const hasEchoOrEis = currentTeam.some(a => restrictedAlliances.includes(a.tag));
      if (hasEchoOrEis && restrictedAlliances.includes(alliance.tag)) {
        alert("dont try it wont happen");
        return;
      }
    }

    const maxAlliances = isDiploWin ? (team === 'A' ? 2 : 4) : (selectedCamps || 4);
    const currentTeam = team === 'A' ? matchup.teamA : matchup.teamB;
    
    if (currentTeam.length >= maxAlliances) {
      alert(`Team ${team} is full! Maximum ${maxAlliances} alliances per team.`);
      return;
    }

    // Check if alliance is already in either team
    const isInTeamA = matchup.teamA.some(a => a.id === alliance.id);
    const isInTeamB = matchup.teamB.some(a => a.id === alliance.id);
    
    if (isInTeamA || isInTeamB) {
      alert('Alliance is already assigned to a team!');
      return;
    }

    setMatchup(prev => ({
      ...prev,
      [team === 'A' ? 'teamA' : 'teamB']: [...currentTeam, alliance]
    }));
  };

  const removeFromTeam = (allianceId: string, team: 'A' | 'B') => {
    setMatchup(prev => ({
      ...prev,
      [team === 'A' ? 'teamA' : 'teamB']: prev[team === 'A' ? 'teamA' : 'teamB'].filter(a => a.id !== allianceId)
    }));
  };

  const createMatch = () => {
    if (matchup.teamA.length === 0 || matchup.teamB.length === 0) {
      alert('Both teams must have at least one alliance!');
      return;
    }

    // Navigate to match view with the matchup data
    const matchupData = encodeURIComponent(JSON.stringify(matchup));
    navigate(`/matchup/${matchupData}`);
  };

  const clearMatchup = () => {
    setSelectedCamps(null);
    setIsDiploWin(false);
    setMemeMode(false);
    setMatchup({
      camps: 2,
      teamA: [],
      teamB: []
    });
    localStorage.removeItem(MATCHUP_STORAGE_KEY);
  };

  const createAutoMatchup = async () => {
    try {
      setAutoMatchupLoading(true);
      
      // Get all alliances and their leaderboard data
      const allianceData = await Promise.all(
        alliances.map(async (alliance) => {
          const leaderboard = await fetchLeaderboard(alliance.id);
          const battleReadyPlayers = leaderboard.filter(p => (p.highest_power || 0) >= 50_000_000);
          const totalPower = battleReadyPlayers.reduce((sum, p) => sum + (p.power || 0), 0);
          
          return {
            alliance,
            totalPower,
            memberCount: battleReadyPlayers.length
          };
        })
      );
      
      // Sort by total power (strongest first)
      const sortedAlliances = allianceData
        .filter(data => data.totalPower > 0) // Only include alliances with battle-ready members
        .sort((a, b) => b.totalPower - a.totalPower);
      
      if (sortedAlliances.length < 4) {
        alert('Need at least 4 alliances with battle-ready members for auto match-up');
        return;
      }
      
      // Snake draft: A, B, B, A, A, B, B, A...
      const teamA: Alliance[] = [];
      const teamB: Alliance[] = [];
      
      const maxPerTeam = selectedCamps === 2 ? 2 : selectedCamps === 3 ? 3 : 2;
      
      for (let i = 0; i < Math.min(sortedAlliances.length, maxPerTeam * 2); i++) {
        const alliance = sortedAlliances[i].alliance;
        
        if (i % 4 === 0 || i % 4 === 3) {
          if (teamA.length < maxPerTeam) teamA.push(alliance);
          else if (teamB.length < maxPerTeam) teamB.push(alliance);
        } else {
          if (teamB.length < maxPerTeam) teamB.push(alliance);
          else if (teamA.length < maxPerTeam) teamA.push(alliance);
        }
      }
      
      setMatchup(prev => ({
        ...prev,
        teamA,
        teamB
      }));
      
    } catch (err) {
      console.error('Failed to create auto match-up:', err);
      alert('Failed to create auto match-up. Please try again.');
    } finally {
      setAutoMatchupLoading(false);
    }
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const getFairnessColor = (verdict: FairnessAnalysis['verdict']) => {
    switch (verdict) {
      case 'very-fair': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'unbalanced': return 'text-orange-400';
      case 'very-unbalanced': return 'text-red-400';
    }
  };

  const getFairnessLabel = (verdict: FairnessAnalysis['verdict']) => {
    switch (verdict) {
      case 'very-fair': return 'VERY FAIR';
      case 'fair': return 'FAIR';
      case 'unbalanced': return 'UNBALANCED';
      case 'very-unbalanced': return 'VERY UNBALANCED';
    }
  };

  const getAvailableAlliances = () => {
    const assignedIds = [...matchup.teamA, ...matchup.teamB].map(a => a.id);
    let available = alliances.filter(a => !assignedIds.includes(a.id));
    
    // Apply search filter
    if (allianceSearchQuery.trim()) {
      const query = allianceSearchQuery.toLowerCase();
      available = available.filter(alliance => 
        alliance.tag.toLowerCase().includes(query) ||
        alliance.name.toLowerCase().includes(query)
      );
    }
    
    return available;
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
            <Sword className="w-8 h-8 text-red-400" />
          </motion.div>
          <p className="text-red-400 font-orbitron font-bold">LOADING BATTLE SYSTEM...</p>
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
        <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 via-orange-500/10 to-yellow-500/10"></div>
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
              <Sword className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-red-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-red-400">CREATE</span> <span className="text-orange-400">MATCH-UP</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                Set up epic alliance battles and compare combined statistics
              </p>
            </div>
          </div>
          {(selectedCamps !== null || matchup.teamA.length > 0 || matchup.teamB.length > 0) && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={clearMatchup}
              className="px-4 py-2 bg-red-600/80 hover:bg-red-600 text-white rounded-lg font-bold transition-colors flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>CLEAR ALL</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Camp Selection */}
      {!selectedCamps && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
          
          {/* Meme Mode Toggle */}
          <motion.div 
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-center mb-6 sm:mb-8 relative z-10"
          >
            <div className="glass-panel-light rounded-xl p-4 neon-border">
              <div className="flex items-center space-x-3">
                <span className="text-sm font-bold text-purple-400 font-orbitron">MEME MODE</span>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => setMemeMode(!memeMode)}
                  className={`relative w-12 h-6 rounded-full transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 ${
                    memeMode 
                      ? 'bg-gradient-to-r from-purple-500 to-pink-500' 
                      : 'bg-gray-600'
                  }`}
                >
                  <motion.div
                    animate={{ x: memeMode ? 24 : 0 }}
                    transition={{ duration: 0.3, ease: "easeInOut" }}
                    className="absolute top-0.5 left-0.5 w-5 h-5 bg-white rounded-full shadow-lg"
                  />
                </motion.button>
                <span className={`text-sm font-bold font-orbitron ${memeMode ? 'text-pink-400' : 'text-gray-400'}`}>
                  {memeMode ? 'ENABLED' : 'DISABLED'}
                </span>
              </div>
              {memeMode && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  className="mt-3 text-xs text-yellow-400 font-bold text-center"
                >
                  🚫 ECHO and EIS cannot be on the same team
                </motion.div>
              )}
            </div>
          </motion.div>

          <div className="text-center relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-blue-400 font-orbitron mb-4 sm:mb-6">
              SELECT BATTLE FORMAT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 sm:gap-6 md:gap-8 max-w-4xl mx-auto">
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCampSelection(2)}
                className="glass-panel-light rounded-2xl p-4 sm:p-6 md:p-8 neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-blue-400 font-orbitron mb-3 sm:mb-4">2v2</div>
                <div className="text-base sm:text-lg font-bold text-white font-orbitron mb-2">STANDARD BATTLE</div>
                <div className="text-xs sm:text-sm text-gray-400">2 alliances per team</div>
                <div className="text-xs sm:text-sm text-gray-400">Classic format</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -5, rotate: [0, 2, -2, 0] }}
                whileTap={{ scale: 0.95 }}
                onClick={handleDiploWinSelection}
                className="glass-panel-light rounded-2xl p-4 sm:p-6 md:p-8 neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 relative overflow-hidden group"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 via-orange-500/10 to-red-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-yellow-400 font-orbitron mb-3 sm:mb-4 relative z-10">2v4</div>
                <div className="text-base sm:text-lg font-bold text-white font-orbitron mb-2 relative z-10">DIPLO WIN</div>
                <div className="text-xs sm:text-sm text-gray-400 relative z-10">2 vs 4 alliances</div>
                <div className="text-xs sm:text-sm text-yellow-400 font-bold relative z-10">Meme format 😎</div>
              </motion.button>
              
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleCampSelection(3)}
                className="glass-panel-light rounded-2xl p-4 sm:p-6 md:p-8 neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-purple-400 font-orbitron mb-3 sm:mb-4">3v3</div>
                <div className="text-base sm:text-lg font-bold text-white font-orbitron mb-2">MEGA BATTLE</div>
                <div className="text-xs sm:text-sm text-gray-400">3 alliances per team</div>
                <div className="text-xs sm:text-sm text-gray-400">Large format</div>
              </motion.button>
            </div>
            
            {/* Auto Match-up Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="mt-8 text-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate('/auto-matchup')}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-3"
              >
                <Shuffle className="w-5 h-5" />
                <span className="font-orbitron">AUTO MATCH-UP</span>
                <span className="text-xs bg-white/20 px-2 py-1 rounded-full">BALANCED</span>
              </motion.button>
              <p className="text-xs text-gray-400 mt-2">
                Automatically creates balanced teams using power-based snake draft
              </p>
            </motion.div>
          </div>
        </motion.div>
      )}

      {/* Team Setup */}
      {selectedCamps && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Format Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel-light rounded-xl p-3 sm:p-4 neon-border text-center"
            >
              <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                <div className="text-xl sm:text-2xl font-black text-blue-400 font-orbitron">
                  {isDiploWin ? '2v4 DIPLO WIN' : `${selectedCamps}v${selectedCamps} BATTLE`}
                </div>
                <motion.button
                  whileHover={{ scale: 1.1 }}
                  whileTap={{ scale: 0.9 }}
                  onClick={() => {
                    clearMatchup();
                  }}
                  className="p-1.5 sm:p-2 glass-panel rounded-lg neon-border hover:neon-glow transition-all duration-300"
                >
                  <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                </motion.button>
              </div>
            </motion.div>

            {/* Teams */}
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
              {/* Team A */}
              <motion.div 
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10"></div>
                <div className="flex items-center mb-4 sm:mb-6 relative z-10">
                  <Shield className="w-5 h-5 sm:w-6 sm:h-6 text-blue-400 mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl font-black text-blue-400 font-orbitron">
                    TEAM A ({matchup.teamA.length}/{isDiploWin ? 2 : selectedCamps})
                  </h3>
                </div>
                
                <div className="space-y-3 relative z-10">
                  {matchup.teamA.map((alliance, index) => (
                    <motion.div
                      key={alliance.id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 sm:p-4 glass-panel-light rounded-xl neon-border"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Shield className="w-4 h-4 sm:w-5 sm:h-5 text-blue-400" />
                        <div>
                          <div className="font-bold text-white text-sm sm:text-base">[{alliance.tag}]</div>
                          <div className="text-xs sm:text-sm text-gray-400 truncate max-w-[120px] sm:max-w-none">{alliance.name}</div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeFromTeam(alliance.id, 'A')}
                        className="p-1.5 sm:p-2 glass-panel rounded-lg neon-border hover:neon-glow transition-all duration-300"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                      </motion.button>
                    </motion.div>
                  ))}
                  
                  {matchup.teamA.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-400">
                      <Shield className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm sm:text-base">No alliances assigned</p>
                    </div>
                  )}
                </div>
              </motion.div>

              {/* Team B */}
              <motion.div 
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10"></div>
                <div className="flex items-center mb-4 sm:mb-6 relative z-10">
                  <Sword className="w-5 h-5 sm:w-6 sm:h-6 text-red-400 mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl font-black text-red-400 font-orbitron">
                    TEAM B ({matchup.teamB.length}/{isDiploWin ? 4 : selectedCamps})
                  </h3>
                </div>
                
                <div className="space-y-3 relative z-10">
                  {matchup.teamB.map((alliance, index) => (
                    <motion.div
                      key={alliance.id}
                      initial={{ opacity: 0, x: 10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: index * 0.1 }}
                      className="flex items-center justify-between p-3 sm:p-4 glass-panel-light rounded-xl neon-border"
                    >
                      <div className="flex items-center space-x-2 sm:space-x-3">
                        <Sword className="w-4 h-4 sm:w-5 sm:h-5 text-red-400" />
                        <div>
                          <div className="font-bold text-white text-sm sm:text-base">[{alliance.tag}]</div>
                          <div className="text-xs sm:text-sm text-gray-400 truncate max-w-[120px] sm:max-w-none">{alliance.name}</div>
                        </div>
                      </div>
                      <motion.button
                        whileHover={{ scale: 1.1 }}
                        whileTap={{ scale: 0.9 }}
                        onClick={() => removeFromTeam(alliance.id, 'B')}
                        className="p-1.5 sm:p-2 glass-panel rounded-lg neon-border hover:neon-glow transition-all duration-300"
                      >
                        <X className="w-3 h-3 sm:w-4 sm:h-4 text-red-400" />
                      </motion.button>
                    </motion.div>
                  ))}
                  
                  {matchup.teamB.length === 0 && (
                    <div className="text-center py-6 sm:py-8 text-gray-400">
                      <Sword className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                      <p className="text-sm sm:text-base">No alliances assigned</p>
                    </div>
                  )}
                </div>
              </motion.div>
            </div>

            {/* Team Stats and Fairness Meter */}
            {(teamAStats || teamBStats) && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                {/* Team Stats Comparison */}
                <div className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden">
                  <div className="absolute inset-0 bg-gradient-to-br from-cyan-500/10 to-blue-500/10"></div>
                  <div className="flex items-center mb-4 sm:mb-6 relative z-10">
                    <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-cyan-400 mr-2 sm:mr-3" />
                    <h3 className="text-lg sm:text-xl font-black text-cyan-400 font-orbitron">
                      TEAM COMPARISON
                    </h3>
                    {loadingStats && (
                      <LoadingSpinner size="sm" className="ml-3" />
                    )}
                  </div>
                  
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                    {/* Team A Stats */}
                    <div className="glass-panel-light rounded-xl p-4 sm:p-6 neon-border border-blue-400 bg-blue-500/10">
                      <div className="flex items-center mb-4">
                        <Shield className="w-5 h-5 text-blue-400 mr-2" />
                        <h4 className="text-lg font-bold text-blue-400 font-orbitron">TEAM A</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Power:</span>
                          <span className="font-bold text-blue-400 font-orbitron">
                            {teamAStats ? formatNumber(teamAStats.totalPower) : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Battle Ready:</span>
                          <span className="font-bold text-green-400 font-orbitron">
                            {teamAStats ? teamAStats.memberCount : 0} members
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Average Power:</span>
                          <span className="font-bold text-cyan-400 font-orbitron">
                            {teamAStats ? formatNumber(teamAStats.averagePower) : '0'}
                          </span>
                        </div>
                      </div>
                    </div>

                    {/* Team B Stats */}
                    <div className="glass-panel-light rounded-xl p-4 sm:p-6 neon-border border-red-400 bg-red-500/10">
                      <div className="flex items-center mb-4">
                        <Sword className="w-5 h-5 text-red-400 mr-2" />
                        <h4 className="text-lg font-bold text-red-400 font-orbitron">TEAM B</h4>
                      </div>
                      <div className="space-y-3">
                        <div className="flex justify-between">
                          <span className="text-gray-400">Total Power:</span>
                          <span className="font-bold text-red-400 font-orbitron">
                            {teamBStats ? formatNumber(teamBStats.totalPower) : '0'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Battle Ready:</span>
                          <span className="font-bold text-green-400 font-orbitron">
                            {teamBStats ? teamBStats.memberCount : 0} members
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-gray-400">Average Power:</span>
                          <span className="font-bold text-cyan-400 font-orbitron">
                            {teamBStats ? formatNumber(teamBStats.averagePower) : '0'}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Fairness Meter */}
                {fairnessAnalysis && (
                  <motion.div 
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
                  >
                    <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
                    <div className="flex items-center mb-4 sm:mb-6 relative z-10">
                      <Scale className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
                      <div>
                        <div className="flex items-center space-x-2">
                          <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
                            FAIRNESS ANALYSIS
                          </h3>
                          <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/30">
                            BETA
                          </span>
                        </div>
                        <div className="text-xs text-gray-400 mt-1">
                          It does not calculate activity and spending capacity of an alliance
                        </div>
                      </div>
                    </div>
                    
                    <div className="space-y-4 sm:space-y-6 relative z-10">
                      {/* Fairness Score */}
                      <div className="text-center">
                        <div className="text-sm text-gray-400 mb-2">FAIRNESS SCORE</div>
                        <div className={`text-3xl sm:text-4xl font-black font-orbitron mb-3 ${getFairnessColor(fairnessAnalysis.verdict)}`}>
                          {fairnessAnalysis.fairnessScore}/100
                        </div>
                        <div className="w-full bg-gray-700 rounded-full h-3 sm:h-4 mb-3">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${fairnessAnalysis.fairnessScore}%` }}
                            transition={{ duration: 1, ease: "easeOut" }}
                            className={`h-full rounded-full ${
                              fairnessAnalysis.verdict === 'very-fair' ? 'bg-gradient-to-r from-green-500 to-green-400' :
                              fairnessAnalysis.verdict === 'fair' ? 'bg-gradient-to-r from-yellow-500 to-yellow-400' :
                              fairnessAnalysis.verdict === 'unbalanced' ? 'bg-gradient-to-r from-orange-500 to-orange-400' :
                              'bg-gradient-to-r from-red-500 to-red-400'
                            }`}
                          />
                        </div>
                        <div className={`text-lg font-bold font-orbitron ${getFairnessColor(fairnessAnalysis.verdict)}`}>
                          {getFairnessLabel(fairnessAnalysis.verdict)}
                        </div>
                      </div>

                      {/* Detailed Analysis */}
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                          <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                          <div className="text-sm text-blue-400 font-bold font-orbitron mb-1">POWER DIFFERENCE</div>
                          <div className="text-lg font-black text-white font-orbitron">
                            {formatNumber(fairnessAnalysis.powerDifference)}
                          </div>
                        </div>
                        
                        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                          <Calculator className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                          <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">POWER RATIO</div>
                          <div className="text-lg font-black text-white font-orbitron">
                            {(fairnessAnalysis.powerRatio * 100).toFixed(0)}%
                          </div>
                          <div className="text-xs text-gray-400 mt-1">
                            Weaker team ÷ Stronger team
                          </div>
                          <div className="text-xs text-cyan-400 font-bold">
                            100% = Equal, 50% = 2:1 ratio
                          </div>
                        </div>
                        
                        <div className="text-center p-4 glass-panel-light rounded-xl neon-border">
                          <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
                          <div className="text-sm text-green-400 font-bold font-orbitron mb-1">MEMBER DIFFERENCE</div>
                          <div className="text-lg font-black text-white font-orbitron">
                            {fairnessAnalysis.memberDifference}
                          </div>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            )}

            {/* Available Alliances */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
            >
              <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-pink-500/10"></div>
              <div className="flex items-center mb-4 sm:mb-6 relative z-10">
                <Users className="w-5 h-5 sm:w-6 sm:h-6 text-purple-400 mr-2 sm:mr-3" />
                <h3 className="text-lg sm:text-xl font-black text-purple-400 font-orbitron">
                  AVAILABLE ALLIANCES ({getAvailableAlliances().length})
                </h3>
              </div>
              
              {/* Search Bar */}
              <div className="mb-4 sm:mb-6 relative z-10">
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-4 h-4 sm:w-5 sm:h-5" />
                  <input
                    type="text"
                    placeholder="Search alliances by tag or name..."
                    value={allianceSearchQuery}
                    onChange={(e) => setAllianceSearchQuery(e.target.value)}
                    className="w-full pl-10 sm:pl-12 pr-10 sm:pr-12 py-2 sm:py-3 bg-gray-800/50 border border-gray-600/50 rounded-xl text-white placeholder-gray-400 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 transition-all duration-300 text-sm sm:text-base"
                  />
                  {allianceSearchQuery && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={() => setAllianceSearchQuery('')}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-purple-400 transition-colors duration-300"
                    >
                      <X className="w-4 h-4 sm:w-5 sm:h-5" />
                    </motion.button>
                  )}
                </div>
              </div>
              
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 sm:gap-4 relative z-10">
                {getAvailableAlliances().map((alliance) => (
                  <motion.div
                    key={alliance.id}
                    initial={{ opacity: 0, scale: 0.9 }}
                    animate={{ opacity: 1, scale: 1 }}
                    whileHover={{ scale: 1.02 }}
                    className="glass-panel-light rounded-xl p-3 sm:p-4 neon-border"
                  >
                    <div className="flex items-center justify-between mb-2 sm:mb-3">
                      <div>
                        <div className="font-bold text-white text-sm sm:text-base">[{alliance.tag}]</div>
                        <div className="text-xs sm:text-sm text-gray-400 truncate max-w-[150px] sm:max-w-none">{alliance.name}</div>
                      </div>
                    </div>
                    
                    <div className="flex space-x-2">
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addToTeam(alliance, 'A')}
                        disabled={matchup.teamA.length >= selectedCamps}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
                      >
                        + Team A
                      </motion.button>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => addToTeam(alliance, 'B')}
                        disabled={matchup.teamB.length >= (isDiploWin ? 4 : selectedCamps)}
                        className="flex-1 px-2 sm:px-3 py-1.5 sm:py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-600 disabled:opacity-50 text-white rounded-lg text-xs sm:text-sm font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500"
                      >
                        + Team B
                      </motion.button>
                    </div>
                  </motion.div>
                ))}
                
                {getAvailableAlliances().length === 0 && (
                  <div className="col-span-full text-center py-6 sm:py-8 text-gray-400">
                    <Users className="w-8 h-8 sm:w-12 sm:h-12 mx-auto mb-3 opacity-50" />
                    <p className="text-sm sm:text-base">
                      {allianceSearchQuery.trim() 
                        ? `No alliances found matching "${allianceSearchQuery}"`
                        : 'All alliances have been assigned to teams'
                      }
                    </p>
                  </div>
                )}
              </div>
            </motion.div>

            {/* Create Match Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              {loadingStats && (
                <div className="mb-4 flex items-center justify-center">
                  <LoadingSpinner size="sm" className="mr-2" />
                  <span className="text-blue-400 font-orbitron text-sm">CALCULATING TEAM STATS...</span>
                </div>
              )}
              
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={createMatch}
                disabled={matchup.teamA.length === 0 || matchup.teamB.length === 0}
                className="px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm sm:text-base md:text-lg font-orbitron transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 flex items-center space-x-2 sm:space-x-3"
              >
                <Sword className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
                <span>CREATE MATCH</span>
                <ArrowRight className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6" />
              </motion.button>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}
    </motion.div>
  );
}