import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './SignupModal.css';

const SignupModal = ({ onClose }) => {
  const [username, setUsername] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [year, setYear] = useState('Year 1');
  const [semester, setSemester] = useState('Semester 1');
  const [hasSubmitted, setHasSubmitted] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [isClosing, setIsClosing] = useState(false);

  const { register } = useAuth();
  const navigate = useNavigate();

  const handleClose = () => {
    setIsClosing(true);
    setTimeout(() => {
      onClose();
    }, 200);
  };

  // Validation Logic
  const isEmailInvalid = hasSubmitted && (email.length === 0 || !email.endsWith('@my.sliit.lk'));
  const isPasswordWeak = hasSubmitted && password.length < 8; // Basic weak password logic

  const yearMap = { 'Year 1': 1, 'Year 2': 2, 'Year 3': 3, 'Year 4': 4 };
  const semesterMap = { 'Semester 1': 1, 'Semester 2': 2 };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setHasSubmitted(true);
    setError('');
    
    if (!isEmailInvalid && !isPasswordWeak && username.length > 0) {
      setLoading(true);
      try {
        await register({
          username,
          email,
          password,
          currentYear: yearMap[year],
          currentSemester: semesterMap[semester]
        });
        handleClose();
        navigate('/dashboard');
      } catch (err) {
        setError(err.message);
      } finally {
        setLoading(false);
      }
    } else if (hasSubmitted && username.length === 0) {
      setError("Username is required");
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
          <h2 style={{ margin: 0 }}>Sign Up</h2>
        </div>

        {error && <div className="alert alert-error" style={{ marginBottom: '16px' }}>{error}</div>}

        <form className="modal-form" onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <label>USERNAME</label>
            <input 
              type="text" 
              placeholder="e.g. KasunPerera" 
              className="input-gray" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
            />
          </div>

          <div className="form-group">
            <label>CAMPUS EMAIL</label>
            <div className={`input-with-icon ${isEmailInvalid ? 'error-input' : ''}`}>
              <input 
                type="text" 
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
            <div className="helper-text-row">
              <span className="helper-text-left">Use your campus email address for verification.</span>
              {isEmailInvalid && <span className="helper-text-right error-text">Invalid email domain</span>}
            </div>
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
            <div className="password-strength-row">
              <div className="strength-bars">
                <div className={`bar ${password.length === 0 ? 'bar-gray' : (isPasswordWeak ? 'bar-red' : 'bar-green')}`}></div>
                <div className={`bar ${password.length === 0 ? 'bar-gray' : (isPasswordWeak ? 'bar-gray' : 'bar-green')}`}></div>
                <div className={`bar ${password.length === 0 ? 'bar-gray' : (isPasswordWeak ? 'bar-gray' : 'bar-green')}`}></div>
              </div>
              <span className={`helper-text-right ${isPasswordWeak ? 'error-text not-italic' : ''}`}>
                {isPasswordWeak ? 'Weak password' : (password.length >= 8 ? 'Strong password' : '')}
              </span>
            </div>
          </div>

          <div className="form-row form-row-2">
            <div className="form-group">
              <label>CURRENT YEAR</label>
              <div className="select-container">
                <select value={year} onChange={(e) => setYear(e.target.value)} className="input-gray">
                  <option>Year 1</option>
                  <option>Year 2</option>
                  <option>Year 3</option>
                  <option>Year 4</option>
                </select>
              </div>
            </div>
            <div className="form-group">
              <label>CURRENT SEMESTER</label>
              <div className="select-container">
                <select value={semester} onChange={(e) => setSemester(e.target.value)} className="input-gray">
                  <option>Semester 1</option>
                  <option>Semester 2</option>
                </select>
              </div>
            </div>
          </div>

          <button type="submit" disabled={loading} className="btn-create-account">
            {loading ? 'Creating account...' : 'Create Account'}
          </button>

          <p className="footer-terms">
            By signing up, you agree to Scholar Pro's <a href="#">Terms of Service</a> and <a href="#">Privacy Policy</a>.
          </p>
        </form>
      </div>
    </div>
  );
};

export default SignupModal;
