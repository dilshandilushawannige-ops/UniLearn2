import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import { studyPlansAPI } from '../api/studyPlans';

// Icons
import settingsIcon from '../assets/settings-icon.png';
import warningIcon from '../assets/warning-icon.png';
import infoIcon from '../assets/info-icon.png';
import sparklesIcon from '../assets/sparkles-icon.png';
import loadingIcon from '../assets/loading-icon.png';
import docsIcon from '../assets/docs-icon.png';
import timerIcon from '../assets/timer-icon.png';
import deleteIcon from '../assets/delete-icon.png';
import calendarIcon from '../assets/calendar-icon.png';
import clipboardIcon from '../assets/clipboard-icon.png';
import booksIcon from '../assets/books-icon.png';

// ─── Utility ──────────────────────────────────────────────────────────────────
const formatDate = (d) => {
  if (!d) return '';
  const dt = new Date(d);
  return dt.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
};

const daysUntil = (examDate) =>
  Math.max(0, Math.ceil((new Date(examDate) - new Date()) / 86400000));

// ─── MCQ Quiz Modal ───────────────────────────────────────────────────────────
const MCQModal = ({ mcqs, onSubmit, onClose }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [results, setResults] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSelect = (qi, oi) => {
    if (submitted) return;
    setAnswers((p) => ({ ...p, [qi]: oi }));
  };

  const handleSubmit = async () => {
    const answersArr = mcqs.map((_, i) => (answers[i] ?? -1));
    setSubmitting(true);
    try {
      const res = await onSubmit(answersArr);
      setResults(res);
      setSubmitted(true);
    } catch (_) { }
    setSubmitting(false);
  };

  const allAnswered = mcqs.every((_, i) => answers[i] !== undefined);

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 2000,
      background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div style={{
        background: '#fff', borderRadius: 20, width: '100%', maxWidth: 680,
        maxHeight: '90vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
        padding: '32px 36px',
      }}>
        {/* Header */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 24 }}>
          <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>
            MCQ Quiz — {mcqs.length} Questions
          </h3>
          {submitted && results && (
            <div style={{
              background: results.score >= 70 ? '#dcfce7' : '#fef9c3',
              color: results.score >= 70 ? '#166534' : '#854d0e',
              borderRadius: 12, padding: '6px 14px', fontWeight: 700, fontSize: 15,
            }}>
              {results.score}% · {results.correct}/{results.total} correct
            </div>
          )}
        </div>

        {/* Questions */}
        {mcqs.map((mcq, qi) => {
          const sel = answers[qi];
          const res = submitted ? results?.results?.[qi] : null;
          return (
            <div key={qi} style={{
              background: '#f8fafc', borderRadius: 14, padding: '18px 20px',
              marginBottom: 16, border: '1.5px solid #e2e8f0',
            }}>
              <p style={{ margin: '0 0 12px', fontWeight: 600, color: '#1e293b', fontSize: 14 }}>
                {qi + 1}. {mcq.q}
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                {mcq.options.map((opt, oi) => {
                  let bg = '#fff', border = '1.5px solid #e2e8f0', color = '#374151';
                  if (!submitted && sel === oi) { bg = '#eff6ff'; border = '1.5px solid #3b82f6'; color = '#1d4ed8'; }
                  if (submitted) {
                    if (oi === mcq.answerIndex) { bg = '#dcfce7'; border = '1.5px solid #4ade80'; color = '#166534'; }
                    else if (sel === oi && oi !== mcq.answerIndex) { bg = '#fee2e2'; border = '1.5px solid #f87171'; color = '#991b1b'; }
                  }
                  return (
                    <button key={oi} onClick={() => handleSelect(qi, oi)} style={{
                      textAlign: 'left', padding: '10px 14px', borderRadius: 10,
                      background: bg, border, color, fontSize: 13, cursor: submitted ? 'default' : 'pointer',
                      transition: 'all 0.2s', fontFamily: 'inherit',
                    }}>
                      <span style={{ fontWeight: 600, marginRight: 8 }}>{String.fromCharCode(65 + oi)}.</span>{opt}
                    </button>
                  );
                })}
              </div>
              {submitted && mcq.explanation && (
                <div style={{
                  marginTop: 10, background: '#eff6ff', borderRadius: 8,
                  padding: '8px 12px', fontSize: 12, color: '#1d4ed8', lineHeight: 1.5,
                }}>
                  💡 {mcq.explanation}
                </div>
              )}
            </div>
          );
        })}

        {/* Actions */}
        <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 8 }}>
          {!submitted ? (
            <>
              <button onClick={onClose} style={{
                padding: '10px 22px', borderRadius: 30, border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#64748b', fontWeight: 600, cursor: 'pointer', fontSize: 14,
              }}>Cancel</button>
              <button onClick={handleSubmit} disabled={!allAnswered || submitting} style={{
                padding: '10px 28px', borderRadius: 30, border: 'none',
                background: allAnswered && !submitting ? '#3b82f6' : '#93c5fd',
                color: '#fff', fontWeight: 700, cursor: allAnswered && !submitting ? 'pointer' : 'default', fontSize: 14,
                boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
              }}>
                {submitting ? 'Submitting…' : 'Submit Answers'}
              </button>
            </>
          ) : (
            <button onClick={onClose} style={{
              padding: '10px 28px', borderRadius: 30, border: 'none',
              background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
              boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
            }}>Done</button>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Summary Modal ────────────────────────────────────────────────────────────
const SummaryModal = ({ summaryText, onClose }) => (
  <div style={{
    position: 'fixed', inset: 0, zIndex: 2000,
    background: 'rgba(15,23,42,0.55)', backdropFilter: 'blur(6px)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
  }}>
    <div style={{
      background: '#fff', borderRadius: 20, width: '100%', maxWidth: 640,
      maxHeight: '85vh', overflow: 'auto', boxShadow: '0 24px 80px rgba(0,0,0,0.22)',
      padding: '32px 36px',
    }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h3 style={{ margin: 0, fontSize: 20, fontWeight: 700, color: '#1e293b' }}>📋 Revision Summary</h3>
        <button onClick={onClose} style={{
          background: '#f1f5f9', border: 'none', borderRadius: '50%', width: 32, height: 32,
          cursor: 'pointer', fontSize: 16, color: '#64748b', display: 'flex', alignItems: 'center', justifyContent: 'center',
        }}>✕</button>
      </div>
      <div style={{
        whiteSpace: 'pre-wrap', lineHeight: 1.7, fontSize: 14, color: '#334155',
        background: '#f8fafc', borderRadius: 12, padding: '16px 20px', border: '1px solid #e2e8f0',
      }}>
        {summaryText}
      </div>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginTop: 20 }}>
        <button onClick={onClose} style={{
          padding: '10px 28px', borderRadius: 30, border: 'none',
          background: '#3b82f6', color: '#fff', fontWeight: 700, cursor: 'pointer', fontSize: 14,
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)',
        }}>Close</button>
      </div>
    </div>
  </div>
);

// ─── Task Card ────────────────────────────────────────────────────────────────
const TaskCard = ({ icon, title, subtitle, status, actionLabel, onAction, loading, disabled, accentColor = '#3b82f6' }) => {
  const isCompleted = status === 'completed';
  const isLocked = status === 'locked';

  return (
    <div style={{
      display: 'flex', alignItems: 'center', gap: 14,
      background: isCompleted ? '#f0fdf4' : isLocked ? '#f8fafc' : '#fff',
      border: `1.5px solid ${isCompleted ? '#bbf7d0' : isLocked ? '#e2e8f0' : '#e2e8f0'}`,
      borderRadius: 14, padding: '14px 18px',
      opacity: isLocked ? 0.55 : 1,
      transition: 'all 0.25s',
    }}>
      {/* Checkbox circle */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        border: isCompleted ? `2px solid ${accentColor}` : '2px solid #cbd5e1',
        background: isCompleted ? accentColor : 'transparent',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        transition: 'all 0.25s',
      }}>
        {isCompleted && <span style={{ color: '#fff', fontSize: 13, fontWeight: 700 }}>✓</span>}
      </div>

      {/* Content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{
          fontWeight: 600, fontSize: 14,
          color: isCompleted ? '#15803d' : isLocked ? '#94a3b8' : '#1e293b',
          textDecoration: isCompleted ? 'line-through' : 'none',
        }}>
          {icon} {title}
        </div>
        {subtitle && (
          <div style={{ fontSize: 12, color: isLocked ? '#94a3b8' : '#64748b', marginTop: 2 }}>{subtitle}</div>
        )}
      </div>

      {/* Action button */}
      {!isLocked && !isCompleted && actionLabel && (
        <button
          onClick={onAction}
          disabled={disabled || loading}
          style={{
            flexShrink: 0, padding: '7px 16px', borderRadius: 20,
            border: `1.5px solid ${accentColor}`, background: '#fff',
            color: accentColor, fontWeight: 600, fontSize: 12, cursor: disabled || loading ? 'default' : 'pointer',
            opacity: disabled || loading ? 0.5 : 1, transition: 'all 0.2s', whiteSpace: 'nowrap',
            display: 'flex', alignItems: 'center', gap: 6,
          }}
          onMouseEnter={e => { if (!disabled && !loading) { e.currentTarget.style.background = accentColor; e.currentTarget.style.color = '#fff'; } }}
          onMouseLeave={e => { e.currentTarget.style.background = '#fff'; e.currentTarget.style.color = accentColor; }}
        >
          {loading
            ? <><img src={loadingIcon} alt="" style={{ width: 13, height: 13, animation: 'sp-spin 1s linear infinite' }} /> Generating…</>
            : actionLabel
          }
        </button>
      )}
      {isCompleted && actionLabel && (
        <button onClick={onAction} style={{
          flexShrink: 0, padding: '7px 16px', borderRadius: 20,
          border: '1.5px solid #bbf7d0', background: '#dcfce7',
          color: '#15803d', fontWeight: 600, fontSize: 12, cursor: 'pointer', whiteSpace: 'nowrap',
        }}>
          {actionLabel}
        </button>
      )}
    </div>
  );
};

// ─── Day Section ──────────────────────────────────────────────────────────────
const DaySection = ({ day, planId, onPlanUpdate }) => {
  const [loadingMCQ, setLoadingMCQ] = useState(false);
  const [loadingSummary, setLoadingSummary] = useState(false);
  const [loadingTask, setLoadingTask] = useState('');
  const [showMCQModal, setShowMCQModal] = useState(false);
  const [showSummary, setShowSummary] = useState(false);
  const [localMCQs, setLocalMCQs] = useState(day.tasks?.mcqTask?.mcqs || []);
  const [localSummary, setLocalSummary] = useState(day.tasks?.summaryTask?.summaryText || '');

  const t = day.tasks || {};
  const isLocked = day.status === 'locked';
  const isCompleted = day.status === 'completed';
  const isInProgress = day.status === 'in_progress';

  const readDone = t.readTask?.completed;
  const reviewDone = t.reviewTask?.completed;
  const mcqDone = t.mcqTask?.completed;
  const summaryDone = t.summaryTask?.completed;
  const mcqUnlocked = t.mcqTask?.unlocked || (readDone && reviewDone);

  const statusBadge = isCompleted
    ? { label: 'COMPLETED', bg: '#dcfce7', color: '#15803d' }
    : isInProgress
      ? { label: 'IN PROGRESS', bg: '#dbeafe', color: '#1d4ed8' }
      : { label: 'UPCOMING', bg: '#f1f5f9', color: '#64748b' };

  const markTask = async (taskType) => {
    if (loadingTask) return;
    setLoadingTask(taskType);
    try {
      const res = await studyPlansAPI.completeTask(planId, day.dayNumber, taskType);
      onPlanUpdate(res.plan);
    } catch (_) { }
    setLoadingTask('');
  };

  const handleGenerateMCQs = async () => {
    setLoadingMCQ(true);
    try {
      const res = await studyPlansAPI.generateDayMCQs(planId, day.dayNumber);
      setLocalMCQs(res.mcqs || []);
      setShowMCQModal(true);
    } catch (_) { }
    setLoadingMCQ(false);
  };

  const openExistingMCQ = () => {
    const existing = t.mcqTask?.mcqs || localMCQs;
    setLocalMCQs(existing);
    setShowMCQModal(true);
  };

  const handleSubmitMCQ = async (answers) => {
    const res = await studyPlansAPI.submitDayMCQ(planId, day.dayNumber, answers);
    onPlanUpdate(res.plan);
    return res;
  };

  const handleGenerateSummary = async () => {
    setLoadingSummary(true);
    try {
      const res = await studyPlansAPI.generateDaySummary(planId, day.dayNumber);
      setLocalSummary(res.summaryText || '');
      onPlanUpdate(res.plan);
      setShowSummary(true);
    } catch (_) { }
    setLoadingSummary(false);
  };

  const openExistingSummary = () => {
    setLocalSummary(t.summaryTask?.summaryText || localSummary);
    setShowSummary(true);
  };

  return (
    <>
      <div style={{ display: 'flex', gap: 0, marginBottom: 28 }}>
        {/* Timeline connector */}
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginRight: 18, paddingTop: 4 }}>
          <div style={{
            width: 14, height: 14, borderRadius: '50%', flexShrink: 0,
            background: isCompleted ? '#3b82f6' : isInProgress ? '#3b82f6' : '#cbd5e1',
            boxShadow: isInProgress ? '0 0 0 4px #dbeafe' : 'none',
            transition: 'all 0.3s',
          }} />
          <div style={{ flex: 1, width: 2, minHeight: 20, background: '#e2e8f0', marginTop: 6 }} />
        </div>

        {/* Day card */}
        <div style={{ flex: 1 }}>
          {/* Day header */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 14 }}>
            <span style={{ fontSize: 16, fontWeight: 700, color: '#1e293b' }}>
              Day {day.dayNumber}{day.date ? `: ${day.date}` : ''}
            </span>
            <span style={{
              padding: '3px 10px', borderRadius: 20, fontSize: 11, fontWeight: 700,
              letterSpacing: 0.5, background: statusBadge.bg, color: statusBadge.color,
            }}>
              {statusBadge.label}
            </span>
          </div>

          {/* Focus area */}
          {day.focus && !isLocked && (
            <div style={{
              fontSize: 12, color: '#64748b', marginBottom: 12,
              display: 'flex', alignItems: 'center', gap: 6,
            }}>
              <span>📚</span>{day.focus}
            </div>
          )}

          {isLocked ? (
            <div style={{
              background: '#f8fafc', border: '1.5px dashed #cbd5e1', borderRadius: 14,
              padding: '16px 20px', color: '#94a3b8', fontSize: 13, textAlign: 'center',
            }}>
              🔒 {day.dayNumber - 1 > 0
                ? `Complete Day ${day.dayNumber - 1} to unlock this day`
                : '4 Tasks scheduled'
              }
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {/* Task 1 - Read */}
              <TaskCard
                icon="📖"
                title="Read Lecture Content"
                subtitle={day.assignedContent?.map(c => c.title || `Lecture ${c.lectureNo}`).join(', ')}
                status={readDone ? 'completed' : 'available'}
                actionLabel={readDone ? null : 'Mark Done'}
                onAction={() => markTask('readTask')}
                loading={loadingTask === 'readTask'}
              />
              {/* Task 2 - Review */}
              <TaskCard
                icon="📝"
                title="Review Key Notes"
                subtitle="Review short notes and highlight key points from today's content"
                status={reviewDone ? 'completed' : 'available'}
                actionLabel={reviewDone ? null : 'Mark Done'}
                onAction={() => markTask('reviewTask')}
                loading={loadingTask === 'reviewTask'}
              />
              {/* Task 3 - MCQ */}
              <TaskCard
                icon="🧠"
                title="Attempt MCQ Quiz"
                subtitle={mcqDone
                  ? `Score: ${t.mcqTask?.score ?? '—'}% · ${t.mcqTask?.mcqs?.length || 0} Questions`
                  : mcqUnlocked
                    ? `${t.mcqTask?.mcqs?.length || 5} AI-Generated Questions`
                    : 'Unlocks after Read + Review'
                }
                status={mcqDone ? 'completed' : mcqUnlocked ? 'available' : 'locked'}
                actionLabel={
                  mcqDone
                    ? 'View Quiz'
                    : (t.mcqTask?.mcqs?.length > 0 ? 'Start Quiz' : 'Generate 5 MCQs')
                }
                onAction={
                  mcqDone
                    ? openExistingMCQ
                    : t.mcqTask?.mcqs?.length > 0
                      ? () => setShowMCQModal(true)
                      : handleGenerateMCQs
                }
                loading={loadingMCQ}
                disabled={!mcqUnlocked}
                accentColor='#7c3aed'
              />
              {/* Task 4 - Summary */}
              <TaskCard
                icon="📋"
                title="Generate Revision Summary"
                subtitle={summaryDone
                  ? 'AI summary generated — click to view'
                  : mcqDone
                    ? 'Generate AI-powered exam revision summary'
                    : 'Unlocks after MCQ completion'
                }
                status={summaryDone ? 'completed' : mcqDone ? 'available' : 'locked'}
                actionLabel={summaryDone ? 'View Summary' : 'Generate Summary'}
                onAction={summaryDone ? openExistingSummary : handleGenerateSummary}
                loading={loadingSummary}
                disabled={!mcqDone}
                accentColor='#0891b2'
              />
            </div>
          )}
        </div>
      </div>

      {showMCQModal && localMCQs.length > 0 && (
        <MCQModal
          mcqs={localMCQs}
          onSubmit={handleSubmitMCQ}
          onClose={() => setShowMCQModal(false)}
        />
      )}
      {showSummary && (
        <SummaryModal
          summaryText={localSummary || t.summaryTask?.summaryText || ''}
          onClose={() => setShowSummary(false)}
        />
      )}
    </>
  );
};

// ─── Progress Sidebar ─────────────────────────────────────────────────────────
const ProgressSidebar = ({ plan, allPlans, activePlanId, onSelectPlan, onDeletePlan, onNewPlan }) => {
  const daysLeft = plan ? daysUntil(plan.examDate) : 0;
  const totalDays = plan ? (plan.days || []).length : 0;
  const doneDays = plan ? (plan.days || []).filter(d => d.status === 'completed').length : 0;
  const tasksLeft = plan
    ? (plan.days || []).filter(d => d.status !== 'locked' && d.status !== 'completed').reduce((acc, d) => {
      const t = d.tasks || {};
      return acc
        + (!t.readTask?.completed ? 1 : 0)
        + (!t.reviewTask?.completed ? 1 : 0)
        + (!t.mcqTask?.completed ? 1 : 0)
        + (!t.summaryTask?.completed ? 1 : 0);
    }, 0)
    : 0;

  const progress = plan?.completionPercent || 0;

  // Study tips
  const TIPS = [
    "Spaced repetition is key! Try to review yesterday's content before starting today's MCQ practice for 15% better retention.",
    "Active recall beats passive reading. After reading, close the material and write what you remember.",
    "Take a 5-minute break every 25 minutes (Pomodoro) to maintain focus and avoid burnout.",
    "Attempt MCQs without hints first — struggling a little boosts long-term retention.",
  ];
  const tip = TIPS[doneDays % TIPS.length];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
      {/* Overall Progress */}
      <div style={{
        background: '#fff', borderRadius: 18, padding: '22px 24px',
        border: '1.5px solid #e2e8f0', boxShadow: '0 2px 12px rgba(0,0,0,0.05)',
      }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 12 }}>
          Overall Progress
        </div>
        <div style={{ fontSize: 34, fontWeight: 800, color: '#3b82f6', lineHeight: 1, marginBottom: 4 }}>
          {progress}% <span style={{ fontSize: 14, fontWeight: 500, color: '#64748b' }}>Completed</span>
        </div>
        <div style={{ height: 8, background: '#e0e7ff', borderRadius: 4, overflow: 'hidden', margin: '12px 0 8px' }}>
          <div style={{
            height: '100%', borderRadius: 4, width: `${progress}%`,
            background: 'linear-gradient(90deg,#3b82f6,#7c3aed)',
            transition: 'width 0.6s ease',
          }} />
        </div>
        <div style={{ fontSize: 12, color: '#64748b' }}>{doneDays} of {totalDays} days complete</div>
      </div>

      {/* Stats row */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '16px',
          border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{daysLeft}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Days Remaining</div>
        </div>
        <div style={{
          background: '#fff', borderRadius: 14, padding: '16px',
          border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
          textAlign: 'center',
        }}>
          <div style={{ fontSize: 26, fontWeight: 800, color: '#1e293b' }}>{tasksLeft}</div>
          <div style={{ fontSize: 12, color: '#64748b', marginTop: 2 }}>Tasks Left</div>
        </div>
      </div>

      {/* Focus areas */}
      {plan && (
        <div style={{
          background: '#fff', borderRadius: 14, padding: '18px 20px',
          border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            Focus Areas
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6 }}>
            {[`${plan.moduleCode}`, `Lec ${plan.lectureFrom}–${plan.lectureTo}`, `Y${plan.year}S${plan.semester}`].map((tag, i) => (
              <span key={i} style={{
                padding: '4px 12px', borderRadius: 20, fontSize: 12, fontWeight: 500,
                background: ['#eff6ff', '#f5f3ff', '#ecfdf5'][i % 3],
                color: ['#1d4ed8', '#6d28d9', '#065f46'][i % 3],
                border: `1px solid ${['#bfdbfe', '#ddd6fe', '#a7f3d0'][i % 3]}`,
              }}>{tag}</span>
            ))}
          </div>
        </div>
      )}

      {/* AI Study Tip */}
      <div style={{
        background: 'linear-gradient(135deg,#eff6ff 0%,#f5f3ff 100%)',
        borderRadius: 14, padding: '18px 20px',
        border: '1.5px solid #dbeafe',
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 8 }}>
          <span style={{ fontSize: 14 }}>💡</span>
          <span style={{ fontSize: 12, fontWeight: 700, color: '#1d4ed8' }}>Editorial Tip</span>
        </div>
        <p style={{ margin: 0, fontSize: 13, color: '#374151', lineHeight: 1.6 }}>{tip}</p>
      </div>

      {/* Plan switcher */}
      {allPlans.length > 1 && (
        <div style={{
          background: '#fff', borderRadius: 14, padding: '18px 20px',
          border: '1.5px solid #e2e8f0', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
        }}>
          <div style={{ fontSize: 11, fontWeight: 700, color: '#94a3b8', textTransform: 'uppercase', letterSpacing: 0.5, marginBottom: 10 }}>
            My Plans
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {allPlans.map((p) => (
              <div key={p._id} onClick={() => onSelectPlan(p)} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 12px', borderRadius: 10, cursor: 'pointer',
                background: p._id === activePlanId ? '#eff6ff' : '#f8fafc',
                border: `1.5px solid ${p._id === activePlanId ? '#bfdbfe' : '#e2e8f0'}`,
                transition: 'all 0.2s',
              }}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 600, color: '#1e293b' }}>{p.moduleCode}</div>
                  <div style={{ fontSize: 11, color: '#64748b' }}>Lec {p.lectureFrom}–{p.lectureTo} · {p.completionPercent}%</div>
                </div>
                <button onClick={e => { e.stopPropagation(); if (window.confirm('Delete this plan?')) onDeletePlan(p._id); }} style={{
                  background: 'transparent', border: 'none', cursor: 'pointer', padding: 4, opacity: 0.4,
                }}>
                  <img src={deleteIcon} alt="Delete" style={{ width: 14, height: 14, objectFit: 'contain' }} />
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* New plan button */}
      <button onClick={onNewPlan} style={{
        padding: '12px', borderRadius: 14, border: '1.5px dashed #93c5fd',
        background: 'transparent', color: '#3b82f6', fontWeight: 600, fontSize: 14,
        cursor: 'pointer', transition: 'all 0.2s',
      }}
        onMouseEnter={e => { e.currentTarget.style.background = '#eff6ff'; }}
        onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; }}
      >+ New Study Plan</button>
    </div>
  );
};

// ─── New Plan Modal ───────────────────────────────────────────────────────────
const NewPlanModal = ({ onClose, onCreated, user }) => {
  const [year, setYear] = useState(user?.currentYear || 3);
  const [semester, setSemester] = useState(user?.currentSemester || 1);
  const [moduleCode, setModuleCode] = useState('');
  const [targetLecture, setTargetLecture] = useState(12);
  const [examDate, setExamDate] = useState('');
  const [modules, setModules] = useState([]);
  const [availLec, setAvailLec] = useState([]);
  const [missingLec, setMissingLec] = useState([]);
  const [totalLec, setTotalLec] = useState(0);
  const [analyzedDocs, setAnalyzedDocs] = useState(0);
  const [loading, setLoading] = useState(false);
  const [generating, setGenerating] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetch = async () => {
      try {
        const [mods, lecs] = await Promise.all([
          modulesAPI.getModules({ year, semester }).catch(() => []),
          resourcesAPI.getAll({ year, semester, resourceType: 'lecture_pdf' }).catch(() => []),
        ]);
        const merged = new Map();
        mods.forEach(m => merged.set(m.moduleCode, { _id: m._id, moduleCode: m.moduleCode, moduleName: m.moduleName }));
        lecs.forEach(r => { if (!r.moduleCode || merged.has(r.moduleCode)) return; merged.set(r.moduleCode, { _id: r.moduleCode, moduleCode: r.moduleCode, moduleName: '(from resources)' }); });
        setModules(Array.from(merged.values()).sort((a, b) => a.moduleCode.localeCompare(b.moduleCode)));
        setModuleCode(''); setAvailLec([]); setMissingLec([]);
      } catch (_) { }
    };
    fetch();
  }, [year, semester]);

  useEffect(() => {
    if (!moduleCode) return;
    const fetch = async () => {
      setLoading(true);
      try {
        const res = await resourcesAPI.getAll({ year, semester, moduleCode, resourceType: 'lecture_pdf' });
        const nos = res.map(r => r.lectureNo).filter(Boolean);
        setAvailLec(nos); setAnalyzedDocs(res.length);
        const mx = Math.max(...nos, 15);
        setTotalLec(mx); setTargetLecture(Math.min(12, mx));
        setMissingLec(Array.from({ length: mx }, (_, i) => i + 1).filter(n => !nos.includes(n)));
      } catch (_) { }
      setLoading(false);
    };
    fetch();
  }, [moduleCode, year, semester]);

  const missingInRange = missingLec.filter(n => n <= targetLecture);

  const handleGenerate = async () => {
    setError('');
    if (!moduleCode) return setError('Please select a module');
    if (!examDate) return setError('Please select an examination date');
    if (missingInRange.length > 0) return setError(`Missing lectures: ${missingInRange.join(', ')}`);
    try {
      setGenerating(true);
      const plan = await studyPlansAPI.generate({ year, semester, moduleCode, lectureFrom: 1, lectureTo: targetLecture, examDate });
      onCreated(plan);
    } catch (err) {
      setError(err.response?.data?.message || err.message || 'Failed to generate study plan');
    } finally { setGenerating(false); }
  };

  return (
    <div onClick={onClose} style={{
      position: 'fixed', inset: 0, zIndex: 1000,
      background: 'rgba(15,23,42,0.5)', backdropFilter: 'blur(4px)',
      display: 'flex', alignItems: 'center', justifyContent: 'center', padding: 16,
    }}>
      <div onClick={e => e.stopPropagation()} style={{
        background: '#fff', borderRadius: 20, padding: '32px 36px',
        width: '100%', maxWidth: 520, boxShadow: '0 24px 60px rgba(0,0,0,0.18)',
        position: 'relative', animation: 'sp-modalIn 0.3s cubic-bezier(0.34,1.56,0.64,1)',
      }}>
        <button onClick={onClose} style={{
          position: 'absolute', top: 16, right: 16, background: '#f1f5f9', border: 'none',
          borderRadius: '50%', width: 32, height: 32, fontSize: 16, cursor: 'pointer',
          display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748b',
        }}>✕</button>

        <h3 style={{ margin: '0 0 20px', display: 'flex', alignItems: 'center', gap: 8, fontSize: 18, color: '#1e293b' }}>
          <img src={settingsIcon} alt="" style={{ width: 22, height: 22, objectFit: 'contain' }} /> New Study Plan
        </h3>

        {error && (
          <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 10, padding: '10px 14px', marginBottom: 14, color: '#dc2626', fontSize: 13 }}>
            {error}
          </div>
        )}

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Academic Level</label>
            <select value={`${year}-${semester}`} onChange={e => { const [y, s] = e.target.value.split('-'); setYear(Number(y)); setSemester(Number(s)); setModuleCode(''); }} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              {[1, 2, 3, 4].map(y => [1, 2].map(s => (
                <option key={`${y}-${s}`} value={`${y}-${s}`}>Year {y} | Sem {s}</option>
              )))}
            </select>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Module</label>
            <select value={moduleCode} onChange={e => setModuleCode(e.target.value)} disabled={loading || modules.length === 0} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }}>
              <option value="">{loading ? 'Loading…' : modules.length === 0 ? 'No modules' : 'Select Module'}</option>
              {modules.map(m => <option key={m._id} value={m.moduleCode}>{m.moduleCode} – {m.moduleName}</option>)}
            </select>
          </div>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 14, marginBottom: 14 }}>
          <div className="form-group">
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Up to Lecture</label>
            <div style={{ position: 'relative' }}>
              <input type="number" value={targetLecture} onChange={e => setTargetLecture(Number(e.target.value))} min="1" max={totalLec} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0', paddingRight: 60 }} />
              <span style={{ position: 'absolute', right: 10, top: '50%', transform: 'translateY(-50%)', fontSize: 11, color: '#94a3b8' }}>/ {totalLec}</span>
            </div>
          </div>
          <div className="form-group">
            <label style={{ fontSize: 11, textTransform: 'uppercase', color: '#94a3b8', fontWeight: 600 }}>Exam Date</label>
            <input type="date" value={examDate} onChange={e => setExamDate(e.target.value)} min={new Date().toISOString().split('T')[0]} style={{ background: '#f8fafc', border: '1.5px solid #e2e8f0' }} />
          </div>
        </div>

        {missingInRange.length > 0 && (
          <div style={{ background: '#fef2f2', border: '1.5px solid #fca5a5', borderRadius: 10, padding: '10px 14px', marginBottom: 14, display: 'flex', gap: 8, alignItems: 'flex-start' }}>
            <img src={warningIcon} alt="" style={{ width: 20, height: 20, flexShrink: 0 }} />
            <div><strong style={{ color: '#dc2626', fontSize: 13 }}>Content Gap</strong>
              <p style={{ margin: '2px 0 0', fontSize: 12, color: '#64748b' }}>Lectures {missingInRange.join(', ')} missing. Upload them first.</p>
            </div>
          </div>
        )}

        <div style={{ background: '#eff6ff', borderRadius: 10, padding: '10px 14px', marginBottom: 20, display: 'flex', gap: 8, alignItems: 'flex-start', fontSize: 12, color: '#1d4ed8' }}>
          <img src={infoIcon} alt="" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 1 }} />
          <span>Plans are generated from uploaded lecture PDFs. Ensure all materials are uploaded first.</span>
        </div>

        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
          <button onClick={handleGenerate} disabled={generating || !moduleCode || !examDate || missingInRange.length > 0} style={{
            padding: '12px 28px', borderRadius: 30, border: 'none',
            background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 14, cursor: 'pointer',
            opacity: (generating || !moduleCode || !examDate || missingInRange.length > 0) ? 0.5 : 1,
            boxShadow: '0 4px 12px rgba(59,130,246,0.3)', transition: 'all 0.25s',
            display: 'flex', alignItems: 'center', gap: 8,
          }}>
            {generating
              ? <><img src={loadingIcon} alt="" style={{ width: 15, height: 15, animation: 'sp-spin 1s linear infinite' }} /> Generating…</>
              : <><img src={sparklesIcon} alt="" style={{ width: 15, height: 15 }} /> Generate Plan</>
            }
          </button>
          <span style={{ fontSize: 12, color: '#94a3b8', display: 'flex', gap: 14 }}>
            <span style={{ display: 'flex', alignItems: 'center', gap: 4 }}>
              <img src={docsIcon} alt="" style={{ width: 13, height: 13, opacity: 0.5 }} /> {analyzedDocs} docs
            </span>
          </span>
        </div>
      </div>
    </div>
  );
};

// ─── Main Component ───────────────────────────────────────────────────────────
const DashboardStudyPlan = () => {
  const { user } = useAuth();
  const [allPlans, setAllPlans] = useState([]);
  const [activePlan, setActivePlan] = useState(null);
  const [showForm, setShowForm] = useState(false);

  const fetchAllPlans = useCallback(async () => {
    try {
      const data = await studyPlansAPI.getAll();
      setAllPlans(data);
      if (data.length > 0 && !activePlan) {
        setActivePlan(data[0]);
        setShowForm(false);
      }
    } catch (_) { }
  }, []); // eslint-disable-line

  useEffect(() => { fetchAllPlans(); }, [fetchAllPlans]);

  const handlePlanCreated = async (newPlan) => {
    setActivePlan(newPlan);
    setShowForm(false);
    await fetchAllPlans();
  };

  const handleDeletePlan = async (planId) => {
    try {
      await studyPlansAPI.delete(planId);
      const remaining = allPlans.filter(p => p._id !== planId);
      setAllPlans(remaining);
      if (activePlan?._id === planId) {
        setActivePlan(remaining[0] || null);
        if (remaining.length === 0) setShowForm(true);
      }
    } catch (_) { }
  };

  const handlePlanUpdate = (updatedPlan) => {
    setActivePlan(updatedPlan);
    setAllPlans(prev => prev.map(p => p._id === updatedPlan._id ? updatedPlan : p));
  };

  const daysLeft = activePlan ? daysUntil(activePlan.examDate) : 0;

  return (
    <div style={{ minHeight: '100vh', background: '#f5f7fb', padding: '0 0 40px' }}>
      {/* ── Page Header ─────────────────────────────────────────────────────── */}
      <div style={{ marginBottom: 28, display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', flexWrap: 'wrap', gap: 12 }}>
        <div>
          <h1 style={{ fontSize: '2rem', fontWeight: 800, color: '#1e293b', margin: 0, letterSpacing: -0.5 }}>
            {activePlan ? activePlan.moduleCode : 'Study Plan Dashboard'}
          </h1>
          <p style={{ fontSize: 14, color: '#64748b', margin: '6px 0 0' }}>
            {activePlan
              ? `AI-powered day-by-day study schedule · Lecture ${activePlan.lectureFrom}–${activePlan.lectureTo} · Exam in ${daysLeft} days`
              : 'AI-powered study schedules tailored to your course load and exam targets.'
            }
          </p>
        </div>
        <button onClick={() => setShowForm(true)} style={{
          padding: '10px 24px', borderRadius: 30, fontSize: 14, fontWeight: 600, cursor: 'pointer',
          background: '#3b82f6', color: '#fff', border: 'none',
          boxShadow: '0 4px 12px rgba(59,130,246,0.3)', transition: 'all 0.25s',
        }}
          onMouseEnter={e => { e.currentTarget.style.transform = 'translateY(-2px)'; }}
          onMouseLeave={e => { e.currentTarget.style.transform = 'translateY(0)'; }}
        >
          + New Plan
        </button>
      </div>

      {/* ── Empty State ──────────────────────────────────────────────────────── */}
      {!activePlan && allPlans.length === 0 && !showForm && (
        <div style={{ textAlign: 'center', padding: '80px 20px', color: '#94a3b8' }}>
          <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 20 }}>
            <img src={booksIcon} alt="Books" style={{ width: 64, height: 64, objectFit: 'contain', opacity: 0.3 }} />
          </div>
          <div style={{ fontSize: 20, fontWeight: 700, color: '#1e293b', marginBottom: 8 }}>No Study Plans Yet</div>
          <p style={{ fontSize: 14, maxWidth: 380, margin: '0 auto 24px' }}>
            Generate your first AI-powered study plan with day-by-day tasks, MCQ quizzes, and revision summaries.
          </p>
          <button onClick={() => setShowForm(true)} style={{
            padding: '12px 28px', borderRadius: 30, border: 'none',
            background: '#3b82f6', color: '#fff', fontWeight: 700, fontSize: 15, cursor: 'pointer',
            boxShadow: '0 4px 14px rgba(59,130,246,0.35)',
          }}>
            ✨ Create Your First Plan
          </button>
        </div>
      )}

      {/* ── Main Layout: Timeline + Sidebar ─────────────────────────────────── */}
      {activePlan && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 320px', gap: 28, alignItems: 'start' }}>
          {/* ── Left: Day Timeline ─────────────────────────────────────────── */}
          <div style={{
            background: '#fff', borderRadius: 20, padding: '28px 32px',
            border: '1.5px solid #e2e8f0', boxShadow: '0 2px 16px rgba(0,0,0,0.05)',
          }}>
            {/* Plan summary header */}
            {activePlan.planJson?.summary && (
              <div style={{
                background: '#eff6ff', borderLeft: '4px solid #3b82f6',
                borderRadius: 10, padding: '12px 16px', marginBottom: 24,
                fontSize: 13, color: '#1d4ed8', lineHeight: 1.6,
                display: 'flex', gap: 8, alignItems: 'flex-start',
              }}>
                <img src={clipboardIcon} alt="" style={{ width: 15, height: 15, flexShrink: 0, marginTop: 2 }} />
                <span>{activePlan.planJson.summary}</span>
              </div>
            )}

            {/* Days */}
            {(activePlan.days || []).length === 0 ? (
              <div style={{ textAlign: 'center', color: '#94a3b8', padding: '40px 0', fontSize: 14 }}>
                No day schedule found in this plan.
              </div>
            ) : (
              (activePlan.days || []).map((day) => (
                <DaySection
                  key={day.dayNumber}
                  day={day}
                  planId={activePlan._id}
                  onPlanUpdate={handlePlanUpdate}
                />
              ))
            )}
          </div>

          {/* ── Right: Progress Sidebar ────────────────────────────────────── */}
          <ProgressSidebar
            plan={activePlan}
            allPlans={allPlans}
            activePlanId={activePlan._id}
            onSelectPlan={(p) => { setActivePlan(p); }}
            onDeletePlan={handleDeletePlan}
            onNewPlan={() => setShowForm(true)}
          />
        </div>
      )}

      {/* ── New Plan Modal ───────────────────────────────────────────────────── */}
      {showForm && (
        <NewPlanModal
          user={user}
          onClose={() => setShowForm(false)}
          onCreated={handlePlanCreated}
        />
      )}

      {/* ── Global Animations ────────────────────────────────────────────────── */}
      <style>{`
        @keyframes sp-spin { from{transform:rotate(0deg)} to{transform:rotate(360deg)} }
        @keyframes sp-modalIn {
          from{opacity:0;transform:scale(0.88) translateY(24px)}
          to{opacity:1;transform:scale(1) translateY(0)}
        }
      `}</style>
    </div>
  );
};

export default DashboardStudyPlan;
