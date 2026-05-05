import axios from 'axios';
import toast from 'react-hot-toast';

/**
 * Backend origin from env (no trailing slash). Examples:
 * - Production: https://your-service.up.railway.app
 * - Or already: https://your-service.up.railway.app/api
 * Leave empty in local dev to use Vite proxy → baseURL `/api`.
 */
export const API = (import.meta.env.VITE_API_URL ?? '').trim();

function resolveAxiosBaseURL() {
  if (!API) {
    return '/api';
  }
  let base = API.replace(/\/+$/, '');
  if (!base.endsWith('/api')) {
    base = `${base}/api`;
  }
  return base;
}

const baseURL = resolveAxiosBaseURL();

if (import.meta.env.PROD && !API) {
  console.warn(
    '[api] VITE_API_URL is not set — requests use same-origin /api. Set VITE_API_URL to your Railway URL (e.g. https://xxx.up.railway.app) in Vercel env.'
  );
}

const api = axios.create({
  baseURL,
  headers: { 'Content-Type': 'application/json' },
  withCredentials: false,
});

api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (err) => {
    const status = err.response?.status;
    const message = err.response?.data?.message;
    if (status === 401 && typeof window !== 'undefined') {
      const path = window.location.pathname || '';
      const onAuthPage = path.includes('/login') || path.includes('/register');
      if (!onAuthPage && message && String(message).toLowerCase().includes('session expired')) {
        localStorage.removeItem('token');
        toast.error('Session expired — please sign in again');
      }
    }
    return Promise.reject(err);
  }
);

export default api;
