/**
 * App.js — Root Application Component
 * -------------------------------------
 * Handles:
 *  1. Auth state initialisation (reads token from localStorage on mount)
 *  2. Route declarations (public + protected)
 *  3. ThemeProvider wraps the entire tree for dark/light mode
 *  4. AppShell handles layout — sidebar for app pages, minimal nav for public
 */

import React, { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

/* ── Theme ── */
import { ThemeProvider } from './context/ThemeContext';

/* ── Layout ── */
import AppShell from './components/layout/AppShell';

/* ── Page Components ── */
import Home from './pages/Home';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Report from './pages/Report';
import Profile from './pages/Profile.jsx';
import EmissionForm from './pages/EmissionForm';

/* ── Global Styles ── */
import './assets/css/app.css';

function App() {
  /**
   * isLoggedIn tri-state:
   *   null  → auth check not yet done  (show nothing)
   *   false → no token found            (show public routes)
   *   true  → valid token present       (show protected routes)
   */
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  /* Check localStorage for an existing token on first render */
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  /* Wait until auth check is complete before rendering any route */
  if (isLoggedIn === null) return null;

  return (
    <ThemeProvider>
      <Router>
        <AppShell isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}>
          <Routes>
            {/* ── Public Routes ── */}
            <Route path="/" element={<Home />} />
            <Route path="/auth" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />

            {/* ── Protected Routes ── */}
            <Route path="/client"        element={isLoggedIn ? <Dashboard />  : <Navigate to="/" />} />
            <Route path="/analytics"     element={isLoggedIn ? <Analytics />  : <Navigate to="/" />} />
            <Route path="/alerts"        element={isLoggedIn ? <Alerts />     : <Navigate to="/" />} />
            <Route path="/report"        element={isLoggedIn ? <Report />     : <Navigate to="/" />} />
            <Route path="/profile"       element={isLoggedIn ? <Profile />    : <Navigate to="/" />} />
            <Route path="/emission-form" element={isLoggedIn ? <EmissionForm /> : <Navigate to="/" />} />
          </Routes>
        </AppShell>
      </Router>
    </ThemeProvider>
  );
}

export default App;