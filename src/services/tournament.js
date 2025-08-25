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
  }
};