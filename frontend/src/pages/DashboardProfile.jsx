import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { useAuth } from '../context/AuthContext';

const getResourceIcon = (type) => {
  switch (type) {
    case 'yt_link':
      return (
        <svg className="resource-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <circle cx="12" cy="12" r="10"></circle>
          <polygon points="10 8 16 12 10 16 10 8"></polygon>
        </svg>
      );
    case 'lecture_pdf':
      return (
        <svg className="resource-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z"></path>
          <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z"></path>
        </svg>
      );
    case 'past_paper':
      return (
        <svg className="resource-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"></path>
          <rect x="8" y="2" width="8" height="4" rx="1" ry="1"></rect>
        </svg>
      );
    case 'short_note':
      return (
        <svg className="resource-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
          <polyline points="14 2 14 8 20 8"></polyline>
          <line x1="16" y1="13" x2="8" y2="13"></line>
          <line x1="16" y1="17" x2="8" y2="17"></line>
          <polyline points="10 9 9 9 8 9"></polyline>
        </svg>
      );
    default:
      return (
        <svg className="resource-banner-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
        </svg>
      );
  }
};

const DashboardProfile = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [resources, setResources] = useState([]);
  const [loading, setLoading] = useState(true);
  const [editResource, setEditResource] = useState(null);
  const [editFormData, setEditFormData] = useState({ title: '', moduleCode: '', year: '', semester: '', lectureNo: '' });
  const [modules, setModules] = useState([]);

  useEffect(() => {
    if (editResource && editFormData.year && editFormData.semester) {
      modulesAPI.getModules({ year: editFormData.year, semester: editFormData.semester })
        .then(setModules)
        .catch(() => { });
    }
  }, [editFormData.year, editFormData.semester, editResource]);

  const fetchMyResources = useCallback(async () => {
    try {
      if (!user?._id) return;
      const data = await resourcesAPI.getAll({ uploader: user._id });
      setResources(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    fetchMyResources();
  }, [fetchMyResources]);

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this resource?")) {
      try {
        await resourcesAPI.deleteResource(id);
        setResources(prev => prev.filter(r => r._id !== id));
      } catch (err) {
        alert("Failed to delete resource: " + err.message);
      }
    }
  };

  const handleUpdate = (r) => {
    setEditResource(r);
    setEditFormData({
      title: r.title || '',
      moduleCode: r.moduleCode || '',
      year: r.year || '',
      semester: r.semester || '',
      lectureNo: r.lectureNo || ''
    });
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    try {
      await resourcesAPI.updateResource(editResource._id, editFormData);
      setResources(prev => prev.map(res => res._id === editResource._id ? { ...res, ...editFormData } : res));
      setEditResource(null);
    } catch (err) {
      alert("Failed to update resource: " + err.message);
    }
  };

  const totalDownloads = resources.reduce((acc, curr) => acc + (curr.downloadCount || 0), 0);
  const totalRatings = resources.filter(r => r.ratingCount > 0);
  const avgRating = totalRatings.length
    ? (totalRatings.reduce((acc, curr) => acc + (curr.averageRating || 0), 0) / totalRatings.length).toFixed(1)
    : "No Ratings";

  return (
    <div style={{ padding: '1rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', marginBottom: '2rem', fontWeight: '600' }}>
        <span style={{ color: '#94a3b8' }}>Dashboard</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="#94a3b8" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
        <span style={{ color: '#475569' }}>Student Profile</span>
      </div>

      <div style={{ backgroundColor: '#ffffff', padding: '1.5rem', borderRadius: '16px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '3rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '1.5rem' }}>
          {/* Initials Avatar */}
          <div style={{ width: '120px', height: '120px', backgroundColor: '#025ebc', borderRadius: '12px', display: 'flex', justifyContent: 'center', alignItems: 'center', color: '#ffffff', fontSize: '3rem', fontWeight: '500' }}>
            {user?.username ? user.username.split(' ').map(n => n[0]).join('').toUpperCase().substring(0, 2) : 'RT'}
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
            <h1 style={{ fontSize: '2rem', fontWeight: '800', color: '#111827', margin: 0, letterSpacing: '-0.5px' }}>
              {user?.username || 'Ravindu Thathsara'}
            </h1>

            <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
              <span style={{ backgroundColor: '#f4f6fb', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', color: '#475569', fontWeight: '600', letterSpacing: '0.5px' }}>
                {user?.studentId || 'IT23830264'}
              </span>
              <span style={{ backgroundColor: '#e2e8ff', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', color: '#1d4ed8', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                YEAR {user?.currentYear || 3}
              </span>
              <span style={{ backgroundColor: '#9bf099', padding: '4px 12px', borderRadius: '20px', fontSize: '0.75rem', color: '#14532d', fontWeight: '600', letterSpacing: '0.5px', textTransform: 'uppercase' }}>
                SEMESTER {user?.currentSemester || 1}
              </span>
            </div>
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', alignItems: 'flex-end' }}>
          <button onClick={() => navigate('/user-dashboard/upload')} style={{ backgroundColor: '#025ebc', color: '#fff', padding: '10px 20px', borderRadius: '8px', border: 'none', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37, 99, 235, 0.2)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path><polyline points="17 8 12 3 7 8"></polyline><line x1="12" y1="3" x2="12" y2="15"></line></svg>
            <span>Upload Resource</span>
          </button>
          <button style={{ backgroundColor: '#f8fafc', border: 'none', width: '32px', height: '32px', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer', color: '#64748b' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="12" r="1"></circle><circle cx="19" cy="12" r="1"></circle><circle cx="5" cy="12" r="1"></circle></svg>
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '1.5rem', marginBottom: '3rem' }}>
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>TOTAL UPLOADS</p>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#2563eb' }}>{resources.length}</div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>RESOURCES DOWNLOADED</p>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#16a34a' }}>{totalDownloads > 1000 ? (totalDownloads / 1000).toFixed(1) + 'k' : totalDownloads}</div>
        </div>
        <div style={{ backgroundColor: '#f8fafc', padding: '1.5rem', borderRadius: '12px', border: '1px solid #e2e8f0' }}>
          <p style={{ fontSize: '0.75rem', fontWeight: 700, color: '#64748b', margin: '0 0 8px 0', letterSpacing: '0.5px' }}>RESOURCE RATING</p>
          <div style={{ fontSize: '2rem', fontWeight: 700, color: '#b45309' }}>{avgRating}{avgRating !== 'No Ratings' && '/5'}</div>
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
        <h2 style={{ fontSize: '1.5rem', fontWeight: 700, color: '#1e293b', margin: 0 }}>My Uploaded Resources</h2>
      </div>

      {loading ? (
        <div>Loading your profile...</div>
      ) : resources.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '3rem', backgroundColor: '#f8fafc', borderRadius: '12px', color: '#64748b' }}>
          You haven't uploaded any resources yet. Start contributing to earn reputation!
        </div>
      ) : (
        <div className="resources-grid" style={{ gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))' }}>
          {resources.map(r => (
            <div key={r._id} className={`resource-card ${r.resourceType}`}>
              <div className="resource-banner">
                {getResourceIcon(r.resourceType)}
                <span className="resource-type-label">{r.resourceType.replace('_', ' ').toUpperCase()}</span>
                <div
                  style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '600', color: 'white' }}
                >
                  <div style={{ display: 'flex', color: '#fbbf24', gap: '2px' }}>
                    {[1, 2, 3, 4, 5].map(star => (
                      <svg key={star} width="10" height="10" viewBox="0 0 20 20" fill={star <= Math.round(r.averageRating || 0) ? "currentColor" : "rgba(255,255,255,0.3)"}>
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                    ))}
                  </div>
                  <span>{(r.averageRating || 0).toFixed(1)} ({r.ratingCount || 0})</span>
                </div>
              </div>
              <div className="resource-content">
                <div className="resource-header">
                  <h3 className="resource-title">{r.title}</h3>
                  {r.lectureNo && <span className="resource-lecture-badge">LECTURE {r.lectureNo}</span>}
                </div>
                <p className="resource-meta">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px', verticalAlign: 'middle' }}>
                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                  </svg>
                  {r.moduleCode} · Year {r.year} Sem {r.semester}
                </p>
                {r.lectureTitle && <p className="resource-lecture-title">{r.lectureTitle}</p>}

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginTop: 'auto', paddingTop: '1rem', borderTop: '1px solid #f1f5f9' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                    <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 'bold', fontSize: '0.875rem' }}>
                      {r.uploader?.username ? r.uploader.username[0].toUpperCase() : '?'}
                    </div>
                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                      <span style={{ fontSize: '0.65rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Uploaded by</span>
                      <strong style={{ fontSize: '0.85rem', color: '#334155' }}>
                        {r.uploader?.username || 'Unknown'}
                        {r.uploader?.email ? ` - ${r.uploader.email.split('@')[0].toUpperCase()}` : ''}
                      </strong>
                    </div>
                  </div>

                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', alignItems: 'flex-end' }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <button onClick={() => handleUpdate(r)} style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#16a34a', border: '1px solid #16a34a', borderRadius: '4px', backgroundColor: 'transparent', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                        </svg>
                        Edit
                      </button>
                      <button onClick={() => handleDelete(r._id)} style={{ cursor: 'pointer', padding: '0.2rem 0.5rem', fontSize: '0.7rem', color: '#dc2626', border: '1px solid #dc2626', borderRadius: '4px', backgroundColor: 'transparent', fontWeight: '600', display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <polyline points="3 6 5 6 21 6"></polyline>
                          <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                          <line x1="10" y1="11" x2="10" y2="17"></line>
                          <line x1="14" y1="11" x2="14" y2="17"></line>
                        </svg>
                        Delete
                      </button>
                    </div>

                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="View">
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                          <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                          <circle cx="12" cy="12" r="3"></circle>
                        </svg>
                        <span style={{ fontSize: '0.75rem' }}>{r.viewCount || 0}</span>
                      </div>
                      {r.resourceType !== 'yt_link' && r.fileUrl && (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }} title="Download">
                          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                            <polyline points="7 10 12 15 17 10"></polyline>
                            <line x1="12" y1="15" x2="12" y2="3"></line>
                          </svg>
                          <span style={{ fontSize: '0.75rem' }}>{r.downloadCount || 0}</span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Edit Modal Overlay */}
      {editResource && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, backgroundColor: 'rgba(0,0,0,0.5)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <form style={{ backgroundColor: '#fff', padding: '2rem', borderRadius: '12px', width: '90%', maxWidth: '400px', boxShadow: '0 10px 25px rgba(0,0,0,0.2)' }} onSubmit={handleEditSubmit}>
            <h3 style={{ marginTop: 0, marginBottom: '1.5rem', color: '#1e293b' }}>Edit Resource</h3>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Title</label>
              <input type="text" value={editFormData.title} onChange={e => setEditFormData({ ...editFormData, title: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>

            <div style={{ marginBottom: '1rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Module Code</label>
              <input type="text" value={editFormData.moduleCode} onChange={e => setEditFormData({ ...editFormData, moduleCode: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
            </div>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1rem' }}>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Year</label>
                <input type="number" value={editFormData.year} onChange={e => setEditFormData({ ...editFormData, year: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
              <div style={{ flex: 1 }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Semester</label>
                <input type="number" value={editFormData.semester} onChange={e => setEditFormData({ ...editFormData, semester: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} required />
              </div>
            </div>

            <div style={{ marginBottom: '1.5rem' }}>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.875rem', fontWeight: '600', color: '#475569' }}>Lecture No (Optional)</label>
              <input type="number" min="1" max="15" value={editFormData.lectureNo} onChange={e => setEditFormData({ ...editFormData, lectureNo: e.target.value })} style={{ width: '100%', padding: '0.75rem', borderRadius: '6px', border: '1px solid #cbd5e1', boxSizing: 'border-box' }} />
            </div>

            <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
              <button type="button" onClick={() => setEditResource(null)} style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: '1px solid #cbd5e1', backgroundColor: 'transparent', cursor: 'pointer', fontWeight: '600', color: '#475569' }}>Cancel</button>
              <button type="submit" style={{ padding: '0.75rem 1.5rem', borderRadius: '6px', border: 'none', backgroundColor: '#1d4ed8', color: '#fff', cursor: 'pointer', fontWeight: '600' }}>Save Changes</button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default DashboardProfile;
