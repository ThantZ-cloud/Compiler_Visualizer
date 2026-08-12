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

export interface TacInstruction {
  line: number;
  op: string;
  result: string | null;
  arg1: string | null;
  operator: string | null;
  arg2: string | null;
  target: string | null;
  comment: string | null;
  sourceLine: number;
}

export interface EdgeInfo {
  targetBlockId: number;
  kind: string;
  label: string | null;
}

export interface BasicBlockInfo {
  id: number;
  label: string | null;
  type: string;
  instructions: number[];
  edges: EdgeInfo[];
}

export interface CodeGenerationData {
  className: string;
  packageName: string;
  instructions: TacInstruction[];
  basicBlocks: BasicBlockInfo[];
  totalInstructions: number;
  totalBlocks: number;
  totalEdges: number;
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
  codeGenerationData?: CodeGenerationData;
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

export type CompilationPhase = 'lexical' | 'tokens' | 'ast' | 'semantic' | 'codegen' | 'tac' | 'bytecode' | 'cfg' | 'execution';

// --- Phase 4: Optimizer (CFG + SSA + Data-Flow) ---

export interface DominatorEdge {
  from: number;
  to: number;
}

export interface DominatorData {
  dominators: Record<number, number[]>;
  idom: (number | null)[];
  treeEdges: DominatorEdge[];
}

// --- Phase 5: Code Generation (scheduling + register allocation) ---

export interface ScheduleEntry {
  tacLine: number;
  cycle: number;
  unit: string;
  dependencies: number[];
}

export interface InterferenceEdge {
  from: string;
  to: string;
}

// --- Phase 6: Bytecode ---

export interface BytecodeInstruction {
  offset: number;
  opcode: string;
  operands: string;
  rawLine: string;
}
