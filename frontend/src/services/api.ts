import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8080/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Compile API — stateless, no auth header needed
export const compileAPI = {
  compile: (sourceCode: string, input?: string, signal?: AbortSignal, entryClassName?: string) =>
    api.post('/compile', { sourceCode, input, entryClassName }, { signal }),
};

export default api;
