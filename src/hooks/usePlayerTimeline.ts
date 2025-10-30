import { useQuery } from "@tanstack/react-query";
import { queryKeys } from "../lib/queryClient";
import { fetchPlayerTimeline } from "../utils/queries";

/**
 * Hook to fetch player timeline data
 *
 * @param playerId
 * @param allianceId
 *
 */
export function usePlayerTimeline(playerId?: string, allianceId?: string) {
	return useQuery({
		queryKey: queryKeys.players.timeline(playerId || "", allianceId || ""),
		queryFn: () => fetchPlayerTimeline(playerId, allianceId),
		enabled: !!playerId && !!allianceId,
		staleTime: 5 * 60 * 1000, // 5 minutes
	});
}
