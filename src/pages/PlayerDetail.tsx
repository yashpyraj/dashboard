import { useState, useEffect, useMemo, useCallback } from "react";
import { useParams, useNavigate } from "react-router-dom";
import {
	ArrowLeft,
	User,
	TrendingUp,
	Award,
	Sword,
	Target,
	Heart,
	Zap,
	HandHeart,
	Calendar,
	Download,
	Hash,
	Shield,
	Activity,
	BarChart3,
	Trophy,
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
	Legend,
} from "recharts";
import { LoadingSpinner } from "../components/UI/LoadingSpinner";
import { ErrorMessage } from "../components/UI/ErrorMessage";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";
import { usePlayerTimeline } from "../hooks/usePlayerTimeline";
import { usePlayerRankings } from "../hooks/usePlayerRankings";

type Stat = Record<string, any> & { scan_date: string };

const tabs = [
	{ id: "overview", name: "Overview", icon: User },
	{ id: "progress", name: "Progress", icon: TrendingUp },
	{ id: "rankings", name: "Rankings", icon: Trophy },
	{ id: "analytics", name: "Analytics", icon: BarChart3 },
];

export default function PlayerDetail(): JSX.Element {
	const { allianceId, playerId } = useParams<{
		allianceId: string;
		playerId: string;
	}>();
	const navigate = useNavigate();

	const [availableDates, setAvailableDates] = useState<string[]>([]);
	const [selectedStartDate, setSelectedStartDate] = useState<string>("");
	const [selectedEndDate, setSelectedEndDate] = useState<string>("");
	const [filteredStats, setFilteredStats] = useState<Stat[]>([]);
	const [activeTab, setActiveTab] = useState("overview");
	const [isExporting, setIsExporting] = useState(false);
	const {
		data: playerData,
		isLoading: isLoadingPlayer,
		error: playerError,
		refetch: refetchPlayer,
	} = usePlayerTimeline(playerId, allianceId);

	const { data: rankings = {}, isLoading: isLoadingRankings } =
		usePlayerRankings(playerId || "", allianceId || "", {
			enabled: !!playerId && !!allianceId,
		});

	const loading = isLoadingPlayer || isLoadingRankings;
	const error = playerError?.message || null;
	const player = playerData || null;

	const formatNumber = useCallback((num?: number | null) => {
		const n = Number(num ?? 0);
		if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
		if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
		if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
		return n.toString();
	}, []);

	const formatDate = useCallback((dateStr?: string) => {
		if (!dateStr) return "N/A";
		try {
			return new Date(dateStr).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
				year: "numeric",
			});
		} catch (e) {
			return dateStr;
		}
	}, []);

	const calculateChange = useCallback(
		(oldVal?: number | null, newVal?: number | null) => {
			const a = Number(oldVal ?? 0);
			const b = Number(newVal ?? 0);
			if (a === 0) {
				const change = b - a;
				const changePercent =
					a === 0 ? (b === 0 ? 0 : 100) : ((b - a) / a) * 100;
				return { change, changePercent };
			}
			const change = b - a;
			const changePercent = (change / a) * 100;
			return { change, changePercent };
		},
		[]
	);

	useEffect(() => {
		if (!player) {
			setFilteredStats([]);
			return;
		}
		if (!selectedStartDate || !selectedEndDate) {
			setFilteredStats(player.stats || []);
			return;
		}

		const filtered = (player.stats || []).filter(
			(s) => s.scan_date >= selectedStartDate && s.scan_date <= selectedEndDate
		);
		setFilteredStats(filtered);
	}, [player, selectedStartDate, selectedEndDate]);

	const chartData = useMemo(
		() =>
			filteredStats.map((stat) => ({
				date: stat.scan_date,
				power: stat.power || 0,
				merits: stat.merits || 0,
				units_killed: stat.units_killed || 0,
				killcount_t5: stat.killcount_t5 || 0,
				mana_spent: stat.mana_spent || 0,
				mana: stat.mana || 0,
				units_healed: stat.units_healed || 0,
				units_dead: stat.units_dead || 0,
			})),
		[filteredStats]
	);

	const exportToPDF = useCallback(async () => {
		if (!player || filteredStats.length === 0) {
			alert("No data to export");
			return;
		}

		setIsExporting(true);

		try {
			const latestStats = filteredStats[filteredStats.length - 1];

			const temp = document.createElement("div");
			temp.style.position = "absolute";
			temp.style.left = "-9999px";
			temp.style.top = "0";
			temp.style.width = "1200px";
			temp.style.padding = "28px";
			temp.style.background = "#0f172a";
			temp.style.color = "#fff";
			temp.style.fontFamily = "Arial, sans-serif";

			temp.innerHTML = `
        <div style="max-width: 1150px">
          <h1 style="color:#ff006e; margin:0 0 8px 0;">PLAYER PROFILE REPORT</h1>
          <div style="margin-bottom:12px;color:#9ca3af;">${
						player.player.current_name
					} • ${player.player.lord_id}</div>
          <div style="display:flex; gap:12px; flex-wrap:wrap; margin-bottom:12px;">
            <div>Power: ${formatNumber(latestStats.power)}</div>
            <div>Merits: ${formatNumber(latestStats.merits)}</div>
            <div>Kills: ${formatNumber(latestStats.units_killed)}</div>
          </div>
          <div style="font-size:12px;color:#9ca3af;">Generated: ${new Date().toLocaleString()}</div>
        </div>
      `;

			document.body.appendChild(temp);

			const canvas = await html2canvas(temp, {
				backgroundColor: "#0f172a",
				scale: 2,
				useCORS: true,
			});
			document.body.removeChild(temp);

			const imgData = canvas.toDataURL("image/png");
			const pdf = new jsPDF("p", "mm", "a4");
			const pdfW = pdf.internal.pageSize.getWidth();
			const pdfH = pdf.internal.pageSize.getHeight();
			const imgW = canvas.width;
			const imgH = canvas.height;
			const ratio = Math.min(pdfW / imgW, pdfH / imgH);
			const x = (pdfW - imgW * ratio) / 2;
			const y = 10;
			pdf.addImage(imgData, "PNG", x, y, imgW * ratio, imgH * ratio);

			const filename =
				`${player.player.current_name}_${selectedStartDate}_to_${selectedEndDate}.pdf`.replace(
					/[^a-z0-9_\-\.]/gi,
					"_"
				);
			pdf.save(filename);
		} catch (err) {
			console.error(err);
			alert("Failed to export PDF");
		} finally {
			setIsExporting(false);
		}
	}, [player, filteredStats, selectedStartDate, selectedEndDate, formatNumber]);

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
						<User className="w-8 h-8 text-blue-400" />
					</motion.div>
					<p className="text-blue-400 font-orbitron font-bold">
						LOADING OPERATIVE PROFILE...
					</p>
				</div>
			</motion.div>
		);
	}

	if (error) {
		return <ErrorMessage message={error} onRetry={refetchPlayer} />;
	}

	if (!player) {
		return <ErrorMessage message="Player not found" />;
	}

	const latestStats = filteredStats[filteredStats.length - 1] ?? null;
	const firstStats = filteredStats[0] ?? null;

	const powerChange = calculateChange(firstStats?.power, latestStats?.power);
	const meritChange = calculateChange(firstStats?.merits, latestStats?.merits);
	const killChange = calculateChange(
		firstStats?.units_killed,
		latestStats?.units_killed
	);
	const manaSpentChange = calculateChange(
		firstStats?.mana_spent,
		latestStats?.mana_spent
	);
	const manaChange = calculateChange(firstStats?.mana, latestStats?.mana);
	const healsChange = calculateChange(
		firstStats?.units_healed,
		latestStats?.units_healed
	);
	const deathsChange = calculateChange(
		firstStats?.units_dead,
		latestStats?.units_dead
	);

	const renderOverview = () => (
		<div className="space-y-6">
			{/* Player Info Card */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-panel rounded-2xl p-6 relative overflow-hidden"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
				<div className="flex items-center space-x-4 relative z-10">
					<motion.div
						animate={{ rotate: [0, 5, -5, 0] }}
						transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
						className="p-4 glass-panel-light rounded-xl neon-border neon-glow"
					>
						<User className="w-8 h-8 text-blue-400" />
					</motion.div>
					<div>
						<h2 className="text-2xl font-black text-white font-orbitron">
							{player.player.current_name}
						</h2>
						<div className="flex items-center space-x-4 mt-2 text-sm">
							<div className="flex items-center space-x-2">
								<Shield className="w-4 h-4 text-purple-400" />
								<span className="text-purple-400 font-bold">
									{player.player.faction || "UNKNOWN FACTION"}
								</span>
							</div>
							<div className="flex items-center space-x-2">
								<Hash className="w-4 h-4 text-cyan-400" />
								<span className="text-cyan-400 font-mono">
									{player.player.lord_id}
								</span>
							</div>
						</div>
					</div>
				</div>
			</motion.div>

			{/* Current Stats */}
			{latestStats && (
				<div className="grid grid-cols-2 md:grid-cols-4 gap-4">
					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.1 }}
						className="glass-panel-light rounded-xl p-4 neon-border text-center"
					>
						<TrendingUp className="w-5 h-5 text-blue-400 mx-auto mb-2" />
						<div className="text-sm text-blue-400 font-bold font-orbitron mb-1">
							POWER
						</div>
						<div className="text-xl font-black text-white font-orbitron">
							{formatNumber(latestStats.power)}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.2 }}
						className="glass-panel-light rounded-xl p-4 neon-border text-center"
					>
						<Award className="w-5 h-5 text-purple-400 mx-auto mb-2" />
						<div className="text-sm text-purple-400 font-bold font-orbitron mb-1">
							MERITS
						</div>
						<div className="text-xl font-black text-white font-orbitron">
							{formatNumber(latestStats.merits)}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.3 }}
						className="glass-panel-light rounded-xl p-4 neon-border text-center"
					>
						<Sword className="w-5 h-5 text-red-400 mx-auto mb-2" />
						<div className="text-sm text-red-400 font-bold font-orbitron mb-1">
							KILLS
						</div>
						<div className="text-xl font-black text-white font-orbitron">
							{formatNumber(latestStats.units_killed)}
						</div>
					</motion.div>

					<motion.div
						initial={{ opacity: 0, scale: 0.9 }}
						animate={{ opacity: 1, scale: 1 }}
						transition={{ delay: 0.4 }}
						className="glass-panel-light rounded-xl p-4 neon-border text-center"
					>
						<Target className="w-5 h-5 text-orange-400 mx-auto mb-2" />
						<div className="text-sm text-orange-400 font-bold font-orbitron mb-1">
							T5 KILLS
						</div>
						<div className="text-xl font-black text-white font-orbitron">
							{formatNumber(latestStats.killcount_t5)}
						</div>
					</motion.div>
				</div>
			)}

			{/* Player Timeline */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.5 }}
				className="glass-panel rounded-2xl p-6 relative overflow-hidden"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
				<div className="flex items-center mb-6 relative z-10">
					<Activity className="w-6 h-6 text-purple-400 mr-3" />
					<h3 className="text-xl font-black text-purple-400 font-orbitron">
						OPERATIVE TIMELINE
					</h3>
				</div>
				<div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm relative z-10">
					<div>
						<span className="text-gray-400">First Contact:</span>
						<span className="ml-2 text-cyan-400 font-bold">
							{formatDate(player.player.first_seen)}
						</span>
					</div>
					<div>
						<span className="text-gray-400">Last Contact:</span>
						<span className="ml-2 text-cyan-400 font-bold">
							{formatDate(player.player.last_seen)}
						</span>
					</div>
					<div>
						<span className="text-gray-400">Intel Reports:</span>
						<span className="ml-2 text-green-400 font-bold">
							{player.stats.length}
						</span>
					</div>
					<div>
						<span className="text-gray-400">Current Alliance:</span>
						<span className="ml-2 text-orange-400 font-bold">
							[{latestStats?.alliance_tag || "N/A"}]
						</span>
					</div>
				</div>
			</motion.div>
		</div>
	);

	const renderProgress = () => (
		<div className="space-y-6">
			{/* Date Range Selector */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-panel rounded-2xl p-6 relative overflow-hidden"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10"></div>
				<div className="flex items-center mb-4 relative z-10">
					<Calendar className="w-6 h-6 text-blue-400 mr-3" />
					<h3 className="text-xl font-black text-blue-400 font-orbitron">
						ANALYSIS PERIOD
					</h3>
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
							{availableDates.map((date) => (
								<option key={date} value={date} className="bg-gray-800">
									{formatDate(date)}
								</option>
							))}
						</select>
					</div>
					<div>
						<label className="block text-sm font-bold text-green-400 font-orbitron mb-2">
							END DATE
						</label>
						<select
							value={selectedEndDate}
							onChange={(e) => setSelectedEndDate(e.target.value)}
							className="w-full px-4 py-3 glass-panel-light border border-gray-600/50 rounded-xl text-white focus:outline-none focus:ring-2 focus:ring-green-500 transition-all duration-300"
						>
							{availableDates.map((date) => (
								<option key={date} value={date} className="bg-gray-800">
									{formatDate(date)}
								</option>
							))}
						</select>
					</div>
				</div>
			</motion.div>

			{/* Performance Chart */}
			{chartData.length > 0 && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.2 }}
					className="glass-panel rounded-2xl p-6 relative overflow-hidden"
				>
					<div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 to-pink-500/5"></div>
					<div className="flex items-center mb-6 relative z-10">
						<BarChart3 className="w-6 h-6 text-purple-400 mr-3" />
						<h3 className="text-xl font-black text-purple-400 font-orbitron">
							PERFORMANCE TIMELINE
						</h3>
					</div>
					<div className="h-80 relative z-10">
						<ResponsiveContainer width="100%" height="100%">
							<LineChart
								data={chartData}
								margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
							>
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
									labelFormatter={formatDate}
									formatter={(value: number, name: string) => [
										formatNumber(value),
										name === "power"
											? "Power"
											: name === "merits"
											? "Merits"
											: name === "units_killed"
											? "Units Killed"
											: name === "mana_spent"
											? "Mana Spent"
											: name === "mana"
											? "Mana Gathered"
											: name,
									]}
								/>
								<Legend />
								<Line
									type="monotone"
									dataKey="power"
									stroke="#3a86ff"
									strokeWidth={3}
									name="Power"
								/>
								<Line
									type="monotone"
									dataKey="merits"
									stroke="#9333ea"
									strokeWidth={3}
									name="Merits"
								/>
								<Line
									type="monotone"
									dataKey="units_killed"
									stroke="#ff006e"
									strokeWidth={3}
									name="Units Killed"
								/>
								<Line
									type="monotone"
									dataKey="mana_spent"
									stroke="#eab308"
									strokeWidth={2}
									name="Mana Spent"
								/>
								<Line
									type="monotone"
									dataKey="mana"
									stroke="#06b6d4"
									strokeWidth={2}
									name="Mana Gathered"
								/>
							</LineChart>
						</ResponsiveContainer>
					</div>
				</motion.div>
			)}

			{/* Period Changes */}
			{firstStats && latestStats && (
				<motion.div
					initial={{ opacity: 0, y: 20 }}
					animate={{ opacity: 1, y: 0 }}
					transition={{ delay: 0.3 }}
					className="glass-panel rounded-2xl p-6 relative overflow-hidden"
				>
					<div className="absolute inset-0 bg-gradient-to-br from-cyan-500/5 to-blue-500/5"></div>
					<div className="flex items-center mb-6 relative z-10">
						<TrendingUp className="w-6 h-6 text-cyan-400 mr-3" />
						<h3 className="text-xl font-black text-cyan-400 font-orbitron">
							PERIOD CHANGES
						</h3>
						<span className="ml-4 text-sm text-gray-400">
							{formatDate(selectedStartDate)} → {formatDate(selectedEndDate)}
						</span>
					</div>

					<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
						{/* Power Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<TrendingUp className="w-5 h-5 text-blue-400 mr-2" />
								<span className="text-sm font-bold text-blue-400 font-orbitron">
									POWER CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									powerChange.change >= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{powerChange.change >= 0 ? "+" : ""}
								{formatNumber(powerChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									powerChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{powerChange.changePercent >= 0 ? "+" : ""}
								{powerChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Merit Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Award className="w-5 h-5 text-purple-400 mr-2" />
								<span className="text-sm font-bold text-purple-400 font-orbitron">
									MERIT CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									meritChange.change >= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{meritChange.change >= 0 ? "+" : ""}
								{formatNumber(meritChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									meritChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{meritChange.changePercent >= 0 ? "+" : ""}
								{meritChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Kill Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Sword className="w-5 h-5 text-red-400 mr-2" />
								<span className="text-sm font-bold text-red-400 font-orbitron">
									KILL CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									killChange.change >= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{killChange.change >= 0 ? "+" : ""}
								{formatNumber(killChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									killChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{killChange.changePercent >= 0 ? "+" : ""}
								{killChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Mana Spent Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Zap className="w-5 h-5 text-yellow-400 mr-2" />
								<span className="text-sm font-bold text-yellow-400 font-orbitron">
									MANA SPENT CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									manaSpentChange.change >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{manaSpentChange.change >= 0 ? "+" : ""}
								{formatNumber(manaSpentChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									manaSpentChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{manaSpentChange.changePercent >= 0 ? "+" : ""}
								{manaSpentChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Mana Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Zap className="w-5 h-5 text-cyan-400 mr-2" />
								<span className="text-sm font-bold text-cyan-400 font-orbitron">
									MANA CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									manaChange.change >= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{manaChange.change >= 0 ? "+" : ""}
								{formatNumber(manaChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									manaChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{manaChange.changePercent >= 0 ? "+" : ""}
								{manaChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Heals Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Heart className="w-5 h-5 text-green-400 mr-2" />
								<span className="text-sm font-bold text-green-400 font-orbitron">
									HEALS CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									healsChange.change >= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{healsChange.change >= 0 ? "+" : ""}
								{formatNumber(healsChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									healsChange.changePercent >= 0
										? "text-green-400"
										: "text-red-400"
								}`}
							>
								{healsChange.changePercent >= 0 ? "+" : ""}
								{healsChange.changePercent.toFixed(1)}%
							</div>
						</div>

						{/* Deaths Change */}
						<div className="glass-panel-light rounded-xl p-4 neon-border">
							<div className="flex items-center mb-3">
								<Target className="w-5 h-5 text-red-400 mr-2" />
								<span className="text-sm font-bold text-red-400 font-orbitron">
									DEATHS CHANGE
								</span>
							</div>
							<div
								className={`text-xl font-black font-orbitron ${
									deathsChange.change <= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{deathsChange.change >= 0 ? "+" : ""}
								{formatNumber(deathsChange.change)}
							</div>
							<div
								className={`text-sm font-bold ${
									deathsChange.change <= 0 ? "text-green-400" : "text-red-400"
								}`}
							>
								{deathsChange.changePercent >= 0 ? "+" : ""}
								{deathsChange.changePercent.toFixed(1)}%
							</div>
						</div>
					</div>
				</motion.div>
			)}
		</div>
	);

	const renderRankings = () => (
		<div className="space-y-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-panel rounded-2xl p-6 relative overflow-hidden"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-yellow-500/10 to-orange-500/10"></div>
				<div className="flex items-center mb-6 relative z-10">
					<Trophy className="w-6 h-6 text-yellow-400 mr-3" />
					<h3 className="text-xl font-black text-yellow-400 font-orbitron">
						ALLIANCE RANKINGS
					</h3>
				</div>

				<div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 relative z-10">
					{Object.entries(rankings).map(([field, ranking]) => (
						<div
							key={field}
							className="glass-panel-light rounded-xl p-4 neon-border"
						>
							<div className="text-sm text-gray-400 mb-2 font-orbitron">
								{field.replace(/_/g, " ").toUpperCase()}
							</div>
							<div className="text-xl font-black text-white font-orbitron mb-1">
								#{ranking.rank}
							</div>
							<div className="text-sm text-cyan-400">
								Top {ranking.percentile}% ({ranking.rank}/{ranking.total})
							</div>
						</div>
					))}
				</div>
			</motion.div>
		</div>
	);

	const renderAnalytics = () => (
		<div className="space-y-6">
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				className="glass-panel rounded-2xl p-6 relative overflow-hidden"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-green-500/10 to-blue-500/10"></div>
				<div className="flex items-center mb-6 relative z-10">
					<Activity className="w-6 h-6 text-green-400 mr-3" />
					<h3 className="text-xl font-black text-green-400 font-orbitron">
						DETAILED ANALYTICS
					</h3>
				</div>

				{latestStats && (
					<div className="grid grid-cols-2 md:grid-cols-4 gap-4 relative z-10">
						<div className="text-center p-4 glass-panel-light rounded-xl neon-border">
							<Zap className="w-5 h-5 text-purple-400 mx-auto mb-2" />
							<div className="text-sm text-purple-400 font-bold font-orbitron mb-1">
								MANA SPENT
							</div>
							<div className="text-lg font-black text-white font-orbitron">
								{formatNumber(latestStats.mana_spent)}
							</div>
						</div>

						<div className="text-center p-4 glass-panel-light rounded-xl neon-border">
							<Heart className="w-5 h-5 text-green-400 mx-auto mb-2" />
							<div className="text-sm text-green-400 font-bold font-orbitron mb-1">
								UNITS HEALED
							</div>
							<div className="text-lg font-black text-white font-orbitron">
								{formatNumber(latestStats.units_healed)}
							</div>
						</div>

						<div className="text-center p-4 glass-panel-light rounded-xl neon-border">
							<Target className="w-5 h-5 text-red-400 mx-auto mb-2" />
							<div className="text-sm text-red-400 font-bold font-orbitron mb-1">
								UNITS DEAD
							</div>
							<div className="text-lg font-black text-white font-orbitron">
								{formatNumber(latestStats.units_dead)}
							</div>
						</div>

						<div className="text-center p-4 glass-panel-light rounded-xl neon-border">
							<HandHeart className="w-5 h-5 text-pink-400 mx-auto mb-2" />
							<div className="text-sm text-pink-400 font-bold font-orbitron mb-1">
								HELPS GIVEN
							</div>
							<div className="text-lg font-black text-white font-orbitron">
								{formatNumber(latestStats.helps_given)}
							</div>
						</div>
					</div>
				)}
			</motion.div>
		</div>
	);

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
				transition={{ delay: 0.1 }}
				className="glass-panel rounded-2xl p-4 sm:p-6 md:p-8 relative overflow-hidden z-10"
			>
				<div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 via-purple-500/10 to-pink-500/10"></div>
				<div className="flex flex-col sm:flex-row items-start sm:items-center justify-between space-y-4 sm:space-y-0 relative z-10">
					<div className="flex items-center space-x-3 sm:space-x-4">
						<motion.button
							whileHover={{ scale: 1.1 }}
							whileTap={{ scale: 0.95 }}
							onClick={() => navigate(`/alliance/${allianceId}`)}
							className="glass-panel-light rounded-xl p-2 sm:p-3 neon-border hover:neon-glow transition-all duration-300"
						>
							<ArrowLeft className="w-4 h-4 sm:w-5 sm:h-5 md:w-6 md:h-6 text-cyan-400" />
						</motion.button>
						<motion.div
							animate={{ rotate: [0, 10, -10, 0] }}
							transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
							className="p-2 sm:p-3 md:p-4 glass-panel-light rounded-2xl neon-border neon-glow"
						>
							<User className="w-6 h-6 sm:w-8 sm:h-8 md:w-10 md:h-10 text-blue-400" />
						</motion.div>
						<div>
							<h1 className="text-xl sm:text-2xl md:text-3xl font-black text-white font-orbitron">
								<span className="text-blue-400">OPERATIVE</span>{" "}
								<span className="text-purple-400">PROFILE</span>
							</h1>
							<p className="text-gray-400 mt-1 sm:mt-2 text-sm sm:text-base">
								Comprehensive player analytics and performance tracking
							</p>
						</div>
					</div>
					<motion.button
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={exportToPDF}
						disabled={isExporting || filteredStats.length === 0}
						className="px-4 py-2 bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 disabled:from-gray-600 disabled:to-gray-700 disabled:opacity-50 text-white rounded-xl font-bold transition-all duration-300 flex items-center space-x-2"
					>
						{isExporting ? (
							<LoadingSpinner size="sm" />
						) : (
							<Download className="w-5 h-5" />
						)}
						<span className="font-orbitron">
							{isExporting ? "EXPORTING..." : "EXPORT PDF"}
						</span>
					</motion.button>
				</div>
			</motion.div>

			{/* Tabs */}
			<motion.div
				initial={{ opacity: 0, y: 20 }}
				animate={{ opacity: 1, y: 0 }}
				transition={{ delay: 0.2 }}
				className="glass-panel rounded-2xl"
			>
				<div className="border-b border-gray-700">
					<nav className="flex space-x-2 sm:space-x-4 md:space-x-8 px-3 sm:px-4 md:px-6 overflow-x-auto">
						{tabs.map((tab) => (
							<motion.button
								key={tab.id}
								whileHover={{ scale: 1.05 }}
								whileTap={{ scale: 0.95 }}
								onClick={() => setActiveTab(tab.id)}
								className={`flex items-center space-x-1 sm:space-x-2 py-3 sm:py-4 px-2 sm:px-3 border-b-2 font-bold text-xs sm:text-sm transition-all duration-300 focus:outline-none focus:ring-2 focus:ring-blue-500 font-orbitron whitespace-nowrap ${
									activeTab === tab.id
										? "border-blue-500 text-blue-500"
										: "border-transparent text-gray-300 hover:text-blue-500 hover:border-blue-500/50"
								}`}
							>
								<tab.icon
									className={`w-3 h-3 sm:w-4 sm:h-4 ${
										activeTab === tab.id ? "text-blue-500" : "text-gray-300"
									}`}
								/>
								<span>{tab.name.toUpperCase()}</span>
							</motion.button>
						))}
					</nav>
				</div>

				<div className="p-3 sm:p-4 md:p-6">
					<AnimatePresence mode="wait">
						<motion.div
							key={activeTab}
							initial={{ opacity: 0, x: 20 }}
							animate={{ opacity: 1, x: 0 }}
							exit={{ opacity: 0, x: -20 }}
							transition={{ duration: 0.3 }}
						>
							{activeTab === "overview" && renderOverview()}
							{activeTab === "progress" && renderProgress()}
							{activeTab === "rankings" && renderRankings()}
							{activeTab === "analytics" && renderAnalytics()}
						</motion.div>
					</AnimatePresence>
				</div>
			</motion.div>
		</motion.div>
	);
}
