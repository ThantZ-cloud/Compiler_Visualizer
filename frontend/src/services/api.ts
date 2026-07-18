import axios from 'axios';

const API_BASE_URL = 'http://localhost:8080/api';

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
  register: (data: { username: string; email: string; password: string }) =>
    api.post('/auth/register', data),
  login: (data: { username: string; password: string }) =>
    api.post('/auth/login', data),
  getMe: () => api.get('/auth/me'),
};

// Compile API
export const compileAPI = {
  compile: (sourceCode: string, input?: string, signal?: AbortSignal) =>
    api.post('/compile', { sourceCode, input }, { signal }),
  compileTokens: (sourceCode: string, signal?: AbortSignal) =>
    api.post('/compile/tokens', { sourceCode }, { signal }),
  compileAst: (sourceCode: string, signal?: AbortSignal) =>
    api.post('/compile/ast', { sourceCode }, { signal }),
  compileSemantic: (sourceCode: string, signal?: AbortSignal) =>
    api.post('/compile/semantic', { sourceCode }, { signal }),
  compileBytecode: (sourceCode: string, signal?: AbortSignal) =>
    api.post('/compile/bytecode', { sourceCode }, { signal }),
};

// Execute API
export const executeAPI = {
  execute: (sourceCode: string) =>
    api.post('/execute', { sourceCode }),
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
