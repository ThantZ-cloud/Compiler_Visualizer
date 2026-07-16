import React from 'react';
import { useCompile } from '../context/CompileContext';
import AstTree from '../components/AstTree';
import Skeleton from '../components/Skeleton';
import './PanelPage.css';

const AstPanel: React.FC = () => {
  const { result, loading } = useCompile();

  if (loading) {
    return (
      <div className="panel-page">
        <div className="tree-skeleton">
          <Skeleton count={15} height="16px" />
        </div>
      </div>
    );
  }

  if (!result?.astJson) {
    return <div className="panel-placeholder">No AST generated</div>;
  }

  return (
    <div className="panel-page">
      <AstTree astJson={result.astJson} />
    </div>
  );
};

export default AstPanel;
