import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { useAuth } from '../context/AuthContext';

const RESOURCE_TYPES = ['lecture_pdf', 'short_note', 'past_paper', 'yt_link', 'other'];

const DashboardResources = () => {
  const { user } = useAuth();
  const [searchParams] = useSearchParams();

  const [filterYear, setFilterYear] = useState(user?.currentYear || 1);
  const [filterSem, setFilterSem] = useState(user?.currentSemester || 1);
  const [filterModule, setFilterModule] = useState(searchParams.get('moduleCode') || '');
  const [filterType, setFilterType] = useState('');

  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  useEffect(() => {
    modulesAPI.getModules({ year: filterYear, semester: filterSem }).then(setModules).catch(() => { });
  }, [filterYear, filterSem]);

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

  return (
    <div>
      <h1 className="page-title" style={{ marginBottom: '1.5rem' }}>📂 Learning Resources</h1>

      {/* Filters */}
      <div className="filters" style={{ marginBottom: '1.5rem' }}>
        <div className="form-group">
          <label>Year</label>
          <select value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setFilterModule(''); }}>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
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

      {/* Resource List */}
      {listError && <div className="alert alert-error">{listError}</div>}
      {listLoading && <div className="spinner" />}
      {!listLoading && resources.length === 0 && (
        <p style={{ color: '#6b7280' }}>No resources found. Upload the first one!</p>
      )}
      <div className="resources-grid">
        {!listLoading && resources.map(r => (
          <div key={r._id} className={`resource-card ${r.resourceType}`}>
            <div className="resource-banner">
              <span className="resource-type-label">{r.resourceType.replace('_', ' ').toUpperCase()}</span>
            </div>
            <div className="resource-content">
              <div className="resource-header">
                <h3 className="resource-title">{r.title}</h3>
                {r.lectureNo && <span className="resource-lecture-badge">Lecture {r.lectureNo}</span>}
              </div>
              <p className="resource-meta">
                {r.moduleCode} · Year {r.year} Sem {r.semester}
              </p>
              <p className="resource-uploader">
                Uploaded by <strong>{r.uploader?.username || 'Unknown'}</strong>
              </p>
              {r.lectureTitle && <p className="resource-lecture-title">{r.lectureTitle}</p>}
            </div>
            <div className="resource-actions">
              {r.fileUrl && (
                <a href={r.fileUrl} target="_blank" rel="noreferrer" className="btn btn-primary btn-block">
                  View File
                </a>
              )}
              {r.ytLink && (
                <a href={r.ytLink} target="_blank" rel="noreferrer" className="btn btn-danger btn-block">
                  Watch Video
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default DashboardResources;
