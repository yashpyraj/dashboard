// src/pages/Welcome.tsx
import React, { useEffect, useRef, useState } from "react";
import {
  Shield,
  Users,
  Calendar,
  Search,
  X,
  Filter,
  Trophy,
  Crown,
  Award,
  Sword,
  TrendingUp,
  Eye,
  Hash,
  User,
} from "lucide-react";
import { Target, Heart, Zap } from "lucide-react";
import { motion } from "framer-motion";
import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { useAllianceStore } from "../store/allianceStore";
import { fetchAlliances } from "../utils/queries";
import { supabase } from "../lib/supabase";
import { PinVerificationModal } from "../components/Alliance/PinVerificationModal";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";
import { ErrorMessage } from "../components/UI/ErrorMessage";
import { useNavigate } from "react-router-dom";
import { DataTable, Column } from "../components/UI/DataTable";

interface AllianceWithStats {
  id: string;
  tag: string;
  name: string;
  created_at?: string;
  memberCount?: number;
  lastScanDate?: string;
  generation?: string;
  season_start_date?: string;
  season_end_date?: string;
  homeServer?: string;
  is_pin_protected?: boolean;
  access_pin?: string | null;
  pin_hint?: string | null;
}

interface UniversalPlayer {
  player_id: string;
  name: string;
  alliance_tag: string;
  alliance_id: string;
  highest_power: number | null;
  merits: number | null;
  units_killed: number | null;
  killcount_t5: number | null;
  killcount_t1: number | null;
  killcount_t4: number | null;
  mana: number | null;
  units_dead: number | null;
  faction: string | null;
  lord_id: string | null;
  home_server: string | null;
  scan_date: string;
}

type UniversalLeaderboardTab =
  | "highest_power"
  | "merits"
  | "units_killed"
  | "killcount_t5"
  | "killcount_t1"
  | "killcount_t4"
  | "mana"
  | "units_dead";

export function Welcome() {
  const navigate = useNavigate();

  // Donors array - easy to edit and maintain
  const donors = [
    { name: "Widow", money: 5, currency: "Euro" },
    { name: "Mew", money: 25, currency: "USD" },
    { name: "Murt", money: 10, currency: "USD" },
    { name: "GrimJJ", money: 1, currency: "USD" },
    { name: "Pradh", money: 1000, currency: "Rupees" },
    { name: "Wahid", money: 100, currency: "USD" },
    { name: "Ionz", money: 20, currency: "USD" },
  ];

  const getDonorStyle = (index: number) => {
    const colors = [
      {
        color: "from-pink-500 to-purple-500",
        textColor: "text-pink-400",
        emoji: "💖",
      },
      {
        color: "from-blue-500 to-cyan-500",
        textColor: "text-blue-400",
        emoji: "⭐",
      },
      {
        color: "from-yellow-500 to-orange-500",
        textColor: "text-yellow-400",
        emoji: "🌟",
      },
      {
        color: "from-green-500 to-emerald-500",
        textColor: "text-green-400",
        emoji: "💎",
      },
      {
        color: "from-purple-500 to-pink-500",
        textColor: "text-purple-400",
        emoji: "🎯",
      },
      {
        color: "from-red-500 to-orange-500",
        textColor: "text-red-400",
        emoji: "🔥",
      },
    ];
    return colors[index % colors.length];
  };

  // ---- Alliance data state (unchanged) ----
  const {
    alliances,
    isLoadingAlliances,
    error,
    setAlliances,
    setLoadingAlliances,
    setError,
    setSelectedAlliance,
  } = useAllianceStore();

  const [alliancesWithStats, setAlliancesWithStats] = useState<
    AllianceWithStats[]
  >([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedGeneration, setSelectedGeneration] = useState<string>("all");
  const [filteredAlliances, setFilteredAlliances] = useState<
    AllianceWithStats[]
  >([]);
  const [showPinModal, setShowPinModal] = useState(false);
  const [selectedProtectedAlliance, setSelectedProtectedAlliance] =
    useState<AllianceWithStats | null>(null);

  const loadAlliances = async () => {
    try {
      setLoadingAlliances(true);
      setError(null);
      const data = await fetchAlliances();
      setAlliances(data);

      // Load alliance protection status and stats
      const alliancesWithStatsData = await Promise.all(
        data.map(async (alliance) => {
          try {
            // Get alliance protection info
            const { data: allianceInfo } = await supabase
              .from("alliances")
              .select("is_pin_protected, access_pin, pin_hint")
              .eq("id", alliance.id)
              .single();

            // Get latest scan date
            const { data: latestScan } = await supabase
              .from("scans")
              .select("scan_date, id")
              .eq("alliance_id", alliance.id)
              .order("scan_date", { ascending: false })
              .limit(1)
              .maybeSingle();

            let memberCount = 0;
            if (latestScan) {
              // Get member count from latest scan (50M+ power)
              const { data: stats } = await supabase
                .from("player_stats")
                .select("id")
                .eq("scan_id", latestScan.id)
                .not("home_server", "is", null)
                .gte("highest_power", 50000000);

              memberCount = stats?.length || 0;
            }

            // Get home server info from latest scan
            let homeServer = undefined;
            if (latestScan) {
              const { data: serverStats } = await supabase
                .from("player_stats")
                .select("home_server")
                .eq("scan_id", latestScan.id)
                .not("home_server", "is", null)
                .limit(1)
                .maybeSingle();

              homeServer = serverStats?.home_server || undefined;
            }

            return {
              ...alliance,
              is_pin_protected: allianceInfo?.is_pin_protected || false,
              access_pin: allianceInfo?.access_pin,
              pin_hint: allianceInfo?.pin_hint,
              memberCount,
              lastScanDate: latestScan?.scan_date,
              homeServer,
            };
          } catch (err) {
            return {
              ...alliance,
              is_pin_protected: false,
              access_pin: null,
              pin_hint: null,
              memberCount: 0,
              lastScanDate: undefined,
            };
          }
        })
      );

      setAlliancesWithStats(alliancesWithStatsData);
      setFilteredAlliances(alliancesWithStatsData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load alliances");
    } finally {
      setLoadingAlliances(false);
    }
  };

  useEffect(() => {
    loadAlliances();
  }, []);

  // Filter alliances based on search and generation
  useEffect(() => {
    let filtered = alliancesWithStats;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(
        (alliance) =>
          alliance.tag.toLowerCase().includes(query) ||
          alliance.name.toLowerCase().includes(query)
      );
    }

    // Filter by generation
    if (selectedGeneration !== "all") {
      filtered = filtered.filter(
        (alliance) => alliance.generation === selectedGeneration
      );
    }

    setFilteredAlliances(filtered);
  }, [alliancesWithStats, searchQuery, selectedGeneration]);

  const formatNumber = (num: number | null) => {
    if (!num) return "0";
    if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
    if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
    if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
    return num.toString();
  };

  // Get unique generations for filter
  const availableGenerations = Array.from(
    new Set(alliancesWithStats.map((a) => a.generation).filter(Boolean))
  );

  const clearSearch = () => {
    setSearchQuery("");
    setSelectedGeneration("all");
  };

  const handleAllianceClick = (alliance: AllianceWithStats) => {
    // Check if alliance is PIN protected
    if (alliance.is_pin_protected) {
      // Check if already verified in this session
      const isVerified =
        sessionStorage.getItem(`alliance_access_${alliance.tag}`) ===
        "verified";

      if (!isVerified) {
        setSelectedProtectedAlliance(alliance);
        setShowPinModal(true);
        return;
      }
    }

    // Proceed to alliance page
    proceedToAlliance(alliance.id);
  };

  const proceedToAlliance = (allianceId: string) => {
    setSelectedAlliance(allianceId);
    navigate(`/alliance/${allianceId}`);
  };

  const handlePinSuccess = () => {
    if (selectedProtectedAlliance) {
      proceedToAlliance(selectedProtectedAlliance.id);
    }
  };

  const handlePinModalClose = () => {
    setShowPinModal(false);
    setSelectedProtectedAlliance(null);
  };

  // ---- Cinematic intro state ----
  const [showContent, setShowContent] = useState(false);
  const [animationComplete, setAnimationComplete] = useState(false);
  const mainRef = useRef<HTMLDivElement | null>(null);

  // Phase 1: Mask-in "Y" blast (logo gate)
  useGSAP(() => {
    const tl = gsap.timeline();
    tl.to(".vi-mask-group", {
      rotate: 10,
      duration: 2,
      ease: "Power4.easeInOut",
      transformOrigin: "50% 50%",
    }).to(".vi-mask-group", {
      scale: 10,
      duration: 2,
      delay: -1.8,
      ease: "Expo.easeInOut",
      transformOrigin: "50% 50%",
      opacity: 0,
      onUpdate: function () {
        if (this.progress() >= 0.9) {
          setShowContent(true);
          setAnimationComplete(true);
          this.kill();
        }
      },
    });
  }, []);

  // Phase 2: Parallax hero reveal + motion
  useGSAP(() => {
    if (!showContent) return;

    gsap.set(
      [
        ".welcome-hero .main",
        ".welcome-hero .sky",
        ".welcome-hero .bg",
        ".welcome-hero .character",
        ".welcome-hero .text",
      ],
      { visibility: "visible" }
    );

    gsap.to(".welcome-hero .main", {
      scale: 1,
      rotate: 0,
      duration: 2,
      delay: -1,
      ease: "Expo.easeInOut",
    });
    gsap.to(".welcome-hero .sky", {
      scale: 1.1,
      rotate: 0,
      duration: 2,
      delay: -0.8,
      ease: "Expo.easeInOut",
    });
    gsap.to(".welcome-hero .bg", {
      scale: 1.1,
      rotate: 0,
      duration: 2,
      delay: -0.8,
      ease: "Expo.easeInOut",
    });
    // character anim (right-side, no center translate)
    gsap.to(".welcome-hero .character", {
      scale: 1.25,
      bottom: "-10%",
      rotate: 0,
      duration: 2,
      delay: -0.8,
      ease: "Expo.easeInOut",
    });
    gsap.to(".welcome-hero .text", {
      scale: 1,
      rotate: 0,
      duration: 2,
      delay: -0.8,
      ease: "Expo.easeInOut",
    });

    // Mouse parallax
    const onMove = (e: MouseEvent) => {
      const xMove = (e.clientX / window.innerWidth - 0.5) * 40;
      gsap.to(".welcome-hero .text", { x: `${xMove * 0.3}%` });
      gsap.to(".welcome-hero .sky", { x: xMove });
      gsap.to(".welcome-hero .bg", { x: xMove * 1.7 });
      gsap.to(".welcome-hero .character", { x: `${xMove * -0.2}%` });
    };

    const main = mainRef.current;
    main?.addEventListener("mousemove", onMove);
    return () => {
      main?.removeEventListener("mousemove", onMove);
    };
  }, [showContent]);

  return (
    <div className="relative w-full min-h-screen bg-black">
      {/* --- Intro Mask Overlay --- */}
      {!animationComplete && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center bg-[#000]">
          <svg
            viewBox="0 0 800 600"
            preserveAspectRatio="xMidYMid slice"
            className="w-full h-full"
          >
            <defs>
              <mask id="viMask">
                <rect width="100%" height="100%" fill="black" />
                <g className="vi-mask-group">
                  <text
                    x="50%"
                    y="50%"
                    fontSize="250"
                    textAnchor="middle"
                    fill="white"
                    dominantBaseline="middle"
                    fontFamily="Arial Black"
                  >
                    Y
                  </text>
                </g>
              </mask>
            </defs>
            <image
              href="/bg.png"
              width="100%"
              height="100%"
              preserveAspectRatio="xMidYMid slice"
              mask="url(#viMask)"
            />
          </svg>
        </div>
      )}

      {/* --- Hero + Content --- */}
      <div ref={mainRef} className="welcome-hero">
        {/* Cinematic hero */}
        <div
          className="main w-full rotate-[-10deg] scale-[1.7]"
          style={{ visibility: "hidden" }}
        >
          <div className="landing overflow-hidden relative w-full h-[80vh] sm:h-[75vh] bg-black">
            <div className="imagesdiv relative overflow-hidden w-full h-full">
              <img
                className="absolute sky scale-[1.5] rotate-[-20deg] top-0 left-0 w-full h-full object-cover"
                src="/sky.png"
                alt=""
                style={{ visibility: "hidden" }}
              />
              <img
                className="absolute scale-[1.8] rotate-[-3deg] bg top-0 left-0 w-full h-full object-cover"
                src="/bg.png"
                alt=""
                style={{ visibility: "hidden" }}
              />

              {/* LEFT: Title block */}
              <div
                className="
                  text text-white flex flex-col gap-3
                  absolute top-16 md:top-20
                  left-6 md:left-12
                  scale-[1.05] md:scale-[1.2]
                  rotate-[-10deg]
                "
                style={{ visibility: "hidden" }}
              >
                <h1 className="text-[12vw] md:text-[9rem] leading-none font-black tracking-tight">
                  Yammy
                </h1>
                <h1 className="text-[12vw] md:text-[9rem] leading-none font-black tracking-tight">
                  Dashboard
                </h1>
              </div>

              {/* RIGHT: Character */}
              <img
                className="
    absolute character
    right-4 sm:right-8 md:right-12
    bottom-[-8%]
    rotate-[-10deg]
    w-[120px] sm:w-[180px] md:w-[280px] lg:w-[380px]
    max-w-[30%] h-auto
    transition-all duration-500
  "
                src="/girlbg.png"
                alt="Character"
                style={{ visibility: "hidden" }}
              />
            </div>

            <div className="btmbar text-white absolute bottom-0 left-0 w-full py-10 px-6 bg-gradient-to-t from-black to-transparent">
              <img
                className="absolute h-[40px] md:h-[55px] top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 opacity-70"
                src="/ps5.png"
                alt=""
              />
            </div>
          </div>
        </div>

        {/* KVK 1 Card */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full bg-[#0D0D0D] border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <motion.div
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.8 }}
              onClick={() => navigate("/kvk-final-zone")}
              className="glass-panel-light rounded-2xl p-6 mb-8 cursor-pointer hover:scale-[1.02] transition-all duration-300 border-2 border-red-500/30 hover:border-red-500/60 bg-gradient-to-br from-red-950/20 to-orange-950/20"
            >
              <div className="flex flex-col md:flex-row items-center justify-between gap-4">
                <div className="flex items-center gap-4">
                  <div className="relative w-16 h-16 rounded-xl bg-gradient-to-br from-red-500 to-orange-500 flex items-center justify-center">
                    <Sword className="w-8 h-8 text-white" />
                    <motion.div
                      animate={{
                        scale: [1, 1.4, 1],
                        opacity: [0.8, 0, 0.8],
                      }}
                      transition={{
                        duration: 2,
                        repeat: Infinity,
                        ease: "easeInOut",
                      }}
                      className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full"
                    />
                    <div className="absolute top-0 right-0 w-3 h-3 bg-red-500 rounded-full animate-pulse" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <h3 className="text-2xl font-black text-transparent bg-clip-text bg-gradient-to-r from-red-500 via-orange-500 to-yellow-500 font-orbitron mb-1">
                        KVK 1
                      </h3>
                      <span className="px-2 py-0.5 text-xs font-bold text-white bg-red-500 rounded-full animate-pulse">
                        LIVE
                      </span>
                    </div>
                    <p className="text-gray-400 text-sm">
                      Final Zone Battle Statistics
                    </p>
                  </div>
                </div>
                <div className="flex gap-6 text-center">
                  <div>
                    <div className="text-blue-400 font-bold text-xs mb-1">
                      TEAM A
                    </div>
                    <div className="text-white text-sm">49, 60, 225</div>
                  </div>
                  <div className="text-2xl font-bold text-red-500">VS</div>
                  <div>
                    <div className="text-red-400 font-bold text-xs mb-1">
                      TEAM B
                    </div>
                    <div className="text-white text-sm">249, 363, 176</div>
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        </motion.div>

        {/* Analytics body (grid) */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full bg-[#0D0D0D] border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            {/* Title + Subtitle */}
            <div className="mb-8 text-center">
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.2, duration: 0.8 }}
                className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-orbitron mb-4"
              >
                <span className="text-orange-500">ALLIANCE</span> COMMAND CENTER
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.4, duration: 0.8 }}
                className="secondary-text text-base sm:text-lg mb-4 px-4"
              >
                Select any Call of Dragons alliance to access strategic
                intelligence and member analytics
              </motion.p>

              {/* Call of Dragons Logo */}
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="flex justify-center mb-6 sm:mb-8"
              >
                <div className="glass-panel-light rounded-2xl p-4 neon-border hover:neon-glow transition-all duration-300">
                  <img
                    src="/kv_logo.png"
                    alt="Call of Dragons"
                    className="h-12 sm:h-16 w-auto object-contain"
                  />
                </div>
              </motion.div>

              {/* Search and Filter Controls */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="max-w-4xl mx-auto space-y-4"
              >
                {/* Search Bar */}
                <div className="relative">
                  <Search className="absolute left-4 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                  <input
                    type="text"
                    placeholder="Search alliances by tag or name..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full pl-12 pr-12 py-3 sm:py-4 bg-gray-800/50 border border-gray-600/50 rounded-2xl text-white placeholder-gray-400 focus:ring-2 focus:ring-orange-500 focus:border-orange-500 transition-all duration-300 backdrop-blur-sm text-sm sm:text-base"
                  />
                  {(searchQuery || selectedGeneration !== "all") && (
                    <motion.button
                      whileHover={{ scale: 1.1 }}
                      whileTap={{ scale: 0.9 }}
                      onClick={clearSearch}
                      className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-orange-400 transition-colors duration-300"
                    >
                      <X className="w-5 h-5" />
                    </motion.button>
                  )}
                </div>

                {/* Generation Filter */}
                <div className="flex flex-col sm:flex-row items-center justify-center space-y-2 sm:space-y-0 sm:space-x-4">
                  <div className="flex items-center space-x-2">
                    <Filter className="w-4 h-4 text-gray-400" />
                    <span className="text-sm text-gray-400 font-medium">
                      Generation:
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-2 justify-center">
                    <motion.button
                      whileHover={{ scale: 1.05 }}
                      whileTap={{ scale: 0.95 }}
                      onClick={() => setSelectedGeneration("all")}
                      className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                        selectedGeneration === "all"
                          ? "bg-orange-500 text-white"
                          : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                      }`}
                    >
                      All
                    </motion.button>
                    {availableGenerations.map((gen) => (
                      <motion.button
                        key={gen}
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={() => setSelectedGeneration(gen)}
                        className={`px-3 sm:px-4 py-2 rounded-xl text-xs sm:text-sm font-bold transition-all duration-300 ${
                          selectedGeneration === gen
                            ? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
                            : "bg-gray-700/50 text-gray-300 hover:bg-gray-600/50"
                        }`}
                      >
                        {gen}
                      </motion.button>
                    ))}
                  </div>
                </div>

                {/* Results Counter */}
                <div className="text-center">
                  <span className="text-sm text-gray-400">
                    Showing{" "}
                    <span className="text-orange-400 font-bold">
                      {filteredAlliances.length}
                    </span>{" "}
                    of{" "}
                    <span className="text-blue-400 font-bold">
                      {alliancesWithStats.length}
                    </span>{" "}
                    alliances
                  </span>
                </div>
              </motion.div>
            </div>

            {/* Data states */}
            {isLoadingAlliances && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center justify-center min-h-96"
              >
                <div className="text-center">
                  <motion.div
                    animate={{ rotate: 360 }}
                    transition={{
                      duration: 2,
                      repeat: Infinity,
                      ease: "linear",
                    }}
                    className="w-16 h-16 mx-auto mb-4 glass-panel-light rounded-full flex items-center justify-center neon-glow"
                  >
                    <Shield className="w-8 h-8 glow-blue" />
                  </motion.div>
                  <p className="glow-cyan font-orbitron">
                    LOADING ALLIANCES...
                  </p>
                </div>
              </motion.div>
            )}

            {error && <ErrorMessage message={error} onRetry={loadAlliances} />}

            {/* Alliances grid */}
            {!isLoadingAlliances && !error && filteredAlliances.length > 0 && (
              <>
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  transition={{ delay: 0.1, duration: 0.6 }}
                  className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3 sm:gap-4"
                >
                  {filteredAlliances.map((alliance) => (
                    <motion.button
                      key={alliance.id}
                      type="button"
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.35 }}
                      whileHover={{
                        scale: 1.03,
                        y: -4,
                        transition: { duration: 0.2 },
                      }}
                      whileTap={{ scale: 0.98 }}
                      onClick={() => handleAllianceClick(alliance)}
                      className="interactive-card rounded-xl p-3 sm:p-4 text-left cursor-pointer focus:outline-none focus:ring-2 focus:ring-orange-500 group"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <div className="flex items-center space-x-2">
                          <motion.span
                            whileHover={{ rotate: 10 }}
                            className="p-1.5 sm:p-2 card-panel rounded-lg orange-border group-hover:orange-glow"
                          >
                            <Shield className="w-3 h-3 sm:w-4 sm:h-4 text-orange-500" />
                          </motion.span>
                          <div>
                            <div className="flex items-center space-x-2">
                              <h3 className="font-black text-sm sm:text-base lg:text-lg text-white font-orbitron">
                                [{alliance.tag}]
                              </h3>
                              {alliance.generation && (
                                <span className="px-1.5 sm:px-2 py-0.5 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
                                  {alliance.generation}
                                </span>
                              )}
                              {alliance.is_pin_protected && (
                                <span className="px-1.5 sm:px-2 py-0.5 bg-red-500/20 text-red-400 text-xs font-bold rounded-full border border-red-400/30">
                                  🔒
                                </span>
                              )}
                            </div>
                            <p className="text-xs secondary-text truncate max-w-[150px] sm:max-w-none">
                              {alliance.name}
                            </p>
                          </div>
                        </div>
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center text-xs secondary-text">
                          <Users className="w-3 h-3 mr-1 sm:mr-2 text-orange-500" />
                          <span className="font-medium truncate">
                            {alliance.memberCount || "SCANNING..."} MEMBERS
                          </span>
                        </div>
                        <div className="flex items-center text-xs secondary-text">
                          <Calendar className="w-3 h-3 mr-1 sm:mr-2 text-orange-500" />
                          <span className="font-medium truncate">
                            {alliance.lastScanDate
                              ? new Date(
                                  alliance.lastScanDate
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })
                              : "ANALYZING..."}
                          </span>
                        </div>
                        <div className="flex items-center text-xs secondary-text">
                          <Shield className="w-3 h-3 mr-1 sm:mr-2 text-purple-500" />
                          <span className="font-medium truncate">
                            {alliance.homeServer || "MULTI-SERVER"}
                          </span>
                        </div>
                        {alliance.season_start_date &&
                          alliance.season_end_date && (
                            <div className="flex items-center text-xs secondary-text">
                              <Calendar className="w-3 h-3 mr-1 sm:mr-2 text-purple-500" />
                              <span className="font-medium truncate">
                                {new Date(
                                  alliance.season_start_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                -{" "}
                                {new Date(
                                  alliance.season_end_date
                                ).toLocaleDateString("en-US", {
                                  month: "short",
                                  day: "numeric",
                                })}{" "}
                                SEASON
                              </span>
                            </div>
                          )}
                      </div>

                      {/* HK Status Badge */}
                      {!alliance.season_start_date ||
                      !alliance.season_end_date ||
                      (alliance.season_end_date &&
                        new Date(alliance.season_end_date) < new Date()) ? (
                        <div className="mt-2">
                          <span className="px-2 py-1 bg-gradient-to-r from-orange-500 to-yellow-500 text-white text-xs font-bold rounded-full">
                            🏰 HK
                          </span>
                        </div>
                      ) : null}

                      <div className="mt-3 pt-3 border-t border-gray-700">
                        <motion.span
                          className="text-xs font-bold text-orange-500 font-orbitron block sm:inline"
                          whileHover={{ x: 4 }}
                        >
                          ACCESS →
                        </motion.span>
                      </div>
                    </motion.button>
                  ))}
                </motion.div>

                {/* No Results Message */}
                {filteredAlliances.length === 0 &&
                  alliancesWithStats.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, scale: 0.95 }}
                      animate={{ opacity: 1, scale: 1 }}
                      className="text-center py-12"
                    >
                      <motion.div
                        animate={{ scale: [1, 1.1, 1] }}
                        transition={{ duration: 2, repeat: Infinity }}
                        className="card-panel rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 orange-border"
                      >
                        <Search className="w-12 h-12 text-orange-500" />
                      </motion.div>
                      <h3 className="text-xl font-bold text-white font-orbitron mb-2">
                        NO MATCHES FOUND
                      </h3>
                      <p className="secondary-text mb-4">
                        No alliances match your search criteria
                      </p>
                      <motion.button
                        whileHover={{ scale: 1.05 }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearSearch}
                        className="px-6 py-3 bg-orange-500 hover:bg-orange-600 text-white rounded-xl font-bold transition-colors"
                      >
                        Clear Filters
                      </motion.button>
                    </motion.div>
                  )}

                {alliancesWithStats.length === 0 && !isLoadingAlliances && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.95 }}
                    animate={{ opacity: 1, scale: 1 }}
                    className="text-center py-12"
                  >
                    <motion.div
                      animate={{ scale: [1, 1.1, 1] }}
                      transition={{ duration: 2, repeat: Infinity }}
                      className="card-panel rounded-full w-24 h-24 flex items-center justify-center mx-auto mb-6 orange-border"
                    >
                      <Shield className="w-12 h-12 text-orange-500" />
                    </motion.div>
                    <h3 className="text-xl font-bold text-white font-orbitron mb-2">
                      NO ALLIANCES DETECTED
                    </h3>
                    <p className="secondary-text">
                      Import alliance data to initialize the command center
                    </p>
                  </motion.div>
                )}
              </>
            )}
          </div>
        </motion.div>

        {/* Create Match-up Button */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.2 }}
          className="w-full bg-[#0D0D0D] border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="text-center mb-8 space-y-6">
              {/* Create Match-up Button */}
              <motion.button
                whileHover={{ scale: 1.05, y: -5 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/create-matchup")}
                className="inline-flex items-center space-x-2 sm:space-x-4 px-4 sm:px-6 md:px-8 py-3 sm:py-4 bg-gradient-to-r from-red-500 to-orange-500 hover:from-red-600 hover:to-orange-600 text-white rounded-2xl font-bold text-sm sm:text-base md:text-lg font-orbitron transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-red-500 shadow-lg hover:shadow-red-500/25"
              >
                <motion.div
                  animate={{ rotate: [0, 10, -10, 0] }}
                  transition={{
                    duration: 2,
                    repeat: Infinity,
                    ease: "easeInOut",
                  }}
                >
                  <Sword className="w-5 h-5 sm:w-6 sm:h-6 md:w-8 md:h-8" />
                </motion.div>
                <span>CREATE MATCH-UP</span>
                <div className="px-2 sm:px-3 py-1 bg-white/20 rounded-full text-xs sm:text-sm">
                  2v2 • 3v3
                </div>
              </motion.button>

              <div className="space-y-2">
                <p className="text-gray-400 text-xs sm:text-sm px-4">
                  Set up epic battles between alliances
                </p>
                <p className="text-gray-500 text-xs px-4">
                  Access battle analytics and strategic comparisons
                </p>
              </div>
            </div>
          </div>
        </motion.div>

        {/* Donors Recognition Section */}
        <motion.div
          initial={{ opacity: 0, y: 24 }}
          animate={{ opacity: showContent ? 1 : 0, y: showContent ? 0 : 24 }}
          transition={{ duration: 0.7, ease: "easeOut", delay: 0.4 }}
          className="w-full bg-[#0D0D0D] border-t border-white/5"
        >
          <div className="max-w-7xl mx-auto p-4 sm:p-6 md:p-8">
            <div className="text-center mb-8">
              <motion.h2
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6, duration: 0.8 }}
                className="text-2xl sm:text-3xl md:text-4xl font-black text-white font-orbitron mb-4"
              >
                <span className="text-pink-400">HALL</span>{" "}
                <span className="text-purple-400">OF</span>{" "}
                <span className="text-cyan-400">HEROES</span>
              </motion.h2>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 0.8, duration: 0.8 }}
                className="secondary-text text-base sm:text-lg mb-6 px-4"
              >
                Legendary supporters who made this dashboard possible
              </motion.p>

              {/* Donors Grid */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.0, duration: 0.8 }}
                className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4 sm:gap-6 max-w-6xl mx-auto"
              >
                {/* Dynamic Donor Cards */}
                {donors.map((donor, index) => {
                  const styleInfo = getDonorStyle(index);

                  return (
                    <motion.div
                      key={`${donor.name}-${index}`}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 1.0 + index * 0.1, duration: 0.5 }}
                      whileHover={{ scale: 1.05, y: -5 }}
                      className="glass-panel-light rounded-2xl p-4 sm:p-6 neon-border hover:neon-glow transition-all duration-300 relative overflow-hidden group"
                    >
                      <div
                        className={`absolute inset-0 bg-gradient-to-br ${styleInfo.color}/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300`}
                      ></div>
                      <div className="text-center relative z-10">
                        <div
                          className={`w-12 h-12 sm:w-16 sm:h-16 mx-auto mb-3 bg-gradient-to-r ${styleInfo.color} rounded-full flex items-center justify-center`}
                        >
                          <span className="text-white font-bold text-lg sm:text-xl">
                            {styleInfo.emoji}
                          </span>
                        </div>
                        <h3
                          className={`font-bold ${styleInfo.textColor} font-orbitron text-sm sm:text-base mb-1`}
                        >
                          SUPPORTER
                        </h3>
                        <p className="text-xs sm:text-sm text-gray-400">
                          {donor.name}
                        </p>
                        <p className="text-xs text-gray-500 mt-1">
                          {donor.money} {donor.currency}
                        </p>
                        <div
                          className={`mt-2 px-2 py-1 bg-gradient-to-r ${styleInfo.color}/20 ${styleInfo.textColor} text-xs font-bold rounded-full border border-current/30`}
                        >
                          ❤️ HERO
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </motion.div>

              {/* Support Message */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 1.2, duration: 0.8 }}
                className="mt-8 text-center"
              >
                <p className="text-gray-400 text-sm sm:text-base mb-4">
                  Want to join the Hall of Heroes? Support the development of
                  this dashboard!
                </p>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() =>
                    window.open("https://buymeacoffee.com/kingyammy", "_blank")
                  }
                  className="px-4 sm:px-6 py-2 sm:py-3 bg-gradient-to-r from-pink-500 to-purple-500 hover:from-pink-600 hover:to-purple-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2 mx-auto"
                >
                  <span className="text-lg">☕</span>
                  <span className="font-orbitron">SUPPORT PROJECT</span>
                </motion.button>
              </motion.div>
            </div>
          </div>
        </motion.div>

        {/* Floating Coffee Button */}
        {animationComplete && (
          <motion.div
            initial={{ opacity: 0, scale: 0 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1, duration: 0.5, type: "spring" }}
            className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 z-50"
          >
            <motion.button
              whileHover={{
                scale: 1.2,
                rotate: [0, -10, 10, -5, 0],
                transition: { duration: 0.3 },
              }}
              whileTap={{ scale: 0.9 }}
              className="
                group relative
                w-12 h-12 sm:w-14 sm:h-14 md:w-16 md:h-16
                bg-gradient-to-r from-blue-500 to-purple-500
                hover:from-blue-400 hover:to-purple-400
                rounded-full
                shadow-lg hover:shadow-2xl hover:shadow-blue-500/50
                flex items-center justify-center
                transition-all duration-300
                border-2 border-blue-400/50 hover:border-blue-300
              "
              onClick={() =>
                window.open("https://buymeacoffee.com/kingyammy", "_blank")
              }
            >
              {/* Heart Icon */}
              <motion.div
                whileHover={{ rotate: [0, 15, -15, 0] }}
                transition={{ duration: 0.5 }}
                className="text-white text-lg sm:text-xl md:text-2xl"
              >
                ❤️
              </motion.div>

              {/* Hover Tooltip */}
              <motion.div
                initial={{ opacity: 0, x: 20, scale: 0.8 }}
                whileHover={{ opacity: 1, x: 0, scale: 1 }}
                className="
                  absolute right-full mr-2 sm:mr-4 top-1/2 -translate-y-1/2
                  bg-gray-900/95 backdrop-blur-sm
                  text-white text-sm font-bold font-orbitron
                  px-2 sm:px-4 py-2 rounded-xl
                  border border-blue-400/50
                  whitespace-nowrap
                  pointer-events-none
                  shadow-lg
                  hidden sm:block
                "
              >
                <span className="text-blue-400">❤️ Support My Project</span>
                <span className="text-blue-400">☕ Buy Me a Coffee</span>
                {/* Arrow */}
                <div className="absolute left-full top-1/2 -translate-y-1/2 w-0 h-0 border-l-8 border-l-gray-900/95 border-y-4 border-y-transparent"></div>
              </motion.div>

              {/* Floating particles effect on hover */}
              <motion.div
                className="absolute inset-0 rounded-full"
                whileHover={{
                  boxShadow: [
                    "0 0 0 0 rgba(59, 130, 246, 0.7)",
                    "0 0 0 10px rgba(59, 130, 246, 0)",
                    "0 0 0 20px rgba(59, 130, 246, 0)",
                  ],
                }}
                transition={{ duration: 1, repeat: Infinity }}
              />
            </motion.button>
          </motion.div>
        )}
      </div>

      {/* PIN Verification Modal */}
      <PinVerificationModal
        isOpen={showPinModal}
        onClose={handlePinModalClose}
        onSuccess={handlePinSuccess}
        allianceTag={selectedProtectedAlliance?.tag || ""}
        allianceName={selectedProtectedAlliance?.name || ""}
        pinHint={selectedProtectedAlliance?.pin_hint}
      />
    </div>
  );
}
