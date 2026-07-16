import React from 'react';
import { useCompile } from '../context/CompileContext';
import Skeleton from '../components/Skeleton';
import './PanelPage.css';

const BytecodePanel: React.FC = () => {
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="panel-page">
        <div className="panel-header">
          <Skeleton width="150px" height="20px" />
        </div>
        <div className="bytecode-skeleton">
          <Skeleton count={20} height="14px" />
        </div>
      </div>
    );
  }

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
