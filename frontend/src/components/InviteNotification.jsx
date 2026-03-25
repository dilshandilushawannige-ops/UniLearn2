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
          onClose();
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [invite, onClose]);

  const handleAccept = async () => {
    setLoading(true);
    try {
      const { battle } = await gamesAPI.respondToInvite(invite._id, 'accept');
      
      // Notify via socket
      if (socket) {
        socket.emit('invite:accepted', {
          inviteId: invite._id,
          battleId: battle._id,
        });
      }

      onAccept();
      navigate(`/user-dashboard/games/battle/${battle._id}`);
    } catch (error) {
      alert(error.response?.data?.message || 'Failed to accept invite');
      setLoading(false);
      onClose();
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
    <div className="notification-overlay">
      <div className="notification-card invite-notification">
        <div className="notification-header">
          <h3>🎮 Battle Invitation!</h3>
          <div className="notification-timer">{timeLeft}s</div>
        </div>

        <div className="notification-body">
          <p className="notification-from">
            <strong>{invite.fromUser.username}</strong> challenges you to a quiz battle!
          </p>

          <div className="notification-details">
            <div className="detail-item">
              <span className="detail-label">Module:</span>
              <span className="detail-value">{invite.moduleCode}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Lectures:</span>
              <span className="detail-value">{invite.lectureStart} - {invite.lectureEnd}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Questions:</span>
              <span className="detail-value">{invite.questionCount}</span>
            </div>
            <div className="detail-item">
              <span className="detail-label">Time/Question:</span>
              <span className="detail-value">{invite.timePerQuestion}s</span>
            </div>
          </div>
        </div>

        <div className="notification-actions">
          <button
            className="btn-reject"
            onClick={handleReject}
            disabled={loading}
          >
            Decline
          </button>
          <button
            className="btn-accept"
            onClick={handleAccept}
            disabled={loading}
          >
            {loading ? 'Accepting...' : 'Accept Challenge'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default InviteNotification;
