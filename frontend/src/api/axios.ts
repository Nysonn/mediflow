import axios from 'axios';
import { store } from '../store';
import { addNotification } from '../store/slices/notificationSlice';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8081';

const apiClient = axios.create({
  baseURL: `${API_BASE_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Token getter — set by ClerkTokenSetter component on mount
let getTokenFn: (() => Promise<string | null>) | null = null;

export const setTokenGetter = (fn: () => Promise<string | null>) => {
  getTokenFn = fn;
};

// Request interceptor — attach Clerk Bearer token
apiClient.interceptors.request.use(async (config) => {
  try {
    if (getTokenFn) {
      const token = await getTokenFn();
      if (token) {
        config.headers.Authorization = `Bearer ${token}`;
      }
    }
  } catch (error) {
    console.error('Failed to get auth token:', error);
  }
  return config;
});

// Response interceptor
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    const status = error.response?.status;
    if (status === 401) {
      window.location.href = '/login';
    } else if (status === 403) {
      window.location.href = '/403';
    } else if (status === 500) {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      store.dispatch(addNotification({
        id,
        type: 'error',
        message: 'A server error occurred. Please try again.',
      }));
    }
    return Promise.reject(error);
  }
);

export default apiClient;
