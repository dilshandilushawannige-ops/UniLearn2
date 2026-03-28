import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gamesAPI } from '../api/games';
import { modulesAPI } from '../api/modules';
import { resourcesAPI } from '../api/resources';
import '../styles/GameInvite.css';

const GameInvite = () => {
  const { studentId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [student, setStudent] = useState(null);
  const [onlineCount, setOnlineCount] = useState(0);
  const [modules, setModules] = useState([]);
  const [moduleCode, setModuleCode] = useState('');
  const [lectureStart, setLectureStart] = useState(1);
  const [lectureEnd, setLectureEnd] = useState(12);
  const [questionCount, setQuestionCount] = useState(10);
  const [timePerQuestion, setTimePerQuestion] = useState(15);
  const [customTime, setCustomTime] = useState('');
  const [loading, setLoading] = useState(false);
  const [loadingModules, setLoadingModules] = useState(true);
  const [error, setError] = useState('');
  const [availableLectures, setAvailableLectures] = useState([]);

  useEffect(() => {
    // Fetch student info, online count, and modules
    fetchInitialData();
  }, [studentId, user]);

  const fetchInitialData = async () => {
    try {
      // Fetch online students
      const { students } = await gamesAPI.getOnlineStudents();
      const targetStudent = students.find(s => s._id === studentId);
      if (targetStudent) {
        setStudent(targetStudent);
      }
      setOnlineCount(students.length);

      // Fetch modules for current year and semester
      if (user) {
        setLoadingModules(true);
        const modulesData = await modulesAPI.getModules({
          year: user.currentYear,
          semester: user.currentSemester
        });
        setModules(modulesData || []);
        setLoadingModules(false);
      }
    } catch (error) {
      console.error('Error fetching initial data:', error);
      setLoadingModules(false);
    }
  };

  // Fetch available lecture PDFs when module is selected
  useEffect(() => {
    if (!moduleCode || !user) {
      setAvailableLectures([]);
      return;
    }
    resourcesAPI.getAll({
      year: user.currentYear,
      semester: user.currentSemester,
      moduleCode,
      resourceType: 'lecture_pdf'
    })
      .then((data) => setAvailableLectures(data.sort((a, b) => a.lectureNo - b.lectureNo)))
      .catch(() => setAvailableLectures([]));
  }, [moduleCode, user]);

  const handleQuestionCountSelect = (count) => {
    setQuestionCount(count);
  };

  const handleTimeSelect = (time) => {
    setTimePerQuestion(time);
    setCustomTime('');
  };

  const handleQuickMatch = () => {
    // Quick match with default settings
    handleSubmit(true);
  };

  const handleChallengeFriend = () => {
    // Challenge with custom settings
    handleSubmit(false);
  };

  const handleSubmit = async (isQuickMatch) => {
    setError('');

    if (!moduleCode.trim()) {
      setError('Please select a module');
      return;
    }

    const startNum = parseInt(lectureStart);
    const endNum = parseInt(lectureEnd);

    // Validate lecture range (1-15)
    if (startNum < 1 || startNum > 15) {
      setError('Start lecture must be between 1 and 15');
      return;
    }

    if (endNum < 1 || endNum > 15) {
      setError('End lecture must be between 1 and 15');
      return;
    }

    if (startNum > endNum) {
      setError('Start lecture must be less than or equal to end lecture');
      return;
    }

    // Check for missing lectures
    if (availableLectures.length > 0) {
      const missingLectures = [];
      for (let i = startNum; i <= endNum; i++) {
        if (!availableLectures.some(lec => lec.lectureNo === i)) {
          missingLectures.push(i);
        }
      }

      if (missingLectures.length > 0) {
        setError(`Missing lecture PDFs: ${missingLectures.join(', ')}. Please upload all required lectures first.`);
        return;
      }
    }

    setLoading(true);

    try {
      const finalTime = customTime ? parseInt(customTime) : timePerQuestion;

      const { invite } = await gamesAPI.createInvite({
        toUserId: studentId,
        moduleCode: moduleCode.toUpperCase(),
        lectureStart: startNum,
        lectureEnd: endNum,
        questionCount: parseInt(questionCount),
        timePerQuestion: finalTime,
      });

      // Notify via socket
      if (socket) {
        socket.emit('invite:send', { inviteId: invite._id });
      }

      // Navigate back to games dashboard
      navigate('/user-dashboard/games');
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to send invite');
      setLoading(false);
    }
  };

  return (
    <div className="game-invite-page">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-container">
        <nav className="breadcrumb">
          <Link to="/user-dashboard" className="breadcrumb-item">
            <span className="breadcrumb-icon">🏠</span>
            Dashboard
          </Link>
          <span className="breadcrumb-separator">/</span>
          <Link to="/user-dashboard/games" className="breadcrumb-item">
            Games
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Challenge</span>
        </nav>
      </div>

      <div className="invite-container">
        {/* Left Side - Info */}
        <div className="invite-left">
          <div className="invite-badge">QUIZ REQUEST</div>
          <h1 className="invite-title">
            Challenge your <span className="highlight">Limits.</span>
          </h1>
          <p className="invite-description">
            Configure your personalized academic assessment. Select your modules and test
            your understanding with curated MCQs.
          </p>

          <div className="online-students-indicator">
            <div className="student-avatars">
              <div className="avatar-circle">👤</div>
              <div className="avatar-circle">👤</div>
              <div className="avatar-circle">👤</div>
            </div>
            <span className="online-text">{onlineCount} students online now</span>
          </div>
        </div>

        {/* Right Side - Form */}
        <div className="invite-right">
          <div className="invite-form-card">
            {error && <div className="error-banner">{error}</div>}

            {/* Module Selection */}
            <div className="form-section">
              <label className="form-label">ACADEMIC MODULE</label>
              {loadingModules ? (
                <div className="module-loading">Loading modules...</div>
              ) : modules.length === 0 ? (
                <div className="module-empty">No modules found for Year {user?.currentYear}, Semester {user?.currentSemester}</div>
              ) : (
                <select
                  className="module-select"
                  value={moduleCode}
                  onChange={(e) => setModuleCode(e.target.value)}
                >
                  <option value="">Select a module</option>
                  {modules.map((module) => (
                    <option key={module._id} value={module.moduleCode}>
                      {module.moduleName} ({module.moduleCode})
                    </option>
                  ))}
                </select>
              )}
            </div>

            {/* Available Lectures Info */}
            {moduleCode && availableLectures.length > 0 && (
              <div className="form-section">
                <div style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.85rem', 
                  backgroundColor: '#dbeafe', 
                  color: '#1e40af', 
                  borderRadius: '6px',
                  marginBottom: '0.5rem'
                }}>
                  Available lectures: {availableLectures.map(l => `Lec ${l.lectureNo}`).join(' · ')}
                </div>
              </div>
            )}
            {moduleCode && availableLectures.length === 0 && (
              <div className="form-section">
                <div style={{ 
                  padding: '0.5rem 0.75rem', 
                  fontSize: '0.85rem', 
                  backgroundColor: '#fee2e2', 
                  color: '#991b1b', 
                  borderRadius: '6px',
                  marginBottom: '0.5rem'
                }}>
                  No lecture PDFs uploaded for this module yet. Upload lecture PDFs first.
                </div>
              </div>
            )}

            {/* Lecture Range */}
            <div className="form-section">
              <div className="lecture-range">
                <div className="lecture-input-group">
                  <label className="form-label">START LECTURE</label>
                  <input
                    type="number"
                    className="lecture-input"
                    value={lectureStart}
                    onChange={(e) => setLectureStart(e.target.value)}
                    min="1"
                    max="15"
                  />
                </div>
                <div className="lecture-input-group">
                  <label className="form-label">END LECTURE</label>
                  <input
                    type="number"
                    className="lecture-input"
                    value={lectureEnd}
                    onChange={(e) => setLectureEnd(e.target.value)}
                    min="1"
                    max="15"
                  />
                </div>
              </div>
            </div>

            {/* Questions to Generate */}
            <div className="form-section">
              <label className="form-label">QUESTIONS TO GENERATE</label>
              <div className="question-options">
                <button
                  className={`option-btn ${questionCount === 5 ? 'active' : ''}`}
                  onClick={() => handleQuestionCountSelect(5)}
                >
                  5
                </button>
                <button
                  className={`option-btn ${questionCount === 10 ? 'active' : ''}`}
                  onClick={() => handleQuestionCountSelect(10)}
                >
                  10
                </button>
                <button
                  className={`option-btn ${questionCount === 15 ? 'active' : ''}`}
                  onClick={() => handleQuestionCountSelect(15)}
                >
                  15
                </button>
              </div>
            </div>

            {/* Time Per Question */}
            <div className="form-section">
              <label className="form-label">TIME PER QUESTION</label>
              <div className="time-options">
                <button
                  className={`time-btn ${timePerQuestion === 15 && !customTime ? 'active' : ''}`}
                  onClick={() => handleTimeSelect(15)}
                >
                  15s
                </button>
                <button
                  className={`time-btn ${timePerQuestion === 30 && !customTime ? 'active' : ''}`}
                  onClick={() => handleTimeSelect(30)}
                >
                  30s
                </button>
                <button
                  className={`time-btn ${timePerQuestion === 60 && !customTime ? 'active' : ''}`}
                  onClick={() => handleTimeSelect(60)}
                >
                  60s
                </button>
                <input
                  type="number"
                  className={`time-custom ${customTime ? 'active' : ''}`}
                  placeholder="Custom"
                  value={customTime}
                  onChange={(e) => {
                    setCustomTime(e.target.value);
                    if (e.target.value) {
                      setTimePerQuestion(parseInt(e.target.value) || 15);
                    }
                  }}
                  min="5"
                  max="300"
                />
              </div>
            </div>

            {/* Action Buttons */}
            <div className="form-actions">
              <button
                className="btn-quick-match"
                onClick={handleQuickMatch}
                disabled={loading || !moduleCode}
              >
                <span className="btn-icon">⚡</span>
                Quick Match
              </button>
              <button
                className="btn-challenge-friend"
                onClick={handleChallengeFriend}
                disabled={loading || !moduleCode}
              >
                <span className="btn-icon">👥</span>
                Challenge Friend
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default GameInvite;
