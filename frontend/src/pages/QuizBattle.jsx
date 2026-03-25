import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gamesAPI } from '../api/games';
import '../styles/QuizBattle.css';

const QuizBattle = () => {
  const { battleId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket } = useSocket();

  const [battle, setBattle] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [selectedAnswer, setSelectedAnswer] = useState(null);
  const [hasAnswered, setHasAnswered] = useState(false);
  const [timeLeft, setTimeLeft] = useState(0);
  const [player1Score, setPlayer1Score] = useState(0);
  const [player2Score, setPlayer2Score] = useState(0);
  const [battleStatus, setBattleStatus] = useState('waiting');
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);

  const timerRef = useRef(null);
  const questionStartTime = useRef(null);

  // Fetch battle data
  useEffect(() => {
    fetchBattle();
  }, [battleId]);

  // Join battle room via socket
  useEffect(() => {
    if (!socket || !battleId) return;

    socket.emit('battle:join', { battleId });

    socket.on('battle:waiting', () => {
      setBattleStatus('waiting');
    });

    socket.on('battle:started', (data) => {
      setBattleStatus('active');
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTimeLeft(data.timePerQuestion);
      questionStartTime.current = Date.now();
      startTimer(data.timePerQuestion);
    });

    socket.on('battle:reconnected', (data) => {
      setBattleStatus('active');
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
      setTimeLeft(battle?.timePerQuestion || 15);
      startTimer(battle?.timePerQuestion || 15);
    });

    socket.on('battle:answer_submitted', (data) => {
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
    });

    socket.on('battle:next_question', (data) => {
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
      setSelectedAnswer(null);
      setHasAnswered(false);
      setTimeLeft(battle?.timePerQuestion || 15);
      questionStartTime.current = Date.now();
      startTimer(battle?.timePerQuestion || 15);
    });

    socket.on('battle:finished', (data) => {
      setBattleStatus('finished');
      setResult({
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        winner: data.winner,
        isDraw: data.isDraw,
      });
      clearTimer();
    });

    socket.on('battle:error', (data) => {
      alert(data.message);
      navigate('/user-dashboard/games');
    });

    return () => {
      socket.off('battle:waiting');
      socket.off('battle:started');
      socket.off('battle:reconnected');
      socket.off('battle:answer_submitted');
      socket.off('battle:next_question');
      socket.off('battle:finished');
      socket.off('battle:error');
      clearTimer();
    };
  }, [socket, battleId, battle]);

  const fetchBattle = async () => {
    try {
      const { battle: battleData } = await gamesAPI.getBattle(battleId);
      setBattle(battleData);
      setPlayer1Score(battleData.player1Score);
      setPlayer2Score(battleData.player2Score);
      setBattleStatus(battleData.status);
      
      if (battleData.status === 'finished') {
        setResult({
          player1Score: battleData.player1Score,
          player2Score: battleData.player2Score,
          winner: battleData.winner,
          isDraw: !battleData.winner,
        });
      }
      
      setLoading(false);
    } catch (error) {
      console.error('Error fetching battle:', error);
      alert('Failed to load battle');
      navigate('/user-dashboard/games');
    }
  };

  const startTimer = (seconds) => {
    clearTimer();
    setTimeLeft(seconds);

    timerRef.current = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearTimer();
          handleTimeout();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);
  };

  const clearTimer = () => {
    if (timerRef.current) {
      clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  const handleAnswerSelect = (answerIndex) => {
    if (hasAnswered || battleStatus !== 'active') return;

    setSelectedAnswer(answerIndex);
    setHasAnswered(true);
    clearTimer();

    const timeSpent = Date.now() - questionStartTime.current;

    socket.emit('battle:answer', {
      battleId,
      questionIndex: currentQuestionIndex,
      selectedAnswer: answerIndex,
      timeSpent,
    });
  };

  const handleTimeout = () => {
    if (hasAnswered) return;

    setHasAnswered(true);
    socket.emit('battle:timeout', {
      battleId,
      questionIndex: currentQuestionIndex,
    });
  };

  const handlePlayAgain = () => {
    navigate('/user-dashboard/games');
  };

  const handleReturnToDashboard = () => {
    navigate('/user-dashboard/games');
  };

  if (loading) {
    return (
      <div className="battle-loading">
        <div className="loading-spinner"></div>
        <p>Loading battle...</p>
      </div>
    );
  }

  if (!battle) {
    return (
      <div className="battle-error">
        <p>Battle not found</p>
        <button onClick={handleReturnToDashboard}>Return to Dashboard</button>
      </div>
    );
  }

  const isPlayer1 = battle.player1._id === user?._id;
  const opponent = isPlayer1 ? battle.player2 : battle.player1;
  const myScore = isPlayer1 ? player1Score : player2Score;
  const opponentScore = isPlayer1 ? player2Score : player1Score;

  // Waiting screen
  if (battleStatus === 'waiting') {
    return (
      <div className="battle-waiting">
        <h2>Waiting for opponent...</h2>
        <div className="waiting-spinner"></div>
        <p>{opponent.username} is joining the battle</p>
      </div>
    );
  }

  // Result screen
  if (battleStatus === 'finished' && result) {
    const isWin = result.winner?._id === user?._id;
    const isDraw = result.isDraw;
    const resultType = isDraw ? 'draw' : isWin ? 'win' : 'loss';

    return (
      <div className="battle-result">
        <div className="result-container">
          <div className={`result-header result-${resultType}`}>
            <h1>{isDraw ? "It's a Draw!" : isWin ? 'Victory!' : 'Defeat'}</h1>
            <span className="result-badge">
              {isDraw ? 'TIED MATCH' : isWin ? 'YOU WON' : 'YOU LOST'}
            </span>
          </div>

          <div className="result-scores">
            <div className="result-player">
              <div className="player-avatar">{user?.username?.substring(0, 2).toUpperCase()}</div>
              <p>{user?.username}</p>
              <h2>{myScore}</h2>
            </div>
            <div className="result-vs">VS</div>
            <div className="result-player">
              <div className="player-avatar">{opponent.username?.substring(0, 2).toUpperCase()}</div>
              <p>{opponent.username}</p>
              <h2>{opponentScore}</h2>
            </div>
          </div>

          <div className="result-details">
            <div className="result-stats-grid">
              <div className="result-stat-card">
                <div className="result-stat-label">MODULE</div>
                <div className="result-stat-value" style={{ fontSize: '0.95rem' }}>{battle.moduleCode}</div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">QUESTIONS</div>
                <div className="result-stat-value">{battle.questionCount}</div>
              </div>
              <div className="result-stat-card">
                <div className="result-stat-label">ACCURACY</div>
                <div className="result-stat-value">{((myScore / battle.questionCount) * 100).toFixed(0)}%</div>
              </div>
            </div>
          </div>

          <div className="result-actions">
            <button className="btn-secondary" onClick={handleReturnToDashboard}>
              Dashboard
            </button>
            <button className="btn-primary" onClick={handlePlayAgain}>
              Play Again
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Battle screen
  return (
    <div className="quiz-battle">
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
          <span className="breadcrumb-item active">Battle</span>
        </nav>
      </div>

      {/* Header */}
      <div className="battle-header">
        <div className="player-info player-left">
          <div className="player-avatar-wrapper">
            <div className="player-avatar">
              <img src={`https://ui-avatars.com/api/?name=${user?.username}&background=4361ee&color=fff`} alt={user?.username} />
            </div>
            <span className="player-badge">YOU</span>
          </div>
          <div className="player-details">
            <div className="player-label">CURRENT POINTS</div>
            <div className="player-name">{user?.username}</div>
            <div className="player-score">{myScore}</div>
          </div>
        </div>

        <div className="battle-vs">
          <div className="vs-text">VS</div>
          <div className="timer-circle" style={{ '--progress': (timeLeft / battle.timePerQuestion) * 100 }}>
            <div className="timer-value">{timeLeft}s</div>
          </div>
        </div>

        <div className="player-info player-right">
          <div className="player-details">
            <div className="player-label">CURRENT POINTS</div>
            <div className="player-name">{opponent.username}</div>
            <div className="player-score">{opponentScore}</div>
          </div>
          <div className="player-avatar-wrapper">
            <div className="player-avatar">
              <img src={`https://ui-avatars.com/api/?name=${opponent.username}&background=7209b7&color=fff`} alt={opponent.username} />
            </div>
            <span className="player-badge opponent-badge">OPPONENT</span>
          </div>
        </div>
      </div>

      {/* Question */}
      {currentQuestion && (
        <div className="question-container">
          <div className="question-badge">
            {battle.moduleCode} • ADVANCED
          </div>

          <div className="question-card">
            <h2 className="question-text">{currentQuestion.q}</h2>

            <div className="options-grid">
              {currentQuestion.options.map((option, index) => (
                <button
                  key={index}
                  className={`option-btn ${selectedAnswer === index ? 'selected' : ''} ${hasAnswered ? 'disabled' : ''}`}
                  onClick={() => handleAnswerSelect(index)}
                  disabled={hasAnswered}
                >
                  <span className="option-letter">{String.fromCharCode(65 + index)}</span>
                  <span className="option-text">{option}</span>
                  {selectedAnswer === index && (
                    <span className="option-check">✓</span>
                  )}
                </button>
              ))}
            </div>

            {hasAnswered && (
              <div className="answer-feedback">
                <div className="feedback-dots">
                  <div className="feedback-dot"></div>
                  <div className="feedback-dot"></div>
                  <div className="feedback-dot"></div>
                </div>
                <p>Waiting for {opponent.username} to finalize answer...</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Footer */}
      <div className="battle-footer">
        <div className="footer-content">
          <div className="quiz-progress">
            <div className="progress-label">QUIZ PROGRESS</div>
            <div className="progress-text">Question {currentQuestionIndex + 1} / {battle.questionCount}</div>
            <div className="progress-bar-container">
              <div 
                className="progress-bar-fill" 
                style={{ width: `${((currentQuestionIndex + 1) / battle.questionCount) * 100}%` }}
              ></div>
            </div>
          </div>

          <div className="battle-intensity">
            <div className="intensity-label">BATTLE INTENSITY</div>
            <div className="intensity-bars">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div 
                  key={bar} 
                  className={`intensity-bar ${bar <= 3 ? 'active' : ''}`}
                ></div>
              ))}
            </div>
          </div>

          <div className="footer-actions">
            <button className="footer-btn">
              <span>🏳️</span> Surrender
            </button>
            <button className="footer-btn">
              <span>💬</span> Quick Chat
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizBattle;
