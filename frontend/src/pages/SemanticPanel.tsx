import React from 'react';
import { useCompile } from '../context/CompileContext';
import './PanelPage.css';

const SemanticPanel: React.FC = () => {
  const { result } = useCompile();

  if (!result?.symbolTableJson) {
    return <div className="panel-placeholder">No symbol table generated</div>;
  }

  let formatted = result.symbolTableJson;
  try {
    formatted = JSON.stringify(JSON.parse(result.symbolTableJson), null, 2);
  } catch {
    // Keep original if not valid JSON
  }

  return (
    <div className="panel-page">
      <div className="panel-header">
        <h2>Symbol Table</h2>
      </div>
      <pre className="panel-code">{formatted}</pre>
    </div>
  );
};

export default SemanticPanel;
