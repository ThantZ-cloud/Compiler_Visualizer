import axios from 'axios';

const configuredApiUrl = import.meta.env.VITE_API_URL?.trim();
const productionApiUrl = 'https://compiler-visualizer-api.onrender.com/api';
const isLocalApiUrl = !configuredApiUrl || /^(https?:\/\/)?(localhost|127\.0\.0\.1)(:\d+)?(\/|$)/i.test(configuredApiUrl);

// Vercel builds can be created without VITE_API_URL, and an accidentally
// inherited localhost value would make the deployed browser call itself.
// Keep local development on port 8080 while always using Render in production.
const API_BASE_URL = import.meta.env.PROD && isLocalApiUrl
  ? productionApiUrl
  : configuredApiUrl ?? 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Add auth token to requests
api.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Auth API
export const authAPI = {
  register: (data: { email: string; username: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { email: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Compile API
export const compileAPI = {
  compile: (sourceCode: string, input?: string, signal?: AbortSignal, entryClassName?: string) =>
    api.post('/compile', { sourceCode, input, entryClassName }, { signal }),
};

// Code Management API
export const codeAPI = {
  save: (title: string, sourceCode: string) =>
    api.post('/code', { title, sourceCode }),
  getSaved: () => api.get('/code/saved'),
  getById: (id: number) => api.get(`/code/${id}`),
  update: (id: number, title: string, sourceCode: string) =>
    api.put(`/code/${id}`, { title, sourceCode }),
  delete: (id: number) => api.delete(`/code/${id}`),
};

export default api;
