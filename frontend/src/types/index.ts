export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  length: number;
}

export interface CompileResponse {
  tokens: Token[];
  astJson: string;
  symbolTableJson: string;
  bytecode: string;
  executionOutput: string;
  error?: string;
  compilationTimeMs: number;
}

export interface AuthResponse {
  token: string;
  tokenType: string;
  userId?: number;
  username: string;
  email?: string;
}

export interface SavedCode {
  id: number;
  title: string;
  sourceCode: string;
  folderId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface Folder {
  id: number;
  name: string;
  parentId?: number;
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export type CompilationPhase = 'tokens' | 'ast' | 'semantic' | 'bytecode' | 'execution';
