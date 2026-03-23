import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import { studyPlansAPI } from '../api/studyPlans';

// Import icons for the modal form from assets
import settingsIcon from '../assets/settings-icon.png';
import warningIcon from '../assets/warning-icon.png';
import infoIcon from '../assets/info-icon.png';
import sparklesIcon from '../assets/sparkles-icon.png';
import loadingIcon from '../assets/loading-icon.png';
import docsIcon from '../assets/docs-icon.png';
import timerIcon from '../assets/timer-icon.png';

// Import icons for the main page
import deleteIcon from '../assets/delete-icon.png';
import calendarIcon from '../assets/calendar-icon.png';
import clipboardIcon from '../assets/clipboard-icon.png';
import scheduleIcon from '../assets/schedule-icon.png';
import booksIcon from '../assets/books-icon.png';

// ─── Circular Progress Ring ────────────────────────────────────────────────────
const CircleProgress = ({ percent = 0, size = 110, stroke = 9 }) => {
  const r = (size - stroke) / 2;
  const circ = 2 * Math.PI * r;
  const offset = circ - (percent / 100) * circ;
  return (
    <svg width={size} height={size} style={{ transform: 'rotate(-90deg)' }}>
      <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(255,255,255,0.2)" strokeWidth={stroke} />
      <circle
        cx={size / 2} cy={size / 2} r={r} fill="none"
        stroke="white" strokeWidth={stroke}
        strokeDasharray={circ} strokeDashoffset={offset}
        strokeLinecap="round"
        style={{ transition: 'stroke-dashoffset 0.6s ease' }}
      />
      <text
        x="50%" y="50%"
        textAnchor="middle" dominantBaseline="central"
        style={{ transform: 'rotate(90deg)', transformOrigin: '50% 50%', fill: 'white', fontSize: 20, fontWeight: 700 }}
      >
        {percent}%
      </text>
    </svg>
  );
};

// ─── Exam countdown color ──────────────────────────────────────────────────────
const countdownColor = (days) => {
  if (days <= 2) return '#FC5C65';
  if (days <= 7) return '#FF9F43';
  return '#2ecc71';
};

// ─── Day card component ────────────────────────────────────────────────────────
const DayCard = ({ day, idx, planId, onToggle }) => {
  const [toggling, setToggling] = useState(false);

  const handleToggle = async () => {
    setToggling(true);
    await onToggle(planId, idx, !day.completed);
    setToggling(false);
  };

  return (
    <div style={{
      display: 'flex', gap: 16, padding: '16px 0',
      borderBottom: '1px solid #3882F6',
      opacity: toggling ? 0.6 : 1,
      transition: 'opacity 0.2s',
    }}>
      {/* Stepper circle */}
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', flexShrink: 0 }}>
        <div style={{
          width: 40, height: 40, borderRadius: '50%',
          background: day.completed ? '#3882F6' : 'rgba(56,130,246,0.12)',
          color: day.completed ? 'white' : '#3882F6',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontWeight: 700, fontSize: 14, flexShrink: 0,
          boxShadow: day.completed ? '0 4px 12px rgba(56,130,246,0.35)' : 'none',
          transition: 'all 0.3s',
        }}>
          {day.completed ? '✓' : `D${day.day}`}
        </div>
        {/* connector line */}
        <div style={{ width: 2, flex: 1, minHeight: 16, background: 'rgba(56,130,246,0.2)', marginTop: 4 }} />
      </div>

      {/* Content */}
      <div style={{ flex: 1, paddingBottom: 8 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
          <div>
            <span style={{
              fontWeight: 700, fontSize: 15,
              color: day.completed ? '#3882F6' : '#2D2D2D',
              textDecoration: day.completed ? 'line-through' : 'none',
              transition: 'all 0.3s',
            }}>
              Day {day.day}
            </span>
            {day.date && (
              <span style={{ fontSize: 12, color: '#8B8B8B', marginLeft: 8, display: 'inline-flex', alignItems: 'center', gap: 4 }}>
                <img src={calendarIcon} alt="Date" style={{ width: 12, height: 12, objectFit: 'contain', opacity: 0.6 }} /> {day.date}
              </span>
            )}
          </div>
          <button
            onClick={handleToggle}
            disabled={toggling}
            style={{
              padding: '5px 14px', borderRadius: 20, fontSize: 12, fontWeight: 600, cursor: 'pointer',
              border: day.completed ? '1.5px solid #3882F6' : '1.5px solid #D0D0D0',
              background: day.completed ? '#3882F6' : 'white',
              color: day.completed ? 'white' : '#3882F6',
              transition: 'all 0.3s',
              whiteSpace: 'nowrap',
            }}
          >
            {toggling ? '...' : day.completed ? '✓ Done' : 'Mark Done'}
          </button>
        </div>

        {/* Topic chips */}
        {day.topics && day.topics.length > 0 && (
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {day.topics.map((t, i) => (
              <span key={i} style={{
                background: day.completed ? 'rgba(56,130,246,0.10)' : '#FAFAFA',
                color: day.completed ? '#3882F6' : '#4A4A4A',
                border: `1px solid ${day.completed ? '#C5C7D9' : '#E8E8E8'}`,
                borderRadius: 8, padding: '3px 10px', fontSize: 12,
                transition: 'all 0.3s',
              }}>
                {t}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Plan History Sidebar Item ─────────────────────────────────────────────────
const PlanSidebarItem = ({ plan, active, onClick, onDelete }) => {
  const [deleting, setDeleting] = useState(false);
  const daysLeft = Math.max(0, Math.ceil((new Date(plan.examDate) - new Date()) / 86400000));

  const handleDelete = async (e) => {
    e.stopPropagation();
    if (!window.confirm('Delete this study plan?')) return;
    setDeleting(true);
    await onDelete(plan._id);
    setDeleting(false);
  };

  return (
    <div
      onClick={onClick}
      style={{
        padding: '14px 16px', borderRadius: 10, cursor: 'pointer', marginBottom: 8,
        background: active ? '#3882F6' : 'white',
        color: active ? 'white' : '#2D2D2D',
        border: active ? 'none' : '1px solid #E8E8E8',
        boxShadow: active ? '0 4px 14px rgba(56,130,246,0.35)' : '0 1px 4px rgba(0,0,0,0.04)',
        transition: 'all 0.25s',
        opacity: deleting ? 0.5 : 1,
        position: 'relative',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 700, fontSize: 14, marginBottom: 2 }}>{plan.moduleCode}</div>
          <div style={{ fontSize: 11, opacity: 0.7, marginBottom: 6 }}>
            Lec {plan.lectureFrom}–{plan.lectureTo} · {daysLeft}d to exam
          </div>
          {/* Mini progress bar */}
          <div style={{ height: 4, background: active ? 'rgba(255,255,255,0.25)' : 'rgba(56,130,246,0.15)', borderRadius: 2, overflow: 'hidden' }}>
            <div style={{
              height: '100%', borderRadius: 2,
              width: `${plan.completionPercent}%`,
              background: active ? 'white' : '#3882F6',
              transition: 'width 0.4s',
            }} />
          </div>
          <div style={{ fontSize: 10, marginTop: 3, opacity: 0.7 }}>{plan.completionPercent}% complete</div>
        </div>
        <button
          onClick={handleDelete}
          disabled={deleting}
          title="Delete plan"
          style={{
            background: 'transparent', border: 'none', cursor: 'pointer',
            padding: '4px', marginLeft: 6, flexShrink: 0,
            borderRadius: 4,
            transition: 'opacity 0.2s',
            opacity: active ? (deleting ? 0.4 : 0.8) : (deleting ? 0.3 : 0.5),
            display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}
        >
          <img src={deleteIcon} alt="Delete" style={{ width: 14, height: 14, objectFit: 'contain', filter: active ? 'brightness(0) invert(1)' : 'none' }} />
        </button>
      </div>
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────────────────────────
const DashboardStudyPlan = () => {
  const { user } = useAuth();

  // Form state
  const [year, setYear] = useState(user?.currentYear || 3);
  const [semester, setSemester] = useState(user?.currentSemester || 1);
  const [moduleCode, setModuleCode] = useState('');
  const [targetLecture, setTargetLecture] = useState(12);
  const [examDate, setExamDate] = useState('');
  const [dailyCommitment, setDailyCommitment] = useState(4.5);

  // Module / lecture data
  const [modules, setModules] = useState([]);
  const [availableLectures, setAvailableLectures] = useState([]);
  const [missingLectures, setMissingLectures] = useState([]);
  const [totalLectures, setTotalLectures] = useState(0);
  const [analyzedDocs, setAnalyzedDocs] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);

  // Plans
  const [allPlans, setAllPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);

  // UI state
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [showForm, setShowForm] = useState(false);

  // ── Fetch all plans ──────────────────────────────────────────────────────────
  const fetchAllPlans = useCallback(async () => {
    try {
      const data = await studyPlansAPI.getAll();
      setAllPlans(data);
      // Auto-select most recent plan if none active
      if (data.length > 0 && !activePlan) {
        setActivePlan(data[0]);
        setShowForm(false);
      }
    } catch (_) { }
  }, []); // eslint-disable-line

  useEffect(() => { fetchAllPlans(); }, [fetchAllPlans]);

  // ── Fetch modules when year/semester changes ─────────────────────────────────
  useEffect(() => {
    const fetchModules = async () => {
      try {
        const [moduleDocs, lectureResources] = await Promise.all([
          modulesAPI.getModules({ year, semester }).catch(() => []),
          resourcesAPI.getAll({ year, semester, resourceType: 'lecture_pdf' }).catch(() => []),
        ]);
        const merged = new Map();
        moduleDocs.forEach((m) => merged.set(m.moduleCode, { _id: m._id, moduleCode: m.moduleCode, moduleName: m.moduleName }));
        lectureResources.forEach((r) => {
          if (!r.moduleCode || merged.has(r.moduleCode)) return;
          merged.set(r.moduleCode, { _id: r.moduleCode, moduleCode: r.moduleCode, moduleName: '(from uploaded resources)' });
        });
        const sorted = Array.from(merged.values()).sort((a, b) => a.moduleCode.localeCompare(b.moduleCode));
        setModules(sorted);
        setModuleCode('');
        setAvailableLectures([]);
        setMissingLectures([]);
        setAnalyzedDocs(0);
        setTotalLectures(0);
      } catch (err) {
        console.error('Error fetching modules:', err);
      }
    };
    fetchModules();
  }, [year, semester]);

  // ── Fetch lectures when module changes ───────────────────────────────────────
  useEffect(() => {
    if (!moduleCode) return;
    const fetch = async () => {
      try {
        setLoading(true);
        const resources = await resourcesAPI.getAll({ year, semester, moduleCode, resourceType: 'lecture_pdf' });
        const lectureNos = resources.map((r) => r.lectureNo).filter(Boolean);
        setAvailableLectures(lectureNos);
        setAnalyzedDocs(resources.length);
        const maxLecture = Math.max(...lectureNos, 15);
        setTotalLectures(maxLecture);
        setTargetLecture(Math.min(12, maxLecture));
        const allNos = Array.from({ length: maxLecture }, (_, i) => i + 1);
        setMissingLectures(allNos.filter((n) => !lectureNos.includes(n)));
        setTotalSessions(lectureNos.length * 2);
      } catch (_) { }
      finally { setLoading(false); }
    };
    fetch();
  }, [moduleCode, year, semester]);

  // ── Generate handler ─────────────────────────────────────────────────────────
  const handleGeneratePlan = async () => {
    setError(''); setSuccess('');
    if (!moduleCode) return setError('Please select a module');
    if (!examDate) return setError('Please select an examination date');
    if (targetLecture < 1) return setError('Target lecture must be at least 1');

    const targetRange = Array.from({ length: targetLecture }, (_, i) => i + 1);
    const missingInRange = targetRange.filter((n) => !availableLectures.includes(n));
    if (missingInRange.length > 0) return setError(`Missing lectures: ${missingInRange.join(', ')}`);

    try {
      setGenerating(true);
      const newPlan = await studyPlansAPI.generate({ year, semester, moduleCode, lectureFrom: 1, lectureTo: targetLecture, examDate });
      setActivePlan(newPlan);
      setShowForm(false);
      await fetchAllPlans();
      setSuccess('');
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate study plan');
    } finally {
      setGenerating(false);
    }
  };

  // ── Toggle day progress ──────────────────────────────────────────────────────
  const handleToggleDay = async (planId, dayIndex, completed) => {
    try {
      const result = await studyPlansAPI.updateProgress(planId, { dayIndex, completed });
      const updatedPlan = { ...activePlan, days: result.days, completionPercent: result.completionPercent };
      setActivePlan(updatedPlan);
      setAllPlans((prev) => prev.map((p) => p._id === planId ? { ...p, days: result.days, completionPercent: result.completionPercent } : p));
    } catch (_) { }
  };

  // ── Delete plan ──────────────────────────────────────────────────────────────
  const handleDeletePlan = async (planId) => {
    try {
      await studyPlansAPI.delete(planId);
      const remaining = allPlans.filter((p) => p._id !== planId);
      setAllPlans(remaining);
      if (activePlan?._id === planId) {
        setActivePlan(remaining[0] || null);
        if (remaining.length === 0) setShowForm(true);
      }
    } catch (_) { }
  };

  // ── Derived values ───────────────────────────────────────────────────────────
  const missingInRange = missingLectures.filter((n) => n <= targetLecture);
  const daysLeft = activePlan
    ? Math.max(0, Math.ceil((new Date(activePlan.examDate) - new Date()) / 86400000))
    : null;
  const doneDays = activePlan ? (activePlan.days || []).filter((d) => d.completed).length : 0;
  const totalDays = activePlan ? (activePlan.days || []).length : 0;

  return (
    <div>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: '1.75rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '2.2rem', fontWeight: 700, color: '#2D2D2D', margin: 0 }}>
            Craft Your <span style={{ color: '#3882F6' }}>Academic Pathway</span>
          </h1>
          <p style={{ fontSize: '0.95rem', color: '#6B6B6B', margin: '6px 0 0' }}>
            AI-powered study schedules tailored to your course load and exam targets.
          </p>
        </div>
        <button
          onClick={() => setShowForm(true)}
          style={{
            padding: '10px 24px', borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: 'pointer',
            background: '#3882F6', color: 'white', border: 'none',
            boxShadow: '0 4px 12px rgba(56,130,246,0.35)',
            transition: 'all 0.25s',
          }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          + New Plan
        </button>
      </div>

      {/* ── Modal Popup Form ─────────────────────────────────────────────────── */}
      {showForm && (
        <div
          onClick={() => setShowForm(false)}
          style={{
            position: 'fixed', inset: 0, zIndex: 1000,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            backdropFilter: 'blur(4px)',
            animation: 'modalBackdropIn 0.25s ease',
          }}
        >
          <div
            onClick={e => e.stopPropagation()}
            style={{
              background: 'white', borderRadius: 20, padding: '32px 36px',
              width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
              position: 'relative',
              animation: 'modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
            }}
          >
            {/* Close X */}
            <button
              onClick={() => setShowForm(false)}
              style={{
                position: 'absolute', top: 16, right: 16,
                background: '#F5F6FA', border: 'none', borderRadius: '50%',
                width: 32, height: 32, fontSize: 16, cursor: 'pointer',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                color: '#8B8B8B', transition: 'background 0.2s',
              }}
              onMouseEnter={e => { e.currentTarget.style.background = '#E8E8E8'; }}
              onMouseLeave={e => { e.currentTarget.style.background = '#F5F6FA'; }}
            >✕</button>

            <h3 style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: '1.5rem', marginTop: 0 }}>
              <img src={settingsIcon} alt="Settings" style={{ width: 24, height: 24, objectFit: 'contain' }} /> Plan Parameters
            </h3>
            {error && <div className="alert alert-error" style={{ marginBottom: '1rem' }}>{error}</div>}

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#8B8B8B', fontWeight: 600 }}>Academic Level</label>
                <select
                  value={`${year}-${semester}`}
                  onChange={(e) => { const [y, s] = e.target.value.split('-'); setYear(Number(y)); setSemester(Number(s)); setModuleCode(''); }}
                  style={{ background: '#F5F6FA', border: 'none' }}
                >
                  {[1, 2, 3, 4].map((y) => [1, 2].map((s) => (
                    <option key={`${y}-${s}`} value={`${y}-${s}`}>Year {y} | Semester {s}</option>
                  )))}
                </select>
              </div>

              <div className="form-group">
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#8B8B8B', fontWeight: 600 }}>Module Code</label>
                <select
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                  style={{ background: '#F5F6FA', border: 'none' }}
                  disabled={loading || modules.length === 0}
                >
                  <option value="">{loading ? 'Loading…' : modules.length === 0 ? 'No modules available' : 'Select Module'}</option>
                  {modules.map((m) => (
                    <option key={m._id} value={m.moduleCode}>{m.moduleCode} – {m.moduleName}</option>
                  ))}
                </select>
                {modules.length === 0 && !loading && (
                  <p style={{ fontSize: 11, color: '#FC5C65', marginTop: 4 }}>No modules found for Year {year}, Semester {semester}</p>
                )}
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 16 }}>
              <div className="form-group">
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#8B8B8B', fontWeight: 600 }}>Target Lecture</label>
                <div style={{ position: 'relative' }}>
                  <input type="number" value={targetLecture} onChange={(e) => setTargetLecture(Number(e.target.value))} min="1" max={totalLectures} style={{ background: '#F5F6FA', border: 'none', paddingRight: 70 }} />
                  <span style={{ position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)', fontSize: 12, color: '#8B8B8B' }}>/ {totalLectures} Total</span>
                </div>
              </div>
              <div className="form-group">
                <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#8B8B8B', fontWeight: 600 }}>Examination Date</label>
                <input type="date" value={examDate} onChange={(e) => setExamDate(e.target.value)} style={{ background: '#F5F6FA', border: 'none' }} min={new Date().toISOString().split('T')[0]} />
              </div>
            </div>

            <div className="form-group" style={{ marginBottom: '1.5rem' }}>
              <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#8B8B8B', fontWeight: 600, display: 'block', marginBottom: 8 }}>
                Daily Study Commitment — <span style={{ color: '#3882F6', fontWeight: 700 }}>{dailyCommitment} hrs/day</span>
              </label>
              <input type="range" min="1" max="12" step="0.5" value={dailyCommitment} onChange={(e) => setDailyCommitment(Number(e.target.value))} style={{ width: '100%', accentColor: '#3882F6' }} />
            </div>

            {missingInRange.length > 0 && (
              <div style={{ background: '#FFF5F5', border: '1.5px solid #FC5C65', borderRadius: 10, padding: '12px 16px', marginBottom: 16, display: 'flex', gap: 10, alignItems: 'flex-start' }}>
                <img src={warningIcon} alt="Warning" style={{ width: 24, height: 24, objectFit: 'contain', flexShrink: 0 }} />
                <div>
                  <strong style={{ color: '#FC5C65', fontSize: 14 }}>Content Gap Detected</strong>
                  <p style={{ fontSize: 13, color: '#6B6B6B', margin: '4px 0 0' }}>Lectures {missingInRange.join(', ')} are missing. Upload them first.</p>
                </div>
              </div>
            )}

            {/* Info note */}
            <div style={{ background: 'rgba(56,130,246,0.08)', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#3882F6' }}>
              <img src={infoIcon} alt="Info" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0, marginTop: 1 }} />
              <span>Study plans are only generated from uploaded lecture PDFs and short notes. Ensure all relevant materials are present in the Resources section before proceeding.</span>
            </div>

            <div style={{ display: 'flex', gap: 12, alignItems: 'center', flexWrap: 'wrap' }}>
              <button
                onClick={handleGeneratePlan}
                disabled={generating || !moduleCode || !examDate || missingInRange.length > 0}
                style={{
                  padding: '12px 28px', borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: '#3882F6', color: 'white',
                  opacity: (generating || !moduleCode || !examDate || missingInRange.length > 0) ? 0.5 : 1,
                  boxShadow: '0 4px 12px rgba(56,130,246,0.35)',
                  transition: 'all 0.25s', display: 'flex', alignItems: 'center', gap: 8,
                }}
                onMouseEnter={e => { if (!(generating || !moduleCode || !examDate || missingInRange.length > 0)) e.currentTarget.style.transform = 'translateY(-2px)'; }}
                onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
              >
                {generating ? <><img src={loadingIcon} alt="Loading..." style={{ width: 16, height: 16, objectFit: 'contain', animation: 'spin 1s linear infinite' }} /> Generating…</> : <><img src={sparklesIcon} alt="Sparkles" style={{ width: 16, height: 16, objectFit: 'contain' }} /> Generate Plan</>}
              </button>
              <div style={{ display: 'flex', gap: 20, fontSize: 13, color: '#6B6B6B' }}>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><img src={docsIcon} alt="Docs" style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.6 }} /> {analyzedDocs} docs analyzed</span>
                <span style={{ display: 'flex', alignItems: 'center', gap: 6 }}><img src={timerIcon} alt="Time" style={{ width: 14, height: 14, objectFit: 'contain', opacity: 0.6 }} /> ~{totalSessions} study sessions</span>
              </div>
            </div>
          </div>
        </div>
      )}


      {/* ── Plan Viewer ───────────────────────────────────────────────────────── */}
      {(activePlan || allPlans.length > 0) && (
        <div style={{ display: 'grid', gridTemplateColumns: '280px 1fr', gap: 24, alignItems: 'start' }}>

          {/* ── Left: Plan History Sidebar ──────────────────────────────────── */}
          <div>
            <div style={{ fontWeight: 700, fontSize: 13, color: '#8B8B8B', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
              My Plans ({allPlans.length})
            </div>
            {allPlans.map((plan) => (
              <PlanSidebarItem
                key={plan._id}
                plan={plan}
                active={activePlan?._id === plan._id}
                onClick={() => { setActivePlan(plan); setShowForm(false); }}
                onDelete={handleDeletePlan}
              />
            ))}
            {allPlans.length === 0 && (
              <div style={{ fontSize: 13, color: '#8B8B8B', textAlign: 'center', padding: '20px 0' }}>No plans yet</div>
            )}
          </div>

          {/* ── Right: Active Plan Detail ──────────────────────────────────── */}
          {activePlan && (
            <div>
              {/* Hero Banner */}
              <div style={{
                background: '#3882F6',
                borderRadius: 16, padding: '28px 32px', color: 'white',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                flexWrap: 'wrap', gap: 20, marginBottom: 20,
                boxShadow: '0 8px 32px rgba(56,130,246,0.35)',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
                    <span style={{ fontSize: 28, fontWeight: 800, letterSpacing: -0.5 }}>{activePlan.moduleCode}</span>
                    <span style={{
                      background: 'rgba(255,255,255,0.2)', borderRadius: 20, padding: '3px 12px', fontSize: 12, fontWeight: 600,
                    }}>Lec {activePlan.lectureFrom} → {activePlan.lectureTo}</span>
                  </div>
                  <div style={{ opacity: 0.85, fontSize: 14, marginBottom: 16 }}>
                    Year {activePlan.year} · Semester {activePlan.semester}
                  </div>

                  {/* Countdown pill */}
                  <div style={{
                    display: 'inline-flex', alignItems: 'center', gap: 8,
                    background: 'rgba(255,255,255,0.15)', borderRadius: 12, padding: '8px 18px',
                    backdropFilter: 'blur(6px)',
                  }}>
                    <img src={calendarIcon} alt="Exam" style={{ width: 22, height: 22, objectFit: 'contain', filter: 'brightness(0) invert(1)' }} />
                    <div>
                      <div style={{ fontSize: 22, fontWeight: 800, lineHeight: 1, color: countdownColor(daysLeft) === '#2ecc71' ? 'white' : countdownColor(daysLeft) }}>
                        {daysLeft} {daysLeft === 1 ? 'day' : 'days'}
                      </div>
                      <div style={{ fontSize: 11, opacity: 0.75 }}>until exam</div>
                    </div>
                  </div>
                </div>

                {/* Circular progress */}
                <div style={{ textAlign: 'center' }}>
                  <CircleProgress percent={activePlan.completionPercent} />
                  <div style={{ fontSize: 12, opacity: 0.8, marginTop: 6 }}>Completion</div>
                </div>
              </div>



              {/* AI Summary */}
              {activePlan.planJson?.summary && (
                <div style={{ background: 'rgba(56,130,246,0.10)', borderLeft: '4px solid #3882F6', borderRadius: 8, padding: '12px 16px', marginBottom: 20, fontSize: 14, color: '#3882F6', display: 'flex', gap: 8, alignItems: 'flex-start' }}>
                  <img src={clipboardIcon} alt="Summary" style={{ width: 16, height: 16, objectFit: 'contain', flexShrink: 0, marginTop: 2 }} />
                  <span>{activePlan.planJson.summary}</span>
                </div>
              )}

              {/* Day-by-Day Timeline */}
              <div className="card" style={{ paddingTop: 20 }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 }}>
                  <h3 style={{ margin: 0, display: 'flex', alignItems: 'center', gap: 8 }}>
                    <img src={scheduleIcon} alt="Schedule" style={{ width: 20, height: 20, objectFit: 'contain' }} /> Day-by-Day Schedule
                  </h3>
                  <span style={{ fontSize: 13, color: '#8B8B8B' }}>{doneDays}/{totalDays} days complete</span>
                </div>
                {/* Overall progress bar */}
                <div style={{ height: 6, background: 'rgba(56,130,246,0.15)', borderRadius: 3, overflow: 'hidden', marginBottom: 20 }}>
                  <div style={{
                    height: '100%', borderRadius: 3,
                    width: `${activePlan.completionPercent}%`,
                    background: '#3882F6',
                    transition: 'width 0.6s ease',
                  }} />
                </div>

                {(activePlan.days || []).length === 0 ? (
                  <div style={{ textAlign: 'center', color: '#8B8B8B', padding: '24px 0', fontSize: 14 }}>
                    No day schedule available.
                  </div>
                ) : (
                  (activePlan.days || []).map((day, idx) => (
                    <DayCard key={idx} day={day} idx={idx} planId={activePlan._id} onToggle={handleToggleDay} />
                  ))
                )}
              </div>
            </div>
          )}
        </div>
      )}

      {/* Empty state if no plans yet and form is closed */}
      {!activePlan && allPlans.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '60px 20px', color: '#8B8B8B' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 16 }}>
            <img src={booksIcon} alt="Books" style={{ width: 56, height: 56, objectFit: 'contain', opacity: 0.4 }} />
          </div>
          <div style={{ fontSize: 18, fontWeight: 600, color: '#2D2D2D', marginBottom: 8 }}>No Study Plans Yet</div>
          <p style={{ fontSize: 14 }}>Click <strong>+ New Plan</strong> to generate your first AI-powered study schedule.</p>
        </div>
      )}

      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes modalBackdropIn { from { opacity: 0; } to { opacity: 1; } }
        @keyframes modalIn {
          from { opacity: 0; transform: scale(0.88) translateY(24px); }
          to   { opacity: 1; transform: scale(1)    translateY(0); }
        }
        .alert { padding: 10px 14px; border-radius: 8px; font-size: 14px; margin-bottom: 12px; }
        .alert-error { background: #FFF5F5; color: #FC5C65; border: 1px solid #FFCDD2; }
        .alert-success { background: #F0FFF4; color: #2ecc71; border: 1px solid #c3f3d1; }
      `}</style>
    </div>
  );
};

export default DashboardStudyPlan;
