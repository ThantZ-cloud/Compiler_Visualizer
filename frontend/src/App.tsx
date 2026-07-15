import { useState, useCallback, useRef } from 'react';
import Editor from '@monaco-editor/react';
import { motion, AnimatePresence } from 'framer-motion';
import { compileAPI } from './services/api';
import { useAuth } from './context/AuthContext';
import LoginModal from './components/LoginModal';
import RegisterModal from './components/RegisterModal';
import UserMenu from './components/UserMenu';
import AstTree from './components/AstTree';
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
  const { isAuthenticated } = useAuth();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
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
        <motion.div
          className="token-list"
          initial="hidden"
          animate="visible"
          variants={{
            hidden: { opacity: 0 },
            visible: { opacity: 1, transition: { staggerChildren: 0.02 } },
          }}
        >
          {result.tokens.map((token: Token, index: number) => (
            <motion.div
              key={index}
              className={`token-item token-${token.type.toLowerCase()}`}
              variants={{
                hidden: { opacity: 0, y: 10 },
                visible: { opacity: 1, y: 0 },
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 24 }}
            >
              <span className="token-type">{token.type}</span>
              <span className="token-value">"{token.value}"</span>
              <span className="token-position">L{token.line}:C{token.column}</span>
            </motion.div>
          ))}
        </motion.div>
      </div>
    );
  };

  const renderAstPanel = () => {
    if (!result?.astJson) return <div className="panel-placeholder">No AST generated</div>;

    return <AstTree astJson={result.astJson} />;
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
          {isAuthenticated ? (
            <UserMenu />
          ) : (
            <>
              <button className="auth-button-secondary" onClick={() => setShowLoginModal(true)}>
                Sign In
              </button>
              <button className="auth-button-primary" onClick={() => setShowRegisterModal(true)}>
                Register
              </button>
            </>
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
          <div className="editor-wrapper">
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
              }}
            />
          </div>
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
            <AnimatePresence mode="wait">
              <motion.div
                key={activePhase}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
              >
                {renderVisualizationPanel()}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </main>

      <AnimatePresence>
        {error && (
          <motion.div
            className="error-banner"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ type: 'spring', stiffness: 300, damping: 24 }}
          >
            {error}
          </motion.div>
        )}
      </AnimatePresence>

      <LoginModal
        isOpen={showLoginModal}
        onClose={() => setShowLoginModal(false)}
        onSwitchToRegister={() => { setShowLoginModal(false); setShowRegisterModal(true); }}
      />
      <RegisterModal
        isOpen={showRegisterModal}
        onClose={() => setShowRegisterModal(false)}
        onSwitchToLogin={() => { setShowRegisterModal(false); setShowLoginModal(true); }}
      />
    </div>
  );
}

export default App;
