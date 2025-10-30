import { QueryClient, keepPreviousData } from "@tanstack/react-query";

export const queryClient = new QueryClient({
	defaultOptions: {
		queries: {
			// How long data is considered fresh
			staleTime: 2 * 60 * 1000, // 2 minutes
			// How long before unfresh data is garbage collected
			gcTime: 10 * 60 * 1000, // 10 minutes
			retry: 1,
			// Keep previous data while fetching new data
			placeholderData: keepPreviousData,
		},
	},
});

// Query Keys - Centralize for consistency and type safety
export const queryKeys = {
	alliances: {
		all: ["alliances"] as const,
		detail: (id: string) => ["alliances", "detail", id] as const,
		dateRange: (id: string) => ["alliances", "dateRange", id] as const,
		scanDates: (id: string) => ["alliances", "scanDates", id] as const,
	},
	leaderboard: {
		current: (allianceId: string) => ["leaderboard", allianceId] as const,
		byDate: (allianceId: string, date: string) =>
			["leaderboard", allianceId, date] as const,
	},
	players: {
		timeline: (playerId: string, allianceId: string) =>
			["players", "timeline", playerId, allianceId] as const,
		rankings: (playerId: string, allianceId: string) =>
			["players", "rankings", playerId, allianceId] as const,
		search: (allianceId: string, query: string) =>
			["players", "search", allianceId, query] as const,
	},
	overview: {
		stats: (allianceId: string, startDate?: string, endDate?: string) =>
			["overview", allianceId, startDate, endDate] as const,
	},
	rankings: {
		all: ["rankings", "all"] as const,
	},
} as const;
