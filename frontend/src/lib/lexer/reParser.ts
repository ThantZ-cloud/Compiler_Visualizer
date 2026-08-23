import { fragSymbol, fragAlt, fragConcat, fragStar, fragPlus, fragOpt, resetThompson, getThompsonState, markAccept, type Built, type ReNode } from './thompson';
import type { NFA } from './types';

/**
 * Tiny RE → NFA parser that reuses Thompson templates.
 * Supports: literals a-zA-Z0-9 / . + - etc, parens (), alt |, quantifiers * + ?, escape \c, ignores unescaped whitespace.
 * Implicit concatenation with precedence: () > *+? > concat > |
 * Caps: input ≤ 64 chars, states ≤ 120 before warning.
 */
export interface ParseResult {
  nfa?: NFA;
  root?: ReNode;
  statesCount?: number;
  error?: string;
}

class Parser {
  input: string;
  pos = 0;
  len: number;

  constructor(input: string) {
    // Keep escapes, drop unescaped whitespace for readability: "a (b | c)*" → "a(b|c)*"
    // We preprocess to remove unescaped spaces/tabs/newlines.
    let out = '';
    for (let i = 0; i < input.length; i++) {
      const ch = input[i];
      if (ch === '\\' && i + 1 < input.length) {
        out += ch + input[i + 1];
        i++;
      } else if (ch === ' ' || ch === '\t' || ch === '\n' || ch === '\r') {
        continue;
      } else {
        out += ch;
      }
    }
    this.input = out;
    this.len = out.length;
  }

  peek(): string | null {
    return this.pos < this.len ? this.input[this.pos] : null;
  }
  consume(): string | null {
    if (this.pos >= this.len) return null;
    return this.input[this.pos++];
  }
  expect(ch: string): boolean {
    if (this.peek() === ch) { this.pos++; return true; }
    return false;
  }

  parseAlt(): Built {
    const first = this.parseConcat();
    const branches: Built[] = [first];
    while (this.peek() === '|') {
      this.consume(); // '|'
      // allow "/": treat as alias for '|' when user typed "(a(b/c))*" by mistake — normalize '/' inside alt as '|'
      // We already handle '|' only; '/' will be parsed as literal in concat, so we keep '|' strict.
      if (this.peek() === null || this.peek() === ')' ) throw new Error(`Expected expression after '|' at ${this.pos}`);
      branches.push(this.parseConcat());
    }
    if (branches.length === 1) return first;
    return fragAlt(branches);
  }

  parseConcat(): Built {
    const parts: Built[] = [];
    while (true) {
      const p = this.peek();
      if (p === null || p === ')' || p === '|') break;
      // quantifiers *+? are consumed inside parseQuant, so stop only on alt/parens boundaries
      parts.push(this.parseQuant());
    }
    if (parts.length === 0) throw new Error(`Empty expression at ${this.pos}`);
    if (parts.length === 1) return parts[0];
    return fragConcat(parts);
  }

  parseQuant(): Built {
    const atom = this.parseAtom();
    const q = this.peek();
    if (q === '*') { this.consume(); return fragStar(atom); }
    if (q === '+') { this.consume(); return fragPlus(() => this.cloneBuilt(atom)); }
    if (q === '?') { this.consume(); return fragOpt(atom); }
    return atom;
  }

  // Clone is needed for r+ which is r r* with two independent copies.
  // We have the ReNode tree of atom; rebuild a fresh fragment from it via symbol walk.
  // Simplest: rebuild from label: for custom RE we only need literals, so clone via fragSymbol for sym, else reconstruct via tree.
  cloneBuilt(b: Built): Built {
    // Rebuild from ReNode to get fresh state ids
    return this.buildFromReNode(b.node);
  }

  buildFromReNode(node: ReNode): Built {
    switch (node.kind) {
      case 'sym': return fragSymbol(node.label);
      case 'concat': return fragConcat(node.children.map(c => this.buildFromReNode(c as ReNode)));
      case 'alt': return fragAlt(node.children.map(c => this.buildFromReNode(c as ReNode)));
      case 'star': return fragStar(this.buildFromReNode(node.child));
      case 'opt': return fragOpt(this.buildFromReNode(node.child));
    }
  }

  parseAtom(): Built {
    const p = this.peek();
    if (p === null) throw new Error('Unexpected end of expression');
    if (p === '(') {
      this.consume();
      if (this.peek() === ')') throw new Error(`Empty parentheses at ${this.pos - 1}`);
      const inner = this.parseAlt();
      if (!this.expect(')')) throw new Error(`Expected ')' at ${this.pos}`);
      return inner;
    }
    if (p === '\\') {
      this.consume();
      const esc = this.consume();
      if (esc === null) throw new Error('Trailing \\ at end');
      return fragSymbol(esc);
    }
    if ('|)*+?'.includes(p)) throw new Error(`Unexpected '${p}' at ${this.pos}`);
    // literal: any single char including '/' etc
    this.consume();
    return fragSymbol(p);
  }

  parse(): Built {
    const res = this.parseAlt();
    if (this.pos !== this.len) throw new Error(`Unexpected '${this.peek()}' at ${this.pos}`);
    return res;
  }
}

export function buildNFAFromRE(input: string): ParseResult {
  const trimmed = input.trim();
  if (trimmed.length === 0) return { error: 'Enter a regular expression, e.g. a(b|c)* or (a|b)*' };
  if (trimmed.length > 64) return { error: 'Expression too long (max 64 characters)' };
  // Also normalize user-friendly '/' as '|' when inside parens? Provide hint but keep strict.
  // If input contains '/', suggest '|' but still build literal '/'.
  try {
    resetThompson();
    const parser = new Parser(trimmed);
    const frag = parser.parse();
    // quick sanity: state count cap to keep layout readable
    const { states } = getThompsonState();
    if (states.length > 120) return { error: `NFA too large (${states.length} states) — try a shorter expression` };
    markAccept(frag, 'CUSTOM');
    const { states: finalStates, transitions } = getThompsonState();
    // mark start
    const startState = frag.startId;
    const st = finalStates.find(s => s.id === startState);
    if (st) st.isStart = true;
    return { nfa: { states: [...finalStates], transitions: [...transitions], startState }, root: frag.node, statesCount: finalStates.length };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : String(e);
    return { error: msg };
  }
}

// Quick helper for UI chips: prebuilt examples
export const PRESET_RES = ['a(b|c)*', '(a|b)*', 'a*', 'ab|c', '(a(b|c))*', 'a(b|c)+', 'a?b'] as const;
