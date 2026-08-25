/**
 * Local Value Numbering (LVN) — Engineering a Compiler §8.4.1.
 *
 * Assigns a value number to each expression.  Two expressions that
 * compute the same value receive the same number; the second occurrence
 * is redundant and can be replaced by a copy.
 *
 * Within a single basic block, we walk statements in order:
 *   1. Look up the value number for each operand (creating one if needed).
 *   2. Build a hash key from (valueNum(left), operator, valueNum(right)).
 *   3. If the key already exists → redundant (reuse).
 *   4. Otherwise → new value number.
 *   On redefinition of a variable, its old value number is superseded.
 */

export interface LvnEntry {
  /** 0-based index in the block's statement list */
  index: number;
  /** Original statement text */
  text: string;
  /** Parsed LHS variable (null for non-assignments) */
  lhs: string | null;
  /** Operator (null for simple copy / single-operand) */
  op: string | null;
  /** Operand variable / literal names */
  operands: string[];
  /** Value number assigned to the result */
  valueNumber: number;
  /** Value numbers of operands */
  operandNumbers: number[];
  /** Hash key for the expression (e.g. "1+2") */
  hashKey: string | null;
  /** Whether this expression is redundant */
  isRedundant: boolean;
  /** Index of the original definition that this is redundant with (if redundant) */
  redundantWith: number | null;
  /** Whether this is a constant-foldable expression */
  isConstantFold: boolean;
  /** Folded constant value (if applicable) */
  foldedValue: string | null;
  /** Whether an algebraic identity was applied */
  identityApplied: string | null;
}

export interface LvnBlockResult {
  blockId: number;
  blockLabel: string;
  entries: LvnEntry[];
  /** Number of redundancies found */
  redundantCount: number;
  /** Number of constants folded */
  constantFoldCount: number;
}

export interface LvnResult {
  blocks: LvnBlockResult[];
  totalRedundant: number;
  totalFolded: number;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Try to parse a statement "x = a op b" or "x = a" or "x op= y" etc. */
function parseAssignment(stmt: string): { lhs: string | null; op: string | null; operands: string[] } {
  const s = stmt.trim().replace(/;$/, '').trim();
  // Compound assignments: s += a[i]  →  s = s + a[i]
  const compound = s.match(/^(\w+)\s*(\+=|-=|\*=|\/=|%=)\s*(.+)$/);
  if (compound) {
    const lhs = compound[1];
    const opMap: Record<string, string> = { '+=': '+', '-=': '-', '*=': '*', '/=': '/', '%=': '%' };
    return { lhs, op: opMap[compound[2]], operands: [lhs, compound[3].trim()] };
  }
  // Simple declaration: int x = expr  or  int x
  const decl = s.match(/^(?:int|long|float|double|String|boolean|char|var)\s+(\w+)(?:\s*=\s*(.+))?$/);
  if (decl) {
    if (decl[2] !== undefined) {
      const expr = decl[2].trim();
      const binOp = expr.match(/^(.+?)\s*([+\-*/%><&|^]|>>|<<|&&|\|\|)\s*(.+)$/);
      if (binOp) {
        return { lhs: decl[1], op: binOp[2].trim(), operands: [binOp[1].trim(), binOp[3].trim()] };
      }
      // single operand (copy or literal)
      return { lhs: decl[1], op: null, operands: [expr] };
    }
    return { lhs: decl[1], op: null, operands: [] };
  }
  // Assignment: x = expr
  const assign = s.match(/^(\w+)\s*=\s*(.+)$/);
  if (assign) {
    const lhs = assign[1];
    const expr = assign[2].trim();
    // array access: a[i] — treat as single operand
    // ternary: a>b?a:b — treat as single operand
    if (expr.includes('?')) {
      return { lhs, op: null, operands: [expr] };
    }
    const binOp = expr.match(/^(.+?)\s*([+\-*/%><&|^]|>>|<<|&&|\|\|)\s*(.+)$/);
    if (binOp) {
      return { lhs, op: binOp[2].trim(), operands: [binOp[1].trim(), binOp[3].trim()] };
    }
    return { lhs, op: null, operands: [expr] };
  }
  // Increment / decrement: i++ / n-- / ++x
  if (/^\w+\+\+$/.test(s) || /^\w+--$/.test(s) || /^\+\+\w+$/.test(s) || /^--\w+$/.test(s)) {
    const v = s.replace(/\+\+|--/g, '').trim();
    return { lhs: v, op: '+', operands: [v, '1'] };
  }
  // Bare expression (condition etc.)
  return { lhs: null, op: null, operands: s ? [s] : [] };
}

function isNumericLiteral(s: string): boolean {
  return /^-?\d+(\.\d+)?$/.test(s.trim());
}

function evaluateConstant(a: string, op: string, b: string): string | null {
  if (!isNumericLiteral(a) || !isNumericLiteral(b)) return null;
  const av = Number(a), bv = Number(b);
  switch (op) {
    case '+': return String(av + bv);
    case '-': return String(av - bv);
    case '*': return String(av * bv);
    case '/': return bv !== 0 ? String(Math.trunc(av / bv)) : null;
    case '%': return bv !== 0 ? String(av % bv) : null;
    default: return null;
  }
}

/** Check simple algebraic identities */
function checkIdentity(op: string, operands: string[], operandNumbers: number[]): string | null {
  if (operands.length === 2) {
    const [a, b] = operands;
    const [an, bn] = operandNumbers;
    // x + 0 = x, 0 + x = x, x - 0 = x, x * 1 = x, 1 * x = x, x * 0 = 0, 0 * x = 0
    if (op === '+' && b === '0') return `${a} + 0 → ${a}`;
    if (op === '+' && a === '0') return `0 + ${b} → ${b}`;
    if (op === '-' && b === '0') return `${a} - 0 → ${a}`;
    if (op === '*' && b === '1') return `${a} × 1 → ${a}`;
    if (op === '*' && a === '1') return `1 × ${b} → ${b}`;
    if (op === '*' && (a === '0' || b === '0')) return `${a} × ${b} → 0`;
    if (op === '+' && an === bn) {
      // x + x — not redundant, but note
    }
  }
  return null;
}

// ---------------------------------------------------------------------------
// Core algorithm — runs on a single block's statement list
// ---------------------------------------------------------------------------

function runLvnOnBlock(blockId: number, label: string, statements: string[]): LvnBlockResult {
  // Map from variable name → current value number
  const varToNum = new Map<string, number>();
  // Map from expression hash key → { valueNumber, defIndex }
  const exprTable = new Map<string, { vn: number; defIndex: number }>();
  let nextVn = 0;
  const entries: LvnEntry[] = [];
  let redundantCount = 0;
  let constantFoldCount = 0;

  function getOrCreateVn(name: string): number {
    // Numeric literals get a stable vn based on the literal text
    if (isNumericLiteral(name)) {
      const key = `#lit:${name}`;
      if (exprTable.has(key)) return exprTable.get(key)!.vn;
      const vn = nextVn++;
      exprTable.set(key, { vn, defIndex: -1 });
      return vn;
    }
    if (varToNum.has(name)) return varToNum.get(name)!;
    const vn = nextVn++;
    varToNum.set(name, vn);
    return vn;
  }

  for (let idx = 0; idx < statements.length; idx++) {
    const text = statements[idx];
    const parsed = parseAssignment(text);

    // No assignment — treat as a use
    if (parsed.lhs === null) {
      entries.push({
        index: idx, text, lhs: null, op: null,
        operands: parsed.operands, valueNumber: -1,
        operandNumbers: [], hashKey: null,
        isRedundant: false, redundantWith: null,
        isConstantFold: false, foldedValue: null,
        identityApplied: null,
      });
      continue;
    }

    // Resolve operand value numbers
    const operandNumbers: number[] = parsed.operands.map(o => getOrCreateVn(o));

    // Constant folding
    let isConstantFold = false;
    let foldedValue: string | null = null;
    if (parsed.op && parsed.operands.length === 2) {
      const folded = evaluateConstant(parsed.operands[0], parsed.op, parsed.operands[1]);
      if (folded !== null) {
        isConstantFold = true;
        foldedValue = folded;
        constantFoldCount++;
      }
    }

    // Identity check
    const identity = parsed.op ? checkIdentity(parsed.op, parsed.operands, operandNumbers) : null;

    // Build hash key (sorted for commutative ops)
    let hashKey: string | null = null;
    if (parsed.op && parsed.operands.length === 2 && !isConstantFold) {
      const commutative = new Set(['+', '*', '&', '|', '^', '&&', '||']);
      let key: string;
      if (commutative.has(parsed.op)) {
        const sorted = [...operandNumbers].sort((a, b) => a - b);
        key = `${sorted[0]}${parsed.op}${sorted[1]}`;
      } else {
        key = `${operandNumbers[0]}${parsed.op}${operandNumbers[1]}`;
      }
      hashKey = key;
    } else if (!parsed.op && parsed.operands.length === 1 && !isConstantFold) {
      // Copy: hash key is just the operand's value number
      hashKey = `#copy:${operandNumbers[0]}`;
    }

    // Check redundancy
    let isRedundant = false;
    let redundantWith: number | null = null;
    let valueNumber: number;

    if (hashKey !== null && exprTable.has(hashKey)) {
      const existing = exprTable.get(hashKey)!;
      isRedundant = true;
      redundantWith = existing.defIndex;
      valueNumber = existing.vn;
      redundantCount++;
    } else {
      valueNumber = nextVn++;
      if (hashKey !== null) {
        exprTable.set(hashKey, { vn: valueNumber, defIndex: idx });
      }
    }

    // Update variable → value number mapping
    varToNum.set(parsed.lhs, valueNumber);

    entries.push({
      index: idx, text, lhs: parsed.lhs, op: parsed.op,
      operands: parsed.operands, valueNumber,
      operandNumbers, hashKey,
      isRedundant, redundantWith,
      isConstantFold, foldedValue,
      identityApplied: identity,
    });
  }

  return { blockId, blockLabel: label, entries, redundantCount, constantFoldCount };
}

// ---------------------------------------------------------------------------
// Public entry — runs LVN on every block in a method
// ---------------------------------------------------------------------------

import type { CfgMethod } from '../../types';

export function runLvn(method: CfgMethod): LvnResult {
  const blocks: LvnBlockResult[] = [];
  let totalRedundant = 0;
  let totalFolded = 0;

  for (const block of method.blocks) {
    const r = runLvnOnBlock(block.id, block.label, block.statements);
    blocks.push(r);
    totalRedundant += r.redundantCount;
    totalFolded += r.constantFoldCount;
  }

  return { blocks, totalRedundant, totalFolded };
}
