import axios from 'axios';
import { supabase } from './supabase';

/**
 * Standardized API Client for TL Connect
 */
export const apiClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
});

// Auto-inject token from Supabase if available
apiClient.interceptors.request.use(async (config) => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    if (session?.access_token) {
      config.headers.set('Authorization', `Bearer ${session.access_token}`);
    }
  } catch (e) {
    console.error('Error fetching session for API client', e);
  }
  return config;
});

// Handle global errors (e.g., 401 Unauthorized)
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      console.warn('Session expired or invalid. Redirecting to auth.');
    }
    
    if (!error.response) {
      console.error('API Network Error: The server might be down or unreachable.', {
        message: error.message,
        baseURL: apiClient.defaults.baseURL,
        configUrl: error.config?.url,
        origin: typeof window !== 'undefined' ? window.location.origin : 'server'
      });
    }

    return Promise.reject(error);
  }
);
