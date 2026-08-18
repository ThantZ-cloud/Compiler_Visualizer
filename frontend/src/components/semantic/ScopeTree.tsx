import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import '../AstTree.css';

interface ScopeNode {
  name: string;
  kind: string;
  scopeId: number;
  type?: string;
  modifiers?: string;
  returnType?: string;
  children?: ScopeNode[];
}

interface ScopeTreeProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

const SCOPE_COLORS: Record<string, string> = {
  package: '#4ec9b0',
  class: '#4ec9b0',
  interface: '#4ec9b0',
  enum: '#4ec9b0',
  annotation: '#4ec9b0',
  record: '#4ec9b0',
  method: '#dcdcaa',
  constructor: '#dcdcaa',
  field: '#569cd6',
  fields: '#569cd6',
  variable: '#9cdcfe',
  parameter: '#9cdcfe',
  block: '#6a9955',
  initializer: '#c586c0',
};

function getScopeColor(kind: string): string {
  return SCOPE_COLORS[kind] || '#d4d4d4';
}
function parseScopeTree(jsonStr: string): ScopeNode | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return null;
    return parsed.scopeTree || null;
  } catch {
    return null;
  }
}

// Post-order traversal — children revealed before parents
function postOrder(node: ScopeNode, out: ScopeNode[], visited = new Set<number>()): ScopeNode[] {
  if (visited.has(node.scopeId)) return out;
  visited.add(node.scopeId);
  for (const child of node.children ?? []) postOrder(child, out, visited);
  out.push(node);
  return out;
}

const ScopeTree: React.FC<ScopeTreeProps> = ({ symbolTableJson, isPlaying }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealCount, setRevealCount] = useState(0);
  const [treeSize, setTreeSize] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(Number.MAX_SAFE_INTEGER);
      return;
    }
    setRevealCount(0);
    const interval = setInterval(() => {
      setRevealCount(prev => prev + 1);
    }, 400);
    return () => clearInterval(interval);
  }, [isPlaying]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !symbolTableJson) return;

    const scopeData = parseScopeTree(symbolTableJson);
    if (!scopeData) return;

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    svg.attr('width', width).attr('height', height);

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    const root = d3.hierarchy(scopeData);
    const buildLabel = (n: ScopeNode): string => {
      let label = n.name;
      if (n.type) label += `: ${n.type}`;
      if (n.returnType) label = `${n.returnType} ${label}`;
      if (n.modifiers) label = `${n.modifiers} ${label}`;
      return label;
    };
    const labelCounts = new Map<string, number>();
    for (const d of root.descendants()) {
      const label = buildLabel(d.data);
      labelCounts.set(label, (labelCounts.get(label) ?? 0) + 1);
    }
    const labelSeen = new Map<string, number>();
    const nodeCount = root.descendants().length;
    const treeHeight = Math.max(height - 80, nodeCount * 30);
    const treeWidth = Math.max(width - 250, 400);
    d3.tree<ScopeNode>().size([treeHeight, treeWidth])(root);

    const order = postOrder(scopeData, []);
    const revealed = new Set(order.slice(0, revealCount));
    const total = order.length;
    setTreeSize(total);

    // Links
    const links = root.links() as unknown as d3.HierarchyPointLink<ScopeNode>[];
    g.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<ScopeNode>, d3.HierarchyPointNode<ScopeNode>>()
        .x(d => d.y)
        .y(d => d.x))
      .attr('opacity', d => revealed.has(d.source.data) && revealed.has(d.target.data) ? 1 : 0.1);

    // Nodes
    const nodesSel = g.selectAll<SVGGElement, d3.HierarchyPointNode<ScopeNode>>('.node')
      .data(root.descendants())
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .attr('opacity', d => (revealed.has(d.data) ? 1 : 0));

    nodesSel.append('circle')
      .attr('r', d => (d.data.children?.length && d.data.children.length > 0 ? 12 : 8))
      .attr('fill', d => getScopeColor(d.data.kind))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5);

    nodesSel.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => (d.children ? -16 : 16))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .text(d => {
        let label = buildLabel(d.data);
        if ((labelCounts.get(label) ?? 0) > 1) {
          const n = (labelSeen.get(label) ?? 0) + 1;
          labelSeen.set(label, n);
          label = `${label} #${n}`;
        }
        return label.length > 32 ? label.substring(0, 32) + '...' : label;
      })
      .attr('fill', '#d4d4d4')
      .attr('font-size', '12px');

    nodesSel.transition().duration(200).attr('opacity', d => (revealed.has(d.data) ? 1 : 0));

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x + 20;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [symbolTableJson, revealCount]);

  if (!symbolTableJson) {
    return (
      <div className="w-full max-w-5xl mx-auto">
        <div className="text-center py-8 text-[var(--color-text-muted)] font-mono text-sm">
          {t('semantic.noSymbolTable')}
        </div>
      </div>
    );
  }

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('semantic.scopeTree')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('semantic.scopeTreeDescription')}
        </p>
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.scopeHierarchy')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {Math.min(revealCount, treeSize)}/{treeSize} {t('syntax.step4.nodes')}
          </span>
        </div>
        <div className="ast-tree-wrapper" ref={containerRef} style={{ height: 420 }}>
          <svg ref={svgRef} width="100%" height="100%" />
        </div>
      </div>
    </div>
  );
};

export default ScopeTree;
