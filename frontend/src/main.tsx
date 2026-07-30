import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import { Toaster } from 'sonner'
import './i18n'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CompileProvider } from './context/CompileContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import ErrorBoundary from './components/ErrorBoundary'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import PipelinePage from './pages/PipelinePage'
import EditorPage from './pages/EditorPage'
import VisualizeLayout from './pages/VisualizeLayout'
import TokensPanel from './pages/TokensPanel'
import AstPanel from './pages/AstPanel'
import SemanticPanel from './pages/SemanticPanel'
import TacPanel from './pages/TacPanel'
import BytecodePanel from './pages/BytecodePanel'
import CfgPanel from './pages/CfgPanel'

createRoot(document.getElementById('root')!).render(
  <ErrorBoundary name="Application">
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CompileProvider>
              <Toaster position="bottom-right" theme="dark" />
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/compiler" element={<EditorPage />} />
                  <Route path="/visualize" element={<VisualizeLayout />}>
                    <Route path="tokens" element={<TokensPanel />} />
                    <Route path="ast" element={<AstPanel />} />
                    <Route path="semantic" element={<SemanticPanel />} />
                    <Route path="tac" element={<TacPanel />} />
                    <Route path="bytecode" element={<BytecodePanel />} />
                    <Route path="cfg" element={<CfgPanel />} />
                  </Route>
                </Route>
              </Routes>
            </CompileProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </ErrorBoundary>,
)
