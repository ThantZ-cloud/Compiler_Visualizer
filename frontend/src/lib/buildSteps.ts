import type { CompileResponse, Token } from '../types';
import { parseAst, flattenAst, getNodeLabel, type AstNode } from './astUtils';

export type StageId = 'lexer' | 'parser' | 'semantic' | 'ir' | 'codegen';

export const STAGE_ORDER: StageId[] = ['lexer', 'parser', 'semantic', 'ir', 'codegen'];

export interface Step {
  stage: StageId;
  /** Index within the stage's item array (token index, AST BFS id, line no., …). */
  ref: number;
  text: string;
}

export interface SemanticItem {
  label: string;
  kind: string;
}

export interface IrItem {
  id: number;
  label: string;
  method: string;
}

// Per-stage caps keep the playback manageable for large programs.
const CAPS: Record<StageId, number> = {
  lexer: 100,
  parser: 150,
  semantic: 80,
  ir: 80,
  codegen: 100,
};

const truncate = (s: string, n = 18): string =>
  s.length > n ? s.slice(0, n - 1) + '\u2026' : s;

/** Non-whitespace, non-comment tokens — the meaningful lexer output. */
export function getLexerItems(result: CompileResponse): Token[] {
  return (result.tokens || []).filter(t => {
    const u = t.type.toUpperCase();
    return !u.includes('WHITESPACE') && !u.includes('COMMENT');
  });
}

export function getAstItems(result: CompileResponse): AstNode[] {
  return flattenAst(parseAst(result.astJson));
}

/** Flatten the symbol table into a readable list of registered symbols. */
export function getSemanticItems(result: CompileResponse): SemanticItem[] {
  const items: SemanticItem[] = [];
  let data: any;
  try {
    data = JSON.parse(result.symbolTableJson || '{}');
  } catch {
    return items;
  }
  if (data.error) return items;

  const types = Array.isArray(data.types) ? data.types : [];
  const walkType = (type: any) => {
    if (!type || typeof type !== 'object') return;
    items.push({ label: `${type.kind || 'type'} ${type.name || ''}`.trim(), kind: type.kind || 'type' });
    const members = Array.isArray(type.members) ? type.members : [];
    members.forEach((m: any) => {
      if (!m || typeof m !== 'object') return;
      if (m.kind === 'method' || m.kind === 'constructor') {
        const params = Array.isArray(m.parameters)
          ? m.parameters.map((p: any) => `${p.type?.name || 'var'} ${p.name}`).join(', ')
          : '';
        const ret = m.returnType?.name ? ` → ${m.returnType.name}` : '';
        items.push({ label: `${m.kind} ${m.name}(${params})${ret}`, kind: m.kind });
      } else if (m.kind === 'field') {
        const vars = Array.isArray(m.variables) ? m.variables : [];
        vars.forEach((v: any) => {
          items.push({ label: `field ${v.name}: ${v.type?.name || 'var'}`, kind: 'field' });
        });
      } else if (m.kind) {
        walkType(m);
      }
    });
  };
  types.forEach(walkType);
  return items;
}

/** Flatten every method's basic blocks into a single IR list. */
export function getIrItems(result: CompileResponse): IrItem[] {
  const items: IrItem[] = [];
  let data: any;
  try {
    data = JSON.parse(result.cfgJson || '{}');
  } catch {
    return items;
  }
  if (data.error) return items;
  const methods = Array.isArray(data.methods) ? data.methods : [];
  methods.forEach((m: any) => {
    const blocks = Array.isArray(m.blocks) ? m.blocks : [];
    blocks.forEach((b: any) => {
      items.push({
        id: b.id ?? items.length,
        label: b.label || `Block ${b.id ?? items.length}`,
        method: m.name || 'unknown',
      });
    });
  });
  return items;
}

/** Non-empty bytecode lines. */
export function getCodegenItems(result: CompileResponse): string[] {
  return (result.bytecode || '')
    .split('\n')
    .map(l => l.trim())
    .filter(l => l.length > 0);
}

/** Build the ordered, cross-stage step list from a compile result. */
export function buildSteps(result: CompileResponse): Step[] {
  const steps: Step[] = [];

  getLexerItems(result).slice(0, CAPS.lexer).forEach((t, i) => {
    steps.push({
      stage: 'lexer',
      ref: i,
      text: `Lexer read '${truncate(t.value)}' → ${t.type}`,
    });
  });

  getAstItems(result).slice(0, CAPS.parser).forEach((node, i) => {
    steps.push({
      stage: 'parser',
      ref: i,
      text: `Parser created ${getNodeLabel(node.type, node.name, node.value)}`,
    });
  });

  getSemanticItems(result).slice(0, CAPS.semantic).forEach((item, i) => {
    steps.push({
      stage: 'semantic',
      ref: i,
      text: `Semantic analyzer registered ${item.label}`,
    });
  });

  getIrItems(result).slice(0, CAPS.ir).forEach((item, i) => {
    steps.push({
      stage: 'ir',
      ref: i,
      text: `IR built basic block #${item.id} (${item.method})`,
    });
  });

  getCodegenItems(result).slice(0, CAPS.codegen).forEach((line, i) => {
    steps.push({
      stage: 'codegen',
      ref: i,
      text: `Code Gen emitted: ${truncate(line, 40)}`,
    });
  });

  return steps;
}
