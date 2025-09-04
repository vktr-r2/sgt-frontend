import { adminService } from '../admin';
import api from '../api';

jest.mock('../api');

describe('adminService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('getTables', () => {
    it('makes GET request to /admin endpoint', async () => {
      const mockResponse = {
        data: {
          tables: {
            users: [],
            golfers: [],
            tournaments: []
          }
        }
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await adminService.getTables();

      expect(api.get).toHaveBeenCalledWith('/admin');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles API errors', async () => {
      const mockError = new Error('Network error');
      api.get.mockRejectedValue(mockError);

      await expect(adminService.getTables()).rejects.toThrow('Network error');
      expect(api.get).toHaveBeenCalledWith('/admin');
    });
  });

  describe('getTableData', () => {
    it('makes GET request to correct table endpoint', async () => {
      const tableName = 'users';
      const mockResponse = {
        data: {
          data: [
            { id: 1, name: 'John Doe', email: 'john@example.com' }
          ],
          columns: [
            { name: 'id', type: 'integer' },
            { name: 'name', type: 'string' },
            { name: 'email', type: 'string' }
          ],
          table_name: 'users'
        }
      };

      api.get.mockResolvedValue(mockResponse);

      const result = await adminService.getTableData(tableName);

      expect(api.get).toHaveBeenCalledWith('/admin/table/users');
      expect(result).toEqual(mockResponse.data);
    });

    it('handles different table names', async () => {
      const tableNames = ['golfers', 'tournaments', 'match_picks'];
      const mockResponse = { data: { data: [], columns: [], table_name: '' } };

      api.get.mockResolvedValue(mockResponse);

      for (const tableName of tableNames) {
        await adminService.getTableData(tableName);
        expect(api.get).toHaveBeenCalledWith(`/admin/table/${tableName}`);
      }
    });

    it('handles API errors', async () => {
      const mockError = new Error('Table not found');
      api.get.mockRejectedValue(mockError);

      await expect(adminService.getTableData('invalid_table')).rejects.toThrow('Table not found');
    });
  });

  describe('createRecord', () => {
    it('makes POST request with correct data structure', async () => {
      const tableName = 'users';
      const recordData = {
        name: 'New User',
        email: 'new@example.com',
        admin: false
      };
      const mockResponse = {
        data: {
          record: { id: 1, ...recordData },
          message: 'Record created successfully'
        }
      };

      api.post.mockResolvedValue(mockResponse);

      const result = await adminService.createRecord(tableName, recordData);

      expect(api.post).toHaveBeenCalledWith('/admin/table/users', {
        record: recordData
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('handles validation errors', async () => {
      const tableName = 'users';
      const recordData = { name: '', email: '' };
      const mockError = {
        response: {
          status: 422,
          data: {
            errors: {
              name: ["can't be blank"],
              email: ["can't be blank"]
            }
          }
        }
      };

      api.post.mockRejectedValue(mockError);

      await expect(adminService.createRecord(tableName, recordData)).rejects.toEqual(mockError);
      expect(api.post).toHaveBeenCalledWith('/admin/table/users', {
        record: recordData
      });
    });

    it('works with different table types', async () => {
      const testCases = [
        {
          table: 'golfers',
          data: { f_name: 'John', l_name: 'Doe', source_id: '123' }
        },
        {
          table: 'tournaments',
          data: { name: 'Test Tournament', year: 2025 }
        }
      ];

      const mockResponse = { data: { record: {}, message: 'Success' } };
      api.post.mockResolvedValue(mockResponse);

      for (const testCase of testCases) {
        await adminService.createRecord(testCase.table, testCase.data);
        expect(api.post).toHaveBeenCalledWith(`/admin/table/${testCase.table}`, {
          record: testCase.data
        });
      }
    });
  });

  describe('updateRecord', () => {
    it('makes PUT request with correct parameters', async () => {
      const tableName = 'users';
      const recordId = 1;
      const recordData = {
        name: 'Updated Name',
        email: 'updated@example.com'
      };
      const mockResponse = {
        data: {
          record: { id: recordId, ...recordData },
          message: 'Record updated successfully'
        }
      };

      api.put.mockResolvedValue(mockResponse);

      const result = await adminService.updateRecord(tableName, recordId, recordData);

      expect(api.put).toHaveBeenCalledWith('/admin/table/users/1', {
        record: recordData
      });
      expect(result).toEqual(mockResponse.data);
    });

    it('handles different data types correctly', async () => {
      const testCases = [
        {
          table: 'users',
          id: 1,
          data: { admin: true, name: 'Admin User' }
        },
        {
          table: 'tournaments',
          id: 2,
          data: { year: 2025, purse: 1000000 }
        },
        {
          table: 'match_picks',
          id: 3,
          data: { priority: 5, drafted: true }
        }
      ];

      const mockResponse = { data: { record: {}, message: 'Updated' } };
      api.put.mockResolvedValue(mockResponse);

      for (const testCase of testCases) {
        await adminService.updateRecord(testCase.table, testCase.id, testCase.data);
        expect(api.put).toHaveBeenCalledWith(
          `/admin/table/${testCase.table}/${testCase.id}`,
          { record: testCase.data }
        );
      }
    });

    it('handles record not found errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: 'Record not found' }
        }
      };

      api.put.mockRejectedValue(mockError);

      await expect(adminService.updateRecord('users', 999, { name: 'Test' })).rejects.toEqual(mockError);
    });

    it('handles validation errors on update', async () => {
      const mockError = {
        response: {
          status: 422,
          data: {
            errors: { email: ['has already been taken'] }
          }
        }
      };

      api.put.mockRejectedValue(mockError);

      await expect(
        adminService.updateRecord('users', 1, { email: 'taken@example.com' })
      ).rejects.toEqual(mockError);
    });
  });

  describe('deleteRecord', () => {
    it('makes DELETE request to correct endpoint', async () => {
      const tableName = 'users';
      const recordId = 1;
      const mockResponse = {
        data: { message: 'Record deleted successfully' }
      };

      api.delete.mockResolvedValue(mockResponse);

      const result = await adminService.deleteRecord(tableName, recordId);

      expect(api.delete).toHaveBeenCalledWith('/admin/table/users/1');
      expect(result).toEqual(mockResponse.data);
    });

    it('works with different table types and IDs', async () => {
      const testCases = [
        { table: 'users', id: 1 },
        { table: 'golfers', id: 25 },
        { table: 'tournaments', id: 100 },
        { table: 'match_picks', id: 500 }
      ];

      const mockResponse = { data: { message: 'Deleted' } };
      api.delete.mockResolvedValue(mockResponse);

      for (const testCase of testCases) {
        await adminService.deleteRecord(testCase.table, testCase.id);
        expect(api.delete).toHaveBeenCalledWith(`/admin/table/${testCase.table}/${testCase.id}`);
      }
    });

    it('handles record not found errors', async () => {
      const mockError = {
        response: {
          status: 404,
          data: { error: 'Record not found' }
        }
      };

      api.delete.mockRejectedValue(mockError);

      await expect(adminService.deleteRecord('users', 999)).rejects.toEqual(mockError);
      expect(api.delete).toHaveBeenCalledWith('/admin/table/users/999');
    });

    it('handles foreign key constraint errors', async () => {
      const mockError = {
        response: {
          status: 422,
          data: { error: 'Cannot delete record due to foreign key constraints' }
        }
      };

      api.delete.mockRejectedValue(mockError);

      await expect(adminService.deleteRecord('users', 1)).rejects.toEqual(mockError);
    });
  });

  describe('Error handling', () => {
    it('propagates network errors correctly', async () => {
      const networkError = new Error('Network Error');
      networkError.code = 'NETWORK_ERROR';

      api.get.mockRejectedValue(networkError);

      await expect(adminService.getTableData('users')).rejects.toThrow('Network Error');
    });

    it('propagates timeout errors correctly', async () => {
      const timeoutError = new Error('Timeout');
      timeoutError.code = 'ECONNABORTED';

      api.post.mockRejectedValue(timeoutError);

      await expect(adminService.createRecord('users', {})).rejects.toThrow('Timeout');
    });

    it('handles server errors gracefully', async () => {
      const serverError = {
        response: {
          status: 500,
          data: { error: 'Internal Server Error' }
        }
      };

      api.put.mockRejectedValue(serverError);

      await expect(adminService.updateRecord('users', 1, {})).rejects.toEqual(serverError);
    });
  });
});