import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

const Register = () => {
  const { register } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({
    username: '', email: '', password: '', currentYear: '1', currentSemester: '1',
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const campusEmailRegex = /^[A-Za-z0-9._%+-]+@my\.sliit\.lk$/i;

  const handleChange = (e) => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.username || !form.email || !form.password) {
      return setError('Please fill in all required fields.');
    }
    if (!campusEmailRegex.test(form.email)) {
      return setError('Only SLIIT campus emails ending with @my.sliit.lk are allowed.');
    }
    setLoading(true);
    try {
      await register({ ...form, currentYear: Number(form.currentYear), currentSemester: Number(form.currentSemester) });
      navigate('/dashboard');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-wrapper">
      <div className="auth-box">
        <h2>Create Account</h2>
        <p>Create your student account with your SLIIT campus email.</p>

        {error && <div className="alert alert-error">{error}</div>}

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Username</label>
            <input
              name="username"
              value={form.username}
              onChange={handleChange}
              placeholder="Ravindu"
              required
            />
          </div>

          <div className="form-group">
            <label>Campus Email</label>
            <input
              type="email"
              name="email"
              value={form.email}
              onChange={handleChange}
              placeholder="it23831186@my.sliit.lk"
              required
            />
          </div>

          <div className="form-group">
            <label>Password</label>
            <input
              type="password"
              name="password"
              value={form.password}
              onChange={handleChange}
              placeholder="Minimum 6 characters"
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Current Year</label>
              <select
                name="currentYear"
                value={form.currentYear}
                onChange={handleChange}
              >
                <option value="1">Year 1</option>
                <option value="2">Year 2</option>
                <option value="3">Year 3</option>
                <option value="4">Year 4</option>
              </select>
            </div>

            <div className="form-group">
              <label>Current Semester</label>
              <select
                name="currentSemester"
                value={form.currentSemester}
                onChange={handleChange}
              >
                <option value="1">Semester 1</option>
                <option value="2">Semester 2</option>
              </select>
            </div>
          </div>

          <button
            type="submit"
            className="btn btn-primary btn-block"
            disabled={loading}
          >
            {loading ? 'Creating account...' : 'Signup'}
          </button>
        </form>

        <p style={{ marginTop: '1rem', textAlign: 'center', fontSize: '0.9rem' }}>
          Already have an account?{' '}
          <Link to="/login">
            Login
          </Link>
        </p>
      </div>
    </div>
  );
};

export default Register;
