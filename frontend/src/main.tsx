import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import { BrowserRouter, Routes, Route } from 'react-router-dom'
import './index.css'
import { AuthProvider } from './context/AuthContext'
import { CompileProvider } from './context/CompileContext'
import Layout from './components/Layout'
import EditorPage from './pages/EditorPage'
import VisualizeLayout from './pages/VisualizeLayout'
import TokensPanel from './pages/TokensPanel'
import AstPanel from './pages/AstPanel'
import SemanticPanel from './pages/SemanticPanel'
import BytecodePanel from './pages/BytecodePanel'

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <BrowserRouter>
      <AuthProvider>
        <CompileProvider>
          <Routes>
            <Route element={<Layout />}>
              <Route path="/" element={<EditorPage />} />
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
    </BrowserRouter>
  </StrictMode>,
)
