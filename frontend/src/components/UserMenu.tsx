import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import './UserMenu.css';

const UserMenu: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
  const { user, logout, isAuthenticated } = useAuth();
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  if (!isAuthenticated || !user) return null;

  return (
    <div className="user-menu" ref={menuRef}>
      <button className="user-menu-trigger" onClick={() => setIsOpen(!isOpen)}>
        <span className="user-avatar">{user.username.charAt(0).toUpperCase()}</span>
        <span className="user-name">{user.username}</span>
        <span className="dropdown-arrow">▾</span>
      </button>

      {isOpen && (
        <div className="user-menu-dropdown">
          <div className="dropdown-header">
            <span className="dropdown-username">{user.username}</span>
            {user.email && <span className="dropdown-email">{user.email}</span>}
          </div>
          <div className="dropdown-divider" />
          <button className="dropdown-item logout" onClick={() => { logout(); setIsOpen(false); }}>
            Sign Out
          </button>
        </div>
      )}
    </div>
  );
};

export default UserMenu;
