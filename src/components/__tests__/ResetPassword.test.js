import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import ResetPassword from '../ResetPassword';
import { authService } from '../../services/auth';
import {
  __mockNavigate as mockNavigate,
  __setMockSearchParams as setMockSearchParams
} from '../../__mocks__/react-router-dom';

// Mock dependencies
jest.mock('../../services/auth');
jest.mock('react-router-dom');

describe('ResetPassword Component', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    setMockSearchParams({ token: 'valid-reset-token' });
  });

  describe('Rendering', () => {
    test('renders password input', () => {
      render(<ResetPassword />);

      expect(screen.getByLabelText(/new password/i)).toBeInTheDocument();
    });

    test('renders password confirmation input', () => {
      render(<ResetPassword />);

      expect(screen.getByLabelText(/confirm password/i)).toBeInTheDocument();
    });

    test('renders submit button', () => {
      render(<ResetPassword />);

      expect(screen.getByRole('button', { name: /reset password/i })).toBeInTheDocument();
    });

    test('renders heading', () => {
      render(<ResetPassword />);

      expect(screen.getByText(/reset your password/i)).toBeInTheDocument();
    });
  });

  describe('Token Extraction', () => {
    test('extracts token from URL query params', async () => {
      setMockSearchParams({ token: 'my-reset-token' });
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'my-reset-token',
        'newpassword123',
        'newpassword123'
      );
    });
  });

  describe('Password Validation', () => {
    test('shows error if passwords do not match', async () => {
      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'password123');
      await userEvent.type(confirmInput, 'differentpassword');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/passwords do not match/i)).toBeInTheDocument();
      });

      expect(authService.resetPassword).not.toHaveBeenCalled();
    });
  });

  describe('Form Submission', () => {
    test('calls authService.resetPassword with correct params', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      expect(authService.resetPassword).toHaveBeenCalledWith(
        'valid-reset-token',
        'newpassword123',
        'newpassword123'
      );
    });

    test('shows success message on successful reset', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/password reset successfully/i)).toBeInTheDocument();
      });
    });

    test('shows loading state during submission', async () => {
      authService.resetPassword.mockImplementation(() => new Promise(resolve => setTimeout(resolve, 100)));

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/resetting/i)).toBeInTheDocument();
      });
    });

    test('redirects to login after successful reset', async () => {
      authService.resetPassword.mockResolvedValue({ message: 'Password reset successfully' });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(mockNavigate).toHaveBeenCalledWith('/login', expect.objectContaining({
          state: expect.objectContaining({ message: expect.any(String) })
        }));
      }, { timeout: 3000 });
    });
  });

  describe('Error Handling', () => {
    test('shows error for invalid token', async () => {
      authService.resetPassword.mockRejectedValue({
        response: {
          data: {
            error: 'Reset password token is invalid'
          }
        }
      });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/invalid/i)).toBeInTheDocument();
      });
    });

    test('shows error for expired token', async () => {
      authService.resetPassword.mockRejectedValue({
        response: {
          data: {
            error: 'Reset password token has expired'
          }
        }
      });

      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);
      const submitButton = screen.getByRole('button', { name: /reset password/i });

      await userEvent.type(passwordInput, 'newpassword123');
      await userEvent.type(confirmInput, 'newpassword123');
      await userEvent.click(submitButton);

      await waitFor(() => {
        expect(screen.getByText(/expired/i)).toBeInTheDocument();
      });
    });
  });

  describe('Accessibility', () => {
    test('password labels are associated with inputs', () => {
      render(<ResetPassword />);

      const passwordInput = screen.getByLabelText(/new password/i);
      const confirmInput = screen.getByLabelText(/confirm password/i);

      expect(passwordInput).toHaveAttribute('id');
      expect(confirmInput).toHaveAttribute('id');
    });
  });
});
