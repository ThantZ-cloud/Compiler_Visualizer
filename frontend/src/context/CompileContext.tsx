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
  setCurrentFileId: (id: number | null) => void;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  isDirty: boolean;
  saveFile: (title: string, codeOverride?: string) => Promise<number>;
  loadFile: (id: number) => Promise<void>;
  newFile: () => void;
  confirmDiscard: () => boolean;
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
  const [code, setCodeState] = useState<string>(DEFAULT_CODE);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('Main.java');
  const [isDirty, setIsDirty] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSavedCodeRef = useRef<string>(DEFAULT_CODE);

  // Track dirty state: compare current code to last saved code
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    setIsDirty(newCode !== lastSavedCodeRef.current);
  }, []);

  // Check if there are unsaved changes — show confirmation dialog
  const confirmDiscard = useCallback((): boolean => {
    if (!isDirty) return true;
    return window.confirm('You have unsaved changes. Discard them?');
  }, [isDirty]);

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

  const saveFile = useCallback(async (title: string, codeOverride?: string): Promise<number> => {
    const codeToSave = codeOverride !== undefined ? codeOverride : code;
    if (currentFileId) {
      const response = await codeAPI.update(currentFileId, title, codeToSave);
      lastSavedCodeRef.current = codeToSave;
      setIsDirty(false);
      return response.data.id ?? currentFileId;
    } else {
      const response = await codeAPI.save(title, codeToSave);
      const newId = response.data.id;
      setCurrentFileId(newId);
      setCurrentFileName(title);
      lastSavedCodeRef.current = codeToSave;
      setIsDirty(false);
      return newId;
    }
  }, [currentFileId, code]);

  const loadFile = useCallback(async (id: number) => {
    const response = await codeAPI.getById(id);
    setCodeState(response.data.sourceCode);
    lastSavedCodeRef.current = response.data.sourceCode;
    setIsDirty(false);
    setCurrentFileId(response.data.id);
    setCurrentFileName(response.data.title);
    setResult(null);
    setError(null);
  }, []);

  const newFile = useCallback(() => {
    setCodeState('');
    lastSavedCodeRef.current = '';
    setIsDirty(false);
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
      currentFileId, setCurrentFileId, currentFileName, setCurrentFileName,
      isDirty, saveFile, loadFile, newFile, confirmDiscard,
    }}>
      {children}
    </CompileContext.Provider>
  );
};
