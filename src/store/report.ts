import { create } from 'zustand';

export interface Player {
  id: number | string; // string for temporary client-side ids
  club_player_id?: string | null;
  team_side: 'home' | 'away';
  shirt_number: number | '';
  name: string;
  subbed: string;
  goal: string;
  rating: number | '';
  position_x: number;
  position_y: number;
}

export interface PlayerReview {
  id: number | string;
  player_id: number | string;
  overview: string;
  strengths: string;
  areas_to_improve: string;
  pace: number;
  strength: number;
  stamina: number;
  agility: number;
  decision_making: number;
  composure: number;
  work_rate: number;
  positioning: number;
  recommendation_verdict: string;
  potential_level: string;
}

export interface Report {
  id?: string;
  owner_id?: string;
  owner_name?: string;
  owner_email?: string;
  competition: string;
  date: string;
  venue: string;
  kickoff: string;
  weather: string;
  pitch: string;
  home_team: string;
  home_score: number | '';
  away_team: string;
  away_score: number | '';
  scout_name: string;
  focus: string;
  general_notes: string;
  home_manager: string;
  away_manager: string;
  formation_home: string;
  formation_away: string;
  players: Player[];
  reviews: PlayerReview[];
  video_url?: string;
}

interface ReportState {
  currentReport: Report | null;
  history: Report[];
  historyIndex: number;
  setCurrentReport: (report: Report | null) => void;
  updateReportField: (field: keyof Report, value: any) => void;
  mergeReportFields: (updates: Partial<Report>) => void;
  addPlayer: (player: Player) => void;
  updatePlayer: (id: string | number, updates: Partial<Player>) => void;
  removePlayer: (id: string | number) => void;
  addReview: (review: PlayerReview) => void;
  updateReview: (id: string | number, updates: Partial<PlayerReview>) => void;
  removeReview: (id: string | number) => void;
  undo: () => void;
  redo: () => void;
}

const emptyReport: Report = {
  competition: '', date: '', venue: '', kickoff: '', weather: '', pitch: '',
  home_team: '', home_score: '', away_team: '', away_score: '', scout_name: '',
  focus: '', general_notes: '', home_manager: '', away_manager: '',
  formation_home: '4-3-3', formation_away: '4-3-3',
  players: [], reviews: []
};

const MAX_HISTORY = 20;

const saveHistory = (state: ReportState, newReport: Report): Partial<ReportState> => {
  if (!state.currentReport) return { currentReport: newReport };
  
  const newHistory = state.history.slice(0, state.historyIndex + 1);
  newHistory.push(state.currentReport);
  
  if (newHistory.length > MAX_HISTORY) {
    newHistory.shift();
  }
  
  return {
    currentReport: newReport,
    history: newHistory,
    historyIndex: newHistory.length - 1
  };
};

export const useReportStore = create<ReportState>((set) => ({
  currentReport: null,
  history: [],
  historyIndex: -1,
  
  setCurrentReport: (report) => set({ 
    currentReport: report || { ...emptyReport },
    history: [],
    historyIndex: -1
  }),
  
  updateReportField: (field, value) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, { ...state.currentReport, [field]: value });
  }),

  mergeReportFields: (updates) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, { ...state.currentReport, ...updates });
  }),
  
  addPlayer: (player) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      players: [...state.currentReport.players, player]
    });
  }),
  
  updatePlayer: (id, updates) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      players: state.currentReport.players.map(p => p.id === id ? { ...p, ...updates } : p)
    });
  }),
  
  removePlayer: (id) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      players: state.currentReport.players.filter(p => p.id !== id)
    });
  }),
  
  addReview: (review) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      reviews: [...state.currentReport.reviews, review]
    });
  }),
  
  updateReview: (id, updates) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      reviews: state.currentReport.reviews.map(r => r.id === id ? { ...r, ...updates } : r)
    });
  }),
  
  removeReview: (id) => set((state) => {
    if (!state.currentReport) return state;
    return saveHistory(state, {
      ...state.currentReport,
      reviews: state.currentReport.reviews.filter(r => r.id !== id)
    });
  }),

  undo: () => set((state) => {
    if (state.historyIndex >= 0) {
      const prevReport = state.history[state.historyIndex];
      
      // Save current state to history before undoing so we can redo
      const newHistory = [...state.history];
      if (state.historyIndex === state.history.length - 1 && state.currentReport) {
          newHistory.push(state.currentReport);
      }

      return {
        currentReport: prevReport,
        history: newHistory,
        historyIndex: state.historyIndex - 1
      };
    }
    return state;
  }),

  redo: () => set((state) => {
    if (state.historyIndex < state.history.length - 2) { // -2 because the last item is the current state before undo
      const nextIndex = state.historyIndex + 1;
      const nextReport = state.history[nextIndex + 1]; // +1 because we pushed current state
      return {
        currentReport: nextReport,
        historyIndex: nextIndex
      };
    }
    return state;
  })
}));
