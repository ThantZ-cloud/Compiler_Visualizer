import React, { useState } from 'react';
import { useCompile } from '../context/CompileContext';
import SemanticTree from '../components/SemanticTree';
import './PanelPage.css';

const SemanticPanel: React.FC = () => {
  const { result } = useCompile();
  const [view, setView] = useState<'tree' | 'json'>('tree');

  if (!result?.symbolTableJson) {
    return <div className="panel-placeholder">No symbol table generated</div>;
  }

  let formatted = result.symbolTableJson;
  try {
    formatted = JSON.stringify(JSON.parse(result.symbolTableJson), null, 2);
  } catch {
    // Keep original
  }

  return (
    <div className="panel-page">
      <div className="panel-header">
        <h2>Symbol Table</h2>
        <div className="view-toggle">
          <button
            className={`toggle-btn ${view === 'tree' ? 'active' : ''}`}
            onClick={() => setView('tree')}
          >
            🌳 Tree
          </button>
          <button
            className={`toggle-btn ${view === 'json' ? 'active' : ''}`}
            onClick={() => setView('json')}
          >
            { }
          </button>
        </div>
      </div>
      {view === 'tree' ? (
        <SemanticTree symbolTableJson={result.symbolTableJson} />
      ) : (
        <pre className="panel-code">{formatted}</pre>
      )}
    </div>
  );
};

export default SemanticPanel;
