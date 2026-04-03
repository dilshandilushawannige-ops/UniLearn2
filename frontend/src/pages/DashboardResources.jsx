import React, { useEffect, useState, useCallback } from 'react';
import { useSearchParams, useOutletContext, useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { moderationAPI } from '../api/moderation';
import { useAuth } from '../context/AuthContext';
import ModerationReportModal from '../components/ModerationReportModal';

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
  const isAdmin = user?.role === 'admin';
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

  const [modSearch, setModSearch] = useState('');
  const [modPage, setModPage] = useState(1);
  const [modItems, setModItems] = useState([]);
  const [modMeta, setModMeta] = useState({ page: 1, totalPages: 1, total: 0, limit: 4 });
  const [modLoading, setModLoading] = useState(false);

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

  const fetchModerationItems = useCallback(async () => {
    if (!isAdmin) return;
    setModLoading(true);
    try {
      const data = await moderationAPI.getItems({ page: modPage, limit: 4, search: modSearch });
      setModItems(data.items || []);
      setModMeta(data.pagination || { page: 1, totalPages: 1, total: 0, limit: 4 });
    } catch (err) {
      console.error(err);
    } finally {
      setModLoading(false);
    }
  }, [isAdmin, modPage, modSearch]);

  useEffect(() => {
    fetchModerationItems();
  }, [fetchModerationItems]);

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
      if (isAdmin) await fetchModerationItems();
      alert('Report submitted successfully');
    } catch (err) {
      alert(err.message);
    }
  };

  const handleRestore = async (itemId) => {
    try {
      await moderationAPI.restoreItem(itemId);
      await fetchModerationItems();
      await fetchResources();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleDeleteContent = async (itemId) => {
    if (!window.confirm('Delete this content permanently?')) return;
    try {
      await moderationAPI.deleteContent(itemId);
      await fetchModerationItems();
      await fetchResources();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleSuspend = async (submittedBy) => {
    if (!submittedBy?._id) return;
    const daysRaw = window.prompt('Suspend for how many days?', '3');
    if (!daysRaw) return;
    const reason = window.prompt('Suspension reason:', 'Content policy violation');
    if (!reason) return;

    try {
      await moderationAPI.suspendUser(submittedBy._id, { days: Number(daysRaw), reason });
      await fetchModerationItems();
    } catch (err) {
      alert(err.message);
    }
  };

  const handleUnsuspend = async (submittedBy) => {
    if (!submittedBy?._id) return;
    try {
      await moderationAPI.unsuspendUser(submittedBy._id);
      await fetchModerationItems();
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
      <div>
        <h1 style={{ fontSize: '2.5rem', fontWeight: '800', margin: 0, color: '#1a1f36', marginBottom: '0.25rem' }}>Learning Resources</h1>
        <p style={{ color: '#6b7280', fontSize: '1.125rem', margin: 0, marginBottom: '2.5rem' }}>Manage and discover {filteredResources.length} curated academic materials.</p>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: "1rem", flexWrap: "wrap", marginBottom: "2.5rem" }}>

        <div style={{ position: "relative", minWidth: "160px", maxWidth: "200px", flex: "1" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2" ry="2"></rect><line x1="16" y1="2" x2="16" y2="6"></line><line x1="8" y1="2" x2="8" y2="6"></line><line x1="3" y1="10" x2="21" y2="10"></line></svg>
          </span>
          <select style={{ width: "100%", appearance: "none", padding: "0.75rem 2.5rem 0.75rem 2.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} value={filterYear} onChange={e => { setFilterYear(Number(e.target.value)); setFilterModule(""); }}>
            {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year: Year {y}</option>)}
          </select>
          <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </div>

        <div style={{ position: "relative", minWidth: "180px", maxWidth: "220px", flex: "1" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="12 2 2 7 12 12 22 7 12 2"></polygon><polyline points="2 17 12 22 22 17"></polyline><polyline points="2 12 12 17 22 12"></polyline></svg>
          </span>
          <select style={{ width: "100%", appearance: "none", padding: "0.75rem 2.5rem 0.75rem 2.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} value={filterSem} onChange={e => { setFilterSem(Number(e.target.value)); setFilterModule(""); }}>
            <option value={1}>Semester: Sem 1</option>
            <option value={2}>Semester: Sem 2</option>
          </select>
          <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </div>

        <div style={{ position: "relative", minWidth: "160px", maxWidth: "200px", flex: "1" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="8" y1="6" x2="21" y2="6"></line><line x1="8" y1="12" x2="21" y2="12"></line><line x1="8" y1="18" x2="21" y2="18"></line><line x1="3" y1="6" x2="3.01" y2="6"></line><line x1="3" y1="12" x2="3.01" y2="12"></line><line x1="3" y1="18" x2="3.01" y2="18"></line></svg>
          </span>
          <select style={{ width: "100%", appearance: "none", padding: "0.75rem 2.5rem 0.75rem 2.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} value={filterModule} onChange={e => setFilterModule(e.target.value)}>
            <option value="">Module: All</option>
            {modules.map(m => <option key={m._id} value={m.moduleCode}>Module: {m.moduleCode}</option>)}
          </select>
          <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </div>

        <div style={{ position: "relative", minWidth: "200px", maxWidth: "250px", flex: "1" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          </span>
          <select style={{ width: "100%", appearance: "none", padding: "0.75rem 2.5rem 0.75rem 2.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} value={filterType} onChange={e => setFilterType(e.target.value)}>
            <option value="">Type: All</option>
            {RESOURCE_TYPES.map(t => {
              const words = t.split("_").map(w => w.charAt(0).toUpperCase() + w.slice(1));
              return <option key={t} value={t}>Type: {words.join(" ")}</option>;
            })}
          </select>
          <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
        </div>

        {/* Sort By Dropdown */}
        <div style={{ position: "relative", minWidth: "220px", maxWidth: "250px", flex: "1", marginLeft: "auto" }}>
          <span style={{ position: "absolute", left: "1rem", top: "50%", transform: "translateY(-50%)", color: "#64748b", pointerEvents: "none" }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><polyline points="19 12 12 19 5 12"></polyline></svg>
          </span>
          <select style={{ width: "100%", appearance: "none", padding: "0.75rem 2.5rem 0.75rem 2.5rem", borderRadius: "10px", border: "1px solid #e2e8f0", backgroundColor: "white", color: "#334155", fontWeight: "600", fontSize: "0.95rem", cursor: "pointer", boxShadow: "0 1px 2px rgba(0,0,0,0.05)" }} value={sortBy} onChange={e => setSortBy(e.target.value)}>
            <option value="most_viewed">Sort: Most Viewed</option>
            <option value="highest_rated">Sort: Highest Rated</option>
            <option value="most_downloaded">Sort: Most Downloaded</option>
          </select>
          <span style={{ position: "absolute", right: "1rem", top: "50%", transform: "translateY(-50%)", pointerEvents: "none", color: "#94a3b8" }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="6 9 12 15 18 9"></polyline></svg>
          </span>
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

                <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', color: '#64748b' }}>
                  <button
                    onClick={() => {
                      if (r.resourceType === 'yt_link') {
                        window.open(r.ytLink, '_blank');
                      } else {
                        navigate(`/user-dashboard/resources/${r._id}`);
                      }
                    }}
                    style={{ background: 'none', border: 'none', color: 'inherit', display: 'flex', alignItems: 'center', transition: 'color 0.2s', cursor: 'pointer', padding: 0 }}
                    onMouseOver={e => e.currentTarget.style.color = '#0284c7'}
                    onMouseOut={e => e.currentTarget.style.color = 'inherit'}
                    title="View"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                      <circle cx="12" cy="12" r="3"></circle>
                    </svg>
                  </button>

                  {r.resourceType !== 'yt_link' && r.fileUrl && (
                    <a href={r.fileUrl} onClick={(e) => handleDownload(e, r)} style={{ color: 'inherit', display: 'flex', alignItems: 'center', transition: 'color 0.2s', cursor: 'pointer' }} onMouseOver={e => e.currentTarget.style.color = '#0284c7'} onMouseOut={e => e.currentTarget.style.color = 'inherit'} title="Download">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                      </svg>
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

      {isAdmin && (
        <div style={{ marginTop: '2rem', background: '#fff', border: '1px solid #e2e8f0', borderRadius: '14px', padding: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: '1rem', flexWrap: 'wrap', marginBottom: '0.8rem' }}>
            <h2 style={{ margin: 0, color: '#1f2937' }}>Moderation Dashboard</h2>
            <input
              value={modSearch}
              onChange={(e) => { setModSearch(e.target.value); setModPage(1); }}
              placeholder="Search by title"
              style={{ border: '1px solid #cbd5e1', borderRadius: '10px', padding: '0.55rem 0.7rem', minWidth: '220px' }}
            />
          </div>

          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '900px' }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.55rem 0.4rem' }}>Title</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.55rem 0.4rem' }}>Submitted By</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.55rem 0.4rem' }}>Report Count</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.55rem 0.4rem' }}>Status</th>
                  <th style={{ textAlign: 'left', borderBottom: '1px solid #e2e8f0', padding: '0.55rem 0.4rem' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {!modLoading && modItems.map((item) => {
                  const suspended = item.submittedBy?.suspendedUntil && new Date(item.submittedBy.suspendedUntil).getTime() > Date.now();
                  return (
                    <tr key={item._id}>
                      <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.55rem 0.4rem' }}>{item.title}</td>
                      <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.55rem 0.4rem' }}>{item.submittedBy?.username || 'Unknown'}</td>
                      <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.55rem 0.4rem' }}>{item.reportCount}</td>
                      <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.55rem 0.4rem' }}>
                        {item.status === 'auto_hidden' ? (
                          <span style={{ background: '#fee2e2', color: '#991b1b', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}>AUTO-HIDDEN</span>
                        ) : item.status === 'flagged' ? (
                          <span style={{ background: '#fef3c7', color: '#92400e', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}>FLAGGED</span>
                        ) : (
                          <span style={{ background: '#e2e8f0', color: '#334155', borderRadius: '999px', padding: '0.2rem 0.55rem', fontSize: '0.75rem', fontWeight: 700 }}>NORMAL</span>
                        )}
                      </td>
                      <td style={{ borderBottom: '1px solid #f1f5f9', padding: '0.55rem 0.4rem' }}>
                        <div style={{ display: 'flex', gap: '0.45rem', flexWrap: 'wrap' }}>
                          <button style={{ border: 'none', borderRadius: '8px', padding: '0.35rem 0.55rem', background: '#0f766e', color: '#fff', cursor: 'pointer' }} onClick={() => handleRestore(item._id)}>Restore</button>
                          <button style={{ border: 'none', borderRadius: '8px', padding: '0.35rem 0.55rem', background: '#dc2626', color: '#fff', cursor: 'pointer' }} onClick={() => handleDeleteContent(item._id)}>Delete</button>
                          {!suspended && <button style={{ border: 'none', borderRadius: '8px', padding: '0.35rem 0.55rem', background: '#b45309', color: '#fff', cursor: 'pointer' }} onClick={() => handleSuspend(item.submittedBy)}>Suspend</button>}
                          {suspended && <button style={{ border: 'none', borderRadius: '8px', padding: '0.35rem 0.55rem', background: '#2563eb', color: '#fff', cursor: 'pointer' }} onClick={() => handleUnsuspend(item.submittedBy)}>Unsuspend</button>}
                        </div>
                      </td>
                    </tr>
                  );
                })}
                {!modLoading && modItems.length === 0 && (
                  <tr>
                    <td colSpan={5} style={{ padding: '0.75rem 0.4rem', color: '#64748b' }}>No moderation records found.</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <div style={{ marginTop: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <span style={{ color: '#64748b', fontSize: '0.9rem' }}>Page {modMeta.page} of {modMeta.totalPages} ({modMeta.total} items)</span>
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button
                style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: modPage <= 1 ? 'not-allowed' : 'pointer' }}
                disabled={modPage <= 1}
                onClick={() => setModPage((prev) => Math.max(1, prev - 1))}
              >Prev</button>
              <button
                style={{ border: '1px solid #cbd5e1', background: '#fff', borderRadius: '8px', padding: '0.35rem 0.6rem', cursor: modPage >= modMeta.totalPages ? 'not-allowed' : 'pointer' }}
                disabled={modPage >= modMeta.totalPages}
                onClick={() => setModPage((prev) => Math.min(modMeta.totalPages, prev + 1))}
              >Next</button>
            </div>
          </div>
        </div>
      )}

      <ModerationReportModal
        open={reportModal.open}
        title={reportModal.title}
        onClose={closeReportModal}
        onSubmit={handleReportSubmit}
      />

      {ratingModalOpen && (
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
        </div>
      )}

    </div>
  );
};

export default DashboardResources;
