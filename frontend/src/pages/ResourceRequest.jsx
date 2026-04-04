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

const ResourceRequest = () => {
  const { user } = useAuth();
  const isAdmin = Boolean(user?.isAdmin || user?.role === 'admin');

  const [modules, setModules] = useState([]);
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const [year, setYear] = useState(user?.currentYear || 1);
  const [semester, setSemester] = useState(user?.currentSemester || 1);

  const [form, setForm] = useState({
    topic: '',
    moduleCode: '',
    preferredDateTime: '',
  });
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const [sessionForm, setSessionForm] = useState({});
  const [reportModal, setReportModal] = useState({ open: false, contentId: '', title: '' });

  useEffect(() => {
    modulesAPI
      .getModules({ year, semester })
      .then(setModules)
      .catch(() => setModules([]));
  }, [year, semester]);

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

  const handleCreateSession = async (requestId) => {
    const values = sessionForm[requestId] || { meetingLink: '', scheduledTime: '' };
    if (!values.meetingLink || !values.scheduledTime) {
      alert('Meeting link and scheduled time are required.');
      return;
    }

    try {
      await kuppiRequestsAPI.createSession(requestId, {
        meetingLink: values.meetingLink,
        scheduledTime: new Date(values.scheduledTime).toISOString(),
      });
      await fetchRequests();
    } catch (err) {
      alert(err.message);
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
        <h1>Kuppi Request Dashboard</h1>
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
                <select value={form.moduleCode} onChange={(e) => setForm((prev) => ({ ...prev, moduleCode: e.target.value }))}>
                  <option value="">Select module</option>
                  {modules.map((module) => (
                    <option key={module._id} value={module.moduleCode}>{module.moduleCode}</option>
                  ))}
                </select>
              </label>
            </div>

            <div className="kuppi-grid-2">
              <label>
                Year
                <select value={year} onChange={(e) => setYear(Number(e.target.value))}>
                  {[1, 2, 3, 4].map((value) => (
                    <option key={value} value={value}>Year {value}</option>
                  ))}
                </select>
              </label>

              <label>
                Semester
                <select value={semester} onChange={(e) => setSemester(Number(e.target.value))}>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
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

      <section className="kuppi-card">
        <h2>Approved Sessions</h2>
        {loading && <p className="kuppi-muted">Loading...</p>}
        {error && <div className="kuppi-error">{error}</div>}

        {!loading && requests.length > 0 && (
          <div className="approved-list">
            {requests
              .filter((item) => item.status === 'approved')
              .map((item) => {
                const isOwner = item.student?._id === user?._id;
                const sessionValues = sessionForm[item._id] || { meetingLink: '', scheduledTime: '' };

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
                        {isOwner ? (
                          <>
                            <p className="kuppi-muted">Your request was approved. Create your session now.</p>
                            <div className="kuppi-grid-2">
                              <input
                                type="url"
                                placeholder="Meeting link"
                                value={sessionValues.meetingLink}
                                onChange={(e) =>
                                  setSessionForm((prev) => ({
                                    ...prev,
                                    [item._id]: { ...sessionValues, meetingLink: e.target.value },
                                  }))
                                }
                              />
                              <input
                                type="datetime-local"
                                value={sessionValues.scheduledTime}
                                onChange={(e) =>
                                  setSessionForm((prev) => ({
                                    ...prev,
                                    [item._id]: { ...sessionValues, scheduledTime: e.target.value },
                                  }))
                                }
                                min={toInputDateTime(new Date().toISOString())}
                              />
                            </div>
                            <button className="kuppi-btn primary" onClick={() => handleCreateSession(item._id)}>
                              Create Session
                            </button>
                          </>
                        ) : (
                          <p className="kuppi-muted">Session details not yet created by the approved student.</p>
                        )}
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

      <ModerationReportModal
        open={reportModal.open}
        title={reportModal.title}
        onClose={() => setReportModal({ open: false, contentId: '', title: '' })}
        onSubmit={handleReportSession}
      />
    </div>
  );
};

export default ResourceRequest;
