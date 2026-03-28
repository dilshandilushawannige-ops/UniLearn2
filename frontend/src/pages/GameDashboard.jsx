import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useSocket } from '../context/SocketContext';
import { gamesAPI } from '../api/games';
import InviteNotification from '../components/InviteNotification';
import BattleToast from '../components/BattleToast';
import BattleReadyModal from '../components/BattleReadyModal';
import '../styles/GameDashboard.css';

const GameDashboard = () => {
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const navigate = useNavigate();

  const [onlineStudents, setOnlineStudents] = useState([]);
  const [activeInvites, setActiveInvites] = useState([]);
  const [battleHistory, setBattleHistory] = useState([]);
  const [stats, setStats] = useState(null);
  const [incomingInvite, setIncomingInvite] = useState(null);
  const [generatingBattle, setGeneratingBattle] = useState(null);
  const [battleReady, setBattleReady] = useState(null);

  // Fetch initial data
  useEffect(() => {
    fetchGameData();
  }, []);

  // Socket event listeners
  useEffect(() => {
    if (!socket) return;

    console.log('Setting up socket listeners, connected:', connected);

    // Request initial online users when socket connects
    const handleConnect = () => {
      console.log('Socket connected, requesting online users');
      socket.emit('users:request');
    };

    if (connected) {
      socket.emit('users:request');
    }

    socket.on('connect', handleConnect);

    socket.on('users:online', (data) => {
      console.log('Received users:online event:', data);
      setOnlineStudents(data.users || []);
    });

    socket.on('invite:received', (data) => {
      setIncomingInvite(data.invite);
      fetchActiveInvites(); // Refresh invites list
    });

    socket.on('battle:generating', (data) => {
      console.log('Battle generating:', data);
      setGeneratingBattle(data);
    });

    socket.on('battle:ready', (data) => {
      console.log('Battle ready:', data);
      const { battleId, player1Id, player2Id } = data;
      
      // Check if current user is one of the players
      if (user && (user._id === player1Id || user._id === player2Id)) {
        setGeneratingBattle(null); // Hide generating toast
        setBattleReady(battleId); // Show ready modal
      }
    });

    socket.on('invite:accepted', (data) => {
      // Inviter receives this - don't navigate, just show toast
      console.log('Invite accepted:', data);
      fetchActiveInvites();
    });

    socket.on('invite:rejected', (data) => {
      alert(`Your invite was rejected by ${data.rejectedBy}`);
      fetchActiveInvites();
    });

    return () => {
      socket.off('connect', handleConnect);
      socket.off('users:online');
      socket.off('invite:received');
      socket.off('battle:generating');
      socket.off('battle:ready');
      socket.off('invite:accepted');
      socket.off('invite:rejected');
    };
  }, [socket, connected, user]);

  const fetchOnlineStudents = async () => {
    try {
      const { students } = await gamesAPI.getOnlineStudents();
      console.log('Fetched online students:', students);
      setOnlineStudents(students || []);
    } catch (error) {
      console.error('Error fetching online students:', error);
    }
  };

  const fetchGameData = async () => {
    try {
      const [invitesRes, historyRes, statsRes] = await Promise.all([
        gamesAPI.getInvites(),
        gamesAPI.getBattleHistory(),
        gamesAPI.getGameStats(),
      ]);

      setActiveInvites(invitesRes.invites || []);
      setBattleHistory(historyRes.battles || []);
      setStats(statsRes.stats);
    } catch (error) {
      console.error('Error fetching game data:', error);
    }
  };

  const fetchActiveInvites = async () => {
    try {
      const { invites } = await gamesAPI.getInvites();
      setActiveInvites(invites || []);
    } catch (error) {
      console.error('Error fetching invites:', error);
    }
  };

  const handleInviteClick = (student) => {
    // Navigate to invite page
    navigate(`/user-dashboard/games/invite/${student._id}`);
  };

  const handleBattleRedirect = useCallback((battleId) => {
    console.log('handleBattleRedirect called with:', battleId);
    setBattleReady(null);
    navigate(`/user-dashboard/games/battle/${battleId}`);
  }, [navigate]);

  const getStudentStatus = (student) => {
    return student.status || 'online';
  };

  const isStudentInvitable = (student) => {
    const status = getStudentStatus(student);
    if (status === 'in_game') return false;

    // Check if already invited
    const hasPendingInvite = activeInvites.some(
      (inv) =>
        inv.status === 'pending' &&
        (inv.toUser._id === student._id || inv.fromUser._id === student._id)
    );

    return !hasPendingInvite;
  };

  return (
    <div className="game-dashboard">
      {/* Breadcrumb Navigation */}
      <div className="breadcrumb-container">
        <nav className="breadcrumb">
          <Link to="/user-dashboard" className="breadcrumb-item">
            <span className="breadcrumb-icon">🏠</span>
            Dashboard
          </Link>
          <span className="breadcrumb-separator">/</span>
          <span className="breadcrumb-item active">Games</span>
        </nav>
      </div>

      {/* Hero Header */}
      <div className="game-hero">
        <div className="hero-badge">GAMER PROFILE: YEAR {user?.currentYear}, SEM {user?.currentSemester}</div>
        <h1 className="hero-title">
          Quiz Battle: <span className="hero-highlight">Prove Your Knowledge</span>
        </h1>
        <p className="hero-description">
          Challenge your peers from Year {user?.currentYear} Semester {user?.currentSemester} to real-time academic duels. 
          Enhance your retention while climbing the global leaderboard.
        </p>

        {!connected && (
          <div className="connection-warning">
            ⚠️ Connecting to game server...
          </div>
        )}

        {/* Stats Cards */}
        {stats && (
          <div className="hero-stats">
            <div className="hero-stat">
              <div className="stat-label">RANK</div>
              <div className="stat-value rank">#12</div>
            </div>
            <div className="hero-stat">
              <div className="stat-label">WIN RATE</div>
              <div className="stat-value winrate">{stats.winRate}%</div>
            </div>
            <div className="hero-stat">
              <div className="stat-label">TOTAL BATTLES</div>
              <div className="stat-value total">{stats.totalBattles}</div>
            </div>
          </div>
        )}
      </div>

      <div className="game-content">
        {/* Left Column */}
        <div className="game-left-column">
          {/* Online Peers */}
          <div className="game-section online-peers-section">
            <div className="section-header">
              <h2>Online Peers</h2>
              <span className="active-badge">{onlineStudents.length} Active Students</span>
            </div>
            
            {onlineStudents.length === 0 ? (
              <div className="empty-state">
                <p>No one else is online in your year and semester right now.</p>
                <p className="empty-state-hint">Check back later or invite friends to join!</p>
              </div>
            ) : (
              <div className="peers-list">
                {onlineStudents.map((student) => {
                  const status = getStudentStatus(student);
                  const invitable = isStudentInvitable(student);

                  return (
                    <div key={student._id || student.socketId} className="peer-card">
                      <div className="peer-left">
                        <div className="peer-avatar">
                          <img src={`https://ui-avatars.com/api/?name=${student.username}&background=random`} alt={student.username} />
                          <span className={`status-dot ${status === 'in_game' ? 'busy' : 'online'}`}></span>
                        </div>
                        <div className="peer-info">
                          <h3>{student.username}</h3>
                          <p className="peer-status">
                            Status: <span className={status === 'in_game' ? 'status-busy' : 'status-online'}>
                              {status === 'in_game' ? 'In Game' : 'Online'}
                            </span>
                          </p>
                        </div>
                      </div>
                      <button
                        className={`invite-button ${!invitable ? 'disabled' : ''}`}
                        onClick={() => handleInviteClick(student)}
                        disabled={!invitable || !connected}
                      >
                        {invitable ? 'Invite' : status === 'in_game' ? 'Invite' : 'Invite'}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Matches */}
          <div className="game-section recent-matches-section">
            <h2>Recent Matches</h2>
            
            {battleHistory.length === 0 ? (
              <div className="empty-state-small">
                <p>No battle history yet</p>
                <p className="empty-state-hint">Start your first battle!</p>
              </div>
            ) : (
              <div className="matches-table">
                <div className="table-header">
                  <div className="col-opponent">OPPONENT</div>
                  <div className="col-module">MODULE</div>
                  <div className="col-result">RESULT</div>
                  <div className="col-score">SCORE</div>
                  <div className="col-date">DATE</div>
                </div>
                {battleHistory.slice(0, 10).map((battle) => {
                  const isPlayer1 = battle.player1._id === user?._id;
                  const opponent = isPlayer1 ? battle.player2 : battle.player1;
                  const myScore = isPlayer1 ? battle.player1Score : battle.player2Score;
                  const opponentScore = isPlayer1 ? battle.player2Score : battle.player1Score;
                  
                  const isWin = battle.winner?._id === user?._id;
                  const isDraw = !battle.winner;
                  const result = isDraw ? 'draw' : isWin ? 'win' : 'loss';

                  return (
                    <div key={battle._id} className="table-row">
                      <div className="col-opponent">
                        <div className="opponent-cell">
                          <div className="opponent-avatar">
                            {opponent.username?.substring(0, 2).toUpperCase()}
                          </div>
                          <span>{opponent.username}</span>
                        </div>
                      </div>
                      <div className="col-module">{battle.moduleCode}</div>
                      <div className="col-result">
                        <span className={`result-badge ${result}`}>
                          {isDraw ? 'DRAW' : isWin ? 'WIN' : 'LOSS'}
                        </span>
                      </div>
                      <div className="col-score">{myScore} - {opponentScore}</div>
                      <div className="col-date">
                        {new Date(battle.finishedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>

        {/* Right Column */}
        <div className="game-right-column">
          {/* Active Invitations */}
          <div className="game-section invites-section">
            <div className="section-header-icon">
              <span className="icon">✉️</span>
              <h2>Active Invitations</h2>
            </div>
            
            {activeInvites.length === 0 ? (
              <div className="empty-state-small">
                <p>No active invitations</p>
              </div>
            ) : (
              <div className="invites-list-new">
                {activeInvites.map((invite) => {
                  const isReceived = invite.toUser._id === user?._id;
                  const otherUser = isReceived ? invite.fromUser : invite.toUser;

                  return (
                    <div key={invite._id} className="invite-card-new">
                      <div className="invite-avatar">
                        <img src={`https://ui-avatars.com/api/?name=${otherUser.username}&background=random`} alt={otherUser.username} />
                      </div>
                      <div className="invite-content">
                        <h4>{isReceived ? "Professor's Choice Battle" : "Challenge Sent"}</h4>
                        <p className="invite-from-text">
                          {isReceived ? 'From' : 'To'} <strong>{otherUser.username}</strong>
                        </p>
                        {isReceived && <span className="bonus-badge">BONUS XP</span>}
                        <div className="invite-actions">
                          <button className="btn-decline">Decline</button>
                          <button className="btn-accept">Accept</button>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Weekly Mission */}
          <div className="game-section mission-section">
            <div className="mission-header">WEEKLY MISSION</div>
            <div className="mission-content">
              <div className="mission-title">
                <span>Win 5 Battles</span>
                <span className="mission-progress">{Math.min(stats?.wins || 0, 5)}/5</span>
              </div>
              <div className="mission-progress-bar">
                <div className="progress-fill" style={{ width: `${((Math.min(stats?.wins || 0, 5)) / 5) * 100}%` }}></div>
              </div>
              <p className="mission-description">
                Complete missions to earn exclusive academic badges and profile textures.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Modals and Notifications */}
      {incomingInvite && (
        <InviteNotification
          invite={incomingInvite}
          onClose={() => setIncomingInvite(null)}
          onAccept={() => {
            setIncomingInvite(null);
            fetchActiveInvites();
          }}
        />
      )}

      {/* Generating Toast */}
      {generatingBattle && (
        <BattleToast
          type="generating"
          message="Generating quiz questions..."
          subMessage={`This may take 30-60 seconds depending on content size. Module: ${generatingBattle.moduleCode} (Lectures ${generatingBattle.lectureStart}-${generatingBattle.lectureEnd})`}
          onClose={() => setGeneratingBattle(null)}
        />
      )}

      {/* Battle Ready Modal */}
      {battleReady && (
        <BattleReadyModal
          battleId={battleReady}
          onRedirect={handleBattleRedirect}
        />
      )}
    </div>
  );
};

export default GameDashboard;
