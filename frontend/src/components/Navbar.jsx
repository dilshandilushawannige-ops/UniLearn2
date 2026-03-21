import React, { useEffect, useRef, useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import ProfileDropdown from './ProfileDropdown';
import GuestDropdown from './GuestDropdown';

const Navbar = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    const handleOutsideClick = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setMenuOpen(false);
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const handleLogout = () => {
    logout();
    setMenuOpen(false);
    navigate('/dashboard');
  };

  const navItemClass = ({ isActive }) => (isActive ? 'active' : '');

  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <NavLink to="/dashboard" className="brand">UniLearnHub</NavLink>

        <nav>
          <NavLink to="/dashboard" className={navItemClass}>Dashboard</NavLink>
          <NavLink to="/resource" className={navItemClass}>Resources</NavLink>
          <NavLink to="/resource-request" className={navItemClass}>Resource Request</NavLink>
          <NavLink to="/live-class" className={navItemClass}>Live Class</NavLink>
          <NavLink to="/study-plan" className={navItemClass}>Study Plan</NavLink>
          <NavLink to="/mcq" className={navItemClass}>MCQ Quiz</NavLink>
        </nav>
      </div>

      <div ref={menuRef} className="account-wrap">
          <button
            onClick={() => setMenuOpen((prev) => !prev)}
            aria-label="Account menu"
            className="account-btn"
          >
            <svg viewBox="0 0 24 24" width="18" height="18" fill="currentColor" aria-hidden="true">
              <path d="M12 12a5 5 0 1 0-5-5 5 5 0 0 0 5 5Zm0 2c-4.42 0-8 2.24-8 5v1h16v-1c0-2.76-3.58-5-8-5Z" />
            </svg>
          </button>

          {menuOpen && (user ? <ProfileDropdown user={user} onLogout={handleLogout} /> : <GuestDropdown onNavigate={() => setMenuOpen(false)} />)}
      </div>
    </header>
  );
};

export default Navbar;
