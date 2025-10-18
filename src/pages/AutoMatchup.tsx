import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Sword, 
  Shield, 
  Users, 
  TrendingUp, 
  ArrowLeft, 
  ArrowRight, 
  Scale, 
  Calculator,
  Shuffle,
  Target,
  Crown,
  Award,
  CheckCircle,
  X
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { Alliance } from '../types';
import { fetchAlliances, fetchLeaderboard } from '../utils/queries';
import { LoadingSpinner } from '../components/UI/LoadingSpinner';
import { ErrorMessage } from '../components/UI/ErrorMessage';

interface AllianceWithStats {
  alliance: Alliance;
  totalPower: number;
  memberCount: number;
  averagePower: number;
}

interface MatchupSuggestion {
  id: string;
  teamA: AllianceWithStats[];
  teamB: AllianceWithStats[];
  fairnessScore: number;
  powerDifference: number;
  memberDifference: number;
  verdict: 'very-fair' | 'fair' | 'unbalanced' | 'very-unbalanced';
}

export default function AutoMatchup() {
  const navigate = useNavigate();
  const [step, setStep] = useState<'format' | 'alliances' | 'suggestions'>('format');
  const [selectedFormat, setSelectedFormat] = useState<2 | 3 | null>(null);
  const [alliances, setAlliances] = useState<Alliance[]>([]);
  const [selectedAlliances, setSelectedAlliances] = useState<Alliance[]>([]);
  const [allianceStats, setAllianceStats] = useState<AllianceWithStats[]>([]);
  const [suggestions, setSuggestions] = useState<MatchupSuggestion[]>([]);
  const [loading, setLoading] = useState(false);
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

  useEffect(() => {
    loadAlliances();
  }, []);

  const handleFormatSelection = (format: 2 | 3) => {
    setSelectedFormat(format);
    setStep('alliances');
  };

  const toggleAllianceSelection = (alliance: Alliance) => {
    setSelectedAlliances(prev => {
      const isSelected = prev.some(a => a.id === alliance.id);
      if (isSelected) {
        return prev.filter(a => a.id !== alliance.id);
      } else {
        const maxAlliances = (selectedFormat || 2) * 2;
        if (prev.length >= maxAlliances) {
          alert(`Maximum ${maxAlliances} alliances for ${selectedFormat}v${selectedFormat} format`);
          return prev;
        }
        return [...prev, alliance];
      }
    });
  };

  const generateMatchups = async () => {
    if (!selectedFormat || selectedAlliances.length < (selectedFormat * 2)) {
      alert(`Please select at least ${(selectedFormat || 2) * 2} alliances for ${selectedFormat}v${selectedFormat} format`);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Load stats for selected alliances
      const statsPromises = selectedAlliances.map(async (alliance) => {
        const leaderboard = await fetchLeaderboard(alliance.id);
        const battleReadyPlayers = leaderboard.filter(p => (p.highest_power || 0) >= 50_000_000);
        const totalPower = battleReadyPlayers.reduce((sum, p) => sum + (p.power || 0), 0);
        const averagePower = battleReadyPlayers.length > 0 ? Math.round(totalPower / battleReadyPlayers.length) : 0;

        return {
          alliance,
          totalPower,
          memberCount: battleReadyPlayers.length,
          averagePower
        };
      });

      const stats = await Promise.all(statsPromises);
      setAllianceStats(stats);

      // Generate all possible team combinations
      const combinations = generateTeamCombinations(stats, selectedFormat);
      
      // Calculate fairness for each combination
      const matchupSuggestions = combinations.map((combo, index) => {
        const fairness = calculateFairness(combo.teamA, combo.teamB);
        return {
          id: `matchup-${index}`,
          ...combo,
          ...fairness
        };
      });

      // Sort by fairness score (best first)
      matchupSuggestions.sort((a, b) => b.fairnessScore - a.fairnessScore);

      setSuggestions(matchupSuggestions.slice(0, 10)); // Show top 10 suggestions
      setStep('suggestions');

    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to generate matchups');
    } finally {
      setLoading(false);
    }
  };

  const generateTeamCombinations = (stats: AllianceWithStats[], format: number) => {
    const combinations: { teamA: AllianceWithStats[]; teamB: AllianceWithStats[] }[] = [];
    
    // Generate all possible combinations of selecting 'format' alliances for team A
    const getCombinations = (arr: AllianceWithStats[], size: number): AllianceWithStats[][] => {
      if (size === 1) return arr.map(item => [item]);
      
      const result: AllianceWithStats[][] = [];
      for (let i = 0; i <= arr.length - size; i++) {
        const head = arr[i];
        const tailCombinations = getCombinations(arr.slice(i + 1), size - 1);
        tailCombinations.forEach(tail => result.push([head, ...tail]));
      }
      return result;
    };

    const teamACombinations = getCombinations(stats, format);
    
    teamACombinations.forEach(teamA => {
      const remainingAlliances = stats.filter(s => !teamA.some(ta => ta.alliance.id === s.alliance.id));
      const teamBCombinations = getCombinations(remainingAlliances, format);
      
      teamBCombinations.forEach(teamB => {
        combinations.push({ teamA, teamB });
      });
    });

    return combinations;
  };

  const calculateFairness = (teamA: AllianceWithStats[], teamB: AllianceWithStats[]) => {
    const teamAPower = teamA.reduce((sum, a) => sum + a.totalPower, 0);
    const teamBPower = teamB.reduce((sum, a) => sum + a.totalPower, 0);
    const teamAMembers = teamA.reduce((sum, a) => sum + a.memberCount, 0);
    const teamBMembers = teamB.reduce((sum, a) => sum + a.memberCount, 0);

    const powerDifference = Math.abs(teamAPower - teamBPower);
    const powerRatio = Math.min(teamAPower, teamBPower) / Math.max(teamAPower, teamBPower);
    const memberDifference = Math.abs(teamAMembers - teamBMembers);

    // Fairness score calculation
    const powerFairness = powerRatio * 100;
    const memberFairness = Math.max(0, 100 - (memberDifference * 2));
    const fairnessScore = Math.round((powerFairness + memberFairness) / 2);

    let verdict: 'very-fair' | 'fair' | 'unbalanced' | 'very-unbalanced';
    if (fairnessScore >= 85) verdict = 'very-fair';
    else if (fairnessScore >= 70) verdict = 'fair';
    else if (fairnessScore >= 50) verdict = 'unbalanced';
    else verdict = 'very-unbalanced';

    return {
      fairnessScore,
      powerDifference,
      memberDifference,
      verdict
    };
  };

  const selectMatchup = (suggestion: MatchupSuggestion) => {
    const matchupData = {
      camps: selectedFormat as 2 | 3,
      teamA: suggestion.teamA.map(s => s.alliance),
      teamB: suggestion.teamB.map(s => s.alliance)
    };

    const encodedData = encodeURIComponent(JSON.stringify(matchupData));
    navigate(`/matchup/${encodedData}`);
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const getFairnessColor = (verdict: string) => {
    switch (verdict) {
      case 'very-fair': return 'text-green-400';
      case 'fair': return 'text-yellow-400';
      case 'unbalanced': return 'text-orange-400';
      case 'very-unbalanced': return 'text-red-400';
      default: return 'text-gray-400';
    }
  };

  const getFairnessLabel = (verdict: string) => {
    switch (verdict) {
      case 'very-fair': return 'VERY FAIR';
      case 'fair': return 'FAIR';
      case 'unbalanced': return 'UNBALANCED';
      case 'very-unbalanced': return 'VERY UNBALANCED';
      default: return 'UNKNOWN';
    }
  };

  const resetToStart = () => {
    setStep('format');
    setSelectedFormat(null);
    setSelectedAlliances([]);
    setAllianceStats([]);
    setSuggestions([]);
    setError(null);
  };

  if (loading && step === 'format') {
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
            <Shuffle className="w-8 h-8 text-purple-400" />
          </motion.div>
          <p className="text-purple-400 font-orbitron font-bold">LOADING AUTO MATCH-UP...</p>
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
      
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden z-10"
      >
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10"></div>
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate('/create-matchup')}
              className="glass-panel-light rounded-xl p-2 sm:p-3 neon-border hover:neon-glow transition-all duration-300"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
            </motion.button>
            <motion.div 
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
              className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
            >
              <Shuffle className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-purple-400" />
            </motion.div>
            <div>
              <h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
                <span className="text-purple-400">AUTO</span> <span className="text-pink-400">MATCH-UP</span>
              </h1>
              <p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
                AI-powered balanced team generation
              </p>
            </div>
          </div>
          {step !== 'format' && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={resetToStart}
              className="px-4 py-2 bg-gray-600/80 hover:bg-gray-600 text-white rounded-lg font-bold transition-colors flex items-center space-x-2"
            >
              <X className="w-4 h-4" />
              <span>RESET</span>
            </motion.button>
          )}
        </div>
      </motion.div>

      {/* Step 1: Format Selection */}
      {step === 'format' && (
        <motion.div 
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
          <div className="text-center relative z-10">
            <h2 className="text-xl sm:text-2xl font-black text-blue-400 font-orbitron mb-4 sm:mb-6">
              SELECT BATTLE FORMAT
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 sm:gap-6 md:gap-8 max-w-2xl mx-auto">
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFormatSelection(2)}
                className="glass-panel-light rounded-2xl p-4 sm:p-6 md:p-8 neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-blue-400 font-orbitron mb-3 sm:mb-4">2v2</div>
                <div className="text-base sm:text-lg font-bold text-white font-orbitron mb-2">STANDARD BATTLE</div>
                <div className="text-xs sm:text-sm text-gray-400">2 alliances per team</div>
                <div className="text-xs sm:text-sm text-gray-400">4 alliances total</div>
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => handleFormatSelection(3)}
                className="glass-panel-light rounded-2xl p-4 sm:p-6 md:p-8 neon-border hover:neon-glow transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500"
              >
                <div className="text-4xl sm:text-5xl md:text-6xl font-black text-purple-400 font-orbitron mb-3 sm:mb-4">3v3</div>
                <div className="text-base sm:text-lg font-bold text-white font-orbitron mb-2">MEGA BATTLE</div>
                <div className="text-xs sm:text-sm text-gray-400">3 alliances per team</div>
                <div className="text-xs sm:text-sm text-gray-400">6 alliances total</div>
              </motion.button>
            </div>
          </div>
        </motion.div>
      )}

      {/* Step 2: Alliance Selection */}
      {step === 'alliances' && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Progress Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel-light rounded-xl p-3 sm:p-4 neon-border text-center"
            >
              <div className="flex items-center justify-center space-x-4">
                <div className="text-xl sm:text-2xl font-black text-purple-400 font-orbitron">
                  {selectedFormat}v{selectedFormat} AUTO MATCH-UP
                </div>
                <div className="text-sm text-gray-400">
                  Step 2/3: Select {(selectedFormat || 2) * 2} Alliances
                </div>
              </div>
              <div className="mt-3">
                <div className="text-sm text-cyan-400 font-bold font-orbitron">
                  SELECTED: {selectedAlliances.length}/{(selectedFormat || 2) * 2}
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2 mt-2">
                  <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${(selectedAlliances.length / ((selectedFormat || 2) * 2)) * 100}%` }}
                    transition={{ duration: 0.3 }}
                    className="h-full bg-gradient-to-r from-purple-500 to-pink-500 rounded-full"
                  />
                </div>
              </div>
            </motion.div>

            {/* Selected Alliances */}
            {selectedAlliances.length > 0 && (
              <motion.div 
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-cyan-500/10"></div>
                <div className="flex items-center mb-4 relative z-10">
                  <CheckCircle className="w-5 h-5 sm:w-6 sm:h-6 text-green-400 mr-2 sm:mr-3" />
                  <h3 className="text-lg sm:text-xl font-black text-green-400 font-orbitron">
                    SELECTED ALLIANCES ({selectedAlliances.length})
                  </h3>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 relative z-10">
                  {selectedAlliances.map((alliance) => (
                    <motion.div
                      key={alliance.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="glass-panel-light rounded-xl p-3 neon-border border-green-400 bg-green-500/10"
                    >
                      <div className="flex items-center justify-between">
                        <div>
                          <div className="font-bold text-white text-sm">[{alliance.tag}]</div>
                          <div className="text-xs text-gray-400 truncate max-w-[80px]">{alliance.name}</div>
                        </div>
                        <motion.button
                          whileHover={{ scale: 1.1 }}
                          whileTap={{ scale: 0.9 }}
                          onClick={() => toggleAllianceSelection(alliance)}
                          className="p-1 glass-panel rounded neon-border hover:neon-glow transition-all duration-300"
                        >
                          <X className="w-3 h-3 text-red-400" />
                        </motion.button>
                      </div>
                    </motion.div>
                  ))}
                </div>
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
                  AVAILABLE ALLIANCES
                </h3>
              </div>
              
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3 sm:gap-4 relative z-10">
                {alliances
                  .filter(alliance => !selectedAlliances.some(s => s.id === alliance.id))
                  .map((alliance) => (
                    <motion.button
                      key={alliance.id}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => toggleAllianceSelection(alliance)}
                      disabled={selectedAlliances.length >= (selectedFormat || 2) * 2}
                      className="glass-panel-light rounded-xl p-3 sm:p-4 neon-border hover:neon-glow transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <div className="text-center">
                        <div className="font-bold text-white text-sm">[{alliance.tag}]</div>
                        <div className="text-xs text-gray-400 truncate">{alliance.name}</div>
                      </div>
                    </motion.button>
                  ))}
              </div>
            </motion.div>

            {/* Generate Button */}
            <motion.div 
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="text-center"
            >
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={generateMatchups}
                disabled={selectedAlliances.length < (selectedFormat || 2) * 2 || loading}
                className="px-6 py-3 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-3"
              >
                {loading ? (
                  <LoadingSpinner size="sm" />
                ) : (
                  <Calculator className="w-5 h-5" />
                )}
                <span className="font-orbitron">GENERATE MATCHUPS</span>
                <ArrowRight className="w-5 h-5" />
              </motion.button>
              <p className="text-xs text-gray-400 mt-2">
                AI will analyze all possible team combinations for optimal balance
              </p>
            </motion.div>
          </motion.div>
        </AnimatePresence>
      )}

      {/* Step 3: Matchup Suggestions */}
      {step === 'suggestions' && (
        <AnimatePresence>
          <motion.div 
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-4 sm:space-y-6"
          >
            {/* Progress Header */}
            <motion.div 
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              className="glass-panel-light rounded-xl p-3 sm:p-4 neon-border text-center"
            >
              <div className="flex items-center justify-center space-x-4">
                <div className="text-xl sm:text-2xl font-black text-pink-400 font-orbitron">
                  {selectedFormat}v{selectedFormat} MATCHUP SUGGESTIONS
                </div>
                <div className="text-sm text-gray-400">
                  Step 3/3: Choose Your Battle
                </div>
              </div>
              <div className="mt-2 text-sm text-cyan-400 font-bold font-orbitron">
                {suggestions.length} BALANCED MATCHUPS GENERATED
              </div>
            </motion.div>

            {/* Matchup Suggestions */}
            <div className="space-y-4">
              {suggestions.map((suggestion, index) => (
                <motion.div
                  key={suggestion.id}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: index * 0.1 }}
                  className="glass-panel rounded-2xl p-4 sm:p-6 relative overflow-hidden hover:neon-glow transition-all duration-300 cursor-pointer"
                  onClick={() => selectMatchup(suggestion)}
                >
                  <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
                  
                  {/* Suggestion Header */}
                  <div className="flex items-center justify-between mb-4 relative z-10">
                    <div className="flex items-center space-x-3">
                      <div className={`w-8 h-8 rounded-full flex items-center justify-center font-bold text-sm ${
                        index === 0 ? 'bg-yellow-500 text-black' :
                        index === 1 ? 'bg-gray-300 text-black' :
                        index === 2 ? 'bg-orange-500 text-white' :
                        'bg-gray-600 text-white'
                      }`}>
                        #{index + 1}
                      </div>
                      <div>
                        <div className={`text-lg font-bold font-orbitron ${getFairnessColor(suggestion.verdict)}`}>
                          {getFairnessLabel(suggestion.verdict)}
                        </div>
                        <div className="text-sm text-gray-400">
                          Fairness Score: {suggestion.fairnessScore}/100
                        </div>
                      </div>
                    </div>
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={(e) => {
                        e.stopPropagation();
                        selectMatchup(suggestion);
                      }}
                      className="px-4 py-2 bg-gradient-to-r from-orange-500 to-red-500 hover:from-orange-600 hover:to-red-600 text-white rounded-lg font-bold transition-all duration-300 flex items-center space-x-2"
                    >
                      <Sword className="w-4 h-4" />
                      <span>BATTLE</span>
                    </motion.button>
                  </div>

                  {/* Teams Display */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6 relative z-10">
                    {/* Team A */}
                    <div className="glass-panel-light rounded-xl p-4 neon-border border-blue-400 bg-blue-500/10">
                      <div className="flex items-center mb-3">
                        <Shield className="w-5 h-5 text-blue-400 mr-2" />
                        <h4 className="text-lg font-bold text-blue-400 font-orbitron">TEAM A</h4>
                      </div>
                      <div className="space-y-2">
                        {suggestion.teamA.map((allianceStats) => (
                          <div key={allianceStats.alliance.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                            <span className="font-bold text-white text-sm">[{allianceStats.alliance.tag}]</span>
                            <span className="text-xs text-blue-400 font-orbitron">{formatNumber(allianceStats.totalPower)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total:</span>
                            <span className="font-bold text-blue-400 font-orbitron">
                              {formatNumber(suggestion.teamA.reduce((sum, a) => sum + a.totalPower, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Members:</span>
                            <span className="font-bold text-green-400 font-orbitron">
                              {suggestion.teamA.reduce((sum, a) => sum + a.memberCount, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Team B */}
                    <div className="glass-panel-light rounded-xl p-4 neon-border border-red-400 bg-red-500/10">
                      <div className="flex items-center mb-3">
                        <Sword className="w-5 h-5 text-red-400 mr-2" />
                        <h4 className="text-lg font-bold text-red-400 font-orbitron">TEAM B</h4>
                      </div>
                      <div className="space-y-2">
                        {suggestion.teamB.map((allianceStats) => (
                          <div key={allianceStats.alliance.id} className="flex items-center justify-between p-2 bg-gray-800/50 rounded-lg">
                            <span className="font-bold text-white text-sm">[{allianceStats.alliance.tag}]</span>
                            <span className="text-xs text-red-400 font-orbitron">{formatNumber(allianceStats.totalPower)}</span>
                          </div>
                        ))}
                        <div className="pt-2 border-t border-gray-600">
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Total:</span>
                            <span className="font-bold text-red-400 font-orbitron">
                              {formatNumber(suggestion.teamB.reduce((sum, a) => sum + a.totalPower, 0))}
                            </span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span className="text-gray-400">Members:</span>
                            <span className="font-bold text-green-400 font-orbitron">
                              {suggestion.teamB.reduce((sum, a) => sum + a.memberCount, 0)}
                            </span>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Fairness Meter for this suggestion */}
                  <div className="mt-4 p-4 glass-panel-light rounded-xl neon-border bg-purple-500/10 relative z-10">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-3">
                        <Scale className="w-5 h-5 text-purple-400" />
                        <div>
                          <div className="flex items-center space-x-2">
                            <div className="text-sm font-bold text-purple-400 font-orbitron">BALANCE ANALYSIS</div>
                            <span className="px-2 py-1 bg-yellow-500/20 text-yellow-400 text-xs font-bold rounded-full border border-yellow-400/30">
                              BETA
                            </span>
                          </div>
                          <div className="text-xs text-gray-400">
                            It does not calculate activity and spending capacity of an alliance
                          </div>
                          <div className="text-xs text-gray-500 mt-1">
                            Power Diff: {formatNumber(suggestion.powerDifference)} • Member Diff: {suggestion.memberDifference}
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className={`text-xl font-black font-orbitron ${getFairnessColor(suggestion.verdict)}`}>
                          {suggestion.fairnessScore}/100
                        </div>
                        <div className={`text-sm font-bold font-orbitron ${getFairnessColor(suggestion.verdict)}`}>
                          {getFairnessLabel(suggestion.verdict)}
                        </div>
                      </div>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>

            {suggestions.length === 0 && !loading && (
              <motion.div 
                initial={{ opacity: 0, scale: 0.9 }}
                animate={{ opacity: 1, scale: 1 }}
                className="text-center py-12"
              >
                <Calculator className="w-16 h-16 text-gray-400 mx-auto mb-4" />
                <h3 className="text-xl font-bold text-gray-300 font-orbitron mb-2">
                  NO MATCHUPS GENERATED
                </h3>
                <p className="text-gray-400">
                  Unable to create balanced matchups with selected alliances
                </p>
              </motion.div>
            )}
          </motion.div>
        </AnimatePresence>
      )}

      {loading && step !== 'format' && (
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
              <Calculator className="w-8 h-8 text-purple-400" />
            </motion.div>
            <p className="text-purple-400 font-orbitron font-bold">
              {step === 'alliances' ? 'ANALYZING ALLIANCE POWER...' : 'GENERATING BALANCED MATCHUPS...'}
            </p>
          </div>
        </motion.div>
      )}
    </motion.div>
  );
}