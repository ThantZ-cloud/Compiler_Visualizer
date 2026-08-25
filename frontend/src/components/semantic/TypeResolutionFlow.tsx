import React, { useEffect, useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { motion, AnimatePresence } from 'framer-motion';
import * as d3 from 'd3';
import type { TypeResolutionEntry } from '../../types/semantic';

interface TypeResolutionFlowProps {
  symbolTableJson: string;
  isPlaying: boolean;
  isCompleted: boolean;
}

function parseTypeResolutions(jsonStr: string): TypeResolutionEntry[] {
  try {
    const parsed = JSON.parse(jsonStr);
    if (parsed.error) return [];
    return parsed.typeResolution || [];
  } catch {
    return [];
  }
}

const TypeResolutionFlow: React.FC<TypeResolutionFlowProps> = ({ symbolTableJson, isPlaying, isCompleted }) => {
  const { t } = useTranslation();
  const svgRef = useRef<SVGSVGElement>(null);
  const [resolutions, setResolutions] = useState<TypeResolutionEntry[]>([]);
  const [currentIndex, setCurrentIndex] = useState(0);

  // Show all resolution steps (dynamic Try It may contain Math, Integer, locals, etc.)
  const keySteps = resolutions;

  const totalSteps = keySteps.length;

  // Autoplay — idle shows full flow so user can explore without pressing Play
  useEffect(() => {
    if (!isPlaying) {
      setCurrentIndex(Math.max(totalSteps - 1, -1));
      return;
    }
    setCurrentIndex(-1);
    const interval = setInterval(() => {
      setCurrentIndex(prev => {
        if (prev >= totalSteps - 1) {
          clearInterval(interval);
          return prev;
        }
        return prev + 1;
      });
    }, 1500);
    return () => clearInterval(interval);
  }, [isPlaying, isCompleted, totalSteps]);

  useEffect(() => {
    setResolutions(parseTypeResolutions(symbolTableJson));
  }, [symbolTableJson]);

  // Render mini Sankey-like overview
  useEffect(() => {
    if (!svgRef.current) return;
    if (totalSteps === 0) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const margin = { top: 20, right: 20, bottom: 20, left: 20 };
    const width = 560 - margin.left - margin.right;
    const height = 120 - margin.top - margin.bottom;

    const g = svg.append('g').attr('transform', `translate(${margin.left},${margin.top})`);

    const xScale = d3.scaleBand<string>()
      .domain(Array.from({ length: totalSteps }, (_, i) => i.toString()))
      .range([0, width])
      .padding(0.2);

    const yScale = d3.scalePoint<string>()
      .domain(['0', '1', '2'])
      .range([0, height])
      .padding(0.5);

    // Sankey-like bands
    keySteps.forEach((step, i) => {
      const active = i <= currentIndex;
      const y = yScale('1')!;

      // Band rectangle
      g.append('rect')
        .attr('x', xScale(i.toString())!)
        .attr('y', y - 8)
        .attr('width', xScale.bandwidth())
        .attr('height', 16)
        .attr('fill', active ? 'var(--color-neon)' : 'var(--color-border-bright)')
        .attr('opacity', active ? 0.5 : 0.15)
        .attr('rx', 3)
        .transition()
        .duration(500)
        .attr('opacity', active ? 0.5 : 0.15);

      // Label
      g.append('text')
        .attr('x', xScale(i.toString())! + xScale.bandwidth() / 2)
        .attr('y', y - 20)
        .attr('text-anchor', 'middle')
        .attr('fill', active ? 'var(--color-neon)' : 'var(--color-text-muted)')
        .attr('font-size', '10px')
        .attr('font-family', 'Monaco, Consolas, monospace')
        .text(step.symbol);

      // Status
      const statusColor = step.resolved ? 'var(--color-neon)' : 'var(--color-rose)';
      const statusText = step.resolved ? t('semantic.resolved') : t('semantic.unresolved');
      g.append('text')
        .attr('x', xScale(i.toString())! + xScale.bandwidth() / 2)
        .attr('y', y + 25)
        .attr('text-anchor', 'middle')
        .attr('fill', active ? statusColor : 'var(--color-border-bright)')
        .attr('font-size', '9px')
        .attr('font-family', 'Monaco, Consolas, monospace')
        .text(statusText);

      // FQN detail
      if (step.resolved && step.fqn) {
        g.append('text')
          .attr('x', xScale(i.toString())! + xScale.bandwidth() / 2)
          .attr('y', y + 42)
          .attr('text-anchor', 'middle')
          .attr('fill', active ? '#569cd6' : 'var(--color-border-bright)')
          .attr('font-size', '8px')
          .attr('font-family', 'Monaco, Consolas, monospace')
          .text(step.fqn.length > 30 ? step.fqn.substring(0, 30) + '...' : step.fqn);
      }

      // Arrow to next
      if (i < totalSteps - 1) {
        g.append('path')
          .attr('d', `M${xScale(i.toString())! + xScale.bandwidth()} ${y} L${xScale((i + 1).toString())!} ${y}`)
          .attr('stroke', active && i < currentIndex ? 'var(--color-neon)' : 'var(--color-border-bright)')
          .attr('stroke-width', 1.5)
          .attr('fill', 'none')
          .attr('marker-end', 'url(#arrow)');
      }
    });
  }, [resolutions, currentIndex, totalSteps, keySteps, t]);

  return (
    <div className="w-full max-w-5xl mx-auto">
      <div className="mb-6">
        <h2 className="text-lg font-bold text-[var(--color-magenta)] font-display tracking-[0.1em] uppercase mb-2">
          {t('semantic.typeResolution')}
        </h2>
        <p className="text-xs text-[var(--color-text-dim)] font-mono leading-relaxed">
          {t('semantic.typeResolutionDescription')}
        </p>
      </div>

      <div className="border border-[var(--color-border-bright)] rounded-lg overflow-hidden bg-[var(--color-card)]">
        <div className="px-4 py-2 border-b border-[var(--color-border)] flex items-center justify-between">
          <span className="text-[10px] font-bold tracking-[0.1em] uppercase text-[var(--color-text-muted)] font-display">
            {t('semantic.resolutionFlow')}
          </span>
          <span className="text-[9px] font-mono text-[var(--color-amber)]">
            {Math.min(currentIndex + 1, totalSteps)}/{totalSteps} {t('semantic.steps')}
          </span>
        </div>

        <div className="p-4">
          {/* Mini Sankey overview */}
          <div className="mb-6">
            <svg ref={svgRef} width="100%" height="120" style={{ fontFamily: 'Monaco, Consolas, monospace' }}>
              <defs>
                <marker id="arrow" markerWidth="8" markerHeight="8" refX="7" refY="4" orient="auto">
                  <path d="M0,0 L8,4 L0,8 Z" fill="currentColor" />
                </marker>
              </defs>
            </svg>
          </div>

          {/* Detailed callout for current step */}
          <AnimatePresence mode="wait">
            {totalSteps > 0 && currentIndex >= 0 && currentIndex < totalSteps && (
              <motion.div
                key={currentIndex}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.3 }}
                className="border border-[var(--color-border)] rounded-lg p-4 bg-[var(--color-surface)]"
              >
                {(() => {
                  const step = keySteps[currentIndex];
                  return (
                    <>
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-[11px] font-bold text-[var(--color-neon)] font-display uppercase">
                          {t('semantic.resolving')} #{currentIndex + 1}
                        </span>
                        <span
                          className={`inline-block px-2 py-0.5 text-[9px] font-bold rounded ${
                            step.resolved
                              ? 'text-[var(--color-void)] bg-[var(--color-neon)]'
                              : 'text-[var(--color-void)] bg-[var(--color-rose)]'
                          }`}
                        >
                          {step.resolved ? t('semantic.resolved') : t('semantic.unresolved')}
                        </span>
                      </div>

                      <div className="space-y-2 text-xs font-mono">
                        <div className="flex gap-4">
                          <span className="text-[var(--color-text-muted)] w-16">Symbol:</span>
                          <span className="text-[var(--color-text)]">{step.symbol}</span>
                        </div>
                        {step.fqn && (
                          <div className="flex gap-4">
                            <span className="text-[var(--color-text-muted)] w-16">FQN:</span>
                            <span className="text-[var(--color-cyan)]">{step.fqn}</span>
                          </div>
                        )}
                        {step.type && (
                          <div className="flex gap-4">
                            <span className="text-[var(--color-text-muted)] w-16">Type:</span>
                            <span className="text-[var(--color-amber)]">{step.type}</span>
                          </div>
                        )}
                        {step.returnType && (
                          <div className="flex gap-4">
                            <span className="text-[var(--color-text-muted)] w-16">Returns:</span>
                            <span className="text-[var(--color-rose)]">{step.returnType}</span>
                          </div>
                        )}
                        <div className="flex gap-4">
                          <span className="text-[var(--color-text-muted)] w-16">Location:</span>
                          <span className="text-[var(--color-text-dim)]">Line {step.source}</span>
                        </div>
                      </div>
                    </>
                  );
                })()}
              </motion.div>
            )}

            {totalSteps === 0 && (
              <div className="text-center py-8 text-[var(--color-text-muted)] text-xs font-mono">
                {t('semantic.noResolutions')}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

export default TypeResolutionFlow;
