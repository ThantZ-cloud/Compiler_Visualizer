import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
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
  return NODE_COLORS[type] || '#d4d4d4';
}

function getNodeLabel(type: string, name?: string): string {
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

/** Post-order (children first) — the order reductions happen */
function postOrder(root: AstNode, out: AstNode[] = [], visited = new Set<AstNode>()): AstNode[] {
  if (visited.has(root)) return out;
  visited.add(root);
  for (const child of root.children ?? []) postOrder(child, out, visited);
  out.push(root);
  return out;
}

const AstTreeAnimation: React.FC<AstTreeAnimationProps> = ({ astJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [treeSize, setTreeSize] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 380);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !astJson) return;
    const astData = parseAstJson(astJson);
    if (!astData) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

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
    const treeHeight = Math.max(height - 80, (depth + 1) * 55);
    const treeWidth = Math.max(width - 250, 400);
    d3.tree<AstNode>().size([treeHeight, treeWidth])(root);

    const order = postOrder(astData);
    const revealed = new Set(order.slice(0, revealCount));
    const total = order.length;
    setTreeSize(total);

    // Links — fade in as both endpoints are revealed (child first)
    const links = root.links() as unknown as d3.HierarchyPointLink<AstNode>[];
    g.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.y)
        .y(d => d.x))
      .attr('opacity', d => revealed.has(d.source.data) ? 1 : 0);

    // Nodes pop in
    const nodesSel = g.selectAll<SVGGElement, d3.HierarchyPointNode<AstNode>>('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .attr('opacity', d => revealed.has(d.data) ? 1 : 0)
      .attr('transform-origin', 'center');

    nodesSel.append('circle')
      .attr('r', d => (d.data.children ? 7 : 5))
      .attr('fill', d => getNodeColor(d.data.type))
      .attr('stroke', 'var(--color-card)')
      .attr('stroke-width', 1.5);

    nodesSel.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => (d.children ? -12 : 12))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
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
  }, [astJson, revealCount]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      {/* Description */}
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('syntax.step4.title')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('syntax.step4.description')}
        </p>
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('ast.title')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {Math.min(revealCount, treeSize)}/{treeSize} {t('syntax.step4.nodes')}
          </span>
        </div>
        <div className="ast-tree-wrapper" ref={containerRef} style={{ minHeight: 420 }}>
          <svg ref={svgRef} width="100%" />
        </div>
      </div>
    </div>
  );
};

export default AstTreeAnimation;