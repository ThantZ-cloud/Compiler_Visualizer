import type { DFA, Token, ScannerStep } from './types';
import { testSymbol } from './subsetConstruction';

// ── Scanner Simulation ──
// Simulates running the DFA over the source code character by character.
// At each step, tracks the current DFA state and emits tokens when accept states are reached.

// Mirrors the backend JavaLexer: multi-char operator lookups win before the DFA,
// keeping the token stream in sync between the dynamic and static views.
const TWO_CHAR_OPERATORS = new Set([
  '==', '!=', '<=', '>=', '&&', '||', '<<', '>>',
  '+=', '-=', '*=', '/=', '%=', '&=', '|=', '^=', '->', '::',
]);

/** Find the maximal multi-char operator at pos, or null */
function matchOperator(code: string, pos: number): string | null {
  const three = code.slice(pos, pos + 3);
  if (three === '>>>') return three;
  const two = code.slice(pos, pos + 2);
  if (TWO_CHAR_OPERATORS.has(two)) return two;
  return null;
}

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
    // Comments take priority over operators, matching real lexer behaviour:
    // `// ...` runs to end of line, `/* ... */` runs to the closing marker.
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
        description: `Token emitted: [COMMENT: "${tokenValue}"]`,
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

    // Multi-char operators take priority over the single-char DFA rules
    if (matchOperator(code, pos)) {
      const tokenValue = matchOperator(code, pos)!;
      const token: Token = {
        type: 'OPERATOR',
        value: tokenValue,
        line,
        column: col,
        length: tokenValue.length,
      };
      emittedTokens.push(token);

      steps.push({
        position: pos,
        char: tokenValue[0],
        dfaStateId: -1,
        dfaStateLabel: 'OPERATOR',
        isAccept: true,
        emittedToken: token,
        description: `Token emitted: [OPERATOR: "${tokenValue}"]`,
      });

      for (const c of tokenValue) {
        if (c === '\n') {
          line++;
          col = 1;
        } else {
          col++;
        }
      }
      pos += tokenValue.length;
      continue;
    }

    const startState = dfa.states.find(s => s.isStart);
    if (!startState) break;

    let currentState = startState;
    let lastAcceptState: typeof currentState | null = null;
    let lastAcceptPos = pos;
    let currentPos = pos;
    let currentLine = line;
    let currentCol = col;

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

      // Track position for line/col
      if (char === '\n') {
        currentLine++;
        currentCol = 1;
      } else {
        currentCol++;
      }
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
      const acceptType = lastAcceptState.acceptType || 'UNKNOWN';

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
        description: `Token emitted: [${acceptType}: "${tokenValue}"]`,
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
