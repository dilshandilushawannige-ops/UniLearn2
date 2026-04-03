import React from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import SignupModal from './SignupModal';
import LoginModal from './LoginModal';

const Navbar = () => {
  const location = useLocation();
  const [showSignupModal, setShowSignupModal] = React.useState(false);
  const [showLoginModal, setShowLoginModal] = React.useState(false);
  const isDashboard = location.pathname === '/dashboard' || location.pathname === '/';

  // Show different navbar for dashboard vs other pages
  if (isDashboard) {
    return (
      <header className="navbar-landing">
        <div className="navbar-container">
          <NavLink to="/dashboard" className="brand-text">UniLearnHub</NavLink>

          <nav className="nav-center">
            <a href="#how-it-works" className="nav-link">How it Works</a>
            <a href="#help-center" className="nav-link">Help Center</a>
            <a href="#faq" className="nav-link">FAQ</a>
          </nav>

          <div className="nav-actions">
            <button 
              onClick={() => setShowLoginModal(true)} 
              className="btn-login"
              style={{border: 'none', background: 'transparent', fontFamily: 'inherit', cursor: 'pointer', outline: 'none', padding: 0}}
            >
              Login
            </button>
            <button 
              onClick={() => setShowSignupModal(true)} 
              className="btn-get-started"
              style={{border: 'none', fontFamily: 'inherit', cursor: 'pointer', outline: 'none'}}
            >
              Get Started
            </button>
          </div>
        </div>
        {showSignupModal && <SignupModal onClose={() => setShowSignupModal(false)} />}
        {showLoginModal && <LoginModal onClose={() => setShowLoginModal(false)} onSwitchToSignup={() => { setShowLoginModal(false); setShowSignupModal(true); }} />}
      </header>
    );
  }

  // Original navbar for authenticated pages
  return (
    <header className="navbar">
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.2rem' }}>
        <NavLink to="/dashboard" className="brand">UniLearnHub</NavLink>

        <nav>
          <NavLink to="/resource" className={({ isActive }) => (isActive ? 'active' : '')}>Resources</NavLink>
          <NavLink to="/live-class" className={({ isActive }) => (isActive ? 'active' : '')}>Live Class</NavLink>
          <NavLink to="/study-plan" className={({ isActive }) => (isActive ? 'active' : '')}>Study Plan</NavLink>
          <NavLink to="/mcq" className={({ isActive }) => (isActive ? 'active' : '')}>MCQ Quiz</NavLink>
        </nav>
      </div>
    </header>
  );
};

export default Navbar;
