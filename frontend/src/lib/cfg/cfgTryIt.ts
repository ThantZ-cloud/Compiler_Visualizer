import type { CfgMethod, CfgNode, CfgEdge } from '../../types';

// ---------------------------------------------------------------------------
// Presets — each is a self-contained example with a short label
// ---------------------------------------------------------------------------
export interface CfgPreset {
  label: string;
  code: string;
}

export const CFG_TRYIT_PRESETS: CfgPreset[] = [
  {
    label: 'Straight line',
    code: 'int a = k + 2;\nint c = d - b;\nint d2 = a + b;',
  },
  {
    label: 'If-else',
    code: 'int a = k + 2;\nif (a > b)\n  d = a + b;\nelse\n  d = b * 2;',
  },
  {
    label: 'Loop',
    code: 'int s = 0;\nfor (int i = 0; i < n; i++)\n  s += a[i];',
  },
  {
    label: 'While',
    code: 'int x = 1;\nwhile (n > 1) {\n  x = x * n;\n  n = n - 1;\n}',
  },
  {
    label: 'Nested if',
    code: 'if (a > 0)\n  if (b > 0) c = 1;\n  else c = 2;\nelse c = 3;',
  },
  {
    label: 'SSA Example',
    code: 'int a = k + 2;\nint c = d - b;\nint d2 = a + b;\nif (b > d2) {\n  int f = b - d2;\n  int k2 = d2 >> 2;\n} else {\n  d2 = b * 2;\n}\nint k3 = a - c;',
  },
  {
    label: 'Redundant expr (LVN)',
    code: 'int t1 = b + c;\nint t2 = a - d;\nint t3 = b + c;\nint t4 = a - d;',
  },
];

// ---------------------------------------------------------------------------
// Mini Java → CFG parser (Option B)
// Parses a small subset of Java into basic blocks + edges.
// Supports: declarations, assignments, if/else, for, while, blocks { }.
// ---------------------------------------------------------------------------

/** Strip single-line comments and trim */
function cleanLine(raw: string): string {
  const noComment = raw.replace(/\/\/.*$/, '');
  return noComment.trim();
}

/**
 * Split raw code into logical statements / control-flow tokens.
 * Handles braces, semicolons, and control-flow keywords.
 */
function tokenizeCode(code: string): string[] {
  const tokens: string[] = [];
  let buf = '';
  let i = 0;
  // depth of parentheses — while inside for(...), semicolons are NOT statement terminators
  let parenDepth = 0;
  let inForHeader = false;

  while (i < code.length) {
    const ch = code[i];
    if (ch === '/' && code[i + 1] === '/') {
      while (i < code.length && code[i] !== '\n') i++;
      if (buf.trim()) { tokens.push(buf.trim()); buf = ''; }
      continue;
    }
    // Track whether we just entered a for-header region
    if (!inForHeader && buf.trimStart().startsWith('for') && ch === '(') {
      inForHeader = true;
    }
    if (ch === '(') parenDepth++;
    if (ch === ')') {
      parenDepth = Math.max(0, parenDepth - 1);
      if (inForHeader && parenDepth === 0) inForHeader = false;
      buf += ch; i++;
      // If buf is now a complete for/if/while header, emit it as one token
      const trimmed = buf.trim();
      if (/^(for|while|if)\s*\(.*\)$/.test(trimmed) && parenDepth === 0) {
        tokens.push(trimmed);
        buf = '';
      }
      continue;
    }
    if (ch === '{' || ch === '}') {
      if (buf.trim()) tokens.push(buf.trim());
      tokens.push(ch);
      buf = '';
      i++;
      continue;
    }
    if (ch === ';') {
      // Inside for(...) header, semicolon is part of the header, not a statement terminator
      if (inForHeader) { buf += ch; i++; continue; }
      buf += ch;
      tokens.push(buf.trim());
      buf = '';
      i++;
      continue;
    }
    if (ch === '\n') {
      const trimmed = buf.trim();
      if (trimmed === 'else' || trimmed.startsWith('else ') || trimmed === 'else{') {
        tokens.push(trimmed);
        buf = '';
      }
      buf += ' ';
      i++;
      continue;
    }
    buf += ch;
    i++;
  }
  if (buf.trim()) tokens.push(buf.trim());
  return tokens.filter(t => t.length > 0);
}

// ---------------------------------------------------------------------------
// AST-like structure for control flow
// ---------------------------------------------------------------------------
type Stmt =
  | { kind: 'assign'; text: string }
  | { kind: 'if'; cond: string; thenStmts: Stmt[]; elseStmts: Stmt[] | null }
  | { kind: 'for'; header: string; body: Stmt[] }
  | { kind: 'while'; cond: string; body: Stmt[] };

function parseStatements(tokens: string[], pos: { i: number }): Stmt[] {
  const stmts: Stmt[] = [];
  while (pos.i < tokens.length) {
    const tok = tokens[pos.i];

    if (tok === '}') break;

    if (tok === '{') {
      pos.i++;
      const inner = parseStatements(tokens, pos);
      // consume closing brace is done by caller
      if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
      stmts.push(...inner);
      continue;
    }

    // if statement
    if (/^if\s*\(/.test(tok)) {
      const condMatch = tok.match(/^if\s*\((.*)\)\s*$/);
      const cond = condMatch ? condMatch[1] : tok.replace(/^if\s*/, '');
      pos.i++;
      // then branch — either a block or single statement
      let thenStmts: Stmt[];
      if (pos.i < tokens.length && tokens[pos.i] === '{') {
        pos.i++;
        thenStmts = parseStatements(tokens, pos);
        if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
      } else if (pos.i < tokens.length) {
        const single = tokens[pos.i];
        pos.i++;
        if (single === '{') {
          const inner = parseStatements(tokens, pos);
          if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
          thenStmts = inner;
        } else {
          thenStmts = [{ kind: 'assign', text: cleanStmt(single) }];
        }
      } else {
        thenStmts = [];
      }
      // else branch
      let elseStmts: Stmt[] | null = null;
      if (pos.i < tokens.length && /^\s*else\b/.test(tokens[pos.i])) {
        const elseTok = tokens[pos.i];
        const afterElse = elseTok.replace(/^\s*else\s*/, '').trim();
        pos.i++;
        if (afterElse) {
          // "else d = b*2;" on same token
          if (afterElse === '{') {
            pos.i++; // already consumed?
            elseStmts = parseStatements(tokens, pos);
            if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
          } else {
            elseStmts = [{ kind: 'assign', text: cleanStmt(afterElse) }];
          }
        } else if (pos.i < tokens.length && tokens[pos.i] === '{') {
          pos.i++;
          elseStmts = parseStatements(tokens, pos);
          if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
        } else if (pos.i < tokens.length) {
          const single = tokens[pos.i];
          pos.i++;
          if (single === '{') {
            const inner = parseStatements(tokens, pos);
            if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
            elseStmts = inner;
          } else {
            elseStmts = [{ kind: 'assign', text: cleanStmt(single) }];
          }
        } else {
          elseStmts = [];
        }
      }
      stmts.push({ kind: 'if', cond: cond.trim(), thenStmts, elseStmts });
      continue;
    }

    // for loop
    if (/^for\s*\(/.test(tok)) {
      const header = tok;
      pos.i++;
      let body: Stmt[];
      if (pos.i < tokens.length && tokens[pos.i] === '{') {
        pos.i++;
        body = parseStatements(tokens, pos);
        if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
      } else if (pos.i < tokens.length) {
        const single = tokens[pos.i];
        pos.i++;
        if (single === '{') {
          const inner = parseStatements(tokens, pos);
          if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
          body = inner;
        } else {
          body = [{ kind: 'assign', text: cleanStmt(single) }];
        }
      } else {
        body = [];
      }
      stmts.push({ kind: 'for', header: header.trim(), body });
      continue;
    }

    // while loop
    if (/^while\s*\(/.test(tok)) {
      const condMatch = tok.match(/^while\s*\((.*)\)\s*$/);
      const cond = condMatch ? condMatch[1] : tok.replace(/^while\s*/, '');
      pos.i++;
      let body: Stmt[];
      if (pos.i < tokens.length && tokens[pos.i] === '{') {
        pos.i++;
        body = parseStatements(tokens, pos);
        if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
      } else if (pos.i < tokens.length) {
        const single = tokens[pos.i];
        pos.i++;
        if (single === '{') {
          const inner = parseStatements(tokens, pos);
          if (pos.i < tokens.length && tokens[pos.i] === '}') pos.i++;
          body = inner;
        } else {
          body = [{ kind: 'assign', text: cleanStmt(single) }];
        }
      } else {
        body = [];
      }
      stmts.push({ kind: 'while', cond: cond.trim(), body });
      continue;
    }

    // plain assignment / declaration
    const cleaned = cleanStmt(tok);
    if (cleaned) {
      stmts.push({ kind: 'assign', text: cleaned });
    }
    pos.i++;
  }
  return stmts;
}

function cleanStmt(raw: string): string {
  let s = cleanLine(raw);
  // remove leading "int ", "long " etc for display but keep them — they are part of the stmt
  s = s.replace(/;$/, '').trim();
  // skip empty or brace-only
  if (!s || s === '{' || s === '}') return '';
  return s;
}

// ---------------------------------------------------------------------------
// CFG builder — converts Stmt[] into blocks + edges
// ---------------------------------------------------------------------------
function buildCfg(stmts: Stmt[]): { blocks: CfgNode[]; edges: CfgEdge[] } {
  const blocks: CfgNode[] = [];
  const edges: CfgEdge[] = [];
  let nextId = 0;

  function newBlock(label: string, type: string): CfgNode {
    const b: CfgNode = { id: nextId++, label, type, statements: [] };
    blocks.push(b);
    return b;
  }

  function addEdge(from: number, to: number, label: string) {
    edges.push({ from, to, label });
  }

  /**
   * Build CFG for a statement list.
   * Returns { entry, exits } where entry is the first block id and
   * exits are block ids that fall through (need to connect to next block).
   */
  function buildStmts(
    stmts: Stmt[],
    labelPrefix: string,
  ): { entry: number | null; exits: number[] } {
    if (stmts.length === 0) return { entry: null, exits: [] };

    let curBlock: CfgNode | null = null;
    let firstEntry: number | null = null;
    let pendingExits: number[] = [];

    // helper to get or create current block for straight-line code
    function cur(): CfgNode {
      if (!curBlock) {
        curBlock = newBlock(labelPrefix, 'normal');
        if (firstEntry === null) firstEntry = curBlock.id;
        // connect pending exits to this new block
        for (const eid of pendingExits) {
          addEdge(eid, curBlock.id, '');
        }
        pendingExits = [];
      }
      return curBlock;
    }

    for (const stmt of stmts) {
      if (stmt.kind === 'assign') {
        cur().statements.push(stmt.text);
      } else if (stmt.kind === 'if') {
        // flush current block
        const beforeIf = curBlock;
        // condition block
        const condBlock = newBlock(`${stmt.cond} ?`, 'condition');
        if (firstEntry === null) firstEntry = condBlock.id;
        if (beforeIf) {
          addEdge(beforeIf.id, condBlock.id, '');
        } else {
          // connect pending exits
          for (const eid of pendingExits) addEdge(eid, condBlock.id, '');
          pendingExits = [];
        }
        // close current
        curBlock = null;

        // then branch
        const thenRes = buildStmts(stmt.thenStmts, 'then');
        // else branch
        const elseRes = stmt.elseStmts ? buildStmts(stmt.elseStmts, 'else') : null;

        // merge block (after if)
        const mergeBlock = newBlock('merge', 'merge');

        // wire cond → then / else / merge
        if (thenRes.entry !== null) {
          addEdge(condBlock.id, thenRes.entry, 'true');
          for (const e of thenRes.exits) addEdge(e, mergeBlock.id, '');
        } else {
          addEdge(condBlock.id, mergeBlock.id, 'true');
        }
        if (elseRes && elseRes.entry !== null) {
          addEdge(condBlock.id, elseRes.entry, 'false');
          for (const e of elseRes.exits) addEdge(e, mergeBlock.id, '');
        } else if (elseRes && elseRes.entry === null) {
          // empty else — still need false edge
          addEdge(condBlock.id, mergeBlock.id, 'false');
        } else {
          addEdge(condBlock.id, mergeBlock.id, 'false');
        }

        // merge becomes the new "current" — subsequent straight-line goes here
        curBlock = mergeBlock;
        if (firstEntry === null) firstEntry = condBlock.id;
        // pending exits are now just the merge block (it will be connected to next)
        // but if there are more statements after, they should append to merge
        // so we keep curBlock = mergeBlock
      } else if (stmt.kind === 'for' || stmt.kind === 'while') {
        // For textbook for-loop CFG: extract only the condition part.
        // for(init; cond; update) → header shows "cond ?" and init is emitted as a preceding block.
        let condText: string;
        let forInit: string | null = null;
        if (stmt.kind === 'for') {
          // stmt.header is like "for (int i = 0; i < n; i++)"
          const m = stmt.header.match(/for\s*\(\s*(.*?)\s*;\s*(.*?)\s*;\s*(.*?)\s*\)/);
          if (m) {
            forInit = m[1].trim() || null;
            condText = (m[2].trim() || 'true') + ' ?';
          } else {
            condText = stmt.header + ' ?';
          }
        } else {
          condText = `${stmt.cond} ?`;
        }
        const beforeLoop = curBlock;

        // Emit for-init as its own block before the header (if present)
        if (forInit) {
          const initBlock = newBlock('init', 'normal');
          initBlock.statements.push(forInit);
          if (beforeLoop) addEdge(beforeLoop.id, initBlock.id, '');
          else for (const eid of pendingExits) addEdge(eid, initBlock.id, '');
          pendingExits = [];
          if (firstEntry === null) firstEntry = initBlock.id;
          curBlock = initBlock;
          // header follows init
          const headerBlock2 = newBlock(condText, 'condition');
          if (firstEntry === null) firstEntry = headerBlock2.id;
          addEdge(initBlock.id, headerBlock2.id, '');
          // proceed with body using headerBlock2
          const headerBlock = headerBlock2;
          curBlock = null;
          const bodyRes = buildStmts(stmt.body, 'body');
          const exitBlock = newBlock('exit', 'exit');
          if (bodyRes.entry !== null) {
            addEdge(headerBlock.id, bodyRes.entry, 'true');
            for (const e of bodyRes.exits) addEdge(e, headerBlock.id, 'loop');
          } else {
            addEdge(headerBlock.id, headerBlock.id, 'loop');
          }
          addEdge(headerBlock.id, exitBlock.id, 'false');
          curBlock = exitBlock;
        } else {
          const headerBlock = newBlock(condText, 'condition');
          if (firstEntry === null) firstEntry = headerBlock.id;
          if (beforeLoop) {
            addEdge(beforeLoop.id, headerBlock.id, '');
          } else {
            for (const eid of pendingExits) addEdge(eid, headerBlock.id, '');
            pendingExits = [];
          }
          curBlock = null;
          const bodyRes = buildStmts(stmt.body, 'body');
          const exitBlock = newBlock('exit', 'exit');
          if (bodyRes.entry !== null) {
            addEdge(headerBlock.id, bodyRes.entry, 'true');
            for (const e of bodyRes.exits) addEdge(e, headerBlock.id, 'loop');
          } else {
            addEdge(headerBlock.id, headerBlock.id, 'loop');
          }
          addEdge(headerBlock.id, exitBlock.id, 'false');
          curBlock = exitBlock;
        }



      }
    }

    // collect exits — the current block (if any) is the fall-through
    const exits: number[] = [];
    if (curBlock) exits.push(curBlock.id);
    // also any pending exits that were not connected (should be empty normally)
    exits.push(...pendingExits);
    return { entry: firstEntry, exits };
  }

  // Wrap: entry block + body + return
  const entry = newBlock('entry', 'entry');
  const bodyRes = buildStmts(stmts, 'B');

  if (bodyRes.entry !== null) {
    // if body starts with straight-line, it already has a block; merge entry if needed
    // check if first body block is the same as entry's successor
    addEdge(entry.id, bodyRes.entry, '');
    // final exit block
    const finalExit = newBlock('exit', 'exit');
    finalExit.statements = ['return'];
    for (const e of bodyRes.exits) {
      // avoid self-loop for exit
      if (e !== finalExit.id) addEdge(e, finalExit.id, '');
    }
    // handle empty exit block merging
    if (bodyRes.exits.length === 0) {
      addEdge(entry.id, finalExit.id, '');
    }
  } else {
    // no body — entry → exit
    const finalExit = newBlock('exit', 'exit');
    finalExit.statements = ['return'];
    addEdge(entry.id, finalExit.id, '');
  }

  // Clean up empty blocks (except entry/exit) — merge them away
  // Keep blocks that have statements or are branch points
  // (all blocks are kept — even empty merge blocks are structural join points)
  // But we need to keep all blocks that are referenced by edges and have structural meaning
  // For simplicity, keep all blocks and just ensure merge blocks with no statements get a placeholder
  for (const b of blocks) {
    if (b.statements.length === 0 && b.type === 'merge' && b.label === 'merge') {
      // keep as is — it's a join point
    }
  }

  // Re-number blocks sequentially and remap edges
  const idMap = new Map<number, number>();
  blocks.forEach((b, idx) => idMap.set(b.id, idx));
  const renumbered: CfgNode[] = blocks.map((b, idx) => ({ ...b, id: idx }));
  const renumberedEdges: CfgEdge[] = edges.map(e => ({
    from: idMap.get(e.from) ?? e.from,
    to: idMap.get(e.to) ?? e.to,
    label: e.label,
  })).filter(e => e.from !== e.to || blocks[e.from]?.type === 'condition'); // keep loop self-edges only for condition blocks

  // Remove duplicate edges
  const seen = new Set<string>();
  const deduped: CfgEdge[] = [];
  for (const e of renumberedEdges) {
    const key = `${e.from}->${e.to}:${e.label}`;
    if (!seen.has(key)) { seen.add(key); deduped.push(e); }
  }

  return { blocks: renumbered, edges: deduped };
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

export function buildCfgTryItData(code: string): { methods: CfgMethod[]; cfgJson: string } {
  const trimmed = code.trim();
  if (!trimmed) {
    const method: CfgMethod = {
      name: 'main', declaringType: 'TryIt', returnType: 'void', kind: 'method',
      parameters: [],
      blocks: [
        { id: 0, label: 'entry', type: 'entry', statements: [] },
        { id: 1, label: 'exit', type: 'exit', statements: ['return'] },
      ],
      edges: [{ from: 0, to: 1, label: '' }],
    };
    return { methods: [method], cfgJson: JSON.stringify({ methods: [method] }) };
  }

  try {
    const tokens = tokenizeCode(trimmed);
    const stmts = parseStatements(tokens, { i: 0 });
    if (stmts.length === 0) {
      // fallback: treat as single block
      const method: CfgMethod = {
        name: 'main', declaringType: 'TryIt', returnType: 'void', kind: 'method',
        parameters: [],
        blocks: [
          { id: 0, label: 'entry', type: 'entry', statements: [trimmed.slice(0, 60)] },
          { id: 1, label: 'exit', type: 'exit', statements: ['return'] },
        ],
        edges: [{ from: 0, to: 1, label: '' }],
      };
      return { methods: [method], cfgJson: JSON.stringify({ methods: [method] }) };
    }
    const { blocks, edges } = buildCfg(stmts);
    const method: CfgMethod = {
      name: 'main', declaringType: 'TryIt', returnType: 'void', kind: 'method',
      parameters: [],
      blocks,
      edges,
    };
    return { methods: [method], cfgJson: JSON.stringify({ methods: [method] }) };
  } catch {
    // on parse error, return single-block fallback
    const method: CfgMethod = {
      name: 'main', declaringType: 'TryIt', returnType: 'void', kind: 'method',
      parameters: [],
      blocks: [
        { id: 0, label: 'entry', type: 'entry', statements: [trimmed.slice(0, 60)] },
        { id: 1, label: 'exit', type: 'exit', statements: ['return'] },
      ],
      edges: [{ from: 0, to: 1, label: '' }],
    };
    return { methods: [method], cfgJson: JSON.stringify({ methods: [method] }) };
  }
}
