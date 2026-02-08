import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { authService } from '../services/auth';

function ForgotPassword() {
  const [email, setEmail] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');

    try {
      await authService.requestPasswordReset(email);
      setSuccess(true);
    } catch (err) {
      setError(err.response?.data?.error || 'Something went wrong');
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
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
            </svg>
          </div>
          <h2 className="font-display text-headline text-clubhouse-mahogany">
            Check Your Email
          </h2>
          <p className="font-sans text-sm text-clubhouse-brown">
            If an account exists with that email, you will receive password reset instructions shortly.
          </p>
          <Link
            to="/login"
            className="inline-block text-augusta-green-600 hover:text-augusta-green-700 font-sans font-medium transition-colors"
          >
            Back to Login
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-clubhouse-cream to-clubhouse-beige flex items-center justify-center p-6 animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-xl shadow-elevated p-8 space-y-6">
        <div className="text-center">
          <h2 className="font-display text-headline text-clubhouse-mahogany mb-2">
            Forgot Password?
          </h2>
          <p className="font-sans text-sm text-clubhouse-brown">
            Enter your email and we'll send you a link to reset your password
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
              htmlFor="email"
              className="block font-sans text-sm font-medium text-clubhouse-brown"
            >
              Email:
            </label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              disabled={loading}
              placeholder="your.email@example.com"
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
                Sending...
              </span>
            ) : 'Send Reset Link'}
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

export default ForgotPassword;
