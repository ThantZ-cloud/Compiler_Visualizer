import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';
import './AstTree.css';

interface AstNode {
  name: string;
  type?: string;
  children?: AstNode[];
  value?: string;
  line?: number;
  column?: number;
}

interface AstTreeProps {
  astJson: string;
}

const NODE_COLORS: Record<string, string> = {
  'CompilationUnit': '#4ec9b0',
  'ClassDeclaration': '#4ec9b0',
  'MethodDeclaration': '#dcdcaa',
  'FieldDeclaration': '#569cd6',
  'VariableDeclaration': '#9cdcfe',
  'StringLiteralExpr': '#ce9178',
  'IntegerLiteralExpr': '#b5cea8',
  'MethodCallExpr': '#dcdcaa',
  'NameExpr': '#9cdcfe',
  'BlockStmt': '#808080',
  'ReturnStmt': '#c586c0',
  'IfStmt': '#c586c0',
  'ForStmt': '#c586c0',
  'WhileStmt': '#c586c0',
};

const NODE_TYPE_COLORS: Record<string, string> = {
  'class': '#4ec9b0',
  'method': '#dcdcaa',
  'field': '#569cd6',
  'variable': '#9cdcfe',
  'literal': '#ce9178',
  'expression': '#d4d4d4',
  'statement': '#c586c0',
};

function getNodeColor(node: AstNode): string {
  if (node.type && NODE_COLORS[node.type]) {
    return NODE_COLORS[node.type];
  }
  const name = node.name.toLowerCase();
  if (name.includes('class')) return NODE_TYPE_COLORS.class;
  if (name.includes('method') || name.includes('function')) return NODE_TYPE_COLORS.method;
  if (name.includes('field') || name.includes('variable')) return NODE_TYPE_COLORS.field;
  if (name.includes('literal') || name.includes('string') || name.includes('number')) return NODE_TYPE_COLORS.literal;
  if (name.includes('stmt') || name.includes('if') || name.includes('for') || name.includes('while')) return NODE_TYPE_COLORS.statement;
  return '#d4d4d4';
}

function parseAstJson(jsonStr: string): AstNode | null {
  try {
    const parsed = JSON.parse(jsonStr);
    return convertToAstNode(parsed);
  } catch {
    return null;
  }
}

function convertToAstNode(obj: any): AstNode {
  if (!obj || typeof obj !== 'object') {
    return { name: String(obj) };
  }

  const nodeType = obj.getClass?.() || obj.class?.simpleName || obj.nodeType || obj.type || '';
  const name = obj.name?.identifier || obj.name || obj['SimpleName'] || nodeType || 'node';

  const children: AstNode[] = [];

  for (const key of Object.keys(obj)) {
    if (key === 'nodeType' || key === 'class' || key === 'type') continue;
    const val = obj[key];
    if (Array.isArray(val)) {
      val.forEach((item: any) => {
        if (item && typeof item === 'object' && (item.nodeType || item.class || item.type)) {
          children.push(convertToAstNode(item));
        }
      });
    } else if (val && typeof val === 'object' && (val.nodeType || val.class || val.type)) {
      children.push(convertToAstNode(val));
    }
  }

  return {
    name: String(name),
    type: nodeType,
    children: children.length > 0 ? children : undefined,
  };
}

const AstTree: React.FC<AstTreeProps> = ({ astJson }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<AstNode | null>(null);
  const [collapsedNodes, setCollapsedNodes] = useState<Set<string>>(new Set());

  const getNodeId = useCallback((node: d3.HierarchyPointNode<AstNode>): string => {
    return `${node.data.name}-${node.x}-${node.y}`;
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
    const width = container.clientWidth;
    const height = container.clientHeight || 400;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.3, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    // Filter out collapsed children
    function filterCollapsed(node: AstNode, depth: number = 0): AstNode {
      const nodeId = `${node.name}-${depth}`;
      if (collapsedNodes.has(nodeId) && node.children) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map(c => filterCollapsed(c, depth + 1)),
      };
    }

    const filteredData = filterCollapsed(astData);

    const root = d3.hierarchy(filteredData);
    const treeLayout = d3.tree<AstNode>().size([height - 60, width - 200]);
    treeLayout(root);

    // Cast to point nodes after tree layout computes positions
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
        const nodeId = getNodeId(d);
        if (d.data.children && d.data.children.length > 0) {
          toggleCollapse(nodeId);
        }
        setSelectedNode(d.data);
      });

    nodes.append('circle')
      .attr('r', 6)
      .attr('fill', d => getNodeColor(d.data))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5);

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -12 : 12)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name.length > 20 ? d.data.name.substring(0, 20) + '...' : d.data.name)
      .attr('fill', '#d4d4d4')
      .attr('font-size', '11px');

    // Center the tree
    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
    }

  }, [astJson, collapsedNodes, getNodeId, toggleCollapse]);

  if (!astJson) {
    return <div className="panel-placeholder">No AST data to display</div>;
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
          <span className="detail-name">{selectedNode.name}</span>
          {selectedNode.type && <span className="detail-type">{selectedNode.type}</span>}
          {selectedNode.line && <span className="detail-pos">Line {selectedNode.line}</span>}
          {selectedNode.value && <span className="detail-value">"{selectedNode.value}"</span>}
        </div>
      )}
    </div>
  );
};

export default AstTree;
