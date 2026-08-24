import React, { useMemo, useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import { buildAstTryItData, PDA_TRYIT_PRESETS } from '../../lib/parser/astTryIt';
import '../AstTree.css';

interface AstNode {
  type: string;
  name?: string;
  value?: string;
  line?: number;
  column?: number;
  children?: AstNode[];
}

interface AstTreeAnimationProps {
  astJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

const NODE_COLORS: Record<string, string> = {
  CompilationUnit: '#4ec9b0',
  PackageDeclaration: '#4ec9b0',
  ImportDeclaration: '#808080',
  ClassOrInterfaceDeclaration: '#4ec9b0',
  EnumDeclaration: '#4ec9b0',
  RecordDeclaration: '#4ec9b0',
  MethodDeclaration: '#dcdcaa',
  ConstructorDeclaration: '#dcdcaa',
  FieldDeclaration: '#569cd6',
  Parameter: '#9cdcfe',
  VariableDeclarator: '#9cdcfe',
  BlockStmt: '#569cd6',
  ExpressionStmt: '#d4d4d4',
  ReturnStmt: '#c586c0',
  IfStmt: '#c586c0',
  ForStmt: '#c586c0',
  WhileStmt: '#c586c0',
  MethodCallExpr: '#dcdcaa',
  NameExpr: '#9cdcfe',
  FieldAccessExpr: '#9cdcfe',
  StringLiteralExpr: '#ce9178',
  IntegerLiteralExpr: '#b5cea8',
  LongLiteralExpr: '#b5cea8',
  DoubleLiteralExpr: '#b5cea8',
  BooleanLiteralExpr: '#569cd6',
  CharLiteralExpr: '#ce9178',
  BinaryExpr: '#d4d4d4',
  UnaryExpr: '#d4d4d4',
  AssignExpr: '#d4d4d4',
  ObjectCreationExpr: '#4ec9b0',
  TypeDeclaration: '#4ec9b0',
};

function getNodeColor(type: string): string {
  if (type === 'Op') return '#dcdcaa';
  if (type === 'Operand') return '#4ec9b0';
  return NODE_COLORS[type] || '#d4d4d4';
}

function getNodeLabel(type: string, name?: string): string {
  // Try-It AST nodes show only the operator/operand symbol — no type prefixes
  if (type === 'Op' || type === 'Operand') return name ?? '';
  const shortType = type
    .replace('Declaration', 'Decl')
    .replace('Expression', 'Expr')
    .replace('Statement', 'Stmt');
  return name ? `${shortType}: ${name}` : shortType;
}

function parseAstJson(jsonStr: string): AstNode | null {
  try {
    const parsed = JSON.parse(jsonStr) as { error?: boolean } | RawAstNode;
    if (parsed && typeof parsed === 'object' && 'error' in parsed) return null;
    return convertToAstNode(parsed as RawAstNode | null | undefined);
  } catch {
    return null;
  }
}

interface RawAstNode {
  type?: unknown;
  name?: unknown;
  method?: unknown;
  field?: unknown;
  value?: unknown;
  line?: unknown;
  column?: unknown;
  children?: unknown;
}

function convertToAstNode(obj: RawAstNode | null | undefined): AstNode {
  if (!obj || typeof obj !== 'object') {
    return { type: 'Unknown', name: String(obj) };
  }
  const type = typeof obj.type === 'string' ? obj.type : 'Unknown';
  const name =
    (typeof obj.name === 'string' ? obj.name : '') ||
    (typeof obj.method === 'string' ? obj.method : '') ||
    (typeof obj.field === 'string' ? obj.field : '') ||
    (typeof obj.value === 'string' ? obj.value : '');
  const children: AstNode[] = [];
  if (Array.isArray(obj.children)) {
    obj.children.forEach((child) => {
      if (child && typeof child === 'object') children.push(convertToAstNode(child as RawAstNode));
    });
  }
  return {
    type,
    name,
    children: children.length > 0 ? children : undefined,
    value: typeof obj.value === 'string' ? obj.value : undefined,
    line: typeof obj.line === 'number' ? obj.line : undefined,
    column: typeof obj.column === 'number' ? obj.column : undefined,
  };
}

/** Post-order (children first) — iterative to avoid call-stack blow-up on deep nesting (ch.3 §3.5.4 depth 100+) */
function postOrder(root: AstNode): AstNode[] {
  const out: AstNode[] = [];
  const visited = new Set<AstNode>();
  const stack: { node: AstNode; idx: number }[] = [{ node: root, idx: 0 }];
  while (stack.length > 0) {
    const top = stack[stack.length - 1];
    if (visited.has(top.node)) { stack.pop(); continue; }
    const children = top.node.children ?? [];
    if (top.idx < children.length) {
      const child = children[top.idx++];
      if (!visited.has(child)) stack.push({ node: child, idx: 0 });
    } else {
      visited.add(top.node);
      out.push(top.node);
      stack.pop();
    }
  }
  return out;
}

const AstTreeAnimation: React.FC<AstTreeAnimationProps> = ({ astJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();
  const [revealCount, setRevealCount] = useState(0);
  const [treeSize, setTreeSize] = useState(0);
  const [view, setView] = useState<'TABLE' | 'TRYIT'>('TABLE');
  const [customInput, setCustomInput] = useState('a + b * c');
  const tryItResult = useMemo(() => buildAstTryItData(customInput), [customInput]);
  const activeJson = view === 'TRYIT' ? tryItResult.astJson : astJson;

  const treeSizeRef = useRef(0);

  useEffect(() => {
    if (view === 'TRYIT') {
      // Replay the build animation whenever the user expression changes
      setRevealCount(0);
      const interval = setInterval(() => {
        setRevealCount(prev => {
          if (treeSizeRef.current > 0 && prev >= treeSizeRef.current) {
            clearInterval(interval);
            return prev;
          }
          return prev + 1;
        });
      }, 380);
      return () => clearInterval(interval);
    }
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 380);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, view, activeJson]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !activeJson) return;
    const astData = parseAstJson(activeJson);
    if (!astData) return;

    const container = containerRef.current;
    const width = observedWidth || container.clientWidth || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const root = d3.hierarchy(astData);
    const depth = root.height || 1; // levels below the root
    // Natural full-height layout — the wrapper grows to fit, nothing is clipped.
    // Vertical mode derives height from depth only (container height feeds back otherwise).
    const treeHeight = (depth + 1) * 70;
    const treeWidth = Math.max(width - 250, 400);
    d3.tree<AstNode>().size([treeWidth, treeHeight])(root);

    const order = postOrder(astData);
    const revealed = new Set(order.slice(0, revealCount));
    const total = order.length;
    treeSizeRef.current = total;
    setTreeSize(total);

    // Links — fade in as both endpoints are revealed (child first)
    const links = root.links() as unknown as d3.HierarchyPointLink<AstNode>[];
    g.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.x)
        .y(d => d.y))
      .attr('opacity', d => revealed.has(d.source.data) ? 1 : 0);

    // Nodes pop in
    const nodesSel = g.selectAll<SVGGElement, d3.HierarchyPointNode<AstNode>>('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => revealed.has(d.data) ? 1 : 0)
      .attr('transform-origin', 'center');

    nodesSel.append('circle')
      .attr('r', d => (d.data.children ? 7 : 5))
      .attr('fill', d => getNodeColor(d.data.type))
      .attr('stroke', 'var(--color-card)')
      .attr('stroke-width', 1.5);

    nodesSel.append('text')
      .attr('dy', '0.31em')
      .attr('x', 0)
      .attr('dy', d => (d.children ? '-0.9em' : '1.9em'))
      .attr('text-anchor', 'middle')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        const display = d.data.value ? `${label} = ${d.data.value}` : label;
        return display.length > 30 ? `${display.substring(0, 30)}...` : display;
      })
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '11px');

    // Animate reveal with CSS transition on the group
    nodesSel.transition().duration(250).attr('opacity', d => (revealed.has(d.data) ? 1 : 0));

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x + 20;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
      // Grow the SVG to the full tree height so the bottom nodes stay visible.
      svg.attr('height', Math.ceil(bounds.height + 80));
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [activeJson, revealCount, observedWidth, view]);

  const subtitle =
    view === 'TRYIT'
      ? t('syntax.step4.tryItHint', { defaultValue: 'Try It — type your own expression and watch its abstract syntax tree grow: operators become internal nodes, names and numbers become leaves. Example: a + b × c' })
      : t('syntax.step4.description');

  const tabBtn = (label: string, key: 'TABLE' | 'TRYIT') => (
    <button
      key={key}
      onClick={() => setView(key)}
      className={`px-2.5 py-1 rounded text-[10px] font-mono font-bold tracking-wide border transition-colors ${view === key ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
    >
      {label}
    </button>
  );

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('syntax.step4.title')}
          <span className="ml-2 align-middle px-1.5 py-0.5 rounded border border-[var(--color-magenta)]/50 text-[9px] font-mono tracking-normal normal-case text-[var(--color-magenta)]">
            AST Construction
          </span>
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {subtitle}
        </p>
      </div>

      <div className="flex flex-wrap gap-1.5 mb-3">
        {[
          { key: 'TABLE' as const, labelKey: 'syntax.step4.tableView', fallback: 'Your Program' },
          { key: 'TRYIT' as const, labelKey: 'syntax.step4.tryItView', fallback: 'Try It' },
        ].map(v => tabBtn(t(v.labelKey, { defaultValue: v.fallback }), v.key))}
      </div>

      {view === 'TRYIT' && (
        <div className="flex flex-col gap-2 mb-3">
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-bold tracking-wide text-[var(--color-text-muted)] font-mono whitespace-nowrap">
              {t('syntax.step4.tryOwnInput', { defaultValue: 'Try your own expression:' })}
            </span>
            <input
              value={customInput}
              onChange={e => setCustomInput(e.target.value)}
              placeholder="a + b * c  or  (a + b) * c"
              className="flex-1 min-w-0 px-2 py-1.5 rounded border border-[var(--color-border-bright)] bg-[var(--color-card)] text-xs font-mono text-[var(--color-text)] focus:outline-none focus:border-[var(--color-neon)]"
              maxLength={48}
            />
            {!tryItResult.error && tryItResult.nodeCount > 0 && (
              <span className="text-[10px] font-mono text-[var(--color-amber)] whitespace-nowrap">
                {tryItResult.nodeCount} {t('syntax.step4.nodes')}
              </span>
            )}
          </div>
          {tryItResult.error && (
            <div className="text-[10px] font-mono text-[var(--color-error)] bg-[var(--color-error-dim)]/20 border border-[var(--color-error-dim)] rounded px-2 py-1">
              {tryItResult.error}
            </div>
          )}
          <div className="flex flex-wrap gap-1">
            {PDA_TRYIT_PRESETS.map(p => (
              <button
                key={p}
                onClick={() => setCustomInput(p)}
                className={`px-2 py-0.5 rounded text-[10px] font-mono border ${customInput === p ? 'bg-[var(--color-neon-dim)] text-[var(--color-neon)] border-[var(--color-neon)]' : 'bg-transparent text-[var(--color-text-muted)] border-[var(--color-border-bright)] hover:text-[var(--color-text)]'}`}
              >
                {p}
              </button>
            ))}
          </div>
        </div>
      )}

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('ast.title')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {Math.min(revealCount, treeSize)}/{treeSize} {t('syntax.step4.nodes')}
          </span>
        </div>
        <div className="ast-tree-wrapper" ref={(el) => { containerRef.current = el; roSetRef(el); }} style={{ minHeight: 420 }}>
          <svg ref={svgRef} width="100%" />
        </div>
      </div>
    </div>
  );
};

export default AstTreeAnimation;