import React from "react";
import { ArrowLeft, LogOut, Settings, Sword, Trophy, Crown, Swords } from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../../hooks/useAuth";

export function Header() {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAdmin, signOut } = useAuth();
  const isDetailPage = location.pathname.startsWith("/alliance/");
  const isAdminPage = location.pathname === "/admin";
  const isMatchupPage = location.pathname.includes("/matchup") || location.pathname.includes("/create-matchup");
  const isLeaderboardPage = location.pathname === "/leaderboard";
  const isUniversalLeaderboardPage = location.pathname === "/universal-leaderboard";
  const isHomePage = location.pathname === "/";

  const handleSignOut = async () => {
    await signOut();
  };

  return (
    <header
      className="
        fixed top-0 left-0 w-full z-50
        bg-black/20 backdrop-blur-md
        border-b border-white/10
        px-3 sm:px-4 py-2 sm:py-3
  "
    >
      <div className="max-w-7xl mx-auto flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-4">
          {isDetailPage && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                navigate("/");
              }}
              className="p-1.5 sm:p-2 card-panel rounded-xl hover-orange focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Back to alliances"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </motion.button>
          )}
          {isAdminPage && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="p-1.5 sm:p-2 card-panel rounded-xl hover-orange focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Back to alliances"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </motion.button>
          )}
          {isLeaderboardPage && (
            <motion.button
              whileHover={{ scale: 1.1 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="p-1.5 sm:p-2 card-panel rounded-xl hover-orange focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Back to alliances"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </motion.button>
          )}
          <div className="flex items-center space-x-2 sm:space-x-3">
            <div>
              <h1 className="text-base sm:text-lg md:text-xl font-bold text-white font-orbitron">
                ALLIANCE
              </h1>
              <p className="text-xs sm:text-sm secondary-text hidden sm:block">Strategic Dashboard</p>
            </div>
          </div>
        </div>

        <div className="flex items-center space-x-2 sm:space-x-4">
          {/* Universal Leaderboard Button */}
          {!isUniversalLeaderboardPage && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/universal-leaderboard")}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm border border-purple-400/30"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Crown className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.div>
              <span className="font-orbitron hidden lg:inline">UNIVERSAL</span>
              <span className="font-orbitron lg:hidden">TOP 50</span>
            </motion.button>
          )}
          
          {/* Universal Leaderboard Button */}
          {!isLeaderboardPage && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/leaderboard")}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-yellow-500/80 to-orange-500/80 hover:from-yellow-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-yellow-500 backdrop-blur-sm border border-yellow-400/30"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.div>
              <span className="font-orbitron hidden lg:inline">ALLIANCE RANKS</span>
              <span className="font-orbitron lg:hidden">RANKS</span>
            </motion.button>
          )}

          {/* Alliance vs Alliance Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/alliance-vs-alliance")}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-cyan-500/80 to-blue-500/80 hover:from-cyan-500 hover:to-blue-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-cyan-500 backdrop-blur-sm border border-cyan-400/30"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Swords className="w-3 h-3 sm:w-4 sm:h-4" />
            </motion.div>
            <span className="font-orbitron hidden lg:inline">ALLIANCE VS</span>
            <span className="font-orbitron lg:hidden">VS</span>
          </motion.button>
          
          {/* Fantasy League Button */}
          <motion.button
            whileHover={{ scale: 1.05, y: -2 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => navigate("/fantasy-league")}
            className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-purple-500/80 to-pink-500/80 hover:from-purple-500 hover:to-pink-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-purple-500 backdrop-blur-sm border border-purple-400/30"
          >
            <motion.div
              animate={{ rotate: [0, 10, -10, 0] }}
              transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
            >
              <Trophy className="w-3 h-3 sm:w-4 sm:h-4" />
            </motion.div>
            <span className="font-orbitron hidden lg:inline">FANTASY</span>
            <span className="font-orbitron lg:hidden">FANTASY</span>
          </motion.button>
          
          {!isMatchupPage && (
            <motion.button
              whileHover={{ scale: 1.05, y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/create-matchup")}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 bg-gradient-to-r from-red-500/80 to-orange-500/80 hover:from-red-500 hover:to-orange-500 text-white rounded-xl font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 backdrop-blur-sm border border-red-400/30"
            >
              <motion.div
                animate={{ rotate: [0, 10, -10, 0] }}
                transition={{ duration: 2, repeat: Infinity, ease: "easeInOut" }}
              >
                <Sword className="w-3 h-3 sm:w-4 sm:h-4" />
              </motion.div>
              <span className="font-orbitron hidden sm:inline">CREATE MATCH-UP</span>
              <span className="font-orbitron sm:hidden">MATCH</span>
            </motion.button>
          )}
          
          {!isAdminPage && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/admin")}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-orange-500/80 hover:bg-orange-500 text-white rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-orange-500 backdrop-blur-sm border border-orange-400/30"
            >
              <Settings className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-orbitron hidden sm:inline">ADMIN</span>
            </motion.button>
          )}
          {isAdmin && isAdminPage && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={handleSignOut}
              className="flex items-center space-x-1 sm:space-x-2 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-xs sm:text-sm bg-red-600/80 hover:bg-red-600 text-white rounded-xl font-bold transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 backdrop-blur-sm border border-red-400/30"
            >
              <LogOut className="w-3 h-3 sm:w-4 sm:h-4" />
              <span className="font-orbitron hidden sm:inline">EXIT ADMIN</span>
            </motion.button>
          )}
          {isUniversalLeaderboardPage && (
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => navigate("/")}
              className="p-1.5 sm:p-2 card-panel rounded-xl hover-orange focus:outline-none focus:ring-2 focus:ring-orange-500"
              aria-label="Back to alliances"
            >
              <ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 text-orange-500" />
            </motion.button>
          )}
        </div>
      </div>
    </header>
  );
}
