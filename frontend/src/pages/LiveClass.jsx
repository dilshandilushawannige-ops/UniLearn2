import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { liveClassesAPI } from '../api/liveClasses';
import { moderationAPI } from '../api/moderation';
import ModerationReportModal from '../components/ModerationReportModal';
import toast from 'react-hot-toast';
import '../styles/LiveClass.css';

const PLATFORM_OPTIONS = [
  { value: 'zoom', label: 'Zoom' },
  { value: 'google_meet', label: 'Google Meet' },
  { value: 'microsoft_teams', label: 'Microsoft Teams' },
];

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

const toInputDateTime = (isoString) => {
  if (!isoString) return '';
  const date = new Date(isoString);
  const tzOffset = date.getTimezoneOffset() * 60000;
  return new Date(date.getTime() - tzOffset).toISOString().slice(0, 16);
};

const getTomorrowInputMin = () => {
  const now = new Date();
  const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);
  return toInputDateTime(tomorrowStart.toISOString());
};

const platformLabel = (platform) => {
  const found = PLATFORM_OPTIONS.find((option) => option.value === platform);
  return found ? found.label : platform;
};

const isValidHttpUrl = (value) => {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'http:' || parsed.protocol === 'https:';
  } catch {
    return false;
  }
};

const emptyForm = {
  title: '',
  description: '',
  moduleCode: '',
  year: 1,
  semester: 1,
  classDateTime: '',
  platform: 'zoom',
  meetingLink: '',
};

const LiveClass = () => {
  const { user } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = user?.role === 'admin';

  // Check if coming from Kuppi Request
  const fromKuppiRequest = location.state?.fromKuppiRequest;
  const kuppiRequestData = location.state?.requestData;

  const [year, setYear] = useState(user?.currentYear || 1);
  const [semester, setSemester] = useState(user?.currentSemester || 1);

  const [classes, setClasses] = useState([]);
  const [attendanceByClass, setAttendanceByClass] = useState({});

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [formError, setFormError] = useState('');
  const [saving, setSaving] = useState(false);

  const [form, setForm] = useState({ ...emptyForm, year: user?.currentYear || 1, semester: user?.currentSemester || 1 });
  const [editModal, setEditModal] = useState({
    open: false,
    classId: '',
    title: '',
    moduleCode: '',
    classDateTime: '',
    platform: 'zoom',
    meetingLink: '',
    error: '',
    saving: false,
  });
  const [reportModal, setReportModal] = useState({ open: false, contentId: '', title: '' });

  const fetchClasses = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const data = await liveClassesAPI.getAll({ year, semester });
      setClasses(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [year, semester]);

  useEffect(() => {
    fetchClasses();
  }, [fetchClasses]);

  // Pre-fill form when coming from Kuppi Request
  useEffect(() => {
    if (fromKuppiRequest && kuppiRequestData && isAdmin) {
      const preferredDateTime = kuppiRequestData.preferredDateTime 
        ? toInputDateTime(kuppiRequestData.preferredDateTime)
        : '';
      
      setForm({
        title: kuppiRequestData.topic || '',
        description: `Kuppi session for ${kuppiRequestData.topic}`,
        moduleCode: kuppiRequestData.moduleCode || '',
        year: user?.currentYear || 1,
        semester: user?.currentSemester || 1,
        classDateTime: preferredDateTime,
        platform: 'zoom',
        meetingLink: '',
      });

      // Show a toast notification
      toast.success('Pre-filled form with Kuppi request details');
      
      // Clear the navigation state to prevent re-filling on refresh
      navigate(location.pathname, { replace: true, state: {} });
    }
  }, [fromKuppiRequest, kuppiRequestData, isAdmin, user, navigate, location.pathname]);

  const upcomingClasses = useMemo(() => {
    const now = Date.now();
    return classes.filter((item) => new Date(item.classDateTime).getTime() >= now - 5 * 60 * 1000);
  }, [classes]);

  const resetForm = () => {
    setForm({ ...emptyForm, year, semester });
    setFormError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.title || !form.moduleCode || !form.classDateTime || !form.meetingLink) {
      setFormError('Please fill in title, module code, date & time and meeting link.');
      return;
    }

    const selectedDateTime = new Date(form.classDateTime);
    const now = new Date();
    const tomorrowStart = new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1, 0, 0, 0, 0);

    if (Number.isNaN(selectedDateTime.getTime()) || selectedDateTime < tomorrowStart) {
      setFormError('Live class date must be from tomorrow onward.');
      return;
    }

    setSaving(true);
    try {
      const payload = {
        ...form,
        moduleCode: form.moduleCode.toUpperCase(),
        year: Number(form.year),
        semester: Number(form.semester),
        classDateTime: new Date(form.classDateTime).toISOString(),
      };

      const created = await liveClassesAPI.create(payload);
      setClasses((prev) => [...prev, created]);
      toast.success('Live class scheduled successfully');

      resetForm();
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSaving(false);
    }
  };

  const openEditModal = (item) => {
    setEditModal({
      open: true,
      classId: item._id,
      title: item.title || '',
      moduleCode: item.moduleCode || '',
      classDateTime: toInputDateTime(item.classDateTime),
      platform: item.platform || 'zoom',
      meetingLink: item.meetingLink || '',
      error: '',
      saving: false,
    });
  };

  const closeEditModal = () => {
    setEditModal({
      open: false,
      classId: '',
      title: '',
      moduleCode: '',
      classDateTime: '',
      platform: 'zoom',
      meetingLink: '',
      error: '',
      saving: false,
    });
  };

  const handleEditModalSubmit = async (e) => {
    e.preventDefault();

    const title = String(editModal.title || '').trim();
    const moduleCode = String(editModal.moduleCode || '').trim().toUpperCase();
    const classDateTime = editModal.classDateTime;
    const platform = String(editModal.platform || '').trim();
    const meetingLink = String(editModal.meetingLink || '').trim();

    if (!title || !moduleCode || !classDateTime || !platform || !meetingLink) {
      setEditModal((prev) => ({ ...prev, error: 'All fields are required.' }));
      return;
    }

    if (!isValidHttpUrl(meetingLink)) {
      setEditModal((prev) => ({ ...prev, error: 'Meeting link must be a valid URL.' }));
      return;
    }

    const targetClass = classes.find((item) => item._id === editModal.classId);
    if (!targetClass) {
      setEditModal((prev) => ({ ...prev, error: 'Selected class no longer exists.' }));
      return;
    }

    setEditModal((prev) => ({ ...prev, saving: true, error: '' }));
    try {
      const payload = {
        title,
        moduleCode,
        year: targetClass.year,
        semester: targetClass.semester,
        classDateTime: new Date(classDateTime).toISOString(),
        platform,
        meetingLink,
      };

      const updated = await liveClassesAPI.update(editModal.classId, payload);

      setClasses((prev) =>
        prev.map((item) => {
          if (item._id !== editModal.classId) return item;
          return {
            ...item,
            ...updated,
          };
        })
      );

      toast.success('Live class updated successfully');
      closeEditModal();
    } catch (err) {
      setEditModal((prev) => ({ ...prev, saving: false, error: err.message }));
    }
  };

  const handleCancelClass = async (id) => {
    const reason = window.prompt('Cancellation reason (optional):', '') || '';
    try {
      await liveClassesAPI.cancel(id, reason);
      await fetchClasses();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Delete this class permanently?')) return;

    const previousClasses = classes;
    setClasses((prev) => prev.filter((item) => item._id !== id));
    try {
      await liveClassesAPI.remove(id);
      toast.success('Live class deleted successfully');
    } catch (err) {
      setClasses(previousClasses);
      toast.error(err.message);
    }
  };

  const handleJoin = async (item) => {
    try {
      const data = await liveClassesAPI.join(item._id);
      await fetchClasses();
      if (data.meetingLink) {
        window.open(data.meetingLink, '_blank', 'noopener,noreferrer');
      }
    } catch (err) {
      alert(err.message);
    }
  };

  const handleLeave = async (item) => {
    try {
      const data = await liveClassesAPI.leave(item._id);
      await fetchClasses();
      alert(`Duration: ${data.durationMinutes} minutes. Attendance: ${data.attendanceStatus.toUpperCase()}`);
    } catch (err) {
      alert(err.message);
    }
  };

  const handleViewAttendance = async (item) => {
    try {
      const data = await liveClassesAPI.attendance(item._id);
      setAttendanceByClass((prev) => ({ ...prev, [item._id]: data.attendance || [] }));
    } catch (err) {
      alert(err.message);
    }
  };

  const handleReportSubmit = async ({ reason, otherText }) => {
    try {
      await moderationAPI.report({
        contentType: 'live_class',
        contentId: reportModal.contentId,
        reason,
        otherText,
      });
      setReportModal({ open: false, contentId: '', title: '' });
      await fetchClasses();
      alert('Report submitted successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  return (
    <div className="live-class-page">
      <div className="live-class-header">
        <div>
          <h1>Live Class Management</h1>
          <p>Schedule, join, and track attendance for live lectures.</p>
        </div>
      </div>

      {isAdmin && (
        <div className="live-form-modal-wrapper">
          <form className="live-form-modern" onSubmit={handleSubmit}>
            <div className="live-form-sidebar">
              <div className="sidebar-icon">
                <span>📚</span>
              </div>
              <h2 className="sidebar-title">Create New Live Class</h2>
              <p className="sidebar-description">
                Fill in the details to schedule an interactive learning experience for your academic cohorts.
              </p>
              
              {fromKuppiRequest && kuppiRequestData && (
                <div className="sidebar-kuppi-info">
                  <div className="kuppi-info-badge">From Kuppi Request</div>
                  <p className="kuppi-info-text">
                    <strong>{kuppiRequestData.student?.username || 'Unknown'}</strong>
                    <br />
                    {kuppiRequestData.topic}
                  </p>
                </div>
              )}

              <div className="sidebar-features">
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Instant Notifications</span>
                </div>
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Automated Attendance</span>
                </div>
                <div className="feature-item">
                  <span className="feature-dot"></span>
                  <span>Cloud Recording</span>
                </div>
              </div>
            </div>

            <div className="live-form-content">
              <button type="button" className="form-close-btn" onClick={resetForm}>✕</button>
              
              {formError && <div className="live-error">{formError}</div>}

              <div className="form-section">
                <h3 className="section-title">CLASS INFORMATION</h3>
                
                <div className="form-field">
                  <label>Class Title</label>
                  <input 
                    value={form.title} 
                    onChange={(e) => setForm((prev) => ({ ...prev, title: e.target.value }))}
                    placeholder="e.g. Advanced Calculus: Integration Techniques"
                    className="modern-input"
                  />
                </div>

                <div className="form-row-3">
                  <div className="form-field">
                    <label>Module Code</label>
                    <select 
                      value={form.moduleCode} 
                      onChange={(e) => setForm((prev) => ({ ...prev, moduleCode: e.target.value.toUpperCase() }))}
                      className="modern-select"
                    >
                      <option value="">Select Code</option>
                      <option value="CS101">CS101</option>
                      <option value="CS102">CS102</option>
                      <option value="MATH201">MATH201</option>
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Year</label>
                    <select 
                      value={form.year} 
                      onChange={(e) => setForm((prev) => ({ ...prev, year: Number(e.target.value) }))}
                      className="modern-select"
                    >
                      <option value="">Select Year</option>
                      {[1, 2, 3, 4].map((value) => (
                        <option key={value} value={value}>Year {value}</option>
                      ))}
                    </select>
                  </div>

                  <div className="form-field">
                    <label>Semester</label>
                    <select 
                      value={form.semester} 
                      onChange={(e) => setForm((prev) => ({ ...prev, semester: Number(e.target.value) }))}
                      className="modern-select"
                    >
                      <option value="">Select Sem</option>
                      <option value={1}>Semester 1</option>
                      <option value={2}>Semester 2</option>
                    </select>
                  </div>
                </div>
              </div>

              <div className="form-section">
                <h3 className="section-title">LOGISTICS & PLATFORM</h3>
                
                <div className="form-row-2">
                  <div className="form-field">
                    <label>Date & Time</label>
                    <input
                      type="datetime-local"
                      value={form.classDateTime}
                      onChange={(e) => setForm((prev) => ({ ...prev, classDateTime: e.target.value }))}
                      min={getTomorrowInputMin()}
                      className="modern-input"
                      placeholder="mm/dd/yyyy, --:-- --"
                    />
                  </div>

                  <div className="form-field">
                    <label>Platform</label>
                    <select 
                      value={form.platform} 
                      onChange={(e) => setForm((prev) => ({ ...prev, platform: e.target.value }))}
                      className="modern-select"
                    >
                      <option value="">Select Platform</option>
                      {PLATFORM_OPTIONS.map((option) => (
                        <option key={option.value} value={option.value}>{option.label}</option>
                      ))}
                    </select>
                  </div>
                </div>

                <div className="form-field">
                  <label>Meeting Link</label>
                  <div className="input-with-icon">
                    <span className="input-icon">🔗</span>
                    <input
                      type="url"
                      value={form.meetingLink}
                      onChange={(e) => setForm((prev) => ({ ...prev, meetingLink: e.target.value }))}
                      placeholder="https://zoom.us/j/..."
                      className="modern-input with-icon"
                    />
                  </div>
                </div>

                <div className="form-field">
                  <label>Description</label>
                  <textarea 
                    rows={4} 
                    value={form.description} 
                    onChange={(e) => setForm((prev) => ({ ...prev, description: e.target.value }))}
                    placeholder="Outline the learning objectives and prerequisites for this session..."
                    className="modern-textarea"
                  />
                </div>
              </div>

              <div className="form-actions">
                <button type="button" className="btn-cancel" onClick={resetForm}>
                  Cancel
                </button>
                <button type="submit" className="btn-submit" disabled={saving}>
                  {saving ? 'Scheduling...' : 'Schedule Class'}
                </button>
              </div>
            </div>
          </form>
        </div>
      )}

      {error && <div className="live-error">{error}</div>}
      {loading && <div className="live-loading">Loading classes...</div>}

      {!loading && (
        <div className="live-list">
          {upcomingClasses.length === 0 && <p className="live-empty">No upcoming live classes for this filter.</p>}

          {upcomingClasses.map((item) => {
            const canJoin = !item.isCancelled;
            const activeSession = Boolean(item.hasActiveSession);
            const attendance = item.attendanceStatus || 'absent';
            const attendanceRows = attendanceByClass[item._id] || [];

            return (
              <article key={item._id} className="live-card">
                <div className="live-card-top">
                  <div>
                    <h3>{item.title}</h3>
                    <p className="live-meta">
                      {item.moduleCode} • Year {item.year} Sem {item.semester} • {platformLabel(item.platform)}
                    </p>
                    <p className="live-time">{formatDateTime(item.classDateTime)}</p>
                    {isAdmin && item.meetingLink && (
                      <a
                        href={item.meetingLink}
                        target="_blank"
                        rel="noreferrer"
                        className="live-meeting-link"
                      >
                        {item.meetingLink}
                      </a>
                    )}
                    {item.description && <p className="live-description">{item.description}</p>}
                  </div>

                  <div className="live-badges">
                    {item.isCancelled && <span className="badge cancelled">Cancelled</span>}
                    {!item.isCancelled && <span className="badge active">Scheduled</span>}
                    {!isAdmin && <span className={`badge ${attendance === 'present' ? 'present' : 'absent'}`}>{attendance.toUpperCase()}</span>}
                  </div>
                </div>

                <div className="live-card-actions">
                  {!isAdmin && canJoin && !activeSession && (
                    <button className="live-btn primary" onClick={() => handleJoin(item)}>Join Class</button>
                  )}
                  {!isAdmin && activeSession && (
                    <button className="live-btn warn" onClick={() => handleLeave(item)}>Leave Class</button>
                  )}
                  {!isAdmin && !canJoin && <button className="live-btn disabled" disabled>Join Unavailable</button>}

                  {isAdmin && (
                    <>
                      <button className="live-btn ghost" onClick={() => openEditModal(item)}>Edit</button>
                      {!item.isCancelled && (
                        <button className="live-btn warn" onClick={() => handleCancelClass(item._id)}>Cancel</button>
                      )}
                      <button className="live-btn danger" onClick={() => handleDeleteClass(item._id)}>Delete</button>
                      <button className="live-btn secondary" onClick={() => handleViewAttendance(item)}>View Attendance</button>
                    </>
                  )}
                  {isAdmin && (
                    <button className="live-btn danger" onClick={() => setReportModal({ open: true, contentId: item._id, title: item.title })}>Report</button>
                  )}
                </div>

                {isAdmin && attendanceRows.length > 0 && (
                  <div className="attendance-wrap">
                    <h4>Attendance Records</h4>
                    <table>
                      <thead>
                        <tr>
                          <th>Student</th>
                          <th>Email</th>
                          <th>Join Time</th>
                          <th>Leave Time</th>
                          <th>Duration (min)</th>
                          <th>Status</th>
                        </tr>
                      </thead>
                      <tbody>
                        {attendanceRows.map((row) => (
                          <tr key={row.student?._id || `${row.student}-${row.joinedAt || ''}`}>
                            <td>{row.student?.username || 'Unknown'}</td>
                            <td>{row.student?.email || '-'}</td>
                            <td>{formatDateTime(row.joinedAt)}</td>
                            <td>{formatDateTime(row.leftAt)}</td>
                            <td>{row.durationMinutes ?? 0}</td>
                            <td>
                              <span className={`badge ${row.status === 'present' ? 'present' : 'absent'}`}>
                                {(row.status || 'absent').toUpperCase()}
                              </span>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </article>
            );
          })}
        </div>
      )}

      <ModerationReportModal
        open={reportModal.open}
        title={reportModal.title}
        onClose={() => setReportModal({ open: false, contentId: '', title: '' })}
        onSubmit={handleReportSubmit}
      />

      {editModal.open && (
        <div className="live-modal-overlay" role="dialog" aria-modal="true" aria-label="Edit Live Class">
          <div className="live-modal">
            <h3>Edit Live Class</h3>
            <form onSubmit={handleEditModalSubmit} className="live-form">
              <div className="live-grid-2">
                <label>
                  Title
                  <input
                    value={editModal.title}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, title: e.target.value, error: '' }))}
                  />
                </label>

                <label>
                  Module Code
                  <input
                    value={editModal.moduleCode}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, moduleCode: e.target.value.toUpperCase(), error: '' }))}
                  />
                </label>
              </div>

              <div className="live-grid-2">
                <label>
                  Scheduled Date & Time
                  <input
                    type="datetime-local"
                    value={editModal.classDateTime}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, classDateTime: e.target.value, error: '' }))}
                    min={toInputDateTime(new Date().toISOString())}
                  />
                </label>

                <label>
                  Platform
                  <select
                    value={editModal.platform}
                    onChange={(e) => setEditModal((prev) => ({ ...prev, platform: e.target.value, error: '' }))}
                  >
                    {PLATFORM_OPTIONS.map((option) => (
                      <option key={option.value} value={option.value}>{option.label}</option>
                    ))}
                  </select>
                </label>
              </div>

              <label>
                Meeting Link
                <input
                  type="url"
                  value={editModal.meetingLink}
                  onChange={(e) => setEditModal((prev) => ({ ...prev, meetingLink: e.target.value, error: '' }))}
                  placeholder="https://"
                />
              </label>

              {editModal.error && <div className="live-error">{editModal.error}</div>}

              <div className="live-modal-actions">
                <button type="button" className="live-btn ghost" onClick={closeEditModal}>Cancel</button>
                <button type="submit" className="live-btn primary" disabled={editModal.saving}>
                  {editModal.saving ? 'Saving...' : 'Save'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveClass;
