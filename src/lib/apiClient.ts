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
      config.headers.Authorization = `Bearer ${session.access_token}`;
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
      // window.location.href = '/login'; 
    }
    return Promise.reject(error);
  }
);
