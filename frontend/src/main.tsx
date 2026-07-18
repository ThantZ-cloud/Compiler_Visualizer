import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './i18n'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CompileProvider } from './context/CompileContext'
import { ThemeProvider } from './context/ThemeContext'
import { LanguageProvider } from './context/LanguageContext'
import Layout from './components/Layout'
import LandingPage from './pages/LandingPage'
import PipelinePage from './pages/PipelinePage'
import EditorPage from './pages/EditorPage'
import VisualizeLayout from './pages/VisualizeLayout'
import TokensPanel from './pages/TokensPanel'
import AstPanel from './pages/AstPanel'
import SemanticPanel from './pages/SemanticPanel'
import BytecodePanel from './pages/BytecodePanel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <ThemeProvider>
        <LanguageProvider>
          <AuthProvider>
            <CompileProvider>
              <Routes>
                <Route element={<Layout />}>
                  <Route path="/" element={<LandingPage />} />
                  <Route path="/pipeline" element={<PipelinePage />} />
                  <Route path="/compiler" element={<EditorPage />} />
                  <Route path="/visualize" element={<VisualizeLayout />}>
                    <Route path="tokens" element={<TokensPanel />} />
                    <Route path="ast" element={<AstPanel />} />
                    <Route path="semantic" element={<SemanticPanel />} />
                    <Route path="bytecode" element={<BytecodePanel />} />
                  </Route>
                </Route>
              </Routes>
            </CompileProvider>
          </AuthProvider>
        </LanguageProvider>
      </ThemeProvider>
    </BrowserRouter>
  </StrictMode>,
)
