import React, { useEffect, useRef, useState } from 'react';
import * as d3 from 'd3';
import type { TacInstruction } from '../../types';
import type { SchedulingResult, ScheduleEntry } from '../../lib/cfg/scheduling';

interface DependencyGraphProps {
  instructions: TacInstruction[];
  scheduling: SchedulingResult;
  isPlaying: boolean;
  isCompleted: boolean;
}

const UNIT_COLORS: Record<string, string> = {
  ALU: '#00FF88',
  MULT: '#FF00FF',
  MEM: '#00D4FF',
  CMP: '#FFB000',
  CTRL: '#FF3366',
};

const DEP_COLORS: Record<string, string> = {
  data: '#00FF88',
  anti: '#FFB000',
  output: '#FF3366',
};

const ROW_H = 62;
const NODE_H = 38;

function formatInstr(instr?: TacInstruction | null): string {
  if (!instr) return '';
  const parts: string[] = [];
  if (instr.result) parts.push(`${instr.result} =`);
  if (instr.arg1) parts.push(instr.arg1);
  if (instr.operator) parts.push(instr.operator);
  if (instr.arg2) parts.push(instr.arg2);
  if (instr.target && instr.op !== 'label') parts.push(`goto ${instr.target}`);
  return parts.join(' ') || '?';
}

function truncate(s: string, max: number) {
  return s.length <= max ? s : s.slice(0, Math.max(8, max - 3)) + '...';
}

const DependencyGraph: React.FC<DependencyGraphProps> = ({ instructions, scheduling, isPlaying, isCompleted }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const userZoomed = useRef(false);
  const [revealedEdges, setRevealedEdges] = useState<Set<number>>(new Set());

  // Reveal dependency edges one by one while playing
  useEffect(() => {
    if (!isPlaying) {
      if (isCompleted) {
        setRevealedEdges(new Set(scheduling.dependencies.map((_, i) => i)));
      }
      return;
    }
    setRevealedEdges(new Set());
    let i = 0;
    const show = () => {
      if (i >= scheduling.dependencies.length) return;
      setRevealedEdges(prev => new Set([...prev, i]));
      i++;
      timerRef.current = setTimeout(show, 250);
    };
    timerRef.current = setTimeout(show, 200);
    return () => { if (timerRef.current) clearTimeout(timerRef.current); };
  }, [isPlaying, isCompleted, scheduling]);

  // Render dependency graph — defer to next frame so layout is settled
  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const render = () => {
      const svg = d3.select(svgRef.current!);
      svg.selectAll('*').remove();

      const container = containerRef.current!;
      const rect = container.getBoundingClientRect();
      const width = rect.width || container.clientWidth || 800;
      const height = rect.height || container.clientHeight || 380;

      const instrMap = new Map<number, TacInstruction>();
      for (const instr of instructions) instrMap.set(instr.line, instr);

      // Group schedule entries by cycle
      const byCycle = new Map<number, ScheduleEntry[]>();
      for (const e of scheduling.schedule) {
        const arr = byCycle.get(e.cycle);
        if (arr) arr.push(e);
        else byCycle.set(e.cycle, [e]);
      }
      const cycles = [...byCycle.keys()].sort((a, b) => a - b);

      // Node width sized by the longest instruction text
      let longest = 0;
      for (const e of scheduling.schedule) {
        const len = formatInstr(instrMap.get(e.tacLine)).length;
        if (len > longest) longest = len;
      }
      const nodeW = Math.min(320, Math.max(140, longest * 6.2 + 34));
      const GAP = 16;
      const maxPerRow = Math.max(1, ...[...byCycle.values()].map(arr => arr.length));
      const rowW = maxPerRow * nodeW + (maxPerRow - 1) * GAP;

      const TOP = 24;
      const LEFT_MARGIN = 56;
      const layoutW = LEFT_MARGIN + rowW + 20;
      const layoutH = TOP + cycles.length * ROW_H + 20;

      const g = svg.append('g');
      const zoom = d3.zoom<SVGSVGElement, unknown>()
        .scaleExtent([0.25, 3])
        .on('zoom', (e) => {
          userZoomed.current = true;
          g.attr('transform', e.transform);
        });
      svg.call(zoom);

      // Position nodes: one row per cycle, columns left to right
      const positions = new Map<number, { x: number; y: number }>();
      const cycleLabelY = new Map<number, number>();
      cycles.forEach((cycle, ci) => {
        const entries = byCycle.get(cycle)!;
        const rowY = TOP + ci * ROW_H;
        cycleLabelY.set(cycle, rowY + ROW_H / 2);
        const groupY = rowY + (ROW_H - NODE_H) / 2;
        entries.forEach((e, ei) => {
          positions.set(e.tacLine, {
            x: LEFT_MARGIN + ei * (nodeW + GAP),
            y: groupY,
          });
        });
      });

      // Arrow markers per dependency type
      const defs = svg.append('defs');
      for (const [type, color] of Object.entries(DEP_COLORS)) {
        defs.append('marker')
          .attr('id', `dep-arrow-${type}`)
          .attr('viewBox', '0 0 10 10')
          .attr('refX', 9).attr('refY', 5)
          .attr('markerWidth', 5).attr('markerHeight', 5)
          .attr('orient', 'auto')
          .append('path')
          .attr('d', 'M0,0 L10,5 L0,10 Z')
          .attr('fill', color);
      }

      // Dependency edges (curved, top -> bottom, color-coded)
      scheduling.dependencies.forEach((dep, i) => {
        const from = positions.get(dep.from);
        const to = positions.get(dep.to);
        if (!from || !to) return;

        const revealed = revealedEdges.has(i);
        const color = DEP_COLORS[dep.type] || '#6A7B9B';
        const x1 = from.x + nodeW / 2;
        const y1 = from.y + NODE_H;
        const x2 = to.x + nodeW / 2;
        const y2 = to.y;
        const dy = Math.max(20, Math.min(60, (y2 - y1) / 2));
        const path = `M ${x1} ${y1} C ${x1} ${y1 + dy}, ${x2} ${y2 - dy}, ${x2} ${y2}`;

        g.append('path')
          .attr('d', path)
          .attr('fill', 'none')
          .attr('stroke', color)
          .attr('stroke-width', revealed ? 2 : 1)
          .attr('stroke-opacity', revealed ? 1 : 0.15)
          .attr('stroke-dasharray', revealed ? 'none' : '4,4')
          .attr('marker-end', revealed ? `url(#dep-arrow-${dep.type})` : 'none');

        // Variable name at the edge midpoint
        const varName = dep.label.split(':')[0].trim();
        if (varName) {
          g.append('text')
            .attr('x', (x1 + x2) / 2 + 5)
            .attr('y', (y1 + y2) / 2 + 3)
            .attr('font-size', '8px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .attr('fill', color)
            .attr('opacity', revealed ? 0.85 : 0.2)
            .text(varName);
        }
      });

      // Instruction nodes
      for (const entry of scheduling.schedule) {
        const pos = positions.get(entry.tacLine);
        if (!pos) continue;
        const instr = instrMap.get(entry.tacLine);
        const unitColor = UNIT_COLORS[entry.unit] || '#6A7B9B';
        const text = truncate(formatInstr(instr), Math.floor((nodeW - 20) / 6.2));

        const nodeG = g.append('g').attr('transform', `translate(${pos.x},${pos.y})`);
        nodeG.append('rect')
          .attr('width', nodeW).attr('height', NODE_H).attr('rx', 4)
          .attr('fill', '#16161F')
          .attr('stroke', unitColor)
          .attr('stroke-opacity', 0.55)
          .attr('stroke-width', 1.2);
        nodeG.append('text')
          .attr('x', 8).attr('y', 13)
          .attr('font-size', '8px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('fill', '#6A7B9B')
          .text(`L${entry.tacLine}`);
        nodeG.append('text')
          .attr('x', nodeW - 8).attr('y', 13)
          .attr('text-anchor', 'end')
          .attr('font-size', '8px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('fill', unitColor)
          .text(entry.unit);
        nodeG.append('text')
          .attr('x', 10).attr('y', 29)
          .attr('font-size', '10px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('fill', '#E0E0F0')
          .text(text);
      }

      // Cycle labels (left column)
      for (const [cycle, y] of cycleLabelY) {
        g.append('text')
          .attr('x', 10).attr('y', y + 3)
          .attr('font-size', '9px')
          .attr('font-family', 'JetBrains Mono, monospace')
          .attr('font-weight', 'bold')
          .attr('fill', '#FFB000')
          .text(`C${cycle}`);
      }

      // Fit initial view
      if (!userZoomed.current) {
        const pad = 14;
        const scale = Math.min(1, (width - pad * 2) / layoutW, (height - pad * 2) / layoutH);
        svg.call(zoom.transform, d3.zoomIdentity.translate(pad, pad).scale(scale));
      }
    };
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [scheduling, revealedEdges, instructions]);

  return (
    <div ref={containerRef} className="w-full h-[380px] overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
};

export default DependencyGraph;