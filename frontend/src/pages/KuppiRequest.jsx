import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { modulesAPI } from '../api/modules';
import { kuppiRequestsAPI } from '../api/kuppiRequests';
import { moderationAPI } from '../api/moderation';
import { useAuth } from '../context/AuthContext';
import ModerationReportModal from '../components/ModerationReportModal';
import '../styles/KuppiRequest.css';

const toInputDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const formatDateTime = (isoString) => {
  if (!isoString) return '-';
  const date = new Date(isoString);
  return date.toLocaleString([], {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const KuppiRequest = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  const [modules, setModules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const studentYear = Number(user?.currentYear);
  const studentSemester = Number(user?.currentSemester);
  const resolvedYear = Number.isInteger(studentYear) && studentYear >= 1 && studentYear <= 4 ? studentYear : 1;
  const resolvedSemester = Number.isInteger(studentSemester) && studentSemester >= 1 && studentSemester <= 2 ? studentSemester : 1;

  const [form, setForm] = useState({
    topic: '',
    moduleCode: '',
    preferredDateTime: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [reportModal, setReportModal] = useState({ open: false, contentId: '', title: '' });

  // Fetch modules for the logged-in student's year and semester.
  useEffect(() => {
    if (isAdmin) return;

    modulesAPI
      .getModules({ year: resolvedYear, semester: resolvedSemester })
      .then(setModules)
      .catch(() => setModules([]));
  }, [isAdmin, resolvedYear, resolvedSemester]);

  const fetchRequests = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await kuppiRequestsAPI.getAll();
      setRequests(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchRequests();
  }, [fetchRequests]);

  const adminTableRows = useMemo(() => requests, [requests]);

  const handleSubmitRequest = async (e) => {
    e.preventDefault();
    setFormError('');
    const preferred = new Date(form.preferredDateTime);

    if (!form.topic || !form.moduleCode || !form.preferredDateTime) {
      setFormError('Topic, module and preferred date/time are required.');
      return;
    }

    if (Number.isNaN(preferred.getTime()) || preferred.getTime() <= Date.now()) {
      setFormError('Preferred time must be a future date and time.');
      return;
    }

    setSubmitting(true);
    try {
      await kuppiRequestsAPI.create({
        topic: form.topic,
        moduleCode: form.moduleCode,
        preferredDateTime: preferred.toISOString(),
      });
      setForm({ topic: '', moduleCode: '', preferredDateTime: '' });
      await fetchRequests();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  const handleApproveReject = async (requestId, status) => {
    try {
      let rejectionReason = '';
      if (status === 'rejected') {
        rejectionReason = window.prompt('Reason for rejection (optional):', '') || '';
      }
      await kuppiRequestsAPI.updateStatus(requestId, { status, rejectionReason });
      await fetchRequests();
    } catch (err) {
      alert(err.message);
    }
  };

  const openCreateSessionModal = (requestId) => {
    // Navigate to live classes page with the request ID
    navigate('/user-dashboard/live-class', { 
      state: { 
        fromKuppiRequest: true, 
        requestId: requestId,
        requestData: requests.find(r => r._id === requestId)
      } 
    });
  };

  const handleReportSession = async ({ reason, otherText }) => {
    try {
      await moderationAPI.report({
        contentType: 'kuppi_session',
        contentId: reportModal.contentId,
        reason,
        otherText,
      });
      setReportModal({ open: false, contentId: '', title: '' });
      await fetchRequests();
      alert('Session reported successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="kuppi-page">
      <header className="kuppi-header">
        <h1>Kuppi Request</h1>
        <p>Submit requests, track approvals, host sessions, and report issues.</p>
      </header>

      {!isAdmin && (
        <section className="kuppi-card">
          <h2>Request a Kuppi Session</h2>
          {formError && <div className="kuppi-error">{formError}</div>}
          <form className="kuppi-form" onSubmit={handleSubmitRequest}>
            <div className="kuppi-grid-2">
              <label>
                Topic
                <input
                  value={form.topic}
                  onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g. Dynamic Programming Basics"
                />
              </label>

              <label>
                Module
                <select 
                  value={form.moduleCode} 
                  onChange={(e) => setForm((prev) => ({ ...prev, moduleCode: e.target.value }))}
                  disabled={modules.length === 0}
                >
                  <option value="">
                    {modules.length === 0 
                      ? 'No modules available' 
                      : 'Select module'}
                  </option>
                  {modules.map((module) => (
                    <option key={module._id} value={module.moduleCode}>
                      {module.moduleCode} - {module.moduleName}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <label>
              Preferred Date & Time
              <input
                type="datetime-local"
                value={form.preferredDateTime}
                onChange={(e) => setForm((prev) => ({ ...prev, preferredDateTime: e.target.value }))}
                min={toInputDateTime(new Date().toISOString())}
              />
            </label>

            <button type="submit" className="kuppi-btn primary" disabled={submitting}>
              {submitting ? 'Submitting...' : 'Submit Request'}
            </button>
          </form>
        </section>
      )}

      {isAdmin && (
        <div className="admin-kuppi-container">
          {/* Header Section */}
          <div className="admin-kuppi-header">
            <div className="admin-kuppi-tabs">
              <button className="admin-tab active">ACADEMIC</button>
              <button className="admin-tab">STUDENT SUPPORT</button>
            </div>
            <div className="admin-kuppi-title-section">
              <h1 className="admin-kuppi-title">
                Kuppi <span className="admin-kuppi-highlight">Requests</span>
              </h1>
              <p className="admin-kuppi-subtitle">
                Manage peer-to-peer learning sessions. Review, approve, and facilitate academic knowledge sharing between students.
              </p>
            </div>
            <div className="admin-kuppi-stats">
              <div className="admin-stat-card">
                <div className="admin-stat-number">{requests.filter(r => r.status === 'pending').length}</div>
                <div className="admin-stat-label">PENDING REVIEWS</div>
              </div>
              <div className="admin-stat-card">
                <div className="admin-stat-number">{requests.filter(r => r.status === 'approved').length}</div>
                <div className="admin-stat-label">SESSIONS APPROVED</div>
              </div>
            </div>
          </div>

          {/* Table Section */}
          <div className="admin-kuppi-table-container">
            <table className="admin-kuppi-table">
              <thead>
                <tr>
                  <th>STUDENT</th>
                  <th>SESSION DETAILS</th>
                  <th>SCHEDULE</th>
                  <th>STATUS</th>
                  <th>ACTIONS</th>
                </tr>
              </thead>
              <tbody>
                {adminTableRows.map((item) => {
                  const studentName = item.student?.username || 'Unknown';
                  const studentId = item.student?.studentId || 'N/A';
                  const initials = studentName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2);
                  
                  return (
                    <tr key={item._id}>
                      <td>
                        <div className="student-cell">
                          <div className="student-avatar">{initials}</div>
                          <div className="student-info">
                            <div className="student-name">{studentName}</div>
                            <div className="student-id">{studentId}</div>
                          </div>
                        </div>
                      </td>
                      <td>
                        <div className="session-details-cell">
                          <div className="session-topic">{item.topic}</div>
                          <div className="session-module-tag">{item.moduleCode}</div>
                        </div>
                      </td>
                      <td>
                        <div className="schedule-cell">
                          <div className="schedule-date">{formatDateTime(item.preferredDateTime)}</div>
                          <div className="schedule-duration">Duration: 2 Hours</div>
                        </div>
                      </td>
                      <td>
                        <span className={`admin-status-badge ${item.status}`}>
                          {item.status.toUpperCase()}
                        </span>
                      </td>
                      <td>
                        <div className="admin-actions-cell">
                          {item.status === 'pending' && (
                            <>
                              <button 
                                className="admin-action-icon reject-icon"
                                onClick={() => handleApproveReject(item._id, 'rejected')}
                                title="Reject"
                              >
                                ✕
                              </button>
                              <button 
                                className="admin-action-icon approve-icon"
                                onClick={() => handleApproveReject(item._id, 'approved')}
                                title="Approve"
                              >
                                ✓
                              </button>
                            </>
                          )}
                          {item.status === 'approved' && (
                            <button 
                              className="admin-create-session-btn"
                              onClick={() => openCreateSessionModal(item._id)}
                            >
                              <span className="session-icon">▶</span> Create Session
                            </button>
                          )}
                          {item.status === 'rejected' && (
                            <>
                              <button 
                                className="admin-action-icon reject-icon"
                                title="Rejected"
                              >
                                ✕
                              </button>
                              <button 
                                className="admin-action-icon approve-icon disabled"
                                title="Approve"
                              >
                                ✓
                              </button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {adminTableRows.length === 0 && (
                  <tr>
                    <td colSpan={5} className="admin-empty-state">
                      No requests yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          <div className="admin-kuppi-pagination">
            <div className="pagination-info">
              Showing 1 to {Math.min(4, adminTableRows.length)} of {adminTableRows.length} requests
            </div>
            <div className="pagination-controls">
              <button className="pagination-btn">‹</button>
              <button className="pagination-btn active">1</button>
              <button className="pagination-btn">2</button>
              <button className="pagination-btn">3</button>
              <button className="pagination-btn">›</button>
            </div>
          </div>

          {/* Floating Add Button */}
          <button className="admin-floating-add-btn" title="Add New Request">
            +
          </button>
        </div>
      )}

      {!isAdmin && (
        <section className="kuppi-card">
          <h2>Approved Sessions</h2>
          {loading && <p className="kuppi-muted">Loading...</p>}
          {error && <div className="kuppi-error">{error}</div>}

          {!loading && requests.length > 0 && (
            <div className="approved-list">
              {requests
                .filter((item) => item.status === 'approved')
                .map((item) => {
                  return (
                    <article key={item._id} className="approved-card">
                      <div className="approved-header">
                        <h3>{item.topic}</h3>
                        <span className="kuppi-badge hosted">Student Hosted Session</span>
                      </div>
                      <p className="kuppi-meta">
                        {item.moduleCode} • Requested by {item.student?.username || 'Student'} • Preferred {formatDateTime(item.preferredDateTime)}
                      </p>

                      {item.session ? (
                        <div className="session-block">
                          <p>Scheduled: {formatDateTime(item.session.scheduledTime)}</p>
                          <a href={item.session.meetingLink} target="_blank" rel="noreferrer" className="kuppi-btn link">Join Session</a>
                          <button className="kuppi-btn warn" onClick={() => setReportModal({ open: true, contentId: item._id, title: `${item.topic} Session` })}>Report Session</button>
                          <p className="kuppi-muted">Reports: {item.session.reports?.length || 0}</p>
                        </div>
                      ) : (
                        <div className="session-block">
                          <p className="kuppi-muted">Session details not yet created by admin.</p>
                        </div>
                      )}
                    </article>
                  );
                })}
              {requests.filter((item) => item.status === 'approved').length === 0 && (
                <p className="kuppi-muted">No approved kuppi sessions yet.</p>
              )}
            </div>
          )}

          {!loading && requests.length === 0 && !error && <p className="kuppi-muted">No requests available.</p>}
        </section>
      )}

      <ModerationReportModal
        open={reportModal.open}
        title={reportModal.title}
        onClose={() => setReportModal({ open: false, contentId: '', title: '' })}
        onSubmit={handleReportSession}
      />
    </div>
  );
};

export default KuppiRequest;
