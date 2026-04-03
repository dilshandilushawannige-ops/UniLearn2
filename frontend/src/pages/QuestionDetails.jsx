import React, { useEffect, useMemo, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import '../styles/StackOver.css';

const answerVoteScore = (a) => {
  if (typeof a?.voteScore === 'number' && !Number.isNaN(a.voteScore)) return a.voteScore;
  const up = Array.isArray(a?.upvotes) ? a.upvotes.length : 0;
  const down = Array.isArray(a?.downvotes) ? a.downvotes.length : 0;
  return up - down;
};

const questionVoteScore = (q) => {
  if (typeof q?.voteScore === 'number' && !Number.isNaN(q.voteScore)) return q.voteScore;
  const up = Array.isArray(q?.upvotes) ? q.upvotes.length : 0;
  const down = Array.isArray(q?.downvotes) ? q.downvotes.length : 0;
  return up - down;
};

const ALLOWED_TAGS = ['cn', 'dms', 'se', 'esd', 'dbms', 'os', 'networking', 'java', 'python', 'sql'];

const QuestionDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();

  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [content, setContent] = useState('');
  const [answerSort, setAnswerSort] = useState('top');
  const [loading, setLoading] = useState(true);

  const [editingQuestion, setEditingQuestion] = useState(false);
  const [editQuestionForm, setEditQuestionForm] = useState({ title: '', description: '', tags: '' });
  const [editingAnswerId, setEditingAnswerId] = useState('');
  const [editAnswerText, setEditAnswerText] = useState('');
  const [badgeToast, setBadgeToast] = useState({ show: false, badges: [] });
  const [answerError, setAnswerError] = useState('');
  const [editQuestionTouched, setEditQuestionTouched] = useState({ title: false, description: false, tags: false });
  const [editQuestionSubmitError, setEditQuestionSubmitError] = useState('');
  const [answerEditError, setAnswerEditError] = useState('');
  const [actionError, setActionError] = useState('');

  const editParsedTags = useMemo(() => {
    const tokens = editQuestionForm.tags
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set(tokens)].slice(0, 5);
  }, [editQuestionForm.tags]);

  const editInvalidTags = useMemo(() => editParsedTags.filter((t) => !ALLOWED_TAGS.includes(t)), [editParsedTags]);

  const validateEditQuestion = useMemo(() => {
    const errors = { title: '', description: '', tags: '' };
    const t = editQuestionForm.title.trim();
    const d = editQuestionForm.description.trim();
    if (!t) errors.title = 'Title is required.';
    else if (t.length < 10) errors.title = 'Title must be at least 10 characters.';
    else if (t.length > 200) errors.title = 'Title must be at most 200 characters.';
    if (!d) errors.description = 'Details are required.';
    else if (d.length < 20) errors.description = 'Details must be at least 20 characters.';
    if (!editParsedTags.length) errors.tags = 'At least 1 tag is required.';
    else if (editParsedTags.length > 5) errors.tags = 'You can add up to 5 tags only.';
    else if (editInvalidTags.length) errors.tags = `Invalid tag(s): ${editInvalidTags.join(', ')}. Allowed: ${ALLOWED_TAGS.join(', ')}.`;
    return errors;
  }, [editQuestionForm.title, editQuestionForm.description, editParsedTags.length, editInvalidTags]);

  const isEditQuestionValid = useMemo(
    () => !validateEditQuestion.title && !validateEditQuestion.description && !validateEditQuestion.tags,
    [validateEditQuestion]
  );

  const fetchData = async () => {
    try {
      setLoading(true);
      const [q, a] = await Promise.all([
        api.get(`/questions/${id}`),
        api.get(`/answers/question/${id}`, { params: { sort: answerSort } }),
      ]);
      setQuestion(q.data.data);
      setAnswers(a.data.data || []);
      setEditQuestionForm({
        title: q.data.data?.title || '',
        description: q.data.data?.description || '',
        tags: (q.data.data?.tags || []).join(', '),
      });
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [id, answerSort]);

  const postAnswer = async (e) => {
    e.preventDefault();
    try {
      setAnswerError('');
      setActionError('');
      const trimmed = content.trim();
      if (!trimmed) {
        setAnswerError('Answer is required.');
        return;
      }
      if (trimmed.length < 10) {
        setAnswerError('Answer must be at least 10 characters.');
        return;
      }
      const res = await api.post('/answers', { questionId: id, content });
      const awarded = res.data?.awardedBadges || [];
      if (awarded.length) {
        setBadgeToast({ show: true, badges: awarded.map((b) => b.name) });
        setTimeout(() => setBadgeToast({ show: false, badges: [] }), 4200);
      }
      setContent('');
      fetchData();
    } catch (err) {
      setAnswerError(err.message || 'Failed to post answer');
    }
  };

  const toggleQuestionBookmark = async () => {
    try {
      setActionError('');
      const { data } = await api.post(`/questions/${id}/bookmark`);
      setQuestion((p) => (p ? { ...p, isBookmarked: data.bookmarked, bookmarkCount: data.bookmarkCount } : p));
    } catch (err) {
      setActionError(err.message || 'Bookmark failed');
    }
  };

  const toggleAnswerBookmark = async (answerId) => {
    try {
      setActionError('');
      const { data } = await api.post(`/answers/${answerId}/bookmark`);
      setAnswers((prev) =>
        prev.map((a) => (a._id === answerId ? { ...a, isBookmarked: data.bookmarked, bookmarkCount: data.bookmarkCount } : a))
      );
    } catch (err) {
      setActionError(err.message || 'Bookmark failed');
    }
  };

  const voteQuestionPost = async (type) => {
    try {
      setActionError('');
      const { data } = await api.post(`/questions/${id}/vote`, { type });
      const next = data.data;
      setQuestion((prev) => (prev && next ? { ...next, isBookmarked: prev.isBookmarked } : next));
    } catch (err) {
      setActionError(err.message || 'Vote failed');
    }
  };

  const voteAnswer = async (answerId, type) => {
    try {
      setActionError('');
      await api.post(`/answers/${answerId}/vote`, { type });
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Vote failed');
    }
  };

  const acceptAnswer = async (answerId) => {
    try {
      setActionError('');
      await api.post(`/answers/${answerId}/accept`);
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Could not accept answer');
    }
  };

  const canAccept = question?.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role);
  const canEditQuestion = question?.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role);
  const canVoteQuestion = user && question?.user?._id !== user?._id;

  const updateQuestion = async (e) => {
    e.preventDefault();
    setEditQuestionTouched({ title: true, description: true, tags: true });
    setEditQuestionSubmitError('');
    if (!isEditQuestionValid) {
      setEditQuestionSubmitError('Please fix the errors above before saving.');
      return;
    }
    try {
      const payload = {
        title: editQuestionForm.title.trim(),
        description: editQuestionForm.description.trim(),
        tags: editParsedTags,
      };
      const { data } = await api.put(`/questions/${id}`, payload);
      setQuestion((prev) => ({ ...prev, ...data.data }));
      setEditingQuestion(false);
      setEditQuestionTouched({ title: false, description: false, tags: false });
    } catch (err) {
      setEditQuestionSubmitError(err.message || 'Could not update question');
    }
  };

  const removeQuestion = async () => {
    if (!window.confirm('Delete this question and all answers?')) return;
    try {
      setActionError('');
      await api.delete(`/questions/${id}`);
      navigate('/user-dashboard/questions');
    } catch (err) {
      setActionError(err.message || 'Could not delete question');
    }
  };

  const startEditAnswer = (ans) => {
    setEditingAnswerId(ans._id);
    setEditAnswerText(ans.content);
    setAnswerEditError('');
  };

  const saveAnswerEdit = async (answerId) => {
    const trimmed = editAnswerText.trim();
    setAnswerEditError('');
    if (!trimmed) {
      setAnswerEditError('Answer cannot be empty.');
      return;
    }
    if (trimmed.length < 10) {
      setAnswerEditError('Answer must be at least 10 characters.');
      return;
    }
    try {
      await api.put(`/answers/${answerId}`, { content: editAnswerText });
      setEditingAnswerId('');
      setEditAnswerText('');
      setAnswerEditError('');
      fetchData();
    } catch (err) {
      setAnswerEditError(err.message || 'Could not save answer');
    }
  };

  const removeAnswer = async (answerId) => {
    if (!window.confirm('Delete this answer?')) return;
    try {
      setActionError('');
      await api.delete(`/answers/${answerId}`);
      fetchData();
    } catch (err) {
      setActionError(err.message || 'Could not delete answer');
    }
  };

  if (loading) return <div className="forum-shell"><p className="forum-state-note">Loading...</p></div>;
  if (!question) return <div className="forum-shell"><p className="forum-state-note">Question not found.</p></div>;

  return (
    <div className="forum-shell">
      <Link to="/user-dashboard/questions" className="forum-question-link">← Back</Link>

      <div className="forum-card" style={{ marginTop: 12 }}>
        {!editingQuestion ? (
          <div className="forum-card-inner">
            <div className="forum-stats-col">
              <div className="forum-stat-box">
                <div className="forum-stat-value">{questionVoteScore(question)}</div>
                <div className="forum-stat-label">score</div>
                {canVoteQuestion && (
                  <div style={{ display: 'flex', gap: 6, justifyContent: 'center', flexWrap: 'wrap', marginTop: 8 }}>
                    <button type="button" className="forum-tab" onClick={() => voteQuestionPost('up')} aria-label="Upvote question">👍</button>
                    <button type="button" className="forum-tab" onClick={() => voteQuestionPost('down')} aria-label="Downvote question">👎</button>
                  </div>
                )}
              </div>
              <div className="forum-stat-box">
                <div className="forum-stat-value">{question.answerCount ?? question.answers?.length ?? 0}</div>
                <div className="forum-stat-label">answers</div>
              </div>
              <div className="forum-stat-box">
                <div className="forum-stat-value">{question.viewCount ?? 0}</div>
                <div className="forum-stat-label">views</div>
              </div>
              <div className="forum-stat-box forum-stat-bookmark">
                {user ? (
                  <button
                    type="button"
                    className="forum-bookmark-hit"
                    title={question.isBookmarked ? 'Remove bookmark' : 'Save question'}
                    onClick={toggleQuestionBookmark}
                    aria-pressed={!!question.isBookmarked}
                  >
                    <span className={`forum-bookmark-icon ${question.isBookmarked ? 'on' : ''}`}>{question.isBookmarked ? '★' : '☆'}</span>
                    <span className="forum-stat-value forum-stat-value-sm">{question.bookmarkCount ?? 0}</span>
                  </button>
                ) : (
                  <>
                    <span className="forum-bookmark-icon dim">☆</span>
                    <span className="forum-stat-value forum-stat-value-sm">{question.bookmarkCount ?? 0}</span>
                  </>
                )}
                <div className="forum-stat-label">saved</div>
              </div>
            </div>
            <div className="forum-card-main">
              <h2 style={{ marginTop: 0 }}>{question.title}</h2>
              <p style={{ whiteSpace: 'pre-wrap' }}>{question.description}</p>
              <div className="forum-tags-row">
                {(question.tags || []).map((t) => <span key={t} className="forum-tag-pill">{t}</span>)}
              </div>
            </div>
          </div>
        ) : (
          <form onSubmit={updateQuestion}>
            <p className="ask-help" style={{ marginBottom: 12 }}>
              Validation: title 10–200 characters • details at least 20 characters • at least 1 tag, max 5, from allowed list only.
            </p>
            <div className="ask-field">
              <div className="ask-field-top">
                <label className="ask-label">Title *</label>
                <span className="ask-count">{editQuestionForm.title.trim().length}/200</span>
              </div>
              <input
                className="forum-input"
                value={editQuestionForm.title}
                onChange={(e) => setEditQuestionForm((p) => ({ ...p, title: e.target.value }))}
                onBlur={() => setEditQuestionTouched((p) => ({ ...p, title: true }))}
                maxLength={200}
                placeholder="Question title"
              />
              {editQuestionTouched.title && validateEditQuestion.title && <div className="form-error">{validateEditQuestion.title}</div>}
            </div>
            <div className="ask-field">
              <label className="ask-label">Details *</label>
              <textarea
                className="forum-input ask-textarea"
                value={editQuestionForm.description}
                onChange={(e) => setEditQuestionForm((p) => ({ ...p, description: e.target.value }))}
                onBlur={() => setEditQuestionTouched((p) => ({ ...p, description: true }))}
                rows={6}
                placeholder="Question description"
              />
              {editQuestionTouched.description && validateEditQuestion.description && <div className="form-error">{validateEditQuestion.description}</div>}
            </div>
            <div className="ask-field">
              <label className="ask-label">Tags *</label>
              <div className="ask-help">Comma-separated • allowed: {ALLOWED_TAGS.join(', ')}</div>
              <input
                className="forum-input"
                value={editQuestionForm.tags}
                onChange={(e) => setEditQuestionForm((p) => ({ ...p, tags: e.target.value }))}
                onBlur={() => setEditQuestionTouched((p) => ({ ...p, tags: true }))}
                placeholder="e.g., java, sql, dbms"
              />
              {editQuestionTouched.tags && validateEditQuestion.tags && <div className="form-error">{validateEditQuestion.tags}</div>}
            </div>
            <div className="ask-actions">
              <button type="submit" className="forum-primary-btn" disabled={!isEditQuestionValid}>Save</button>
              <button
                type="button"
                onClick={() => {
                  setEditingQuestion(false);
                  setEditQuestionTouched({ title: false, description: false, tags: false });
                  setEditQuestionSubmitError('');
                }}
                className="ask-cancel-btn"
              >
                Cancel
              </button>
            </div>
            {editQuestionSubmitError && <div className="form-error form-error-submit">{editQuestionSubmitError}</div>}
          </form>
        )}

        {canEditQuestion && !editingQuestion && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button
              className="forum-tab"
              type="button"
              onClick={() => {
                setEditingQuestion(true);
                setEditQuestionTouched({ title: false, description: false, tags: false });
                setEditQuestionSubmitError('');
                setActionError('');
              }}
              aria-label="Edit question"
            >
              ✏️ Edit
            </button>
            <button className="forum-tab" type="button" onClick={removeQuestion} style={{ color: '#b91c1c' }} aria-label="Delete question">🗑️ Delete</button>
          </div>
        )}
      </div>

      {actionError && (
        <div className="form-error" style={{ marginTop: 12, padding: '10px 12px', borderRadius: 8, background: '#fef2f2', border: '1px solid #fecaca' }}>
          {actionError}
        </div>
      )}

      <form onSubmit={postAnswer} className="forum-card" style={{ marginTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Your answer</h4>
        <p className="ask-help">Validation: required • minimum 10 characters.</p>
        <textarea
          className="forum-input ask-textarea"
          value={content}
          onChange={(e) => setContent(e.target.value)}
          rows={5}
          placeholder="Write your answer clearly..."
        />
        {answerError && <div className="form-error">{answerError}</div>}
        <button type="submit" className="forum-primary-btn" style={{ marginTop: 10 }} disabled={!content.trim() || content.trim().length < 10}>
          Post Answer
        </button>
      </form>

      {badgeToast.show && (
        <div className="forum-card" style={{ marginTop: 12, borderColor: '#b7f7d7', background: '#ecfdf5' }}>
          <strong>Badge unlocked:</strong> {badgeToast.badges.join(', ')}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
        <h3 style={{ margin: 0 }}>Answers</h3>
        <div className="forum-tabs" style={{ marginBottom: 0 }}>
          <button type="button" className={`forum-tab ${answerSort === 'top' ? 'active' : ''}`} onClick={() => setAnswerSort('top')}>Top voted</button>
          <button type="button" className={`forum-tab ${answerSort === 'newest' ? 'active' : ''}`} onClick={() => setAnswerSort('newest')}>Newest</button>
          <button type="button" className={`forum-tab ${answerSort === 'oldest' ? 'active' : ''}`} onClick={() => setAnswerSort('oldest')}>Oldest</button>
        </div>
      </div>

      <div className="forum-card-list" style={{ marginTop: 12 }}>
        {answers.map((ans) => (
          <div key={ans._id} className="forum-card" style={{ background: ans.isAccepted ? '#ecfdf5' : '#fff' }}>
            {editingAnswerId === ans._id ? (
              <>
                <p className="ask-help">Validation: minimum 10 characters.</p>
                <textarea
                  className="forum-input ask-textarea"
                  value={editAnswerText}
                  onChange={(e) => {
                    setEditAnswerText(e.target.value);
                    setAnswerEditError('');
                  }}
                  rows={4}
                />
                {answerEditError && <div className="form-error">{answerEditError}</div>}
                <div className="ask-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="forum-primary-btn" onClick={() => saveAnswerEdit(ans._id)} disabled={editAnswerText.trim().length < 10}>Save</button>
                  <button
                    type="button"
                    className="ask-cancel-btn"
                    onClick={() => {
                      setEditingAnswerId('');
                      setAnswerEditError('');
                    }}
                  >
                    Cancel
                  </button>
                </div>
              </>
            ) : (
              <p style={{ whiteSpace: 'pre-wrap' }}>{ans.content}</p>
            )}

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 10 }}>
              <small className="forum-author-line">
                {ans.user?.username} ♦ {ans.user?.reputationScore || 0}
              </small>
              <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
                <span className="forum-state-note" style={{ marginRight: 6 }}>{answerVoteScore(ans)} score</span>
                <button type="button" className="forum-tab" onClick={() => voteAnswer(ans._id, 'up')} aria-label="Upvote answer">👍</button>
                <button type="button" className="forum-tab" onClick={() => voteAnswer(ans._id, 'down')} aria-label="Downvote answer">👎</button>
                {user && (
                  <button
                    type="button"
                    className={`forum-tab ${ans.isBookmarked ? 'forum-tab-bookmarked' : ''}`}
                    onClick={() => toggleAnswerBookmark(ans._id)}
                    title={ans.isBookmarked ? 'Remove saved answer' : 'Save answer'}
                    aria-pressed={!!ans.isBookmarked}
                  >
                    {ans.isBookmarked ? '★ Saved' : '☆ Save'}
                  </button>
                )}
                {canAccept && !ans.isAccepted && (
                  <button type="button" className="forum-tab" onClick={() => acceptAnswer(ans._id)}>Accept</button>
                )}
                {(ans.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role)) && editingAnswerId !== ans._id && (
                  <>
                    <button type="button" className="forum-tab" onClick={() => startEditAnswer(ans)} aria-label="Edit answer">✏️ Edit</button>
                    <button type="button" className="forum-tab" onClick={() => removeAnswer(ans._id)} style={{ color: '#b91c1c' }} aria-label="Delete answer">🗑️ Delete</button>
                  </>
                )}
                {ans.isAccepted && <span style={{ color: '#16a34a', fontWeight: 800 }}>Accepted</span>}
              </div>
            </div>
          </div>
        ))}
        {!answers.length && <p className="forum-state-note">No answers yet.</p>}
      </div>
    </div>
  );
};

export default QuestionDetails;

