import React from 'react';
import { Outlet, NavLink, useNavigate } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import './VisualizeLayout.css';

const VisualizeLayout: React.FC = () => {
  const { result } = useCompile();
  const navigate = useNavigate();

  const phases = [
    { path: '/visualize/tokens', label: 'Tokens', icon: '⟐' },
    { path: '/visualize/ast', label: 'AST', icon: '⌬' },
    { path: '/visualize/semantic', label: 'Semantic', icon: '◈' },
    { path: '/visualize/bytecode', label: 'Bytecode', icon: '⏣' },
  ];

  return (
    <div className="visualize-layout">
      <nav className="visualize-nav">
        <button className="back-button" onClick={() => navigate('/compiler')}>
          ← EDITOR
        </button>
        <div className="w-px h-5 bg-[var(--color-border)]" />
        <div className="nav-phases">
          {phases.map((phase) => (
            <NavLink
              key={phase.path}
              to={phase.path}
              className={({ isActive }) => `nav-phase ${isActive ? 'active' : ''}`}
            >
              <span className="nav-icon">{phase.icon}</span>
              {phase.label}
            </NavLink>
          ))}
        </div>
        {result && (
          <div className="nav-meta">
            {result.tokens?.length} tokens • {result.compilationTimeMs}ms
          </div>
        )}
      </nav>

      <div className="visualize-content">
        {result ? (
          <Outlet />
        ) : (
          <div className="no-results">
            <div className="no-results-icon">◎</div>
            <h3>No Compilation Results</h3>
            <p>{'// '}Write some Java code and click COMPILE to see the visualization.</p>
            <button className="back-to-editor" onClick={() => navigate('/compiler')}>
              ← BACK TO EDITOR
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default VisualizeLayout;
