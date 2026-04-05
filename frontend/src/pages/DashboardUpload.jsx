import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { resourcesAPI } from '../api/resources';
import { modulesAPI } from '../api/modules';
import { useAuth } from '../context/AuthContext';

const RESOURCE_TYPES = [
    { id: 'lecture_pdf', label: 'Lecture PDF' },
    { id: 'short_note', label: 'Short Note' },
    { id: 'past_paper', label: 'Past Paper' },
    { id: 'yt_link', label: 'YouTube' }
];

const DashboardUpload = () => {
    const { user } = useAuth();
    const navigate = useNavigate();
    const fileInputRef = useRef(null);

    const [modules, setModules] = useState([]);
    const [form, setForm] = useState({
        title: '',
        year: user?.currentYear || 3,
        semester: user?.currentSemester || 2,
        moduleCode: '',
        resourceType: 'lecture_pdf',
        lectureNo: '',
        lectureTitle: '',
        ytLink: '',
    });

    const [tags, setTags] = useState(['Semester 1']);
    const [tagInput, setTagInput] = useState('');

    const [file, setFile] = useState(null);
    const [uploading, setUploading] = useState(false);
    const [uploadMsg, setUploadMsg] = useState('');
    const [uploadError, setUploadError] = useState('');
    const [dragActive, setDragActive] = useState(false);

    useEffect(() => {
        modulesAPI
            .getModules({ year: form.year, semester: form.semester })
            .then(setModules)
            .catch(() => { });
    }, [form.year, form.semester]);

    const handleAddTag = (e) => {
        if (e.key === 'Enter' && tagInput.trim()) {
            e.preventDefault();
            setTags([...tags, tagInput.trim()]);
            setTagInput('');
        }
    };

    const removeTag = (indexToRemove) => {
        setTags(tags.filter((_, index) => index !== indexToRemove));
    };

    const handleDrag = function (e) {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === 'dragenter' || e.type === 'dragover') {
            setDragActive(true);
        } else if (e.type === 'dragleave') {
            setDragActive(false);
        }
    };

    const handleDrop = function (e) {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);
        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            setFile(e.dataTransfer.files[0]);
        }
    };

    const handleUpload = async (e) => {
        e.preventDefault();
        setUploadError('');
        setUploadMsg('');

        // Default system title behavior for backend constraints
        const finalTitle = form.title || form.lectureTitle || form.moduleCode + ' - ' + form.resourceType;

        if (!finalTitle || !form.moduleCode || !form.resourceType) {
            return setUploadError('Module Code, and Resource Type are required.');
        }
        if (form.resourceType === 'lecture_pdf') {
            if (!form.lectureNo) {
                return setUploadError('Lecture No is required for lecture_pdf.');
            }
            const lecNo = parseInt(form.lectureNo, 10);
            if (isNaN(lecNo) || lecNo < 1 || lecNo > 15) {
                return setUploadError('Lecture No must be between 1 and 15.');
            }
        }

        if (form.resourceType !== 'yt_link' && !file) {
            return setUploadError('Please attach and upload a valid file document.');
        }

        if (form.resourceType === 'yt_link' && !form.ytLink) {
            return setUploadError('Please provide a valid YouTube link.');
        }

        const fd = new FormData();
        Object.entries(form).forEach(([k, v]) => v && fd.append(k, v));
        fd.set('title', finalTitle);

        if (file) fd.append('file', file);

        setUploading(true);
        try {
            await resourcesAPI.create(fd);
            setUploadMsg('Resource uploaded successfully!');
            setTimeout(() => {
                navigate('/user-dashboard/resources');
            }, 2000);
        } catch (err) {
            setUploadError(err.message);
        } finally {
            setUploading(false);
        }
    };

    return (
        <div style={{ padding: '0 1rem 2rem 1rem', maxWidth: '1200px', margin: '0 auto', fontFamily: 'Inter, sans-serif' }}>

            <div style={{ marginBottom: '2rem' }}>
                <h1 style={{ fontSize: '28px', fontWeight: 700, color: '#1e293b', margin: '0 0 8px 0' }}>Upload Resource</h1>
                <p style={{ color: '#64748b', margin: 0, fontSize: '15px' }}>Contribute your notes and materials to the academic collective.</p>
            </div>

            {uploadError && <div style={{ padding: '12px', backgroundColor: '#fee2e2', color: '#b91c1c', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #f87171' }}>{uploadError}</div>}
            {uploadMsg && <div style={{ padding: '12px', backgroundColor: '#dcfce3', color: '#15803d', borderRadius: '8px', marginBottom: '1rem', border: '1px solid #4ade80' }}>{uploadMsg}</div>}

            <form onSubmit={handleUpload} style={{ display: 'flex', gap: '2rem', alignItems: 'flex-start', flexWrap: 'wrap' }}>

                {/* Left Column */}
                <div style={{ flex: '1 1 500px', backgroundColor: '#fff', borderRadius: '16px', padding: '2rem', boxShadow: '0 4px 6px -1px rgba(0,0,0,0.05), 0 2px 4px -1px rgba(0,0,0,0.03)' }}>

                    <div style={{ display: 'flex', gap: '1.5rem', marginBottom: '1.5rem' }}>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Academic Year</label>
                            <select style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'auto' }} value={form.year} onChange={e => setForm({ ...form, year: Number(e.target.value), moduleCode: '' })}>
                                {[1, 2, 3, 4].map(y => <option key={y} value={y}>Year {y}</option>)}
                            </select>
                        </div>
                        <div style={{ flex: 1 }}>
                            <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Semester</label>
                            <select style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'auto' }} value={form.semester} onChange={e => setForm({ ...form, semester: Number(e.target.value), moduleCode: '' })}>
                                <option value={1}>Semester 1</option>
                                <option value={2}>Semester 2</option>
                            </select>
                        </div>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Module Code</label>
                        <select style={{ width: '100%', padding: '12px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none', cursor: 'pointer', appearance: 'auto' }} value={form.moduleCode} onChange={e => { setUploadError(''); setForm({ ...form, moduleCode: e.target.value }); }} onInvalid={e => { e.preventDefault(); setUploadError('Please select a Module Code.'); }} required>
                            <option value="">e.g., IT3040</option>
                            {modules.map(m => <option key={m._id} value={m.moduleCode}>{m.moduleCode} - {m.moduleName}</option>)}
                        </select>
                    </div>

                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>Resource Type</label>
                        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                            {RESOURCE_TYPES.map(type => (
                                <button key={type.id} type="button" onClick={() => setForm({ ...form, resourceType: type.id })} style={{ flex: '1 1 100px', padding: '12px', textAlign: 'center', borderRadius: '8px', border: form.resourceType === type.id ? '1px solid #3b82f6' : '1px solid #e2e8f0', backgroundColor: form.resourceType === type.id ? '#eff6ff' : '#fff', color: form.resourceType === type.id ? '#2563eb' : '#64748b', fontSize: '14px', fontWeight: 500, cursor: 'pointer', transition: 'all 0.2s' }}>
                                    {type.label}
                                </button>
                            ))}
                        </div>
                    </div>

                    <div style={{ backgroundColor: '#f8fafc', borderRadius: '12px', padding: '1.5rem', marginBottom: '1.5rem', borderLeft: '4px solid #3b82f6' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '1.25rem', color: '#2563eb', fontWeight: 600, fontSize: '14px' }}>
                            <div style={{ backgroundColor: '#3b82f6', color: '#fff', borderRadius: '50%', width: '20px', height: '20px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold' }}>i</div>
                            Content Identification
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap' }}>
                            {form.resourceType === 'lecture_pdf' && (
                                <div style={{ width: '100px', flexGrow: 0 }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>Lecture No.</label>
                                    <input
                                        type="number"
                                        min="1"
                                        max="15"
                                        value={form.lectureNo}
                                        onChange={e => setForm({ ...form, lectureNo: e.target.value })}
                                        onInvalid={e => {
                                            e.preventDefault();
                                            setUploadError('Lecture No must be between 1 and 15.');
                                        }}
                                        placeholder="05"
                                        style={{ width: '100%', padding: '12px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none' }}
                                        required
                                    />
                                </div>
                            )}
                            {form.resourceType === 'yt_link' ? (
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>YouTube Link</label>
                                    <input type="text" value={form.ytLink} onChange={e => setForm({ ...form, ytLink: e.target.value })} placeholder="https://youtube.com/watch?v=..." style={{ width: '100%', padding: '12px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none' }} required />
                                </div>
                            ) : (
                                <div style={{ flex: 1, minWidth: '200px' }}>
                                    <label style={{ display: 'block', fontSize: '12px', color: '#475569', marginBottom: '8px' }}>{form.resourceType === 'lecture_pdf' ? 'Lecture Title' : 'Title / Description'}</label>
                                    <input type="text" value={form.lectureTitle} onChange={e => setForm({ ...form, lectureTitle: e.target.value })} placeholder={form.resourceType === 'lecture_pdf' ? 'Distributed System Architectures' : 'e.g., Mid-semester past paper 2023'} style={{ width: '100%', padding: '12px 16px', backgroundColor: '#e2e8f0', border: 'none', borderRadius: '8px', color: '#1e293b', fontSize: '14px', outline: 'none' }} />
                                </div>
                            )}
                        </div>
                    </div>

                    <div style={{ marginBottom: '2rem' }}>
                        <label style={{ display: 'block', fontSize: '11px', fontWeight: 600, color: '#64748b', marginBottom: '8px', letterSpacing: '0.05em', textTransform: 'uppercase' }}>TAGS</label>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', padding: '10px 12px', backgroundColor: '#f1f5f9', borderRadius: '8px', minHeight: '44px', alignItems: 'center' }}>
                            {tags.map((tag, i) => (
                                <span key={i} style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', padding: '6px 12px', backgroundColor: '#f3e8ff', color: '#7e22ce', borderRadius: '16px', fontSize: '13px', fontWeight: 600 }}>
                                    {tag}
                                    <button type="button" onClick={() => removeTag(i)} style={{ border: 'none', background: 'transparent', color: '#9333ea', cursor: 'pointer', fontSize: '16px', lineHeight: 1, padding: 0 }}>&times;</button>
                                </span>
                            ))}
                            <input placeholder="Add tag..." value={tagInput} onChange={e => setTagInput(e.target.value)} onKeyDown={handleAddTag} style={{ flex: 1, minWidth: '100px', border: 'none', background: 'transparent', outline: 'none', fontSize: '14px', color: '#1e293b', padding: '2px 4px' }} />
                        </div>
                    </div>

                    <button type="submit" disabled={uploading} style={{ width: '100%', padding: '16px', backgroundColor: '#2563eb', color: '#fff', borderRadius: '8px', border: 'none', fontSize: '16px', fontWeight: 600, cursor: uploading ? 'not-allowed' : 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '10px', transition: 'background-color 0.2s', opacity: uploading ? 0.7 : 1 }}>
                        {uploading ? 'Uploading...' : 'Upload Resource'}
                    </button>
                </div>

                {/* Right Column */}
                <div style={{ flex: '1 1 300px', display: 'flex', flexDirection: 'column', gap: '1.5rem', maxWidth: '400px' }}>

                    {/* File Dropzone */}
                    <div
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                        style={{ border: dragActive ? '2px dashed #3b82f6' : '2px dashed #cbd5e1', borderRadius: '16px', padding: '3rem 2rem', textAlign: 'center', backgroundColor: dragActive ? '#eff6ff' : '#fff', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem', transition: 'all 0.2s' }}
                    >
                        <div style={{ width: '56px', height: '56px', backgroundColor: '#eff6ff', color: '#3b82f6', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            📄
                        </div>
                        <div>
                            <h4 style={{ margin: '0 0 6px 0', fontSize: '18px', fontWeight: 600, color: '#1e293b' }}>Drop your file here</h4>
                            <p style={{ margin: '0', fontSize: '13px', color: '#64748b' }}>PDF, DOCX, or PNG (Max 10MB)</p>
                        </div>

                        <input type="file" ref={fileInputRef} style={{ display: 'none' }} accept=".pdf,application/pdf" onChange={e => { if (e.target.files[0]) setFile(e.target.files[0]) }} />
                        <button type="button" onClick={() => fileInputRef.current?.click()} style={{ padding: '10px 24px', backgroundColor: '#fff', border: '1px solid #3b82f6', color: '#3b82f6', borderRadius: '24px', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s', marginTop: '8px' }}>
                            Browse Files
                        </button>

                        {file && (
                            <div style={{ marginTop: '1rem', width: '100%', display: 'flex', alignItems: 'center', gap: '12px', padding: '12px', backgroundColor: '#fff', borderRadius: '8px', border: '1px solid #e2e8f0', boxShadow: '0 1px 2px rgba(0,0,0,0.05)', textAlign: 'left', boxSizing: 'border-box' }}>
                                <div style={{ width: '36px', height: '36px', backgroundColor: '#fee2e2', color: '#ef4444', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '12px', fontWeight: 'bold', flexShrink: 0 }}>
                                    PDF
                                </div>
                                <div style={{ flex: 1, minWidth: 0 }}>
                                    <p style={{ margin: 0, fontSize: '13px', fontWeight: 600, color: '#1e293b', whiteSpace: 'nowrap', textOverflow: 'ellipsis', overflow: 'hidden' }}>{file.name}</p>
                                    <p style={{ margin: 0, fontSize: '11px', color: '#64748b' }}>{(file.size / 1024 / 1024).toFixed(2)}MB • Selected</p>
                                </div>
                                <button type="button" onClick={(e) => { e.stopPropagation(); setFile(null); if (fileInputRef.current) fileInputRef.current.value = ''; }} style={{ border: 'none', background: 'transparent', color: '#94a3b8', cursor: 'pointer', padding: '4px', flexShrink: 0 }}>
                                    X
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Contributor Perks */}
                    <div style={{ backgroundColor: '#f3e8ff', borderRadius: '16px', padding: '1.5rem', border: 'none' }}>
                        <h4 style={{ margin: '0 0 12px 0', display: 'flex', alignItems: 'center', gap: '8px', color: '#1e293b', fontSize: '16px', fontWeight: 600 }}>
                            <span style={{ fontSize: '18px' }}>✨</span> Contributor Perks
                        </h4>
                        <p style={{ margin: '0 0 1.5rem 0', fontSize: '13.5px', color: '#4c1d95', lineHeight: '1.6' }}>
                            High-quality resources earn you "Hub Credits" which can be used to unlock premium mock exam papers and editorial reviews.
                        </p>
                        <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '13px', fontWeight: 600, color: '#4c1d95', marginBottom: '10px' }}>
                            <span>Weekly Goal</span>
                            <span>2/3 Uploads</span>
                        </div>
                        <div style={{ height: '8px', backgroundColor: '#d8b4fe', borderRadius: '4px', overflow: 'hidden' }}>
                            <div style={{ width: '66%', height: '100%', backgroundColor: '#7e22ce', borderRadius: '4px' }}></div>
                        </div>
                    </div>

                </div>
            </form>
        </div>
    );
};

export default DashboardUpload;
