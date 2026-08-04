// Shared AST parsing helpers used by the stepping engine and the AST canvas.
// Nodes are assigned stable ids in breadth-first order so a step's `ref`
// (its BFS index) always points at the same node in the rendered tree.

export interface AstNode {
  id: number;
  type: string;
  name?: string;
  value?: string;
  line?: number;
  column?: number;
  children?: AstNode[];
}

interface RawAst {
  type?: string;
  name?: string;
  method?: string;
  field?: string;
  value?: string;
  line?: number;
  column?: number;
  children?: RawAst[];
  error?: unknown;
}

function convert(obj: RawAst): AstNode {
  const type = obj.type || 'Unknown';
  const name = obj.name || obj.method || obj.field || '';
  const children = Array.isArray(obj.children)
    ? obj.children.filter(c => c && typeof c === 'object').map(convert)
    : undefined;

  return {
    id: -1, // assigned by assignBfsIds
    type,
    name: name || undefined,
    value: obj.value,
    line: obj.line,
    column: obj.column,
    children: children && children.length > 0 ? children : undefined,
  };
}

/** Assign sequential ids in breadth-first order (id === BFS index). */
function assignBfsIds(root: AstNode): void {
  let id = 0;
  const queue: AstNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    node.id = id++;
    if (node.children) queue.push(...node.children);
  }
}

/** Parse the backend's AST JSON into a tree of id-tagged nodes. */
export function parseAst(jsonStr: string | undefined): AstNode | null {
  if (!jsonStr) return null;
  try {
    const parsed: RawAst = JSON.parse(jsonStr);
    if (parsed.error) return null;
    const root = convert(parsed);
    assignBfsIds(root);
    return root;
  } catch {
    return null;
  }
}

/** Flatten the tree into a breadth-first ordered array. */
export function flattenAst(root: AstNode | null): AstNode[] {
  if (!root) return [];
  const out: AstNode[] = [];
  const queue: AstNode[] = [root];
  while (queue.length > 0) {
    const node = queue.shift()!;
    out.push(node);
    if (node.children) queue.push(...node.children);
  }
  return out;
}

/** Short, friendly node label, e.g. `BinaryExpr (+)` or `IntegerLiteralExpr (5)`. */
export function getNodeLabel(type: string, name?: string, value?: string): string {
  const short = type
    .replace('Declaration', 'Decl')
    .replace('Expression', 'Expr')
    .replace('Statement', 'Stmt');
  const detail = name || value;
  return detail ? `${short} (${detail})` : short;
}
