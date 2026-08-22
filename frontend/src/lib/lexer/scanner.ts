import type { DFA, Token, ScannerStep } from './types';
import { testSymbol } from './subsetConstruction';
import { JAVA_KEYWORDS } from './thompson';

// ── Scanner Simulation ──
// Simulates running the DFA over the source code character by character.
// At each step, tracks the current DFA state and emits tokens when accept states are reached.
// Operator handling is now via the DFA's multi-char branches (thompson.ts: OPERATOR NFA)
// so longest-match is demonstrated by Δ, not by a hand-coded table — fixing ch.2 §2.4.5 fidelity.
// Comment handling remains a hybrid bypass for block comments (/*…*/) because the
// visualized NFA is a simplified educational subset; see ch.2 §2.3(5).
const KEYWORD_SET = new Set<string>(JAVA_KEYWORDS as unknown as string[]);

/**
 * Simulate the scanner running over source code.
 * Returns a list of steps for visualization, plus the emitted tokens.
 *
 * The scanner uses a "longest match" strategy: it keeps consuming characters
 * as long as the DFA can transition. When it can't go further, it backs up
 * to the last accept state and emits a token.
 */
export function simulateScanner(
  sourceCode: string,
  dfa: DFA,
  maxChars = 2000 // limit for visualization performance
): { steps: ScannerStep[]; emittedTokens: Token[] } {
  const steps: ScannerStep[] = [];
  const emittedTokens: Token[] = [];

  const code = sourceCode.slice(0, maxChars);
  let pos = 0;
  let line = 1;
  let col = 1;

  while (pos < code.length) {
    // Comments: hybrid bypass — block comments require multi-line lookahead that
    // the simplified NFA visualization does not fully model (ch.2 §2.3(5)).
    // The DFA now includes a block-comment branch, but the scanner keeps a
    // direct `indexOf('*/')` fast-path for correct unterminated handling.
    if (code.startsWith('//', pos) || code.startsWith('/*', pos)) {
      const isBlock = code.startsWith('/*', pos);
      let end: number;
      if (isBlock) {
        const close = code.indexOf('*/', pos + 2);
        end = close === -1 ? code.length : close + 2;
      } else {
        end = pos + 2;
        while (end < code.length && code[end] !== '\n') end++;
      }

      const tokenValue = code.slice(pos, end);
      const token: Token = {
        type: 'COMMENT',
        value: tokenValue,
        line,
        column: col,
        length: tokenValue.length,
      };
      emittedTokens.push(token);

      steps.push({
        position: pos,
        char: code[pos] || '',
        dfaStateId: -1,
        dfaStateLabel: 'COMMENT',
        isAccept: true,
        emittedToken: token,
        description: `Token emitted: [COMMENT: "${tokenValue}"] (hybrid: direct scan for ${isBlock ? 'block' : 'line'} comment)`,
      });

      const consumed = tokenValue.split('');
      for (const c of consumed) {
        if (c === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      pos = end;
      continue;
    }

    const startState = dfa.states.find(s => s.isStart);
    if (!startState) break;

    let currentState = startState;
    let lastAcceptState: typeof currentState | null = null;
    let lastAcceptPos = pos;
    let currentPos = pos;

    // Walk forward while the DFA can transition
    while (currentPos < code.length) {
      const char = code[currentPos];
      const transitions = dfa.transitions.filter(t => t.from === currentState.id);

      let nextStateId: number | null = null;
      for (const t of transitions) {
        if (testSymbol(t.symbol, char)) {
          nextStateId = t.to;
          break;
        }
      }

      if (nextStateId === null) {
        break; // no transition possible
      }

      currentState = dfa.states.find(s => s.id === nextStateId)!;

      currentPos++;

      if (currentState.isAccept) {
        lastAcceptState = currentState;
        lastAcceptPos = currentPos;
      }

      // Record this scanning step
      steps.push({
        position: currentPos - 1,
        char,
        dfaStateId: currentState.id,
        dfaStateLabel: currentState.label,
        isAccept: currentState.isAccept,
        description: `Char '${char}' → ${currentState.label}${currentState.isAccept ? ` (accept: ${currentState.acceptType})` : ''}`,
      });
    }

    // Emit token if we found an accept state
    if (lastAcceptState && lastAcceptPos > pos) {
      const tokenValue = code.slice(pos, lastAcceptPos);
      let acceptType = lastAcceptState.acceptType || 'UNKNOWN';
      // Reclassify identifiers that are reserved words — ch.2 §2.5.4 alternative:
      // the DFA's KEYWORD branch only accepts exact keywords; generic identifiers
      // that look like keywords are resolved here to match backend JavaLexer reclassification.
      if (acceptType === 'IDENTIFIER' && KEYWORD_SET.has(tokenValue)) {
        acceptType = 'KEYWORD';
      }

      const token: Token = {
        type: acceptType,
        value: tokenValue,
        line,
        column: col,
        length: tokenValue.length,
      };
      emittedTokens.push(token);

      // Add emit step
      steps.push({
        position: lastAcceptPos - 1,
        char: code[lastAcceptPos - 1] || '',
        dfaStateId: lastAcceptState.id,
        dfaStateLabel: lastAcceptState.label,
        isAccept: true,
        emittedToken: token,
        description: `Token emitted: [${acceptType}: "${tokenValue}"]${acceptType === 'KEYWORD' && lastAcceptState.acceptType === 'IDENTIFIER' ? ' (reclassified from IDENTIFIER via reserved-word table)' : ''}`,
      });

      // Advance position
      const consumed = tokenValue.split('');
      for (const c of consumed) {
        if (c === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      pos = lastAcceptPos;
    } else {
      // No token recognized — skip one character (error recovery)
      const char = code[pos];
      steps.push({
        position: pos,
        char,
        dfaStateId: startState.id,
        dfaStateLabel: startState.label,
        isAccept: false,
        description: `Unrecognized character '${char}' at position ${pos} — skipping`,
      });

      if (char === '\n') {
        line++;
        col = 1;
      } else {
        col++;
      }
      pos++;
    }
  }

  steps.push({
    position: pos,
    char: '',
    dfaStateId: -1,
    dfaStateLabel: 'DONE',
    isAccept: false,
    description: 'Scanning complete.',
  });

  return { steps, emittedTokens };
}
