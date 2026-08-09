import type { Token } from '../../types';

// ── Parser types for syntax analysis visualization ──

/** A production rule of the Java context-free grammar (CFG) */
export interface GrammarRule {
  id: string;
  /** Left-hand side non-terminal (e.g. "ClassDecl") */
  lhs: string;
  /** Right-hand side symbol sequence */
  rhs: string[];
  description?: string;
}

/** An item sitting on the parse stack */
export interface StackItem {
  id: number;
  /** Symbol text (terminal value or non-terminal name) */
  symbol: string;
  kind: 'terminal' | 'nonterminal';
  /** Source token when this item is a shifted terminal */
  token?: Token;
  /** AST node id when this item is a reduced non-terminal */
  nodeId?: number;
}

export type ParseActionType = 'SHIFT' | 'REDUCE' | 'ACCEPT';

export interface ParseAction {
  type: ParseActionType;
  /** Terminal shifted into the stack */
  token?: Token;
  /** Production applied while reducing */
  rule?: GrammarRule;
  /** Human-readable description for the action log */
  detail: string;
}

/** One tick of the shift-reduce parser simulation */
export interface ParseStep {
  index: number;
  action: ParseAction;
  /** Parse stack after performing the action */
  stack: StackItem[];
  /** Tokens still waiting in the input buffer */
  inputRemaining: Token[];
  /** Grammar rule ids used so far (for highlighting) */
  usedRules: string[];
  /** High-level PDA stage reached at this step */
  stage: string;
}

/** A node of the Pushdown Automaton (PDA) diagram */
export interface PdaStateNode {
  id: string;
  label: string;
  description: string;
  x: number;
  y: number;
  isStart?: boolean;
  isAccept?: boolean;
}

export interface PdaTransition {
  from: string;
  to: string;
  label: string;
}

/** Stage names a parse can be in (PDA highlights) */
export type ParseStage =
  | 'start'
  | 'header'
  | 'body'
  | 'statement'
  | 'accept';

/** Which of the four pipeline steps is active */
export type ParserStep = 0 | 1 | 2 | 3;

export type PlayState = 'idle' | 'playing' | 'paused' | 'completed';