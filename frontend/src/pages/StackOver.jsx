import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import '../styles/StackOver.css';

const TAGS = ['cn', 'dms', 'se', 'esd', 'dbms', 'os', 'networking', 'java', 'python', 'sql'];

const questionVoteScore = (q) => {
  if (typeof q?.voteScore === 'number' && !Number.isNaN(q.voteScore)) return q.voteScore;
  const up = Array.isArray(q?.upvotes) ? q.upvotes.length : 0;
  const down = Array.isArray(q?.downvotes) ? q.downvotes.length : 0;
  return up - down;
};

const StackOver = () => {
  const { user } = useAuth();
  const [questions, setQuestions] = useState([]);
  const [savedAnswers, setSavedAnswers] = useState([]);
  const [listMode, setListMode] = useState('all');
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', answered: '', sort: 'new' });
  const [formErrors, setFormErrors] = useState({ title: '', description: '', tags: '', submit: '' });
  const [touched, setTouched] = useState({ title: false, description: false, tags: false });

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.search) q.set('search', filters.search);
    if (filters.answered) q.set('answered', filters.answered);
    if (filters.sort) q.set('sort', filters.sort);
    return q.toString();
  }, [filters]);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        if (listMode === 'saved-q') {
          const { data } = await api.get('/questions/bookmarks/mine');
          setQuestions(data.data || []);
          setSavedAnswers([]);
        } else if (listMode === 'saved-a') {
          const { data } = await api.get('/answers/bookmarks/mine');
          setSavedAnswers(data.data || []);
          setQuestions([]);
        } else {
          const { data } = await api.get(`/questions${queryString ? `?${queryString}` : ''}`);
          setQuestions(data.data || []);
          setSavedAnswers([]);
        }
      } catch (err) {
        console.error(err.message);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [queryString, listMode]);

  const toggleQuestionBookmark = async (q, e) => {
    e?.preventDefault();
    e?.stopPropagation();
    if (!user) return;
    try {
      const { data } = await api.post(`/questions/${q._id}/bookmark`);
      const bookmarked = data.bookmarked;
      if (listMode === 'saved-q' && !bookmarked) {
        setQuestions((prev) => prev.filter((row) => row._id !== q._id));
        return;
      }
      setQuestions((prev) => prev.map((row) => (row._id === q._id ? { ...row, isBookmarked: bookmarked, bookmarkCount: data.bookmarkCount } : row)));
    } catch (err) {
      console.error(err.message);
    }
  };

  const toggleAnswerBookmark = async (ans) => {
    if (!user) return;
    try {
      const { data } = await api.post(`/answers/${ans._id}/bookmark`);
      const bookmarked = data.bookmarked;
      if (listMode === 'saved-a' && !bookmarked) {
        setSavedAnswers((prev) => prev.filter((row) => row._id !== ans._id));
        return;
      }
      setSavedAnswers((prev) => prev.map((row) => (row._id === ans._id ? { ...row, isBookmarked: bookmarked, bookmarkCount: data.bookmarkCount } : row)));
    } catch (err) {
      console.error(err.message);
    }
  };

  useEffect(() => {
    const text = title.trim();
    if (text.length < 10) {
      setSimilar([]);
      setSimilarLoading(false);
      return undefined;
    }

    const timer = setTimeout(async () => {
      try {
        setSimilarLoading(true);
        const { data } = await api.get('/questions/similar', { params: { title: text } });
        setSimilar(data.data || []);
      } catch (err) {
        console.error(err.message);
      } finally {
        setSimilarLoading(false);
      }
    }, 600);

    return () => clearTimeout(timer);
  }, [title]);

  const parsedTags = useMemo(() => {
    const tokens = tagsText
      .split(',')
      .map((t) => t.trim().toLowerCase())
      .filter(Boolean);
    return [...new Set(tokens)].slice(0, 5);
  }, [tagsText]);

  const invalidTags = useMemo(() => parsedTags.filter((t) => !TAGS.includes(t)), [parsedTags]);

  const validateAskForm = useMemo(() => {
    const errors = { title: '', description: '', tags: '' };
    const t = title.trim();
    const d = description.trim();

    if (!t) errors.title = 'Title is required.';
    else if (t.length < 10) errors.title = 'Title must be at least 10 characters.';
    else if (t.length > 200) errors.title = 'Title must be at most 200 characters.';

    if (!d) errors.description = 'Details are required.';
    else if (d.length < 20) errors.description = 'Details must be at least 20 characters.';

    if (!parsedTags.length) errors.tags = 'At least 1 tag is required.';
    else if (parsedTags.length > 5) errors.tags = 'You can add up to 5 tags only.';
    else if (invalidTags.length) errors.tags = `Invalid tag(s): ${invalidTags.join(', ')}.`;

    return errors;
  }, [title, description, parsedTags.length, invalidTags]);

  const isAskFormValid = useMemo(() => {
    return !validateAskForm.title && !validateAskForm.description && !validateAskForm.tags;
  }, [validateAskForm]);

  const submitQuestion = async (e) => {
    e.preventDefault();
    try {
      setTouched({ title: true, description: true, tags: true });
      setFormErrors((prev) => ({ ...prev, submit: '' }));
      if (!isAskFormValid) {
        setFormErrors((prev) => ({ ...prev, ...validateAskForm, submit: 'Please fix the errors before posting.' }));
        return;
      }
      await api.post('/questions', { title, description, tags: parsedTags });
      setTitle('');
      setDescription('');
      setTagsText('');
      setFormErrors({ title: '', description: '', tags: '', submit: '' });
      setTouched({ title: false, description: false, tags: false });
      setShowForm(false);
      if (listMode === 'all') {
        const { data } = await api.get(`/questions${queryString ? `?${queryString}` : ''}`);
        setQuestions(data.data || []);
      }
    } catch (err) {
      setFormErrors((prev) => ({ ...prev, submit: err.message || 'Failed to post question' }));
    }
  };

  const runSearch = () => {
    setFilters((prev) => ({ ...prev, search: searchInput.trim() }));
  };

  const setTab = (tab) => {
    if (tab === 'new') setFilters((prev) => ({ ...prev, sort: 'new', answered: '' }));
    if (tab === 'votes') setFilters((prev) => ({ ...prev, sort: 'votes', answered: '' }));
    if (tab === 'unanswered') setFilters((prev) => ({ ...prev, sort: 'new', answered: 'no' }));
  };

  const activeTab = filters.answered === 'no' ? 'unanswered' : filters.sort === 'votes' ? 'votes' : 'new';

  return (
    <div className="forum-shell">
      <div className="forum-header-card">
        <div>
          <h1 className="forum-title">Student Forum</h1>
          <p className="forum-subtitle">Ask questions, share knowledge, help your peers</p>
        </div>
        <button onClick={() => setShowForm(true)} className="forum-primary-btn">
          + Ask a Question
        </button>
      </div>

      <div className="forum-search-row">
        <input
          placeholder="Search questions..."
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') runSearch();
          }}
          className="forum-input"
        />
        <button onClick={runSearch} className="forum-link-btn">Search</button>
      </div>

      <div className="forum-tabs">
        <button type="button" onClick={() => setListMode('all')} className={`forum-tab ${listMode === 'all' ? 'active' : ''}`}>Browse</button>
        <button type="button" onClick={() => setListMode('saved-q')} className={`forum-tab ${listMode === 'saved-q' ? 'active' : ''}`}>Saved questions</button>
        <button type="button" onClick={() => setListMode('saved-a')} className={`forum-tab ${listMode === 'saved-a' ? 'active' : ''}`}>Saved answers</button>
      </div>

      {listMode === 'all' && (
        <div className="forum-tabs forum-tabs-row2">
          <button type="button" onClick={() => setTab('new')} className={`forum-tab ${activeTab === 'new' ? 'active' : ''}`}>Newest</button>
          <button type="button" onClick={() => setTab('votes')} className={`forum-tab ${activeTab === 'votes' ? 'active' : ''}`}>Most Voted</button>
          <button type="button" onClick={() => setTab('unanswered')} className={`forum-tab ${activeTab === 'unanswered' ? 'active' : ''}`}>Unanswered</button>
        </div>
      )}

      {showForm && (
        <div className="ask-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <form onSubmit={submitQuestion} className="ask-modal-card">
            <div className="ask-head-row">
              <div>
                <h2 className="ask-title">Ask a Question</h2>
                <p className="ask-subtitle">Be specific and clear to get the best answers.</p>
                <p className="ask-help" style={{ marginTop: 8 }}>
                  <strong>Validation:</strong> title 10–200 chars • details min 20 chars • tags required (1–5) from allowed list only.
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setTitle('How do I handle API errors in React service layer?');
                  setDescription('I am using async/await in a service layer. Network/server errors are not reaching the UI. How should I structure error handling so it surfaces correctly?');
                  setTagsText('se, java, networking');
                }}
                className="ask-demo-btn"
              >
                Fill Demo Data
              </button>
            </div>

            <div className="ask-field">
              <div className="ask-field-top">
                <label className="ask-label">Title *</label>
                <span className="ask-count">{title.trim().length}/200</span>
              </div>
              <div className="ask-help">Summarise your problem in one line</div>
              <input
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, title: true }))}
                placeholder="e.g., How do I use useEffect with async functions?"
                minLength={10}
                maxLength={200}
                required
                className="forum-input"
              />
              {touched.title && validateAskForm.title && <div className="form-error">{validateAskForm.title}</div>}
            </div>

            {title.trim().length >= 10 && (
              <div className="ask-duplicate-box">
                <strong className="ask-duplicate-title">Possible duplicate questions</strong>
                {similarLoading ? (
                  <div className="ask-duplicate-note">Checking...</div>
                ) : (
                  <ul className="ask-duplicate-list">
                    {(similar || []).slice(0, 5).map((q) => (
                      <li key={q._id}>
                        <Link to={`/user-dashboard/questions/${q._id}`} className="ask-duplicate-link">
                          {q.title}
                        </Link>
                      </li>
                    ))}
                    {!similar.length && <li className="ask-duplicate-note">No close matches found.</li>}
                  </ul>
                )}
              </div>
            )}

            <div className="ask-field">
              <label className="ask-label">Details *</label>
              <div className="ask-help">Include what you have tried and what error you're getting</div>
              <textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, description: true }))}
                placeholder="Describe your question in detail..."
                minLength={20}
                required
                rows={7}
                className="forum-input ask-textarea"
              />
              {touched.description && validateAskForm.description && <div className="form-error">{validateAskForm.description}</div>}
            </div>

            <div className="ask-field ask-last-field">
              <label className="ask-label">Tags *</label>
              <div className="ask-help">Add up to 5 tags separated by commas</div>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                onBlur={() => setTouched((p) => ({ ...p, tags: true }))}
                placeholder={`e.g., ${TAGS.slice(0, 3).join(', ')}`}
                className="forum-input"
              />
              <div className="ask-tag-preview">
                {parsedTags.map((t) => (
                  <span key={t} className="forum-tag-pill">{t}</span>
                ))}
                {!parsedTags.length && <span className="ask-empty-tags">No tags yet</span>}
              </div>
              <div className={`ask-allowed-note ${invalidTags.length ? 'error' : ''}`}>
                Allowed: {TAGS.join(', ')} {invalidTags.length ? `• Invalid: ${invalidTags.join(', ')}` : ''}
              </div>
              {touched.tags && validateAskForm.tags && <div className="form-error">{validateAskForm.tags}</div>}
            </div>

            <div className="ask-actions">
              <button type="submit" className="forum-primary-btn ask-submit-btn" disabled={!isAskFormValid}>Post Question</button>
              <button type="button" onClick={() => setShowForm(false)} className="ask-cancel-btn">Cancel</button>
            </div>
            {formErrors.submit && <div className="form-error form-error-submit">{formErrors.submit}</div>}
          </form>
        </div>
      )}

      {loading ? (
        <p className="forum-state-note">Loading...</p>
      ) : listMode === 'saved-a' ? (
        <div className="forum-card-list">
          {savedAnswers.map((ans) => (
            <article key={ans._id} className="forum-card">
              <div className="forum-saved-answer-top">
                <Link to={`/user-dashboard/questions/${ans.question?._id}`} className="forum-question-link">
                  {ans.question?.title || 'Question'}
                </Link>
                {user && (
                  <button
                    type="button"
                    className="forum-bookmark-btn on"
                    title="Remove from saved"
                    onClick={() => toggleAnswerBookmark(ans)}
                    aria-pressed
                  >
                    ★ Saved
                  </button>
                )}
              </div>
              <p className="forum-question-snippet" style={{ whiteSpace: 'pre-wrap' }}>{(ans.content || '').slice(0, 280)}{(ans.content || '').length > 280 ? '…' : ''}</p>
              <small className="forum-author-line">Answer by {ans.user?.username} ♦ {ans.user?.reputationScore || 0}</small>
            </article>
          ))}
          {!savedAnswers.length && <p className="forum-state-note">No saved answers yet. Open a question and bookmark an answer.</p>}
        </div>
      ) : (
        <div className="forum-card-list">
          {questions.map((q) => (
            <article key={q._id} className="forum-card">
              <div className="forum-card-inner">
                <div className="forum-stats-col">
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{questionVoteScore(q)}</div>
                    <div className="forum-stat-label">score</div>
                  </div>
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{q.answerCount || q.answers?.length || 0}</div>
                    <div className="forum-stat-label">answers</div>
                  </div>
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{q.viewCount || 0}</div>
                    <div className="forum-stat-label">views</div>
                  </div>
                  <div className="forum-stat-box forum-stat-bookmark">
                    {user ? (
                      <button
                        type="button"
                        className="forum-bookmark-hit"
                        title={q.isBookmarked ? 'Remove bookmark' : 'Save question'}
                        onClick={(e) => toggleQuestionBookmark(q, e)}
                        aria-pressed={!!q.isBookmarked}
                      >
                        <span className={`forum-bookmark-icon ${q.isBookmarked ? 'on' : ''}`}>{q.isBookmarked ? '★' : '☆'}</span>
                        <span className="forum-stat-value forum-stat-value-sm">{q.bookmarkCount ?? 0}</span>
                      </button>
                    ) : (
                      <>
                        <span className="forum-bookmark-icon dim">☆</span>
                        <span className="forum-stat-value forum-stat-value-sm">{q.bookmarkCount ?? 0}</span>
                      </>
                    )}
                    <div className="forum-stat-label">saved</div>
                  </div>
                </div>
                <div className="forum-card-main">
                  <Link to={`/user-dashboard/questions/${q._id}`} className="forum-question-link">{q.title}</Link>
                  <p className="forum-question-snippet">{q.description?.slice(0, 220)}...</p>
                  <div className="forum-card-footer">
                    <div className="forum-tags-row">
                      {(q.tags || []).map((t) => <span key={t} className="forum-tag-pill">{t}</span>)}
                    </div>
                    <small className="forum-author-line">by {q.user?.username} ♦ {q.user?.reputationScore || 0}</small>
                  </div>
                </div>
              </div>
            </article>
          ))}
          {!questions.length && <p className="forum-state-note">{listMode === 'saved-q' ? 'No saved questions yet.' : 'No questions found.'}</p>}
        </div>
      )}
    </div>
  );
};

export default StackOver;

