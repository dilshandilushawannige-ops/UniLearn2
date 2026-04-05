import React, { useCallback, useEffect, useMemo, useState } from 'react';
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

  const [createSessionModal, setCreateSessionModal] = useState({
    open: false,
    requestId: '',
    meetingLink: '',
    scheduledAt: '',
    error: '',
    submitting: false,
  });
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
    setCreateSessionModal({
      open: true,
      requestId,
      meetingLink: '',
      scheduledAt: '',
      error: '',
      submitting: false,
    });
  };

  const closeCreateSessionModal = () => {
    setCreateSessionModal({
      open: false,
      requestId: '',
      meetingLink: '',
      scheduledAt: '',
      error: '',
      submitting: false,
    });
  };

  const handleSubmitCreateSession = async (e) => {
    e.preventDefault();

    const meetingLink = String(createSessionModal.meetingLink || '').trim();
    const scheduledAt = createSessionModal.scheduledAt;

    if (!meetingLink) {
      setCreateSessionModal((prev) => ({ ...prev, error: 'Meeting link is required.' }));
      return;
    }

    if (!isValidHttpUrl(meetingLink)) {
      setCreateSessionModal((prev) => ({ ...prev, error: 'Meeting link must be a valid URL.' }));
      return;
    }

    if (!scheduledAt) {
      setCreateSessionModal((prev) => ({ ...prev, error: 'Scheduled date and time is required.' }));
      return;
    }

    const parsedScheduledAt = new Date(scheduledAt);
    if (Number.isNaN(parsedScheduledAt.getTime()) || parsedScheduledAt.getTime() <= Date.now()) {
      setCreateSessionModal((prev) => ({ ...prev, error: 'Scheduled date and time must be in the future.' }));
      return;
    }

    setCreateSessionModal((prev) => ({ ...prev, error: '', submitting: true }));
    try {
      await kuppiRequestsAPI.createSessionFromRequest({
        requestId: createSessionModal.requestId,
        meetingLink,
        scheduledAt: parsedScheduledAt.toISOString(),
      });
      await fetchRequests();
      closeCreateSessionModal();
    } catch (err) {
      setCreateSessionModal((prev) => ({ ...prev, error: err.message, submitting: false }));
    }
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
        <section className="kuppi-card">
          <h2>All Kuppi Requests</h2>
          <div className="kuppi-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Student Name</th>
                  <th>Topic</th>
                  <th>Module</th>
                  <th>Requested Time</th>
                  <th>Status</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {adminTableRows.map((item) => (
                  <tr key={item._id}>
                    <td>{item.student?.username || 'Unknown'}</td>
                    <td>{item.topic}</td>
                    <td>{item.moduleCode}</td>
                    <td>{formatDateTime(item.preferredDateTime)}</td>
                    <td>
                      <span className={`kuppi-badge ${item.status}`}>{item.status.toUpperCase()}</span>
                    </td>
                    <td>
                      {item.status === 'pending' && (
                        <div className="table-actions">
                          <button className="kuppi-btn ok" onClick={() => handleApproveReject(item._id, 'approved')}>Approve</button>
                          <button className="kuppi-btn danger" onClick={() => handleApproveReject(item._id, 'rejected')}>Reject</button>
                        </div>
                      )}
                      {item.status !== 'pending' && <span className="kuppi-muted">Completed</span>}
                    </td>
                  </tr>
                ))}
                {adminTableRows.length === 0 && (
                  <tr>
                    <td colSpan={6} className="kuppi-muted">No requests yet.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
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

      {createSessionModal.open && (
        <div className="kuppi-modal-overlay" role="dialog" aria-modal="true" aria-label="Create Session">
          <div className="kuppi-modal">
            <h3>Create Session</h3>
            <p className="kuppi-muted">Add meeting details for this approved request.</p>

            <form className="session-block" onSubmit={handleSubmitCreateSession}>
              <label>
                Meeting Link
                <input
                  type="url"
                  placeholder="https://"
                  value={createSessionModal.meetingLink}
                  onChange={(e) =>
                    setCreateSessionModal((prev) => ({
                      ...prev,
                      meetingLink: e.target.value,
                      error: '',
                    }))
                  }
                />
              </label>

              <label>
                Scheduled Date & Time
                <input
                  type="datetime-local"
                  value={createSessionModal.scheduledAt}
                  onChange={(e) =>
                    setCreateSessionModal((prev) => ({
                      ...prev,
                      scheduledAt: e.target.value,
                      error: '',
                    }))
                  }
                  min={toInputDateTime(new Date().toISOString())}
                />
              </label>

              {createSessionModal.error && <div className="kuppi-error">{createSessionModal.error}</div>}

              <div className="kuppi-modal-actions">
                <button type="button" className="kuppi-btn" onClick={closeCreateSessionModal}>
                  Cancel
                </button>
                <button type="submit" className="kuppi-btn primary" disabled={createSessionModal.submitting}>
                  {createSessionModal.submitting ? 'Creating...' : 'Create Session'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default KuppiRequest;
