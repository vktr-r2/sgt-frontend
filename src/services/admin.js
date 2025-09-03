import api from './api';

export const adminService = {
  getTables: async () => {
    const response = await api.get('/admin');
    return response.data;
  },

  getTableData: async (tableName) => {
    const response = await api.get(`/admin/table/${tableName}`);
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
  }
};