/**
 * Client-side Java → TAC parser for Try It features.
 * Supports: declarations, assignments, if/else, for loops, println, return,
 *           binary expressions with correct precedence, method calls.
 * Generates CodeGenerationData + CfgMethod compatible with existing lib functions.
 */

import type { CodeGenerationData, TacInstruction, BasicBlockInfo, CfgMethod, CfgNode, CfgEdge } from '../../types';

// ---------------------------------------------------------------------------
// Tokenizer
// ---------------------------------------------------------------------------

type TokType = 'ident' | 'number' | 'string' | 'keyword' | 'op' | 'paren' | 'bracket' | 'semi' | 'comma' | 'dot' | 'eof';
interface Tok { type: TokType; value: string; }

const KEYWORDS = new Set(['int', 'if', 'else', 'for', 'return', 'void', 'String', 'System']);

function tokenize(src: string): Tok[] {
  const toks: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) { i++; continue; }
    if (ch === '/' && src[i + 1] === '/') { while (i < src.length && src[i] !== '\n') i++; continue; }
    if (ch === '"') {
      let s = '"'; i++;
      while (i < src.length && src[i] !== '"') { if (src[i] === '\\') { s += src[i] + (src[i + 1] || ''); i += 2; } else { s += src[i]; i++; } }
      if (i < src.length) { s += '"'; i++; }
      toks.push({ type: 'string', value: s });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let w = ''; while (i < src.length && /[a-zA-Z0-9_]/.test(src[i])) { w += src[i]; i++; }
      if (w === 'out' || w === 'println') { toks.push({ type: 'ident', value: w }); continue; }
      toks.push({ type: KEYWORDS.has(w) ? 'keyword' : 'ident', value: w });
      continue;
    }
    if (/[0-9]/.test(ch)) {
      let n = ''; while (i < src.length && /[0-9.]/.test(src[i])) { n += src[i]; i++; }
      toks.push({ type: 'number', value: n });
      continue;
    }
    // Two-char operators
    const two = src.slice(i, i + 2);
    if (['<=', '>=', '==', '!=', '+=', '-=', '++', '--', '&&', '||'].includes(two)) {
      toks.push({ type: 'op', value: two }); i += 2; continue;
    }
    if ('+-*/%<>=!&|^'.includes(ch)) { toks.push({ type: 'op', value: ch }); i++; continue; }
    if (ch === '(' || ch === ')') { toks.push({ type: 'paren', value: ch }); i++; continue; }
    if (ch === '[' || ch === ']') { toks.push({ type: 'bracket', value: ch }); i++; continue; }
    if (ch === '{' || ch === '}') { toks.push({ type: 'paren', value: ch }); i++; continue; }
    if (ch === ';') { toks.push({ type: 'semi', value: ';' }); i++; continue; }
    if (ch === ',') { toks.push({ type: 'comma', value: ',' }); i++; continue; }
    if (ch === '.') { toks.push({ type: 'dot', value: '.' }); i++; continue; }
    i++;
  }
  toks.push({ type: 'eof', value: '' });
  return toks;
}

// ---------------------------------------------------------------------------
// Parser state
// ---------------------------------------------------------------------------

interface ParseState {
  toks: Tok[];
  pos: number;
  instructions: TacInstruction[];
  lineCounter: number;
  tempCounter: number;
  labelCounter: number;
  sourceLine: number;
}

function peek(s: ParseState): Tok { return s.toks[s.pos] || { type: 'eof', value: '' }; }
function consume(s: ParseState): Tok { const t = peek(s); s.pos++; return t; }
function expect(s: ParseState, val: string): Tok {
  const t = peek(s);
  if (t.value !== val) throw new Error(`Expected '${val}' got '${t.value}'`);
  s.pos++; return t;
}
function newTemp(s: ParseState): string { return `t${s.tempCounter++}`; }
function newLabel(s: ParseState): string { return `L${s.labelCounter++}`; }

function mkInstr(s: ParseState, op: string, result: string | null, arg1: string | null, operator: string | null, arg2: string | null, target: string | null, comment: string | null): void {
  s.instructions.push({
    line: s.lineCounter++,
    op, result, arg1, operator, arg2, target, comment,
    sourceLine: s.sourceLine,
  });
}

// ---------------------------------------------------------------------------
// Expression parsing (precedence climbing)
// ---------------------------------------------------------------------------

function parseExpression(s: ParseState): string {
  return parseOr(s);
}

function parseOr(s: ParseState): string {
  let left = parseAnd(s);
  while (peek(s).value === '||') { consume(s); const right = parseAnd(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, '||', right, null, `${left} || ${right}`); left = t; }
  return left;
}
function parseAnd(s: ParseState): string {
  let left = parseEquality(s);
  while (peek(s).value === '&&') { consume(s); const right = parseEquality(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, '&&', right, null, `${left} && ${right}`); left = t; }
  return left;
}
function parseEquality(s: ParseState): string {
  let left = parseRelational(s);
  while (peek(s).value === '==' || peek(s).value === '!=') { const op = consume(s).value; const right = parseRelational(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, op, right, null, `${left} ${op} ${right}`); left = t; }
  return left;
}
function parseRelational(s: ParseState): string {
  let left = parseAdditive(s);
  while (['<', '>', '<=', '>='].includes(peek(s).value)) { const op = consume(s).value; const right = parseAdditive(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, op, right, null, `${left} ${op} ${right}`); left = t; }
  return left;
}
function parseAdditive(s: ParseState): string {
  let left = parseMultiplicative(s);
  while (peek(s).value === '+' || peek(s).value === '-') { const op = consume(s).value; const right = parseMultiplicative(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, op, right, null, `${left} ${op} ${right}`); left = t; }
  return left;
}
function parseMultiplicative(s: ParseState): string {
  let left = parseUnary(s);
  while (peek(s).value === '*' || peek(s).value === '/' || peek(s).value === '%') { const op = consume(s).value; const right = parseUnary(s); const t = newTemp(s); mkInstr(s, 'binary', t, left, op, right, null, `${left} ${op} ${right}`); left = t; }
  return left;
}
function parseUnary(s: ParseState): string {
  if (peek(s).value === '-' || peek(s).value === '!') { const op = consume(s).value; const inner = parseUnary(s); const t = newTemp(s); mkInstr(s, op === '!' ? 'binary' : 'neg', t, inner, op, null, null, `${op}${inner}`); return t; }
  return parsePostfix(s);
}
function parsePostfix(s: ParseState): string {
  let val = parsePrimary(s);
  // Array access: a[i]
  while (peek(s).value === '[') {
    consume(s); const idx = parseExpression(s); expect(s, ']');
    const t = newTemp(s); mkInstr(s, 'binary', t, val, '[]', idx, null, `${val}[${idx}]`); val = t;
  }
  // Postfix ++ / --
  if (peek(s).value === '++' || peek(s).value === '--') {
    const op = consume(s).value;
    const t = newTemp(s);
    const binOp = op === '++' ? '+' : '-';
    mkInstr(s, 'binary', t, val, binOp, '1', null, `${val}${op}`);
    mkInstr(s, 'assign', val, t, null, null, null, `${val} = ${t}`);
    return val;
  }
  return val;
}
function parsePrimary(s: ParseState): string {
  const t = peek(s);
  if (t.value === '(') {
    consume(s); const inner = parseExpression(s); expect(s, ')'); return inner;
  }
  if (t.type === 'number') { consume(s); return t.value; }
  if (t.type === 'string') {
    consume(s);
    // ldc for string literals
    const tmp = newTemp(s); mkInstr(s, 'ldc', tmp, t.value, null, null, null, t.value); return tmp;
  }
  if (t.type === 'ident' || t.type === 'keyword') {
    const name = consume(s).value;
    // System.out.println(...) special case
    if (name === 'System' && peek(s).value === '.') {
      consume(s); // .
      const outTok = peek(s);
      if (outTok.value === 'out') {
        consume(s);
        if (peek(s).value === '.') {
          consume(s);
          const method = peek(s).value === 'println' ? consume(s).value : consume(s).value;
          expect(s, '(');
          let arg = '';
          if (peek(s).value !== ')') arg = parseExpression(s);
          expect(s, ')');
          const tmp = newTemp(s);
          mkInstr(s, 'getstatic', tmp, 'System.out', null, 'PrintStream', null, 'System.out');
          const callTmp = newTemp(s);
          mkInstr(s, 'invokevirtual', callTmp, `PrintStream.${method}`, null, arg, null, `${method}(${arg})`);
          return callTmp;
        }
      }
      return name;
    }
    // Check for method call: foo(args)
    if (peek(s).value === '(') {
      consume(s);
      const args: string[] = [];
      while (peek(s).value !== ')' && peek(s).type !== 'eof') {
        args.push(parseExpression(s));
        if (peek(s).value === ',') consume(s);
      }
      expect(s, ')');
      const tmp = newTemp(s); mkInstr(s, 'invokevirtual', tmp, name, null, args.join(', '), null, `${name}(${args.join(', ')})`);
      return tmp;
    }
    // Check for member access chain: a.b.c (stop at method call or end)
    let full = name;
    while (peek(s).value === '.' && s.toks[s.pos + 1] && s.toks[s.pos + 1].type !== 'eof' && s.toks[s.pos + 1].value !== 'out' && s.toks[s.pos + 1].value !== 'println') {
      consume(s);
      const part = peek(s);
      if (part.type === 'ident' || part.type === 'keyword') { consume(s); full += '.' + part.value; }
      else break;
    }
    return full;
  }
  // Fallback
  consume(s); return t.value;
}

// ---------------------------------------------------------------------------
// Statement parsing
// ---------------------------------------------------------------------------

function parseStatement(s: ParseState): void {
  const t = peek(s);
  if (t.type === 'eof' || t.value === '}') return;

  // for loop: for (init; cond; update) body
  if (t.value === 'for') {
    consume(s); expect(s, '(');
    // init
    const savedSL = s.sourceLine;
    if (peek(s).value !== ';') parseStatementNoSemi(s);
    expect(s, ';');
    // cond
    let condResult: string | null = null;
    let hasCond = false;
    if (peek(s).value !== ';') { condResult = parseExpression(s); hasCond = true; }
    expect(s, ';');
    // update - capture without emitting yet
    let updateCode: TacInstruction[] = [];
    if (peek(s).value !== ')') {
      // Parse update as assignment or expression
      const beforeUpdate = s.instructions.length;
      parseForUpdate(s);
      updateCode = s.instructions.splice(beforeUpdate);
    }
    expect(s, ')');

    const loopStart = newLabel(s);
    const loopEnd = newLabel(s);
    // Label for loop start
    mkInstr(s, 'label', loopStart, null, null, null, null, null);
    // Condition check
    if (hasCond && condResult) {
      mkInstr(s, 'iffalse', null, condResult, null, null, loopEnd, `for cond`);
    }
    // Body
    parseBody(s);
    // Update
    for (const instr of updateCode) s.instructions.push(instr);
    // Goto back
    mkInstr(s, 'goto', null, null, null, null, loopStart, null);
    mkInstr(s, 'label', loopEnd, null, null, null, null, null);
    s.sourceLine = savedSL;
    return;
  }

  // if statement: if (cond) then [else else]
  if (t.value === 'if') {
    consume(s); expect(s, '('); const cond = parseExpression(s); expect(s, ')');
    const elseLabel = newLabel(s);
    const endLabel = newLabel(s);
    mkInstr(s, 'iffalse', null, cond, null, null, elseLabel, `if ${cond}`);
    parseBody(s);
    // Check for else
    if (peek(s).value === 'else') {
      consume(s);
      mkInstr(s, 'goto', null, null, null, null, endLabel, null);
      mkInstr(s, 'label', elseLabel, null, null, null, null, null);
      parseBody(s);
      mkInstr(s, 'label', endLabel, null, null, null, null, null);
    } else {
      mkInstr(s, 'label', elseLabel, null, null, null, null, null);
    }
    return;
  }

  // return
  if (t.value === 'return') {
    consume(s);
    let arg: string | null = null;
    if (peek(s).value !== ';' && peek(s).type !== 'eof' && peek(s).value !== '}') {
      arg = parseExpression(s);
    }
    if (peek(s).value === ';') consume(s);
    mkInstr(s, 'return', null, arg, null, null, null, arg ? `return ${arg}` : 'return');
    return;
  }

  // Variable declaration: int x = expr; or int x, y = 2;
  if (t.value === 'int' || t.value === 'String' || t.value === 'void') {
    void consume(s).value;
    // Handle array brackets: int[] a
    while (peek(s).value === '[') { consume(s); expect(s, ']'); }
    parseDeclaration(s);
    if (peek(s).value === ';') consume(s);
    return;
  }

  // ++ / -- prefix
  if (t.value === '++' || t.value === '--') {
    const op = consume(s).value;
    const name = peek(s).value; if (peek(s).type === 'ident') consume(s);
    const binOp = op === '++' ? '+' : '-';
    const tmp = newTemp(s);
    mkInstr(s, 'binary', tmp, name, binOp, '1', null, `${name}${op}`);
    mkInstr(s, 'assign', name, tmp, null, null, null, `${name} = ${tmp}`);
    if (peek(s).value === ';') consume(s);
    return;
  }

  // System.out.println directly
  if (t.value === 'System') {
    const saved = s.pos;
    try {
      parseExpression(s);
      if (peek(s).value === ';') consume(s);
      return;
    } catch { s.pos = saved; }
  }

  // Assignment or expression statement: a = expr; or a += expr; or expr;
  if (t.type === 'ident') {
    // Look ahead for assignment
    let j = s.pos + 1;
    // Skip array index
    if (s.toks[j] && s.toks[j].value === '[') {
      let depth = 0;
      while (j < s.toks.length) { if (s.toks[j].value === '[') depth++; if (s.toks[j].value === ']') { depth--; if (depth === 0) { j++; break; } } j++; }
    }
    const nextVal = s.toks[j] ? s.toks[j].value : '';
    if (nextVal === '=' || nextVal === '+=' || nextVal === '-=' || nextVal === '*=' || nextVal === '/=') {
      const target = parseAssignTarget(s);
      const op = consume(s).value;
      if (op === '+=') {
        const rhs = parseExpression(s);
        const tmp = newTemp(s); mkInstr(s, 'binary', tmp, target, '+', rhs, null, `${target} + ${rhs}`);
        mkInstr(s, 'assign', target, tmp, null, null, null, `${target} = ${tmp}`);
      } else if (op === '-=') {
        const rhs = parseExpression(s);
        const tmp = newTemp(s); mkInstr(s, 'binary', tmp, target, '-', rhs, null, `${target} - ${rhs}`);
        mkInstr(s, 'assign', target, tmp, null, null, null, `${target} = ${tmp}`);
      } else if (op === '*=') {
        const rhs = parseExpression(s);
        const tmp = newTemp(s); mkInstr(s, 'binary', tmp, target, '*', rhs, null, `${target} * ${rhs}`);
        mkInstr(s, 'assign', target, tmp, null, null, null, `${target} = ${tmp}`);
      } else if (op === '/=') {
        const rhs = parseExpression(s);
        const tmp = newTemp(s); mkInstr(s, 'binary', tmp, target, '/', rhs, null, `${target} / ${rhs}`);
        mkInstr(s, 'assign', target, tmp, null, null, null, `${target} = ${tmp}`);
      } else {
        const rhs = parseExpression(s);
        mkInstr(s, 'assign', target, rhs, null, null, null, `${target} = ${rhs}`);
      }
      if (peek(s).value === ';') consume(s);
      return;
    }
    // Check for postfix ++/--
    if (s.toks[j] && (s.toks[j].value === '++' || s.toks[j].value === '--')) {
      const name = consume(s).value;
      const op = consume(s).value;
      const binOp = op === '++' ? '+' : '-';
      const tmp = newTemp(s);
      mkInstr(s, 'binary', tmp, name, binOp, '1', null, `${name}${op}`);
      mkInstr(s, 'assign', name, tmp, null, null, null, `${name} = ${tmp}`);
      if (peek(s).value === ';') consume(s);
      return;
    }
    // Expression statement: method call etc.
    try {
      parseExpression(s);
      if (peek(s).value === ';') consume(s);
      return;
    } catch { consume(s); if (peek(s).value === ';') consume(s); return; }
  }

  // Skip unknown
  consume(s);
  if (peek(s).value === ';') consume(s);
}

function parseDeclaration(s: ParseState, _typeName?: string): void {
  void _typeName;
  while (true) {
    const name = peek(s).value;
    if (peek(s).type !== 'ident' && peek(s).type !== 'keyword') break;
    consume(s);
    // Array init: skip brackets
    while (peek(s).value === '[') {
      consume(s);
      if (peek(s).value !== ']') parseExpression(s);
      expect(s, ']');
    }
    if (peek(s).value === '=') {
      consume(s);
      const rhs = parseExpression(s);
      mkInstr(s, 'assign', name, rhs, null, null, null, `${name} = ${rhs}`);
    } else {
      // Declaration without init - treat as assign 0/default
      mkInstr(s, 'assign', name, '0', null, null, null, `${name} = 0`);
    }
    if (peek(s).value === ',') { consume(s); continue; }
    break;
  }
}

function parseAssignTarget(s: ParseState): string {
  let name = consume(s).value;
  while (peek(s).value === '[') {
    consume(s); const idx = parseExpression(s); expect(s, ']');
    const tmp = newTemp(s);
    // For a[i] = val, we need to handle array store differently
    // But for Try It, just use indexed notation as variable name
    name = `${name}[${idx}]`;
    // Store the index computation is already in instructions via parseExpression
    void tmp;
  }
  while (peek(s).value === '.') {
    consume(s);
    const part = consume(s).value;
    name = `${name}.${part}`;
  }
  return name;
}

function parseForUpdate(s: ParseState): void {
  // for update can be: i++, i--, i = expr, or multiple comma-separated
  if (peek(s).value === ')' || peek(s).type === 'eof') return;
  // Check for i++ / i--
  if (peek(s).type === 'ident' && s.toks[s.pos + 1] && (s.toks[s.pos + 1].value === '++' || s.toks[s.pos + 1].value === '--')) {
    const name = consume(s).value;
    const op = consume(s).value;
    const binOp = op === '++' ? '+' : '-';
    const tmp = newTemp(s);
    mkInstr(s, 'binary', tmp, name, binOp, '1', null, `${name}${op}`);
    mkInstr(s, 'assign', name, tmp, null, null, null, `${name} = ${tmp}`);
    return;
  }
  if (peek(s).type === 'ident') {
    const target = parseAssignTarget(s);
    if (peek(s).value === '=') {
      consume(s);
      const rhs = parseExpression(s);
      mkInstr(s, 'assign', target, rhs, null, null, null, `${target} = ${rhs}`);
      if (peek(s).value === ',') { consume(s); parseForUpdate(s); }
      return;
    }
    // Just expression
    // Rewind and parse as expression
  }
  try { parseExpression(s); } catch { /* skip */ }
}

function parseStatementNoSemi(s: ParseState): void {
  const t = peek(s);
  if (t.value === 'int' || t.value === 'String') {
    void consume(s).value;
    while (peek(s).value === '[') { consume(s); expect(s, ']'); }
    parseDeclaration(s);
    return;
  }
  if (t.type === 'ident') {
    let j = s.pos + 1;
    if (s.toks[j] && s.toks[j].value === '[') {
      let depth = 0;
      while (j < s.toks.length) { if (s.toks[j].value === '[') depth++; if (s.toks[j].value === ']') { depth--; if (depth === 0) { j++; break; } } j++; }
    }
    const nv = s.toks[j] ? s.toks[j].value : '';
    if (nv === '=' || nv === '+=') {
      const target = parseAssignTarget(s);
      const op = consume(s).value;
      if (op === '+=') {
        const rhs = parseExpression(s);
        const tmp = newTemp(s); mkInstr(s, 'binary', tmp, target, '+', rhs, null, `${target} + ${rhs}`);
        mkInstr(s, 'assign', target, tmp, null, null, null, `${target} = ${tmp}`);
      } else { const rhs = parseExpression(s); mkInstr(s, 'assign', target, rhs, null, null, null, `${target} = ${rhs}`); }
      return;
    }
  }
  try { parseExpression(s); } catch { consume(s); }
}

function parseBody(s: ParseState): void {
  if (peek(s).value === '{') {
    consume(s);
    while (peek(s).value !== '}' && peek(s).type !== 'eof') {
      parseStatement(s);
    }
    if (peek(s).value === '}') consume(s);
  } else {
    parseStatement(s);
  }
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

function buildBasicBlocks(instructions: TacInstruction[]): BasicBlockInfo[] {
  if (instructions.length === 0) return [];

  // Find leaders
  const leaders = new Set<number>([0]);
  for (let i = 0; i < instructions.length; i++) {
    const instr = instructions[i];
    if (instr.op === 'label') leaders.add(i);
    if (instr.op === 'iffalse' || instr.op === 'if' || instr.op === 'goto') {
      // Target label → leader
      for (let j = 0; j < instructions.length; j++) {
        if (instructions[j].op === 'label' && instructions[j].result === instr.target) { leaders.add(j); break; }
      }
      // Next instruction is also a leader
      if (i + 1 < instructions.length) leaders.add(i + 1);
    }
  }

  const sorted = [...leaders].sort((a, b) => a - b);
  const blocks: BasicBlockInfo[] = [];
  for (let bi = 0; bi < sorted.length; bi++) {
    const start = sorted[bi];
    const end = bi + 1 < sorted.length ? sorted[bi + 1] - 1 : instructions.length - 1;
    const indices: number[] = [];
    for (let j = start; j <= end; j++) indices.push(j);

    const lastInstr = instructions[end];
    let type = 'normal';
    if (bi === 0) type = 'entry';
    else if (lastInstr && (lastInstr.op === 'return' || lastInstr.op === 'method_end')) type = 'exit';

    const edges: BasicBlockInfo['edges'] = [];
    if (lastInstr) {
      if (lastInstr.op === 'iffalse' || lastInstr.op === 'if') {
        // Find target block
        for (let bj = 0; bj < sorted.length; bj++) {
          const lbl = instructions[sorted[bj]];
          if (lbl.op === 'label' && lbl.result === lastInstr.target) {
            edges.push({ targetBlockId: bj, kind: 'branch', label: 'false' });
            break;
          }
        }
        if (bi + 1 < sorted.length) edges.push({ targetBlockId: bi + 1, kind: 'fallthrough', label: 'true' });
      } else if (lastInstr.op === 'goto') {
        for (let bj = 0; bj < sorted.length; bj++) {
          const lbl = instructions[sorted[bj]];
          if (lbl.op === 'label' && lbl.result === lastInstr.target) {
            const kind = sorted[bj] < start ? 'loop_back' : 'goto';
            edges.push({ targetBlockId: bj, kind, label: null });
            break;
          }
        }
      } else if (bi + 1 < sorted.length && lastInstr.op !== 'return' && lastInstr.op !== 'method_end') {
        edges.push({ targetBlockId: bi + 1, kind: 'fallthrough', label: null });
      }
    }

    blocks.push({
      id: bi,
      label: instructions[start]?.op === 'label' ? instructions[start].result : `B${bi}`,
      type,
      instructions: indices,
      edges,
    });
  }
  return blocks;
}

function _stripMethodMarkers(instrs: TacInstruction[]): TacInstruction[] {
  return instrs.filter(i => i.op !== 'method_start' && i.op !== 'method_end');
}
void _stripMethodMarkers;

/**
 * Parse Java source code into TAC instructions.
 * Handles: declarations, assignments, binary expressions, if/else, for, return, method calls.
 */
export function buildTacFromJava(code: string): CodeGenerationData {
  const toks = tokenize(code);
  const state: ParseState = {
    toks,
    pos: 0,
    instructions: [],
    lineCounter: 0,
    tempCounter: 0,
    labelCounter: 0,
    sourceLine: 0,
  };

  // Emit method start
  state.instructions.push({
    line: state.lineCounter++,
    op: 'method_start',
    result: 'TryIt.main',
    arg1: 'TryIt',
    operator: null,
    arg2: null,
    target: null,
    comment: null,
    sourceLine: -1,
  });



  // Parse statements - track sourceLine by counting semicolons/braces
  let lineIdx = 0;
  while (state.pos < state.toks.length && peek(state).type !== 'eof') {
    // Estimate sourceLine from position in original code
    state.sourceLine = lineIdx;
    const beforePos = state.pos;
    try {
      parseStatement(state);
    } catch {
      consume(state);
      if (peek(state).value === ';') consume(state);
    }
    // Advance line tracking based on consumed content
    if (state.pos > beforePos) {
      // Count how many semicolons / braces we passed roughly
      // For simplicity, increment lineIdx if we consumed a full statement
      lineIdx++;
    } else {
      state.pos++;
    }
    // Safety: detect infinite loop
    if (state.pos === beforePos) state.pos++;
  }

  // Emit method end / return if not already
  const hasReturn = state.instructions.some(i => i.op === 'return');
  if (!hasReturn) {
    state.instructions.push({
      line: state.lineCounter++,
      op: 'return',
      result: null, arg1: null, operator: null, arg2: null, target: null, comment: null,
      sourceLine: -1,
    });
  }

  state.instructions.push({
    line: state.lineCounter++,
    op: 'method_end',
    result: 'TryIt.main',
    arg1: null, operator: null, arg2: null, target: null, comment: null,
    sourceLine: -1,
  });

  // Re-number lines sequentially
  state.instructions.forEach((instr, idx) => { instr.line = idx; });

  const basicBlocks = buildBasicBlocks(state.instructions);

  return {
    className: 'TryIt',
    packageName: '',
    instructions: state.instructions,
    basicBlocks,
    totalInstructions: state.instructions.length,
    totalBlocks: basicBlocks.length,
    totalEdges: basicBlocks.reduce((a, b) => a + b.edges.length, 0),
  };
}

/**
 * Build a CfgMethod from CodeGenerationData for liveness analysis.
 * Converts TAC instructions into CfgNode/CfgEdge format.
 */
export function buildCfgFromTac(data: CodeGenerationData): CfgMethod {
  const tacInstrs = data.instructions;

  const formatInstr = (instr: TacInstruction): string => {
    switch (instr.op) {
      case 'assign': return `${instr.result} = ${instr.arg1}`;
      case 'binary': return `${instr.result} = ${instr.arg1} ${instr.operator} ${instr.arg2}`;
      case 'neg': return `${instr.result} = ${instr.operator}${instr.arg1}`;
      case 'ldc': return `${instr.result} = ldc ${instr.arg1}`;
      case 'getstatic': return `${instr.result} = getstatic ${instr.arg1}`;
      case 'invokevirtual': return `${instr.result ? instr.result + ' = ' : ''}invokevirtual ${instr.arg1}(${instr.arg2})`;
      case 'if': return `if ${instr.arg1} goto ${instr.target}`;
      case 'iffalse': return `iffalse ${instr.arg1} goto ${instr.target}`;
      case 'goto': return `goto ${instr.target}`;
      case 'return': return `return${instr.arg1 ? ' ' + instr.arg1 : ''}`;
      case 'label': return `${instr.result}:`;
      case 'method_start': return `${instr.result} {`;
      case 'method_end': return '}';
      default: return `${instr.op} ${instr.arg1 || ''}`.trim();
    }
  };

  const blocks: CfgNode[] = data.basicBlocks.map(b => ({
    id: b.id,
    label: b.label || `B${b.id}`,
    type: b.type,
    statements: b.instructions
      .map(idx => tacInstrs[idx])
      .filter(i => i && i.op !== 'method_start' && i.op !== 'method_end')
      .map(formatInstr),
  }));

  const edges: CfgEdge[] = data.basicBlocks.flatMap(b =>
    b.edges.map(e => ({
      from: b.id,
      to: e.targetBlockId,
      label: e.label || e.kind,
    }))
  );

  return {
    name: 'main',
    declaringType: 'TryIt',
    returnType: 'void',
    kind: 'method',
    parameters: [],
    blocks,
    edges,
  };
}
