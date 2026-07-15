import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useCompile } from '../context/CompileContext';
import LoginModal from './LoginModal';
import RegisterModal from './RegisterModal';
import UserMenu from './UserMenu';
import './Layout.css';

const Layout: React.FC = () => {
  const { isAuthenticated } = useAuth();
  const { handleCompile, loading, handleCancel } = useCompile();
  const navigate = useNavigate();
  const location = useLocation();
  const [showLoginModal, setShowLoginModal] = useState(false);
  const [showRegisterModal, setShowRegisterModal] = useState(false);

  const isVisualizing = location.pathname.startsWith('/visualize');

  return (
    <div className="layout">
      <header className="layout-header">
        <div className="header-left">
          <h1 className="header-logo" onClick={() => navigate('/')}>
            ▸ Compiler Visualizer
          </h1>
        </div>
        <div className="header-actions">
          <button
            className="compile-button"
            onClick={handleCompile}
            disabled={loading}
          >
            {loading ? 'Compiling...' : '▶ Compile'}
          </button>
          {loading && (
            <button className="cancel-button" onClick={handleCancel}>
              ✕
            </button>
          )}
          <button
            className={`visualize-button ${isVisualizing ? 'active' : ''}`}
            onClick={() => navigate('/visualize/tokens')}
          >
            ◎ Visualize
          </button>
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

      <Outlet />

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
};

export default Layout;
