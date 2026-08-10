import React, { createContext, useContext, useState, useCallback, useRef, useMemo, type ReactNode } from 'react';
import { useTranslation } from 'react-i18next';
import { compileAPI, codeAPI } from '../services/api';
import type { CompileResponse } from '../types';
import ConfirmDialog from '../components/ConfirmDialog';

interface CompileContextType {
  code: string;
  setCode: (code: string) => void;
  result: CompileResponse | null;
  loading: boolean;
  error: string | null;
  stdinInput: string;
  setStdinInput: (input: string) => void;
  selectedClass: string | null;
  setSelectedClass: (name: string | null) => void;
  handleCompile: () => Promise<void>;
  handleCancel: () => void;
  currentFileId: number | null;
  currentFileName: string;
  setCurrentFileName: (name: string) => void;
  isDirty: boolean;
  saveFile: (title: string, codeOverride?: string) => Promise<number>;
  loadFile: (id: number) => Promise<void>;
  newFile: () => void;
  /** Whether the "discard unsaved changes" dialog is currently open. */
  discardDialogOpen: boolean;
  /** Show the discard confirmation dialog and run `action` if confirmed. */
  showDiscardDialog: (action: () => void) => void;
  /** User confirmed discarding — close dialog and run the pending action. */
  confirmDiscardAction: () => void;
  /** User cancelled — close dialog without taking action. */
  cancelDiscardAction: () => void;
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

function buildStarterCode(title: string): string {
  const raw = title.replace(/\.java$/i, '');
  const className = (raw.charAt(0).toUpperCase() + raw.slice(1)).replace(/[^a-zA-Z0-9_]/g, '') || 'Main';
  return `public class ${className} {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`;
}

export const CompileProvider: React.FC<CompileProviderProps> = ({ children }) => {
  const { t } = useTranslation();
  const [code, setCodeState] = useState<string>(DEFAULT_CODE);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [stdinInput, setStdinInput] = useState<string>('');
  const [selectedClass, setSelectedClass] = useState<string | null>(null);
  const [currentFileId, setCurrentFileId] = useState<number | null>(null);
  const [currentFileName, setCurrentFileName] = useState<string>('Main.java');
  const [isDirty, setIsDirty] = useState(false);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSavedCodeRef = useRef<string>(DEFAULT_CODE);

  // ── Discard confirmation dialog state ──
  const [discardDialogOpen, setDiscardDialogOpen] = useState(false);
  const pendingDiscardActionRef = useRef<(() => void) | null>(null);

  const showDiscardDialog = useCallback((action: () => void) => {
    pendingDiscardActionRef.current = action;
    setDiscardDialogOpen(true);
  }, []);

  const confirmDiscardAction = useCallback(() => {
    setDiscardDialogOpen(false);
    if (pendingDiscardActionRef.current) {
      pendingDiscardActionRef.current();
      pendingDiscardActionRef.current = null;
    }
  }, []);

  const cancelDiscardAction = useCallback(() => {
    setDiscardDialogOpen(false);
    pendingDiscardActionRef.current = null;
  }, []);

  // Track dirty state: compare current code to last saved code
  const setCode = useCallback((newCode: string) => {
    setCodeState(newCode);
    setIsDirty(newCode !== lastSavedCodeRef.current);
  }, []);

  // Check if there are unsaved changes — synchronous guard for simple cases.
  // For async dialog flow, use showDiscardDialog() instead.
  const handleCompile = useCallback(async () => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await compileAPI.compile(code, stdinInput, controller.signal, selectedClass ?? undefined);
      setResult(response.data);
      // Auto-select first class if none selected
      if (response.data.classes?.length && !selectedClass) {
        setSelectedClass(response.data.classes[0].name);
      }
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        return;
      }
      setError(err.response?.data?.message || 'Compilation failed');
    } finally {
      setLoading(false);
    }
  }, [code, stdinInput, selectedClass]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const saveFile = useCallback(async (title: string, codeOverride?: string): Promise<number> => {
    let codeToSave = codeOverride !== undefined ? codeOverride : code;
    if (!codeToSave.trim()) {
      codeToSave = buildStarterCode(title);
    }
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
      setCodeState(codeToSave);
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

  const value = useMemo(() => ({
    code, setCode,
    result,
    loading,
    error,
    stdinInput, setStdinInput,
    selectedClass, setSelectedClass,
    handleCompile, handleCancel,
    currentFileId, currentFileName, setCurrentFileName,
    isDirty, saveFile, loadFile, newFile,
    discardDialogOpen, showDiscardDialog, confirmDiscardAction, cancelDiscardAction,
  }), [code, setCode, result, loading, error, stdinInput, selectedClass,
      handleCompile, handleCancel, currentFileId, currentFileName, setCurrentFileName,
      isDirty, saveFile, loadFile, newFile,
      discardDialogOpen, showDiscardDialog, confirmDiscardAction, cancelDiscardAction]);

  return (
    <CompileContext.Provider value={value}>
      {children}

      {/* Global discard-unsaved-changes confirmation dialog */}
      <ConfirmDialog
        isOpen={discardDialogOpen}
        title={t('editor.unsavedChangesTitle')}
        message={t('editor.unsavedChangesMessage')}
        confirmText={t('editor.discard')}
        cancelText={t('editor.keepEditing')}
        onConfirm={confirmDiscardAction}
        onCancel={cancelDiscardAction}
        danger
      />
    </CompileContext.Provider>
  );
};
