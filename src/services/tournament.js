import api from './api';

export const tournamentService = {
  getAppInfo: async () => {
    const response = await api.get('/');
    return response.data;
  },

  getDraftData: async () => {
    const response = await api.get('/draft');
    return response.data;
  },

  submitPicks: async (picks) => {
    const response = await api.post('/draft/submit', { picks });
    return response.data;
  },

  getCurrentScores: async () => {
    const response = await api.get('/api/tournaments/current/scores');
    return response.data;
  },

  getSeasonStandings: async (year) => {
    const response = await api.get(`/api/standings/season?year=${year}`);
    return response.data;
  },

  getFullLeaderboard: async () => {
    const response = await api.get('/api/tournaments/current/full_leaderboard');
    return response.data;
  },

  getTournamentHistory: async (year, page = 1) => {
    const params = new URLSearchParams({ year, page, per_page: 50 });
    const response = await api.get(`/api/tournaments/history?${params.toString()}`);
    return response.data;
  },

  getTournamentResults: async (id) => {
    const response = await api.get(`/api/tournaments/${id}/results`);
    return response.data;
  }
};