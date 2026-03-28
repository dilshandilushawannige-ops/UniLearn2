import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';

const ResourceDetails = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
    const [generatingSummary, setGeneratingSummary] = useState(false);
    const [error, setError] = useState('');

    useEffect(() => {
        const fetchResource = async () => {
            try {
                setLoading(true);
                const data = await resourcesAPI.getById(id);
                setResource(data);
            } catch (err) {
                setError(err.message || 'Failed to load resource');
            } finally {
                setLoading(false);
            }
        };
        fetchResource();
    }, [id]);

    const handleDownload = async (e) => {
        e.preventDefault();
        try {
            if (!resource.fileUrl) return;

            const safeTitle = (resource.title || 'Document').replace(/[^a-z0-9]/gi, '_');
            const response = await fetch(resource.fileUrl);
            if (!response.ok) throw new Error('Network response was not ok');

            const blob = await response.blob();
            const blobUrl = window.URL.createObjectURL(blob);

            const a = document.createElement('a');
            a.style.display = 'none';
            a.href = blobUrl;
            a.download = `${safeTitle}.pdf`;
            document.body.appendChild(a);
            a.click();

            window.URL.revokeObjectURL(blobUrl);
            document.body.removeChild(a);
        } catch (err) {
            console.error('Download failed:', err);
            const link = document.createElement('a');
            link.href = resource.fileUrl;
            link.target = '_blank';
            link.download = (resource.title || 'Document').replace(/[^a-z0-9]/gi, '_') + '.pdf';
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
        }
    };

    const handleGenerateSummary = async () => {
        if (resource.summary) {
            navigate(`/user-dashboard/resources/${id}/summary`);
            return;
        }

        try {
            setGeneratingSummary(true);
            const data = await resourcesAPI.generateSummary(id);
            setResource(prev => ({ ...prev, summary: data.summary }));
            navigate(`/user-dashboard/resources/${id}/summary`);
        } catch (err) {
            console.error('Failed to generate summary:', err);
            alert(err.response?.data?.message || 'Failed to generate summary. Please try again.');
        } finally {
            setGeneratingSummary(false);
        }
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading resource...</p>
            </div>
        );
    }

    if (error || !resource) {
        return (
            <div style={{ padding: '2rem' }}>
                <p style={{ color: '#ef4444' }}>{error || 'Resource not found'}</p>
                <button onClick={() => navigate('/user-dashboard/resources')} style={{ marginTop: '1rem', padding: '0.5rem 1rem', backgroundColor: '#0284c7', color: 'white', border: 'none', borderRadius: '6px', cursor: 'pointer' }}>
                    Back to Resources
                </button>
            </div>
        );
    }

    return (
        <div>
            {/* Breadcrumb Navigation */}
            <nav style={{ marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                <Link to="/user-dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Dashboard</Link>
                <span style={{ margin: '0 0.5rem' }}>›</span>
                <Link to="/user-dashboard/resources" style={{ color: '#64748b', textDecoration: 'none' }}>Resources</Link>
                <span style={{ margin: '0 0.5rem' }}>›</span>
                <span style={{ color: '#0f172a', fontWeight: '600' }}>Resource details</span>
            </nav>

            {/* Resource Header */}
            <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{ display: 'flex', gap: '1rem', alignItems: 'flex-start' }}>
                    <div style={{ backgroundColor: '#e0f2fe', color: '#0284c7', padding: '1rem', borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                            <polyline points="14 2 14 8 20 8"></polyline>
                            <line x1="16" y1="13" x2="8" y2="13"></line>
                            <line x1="16" y1="17" x2="8" y2="17"></line>
                            <polyline points="10 9 9 9 8 9"></polyline>
                        </svg>
                    </div>
                    <div style={{ flex: 1 }}>
                        <h1 style={{ margin: 0, fontSize: '2rem', color: '#0f172a', fontWeight: '800' }}>
                            {resource.title}
                            {resource.lectureNo && <span style={{ fontSize: '1.5rem', color: '#64748b', fontWeight: '600' }}> - Lecture {resource.lectureNo}</span>}
                        </h1>
                        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', marginTop: '0.75rem', fontSize: '0.95rem', color: '#64748b', flexWrap: 'wrap' }}>
                            <span style={{ backgroundColor: '#e0e7ff', color: '#0369a1', padding: '4px 12px', borderRadius: '6px', fontWeight: '700', fontSize: '0.85rem' }}>
                                YEAR {resource.year} · SEM {resource.semester}
                            </span>
                            <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                    <path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"></path>
                                </svg>
                                {resource.moduleCode}
                            </span>
                            <span style={{ backgroundColor: '#fef3c7', color: '#92400e', padding: '4px 12px', borderRadius: '6px', fontWeight: '600', fontSize: '0.85rem', textTransform: 'uppercase' }}>
                                {resource.resourceType.replace('_', ' ')}
                            </span>
                        </div>
                        {resource.lectureTitle && (
                            <p style={{ marginTop: '0.75rem', color: '#475569', fontSize: '1rem' }}>{resource.lectureTitle}</p>
                        )}
                    </div>
                </div>

                {/* Top-Right Summary Button */}
                {resource.resourceType === 'lecture_pdf' && (
                    <button
                        onClick={handleGenerateSummary}
                        disabled={generatingSummary}
                        style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#ecfdf5', color: '#16a34a', border: '1px solid #bbf7d0', borderRadius: '8px', fontWeight: '700', cursor: generatingSummary ? 'wait' : 'pointer', fontSize: '1rem', transition: 'all 0.2s', opacity: generatingSummary ? 0.7 : 1 }}
                        onMouseOver={(e) => { if (!generatingSummary) { e.currentTarget.style.backgroundColor = '#dcfce7'; e.currentTarget.style.transform = 'translateY(-1px)'; } }}
                        onMouseOut={(e) => { if (!generatingSummary) { e.currentTarget.style.backgroundColor = '#ecfdf5'; e.currentTarget.style.transform = 'none'; } }}
                    >
                        {generatingSummary ? (
                            <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'spin 1s linear infinite' }}>
                                <path d="M21 12a9 9 0 1 1-6.219-8.56"></path>
                                <style>{`@keyframes spin { 100% { transform: rotate(360deg); } }`}</style>
                            </svg>
                        ) : (
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                        )}
                        {generatingSummary ? 'Generating Summary...' : (resource.summary ? 'View Summary' : 'Generate Summary')}
                    </button>
                )}
            </div>

            {/* Action Buttons */}
            <div style={{ display: 'flex', gap: '1rem', marginTop: '1.5rem', marginBottom: '1rem' }}>
                <button
                    onClick={handleDownload}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#3b82f6', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem', transition: 'background-color 0.2s' }}
                    onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#2563eb'}
                    onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#3b82f6'}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                        <polyline points="7 10 12 15 17 10"></polyline>
                        <line x1="12" y1="15" x2="12" y2="3"></line>
                    </svg>
                    Download
                </button>
                <button
                    onClick={() => {
                        navigator.clipboard.writeText(window.location.href);
                        alert('Link copied to clipboard!');
                    }}
                    style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: 'white', color: '#475569', border: '1px solid #cbd5e1', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', fontSize: '1rem', transition: 'all 0.2s' }}
                    onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#f8fafc'; e.currentTarget.style.borderColor = '#94a3b8'; e.currentTarget.style.color = '#0f172a'; }}
                    onMouseOut={(e) => { e.currentTarget.style.backgroundColor = 'white'; e.currentTarget.style.borderColor = '#cbd5e1'; e.currentTarget.style.color = '#475569'; }}
                >
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <circle cx="18" cy="5" r="3"></circle>
                        <circle cx="6" cy="12" r="3"></circle>
                        <circle cx="18" cy="19" r="3"></circle>
                        <line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line>
                        <line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line>
                    </svg>
                    Share
                </button>
            </div>

            {/* Main Content: PDF Viewer (Left) + Sidebar (Right) */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>

                {/* Left: PDF Viewer */}
                <div style={{
                    backgroundColor: 'white',
                    borderRadius: '0',
                    overflow: 'auto',
                    border: '2px solid white',
                    boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)',
                    height: '75vh',
                    position: 'relative',
                    scrollbarWidth: 'thin',
                    scrollbarColor: 'white black'
                }}>
                    <style>{`
                        div::-webkit-scrollbar {
                            width: 12px;
                            height: 12px;
                        }
                        div::-webkit-scrollbar-track {
                            background: black;
                        }
                        div::-webkit-scrollbar-thumb {
                            background: white;
                            border-radius: 0px;
                        }
                        div::-webkit-scrollbar-thumb:hover {
                            background: #e5e5e5;
                        }
                    `}</style>
                    <iframe
                        src={`https://docs.google.com/viewer?url=${encodeURIComponent(resource.fileUrl)}&embedded=true`}
                        title={resource.title}
                        style={{ width: '100%', height: '100%', border: 'none', display: 'block' }}
                    />
                </div>

                {/* Right: Separate Component Cards */}
                <div>
                    {/* Uploaded By Card */}
                    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Uploaded By</h3>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                <div style={{ width: '40px', height: '40px', borderRadius: '50%', backgroundColor: '#f1f5f9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#334155', fontWeight: 'bold', fontSize: '1.1rem' }}>
                                    {resource.uploader?.username ? resource.uploader.username[0].toUpperCase() : 'U'}
                                </div>
                                <div>
                                    <p style={{ margin: 0, fontWeight: '700', color: '#0f172a', fontSize: '1rem' }}>
                                        {resource.uploader?.username || 'Unknown User'}
                                    </p>
                                    {resource.uploader?.email && (
                                        <p style={{ margin: 0, color: '#64748b', fontSize: '0.85rem' }}>
                                            {resource.uploader.email}
                                        </p>
                                    )}
                                </div>
                            </div>
                            <button style={{ width: '100%', padding: '0.6rem', border: '1px solid #cbd5e1', borderRadius: '25px', backgroundColor: 'white', color: '#475569', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                                onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#f8fafc'}
                                onMouseOut={(e) => e.currentTarget.style.backgroundColor = 'white'}>
                                View Profile
                            </button>
                        </div>
                    </div>

                    {/* Statistics Card */}
                    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)', marginBottom: '1.5rem' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Statistics</h3>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem 1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#0284c7' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                        <circle cx="12" cy="12" r="3"></circle>
                                    </svg>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most<br />Viewed</span>
                                </div>
                                <p style={{ margin: 0, fontWeight: '700', color: '#0f172a', fontSize: '1.5rem' }}>{resource.viewCount || 824}</p>
                            </div>
                            <div style={{ backgroundColor: '#f8fafc', padding: '1.25rem 1rem', borderRadius: '12px', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#16a34a' }}>
                                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                        <polyline points="7 10 12 15 17 10"></polyline>
                                        <line x1="12" y1="15" x2="12" y2="3"></line>
                                    </svg>
                                    <span style={{ fontSize: '0.65rem', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Most<br />Downloaded</span>
                                </div>
                                <p style={{ margin: 0, fontWeight: '700', color: '#0f172a', fontSize: '1.5rem' }}>{resource.downloadCount || 256}</p>
                            </div>
                        </div>
                    </div>

                    {/* Rating Card */}
                    <div style={{ backgroundColor: 'white', padding: '1.5rem', borderRadius: '12px', boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
                        <h3 style={{ margin: '0 0 1rem 0', fontSize: '0.75rem', color: '#94a3b8', fontWeight: '600', textTransform: 'uppercase', letterSpacing: '1px' }}>Rating</h3>
                        <div style={{ display: 'flex', alignItems: 'end', gap: '0.5rem', marginBottom: '0.25rem' }}>
                            <h2 style={{ margin: 0, fontSize: '2.5rem', fontWeight: '800', color: '#0f172a', lineHeight: '1' }}>{(resource.averageRating || 0).toFixed(1)}</h2>
                            <span style={{ color: '#94a3b8', fontSize: '0.85rem', marginBottom: '0.4rem', fontWeight: '500' }}>/ 5.0</span>
                            <div style={{ display: 'flex', marginLeft: 'auto', gap: '0.15rem', marginBottom: '0.4rem' }}>
                                {[1, 2, 3, 4, 5].map(star => (
                                    <svg key={star} width="16" height="16" viewBox="0 0 20 20" fill={star <= Math.round(resource.averageRating || 0) ? '#facc15' : '#e2e8f0'} style={{ dropShadow: '0 1px 1px rgba(0,0,0,0.1)' }}>
                                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                                    </svg>
                                ))}
                            </div>
                        </div>
                        <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#94a3b8', marginBottom: '1.25rem', fontWeight: '500' }}>
                            {resource.ratingCount || 0} RATINGS
                        </div>

                        {/* Rating Bars */}
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '1.5rem' }}>
                            {[5, 4, 3].map(level => {
                                let widthPercent = 0;
                                if ((resource.averageRating || 0) > 0) {
                                    if (level === 5 && resource.averageRating >= 4.5) widthPercent = 70;
                                    else if (level === 4 && resource.averageRating >= 3.5) widthPercent = 40;
                                    else if (level <= resource.averageRating) widthPercent = 20;
                                }
                                return (
                                    <div key={level} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                                        <span style={{ fontSize: '0.75rem', color: '#475569', fontWeight: '600', width: '10px' }}>{level}</span>
                                        <div style={{ flex: 1, height: '6px', backgroundColor: '#f1f5f9', borderRadius: '3px', overflow: 'hidden' }}>
                                            <div style={{ height: '100%', backgroundColor: '#16a34a', width: `${widthPercent}%`, borderRadius: '3px' }}></div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>

                        <button style={{ width: '100%', padding: '0.8rem', backgroundColor: '#0f172a', color: 'white', border: 'none', borderRadius: '25px', fontWeight: '600', fontSize: '0.9rem', cursor: 'pointer', transition: 'background-color 0.2s' }}
                            onMouseOver={(e) => e.currentTarget.style.backgroundColor = '#1e293b'}
                            onMouseOut={(e) => e.currentTarget.style.backgroundColor = '#0f172a'}>
                            Rate Resource
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default ResourceDetails;
