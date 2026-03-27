import React, { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import api from '../api/axios';
import { useAuth } from '../context/AuthContext';
import '../styles/StackOver.css';

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
      const res = await api.post('/answers', { questionId: id, content });
      const awarded = res.data?.awardedBadges || [];
      if (awarded.length) {
        setBadgeToast({ show: true, badges: awarded.map((b) => b.name) });
        setTimeout(() => setBadgeToast({ show: false, badges: [] }), 4200);
      }
      setContent('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const voteAnswer = async (answerId, type) => {
    try {
      await api.post(`/answers/${answerId}/vote`, { type });
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const acceptAnswer = async (answerId) => {
    try {
      await api.post(`/answers/${answerId}/accept`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const canAccept = question?.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role);
  const canEditQuestion = question?.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role);

  const updateQuestion = async (e) => {
    e.preventDefault();
    try {
      const tags = editQuestionForm.tags
        .split(',')
        .map((t) => t.trim().toLowerCase())
        .filter(Boolean);
      const payload = {
        title: editQuestionForm.title,
        description: editQuestionForm.description,
        tags: [...new Set(tags)].slice(0, 5),
      };
      const { data } = await api.put(`/questions/${id}`, payload);
      setQuestion((prev) => ({ ...prev, ...data.data }));
      setEditingQuestion(false);
    } catch (err) {
      alert(err.message);
    }
  };

  const removeQuestion = async () => {
    if (!window.confirm('Delete this question and all answers?')) return;
    try {
      await api.delete(`/questions/${id}`);
      navigate('/user-dashboard/questions');
    } catch (err) {
      alert(err.message);
    }
  };

  const startEditAnswer = (ans) => {
    setEditingAnswerId(ans._id);
    setEditAnswerText(ans.content);
  };

  const saveAnswerEdit = async (answerId) => {
    try {
      await api.put(`/answers/${answerId}`, { content: editAnswerText });
      setEditingAnswerId('');
      setEditAnswerText('');
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  const removeAnswer = async (answerId) => {
    if (!window.confirm('Delete this answer?')) return;
    try {
      await api.delete(`/answers/${answerId}`);
      fetchData();
    } catch (err) {
      alert(err.message);
    }
  };

  if (loading) return <div className="forum-shell"><p className="forum-state-note">Loading...</p></div>;
  if (!question) return <div className="forum-shell"><p className="forum-state-note">Question not found.</p></div>;

  return (
    <div className="forum-shell">
      <Link to="/user-dashboard/questions" className="forum-question-link">← Back</Link>

      <div className="forum-card" style={{ marginTop: 12 }}>
        {!editingQuestion ? (
          <>
            <h2 style={{ marginTop: 0 }}>{question.title}</h2>
            <p style={{ whiteSpace: 'pre-wrap' }}>{question.description}</p>
            <div className="forum-tags-row">
              {(question.tags || []).map((t) => <span key={t} className="forum-tag-pill">{t}</span>)}
            </div>
          </>
        ) : (
          <form onSubmit={updateQuestion}>
            <input className="forum-input" value={editQuestionForm.title} onChange={(e) => setEditQuestionForm((p) => ({ ...p, title: e.target.value }))} minLength={10} maxLength={200} required />
            <textarea className="forum-input ask-textarea" value={editQuestionForm.description} onChange={(e) => setEditQuestionForm((p) => ({ ...p, description: e.target.value }))} minLength={20} required rows={6} />
            <input className="forum-input" value={editQuestionForm.tags} onChange={(e) => setEditQuestionForm((p) => ({ ...p, tags: e.target.value }))} placeholder="tags comma separated" />
            <div className="ask-actions">
              <button type="submit" className="forum-primary-btn">Save</button>
              <button type="button" onClick={() => setEditingQuestion(false)} className="ask-cancel-btn">Cancel</button>
            </div>
          </form>
        )}

        {canEditQuestion && !editingQuestion && (
          <div style={{ marginTop: 12, display: 'flex', gap: 8 }}>
            <button className="forum-tab" type="button" onClick={() => setEditingQuestion(true)}>Edit</button>
            <button className="forum-tab" type="button" onClick={removeQuestion} style={{ color: '#b91c1c' }}>Delete</button>
          </div>
        )}
      </div>

      <form onSubmit={postAnswer} className="forum-card" style={{ marginTop: 12 }}>
        <h4 style={{ marginTop: 0 }}>Your answer</h4>
        <textarea className="forum-input ask-textarea" value={content} onChange={(e) => setContent(e.target.value)} minLength={10} rows={5} required />
        <button type="submit" className="forum-primary-btn" style={{ marginTop: 10 }}>Post Answer</button>
      </form>

      {badgeToast.show && (
        <div className="forum-card" style={{ marginTop: 12, borderColor: '#b7f7d7', background: '#ecfdf5' }}>
          <strong>Badge unlocked:</strong> {badgeToast.badges.join(', ')}
        </div>
      )}

      <div style={{ marginTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
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
                <textarea className="forum-input ask-textarea" value={editAnswerText} onChange={(e) => setEditAnswerText(e.target.value)} minLength={10} rows={4} />
                <div className="ask-actions" style={{ marginTop: 10 }}>
                  <button type="button" className="forum-primary-btn" onClick={() => saveAnswerEdit(ans._id)}>Save</button>
                  <button type="button" className="ask-cancel-btn" onClick={() => setEditingAnswerId('')}>Cancel</button>
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
                <span className="forum-state-note" style={{ marginRight: 6 }}>{ans.voteScore} votes</span>
                <button type="button" className="forum-tab" onClick={() => voteAnswer(ans._id, 'up')}>▲</button>
                <button type="button" className="forum-tab" onClick={() => voteAnswer(ans._id, 'down')}>▼</button>
                {canAccept && !ans.isAccepted && (
                  <button type="button" className="forum-tab" onClick={() => acceptAnswer(ans._id)}>Accept</button>
                )}
                {(ans.user?._id === user?._id || ['admin', 'moderator'].includes(user?.role)) && editingAnswerId !== ans._id && (
                  <>
                    <button type="button" className="forum-tab" onClick={() => startEditAnswer(ans)}>Edit</button>
                    <button type="button" className="forum-tab" onClick={() => removeAnswer(ans._id)} style={{ color: '#b91c1c' }}>Delete</button>
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

