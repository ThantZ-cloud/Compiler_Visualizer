import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
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

// Colors matching VS Code theme
const NODE_COLORS: Record<string, string> = {
  'CompilationUnit': '#4ec9b0',
  'PackageDeclaration': '#4ec9b0',
  'ImportDeclaration': '#808080',
  'ClassOrInterfaceDeclaration': '#4ec9b0',
  'EnumDeclaration': '#4ec9b0',
  'RecordDeclaration': '#4ec9b0',
  'MethodDeclaration': '#dcdcaa',
  'ConstructorDeclaration': '#dcdcaa',
  'FieldDeclaration': '#569cd6',
  'Parameter': '#9cdcfe',
  'VariableDeclarator': '#9cdcfe',
  'BlockStmt': '#569cd6',
  'ExpressionStmt': '#d4d4d4',
  'ReturnStmt': '#c586c0',
  'IfStmt': '#c586c0',
  'ForStmt': '#c586c0',
  'WhileStmt': '#c586c0',
  'MethodCallExpr': '#dcdcaa',
  'NameExpr': '#9cdcfe',
  'FieldAccessExpr': '#9cdcfe',
  'StringLiteralExpr': '#ce9178',
  'IntegerLiteralExpr': '#b5cea8',
  'LongLiteralExpr': '#b5cea8',
  'DoubleLiteralExpr': '#b5cea8',
  'BooleanLiteralExpr': '#569cd6',
  'CharLiteralExpr': '#ce9178',
  'BinaryExpr': '#d4d4d4',
  'UnaryExpr': '#d4d4d4',
  'AssignExpr': '#d4d4d4',
  'ObjectCreationExpr': '#4ec9b0',
  'TypeDeclaration': '#4ec9b0',
};

function getNodeColor(type: string): string {
  return NODE_COLORS[type] || '#d4d4d4';
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

function convertToAstNode(obj: any): AstNode {
  if (!obj || typeof obj !== 'object') {
    return { name: String(obj), type: 'Unknown' };
  }

  const type = obj.type || 'Unknown';
  const name = obj.name || obj.method || obj.field || obj.value || '';
  const line = obj.line;
  const column = obj.column;

  const children: AstNode[] = [];
  if (Array.isArray(obj.children)) {
    obj.children.forEach((child: any) => {
      if (child && typeof child === 'object') {
        children.push(convertToAstNode(child));
      }
    });
  }

  return {
    type,
    name,
    children: children.length > 0 ? children : undefined,
    value: obj.value,
    line,
    column,
  };
}

const AstTree: React.FC<AstTreeProps> = ({ astJson }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
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
    const width = container.clientWidth || 600;
    const height = container.clientHeight || 400;

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

    const nodeCount = root.descendants().length;
    const treeHeight = Math.max(height - 80, nodeCount * 25);
    const treeWidth = Math.max(width - 250, 400);

    const treeLayout = d3.tree<AstNode>().size([treeHeight, treeWidth]);
    treeLayout(root);

    const nodesWithPos = root.descendants() as unknown as d3.HierarchyPointNode<AstNode>[];
    const linksWithPos = root.links() as unknown as d3.HierarchyPointLink<AstNode>[];

    // Draw links
    g.selectAll('.link')
      .data(linksWithPos)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.y)
        .y(d => d.x)
      );

    // Draw nodes
    const nodes = g.selectAll('.node')
      .data(nodesWithPos)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
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
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5);

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -12 : 12)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        const display = d.data.value ? `${label} = ${d.data.value}` : label;
        return display.length > 30 ? display.substring(0, 30) + '...' : display;
      })
      .attr('fill', '#d4d4d4')
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
      .attr('dy', '0.31em')
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .text(d => `[${d.data.children?.length}]`)
      .attr('fill', '#ffffff')
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
    }

    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [astJson, collapsedNodes, getNodeId, toggleCollapse]);

  if (!astJson) {
    return <div className="ast-tree-container"><div className="ast-tree-wrapper" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#808080', fontSize: '13px', fontFamily: "'Consolas', 'Monaco', monospace" }}>No AST data to display</div></div>;
  }

  return (
    <div className="ast-tree-container">
      <div className="ast-tree-header">
        <h3>Abstract Syntax Tree</h3>
        <span className="ast-tree-hint">Click nodes to expand/collapse • Scroll to zoom • Drag to pan</span>
      </div>
      <div className="ast-tree-wrapper" ref={containerRef}>
        <svg ref={svgRef} width="100%" height="100%" />
      </div>
      {selectedNode && (
        <div className="ast-node-detail">
          <span className="detail-label">Selected:</span>
          <span className="detail-type" style={{ backgroundColor: getNodeColor(selectedNode.type) + '33', color: getNodeColor(selectedNode.type) }}>
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
