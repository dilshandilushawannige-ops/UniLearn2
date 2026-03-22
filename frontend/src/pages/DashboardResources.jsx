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
    modulesAPI.getModules({ year: filterYear, semester: filterSem }).then(setModules).catch(() => {});
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

      {/* Resource List */}
      {listError && <div className="alert alert-error">{listError}</div>}
      {listLoading && <div className="spinner" />}
      {!listLoading && resources.length === 0 && (
        <p style={{ color: '#6b7280' }}>No resources found. Upload the first one!</p>
      )}
      {!listLoading && resources.map(r => (
        <div key={r._id} className="card" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
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

export default DashboardResources;
