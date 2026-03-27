import React, { useEffect, useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/axios';
import '../styles/StackOver.css';

const TAGS = ['cn', 'dms', 'se', 'esd', 'dbms', 'os', 'networking', 'java', 'python', 'sql'];

const StackOver = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [tagsText, setTagsText] = useState('');
  const [similar, setSimilar] = useState([]);
  const [similarLoading, setSimilarLoading] = useState(false);
  const [searchInput, setSearchInput] = useState('');
  const [filters, setFilters] = useState({ search: '', answered: '', sort: 'new' });

  const queryString = useMemo(() => {
    const q = new URLSearchParams();
    if (filters.search) q.set('search', filters.search);
    if (filters.answered) q.set('answered', filters.answered);
    if (filters.sort) q.set('sort', filters.sort);
    return q.toString();
  }, [filters]);

  const fetchQuestions = async () => {
    setLoading(true);
    try {
      const { data } = await api.get(`/questions${queryString ? `?${queryString}` : ''}`);
      setQuestions(data.data || []);
    } catch (err) {
      console.error(err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, [queryString]);

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

  const submitQuestion = async (e) => {
    e.preventDefault();
    try {
      if (invalidTags.length) {
        alert(`Invalid tag(s): ${invalidTags.join(', ')}. Allowed: ${TAGS.join(', ')}`);
        return;
      }
      await api.post('/questions', { title, description, tags: parsedTags });
      setTitle('');
      setDescription('');
      setTagsText('');
      setShowForm(false);
      fetchQuestions();
    } catch (err) {
      alert(err.message);
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
        <button onClick={() => setTab('new')} className={`forum-tab ${activeTab === 'new' ? 'active' : ''}`}>Newest</button>
        <button onClick={() => setTab('votes')} className={`forum-tab ${activeTab === 'votes' ? 'active' : ''}`}>Most Voted</button>
        <button onClick={() => setTab('unanswered')} className={`forum-tab ${activeTab === 'unanswered' ? 'active' : ''}`}>Unanswered</button>
      </div>

      {showForm && (
        <div className="ask-modal-backdrop" role="dialog" aria-modal="true" onMouseDown={(e) => {
          if (e.target === e.currentTarget) setShowForm(false);
        }}>
          <form onSubmit={submitQuestion} className="ask-modal-card">
            <div className="ask-head-row">
              <div>
                <h2 className="ask-title">Ask a Question</h2>
                <p className="ask-subtitle">Be specific and clear to get the best answers.</p>
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
                placeholder="e.g., How do I use useEffect with async functions?"
                minLength={10}
                maxLength={200}
                required
                className="forum-input"
              />
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
                placeholder="Describe your question in detail..."
                minLength={20}
                required
                rows={7}
                className="forum-input ask-textarea"
              />
            </div>

            <div className="ask-field ask-last-field">
              <label className="ask-label">Tags</label>
              <div className="ask-help">Add up to 5 tags separated by commas</div>
              <input
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
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
            </div>

            <div className="ask-actions">
              <button type="submit" className="forum-primary-btn ask-submit-btn">Post Question</button>
              <button type="button" onClick={() => setShowForm(false)} className="ask-cancel-btn">Cancel</button>
            </div>
          </form>
        </div>
      )}

      {loading ? (
        <p className="forum-state-note">Loading...</p>
      ) : (
        <div className="forum-card-list">
          {questions.map((q) => (
            <article key={q._id} className="forum-card">
              <div className="forum-card-inner">
                <div className="forum-stats-col">
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{q.voteScore || 0}</div>
                    <div className="forum-stat-label">votes</div>
                  </div>
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{q.answerCount || q.answers?.length || 0}</div>
                    <div className="forum-stat-label">answers</div>
                  </div>
                  <div className="forum-stat-box">
                    <div className="forum-stat-value">{q.viewCount || 0}</div>
                    <div className="forum-stat-label">views</div>
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
          {!questions.length && <p className="forum-state-note">No questions found.</p>}
        </div>
      )}
    </div>
  );
};

export default StackOver;

