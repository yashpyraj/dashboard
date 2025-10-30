import React, { useState, useEffect } from "react";
import {
	TrendingUp,
	Award,
	Sword,
	Zap,
	Target,
	Calendar,
	X,
	BarChart3,
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import {
	LineChart,
	Line,
	XAxis,
	YAxis,
	CartesianGrid,
	Tooltip,
	ResponsiveContainer,
} from "recharts";
import { AllianceDetail } from "../../types";
import { useNavigate } from "react-router-dom";
import { LoadingSpinner } from "../UI/LoadingSpinner";
import { ErrorMessage } from "../UI/ErrorMessage";
import {
	useAllianceOverview,
	useKPIHistoricalData,
	useChangeCalculation,
	useDateRangeFilter,
	useFormatNumber,
	useFormatDate,
	usePeriodDuration,
	KPIField,
} from "../../hooks/useOverview";

interface OverviewProps {
	alliance: AllianceDetail;
}

interface KPIModalData {
	title: string;
	icon: React.ComponentType<any>;
	color: string;
	field: KPIField;
}

export function Overview({ alliance }: OverviewProps) {
	const navigate = useNavigate();

	// UI State
	const [selectedStartDate, setSelectedStartDate] = useState<string>("");
	const [selectedEndDate, setSelectedEndDate] = useState<string>("");
	const [selectedKPI, setSelectedKPI] = useState<KPIModalData | null>(null);

	// Data Fetching with React Query
	const {
		stats: currentStats,
		scanDates,
		isLoading,
		error,
		refetchStats,
	} = useAllianceOverview(alliance.id, selectedStartDate, selectedEndDate);

	// Set default dates when scan dates are loaded
	useEffect(() => {
		if (
			scanDates &&
			scanDates.length > 0 &&
			!selectedStartDate &&
			!selectedEndDate
		) {
			setSelectedStartDate(scanDates[0]);
			setSelectedEndDate(scanDates[scanDates.length - 1]);
		}
	}, [scanDates, selectedStartDate, selectedEndDate]);

	// Filter scan dates for the selected range
	const filteredScanDates = useDateRangeFilter(
		scanDates,
		selectedStartDate,
		selectedEndDate
	);

	// Fetch historical data for selected KPI
	const { data: historicalData = [], isLoading: isLoadingHistorical } =
		useKPIHistoricalData(
			alliance.id,
			selectedKPI?.field || "averagePower",
			filteredScanDates,
			{ enabled: !!selectedKPI && filteredScanDates.length > 0 }
		);

	// Calculate change metrics
	const changeMetrics = useChangeCalculation(historicalData);

	// Utility hooks
	const formatNumber = useFormatNumber();
	const formatDate = useFormatDate();
	const periodDuration = usePeriodDuration(selectedStartDate, selectedEndDate);

	// Handle KPI card click
	const handleKPIClick = (
		title: string,
		icon: React.ComponentType<any>,
		color: string,
		field: KPIField
	) => {
		setSelectedKPI({ title, icon, color, field });
	};

	// Loading State
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
						<TrendingUp className="w-8 h-8 text-blue-400" />
					</motion.div>
					<p className="text-blue-400 font-orbitron font-bold">
						LOADING TACTICAL OVERVIEW...
					</p>
				</div>
			</motion.div>
		);
	}

	// Error State
	if (error) {
		return (
			<ErrorMessage
				message={
					error instanceof Error ? error.message : "Failed to load overview"
				}
				onRetry={refetchStats}
			/>
		);
	}

	// Calculate member count from stats (if available)
	const memberCount = currentStats
		? Math.round(currentStats.totalPower / (currentStats.averagePower || 1))
		: 0;

	return (
		<>
			<div className="space-y-6">
				<motion.div
					initial={{ opacity: 0, x: -20 }}
					animate={{ opacity: 1, x: 0 }}
				>
					<div className="flex items-center justify-between mb-6">
						<h3 className="text-xl font-black text-pink-400 font-orbitron">
							TACTICAL OVERVIEW
						</h3>
						<div className="flex items-center space-x-4">
							<motion.button
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => navigate(`/alliance/${alliance.id}/comparison`)}
								className="px-4 py-2 bg-gradient-to-r from-cyan-500 to-blue-500 hover:from-cyan-600 hover:to-blue-600 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2"
							>
								<BarChart3 className="w-4 h-4" />
								<span className="font-orbitron">COMPARE DATES</span>
							</motion.button>
							{alliance.generation &&
								alliance.season_start_date &&
								alliance.season_end_date && (
									<div className="glass-panel-light rounded-xl px-4 py-2 neon-border">
										<div className="flex items-center space-x-3">
											<span className="px-2 py-1 bg-gradient-to-r from-purple-500 to-pink-500 text-white text-xs font-bold rounded-full">
												{alliance.generation}
											</span>
											<div className="text-sm">
												<div className="text-purple-400 font-bold font-orbitron">
													SEASON:{" "}
													{new Date(
														alliance.season_start_date
													).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}{" "}
													-{" "}
													{new Date(
														alliance.season_end_date
													).toLocaleDateString("en-US", {
														month: "short",
														day: "numeric",
														year: "numeric",
													})}
												</div>
												<div className="text-cyan-400 font-bold text-xs">
													{alliance.seasonDuration} DAYS DURATION
												</div>
											</div>
										</div>
									</div>
								)}
						</div>
					</div>
				</motion.div>

				{/* Date Range Selector */}
				<motion.div
					initial={{ opacity: 0, y: -20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.1 }}
					className="glass-panel rounded-xl neon-border p-6 relative overflow-hidden"
				>
					<div className="absolute inset-0 bg-gradient-to-r from-blue-500/5 to-purple-500/5"></div>
					<div className="flex items-center mb-4 relative z-10">
						<Calendar className="w-5 h-5 text-blue-400 mr-2" />
						<h4 className="text-lg font-bold text-blue-400 font-orbitron">
							INTEL TIMEFRAME
						</h4>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 gap-4 relative z-10">
						<div>
							<label className="block text-sm font-bold text-blue-400 font-orbitron mb-2">
								START DATE
							</label>
							<select
								value={selectedStartDate}
								onChange={(e) => setSelectedStartDate(e.target.value)}
								className="w-full px-4 py-3 glass-panel-light border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
							>
								{(scanDates || []).map((date) => (
									<option key={date} value={date} className="bg-gray-800">
										{new Date(date).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</option>
								))}
							</select>
						</div>
						<div>
							<label className="block text-sm font-bold text-blue-400 font-orbitron mb-2">
								END DATE
							</label>
							<select
								value={selectedEndDate}
								onChange={(e) => setSelectedEndDate(e.target.value)}
								className="w-full px-4 py-3 glass-panel-light border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-blue-500 transition-all duration-300"
							>
								{(scanDates || []).map((date) => (
									<option key={date} value={date} className="bg-gray-800">
										{new Date(date).toLocaleDateString("en-US", {
											month: "short",
											day: "numeric",
											year: "numeric",
										})}
									</option>
								))}
							</select>
						</div>
					</div>
				</motion.div>

				{/* KPI Cards */}
				{currentStats && (
					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
						{/* Average Power */}
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.2 }}
							whileHover={{ scale: 1.05 }}
							onClick={() =>
								handleKPIClick(
									"Average Power",
									TrendingUp,
									"#3b82f6",
									"averagePower"
								)
							}
							className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 text-left relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div className="flex items-center mb-3 relative z-10">
								<TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
								<span className="text-sm font-bold text-blue-400 font-orbitron">
									AVERAGE POWER
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{formatNumber(currentStats.averagePower)}
							</p>
							<p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
								Click for detailed analysis
							</p>
						</motion.button>

						{/* Total Merits */}
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.3 }}
							whileHover={{ scale: 1.05 }}
							onClick={() =>
								handleKPIClick("Total Merits", Award, "#9333ea", "totalMerits")
							}
							className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 text-left relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div className="flex items-center mb-3 relative z-10">
								<Award className="w-5 h-5 text-purple-400 mr-2" />
								<span className="text-sm font-bold text-purple-400 font-orbitron">
									TOTAL MERITS
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{formatNumber(currentStats.totalMerits)}
							</p>
							<p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
								Click for detailed analysis
							</p>
						</motion.button>

						{/* Total Kills */}
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.4 }}
							whileHover={{ scale: 1.05 }}
							onClick={() =>
								handleKPIClick("Total Kills", Sword, "#ef4444", "totalKills")
							}
							className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 text-left relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-red-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div className="flex items-center mb-3 relative z-10">
								<Sword className="w-5 h-5 text-red-400 mr-2" />
								<span className="text-sm font-bold text-red-400 font-orbitron">
									TOTAL KILLS
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{formatNumber(currentStats.totalKills)}
							</p>
							<p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
								Click for detailed analysis
							</p>
						</motion.button>

						{/* Mana Spent */}
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.5 }}
							whileHover={{ scale: 1.05 }}
							onClick={() =>
								handleKPIClick("Mana Spent", Zap, "#eab308", "totalManaSpent")
							}
							className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 text-left relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div className="flex items-center mb-3 relative z-10">
								<Zap className="w-5 h-5 text-yellow-400 mr-2" />
								<span className="text-sm font-bold text-yellow-400 font-orbitron">
									MANA SPENT
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{formatNumber(currentStats.totalManaSpent)}
							</p>
							<p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
								Click for detailed analysis
							</p>
						</motion.button>

						{/* Units Dead */}
						<motion.button
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.6 }}
							whileHover={{ scale: 1.05 }}
							onClick={() =>
								handleKPIClick(
									"Units Dead",
									Target,
									"#f97316",
									"totalUnitsDead"
								)
							}
							className="glass-panel-light rounded-xl neon-border p-6 hover:neon-glow transition-all duration-300 text-left relative overflow-hidden group"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-orange-500/10 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
							<div className="flex items-center mb-3 relative z-10">
								<Target className="w-5 h-5 text-orange-400 mr-2" />
								<span className="text-sm font-bold text-orange-400 font-orbitron">
									UNITS DEAD
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{formatNumber(currentStats.totalUnitsDead)}
							</p>
							<p className="text-xs text-cyan-400 font-bold mt-1 relative z-10">
								Click for detailed analysis
							</p>
						</motion.button>

						{/* Member Count */}
						<motion.div
							initial={{ opacity: 0, scale: 0.9 }}
							animate={{ opacity: 1, scale: 1 }}
							transition={{ delay: 0.7 }}
							className="glass-panel-light rounded-xl neon-border p-6 relative overflow-hidden"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-transparent"></div>
							<div className="flex items-center mb-3 relative z-10">
								<BarChart3 className="w-5 h-5 text-green-400 mr-2" />
								<span className="text-sm font-bold text-green-400 font-orbitron">
									ACTIVE MEMBERS
								</span>
							</div>
							<p className="text-2xl font-black text-white font-orbitron relative z-10">
								{memberCount}
							</p>
							<p className="text-xs text-green-400 font-bold mt-1 relative z-10">
								Players with 50M+ highest power
							</p>
						</motion.div>
					</div>
				)}
			</div>

			{/* KPI Detail Modal */}
			<AnimatePresence>
				{selectedKPI && (
					<motion.div
						initial={{ opacity: 0 }}
						animate={{ opacity: 1 }}
						exit={{ opacity: 0 }}
						className="fixed inset-0 bg-black/98 backdrop-blur-xl z-[9999] flex items-center justify-center p-4 overflow-hidden"
						onClick={() => setSelectedKPI(null)}
					>
						<motion.div
							initial={{ opacity: 0, scale: 0.9, y: 20 }}
							animate={{ opacity: 1, scale: 1, y: 0 }}
							exit={{ opacity: 0, scale: 0.9, y: 20 }}
							onClick={(e) => e.stopPropagation()}
							className="glass-panel rounded-2xl neon-border p-8 max-w-5xl w-full max-h-[95vh] overflow-y-auto relative mx-auto"
						>
							<div className="absolute inset-0 bg-gradient-to-br from-purple-500/10 via-pink-500/10 to-blue-500/10 rounded-2xl"></div>

							{/* Header */}
							<div className="flex items-center justify-between mb-8 relative z-10">
								<div className="flex items-center space-x-3">
									<div
										className="p-3 glass-panel-light rounded-xl neon-border"
										style={{ borderColor: selectedKPI.color }}
									>
										<selectedKPI.icon
											className="w-8 h-8"
											style={{ color: selectedKPI.color }}
										/>
									</div>
									<div>
										<h2 className="text-2xl font-black text-white font-orbitron">
											{selectedKPI.title}
										</h2>
										<p className="text-sm text-gray-400">
											Detailed Analysis & Comparison
										</p>
									</div>
								</div>
								<motion.button
									whileHover={{ scale: 1.1, rotate: 90 }}
									whileTap={{ scale: 0.9 }}
									onClick={() => setSelectedKPI(null)}
									className="p-3 glass-panel-light rounded-xl neon-border hover:neon-glow transition-all duration-300"
								>
									<X className="w-6 h-6 text-pink-400" />
								</motion.button>
							</div>

							{isLoadingHistorical ? (
								<div className="flex items-center justify-center py-12 relative z-10">
									<LoadingSpinner size="lg" className="mr-3" />
									<span className="text-blue-400 font-orbitron">
										Loading detailed analysis...
									</span>
								</div>
							) : (
								<div className="space-y-8 relative z-10">
									{/* Period Summary */}
									<div className="glass-panel-light rounded-xl p-6 neon-border">
										<h3 className="text-lg font-bold text-blue-400 font-orbitron mb-4">
											SELECTED PERIOD
										</h3>
										<p className="text-sm text-gray-400 mb-3">
											{formatDate(selectedStartDate)} -{" "}
											{formatDate(selectedEndDate)}
										</p>
										<div className="grid grid-cols-1 md:grid-cols-3 gap-6">
											<div className="text-center">
												<p className="text-sm text-gray-400 mb-2">
													Current Value
												</p>
												<p className="text-2xl font-black text-white font-orbitron">
													{currentStats
														? formatNumber(
																currentStats[selectedKPI.field] as number
														  )
														: "No Data"}
												</p>
											</div>
											<div className="text-center">
												<p className="text-sm text-gray-400 mb-2">
													Data Points
												</p>
												<p className="text-2xl font-black text-cyan-400 font-orbitron">
													{historicalData.length}
												</p>
											</div>
											<div className="text-center">
												<p className="text-sm text-gray-400 mb-2">
													Period Length
												</p>
												<p className="text-2xl font-black text-purple-400 font-orbitron">
													{periodDuration} Days
												</p>
											</div>
										</div>
									</div>

									{/* Change Analysis */}
									{historicalData.length > 1 && (
										<div className="glass-panel-light rounded-xl p-6 neon-border">
											<h3 className="text-lg font-bold text-purple-400 font-orbitron mb-4">
												CALCULATION SHOWCASE
											</h3>
											<div className="space-y-6">
												{/* Math Formula Display */}
												<div className="glass-panel rounded-xl p-6 neon-border bg-gradient-to-r from-blue-500/10 to-purple-500/10">
													<h4 className="text-md font-bold text-cyan-400 font-orbitron mb-4">
														📊 CALCULATION FORMULA
													</h4>
													<div className="space-y-3 font-mono text-sm">
														<div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
															<span className="text-blue-400">
																Net Change =
															</span>
															<span className="text-white">
																{changeMetrics.lastValue.toLocaleString()} -{" "}
																{changeMetrics.firstValue.toLocaleString()} =
																<span
																	className={
																		changeMetrics.isPositive
																			? "text-green-400"
																			: "text-red-400"
																	}
																>
																	{changeMetrics.isPositive ? "+" : ""}
																	{changeMetrics.change.toLocaleString()}
																</span>
															</span>
														</div>
														<div className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg">
															<span className="text-purple-400">
																Percentage Change =
															</span>
															<span className="text-white">
																({changeMetrics.change.toLocaleString()} ÷{" "}
																{changeMetrics.firstValue.toLocaleString()}) ×
																100 =
																<span
																	className={
																		changeMetrics.isPositive
																			? "text-green-400"
																			: "text-red-400"
																	}
																>
																	{changeMetrics.isPositive ? "+" : ""}
																	{changeMetrics.changePercent.toFixed(2)}%
																</span>
															</span>
														</div>
													</div>
												</div>

												{/* Data Points */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
													<div className="glass-panel-light rounded-xl p-6 neon-border">
														<h4 className="text-md font-bold text-blue-400 font-orbitron mb-3">
															📅 START POINT (
															{formatDate(historicalData[0].date)})
														</h4>
														<p className="text-3xl font-black text-blue-400 font-orbitron mb-2">
															{changeMetrics.firstValue.toLocaleString()}
														</p>
														<p className="text-sm text-gray-400">
															Baseline value for comparison
														</p>
													</div>

													<div className="glass-panel-light rounded-xl p-6 neon-border">
														<h4 className="text-md font-bold text-green-400 font-orbitron mb-3">
															🎯 END POINT (
															{formatDate(
																historicalData[historicalData.length - 1].date
															)}
															)
														</h4>
														<p className="text-3xl font-black text-green-400 font-orbitron mb-2">
															{changeMetrics.lastValue.toLocaleString()}
														</p>
														<p className="text-sm text-gray-400">
															Final value in selected period
														</p>
													</div>
												</div>

												{/* Results */}
												<div className="grid grid-cols-1 md:grid-cols-2 gap-6">
													<div className="glass-panel-light rounded-xl p-6 neon-border">
														<h4 className="text-md font-bold text-yellow-400 font-orbitron mb-3">
															📈 NET CHANGE
														</h4>
														<p
															className={`text-3xl font-black font-orbitron mb-2 ${
																changeMetrics.isPositive
																	? "text-green-400"
																	: "text-red-400"
															}`}
														>
															{changeMetrics.isPositive ? "+" : ""}
															{changeMetrics.change.toLocaleString()}
														</p>
														<p className="text-sm text-gray-400">
															Absolute difference between periods
														</p>
													</div>

													<div className="glass-panel-light rounded-xl p-6 neon-border">
														<h4 className="text-md font-bold text-pink-400 font-orbitron mb-3">
															📊 GROWTH RATE
														</h4>
														<p
															className={`text-3xl font-black font-orbitron mb-2 ${
																changeMetrics.isPositive
																	? "text-green-400"
																	: "text-red-400"
															}`}
														>
															{changeMetrics.isPositive ? "+" : ""}
															{changeMetrics.changePercent.toFixed(1)}%
														</p>
														<p className="text-sm text-gray-400">
															Percentage change over period
														</p>
													</div>
												</div>
											</div>
										</div>
									)}

									{/* Historical Chart */}
									{historicalData.length > 0 && (
										<div className="glass-panel-light rounded-xl p-6 neon-border">
											<h3 className="text-lg font-bold text-cyan-400 font-orbitron mb-4">
												HISTORICAL TREND
											</h3>
											<div className="h-64 w-full overflow-hidden">
												<ResponsiveContainer width="100%" height="100%">
													<LineChart data={historicalData}>
														<CartesianGrid
															strokeDasharray="3 3"
															stroke="rgba(255, 255, 255, 0.1)"
														/>
														<XAxis
															dataKey="date"
															tickFormatter={formatDate}
															tick={{ fill: "#60a5fa", fontSize: 12 }}
														/>
														<YAxis
															tickFormatter={formatNumber}
															tick={{ fill: "#60a5fa", fontSize: 12 }}
														/>
														<Tooltip
															contentStyle={{
																backgroundColor: "rgba(15, 15, 35, 0.95)",
																border: "1px solid #ff006e",
																borderRadius: 12,
																color: "#fff",
															}}
															labelFormatter={(value) =>
																new Date(value).toLocaleDateString()
															}
															formatter={(value: number) => [
																formatNumber(value),
																selectedKPI.title,
															]}
														/>
														<Line
															type="monotone"
															dataKey="value"
															stroke={selectedKPI.color}
															strokeWidth={3}
															dot={{ fill: selectedKPI.color, r: 5 }}
															activeDot={{
																r: 8,
																stroke: selectedKPI.color,
																strokeWidth: 3,
																fill: "#fff",
															}}
														/>
													</LineChart>
												</ResponsiveContainer>
											</div>
										</div>
									)}
								</div>
							)}
						</motion.div>
					</motion.div>
				)}
			</AnimatePresence>
		</>
	);
}
