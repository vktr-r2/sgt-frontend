import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:8080';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests if available
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('authToken');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle auth errors — only force-logout when the token is expired or missing,
// not on every 401 (e.g. permission errors on specific endpoints).
api.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      const expiresAt = localStorage.getItem('tokenExpiresAt');
      const isExpiredOrMissing = !expiresAt || Date.now() >= parseInt(expiresAt, 10);
      if (isExpiredOrMissing) {
        localStorage.removeItem('authToken');
        localStorage.removeItem('tokenExpiresAt');
        localStorage.removeItem('user');
        window.location.href = '/login';
      }
    }
    return Promise.reject(error);
  }
);

export default api;