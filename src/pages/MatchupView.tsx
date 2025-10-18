import React, { useEffect, useMemo, useRef, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
  Sword,
  Shield,
  TrendingUp,
  Award,
  Target,
  ArrowLeft,
  Crown,
  Heart,
  Zap,
  BarChart3,
  Download,
} from "lucide-react";
import { motion } from "framer-motion";
import { Alliance } from "../types";
import { fetchLeaderboard } from "../utils/queries";
import { ErrorMessage } from "../components/UI/ErrorMessage";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";

/** ─────────────────── Types ─────────────────── */

interface MatchupConfig {
  camps: 4 | 6;
  teamA: Alliance[];
  teamB: Alliance[];
}

type PlayerLike = {
  power?: number | null;
  merits?: number | null;
  units_killed?: number | null;
  killcount_t5?: number | null;
  killcount_t4?: number | null;
  killcount_t3?: number | null;
  killcount_t2?: number | null;
  killcount_t1?: number | null;
  units_dead?: number | null;
  units_healed?: number | null;
  mana_spent?: number | null;
  helps_given?: number | null;
  scouted?: number | null;
  victories?: number | null;
  defeats?: number | null;
  highest_power?: number | null;
};

interface TeamStats {
  totalPower: number;
  totalMerits: number;
  totalKills: number;
  totalT5Kills: number;
  totalT4Kills: number;
  totalT3Kills: number;
  totalT2Kills: number;
  totalT1Kills: number;
  totalUnitsDead: number;
  totalUnitsHealed: number;
  totalManaSpent: number;
  totalHelpsGiven: number;
  totalScouted: number;
  totalVictories: number;
  totalDefeats: number;
  memberCount: number;       // battle-ready count (50M+)
  averagePower: number;      // among battle-ready
}

interface AllianceBreakdown {
  totalPower: number;      // among battle-ready
  averagePower: number;    // among battle-ready
  total25Plus: number;
  total50Plus: number;
  total75Plus: number;
  total100Plus: number;
  total125Plus: number;
  total150Plus: number;
  total175Plus: number;
  total200Plus: number;
  total225Plus: number;
  total250Plus: number;
  total275Plus: number;
  total300Plus: number;
  totalT5Kills: number;
  totalManaSpent: number;
}

const EMPTY_TEAM: TeamStats = {
  totalPower: 0,
  totalMerits: 0,
  totalKills: 0,
  totalT5Kills: 0,
  totalT4Kills: 0,
  totalT3Kills: 0,
  totalT2Kills: 0,
  totalT1Kills: 0,
  totalUnitsDead: 0,
  totalUnitsHealed: 0,
  totalManaSpent: 0,
  totalHelpsGiven: 0,
  totalScouted: 0,
  totalVictories: 0,
  totalDefeats: 0,
  memberCount: 0,
  averagePower: 0,
};

const compactFmt = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const formatNumber = (n: number) => compactFmt.format(n);

/** ───────────────── Row Components (pure) ───────────────── */

function AllianceStatsRow({
  alliance,
  teamColor,
  index,
  stats,
}: {
  alliance: Alliance;
  teamColor: "blue" | "red";
  index: number;
  stats: AllianceBreakdown | null;
}) {
  const teamColorClasses = {
    blue: "border-l-4 border-blue-400 bg-blue-500/10 hover:bg-blue-500/20",
    red: "border-l-4 border-red-400 bg-red-500/10 hover:bg-red-500/20",
  };

  return (
    <motion.tr
      initial={{ opacity: 0, x: teamColor === "blue" ? -20 : 20 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.06 * index, duration: 0.35 }}
      className={`${teamColorClasses[teamColor]} transition-all duration-300`}
    >
      <td className="py-4 px-6">
        <div className="flex items-center space-x-3">
          <div className={`w-3 h-3 rounded-full ${teamColor === "blue" ? "bg-blue-400" : "bg-red-400"}`} />
          <div>
            <div className="font-bold text-white font-orbitron">[{alliance.tag}]</div>
            <div className="text-xs text-gray-400">{alliance.name}</div>
          </div>
        </div>
      </td>

      {stats ? (
        <>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-white font-orbitron">{formatNumber(stats.totalPower)}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-gray-400 font-orbitron">{stats.total25Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-green-400 font-orbitron">{stats.total50Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-yellow-400 font-orbitron">{stats.total75Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-yellow-400 font-orbitron">{stats.total100Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-orange-400 font-orbitron">{stats.total125Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-orange-400 font-orbitron">{stats.total150Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-red-400 font-orbitron">{stats.total175Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-red-400 font-orbitron">{stats.total200Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-purple-400 font-orbitron">{stats.total225Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-purple-400 font-orbitron">{stats.total250Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-pink-400 font-orbitron">{stats.total275Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-pink-400 font-orbitron">{stats.total300Plus}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-red-400 font-orbitron">{formatNumber(stats.totalT5Kills)}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-purple-400 font-orbitron">{formatNumber(stats.totalManaSpent)}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-cyan-400 font-orbitron">{formatNumber(stats.total50Plus > 0 ? stats.totalManaSpent / stats.total50Plus : 0)}</div>
          </td>
          <td className="text-center py-4 px-4">
            <div className="font-bold text-cyan-400 font-orbitron">{formatNumber(stats.averagePower)}</div>
          </td>
        </>
      ) : (
        <td colSpan={16} className="text-center py-4 text-gray-400">
          -
        </td>
      )}
    </motion.tr>
  );
}

// replace the current TeamTotalRow with this
function TeamTotalRow({
  label,
  stats,
  teamColor,
  thresholds, // NEW
}: {
  label: string;
  stats: TeamStats;
  teamColor: "blue" | "red";
  thresholds?: Pick<
    AllianceBreakdown,
    "total25Plus" | "total50Plus" | "total75Plus" | "total100Plus" | "total125Plus" | "total150Plus" | "total175Plus" | "total200Plus" | "total225Plus" | "total250Plus" | "total275Plus" | "total300Plus" | "totalT5Kills" | "totalManaSpent"
  >;
}) {
  const teamColorClasses = {
    blue: "border-2 border-blue-400 bg-blue-500/20",
    red: "border-2 border-red-400 bg-red-500/20",
  };

  return (
    <motion.tr
      initial={{ opacity: 0, scale: 0.97 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ duration: 0.35 }}
      className={`${teamColorClasses[teamColor]} font-bold`}
    >
      <td className="py-6 px-6">
        <div className="flex items-center space-x-3">
          <Crown className={`w-5 h-5 ${teamColor === "blue" ? "text-blue-400" : "text-red-400"}`} />
          <div className={`font-black text-lg font-orbitron ${teamColor === "blue" ? "text-blue-400" : "text-red-400"}`}>
            {label}
          </div>
        </div>
      </td>

      {/* TOTAL POWER */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-white font-orbitron">{formatNumber(stats.totalPower)}</div>
      </td>

      {/* 25M+ */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-lg text-gray-400 font-orbitron">{thresholds?.total25Plus ?? 0}</div>
      </td>

      {/* BATTLE READY (50M+) — we already tracked this on TeamStats */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-green-400 font-orbitron">{stats.memberCount}</div>
      </td>

      {/* 75M+ */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-lg text-yellow-400 font-orbitron">{thresholds?.total75Plus ?? 0}</div>
      </td>

      {/* Threshold sums (now filled) */}
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-yellow-400 font-orbitron">{thresholds?.total100Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-orange-400 font-orbitron">{thresholds?.total125Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-orange-400 font-orbitron">{thresholds?.total150Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-red-400 font-orbitron">{thresholds?.total175Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-red-400 font-orbitron">{thresholds?.total200Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-purple-400 font-orbitron">{thresholds?.total225Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-purple-400 font-orbitron">{thresholds?.total250Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-pink-400 font-orbitron">{thresholds?.total275Plus ?? 0}</div></td>
      <td className="text-center py-6 px-4"><div className="font-black text-lg text-pink-400 font-orbitron">{thresholds?.total300Plus ?? 0}</div></td>

      {/* T5 KILLS */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-red-400 font-orbitron">{formatNumber(thresholds?.totalT5Kills ?? 0)}</div>
      </td>

      {/* MANA SPENT */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-purple-400 font-orbitron">{formatNumber(thresholds?.totalManaSpent ?? 0)}</div>
      </td>

      {/* AVG MANA */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-cyan-400 font-orbitron">{formatNumber(stats.memberCount > 0 ? (thresholds?.totalManaSpent ?? 0) / stats.memberCount : 0)}</div>
      </td>

      {/* AVG POWER */}
      <td className="text-center py-6 px-4">
        <div className="font-black text-xl text-cyan-400 font-orbitron">{formatNumber(stats.averagePower)}</div>
      </td>
    </motion.tr>
  );
}

/** ─────────────────── Main Component ─────────────────── */

export function MatchupView() {
  const { matchupData } = useParams<{ matchupData: string }>();
  const navigate = useNavigate();

  const [matchup, setMatchup] = useState<MatchupConfig | null>(null);
  const [teamAStats, setTeamAStats] = useState<TeamStats | null>(null);
  const [teamBStats, setTeamBStats] = useState<TeamStats | null>(null);

  const [teamABreakdowns, setTeamABreakdowns] = useState<Record<string, AllianceBreakdown>>({});
  const [teamBBreakdowns, setTeamBBreakdowns] = useState<Record<string, AllianceBreakdown>>({});

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const mountedRef = useRef(true);

  const parsed = useMemo(() => {
    try {
      if (!matchupData) return null;
      return JSON.parse(decodeURIComponent(matchupData)) as MatchupConfig;
    } catch {
      return null;
    }
  }, [matchupData]);

  // helpers
  const onlyBattleReady = (players: PlayerLike[]) =>
    players.filter((p) => (p.highest_power ?? 0) >= 50_000_000);

  const sum = (arr: number[]) => arr.reduce((a, b) => a + b, 0);
  const nz = (v?: number | null) => v ?? 0;

  const buildAllianceBreakdown = (players: PlayerLike[]): AllianceBreakdown => {
    const br = onlyBattleReady(players);
    const totalPower = sum(br.map((p) => nz(p.power)));
    const count = br.length;

    const countAt = (min: number) => br.filter((p) => nz(p.highest_power) >= min).length;

    return {
      totalPower,
      averagePower: count ? Math.round(totalPower / count) : 0,
      total25Plus: countAt(25000000),
      total50Plus: count,
      total75Plus: countAt(75000000),
      total100Plus: countAt(100000000),
      total125Plus: countAt(125000000),
      total150Plus: countAt(150000000),
      total175Plus: countAt(175000000),
      total200Plus: countAt(200000000),
      total225Plus: countAt(225000000),
      total250Plus: countAt(250000000),
      total275Plus: countAt(275000000),
      total300Plus: countAt(300_000_000),
      totalT5Kills: sum(br.map((p) => nz(p.killcount_t5))),
      totalManaSpent: sum(br.map((p) => nz(p.mana_spent))),
    };
  };

  const buildTeamStats = (players: PlayerLike[]): TeamStats => {
    const br = onlyBattleReady(players);
    const acc: TeamStats = { ...EMPTY_TEAM };

    for (const p of br) {
      acc.totalPower += nz(p.power);
      acc.totalMerits += nz(p.merits);
      acc.totalKills += nz(p.units_killed);
      acc.totalT5Kills += nz(p.killcount_t5);
      acc.totalT4Kills += nz(p.killcount_t4);
      acc.totalT3Kills += nz(p.killcount_t3);
      acc.totalT2Kills += nz(p.killcount_t2);
      acc.totalT1Kills += nz(p.killcount_t1);
      acc.totalUnitsDead += nz(p.units_dead);
      acc.totalUnitsHealed += nz(p.units_healed);
      acc.totalManaSpent += nz(p.mana_spent);
      acc.totalHelpsGiven += nz(p.helps_given);
      acc.totalScouted += nz(p.scouted);
      acc.totalVictories += nz(p.victories);
      acc.totalDefeats += nz(p.defeats);
      acc.memberCount += 1;
    }

    acc.averagePower = acc.memberCount ? Math.round(acc.totalPower / acc.memberCount) : 0;
    
    return acc;
  };

  const buildTeamBreakdown = (breakdowns: Record<string, AllianceBreakdown>): AllianceBreakdown => {
    const alliances = Object.values(breakdowns);
    const totalMembers = alliances.reduce((sum, b) => sum + b.total50Plus, 0);
    return {
      totalPower: alliances.reduce((sum, b) => sum + b.totalPower, 0),
      averagePower: totalMembers > 0 ? Math.round(alliances.reduce((sum, b) => sum + b.totalPower, 0) / totalMembers) : 0,
      total25Plus: alliances.reduce((sum, b) => sum + b.total25Plus, 0),
      total50Plus: alliances.reduce((sum, b) => sum + b.total50Plus, 0),
      total75Plus: alliances.reduce((sum, b) => sum + b.total75Plus, 0),
      total100Plus: alliances.reduce((sum, b) => sum + b.total100Plus, 0),
      total125Plus: alliances.reduce((sum, b) => sum + b.total125Plus, 0),
      total150Plus: alliances.reduce((sum, b) => sum + b.total150Plus, 0),
      total175Plus: alliances.reduce((sum, b) => sum + b.total175Plus, 0),
      total200Plus: alliances.reduce((sum, b) => sum + b.total200Plus, 0),
      total225Plus: alliances.reduce((sum, b) => sum + b.total225Plus, 0),
      total250Plus: alliances.reduce((sum, b) => sum + b.total250Plus, 0),
      total275Plus: alliances.reduce((sum, b) => sum + b.total275Plus, 0),
      total300Plus: alliances.reduce((sum, b) => sum + b.total300Plus, 0),
      totalT5Kills: alliances.reduce((sum, b) => sum + b.totalT5Kills, 0),
      totalManaSpent: alliances.reduce((sum, b) => sum + b.totalManaSpent, 0),
    };
  };

  const downloadTableAsImage = async () => {
    try {
      setIsExporting(true);
      
      const tableElement = document.getElementById('battle-statistics-table');
      if (!tableElement) {
        throw new Error('Table element not found');
      }

      const html2canvas = (await import('html2canvas')).default;
      
      const canvas = await html2canvas(tableElement, {
        backgroundColor: '#1a1a1a',
        scale: 2,
        useCORS: true,
        allowTaint: true,
      });
      
      // Create download link
      const link = document.createElement('a');
      link.download = `battle-statistics-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
      
    } catch (err) {
      console.error('Failed to export table:', err);
      alert('Failed to export table. Please try again.');
    } finally {
      setIsExporting(false);
    }
  };
  const fetchAlliancesOnce = async (alliances: Alliance[]) => {
    // One network request per alliance, in parallel.
    const entries = await Promise.all(
      alliances.map(async (a) => {
        try {
          const players = (await fetchLeaderboard(a.id)) as PlayerLike[];
          return [a.id, players] as const;
        } catch (e) {
          console.error(`Failed to load ${a.tag}`, e);
          return [a.id, [] as PlayerLike[]] as const;
        }
      })
    );
    return new Map<string, PlayerLike[]>(entries);
  };

  const load = async () => {
    if (!parsed) {
      setError("Invalid matchup data");
      setLoading(false);
      return;
    }

    try {
      setLoading(true);
      setError(null);
      setMatchup(parsed);

      // Fetch team A and team B in parallel
      const [mapA, mapB] = await Promise.all([
        fetchAlliancesOnce(parsed.teamA),
        fetchAlliancesOnce(parsed.teamB),
      ]);

      // Debug logging for fetched data
      // Per-alliance breakdowns
      const aBreakdowns: Record<string, AllianceBreakdown> = {};
      const bBreakdowns: Record<string, AllianceBreakdown> = {};

      for (const [id, players] of mapA.entries()) aBreakdowns[id] = buildAllianceBreakdown(players);
      for (const [id, players] of mapB.entries()) bBreakdowns[id] = buildAllianceBreakdown(players);

      // Team totals (flatten then aggregate)
      const allAPlayers = Array.from(mapA.values()).flat();
      const allBPlayers = Array.from(mapB.values()).flat();

      const aStats = buildTeamStats(allAPlayers);
      const bStats = buildTeamStats(allBPlayers);

      if (!mountedRef.current) return;
      setTeamABreakdowns(aBreakdowns);
      setTeamBBreakdowns(bBreakdowns);
      setTeamAStats(aStats);
      setTeamBStats(bStats);
    } catch (e: any) {
      if (!mountedRef.current) return;
      setError(e?.message ?? "Failed to load matchup");
    } finally {
      if (mountedRef.current) setLoading(false);
    }
  };

  useEffect(() => {
    mountedRef.current = true;
    load();
    return () => {
      mountedRef.current = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [parsed]);

  const getWinner = (a: number, b: number) => (a > b ? "A" : b > a ? "B" : "tie");

  const StatComparison = ({
    label,
    icon: Icon,
    teamAValue,
    teamBValue,
    color,
    isHigherBetter = true,
  }: {
    label: string;
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
    teamAValue: number;
    teamBValue: number;
    color: string;
    isHigherBetter?: boolean;
  }) => {
    const winner = isHigherBetter ? getWinner(teamAValue, teamBValue) : getWinner(teamBValue, teamAValue);
    return (
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="glass-panel-light rounded-xl p-6 neon-border relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5" />
        <div className="flex items-center justify-center mb-4 relative z-10">
          <Icon className="w-6 h-6 mr-3" style={{ color }} />
          <h3 className="text-lg font-bold text-white font-orbitron">{label}</h3>
        </div>

        <div className="grid grid-cols-3 gap-4 items-center relative z-10">
          <div className={`text-center p-4 rounded-xl ${winner === "A" ? "bg-blue-500/20 border-2 border-blue-400" : "bg-gray-800/50"}`}>
            <div className="text-sm font-bold text-blue-400 font-orbitron mb-2">TEAM A</div>
            <div className="text-2xl font-black text-white font-orbitron">{formatNumber(teamAValue)}</div>
            {winner === "A" && <Crown className="w-5 h-5 text-yellow-400 mx-auto mt-2" />}
          </div>
          <div className="text-center">
            <div className="text-2xl font-black text-gray-400 font-orbitron">VS</div>
          </div>
          <div className={`text-center p-4 rounded-xl ${winner === "B" ? "bg-red-500/20 border-2 border-red-400" : "bg-gray-800/50"}`}>
            <div className="text-sm font-bold text-red-400 font-orbitron mb-2">TEAM B</div>
            <div className="text-2xl font-black text-white font-orbitron">{formatNumber(teamBValue)}</div>
            {winner === "B" && <Crown className="w-5 h-5 text-yellow-400 mx-auto mt-2" />}
          </div>
        </div>
      </motion.div>
    );
  };

  if (loading) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center justify-center min-h-96">
        <div className="text-center">
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 2, repeat: Infinity, ease: "linear" }}
            className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
          >
            <Sword className="w-8 h-8 text-red-400" />
          </motion.div>
          <p className="text-red-400 font-orbitron font-bold">CALCULATING BATTLE STATS...</p>
        </div>
      </motion.div>
    );
  }

  if (error) {
    return (
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center py-12">
        <ErrorMessage message={error} />
        <motion.button
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="mt-6 px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-bold transition-colors flex items-center mx-auto"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          Go Back
        </motion.button>
      </motion.div>
    );
  }

  if (!matchup || !teamAStats || !teamBStats) {
    return <LoadingSpinner />;
  }

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="space-y-8 relative overflow-hidden">
      {/* Background Characters for Battle Theme */}
      <div className="absolute right-0 top-40 opacity-35 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Battle Character"
          className="w-80 h-auto transform rotate-12"
        />
      </div>
      <div className="absolute left-0 bottom-40 opacity-40 pointer-events-none">
        <img
          src="/girlbg.png"
          alt="Battle Character"
          className="w-72 h-auto transform -rotate-15 scale-x-[-1]"
        />
      </div>
      
      {/* Header */}
      <div className="flex items-center mb-8 relative z-20">
        <motion.button
          whileHover={{ scale: 1.05, x: -5 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => navigate(-1)}
          className="mr-6 p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
        >
          <ArrowLeft className="w-6 h-6 text-cyan-400" />
        </motion.button>
        <motion.div animate={{ rotate: [0, 10, -10, 0] }} transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }} className="p-4 glass-panel-light rounded-2xl neon-border neon-glow">
          <Sword className="w-10 h-10 text-red-400" />
        </motion.div>
        <div>
          <h1 className="text-3xl font-black text-white font-orbitron">
            <span className="text-red-400">{matchup.camps}v{matchup.camps}</span> <span className="text-orange-400">BATTLE</span>
          </h1>
          <p className="text-gray-400 mt-2">Epic alliance warfare statistics comparison</p>
        </div>
      </div>

      {/* Team Overview */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Team A */}
        <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
          <div className="flex items-center mb-6 relative z-10">
            <Shield className="w-6 h-6 text-blue-400 mr-3" />
            <h2 className="text-2xl font-black text-blue-400 font-orbitron">TEAM A</h2>
          </div>

          <div className="space-y-3 relative z-10">
            {matchup.teamA.map((alliance, index) => (
              <motion.div key={alliance.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.08 }} className="flex items-center space-x-3 p-4 glass-panel-light rounded-xl neon-border">
                <Shield className="w-5 h-5 text-blue-400" />
                <div>
                  <div className="font-bold text-white">[{alliance.tag}]</div>
                  <div className="text-sm text-gray-400">{alliance.name}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 glass-panel-light rounded-xl neon-border relative z-10">
            <div className="text-center">
              <div className="text-sm text-blue-400 font-bold font-orbitron mb-2">TOTAL MEMBERS (50M+)</div>
              <div className="text-3xl font-black text-blue-400 font-orbitron">{teamAStats.memberCount}</div>
            </div>
          </div>
        </motion.div>

        {/* Team B */}
        <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.2 }} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
          <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10" />
          <div className="flex items-center mb-6 relative z-10">
            <Sword className="w-6 h-6 text-red-400 mr-3" />
            <h2 className="text-2xl font-black text-red-400 font-orbitron">TEAM B</h2>
          </div>

          <div className="space-y-3 relative z-10">
            {matchup.teamB.map((alliance, index) => (
              <motion.div key={alliance.id} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.3 + index * 0.08 }} className="flex items-center space-x-3 p-4 glass-panel-light rounded-xl neon-border">
                <Sword className="w-5 h-5 text-red-400" />
                <div>
                  <div className="font-bold text-white">[{alliance.tag}]</div>
                  <div className="text-sm text-gray-400">{alliance.name}</div>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-6 p-4 glass-panel-light rounded-xl neon-border relative z-10">
            <div className="text-center">
              <div className="text-sm text-red-400 font-bold font-orbitron mb-2">TOTAL MEMBERS (50M+)</div>
              <div className="text-3xl font-black text-red-400 font-orbitron">{teamBStats.memberCount}</div>
            </div>
          </div>
        </motion.div>
      </div>

      {/* Battle Statistics */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-pink-400 font-orbitron mb-2">BATTLE STATISTICS</h2>
          <p className="text-gray-400">Comprehensive comparison of combined alliance power</p>
        </div>

        {/* Alliance comparison table */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="glass-panel rounded-2xl neon-border p-8 relative overflow-hidden" id="battle-statistics-table">
          <div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10" />
          <div className="flex items-center justify-between mb-8 relative z-10">
            <div className="flex items-center">
              <BarChart3 className="w-8 h-8 text-cyan-400 mr-4" />
              <h3 className="text-2xl font-black text-cyan-400 font-orbitron">ALLIANCE POWER BREAKDOWN</h3>
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={downloadTableAsImage}
              disabled={isExporting}
              className="flex items-center px-4 py-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 text-white rounded-lg font-bold transition-colors"
            >
              <Download className="w-5 h-5 mr-2" />
              {isExporting ? 'Exporting...' : 'Export PNG'}
            </motion.button>
          </div>

          <div className="relative z-10 overflow-x-auto">
            <table className="w-full border-collapse bg-gray-900/50" style={{ minWidth: '800px' }}>
              <thead>
                <tr className="border-b-2 border-cyan-400/50">
                  <th className="text-left py-4 px-6 text-cyan-400 font-orbitron font-bold text-sm">ALLIANCE</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">TOTAL POWER</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">25M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">
                    BATTLE READY<br />(50M+)
                  </th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">75M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">100M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">125M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">150M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">175M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">200M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">225M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">250M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">275M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">300M+</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">T5 KILLS</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">MANA SPENT</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">AVG MANA</th>
                  <th className="text-center py-4 px-4 text-cyan-400 font-orbitron font-bold text-sm">AVG POWER</th>
                </tr>
              </thead>
              <tbody>
                {/* Team A */}
                {matchup.teamA.map((alliance, i) => (
                  <AllianceStatsRow
                    key={alliance.id}
                    alliance={alliance}
                    teamColor="blue"
                    index={i}
                    stats={teamABreakdowns[alliance.id] ?? null}
                  />
                ))}
                <TeamTotalRow 
                  label="TEAM A TOTAL" 
                  stats={teamAStats} 
                  teamColor="blue" 
                  thresholds={buildTeamBreakdown(teamABreakdowns)}
                />

                {/* Spacer */}
                <tr><td colSpan={11} className="py-2" /></tr>

                {/* Team B */}
                {matchup.teamB.map((alliance, i) => (
                  <AllianceStatsRow
                    key={alliance.id}
                    alliance={alliance}
                    teamColor="red"
                    index={i}
                    stats={teamBBreakdowns[alliance.id] ?? null}
                  />
                ))}
                <TeamTotalRow 
                  label="TEAM B TOTAL" 
                  stats={teamBStats} 
                  teamColor="red" 
                  thresholds={buildTeamBreakdown(teamBBreakdowns)}
                />
              </tbody>
            </table>
          </div>
        </motion.div>

        {/* Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <StatComparison label="TOTAL POWER" icon={TrendingUp} teamAValue={teamAStats.totalPower} teamBValue={teamBStats.totalPower} color="#3b82f6" />
          <StatComparison label="AVERAGE POWER" icon={TrendingUp} teamAValue={teamAStats.averagePower} teamBValue={teamBStats.averagePower} color="#06b6d4" />
          <StatComparison label="TOTAL MERITS" icon={Award} teamAValue={teamAStats.totalMerits} teamBValue={teamBStats.totalMerits} color="#9333ea" />
          <StatComparison label="TOTAL KILLS" icon={Sword} teamAValue={teamAStats.totalKills} teamBValue={teamBStats.totalKills} color="#ef4444" />
          <StatComparison label="T5 KILLS" icon={Crown} teamAValue={teamAStats.totalT5Kills} teamBValue={teamBStats.totalT5Kills} color="#f59e0b" />
          <StatComparison label="UNITS DEAD" icon={Target} teamAValue={teamAStats.totalUnitsDead} teamBValue={teamBStats.totalUnitsDead} color="#ef4444" isHigherBetter={false} />
          <StatComparison label="UNITS HEALED" icon={Heart} teamAValue={teamAStats.totalUnitsHealed} teamBValue={teamBStats.totalUnitsHealed} color="#10b981" />
          <StatComparison label="MANA SPENT" icon={Zap} teamAValue={teamAStats.totalManaSpent} teamBValue={teamBStats.totalManaSpent} color="#8b5cf6" />
        </div>
      </motion.div>

      {/* Calculation Showcases */}
      <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="space-y-6">
        <div className="text-center">
          <h2 className="text-2xl font-black text-cyan-400 font-orbitron mb-2">CALCULATION BREAKDOWN</h2>
          <p className="text-gray-400">Mathematical analysis of team statistics</p>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Team A */}
          <motion.div initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-cyan-500/10" />
            <div className="flex items-center mb-6 relative z-10">
              <Shield className="w-6 h-6 text-blue-400 mr-3" />
              <h3 className="text-xl font-black text-blue-400 font-orbitron">TEAM A CALCULATIONS</h3>
            </div>
            <div className="space-y-6 relative z-10">
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
                <h4 className="text-md font-bold text-blue-400 font-orbitron mb-4">📊 TOTAL POWER CALCULATION</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-blue-400">Formula:</span>
                    <span className="text-white">Sum of players with 50M+ highest_power</span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-500/20 p-3 rounded-lg border border-blue-400">
                    <span className="text-blue-400 font-bold">Total Power:</span>
                    <span className="text-blue-400 font-bold">{teamAStats.totalPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-cyan-400">Average Power:</span>
                    <span className="text-white">
                      {teamAStats.totalPower.toLocaleString()} ÷ {teamAStats.memberCount.toLocaleString()} = {teamAStats.averagePower.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-red-500/10 to-pink-500/10">
                <h4 className="text-md font-bold text-red-400 font-orbitron mb-4">⚔️ COMBAT CALCULATIONS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-red-400">Total Kills:</span>
                    <span className="text-white">{teamAStats.totalKills.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-orange-400">T5 Kills:</span>
                    <span className="text-white">{teamAStats.totalT5Kills.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">Units Healed:</span>
                    <span className="text-white">{teamAStats.totalUnitsHealed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-blue-500/20 p-3 rounded-lg border border-blue-400">
                    <span className="text-blue-400 font-bold">Alliance Count:</span>
                    <span className="text-blue-400 font-bold">{matchup.teamA.length.toLocaleString()} alliances</span>
                  </div>
                  <div className="flex items-center justify-between bg-green-500/20 p-3 rounded-lg border border-green-400">
                    <span className="text-green-400 font-bold">Total Members:</span>
                    <span className="text-green-400 font-bold">{teamAStats.memberCount.toLocaleString()} players</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>

          {/* Team B */}
          <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} className="glass-panel rounded-2xl p-6 relative overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-pink-500/10" />
            <div className="flex items-center mb-6 relative z-10">
              <Sword className="w-6 h-6 text-red-400 mr-3" />
              <h3 className="text-xl font-black text-red-400 font-orbitron">TEAM B CALCULATIONS</h3>
            </div>
            <div className="space-y-6 relative z-10">
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-red-500/10 to-orange-500/10">
                <h4 className="text-md font-bold text-red-400 font-orbitron mb-4">📊 TOTAL POWER CALCULATION</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-red-400">Formula:</span>
                    <span className="text-white">Sum of players with 50M+ highest_power</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-500/20 p-3 rounded-lg border border-red-400">
                    <span className="text-red-400 font-bold">Total Power:</span>
                    <span className="text-red-400 font-bold">{teamBStats.totalPower.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-cyan-400">Average Power:</span>
                    <span className="text-white">
                      {teamBStats.totalPower.toLocaleString()} ÷ {teamBStats.memberCount.toLocaleString()} = {teamBStats.averagePower.toLocaleString()}
                    </span>
                  </div>
                </div>
              </div>
              <div className="glass-panel-light rounded-xl p-6 neon-border bg-gradient-to-r from-purple-500/10 to-pink-500/10">
                <h4 className="text-md font-bold text-purple-400 font-orbitron mb-4">⚔️ COMBAT CALCULATIONS</h4>
                <div className="space-y-3 font-mono text-sm">
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-red-400">Total Kills:</span>
                    <span className="text-white">{teamBStats.totalKills.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-orange-400">T5 Kills:</span>
                    <span className="text-white">{teamBStats.totalT5Kills.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
                    <span className="text-green-400">Units Healed:</span>
                    <span className="text-white">{teamBStats.totalUnitsHealed.toLocaleString()}</span>
                  </div>
                  <div className="flex items-center justify-between bg-red-500/20 p-3 rounded-lg border border-red-400">
                    <span className="text-red-400 font-bold">Alliance Count:</span>
                    <span className="text-red-400 font-bold">{matchup.teamB.length.toLocaleString()} alliances</span>
                  </div>
                  <div className="flex items-center justify-between bg-green-500/20 p-3 rounded-lg border border-green-400">
                    <span className="text-green-400 font-bold">Total Members:</span>
                    <span className="text-green-400 font-bold">{teamBStats.memberCount.toLocaleString()} players</span>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
}