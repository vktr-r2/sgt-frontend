import api from './api';

export const authService = {
  login: async (email, password) => {
    const response = await api.post('/users/sign_in', {
      user: { email, password }
    });
    
    const { user, token } = response.data;
    const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000; // 2 weeks in ms
    localStorage.setItem('authToken', token);
    localStorage.setItem('tokenExpiresAt', String(expiresAt));
    localStorage.setItem('user', JSON.stringify(user));

    return { user, token };
  },

  register: async (email, password, passwordConfirmation, name) => {
    const response = await api.post('/users', {
      user: {
        email,
        password,
        password_confirmation: passwordConfirmation,
        name
      }
    });

    const { user, token } = response.data;
    const expiresAt = Date.now() + 14 * 24 * 60 * 60 * 1000;
    localStorage.setItem('authToken', token);
    localStorage.setItem('tokenExpiresAt', String(expiresAt));
    localStorage.setItem('user', JSON.stringify(user));
    
    return { user, token };
  },

  logout: async () => {
    try {
      await api.delete('/users/sign_out');
    } finally {
      localStorage.removeItem('authToken');
      localStorage.removeItem('tokenExpiresAt');
      localStorage.removeItem('user');
    }
  },

  getCurrentUser: () => {
    const userStr = localStorage.getItem('user');
    return userStr ? JSON.parse(userStr) : null;
  },

  getToken: () => {
    return localStorage.getItem('authToken');
  },

  isAuthenticated: () => {
    const token = localStorage.getItem('authToken');
    const expiresAt = localStorage.getItem('tokenExpiresAt');
    if (!token || !expiresAt) return false;
    return Date.now() < parseInt(expiresAt, 10);
  },

  resetPassword: async (token, password, passwordConfirmation) => {
    const response = await api.put('/users/password', {
      user: {
        reset_password_token: token,
        password,
        password_confirmation: passwordConfirmation
      }
    });
    return response.data;
  }
};