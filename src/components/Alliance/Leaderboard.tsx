import React, { useState } from "react";
import {
	Crown,
	Sword,
	Award,
	TrendingUp,
	User,
	Hash,
	Heart,
	Eye,
	HandHeart,
	Zap,
	Target,
	Users,
	Search,
	X,
	Calendar,
	BarChart3,
	RefreshCw,
	Download,
	FileText,
} from "lucide-react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import Papa from "papaparse";
import { AllianceDetail } from "../../types";
import { ErrorMessage } from "../UI/ErrorMessage";
import { DataTable, Column } from "../UI/DataTable";
import {
	useLeaderboard,
	useAllianceScanDates,
	useLeaderboardChanges,
	useSortedLeaderboard,
	useChangeDataForTab,
	useLeaderboardSearch,
	LeaderboardTab,
	LeaderboardRowWithChanges,
} from "../../hooks/useLeaderboard";

interface LeaderboardProps {
	alliance: AllianceDetail;
}

export function Leaderboard({ alliance }: LeaderboardProps) {
	const navigate = useNavigate();

	// UI State
	const [activeTab, setActiveTab] = useState<LeaderboardTab>("power");
	const [searchQuery, setSearchQuery] = useState("");
	const [viewMode, setViewMode] = useState<"current" | "change">("current");
	const [selectedStartDate, setSelectedStartDate] = useState<string>("");
	const [selectedEndDate, setSelectedEndDate] = useState<string>("");
	const [isExporting, setIsExporting] = useState(false);

	// Data Fetching with React Query
	const {
		data: leaderboardData,
		isLoading: isLoadingLeaderboard,
		error: leaderboardError,
		refetch: refetchLeaderboard,
	} = useLeaderboard(alliance.id);

	const { data: scanDates = [], isLoading: isLoadingScanDates } =
		useAllianceScanDates(alliance.id);

	// Set default dates when scan dates are loaded
	React.useEffect(() => {
		if (scanDates.length >= 2 && !selectedStartDate && !selectedEndDate) {
			setSelectedStartDate(scanDates[0]);
			setSelectedEndDate(scanDates[scanDates.length - 1]);
		}
	}, [scanDates, selectedStartDate, selectedEndDate]);

	// Fetch change data when both dates are selected
	const shouldFetchChanges =
		viewMode === "change" && !!selectedStartDate && !!selectedEndDate;
	const {
		data: changeData = [],
		isLoading: isLoadingChangeData,
		isError: isChangeError,
		error: changeError,
	} = useLeaderboardChanges(alliance.id, selectedStartDate, selectedEndDate, {
		enabled: shouldFetchChanges,
	});

	// Data Processing with Memoization
	const sortedCurrentData = useSortedLeaderboard(leaderboardData, activeTab);
	const sortedChangeData = useChangeDataForTab(changeData, activeTab);

	// Determine which data to display
	const currentData =
		viewMode === "current" ? sortedCurrentData : sortedChangeData;

	// Search functionality
	const searchResults = useLeaderboardSearch(currentData, searchQuery, 10);
	const isSearching = searchQuery.trim().length > 0;
	const displayData = isSearching ? searchResults : currentData;

	// Handlers
	const clearSearch = () => {
		setSearchQuery("");
	};

	const handleLoadChangeData = () => {
		// Data is automatically fetched by React Query when dates change
		// This handler is kept for the button but doesn't need to do anything
		// The useLeaderboardChanges hook handles the fetching
	};

	// Export to CSV function
	const exportToCSV = async (limit: number) => {
		try {
			setIsExporting(true);

			const dataToExport = currentData.slice(0, limit);

			if (dataToExport.length === 0) {
				console.error("No data available to export");
				return;
			}

			let csvData;
			let filename;

			if (viewMode === "change") {
				// Export change data
				csvData = dataToExport.map((player) => ({
					Rank: player.rank,
					Name: player.name,
					"Lord ID": player.lord_id || "N/A",
					Alliance_tag: player.alliance_tag,
					Faction: player.faction || "Unknown",
					"Start Value": player.startValue || 0,
					"End Value": player.endValue || 0,
					Change: player.changeValue || 0,
					"Change %": player.changePercent
						? `${player.changePercent.toFixed(1)}%`
						: "0%",
					"Current Power": player.power || 0,
					"Highest Power": player.highest_power || 0,
					Merits: player.merits || 0,
					"Units Killed": player.units_killed || 0,
					"T5 Kills": player.killcount_t5 || 0,
					"T1 Kills": player.killcount_t1 || 0,
					"Units Dead": player.units_dead || 0,
					"Units Healed": player.units_healed || 0,
					Scouted: player.scouted || 0,
					"Helps Given": player.helps_given || 0,
					"Mana Spent": player.mana_spent || 0,
					"Mana Gathered": player.mana || 0,
				}));

				const startDateStr = selectedStartDate
					? new Date(selectedStartDate).toISOString().split("T")[0]
					: "unknown";
				const endDateStr = selectedEndDate
					? new Date(selectedEndDate).toISOString().split("T")[0]
					: "unknown";
				const today = new Date().toISOString().split("T")[0];
				filename = `${alliance.tag}_changes_${activeTab}_top${limit}_${startDateStr}_to_${endDateStr}_${today}.csv`;
			} else {
				// Export current data
				csvData = dataToExport.map((player) => ({
					Rank: player.rank,
					Name: player.name,
					"Lord ID": player.lord_id || "N/A",
					Alliance_tag: player.alliance_tag,
					Faction: player.faction || "Unknown",
					"Current Power": player.power || 0,
					"Highest Power": player.highest_power || 0,
					Merits: player.merits || 0,
					"Units Killed": player.units_killed || 0,
					"T5 Kills": player.killcount_t5 || 0,
					"T1 Kills": player.killcount_t1 || 0,
					"Units Dead": player.units_dead || 0,
					"Units Healed": player.units_healed || 0,
					Scouted: player.scouted || 0,
					"Helps Given": player.helps_given || 0,
					"Mana Spent": player.mana_spent || 0,
					"Mana Gathered": player.mana || 0,
					"Home Server": player.home_server || "Unknown",
					//unfetched fields in fetchleaderboard()
					// "Town Center": player.town_center || 0,
					// "Map ID": player.map_id || 0,
				}));

				const today = new Date().toISOString().split("T")[0];
				filename = `${alliance.tag}_current_${activeTab}_top${limit}_${today}.csv`;
			}

			// Convert to CSV
			const csv = Papa.unparse(csvData as any);

			// Create and download file
			const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
			const link = document.createElement("a");
			const url = URL.createObjectURL(blob);
			link.setAttribute("href", url);
			link.setAttribute("download", filename);
			link.style.visibility = "hidden";
			document.body.appendChild(link);
			link.click();
			document.body.removeChild(link);
		} catch (err) {
			console.error("Export error:", err);
		} finally {
			setIsExporting(false);
		}
	};

	// Utility Functions
	const formatNumber = (num: number | null) => {
		if (!num) return "0";
		if (num >= 1e9) return `${(num / 1e9).toFixed(1)}B`;
		if (num >= 1e6) return `${(num / 1e6).toFixed(1)}M`;
		if (num >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
		return num.toString();
	};

	// Tab Configuration
	const tabs = [
		{ id: "power" as const, name: "Current Power", icon: TrendingUp },
		{ id: "highest_power" as const, name: "Highest Power", icon: Crown },
		{ id: "merits" as const, name: "Merits", icon: Award },
		{ id: "units_killed" as const, name: "Total Kills", icon: Sword },
		{ id: "killcount_t5" as const, name: "T5 Kills", icon: Crown },
		{ id: "killcount_t1" as const, name: "T1 Kills", icon: Target },
		{ id: "units_dead" as const, name: "Deaths", icon: Sword },
		{ id: "units_healed" as const, name: "Healed", icon: Heart },
		{ id: "scouted" as const, name: "Scouted", icon: Eye },
		{ id: "helps_given" as const, name: "Helps", icon: HandHeart },
		{ id: "mana_spent" as const, name: "Mana Spent", icon: Zap },
		{ id: "mana" as const, name: "Mana Gathered", icon: Zap },
	];

	// Column Definitions
	const combatColumns: Column<LeaderboardRowWithChanges>[] = [
		{
			key: "rank",
			label: "RANK",
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
					{rank === 2 && (
						<Award className="w-3 h-3 sm:w-4 sm:h-4 text-gray-300" />
					)}
					{rank === 3 && (
						<Award className="w-3 h-3 sm:w-4 sm:h-4 text-orange-400" />
					)}
					<span className="font-bold text-cyan-400 font-orbitron text-xs sm:text-sm">
						#{rank}
					</span>
				</div>
			),
			className: "text-gray-300 font-medium",
		},
		{
			key: "name",
			label: "OPERATIVE",
			sortable: true,
			render: (name: string, row: LeaderboardRowWithChanges) => (
				<div className="flex items-center space-x-2">
					<User className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400" />
					<div>
						<div className="font-bold text-white text-xs sm:text-sm truncate max-w-[100px] sm:max-w-[150px] md:max-w-none">
							{name}
						</div>
						<div className="text-xs text-gray-400 hidden sm:block">
							{row.faction || "UNKNOWN FACTION"}
						</div>
					</div>
				</div>
			),
		},
		{
			key: "lord_id",
			label: "LORD ID",
			sortable: false,
			render: (lordId: string | null) => (
				<div className="flex items-center space-x-1">
					<Hash className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400" />
					<span className="font-mono text-xs sm:text-sm text-purple-400 truncate max-w-[80px] sm:max-w-none">
						{lordId
							? lordId.substring(0, 8) + (lordId.length > 8 ? "..." : "")
							: "N/A"}
					</span>
				</div>
			),
		},
		{
			key: "player_id",
			label: "ACTIONS",
			sortable: false,
			render: (row: LeaderboardRowWithChanges) => (
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

	const getColumnsForTab = (
		tab: LeaderboardTab
	): Column<LeaderboardRowWithChanges>[] => {
		const baseColumns = combatColumns;

		let valueColumn: Column<LeaderboardRowWithChanges>;

		if (viewMode === "change") {
			valueColumn = {
				key: "changeValue",
				label: `${tabs.find((t) => t.id === tab)?.name.toUpperCase()} CHANGE`,
				sortable: true,
				render: (
					changeValue: number | null,
					row: LeaderboardRowWithChanges
				) => (
					<div className="text-right">
						<div
							className={`font-bold font-orbitron text-xs sm:text-sm ${
								(changeValue || 0) > 0
									? "text-green-400"
									: (changeValue || 0) < 0
									? "text-red-400"
									: "text-gray-400"
							}`}
						>
							{(changeValue || 0) > 0 ? "+" : ""}
							{formatNumber(changeValue)}
						</div>
						<div className="text-xs text-gray-400">
							{formatNumber(row.startValue ?? null)} →{" "}
							{formatNumber(row.endValue ?? null)}
						</div>
						<div
							className={`text-xs font-bold ${
								(row.changePercent || 0) > 0
									? "text-green-400"
									: (row.changePercent || 0) < 0
									? "text-red-400"
									: "text-gray-400"
							}`}
						>
							{(row.changePercent || 0) > 0 ? "+" : ""}
							{(row.changePercent || 0).toFixed(1)}%
						</div>
					</div>
				),
				className: "text-right",
			};
		} else {
			valueColumn = {
				key: tab,
				label:
					tabs.find((t) => t.id === tab)?.name.toUpperCase() ||
					tab.toUpperCase(),
				sortable: true,
				render: (row: LeaderboardRowWithChanges) => (
					<div className="text-right">
						<span className="font-bold text-pink-400 font-orbitron text-xs sm:text-sm">
							{formatNumber((row as any)[tab])}
						</span>
					</div>
				),
				className: "text-right",
			};
		}

		return [...baseColumns, valueColumn];
	};

	// Loading State
	const isLoading = isLoadingLeaderboard || isLoadingScanDates;

	if (isLoading) {
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

	// Error State
	if (leaderboardError || (isChangeError && viewMode === "change")) {
		const error = leaderboardError || changeError;
		return (
			<ErrorMessage
				message={
					error instanceof Error ? error.message : "Failed to load leaderboard"
				}
				onRetry={refetchLeaderboard}
			/>
		);
	}

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
								<h4 className="text-sm font-bold text-cyan-400 font-orbitron">
									VIEW MODE
								</h4>
								<div className="flex items-center space-x-2">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => setViewMode("current")}
										className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 font-orbitron ${
											viewMode === "current"
												? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
												: "glass-panel-light neon-border text-gray-300 hover:text-pink-400"
										}`}
									>
										CURRENT VALUES
									</motion.button>
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => setViewMode("change")}
										className={`px-4 py-2 rounded-lg font-bold text-xs transition-all duration-300 font-orbitron ${
											viewMode === "change"
												? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
												: "glass-panel-light neon-border text-gray-300 hover:text-pink-400"
										}`}
									>
										PERIOD CHANGES
									</motion.button>
								</div>
							</div>

							{/* Export Controls */}
							<div className="flex items-center justify-between pt-4 border-t border-gray-700/50">
								<h4 className="text-sm font-bold text-green-400 font-orbitron">
									EXPORT DATA
								</h4>
								<div className="flex items-center space-x-2">
									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => exportToCSV(50)}
										disabled={isExporting || currentData.length === 0}
										className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-green-500 to-emerald-500 hover:from-green-600 hover:to-emerald-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all duration-300"
									>
										<Download className="w-3 h-3" />
										<span>TOP 50</span>
									</motion.button>

									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => exportToCSV(100)}
										disabled={isExporting || currentData.length === 0}
										className="flex items-center space-x-1 px-3 py-2 bg-gradient-to-r from-blue-500 to-cyan-500 hover:from-blue-600 hover:to-cyan-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs transition-all duration-300"
									>
										<Download className="w-3 h-3" />
										<span>TOP 100</span>
									</motion.button>

									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={() => exportToCSV(200)}
										disabled={isExporting || currentData.length === 0}
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
							{viewMode === "change" && (
								<motion.div
									initial={{ opacity: 0, height: 0 }}
									animate={{ opacity: 1, height: "auto" }}
									exit={{ opacity: 0, height: 0 }}
									className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4"
								>
									<div className="flex items-center space-x-2">
										<Calendar className="w-4 h-4 text-purple-400" />
										<span className="text-sm text-purple-400 font-bold font-orbitron">
											FROM:
										</span>
										<select
											value={selectedStartDate}
											onChange={(e) => setSelectedStartDate(e.target.value)}
											className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
										>
											<option value="">Select start date</option>
											{scanDates.map((date) => (
												<option key={date} value={date}>
													{new Date(date).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</option>
											))}
										</select>
									</div>

									<div className="flex items-center space-x-2">
										<Calendar className="w-4 h-4 text-blue-400" />
										<span className="text-sm text-blue-400 font-bold font-orbitron">
											TO:
										</span>
										<select
											value={selectedEndDate}
											onChange={(e) => setSelectedEndDate(e.target.value)}
											className="bg-gray-800 border border-gray-600 rounded-lg px-3 py-2 text-white text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
										>
											<option value="">Select end date</option>
											{scanDates.map((date) => (
												<option key={date} value={date}>
													{new Date(date).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</option>
											))}
										</select>
									</div>

									<motion.button
										whileHover={{ scale: 1.05 }}
										whileTap={{ scale: 0.95 }}
										onClick={handleLoadChangeData}
										disabled={
											!selectedStartDate ||
											!selectedEndDate ||
											isLoadingChangeData
										}
										className="flex items-center space-x-2 px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-lg font-bold text-xs font-orbitron transition-all duration-300"
									>
										{isLoadingChangeData ? (
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
								<h4 className="text-lg font-bold text-pink-400 font-orbitron">
									SEARCH RESULTS
								</h4>
								<span className="ml-auto text-sm text-gray-400">
									Found {searchResults.length} players in{" "}
									{tabs.find((t) => t.id === activeTab)?.name} rankings
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
										onClick={() =>
											navigate(
												`/alliance/${alliance.id}/player/${player.player_id}`
											)
										}
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
													{tabs
														.find((t) => t.id === activeTab)
														?.name.substring(0, 8)}
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
														{player.lord_id?.substring(0, 8) || "N/A"}
													</div>
												</div>
											</div>
										</div>
										<div className="text-right flex-shrink-0">
											<div className="text-xs sm:text-sm font-bold text-pink-400 font-orbitron">
												{formatNumber((player as any)[activeTab])}
											</div>
											<div className="text-xs text-gray-400 hidden md:block">
												{tabs.find((t) => t.id === activeTab)?.name}
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
							<h4 className="text-base sm:text-lg font-bold text-gray-300 font-orbitron mb-2">
								NO RESULTS FOUND
							</h4>
							<p className="text-xs sm:text-sm text-gray-400 px-2">
								No players found matching "{searchQuery}" in{" "}
								{tabs.find((t) => t.id === activeTab)?.name} rankings
							</p>
						</motion.div>
					)}

					{/* Tab Grid */}
					<div
						className={`grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-12 gap-1 sm:gap-2 ${
							isSearching ? "opacity-50" : ""
						}`}
					>
						{tabs.map((tab) => (
							<motion.button
								key={tab.id}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setActiveTab(tab.id)}
								disabled={isSearching}
								className={`flex flex-col items-center justify-center p-2 sm:p-3 rounded-lg sm:rounded-xl font-bold text-xs transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-pink-500 font-orbitron min-h-[60px] sm:min-h-[80px] ${
									activeTab === tab.id
										? "bg-gradient-to-r from-purple-500 to-pink-500 text-white"
										: "glass-panel-light neon-border text-gray-300 hover:text-pink-400 hover:neon-glow disabled:opacity-50 disabled:cursor-not-allowed"
								}`}
							>
								<tab.icon
									className={`w-3 h-3 sm:w-4 sm:h-4 md:w-5 md:h-5 mb-1 sm:mb-2 ${
										activeTab === tab.id ? "text-white" : "text-gray-400"
									}`}
								/>
								<span className="text-center leading-tight text-xs sm:text-xs">
									{tab.name.length > 8
										? tab.name.substring(0, 6) + "..."
										: tab.name.toUpperCase()}
								</span>
							</motion.button>
						))}
					</div>

					{/* Stats Summary */}
					<motion.div
						initial={{ opacity: 0, x: 20 }}
						animate={{ opacity: 1, x: 0 }}
						className={`flex flex-col sm:flex-row items-start sm:items-center justify-between glass-panel-light rounded-xl p-3 sm:p-4 neon-border space-y-2 sm:space-y-0 ${
							isSearching ? "opacity-50" : ""
						}`}
					>
						<div className="flex flex-col sm:flex-row items-start sm:items-center space-y-2 sm:space-y-0 sm:space-x-4">
							<div className="flex items-center">
								<Users className="w-3 h-3 sm:w-4 sm:h-4 text-blue-400 mr-1 sm:mr-2" />
								<span className="text-xs sm:text-sm text-blue-400 font-bold font-orbitron">
									{isSearching
										? `${searchResults.length} FOUND IN ${
												viewMode === "current"
													? tabs
															.find((t) => t.id === activeTab)
															?.name.toUpperCase()
													: `${tabs
															.find((t) => t.id === activeTab)
															?.name.toUpperCase()} CHANGES`
										  }`
										: viewMode === "current"
										? `${sortedCurrentData.length} ACTIVE OPERATIVES`
										: `${sortedChangeData.length} PLAYERS WITH CHANGES`}
								</span>
							</div>
							{!isSearching && (
								<div className="flex items-center">
									<TrendingUp className="w-3 h-3 sm:w-4 sm:h-4 text-purple-400 mr-1 sm:mr-2" />
									<span className="text-xs sm:text-sm text-purple-400 font-bold font-orbitron">
										VIEWING:{" "}
										{viewMode === "current"
											? tabs.find((t) => t.id === activeTab)?.name.toUpperCase()
											: `${tabs
													.find((t) => t.id === activeTab)
													?.name.toUpperCase()} CHANGES`}
									</span>
								</div>
							)}
						</div>
						<div className="text-xs text-gray-400 font-medium self-end sm:self-auto">
							{isSearching
								? "SEARCH ACTIVE"
								: viewMode === "current"
								? "TOP 210 BY HIGHEST POWER"
								: `PERIOD: ${
										selectedStartDate
											? new Date(selectedStartDate).toLocaleDateString(
													"en-US",
													{ month: "short", day: "numeric" }
											  )
											: ""
								  } - ${
										selectedEndDate
											? new Date(selectedEndDate).toLocaleDateString("en-US", {
													month: "short",
													day: "numeric",
											  })
											: ""
								  }`}
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
			{!isSearching &&
				displayData.length === 0 &&
				!isLoading &&
				!isLoadingChangeData && (
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						className="text-center py-8 sm:py-12"
					>
						<motion.div
							animate={{ scale: [1, 1.1, 1] }}
							transition={{ duration: 2, repeat: Infinity }}
							className="glass-panel-light rounded-full w-16 h-16 sm:w-20 sm:h-20 md:w-24 md:h-24 flex items-center justify-center mx-auto mb-4 sm:mb-6 neon-border"
						>
							<User className="w-8 h-8 sm:w-10 sm:h-10 md:w-12 md:h-12 text-blue-400" />
						</motion.div>
						<h3 className="text-lg sm:text-xl font-bold text-pink-400 font-orbitron mb-2">
							{viewMode === "change" ? "NO CHANGE DATA" : "NO OPERATIVE DATA"}
						</h3>
						<p className="text-sm sm:text-base text-blue-400 px-4">
							{viewMode === "change"
								? "Select date range and click COMPARE to see changes"
								: "No ranking data available for this alliance"}
						</p>
					</motion.div>
				)}

			{/* Loading Change Data */}
			{isLoadingChangeData && (
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
						<p className="text-cyan-400 font-orbitron font-bold">
							CALCULATING CHANGES...
						</p>
					</div>
				</motion.div>
			)}
		</motion.div>
	);
}
