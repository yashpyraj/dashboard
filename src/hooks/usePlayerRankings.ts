import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import { fetchPlayerRankings } from "../utils/queries";

interface PlayerRankings {
	[key: string]: {
		rank: number;
		total: number;
		percentile: number;
	};
}

export function usePlayerRankings(
	playerId: string,
	allianceId: string,
	options?: { enabled?: boolean }
) {
	return useQuery<PlayerRankings>({
		queryKey: queryKeys.players.rankings(playerId, allianceId),
		queryFn: async () => {
			if (!playerId || !allianceId) {
				return {};
			}
			return await fetchPlayerRankings(playerId, allianceId);
		},
		enabled: options?.enabled ?? true,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
