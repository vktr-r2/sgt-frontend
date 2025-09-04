// Mock the api service before any imports
jest.mock('../api', () => ({
  __esModule: true,
  default: {
    get: jest.fn(),
    post: jest.fn(),
    put: jest.fn(),
    delete: jest.fn(),
  },
}));

describe('adminService', () => {
  let adminService;
  let api;

  beforeEach(() => {
    jest.clearAllMocks();
    
    // Import after clearing mocks
    adminService = require('../admin').adminService;
    api = require('../api').default;
  });

  test('adminService functions are available', () => {
    expect(typeof adminService.getTables).toBe('function');
    expect(typeof adminService.getTableData).toBe('function');
    expect(typeof adminService.createRecord).toBe('function');
    expect(typeof adminService.updateRecord).toBe('function');
    expect(typeof adminService.deleteRecord).toBe('function');
  });

  test('getTables calls correct API endpoint', async () => {
    const mockTablesData = {
      tables: {
        users: [],
        golfers: [],
        tournaments: []
      }
    };

    api.get.mockResolvedValue({ data: mockTablesData });

    const result = await adminService.getTables();

    expect(api.get).toHaveBeenCalledWith('/admin');
    expect(result).toEqual(mockTablesData);
  });

  test('getTableData calls correct API endpoint with table name', async () => {
    const tableName = 'users';
    const mockTableData = {
      data: [
        { id: 1, name: 'User 1', email: 'user1@example.com' }
      ],
      columns: [
        { name: 'id', type: 'integer', null: false },
        { name: 'name', type: 'string', null: false },
        { name: 'email', type: 'string', null: false }
      ],
      table_name: 'users'
    };

    api.get.mockResolvedValue({ data: mockTableData });

    const result = await adminService.getTableData(tableName);

    expect(api.get).toHaveBeenCalledWith(`/admin/table/${tableName}`);
    expect(result).toEqual(mockTableData);
  });

  test('createRecord calls correct API endpoint', async () => {
    const tableName = 'users';
    const recordData = {
      name: 'New User',
      email: 'newuser@example.com'
    };
    const mockResponse = {
      message: 'Record created successfully',
      record: { id: 1, ...recordData }
    };

    api.post.mockResolvedValue({ data: mockResponse });

    const result = await adminService.createRecord(tableName, recordData);

    expect(api.post).toHaveBeenCalledWith(`/admin/table/${tableName}`, {
      record: recordData
    });
    expect(result).toEqual(mockResponse);
  });

  test('updateRecord calls correct API endpoint', async () => {
    const tableName = 'users';
    const recordId = 1;
    const recordData = {
      name: 'Updated User',
      email: 'updated@example.com'
    };
    const mockResponse = {
      message: 'Record updated successfully',
      record: { id: recordId, ...recordData }
    };

    api.put.mockResolvedValue({ data: mockResponse });

    const result = await adminService.updateRecord(tableName, recordId, recordData);

    expect(api.put).toHaveBeenCalledWith(`/admin/table/${tableName}/${recordId}`, {
      record: recordData
    });
    expect(result).toEqual(mockResponse);
  });

  test('deleteRecord calls correct API endpoint', async () => {
    const tableName = 'users';
    const recordId = 1;
    const mockResponse = {
      message: 'Record deleted successfully'
    };

    api.delete.mockResolvedValue({ data: mockResponse });

    const result = await adminService.deleteRecord(tableName, recordId);

    expect(api.delete).toHaveBeenCalledWith(`/admin/table/${tableName}/${recordId}`);
    expect(result).toEqual(mockResponse);
  });
});