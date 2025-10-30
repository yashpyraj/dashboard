import { useQuery } from "@tanstack/react-query";
import { fetchOverviewStats, fetchAllianceScanDates } from "../utils/queries";
import { queryKeys } from "../lib/queryClient";
import { useMemo } from "react";

/**
 * Overview stats interface matching the component needs
 */
export interface OverviewStats {
	totalPower: number;
	averagePower: number;
	totalMerits: number;
	totalKills: number;
	totalT5Kills: number;
	totalManaSpent: number;
	totalUnitsDead: number;
	powerChange?: number;
	powerChangePercent?: number;
	meritChange?: number;
	meritChangePercent?: number;
	killChange?: number;
	killChangePercent?: number;
	manaSpentChange?: number;
	manaSpentChangePercent?: number;
	unitsDeadChange?: number;
	unitsDeadChangePercent?: number;
}

/**
 * Hook to fetch overview stats for a specific date range
 *
 * @param allianceId - Alliance ID
 * @param startDate - Start date (YYYY-MM-DD)
 * @param endDate - End date (YYYY-MM-DD)
 * @param options - Query options
 *
 */
export function useOverviewStats(
	allianceId: string,
	startDate?: string,
	endDate?: string,
	options?: {
		enabled?: boolean;
	}
) {
	const enabled = options?.enabled ?? (!!startDate && !!endDate);

	return useQuery({
		queryKey: queryKeys.overview.stats(allianceId, startDate, endDate),
		queryFn: () => fetchOverviewStats(allianceId, startDate, endDate),
		staleTime: 5 * 60 * 1000, // 5 minutes - overview data changes less frequently
		enabled,
	});
}

/**
 * KPI field types for overview stats
 */
export type KPIField =
	| "totalPower"
	| "averagePower"
	| "totalMerits"
	| "totalKills"
	| "totalT5Kills"
	| "totalManaSpent"
	| "totalUnitsDead";

/**
 * Historical data point for KPI charts
 */
export interface HistoricalDataPoint {
	date: string;
	value: number;
}

/**
 * Hook to fetch historical data for a specific KPI field
 * This fetches stats for each scan date in the range
 *
 * @param allianceId - Alliance ID
 * @param field - KPI field to fetch
 * @param scanDates - Array of scan dates to fetch
 * @param options - Query options
 *
 */
export function useKPIHistoricalData(
	allianceId: string,
	field: KPIField,
	scanDates: string[],
	options?: {
		enabled?: boolean;
	}
) {
	const enabled = options?.enabled ?? scanDates.length > 0;

	return useQuery({
		queryKey: ["kpi-historical", allianceId, field, ...scanDates],
		queryFn: async (): Promise<HistoricalDataPoint[]> => {
			// Fetch stats for each scan date
			const results = await Promise.all(
				scanDates.map(async (date) => {
					try {
						const stats = await fetchOverviewStats(allianceId, date, date);
						return {
							date,
							value: stats[field] as number,
						};
					} catch (error) {
						console.error(`Failed to fetch stats for ${date}:`, error);
						return null;
					}
				})
			);

			// Filter out failed requests and return successful ones
			return results.filter(
				(result): result is HistoricalDataPoint => result !== null
			);
		},
		staleTime: 10 * 60 * 1000, // 10 minutes - historical data rarely changes
		enabled,
	});
}

/**
 * Hook to calculate change metrics from historical data
 * Memoized to prevent unnecessary recalculations
 *
 * @param historicalData - Array of historical data points
 *
 */
export function useChangeCalculation(
	historicalData: HistoricalDataPoint[] | undefined
) {
	return useMemo(() => {
		if (!historicalData || historicalData.length < 2) {
			return {
				change: 0,
				changePercent: 0,
				firstValue: 0,
				lastValue: 0,
				isPositive: false,
			};
		}

		const firstValue = historicalData[0].value;
		const lastValue = historicalData[historicalData.length - 1].value;
		const change = lastValue - firstValue;
		const changePercent = firstValue > 0 ? (change / firstValue) * 100 : 0;

		return {
			change,
			changePercent,
			firstValue,
			lastValue,
			isPositive: change > 0,
		};
	}, [historicalData]);
}

/**
 * Hook to get date range for KPI analysis
 * Filters scan dates between start and end dates
 *
 * @param scanDates - All available scan dates
 * @param startDate - Start date filter
 * @param endDate - End date filter
 *
 */
export function useDateRangeFilter(
	scanDates: string[] | undefined,
	startDate: string,
	endDate: string
) {
	return useMemo(() => {
		if (!scanDates || !startDate || !endDate) {
			return [];
		}

		return scanDates.filter((date) => date >= startDate && date <= endDate);
	}, [scanDates, startDate, endDate]);
}

/**
 * Hook to format numbers with appropriate suffixes (K, M, B)
 *
 * @param num - Number to format
 *
 */
export function useFormatNumber() {
	return useMemo(() => {
		return (num: number | null | undefined) => {
			const n = Number(num ?? 0);
			if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
			if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
			if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
			return n.toString();
		};
	}, []);
}

/**
 * Hook to format dates consistently
 *
 * @example
 * const formatDate = useFormatDate();
 * const formatted = formatDate('2024-01-15'); // "Jan 15"
 */
export function useFormatDate() {
	return useMemo(() => {
		return (dateStr: string) =>
			new Date(dateStr).toLocaleDateString("en-US", {
				month: "short",
				day: "numeric",
			});
	}, []);
}

/**
 * Hook to calculate period duration in days
 *
 * @param startDate - Start date
 * @param endDate - End date
 *
 * @example
 * const days = usePeriodDuration(startDate, endDate);
 */
export function usePeriodDuration(startDate: string, endDate: string) {
	return useMemo(() => {
		if (!startDate || !endDate) return 0;

		const start = new Date(startDate).getTime();
		const end = new Date(endDate).getTime();
		return Math.ceil((end - start) / (1000 * 60 * 60 * 24));
	}, [startDate, endDate]);
}

/**
 * KPI Configuration for display
 */
export interface KPIConfig {
	field: KPIField;
	title: string;
	icon: string; // Icon component name
	color: string;
	description: string;
}

/**
 * Get all KPI configurations
 *
 */
export function useKPIConfigs(): KPIConfig[] {
	return useMemo(
		() => [
			{
				field: "averagePower",
				title: "Average Power",
				icon: "TrendingUp",
				color: "#3b82f6",
				description: "Average power per member",
			},
			{
				field: "totalMerits",
				title: "Total Merits",
				icon: "Award",
				color: "#9333ea",
				description: "Total alliance merits earned",
			},
			{
				field: "totalKills",
				title: "Total Kills",
				icon: "Sword",
				color: "#ef4444",
				description: "Total enemy units eliminated",
			},
			{
				field: "totalManaSpent",
				title: "Mana Spent",
				icon: "Zap",
				color: "#eab308",
				description: "Total mana resources spent",
			},
			{
				field: "totalUnitsDead",
				title: "Units Dead",
				icon: "Target",
				color: "#f97316",
				description: "Total units lost in combat",
			},
		],
		[]
	);
}

/**
 * Comprehensive overview hook that combines multiple data sources
 * Use this for a complete overview page setup
 *
 * @param allianceId - Alliance ID
 * @param startDate - Start date
 * @param endDate - End date
 *
 */
export function useAllianceOverview(
	allianceId: string,
	startDate?: string,
	endDate?: string
) {
	const statsQuery = useOverviewStats(allianceId, startDate, endDate);
	const scanDatesQuery = useQuery({
		queryKey: queryKeys.alliances.scanDates(allianceId),
		queryFn: () => fetchAllianceScanDates(allianceId),
		staleTime: 5 * 60 * 1000,
	});

	return {
		stats: statsQuery.data,
		isLoadingStats: statsQuery.isLoading,
		statsError: statsQuery.error,
		refetchStats: statsQuery.refetch,

		scanDates: scanDatesQuery.data,
		isLoadingScanDates: scanDatesQuery.isLoading,
		scanDatesError: scanDatesQuery.error,

		isLoading: statsQuery.isLoading || scanDatesQuery.isLoading,
		isError: statsQuery.isError || scanDatesQuery.isError,
		error: statsQuery.error || scanDatesQuery.error,
	};
}
