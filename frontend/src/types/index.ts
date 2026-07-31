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
  cfgJson: string;
  cfgError?: string;
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
  createdAt: string;
  updatedAt: string;
}

export interface User {
  id: number;
  username: string;
  email: string;
}

export type CompilationPhase = 'tokens' | 'ast' | 'semantic' | 'bytecode' | 'execution';
