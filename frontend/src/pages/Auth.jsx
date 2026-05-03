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
import { Leaf, Eye, EyeOff } from 'lucide-react';
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

  const [showPassword, setShowPassword] = useState(false);

  return (
    <div className="auth-page">

      {/* ── Left panel — branding ── */}
      <div className="auth-panel auth-panel--left">
        <div className="auth-brand">
          <div className="auth-brand__icon"><Leaf size={24} strokeWidth={2} /></div>
          <span className="auth-brand__name">GreenCO₂</span>
        </div>
        <div className="auth-panel__body">
          <h2 className="auth-panel__headline">Emission Intelligence for Modern Industry</h2>
          <p className="auth-panel__sub">AI-powered monitoring, prediction, and compliance — all in one platform.</p>
          <ul className="auth-features">
            <li><span className="auth-features__dot" />Real-time CO₂ tracking</li>
            <li><span className="auth-features__dot" />ML-based emission forecasting</li>
            <li><span className="auth-features__dot" />CPCB compliance reporting</li>
          </ul>
        </div>
      </div>

      {/* ── Right panel — form ── */}
      <div className="auth-panel auth-panel--right">
        <div className="auth-card">

          <h2 className="auth-card__title">
            {mode === 'login' ? 'Welcome back' : 'Create account'}
          </h2>
          <p className="auth-card__subtitle">
            {mode === 'login'
              ? 'Sign in to your GreenCO₂ workspace'
              : 'Join GreenCO₂ and start tracking emissions'}
          </p>

          {/* ── Mode Tabs ── */}
          <div className="auth-tabs">
            <button className={`auth-tab ${mode === 'login' ? 'auth-tab--active' : ''}`} onClick={() => switchMode('login')}>Sign In</button>
            <button className={`auth-tab ${mode === 'register' ? 'auth-tab--active' : ''}`} onClick={() => switchMode('register')}>Register</button>
          </div>

          {/* ── Error ── */}
          {errMsg && (
            <div className="auth-error" role="alert">
              <span>⚠</span> {errMsg}
            </div>
          )}

          {/* ── Email ── */}
          <div className="auth-field">
            <label className="auth-label">Email address</label>
            <input className="auth-input" type="email" placeholder="you@company.com"
              value={email} onChange={(e) => setEmail(e.target.value)}
              onKeyDown={handleKeyDown} autoComplete="email" />
          </div>

          {/* ── Company (register only) ── */}
          {mode === 'register' && (
            <div className="auth-field">
              <label className="auth-label">Company name</label>
              <input className="auth-input" type="text" placeholder="e.g. Acme Industries"
                value={company} onChange={(e) => setCompany(e.target.value)}
                onKeyDown={handleKeyDown} autoComplete="organization" />
            </div>
          )}

          {/* ── Password ── */}
          <div className="auth-field">
            <label className="auth-label">Password</label>
            <div className="auth-input-wrap">
              <input className="auth-input auth-input--icon-right"
                type={showPassword ? 'text' : 'password'}
                placeholder="••••••••"
                value={password} onChange={(e) => setPassword(e.target.value)}
                onKeyDown={handleKeyDown}
                autoComplete={mode === 'login' ? 'current-password' : 'new-password'} />
              <button type="button" className="auth-input-icon" onClick={() => setShowPassword(v => !v)} tabIndex={-1}>
                {showPassword ? <EyeOff size={15} strokeWidth={1.75} /> : <Eye size={15} strokeWidth={1.75} />}
              </button>
            </div>
          </div>

          {/* ── Submit ── */}
          <button className="auth-btn" onClick={mode === 'login' ? handleLogin : handleRegister} disabled={loading}>
            {loading
              ? <><span className="spinner" />{mode === 'login' ? 'Signing in…' : 'Creating account…'}</>
              : (mode === 'login' ? 'Sign In' : 'Create Account')}
          </button>

          {/* ── Switch mode ── */}
          <p className="auth-switch">
            {mode === 'login' ? (
              <>Don&apos;t have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('register')}>Register free</button></>
            ) : (
              <>Already have an account?{' '}
                <button className="auth-switch-btn" onClick={() => switchMode('login')}>Sign in</button></>
            )}
          </p>

        </div>
      </div>
    </div>
  );
};

export default Auth;