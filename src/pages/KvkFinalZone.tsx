import React, { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Shield,
  Trophy,
  Swords,
  Heart,
  Skull,
  Users,
  TrendingUp,
  Award,
  Flame,
  Calendar,
  Lock,
} from "lucide-react";
import { supabase } from "../lib/supabase";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";

interface PlayerStat {
  player_id: string;
  name: string;
  home_server: string;
  highest_power: number;
  merits: number;
  units_killed: number;
  units_dead: number;
  units_healed: number;
  killcount_t5: number;
  killcount_t1: number;
  power: number;
}

interface TeamStats {
  totalPower: number;
  totalMerits: number;
  totalKills: number;
  totalDeaths: number;
  totalHeals: number;
  totalT5Kills: number;
  totalT1Kills: number;
  memberCount: number;
}

const TEAM_A_SERVERS = ["49", "60", "225"];
const TEAM_B_SERVERS = ["249", "363", "176"];
const MIN_DATE = "2025-10-10";

export function KvkFinalZone() {
  const [loading, setLoading] = useState(true);
  const [teamAPlayers, setTeamAPlayers] = useState<PlayerStat[]>([]);
  const [teamBPlayers, setTeamBPlayers] = useState<PlayerStat[]>([]);
  const [teamAStats, setTeamAStats] = useState<TeamStats | null>(null);
  const [teamBStats, setTeamBStats] = useState<TeamStats | null>(null);
  const [activeTab, setActiveTab] = useState<
    | "team-a"
    | "team-b"
    | "combined"
    | "hall-of-fame"
    | "comparison"
    | "timeline"
    | "date-compare"
  >("comparison");
  const [sortBy, setSortBy] = useState<keyof PlayerStat>("merits");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("desc");
  const [selectedDate, setSelectedDate] = useState<string>("2025-10-10");
  const [availableDates, setAvailableDates] = useState<string[]>([
    "2025-10-10",
  ]);

  useEffect(() => {
    loadKvkData();
  }, []);

  const loadKvkData = async () => {
    try {
      setLoading(true);

      // Get ALL scans from Oct 10 onwards
      const { data: scans, error: scanError } = await supabase
        .from("scans")
        .select("id, scan_date, alliance_id")
        .gte("scan_date", MIN_DATE)
        .order("scan_date", { ascending: false });

      if (scanError || !scans || scans.length === 0) {
        console.error("No scans found for Oct 10+");
        return;
      }

      // Get scan IDs for the latest date
      const latestDate = scans[0].scan_date;
      const latestScanIds = scans
        .filter((s) => s.scan_date === latestDate)
        .map((s) => s.id);

      // Get all player stats for Team A servers from ALL scans on the latest date
      const { data: teamAData, error: teamAError } = await supabase
        .from("player_stats")
        .select(
          "player_id, name, home_server, highest_power, merits, units_killed, units_dead, units_healed, killcount_t5, killcount_t1, power"
        )
        .in("scan_id", latestScanIds)
        .in("home_server", TEAM_A_SERVERS)
        .gte("highest_power", 50000000)
        .order("merits", { ascending: false });

      // Get all player stats for Team B servers from ALL scans on the latest date
      const { data: teamBData, error: teamBError } = await supabase
        .from("player_stats")
        .select(
          "player_id, name, home_server, highest_power, merits, units_killed, units_dead, units_healed, killcount_t5, killcount_t1, power"
        )
        .in("scan_id", latestScanIds)
        .in("home_server", TEAM_B_SERVERS)
        .gte("highest_power", 50000000)
        .order("merits", { ascending: false });

      if (!teamAError && teamAData) {
        setTeamAPlayers(teamAData);
        setTeamAStats(calculateTeamStats(teamAData));
      }

      if (!teamBError && teamBData) {
        setTeamBPlayers(teamBData);
        setTeamBStats(calculateTeamStats(teamBData));
      }
    } catch (err) {
      console.error("Error loading KVK data:", err);
    } finally {
      setLoading(false);
    }
  };

  const calculateTeamStats = (players: PlayerStat[]): TeamStats => {
    return {
      totalPower: players.reduce((sum, p) => sum + (p.power || 0), 0),
      totalMerits: players.reduce((sum, p) => sum + (p.merits || 0), 0),
      totalKills: players.reduce((sum, p) => sum + (p.units_killed || 0), 0),
      totalDeaths: players.reduce((sum, p) => sum + (p.units_dead || 0), 0),
      totalHeals: players.reduce((sum, p) => sum + (p.units_healed || 0), 0),
      totalT5Kills: players.reduce((sum, p) => sum + (p.killcount_t5 || 0), 0),
      totalT1Kills: players.reduce((sum, p) => sum + (p.killcount_t1 || 0), 0),
      memberCount: players.length,
    };
  };

  const formatNumber = (num: number) => {
    if (num >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  const sortPlayers = (players: PlayerStat[]) => {
    return [...players].sort((a, b) => {
      const aVal = a[sortBy] || 0;
      const bVal = b[sortBy] || 0;
      return sortOrder === "desc"
        ? (bVal as number) - (aVal as number)
        : (aVal as number) - (bVal as number);
    });
  };

  const getHallOfFame = () => {
    const allPlayers = [...teamAPlayers, ...teamBPlayers];
    return {
      topMerits: [...allPlayers]
        .sort((a, b) => (b.merits || 0) - (a.merits || 0))
        .slice(0, 10),
      topKills: [...allPlayers]
        .sort((a, b) => (b.units_killed || 0) - (a.units_killed || 0))
        .slice(0, 10),
      topDeaths: [...allPlayers]
        .sort((a, b) => (b.units_dead || 0) - (a.units_dead || 0))
        .slice(0, 10),
      topHeals: [...allPlayers]
        .sort((a, b) => (b.units_healed || 0) - (a.units_healed || 0))
        .slice(0, 10),
      topT5Kills: [...allPlayers]
        .sort((a, b) => (b.killcount_t5 || 0) - (a.killcount_t5 || 0))
        .slice(0, 10),
      topT1Kills: [...allPlayers]
        .sort((a, b) => (b.killcount_t1 || 0) - (a.killcount_t1 || 0))
        .slice(0, 10),
    };
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <LoadingSpinner />
      </div>
    );
  }

  const hallOfFame = getHallOfFame();

  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-900 via-black to-gray-900 p-4 md:p-6">
      {/* Header */}
      <motion.div
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="text-center mb-8"
      >
        <h1 className="text-4xl md:text-6xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 font-orbitron mb-2">
          KVK 1
        </h1>
        <p className="text-gray-400 text-lg">
          Final Zone - Battle Data from October 10, 2025
        </p>
        <div className="flex justify-center gap-8 mt-4">
          <div className="text-center">
            <div className="text-blue-400 font-bold text-sm">TEAM A</div>
            <div className="text-white text-xs">Servers: 49, 60, 225</div>
          </div>
          <div className="text-center">
            <div className="text-red-400 font-bold text-sm">TEAM B</div>
            <div className="text-white text-xs">Servers: 249, 363, 176</div>
          </div>
        </div>
      </motion.div>

      {/* Tab Navigation */}
      <div className="flex flex-wrap justify-center gap-2 mb-6">
        {[
          {
            id: "comparison" as const,
            label: "Team Comparison",
            icon: TrendingUp,
          },
          { id: "team-a" as const, label: "Team A", icon: Shield },
          { id: "team-b" as const, label: "Team B", icon: Shield },
          { id: "combined" as const, label: "Combined", icon: Users },
          { id: "hall-of-fame" as const, label: "Hall of Fame", icon: Trophy },
          {
            id: "date-compare" as const,
            label: "Date Comparison",
            icon: Calendar,
            comingSoon: true,
          },
          {
            id: "timeline" as const,
            label: "Timeline",
            icon: TrendingUp,
            comingSoon: false,
          },
        ].map((tab) => (
          <button
            key={tab.id}
            onClick={() => !tab.comingSoon && setActiveTab(tab.id)}
            disabled={tab.comingSoon}
            className={`px-4 py-2 rounded-lg font-bold transition-all flex items-center gap-2 relative ${
              activeTab === tab.id
                ? "bg-gradient-to-r from-orange-500 to-red-500 text-white"
                : tab.comingSoon
                ? "bg-gray-800/50 text-gray-600 cursor-not-allowed"
                : "bg-gray-800 text-gray-400 hover:bg-gray-700"
            }`}
          >
            {tab.comingSoon && <Lock className="w-3 h-3" />}
            <tab.icon className="w-4 h-4" />
            {tab.label}
            {tab.comingSoon && (
              <span className="absolute -top-2 -right-2 px-2 py-0.5 bg-yellow-500 text-black text-[10px] font-bold rounded-full">
                SOON
              </span>
            )}
          </button>
        ))}
      </div>

      <AnimatePresence mode="wait">
        {/* Team Comparison */}
        {activeTab === "comparison" && teamAStats && teamBStats && (
          <motion.div
            key="comparison"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            {/* Quick Stats */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Team A Card */}
              <div className="glass-panel-light rounded-xl p-6 border-2 border-blue-500/30">
                <h2 className="text-2xl font-black text-blue-400 mb-4 font-orbitron">
                  TEAM A
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Members:</span>
                    <span className="text-white font-bold">
                      {teamAStats.memberCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Power:</span>
                    <span className="text-white font-bold">
                      {formatNumber(teamAStats.totalPower)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Merits:</span>
                    <span className="text-purple-400 font-bold">
                      {formatNumber(teamAStats.totalMerits)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Kills:</span>
                    <span className="text-red-400 font-bold">
                      {formatNumber(teamAStats.totalKills)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Deaths:</span>
                    <span className="text-orange-400 font-bold">
                      {formatNumber(teamAStats.totalDeaths)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Heals:</span>
                    <span className="text-green-400 font-bold">
                      {formatNumber(teamAStats.totalHeals)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">T5 Kills:</span>
                    <span className="text-yellow-400 font-bold">
                      {formatNumber(teamAStats.totalT5Kills)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">T1 Kills:</span>
                    <span className="text-cyan-400 font-bold">
                      {formatNumber(teamAStats.totalT1Kills)}
                    </span>
                  </div>
                </div>
              </div>

              {/* Team B Card */}
              <div className="glass-panel-light rounded-xl p-6 border-2 border-red-500/30">
                <h2 className="text-2xl font-black text-red-400 mb-4 font-orbitron">
                  TEAM B
                </h2>
                <div className="space-y-3">
                  <div className="flex justify-between">
                    <span className="text-gray-400">Members:</span>
                    <span className="text-white font-bold">
                      {teamBStats.memberCount}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Power:</span>
                    <span className="text-white font-bold">
                      {formatNumber(teamBStats.totalPower)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Merits:</span>
                    <span className="text-purple-400 font-bold">
                      {formatNumber(teamBStats.totalMerits)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Kills:</span>
                    <span className="text-red-400 font-bold">
                      {formatNumber(teamBStats.totalKills)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Deaths:</span>
                    <span className="text-orange-400 font-bold">
                      {formatNumber(teamBStats.totalDeaths)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">Total Heals:</span>
                    <span className="text-green-400 font-bold">
                      {formatNumber(teamBStats.totalHeals)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">T5 Kills:</span>
                    <span className="text-yellow-400 font-bold">
                      {formatNumber(teamBStats.totalT5Kills)}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-400">T1 Kills:</span>
                    <span className="text-cyan-400 font-bold">
                      {formatNumber(teamBStats.totalT1Kills)}
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* Comparison Bars */}
            <div className="glass-panel-light rounded-xl p-6">
              <h3 className="text-xl font-black text-white mb-4 font-orbitron">
                HEAD TO HEAD
              </h3>
              <div className="space-y-4">
                {[
                  {
                    label: "Merits",
                    teamA: teamAStats.totalMerits,
                    teamB: teamBStats.totalMerits,
                    color: "purple",
                  },
                  {
                    label: "Kills",
                    teamA: teamAStats.totalKills,
                    teamB: teamBStats.totalKills,
                    color: "red",
                  },
                  {
                    label: "Deaths",
                    teamA: teamAStats.totalDeaths,
                    teamB: teamBStats.totalDeaths,
                    color: "orange",
                  },
                  {
                    label: "Heals",
                    teamA: teamAStats.totalHeals,
                    teamB: teamBStats.totalHeals,
                    color: "green",
                  },
                  {
                    label: "T5 Kills",
                    teamA: teamAStats.totalT5Kills,
                    teamB: teamBStats.totalT5Kills,
                    color: "yellow",
                  },
                ].map((stat) => {
                  const total = stat.teamA + stat.teamB;
                  const teamAPercent =
                    total > 0 ? (stat.teamA / total) * 100 : 50;
                  const teamBPercent =
                    total > 0 ? (stat.teamB / total) * 100 : 50;

                  return (
                    <div key={stat.label} className="space-y-1">
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">{stat.label}</span>
                        <div className="flex gap-4">
                          <span className="text-blue-400">
                            {formatNumber(stat.teamA)}
                          </span>
                          <span className="text-red-400">
                            {formatNumber(stat.teamB)}
                          </span>
                        </div>
                      </div>
                      <div className="h-6 bg-gray-800 rounded-full overflow-hidden flex">
                        <div
                          className="bg-gradient-to-r from-blue-600 to-blue-400 flex items-center justify-end pr-2 text-xs font-bold text-white"
                          style={{ width: `${teamAPercent}%` }}
                        >
                          {teamAPercent.toFixed(0)}%
                        </div>
                        <div
                          className="bg-gradient-to-r from-red-400 to-red-600 flex items-center justify-start pl-2 text-xs font-bold text-white"
                          style={{ width: `${teamBPercent}%` }}
                        >
                          {teamBPercent.toFixed(0)}%
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </motion.div>
        )}

        {/* Team A Leaderboard */}
        {activeTab === "team-a" && (
          <motion.div
            key="team-a"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayerLeaderboard
              players={sortPlayers(teamAPlayers)}
              title="TEAM A LEADERBOARD"
              teamColor="blue"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(field) => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                } else {
                  setSortBy(field);
                  setSortOrder("desc");
                }
              }}
              formatNumber={formatNumber}
            />
          </motion.div>
        )}

        {/* Team B Leaderboard */}
        {activeTab === "team-b" && (
          <motion.div
            key="team-b"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayerLeaderboard
              players={sortPlayers(teamBPlayers)}
              title="TEAM B LEADERBOARD"
              teamColor="red"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(field) => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                } else {
                  setSortBy(field);
                  setSortOrder("desc");
                }
              }}
              formatNumber={formatNumber}
            />
          </motion.div>
        )}

        {/* Combined Leaderboard */}
        {activeTab === "combined" && (
          <motion.div
            key="combined"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
          >
            <PlayerLeaderboard
              players={sortPlayers([...teamAPlayers, ...teamBPlayers])}
              title="COMBINED LEADERBOARD"
              teamColor="neutral"
              sortBy={sortBy}
              sortOrder={sortOrder}
              onSort={(field) => {
                if (sortBy === field) {
                  setSortOrder(sortOrder === "desc" ? "asc" : "desc");
                } else {
                  setSortBy(field);
                  setSortOrder("desc");
                }
              }}
              formatNumber={formatNumber}
              showTeam
            />
          </motion.div>
        )}

        {/* Hall of Fame */}
        {activeTab === "hall-of-fame" && (
          <motion.div
            key="hall-of-fame"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-yellow-400 to-orange-500 font-orbitron">
              HALL OF FAME
            </h2>

            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              <HallOfFameCard
                title="TOP MERITS"
                icon={Trophy}
                players={hallOfFame.topMerits}
                field="merits"
                color="purple"
                formatNumber={formatNumber}
              />
              <HallOfFameCard
                title="TOP KILLS"
                icon={Swords}
                players={hallOfFame.topKills}
                field="units_killed"
                color="red"
                formatNumber={formatNumber}
              />
              <HallOfFameCard
                title="TOP DEATHS"
                icon={Skull}
                players={hallOfFame.topDeaths}
                field="units_dead"
                color="orange"
                formatNumber={formatNumber}
              />
              <HallOfFameCard
                title="TOP HEALS"
                icon={Heart}
                players={hallOfFame.topHeals}
                field="units_healed"
                color="green"
                formatNumber={formatNumber}
              />
              <HallOfFameCard
                title="TOP T5 KILLS"
                icon={Flame}
                players={hallOfFame.topT5Kills}
                field="killcount_t5"
                color="yellow"
                formatNumber={formatNumber}
              />
              <HallOfFameCard
                title="TOP T1 KILLS"
                icon={Award}
                players={hallOfFame.topT1Kills}
                field="killcount_t1"
                color="cyan"
                formatNumber={formatNumber}
              />
            </div>
          </motion.div>
        )}

        {/* Timeline View */}
        {activeTab === "timeline" && (
          <motion.div
            key="timeline"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="space-y-6"
          >
            <h2 className="text-3xl font-black text-center text-transparent bg-clip-text bg-gradient-to-r from-cyan-400 to-blue-500 font-orbitron mb-8">
              BATTLE TIMELINE
            </h2>

            {/* Timeline Description */}
            <div className="glass-panel-light rounded-xl p-6 mb-6">
              <div className="flex items-center gap-3 mb-4">
                <Calendar className="w-6 h-6 text-cyan-400" />
                <h3 className="text-xl font-bold text-white">
                  Multi-Day Battle Analysis
                </h3>
              </div>
              <p className="text-gray-400 mb-4">
                Track the progression of the KVK Final Zone battle across
                multiple days. See how teams and players perform over time with
                daily snapshots and trend analysis.
              </p>
              <div className="bg-gradient-to-r from-cyan-500/10 to-blue-500/10 border border-cyan-500/30 rounded-lg p-4">
                <p className="text-cyan-400 text-sm font-bold">
                  Coming Soon: Oct 10 vs Oct 11 comparison and beyond
                </p>
              </div>
            </div>

            {/* Available Dates */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              <div className="glass-panel-light rounded-xl p-6 border-2 border-green-500/30">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-green-400" />
                    <span className="font-bold text-white">
                      October 10, 2025
                    </span>
                  </div>
                  <span className="px-2 py-1 bg-green-500 text-white text-xs font-bold rounded">
                    ACTIVE
                  </span>
                </div>
                <div className="text-sm text-gray-400">
                  <div className="flex justify-between mb-1">
                    <span>Team A Merits:</span>
                    <span className="text-blue-400 font-bold">
                      {teamAStats ? formatNumber(teamAStats.totalMerits) : "0"}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span>Team B Merits:</span>
                    <span className="text-red-400 font-bold">
                      {teamBStats ? formatNumber(teamBStats.totalMerits) : "0"}
                    </span>
                  </div>
                </div>
              </div>

              <div className="glass-panel-light rounded-xl p-6 border-2 border-yellow-500/30 relative overflow-hidden">
                <div className="absolute top-0 right-0 w-full h-full bg-gradient-to-br from-yellow-500/5 to-orange-500/5" />
                <div className="relative z-10">
                  <div className="flex items-center justify-between mb-3">
                    <div className="flex items-center gap-2">
                      <Calendar className="w-5 h-5 text-yellow-400" />
                      <span className="font-bold text-white">
                        October 11, 2025
                      </span>
                    </div>
                    <span className="px-2 py-1 bg-yellow-500 text-black text-xs font-bold rounded animate-pulse">
                      PENDING
                    </span>
                  </div>
                  <p className="text-sm text-gray-400">
                    Upload scan data to activate daily comparison and see battle
                    progression.
                  </p>
                </div>
              </div>

              <div className="glass-panel-light rounded-xl p-6 border-2 border-gray-700/30 opacity-50">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <Calendar className="w-5 h-5 text-gray-500" />
                    <span className="font-bold text-gray-500">
                      Future Dates
                    </span>
                  </div>
                  <Lock className="w-4 h-4 text-gray-500" />
                </div>
                <p className="text-sm text-gray-500">
                  Additional battle days will appear here as scans are uploaded.
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}

// Leaderboard Component
function PlayerLeaderboard({
  players,
  title,
  teamColor,
  sortBy,
  sortOrder,
  onSort,
  formatNumber,
  showTeam = false,
}: {
  players: PlayerStat[];
  title: string;
  teamColor: "blue" | "red" | "neutral";
  sortBy: keyof PlayerStat;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof PlayerStat) => void;
  formatNumber: (num: number) => string;
  showTeam?: boolean;
}) {
  const titleColor =
    teamColor === "blue"
      ? "text-blue-400"
      : teamColor === "red"
      ? "text-red-400"
      : "text-white";

  return (
    <div className="glass-panel-light rounded-xl p-6">
      <h2 className={`text-2xl font-black ${titleColor} mb-4 font-orbitron`}>
        {title}
      </h2>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-gray-700">
              <th className="text-left py-3 px-2 text-gray-400 text-sm">#</th>
              <th className="text-left py-3 px-2 text-gray-400 text-sm">
                Name
              </th>
              <th className="text-left py-3 px-2 text-gray-400 text-sm">
                Server
              </th>
              <SortableHeader
                label="Power"
                field="power"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Merits"
                field="merits"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Kills"
                field="units_killed"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Deaths"
                field="units_dead"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="Heals"
                field="units_healed"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="T5"
                field="killcount_t5"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
              <SortableHeader
                label="T1"
                field="killcount_t1"
                sortBy={sortBy}
                sortOrder={sortOrder}
                onSort={onSort}
              />
            </tr>
          </thead>
          <tbody>
            {players.map((player, index) => {
              const isTeamA = TEAM_A_SERVERS.includes(player.home_server);
              return (
                <tr
                  key={player.player_id}
                  className="border-b border-gray-800 hover:bg-gray-800/50 transition-colors"
                >
                  <td className="py-3 px-2 text-gray-400 text-sm">
                    {index + 1}
                  </td>
                  <td className="py-3 px-2 text-white font-bold text-sm">
                    {player.name}
                  </td>
                  <td className="py-3 px-2">
                    <span
                      className={`text-xs font-bold ${
                        isTeamA ? "text-blue-400" : "text-red-400"
                      }`}
                    >
                      {player.home_server}
                    </span>
                  </td>
                  <td className="py-3 px-2 text-white text-sm">
                    {formatNumber(player.power || 0)}
                  </td>
                  <td className="py-3 px-2 text-purple-400 font-bold text-sm">
                    {formatNumber(player.merits || 0)}
                  </td>
                  <td className="py-3 px-2 text-red-400 font-bold text-sm">
                    {formatNumber(player.units_killed || 0)}
                  </td>
                  <td className="py-3 px-2 text-orange-400 font-bold text-sm">
                    {formatNumber(player.units_dead || 0)}
                  </td>
                  <td className="py-3 px-2 text-green-400 font-bold text-sm">
                    {formatNumber(player.units_healed || 0)}
                  </td>
                  <td className="py-3 px-2 text-yellow-400 font-bold text-sm">
                    {formatNumber(player.killcount_t5 || 0)}
                  </td>
                  <td className="py-3 px-2 text-cyan-400 font-bold text-sm">
                    {formatNumber(player.killcount_t1 || 0)}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Sortable Header Component
function SortableHeader({
  label,
  field,
  sortBy,
  sortOrder,
  onSort,
}: {
  label: string;
  field: keyof PlayerStat;
  sortBy: keyof PlayerStat;
  sortOrder: "asc" | "desc";
  onSort: (field: keyof PlayerStat) => void;
}) {
  const isActive = sortBy === field;
  return (
    <th
      className="text-left py-3 px-2 text-gray-400 text-sm cursor-pointer hover:text-white transition-colors"
      onClick={() => onSort(field)}
    >
      <div className="flex items-center gap-1">
        {label}
        {isActive && <span>{sortOrder === "desc" ? "▼" : "▲"}</span>}
      </div>
    </th>
  );
}

// Hall of Fame Card Component
function HallOfFameCard({
  title,
  icon: Icon,
  players,
  field,
  color,
  formatNumber,
}: {
  title: string;
  icon: any;
  players: PlayerStat[];
  field: keyof PlayerStat;
  color: string;
  formatNumber: (num: number) => string;
}) {
  const colorMap: Record<string, string> = {
    purple: "border-purple-500/30 text-purple-400",
    red: "border-red-500/30 text-red-400",
    orange: "border-orange-500/30 text-orange-400",
    green: "border-green-500/30 text-green-400",
    yellow: "border-yellow-500/30 text-yellow-400",
    cyan: "border-cyan-500/30 text-cyan-400",
  };

  return (
    <div
      className={`glass-panel-light rounded-xl p-6 border-2 ${colorMap[color]}`}
    >
      <div className="flex items-center gap-2 mb-4">
        <Icon className="w-6 h-6" />
        <h3 className="text-xl font-black font-orbitron">{title}</h3>
      </div>
      <div className="space-y-2">
        {players.map((player, index) => {
          const isTeamA = TEAM_A_SERVERS.includes(player.home_server);
          return (
            <div
              key={player.player_id}
              className="flex items-center justify-between py-2 border-b border-gray-800"
            >
              <div className="flex items-center gap-3">
                <div
                  className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${
                    index === 0
                      ? "bg-yellow-500 text-black"
                      : index === 1
                      ? "bg-gray-400 text-black"
                      : index === 2
                      ? "bg-orange-600 text-white"
                      : "bg-gray-700 text-gray-400"
                  }`}
                >
                  {index + 1}
                </div>
                <div>
                  <div className="text-white font-bold text-sm">
                    {player.name}
                  </div>
                  <div
                    className={`text-xs ${
                      isTeamA ? "text-blue-400" : "text-red-400"
                    }`}
                  >
                    Server {player.home_server}
                  </div>
                </div>
              </div>
              <div className={`font-bold ${colorMap[color].split(" ")[1]}`}>
                {formatNumber((player[field] as number) || 0)}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
