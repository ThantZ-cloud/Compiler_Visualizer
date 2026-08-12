import React, { useRef, useEffect, useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useTranslation } from 'react-i18next';
import * as d3 from 'd3';
import type { CodeGenerationData, BasicBlockInfo, EdgeInfo } from '../../types';

interface Props {
  data: CodeGenerationData;
  isPlaying: boolean;
  isCompleted: boolean;
}

interface LayoutNode {
  id: number;
  x: number;
  y: number;
  block: BasicBlockInfo;
}

interface LayoutEdge {
  source: LayoutNode;
  target: LayoutNode;
  edge: EdgeInfo;
}

const BLOCK_COLORS: Record<string, string> = {
  entry: '#4ec9b0',
  exit: '#f44747',
  branch: '#c586c0',
  loop: '#dcdcaa',
  merge: '#569cd6',
  normal: '#6a9955',
};

const EDGE_COLORS: Record<string, string> = {
  fallthrough: '#569cd6',
  branch_true: '#4ec9b0',
  branch_false: '#f44747',
  loop_back: '#dcdcaa',
  goto: '#c586c0',
};

const FlowGraphEdges: React.FC<Props> = ({ data, isPlaying }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [revealEdges, setRevealEdges] = useState(0);
  const [dimensions, setDimensions] = useState({ width: 800, height: 400 });

  // Layout: simple top-to-bottom layered layout
  const { nodes, edges } = useMemo(() => {
    if (data.basicBlocks.length === 0) return { nodes: [], edges: [] };

    const BLOCK_W = 200;
    const BLOCK_H = 40;
    const GAP_X = 60;
    const GAP_Y = 80;

    // Simple layered layout: assign layers based on BFS from entry
    const layers: number[] = new Array(data.basicBlocks.length).fill(-1);
    layers[0] = 0;
    const queue = [0];
    while (queue.length > 0) {
      const curr = queue.shift()!;
      const block = data.basicBlocks[curr];
      for (const edge of block.edges) {
        if (layers[edge.targetBlockId] === -1) {
          layers[edge.targetBlockId] = layers[curr] + 1;
          queue.push(edge.targetBlockId);
        }
      }
    }
    // Assign unvisited blocks to sequential layers
    let maxLayer = Math.max(...layers.filter(l => l >= 0), 0);
    for (let i = 0; i < layers.length; i++) {
      if (layers[i] === -1) {
        layers[i] = ++maxLayer;
      }
    }

    // Group blocks by layer
    const layerGroups = new Map<number, number[]>();
    for (let i = 0; i < layers.length; i++) {
      const layer = layers[i];
      if (!layerGroups.has(layer)) layerGroups.set(layer, []);
      layerGroups.get(layer)!.push(i);
    }

    // Position nodes
    const layoutNodes: LayoutNode[] = [];
    const sortedLayers = Array.from(layerGroups.keys()).sort((a, b) => a - b);

    for (const layer of sortedLayers) {
      const blockIds = layerGroups.get(layer)!;
      const totalWidth = blockIds.length * BLOCK_W + (blockIds.length - 1) * GAP_X;
      const startX = -totalWidth / 2;

      for (let i = 0; i < blockIds.length; i++) {
        const blockId = blockIds[i];
        layoutNodes.push({
          id: blockId,
          x: startX + i * (BLOCK_W + GAP_X) + BLOCK_W / 2,
          y: layer * (BLOCK_H + GAP_Y) + BLOCK_H / 2,
          block: data.basicBlocks[blockId],
        });
      }
    }

    // Build edges
    const nodeMap = new Map<number, LayoutNode>();
    for (const n of layoutNodes) nodeMap.set(n.id, n);

    const layoutEdges: LayoutEdge[] = [];
    for (const block of data.basicBlocks) {
      const source = nodeMap.get(block.id);
      if (!source) continue;
      for (const edge of block.edges) {
        const target = nodeMap.get(edge.targetBlockId);
        if (target) {
          layoutEdges.push({ source, target, edge });
        }
      }
    }

    // Update SVG dimensions
    const xs = layoutNodes.map(n => n.x);
    const ys = layoutNodes.map(n => n.y);
    const minX = Math.min(...xs) - BLOCK_W;
    const maxX = Math.max(...xs) + BLOCK_W;
    const minY = Math.min(...ys) - 20;
    const maxY = Math.max(...ys) + BLOCK_H + 40;
    setDimensions({ width: maxX - minX + 40, height: maxY - minY + 40 });

    return { nodes: layoutNodes, edges: layoutEdges };
  }, [data]);

  // Reveal edges during animation
  useEffect(() => {
    if (!isPlaying) {
      setRevealEdges(edges.length);
      return;
    }
    setRevealEdges(0);
    const interval = setInterval(() => {
      setRevealEdges(prev => {
        if (prev >= edges.length) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 300);
    return () => clearInterval(interval);
  }, [isPlaying, edges.length]);

  // D3 rendering
  useEffect(() => {
    if (!svgRef.current || nodes.length === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const BLOCK_W = 200;
    const BLOCK_H = 40;

    // Center offset
    const xs = nodes.map(n => n.x);
    const offsetX = -Math.min(...xs) + 20;
    const offsetY = -Math.min(...nodes.map(n => n.y)) + 20;

    const g = svg.append('g').attr('transform', `translate(${offsetX},${offsetY})`);

    // Draw edges
    const visibleEdges = edges.slice(0, revealEdges);
    for (const layoutEdge of visibleEdges) {
      const { source, target, edge } = layoutEdge;
      const color = EDGE_COLORS[edge.kind] || '#569cd6';

      // Calculate connection points
      const sx = source.x;
      const sy = source.y + BLOCK_H / 2;
      const tx = target.x;
      const ty = target.y - BLOCK_H / 2;

      // Determine if this is a back edge (needs curve)
      const isBackEdge = edge.kind === 'loop_back';
      const isSideEdge = Math.abs(sx - tx) > 10;

      let pathD: string;
      if (isBackEdge) {
        // Curve to the side for back edges
        const curveX = Math.max(sx, tx) + BLOCK_W / 2 + 40;
        pathD = `M ${sx} ${sy} C ${curveX} ${sy}, ${curveX} ${ty}, ${tx} ${ty}`;
      } else if (isSideEdge) {
        // Curve for side edges
        const midY = (sy + ty) / 2;
        pathD = `M ${sx} ${sy} C ${sx} ${midY}, ${tx} ${midY}, ${tx} ${ty}`;
      } else {
        // Straight line for fall-through
        pathD = `M ${sx} ${sy} L ${tx} ${ty}`;
      }

      g.append('path')
        .attr('d', pathD)
        .attr('fill', 'none')
        .attr('stroke', color)
        .attr('stroke-width', 2)
        .attr('marker-end', `url(#arrow-${edge.kind})`);

      // Edge label
      if (edge.label) {
        const midX = (sx + tx) / 2 + (isSideEdge ? 20 : 10);
        const midY = (sy + ty) / 2;
        g.append('text')
          .attr('x', midX)
          .attr('y', midY)
          .attr('text-anchor', 'middle')
          .attr('fill', color)
          .attr('font-size', '9px')
          .attr('font-family', 'monospace')
          .text(edge.label.length > 20 ? edge.label.substring(0, 18) + '...' : edge.label);
      }
    }

    // Arrow markers
    const defs = svg.append('defs');
    for (const [kind, color] of Object.entries(EDGE_COLORS)) {
      defs.append('marker')
        .attr('id', `arrow-${kind}`)
        .attr('viewBox', '0 0 10 10')
        .attr('refX', 8)
        .attr('refY', 5)
        .attr('markerWidth', 6)
        .attr('markerHeight', 6)
        .attr('orient', 'auto-start-reverse')
        .append('path')
        .attr('d', 'M 0 0 L 10 5 L 0 10 z')
        .attr('fill', color);
    }

    // Draw block nodes
    for (const node of nodes) {
      const color = BLOCK_COLORS[node.block.type] || BLOCK_COLORS.normal;
      const x = node.x - BLOCK_W / 2;
      const y = node.y - BLOCK_H / 2;

      const blockG = g.append('g');

      // Block rectangle
      blockG.append('rect')
        .attr('x', x)
        .attr('y', y)
        .attr('width', BLOCK_W)
        .attr('height', BLOCK_H)
        .attr('fill', `${color}15`)
        .attr('stroke', color)
        .attr('stroke-width', 1.5)
        .attr('rx', 2);

      // Block ID
      blockG.append('text')
        .attr('x', x + 8)
        .attr('y', y + 16)
        .attr('fill', color)
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'monospace')
        .text(`B${node.block.id}`);

      // Block type
      blockG.append('text')
        .attr('x', x + 8)
        .attr('y', y + 30)
        .attr('fill', `${color}90`)
        .attr('font-size', '8px')
        .attr('font-family', 'monospace')
        .text(node.block.type.toUpperCase() + (node.block.label ? ` (${node.block.label})` : ''));

      // Instruction count
      blockG.append('text')
        .attr('x', x + BLOCK_W - 8)
        .attr('y', y + 22)
        .attr('text-anchor', 'end')
        .attr('fill', 'var(--color-text-muted)')
        .attr('font-size', '9px')
        .attr('font-family', 'monospace')
        .text(`${node.block.instructions.length} instr`);
    }
  }, [nodes, edges, revealEdges]);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
      className="bg-[var(--color-card)] border border-[var(--color-border)] p-4"
    >
      <div className="mb-3">
        <h3 className="text-sm font-bold text-[var(--color-text)] font-display tracking-[0.1em] uppercase">
          {t('codegen.step4.title')}
        </h3>
        <p className="text-xs text-[var(--color-text-muted)] font-mono mt-1">
          {t('codegen.step4.description')}
        </p>
      </div>

      {/* Summary stats */}
      <div className="mb-3 flex items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted)]">
        <span>{data.totalBlocks} blocks</span>
        <span className="text-[var(--color-border)]">|</span>
        <span>{data.totalEdges} edges</span>
        <span className="text-[var(--color-border)]">|</span>
        <span>{data.totalInstructions} instructions</span>
      </div>

      {/* Edge legend */}
      <div className="mb-3 flex flex-wrap gap-3">
        {Object.entries(EDGE_COLORS).map(([kind, color]) => (
          <div key={kind} className="flex items-center gap-1.5">
            <div className="w-4 h-0.5" style={{ backgroundColor: color }} />
            <span className="text-[9px] font-mono text-[var(--color-text-muted)]">
              {kind.replace('_', ' ')}
            </span>
          </div>
        ))}
      </div>

      {/* Flow graph SVG */}
      <div
        ref={containerRef}
        className="border border-[var(--color-border)] bg-[var(--color-void)] overflow-auto"
        style={{ maxHeight: '500px' }}
      >
        <svg
          ref={svgRef}
          width={Math.max(dimensions.width, 400)}
          height={Math.max(dimensions.height, 200)}
          className="block"
        />
      </div>
    </motion.div>
  );
};

export default FlowGraphEdges;
