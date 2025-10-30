import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import { fetchAllianceRankings } from "../utils/queries";

export interface AllianceRanking {
	id: string;
	tag: string;
	name: string;
	generation: string;
	memberCount: number;
	totalPower: number;
	averagePower: number;
	totalMerits: number;
	totalKills: number;
	totalT5Kills: number;
	totalT1Kills: number;
	totalManaSpent: number;
	totalUnitsDead: number;
	totalUnitsHealed: number;
	totalHelpsGiven: number;
	totalScouted: number;
	lastScanDate: string;
}

/**
 * Hook to fetch alliance rankings
 *
 */
export function useAllianceRankings() {
	return useQuery({
		queryKey: queryKeys.rankings.all,
		queryFn: fetchAllianceRankings,
		staleTime: 5 * 60 * 1000, // 5 minutes
		gcTime: 15 * 60 * 1000, // 15 minutes
		retryDelay: 3000,
	});
}
