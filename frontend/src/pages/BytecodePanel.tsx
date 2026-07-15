import React from 'react';
import { useCompile } from '../context/CompileContext';
import './PanelPage.css';

const BytecodePanel: React.FC = () => {
  const { result } = useCompile();

  if (!result?.bytecode) {
    return <div className="panel-placeholder">No bytecode generated</div>;
  }

  return (
    <div className="panel-page">
      <div className="panel-header">
        <h2>JVM Bytecode</h2>
      </div>
      <pre className="panel-code">{result.bytecode}</pre>
    </div>
  );
};

export default BytecodePanel;
