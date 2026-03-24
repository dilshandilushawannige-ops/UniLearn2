import React, { useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SignupModal.css';

const LoginModal = ({ onClose, onSwitchToSignup }) => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  const handleSwitchToSignup = (e) => {
    e.preventDefault();
    setIsClosing(true);
    setTimeout(() => {
      onSwitchToSignup();
    }, 200);
  };

  const isEmailInvalid = hasSubmitted && (email.length === 0 || !email.endsWith('@my.sliit.lk'));
  const isPasswordWeak = hasSubmitted && password.length < 6;

  const redirectPath = location.state?.from?.pathname || '/user-dashboard';

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError('');
    
    if (!isEmailInvalid && !isPasswordWeak) {
      setLoading(true);
      try {
        await login(email, password);
        handleClose();
        navigate(redirectPath, { replace: true });
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    }
  };

  return (
    <div className={`modal-backdrop ${isClosing ? 'closing' : ''}`}>
      <div className={`modal-container ${isClosing ? 'closing' : ''}`}>
        {/* Close Button */}
        <button className="modal-close" onClick={handleClose} aria-label="Close modal">
          &times;
        </button>

        <div className="modal-header" style={{ textAlign: 'center' }}>
          <h2 style={{ margin: 0 }}>Welcome Back</h2>
          <p style={{ marginTop: '8px' }}>Use your SLIIT campus account to continue.</p>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>CAMPUS EMAIL</label>
            <div className={`input-with-icon ${isEmailInvalid ? 'error-input' : ''}`}>
              <input 
                type="email" 
                placeholder="itxxxxxx@my.sliit.lk" 
                className={!isEmailInvalid ? "input-gray" : ""}
                value={email}
                onChange={(e) => setEmail(e.target.value)}
              />
              {isEmailInvalid && (
              <span className="icon-right text-red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm1 15h-2v-2h2v2zm0-4h-2V7h2v6z" />
                </svg>
              </span>
              )}
            </div>
            {isEmailInvalid && (
              <div className="helper-text-row">
                <span className="helper-text-left"></span>
                <span className="helper-text-right error-text">Invalid email domain</span>
              </div>
            )}
          </div>

          <div className="form-group">
            <label>PASSWORD</label>
            <div className={`input-with-icon ${isPasswordWeak ? 'error-input' : ''}`}>
              <input 
                type="password" 
                placeholder="••••••••" 
                className={!isPasswordWeak ? "input-gray" : ""}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
              />
              {isPasswordWeak && (
              <span className="icon-right text-red">
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M17.94 17.94A10.07 10.07 0 0112 20c-7 0-11-8-11-8a18.45 18.45 0 015.06-5.94M9.9 4.24A9.12 9.12 0 0112 4c7 0 11 8 11 8a18.5 18.5 0 01-2.16 3.19m-6.72-1.07a3 3 0 11-4.24-4.24M1 1l22 22"></path>
                </svg>
              </span>
              )}
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-create-account">
            {loading ? 'Logging in...' : 'Login'}
          </button>

          <p className="footer-terms">
            No account yet? <a href="#" onClick={handleSwitchToSignup}>Sign up</a>.
          </p>
        </form>
      </div>
    </div>
  );
};

export default LoginModal;
