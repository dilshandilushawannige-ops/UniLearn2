import React from 'react';
import '../styles/BattleToast.css';

const BattleToast = ({ message, subMessage, onClose, type = 'info' }) => {
  return (
    <div className={`battle-toast battle-toast-${type}`}>
      <div className="battle-toast-content">
        <div className="battle-toast-icon">
          {type === 'generating' && (
            <div className="toast-spinner"></div>
          )}
          {type === 'ready' && '✅'}
        </div>
        <div className="battle-toast-text">
          <div className="battle-toast-message">{message}</div>
          {subMessage && <div className="battle-toast-submessage">{subMessage}</div>}
        </div>
      </div>
      {onClose && (
        <button className="battle-toast-close" onClick={onClose}>
          ×
        </button>
      )}
    </div>
  );
};

export default BattleToast;
