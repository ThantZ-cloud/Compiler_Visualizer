import React, { useEffect, useRef } from 'react';
import { useResizeObserver } from '../../hooks/useResizeObserver';
import * as d3 from 'd3';
import type { RegAllocationResult } from '../../lib/cfg/regalloc';
import { REG_COLORS } from '../../lib/cfg/regColors';

interface InterferenceGraphProps {
  allocation: RegAllocationResult;
  highlightVar?: string | null;
}

const SPILL_COLOR = '#3A3A48';

interface GraphNode extends d3.SimulationNodeDatum {
  id: string;
}

interface GraphEdge extends d3.SimulationLinkDatum<GraphNode> {
  source: string | GraphNode;
  target: string | GraphNode;
}

const InterferenceGraph: React.FC<InterferenceGraphProps> = ({ allocation, highlightVar }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();

  useEffect(() => {
    if (!svgRef.current || !containerRef.current) return;
    const render = () => {
      const svg = d3.select(svgRef.current!);
      svg.selectAll('*').remove();

      const container = containerRef.current!;
      const width = observedWidth || container.clientWidth || 600;
      const height = container.clientHeight || 240;

      const nodes: GraphNode[] = allocation.variables.map(v => ({ id: v }));
      const edges: GraphEdge[] = allocation.interferenceGraph.map(e => ({ source: e.from, target: e.to }));

      const g = svg.append('g');

      // Interference edges (undirected — plain lines)
      const link = g.append('g')
        .attr('stroke', 'rgba(255,255,255,0.18)')
        .attr('stroke-width', 1.2)
        .selectAll<SVGLineElement, GraphEdge>('line')
        .data(edges)
        .join('line');

      // Variable nodes
      const node = g.append('g')
        .selectAll<SVGGElement, GraphNode>('g')
        .data(nodes)
        .join('g');

      node.append('circle')
        .attr('r', 22)
        .attr('fill', d => {
          const reg = allocation.assignments.get(d.id);
          return reg === undefined ? SPILL_COLOR : REG_COLORS[reg % REG_COLORS.length];
        })
        .attr('fill-opacity', 0.9)
        .attr('stroke', d => (highlightVar && d.id !== highlightVar) ? 'rgba(255,255,255,0.2)' : '#FFFFFF')
        .attr('stroke-width', d => (highlightVar && d.id === highlightVar) ? 3 : 1.2)
        .attr('opacity', d => (highlightVar && d.id !== highlightVar) ? 0.3 : 1)
        .style('transition', 'opacity 200ms, stroke 200ms');

      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', '0.35em')
        .attr('font-size', '10px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('font-weight', 'bold')
        .attr('fill', '#FFFFFF')
        .text(d => d.id);

      node.append('text')
        .attr('text-anchor', 'middle')
        .attr('dy', 38)
        .attr('font-size', '8px')
        .attr('font-family', 'JetBrains Mono, monospace')
        .attr('fill', d => {
          const reg = allocation.assignments.get(d.id);
          return reg === undefined ? '#FF3366' : REG_COLORS[reg % REG_COLORS.length];
        })
        .style('opacity', 0)
        .transition()
        .delay(600)
        .duration(300)
        .style('opacity', 1)
        .text(d => {
          const reg = allocation.assignments.get(d.id);
          return reg === undefined ? '[stack]' : `R${reg}`;
        });

      // Force simulation — converge quickly, then freeze for a stable layout
      const simulation = d3.forceSimulation<GraphNode>(nodes)
        .force('link', d3.forceLink<GraphNode, GraphEdge>(edges).id(d => d.id).distance(95))
        .force('charge', d3.forceManyBody().strength(-300))
        .force('center', d3.forceCenter(width / 2, height / 2))
        .force('collide', d3.forceCollide(32))
        .stop();

      simulation.on('tick', () => {
        link
          .attr('x1', d => (d.source as GraphNode).x ?? 0)
          .attr('y1', d => (d.source as GraphNode).y ?? 0)
          .attr('x2', d => (d.target as GraphNode).x ?? 0)
          .attr('y2', d => (d.target as GraphNode).y ?? 0);
        node.attr('transform', d => `translate(${d.x},${d.y})`);
      });

      for (let i = 0; i < 150; i++) simulation.tick();

      simulation.on('tick', null);
      link
        .attr('x1', d => (d.source as GraphNode).x ?? 0)
        .attr('y1', d => (d.source as GraphNode).y ?? 0)
        .attr('x2', d => (d.target as GraphNode).x ?? 0)
        .attr('y2', d => (d.target as GraphNode).y ?? 0);
      node.attr('transform', d => `translate(${d.x},${d.y})`);

      simulation.stop();
    };
    const raf = requestAnimationFrame(render);
    return () => cancelAnimationFrame(raf);
  }, [allocation, highlightVar, observedWidth]);

  return (
    <div ref={(el) => { containerRef.current = el; roSetRef(el); }} className="w-full h-[240px] overflow-hidden">
      <svg ref={svgRef} className="w-full h-full block" />
    </div>
  );
};

export default InterferenceGraph;
