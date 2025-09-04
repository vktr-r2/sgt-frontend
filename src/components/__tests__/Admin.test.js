import React from 'react';
import { render, screen, waitFor, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { BrowserRouter } from 'react-router-dom';
import '@testing-library/jest-dom';

import Admin from '../Admin';
import { adminService } from '../../services/admin';
import { authService } from '../../services/auth';

// Mock services
jest.mock('../../services/admin');
jest.mock('../../services/auth');
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  useNavigate: () => jest.fn(),
}));

const renderAdmin = (user = { admin: true, name: 'Admin User' }) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });

  authService.getCurrentUser.mockReturnValue(user);

  return render(
    <QueryClientProvider client={queryClient}>
      <BrowserRouter>
        <Admin />
      </BrowserRouter>
    </QueryClientProvider>
  );
};

const mockTableData = {
  data: [
    { id: 1, name: 'John Doe', email: 'john@example.com', admin: false },
    { id: 2, name: 'Jane Admin', email: 'jane@example.com', admin: true },
  ],
  columns: [
    { name: 'id', type: 'integer', null: false },
    { name: 'name', type: 'string', null: false },
    { name: 'email', type: 'string', null: false },
    { name: 'admin', type: 'boolean', null: false },
    { name: 'created_at', type: 'datetime', null: false },
    { name: 'updated_at', type: 'datetime', null: false },
  ],
  table_name: 'users',
};

describe('Admin Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    adminService.getTableData.mockResolvedValue(mockTableData);
  });

  describe('Authentication and Authorization', () => {
    it('redirects non-admin users', () => {
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
      
      renderAdmin({ admin: false, name: 'Regular User' });
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });

    it('renders admin interface for admin users', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Admin Dashboard')).toBeInTheDocument();
      });
    });
  });

  describe('Table Selection', () => {
    it('renders table selector with all available tables', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const select = screen.getByLabelText(/select table/i);
        expect(select).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/select table/i);
      const options = select.querySelectorAll('option');
      
      expect(options).toHaveLength(6);
      expect(options[0]).toHaveTextContent('Users');
      expect(options[1]).toHaveTextContent('Golfers');
      expect(options[2]).toHaveTextContent('Tournaments');
      expect(options[3]).toHaveTextContent('Match Picks');
      expect(options[4]).toHaveTextContent('Match Results');
      expect(options[5]).toHaveTextContent('Scores');
    });

    it('loads table data when table is selected', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(adminService.getTableData).toHaveBeenCalledWith('users');
      });
    });

    it('switches table data when different table is selected', async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByLabelText(/select table/i)).toBeInTheDocument();
      });

      const select = screen.getByLabelText(/select table/i);
      await user.selectOptions(select, 'golfers');
      
      expect(adminService.getTableData).toHaveBeenCalledWith('golfers');
    });
  });

  describe('Table Display', () => {
    it('displays table data correctly', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('John Doe')).toBeInTheDocument();
        expect(screen.getByText('jane@example.com')).toBeInTheDocument();
      });
    });

    it('displays column headers', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('name')).toBeInTheDocument();
        expect(screen.getByText('email')).toBeInTheDocument();
        expect(screen.getByText('admin')).toBeInTheDocument();
      });
    });

    it('displays action buttons for each record', async () => {
      renderAdmin();
      
      await waitFor(() => {
        const editButtons = screen.getAllByText('Edit');
        const deleteButtons = screen.getAllByText('Delete');
        
        expect(editButtons).toHaveLength(2);
        expect(deleteButtons).toHaveLength(2);
      });
    });
  });

  describe('Add New Record', () => {
    it('shows add new record button', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Record')).toBeInTheDocument();
      });
    });

    it('opens form when add new record is clicked', async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Record')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New Record'));
      
      expect(screen.getByText('Add New Record')).toBeInTheDocument();
      expect(screen.getByText('Create')).toBeInTheDocument();
      expect(screen.getByText('Cancel')).toBeInTheDocument();
    });

    it('renders form fields based on table columns', async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Record')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New Record'));
      
      // Should not render id, created_at, updated_at fields
      expect(screen.queryByLabelText(/^id:/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/created_at:/)).not.toBeInTheDocument();
      expect(screen.queryByLabelText(/updated_at:/)).not.toBeInTheDocument();
      
      // Should render editable fields
      expect(screen.getByLabelText(/name:/)).toBeInTheDocument();
      expect(screen.getByLabelText(/email:/)).toBeInTheDocument();
    });
  });

  describe('Edit Record', () => {
    it('opens edit form when edit button is clicked', async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Edit')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Edit')[0]);
      
      expect(screen.getByText('Edit Record')).toBeInTheDocument();
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });

    it('pre-fills form with existing record data', async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Edit')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Edit')[0]);
      
      expect(screen.getByDisplayValue('John Doe')).toBeInTheDocument();
      expect(screen.getByDisplayValue('john@example.com')).toBeInTheDocument();
    });
  });

  describe('Delete Record', () => {
    it('shows confirmation dialog when delete is clicked', async () => {
      const user = userEvent.setup();
      
      // Mock window.confirm
      const mockConfirm = jest.fn();
      window.confirm = mockConfirm;
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Delete')[0]);
      
      expect(mockConfirm).toHaveBeenCalledWith('Are you sure you want to delete this record?');
    });

    it('calls delete service when confirmed', async () => {
      const user = userEvent.setup();
      
      window.confirm = jest.fn(() => true);
      adminService.deleteRecord.mockResolvedValue({ message: 'Record deleted successfully' });
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Delete')[0]);
      
      expect(adminService.deleteRecord).toHaveBeenCalledWith('users', 1);
    });

    it('does not call delete service when cancelled', async () => {
      const user = userEvent.setup();
      
      window.confirm = jest.fn(() => false);
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Delete')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Delete')[0]);
      
      expect(adminService.deleteRecord).not.toHaveBeenCalled();
    });
  });

  describe('Form Field Types', () => {
    beforeEach(async () => {
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Record')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New Record'));
    });

    it('renders boolean fields as select dropdown', () => {
      const adminSelect = screen.getByLabelText(/admin:/);
      expect(adminSelect.tagName).toBe('SELECT');
      
      const options = adminSelect.querySelectorAll('option');
      expect(options).toHaveLength(2);
      expect(options[0]).toHaveTextContent('False');
      expect(options[1]).toHaveTextContent('True');
    });

    it('renders string fields as text input', () => {
      const nameInput = screen.getByLabelText(/name:/);
      const emailInput = screen.getByLabelText(/email:/);
      
      expect(nameInput.type).toBe('text');
      expect(emailInput.type).toBe('text');
    });
  });

  describe('Form Submission', () => {
    it('calls create service when form is submitted for new record', async () => {
      const user = userEvent.setup();
      
      adminService.createRecord.mockResolvedValue({
        record: { id: 3, name: 'New User', email: 'new@example.com' },
        message: 'Record created successfully'
      });
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Add New Record')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Add New Record'));
      
      const nameInput = screen.getByLabelText(/name:/);
      const emailInput = screen.getByLabelText(/email:/);
      
      await user.type(nameInput, 'New User');
      await user.type(emailInput, 'new@example.com');
      
      await user.click(screen.getByText('Create'));
      
      expect(adminService.createRecord).toHaveBeenCalledWith('users', {
        name: 'New User',
        email: 'new@example.com',
        admin: false,
      });
    });

    it('calls update service when form is submitted for existing record', async () => {
      const user = userEvent.setup();
      
      adminService.updateRecord.mockResolvedValue({
        record: { id: 1, name: 'Updated Name', email: 'john@example.com' },
        message: 'Record updated successfully'
      });
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getAllByText('Edit')).toHaveLength(2);
      });

      await user.click(screen.getAllByText('Edit')[0]);
      
      const nameInput = screen.getByDisplayValue('John Doe');
      await user.clear(nameInput);
      await user.type(nameInput, 'Updated Name');
      
      await user.click(screen.getByText('Update'));
      
      expect(adminService.updateRecord).toHaveBeenCalledWith('users', 1, expect.objectContaining({
        name: 'Updated Name',
      }));
    });
  });

  describe('Loading and Error States', () => {
    it('shows loading state while fetching data', () => {
      adminService.getTableData.mockReturnValue(new Promise(() => {})); // Never resolves
      
      renderAdmin();
      
      expect(screen.getByText('Loading admin data...')).toBeInTheDocument();
    });

    it('shows error state when data fetch fails', async () => {
      adminService.getTableData.mockRejectedValue(new Error('API Error'));
      
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Error loading admin data')).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    it('has back to dashboard button', async () => {
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      });
    });

    it('navigates back to dashboard when back button is clicked', async () => {
      const mockNavigate = jest.fn();
      require('react-router-dom').useNavigate.mockReturnValue(mockNavigate);
      
      const user = userEvent.setup();
      renderAdmin();
      
      await waitFor(() => {
        expect(screen.getByText('Back to Dashboard')).toBeInTheDocument();
      });

      await user.click(screen.getByText('Back to Dashboard'));
      
      expect(mockNavigate).toHaveBeenCalledWith('/');
    });
  });
});