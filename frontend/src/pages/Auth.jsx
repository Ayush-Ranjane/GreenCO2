/**
 * Auth.jsx — Login Page
 * ----------------------
 * Props (via prop-drilling from App.js):
 *   setIsLoggedIn {function} — updates App-level auth state on successful login
 *
 * Logic:
 *  - Sends POST /api/login with email + password
 *  - On success: stores JWT token + email in localStorage, updates auth state,
 *    then redirects to /client (Dashboard)
 *  - On failure: shows an alert with the error message
 *
 * NOTE: localStorage is set once only (was duplicated in original code — fixed).
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import '../assets/css/Auth.css';

const Auth = ({ setIsLoggedIn }) => {
  /* Controlled inputs for the login form */
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');

  /* Loading state — disables the button while the API call is in-flight */
  const [loading, setLoading] = useState(false);

  const navigate = useNavigate();

  /**
   * handleLogin — async login handler
   * POSTs credentials to Flask backend.
   * FIX: localStorage.setItem was called twice in original code — now called once.
   */
  const handleLogin = async () => {
    setLoading(true); // disable button while request is pending

    try {
      const res = await API.post('/api/login', { email, password });



      /* Update App-level state (prop-drilled from App.js) */
      setIsLoggedIn(true);

      /* ── Store auth data in localStorage (once, not twice) ── */
      localStorage.setItem('token',      res.data.token);
      localStorage.setItem('user_email', email);
      
      /* Redirect to the protected dashboard */
      navigate('/client');

    } catch (err) {
      /* Show backend error message if available, else generic fallback */
      const msg = err.response?.data?.message || 'Invalid credentials. Please try again.';
      alert(msg);
    } finally {
      setLoading(false); // re-enable button regardless of outcome
    }
  };

  /* Allow submitting the form with the Enter key */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleLogin();
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Logo / Brand ── */}
        <div className="auth-logo">
          <span>🌱</span>
        </div>
        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your GreenCO₂ account</p>

        {/* ── Email Field ── */}
        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="email"
          />
        </div>

        {/* ── Password Field ── */}
        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onKeyDown={handleKeyDown}
            autoComplete="current-password"
          />
        </div>

        {/* ── Submit Button — disabled while loading ── */}
        <button
          className="auth-btn"
          onClick={handleLogin}
          disabled={loading}
        >
          {loading ? 'Signing in…' : 'Sign In →'}
        </button>

      </div>
    </div>
  );
};

export default Auth;