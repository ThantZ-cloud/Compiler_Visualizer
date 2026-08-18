import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { Search, Filter } from 'lucide-react';
import '../AstTree.css';

interface ScopeNode {
  name: string;
  kind: string;
  scopeId: number;
  type?: string;
  modifiers?: string;
  returnType?: string;
  children?: ScopeNode[];
}

interface SymbolEntry {
  name: string;
  kind: string;
  type: string;
  scope: string;
  modifiers?: string;
}

interface SymbolExplorerProps {
  symbolTableJson: string;
}

const SCOPE_COLORS: Record<string, string> = {
  package: '#4ec9b0',
  class: '#4ec9b0',
  interface: '#4ec9b0',
  enum: '#4ec9b0',
  annotation: '#4ec9b0',
  record: '#4ec9b0',
  method: '#dcdcaa',
  constructor: '#dcdcaa',
  field: '#569cd6',
  fields: '#569cd6',
  variable: '#9cdcfe',
  parameter: '#9cdcfe',
  block: '#6a9955',
  initializer: '#c586c0',
};

function getScopeColor(kind: string): string {
  return SCOPE_COLORS[kind] || '#d4d4d4';
}

function parseScopeTree(jsonStr: string): ScopeNode | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return null;
    return parsed.scopeTree || null;
  } catch {
    return null;
  }
}

function collectSymbolsFromTree(node: ScopeNode | null, parentScope = ''): SymbolEntry[] {
  if (!node) return [];
  const symbols: SymbolEntry[] = [];
  const scopePath = parentScope ? `${parentScope}.${node.name}` : node.name;

  if (['variable', 'parameter', 'field'].includes(node.kind)) {
    symbols.push({
      name: node.name,
      kind: node.kind,
      type: node.type || '',
      scope: scopePath,
      modifiers: node.modifiers,
    });
  }

  for (const child of node.children ?? []) {
    symbols.push(...collectSymbolsFromTree(child, scopePath));
  }

  return symbols;
}

function filterSymbols(symbols: SymbolEntry[], query: string, kind: string): SymbolEntry[] {
  return symbols.filter(sym => {
    const matchesSearch =
      sym.name.toLowerCase().includes(query.toLowerCase()) ||
      sym.type.toLowerCase().includes(query.toLowerCase()) ||
      sym.scope.toLowerCase().includes(query.toLowerCase());
    const matchesKind = kind === 'all' || sym.kind === kind;
    return matchesSearch && matchesKind;
  });
}

const SymbolExplorer: React.FC<SymbolExplorerProps> = ({ symbolTableJson }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [scopeTree, setScopeTree] = useState<ScopeNode | null>(null);
  const [symbols, setSymbols] = useState<SymbolEntry[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [kindFilter, setKindFilter] = useState('all');
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());
  const [selectedNode, setSelectedNode] = useState<ScopeNode | null>(null);

  useEffect(() => {
    const tree = parseScopeTree(symbolTableJson);
    setScopeTree(tree);
    setSymbols(collectSymbolsFromTree(tree));
    setCollapsedNodes(new Set());
    setSelectedNode(null);
  }, [symbolTableJson]);

  const filteredSymbols = filterSymbols(symbols, searchQuery, kindFilter);

  const getNodeId = useCallback((node: d3.HierarchyPointNode<ScopeNode>): string => {
    if (node.parent) {
      const index = node.parent.children!.indexOf(node);
      return `${getNodeId(node.parent)}-${index}`;
    }
    return 'root';
  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) next.delete(nodeId);
      else next.add(nodeId);
      return next;
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !scopeTree) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const container = containerRef.current;
    const width = container.clientWidth || 600;
    const height = Math.max(container.clientHeight || 400, 400);
    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => g.attr('transform', event.transform));
    svg.call(zoom);

    function filterCollapsed(node: ScopeNode, path: string = 'root'): ScopeNode {
      if (collapsedNodes.has(path) && node.children) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map((c, i) => filterCollapsed(c, `${path}-${i}`)),
      };
    }

    const filteredData = filterCollapsed(scopeTree);
    const root = d3.hierarchy(filteredData);
    const nodeCount = root.descendants().length;

    d3.tree<ScopeNode>().size([Math.max(height - 80, nodeCount * 30), width - 250])(root);

    // Links
    g.selectAll('.link')
      .data(root.links() as unknown as d3.HierarchyPointLink<ScopeNode>[])
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<ScopeNode>, d3.HierarchyPointNode<ScopeNode>>()
        .x(d => d.y)
        .y(d => d.x));

    // Nodes
    const nodes = g.selectAll('.node')
      .data(root.descendants() as unknown as d3.HierarchyPointNode<ScopeNode>[])
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        const nodeId = getNodeId(d);
        if (d.data.children && d.data.children.length > 0) {
          toggleCollapse(nodeId);
        }
        setSelectedNode(d.data);
      });

    nodes.append('circle')
      .attr('r', d => (d.data.children?.length && d.data.children.length > 0 ? 8 : 5))
      .attr('fill', d => getScopeColor(d.data.kind))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5);

    if (selectedNode) {
      nodes.filter((_d, i) => {
        const el = svg.selectAll('.node').nodes()[i];
        const nodeData = (el as Element & { __data__?: d3.HierarchyPointNode<ScopeNode> })?.__data__;
        return nodeData?.data?.scopeId === selectedNode.scopeId;
      }).select('circle').attr('stroke', 'var(--color-neon)').attr('stroke-width', 2);
    }

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => (d.children ? -14 : 14))
      .attr('text-anchor', d => (d.children ? 'end' : 'start'))
      .text(d => {
        let label = d.data.name;
        if (d.data.returnType) label = `${d.data.returnType} ${label}`;
        if (d.data.type) label = `${label}: ${d.data.type}`;
        if (d.data.modifiers) label = `${d.data.modifiers} ${label}`;
        return label.length > 24 ? label.substring(0, 24) + '...' : label;
      })
      .attr('fill', '#d4d4d4')
      .attr('font-size', '11px')
      .append('title')
      .text(d => `${d.data.kind}: ${d.data.name}`);

    // Collapsed badge
    nodes.filter(d => collapsedNodes.has(getNodeId(d)) && !!d.data.children && d.data.children!.length > 0)
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .attr('fill', '#d4d4d4')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .text(d => `[${d.data.children?.length}]`);

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x + 20;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [scopeTree, collapsedNodes, getNodeId, selectedNode, toggleCollapse]);

  if (!symbolTableJson) {
    return (
      <div className="ast-tree-container">
        <div className="ast-tree-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: 'Monaco, Consolas, monospace' }}>
          {t('semantic.noSymbolTable')}
        </div>
      </div>
    );
  }

  return (
    <div className="ast-tree-container">
      {/* Controls */}
      <div className="flex items-center gap-3 mb-4">
        <div className="relative flex-1">
          <Search size={12} className="absolute left-2 top-1/2 -translate-y-1/2 text-[var(--color-text-muted)]" />
          <input
            type="text"
            placeholder={t('semantic.searchSymbols', 'Search symbols...')}
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            className="w-full pl-7 pr-2 py-1 text-[10px] font-mono bg-[var(--color-surface)] border border-[var(--color-border)] rounded focus:outline-none focus:border-[var(--color-neon)]"
          />
        </div>
        <div className="flex items-center gap-1 text-[10px] font-mono">
          <Filter size={10} className="text-[var(--color-text-muted)]" />
          <select
            value={kindFilter}
            onChange={e => setKindFilter(e.target.value)}
            className="px-1.5 py-0.5 bg-[var(--color-surface)] border border-[var(--color-border)] rounded text-[var(--color-text)] font-mono text-[9px]"
          >
            <option value="all">{t('semantic.allKinds')}</option>
            <option value="variable">{t('semantic.variable')}</option>
            <option value="parameter">{t('semantic.parameter')}</option>
            <option value="field">{t('semantic.field')}</option>
            <option value="method">{t('semantic.method')}</option>
          </select>
        </div>
      </div>

      {/* Symbol count */}
      <div className="flex items-center justify-between mb-2">
        <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
          {t('semantic.scopeTree')}
        </span>
        <span className="text-[9px] font-mono text-[var(--color-text-dim)]">
          {filteredSymbols.length} {t('semantic.symbolsMatch', 'symbols match')}
        </span>
      </div>

      {/* Scope tree visualization */}
      <div className="ast-tree-wrapper" ref={containerRef} style={{ minHeight: 350 }}>
        <svg ref={svgRef} width="100%" height="100%" />
      </div>

      {/* Selected node detail panel */}
      {selectedNode && (
        <div className="mt-4 p-3 border border-[var(--color-border)] rounded-lg bg-[var(--color-surface)]">
          <div className="flex items-center gap-2 mb-2">
            <span
              className="w-2 h-2 rounded-full"
              style={{ background: getScopeColor(selectedNode.kind) }}
            />
            <span className="text-[10px] font-bold uppercase text-[var(--color-text-muted)] font-display">
              {selectedNode.kind}
            </span>
            <span className="text-sm font-bold text-[var(--color-neon)] font-mono">
              {selectedNode.name}
            </span>
          </div>
          {selectedNode.type && (
            <div className="flex gap-2 text-[10px] font-mono mb-1">
              <span className="text-[var(--color-text-muted)] w-16">Type:</span>
              <span className="text-[var(--color-cyan)]">{selectedNode.type}</span>
            </div>
          )}
          {selectedNode.modifiers && (
            <div className="flex gap-2 text-[10px] font-mono mb-1">
              <span className="text-[var(--color-text-muted)] w-16">Modifiers:</span>
              <span className="text-[var(--color-text-dim)]">{selectedNode.modifiers}</span>
            </div>
          )}
          {selectedNode.returnType && (
            <div className="flex gap-2 text-[10px] font-mono mb-1">
              <span className="text-[var(--color-text-muted)] w-16">Returns:</span>
              <span className="text-[var(--color-rose)]">{selectedNode.returnType}</span>
            </div>
          )}
          <div className="flex gap-2 text-[10px] font-mono">
            <span className="text-[var(--color-text-muted)] w-16">Scope ID:</span>
            <span className="text-[var(--color-text-dim)]">{selectedNode.scopeId}</span>
          </div>
        </div>
      )}
    </div>
  );
};

export default SymbolExplorer;
