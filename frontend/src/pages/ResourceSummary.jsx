import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';

const ResourceSummary = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [resource, setResource] = useState(null);
    const [loading, setLoading] = useState(true);
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

    const handleDownloadPDF = () => {
        if (!resource || !resource.summary) return;
        const printWindow = window.open('', '', 'width=800,height=600');
        printWindow.document.write(`
            <html>
                <head>
                    <title>Summary - ${resource.title}</title>
                    <style>
                        body { font-family: Arial, sans-serif; padding: 2rem; color: #333; line-height: 1.6; }
                        h1 { color: #0f172a; margin-bottom: 0.5rem; }
                        .subtitle { color: #64748b; margin-bottom: 2rem; font-size: 0.9rem; }
                        .content { white-space: pre-wrap; font-size: 14px; }
                    </style>
                </head>
                <body>
                    <h1>${resource.title} - AI Summary</h1>
                    <div class="subtitle">Module: ${resource.moduleCode} | Year: ${resource.year}</div>
                    <div class="content">${resource.summary.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</div>
                    <script>
                        window.onload = () => {
                            window.print();
                        }
                    </script>
                </body>
            </html>
        `);
        printWindow.document.close();
    };

    if (loading) {
        return (
            <div style={{ padding: '2rem', textAlign: 'center' }}>
                <p>Loading summary...</p>
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
            {/* Breadcrumb Navigation - File Path Style */}
            <nav style={{ display: 'flex', alignItems: 'center', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#64748b' }}>
                <Link to="/user-dashboard" style={{ color: '#64748b', textDecoration: 'none' }}>Dashboard</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <Link to="/user-dashboard/resources" style={{ color: '#64748b', textDecoration: 'none' }}>Resources</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <Link to={`/user-dashboard/resources/${id}`} style={{ color: '#64748b', textDecoration: 'none' }}>{resource?.title || 'Resource details'}</Link>
                <span style={{ color: '#cbd5e1' }}>/</span>
                <span style={{ color: '#0f172a', fontWeight: '500' }}>View Summary</span>
            </nav>

            <div style={{ backgroundColor: 'white', padding: '2.5rem', borderRadius: '12px', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.1), 0 2px 4px -1px rgba(0,0,0,0.06)' }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', borderBottom: '1px solid #e2e8f0', paddingBottom: '1.5rem', marginBottom: '2rem' }}>
                    <div>
                        <h1 style={{ margin: '0 0 0.5rem 0', fontSize: '2rem', color: '#0f172a', display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#0284c7" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path>
                                <polyline points="14 2 14 8 20 8"></polyline>
                                <line x1="16" y1="13" x2="8" y2="13"></line>
                                <line x1="16" y1="17" x2="8" y2="17"></line>
                                <polyline points="10 9 9 9 8 9"></polyline>
                            </svg>
                            AI Summary: {resource.title}
                        </h1>
                        <p style={{ margin: 0, color: '#64748b' }}>
                            {resource.moduleCode} • Year {resource.year} • Semester {resource.semester}
                        </p>
                    </div>
                    <div style={{ display: 'flex', gap: '1rem' }}>
                        <button
                            onClick={handleDownloadPDF}
                            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1.5rem', backgroundColor: '#ef4444', color: 'white', border: 'none', borderRadius: '8px', fontWeight: '600', cursor: 'pointer', transition: 'all 0.2s' }}
                            onMouseOver={(e) => { e.currentTarget.style.backgroundColor = '#dc2626'; }}
                            onMouseOut={(e) => { e.currentTarget.style.backgroundColor = '#ef4444'; }}
                        >
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"></path>
                                <polyline points="7 10 12 15 17 10"></polyline>
                                <line x1="12" y1="15" x2="12" y2="3"></line>
                            </svg>
                            Download PDF
                        </button>
                    </div>
                </div>

                <div style={{ whiteSpace: 'pre-wrap', lineHeight: '1.8', color: '#1e293b', fontSize: '1.05rem' }}>
                    {resource.summary || 'No summary available.'}
                </div>
            </div>
        </div>
    );
};

export default ResourceSummary;
