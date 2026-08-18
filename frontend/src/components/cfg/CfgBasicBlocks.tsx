import React, { useState, useEffect, useRef } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import type { CfgMethod, CfgNode, CfgEdge } from '../../types';
import { GitFork } from 'lucide-react';

interface CfgBasicBlocksProps {
  method: CfgMethod;
  isPlaying: boolean;
  isCompleted: boolean;
}

const BLOCK_COLORS: Record<string, { bg: string; border: string; headerBg: string }> = {
  entry:    { bg: '#161622', border: '#8A2BE2', headerBg: 'rgba(138,43,226,0.25)' },
  exit:     { bg: '#20161A', border: '#FF3366', headerBg: 'rgba(255,51,102,0.25)' },
  condition:{ bg: '#1F1B12', border: '#FFB000', headerBg: 'rgba(255,176,0,0.25)' },
  branch:   { bg: '#102018', border: '#00FF88', headerBg: 'rgba(0,255,136,0.2)' },
  loop:     { bg: '#1F1220', border: '#FF00FF', headerBg: 'rgba(255,0,255,0.25)' },
  merge:    { bg: '#121A24', border: '#00D4FF', headerBg: 'rgba(0,212,255,0.2)' },
  normal:   { bg: '#16161F', border: '#3A3A52', headerBg: 'rgba(58,58,82,0.4)' },
};

function getBlockStyle(type?: string) {
  return BLOCK_COLORS[type || 'normal'] || BLOCK_COLORS.normal;
}

function getEdgeColor(label: string): string {
  const l = (label || '').toLowerCase();
  if (l.includes('true')) return '#00FF88';
  if (l.includes('false')) return '#FF3366';
  if (l.includes('loop')) return '#FF00FF';
  if (l.includes('break') || l.includes('continue')) return '#FFB000';
  return '#6A7B9B';
}

/** Compute node levels using BFS from entry */
function computeLevels(blocks: CfgNode[], edges: CfgEdge[]): Map<number, number> {
  const levels = new Map<number, number>();
  const adj = new Map<number, number[]>();
  blocks.forEach(b => { adj.set(b.id, []); levels.set(b.id, 0); });
  edges.forEach(e => { if (e.from !== e.to) adj.get(e.from)?.push(e.to); });

  const entry = blocks[0]?.id ?? 0;
  const queue = [{ id: entry, level: 0 }];
  const visited = new Set([entry]);

  while (queue.length > 0) {
    const { id, level } = queue.shift()!;
    levels.set(id, Math.max(levels.get(id) || 0, level));
    for (const neighbor of adj.get(id) || []) {
      if (!visited.has(neighbor)) {
        visited.add(neighbor);
        queue.push({ id: neighbor, level: level + 1 });
      }
    }
  }

  blocks.forEach((b, i) => {
    if (!levels.has(b.id) || (levels.get(b.id) === 0 && b.id !== entry)) {
      levels.set(b.id, i);
    }
  });

  return levels;
}

const CfgBasicBlocks: React.FC<CfgBasicBlocksProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [visibleBlocks, setVisibleBlocks] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate blocks appearing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleBlocks(new Set(method.blocks.map(b => b.id)));
      }
      return;
    }
    setVisibleBlocks(new Set());
    let i = 0;
    const show = () => {
      if (i >= method.blocks.length) return;
      setVisibleBlocks(prev => new Set([...prev, method.blocks[i].id]));
      i++;
      timerRef.current = setTimeout(show, 300);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, method]);

  // Render with D3 — defer to next frame so layout is settled
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const render = () => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const width = rect.width || container.clientWidth || 800;
    const height = rect.height || container.clientHeight || 400;

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const blocks = method.blocks.filter(b => visibleBlocks.has(b.id));
    const edges = method.edges.filter(e => visibleBlocks.has(e.from) && visibleBlocks.has(e.to));
    if (blocks.length === 0) return;

    const levels = computeLevels(method.blocks, method.edges);
    const NODE_W = 220, NODE_H_BASE = 36, LINE_H = 16;

    // Position nodes in a grid layout
    const posMap = new Map<number, { x: number; y: number }>();
    const levelGroups = new Map<number, CfgNode[]>();
    for (const block of blocks) {
      const lvl = levels.get(block.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(block);
    }

    const LEVEL_W = NODE_W + 60;

    for (const [lvl, group] of levelGroups) {
      const groupH = group.length * (NODE_H_BASE + LINE_H * 2 + 16);
      group.forEach((block, i) => {
        posMap.set(block.id, {
          x: 100 + lvl * LEVEL_W,
          y: 50 + i * (NODE_H_BASE + LINE_H * 2 + 20) + (height / 2 - groupH / 2),
        });
      });
    }

    // Draw edges
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 6).attr('markerHeight', 6)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 Z')
      .attr('fill', '#6A7B9B');

    for (const edge of edges) {
      const from = posMap.get(edge.from);
      const to = posMap.get(edge.to);
      if (!from || !to) continue;

      const color = getEdgeColor(edge.label);
      g.append('line')
        .attr('x1', from.x + NODE_W).attr('y1', from.y + NODE_H_BASE / 2)
        .attr('x2', to.x).attr('y2', to.y + NODE_H_BASE / 2)
        .attr('stroke', color).attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');

      if (edge.label) {
        const mx = (from.x + NODE_W + to.x) / 2;
        const my = (from.y + NODE_H_BASE / 2 + to.y + NODE_H_BASE / 2) / 2;
        g.append('text')
          .attr('x', mx).attr('y', my - 4)
          .attr('text-anchor', 'middle')
          .attr('fill', color).attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')
          .text(edge.label);
      }
    }

    // Draw blocks
    for (const block of blocks) {
      const pos = posMap.get(block.id);
      if (!pos) continue;
      const style = getBlockStyle(block.type);
      const h = NODE_H_BASE + block.statements.length * LINE_H + 8;

      const blockG = g.append('g').attr('transform', `translate(${pos.x},${pos.y})`);

      // Background rect
      blockG.append('rect')
        .attr('width', NODE_W).attr('height', h).attr('rx', 3)
        .attr('fill', style.bg).attr('stroke', style.border).attr('stroke-width', 1.5);

      // Header
      blockG.append('rect')
        .attr('width', NODE_W).attr('height', 22).attr('rx', 3)
        .attr('fill', style.headerBg);
      blockG.append('text')
        .attr('x', 8).attr('y', 15)
        .attr('fill', style.border).attr('font-size', '10px').attr('font-weight', 'bold')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`B${block.id}${block.label ? ' (' + block.label + ')' : ''}`);

      // Statements
      block.statements.forEach((stmt, i) => {
        blockG.append('text')
          .attr('x', 8).attr('y', 38 + i * LINE_H)
          .attr('fill', '#E0E0F0').attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(stmt.length > 28 ? stmt.slice(0, 26) + '…' : stmt);
      });
    }

    // Fit view
    const allX = [...posMap.values()].map(p => p.x);
    if (allX.length > 0) {
      const pad = 40;
      svg.call(zoom.transform, d3.zoomIdentity
        .translate(pad, pad)
        .scale(Math.min(1.5, (width - pad * 2) / ((Math.max(...allX) - Math.min(...allX) || 1) + NODE_W + pad * 2)))
      );
    }
    };
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [method, visibleBlocks]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <GitFork size={14} className="text-[var(--color-neon)]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('optimizer.step1.title', 'Basic Blocks')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({method.blocks.length} blocks, {method.edges.length} edges)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('optimizer.step1.description', 'The control flow graph is decomposed into basic blocks — sequences of instructions with no branches except at the end.')}
      </p>
      <div ref={containerRef} className="w-full h-[320px] bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default CfgBasicBlocks;
