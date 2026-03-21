import React, { useEffect, useState, useCallback } from 'react';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { useAuth } from '../context/AuthContext';

const RESOURCE_TYPES = ['lecture_pdf', 'short_note', 'past_paper', 'yt_link', 'other'];

const Resources = () => {
  const { user } = useAuth();

  // ── Filter state ───────────────────────────────────────────────────────────
  const [filterYear, setFilterYear] = useState(user?.currentYear || 1);
  const [filterSem, setFilterSem] = useState(user?.currentSemester || 1);
  const [filterModule, setFilterModule] = useState('');
  const [filterType, setFilterType] = useState('');

  // ── Module list for selects ────────────────────────────────────────────────
  const [modules, setModules] = useState([]);

  // ── Resources list ─────────────────────────────────────────────────────────
  const [resources, setResources] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // ── Upload form state ──────────────────────────────────────────────────────
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({
    title: '', year: user?.currentYear || 1, semester: user?.currentSemester || 1,
    moduleCode: '', resourceType: 'lecture_pdf', lectureNo: '', lectureTitle: '',
    ytLink: '',
  });
  const [file, setFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadMsg, setUploadMsg] = useState('');
  const [uploadError, setUploadError] = useState('');

  // ── Fetch modules when filter year/sem changes ─────────────────────────────
  useEffect(() => {
    modulesAPI.getModules({ year: filterYear, semester: filterSem }).then(setModules).catch(() => {});
  }, [filterYear, filterSem]);

  // ── Fetch resources on filter change ──────────────────────────────────────
  const fetchResources = useCallback(async () => {
    setListLoading(true);
    setListError('');
    try {
      const params = { year: filterYear, semester: filterSem };
      if (filterModule) params.moduleCode = filterModule;
      if (filterType) params.resourceType = filterType;
      const data = await resourcesAPI.getAll(params);
      setResources(data);
    } catch (err) {
      setListError(err.message);
    } finally {
      setListLoading(false);
    }
  }, [filterYear, filterSem, filterModule, filterType]);

  useEffect(() => { fetchResources(); }, [fetchResources]);

  // ── Upload handler ─────────────────────────────────────────────────────────
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
      setForm({ title: '', year: user?.currentYear || 1, semester: user?.currentSemester || 1, moduleCode: '', resourceType: 'lecture_pdf', lectureNo: '', lectureTitle: '', ytLink: '' });
      setFile(null);
      fetchResources();
    } catch (err) {
      setUploadError(err.message);
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="page">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h1 className="page-title" style={{ marginBottom: 0 }}>📂 Learning Resources</h1>
        <button className="btn btn-primary btn-sm" onClick={() => setShowForm(!showForm)}>
          {showForm ? 'Hide Form' : '+ Upload Resource'}
        </button>
      </div>

      {/* ── Upload Form ───────────────────────────────────────────────────── */}
      {showForm && (
        <div className="card" style={{ marginBottom: '1.75rem' }}>
          <h3 style={{ marginBottom: '1rem' }}>Upload New Resource</h3>
          {uploadError && <div className="alert alert-error">{uploadError}</div>}
          {uploadMsg && <div className="alert alert-success">{uploadMsg}</div>}
          <form onSubmit={handleUpload}>
            <div className="form-group">
              <label>Title *</label>
              <input value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} placeholder="e.g. Lecture 1 - Introduction to Databases" />
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Year *</label>
                <select value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value), moduleCode: '' })}>
                  {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
                </select>
              </div>
              <div className="form-group">
                <label>Semester *</label>
                <select value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value), moduleCode: '' })}>
                  <option value={1}>Semester 1</option>
                  <option value={2}>Semester 2</option>
                </select>
              </div>
            </div>
            <div className="form-row">
              <div className="form-group">
                <label>Module Code *</label>
                <input
                  value={form.moduleCode}
                  onChange={e => setForm({ ...form, moduleCode: e.target.value.toUpperCase() })}
                  placeholder="e.g. CS101"
                />
              </div>
              <div className="form-group">
                <label>Resource Type *</label>
                <select value={form.resourceType} onChange={e => setForm({ ...form, resourceType: e.target.value })}>
                  {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>
            {form.resourceType === 'lecture_pdf' && (
              <div className="form-row">
                <div className="form-group">
                  <label>Lecture No *</label>
                  <input type="number" min="1" value={form.lectureNo} onChange={e => setForm({ ...form, lectureNo: e.target.value })} placeholder="e.g. 1" />
                </div>
                <div className="form-group">
                  <label>Lecture Title (optional)</label>
                  <input value={form.lectureTitle} onChange={e => setForm({ ...form, lectureTitle: e.target.value })} placeholder="e.g. Introduction to SQL" />
                </div>
              </div>
            )}
            {form.resourceType === 'yt_link' ? (
              <div className="form-group">
                <label>YouTube Link</label>
                <input value={form.ytLink} onChange={e => setForm({ ...form, ytLink: e.target.value })} placeholder="https://youtube.com/watch?v=..." />
              </div>
            ) : (
              <div className="form-group">
                <label>File (PDF) {['lecture_pdf','short_note','past_paper'].includes(form.resourceType) ? '*' : '(optional)'}</label>
                <input type="file" accept=".pdf,application/pdf" onChange={e => setFile(e.target.files[0])} />
              </div>
            )}
            <button type="submit" className="btn btn-primary" disabled={uploading}>
              {uploading ? 'Uploading & extracting text…' : 'Upload Resource'}
            </button>
          </form>
        </div>
      )}

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div className="filters">
        <div className="form-group">
          <label>Year</label>
          <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setFilterModule(''); }}>
            {[1,2,3,4].map(y => <option key={y} value={y}>Year {y}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Semester</label>
          <select value={filterSem} onChange={e => { setFilterSem(Number(e.target.value)); setFilterModule(''); }}>
            <option value={1}>Semester 1</option>
            <option value={2}>Semester 2</option>
          </select>
        </div>
        <div className="form-group">
          <label>Module</label>
          <select value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <option value="">All Modules</option>
            {modules.map(m => <option key={m._id} value={m.moduleCode}>{m.moduleCode}</option>)}
          </select>
        </div>
        <div className="form-group">
          <label>Type</label>
          <select value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">All Types</option>
            {RESOURCE_TYPES.map(t => <option key={t} value={t}>{t}</option>)}
          </select>
        </div>
      </div>

      {/* ── Resource List ─────────────────────────────────────────────────── */}
      {listError && <div className="alert alert-error">{listError}</div>}
      {listLoading && <div className="spinner" />}
      {!listLoading && resources.length === 0 && (
        <p style={{ color: '#6b7280' }}>No resources found. Upload the first one!</p>
      )}
      {!listLoading && resources.map(r => (
        <div key={r._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
          <div>
            <div style={{ marginBottom: '0.3rem' }}>
              <span className={`resource-tag ${r.resourceType}`}>{r.resourceType}</span>
              <strong>{r.title}</strong>
              {r.lectureNo && <span style={{ color: '#6b7280', fontSize:'0.85rem', marginLeft:'0.5rem' }}>Lecture {r.lectureNo}</span>}
            </div>
            <div style={{ fontSize: '0.82rem', color: '#6b7280' }}>
              {r.moduleCode} · Year {r.year} Sem {r.semester} · by {r.uploader?.username || 'Unknown'}
            </div>
            {r.lectureTitle && <div style={{ fontSize: '0.85rem', color: '#374151', marginTop: '0.2rem' }}>{r.lectureTitle}</div>}
          </div>
          <div style={{ flexShrink: 0, marginLeft: '1rem' }}>
            {r.fileUrl && (
              <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                View File
              </a>
            )}
            {r.ytLink && (
              <a href={r.ytLink} target="_blank" rel="noreferrer" className="btn btn-outline btn-sm">
                Watch
              </a>
            )}
          </div>
        </div>
      ))}
    </div>
  );
};

export default Resources;
