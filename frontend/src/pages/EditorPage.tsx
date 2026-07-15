import React from 'react';
import Editor from '@monaco-editor/react';
import { useNavigate } from 'react-router-dom';
import { useCompile } from '../context/CompileContext';
import './EditorPage.css';

const EditorPage: React.FC = () => {
  const { code, setCode, result, loading, error, stdinInput, setStdinInput } = useCompile();
  const navigate = useNavigate();

  return (
    <div className="editor-page">
      <div className="editor-top">
        <div className="editor-section">
          <div className="editor-toolbar">
            <span className="editor-label">📝 Code Editor</span>
            <div className="stdin-toggle">
              <label htmlFor="stdin" className="stdin-label">stdin:</label>
              <input
                id="stdin"
                type="text"
                className="stdin-input-inline"
                placeholder="Enter input (e.g. `5 10` for two numbers)..."
                value={stdinInput}
                onChange={(e) => setStdinInput(e.target.value)}
              />
            </div>
          </div>
          <div className="editor-container">
            <Editor
              height="100%"
              defaultLanguage="java"
              theme="vs-dark"
              value={code}
              onChange={(value) => setCode(value || '')}
              options={{
                minimap: { enabled: false },
                fontSize: 14,
                lineNumbers: 'on',
                scrollBeyondLastLine: false,
                automaticLayout: true,
                padding: { top: 10 },
              }}
            />
          </div>
        </div>
      </div>

      <div className="editor-bottom">
        <div className="terminal-header">
          <span className="terminal-label">⬢ Output</span>
          {result && (
            <button
              className="visualize-link"
              onClick={() => navigate('/visualize/tokens')}
            >
              ◎ Visualize Results →
            </button>
          )}
        </div>
        <div className="terminal-content">
          {loading && (
            <div className="terminal-loading">
              <span className="spinner">⟳</span> Compiling and executing...
            </div>
          )}
          {!loading && error && (
            <pre className="terminal-error">{error}</pre>
          )}
          {!loading && !error && result?.executionOutput && (
            <pre className="terminal-output">{result.executionOutput}</pre>
          )}
          {!loading && !error && result?.error && (
            <pre className="terminal-error">{result.error}</pre>
          )}
          {!loading && !error && !result && (
            <div className="terminal-placeholder">
              Click "▶ Compile" to run your code. Output will appear here.
            </div>
          )}
          {!loading && result?.compilationTimeMs && (
            <div className="terminal-meta">
              Compilation completed in {result.compilationTimeMs}ms
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default EditorPage;
