import React, { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import { kuppiRequestsAPI } from '../api/kuppiRequests';
import '../styles/Attendance.css';

const Attendance = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';

  const [sessions, setSessions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Filters
  const [filterModule, setFilterModule] = useState('');
  const [filterHost, setFilterHost] = useState('');
  const [filterDateFrom, setFilterDateFrom] = useState('');
  const [filterDateTo, setFilterDateTo] = useState('');

  // Selected session for detail view
  const [selectedSession, setSelectedSession] = useState(null);
  const [showDetailModal, setShowDetailModal] = useState(false);

  // Stats
  const [stats, setStats] = useState({
    totalSessions: 0,
    averageAttendance: 0,
    totalStudents: 0,
  });

  useEffect(() => {
    if (isAdmin) {
      fetchAttendanceData();
    }
  }, [isAdmin]);

  const fetchAttendanceData = async () => {
    setLoading(true);
    setError('');
    try {
      // Fetch all Kuppi sessions with attendance data
      const data = await kuppiRequestsAPI.getAll();
      
      // Filter only approved sessions with session data
      const sessionsWithAttendance = data.filter(
        (req) => req.status === 'approved' && req.session
      );

      setSessions(sessionsWithAttendance);
      calculateStats(sessionsWithAttendance);
    } catch (err) {
      setError(err.message || 'Failed to load attendance data');
    } finally {
      setLoading(false);
    }
  };

  const calculateStats = (sessionsData) => {
    const totalSessions = sessionsData.length;
    
    // Calculate average attendance (mock data for now)
    const totalAttendance = sessionsData.reduce((sum, session) => {
      const attendanceCount = session.session?.attendance?.length || 0;
      return sum + attendanceCount;
    }, 0);

    const averageAttendance = totalSessions > 0 
      ? Math.round((totalAttendance / totalSessions) * 100) / 100 
      : 0;

    // Get unique students
    const uniqueStudents = new Set();
    sessionsData.forEach((session) => {
      session.session?.attendance?.forEach((att) => {
        if (att.student?._id) {
          uniqueStudents.add(att.student._id);
        }
      });
    });

    setStats({
      totalSessions,
      averageAttendance,
      totalStudents: uniqueStudents.size,
    });
  };

  const filteredSessions = sessions.filter((session) => {
    if (filterModule && session.moduleCode !== filterModule) return false;
    if (filterHost && session.student?.username !== filterHost) return false;
    
    if (filterDateFrom) {
      const sessionDate = new Date(session.session?.scheduledTime);
      const fromDate = new Date(filterDateFrom);
      if (sessionDate < fromDate) return false;
    }
    
    if (filterDateTo) {
      const sessionDate = new Date(session.session?.scheduledTime);
      const toDate = new Date(filterDateTo);
      if (sessionDate > toDate) return false;
    }
    
    return true;
  });

  const getAttendanceRate = (session) => {
    const attendanceCount = session.session?.attendance?.length || 0;
    // Assuming 20 as expected students (you can adjust this)
    const expectedStudents = 20;
    return Math.round((attendanceCount / expectedStudents) * 100);
  };

  const getStatusBadge = (session) => {
    const sessionDate = new Date(session.session?.scheduledTime);
    const now = new Date();
    
    if (sessionDate > now) {
      return <span className="status-badge upcoming">Upcoming</span>;
    } else if (sessionDate < now) {
      return <span className="status-badge completed">Completed</span>;
    }
    return <span className="status-badge ongoing">Ongoing</span>;
  };

  const formatDate = (dateString) => {
    if (!dateString) return '-';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const openDetailModal = (session) => {
    setSelectedSession(session);
    setShowDetailModal(true);
  };

  const closeDetailModal = () => {
    setSelectedSession(null);
    setShowDetailModal(false);
  };

  // Get unique modules and hosts for filters
  const uniqueModules = [...new Set(sessions.map((s) => s.moduleCode))];
  const uniqueHosts = [...new Set(sessions.map((s) => s.student?.username).filter(Boolean))];

  if (!isAdmin) {
    return (
      <div className="attendance-page">
        <div className="alert alert-error">
          You do not have permission to access this page.
        </div>
      </div>
    );
  }

  return (
    <div className="attendance-page">
      {/* Header */}
      <div className="attendance-header">
        <h1>Attendance Dashboard</h1>
        <p>Track and analyze attendance across all Kuppi sessions</p>
      </div>

      {/* Overview Cards */}
      <div className="attendance-stats">
        <div className="stat-card">
          <div className="stat-icon sessions">📚</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalSessions}</div>
            <div className="stat-label">Total Sessions</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon attendance">📊</div>
          <div className="stat-content">
            <div className="stat-value">{stats.averageAttendance}</div>
            <div className="stat-label">Avg Attendance</div>
          </div>
        </div>

        <div className="stat-card">
          <div className="stat-icon students">👥</div>
          <div className="stat-content">
            <div className="stat-value">{stats.totalStudents}</div>
            <div className="stat-label">Total Students</div>
          </div>
        </div>
      </div>

      {/* Filters */}
      <div className="attendance-filters">
        <div className="filter-group">
          <label>Module</label>
          <select
            value={filterModule}
            onChange={(e) => setFilterModule(e.target.value)}
            className="filter-select"
          >
            <option value="">All Modules</option>
            {uniqueModules.map((module) => (
              <option key={module} value={module}>
                {module}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>Host</label>
          <select
            value={filterHost}
            onChange={(e) => setFilterHost(e.target.value)}
            className="filter-select"
          >
            <option value="">All Hosts</option>
            {uniqueHosts.map((host) => (
              <option key={host} value={host}>
                {host}
              </option>
            ))}
          </select>
        </div>

        <div className="filter-group">
          <label>From Date</label>
          <input
            type="date"
            value={filterDateFrom}
            onChange={(e) => setFilterDateFrom(e.target.value)}
            className="filter-input"
          />
        </div>

        <div className="filter-group">
          <label>To Date</label>
          <input
            type="date"
            value={filterDateTo}
            onChange={(e) => setFilterDateTo(e.target.value)}
            className="filter-input"
          />
        </div>

        <button
          className="filter-reset-btn"
          onClick={() => {
            setFilterModule('');
            setFilterHost('');
            setFilterDateFrom('');
            setFilterDateTo('');
          }}
        >
          Reset Filters
        </button>
      </div>

      {/* Session List Table */}
      <div className="attendance-table-container">
        <h2>Session Attendance Records</h2>
        
        {loading && <div className="loading">Loading attendance data...</div>}
        {error && <div className="alert alert-error">{error}</div>}

        {!loading && !error && (
          <div className="table-wrapper">
            <table className="attendance-table">
              <thead>
                <tr>
                  <th>Session Topic</th>
                  <th>Date & Time</th>
                  <th>Module</th>
                  <th>Host</th>
                  <th>Total Attendees</th>
                  <th>Attendance Rate</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredSessions.map((session) => {
                  const attendanceCount = session.session?.attendance?.length || 0;
                  const attendanceRate = getAttendanceRate(session);

                  return (
                    <tr key={session._id} onClick={() => openDetailModal(session)}>
                      <td className="session-topic">{session.topic}</td>
                      <td>{formatDate(session.session?.scheduledTime)}</td>
                      <td>
                        <span className="module-badge">{session.moduleCode}</span>
                      </td>
                      <td>{session.student?.username || 'Unknown'}</td>
                      <td className="attendee-count">{attendanceCount}</td>
                      <td>
                        <div className="attendance-rate-cell">
                          <div className="progress-bar">
                            <div
                              className="progress-fill"
                              style={{ width: `${attendanceRate}%` }}
                            ></div>
                          </div>
                          <span className="rate-text">{attendanceRate}%</span>
                        </div>
                      </td>
                      <td>{getStatusBadge(session)}</td>
                      <td>
                        <button
                          className="view-details-btn"
                          onClick={(e) => {
                            e.stopPropagation();
                            openDetailModal(session);
                          }}
                        >
                          View Details
                        </button>
                      </td>
                    </tr>
                  );
                })}

                {filteredSessions.length === 0 && (
                  <tr>
                    <td colSpan={8} className="empty-state">
                      No attendance records found
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Detail Modal */}
      {showDetailModal && selectedSession && (
        <div className="modal-overlay" onClick={closeDetailModal}>
          <div className="attendance-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Attendance Details</h3>
              <button className="modal-close-btn" onClick={closeDetailModal}>
                ✕
              </button>
            </div>

            <div className="modal-content">
              <div className="session-info">
                <h4>{selectedSession.topic}</h4>
                <p>
                  <strong>Module:</strong> {selectedSession.moduleCode}
                </p>
                <p>
                  <strong>Host:</strong> {selectedSession.student?.username}
                </p>
                <p>
                  <strong>Date:</strong>{' '}
                  {formatDate(selectedSession.session?.scheduledTime)}
                </p>
              </div>

              <div className="attendance-list">
                <h4>Attendees ({selectedSession.session?.attendance?.length || 0})</h4>
                {selectedSession.session?.attendance?.length > 0 ? (
                  <table className="detail-table">
                    <thead>
                      <tr>
                        <th>Student Name</th>
                        <th>Joined At</th>
                        <th>Left At</th>
                        <th>Duration</th>
                        <th>Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {selectedSession.session.attendance.map((att, index) => (
                        <tr key={index}>
                          <td>{att.student?.username || 'Unknown'}</td>
                          <td>{formatDate(att.joinedAt)}</td>
                          <td>{att.leftAt ? formatDate(att.leftAt) : 'Still in session'}</td>
                          <td>{att.durationMinutes || 0} mins</td>
                          <td>
                            <span className={`status-badge ${att.status || 'present'}`}>
                              {(att.status || 'present').toUpperCase()}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="no-attendance">No attendance records yet</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Attendance;
