import axios from 'axios';
import toast from 'react-hot-toast';

const rawBase = import.meta.env.VITE_API_URL;
const baseURL = rawBase?.replace(/\/+$/, '') || '/api';

if (import.meta.env.PROD && !import.meta.env.VITE_API_URL) {
  console.warn(
    '[api] VITE_API_URL is not set — requests use same-origin /api. Set VITE_API_URL to your Render API (e.g. https://your-api.onrender.com/api) in Vercel env before build.'
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
