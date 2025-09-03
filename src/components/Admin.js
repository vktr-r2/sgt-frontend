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
  const [editingRecord, setEditingRecord] = useState(null);
  const [formData, setFormData] = useState({});
  const [showForm, setShowForm] = useState(false);

  // All hooks must be called before any early returns
  const { data: tableData, isLoading, error, refetch } = useQuery({
    queryKey: ['adminTable', selectedTable],
    queryFn: () => adminService.getTableData(selectedTable),
    enabled: !!selectedTable && !!user?.admin
  });

  const createMutation = useMutation({
    mutationFn: (data) => adminService.createRecord(selectedTable, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
      setShowForm(false);
      setFormData({});
    }
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, data }) => adminService.updateRecord(selectedTable, id, data),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
      setEditingRecord(null);
      setFormData({});
    }
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => adminService.deleteRecord(selectedTable, id),
    onSuccess: () => {
      queryClient.invalidateQueries(['adminTable', selectedTable]);
    }
  });

  // Redirect if not admin (after hooks)
  if (!user?.admin) {
    navigate('/');
    return null;
  }

  const handleSubmit = (e) => {
    e.preventDefault();
    if (editingRecord) {
      updateMutation.mutate({ id: editingRecord.id, data: formData });
    } else {
      createMutation.mutate(formData);
    }
  };

  const handleEdit = (record) => {
    setEditingRecord(record);
    setFormData({ ...record });
    setShowForm(true);
  };

  const handleDelete = (id) => {
    if (window.confirm('Are you sure you want to delete this record?')) {
      deleteMutation.mutate(id);
    }
  };

  const handleInputChange = (column, value) => {
    setFormData(prev => ({ ...prev, [column]: value }));
  };

  const resetForm = () => {
    setEditingRecord(null);
    setFormData({});
    setShowForm(false);
  };

  const renderFormField = (column) => {
    if (['id', 'created_at', 'updated_at'].includes(column.name)) {
      return null;
    }

    const value = formData[column.name] || '';

    switch (column.type) {
      case 'boolean':
        return (
          <label key={column.name} className="form-field">
            <span>{column.name}:</span>
            <select
              value={value.toString()}
              onChange={(e) => handleInputChange(column.name, e.target.value === 'true')}
            >
              <option value="false">False</option>
              <option value="true">True</option>
            </select>
          </label>
        );
      case 'integer':
        return (
          <label key={column.name} className="form-field">
            <span>{column.name}:</span>
            <input
              type="number"
              value={value}
              onChange={(e) => handleInputChange(column.name, parseInt(e.target.value) || 0)}
            />
          </label>
        );
      case 'datetime':
        return (
          <label key={column.name} className="form-field">
            <span>{column.name}:</span>
            <input
              type="datetime-local"
              value={value ? new Date(value).toISOString().slice(0, 16) : ''}
              onChange={(e) => handleInputChange(column.name, e.target.value)}
            />
          </label>
        );
      default:
        return (
          <label key={column.name} className="form-field">
            <span>{column.name}:</span>
            <input
              type="text"
              value={value}
              onChange={(e) => handleInputChange(column.name, e.target.value)}
            />
          </label>
        );
    }
  };

  const formatCellValue = (value, column) => {
    if (value === null || value === undefined) return 'null';
    if (column.type === 'boolean') return value.toString();
    if (column.type === 'datetime' && value) {
      return new Date(value).toLocaleString();
    }
    return value.toString();
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
                resetForm();
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

        <button
          onClick={() => {
            resetForm();
            setShowForm(true);
          }}
          className="add-btn"
        >
          Add New Record
        </button>
      </div>

      {showForm && (
        <div className="record-form">
          <h3>{editingRecord ? 'Edit Record' : 'Add New Record'}</h3>
          <form onSubmit={handleSubmit}>
            <div className="form-fields">
              {tableData?.columns?.map(column => renderFormField(column))}
            </div>
            <div className="form-actions">
              <button type="submit" disabled={createMutation.isLoading || updateMutation.isLoading}>
                {editingRecord ? 'Update' : 'Create'}
              </button>
              <button type="button" onClick={resetForm}>
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      <div className="table-container">
        {tableData?.data && (
          <table className="admin-table">
            <thead>
              <tr>
                {tableData.columns.map(column => (
                  <th key={column.name}>{column.name}</th>
                ))}
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {tableData.data.map((record) => (
                <tr key={record.id}>
                  {tableData.columns.map(column => (
                    <td key={column.name}>
                      {formatCellValue(record[column.name], column)}
                    </td>
                  ))}
                  <td className="actions">
                    <button 
                      onClick={() => handleEdit(record)}
                      className="edit-btn"
                    >
                      Edit
                    </button>
                    <button 
                      onClick={() => handleDelete(record.id)}
                      className="delete-btn"
                      disabled={deleteMutation.isLoading}
                    >
                      Delete
                    </button>
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