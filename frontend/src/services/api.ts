import axios from 'axios';
import toast from '@/utils/toastWrapper';
import { showLoading, hideLoading } from '@/services/loading';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: false,
});

// Request interceptor to add JWT and fix Content-Type for FormData
api.interceptors.request.use((config) => {
  showLoading();
  const token = sessionStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // When sending FormData, delete the default 'Content-Type: application/json' header.
  // The browser/XHR will then auto-set 'multipart/form-data; boundary=...' which multer requires.
  // Without this, the default JSON header overrides it and the boundary is missing.
  if (config.data instanceof FormData) {
    delete config.headers['Content-Type'];
  }
  return config;
});

// Response interceptor for global error handling
api.interceptors.response.use(
  async (response) => {
    hideLoading();
    return response.data;
  },
  async (error) => {
    hideLoading();
    const originalRequest = error.config;
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      try {
        // Attempt refresh token flow (cookie-based)
        const refreshResponse: any = await axios.post(`${API_URL}/auth/refresh`, null, { withCredentials: true });
        if (refreshResponse?.data?.accessToken) {
          const newAccess = refreshResponse.data.accessToken;
          sessionStorage.setItem('token', newAccess);
          // update authorization header and retry original request
          originalRequest.headers['Authorization'] = `Bearer ${newAccess}`;
          showLoading();
          return axios(originalRequest);
        }
      } catch (refreshErr) {
        // fall through to logout
      }
      // If refresh failed, clear client state and redirect
      sessionStorage.removeItem('token');
      sessionStorage.removeItem('user');
      if (window.location.pathname !== '/auth/login') {
        window.location.href = '/auth/login';
      }
    }

    // Generic error reporting for non-auth errors
    const errData = error.response?.data;
    const message = errData?.message || errData?.error || error.message || 'An unexpected error occurred';
    // show a toast for server errors (4xx/5xx)
    if (error.response?.status >= 400) {
      try { toast.error(message); } catch (e) { /* noop */ }
    }

    return Promise.reject(errData || { message });
  }
);

export default api;
