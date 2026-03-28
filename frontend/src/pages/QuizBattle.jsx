import { useState, useEffect, useRef, memo } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gamesAPI } from '../api/games';
import Swal from 'sweetalert2';
import '../styles/QuizBattle.css';

// Memoized floating emoji component to prevent unnecessary re-renders
const FloatingEmoji = memo(({ emoji, startX, xDrift, duration, rotation, sizeVariation }) => (
  <div
    className="floating-emoji"
    style={{ 
      left: `${startX}%`,
      '--x-drift': `${xDrift}px`,
      '--rotation': `${rotation}deg`,
      '--size-variation': sizeVariation,
      animationDuration: `${duration}s`,
    }}
  >
    {emoji}
  </div>
));

FloatingEmoji.displayName = 'FloatingEmoji';

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
  const [floatingEmojis, setFloatingEmojis] = useState([]);
  const [battleStartTime, setBattleStartTime] = useState(null);
  const [completionTime, setCompletionTime] = useState(0);

  const timerRef = useRef(null);
  const questionStartTime = useRef(null);
  const emojiIdCounter = useRef(0);

  // Fetch battle data
  useEffect(() => {
    console.log('Fetching battle with ID:', battleId);
    fetchBattle();
  }, [battleId]);

  // Join battle room via socket
  useEffect(() => {
    if (!socket || !battleId) {
      console.log('Socket or battleId not ready:', { socket: !!socket, battleId });
      return;
    }

    console.log('Joining battle room:', battleId);
    socket.emit('battle:join', { battleId });

    socket.on('battle:waiting', () => {
      console.log('Battle status: waiting');
      setBattleStatus('waiting');
    });

    socket.on('battle:started', (data) => {
      console.log('Battle started:', data);
      setBattleStatus('active');
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setTimeLeft(data.timePerQuestion);
      questionStartTime.current = Date.now();
      setBattleStartTime(Date.now()); // Track battle start time
      startTimer(data.timePerQuestion);
    });

    socket.on('battle:reconnected', (data) => {
      console.log('Battle reconnected:', data);
      setBattleStatus('active');
      setCurrentQuestion(data.question);
      setCurrentQuestionIndex(data.currentQuestionIndex);
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
      setTimeLeft(battle?.timePerQuestion || 15);
      startTimer(battle?.timePerQuestion || 15);
    });

    socket.on('battle:answer_submitted', (data) => {
      console.log('Answer submitted:', data);
      setPlayer1Score(data.player1Score);
      setPlayer2Score(data.player2Score);
    });

    socket.on('battle:next_question', (data) => {
      console.log('Next question:', data);
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
      console.log('Battle finished:', data);
      setBattleStatus('finished');
      
      // Calculate actual completion time
      if (battleStartTime) {
        const endTime = Date.now();
        const totalSeconds = Math.floor((endTime - battleStartTime) / 1000);
        setCompletionTime(totalSeconds);
      }
      
      setResult({
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        winner: data.winner,
        isDraw: data.isDraw,
      });
      clearTimer();
    });

    socket.on('battle:surrendered', (data) => {
      console.log('Battle surrendered:', data);
      setBattleStatus('finished');
      
      // Calculate actual completion time
      if (battleStartTime) {
        const endTime = Date.now();
        const totalSeconds = Math.floor((endTime - battleStartTime) / 1000);
        setCompletionTime(totalSeconds);
      }
      
      const isSurrenderer = data.surrenderedBy._id === user?._id;
      
      setResult({
        player1Score: data.player1Score,
        player2Score: data.player2Score,
        winner: data.winner,
        isDraw: false,
        surrendered: true,
        surrenderedBy: data.surrenderedBy,
      });
      clearTimer();
      
      // Show SweetAlert2 notification in top-right
      if (isSurrenderer) {
        Swal.fire({
          position: 'top-end',
          icon: 'info',
          title: 'You Surrendered',
          html: `<strong>${data.winner.username}</strong> wins the battle!`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          toast: true,
          background: '#fee2e2',
          color: '#991b1b',
          iconColor: '#dc2626',
          customClass: {
            popup: 'surrender-toast',
            title: 'surrender-toast-title',
          }
        });
      } else {
        Swal.fire({
          position: 'top-end',
          icon: 'success',
          title: 'Victory!',
          html: `<strong>${data.surrenderedBy.username}</strong> surrendered. You win!`,
          showConfirmButton: false,
          timer: 3000,
          timerProgressBar: true,
          toast: true,
          background: '#dcfce7',
          color: '#166534',
          iconColor: '#16a34a',
          customClass: {
            popup: 'surrender-toast',
            title: 'surrender-toast-title',
          }
        });
      }
    });

    socket.on('battle:reaction_received', (data) => {
      console.log('Reaction received from opponent:', data);
      // Add the received emoji to the floating emojis
      const id = Date.now() + Math.random();
      const newEmoji = {
        id,
        emoji: data.emoji,
        startX: 20 + Math.random() * 60,
        xDrift: (Math.random() - 0.5) * 50,
        duration: 2 + Math.random() * 0.4,
        rotation: (Math.random() - 0.5) * 30,
        sizeVariation: 0.95 + Math.random() * 0.1,
        delay: 0,
      };
      
      setFloatingEmojis(prev => [...prev, newEmoji]);
      
      setTimeout(() => {
        setFloatingEmojis(prev => prev.filter(e => e.id !== id));
      }, newEmoji.duration * 1000 + 50);
    });

    socket.on('battle:error', (data) => {
      console.error('Battle error:', data);
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
      socket.off('battle:surrendered');
      socket.off('battle:reaction_received');
      socket.off('battle:error');
      clearTimer();
    };
  }, [socket, battleId, battle]);

  const fetchBattle = async () => {
    try {
      console.log('Fetching battle data for:', battleId);
      const { battle: battleData } = await gamesAPI.getBattle(battleId);        
      console.log('Battle data received:', battleData);
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
      alert('Failed to load battle: ' + (error.response?.data?.message || error.message));
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
    // Don't clear timer - let it continue running

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

  const handleSurrender = () => {
    Swal.fire({
      title: 'Surrender Battle?',
      html: 'Are you sure you want to surrender?<br><strong>Your opponent will win the battle.</strong>',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#dc2626',
      cancelButtonColor: '#6b7280',
      confirmButtonText: '🏳️ Yes, Surrender',
      cancelButtonText: 'Cancel',
      reverseButtons: true,
      customClass: {
        popup: 'surrender-confirm-popup',
        title: 'surrender-confirm-title',
        confirmButton: 'surrender-confirm-btn',
        cancelButton: 'surrender-cancel-btn',
      }
    }).then((result) => {
      if (result.isConfirmed) {
        socket.emit('battle:surrender', { battleId });
      }
    });
  };

  const handleReactionClick = (emoji) => {
    const id = Date.now() + Math.random(); // Unique ID
    
    // Generate random animation properties for natural variation
    const newEmoji = {
      id,
      emoji,
      // Random horizontal starting position within reaction button area
      startX: 20 + Math.random() * 60, // 20-80% of sidebar width
      // Random horizontal drift (-25px to +25px) - reduced for smoother feel
      xDrift: (Math.random() - 0.5) * 50,
      // Random duration (2-2.4 seconds) - optimized for smoothness
      duration: 2 + Math.random() * 0.4,
      // Random rotation (-15 to +15 degrees) - reduced for less distraction
      rotation: (Math.random() - 0.5) * 30,
      // Random size variation (0.95-1.05) - subtle variation
      sizeVariation: 0.95 + Math.random() * 0.1,
      // No delay for instant response
      delay: 0,
    };
    
    // Use functional update to prevent stale closure issues
    setFloatingEmojis(prev => [...prev, newEmoji]);
    
    // Send reaction to opponent via socket
    socket.emit('battle:reaction', {
      battleId,
      emoji,
    });
    
    // Remove emoji after animation completes (with small buffer)
    setTimeout(() => {
      setFloatingEmojis(prev => prev.filter(e => e.id !== id));
    }, newEmoji.duration * 1000 + 50);
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
    const accuracy = ((myScore / battle.questionCount) * 100).toFixed(0);

    return (
      <div className="battle-result">
        <div className="result-container">
          {/* Header */}
          <div className="result-top-header">
            <span className="result-subtitle">QUIZ DUEL COMPLETED</span>
            <h1 className="result-module-title">{battle.moduleCode}</h1>
            <div className="result-title-underline"></div>
          </div>

          {/* Main Content Grid */}
          <div className="result-content-grid">
            {/* Left: Victory Badge */}
            <div className="result-left-section">
              <div className={`result-badge-circle result-badge-${resultType}`}>
                <div className="result-badge-icon">
                  <img 
                    src={isDraw ? '/src/assets/draw-icon.png' : isWin ? '/src/assets/victory-icon.png' : '/src/assets/defeat-icon.png'} 
                    alt={isDraw ? 'Draw' : isWin ? 'Victory' : 'Defeat'}
                  />
                </div>
                <div className="result-badge-text">
                  {isDraw ? 'DRAW' : isWin ? 'VICTORY' : 'DEFEAT'}
                </div>
              </div>
              <div className="result-accuracy-badge">
                {accuracy}% Accuracy
              </div>
            </div>

            {/* Middle: Score Comparison */}
            <div className="result-middle-section">
              <div className="result-score-block">
                <div className="result-score-label">YOUR SCORE</div>
                <div className="result-score-number">{String(myScore).padStart(2, '0')}</div>
                <div className="result-score-level">
                  {myScore >= battle.questionCount * 0.8 ? 'Expert Level' : 
                   myScore >= battle.questionCount * 0.6 ? 'Proficient Level' : 
                   myScore >= battle.questionCount * 0.4 ? 'Intermediate Level' : 'Beginner Level'}
                </div>
              </div>

              <div className="result-divider"></div>

              <div className="result-score-block opponent-block">
                <div className="result-score-label">OPPONENT</div>
                <div className="result-score-number opponent-score">{String(opponentScore).padStart(2, '0')}</div>
                <div className="result-score-name">{opponent.username}</div>
              </div>

              {/* Progress Bar */}
              <div className="result-progress-section">
                <div className="result-progress-labels">
                  <span>Correct ({myScore})</span>
                  <span>Incorrect ({battle.questionCount - myScore})</span>
                </div>
                <div className="result-progress-bar">
                  <div 
                    className="result-progress-fill"
                    style={{ width: `${(myScore / battle.questionCount) * 100}%` }}
                  ></div>
                </div>
              </div>
            </div>

            {/* Right: Stats Cards */}
            <div className="result-right-section">
              <div className="result-stat-card-small">
                <div className="result-stat-icon">
                  <img src="/src/assets/timers-icon.png" alt="Timer" />
                </div>
                <div className="result-stat-content">
                  <div className="result-stat-label-small">COMPLETION TIME</div>
                  <div className="result-stat-value-small">
                    {Math.floor(completionTime / 60)}m {completionTime % 60}s
                  </div>
                </div>
              </div>

              <div className="result-stat-card-small">
                <div className="result-stat-icon">
                  <img src="/src/assets/star-icon.png" alt="Star" />
                </div>
                <div className="result-stat-content">
                  <div className="result-stat-label-small">GLOBAL RANK</div>
                  <div className="result-stat-value-small">
                    #{Math.floor(Math.random() * 100) + 1} <span className="rank-change">+{Math.floor(Math.random() * 20) + 1}</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="result-actions-new">
            <button className="btn-play-again" onClick={handlePlayAgain}>
              Play Again
            </button>
            <button className="btn-dashboard" onClick={handleReturnToDashboard}>
              Back to Dashboard
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Battle screen
  return (
    <div className="quiz-battle">
      <div className="battle-layout">
        {/* Left Section - Question */}
        <div className="battle-left">
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
                <h3 className="player-name">{user?.username}</h3>
                <div className="player-label">CURRENT POINTS</div>
                <div className="player-score">{myScore}</div>
              </div>
            </div>

            <div className="battle-vs">
              <div className="vs-text">VS</div>
            </div>

            <div className="player-info player-right">
              <div className="player-details">
                <h3 className="player-name">{opponent.username}</h3>
                <div className="player-label">CURRENT POINTS</div>
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
        </div>

        {/* Right Sidebar */}
        <div className="battle-sidebar">
          {/* Timer */}
          <div className="sidebar-section">
            <div className="sidebar-label">TIME REMAINING</div>
            <div className={`timer-circle ${timeLeft <= 5 ? 'timer-warning' : ''}`} style={{ '--progress': (timeLeft / battle.timePerQuestion) * 100 }}>
              <div className="timer-value">{timeLeft}s</div>
            </div>
          </div>

          {/* Quiz Progress */}
          <div className="sidebar-section">
            <div className="sidebar-label">QUIZ PROGRESS</div>
            <div className="progress-display">
              <span className="progress-current">{String(currentQuestionIndex + 1).padStart(2, '0')}</span>
              <span className="progress-separator">/</span>
              <span className="progress-total">{battle.questionCount}</span>
            </div>
            <div className="progress-bar-container">
              <div
                className="progress-bar-fill"
                style={{ width: `${((currentQuestionIndex + 1) / battle.questionCount) * 100}%` }}
              ></div>
            </div>
          </div>

          {/* Battle Intensity */}
          <div className="sidebar-section">
            <div className="sidebar-label">BATTLE INTENSITY</div>
            <div className="intensity-bars">
              {[1, 2, 3, 4, 5].map((bar) => (
                <div
                  key={bar}
                  className={`intensity-bar ${bar <= 3 ? 'active' : ''}`}       
                ></div>
              ))}
            </div>
            <div className="intensity-text">High competition detected!</div>
          </div>

          {/* Reactions */}
          <div className="sidebar-section">
            <div className="sidebar-label">REACTIONS</div>
            <div className="reactions-grid">
              <button className="reaction-btn" onClick={() => handleReactionClick('💗')}>💗</button>
              <button className="reaction-btn" onClick={() => handleReactionClick('🔥')}>🔥</button>
              <button className="reaction-btn" onClick={() => handleReactionClick('😊')}>😊</button>
              <button className="reaction-btn" onClick={() => handleReactionClick('👍')}>👍</button>
              <button className="reaction-btn" onClick={() => handleReactionClick('😱')}>😱</button>
            </div>
          </div>

          {/* Floating Emojis - Inside Sidebar */}
          <div className="floating-emojis-container">
            {floatingEmojis.map(({ id, emoji, startX, xDrift, duration, rotation, sizeVariation }) => (
              <FloatingEmoji
                key={id}
                emoji={emoji}
                startX={startX}
                xDrift={xDrift}
                duration={duration}
                rotation={rotation}
                sizeVariation={sizeVariation}
              />
            ))}
          </div>

          {/* Surrender Button - Below Reactions */}
          <div className="sidebar-section surrender-section">
            <button className="surrender-btn" onClick={handleSurrender}>
              <span>🏳️</span> Surrender
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuizBattle;
