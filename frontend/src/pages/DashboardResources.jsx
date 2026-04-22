import React, { useEffect, useState, useCallback } from 'react';
import { createPortal } from 'react-dom';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { moderationAPI } from '../api/moderation';
import { useAuth } from '../context/AuthContext';
import ModerationReportModal from '../components/ModerationReportModal';
import resourceIcon from '../assets/resource.png';
import '../styles/ModerationDashboard.css';

const RESOURCE_TYPES = ['lecture_pdf', 'short_note', 'past_paper', 'yt_link', 'other'];

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

const DashboardResources = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const outletContext = useOutletContext();
  const searchQuery = outletContext?.searchQuery || '';

  const [filterYear, setFilterYear] = useState(user?.currentYear || 1);
  const [filterSem, setFilterSem] = useState(user?.currentSemester || 1);
  const [filterModule, setFilterModule] = useState(searchParams.get('moduleCode') || '');
  const [filterType, setFilterType] = useState('');
  const [sortBy, setSortBy] = useState('most_viewed');

  const [modules, setModules] = useState([]);
  const [resources, setResources] = useState([]);
  const [listLoading, setListLoading] = useState(false);
  const [listError, setListError] = useState('');

  // Rating state
  const [ratingModalOpen, setRatingModalOpen] = useState(false);
  const [ratingResource, setRatingResource] = useState(null);
  const [currentRating, setCurrentRating] = useState(0);
  const [submittingRating, setSubmittingRating] = useState(false);
  const [reportModal, setReportModal] = useState({ open: false, contentType: '', contentId: '', title: '' });

  useEffect(() => {
    if (!user?.currentYear || !user?.currentSemester) return;

    setFilterYear(user.currentYear);
    setFilterSem(user.currentSemester);
    setFilterModule('');
  }, [user?.currentYear, user?.currentSemester]);

  const handleRateResource = async () => {
    if (!ratingResource || currentRating === 0) return;
    setSubmittingRating(true);
    try {
      const res = await resourcesAPI.rateResource(ratingResource._id, currentRating);
      setResources(prev => prev.map(r => {
        if (r._id === ratingResource._id) {
          return { ...r, averageRating: res.averageRating, ratingCount: res.ratingCount };
        }
        return r;
      }));
      setRatingModalOpen(false);
      setRatingResource(null);
      setCurrentRating(0);
    } catch (err) {
      console.error(err);
      alert('Failed to submit rating. Please try again.');
    } finally {
      setSubmittingRating(false);
    }
  };

  const handleDownload = async (e, r) => {
    e.preventDefault();
    try {
      if (!r.fileUrl) return;

      const safeTitle = (r.title || 'Document').replace(/[^a-z0-9]/gi, '_');

      // Track the download dynamically on the backend
      try {
        await resourcesAPI.recordDownload(r._id);
        // Optimistically update the UI to show the new download count
        setResources(prev => prev.map(res =>
          res._id === r._id ? { ...res, downloadCount: (res.downloadCount || 0) + 1 } : res
        ));
      } catch (trackError) {
        console.error('Failed tracking download:', trackError);
      }

      // If securely fetching from cloudinary, force the browser to trigger a download
      const response = await fetch(r.fileUrl);
      if (!response.ok) throw new Error('Network response was not ok');

      const blob = await response.blob();
      const blobUrl = window.URL.createObjectURL(blob);

      const a = document.createElement('a');
      a.style.display = 'none';
      a.href = blobUrl;
      // Force the download attribute with the safe title
      a.download = `${safeTitle}.pdf`;
      document.body.appendChild(a);
      a.click();

      window.URL.revokeObjectURL(blobUrl);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Download failed:', err);
      // Fallback: open in new tab if fetching fails due to CORS or other issues
      const link = document.createElement('a');
      link.href = r.fileUrl;
      link.target = '_blank';
      link.download = (r.title || 'Document').replace(/[^a-z0-9]/gi, '_') + '.pdf';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
    }
  };


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

  const openReportModal = (contentType, contentId, title) => {
    setReportModal({ open: true, contentType, contentId, title });
  };

  const closeReportModal = () => {
    setReportModal({ open: false, contentType: '', contentId: '', title: '' });
  };

  const handleReportSubmit = async ({ reason, otherText }) => {
    try {
      await moderationAPI.report({
        contentType: reportModal.contentType,
        contentId: reportModal.contentId,
        reason,
        otherText,
      });
      closeReportModal();
      await fetchResources();
      alert('Report submitted successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const filteredResources = resources.filter(r =>
    !searchQuery ||
    r.title.toLowerCase().startsWith(searchQuery.toLowerCase()) ||
    (r.moduleCode && r.moduleCode.toLowerCase().startsWith(searchQuery.toLowerCase()))
  ).sort((a, b) => {
    if (sortBy === 'highest_rated') return (b.averageRating || 0) - (a.averageRating || 0);
    if (sortBy === 'most_downloaded') return (b.downloadCount || 0) - (a.downloadCount || 0);
    if (sortBy === 'most_viewed') return (b.viewCount || 0) - (a.viewCount || 0);
    return 0;
  });

  return (
    <div>
      {/* ── Page Header ────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '2rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '0.5rem' }}>
          <span style={{ color: '#94a3b8', fontSize: '0.75rem', fontWeight: '700', letterSpacing: '1px', textTransform: 'uppercase' }}>DASHBOARD</span>
          <svg style={{ color: '#cbd5e1' }} width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>
          <span style={{ color: '#3b82f6', fontSize: '0.75rem', fontWeight: 'bold', letterSpacing: '1px', textTransform: 'uppercase' }}>RESOURCE</span>
        </div>
        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', letterSpacing: '-0.5px', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <img src={resourceIcon} alt="Resource Icon" width="36" height="36" style={{ flexShrink: 0, objectFit: 'contain' }} />
          Learning Resources
        </h1>
        <p style={{ margin: 0, color: '#64748b', fontSize: '1.1rem', fontWeight: '400' }}>
          Manage and discover {resources.length} curated academic materials.
        </p>
      </div>

      {/* ── Filters ───────────────────────────────────────────────────────── */}
      <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', marginBottom: '2rem' }}>
        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
          <select style={{ width: '100%', padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', appearance: 'none' }} value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setFilterModule(''); }}>
            <option value={1}>📅 Year: Year 1</option>
            <option value={2}>📅 Year: Year 2</option>
            <option value={3}>📅 Year: Year 3</option>
            <option value={4}>📅 Year: Year 4</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
          <select style={{ width: '100%', padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', appearance: 'none' }} value={filterSem} onChange={e => { setFilterSem(Number(e.target.value)); setFilterModule(''); }}>
            <option value={1}>📚 Semester: Sem 1</option>
            <option value={2}>📚 Semester: Sem 2</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
          <select style={{ width: '100%', padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', appearance: 'none' }} value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <option value="">≡ Module: All</option>
            {modules.map(m => (
              <option key={m._id} value={m.moduleCode}>
                ≡ Module: {m.moduleCode} - {m.moduleName}
              </option>
            ))}
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
          <select style={{ width: '100%', padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', appearance: 'none' }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">📋 Type: All</option>
            <option value="lecture_pdf">📋 Type: Lecture PDF</option>
            <option value="short_note">📋 Type: Short Note</option>
            <option value="past_paper">📋 Type: Past Paper</option>
            <option value="yt_link">📋 Type: YT Link</option>
            <option value="other">📋 Type: Other</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>

        <div style={{ position: 'relative', flex: '1', minWidth: '160px' }}>
          <select style={{ width: '100%', padding: '0.6rem 2rem', borderRadius: '8px', border: '1px solid #e2e8f0', background: '#ffffff', color: '#334155', fontWeight: 'bold', fontSize: '0.85rem', cursor: 'pointer', appearance: 'none' }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="most_viewed">⭐ Sort: Most Viewed</option>
            <option value="highest_rated">⭐ Sort: Highest Rated</option>
            <option value="most_downloaded">⭐ Sort: Most Downloaded</option>
          </select>
          <svg style={{ position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)', pointerEvents: 'none', color: '#94a3b8' }} width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
        </div>
      </div>

      {/* Resource List */}
      <div className="resources-grid">
        {!listLoading && filteredResources.map(r => (
          <div key={r._id} className={`resource-card ${r.resourceType}`}>
            <div className="resource-banner">
              {getResourceIcon(r.resourceType)}
              <span className="resource-type-label">{r.resourceType.replace('_', ' ').toUpperCase()}</span>
              <div
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setRatingResource(r); setRatingModalOpen(true); }}
                style={{ position: 'absolute', bottom: '8px', right: '8px', backgroundColor: 'rgba(0, 0, 0, 0.5)', padding: '4px 8px', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: '600', color: 'white', cursor: 'pointer', transition: 'background-color 0.2s' }}
                onMouseOver={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.7)'}
                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'rgba(0, 0, 0, 0.5)'}
                title="Rate this resource"
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
                {r.lectureNo && <span className="resource-lecture-badge">Lecture {r.lectureNo}</span>}
              </div>
              <p className="resource-meta">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                </svg>
                {r.moduleCode} � Year {r.year} Sem {r.semester}
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                  <button
                    onClick={() => {
                      if (r.resourceType === 'yt_link') {
                        window.open(r.ytLink, '_blank');
                      } else {
                        navigate(`/user-dashboard/resources/${r._id}`);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s', cursor: 'pointer', padding: 0 }}
                    onMouseOver={e => e.currentTarget.style.color = '#0284c7'}
                    onMouseOut={e => e.currentTarget.style.color = 'inherit'}
                    title="View"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                    <span style={{ fontSize: '0.85rem' }}>{r.viewCount || 0}</span>
                  </button>

                  {r.resourceType !== 'yt_link' && r.fileUrl && (
                    <a href={r.fileUrl} onClick={(e) => handleDownload(e, r)} style={{ color: 'inherit', display: 'flex', alignItems: 'center', gap: '4px', transition: 'color 0.2s', cursor: 'pointer', textDecoration: 'none' }} onMouseOver={e => e.currentTarget.style.color = '#0284c7'} onMouseOut={e => e.currentTarget.style.color = 'inherit'} title="Download">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
                      <span style={{ fontSize: '0.85rem' }}>{r.downloadCount || 0}</span>
                    </a>
                  )}

                  <button
                    onClick={() => openReportModal('resource', r._id, r.title)}
                    style={{ background: 'none', border: 'none', color: '#dc2626', display: 'flex', alignItems: 'center', cursor: 'pointer', padding: 0 }}
                    title="Report content"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M3 3v18"></path><path d="M19 5H9l-2 3 2 3h10l-2-3 2-3z"></path>
                    </svg>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <ModerationReportModal
        open={reportModal.open}
        title={reportModal.title}
        onClose={closeReportModal}
        onSubmit={handleReportSubmit}
      />

      {ratingModalOpen && createPortal(
        <div className="rating-modal-overlay" onClick={() => setRatingModalOpen(false)}>
          <div className="rating-modal-content" onClick={e => e.stopPropagation()}>
            <button className="rating-modal-close" onClick={() => setRatingModalOpen(false)}>&times;</button>
            <h2 className="rating-modal-title">Rate Resource</h2>
            <p className="rating-modal-subtitle">{ratingResource?.title}</p>

            <p style={{ fontSize: '0.75rem', fontWeight: 600, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '1rem' }}>Tap to Rate</p>
            <div className="rating-modal-stars">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg key={star} onClick={() => setCurrentRating(star)} fill={star <= currentRating ? "#0284c7" : "#e2e8f0"} viewBox="0 0 20 20"><path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" /></svg>
              ))}
            </div>

            <div className="rating-modal-value">
              {currentRating > 0 ? `${currentRating}.0 / 5.0` : '0.0 / 5.0'}
            </div>

            <button
              className="rating-modal-submit"
              onClick={handleRateResource}
              disabled={currentRating === 0 || submittingRating}
            >
              {submittingRating ? 'Submitting...' : 'Submit Rating'}
            </button>
          </div>
        </div>,
        document.body
      )}

    </div>
  );
};

export default DashboardResources;
