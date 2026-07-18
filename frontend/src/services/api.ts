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
  save: (title: string, sourceCode: string, folderId?: number) =>
    api.post('/code', { title, sourceCode, folderId }),
  getSaved: (folderId?: number) =>
    folderId ? api.get(`/code/saved?folderId=${folderId}`) : api.get('/code/saved'),
  getById: (id: number) => api.get(`/code/${id}`),
  update: (id: number, title: string, sourceCode: string, folderId?: number) =>
    api.put(`/code/${id}`, { title, sourceCode, folderId }),
  delete: (id: number) => api.delete(`/code/${id}`),
};

// Folder API
export const folderAPI = {
  create: (name: string, parentId?: number) => api.post('/folders', { name, parentId }),
  list: () => api.get('/folders'),
  rename: (id: number, name: string) => api.put(`/folders/${id}`, { name }),
  delete: (id: number) => api.delete(`/folders/${id}`),
};

export default api;
