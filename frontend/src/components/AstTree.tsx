import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

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

  const getNodeId = useCallback((node: d3.HierarchyPointNode<AstNode>): string => {
    return `${node.data.type}-${node.data.name}`;
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

    function filterCollapsed(node: AstNode): AstNode {
      const nodeId = `${node.type}-${node.name}`;
      if (collapsedNodes.has(nodeId) && node.children) {
        return { ...node, children: [] };
      }
      return {
        ...node,
        children: node.children?.map(c => filterCollapsed(c)),
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

    g.selectAll('.link')
      .data(linksWithPos)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<AstNode>, d3.HierarchyPointNode<AstNode>>()
        .x(d => d.y)
        .y(d => d.x)
      );

    const nodes = g.selectAll('.node')
      .data(nodesWithPos)
      .join('g')
      .attr('class', 'node')
      .attr('transform', d => `translate(${d.y},${d.x})`)
      .on('click', (event, d) => {
        event.stopPropagation();
        setSelectedNode(d.data);
        if (event.detail === 2 && d.data.children && d.data.children.length > 0) {
          toggleCollapse(getNodeId(d));
        }
      });

    nodes.append('circle')
      .attr('r', d => d.data.children ? 7 : 5)
      .attr('fill', d => getNodeColor(d.data.type))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -12 : 12)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => {
        const label = getNodeLabel(d.data.type, d.data.name);
        return label.length > 25 ? label.substring(0, 25) + '...' : label;
      })
      .attr('fill', '#d4d4d4')
      .attr('font-size', '11px')
      .attr('font-family', "'Consolas', 'Monaco', monospace");

    nodes.filter(d => collapsedNodes.has(`${d.data.type}-${d.data.name}`) && !!d.data.children)
      .append('text')
      .attr('dy', '0.31em')
      .attr('x', 0)
      .attr('text-anchor', 'middle')
      .text(d => `[${d.data.children?.length}]`)
      .attr('fill', '#ffffff')
      .attr('font-size', '8px')
      .attr('font-weight', 'bold');

    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x;
      const dy = 40 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
    }

    // Cleanup
    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [astJson, collapsedNodes, getNodeId, toggleCollapse]);

  if (!astJson) {
    return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">No AST data to display</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-sm font-medium text-[#cccccc]">Abstract Syntax Tree</h3>
        <span className="text-[11px] text-[#808080]">Double-click to expand/collapse • Scroll to zoom • Drag to pan</span>
      </div>
      <div className="flex-1 min-h-0 bg-[#1e1e1e] border border-[#3c3c3c] rounded-[4px] overflow-hidden relative" ref={containerRef}>
        <svg
          ref={svgRef}
          className="block w-full h-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Abstract Syntax Tree visualization. Use mouse wheel to zoom, drag to pan, double-click nodes to expand or collapse."
        />
      </div>
      {selectedNode && (
        <div className="flex items-center gap-2.5 px-3 py-2.5 bg-[#252526] border border-[#3c3c3c] rounded-[4px] shrink-0">
          <span className="text-[11px] text-[#808080] uppercase">Selected:</span>
          <span className="text-xs px-2 py-0.5 rounded-[3px] font-medium font-mono"
            style={{ backgroundColor: getNodeColor(selectedNode.type) + '33', color: getNodeColor(selectedNode.type) }}>
            {selectedNode.type}
          </span>
          {selectedNode.name && <span className="text-[13px] text-white font-semibold font-mono">{selectedNode.name}</span>}
          {selectedNode.line && <span className="text-[11px] text-[#808080]">Line {selectedNode.line}:{selectedNode.column}</span>}
          {selectedNode.value && <span className="text-xs text-[#ce9178] font-mono">"{selectedNode.value}"</span>}
        </div>
      )}
    </div>
  );
};

export default AstTree;
