import React, { useEffect, useState, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import { mcqsAPI } from '../api/mcqs';

const MCQ = () => {
  const { user } = useAuth();

  // ── Generation form ────────────────────────────────────────────────────────
  const [year, setYear] = useState(user?.currentYear || '');
  const [semester, setSemester] = useState(user?.currentSemester || 1);
  const [moduleCode, setModuleCode] = useState('');
  const [lectureFrom, setLectureFrom] = useState('');
  const [lectureTo, setLectureTo] = useState('');
  const [numQuestions, setNumQuestions] = useState(10);

  const [moduleOptions, setModuleOptions] = useState([]);
  const [availableLectures, setAvailableLectures] = useState([]);

  // ── MCQ sets / attempt state ───────────────────────────────────────────────
  const [mcqSets, setMcqSets] = useState([]);
  const [activeMCQ, setActiveMCQ] = useState(null);
  const [selectedAnswers, setSelectedAnswers] = useState({});
  const [result, setResult] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  // ── UI ─────────────────────────────────────────────────────────────────────
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  // Keep form in sync with the logged-in student's profile.
  useEffect(() => {
    if (user?.currentYear) setYear(user.currentYear);
    if (user?.currentSemester) setSemester(user.currentSemester);
  }, [user?.currentYear, user?.currentSemester]);

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

  useEffect(() => {
    if (!moduleCode) { setAvailableLectures([]); return; }
    resourcesAPI.getAll({ year, semester, moduleCode, resourceType: 'lecture_pdf' })
      .then(data => setAvailableLectures(data.sort((a, b) => a.lectureNo - b.lectureNo)))
      .catch(() => {});
  }, [moduleCode, year, semester]);

  const fetchSets = useCallback(async () => {
    try {
      const data = await mcqsAPI.getAll(moduleCode ? { moduleCode } : {});
      setMcqSets(data);
    } catch (_) {}
  }, [moduleCode]);

  useEffect(() => { fetchSets(); }, [fetchSets]);

  // ── Generate ───────────────────────────────────────────────────────────────
  const handleGenerate = async (e) => {
    e.preventDefault();
    setError(''); setInfo('');
    if (!year || !moduleCode || !lectureFrom || !lectureTo) {
      return setError('Please fill all fields.');
    }
    setGenerating(true);
    try {
      const mcqSet = await mcqsAPI.generate({ year, semester, moduleCode, lectureFrom: Number(lectureFrom), lectureTo: Number(lectureTo), numQuestions });
      setActiveMCQ(mcqSet);
      setSelectedAnswers({});
      setResult(null);
      setSubmitted(false);
      setInfo('MCQ set generated! Attempt it below.');
      fetchSets();
    } catch (err) {
      setError(err.message);
    } finally {
      setGenerating(false);
    }
  };

  // ── Option selection ───────────────────────────────────────────────────────
  const selectOption = (qIdx, optIdx) => {
    if (submitted) return;
    setSelectedAnswers(prev => ({ ...prev, [qIdx]: optIdx }));
  };

  // ── Submit answers ─────────────────────────────────────────────────────────
  const handleSubmit = async () => {
    if (!activeMCQ) return;
    const answers = activeMCQ.questions.map((_, i) => selectedAnswers[i] !== undefined ? selectedAnswers[i] : -1);
    try {
      const res = await mcqsAPI.submit(activeMCQ._id, answers);
      setResult(res);
      setSubmitted(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // ── Retry ─────────────────────────────────────────────────────────────────
  const handleRetry = () => {
    setSelectedAnswers({});
    setResult(null);
    setSubmitted(false);
  };

  const getOptionClass = (qIdx, optIdx) => {
    if (!submitted) return selectedAnswers[qIdx] === optIdx ? 'option-btn selected' : 'option-btn';
    const correct = result?.results[qIdx]?.answerIndex === optIdx;
    const chosen = result?.results[qIdx]?.chosen === optIdx;
    if (correct) return 'option-btn correct';
    if (chosen && !correct) return 'option-btn wrong';
    return 'option-btn';
  };

  return (
    <div className="page">
      <h1 className="page-title">🧠 MCQ Quiz Generator</h1>

      {/* ── Generate Form ─────────────────────────────────────────────────── */}
      <div className="card">
        <h3 style={{ marginBottom: '1rem' }}>Generate MCQ Set</h3>
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
              Available: {availableLectures.map(l => `Lec ${l.lectureNo}`).join(', ')}
            </div>
          )}

          <div className="form-row">
            <div className="form-group">
              <label>Lecture From</label>
              <input type="number" min="1" value={lectureFrom} onChange={e => setLectureFrom(e.target.value)} placeholder="1" />
            </div>
            <div className="form-group">
              <label>Lecture To</label>
              <input type="number" min="1" value={lectureTo} onChange={e => setLectureTo(e.target.value)} placeholder="5" />
            </div>
          </div>
          <div className="form-group" style={{ maxWidth: '200px' }}>
            <label>Number of Questions (max 30)</label>
            <input type="number" min="3" max="30" value={numQuestions} onChange={e => setNumQuestions(Number(e.target.value))} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={generating}>
            {generating ? '⏳ Generating MCQs…' : '✨ Generate MCQ Set'}
          </button>
        </form>
      </div>

      {/* ── Active MCQ Attempt ────────────────────────────────────────────── */}
      {activeMCQ && (
        <div className="section">
          <div className="section-title">
            {submitted ? `Results: ${result?.score}/${result?.total} (${result?.percentage}%)` : 'Answer the Questions'}
          </div>

          {submitted && (
            <div className={`alert ${result.percentage >= 70 ? 'alert-success' : 'alert-error'}`} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <span>Score: <strong>{result.score}/{result.total}</strong> ({result.percentage}%) · Best: {result.bestScore}</span>
              <button className="btn btn-outline btn-sm" onClick={handleRetry}>Retry</button>
            </div>
          )}

          {activeMCQ.questions.map((q, qIdx) => (
            <div key={qIdx} className="card mcq-question">
              <p>{qIdx + 1}. {q.q}</p>
              {q.options.map((opt, optIdx) => (
                <button
                  key={optIdx}
                  className={getOptionClass(qIdx, optIdx)}
                  onClick={() => selectOption(qIdx, optIdx)}
                  disabled={submitted}
                >
                  {String.fromCharCode(65 + optIdx)}. {opt}
                </button>
              ))}
              {submitted && result?.results[qIdx]?.explanation && (
                <div className="explanation">💡 {result.results[qIdx].explanation}</div>
              )}
            </div>
          ))}

          {!submitted && (
            <button
              className="btn btn-success"
              onClick={handleSubmit}
              disabled={Object.keys(selectedAnswers).length === 0}
            >
              Submit Answers
            </button>
          )}
        </div>
      )}

      {/* ── Previous MCQ Sets ─────────────────────────────────────────────── */}
      {mcqSets.length > 0 && (
        <div className="section">
          <div className="section-title">Previous MCQ Sets</div>
          {mcqSets.map(s => (
            <div key={s._id} className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => { setActiveMCQ(s); setSelectedAnswers({}); setResult(null); setSubmitted(false); }}>
              <div>
                <strong>{s.moduleCode}</strong>
                <span style={{ color: '#6b7280', marginLeft: '0.6rem', fontSize: '0.85rem' }}>
                  Lec {s.lectureFrom}–{s.lectureTo} · {s.questions.length} Qs
                </span>
              </div>
              <span style={{ fontSize: '0.85rem', color: '#4f46e5' }}>
                Best: {s.bestScore}/{s.questions.length} · {s.attempts.length} attempt{s.attempts.length !== 1 ? 's' : ''}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default MCQ;
