import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { useCompile } from '../context/CompileContext';
import './TokensPanel.css';

const TokensPanel: React.FC = () => {
  const { result } = useCompile();
  const [filter, setFilter] = useState('');

  if (!result?.tokens) {
    return <div className="panel-placeholder">No tokens generated</div>;
  }

  const tokens = result.tokens;
  const filtered = filter
    ? tokens.filter(t => t.type.toLowerCase().includes(filter.toLowerCase()) || t.value.toLowerCase().includes(filter.toLowerCase()))
    : tokens;

  // Group by type
  const grouped = filtered.reduce((acc, token) => {
    acc[token.type] = (acc[token.type] || 0) + 1;
    return acc;
  }, {} as Record<string, number>);

  return (
    <div className="tokens-panel">
      <div className="tokens-header">
        <h2>Tokens ({tokens.length} total, {filtered.length} shown)</h2>
        <input
          type="text"
          className="token-filter"
          placeholder="Filter tokens..."
          value={filter}
          onChange={(e) => setFilter(e.target.value)}
        />
      </div>

      <div className="tokens-summary">
        {Object.entries(grouped).sort((a, b) => b[1] - a[1]).map(([type, count]) => (
          <span key={type} className={`token-badge token-badge-${type.toLowerCase()}`}>
            {type}: {count}
          </span>
        ))}
      </div>

      <motion.div
        className="tokens-grid"
        initial="hidden"
        animate="visible"
        variants={{
          hidden: { opacity: 0 },
          visible: { opacity: 1, transition: { staggerChildren: 0.01 } },
        }}
      >
        {filtered.map((token, index) => (
          <motion.div
            key={index}
            className={`token-card token-${token.type.toLowerCase()}`}
            variants={{
              hidden: { opacity: 0, scale: 0.9 },
              visible: { opacity: 1, scale: 1 },
            }}
          >
            <span className="token-type">{token.type}</span>
            <span className="token-value">"{token.value}"</span>
            <span className="token-pos">L{token.line}:C{token.column}</span>
          </motion.div>
        ))}
      </motion.div>
    </div>
  );
};

export default TokensPanel;
