import React, { useState, useEffect } from 'react';
import { gamesAPI } from '../api/games';
import '../styles/InviteModal.css';

const InviteModal = ({ student, onClose, onInviteSent }) => {
  const [moduleCode, setModuleCode] = useState('');
  const [lectureStart, setLectureStart] = useState(1);
  const [lectureEnd, setLectureEnd] = useState(5);
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!moduleCode.trim()) {
      setError('Please enter a module code');
      return;
    }

    if (lectureStart > lectureEnd) {
      setError('Start lecture must be less than or equal to end lecture');
      return;
    }

    setLoading(true);

    try {
      const { invite } = await gamesAPI.createInvite({
        toUserId: student._id,
        moduleCode: moduleCode.toUpperCase(),
        lectureStart: parseInt(lectureStart),
        lectureEnd: parseInt(lectureEnd),
        questionCount: parseInt(questionCount),
        timePerQuestion: parseInt(timePerQuestion),
      });

      onInviteSent(invite._id);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite');
      setLoading(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content invite-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Invite {student.username} to Battle</h2>
          <button className="modal-close" onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} className="invite-form">
          {error && <div className="error-message">{error}</div>}

          <div className="form-group">
            <label>Module Code</label>
            <input
              type="text"
              value={moduleCode}
              onChange={(e) => setModuleCode(e.target.value)}
              placeholder="e.g., CS101"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Lecture Start</label>
              <input
                type="number"
                value={lectureStart}
                onChange={(e) => setLectureStart(e.target.value)}
                min="1"
                required
              />
            </div>

            <div className="form-group">
              <label>Lecture End</label>
              <input
                type="number"
                value={lectureEnd}
                onChange={(e) => setLectureEnd(e.target.value)}
                min="1"
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label>Number of Questions</label>
            <select
              value={questionCount}
              onChange={(e) => setQuestionCount(e.target.value)}
            >
              <option value="5">5 Questions</option>
              <option value="10">10 Questions</option>
              <option value="15">15 Questions</option>
              <option value="20">20 Questions</option>
            </select>
          </div>

          <div className="form-group">
            <label>Time per Question (seconds)</label>
            <select
              value={timePerQuestion}
              onChange={(e) => setTimePerQuestion(e.target.value)}
            >
              <option value="10">10 seconds</option>
              <option value="15">15 seconds</option>
              <option value="20">20 seconds</option>
              <option value="30">30 seconds</option>
            </select>
          </div>

          <div className="modal-actions">
            <button type="button" className="btn-secondary" onClick={onClose} disabled={loading}>
              Cancel
            </button>
            <button type="submit" className="btn-primary" disabled={loading}>
              {loading ? 'Sending...' : 'Send Invite'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default InviteModal;
