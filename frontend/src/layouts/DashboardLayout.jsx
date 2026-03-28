import React, { useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import '../styles/UserDashboard.css';

// Import all PNG icons from assets folder
import dashboardIcon from '../assets/dashboard-icon.png';
import resourcesIcon from '../assets/resources-icon.png';
import uploadIcon from '../assets/upload-icon.png';
import studyPlanIcon from '../assets/study-plan-icon.png';
import liveClassIcon from '../assets/live-class-icon.png';
import mcqIcon from '../assets/mcq-icon.png';
import requestsIcon from '../assets/requests-icon.png';

// Topbar PNG icons
import searchIcon from '../assets/search-icon.png';
import notificationIcon from '../assets/notification-icon.png';
import gamesIcon from '../assets/games-icon.png';


const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  return (
    <div className="user-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>UniLearnHub</h2>
          <p>Academic Editorial</p>
        </div>

        <nav className="sidebar-nav">
          <Link to="/user-dashboard" className={`nav-item ${isActive('/user-dashboard') ? 'active' : ''}`}>
            <img src={dashboardIcon} alt="Dashboard" className="nav-icon-img" />
            Dashboard
          </Link>
          <Link to="/user-dashboard/resources" className={`nav-item ${isActive('/user-dashboard/resources') ? 'active' : ''}`}>
            <img src={resourcesIcon} alt="Resources" className="nav-icon-img" />
            Resources
          </Link>
          <Link to="/user-dashboard/upload" className={`nav-item ${isActive('/user-dashboard/upload') ? 'active' : ''}`}>
            <img src={uploadIcon} alt="Upload" className="nav-icon-img" />
            Upload Resource
          </Link>
          <Link to="/user-dashboard/study-plans" className={`nav-item ${isActive('/user-dashboard/study-plans') ? 'active' : ''}`}>
            <img src={studyPlanIcon} alt="Study Plans" className="nav-icon-img" />
            Study Plans
          </Link>
          <Link to="/user-dashboard/live-class" className={`nav-item ${isActive('/user-dashboard/live-class') ? 'active' : ''}`}>
            <img src={liveClassIcon} alt="Live Class" className="nav-icon-img" />
            Live Class
          </Link>
          <Link to="/user-dashboard/mcq" className={`nav-item ${isActive('/user-dashboard/mcq') ? 'active' : ''}`}>
            <img src={mcqIcon} alt="MCQ Practice" className="nav-icon-img" />
            MCQ Practice
          </Link>
          <Link to="/user-dashboard/games" className={`nav-item ${isActive('/user-dashboard/games') ? 'active' : ''}`}>
            <img src={gamesIcon} alt="Games" className="nav-icon-img" />
            Games
          </Link>
          <Link to="/user-dashboard/requests" className={`nav-item ${isActive('/user-dashboard/requests') ? 'active' : ''}`}>
            <img src={requestsIcon} alt="Requests" className="nav-icon-img" />
            Requests
          </Link>
        </nav>

        {/* User Profile Section */}
        <div className="sidebar-profile">
          <div className="profile-card" onClick={() => setShowProfileMenu(!showProfileMenu)}>
            <div className="profile-avatar">
              {user?.username?.substring(0, 2).toUpperCase() || 'U'}
            </div>
            <div className="profile-info">
              <p className="profile-name">{user?.username || 'User'}</p>
              <p className="profile-email">{user?.email || 'user@sliit.lk'}</p>
            </div>
            <span className="profile-menu-icon">⋮</span>
          </div>

          {showProfileMenu && (
            <div className="profile-dropdown">
              <div className="profile-dropdown-item">
                <span className="dropdown-icon">👤</span>
                <div>
                  <p className="dropdown-label">Year {user?.currentYear || 1}, Semester {user?.currentSemester || 1}</p>
                  <p className="dropdown-sublabel">Current Academic Period</p>
                </div>
              </div>
              <div className="profile-dropdown-divider"></div>
              <button className="profile-dropdown-item profile-dropdown-logout" onClick={handleLogout}>
                <span className="dropdown-icon">🚪</span>
                <span>Logout</span>
              </button>
            </div>
          )}
        </div>
      </aside>

      {/* Main Content */}
      <main className="dashboard-main">
        {/* Top Bar */}
        <header className="dashboard-header">
          <div className="search-bar">
            <img src={searchIcon} alt="Search" className="search-icon-img" />
            <input
              type="text"
              placeholder="Search resources, modules..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <div className="header-actions">
            <Link to="/user-dashboard/resources" className="header-link">Archive</Link>
            <Link to="/user-dashboard/live-class" className="header-link">Community</Link>
            <button className="notification-btn">
              <img src={notificationIcon} alt="Notifications" className="notification-icon-img" />
            </button>
          </div>
        </header>

        {/* Dynamic Content Area */}
        <div key={location.pathname} className="dashboard-content fade-in-up">
          <Outlet context={{ searchQuery }} />        </div>
        {/* Footer */}
        <footer className="dashboard-footer">
          <p>© 2024 UniLearnHub SLIIT. All rights reserved.</p>
          <div className="footer-links">
            <a href="#">Help Center</a>
            <a href="#">Contact Support</a>
            <a href="#">Privacy Policy</a>
            <a href="#">Terms of Service</a>
          </div>
        </footer>
      </main>
    </div>
  );
};

export default DashboardLayout;
