import React, { useEffect, useRef, useState } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import type { CfgMethod } from '../../types';
import type { DominatorResult } from '../../lib/cfg/dominators';
import { TreePine } from 'lucide-react';

interface DominatorTreeProps {
  method: CfgMethod;
  dominators: DominatorResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const DomTree: React.FC<DominatorTreeProps> = ({ method, dominators, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();
  const [revealedEdges, setRevealedEdges] = useState<Set<string>>(new Set());
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Animate tree edges appearing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setRevealedEdges(new Set(dominators.treeEdges.map(e => `${e.from}-${e.to}`)));
      } else {
        setRevealedEdges(new Set());
      }
      return;
    }
    setRevealedEdges(new Set());
    let i = 0;
    const show = () => {
      if (i >= dominators.treeEdges.length) return;
      const e = dominators.treeEdges[i];
      setRevealedEdges(prev => new Set([...prev, `${e.from}-${e.to}`]));
      i++;
      timerRef.current = setTimeout(show, 250);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, dominators]);

  // Render dominator tree + CFG overlay — defer to next frame so layout is settled
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const isVisible = isPlaying || isCompleted;
    if (!isVisible) {
      d3.select(svgRef.current!).selectAll('*').remove();
      return;
    }
    const render = () => {
    const svg = d3.select(svgRef.current!);
    svg.selectAll('*').remove();

    const container = containerRef.current!;
    const rect = container.getBoundingClientRect();
    const width = observedWidth || rect.width || container.clientWidth || 800;
    const height = rect.height || container.clientHeight || 420;

    const g = svg.append('g');
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (e) => g.attr('transform', e.transform));
    svg.call(zoom);

    const blocks = method.blocks;
    if (blocks.length === 0) return;

    const NODE_W = 100, NODE_H = 32;

    // Build adjacency list for dominator tree
    const treeChildren = new Map<number, number[]>();
    blocks.forEach(b => treeChildren.set(b.id, []));
    for (const edge of dominators.treeEdges) {
      treeChildren.get(edge.from)?.push(edge.to);
    }

    // Assign tree levels using BFS from entry
    const treeLevels = new Map<number, number>();
    const entryId = blocks[0].id;
    treeLevels.set(entryId, 0);
    const queue = [entryId];
    while (queue.length > 0) {
      const cur = queue.shift()!;
      for (const child of treeChildren.get(cur) || []) {
        treeLevels.set(child, (treeLevels.get(cur) || 0) + 1);
        queue.push(child);
      }
    }
    blocks.forEach(b => { if (!treeLevels.has(b.id)) treeLevels.set(b.id, 0); });

    // Position by tree level (horizontal layout, left to right)
    const levelGroups = new Map<number, { id: number; x: number; y: number }[]>();
    blocks.forEach(b => {
      const lvl = treeLevels.get(b.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
    });

    const LEVEL_GAP = NODE_W + 50;
    const positions = new Map<number, { x: number; y: number }>();

    for (const lvl of levelGroups.keys()) {
      const nodesInLevel = blocks.filter(b => (treeLevels.get(b.id) || 0) === lvl);
      const totalH = nodesInLevel.length * (NODE_H + 20);
      const startY = height / 2 - totalH / 2;
      nodesInLevel.forEach((b, i) => {
        positions.set(b.id, {
          x: 60 + lvl * LEVEL_GAP,
          y: startY + i * (NODE_H + 20),
        });
      });
    }

    // Arrow marker
    const defs = svg.append('defs');
    defs.append('marker')
      .attr('id', 'dom-arrow')
      .attr('viewBox', '0 0 10 10')
      .attr('refX', 8).attr('refY', 5)
      .attr('markerWidth', 5).attr('markerHeight', 5)
      .attr('orient', 'auto')
      .append('path')
      .attr('d', 'M0,0 L10,5 L0,10 Z')
      .attr('fill', '#8A2BE2');

    // Draw dominator tree edges (animated)
    for (const edge of dominators.treeEdges) {
      const from = positions.get(edge.from);
      const to = positions.get(edge.to);
      if (!from || !to) continue;

      const key = `${edge.from}-${edge.to}`;
      const revealed = revealedEdges.has(key);

      g.append('line')
        .attr('x1', from.x + NODE_W).attr('y1', from.y + NODE_H / 2)
        .attr('x2', to.x).attr('y2', to.y + NODE_H / 2)
        .attr('stroke', revealed ? '#8A2BE2' : 'rgba(138,43,226,0.15)')
        .attr('stroke-width', revealed ? 2 : 1)
        .attr('stroke-dasharray', revealed ? 'none' : '4,4')
        .attr('marker-end', 'url(#dom-arrow)');
    }

    // Draw blocks
    for (const block of blocks) {
      const pos = positions.get(block.id);
      if (!pos) continue;

      const isEntry = block.id === entryId;
      const bg = isEntry ? 'rgba(138,43,226,0.15)' : '#16161F';
      const border = isEntry ? '#8A2BE2' : '#3A3A52';

      const blockG = g.append('g').attr('transform', `translate(${pos.x},${pos.y})`);
      blockG.append('rect')
        .attr('width', NODE_W).attr('height', NODE_H).attr('rx', 3)
        .attr('fill', bg).attr('stroke', border).attr('stroke-width', 1.5);
      blockG.append('text')
        .attr('x', NODE_W / 2).attr('y', NODE_H / 2 + 4)
        .attr('text-anchor', 'middle')
        .attr('fill', '#E0E0F0').attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .text(`B${block.id}`);

      // idom label
      const idomVal = dominators.idom.get(block.id);
      if (idomVal !== null && idomVal !== undefined) {
        blockG.append('text')
          .attr('x', NODE_W / 2).attr('y', NODE_H + 12)
          .attr('text-anchor', 'middle')
          .attr('fill', '#8A2BE2').attr('font-size', '8px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(`idom = B${idomVal}`);
      }
    }

    // Fit view: scale to fit and center the tree in the viewport
    const allPos = [...positions.values()];
    if (allPos.length > 0 && width > 0 && height > 0) {
      const pad = 40;
      const minX = Math.min(...allPos.map(p => p.x));
      const maxX = Math.max(...allPos.map(p => p.x)) + NODE_W;
      const minY = Math.min(...allPos.map(p => p.y)) - 8; // room above node tops
      const maxY = Math.max(...allPos.map(p => p.y)) + NODE_H + 18; // idom label below nodes
      const contentW = maxX - minX;
      const contentH = maxY - minY;
      const scale = Math.max(0.2, Math.min(
        1.5,
        (width - pad * 2) / contentW,
        (height - pad * 2) / contentH
      ));
      svg.call(zoom.transform, d3.zoomIdentity
        .translate(width / 2 - ((minX + maxX) / 2) * scale,
                   height / 2 - ((minY + maxY) / 2) * scale)
        .scale(scale)
      );
    }
    };
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [method, dominators, revealedEdges, observedWidth, isPlaying, isCompleted]);

  return (
    <div className="flex flex-col gap-3">
      <div className="flex items-center gap-2 px-1">
        <TreePine size={14} className="text-[#8A2BE2]" />
        <h4 className="text-[11px] font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase m-0">
          {t('optimizer.step3.title', 'Dominator Tree')}
        </h4>
        <span className="text-[9px] text-[var(--color-text-muted)] font-mono">
          ({dominators.treeEdges.length} tree edges)
        </span>
      </div>
      <p className="text-[10px] text-[var(--color-text-dim)] font-mono px-1 -mt-1">
        {t('optimizer.step3.description', 'Block A dominates block B if every path from the entry to B must go through A. The dominator tree shows these immediate domination relationships.')}
      </p>
      <div ref={(el) => { containerRef.current = el; roSetRef(el); }} className="w-full h-[420px] bg-[var(--color-card)] border border-[var(--color-border)] overflow-hidden">
        <svg ref={svgRef} className="w-full h-full" />
      </div>
    </div>
  );
};

export default DomTree;
