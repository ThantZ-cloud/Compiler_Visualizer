import React from 'react';
import { motion } from 'framer-motion';

interface PipelineConnectorProps {
  /** Whether the upstream step is completed/active */
  active: boolean;
}

/**
 * Animated vertical connector between pipeline steps.
 * Shows flowing particles when active.
 */
const PipelineConnector: React.FC<PipelineConnectorProps> = ({ active }) => {
  return (
    <div className="flex flex-col items-center justify-center py-4 select-none">
      {/* Animated downward arrow with flowing particles */}
      <div className="relative flex flex-col items-center h-16">
        {/* Vertical line */}
        <div
          className={`w-px h-full transition-colors duration-500 ${
            active
              ? 'bg-gradient-to-b from-[var(--color-neon)] to-[var(--color-neon-dim)]'
              : 'bg-[var(--color-border-bright)]'
          }`}
        />

        {/* Flowing particles */}
        {active && (
          <>
            {[0, 1, 2].map((i) => (
              <motion.div
                key={i}
                className="absolute left-1/2 -translate-x-1/2 w-1.5 h-1.5 rounded-full bg-[var(--color-neon)]"
                initial={{ top: '0%', opacity: 0 }}
                animate={{ top: '100%', opacity: [0, 1, 1, 0] }}
                transition={{
                  duration: 1.5,
                  delay: i * 0.5,
                  repeat: Infinity,
                  ease: 'easeIn',
                }}
              />
            ))}
          </>
        )}

        {/* Arrow head */}
        <div
          className={`mt-[-1px] transition-colors duration-500 ${
            active ? 'text-[var(--color-neon)]' : 'text-[var(--color-border-bright)]'
          }`}
        >
          <svg width="10" height="6" viewBox="0 0 10 6" fill="none">
            <path d="M5 6L0 0H10L5 6Z" fill="currentColor" />
          </svg>
        </div>
      </div>
    </div>
  );
};

export default PipelineConnector;
