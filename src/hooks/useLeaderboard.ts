import { useQuery } from "@tanstack/react-query";
import {
	fetchAllianceScanDates,
	fetchLeaderboard,
	fetchLeaderboardForDate,
} from "../utils/queries";
import { queryKeys } from "../lib/queryClient";
import { LeaderboardEntry } from "../types";
import { useMemo } from "react";

/**
 * Hook to fetch current leaderboard for an alliance
 *
 * @param allianceId
 * @param options
 */
export function useLeaderboard(
	allianceId: string,
	options?: {
		enabled?: boolean;
		refetchInterval?: number;
	}
) {
	return useQuery({
		queryKey: queryKeys.leaderboard.current(allianceId),
		queryFn: () => fetchLeaderboard(allianceId),
		staleTime: 2 * 60 * 1000, // 2 minutes
		enabled: options?.enabled ?? true,
		refetchInterval: options?.refetchInterval,
	});
}

/**
 * Hook to fetch historical leaderboard for a specific date
 *
 * @param allianceId
 * @param scanDate - YYYY-MM-DD format
 * @param options
 *
 */
export function useLeaderboardForDate(
	allianceId: string,
	scanDate: string,
	options?: {
		enabled?: boolean;
	}
) {
	return useQuery({
		queryKey: queryKeys.leaderboard.byDate(allianceId, scanDate),
		queryFn: () => fetchLeaderboardForDate(allianceId, scanDate),
		staleTime: 10 * 60 * 1000, // 10 minutes
		enabled: options?.enabled ?? true,
	});
}

/**
 * Hook to fetch available scan dates for an alliance
 *
 * @param allianceId
 * @param options
 *
 */
export function useAllianceScanDates(
	allianceId: string,
	options?: {
		enabled?: boolean;
	}
) {
	return useQuery({
		queryKey: queryKeys.alliances.scanDates(allianceId),
		queryFn: () => fetchAllianceScanDates(allianceId),
		staleTime: 5 * 60 * 1000, // 5 minutes
		enabled: options?.enabled ?? true,
	});
}

/**
 * Extended leaderboard entry with change calculations
 */
export interface LeaderboardRowWithChanges extends LeaderboardEntry {
	rank: number;
	startValue?: number;
	endValue?: number;
	changeValue?: number;
	changePercent?: number;
	startData?: LeaderboardEntry;
	endData?: LeaderboardEntry;
}

/**
 * * Hook to fetch and calculate leaderboard changes between two dates
 *
 * @param allianceId
 * @param startDate - YYYY-MM-DD format
 * @param endDate - YYYY-MM-DD format
 * @param options
 */
export function useLeaderboardChanges(
	allianceId: string,
	startDate: string,
	endDate: string,
	options?: {
		enabled?: boolean;
	}
) {
	const enabled =
		options?.enabled ?? (!!startDate && !!endDate && startDate < endDate);

	const startQuery = useLeaderboardForDate(allianceId, startDate, { enabled });
	const endQuery = useLeaderboardForDate(allianceId, endDate, { enabled });

	const changes = useMemo(() => {
		if (!startQuery.data || !endQuery.data) {
			return [];
		}

		// Create a map of start values by player_id
		const startMap = new Map<string, LeaderboardEntry>();
		startQuery.data.forEach((player) => {
			startMap.set(player.player_id, player);
		});

		// Calculate changes for each player in end data
		const changesData: LeaderboardRowWithChanges[] = endQuery.data
			.map((endPlayer, index) => {
				const startPlayer = startMap.get(endPlayer.player_id);

				return {
					...endPlayer,
					rank: index + 1,
					startData: startPlayer,
					endData: endPlayer,
				};
			})
			.filter((player) => player.startData); // Only include players with start data

		return changesData;
	}, [startQuery.data, endQuery.data]);

	return {
		data: changes,
		isLoading: startQuery.isLoading || endQuery.isLoading,
		isError: startQuery.isError || endQuery.isError,
		error: startQuery.error || endQuery.error,
		startQuery,
		endQuery,
	};
}

export type LeaderboardTab =
	| "power"
	| "highest_power"
	| "merits"
	| "units_killed"
	| "killcount_t5"
	| "killcount_t1"
	| "units_dead"
	| "units_healed"
	| "scouted"
	| "helps_given"
	| "mana_spent"
	| "mana";

/**
 * Hook to get sorted leaderboard data for a specific tab
 * This handles ranking and sorting based on the active tab
 *
 * @param data - Raw leaderboard data
 * @param activeTab - The metric to sort by
 */

export function useSortedLeaderboard(
	data: LeaderboardEntry[] | undefined,
	activeTab: LeaderboardTab
): LeaderboardRowWithChanges[] {
	return useMemo(() => {
		if (!data || data.length === 0) return [];

		return [...data]
			.sort((a, b) => {
				const aValue = (a as any)[activeTab] || 0;
				const bValue = (b as any)[activeTab] || 0;
				return bValue - aValue;
			})
			.map((player, index) => ({
				...player,
				rank: index + 1,
			}));
	}, [data, activeTab]);
}

/**
 * Hook to calculate and sort change data for a specific tab
 *
 * @param changes - Change data with start and end values
 * @param activeTab - The metric to calculate changes for
 */
export function useChangeDataForTab(
	changes: LeaderboardRowWithChanges[] | undefined,
	activeTab: LeaderboardTab
): LeaderboardRowWithChanges[] {
	return useMemo(() => {
		if (!changes || changes.length === 0) return [];

		const changesWithCalculations = changes.map((player) => {
			const startValue = (player.startData as any)?.[activeTab] || 0;
			const endValue = (player.endData as any)?.[activeTab] || 0;
			const changeValue = endValue - startValue;
			const changePercent =
				startValue > 0 ? (changeValue / startValue) * 100 : 0;

			return {
				...player,
				startValue,
				endValue,
				changeValue,
				changePercent,
			};
		});

		// Sort by change value (highest change first)
		const sortedChanges = changesWithCalculations.sort(
			(a, b) => (b.changeValue || 0) - (a.changeValue || 0)
		);

		// Re-rank based on change
		return sortedChanges.map((player, index) => ({
			...player,
			rank: index + 1,
		}));
	}, [changes, activeTab]);
}

/**
 * Hook to search and filter leaderboard data
 *
 * @param data - Leaderboard data to search
 * @param searchQuery - Search query string
 * @param maxResults - Maximum number of results to return
 *
 */
export function useLeaderboardSearch(
	data: LeaderboardRowWithChanges[] | undefined,
	searchQuery: string,
	maxResults: number
): LeaderboardRowWithChanges[] {
	return useMemo(() => {
		if (!data || data.length === 0 || !searchQuery) return [];

		const query = searchQuery.toLowerCase();

		const results = data.filter(
			(player) =>
				player.name.toLowerCase().includes(query) ||
				(player.lord_id && player.lord_id.toString().includes(query))
		);

		return results.slice(0, maxResults);
	}, [data, searchQuery, maxResults]);
}
