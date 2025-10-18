import React from "react";
import { X, Users, Award, Trophy, Crown, TrendingUp } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { FantasyTeam, FantasyTeamPlayer } from "../../types/fantasy";

interface TeamRosterModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: FantasyTeam | null;
  teamPlayers: FantasyTeamPlayer[];
  loading: boolean;
}

export function TeamRosterModal({
  isOpen,
  onClose,
  team,
  teamPlayers,
  loading,
}: TeamRosterModalProps) {
  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toLocaleString();
  };

  // Sort players by merits for ranking
  const sortedByMerits = [...teamPlayers].sort(
    (a, b) => (b.stats?.merits || 0) - (a.stats?.merits || 0)
  );

  const getRankIcon = (rank: number) => {
    switch (rank) {
      case 1:
        return <Crown className="w-4 h-4 text-yellow-400" />;
      case 2:
        return <Trophy className="w-4 h-4 text-gray-300" />;
      case 3:
        return <Trophy className="w-4 h-4 text-orange-400" />;
      default:
        return (
          <span className="w-4 h-4 flex items-center justify-center text-xs font-bold text-gray-400">
            #{rank}
          </span>
        );
    }
  };

  if (!isOpen) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        className="fixed inset-0 bg-black/95 backdrop-blur-xl z-[9999] flex items-center justify-center p-4"
        onClick={onClose}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9, y: 20 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.9, y: 20 }}
          onClick={(e) => e.stopPropagation()}
          className="glass-panel rounded-2xl neon-border p-6 max-w-4xl w-full max-h-[90vh] overflow-y-auto relative"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl"></div>

          {/* Header */}
          <div className="flex items-center justify-between mb-6 relative z-10">
            <div className="flex items-center space-x-3">
              <div className="p-3 glass-panel-light rounded-xl neon-border border-purple-400">
                <Users className="w-6 h-6 text-purple-400" />
              </div>
              <div>
                <h2 className="text-xl font-black text-purple-400 font-orbitron">
                  {team?.team_name || "TEAM ROSTER"}
                </h2>
                <p className="text-sm text-gray-400">
                  Owner: {team?.owner_name} • {teamPlayers.length} players
                </p>
              </div>
            </div>
            <motion.button
              whileHover={{ scale: 1.1, rotate: 90 }}
              whileTap={{ scale: 0.9 }}
              onClick={onClose}
              className="p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
            >
              <X className="w-6 h-6 text-pink-400" />
            </motion.button>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-12 relative z-10">
              <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
                className="w-12 h-12 glass-panel-light rounded-full flex items-center justify-center neon-glow mr-3"
              >
                <Users className="w-6 h-6 text-purple-400" />
              </motion.div>
              <span className="text-purple-400 font-orbitron font-bold">
                LOADING TEAM ROSTER...
              </span>
            </div>
          ) : (
            <div className="space-y-6 relative z-10">
              {/* Team Summary */}
              <div className="glass-panel-light rounded-xl p-4 neon-border">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="text-center">
                    <Award className="w-5 h-5 text-purple-400 mx-auto mb-2" />
                    <div className="text-sm text-purple-400 font-bold font-orbitron mb-1">
                      TOTAL MERITS
                    </div>
                    <div className="text-xl font-black text-white font-orbitron">
                      {formatNumber(
                        teamPlayers.reduce(
                          (sum, p) => sum + (p.stats?.merits || 0),
                          0
                        )
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
                    <div className="text-sm text-blue-400 font-bold font-orbitron mb-1">
                      TOTAL POWER
                    </div>
                    <div className="text-xl font-black text-white font-orbitron">
                      {formatNumber(
                        teamPlayers.reduce(
                          (sum, p) => sum + (p.stats?.power || 0),
                          0
                        )
                      )}
                    </div>
                  </div>
                  <div className="text-center">
                    <Users className="w-5 h-5 text-green-400 mx-auto mb-2" />
                    <div className="text-sm text-green-400 font-bold font-orbitron mb-1">
                      TEAM SIZE
                    </div>
                    <div className="text-xl font-black text-white font-orbitron">
                      {teamPlayers.length}
                    </div>
                  </div>
                </div>
              </div>

              {/* Player Roster */}
              <div className="glass-panel-light rounded-xl neon-border">
                <div className="p-4 border-b border-gray-700/50">
                  <h3 className="text-lg font-bold text-cyan-400 font-orbitron">
                    TEAM ROSTER
                  </h3>
                  <div className="text-sm text-gray-400">
                    Ranked by merits within team
                  </div>
                </div>

                <div className="p-4">
                  {sortedByMerits.length > 0 ? (
                    <div className="space-y-3">
                      {sortedByMerits.map((player, index) => {
                        const rank = index + 1;
                        console.log("check", player);
                        return (
                          <motion.div
                            key={player.id}
                            initial={{ opacity: 0, x: -20 }}
                            animate={{ opacity: 1, x: 0 }}
                            transition={{ delay: index * 0.1 }}
                            className={`flex items-center justify-between p-4 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300 ${
                              rank === 1
                                ? "border-yellow-400 bg-yellow-500/10"
                                : rank === 2
                                ? "border-gray-300 bg-gray-500/10"
                                : rank === 3
                                ? "border-orange-400 bg-orange-500/10"
                                : ""
                            }`}
                          >
                            <div className="flex items-center space-x-4 flex-1 min-w-0">
                              {/* Rank */}
                              <div className="flex items-center space-x-2">
                                {getRankIcon(rank)}
                                <span
                                  className={`font-bold font-orbitron text-sm ${
                                    rank === 1
                                      ? "text-yellow-400"
                                      : rank === 2
                                      ? "text-gray-300"
                                      : rank === 3
                                      ? "text-orange-400"
                                      : "text-cyan-400"
                                  }`}
                                >
                                  #{rank}
                                </span>
                              </div>

                              {/* Player Info */}
                              <div className="flex items-center space-x-3 flex-1 min-w-0">
                                <Users className="w-4 h-4 text-blue-400" />
                                <div className="min-w-0">
                                  <div className="font-bold text-white text-sm truncate">
                                    {player.players?.current_name ||
                                      "Unknown Player"}
                                  </div>
                                  <div className="text-xs text-gray-400">
                                    {player.players?.faction ||
                                      "Unknown Faction"}
                                  </div>
                                  <div className="text-xs text-purple-400">
                                    [{player.stats?.alliance_tag || "N/A"}] •
                                    Server {player.server_id}
                                  </div>
                                </div>
                              </div>
                            </div>

                            {/* Merits */}
                            <div className="text-right flex-shrink-0">
                              <div
                                className={`text-lg font-black font-orbitron ${
                                  rank === 1
                                    ? "text-yellow-400"
                                    : rank === 2
                                    ? "text-gray-300"
                                    : rank === 3
                                    ? "text-orange-400"
                                    : "text-purple-400"
                                }`}
                              >
                                {formatNumber(player.stats?.merits || 0)}
                              </div>
                              <div className="text-xs text-gray-400">
                                Merits
                              </div>
                              <div className="text-xs text-blue-400">
                                Pos: {player.position}
                              </div>
                            </div>
                          </motion.div>
                        );
                      })}
                    </div>
                  ) : (
                    <div className="text-center py-8">
                      <Users className="w-12 h-12 text-gray-400 mx-auto mb-4" />
                      <h4 className="text-lg font-bold text-gray-300 font-orbitron mb-2">
                        NO PLAYERS
                      </h4>
                      <p className="text-gray-400">
                        This team has no players yet
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </motion.div>
      </motion.div>
    </AnimatePresence>
  );
}
