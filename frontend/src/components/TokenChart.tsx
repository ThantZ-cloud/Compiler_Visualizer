import React, { useRef, useEffect } from 'react';
import * as d3 from 'd3';
import './TokenChart.css';

interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  length: number;
}

interface TokenChartProps {
  tokens: Token[];
}

const TOKEN_COLORS: Record<string, string> = {
  'KEYWORD': '#c586c0',
  'TYPE': '#4ec9b0',
  'IDENTIFIER': '#9cdcfe',
  'STRING_LITERAL': '#ce9178',
  'CHAR_LITERAL': '#ce9178',
  'INTEGER_LITERAL': '#b5cea8',
  'LONG_LITERAL': '#b5cea8',
  'FLOAT_LITERAL': '#b5cea8',
  'DOUBLE_LITERAL': '#b5cea8',
  'BOOLEAN_LITERAL': '#569cd6',
  'NULL_LITERAL': '#569cd6',
  'SEPARATOR': '#d4d4d4',
  'OPERATOR': '#d4d4d4',
  'WHITESPACE': '#808080',
  'LINE_COMMENT': '#6a9955',
  'BLOCK_COMMENT': '#6a9955',
  'JAVADOC_COMMENT': '#6a9955',
  'ANNOTATION': '#dcdcaa',
};

function getColor(type: string): string {
  const upper = type.toUpperCase();
  for (const [key, color] of Object.entries(TOKEN_COLORS)) {
    if (upper.includes(key)) return color;
  }
  return '#569cd6';
}

const TokenChart: React.FC<TokenChartProps> = ({ tokens }) => {
  const barChartRef = useRef<SVGSVGElement>(null);
  const flowChartRef = useRef<SVGSVGElement>(null);

  // Bar chart: token type distribution
  useEffect(() => {
    if (!barChartRef.current || tokens.length === 0) return;

    const svg = d3.select(barChartRef.current);
    svg.selectAll('*').remove();

    // Group by type
    const grouped = d3.rollup(tokens, v => v.length, d => d.type);
    const data = Array.from(grouped, ([type, count]) => ({ type, count }))
      .sort((a, b) => b.count - a.count);

    const margin = { top: 10, right: 60, bottom: 10, left: 120 };
    const width = 500 - margin.left - margin.right;
    const barHeight = 26;
    const height = data.length * barHeight;

    const g = svg
      .attr('width', width + margin.left + margin.right)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleLinear()
      .domain([0, d3.max(data, d => d.count) || 1])
      .range([0, width]);

    const yScale = d3.scaleBand()
      .domain(data.map(d => d.type))
      .range([0, height])
      .padding(0.2);

    // Bars
    g.selectAll('.bar')
      .data(data)
      .join('rect')
      .attr('class', 'bar')
      .attr('x', 0)
      .attr('y', d => yScale(d.type) || 0)
      .attr('width', 0)
      .attr('height', yScale.bandwidth())
      .attr('fill', d => getColor(d.type))
      .attr('rx', 3)
      .transition()
      .duration(600)
      .delay((_, i) => i * 50)
      .attr('width', d => xScale(d.count));

    // Labels (type name)
    g.selectAll('.label')
      .data(data)
      .join('text')
      .attr('class', 'label')
      .attr('x', -8)
      .attr('y', d => (yScale(d.type) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('text-anchor', 'end')
      .attr('fill', '#cccccc')
      .attr('font-size', '11px')
      .attr('font-family', "'Consolas', 'Monaco', monospace")
      .text(d => d.type);

    // Count labels
    g.selectAll('.count')
      .data(data)
      .join('text')
      .attr('class', 'count')
      .attr('x', d => xScale(d.count) + 6)
      .attr('y', d => (yScale(d.type) || 0) + yScale.bandwidth() / 2)
      .attr('dy', '0.35em')
      .attr('fill', '#808080')
      .attr('font-size', '11px')
      .attr('font-family', "'Consolas', 'Monaco', monospace")
      .text(d => d.count)
      .attr('opacity', 0)
      .transition()
      .duration(400)
      .delay((_, i) => i * 50 + 300)
      .attr('opacity', 1);

  }, [tokens]);

  // Flow chart: tokens as colored blocks in sequence
  useEffect(() => {
    if (!flowChartRef.current || tokens.length === 0) return;

    const svg = d3.select(flowChartRef.current);
    svg.selectAll('*').remove();

    const container = flowChartRef.current.parentElement;
    const fullWidth = container ? container.clientWidth : 800;
    const margin = { top: 20, right: 20, bottom: 30, left: 20 };
    const width = fullWidth - margin.left - margin.right;
    const height = 200;

    const g = svg
      .attr('width', fullWidth)
      .attr('height', height + margin.top + margin.bottom)
      .append('g')
      .attr('transform', `translate(${margin.left},${margin.top})`);

    // Calculate token widths based on value length
    const minWidth = 4;
    const maxWidth = 60;
    const totalChars = tokens.reduce((sum, t) => sum + Math.max(t.value.length, 1), 0);
    const scale = width / totalChars;

    let x = 0;
    const tokenRects = tokens.map((token, i) => {
      const w = Math.max(minWidth, Math.min(maxWidth, token.value.length * scale));
      const rect = { ...token, x, w, index: i };
      x += w;
      return rect;
    });

    // Draw tokens as rectangles
    const rects = g.selectAll('.token-block')
      .data(tokenRects)
      .join('rect')
      .attr('class', 'token-block')
      .attr('x', d => d.x)
      .attr('y', 40)
      .attr('width', d => d.w - 1)
      .attr('height', 50)
      .attr('fill', d => getColor(d.type))
      .attr('rx', 2)
      .attr('opacity', 0)
      .style('cursor', 'pointer');

    rects.transition()
      .duration(400)
      .delay((_, i) => i * 8)
      .attr('opacity', 0.85);

    // Tooltip on hover
    rects.on('mouseover', function(_, d) {
      d3.select(this).attr('opacity', 1).attr('stroke', '#ffffff').attr('stroke-width', 2);

      const tooltip = g.append('g').attr('class', 'tooltip-group');
      tooltip.append('rect')
        .attr('x', d.x + d.w / 2 - 80)
        .attr('y', 100)
        .attr('width', 160)
        .attr('height', 50)
        .attr('fill', '#252526')
        .attr('stroke', '#3c3c3c')
        .attr('rx', 4);
      tooltip.append('text')
        .attr('x', d.x + d.w / 2)
        .attr('y', 118)
        .attr('text-anchor', 'middle')
        .attr('fill', getColor(d.type))
        .attr('font-size', '10px')
        .attr('font-weight', 'bold')
        .attr('font-family', "'Consolas', 'Monaco', monospace")
        .text(d.type);
      tooltip.append('text')
        .attr('x', d.x + d.w / 2)
        .attr('y', 136)
        .attr('text-anchor', 'middle')
        .attr('fill', '#d4d4d4')
        .attr('font-size', '11px')
        .attr('font-family', "'Consolas', 'Monaco', monospace")
        .text(d.value.length > 18 ? d.value.substring(0, 18) + '...' : d.value);
    })
    .on('mouseout', function() {
      d3.select(this).attr('opacity', 0.85).attr('stroke', 'none');
      g.selectAll('.tooltip-group').remove();
    });

    // Line numbers on x-axis
    const linePositions: { line: number; x: number }[] = [];
    let lastLine = 0;
    tokenRects.forEach(rect => {
      if (rect.line !== lastLine) {
        linePositions.push({ line: rect.line, x: rect.x });
        lastLine = rect.line;
      }
    });

    g.selectAll('.line-tick')
      .data(linePositions)
      .join('line')
      .attr('x1', d => d.x)
      .attr('x2', d => d.x)
      .attr('y1', 30)
      .attr('y2', 35)
      .attr('stroke', '#808080')
      .attr('stroke-width', 1);

    g.selectAll('.line-label')
      .data(linePositions)
      .join('text')
      .attr('x', d => d.x + 2)
      .attr('y', 25)
      .attr('fill', '#808080')
      .attr('font-size', '9px')
      .attr('font-family', "'Consolas', 'Monaco', monospace")
      .text(d => `L${d.line}`);

  }, [tokens]);

  return (
    <div className="token-chart-container">
      <div className="chart-section">
        <h3 className="chart-title">Token Distribution by Type</h3>
        <div className="chart-wrapper">
          <svg
            ref={barChartRef}
            role="img"
            aria-label="Bar chart showing token count distribution by type"
          />
        </div>
      </div>
      <div className="chart-section">
        <h3 className="chart-title">Token Flow (source code sequence)</h3>
        <div className="chart-wrapper flow-wrapper">
          <svg
            ref={flowChartRef}
            role="img"
            aria-label="Token flow visualization showing tokens as colored blocks in source code sequence. Hover over blocks to see details."
          />
        </div>
        <div className="chart-hint">Hover over tokens to see details</div>
      </div>
    </div>
  );
};

export default TokenChart;
