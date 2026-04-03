import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { adminAPI } from '../api/admin';
import '../styles/AdminDashboard.css';

const AdminDashboard = () => {
  const { user } = useAuth();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchDashboardStats();
    }
  }, [user]);

  const fetchDashboardStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await adminAPI.getDashboardStats();
      setStats(data);
    } catch (err) {
      setError(err.message || 'Failed to load dashboard stats');
      console.error('Error fetching admin stats:', err);
    } finally {
      setLoading(false);
    }
  };

  if (user?.role !== 'admin') {
    return (
      <div className="admin-container">
        <div className="alert alert-error">
          You do not have admin privileges to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="admin-container">
      <div className="admin-header">
        <h1>Admin Dashboard</h1>
        <p className="subtitle">Welcome, {user?.username}. Here's your platform overview.</p>
        <button 
          className="btn btn-secondary btn-sm"
          onClick={fetchDashboardStats}
          disabled={loading}
        >
          {loading ? 'Refreshing...' : 'Refresh Stats'}
        </button>
      </div>

      {error && (
        <div className="alert alert-error">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading dashboard statistics...</p>
        </div>
      ) : stats ? (
        <div className="stats-grid">
          {/* Live Classes Card */}
          <div className="stat-card live-classes">
            <div className="stat-icon">
              <i className="icon">📹</i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalLiveClasses}</h3>
              <p>Live Classes</p>
            </div>
          </div>

          {/* Kuppi Requests Card */}
          <div className="stat-card kuppi-requests">
            <div className="stat-icon">
              <i className="icon">🎓</i>
            </div>
            <div className="stat-content">
              <h3>{stats.totalKuppiRequests}</h3>
              <p>Kuppi Requests</p>
            </div>
          </div>

          {/* Flagged Content Card */}
          <div className="stat-card flagged-content">
            <div className="stat-icon">
              <i className="icon">⚠️</i>
            </div>
            <div className="stat-content">
              <h3>{stats.flaggedContentCount}</h3>
              <p>Flagged Content Items</p>
            </div>
          </div>

          {/* Suspended Users Card */}
          <div className="stat-card suspended-users">
            <div className="stat-icon">
              <i className="icon">🚫</i>
            </div>
            <div className="stat-content">
              <h3>{stats.suspendedUsersCount}</h3>
              <p>Suspended Users</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="alert alert-warning">
          No data available. Please refresh.
        </div>
      )}

      {/* Quick Actions Section */}
      <div className="admin-actions">
        <h2>Quick Actions</h2>
        <div className="actions-grid">
          <button className="action-btn">
            <span className="action-icon">👥</span>
            <span className="action-label">Manage Users</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">⚠️</span>
            <span className="action-label">Review Flagged Content</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📋</span>
            <span className="action-label">View Kuppi Requests</span>
          </button>
          <button className="action-btn">
            <span className="action-icon">📺</span>
            <span className="action-label">Manage Live Classes</span>
          </button>
        </div>
      </div>

      {/* Statistics Info */}
      <div className="admin-info">
        <h3>Dashboard Information</h3>
        <p>
          This admin dashboard provides real-time statistics about platform activity:
        </p>
        <ul>
          <li><strong>Live Classes:</strong> Total number of ongoing or scheduled live classes</li>
          <li><strong>Kuppi Requests:</strong> Total study session requests from students</li>
          <li><strong>Flagged Content:</strong> Content reported or marked as inappropriate</li>
          <li><strong>Suspended Users:</strong> Students currently under suspension</li>
        </ul>
      </div>
    </div>
  );
};

export default AdminDashboard;
