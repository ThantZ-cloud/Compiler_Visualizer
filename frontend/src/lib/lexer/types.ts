// ── Lexer types for NFA/DFA visualization ──

import type { CharAlphabet } from './subsetConstruction';

/** A token emitted by the scanner */
export interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  length: number;
}

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
  /** Primary display symbol class (e.g., 'a-z', '0-9' or a literal char) */
  symbol: string;
  /**
   * All symbol classes/literals merged into this edge (semantic alphabet).
   * Several regex-level symbols can match the same character (e.g. 'a-z'
   * and the literal 'i'); subset construction merges them into one
   * deterministic edge whose label shows the primary symbols.
   */
  symbols?: string[];
  /** Stable ids of every canonical character group this edge responds to */
  classIds?: number[];
}

/** Full DFA representation */
export interface DFA {
  states: DFAState[];
  transitions: DFATransition[];
  startState: number;
  /** Canonical character-group classifier (for deterministic scanning) */
  alphabet?: CharAlphabet | null;
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
  emittedToken?: Token;
  description: string;
}

/** Play state for the animation */
export type PlayState = 'idle' | 'playing' | 'paused' | 'completed';

/** Which step in the pipeline — ch.2: RE → NFA → DFA (subset) → Min DFA (Hopcroft) → Scan */
export type PipelineStep = 0 | 1 | 2 | 3 | 4;
