import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { useAuth } from '../context/AuthContext';

const RESOURCE_TYPES = ['lecture_pdf', 'short_note', 'past_paper', 'yt_link', 'other'];

const DashboardUpload = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [modules, setModules] = useState([]);
  const [form, setForm] = useState({
    title: '',
    year: user?.currentYear || 1,
    semester: user?.currentSemester || 1,
    moduleCode: '',
    resourceType: 'lecture_pdf',
    lectureNo: '',
    lectureTitle: '',
    ytLink: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // Fetch modules when year/semester changes
  useEffect(() => {
    modulesAPI
      .getModules({ year: form.year, semester: form.semester })
      .then(setModules)
      .catch(() => { });
  }, [form.year, form.semester]);

  const handleUpload = async (e) => {
    e.preventDefault();
    setUploadError('');
    setUploadMsg('');

    if (!form.title || !form.moduleCode || !form.resourceType) {
      return setUploadError('Title, Module Code, and Resource Type are required.');
    }
    if (form.resourceType === 'lecture_pdf' && !form.lectureNo) {
      return setUploadError('Lecture No is required for lecture_pdf.');
    }

    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
    if (file) fd.append('file', file);

    setUploading(true);
    try {
      await resourcesAPI.create(fd);
      setUploadMsg('Resource uploaded successfully!');
      setForm({
        title: '',
        year: user?.currentYear || 1,
        semester: user?.currentSemester || 1,
        moduleCode: '',
        resourceType: 'lecture_pdf',
        lectureNo: '',
        lectureTitle: '',
        ytLink: '',
      });
      setFile(null);

      // Reset file input
      const fileInput = document.querySelector('input[type="file"]');
      if (fileInput) fileInput.value = '';

      // Redirect to resources after 2 seconds
      setTimeout(() => {
        navigate('/user-dashboard/resources');
      }, 2000);
    } catch (err) {
      setUploadError(err.message);

      // If duplicate detected, auto-reset form for re-entry
      if (err.message && err.message.includes('Duplication detected')) {
        setTimeout(() => {
          setForm({
            title: '',
            year: user?.currentYear || 1,
            semester: user?.currentSemester || 1,
            moduleCode: '',
            resourceType: 'lecture_pdf',
            lectureNo: '',
            lectureTitle: '',
            ytLink: '',
          });
          setFile(null);

          // Reset file input
          const fileInput = document.querySelector('input[type="file"]');
          if (fileInput) fileInput.value = '';

          setUploadError('');
        }, 3000);
      }
    } finally {
      setUploading(false);
    }
  };

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>📤 Upload Resource</h1>

      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Upload New Learning Resource</h3>
        {uploadError && <div className="alert alert-error">{uploadError}</div>}
        {uploadMsg && <div className="alert alert-success">{uploadMsg}</div>}

        <form onSubmit={handleUpload}>
          <div className="form-group">
            <label>Title *</label>
            <input
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              placeholder="e.g. Lecture 1 - Introduction to Databases"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Year *</label>
              <select
                value={form.year}
                onChange={(e) =>
                  setForm({ ...form, year: Number(e.target.value), moduleCode: '' })
                }
              >
                {[1, 2, 3, 4].map((y) => (
                  <option key={y} value={y}>
                    Year {y}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Semester *</label>
              <select
                value={form.semester}
                onChange={(e) =>
                  setForm({ ...form, semester: Number(e.target.value), moduleCode: '' })
                }
              >
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Module Code *</label>
              <select
                value={form.moduleCode}
                onChange={(e) => setForm({ ...form, moduleCode: e.target.value })}
                required
              >
                <option value="">Select Module</option>
                {modules.map((m) => (
                  <option key={m._id} value={m.moduleCode}>
                    {m.moduleCode} - {m.moduleName}
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label>Resource Type *</label>
              <select
                value={form.resourceType}
                onChange={(e) => setForm({ ...form, resourceType: e.target.value })}
              >
                {RESOURCE_TYPES.map((t) => (
                  <option key={t} value={t}>
                    {t}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {form.resourceType === 'lecture_pdf' && (
            <div className="form-row">
              <div className="form-group">
                <label>Lecture No *</label>
                <input
                  type="number"
                  min="1"
                  value={form.lectureNo}
                  onChange={(e) => setForm({ ...form, lectureNo: e.target.value })}
                  placeholder="e.g. 1"
                  required
                />
              </div>
              <div className="form-group">
                <label>Lecture Title (optional)</label>
                <input
                  value={form.lectureTitle}
                  onChange={(e) => setForm({ ...form, lectureTitle: e.target.value })}
                  placeholder="e.g. Introduction to SQL"
                />
              </div>
            </div>
          )}

          {form.resourceType === 'yt_link' ? (
            <div className="form-group">
              <label>YouTube Link</label>
              <input
                value={form.ytLink}
                onChange={(e) => setForm({ ...form, ytLink: e.target.value })}
                placeholder="https://youtube.com/watch?v=..."
              />
            </div>
          ) : (
            <div className="form-group">
              <label>
                File (PDF){' '}
                {['lecture_pdf', 'short_note', 'past_paper'].includes(form.resourceType)
                  ? '*'
                  : '(optional)'}
              </label>
              <input
                type="file"
                accept=".pdf,application/pdf"
                onChange={(e) => setFile(e.target.files[0])}
              />
              {file && (
                <p style={{ fontSize: '0.85rem', color: '#6b7280', marginTop: '0.5rem' }}>
                  Selected: {file.name} ({(file.size / 1024 / 1024).toFixed(2)} MB)
                </p>
              )}
            </div>
          )}

          <button type="submit" className="btn btn-primary" disabled={uploading}>
            {uploading ? 'Uploading & extracting text…' : 'Upload Resource'}
          </button>
        </form>
      </div>

      <div className="card" style={{ marginTop: '1.5rem', background: '#F5F6FA' }}>
        <h4 style={{ marginBottom: '0.5rem' }}>📝 Upload Guidelines</h4>
        <ul style={{ fontSize: '0.9rem', color: '#6b7280', lineHeight: '1.8' }}>
          <li>Ensure the file is in PDF format for best compatibility</li>
          <li>Use clear, descriptive titles for easy searching</li>
          <li>Select the correct module code and resource type</li>
          <li>For lecture PDFs, include the lecture number for proper ordering</li>
          <li>Maximum file size: 10MB (recommended)</li>
        </ul>
      </div>
    </div>
  );
};

export default DashboardUpload;
