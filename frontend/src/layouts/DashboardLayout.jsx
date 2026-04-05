import React, { useEffect, useRef, useState } from 'react';
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { notificationsAPI } from '../api/notifications';
import '../styles/UserDashboard.css';

// Import all PNG icons from assets folder
import dashboardIcon from '../assets/dashboard-icon.png';
import resourcesIcon from '../assets/resources-icon.png';
import uploadIcon from '../assets/upload-icon.png';
import studyPlanIcon from '../assets/study-plan-icon.png';
import liveClassIcon from '../assets/live-class-icon.png';
import mcqIcon from '../assets/mcq-icon.png';

// Admin sidebar icons
import dashboardAdminIcon from '../assets/dashboard-admin-icon.png';
import moderationIcon from '../assets/moderation-icon.png';
import liveClassAdminIcon from '../assets/live-class-admin-icon.png';
import attendanceIcon from '../assets/attendance-icon.png';
import kuppiAdminIcon from '../assets/kuppi-admin-icon.png';

// Topbar PNG icons
import searchIcon from '../assets/search-icon.png';
import notificationIcon from '../assets/notification-icon.png';
import gamesIcon from '../assets/games-icon.png';
import requestsIcon from '../assets/requests-icon.png';
import stackOverflowNavIcon from '../assets/docs-icon.png';

/** Monochrome leaderboard bars — follows nav text color (gray / blue), no PNG tint issues */
const TopContributorsNavIcon = () => (
  <svg className="nav-icon-svg" width={20} height={20} viewBox="0 0 24 24" aria-hidden>
    <rect x="3" y="14" width="5.5" height="7" rx="1.2" fill="currentColor" opacity={0.85} />
    <rect x="9.25" y="8" width="5.5" height="13" rx="1.2" fill="currentColor" />
    <rect x="15.5" y="11" width="5.5" height="10" rx="1.2" fill="currentColor" opacity={0.88} />
  </svg>
);

const DashboardLayout = () => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [showNotificationMenu, setShowNotificationMenu] = useState(false);
  const [notifications, setNotifications] = useState({
    unreadCount: 0,
    groups: {
      cancelledClasses: [],
      upcomingReminders: [],
      kuppiUpdates: [],
    },
  });
  const [notificationLoading, setNotificationLoading] = useState(false);
  const notificationRef = useRef(null);

  const isActive = (path) => location.pathname === path;

  const handleLogout = () => {
    navigate('/dashboard', { replace: true });
    setTimeout(() => {
      logout();
    }, 100);
  };

  const fetchNotifications = async () => {
    setNotificationLoading(true);
    try {
      const data = await notificationsAPI.getAll();
      setNotifications(data);
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setNotificationLoading(false);
    }
  };

  useEffect(() => {
    fetchNotifications();
    const timer = setInterval(fetchNotifications, 60000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const onClickOutside = (event) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target)) {
        setShowNotificationMenu(false);
      }
    };
    document.addEventListener('mousedown', onClickOutside);
    return () => document.removeEventListener('mousedown', onClickOutside);
  }, []);

  const toggleNotifications = async () => {
    const willOpen = !showNotificationMenu;
    setShowNotificationMenu(willOpen);
    if (willOpen) {
      await notificationsAPI.markAllRead();
      await fetchNotifications();
    }
  };

  const dismissNotification = async (id) => {
    await notificationsAPI.dismiss(id);
    await fetchNotifications();
  };

  const clearAllNotifications = async () => {
    await notificationsAPI.clearAll();
    await fetchNotifications();
  };

  const renderNotificationSection = (title, items) => (
    <div className="notif-section">
      <p className="notif-section-title">{title}</p>
      {items.length === 0 && <p className="notif-empty">No notifications</p>}
      {items.map((item) => (
        <div key={item._id} className="notif-item">
          <div>
            <p className="notif-item-title">{item.title}</p>
            <p className="notif-item-message">{item.message}</p>
          </div>
          <button className="notif-dismiss" onClick={() => dismissNotification(item._id)}>Dismiss</button>
        </div>
      ))}
    </div>
  );

  const adminNavItems = [
    {
      to: '/user-dashboard',
      label: 'Dashboard',
      icon: dashboardAdminIcon,
      match: ['/user-dashboard'],
      exact: true,
    },
    {
      to: '/user-dashboard/resources',
      label: 'Moderation',
      icon: moderationIcon,
      match: ['/user-dashboard/resources'],
    },
    {
      to: '/user-dashboard/live-class',
      label: 'Live Classes',
      icon: liveClassAdminIcon,
      match: ['/user-dashboard/live-class'],
      exact: true,
    },
    {
      to: '/user-dashboard/attendance',
      label: 'Attendance',
      icon: attendanceIcon,
      match: ['/user-dashboard/attendance'],
    },
    {
      to: '/user-dashboard/requests',
      label: 'Kuppi',
      icon: kuppiAdminIcon,
      match: ['/user-dashboard/requests'],
    },
  ];

  const isAdminNavActive = (item) => {
    if (item.exact) {
      return item.match.some((path) => location.pathname === path);
    }
    return item.match.some((path) => location.pathname.startsWith(path));
  };

  return (
    <div className="user-dashboard">
      {/* Sidebar */}
      <aside className="dashboard-sidebar">
        <div className="sidebar-header">
          <h2>UniLearnHub</h2>
          <p>{isAdmin ? 'Admin Panel' : 'Academic Editorial'}</p>
        </div>

        <nav className="sidebar-nav">

          {isAdmin ? (
            adminNavItems.map((item) => (
              <Link key={item.label} to={item.to} className={`nav-item ${isAdminNavActive(item) ? 'active' : ''}`}>
                <img src={item.icon} alt={item.label} className="nav-icon-img" />
                {item.label}
              </Link>
            ))
          ) : (
            <>
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
              <Link to="/user-dashboard/questions" className={`nav-item ${isActive('/user-dashboard/questions') ? 'active' : ''}`}>
                <img src={stackOverflowNavIcon} alt="" className="nav-icon-img" />
                Stack Overflow
              </Link>
              <Link to="/user-dashboard/top-contributors" className={`nav-item ${isActive('/user-dashboard/top-contributors') ? 'active' : ''}`}>
                <TopContributorsNavIcon />
                Top Contributors
              </Link>
            </>
          )}

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
              <Link to="/user-dashboard/profile" className="profile-dropdown-item" onClick={() => setShowProfileMenu(false)} style={{ textDecoration: 'none' }}>
                <span className="dropdown-icon">👤</span>
                <div>
                  <p className="dropdown-label">Year {user?.currentYear || 1}, Semester {user?.currentSemester || 1}</p>
                  <p className="dropdown-sublabel">Current Academic Period</p>
                </div>
              </Link>
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
            {!isAdmin && (
              <>
                <Link to="/user-dashboard/resources" className="header-link">Archive</Link>
                <Link to="/user-dashboard/live-class" className="header-link">Community</Link>
              </>
            )}
            <div className="notification-wrap" ref={notificationRef}>
              <button className="notification-btn" onClick={toggleNotifications}>
                <img src={notificationIcon} alt="Notifications" className="notification-icon-img" />
                {notifications.unreadCount > 0 && (
                  <span className="notification-badge">{notifications.unreadCount > 99 ? '99+' : notifications.unreadCount}</span>
                )}
              </button>

              {showNotificationMenu && (
                <div className="notification-dropdown">
                  <div className="notif-head">
                    <strong>Notifications</strong>
                    <button className="notif-clear" onClick={clearAllNotifications}>Clear All</button>
                  </div>

                  {notificationLoading && <p className="notif-empty">Loading...</p>}
                  {!notificationLoading && (
                    <>
                      {renderNotificationSection('Cancelled Classes', notifications.groups?.cancelledClasses || [])}
                      {renderNotificationSection('Upcoming Reminders', notifications.groups?.upcomingReminders || [])}
                      {renderNotificationSection('Kuppi Updates', notifications.groups?.kuppiUpdates || [])}
                    </>
                  )}
                </div>
              )}
            </div>
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
