import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import { useTranslation } from 'react-i18next';
import { useResizeObserver } from '../hooks/useResizeObserver';
import './AstTree.css';

interface AstNode {
  name: string;
  type: string;
  children?: AstNode[];
  value?: string;
  line?: number;
  column?: number;
}

interface AstTreeProps {
  astJson: string;
}

// Light-aware: CSS vars resolve per [data-theme]
const NODE_COLORS: Record<string, string> = {
  'CompilationUnit': 'var(--color-chart-type)',
  'PackageDeclaration': 'var(--color-chart-type)',
  'ImportDeclaration': 'var(--color-text-muted)',
  'ClassOrInterfaceDeclaration': 'var(--color-chart-type)',
  'EnumDeclaration': 'var(--color-chart-type)',
  'RecordDeclaration': 'var(--color-chart-type)',
  'MethodDeclaration': 'var(--color-chart-annotation)',
  'ConstructorDeclaration': 'var(--color-chart-annotation)',
  'FieldDeclaration': 'var(--color-chart-default)',
  'Parameter': 'var(--color-chart-identifier)',
  'VariableDeclarator': 'var(--color-chart-identifier)',
  'BlockStmt': 'var(--color-chart-default)',
  'ExpressionStmt': 'var(--color-chart-separator)',
  'ReturnStmt': 'var(--color-chart-keyword)',
  'IfStmt': 'var(--color-chart-keyword)',
  'ForStmt': 'var(--color-chart-keyword)',
  'WhileStmt': 'var(--color-chart-keyword)',
  'MethodCallExpr': 'var(--color-chart-annotation)',
  'NameExpr': 'var(--color-chart-identifier)',
  'FieldAccessExpr': 'var(--color-chart-identifier)',
  'StringLiteralExpr': 'var(--color-chart-string)',
  'IntegerLiteralExpr': 'var(--color-chart-number)',
  'LongLiteralExpr': 'var(--color-chart-number)',
  'DoubleLiteralExpr': 'var(--color-chart-number)',
  'BooleanLiteralExpr': 'var(--color-chart-default)',
  'CharLiteralExpr': 'var(--color-chart-string)',
  'BinaryExpr': 'var(--color-chart-separator)',
  'UnaryExpr': 'var(--color-chart-separator)',
  'AssignExpr': 'var(--color-chart-separator)',
  'ObjectCreationExpr': 'var(--color-chart-type)',
  'TypeDeclaration': 'var(--color-chart-type)',
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] || 'var(--color-chart-separator)';
}

function getNodeLabel(type: string, name?: string): string {
  const shortType = type
    .replace('Declaration', 'Decl')
    .replace('Expression', 'Expr')
    .replace('Statement', 'Stmt');

  if (name) {
    return `${shortType}: ${name}`;
  }
  return shortType;
}

function parseAstJson(jsonStr: string): AstNode | null {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return null;
    return convertToAstNode(parsed);
  } catch {
    return null;
  }
}

interface RawAstNode {
  type?: unknown;
  name?: unknown;
  method?: unknown;
  field?: unknown;
  value?: unknown;
  line?: unknown;
  column?: unknown;
  children?: unknown;
}

function convertToAstNode(obj: RawAstNode | null | undefined): AstNode {
  if (!obj || typeof obj !== 'object') {
    return { name: String(obj), type: 'Unknown' };
  }

  const type = typeof obj.type === 'string' ? obj.type : 'Unknown';
  const name =
    (typeof obj.name === 'string' ? obj.name : '') ||
    (typeof obj.method === 'string' ? obj.method : '') ||
    (typeof obj.field === 'string' ? obj.field : '') ||
    (typeof obj.value === 'string' ? obj.value : '');
  const line = typeof obj.line === 'number' ? obj.line : undefined;
  const column = typeof obj.column === 'number' ? obj.column : undefined;

  const children: AstNode[] = [];
  if (Array.isArray(obj.children)) {
    obj.children.forEach((child) => {
      if (child && typeof child === 'object') {
        children.push(convertToAstNode(child as RawAstNode));
      }
    });
  }

  return {
    type,
    name,
    children: children.length > 0 ? children : undefined,
    value: typeof obj.value === 'string' ? obj.value : undefined,
    line,
    column,
  };
}

const AstTree: React.FC<AstTreeProps> = ({ astJson }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const { ref: roSetRef, width: observedWidth } = useResizeObserver<HTMLDivElement>();
  const setContainerRef = useCallback((el: HTMLDivElement | null) => {
    containerRef.current = el;
    roSetRef(el);
  }, [roSetRef]);
  const [selectedNode, setSelectedNode] = useState<AstNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  /** Build a unique path-based ID for each node (no two nodes share it) */
  const getNodeId = useCallback((node: d3.HierarchyPointNode<AstNode>): string => {
    if (node.parent) {
      const index = node.parent.children!.indexOf(node);
      return `${getNodeId(node.parent)}-${index}`;
    }
    return 'root';
  }, []);

  const toggleCollapse = useCallback((nodeId: string) => {
    setCollapsedNodes(prev => {
      const next = new Set(prev);
      if (next.has(nodeId)) {
        next.delete(nodeId);
      } else {
        next.add(nodeId);
      }
      return next;
    });
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !astJson) return;

    const astData = parseAstJson(astJson);
    if (!astData) return;

    const container = containerRef.current;
    const width = observedWidth || container.clientWidth || 600;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 4])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    function filterCollapsed(node: AstNode, path: string = 'root'): AstNode {
      if (collapsedNodes.has(path) && node.children) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map((c, i) => filterCollapsed(c, `${path}-${i}`)),
      };
    }

    const filteredData = filterCollapsed(astData);
    const root = d3.hierarchy(filteredData);

    const depth = root.height || 1; // levels below the root
    // Vertical layout: root at top, children below. Height from depth only.
    const treeHeight = (depth + 1) * 70;
    const treeWidth = Math.max(width - 250, 400);

    const treeLayout = d3.tree<AstNode>().size([treeWidth, treeHeight]);
    treeLayout(root);

    const nodesWithPos = root.descendants() as unknown as d3.HierarchyPointNode<AstNode>[];
    const linksWithPos = root.links() as unknown as d3.HierarchyPointLink<AstNode>[];

    // Draw links
    g.selectAll('.link')
      .data(linksWithPos)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkVertical<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.x)
        .y(d => d.y)
      );

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(nodesWithPos)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.x},${d.y})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);
        if (d.data.children && d.data.children.length > 0) {
          toggleCollapse(getNodeId(d));
        }
      });

    nodes.append('circle')
      .attr('r', d => d.data.children ? 7 : 5)
      .attr('fill', d => getNodeColor(d.data.type))
      .attr('stroke', 'var(--color-card)')
      .attr('stroke-width', 1.5);

    nodes.append('text')
      .attr('x', 0)
      .attr('dy', d => d.children ? '-0.9em' : '1.9em')
      .attr('text-anchor', 'middle')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        const display = d.data.value ? `${label} = ${d.data.value}` : label;
        return display.length > 30 ? display.substring(0, 30) + '...' : display;
      })
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '11px')
      .append('title')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        const display = d.data.value ? `${label} = ${JSON.stringify(d.data.value)}` : label;
        return display;
      });

    // Show collapsed count badge
    nodes.filter(d => collapsedNodes.has(getNodeId(d)) && !!d.data.children)
      .append('text')
      .attr('dy', '1.9em')
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .text(d => `[${d.data.children?.length}]`)
      .attr('fill', 'var(--color-text)')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold')
      .append('title')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        return label;
      });

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const leftPad = 20;
      const dx = (width - bounds.width) / 2 - bounds.x + leftPad;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
      // Grow the SVG to the full tree height so the bottom nodes stay visible.
      svg.attr('height', Math.ceil(bounds.height + 80));
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [astJson, collapsedNodes, getNodeId, toggleCollapse, observedWidth]);

  if (!astJson) {
    return <div className="ast-tree-container"><div className="ast-tree-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--color-text-muted)', fontSize: '13px', fontFamily: "'Consolas', 'Monaco', monospace" }}>{t('ast.noData')}</div></div>;
  }

  return (
    <div className="ast-tree-container">
      <div className="ast-tree-header">
        <h3>{t('ast.title')}</h3>
        <span className="ast-tree-hint">{t('ast.hint')}</span>
      </div>
      <div className="ast-tree-wrapper" ref={setContainerRef}>
        <svg ref={svgRef} width="100%" />
      </div>
      {selectedNode && (
        <div className="ast-node-detail">
          <span className="detail-label">{t('ast.selected')}</span>
          <span className="detail-type" style={{ backgroundColor: `color-mix(in srgb, ${getNodeColor(selectedNode.type)} 20%, transparent)`, color: getNodeColor(selectedNode.type) }}>
            {selectedNode.type}
          </span>
          {selectedNode.name && <span className="detail-name">{selectedNode.name}</span>}
          {selectedNode.line && <span className="detail-pos">Line {selectedNode.line}:{selectedNode.column}</span>}
          {selectedNode.value && <span className="detail-value">"{selectedNode.value}"</span>}
        </div>
      )}
    </div>
  );
};

export default AstTree;
