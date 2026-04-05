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
      {!isAdmin && (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

          <div style={{ marginBottom: '2rem' }}>
            <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Request Kuppi Session</h1>
            <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Submit a request for a peer-to-peer learning session on a specific topic.</p>
          </div>

          {formError && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #f87171' }}>{formError}</div>}

          <form onSubmit={handleSubmitRequest} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

            {/* Left Column - Form */}
            <div style={{ flex: '1 1 500px', backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Session Topic</label>
                <input
                  type="text"
                  value={form.topic}
                  onChange={(e) => setForm((prev) => ({ ...prev, topic: e.target.value }))}
                  placeholder="e.g., Dynamic Programming Basics"
                  style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none' }}
                  required
                />
              </div>

              <div style={{ marginBottom: '1.5rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Module</label>
                <select
                  value={form.moduleCode}
                  onChange={(e) => setForm((prev) => ({ ...prev, moduleCode: e.target.value }))}
                  disabled={modules.length === 0}
                  style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'auto' }}
                  required
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
              </div>

              <div style={{ marginBottom: '2rem' }}>
                <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Preferred Date & Time</label>
                <input
                  type="datetime-local"
                  value={form.preferredDateTime}
                  onChange={(e) => setForm((prev) => ({ ...prev, preferredDateTime: e.target.value }))}
                  min={toInputDateTime(new Date().toISOString())}
                  style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none' }}
                  required
                />
              </div>

              <button
                type="submit"
                disabled={submitting}
                style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 600, cursor: submitting ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'background-color 0.2s', opacity: submitting ? 0.7 : 1 }}
              >
                {submitting ? 'Submitting...' : 'Submit Request'}
              </button>
            </div>

            {/* Right Column - Info */}
            <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>

              {/* Info Card */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', border: '2px dashed #cbd5e1' }}>
                <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '28px', marginBottom: '1rem' }}>
                  📚
                </div>
                <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>What is a Kuppi?</h4>
                <p style={{ margin: '0', fontSize: '13px', color: '#64748b', lineHeight: '1.6' }}>
                  A Kuppi is a peer-to-peer learning session where students collaborate to understand complex topics. Request a session and connect with fellow learners.
                </p>
              </div>

              {/* Guidelines Card */}
              <div style={{ backgroundColor: '#f3e8ff', borderRadius: '16px', padding: '1.5rem', border: 'none' }}>
                <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>
                  <span style={{ fontSize: '18px' }}>💡</span> Request Guidelines
                </h4>
                <ul style={{ margin: '0', paddingLeft: '1.25rem', fontSize: '13.5px', color: '#4c1d95', lineHeight: '1.8' }}>
                  <li>Choose a specific topic for focused learning</li>
                  <li>Select the relevant module from your curriculum</li>
                  <li>Pick a convenient date and time</li>
                  <li>Wait for admin approval before the session is scheduled</li>
                </ul>
              </div>

              {/* Stats Card */}
              <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05)' }}>
                <h4 style={{ margin: '0 0 1rem 0', fontSize: '14px', fontWeight: 600, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Your Requests</h4>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Pending</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#f59e0b' }}>{requests.filter(r => r.status === 'pending').length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.75rem' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Approved</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#10b981' }}>{requests.filter(r => r.status === 'approved').length}</span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                  <span style={{ fontSize: '13px', color: '#475569' }}>Total</span>
                  <span style={{ fontSize: '13px', fontWeight: 600, color: '#2563eb' }}>{requests.length}</span>
                </div>
              </div>

            </div>
          </form>
        </div>
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
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1200px', margin: '2rem auto 0', fontFamily: 'Inter, sans-serif' }}>

          <div style={{ marginBottom: '1.5rem' }}>
            <h2 style={{ fontSize: '24px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Approved Sessions</h2>
            <p style={{ color: '#64748b', margin: 0, fontSize: '14px' }}>Join your approved kuppi sessions and collaborate with peers.</p>
          </div>

          {loading && <p style={{ textAlign: 'center', color: '#94a3b8', padding: '2rem' }}>Loading...</p>}
          {error && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #f87171' }}>{error}</div>}

          {!loading && requests.length > 0 && (
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))', gap: '1.5rem' }}>
              {requests
                .filter((item) => item.status === 'approved')
                .map((item) => {
                  return (
                    <article key={item._id} style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '1.5rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)', border: '1px solid #f1f5f9', transition: 'all 0.2s' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                        <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#1e293b', margin: 0, flex: 1 }}>{item.topic}</h3>
                        <span style={{ display: 'inline-block', backgroundColor: '#dcfce7', color: '#166534', padding: '4px 10px', borderRadius: '12px', fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.3px', whiteSpace: 'nowrap', marginLeft: '8px' }}>Approved</span>
                      </div>

                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1rem', flexWrap: 'wrap' }}>
                        <span style={{ display: 'inline-block', backgroundColor: '#ede9fe', color: '#6d28d9', padding: '4px 10px', borderRadius: '6px', fontSize: '12px', fontWeight: 600 }}>{item.moduleCode}</span>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>•</span>
                        <span style={{ fontSize: '12px', color: '#64748b' }}>by {item.student?.username || 'Student'}</span>
                      </div>

                      <div style={{ fontSize: '13px', color: '#64748b', marginBottom: '1rem' }}>
                        <span style={{ fontWeight: 500 }}>Preferred:</span> {formatDateTime(item.preferredDateTime)}
                      </div>

                      {item.session ? (
                        <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1rem', marginTop: '1rem' }}>
                          <p style={{ fontSize: '13px', color: '#475569', margin: '0 0 12px 0' }}>
                            <span style={{ fontWeight: 600 }}>Scheduled:</span> {formatDateTime(item.session.scheduledTime)}
                          </p>
                          <div style={{ display: 'flex', gap: '8px' }}>
                            <a
                              href={item.session.meetingLink}
                              target="_blank"
                              rel="noreferrer"
                              style={{ flex: 1, textAlign: 'center', padding: '10px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', fontSize: '14px', fontWeight: 600, textDecoration: 'none', transition: 'background-color 0.2s' }}
                            >
                              Join Session
                            </a>
                            <button
                              onClick={() => setReportModal({ open: true, contentId: item._id, title: `${item.topic} Session` })}
                              style={{ padding: '10px 16px', backgroundColor: '#fee2e2', color: '#dc2626', borderRadius: '8px', border: 'none', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'background-color 0.2s' }}
                            >
                              Report
                            </button>
                          </div>
                          <p style={{ fontSize: '11px', color: '#94a3b8', margin: '8px 0 0 0', textAlign: 'center' }}>Reports: {item.session.reports?.length || 0}</p>
                        </div>
                      ) : (
                        <div style={{ backgroundColor: '#fef3c7', borderRadius: '12px', padding: '1rem', marginTop: '1rem', textAlign: 'center' }}>
                          <p style={{ fontSize: '13px', color: '#92400e', margin: 0, fontStyle: 'italic' }}>⏳ Session details pending admin setup</p>
                        </div>
                      )}
                    </article>
                  );
                })}
            </div>
          )}

          {!loading && requests.filter((item) => item.status === 'approved').length === 0 && requests.length > 0 && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📭</div>
              <p style={{ margin: 0 }}>No approved kuppi sessions yet. Submit a request above!</p>
            </div>
          )}

          {!loading && requests.length === 0 && !error && (
            <div style={{ textAlign: 'center', padding: '3rem 1rem', color: '#64748b', fontSize: '14px', backgroundColor: '#f8fafc', borderRadius: '12px', border: '1px dashed #cbd5e1' }}>
              <div style={{ fontSize: '48px', marginBottom: '1rem' }}>📚</div>
              <p style={{ margin: 0 }}>No requests available. Start by submitting your first kuppi request!</p>
            </div>
          )}
        </div>
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
