import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import type { ParseNode } from '../../lib/parser/cfgTryIt';
import '../../components/AstTree.css';

interface Props {
  tree: ParseNode | null;
  isPlaying?: boolean;
  isCompleted?: boolean;
}

function getNodeColor(node: ParseNode): string {
  if (node.isTerminal) {
    if (node.symbol === '(' || node.symbol === ')') return '#ffb000';
    if (['+', '-', '*', '/'].includes(node.symbol)) return '#ff3366';
    return '#00ff88'; // name/num
  }
  switch (node.symbol) {
    case 'Goal': return '#00ff88';
    case 'Expr': return '#00d4ff';
    case 'Term': return '#ff00ff';
    case 'Factor': return '#ffb000';
    case 'Op': return '#a3e635';
    default: return '#d4d4d4';
  }
}

function getLabel(node: ParseNode): string {
  if (node.isTerminal) return node.symbol;
  return node.ruleId ? `${node.symbol} [${node.ruleId}]` : node.symbol;
}

function postOrder(root: ParseNode): ParseNode[] {
  const out: ParseNode[] = [];
  const visited = new Set<ParseNode>();
  const stack: { node: ParseNode; idx: number }[] = [{ node: root, idx: 0 }];
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

const CfgParseTree: React.FC<Props> = ({ tree, isPlaying = false, isCompleted = true }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();
  const [revealCount, setRevealCount] = useState(0);
  const [treeSize, setTreeSize] = useState(0);

  useEffect(() => {
    if (!isPlaying) {
      setRevealCount(isCompleted ? Number.MAX_SAFE_INTEGER : 0);
      return;
    }
    setRevealCount(0);
    const id = setInterval(() => setRevealCount(p => p + 1), 380);
    return () => clearInterval(id);
  }, [isPlaying, isCompleted]);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !tree) return;
    const container = containerRef.current;
    const width = observedWidth || container.clientWidth || 600;
    const height = container.clientHeight || 380;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();
    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform));
    svg.call(zoom);

    const root = d3.hierarchy(tree, d => (d as ParseNode).children);
    const depth = root.height || 1;
    // Vertical: root at top, leaves at bottom — width is horizontal spread, height is depth
    const treeWidth = Math.max(width - 80, Math.max(320, (root.leaves().length || 1) * 90));
    const treeHeight = Math.max(height - 80, (depth + 1) * 85);
    d3.tree<ParseNode>().size([treeWidth, treeHeight])(root);

    const order = postOrder(tree);
    const revealed = new Set(order.slice(0, revealCount));
    const total = order.length;
    setTreeSize(total);

    type Link = d3.HierarchyPointLink<ParseNode>;
    type Node = d3.HierarchyPointNode<ParseNode>;
    const links = root.links() as unknown as Link[];
    g.selectAll('.link')
      .data(links)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<Link, Node>().x(d => d.x).y(d => d.y) as unknown as string)
      .attr('opacity', d => revealed.has(d.source.data) ? 1 : 0)
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-border)')
      .attr('stroke-width', 1.2);

    const nodes = g.selectAll<SVGGElement, Node>('.node')
      .data(root.descendants() as unknown as Node[])
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .attr('opacity', d => revealed.has(d.data) ? 1 : 0);

    nodes.append('circle')
      .attr('r', d => (d.data.children ? 7 : 5))
      .attr('fill', d => getNodeColor(d.data))
      .attr('stroke', 'var(--color-card)')
      .attr('stroke-width', 1.5);

    nodes.append('text')
      .attr('dy', d => (d.children ? '-1.2em' : '1.6em'))
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .text(d => getLabel(d.data))
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '11px')
      .attr('font-family', 'monospace');

    nodes.transition().duration(250).attr('opacity', d => revealed.has(d.data) ? 1 : 0);

    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x;
      const dy = 30 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
      svg.attr('width', Math.ceil(bounds.width + 80));
      svg.attr('height', Math.ceil(bounds.height + 80));
    }
    return () => { svg.selectAll('*').remove(); svg.on('.zoom', null); };
  }, [tree, revealCount, observedWidth]);

  if (!tree) return <div className="text-[10px] font-mono text-[var(--color-text-muted)] p-3 border border-dashed rounded">No parse tree</div>;

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-2">
        <span className="text-[9px] font-mono text-[var(--color-text-muted)]">Parse tree — {treeSize} nodes</span>
        <span className="text-[9px] font-mono text-[var(--color-cyan)]">{Math.min(revealCount, treeSize)}/{treeSize} revealed</span>
      </div>
      <div className="ast-tree-wrapper border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]" ref={el => { containerRef.current = el; roSetRef(el); }} style={{ minHeight: 360 }}>
        <svg ref={svgRef} width="100%" />
      </div>
      <div className="mt-2 flex flex-wrap gap-2 text-[9px] font-mono">
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00d4ff' }} /> Expr</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ff00ff' }} /> Term</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#ffb000' }} /> Factor</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#a3e635' }} /> Op</span>
        <span className="flex items-center gap-1"><span className="w-2 h-2 rounded-full" style={{ background: '#00ff88' }} /> name</span>
      </div>
    </div>
  );
};

export default CfgParseTree;
