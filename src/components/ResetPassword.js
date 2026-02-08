import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authService } from '../services/auth';

function ResetPassword() {
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const [password, setPassword] = useState('');
  const [passwordConfirmation, setPasswordConfirmation] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const token = searchParams.get('token');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Client-side validation
    if (password !== passwordConfirmation) {
      setError('Passwords do not match');
      return;
    }

    setLoading(true);

    try {
      await authService.resetPassword(token, password, passwordConfirmation);
      setSuccess(true);
      // Redirect to login after short delay
      setTimeout(() => {
        navigate('/login', { state: { message: 'Password reset successfully. Please log in with your new password.' } });
      }, 2000);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to reset password');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-clubhouse-cream to-clubhouse-beige flex items-center justify-center p-6 animate-fade-in">
        <div className="w-full max-w-md bg-white rounded-xl shadow-elevated p-8 space-y-6 text-center">
          <div className="w-16 h-16 bg-augusta-green-100 rounded-full flex items-center justify-center mx-auto">
            <svg className="w-8 h-8 text-augusta-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <h2 className="font-display text-headline text-clubhouse-mahogany">
            Password Reset Successfully
          </h2>
          <p className="font-sans text-sm text-clubhouse-brown">
            Redirecting you to login...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-clubhouse-cream to-clubhouse-beige flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-elevated p-8 space-y-6">
        <div className="text-center">
          <h2 className="font-display text-headline text-clubhouse-mahogany mb-2">
            Reset Your Password
          </h2>
          <p className="font-sans text-sm text-clubhouse-brown">
            Enter your new password below
          </p>
        </div>

        {error && (
          <div className="bg-red-50 border-l-4 border-error-red px-4 py-3 rounded text-sm text-error-red">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <label
              htmlFor="password"
              className="block font-sans text-sm font-medium text-clubhouse-brown"
            >
              New Password:
            </label>
            <input
              type="password"
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full px-4 py-3 font-sans border-2 border-clubhouse-beige rounded-lg
                         focus:border-augusta-green-600 focus:ring-4 focus:ring-augusta-green-100
                         transition-all duration-200 outline-none
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <div className="space-y-2">
            <label
              htmlFor="passwordConfirmation"
              className="block font-sans text-sm font-medium text-clubhouse-brown"
            >
              Confirm Password:
            </label>
            <input
              type="password"
              id="passwordConfirmation"
              value={passwordConfirmation}
              onChange={(e) => setPasswordConfirmation(e.target.value)}
              required
              disabled={loading}
              minLength={6}
              className="w-full px-4 py-3 font-sans border-2 border-clubhouse-beige rounded-lg
                         focus:border-augusta-green-600 focus:ring-4 focus:ring-augusta-green-100
                         transition-all duration-200 outline-none
                         disabled:bg-gray-50 disabled:cursor-not-allowed"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-augusta-green-600 hover:bg-augusta-green-700
                       text-white font-sans font-medium py-3 px-6 rounded-lg
                       transition-all duration-200 shadow-md hover:shadow-lg
                       disabled:bg-gray-300 disabled:cursor-not-allowed
                       focus:outline-none focus:ring-4 focus:ring-augusta-green-200"
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                Resetting...
              </span>
            ) : 'Reset Password'}
          </button>
        </form>

        <div className="text-center">
          <Link
            to="/login"
            className="text-augusta-green-600 hover:text-augusta-green-700 font-sans font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    </div>
  );
}

export default ResetPassword;
