import React, { useState, useEffect, useRef } from 'react';
import '../styles/BattleReadyModal.css';

const BattleReadyModal = ({ battleId, onRedirect }) => {
  const [countdown, setCountdown] = useState(5);
  const timerRef = useRef(null);
  const redirectCalled = useRef(false);

  useEffect(() => {
    console.log('BattleReadyModal mounted with battleId:', battleId);
    
    // Clear any existing timer
    if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    // Reset state
    setCountdown(5);
    redirectCalled.current = false;

    // Start countdown
    timerRef.current = setInterval(() => {
      setCountdown((prev) => {
        console.log('Countdown:', prev);
        
        if (prev <= 1) {
          if (!redirectCalled.current) {
            redirectCalled.current = true;
            clearInterval(timerRef.current);
            console.log('Redirecting to battle:', battleId);
            onRedirect(battleId);
          }
          return 0;
        }
        return prev - 1;
      });
    }, 1000);

    // Cleanup
    return () => {
      console.log('BattleReadyModal unmounting');
      if (timerRef.current) {
        clearInterval(timerRef.current);
      }
    };
  }, [battleId]); // Only depend on battleId, not onRedirect

  return (
    <div className="battle-ready-overlay">
      <div className="battle-ready-modal">
        <div className="battle-ready-timer-circle">
          <svg className="battle-ready-progress" viewBox="0 0 100 100">
            <circle
              className="battle-ready-progress-bg"
              cx="50"
              cy="50"
              r="45"
            />
            <circle
              className="battle-ready-progress-fill"
              cx="50"
              cy="50"
              r="45"
              style={{
                strokeDashoffset: `${283 - (283 * countdown) / 5}`,
              }}
            />
          </svg>
          <div className="battle-ready-countdown">{countdown}</div>
        </div>
        <h2 className="battle-ready-title">Quiz Ready!</h2>
        <p className="battle-ready-text">Redirecting to battle in {countdown} seconds...</p>
      </div>
    </div>
  );
};

export default BattleReadyModal;
