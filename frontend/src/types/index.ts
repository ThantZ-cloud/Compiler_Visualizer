export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  length: number;
}

export interface CfgNode {
  id: number;
  label: string;
  type?: string;
  statements: string[];
}

export interface CfgEdge {
  from: number;
  to: number;
  label: string;
}

export interface CfgMethod {
  name: string;
  declaringType: string;
  returnType: string;
  kind: string;
  parameters: string[];
  blocks: CfgNode[];
  edges: CfgEdge[];
}

export interface CfgData {
  methods: CfgMethod[];
}

export interface CompileResponse {
  tokens: Token[];
  astJson: string;
  symbolTableJson: string;
  tacJson: string;
  cfgJson: string;
  bytecode: string;
  executionOutput: string;
  error?: string;
  compilationTimeMs: number;
  classes?: ClassInfo[];
  allBytecode?: Record<string, string>;
}

export interface ClassInfo {
  name: string;
  hasMain: boolean;
  isPublic: boolean;
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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export type CompilationPhase = 'lexical' | 'tokens' | 'ast' | 'semantic' | 'tac' | 'bytecode' | 'cfg' | 'execution';
