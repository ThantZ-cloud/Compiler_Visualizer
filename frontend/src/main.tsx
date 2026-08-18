import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
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
import AboutPage from './pages/AboutPage'
import PipelinePage from './pages/PipelinePage'
import EditorPage from './pages/EditorPage'
import VisualizeLayout from './pages/VisualizeLayout'
import LexicalAnalysisPanel from './pages/LexicalAnalysisPanel'
import SyntaxAnalysisPanel from './pages/SyntaxAnalysisPanel'
import SemanticAnalysisPanel from './pages/SemanticAnalysisPanel'
import CodeGenerationPanel from './pages/CodeGenerationPanel'
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
                  <Route path="/about" element={<AboutPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/compiler" element={<EditorPage />} />
                  <Route path="/visualize" element={<VisualizeLayout />}>
                    <Route index element={<LexicalAnalysisPanel />} />
                    <Route path="lexical" element={<LexicalAnalysisPanel />} />
                    <Route path="tokens" element={<LexicalAnalysisPanel />} />
                    <Route path="syntax" element={<SyntaxAnalysisPanel />} />
                    <Route path="ast" element={<Navigate to="/visualize/syntax" replace />} />
                    <Route path="semantic" element={<SemanticAnalysisPanel />} />
                    <Route path="codegen" element={<CodeGenerationPanel />} />
                    <Route path="tac" element={<Navigate to="/visualize/codegen" replace />} />
                    <Route path="bytecode" element={<BytecodePanel />} />
                    <Route path="cfg" element={<CfgPanel />} />
                    <Route path="optimizer" element={<Navigate to="/visualize/cfg" replace />} />
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
