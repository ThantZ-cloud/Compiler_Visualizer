import React, { useRef, useEffect, useMemo } from 'react';
import * as d3 from 'd3';
import { useCompile } from '../context/CompileContext';
import { useStepper } from '../context/StepperContext';
import { parseAst, getNodeLabel, type AstNode } from '../lib/astUtils';

const truncate = (s: string, n: number): string =>
  s.length > n ? s.slice(0, n - 1) + '\u2026' : s;

const cardWidth = (label: string): number => Math.max(96, label.length * 6.6 + 28);
const CARD_H = 38;

/**
 * Interactive AST canvas: rounded node cards connected by smooth blue Bezier
 * curves on a dot-grid backdrop. The node matching the stepping engine's
 * current parser step gets a mint outline and a floating explainer tooltip.
 * Supports scroll-zoom and drag-pan (zoom transform is preserved across steps).
 */
const AstCanvas: React.FC = () => {
  const { result } = useCompile();
  const { currentStep, currentStage } = useStepper();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const root = useMemo(() => parseAst(result?.astJson), [result?.astJson]);

  const isParser = currentStage === 'parser';
  const activeId = isParser && currentStep ? currentStep.ref : -1;
  const activeText = isParser && currentStep ? currentStep.text : '';

  useEffect(() => {
    const svgEl = svgRef.current;
    const container = containerRef.current;
    if (!svgEl || !container || !root) return;

    const width = container.clientWidth || 600;

    // Preserve the user's pan/zoom across per-step rebuilds.
    const prevTransform = d3.zoomTransform(svgEl);
    const isIdentity = prevTransform.k === 1 && prevTransform.x === 0 && prevTransform.y === 0;

    const svg = d3.select(svgEl);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 2.5])
      .on('zoom', event => {
        g.attr('transform', event.transform);
      });
    svg.call(zoom);

    const hierarchy = d3.hierarchy(root);
    const treeLayout = d3.tree<AstNode>().nodeSize([172, 96]);
    treeLayout(hierarchy);

    const nodes = hierarchy.descendants() as d3.HierarchyPointNode<AstNode>[];
    const links = hierarchy.links() as d3.HierarchyPointLink<AstNode>[];

    // Smooth blue Bezier connectors (parent -> child), drawn under the cards.
    g.selectAll('path.ast-link')
      .data(links)
      .join('path')
      .attr('class', 'ast-link')
      .attr('fill', 'none')
      .attr('stroke', 'var(--color-neon)')
      .attr('stroke-opacity', 0.4)
      .attr('stroke-width', 1.6)
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.x)
        .y(d => d.y));

    // Node cards.
    const node = g.selectAll('g.ast-node')
      .data(nodes)
      .join('g')
      .attr('class', 'ast-node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .style('cursor', 'default');

    node.append('rect')
      .attr('x', d => -cardWidth(getNodeLabel(d.data.type, d.data.name, d.data.value)) / 2)
      .attr('y', -CARD_H / 2)
      .attr('width', d => cardWidth(getNodeLabel(d.data.type, d.data.name, d.data.value)))
      .attr('height', CARD_H)
      .attr('rx', 10)
      .attr('fill', 'var(--color-card)')
      .attr('stroke', d => (d.data.id === activeId ? 'var(--color-cyan)' : 'var(--color-border-bright)'))
      .attr('stroke-width', d => (d.data.id === activeId ? 2.5 : 1))
      .attr('style', 'filter: drop-shadow(0 2px 4px rgba(15, 23, 42, 0.08))');

    node.append('text')
      .attr('text-anchor', 'middle')
      .attr('dy', '0.34em')
      .attr('font-size', '12px')
      .attr('font-weight', d => (d.data.id === activeId ? 600 : 500))
      .attr('fill', d => (d.data.id === activeId ? 'var(--color-cyan)' : 'var(--color-text)'))
      .attr('font-family', "'Fira Code', monospace")
      .text(d => truncate(getNodeLabel(d.data.type, d.data.name, d.data.value), 26));

    // Floating explainer tooltip above the active node.
    if (activeId >= 0 && activeText) {
      const activeNode = nodes.find(n => n.data.id === activeId);
      if (activeNode) {
        const text = truncate(activeText, 52);
        const tipW = Math.max(150, text.length * 6 + 24);
        const tipH = 34;
        const tip = g.append('g')
          .attr('class', 'ast-tooltip')
          .attr('transform', `translate(${activeNode.x},${activeNode.y - CARD_H / 2 - tipH - 10})`);
        tip.append('rect')
          .attr('x', -tipW / 2)
          .attr('y', 0)
          .attr('width', tipW)
          .attr('height', tipH)
          .attr('rx', 8)
          .attr('fill', 'var(--color-cyan)')
          .attr('style', 'filter: drop-shadow(0 4px 10px rgba(16, 185, 129, 0.35))');
        // Little pointer triangle under the tooltip.
        tip.append('path')
          .attr('d', 'M -6 0 L 6 0 L 0 8 Z')
          .attr('transform', `translate(0,${tipH})`)
          .attr('fill', 'var(--color-cyan)');
        tip.append('text')
          .attr('text-anchor', 'middle')
          .attr('y', tipH / 2)
          .attr('dy', '0.34em')
          .attr('font-size', '11px')
          .attr('font-weight', 500)
          .attr('fill', '#FFFFFF')
          .attr('font-family', "'Inter', sans-serif")
          .text(text);
      }
    }

    // Center on first build; otherwise keep the user's view.
    if (isIdentity) {
      const bounds = g.node()?.getBBox();
      if (bounds) {
        const scale = Math.min(1, (width - 40) / Math.max(bounds.width, 1));
        const tx = width / 2 - (bounds.x + bounds.width / 2) * scale;
        const ty = 50 - bounds.y * scale;
        svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
      }
    } else {
      svg.call(zoom.transform, prevTransform);
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [root, activeId, activeText]);

  if (!root) {
    return (
      <div className="dot-grid flex h-full w-full items-center justify-center">
        <p className="text-sm text-[var(--color-text-muted)]">No AST to display yet.</p>
      </div>
    );
  }

  return (
    <div ref={containerRef} className="dot-grid h-full w-full overflow-hidden">
      <svg ref={svgRef} width="100%" height="100%" role="img" aria-label="Interactive abstract syntax tree" />
    </div>
  );
};

export default AstCanvas;
