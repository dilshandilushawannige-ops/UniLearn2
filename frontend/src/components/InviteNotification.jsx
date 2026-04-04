import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSocket } from '../context/SocketContext';
import { gamesAPI } from '../api/games';
import '../styles/InviteNotification.css';

const InviteNotification = ({ invite, onClose, onAccept }) => {
  const navigate = useNavigate();
  const { socket } = useSocket();
  const [timeLeft, setTimeLeft] = useState(30);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Calculate time left
    const expiresAt = new Date(invite.expiresAt);
    const now = new Date();
    const secondsLeft = Math.max(0, Math.floor((expiresAt - now) / 1000));
    setTimeLeft(secondsLeft);

    // Countdown timer
    const timer = setInterval(() => {
      setTimeLeft((prev) => {
        if (prev <= 1) {
          clearInterval(timer);
          // Use setTimeout to avoid state update during render
          setTimeout(() => onClose(), 0);
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invite, onClose]);

  const handleAccept = async () => {
    console.log('Accept button clicked');
    setLoading(true);
    
    try {
      console.log('Sending accept request for invite:', invite._id);
      
      // Accept the invite (backend will generate questions asynchronously)
      const response = await gamesAPI.respondToInvite(invite._id, 'accept');
      console.log('Accept response received:', response);
      
      // Notify via socket that invite was accepted
      if (socket) {
        console.log('Emitting invite:accepted event');
        socket.emit('invite:accepted', {
          inviteId: invite._id,
        });
      }

      // Close modal immediately and navigate to dashboard
      console.log('Closing modal and navigating to dashboard');
      onClose(); // Close the modal
      navigate('/user-dashboard/games');
      
    } catch (error) {
      console.error('Error accepting invite:', error);
      console.error('Error details:', error.response?.data);
      alert(error.response?.data?.message || error.message || 'Failed to accept invite');
      setLoading(false);
    }
  };

  const handleReject = async () => {
    setLoading(true);
    try {
      await gamesAPI.respondToInvite(invite._id, 'reject');
      
      // Notify via socket
      if (socket) {
        socket.emit('invite:rejected', {
          inviteId: invite._id,
        });
      }

      onClose();
    } catch (error) {
      console.error('Error rejecting invite:', error);
      onClose();
    }
  };

  return (
    <div className="notification-overlay top-aligned">
      <div className="notification-card battle-invite-card">
        <div className="swords-icon-wrapper">
          ⚔️
        </div>

        <div className="battle-header-section">
          <h2>Battle Invitation Received!</h2>
          <p className="battle-subtitle">
            <span className="challenger-name">{invite.fromUser.username}</span> has challenged you!
          </p>
        </div>

        <div className="battle-avatars-section">
          <div className="avatar-container">
            <div className="avatar-img-wrapper">
              <div className="avatar-placeholder">{invite.fromUser.username.charAt(0).toUpperCase()}</div>
              <span className="status-dot"></span>
            </div>
            <span className="avatar-username">{invite.fromUser.username}</span>
          </div>

          <div className="vs-badge">VS</div>

          <div className="avatar-container">
            <div className="avatar-img-wrapper">
              <div className="avatar-placeholder">U</div>
              <span className="status-dot"></span>
            </div>
            <span className="avatar-username">You</span>
          </div>
        </div>

        <div className="battle-stats-card">
          <div className="stat-block">
            <span className="stat-label">MODULE</span>
            <strong className="stat-value">{invite.moduleCode}</strong>
          </div>
          <div className="stat-block">
            <span className="stat-label">RANGE</span>
            <strong className="stat-value">Lec {invite.lectureStart} - {invite.lectureEnd}</strong>
          </div>
          <div className="stat-block">
            <span className="stat-label">QUESTIONS</span>
            <strong className="stat-value">{invite.questionCount} Items</strong>
          </div>
          <div className="stat-block">
            <span className="stat-label">TIMER</span>
            <strong className="stat-value">{invite.timePerQuestion}s / Q</strong>
          </div>
        </div>

        <div className="battle-actions-container">
          <button
            className="btn-battle-accept"
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? 'Accepting...' : 'Accept Challenge ▶'}
          </button>
          <button
            className="btn-battle-decline"
            onClick={handleReject}
            disabled={loading}
          >
            Decline
          </button>
        </div>

        <div className="battle-timer-footer">
          Challenge expires in <span className="timer-countdown">{timeLeft} seconds</span>
        </div>
      </div>
    </div>
  );
};

export default InviteNotification;
