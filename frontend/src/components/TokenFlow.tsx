import React, { useRef, useEffect, useState } from 'react';
import * as d3 from 'd3';
import { sankey, sankeyLinkHorizontal, sankeyJustify } from 'd3-sankey';
import type { SankeyNode, SankeyLink } from 'd3-sankey';
import type { Token } from '../types';
import { getTokenColor as getColor } from '../lib/colors';

interface TokenFlowProps {
  tokens: Token[];
}

// Cap the number of left-side lexeme nodes so the diagram stays readable.
const MAX_LEXEMES = 30;

interface NodeExtra {
  name: string;
  color: string;
  side: 'lexeme' | 'type';
  count: number;
}

interface LinkExtra {
  source: number;
  target: number;
  value: number;
  color: string;
}

// d3-sankey resolves source/target to node objects after layout; describe the
// resolved shape for the path generator.
type LaidLink = SankeyLink<NodeExtra, LinkExtra>;

const nodeName = (n: SankeyNode<NodeExtra, LinkExtra> | number | string): string =>
  typeof n === 'object' && n !== null ? n.name : String(n);

const TokenFlow: React.FC<TokenFlowProps> = ({ tokens }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [width, setWidth] = useState(800);

  // Track container width so the diagram stays responsive.
  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const update = () => setWidth(Math.max(320, el.clientWidth));
    update();
    const ro = new ResizeObserver(update);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  useEffect(() => {
    if (!svgRef.current) return;
    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    // Whitespace dominates counts and adds no insight — hide it from the flow.
    const visible = tokens.filter(t => !t.type.toUpperCase().includes('WHITESPACE'));
    if (visible.length === 0) return;

    // Unique lexemes (same value + type) collapse into one weighted left node.
    const lexemeMap = new Map<string, { value: string; type: string; count: number }>();
    visible.forEach(t => {
      const key = t.value + '\u0001' + t.type;
      const entry = lexemeMap.get(key);
      if (entry) entry.count++;
      else lexemeMap.set(key, { value: t.value, type: t.type, count: 1 });
    });
    const sortedLexemes = Array.from(lexemeMap.values()).sort((a, b) => b.count - a.count);
    const shownLexemes = sortedLexemes.slice(0, MAX_LEXEMES);

    // Right-side nodes: token types present among the shown lexemes.
    const typeMap = new Map<string, number>();
    shownLexemes.forEach(l => typeMap.set(l.type, (typeMap.get(l.type) || 0) + l.count));
    const typeEntries = Array.from(typeMap.entries()).sort((a, b) => b[1] - a[1]);

    const nodeData: NodeExtra[] = [
      ...shownLexemes.map(l => ({
        name: l.value, color: getColor(l.type), side: 'lexeme' as const, count: l.count,
      })),
      ...typeEntries.map(([type, count]) => ({
        name: type, color: getColor(type), side: 'type' as const, count,
      })),
    ];

    const typeIndex = new Map<string, number>();
    typeEntries.forEach(([type], i) => typeIndex.set(type, shownLexemes.length + i));

    const linkData: LinkExtra[] = shownLexemes.map((l, i) => ({
      source: i,
      target: typeIndex.get(l.type) ?? 0,
      value: l.count,
      color: getColor(l.type),
    }));

    const height = Math.max(420, Math.max(shownLexemes.length, typeEntries.length) * 30 + 60);
    const layoutWidth = Math.max(560, width);
    const margin = { top: 16, right: 150, bottom: 16, left: 150 };

    const sankeyGen = sankey<NodeExtra, LinkExtra>()
      .nodeWidth(16)
      .nodePadding(10)
      .nodeAlign(sankeyJustify)
      .extent([[margin.left, margin.top], [layoutWidth - margin.right, height - margin.bottom]]);

    const graph = sankeyGen({
      nodes: nodeData.map(d => ({ ...d })),
      links: linkData.map(d => ({ ...d })),
    });

    const laidNodes = graph.nodes;
    const laidLinks = graph.links;
    // The link-horizontal path generator expects a resolved geom shape; cast the
    // typed accessor to avoid generic friction with d3-shape's Link type.
    const linkPath = sankeyLinkHorizontal() as unknown as (d: LaidLink) => string;

    svg.attr('width', layoutWidth).attr('height', height);

    // Links (ribbons) first so nodes render on top.
    const link = svg.append('g').attr('class', 'flow-links')
      .selectAll('path')
      .data(laidLinks)
      .join('path')
      .attr('d', d => linkPath(d))
      .attr('fill', 'none')
      .attr('stroke', d => d.color)
      .attr('stroke-width', d => Math.max(1, d.width ?? 1))
      .attr('stroke-opacity', 0.4)
      .style('cursor', 'pointer');

    link.append('title').text(d =>
      `${nodeName(d.source)} \u2192 ${nodeName(d.target)}\n${d.value} occurrence${d.value === 1 ? '' : 's'}`
    );

    // Nodes.
    const node = svg.append('g').attr('class', 'flow-nodes')
      .selectAll('g')
      .data(laidNodes)
      .join('g')
      .attr('class', 'flow-node')
      .style('cursor', 'pointer');

    node.append('rect')
      .attr('x', d => d.x0 ?? 0)
      .attr('y', d => d.y0 ?? 0)
      .attr('width', d => Math.max(0, (d.x1 ?? 0) - (d.x0 ?? 0)))
      .attr('height', d => Math.max(1, (d.y1 ?? 0) - (d.y0 ?? 0)))
      .attr('fill', d => d.color)
      .attr('rx', 2)
      .append('title')
      .text(d => `${d.name}\n${d.side === 'lexeme' ? 'lexeme' : 'token type'} \u00b7 ${d.count} occurrence${d.count === 1 ? '' : 's'}`);

    // Labels: lexeme text on the left, type name + count on the right.
    node.each(function (d) {
      const g = d3.select(this);
      const isLexeme = d.side === 'lexeme';
      const label = isLexeme
        ? (d.name.length > 16 ? d.name.slice(0, 15) + '\u2026' : d.name)
        : `${d.name} \u00b7 ${d.count}`;
      g.append('text')
        .attr('x', isLexeme ? (d.x0 ?? 0) - 6 : (d.x1 ?? 0) + 6)
        .attr('y', ((d.y0 ?? 0) + (d.y1 ?? 0)) / 2)
        .attr('dy', '0.32em')
        .attr('text-anchor', isLexeme ? 'end' : 'start')
        .attr('fill', d.color)
        .attr('font-size', '11px')
        .attr('font-family', "'JetBrains Mono', 'Consolas', monospace")
        .text(label);
    });

    // Hover: highlight a node's flow, or a link's endpoints.
    node.on('mouseover', function (_, d) {
      d3.select(this).select('rect').attr('stroke', '#ffffff').attr('stroke-width', 2);
      link.attr('stroke-opacity', l => (l.source === d || l.target === d ? 0.9 : 0.04));
    }).on('mouseout', function () {
      d3.select(this).select('rect').attr('stroke', 'none');
      link.attr('stroke-opacity', 0.4);
    });

    link.on('mouseover', function (_, d) {
      d3.select(this).attr('stroke-opacity', 0.9);
      node.select('rect').attr('opacity', n => (n === d.source || n === d.target ? 1 : 0.25));
    }).on('mouseout', function () {
      d3.select(this).attr('stroke-opacity', 0.4);
      node.select('rect').attr('opacity', 1);
    });

    return () => {
      svg.selectAll('*').remove();
    };
  }, [tokens, width]);

  // Header stats (whitespace excluded to match the diagram).
  const visibleTokens = tokens.filter(t => !t.type.toUpperCase().includes('WHITESPACE'));
  const uniqueCount = new Set(visibleTokens.map(t => t.value + '\u0001' + t.type)).size;
  const hiddenCount = Math.max(0, uniqueCount - MAX_LEXEMES);

  return (
    <div className="flex flex-col gap-3 h-full">
      <div className="flex items-center justify-between flex-wrap gap-2">
        <h3 className="text-sm font-medium text-[var(--color-text)] m-0 font-display tracking-[0.1em] uppercase">
          Lexeme &rarr; Token Type Flow
        </h3>
        <span className="text-[11px] text-[var(--color-text-muted)] font-mono">
          {uniqueCount} unique lexemes &middot; {visibleTokens.length} tokens &middot; whitespace hidden
          {hiddenCount > 0 ? ` &middot; top ${MAX_LEXEMES} shown` : ''}
        </span>
      </div>
      <div
        ref={containerRef}
        className="bg-[var(--color-card)] border border-[var(--color-border)] rounded-[6px] p-3 overflow-auto"
      >
        <svg
          ref={svgRef}
          className="block"
          role="img"
          aria-label="Sankey diagram showing source lexemes flowing into token type categories. Hover a node or link to highlight its flow."
        />
      </div>
      <div className="text-[11px] text-[var(--color-text-muted)] text-right font-mono">
        Hover a node or link to highlight its flow
      </div>
    </div>
  );
};

export default TokenFlow;
