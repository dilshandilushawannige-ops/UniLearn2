import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import { studyPlansAPI } from '../api/studyPlans';

const StudyPlan = () => {
  const { user } = useAuth();

  // ── Form state ─────────────────────────────────────────────────────────────
  const [year, setYear] = useState(user?.currentYear || '');
  const [semester, setSemester] = useState(user?.currentSemester || 1);
  const [moduleCode, setModuleCode] = useState('');
  const [lectureFrom, setLectureFrom] = useState('');
  const [lectureTo, setLectureTo] = useState('');
  const [examDate, setExamDate] = useState('');

  const [moduleOptions, setModuleOptions] = useState([]);
  const [availableLectures, setAvailableLectures] = useState([]);

  // ── Plans list ─────────────────────────────────────────────────────────────
  const [plans, setPlans] = useState([]);
  const [selectedPlan, setSelectedPlan] = useState(null);

  // ── UI state ───────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');
  const [loading, setLoading] = useState(false);

  // Keep form in sync with the logged-in student's profile.
  useEffect(() => {
    if (user?.currentYear) setYear(user.currentYear);
    if (user?.currentSemester) setSemester(user.currentSemester);
  }, [user?.currentYear, user?.currentSemester]);

  // Build module options from both module master data and uploaded lecture resources.
  useEffect(() => {
    if (!year || !semester) {
      setModuleOptions([]);
      return;
    }
    Promise.all([
      modulesAPI.getModules({ year, semester }).catch(() => []),
      resourcesAPI.getAll({ year, semester, resourceType: 'lecture_pdf' }).catch(() => []),
    ]).then(([mods, lectureResources]) => {
      const merged = new Map();

      mods.forEach((m) => {
        merged.set(m.moduleCode, {
          moduleCode: m.moduleCode,
          label: `${m.moduleCode} - ${m.moduleName}`,
        });
      });

      lectureResources.forEach((r) => {
        if (!r.moduleCode || merged.has(r.moduleCode)) return;
        merged.set(r.moduleCode, {
          moduleCode: r.moduleCode,
          label: `${r.moduleCode} (from uploaded resources)`,
        });
      });

      setModuleOptions(Array.from(merged.values()).sort((a, b) => a.moduleCode.localeCompare(b.moduleCode)));
    });
    setModuleCode('');
  }, [year, semester]);

  // Fetch available lecture PDFs for chosen module
  useEffect(() => {
    if (!moduleCode) { setAvailableLectures([]); return; }
    resourcesAPI.getAll({ year, semester, moduleCode, resourceType: 'lecture_pdf' })
      .then((data) => setAvailableLectures(data.sort((a, b) => a.lectureNo - b.lectureNo)))
      .catch(() => {});
  }, [moduleCode, year, semester]);

  // Fetch user study plans
  const fetchPlans = useCallback(async () => {
    setLoading(true);
    try {
      const data = await studyPlansAPI.getAll(moduleCode ? { moduleCode } : {});
      setPlans(data);
    } catch (_) {}
    setLoading(false);
  }, [moduleCode]);

  useEffect(() => { fetchPlans(); }, [fetchPlans]);

  // ── Today string for min date ──────────────────────────────────────────────
  const todayStr = new Date().toISOString().split('T')[0];

  // ── Generate handler ───────────────────────────────────────────────────────
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!year || !moduleCode || !lectureFrom || !lectureTo || !examDate) {
      return setError('Please fill all fields before generating.');
    }
    if (Number(lectureFrom) > Number(lectureTo)) {
      return setError('Lecture From cannot be greater than Lecture To.');
    }
    setGenerating(true);
    try {
      const plan = await studyPlansAPI.generate({ year, semester, moduleCode, lectureFrom: Number(lectureFrom), lectureTo: Number(lectureTo), examDate });
      setSelectedPlan(plan);
      setInfo('Study plan generated successfully!');
      fetchPlans();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Progress toggle ────────────────────────────────────────────────────────
  const toggleDay = async (idx) => {
    if (!selectedPlan) return;
    const updatedDays = selectedPlan.days.map((d, i) => ({ ...d, completed: i === idx ? !d.completed : d.completed }));
    const completedDays = updatedDays.map((d, i) => d.completed ? i : null).filter(i => i !== null);
    try {
      const result = await studyPlansAPI.updateProgress(selectedPlan._id, { completedDays });
      setSelectedPlan({ ...selectedPlan, days: result.days, completionPercent: result.completionPercent });
    } catch (_) {}
  };

  // Days remaining until exam
  const daysLeft = selectedPlan
    ? Math.max(0, Math.ceil((new Date(selectedPlan.examDate) - new Date()) / (1000 * 60 * 60 * 24)))
    : null;

  return (
    <div className="page">
      <h1 className="page-title">🗓️ Study Plan Generator</h1>

      {/* ── Generate Form ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Generate a New Study Plan</h3>
        {error && <div className="alert alert-error">{error}</div>}
        {info && <div className="alert alert-success">{info}</div>}
        <form onSubmit={handleGenerate}>
          <div className="form-row">
            <div className="form-group">
              <label>Year</label>
              <input value={year ? `Year ${year}` : ''} readOnly placeholder="Loading year..." />
            </div>
            <div className="form-group">
              <label>Semester</label>
              <select value={semester} onChange={e => setSemester(Number(e.target.value))}>
                <option value={1}>Semester 1</option>
                <option value={2}>Semester 2</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label>Module</label>
            <select value={moduleCode} onChange={e => setModuleCode(e.target.value)}>
              <option value="">-- Select Module --</option>
              {moduleOptions.map(m => <option key={m.moduleCode} value={m.moduleCode}>{m.label}</option>)}
            </select>
          </div>

          {moduleCode && availableLectures.length > 0 && (
            <div className="alert alert-info" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              Available lectures: {availableLectures.map(l => `Lec ${l.lectureNo}${l.lectureTitle ? ' (' + l.lectureTitle + ')' : ''}`).join(' · ')}
            </div>
          )}
          {moduleCode && availableLectures.length === 0 && (
            <div className="alert alert-error" style={{ padding: '0.5rem 0.75rem', fontSize: '0.85rem' }}>
              No lecture PDFs uploaded for this module yet. Upload lecture PDFs first.
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Lecture From</label>
              <input type="number" min="1" value={lectureFrom} onChange={e => setLectureFrom(e.target.value)} placeholder="e.g. 1" />
            </div>
            <div className="form-group">
              <label>Lecture To</label>
              <input type="number" min="1" value={lectureTo} onChange={e => setLectureTo(e.target.value)} placeholder="e.g. 5" />
            </div>
          </div>
          <div className="form-group">
            <label>Exam Date</label>
            <input type="date" min={todayStr} value={examDate} onChange={e => setExamDate(e.target.value)} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? '⏳ Generating with Gemini AI…' : '✨ Generate Study Plan'}
          </button>
        </form>
      </div>

      {/* ── Active Plan View ──────────────────────────────────────────────── */}
      {selectedPlan && (
        <div className="section">
          <div className="section-title">Your Study Plan</div>
          <div className="card" style={{ marginBottom: '0.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <strong>{selectedPlan.moduleCode}</strong>
                <span style={{ color: '#6b7280', marginLeft: '0.75rem', fontSize: '0.9rem' }}>
                  Lectures {selectedPlan.lectureFrom}–{selectedPlan.lectureTo}
                </span>
              </div>
              <div style={{ textAlign: 'right' }}>
                <span style={{ color: daysLeft <= 2 ? '#ef4444' : '#4f46e5', fontWeight: 700 }}>
                  {daysLeft} day{daysLeft !== 1 ? 's' : ''} until exam
                </span>
              </div>
            </div>
            <div className="progress-bar-wrap" style={{ marginTop: '0.75rem' }}>
              <div className="progress-bar-fill" style={{ width: `${selectedPlan.completionPercent}%` }} />
            </div>
            <div style={{ fontSize: '0.85rem', color: '#6b7280' }}>{selectedPlan.completionPercent}% complete</div>
          </div>

          {selectedPlan.planJson?.summary && (
            <div className="alert alert-info" style={{ fontSize: '0.9rem' }}>
              📋 {selectedPlan.planJson.summary}
            </div>
          )}

          {(selectedPlan.days || []).map((day, idx) => (
            <div key={idx} className={`day-card ${day.completed ? 'completed' : ''}`}>
              <div className="day-header">
                <input type="checkbox" checked={day.completed} onChange={() => toggleDay(idx)} />
                <span className="day-label">Day {day.day} {day.date && `(${day.date})`}</span>
              </div>
              {day.topics && day.topics.length > 0 && (
                <ul className="topics-list">
                  {day.topics.map((t, i) => <li key={i}>{t}</li>)}
                </ul>
              )}
            </div>
          ))}
        </div>
      )}

      {/* ── Previous Plans ────────────────────────────────────────────────── */}
      {plans.length > 0 && (
        <div className="section">
          <div className="section-title">Previous Plans</div>
          {plans.map(p => (
            <div
              key={p._id}
              className="card"
              style={{ cursor: 'pointer', borderLeft: selectedPlan?._id === p._id ? '4px solid #4f46e5' : '' }}
              onClick={() => setSelectedPlan(p)}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <div>
                  <strong>{p.moduleCode}</strong>
                  <span style={{ color: '#6b7280', marginLeft: '0.6rem', fontSize: '0.85rem' }}>
                    Lec {p.lectureFrom}–{p.lectureTo} · Exam {new Date(p.examDate).toLocaleDateString()}
                  </span>
                </div>
                <span style={{ fontSize: '0.85rem', color: '#4f46e5', fontWeight: 600 }}>{p.completionPercent}%</span>
              </div>
              <div className="progress-bar-wrap" style={{ marginTop: '0.5rem' }}>
                <div className="progress-bar-fill" style={{ width: `${p.completionPercent}%` }} />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default StudyPlan;
