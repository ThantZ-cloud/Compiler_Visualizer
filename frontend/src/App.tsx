import { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { compileAPI } from './services/api';
import './App.css';

interface Token {
  type: string;
  value: string;
  line: number;
  column: number;
  length: number;
}

interface CompileResponse {
  tokens: Token[];
  astJson: string;
  symbolTableJson: string;
  bytecode: string;
  executionOutput: string;
  error?: string;
  compilationTimeMs: number;
}

type CompilationPhase = 'tokens' | 'ast' | 'semantic' | 'bytecode' | 'execution';

function App() {
  const [code, setCode] = useState<string>(`public class Main {
    public static void main(String[] args) {
        System.out.println("Hello, World!");
    }
}`);
  const [result, setResult] = useState<CompileResponse | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [activePhase, setActivePhase] = useState<CompilationPhase>('tokens');
  const [stdinInput, setStdinInput] = useState<string>('');
  const abortControllerRef = useRef<AbortController | null>(null);

  const handleCompile = useCallback(async () => {
    // Abort any previous in-flight request
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    const controller = new AbortController();
    abortControllerRef.current = controller;

    setLoading(true);
    setError(null);
    try {
      const response = await compileAPI.compile(code, stdinInput, controller.signal);
      setResult(response.data);
    } catch (err: any) {
      if (err.name === 'CanceledError' || err.name === 'AbortError') {
        // Request was cancelled — don't show error
        return;
      }
      setError(err.response?.data?.message || 'Compilation failed');
    } finally {
      setLoading(false);
    }
  }, [code, stdinInput]);

  const handleCancel = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setLoading(false);
  }, []);

  const renderTokenPanel = () => {
    if (!result?.tokens) return <div className="panel-placeholder">No tokens generated</div>;

    return (
      <div className="token-panel">
        <h3>Tokens ({result.tokens.length})</h3>
        <div className="token-list">
          {result.tokens.map((token: Token, index: number) => (
            <div key={index} className={`token-item token-${token.type.toLowerCase()}`}>
              <span className="token-type">{token.type}</span>
              <span className="token-value">"{token.value}"</span>
              <span className="token-position">L{token.line}:C{token.column}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const renderAstPanel = () => {
    if (!result?.astJson) return <div className="panel-placeholder">No AST generated</div>;

    return (
      <div className="ast-panel">
        <h3>Abstract Syntax Tree</h3>
        <pre className="ast-json">{result.astJson}</pre>
      </div>
    );
  };

  const renderSemanticPanel = () => {
    if (!result?.symbolTableJson) return <div className="panel-placeholder">No symbol table generated</div>;

    return (
      <div className="semantic-panel">
        <h3>Symbol Table</h3>
        <pre className="symbol-table">{result.symbolTableJson}</pre>
      </div>
    );
  };

  const renderBytecodePanel = () => {
    if (!result?.bytecode) return <div className="panel-placeholder">No bytecode generated</div>;

    return (
      <div className="bytecode-panel">
        <h3>JVM Bytecode</h3>
        <pre className="bytecode">{result.bytecode}</pre>
      </div>
    );
  };

  const renderExecutionPanel = () => {
    if (!result?.executionOutput && !result?.error) return <div className="panel-placeholder">No execution output</div>;

    return (
      <div className="execution-panel">
        <h3>Execution Output</h3>
        {result.error ? (
          <pre className="error-output">{result.error}</pre>
        ) : (
          <pre className="execution-output">{result.executionOutput}</pre>
        )}
        {result.compilationTimeMs && (
          <div className="compilation-time">
            Compilation time: {result.compilationTimeMs}ms
          </div>
        )}
      </div>
    );
  };

  const renderVisualizationPanel = () => {
    switch (activePhase) {
      case 'tokens':
        return renderTokenPanel();
      case 'ast':
        return renderAstPanel();
      case 'semantic':
        return renderSemanticPanel();
      case 'bytecode':
        return renderBytecodePanel();
      case 'execution':
        return renderExecutionPanel();
      default:
        return null;
    }
  };

  return (
    <div className="app">
      <header className="app-header">
        <h1>Compiler Visualizer</h1>
        <div className="header-actions">
          <button className="compile-button" onClick={handleCompile} disabled={loading}>
            {loading ? 'Compiling...' : '▶ Compile & Execute'}
          </button>
          {loading && (
            <button className="cancel-button" onClick={handleCancel}>
              ✕ Cancel
            </button>
          )}
        </div>
      </header>

      <main className="app-main">
        <div className="editor-panel">
          <h2>Code Editor</h2>
          <div className="stdin-input">
            <label htmlFor="stdin">Standard Input (stdin):</label>
            <textarea
              id="stdin"
              placeholder="Enter input for Scanner (e.g. `5 10` for two numbers)..."
              value={stdinInput}
              onChange={(e) => setStdinInput(e.target.value)}
              rows={2}
            />
          </div>
          <Editor
            height="400px"
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
            }}
          />
        </div>

        <div className="visualization-panel">
          <div className="phase-tabs">
            {(['tokens', 'ast', 'semantic', 'bytecode', 'execution'] as CompilationPhase[]).map((phase) => (
              <button
                key={phase}
                className={`phase-tab ${activePhase === phase ? 'active' : ''}`}
                onClick={() => setActivePhase(phase)}
              >
                {phase.charAt(0).toUpperCase() + phase.slice(1)}
              </button>
            ))}
          </div>
          <div className="visualization-content">
            {renderVisualizationPanel()}
          </div>
        </div>
      </main>

      {error && (
        <div className="error-banner">
          {error}
        </div>
      )}
    </div>
  );
}

export default App;
