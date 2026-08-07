import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { ZoomIn, ZoomOut, RotateCcw, GitFork, ArrowDown, ArrowUp } from 'lucide-react';
import type { CfgMethod, CfgNode, CfgEdge } from '../types';

interface CfgGraphProps {
  cfgJson: string;
}

const COLOR_MAP: Record<string, { bg: string; border: string; text: string; headerBg: string }> = {
  entry: { bg: '#161622', border: '#8A2BE2', text: '#D8BFD8', headerBg: 'rgba(138, 43, 226, 0.25)' },
  exit: { bg: '#20161A', border: '#FF3366', text: '#FF99B2', headerBg: 'rgba(255, 51, 102, 0.25)' },
  condition: { bg: '#1F1B12', border: '#FFB000', text: '#FFE082', headerBg: 'rgba(255, 176, 0, 0.25)' },
  branch: { bg: '#102018', border: '#00FF88', text: '#A3FFD6', headerBg: 'rgba(0, 255, 136, 0.2)' },
  loop: { bg: '#1F1220', border: '#FF00FF', text: '#FFB3FF', headerBg: 'rgba(255, 0, 255, 0.25)' },
  merge: { bg: '#121A24', border: '#00D4FF', text: '#99EBFF', headerBg: 'rgba(0, 212, 255, 0.2)' },
  basic: { bg: '#16161F', border: '#3A3A52', text: '#E0E0F0', headerBg: 'rgba(58, 58, 82, 0.4)' },
};

function getBlockStyle(type?: string, label?: string) {
  const t = (type || label || '').toLowerCase();
  if (t.includes('entry')) return COLOR_MAP.entry;
  if (t.includes('exit')) return COLOR_MAP.exit;
  if (t.includes('cond') || t.includes('while') || t.includes('for') || t.includes('if')) return COLOR_MAP.condition;
  if (t.includes('then') || t.includes('else') || t.includes('case') || t.includes('branch')) return COLOR_MAP.branch;
  if (t.includes('loop') || t.includes('body')) return COLOR_MAP.loop;
  if (t.includes('join') || t.includes('merge') || t.includes('after')) return COLOR_MAP.merge;
  return COLOR_MAP.basic;
}

function getEdgeColor(label: string): string {
  const lower = (label || '').toLowerCase();
  if (lower.includes('true') || lower === 't') return '#00FF88';
  if (lower.includes('false') || lower === 'f') return '#FF3366';
  if (lower.includes('loop')) return '#FF00FF';
  if (lower.includes('break') || lower.includes('continue') || lower.includes('catch')) return '#FFB000';
  if (lower.includes('case') || lower.includes('default')) return '#00D4FF';
  return '#6A7B9B';
}

function parseCfg(jsonStr: string): CfgMethod[] | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.error) return null;
    return data.methods || null;
  } catch {
    return null;
  }
}

interface SimNode extends d3.SimulationNodeDatum {
  id: number;
  label: string;
  type?: string;
  statements: string[];
  width: number;
  height: number;
  level: number;
}

interface SimLink extends d3.SimulationLinkDatum<SimNode> {
  source: SimNode | number;
  target: SimNode | number;
  label: string;
  isBackEdge?: boolean;
}

const CfgGraph: React.FC<CfgGraphProps> = ({ cfgJson }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const zoomBehaviorRef = useRef<d3.ZoomBehavior<SVGSVGElement, unknown> | null>(null);

  const [selectedMethod, setSelectedMethod] = useState<string | null>(null);
  const [selectedBlockId, setSelectedBlockId] = useState<number | null>(null);

  const methods = parseCfg(cfgJson);
  const currentMethod = selectedMethod && methods
    ? methods.find(m => m.declaringType + '.' + m.name === selectedMethod)
    : (methods && methods.length > 0 ? methods[0] : null);

  const selectedBlock = currentMethod && selectedBlockId !== null
    ? currentMethod.blocks.find(b => b.id === selectedBlockId) || null
    : null;

  // Topological / Level-based ranking algorithm for DAG/CFG
  const calculateNodeLevels = useCallback((blocks: CfgNode[], edges: CfgEdge[]): Map<number, number> => {
    const levels = new Map<number, number>();
    if (blocks.length === 0) return levels;

    // Build adjacency list
    const adj = new Map<number, number[]>();
    const inDegree = new Map<number, number>();
    blocks.forEach(b => {
      adj.set(b.id, []);
      inDegree.set(b.id, 0);
      levels.set(b.id, 0);
    });

    edges.forEach(e => {
      // Ignore self-loops
      if (e.from !== e.to) {
        adj.get(e.from)?.push(e.to);
      }
    });

    // BFS starting from entry block (id: 0 or lowest id)
    const entryId = blocks[0].id;
    const queue: { id: number; level: number }[] = [{ id: entryId, level: 0 }];
    const visited = new Set<number>([entryId]);

    while (queue.length > 0) {
      const { id, level } = queue.shift()!;
      levels.set(id, Math.max(levels.get(id) || 0, level));

      const neighbors = adj.get(id) || [];
      for (const neighbor of neighbors) {
        // Forward edge if not forming a loop back to lower/equal level visited nodes
        if (!visited.has(neighbor)) {
          visited.add(neighbor);
          queue.push({ id: neighbor, level: level + 1 });
        } else if ((levels.get(neighbor) || 0) < level + 1 && (levels.get(neighbor) || 0) > 0) {
          // If we reach a visited node that is further down, push its level down
          levels.set(neighbor, level + 1);
        }
      }
    }

    // Ensure all blocks have a level assigned
    blocks.forEach((b, idx) => {
      if (!levels.has(b.id) || levels.get(b.id) === 0 && b.id !== entryId) {
        levels.set(b.id, idx);
      }
    });

    return levels;
  }, []);

  const renderGraph = useCallback(() => {
    if (!svgRef.current || !containerRef.current || !currentMethod) return;

    const container = containerRef.current;
    const width = container.clientWidth || 900;
    const height = container.clientHeight || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g').attr('class', 'cfg-main-group');

    // Zoom setup
    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.15, 3.5])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);
    zoomBehaviorRef.current = zoom;

    const blocks = currentMethod.blocks;
    const edges = currentMethod.edges;
    if (blocks.length === 0) return;

    const levels = calculateNodeLevels(blocks, edges);

    // Node dimensions
    const NODE_WIDTH = 270;
    const MIN_NODE_HEIGHT = 70;
    const LINE_HEIGHT = 18;

    // Calculate node positions based on levels
    const levelGroups = new Map<number, CfgNode[]>();
    blocks.forEach(b => {
      const lvl = levels.get(b.id) || 0;
      if (!levelGroups.has(lvl)) levelGroups.set(lvl, []);
      levelGroups.get(lvl)!.push(b);
    });

    const simNodes: SimNode[] = blocks.map(b => {
      const stmts = b.statements || [];
      const visibleStmtsCount = Math.min(stmts.length, 6);
      const h = Math.max(MIN_NODE_HEIGHT, 42 + visibleStmtsCount * LINE_HEIGHT + (stmts.length > 6 ? 18 : 0));
      const lvl = levels.get(b.id) || 0;

      const group = levelGroups.get(lvl) || [b];
      const indexInGroup = group.findIndex(gb => gb.id === b.id);
      const totalInGroup = group.length;

      // Position nodes in vertical ranks
      const initialX = width / 2 + (indexInGroup - (totalInGroup - 1) / 2) * 320;
      const initialY = 80 + lvl * 180;

      return {
        id: b.id,
        label: b.label,
        type: b.type,
        statements: stmts,
        width: NODE_WIDTH,
        height: h,
        level: lvl,
        x: initialX,
        y: initialY,
        fx: initialX, // Lock vertical ranks for structured tree flow
        fy: initialY,
      };
    });

    const nodeMap = new Map<number, SimNode>();
    simNodes.forEach(n => nodeMap.set(n.id, n));

    const simLinks: SimLink[] = edges.map(e => {
      const srcNode = nodeMap.get(e.from);
      const tgtNode = nodeMap.get(e.to);
      const isBackEdge = (srcNode && tgtNode && srcNode.level >= tgtNode.level);

      return {
        source: e.from,
        target: e.to,
        label: e.label,
        isBackEdge: !!isBackEdge,
      };
    });

    // Arrow marker defs
    const defs = svg.append('defs');
    const edgeTypes = ['true', 'false', 'loop', 'break', 'fallthrough', 'default', 'unconditional'];

    edgeTypes.forEach(type => {
      const color = getEdgeColor(type);
      defs.append('marker')
        .attr('id', `marker-${type}`)
        .attr('viewBox', '0 -5 10 10')
        .attr('refX', 12)
        .attr('refY', 0)
        .attr('markerWidth', 7)
        .attr('markerHeight', 7)
        .attr('orient', 'auto')
        .append('path')
        .attr('d', 'M0,-4L10,0L0,4')
        .attr('fill', color);
    });

    // Render links
    const linkGroup = g.append('g').attr('class', 'cfg-links');
    const linkPath = linkGroup.selectAll<SVGPathElement, SimLink>('path')
      .data(simLinks)
      .join('path')
      .attr('fill', 'none')
      .attr('stroke', d => getEdgeColor(d.label))
      .attr('stroke-width', 2)
      .attr('stroke-dasharray', d => d.label === 'loop' || d.isBackEdge ? '5,4' : 'none')
      .attr('stroke-opacity', 0.85)
      .attr('marker-end', d => {
        const labelKey = (d.label || 'unconditional').toLowerCase().replace(/\s+/g, '_');
        return `url(#marker-${edgeTypes.includes(labelKey) ? labelKey : 'default'})`;
      });

    // Edge Label Badges
    const edgeLabelGroup = g.append('g').attr('class', 'cfg-edge-labels');
    const edgeLabelG = edgeLabelGroup.selectAll<SVGGElement, SimLink>('g')
      .data(simLinks.filter(d => d.label && d.label.trim().length > 0))
      .join('g')
      .attr('class', 'edge-label-badge');

    edgeLabelG.append('rect')
      .attr('rx', 4)
      .attr('ry', 4)
      .attr('fill', '#0E0E18')
      .attr('stroke', d => getEdgeColor(d.label))
      .attr('stroke-width', 1)
      .attr('height', 18);

    edgeLabelG.append('text')
      .attr('fill', d => getEdgeColor(d.label))
      .attr('font-size', '9px')
      .attr('font-weight', 'bold')
      .attr('font-family', 'JetBrains Mono, monospace')
      .attr('text-anchor', 'middle')
      .attr('dy', 12)
      .text(d => d.label.toUpperCase());

    // Compute edge label text sizes
    edgeLabelG.each(function (d) {
      const txt = d.label.toUpperCase();
      const textWidth = Math.max(28, txt.length * 7 + 10);
      d3.select(this).select('rect')
        .attr('width', textWidth)
        .attr('x', -textWidth / 2)
        .attr('y', 0);
    });

    // Render nodes
    const nodeGroup = g.append('g').attr('class', 'cfg-nodes');
    const nodeG = nodeGroup.selectAll<SVGGElement, SimNode>('g')
      .data(simNodes)
      .join('g')
      .attr('class', 'cfg-node-card')
      .attr('transform', d => `translate(${d.x! - d.width / 2},${d.y! - d.height / 2})`)
      .style('cursor', 'pointer')
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedBlockId(d.id);
      });

    // Node outer card background
    nodeG.each(function (d) {
      const style = getBlockStyle(d.type, d.label);
      const group = d3.select(this);
      const isSelected = selectedBlockId === d.id;

      // Outer Box Shadow / Glow
      group.append('rect')
        .attr('width', d.width)
        .attr('height', d.height)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', style.bg)
        .attr('stroke', isSelected ? '#00FF88' : style.border)
        .attr('stroke-width', isSelected ? 3 : 1.5)
        .attr('filter', isSelected ? 'drop-shadow(0 0 12px rgba(0,255,136,0.5))' : 'drop-shadow(0 4px 10px rgba(0,0,0,0.5))');

      // Card Header
      const headerG = group.append('g').attr('class', 'card-header');
      headerG.append('rect')
        .attr('width', d.width)
        .attr('height', 30)
        .attr('rx', 8)
        .attr('ry', 8)
        .attr('fill', style.headerBg);

      // Clip round bottom corners of header
      headerG.append('rect')
        .attr('y', 20)
        .attr('width', d.width)
        .attr('height', 10)
        .attr('fill', style.headerBg);

      // Header title / Block Badge
      headerG.append('text')
        .attr('x', 12)
        .attr('y', 19)
        .attr('fill', style.text)
        .attr('font-size', '11px')
        .attr('font-weight', 'bold')
        .attr('font-family', 'Orbitron, sans-serif')
        .text(`B${d.id}: ${d.label.toUpperCase()}`);

      // Header Tag
      if (d.type) {
        const tagText = d.type.toUpperCase();
        headerG.append('text')
          .attr('x', d.width - 12)
          .attr('y', 19)
          .attr('text-anchor', 'end')
          .attr('fill', style.border)
          .attr('font-size', '9px')
          .attr('font-weight', 'bold')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text(`[${tagText}]`);
      }

      // Code body area divider
      group.append('line')
        .attr('x1', 0)
        .attr('y1', 30)
        .attr('x2', d.width)
        .attr('y2', 30)
        .attr('stroke', style.border)
        .attr('stroke-opacity', 0.4);

      // Statements rendering
      const stmts = d.statements || [];
      if (stmts.length === 0) {
        group.append('text')
          .attr('x', 14)
          .attr('y', 48)
          .attr('fill', '#666680')
          .attr('font-size', '10px')
          .attr('font-style', 'italic')
          .attr('font-family', 'JetBrains Mono, monospace')
          .text('(empty basic block)');
      } else {
        const visible = stmts.slice(0, 6);
        visible.forEach((stmt, i) => {
          const yPos = 48 + i * LINE_HEIGHT;

          // Bullet dot
          group.append('circle')
            .attr('cx', 16)
            .attr('cy', yPos - 3)
            .attr('r', 2)
            .attr('fill', style.border);

          // Code line
          const displayCode = stmt.length > 34 ? stmt.substring(0, 31) + '...' : stmt;
          const textEl = group.append('text')
            .attr('x', 26)
            .attr('y', yPos)
            .attr('fill', '#E0E0F0')
            .attr('font-size', '11px')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text(displayCode);

          // Highlight key control keywords
          if (stmt.startsWith('if ') || stmt.startsWith('while ') || stmt.startsWith('for ')) {
            textEl.attr('fill', '#FFB000').attr('font-weight', 'bold');
          } else if (stmt.startsWith('return ') || stmt.startsWith('return')) {
            textEl.attr('fill', '#FF00FF').attr('font-weight', 'bold');
          } else if (stmt.startsWith('break') || stmt.startsWith('continue')) {
            textEl.attr('fill', '#00D4FF').attr('font-weight', 'bold');
          }
        });

        if (stmts.length > 6) {
          group.append('text')
            .attr('x', 26)
            .attr('y', 48 + 6 * LINE_HEIGHT)
            .attr('fill', '#8888AA')
            .attr('font-size', '10px')
            .attr('font-weight', 'bold')
            .attr('font-family', 'JetBrains Mono, monospace')
            .text(`+ ${stmts.length - 6} more statements...`);
        }
      }
    });

    // Update curve connections on positioning
    function updateLinkPositions() {
      linkPath.attr('d', d => {
        const src = nodeMap.get(typeof d.source === 'number' ? d.source : (d.source as SimNode).id)!;
        const tgt = nodeMap.get(typeof d.target === 'number' ? d.target : (d.target as SimNode).id)!;

        const x1 = src.x!;
        const y1 = src.y! + src.height / 2;
        const x2 = tgt.x!;
        const y2 = tgt.y! - tgt.height / 2;

        if (d.isBackEdge) {
          // Curved back-edge arc to the side
          const arcOffset = 180 + Math.abs(src.id - tgt.id) * 30;
          const ctrlX = Math.min(x1, x2) - arcOffset;
          return `M ${x1 - src.width / 2},${src.y!} C ${ctrlX},${y1} ${ctrlX},${y2} ${x2 - tgt.width / 2},${tgt.y!}`;
        }

        // Smooth vertical S-curve for forward edges
        const dy = y2 - y1;
        const ctrlY = y1 + dy * 0.5;
        return `M ${x1},${y1} C ${x1},${ctrlY} ${x2},${ctrlY} ${x2},${y2}`;
      });

      edgeLabelG.attr('transform', d => {
        const src = nodeMap.get(typeof d.source === 'number' ? d.source : (d.source as SimNode).id)!;
        const tgt = nodeMap.get(typeof d.target === 'number' ? d.target : (d.target as SimNode).id)!;

        if (d.isBackEdge) {
          const arcOffset = 180 + Math.abs(src.id - tgt.id) * 30;
          const ctrlX = Math.min(src.x!, tgt.x!) - arcOffset;
          const midY = (src.y! + tgt.y!) / 2;
          return `translate(${ctrlX + 30},${midY})`;
        }

        const midX = (src.x! + tgt.x!) / 2;
        const midY = (src.y! + src.height / 2 + tgt.y! - tgt.height / 2) / 2;
        return `translate(${midX},${midY - 9})`;
      });
    }

    updateLinkPositions();

    // Auto-fit initial view centered
    const bounds = g.node()?.getBBox();
    if (bounds && bounds.width > 0) {
      const padding = 80;
      const scale = Math.min(
        (width - padding * 2) / bounds.width,
        (height - padding * 2) / bounds.height,
        1.1
      );
      const tx = (width - bounds.width * scale) / 2 - bounds.x * scale;
      const ty = (height - bounds.height * scale) / 2 - bounds.y * scale;
      svg.call(zoom.transform, d3.zoomIdentity.translate(tx, ty).scale(scale));
    }
  }, [currentMethod, selectedBlockId, calculateNodeLevels]);

  useEffect(() => {
    renderGraph();
  }, [renderGraph]);

  const handleZoom = (factor: number) => {
    if (!svgRef.current || !zoomBehaviorRef.current) return;
    d3.select(svgRef.current)
      .transition()
      .duration(300)
      .call(zoomBehaviorRef.current.scaleBy, factor);
  };

  const handleResetZoom = () => {
    renderGraph();
  };

  if (!methods || methods.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-sm font-mono">
        <GitFork size={48} className="text-[var(--color-neon)] opacity-30 mb-4" />
        No control flow graph data available for this code.
      </div>
    );
  }

  const methodOptions = methods.map(m => ({
    value: `${m.declaringType}.${m.name}`,
    label: `${m.declaringType}.${m.name}(${m.parameters.join(', ')})${m.returnType !== 'constructor' ? ' → ' + m.returnType : ''}`,
  }));

  // Find incoming & outgoing edges for selected block
  const incomingEdges = currentMethod && selectedBlock
    ? currentMethod.edges.filter(e => e.to === selectedBlock.id)
    : [];
  const outgoingEdges = currentMethod && selectedBlock
    ? currentMethod.edges.filter(e => e.from === selectedBlock.id)
    : [];

  return (
    <div className="flex flex-col h-full gap-3 bg-[var(--color-void)]">
      {/* Control Header */}
      <div className="flex justify-between items-center px-4 py-2 bg-[var(--color-card)] border border-[var(--color-border)] rounded-md shrink-0">
        <div className="flex items-center gap-3">
          <label className="text-xs font-bold text-[var(--color-text-muted)] font-display tracking-wider uppercase">
            METHOD:
          </label>
          <select
            value={currentMethod ? `${currentMethod.declaringType}.${currentMethod.name}` : ''}
            onChange={(e) => {
              setSelectedMethod(e.target.value);
              setSelectedBlockId(null);
            }}
            className="px-3 py-1 text-xs font-mono bg-[var(--color-void)] text-[var(--color-neon)] border border-[var(--color-border)] rounded outline-none focus:border-[var(--color-neon)] cursor-pointer"
          >
            {methodOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>

          {currentMethod && (
            <span className="text-xs font-mono text-[var(--color-text-muted)] ml-2">
              {currentMethod.blocks.length} Basic Blocks &middot; {currentMethod.edges.length} Flow Edges
            </span>
          )}
        </div>

        {/* Legend & Zoom Toolbar */}
        <div className="flex items-center gap-4">
          <div className="hidden lg:flex items-center gap-3 text-[10px] font-mono text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00FF88]" /> True
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF3366]" /> False
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#FF00FF]" /> Loop
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#00D4FF]" /> Unconditional
            </span>
          </div>

          <div className="w-px h-5 bg-[var(--color-border)]" />

          <div className="flex items-center gap-1">
            <button
              onClick={() => handleZoom(1.2)}
              className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-neon)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded transition-colors"
              title={t('cfg.zoomIn')}
            >
              <ZoomIn size={14} />
            </button>
            <button
              onClick={() => handleZoom(0.8)}
              className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-neon)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded transition-colors"
              title={t('cfg.zoomOut')}
            >
              <ZoomOut size={14} />
            </button>
            <button
              onClick={handleResetZoom}
              className="p-1.5 text-[var(--color-text-dim)] hover:text-[var(--color-neon)] bg-[var(--color-surface)] hover:bg-[var(--color-surface-2)] border border-[var(--color-border)] rounded transition-colors"
              title={t('cfg.resetView')}
            >
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </div>

      {/* SVG Canvas */}
      <div
        ref={containerRef}
        className="flex-1 min-h-[400px] bg-[var(--color-card)] border border-[var(--color-border)] rounded-md overflow-hidden relative"
        onClick={() => setSelectedBlockId(null)}
      >
        <svg ref={svgRef} className="w-full h-full block cursor-grab active:cursor-grabbing" />
      </div>

      {/* Block Inspector Drawer */}
      {selectedBlock && (
        <div className="p-4 bg-[var(--color-card)] border border-[var(--color-neon)]/40 rounded-md shadow-lg flex flex-col gap-3 shrink-0 animate-in fade-in slide-in-from-bottom-2 duration-200">
          <div className="flex justify-between items-center border-b border-[var(--color-border)] pb-2">
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold font-display tracking-wider text-[var(--color-neon)] uppercase">
                SELECTED BLOCK:
              </span>
              <span className="px-2.5 py-0.5 text-xs font-bold font-mono bg-[var(--color-neon)]/10 text-[var(--color-neon)] border border-[var(--color-neon)]/30 rounded">
                B{selectedBlock.id}: {selectedBlock.label.toUpperCase()}
              </span>
              {selectedBlock.type && (
                <span className="px-2 py-0.5 text-[10px] font-mono bg-[var(--color-surface-2)] text-[var(--color-text-dim)] rounded">
                  [{selectedBlock.type.toUpperCase()}]
                </span>
              )}
            </div>

            <div className="flex items-center gap-4 text-xs font-mono text-[var(--color-text-muted)]">
              <span className="flex items-center gap-1">
                <ArrowDown size={12} className="text-[var(--color-cyan)]" /> Predecessors: {incomingEdges.length}
              </span>
              <span className="flex items-center gap-1">
                <ArrowUp size={12} className="text-[var(--color-amber)]" /> Successors: {outgoingEdges.length}
              </span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs font-mono">
            {/* Statements List */}
            <div className="md:col-span-2 flex flex-col gap-1.5">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase font-display">
                BASIC BLOCK INSTRUCTIONS ({selectedBlock.statements.length})
              </span>
              <div className="p-3 bg-[var(--color-void)] border border-[var(--color-border)] rounded max-h-[140px] overflow-auto flex flex-col gap-1">
                {selectedBlock.statements.length === 0 ? (
                  <span className="text-[var(--color-text-muted)] italic">{t('cfg.emptyBlock')}</span>
                ) : (
                  selectedBlock.statements.map((stmt, idx) => (
                    <div key={idx} className="flex items-center gap-2">
                      <span className="text-[var(--color-text-muted)] w-5 text-right select-none">{idx + 1}.</span>
                      <span className="text-[var(--color-text)] whitespace-pre-wrap break-all">{stmt}</span>
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Edge Connections */}
            <div className="flex flex-col gap-2">
              <span className="text-[10px] font-bold text-[var(--color-text-muted)] tracking-wider uppercase font-display">
                CONTROL FLOW EDGES
              </span>
              <div className="p-3 bg-[var(--color-void)] border border-[var(--color-border)] rounded max-h-[140px] overflow-auto flex flex-col gap-2 text-[11px]">
                <div>
                  <span className="text-[var(--color-cyan)] font-bold">{t('cfg.in')}</span>
                  {incomingEdges.length === 0 ? t('cfg.noneEntry') : incomingEdges.map(e => `B${e.from}${e.label ? ` [${e.label}]` : ''}`).join(', ')}
                </div>
                <div>
                  <span className="text-[var(--color-amber)] font-bold">{t('cfg.out')}</span>
                  {outgoingEdges.length === 0 ? t('cfg.noneExit') : outgoingEdges.map(e => `B${e.to}${e.label ? ` [${e.label}]` : ''}`).join(', ')}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CfgGraph;
