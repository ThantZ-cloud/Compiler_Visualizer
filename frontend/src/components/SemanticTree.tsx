import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as d3 from 'd3';

interface SemanticTreeProps {
  symbolTableJson: string;
}

interface TreeNode {
  name: string;
  kind?: string;
  type?: string;
  modifiers?: string[];
  returnType?: string;
  children?: TreeNode[];
  _children?: TreeNode;
}

function parseSymbolTable(jsonStr: string): TreeNode | null {
  try {
    const data = JSON.parse(jsonStr);
    if (data.error) return null;
    return convertToTree(data);
  } catch {
    return null;
  }
}

function convertToTree(data: any): TreeNode {
  const root: TreeNode = {
    name: data.package || 'Default Package',
    kind: 'package',
    children: [],
  };

  if (data.imports && data.imports.length > 0) {
    root.children!.push({
      name: `Imports (${data.imports.length})`,
      kind: 'imports',
      children: data.imports.map((imp: any) => ({
        name: imp.name,
        kind: 'import',
      })),
    });
  }

  if (data.types) {
    data.types.forEach((type: any) => {
      root.children!.push(convertTypeToTree(type));
    });
  }

  return root;
}

function convertTypeToTree(type: any): TreeNode {
  const node: TreeNode = {
    name: type.name,
    kind: type.kind,
    modifiers: type.modifiers,
    children: [],
  };

  if (type.extends) {
    type.extends.forEach((ext: string) => {
      node.children!.push({ name: `extends ${ext}`, kind: 'inheritance' });
    });
  }

  if (type.implements) {
    type.implements.forEach((imp: string) => {
      node.children!.push({ name: `implements ${imp}`, kind: 'inheritance' });
    });
  }

  if (type.members) {
    type.members.forEach((member: any) => {
      node.children!.push(convertMemberToTree(member));
    });
  }

  if (type.constants) {
    type.constants.forEach((c: any) => {
      node.children!.push({ name: c.name, kind: 'enum-constant' });
    });
  }

  return node;
}

function convertMemberToTree(member: any): TreeNode {
  if (member.kind === 'method' || member.kind === 'constructor') {
    const params = member.parameters
      ? member.parameters.map((p: any) => `${p.type?.name || 'var'} ${p.name}`).join(', ')
      : '';
    const returnType = member.returnType?.name || '';
    const label = `${member.name}(${params})${returnType ? ' → ' + returnType : ''}`;

    const node: TreeNode = {
      name: label,
      kind: member.kind,
      modifiers: member.modifiers,
      returnType: returnType,
      children: [],
    };

    if (member.parameters) {
      member.parameters.forEach((p: any) => {
        node.children!.push({
          name: `${p.name}: ${p.type?.name || 'var'}`,
          kind: 'parameter',
          type: p.type?.name,
        });
      });
    }

    if (member.throws) {
      member.throws.forEach((ex: string) => {
        node.children!.push({ name: `throws ${ex}`, kind: 'exception' });
      });
    }

    return node;
  } else if (member.kind === 'field') {
    const vars = member.variables || [];
    if (vars.length === 1) {
      return {
        name: `${vars[0].name}: ${vars[0].type?.name || 'var'}`,
        kind: 'field',
        modifiers: member.modifiers,
        type: vars[0].type?.name,
      };
    } else {
      return {
        name: `fields (${vars.length})`,
        kind: 'field-group',
        modifiers: member.modifiers,
        children: vars.map((v: any) => ({
          name: `${v.name}: ${v.type?.name || 'var'}`,
          kind: 'field',
          type: v.type?.name,
        })),
      };
    }
  } else if (member.kind === 'initializer') {
    return { name: member.static ? 'static initializer' : 'instance initializer', kind: 'initializer' };
  } else if (member.kind) {
    return convertTypeToTree(member);
  }
  return { name: 'unknown', kind: 'unknown' };
}

const KIND_COLORS: Record<string, string> = {
  'package': '#569cd6',
  'imports': '#808080',
  'import': '#6a9955',
  'class': '#4ec9b0',
  'interface': '#4ec9b0',
  'enum': '#4ec9b0',
  'record': '#4ec9b0',
  'method': '#dcdcaa',
  'constructor': '#dcdcaa',
  'field': '#569cd6',
  'field-group': '#569cd6',
  'parameter': '#9cdcfe',
  'inheritance': '#c586c0',
  'enum-constant': '#b5cea8',
  'initializer': '#c586c0',
  'exception': '#f44747',
};

function getColor(kind: string): string {
  return KIND_COLORS[kind] || '#d4d4d4';
}

function getIcon(kind: string): string {
  switch (kind) {
    case 'package': return '⌂';
    case 'imports': return '≡';
    case 'import': return '→';
    case 'class': return '◆';
    case 'interface': return '◇';
    case 'enum': return '▥';
    case 'method': return 'ƒ';
    case 'constructor': return '⊕';
    case 'field': return '□';
    case 'parameter': return '·';
    case 'inheritance': return '△';
    case 'enum-constant': return '▪';
    default: return '•';
  }
}

const SemanticTree: React.FC<SemanticTreeProps> = ({ symbolTableJson }) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedNode, setSelectedNode] = useState<TreeNode | null>(null);

  const toggleNode = useCallback((d: d3.HierarchyPointNode<TreeNode>) => {
    if (d.children) {
      (d as any)._children = d.children;
      d.children = undefined;
    } else if ((d as any)._children) {
      d.children = (d as any)._children;
      (d as any)._children = undefined;
    }
  }, []);

  useEffect(() => {
    if (!svgRef.current || !containerRef.current || !symbolTableJson) return;

    const astData = parseSymbolTable(symbolTableJson);
    if (!astData) return;

    const container = containerRef.current;
    const width = container.clientWidth || 800;
    const height = container.clientHeight || 500;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const g = svg.append('g');

    const zoom = d3.zoom<SVGSVGElement, unknown>()
      .scaleExtent([0.2, 3])
      .on('zoom', (event) => {
        g.attr('transform', event.transform);
      });

    svg.call(zoom);

    const root = d3.hierarchy(astData);
    const treeLayout = d3.tree<TreeNode>().size([height - 60, width - 300]);
    treeLayout(root);

    const nodesWithPos = root.descendants() as unknown as d3.HierarchyPointNode<TreeNode>[];
    const linksWithPos = root.links() as unknown as d3.HierarchyPointLink<TreeNode>[];

    g.selectAll('.link')
      .data(linksWithPos)
      .join('path')
      .attr('class', 'link')
      .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
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
        if (d.children || (d as any)._children) {
          toggleNode(d);
          treeLayout(root);
          const newNodes = root.descendants() as unknown as d3.HierarchyPointNode<TreeNode>[];
          const newLinks = root.links() as unknown as d3.HierarchyPointLink<TreeNode>[];

          g.selectAll('.link').data(newLinks).join('path')
            .attr('class', 'link')
            .attr('d', d3.linkHorizontal<d3.HierarchyPointLink<TreeNode>, d3.HierarchyPointNode<TreeNode>>()
              .x(d => d.y).y(d => d.x));

          const newGs = g.selectAll('.node').data(newNodes).join('g')
            .attr('class', 'node')
            .attr('transform', d => `translate(${d.y},${d.x})`);

          newGs.selectAll('circle').remove();
          newGs.selectAll('text').remove();

          newGs.append('circle')
            .attr('r', d => (d.children || (d as any)._children) ? 7 : 5)
            .attr('fill', d => getColor(d.data.kind || ''))
            .attr('stroke', '#1e1e1e')
            .attr('stroke-width', 1.5)
            .style('cursor', 'pointer');

          newGs.append('text')
            .attr('dy', '0.31em')
            .attr('x', d => d.children ? -12 : 12)
            .attr('text-anchor', d => d.children ? 'end' : 'start')
            .text(d => d.data.name.length > 30 ? d.data.name.substring(0, 30) + '...' : d.data.name)
            .attr('fill', '#d4d4d4')
            .attr('font-size', '11px')
            .attr('font-family', "'Consolas', 'Monaco', monospace");
        }
      });

    nodes.append('circle')
      .attr('r', d => (d.children || (d as any)._children) ? 7 : 5)
      .attr('fill', d => getColor(d.data.kind || ''))
      .attr('stroke', '#1e1e1e')
      .attr('stroke-width', 1.5)
      .style('cursor', 'pointer');

    nodes.append('text')
      .attr('dy', '0.31em')
      .attr('x', d => d.children ? -12 : 12)
      .attr('text-anchor', d => d.children ? 'end' : 'start')
      .text(d => d.data.name.length > 30 ? d.data.name.substring(0, 30) + '...' : d.data.name)
      .attr('fill', '#d4d4d4')
      .attr('font-size', '11px')
      .attr('font-family', "'Consolas', 'Monaco', monospace");

    const bounds = g.node()?.getBBox();
    if (bounds) {
      const dx = (width - bounds.width) / 2 - bounds.x;
      const dy = 60 - bounds.y;
      svg.call(zoom.transform, d3.zoomIdentity.translate(dx, dy));
    }

    // Cleanup
    return () => {
      svg.selectAll('*').remove();
      svg.on('.zoom', null);
    };
  }, [symbolTableJson, toggleNode]);

  if (!symbolTableJson) {
    return <div className="flex flex-col items-center justify-center h-full text-[var(--color-text-muted)] text-[13px] font-mono">No symbol table to display</div>;
  }

  return (
    <div className="flex flex-col flex-1 min-h-0 gap-2">
      <div className="flex justify-between items-center shrink-0">
        <h3 className="text-sm font-medium text-[#cccccc]">Symbol Table</h3>
        <span className="text-[11px] text-[#808080]">Click nodes to expand/collapse • Scroll to zoom • Drag to pan</span>
      </div>
      <div className="flex-1 min-h-0 bg-[#1e1e1e] border border-[#3c3c3c] rounded-[6px] overflow-hidden" ref={containerRef}>
        <svg
          ref={svgRef}
          className="block w-full h-full cursor-grab active:cursor-grabbing"
          role="img"
          aria-label="Symbol Table tree visualization. Use mouse wheel to zoom, drag to pan, click nodes to expand or collapse."
        />
      </div>
      {selectedNode && (
        <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-[#252526] border border-[#3c3c3c] rounded-[6px] shrink-0">
          <span className="text-base">{getIcon(selectedNode.kind || '')}</span>
          <span className="text-[11px] font-bold uppercase px-2 py-0.5 bg-[rgba(255,255,255,0.05)] rounded-[4px] font-mono"
            style={{ color: getColor(selectedNode.kind || '') }}>
            {selectedNode.kind}
          </span>
          <span className="text-[13px] text-white font-semibold font-mono">{selectedNode.name}</span>
          {selectedNode.modifiers && (
            <span className="text-[11px] text-[#c586c0] font-mono">{selectedNode.modifiers.join(' ')}</span>
          )}
          {selectedNode.type && (
            <span className="text-[11px] text-[#4ec9b0] font-mono">{selectedNode.type}</span>
          )}
        </div>
      )}
    </div>
  );
};

export default SemanticTree;
