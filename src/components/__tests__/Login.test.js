import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import Login from '../Login';
import { authService } from '../../services/auth';
import { __mockNavigate as mockNavigate } from '../../__mocks__/react-router-dom';

// Mock dependencies
jest.mock('../../services/auth');
jest.mock('react-router-dom');

describe('Login Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders login form with email and password inputs', () => {
      render(<Login />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
      expect(screen.getByLabelText(/password/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      render(<Login />);

      expect(screen.getByRole('button', { name: /login/i })).toBeInTheDocument();
    });

    test('renders heading', () => {
      render(<Login />);

      expect(screen.getByText(/Login to Spreadsheet Golf Tour/i)).toBeInTheDocument();
    });

    test('renders subtitle text', () => {
      render(<Login />);

      expect(screen.getByText(/Enter your credentials to access the tournament/i)).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('updates email input value on change', async () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    test('updates password input value on change', async () => {
      render(<Login />);

      const passwordInput = screen.getByLabelText(/password/i);
      await userEvent.type(passwordInput, 'password123');
      expect(passwordInput).toHaveValue('password123');
    });

    test('disables inputs when loading is true', async () => {
      authService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      // Inputs should be disabled during submission
      await waitFor(() => {
        expect(emailInput).toBeDisabled();
        expect(passwordInput).toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls authService.login with correct credentials on submit', async () => {
      authService.login.mockResolvedValue({});

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      expect(authService.login).toHaveBeenCalledWith('test@example.com', 'password123');
    });

    test('navigates to "/" on successful login', async () => {
      authService.login.mockResolvedValue({});

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/');
      });
    });

    test('displays error message on failed login', async () => {
      authService.login.mockRejectedValue({
        response: {
          data: {
            error: 'Invalid credentials'
          }
        }
      });

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrongpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      authService.login.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'password123');
      await userEvent.click(submitButton);

      // Button text should change during loading
      await waitFor(() => {
        expect(screen.getByText(/logging in/i)).toBeInTheDocument();
      });
    });

    test('clears error message on new submission attempt', async () => {
      authService.login.mockRejectedValueOnce({
        response: {
          data: {
            error: 'Invalid credentials'
          }
        }
      }).mockResolvedValueOnce({});

      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);
      const submitButton = screen.getByRole('button', { name: /login/i });

      // First attempt - fail
      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.type(passwordInput, 'wrong');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText('Invalid credentials')).toBeInTheDocument();
      });

      // Second attempt - error should clear
      await userEvent.clear(passwordInput);
      await userEvent.type(passwordInput, 'correct');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.queryByText('Invalid credentials')).not.toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('labels are associated with inputs', () => {
      render(<Login />);

      const emailInput = screen.getByLabelText(/email/i);
      const passwordInput = screen.getByLabelText(/password/i);

      expect(emailInput).toHaveAttribute('id');
      expect(passwordInput).toHaveAttribute('id');
    });
  });
});
