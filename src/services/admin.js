import api from './api';

export const adminService = {
  getTables: async () => {
    const response = await api.get('/admin');
    return response.data;
  },

  getTableData: async (tableName, filters = {}) => {
    const params = new URLSearchParams();
    if (filters.tournament_id) params.append('tournament_id', filters.tournament_id);
    if (filters.user_id) params.append('user_id', filters.user_id);
    if (filters.golfer_id) params.append('golfer_id', filters.golfer_id);
    if (filters.sort_by) params.append('sort_by', filters.sort_by);
    if (filters.sort_direction) params.append('sort_direction', filters.sort_direction);

    const queryString = params.toString();
    const url = queryString ? `/admin/table/${tableName}?${queryString}` : `/admin/table/${tableName}`;
    const response = await api.get(url);
    return response.data;
  },

  createRecord: async (tableName, recordData) => {
    const response = await api.post(`/admin/table/${tableName}`, {
      record: recordData
    });
    return response.data;
  },

  updateRecord: async (tableName, recordId, recordData) => {
    const response = await api.put(`/admin/table/${tableName}/${recordId}`, {
      record: recordData
    });
    return response.data;
  },

  deleteRecord: async (tableName, recordId) => {
    const response = await api.delete(`/admin/table/${tableName}/${recordId}`);
    return response.data;
  },

  generatePasswordResetLink: async (userId) => {
    const response = await api.post(`/admin/users/${userId}/generate_reset_link`);
    return response.data;
  }
};