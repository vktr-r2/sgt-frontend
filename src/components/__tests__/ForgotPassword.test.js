import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ForgotPassword from '../ForgotPassword';
import { authService } from '../../services/auth';
import { __mockNavigate as mockNavigate } from '../../__mocks__/react-router-dom';

// Mock dependencies
jest.mock('../../services/auth');
jest.mock('react-router-dom');

describe('ForgotPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('Rendering', () => {
    test('renders email input', () => {
      render(<ForgotPassword />);

      expect(screen.getByLabelText(/email/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      render(<ForgotPassword />);

      expect(screen.getByRole('button', { name: /send reset link/i })).toBeInTheDocument();
    });

    test('renders heading', () => {
      render(<ForgotPassword />);

      expect(screen.getByText(/forgot password/i)).toBeInTheDocument();
    });

    test('renders back to login link', () => {
      render(<ForgotPassword />);

      expect(screen.getByRole('link', { name: /back to login/i })).toBeInTheDocument();
    });
  });

  describe('User Interactions', () => {
    test('updates email input value on change', async () => {
      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      await userEvent.type(emailInput, 'test@example.com');
      expect(emailInput).toHaveValue('test@example.com');
    });

    test('disables input when loading', async () => {
      authService.requestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 1000)));

      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(emailInput).toBeDisabled();
      });
    });
  });

  describe('Form Submission', () => {
    test('calls authService.requestPasswordReset with email on submit', async () => {
      authService.requestPasswordReset.mockResolvedValue({ message: 'Password reset instructions sent' });

      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      expect(authService.requestPasswordReset).toHaveBeenCalledWith('test@example.com');
    });

    test('shows success message after submission', async () => {
      authService.requestPasswordReset.mockResolvedValue({ message: 'Password reset instructions sent' });

      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/check your email/i)).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      authService.requestPasswordReset.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/sending/i)).toBeInTheDocument();
      });
    });

    test('handles API errors gracefully', async () => {
      authService.requestPasswordReset.mockRejectedValue({
        response: {
          data: {
            error: 'Something went wrong'
          }
        }
      });

      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      const submitButton = screen.getByRole('button', { name: /send reset link/i });

      await userEvent.type(emailInput, 'test@example.com');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/something went wrong/i)).toBeInTheDocument();
      });
    });
  });

  describe('Navigation', () => {
    test('back to login link points to /login', () => {
      render(<ForgotPassword />);

      const backLink = screen.getByRole('link', { name: /back to login/i });
      expect(backLink).toHaveAttribute('href', '/login');
    });
  });

  describe('Accessibility', () => {
    test('email label is associated with input', () => {
      render(<ForgotPassword />);

      const emailInput = screen.getByLabelText(/email/i);
      expect(emailInput).toHaveAttribute('id');
    });
  });
});
