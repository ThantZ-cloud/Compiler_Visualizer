// ── Lexer types for NFA/DFA visualization ──

/** A single state in an NFA */
export interface NFAState {
  id: number;
  label: string;
  isStart: boolean;
  isAccept: boolean;
  acceptType?: string; // token group name if accept state
}

/** A transition between NFA states */
export interface NFATransition {
  from: number;
  to: number;
  /** The input symbol. '' = epsilon transition */
  symbol: string;
}

/** Full NFA representation */
export interface NFA {
  states: NFAState[];
  transitions: NFATransition[];
  startState: number;
}

/** A single state in a DFA */
export interface DFAState {
  id: number;
  label: string;
  /** Set of NFA state IDs this DFA state was built from */
  nfaStates: number[];
  isStart: boolean;
  isAccept: boolean;
  acceptType?: string;
}

/** A transition between DFA states */
export interface DFATransition {
  from: number;
  to: number;
  /** The input symbol class (e.g., 'a-z', '0-9') */
  symbol: string;
}

/** Full DFA representation */
export interface DFA {
  states: DFAState[];
  transitions: DFATransition[];
  startState: number;
}

/** A token group with its regex pattern */
export interface TokenGroup {
  name: string;
  /** Human-readable regex pattern for display */
  regexPattern: string;
  /** Color for visualization (hex) */
  color: string;
  /** Whether this group was found in the user's code */
  found: boolean;
  /** Count of tokens in this group */
  count: number;
}

/** A step in the subset construction process */
export interface SubsetConstructionStep {
  dfaStateId: number;
  nfaSubset: number[];
  inputSymbol: string;
  resultingNFAStates: number[];
  isNewState: boolean;
  description: string;
}

/** A step in the scanner simulation */
export interface ScannerStep {
  position: number; // character position in source
  char: string; // current character
  dfaStateId: number;
  dfaStateLabel: string;
  isAccept: boolean;
  emittedToken?: {
    type: string;
    value: string;
    line: number;
    column: number;
  };
  description: string;
}

/** Play state for the animation */
export type PlayState = 'idle' | 'playing' | 'paused' | 'completed';

/** Which step in the pipeline */
export type PipelineStep = 0 | 1 | 2 | 3;
