import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { compileAPI } from '../services/api';
import type { CompileResponse } from '../types';

interface CompileContextType {
  code: string;
  setCode: (code: string) => void;
  result: CompileResponse | null;
  loading: boolean;
  error: string | null;
  stdinInput: string;
  setStdinInput: (input: string) => void;
  handleCompile: () => Promise<void>;
  handleCancel: () => void;
}

const CompileContext = createContext<CompileContextType | undefined>(undefined);

export const useCompile = () => {
  const context = useContext(CompileContext);
  if (!context) {
    throw new Error('useCompile must be used within a CompileProvider');
  }
  return context;
};

interface CompileProviderProps {
  children: ReactNode;
}

export const CompileProvider: React.FC<CompileProviderProps> = ({ children }) => {
  const [code, setCode] = useState<string>(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCompile = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await compileAPI.compile(code, stdinInput, controller.signal);
      setResult(response.data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      setError(err.response?.data?.message || 'Compilation failed');
    } finally {
      setLoading(false);
    }
  }, [code, stdinInput]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  return (
    <CompileContext.Provider value={{
      code, setCode,
      result,
      loading,
      error,
      stdinInput, setStdinInput,
      handleCompile, handleCancel,
    }}>
      {children}
    </CompileContext.Provider>
  );
};
