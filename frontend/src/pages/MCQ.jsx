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
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
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
      .catch(() => { });
  }, [moduleCode, year, semester]);

  const fetchSets = useCallback(async () => {
    try {
      const data = await mcqsAPI.getAll(moduleCode ? { moduleCode } : {});
      setMcqSets(data);
    } catch (_) { }
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
      setCurrentQuestionIndex(0);
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
    if (selectedAnswers[qIdx] !== undefined) return;
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
    setCurrentQuestionIndex(0);
    const chosen = result?.results[qIdx]?.chosen === optIdx;
    if (correct) return 'option-btn correct';
    if (chosen && !correct) return 'option-btn wrong';
    return 'option-btn';
  };

  return (
    <div className="page">
      {!activeMCQ && <h1 className="page-title">🧠 MCQ Quiz Generator</h1>}

      {/* ── Generate Form ─────────────────────────────────────────────────── */}
      {!activeMCQ && (
        <div className="card">
          <h3 style={{ marginBottom: '1rem' }}>Generate MCQ Set</h3>
          {error && <div className="alert alert-error">{error}</div>}
          {info && <div className="alert alert-success">{info}</div>}
          <form onSubmit={handleGenerate}>
            <div className="form-row">
              <div className="form-group">
                <label>Year</label>
                <select value={year} onChange={e => setYear(Number(e.target.value))}>
                  <option value={1}>Year 1</option>
                  <option value={2}>Year 2</option>
                  <option value={3}>Year 3</option>
                  <option value={4}>Year 4</option>
                </select>
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
      )}

      {/* ── Active MCQ Attempt ────────────────────────────────────────────── */}
      {activeMCQ && (() => {
        const qIdx = currentQuestionIndex;
        const q = activeMCQ.questions[qIdx];
        const isFirst = qIdx === 0;
        const isLast = qIdx === activeMCQ.questions.length - 1;

        return (
          <div className="section" style={{ marginTop: '2rem' }}>
            <div style={{ marginBottom: '1.5rem', textAlign: 'left', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <p style={{ fontSize: '11px', fontWeight: 700, color: '#3b82f6', margin: '0 0 6px 0', letterSpacing: '0.05em', textTransform: 'uppercase' }}>
                  📚 MODULE {activeMCQ.moduleCode}
                </p>
                <h2 style={{ fontSize: '28px', fontWeight: 800, color: '#0f172a', margin: '0 0 6px 0', letterSpacing: '-0.02em' }}>MCQ Practice</h2>
                <p style={{ fontSize: '15px', color: '#64748b', margin: 0, fontStyle: 'italic' }}>
                  Lecture {activeMCQ.lectureFrom}{activeMCQ.lectureTo !== activeMCQ.lectureFrom ? ` - ${activeMCQ.lectureTo}` : ''}
                </p>
              </div>
              <button
                onClick={() => { setActiveMCQ(null); setSelectedAnswers({}); setResult(null); setSubmitted(false); setCurrentQuestionIndex(0); setModuleCode(''); setLectureFrom(''); setLectureTo(''); }}
                style={{ padding: '8px 16px', backgroundColor: '#f1f5f9', border: 'none', borderRadius: '8px', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '6px' }}
              >
                ✕ Close
              </button>
            </div>

            <div style={{ backgroundColor: '#fff', borderRadius: '16px', padding: '2.5rem', boxShadow: '0 4px 20px -2px rgba(0,0,0,0.05)', borderLeft: '4px solid #2563eb' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <div style={{ backgroundColor: '#f3e8ff', color: '#7e22ce', padding: '6px 14px', borderRadius: '20px', fontSize: '12px', fontWeight: 700 }}>
                  Question {qIdx + 1} of {activeMCQ.questions.length}
                </div>
                <div style={{ display: 'flex', gap: '6px' }}>
                  {activeMCQ.questions.map((_, i) => (
                    <div key={i} style={{ width: '6px', height: '6px', borderRadius: '50%', backgroundColor: i === qIdx ? '#2563eb' : (selectedAnswers[i] !== undefined ? '#93c5fd' : '#e2e8f0'), transition: 'background-color 0.3s' }} />
                  ))}
                </div>
              </div>

              <h3 style={{ fontSize: '18px', fontWeight: 600, color: '#0f172a', marginBottom: '1.5rem', lineHeight: '1.6' }}>
                {q.q}
              </h3>

              <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: '2.5rem' }}>
                {q.options.map((opt, optIdx) => {
                  const isSelected = selectedAnswers[qIdx] === optIdx;
                  const isAnswered = selectedAnswers[qIdx] !== undefined;
                  const correct = q.answerIndex === optIdx;

                  let bg = '#f8fafc';
                  let border = '1px solid #e2e8f0';
                  let dotBorder = '#cbd5e1';
                  let dotInner = 'transparent';

                  if (isAnswered) {
                    if (correct) {
                      bg = '#dcfce3';
                      border = '1px solid #86efac';
                      dotBorder = '#22c55e';
                      dotInner = '#22c55e';
                    } else if (isSelected) {
                      bg = '#fee2e2';
                      border = '1px solid #fca5a5';
                      dotBorder = '#ef4444';
                      dotInner = '#ef4444';
                    }
                  } else if (isSelected) {
                    bg = '#f0f9ff';
                    border = '1px solid #bae6fd';
                    dotBorder = '#3b82f6';
                    dotInner = '#3b82f6';
                  }

                  return (
                    <div
                      key={optIdx}
                      onClick={() => selectOption(qIdx, optIdx)}
                      style={{ display: 'flex', alignItems: 'center', gap: '14px', padding: '14px 18px', backgroundColor: bg, border: border, borderRadius: '12px', cursor: isAnswered ? 'default' : 'pointer', transition: 'all 0.2s', opacity: (isAnswered && !correct && !isSelected) ? 0.6 : 1 }}
                    >
                      <div style={{ width: '18px', height: '18px', borderRadius: '50%', border: `2px solid ${dotBorder}`, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotInner }} />
                      </div>
                      <span style={{ fontSize: '15px', color: '#1e293b', fontWeight: 500 }}>{opt}</span>
                    </div>
                  );
                })}
              </div>

              {selectedAnswers[qIdx] !== undefined && q.explanation && (
                <div style={{ marginBottom: '2rem', padding: '1.25rem', backgroundColor: '#fffbeb', color: '#b45309', borderRadius: '12px', fontSize: '14px', border: '1px solid #fde68a', lineHeight: '1.5' }}>
                  <strong>💡 Explanation:</strong> {q.explanation}
                </div>
              )}

              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderTop: '1px solid #e2e8f0', paddingTop: '1.5rem' }}>
                <div>
                  {!isFirst && (
                    <button type="button" onClick={() => setCurrentQuestionIndex(prev => prev - 1)} style={{ padding: '10px 20px', backgroundColor: '#fff', border: '1px solid #cbd5e1', borderRadius: '24px', color: '#475569', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                      Previous
                    </button>
                  )}
                </div>

                <div style={{ display: 'flex', gap: '12px' }}>
                  {!isLast ? (
                    <button type="button" onClick={() => setCurrentQuestionIndex(prev => prev + 1)} style={{ padding: '10px 24px', backgroundColor: '#2563eb', border: 'none', borderRadius: '24px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(37,99,235,0.2)', transition: 'all 0.2s' }}>
                      Next Question
                    </button>
                  ) : (
                    !submitted ? (
                      <button type="button" onClick={handleSubmit} style={{ padding: '10px 24px', backgroundColor: '#22c55e', border: 'none', borderRadius: '24px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', boxShadow: '0 4px 6px -1px rgba(34,197,94,0.2)', transition: 'all 0.2s' }}>
                        Submit Answer
                      </button>
                    ) : (
                      <button type="button" onClick={handleRetry} style={{ padding: '10px 24px', backgroundColor: '#0f172a', border: 'none', borderRadius: '24px', color: '#fff', fontSize: '14px', fontWeight: 600, cursor: 'pointer', transition: 'all 0.2s' }}>
                        Retry Quiz
                      </button>
                    )
                  )}
                </div>
              </div>

              {submitted && isLast && (
                <div style={{ marginTop: '2rem', padding: '1.25rem', backgroundColor: result.percentage >= 70 ? '#dcfce3' : '#fee2e2', borderRadius: '12px', textAlign: 'center', border: `1px solid ${result.percentage >= 70 ? '#86efac' : '#fca5a5'}` }}>
                  <h4 style={{ margin: '0 0 8px 0', fontSize: '18px', color: result.percentage >= 70 ? '#15803d' : '#b91c1c' }}>Quiz Completed!</h4>
                  <p style={{ margin: 0, fontSize: '15px', color: result.percentage >= 70 ? '#166534' : '#991b1b', lineHeight: '1.5' }}>
                    You scored <strong>{result.score}</strong> out of {result.total} ({result.percentage}%)<br />
                    <span style={{ fontSize: '13px', opacity: 0.9 }}>Your best score for this set: {result.bestScore}</span>
                  </p>
                </div>
              )}
            </div>
          </div>
        );
      })()}

      {/* ── Previous MCQ Sets ─────────────────────────────────────────────── */}
      {!activeMCQ && mcqSets.length > 0 && (
        <div className="section">
          <div className="section-title">Previous MCQ Sets</div>
          {mcqSets.map(s => (
            <div key={s._id} className="card" style={{ cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}
              onClick={() => { setActiveMCQ(s); setSelectedAnswers({}); setResult(null); setSubmitted(false); setCurrentQuestionIndex(0); }}>
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
