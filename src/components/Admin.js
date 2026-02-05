import React, { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { adminService } from '../services/admin';
import { authService } from '../services/auth';

function Admin() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const user = authService.getCurrentUser();
  const [selectedTable, setSelectedTable] = useState('users');
  const [editingId, setEditingId] = useState(null);
  const [editData, setEditData] = useState({});
  const [isCreating, setIsCreating] = useState(false);
  const [newRecordData, setNewRecordData] = useState({});

  // Filters and sorting state
  const [filters, setFilters] = useState({
    tournament_id: '',
    user_id: '',
    golfer_id: '',
    sort_by: '',
    sort_direction: 'asc'
  });

  const { data: tableData, isLoading, error } = useQuery({
    queryKey: ['adminTable', selectedTable, filters],
    queryFn: () => adminService.getTableData(selectedTable, selectedTable === 'match_picks' ? filters : {}),
    enabled: !!selectedTable && !!user?.admin
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createRecord(selectedTable, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
      setIsCreating(false);
      setNewRecordData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateRecord(selectedTable, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
      setEditingId(null);
      setEditData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteRecord(selectedTable, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
    }
  });

  if (!user?.admin) {
    navigate('/');
    return null;
  }

  // Map of foreign key columns to their lookup keys
  const foreignKeyMap = {
    user_id: 'users',
    golfer_id: 'golfers',
    tournament_id: 'tournaments',
    match_pick_id: 'match_picks'
  };

  // Get display value for a cell (shows name instead of ID for foreign keys)
  const getDisplayValue = (record, column) => {
    const value = record[column.name];
    if (value === null || value === undefined) return '-';

    const lookupKey = foreignKeyMap[column.name];
    if (lookupKey && tableData?.lookups?.[lookupKey]) {
      const lookup = tableData.lookups[lookupKey].find(item => item.id === value);
      return lookup ? lookup.name : value;
    }

    if (column.type === 'boolean') return value ? 'Yes' : 'No';
    if (column.type === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    return value.toString();
  };

  // Check if column is editable
  const isEditableColumn = (columnName) => {
    return !['id', 'created_at', 'updated_at'].includes(columnName);
  };

  // Render input field for editing
  const renderEditInput = (column, value, onChange) => {
    const lookupKey = foreignKeyMap[column.name];

    // Foreign key - render dropdown
    if (lookupKey && tableData?.lookups?.[lookupKey]) {
      return (
        <select
          value={value || ''}
          onChange={(e) => onChange(column.name, parseInt(e.target.value) || null)}
          className="inline-input"
        >
          <option value="">Select...</option>
          {tableData.lookups[lookupKey].map(item => (
            <option key={item.id} value={item.id}>{item.name}</option>
          ))}
        </select>
      );
    }

    // Boolean
    if (column.type === 'boolean') {
      return (
        <select
          value={value?.toString() || 'false'}
          onChange={(e) => onChange(column.name, e.target.value === 'true')}
          className="inline-input"
        >
          <option value="false">No</option>
          <option value="true">Yes</option>
        </select>
      );
    }

    // Integer
    if (column.type === 'integer') {
      return (
        <input
          type="number"
          value={value ?? ''}
          onChange={(e) => onChange(column.name, e.target.value ? parseInt(e.target.value) : null)}
          className="inline-input"
        />
      );
    }

    // Datetime
    if (column.type === 'datetime') {
      return (
        <input
          type="datetime-local"
          value={value ? new Date(value).toISOString().slice(0, 16) : ''}
          onChange={(e) => onChange(column.name, e.target.value)}
          className="inline-input"
        />
      );
    }

    // Default text
    return (
      <input
        type="text"
        value={value ?? ''}
        onChange={(e) => onChange(column.name, e.target.value)}
        className="inline-input"
      />
    );
  };

  const handleEdit = (record) => {
    setEditingId(record.id);
    setEditData({ ...record });
  };

  const handleSave = () => {
    const dataToSave = { ...editData };
    delete dataToSave.id;
    delete dataToSave.created_at;
    delete dataToSave.updated_at;
    updateMutation.mutate({ id: editingId, data: dataToSave });
  };

  const handleCancel = () => {
    setEditingId(null);
    setEditData({});
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleCreateNew = () => {
    setIsCreating(true);
    setNewRecordData({});
  };

  const handleSaveNew = () => {
    createMutation.mutate(newRecordData);
  };

  const handleCancelNew = () => {
    setIsCreating(false);
    setNewRecordData({});
  };

  const handleFilterChange = (filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  };

  const handleSort = (columnName) => {
    setFilters(prev => ({
      ...prev,
      sort_by: columnName,
      sort_direction: prev.sort_by === columnName && prev.sort_direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const resetFilters = () => {
    setFilters({
      tournament_id: '',
      user_id: '',
      golfer_id: '',
      sort_by: '',
      sort_direction: 'asc'
    });
  };

  const getSortIndicator = (columnName) => {
    if (filters.sort_by !== columnName) return null;
    return filters.sort_direction === 'asc' ? ' ▲' : ' ▼';
  };

  if (isLoading) return <div className="loading">Loading admin data...</div>;
  if (error) return <div className="error">Error loading admin data</div>;

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h2>Admin Dashboard</h2>
          <p>Manage database tables</p>
        </div>
        <button onClick={() => navigate('/')} className="back-btn">
          Back to Dashboard
        </button>
      </div>

      <div className="admin-controls">
        <div className="table-selector">
          <label>
            Select Table:
            <select
              value={selectedTable}
              onChange={(e) => {
                setSelectedTable(e.target.value);
                setEditingId(null);
                setIsCreating(false);
                resetFilters();
              }}
            >
              <option value="users">Users</option>
              <option value="golfers">Golfers</option>
              <option value="tournaments">Tournaments</option>
              <option value="match_picks">Match Picks</option>
              <option value="match_results">Match Results</option>
              <option value="scores">Scores</option>
            </select>
          </label>
        </div>

        <button onClick={handleCreateNew} className="add-btn" disabled={isCreating}>
          Add New Record
        </button>
      </div>

      {/* Match Picks Filters */}
      {selectedTable === 'match_picks' && tableData?.lookups && (
        <div className="filters-container">
          <div className="filters-row">
            <label>
              Tournament:
              <select
                value={filters.tournament_id}
                onChange={(e) => handleFilterChange('tournament_id', e.target.value)}
              >
                <option value="">All Tournaments</option>
                {tableData.lookups.tournaments?.map(t => (
                  <option key={t.id} value={t.id}>{t.name}</option>
                ))}
              </select>
            </label>

            <label>
              User:
              <select
                value={filters.user_id}
                onChange={(e) => handleFilterChange('user_id', e.target.value)}
              >
                <option value="">All Users</option>
                {tableData.lookups.users?.map(u => (
                  <option key={u.id} value={u.id}>{u.name}</option>
                ))}
              </select>
            </label>

            <label>
              Golfer:
              <select
                value={filters.golfer_id}
                onChange={(e) => handleFilterChange('golfer_id', e.target.value)}
              >
                <option value="">All Golfers</option>
                {tableData.lookups.golfers?.map(g => (
                  <option key={g.id} value={g.id}>{g.name}</option>
                ))}
              </select>
            </label>

            <button onClick={resetFilters} className="reset-btn">
              Reset Filters
            </button>
          </div>
          {tableData.total_count !== undefined && (
            <div className="record-count">
              Showing {tableData.data?.length || 0} records
            </div>
          )}
        </div>
      )}

      <div className="table-container">
        {tableData?.data && (
          <table className="admin-table">
            <thead>
              <tr>
                {tableData.columns.map(column => (
                  <th
                    key={column.name}
                    onClick={() => handleSort(column.name)}
                    className="sortable-header"
                    style={{ cursor: 'pointer' }}
                  >
                    {column.name}{getSortIndicator(column.name)}
                  </th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {/* New record row */}
              {isCreating && (
                <tr className="editing-row new-row">
                  {tableData.columns.map(column => (
                    <td key={column.name}>
                      {isEditableColumn(column.name) ? (
                        renderEditInput(
                          column,
                          newRecordData[column.name],
                          (name, value) => setNewRecordData(prev => ({ ...prev, [name]: value }))
                        )
                      ) : (
                        '-'
                      )}
                    </td>
                  ))}
                  <td className="actions">
                    <button onClick={handleSaveNew} className="save-btn" disabled={createMutation.isLoading}>
                      Save
                    </button>
                    <button onClick={handleCancelNew} className="cancel-btn">
                      Cancel
                    </button>
                  </td>
                </tr>
              )}

              {/* Existing records */}
              {tableData.data.map((record) => (
                <tr key={record.id} className={editingId === record.id ? 'editing-row' : ''}>
                  {tableData.columns.map(column => (
                    <td key={column.name}>
                      {editingId === record.id && isEditableColumn(column.name) ? (
                        renderEditInput(
                          column,
                          editData[column.name],
                          (name, value) => setEditData(prev => ({ ...prev, [name]: value }))
                        )
                      ) : (
                        getDisplayValue(record, column)
                      )}
                    </td>
                  ))}
                  <td className="actions">
                    {editingId === record.id ? (
                      <>
                        <button onClick={handleSave} className="save-btn" disabled={updateMutation.isLoading}>
                          Save
                        </button>
                        <button onClick={handleCancel} className="cancel-btn">
                          Cancel
                        </button>
                      </>
                    ) : (
                      <>
                        <button onClick={() => handleEdit(record)} className="edit-btn">
                          Edit
                        </button>
                        <button
                          onClick={() => handleDelete(record.id)}
                          className="delete-btn"
                          disabled={deleteMutation.isLoading}
                        >
                          Delete
                        </button>
                      </>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default Admin;
