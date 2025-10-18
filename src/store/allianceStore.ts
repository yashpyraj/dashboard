import { create } from 'zustand';
import { Alliance, AllianceDetail, PlayerTimeline } from '../types';

interface AllianceStore {
  // State
  alliances: Alliance[];
  selectedAllianceId: string | null;
  allianceDetails: Record<string, AllianceDetail>;
  playerTimelines: Record<string, PlayerTimeline>;
  
  // Loading states
  isLoadingAlliances: boolean;
  isLoadingDetail: boolean;
  isLoadingPlayer: boolean;
  
  // Error states
  error: string | null;
  
  // Actions
  setAlliances: (alliances: Alliance[]) => void;
  setSelectedAlliance: (id: string | null) => void;
  setAllianceDetail: (id: string, detail: AllianceDetail) => void;
  setPlayerTimeline: (playerId: string, timeline: PlayerTimeline) => void;
  setLoadingAlliances: (loading: boolean) => void;
  setLoadingDetail: (loading: boolean) => void;
  setLoadingPlayer: (loading: boolean) => void;
  setError: (error: string | null) => void;
  
  // Getters
  getSelectedAlliance: () => AllianceDetail | null;
  getPlayerTimeline: (playerId: string) => PlayerTimeline | null;
}

export const useAllianceStore = create<AllianceStore>((set, get) => ({
  // Initial state
  alliances: [],
  selectedAllianceId: null,
  allianceDetails: {},
  playerTimelines: {},
  isLoadingAlliances: false,
  isLoadingDetail: false,
  isLoadingPlayer: false,
  error: null,
  
  // Actions
  setAlliances: (alliances) => set({ alliances }),
  setSelectedAlliance: (id) => set({ selectedAllianceId: id, error: null }),
  setAllianceDetail: (id, detail) => 
    set((state) => ({
      allianceDetails: { ...state.allianceDetails, [id]: detail }
    })),
  setPlayerTimeline: (playerId, timeline) =>
    set((state) => ({
      playerTimelines: { ...state.playerTimelines, [playerId]: timeline }
    })),
  setLoadingAlliances: (loading) => set({ isLoadingAlliances: loading }),
  setLoadingDetail: (loading) => set({ isLoadingDetail: loading }),
  setLoadingPlayer: (loading) => set({ isLoadingPlayer: loading }),
  setError: (error) => set({ error }),
  
  // Getters
  getSelectedAlliance: () => {
    const { selectedAllianceId, allianceDetails } = get();
    return selectedAllianceId ? allianceDetails[selectedAllianceId] || null : null;
  },
  getPlayerTimeline: (playerId) => {
    const { playerTimelines } = get();
    return playerTimelines[playerId] || null;
  },
}));