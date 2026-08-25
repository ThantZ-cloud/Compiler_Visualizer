import React, { useState, useEffect, useRef } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
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

/** Compute node levels using BFS from entry — loop back-edges are excluded so body stays in order */
function computeLevels(blocks: CfgNode[], edges: CfgEdge[]): Map<number, number> {
  const levels = new Map<number, number>();
  const adj = new Map<number, number[]>();
  blocks.forEach(b => { adj.set(b.id, []); levels.set(b.id, 0); });
  edges.forEach(e => {
    if (e.label.toLowerCase().includes('loop')) return; // exclude back-edge from depth
    if (e.from !== e.to) adj.get(e.from)?.push(e.to);
  });

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

/** Returns the x-anchor for an edge — true leaves from right side, false from left side */
function edgeAnchorX(
  pos: { x: number; y: number },
  label: string,
  nodeW: number,
  isSourceCondition: boolean,
): number {
  if (!isSourceCondition) return pos.x + nodeW / 2; // non-condition: bottom-center
  const l = label.toLowerCase();
  if (l.includes('true')) return pos.x + nodeW - 18; // right side
  if (l.includes('false')) return pos.x + 18;          // left side
  if (l.includes('loop')) return pos.x + nodeW / 2;    // loop: bottom-center
  return pos.x + nodeW / 2;
}

const CfgBasicBlocks: React.FC<CfgBasicBlocksProps> = ({ method, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();
  const [visibleBlocks, setVisibleBlocks] = useState<Set<number>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate blocks appearing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setVisibleBlocks(new Set(method.blocks.map(b => b.id)));
      } else {
        setVisibleBlocks(new Set());
      }
      return;
    }
    setVisibleBlocks(new Set());
    let i = 0;
    const show = () => {
      if (i >= method.blocks.length) return;
      const blockId = method.blocks[i].id;
      setVisibleBlocks(prev => new Set([...prev, blockId]));
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
    const width = observedWidth || rect.width || container.clientWidth || 800;
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

    // Position nodes top-to-bottom: each level is a row, blocks within a row spread horizontally
    // Branch layout: false on the left, true on the right (convention for top-to-bottom CFGs)
    const posMap = new Map<number, { x: number; y: number }>();
    const levelGroups = new Map<number, CfgNode[]>();
    for (const block of blocks) {
      const lvl = levels.get(block.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(block);
    }

    // Map condition block → sorted successor ids (false left, true right) for placement ordering
    const branchOrder = new Map<number, number[]>();
    for (const b of method.blocks) {
      if (b.type !== 'condition') continue;
      const outs = edges.filter(e => e.from === b.id && !e.label.toLowerCase().includes('loop'));
      if (outs.length === 2) {
        // false first (left), true second (right)
        outs.sort((a, b) => {
          const al = a.label.toLowerCase(), bl = b.label.toLowerCase();
          if (al.includes('false') && bl.includes('true')) return -1;
          if (al.includes('true') && bl.includes('false')) return 1;
          return 0;
        });
        branchOrder.set(b.id, outs.map(e => e.to));
      }
    }

    const LEVEL_H = 90;

    let curY = 30;
    const sortedLevels = [...levelGroups.keys()].sort((a, b) => a - b);
    for (const lvl of sortedLevels) {
      let group = levelGroups.get(lvl)!;
      // Within a level that is the direct successor of a single condition, order false-left / true-right
      if (group.length === 2) {
        // Check if both are successors of the same condition block
        const condEntry = [...branchOrder.entries()].find(([, succs]) =>
          succs.length === 2 && succs.every(id => group.some(g => g.id === id))
        );
        if (condEntry) {
          const ordered = condEntry[1];
          group = [...group].sort((a, b) => ordered.indexOf(a.id) - ordered.indexOf(b.id));
        }
      }
      const rowH = Math.max(...group.map(b => NODE_H_BASE + b.statements.length * LINE_H + 8));
      const totalW = group.length * NODE_W + (group.length - 1) * 40;
      const startX = Math.max(20, (width - totalW) / 2);
      group.forEach((block, i) => {
        posMap.set(block.id, {
          x: startX + i * (NODE_W + 40),
          y: curY,
        });
      });
      curY += rowH + LEVEL_H;
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

    // Determine which blocks are condition nodes for anchor selection
    const conditionIds = new Set(method.blocks.filter(b => b.type === 'condition').map(b => b.id));

    for (const edge of edges) {
      const from = posMap.get(edge.from);
      const to = posMap.get(edge.to);
      if (!from || !to) continue;

      const fromH = NODE_H_BASE + (method.blocks.find(b => b.id === edge.from)?.statements.length || 0) * LINE_H + 8;
      const color = getEdgeColor(edge.label);
      const isLoopBack = edge.label.toLowerCase().includes('loop');
      const isCondition = conditionIds.has(edge.from);

      if (isLoopBack) {
        // Loop back-edge: bottom of body block curves around on the RIGHT side back to the header
        // The header is above; route the curve on the outer right so it does not cross the true/false fan-out
        const fx = from.x + NODE_W / 2;
        const fy = from.y + fromH;
        const tx = to.x + NODE_W / 2;
        const ty = to.y;
        // Sweep to the right of both blocks, then back up to the header's right edge
        const rightEdge = Math.max(from.x + NODE_W, to.x + NODE_W) + 36;
        const topY = ty + 14;
        g.append('path')
          .attr('d', `M${fx},${fy} L${fx},${fy + 18} L${rightEdge},${fy + 18} L${rightEdge},${topY} L${tx + NODE_W / 2},${topY} L${tx + NODE_W / 2},${ty}`)
          .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');
        if (edge.label) {
          g.append('text')
            .attr('x', rightEdge + 4).attr('y', (fy + ty) / 2)
            .attr('text-anchor', 'start')
            .attr('fill', color).attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')
            .text(edge.label);
        }
      } else {
        // Anchor at bottom of source, top of target
        // For condition blocks: false exits from left side (bottom-left), true from right side (bottom-right)
        let fx: number, fy: number;
        if (isCondition) {
          fx = edgeAnchorX(from, edge.label, NODE_W, true);
          fy = from.y + fromH;
        } else {
          fx = from.x + NODE_W / 2;
          fy = from.y + fromH;
        }
        const tx = to.x + NODE_W / 2;
        const ty = to.y;

        if (Math.abs(fx - tx) < 2) {
          g.append('line')
            .attr('x1', fx).attr('y1', fy).attr('x2', tx).attr('y2', ty)
            .attr('stroke', color).attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');
        } else {
          const midY = (fy + ty) / 2;
          g.append('path')
            .attr('d', `M${fx},${fy} L${fx},${midY} L${tx},${midY} L${tx},${ty}`)
            .attr('fill', 'none').attr('stroke', color).attr('stroke-width', 1.5).attr('marker-end', 'url(#arrow)');
        }
        if (edge.label) {
          // Place label near the elbow mid-point, offset slightly toward the branch side
          const mx = (fx + tx) / 2;
          const my = (fy + ty) / 2;
          const isTrue = edge.label.toLowerCase().includes('true');
          g.append('text')
            .attr('x', mx + (isTrue ? 8 : -8)).attr('y', my - 4)
            .attr('text-anchor', isTrue ? 'start' : 'end')
            .attr('fill', color).attr('font-size', '9px').attr('font-family', 'JetBrains Mono, monospace')
            .text(edge.label);
        }
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

    // Fit view — fit both width and height for vertical layout
    const allPos = [...posMap.values()];
    if (allPos.length > 0) {
      const pad = 30;
      const allY = allPos.map(p => p.y);
      const allX2 = allPos.map(p => p.x);
      const maxH = Math.max(...allPos.map(p => {
        const b = method.blocks.find(x => x.id === [...posMap.entries()].find(([, v]) => v === p)?.[0]);
        return p.y + NODE_H_BASE + (b?.statements.length || 0) * LINE_H + 8;
      }));
      const minX = Math.min(...allX2);
      const maxX = Math.max(...allX2) + NODE_W;
      const minY = Math.min(...allY);
      const contentW = maxX - minX;
      const contentH = maxH - minY;
      const scale = Math.max(0.2, Math.min(1.2,
        (width - pad * 2) / contentW,
        (height - pad * 2) / contentH
      ));
      const tx = width / 2 - (minX + maxX) / 2 * scale;
      const ty = pad - minY * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
    };
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [method, visibleBlocks, observedWidth]);

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
        {t('optimizer.step1.description', 'The program is decomposed into basic blocks — maximal straight-line sequences with no branches except at the end. Leaders mark block entry points.')}
      </p>
      <div ref={(el) => { containerRef.current = el; roSetRef(el); }} className="w-full h-[420px] bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default CfgBasicBlocks;
