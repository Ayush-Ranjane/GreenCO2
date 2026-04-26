/**
 * Auth.jsx — Login / Register Page
 * ----------------------------------
 * Props (via prop-drilling from App.js):
 *   setIsLoggedIn {function} — updates App-level auth state on successful login
 *
 * Modes: "login" (default) | "register"
 *
 * Login flow:
 *  - POST /api/login → store JWT + email → redirect to /client
 *
 * Register flow:
 *  - POST /api/register → auto-login (POST /api/login) → redirect to /client
 *
 * Error key: backend returns { error: "..." } — use err.response?.data?.error
 */

import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import API from '../api/api';
import '../assets/css/Auth.css';

const Auth = ({ setIsLoggedIn }) => {
  /* "login" or "register" */
  const [mode, setMode] = useState('login');

  /* Shared form fields */
  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [company,  setCompany]  = useState('');

  const [loading, setLoading] = useState(false);
  const [errMsg,  setErrMsg]  = useState('');

  const navigate = useNavigate();

  /** Switch between login and register tabs — clear error & form on switch */
  const switchMode = (newMode) => {
    setMode(newMode);
    setErrMsg('');
    setEmail('');
    setPassword('');
    setCompany('');
  };

  /** Shared post-login handler — stores token and redirects */
  const finalizeLogin = (token, userEmail) => {
    localStorage.setItem('token',      token);
    localStorage.setItem('user_email', userEmail);
    setIsLoggedIn(true);
    navigate('/client');
  };

  /** POST /api/login */
  const handleLogin = async () => {
    setErrMsg('');
    if (!email || !password) {
      setErrMsg('Email and password are required.');
      return;
    }

    setLoading(true);
    try {
      const res = await API.post('/api/login', { email, password });
      finalizeLogin(res.data.token, email.trim().toLowerCase());
    } catch (err) {
      // Backend returns { error: "..." } — not "message"
      setErrMsg(err.response?.data?.error || 'Invalid credentials. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** POST /api/register → then auto-login */
  const handleRegister = async () => {
    setErrMsg('');
    if (!email || !password || !company) {
      setErrMsg('Email, password, and company name are all required.');
      return;
    }
    if (password.length < 6) {
      setErrMsg('Password must be at least 6 characters.');
      return;
    }

    setLoading(true);
    try {
      // 1. Register
      await API.post('/api/register', { email, password, company });

      // 2. Auto-login with the same credentials
      const loginRes = await API.post('/api/login', { email, password });
      finalizeLogin(loginRes.data.token, email.trim().toLowerCase());

    } catch (err) {
      setErrMsg(err.response?.data?.error || 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /** Allow submitting the form with the Enter key */
  const handleKeyDown = (e) => {
    if (e.key === 'Enter') {
      mode === 'login' ? handleLogin() : handleRegister();
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">

        {/* ── Logo / Brand ── */}
        <div className="auth-logo">
          <span>🌱</span>
        </div>
        <h2>{mode === 'login' ? 'Welcome Back' : 'Create Account'}</h2>
        <p className="auth-subtitle">
          {mode === 'login'
            ? 'Sign in to your GreenCO₂ account'
            : 'Join GreenCO₂ and start tracking emissions'}
        </p>

        {/* ── Mode Tabs ── */}
        <div className="auth-tabs">
          <button
            className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('login')}
          >
            Sign In
          </button>
          <button
            className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`}
            onClick={() => switchMode('register')}
          >
            Register
          </button>
        </div>

        {/* ── Error Message ── */}
        {errMsg && (
          <div className="auth-error" role="alert">
            ⚠️ {errMsg}
          </div>
        )}

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

        {/* ── Company Field (register only) ── */}
        {mode === 'register' && (
          <div className="auth-field">
            <label className="auth-label">Company Name</label>
            <input
              className="auth-input"
              type="text"
              placeholder="e.g. Acme Industries"
              value={company}
              onChange={(e) => setCompany(e.target.value)}
              onKeyDown={handleKeyDown}
              autoComplete="organization"
            />
          </div>
        )}

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
            autoComplete={mode === 'login' ? 'current-password' : 'new-password'}
          />
        </div>

        {/* ── Submit Button — disabled while loading ── */}
        <button
          className="auth-btn"
          onClick={mode === 'login' ? handleLogin : handleRegister}
          disabled={loading}
        >
          {loading
            ? (mode === 'login' ? 'Signing in…' : 'Creating account…')
            : (mode === 'login' ? 'Sign In →' : 'Create Account →')}
        </button>

        {/* ── Mode Switch Link ── */}
        <p className="auth-switch">
          {mode === 'login' ? (
            <>Don&apos;t have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchMode('register')}>
                Register here
              </button>
            </>
          ) : (
            <>Already have an account?{' '}
              <button className="auth-switch-btn" onClick={() => switchMode('login')}>
                Sign in
              </button>
            </>
          )}
        </p>

      </div>
    </div>
  );
};

export default Auth;