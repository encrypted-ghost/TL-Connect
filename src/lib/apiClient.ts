import axios from 'axios';

/**
 * Standardized API Client for TL Connect
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject token from cookie/localStorage if available
apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('tl_connect_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or invalid. Redirecting to auth.');
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);
