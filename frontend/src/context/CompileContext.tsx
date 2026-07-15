import React, { createContext, useContext, useState, useCallback, useRef, type ReactNode } from 'react';
import { compileAPI, codeAPI } from '../services/api';
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
  currentFileId: number | null;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  saveFile: (title: string, folderId?: number) => Promise<number>;
  loadFile: (id: number) => Promise<void>;
  updateFile: (folderId?: number) => Promise<void>;
  newFile: () => void;
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

const DEFAULT_CODE = `public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;

export const CompileProvider: React.FC<CompileProviderProps> = ({ children }) => {
  const [code, setCode] = useState<string>(DEFAULT_CODE);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('Main.java');
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

  const saveFile = useCallback(async (title: string, folderId?: number): Promise<number> => {
    if (currentFileId) {
      const response = await codeAPI.update(currentFileId, title, code, folderId);
      return response.data.id;
    } else {
      const response = await codeAPI.save(title, code, folderId);
      setCurrentFileId(response.data.id);
      setCurrentFileName(title);
      return response.data.id;
    }
  }, [currentFileId, code]);

  const loadFile = useCallback(async (id: number) => {
    const response = await codeAPI.getById(id);
    setCode(response.data.sourceCode);
    setCurrentFileId(response.data.id);
    setCurrentFileName(response.data.title);
    setResult(null);
    setError(null);
  }, []);

  const updateFile = useCallback(async (folderId?: number) => {
    if (currentFileId) {
      await codeAPI.update(currentFileId, currentFileName, code, folderId);
    }
  }, [currentFileId, currentFileName, code]);

  const newFile = useCallback(() => {
    setCode(DEFAULT_CODE);
    setCurrentFileId(null);
    setCurrentFileName('Main.java');
    setResult(null);
    setError(null);
  }, []);

  return (
    <CompileContext.Provider value={{
      code, setCode,
      result,
      loading,
      error,
      stdinInput, setStdinInput,
      handleCompile, handleCancel,
      currentFileId, currentFileName, setCurrentFileName,
      saveFile, loadFile, updateFile, newFile,
    }}>
      {children}
    </CompileContext.Provider>
  );
};
