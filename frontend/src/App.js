/**
 * App.js — Root Application Component
 * -------------------------------------
 * Handles:
 *  1. Auth state initialisation (reads token from localStorage on mount)
 *  2. Route declarations (public + protected)
 *  3. ThemeProvider wraps the entire tree for dark/light mode
 *  4. AppShell handles layout — sidebar for app pages, minimal nav for public
 */

import React, { Suspense, lazy, useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

/* ── Theme ── */
import { ThemeProvider } from './context/ThemeContext';

/* ── Layout ── */
import AppShell from './components/layout/AppShell';
import { AppFallback } from './components/ui';
import { useBackendWarmup } from './hooks/useBackendWarmup';

/* ── Global Styles ── */
import './assets/css/app.css';

const Home         = lazy(() => import('./pages/Home'));
const Auth         = lazy(() => import('./pages/Auth.jsx'));
const Dashboard    = lazy(() => import('./pages/Dashboard.jsx'));
const Analytics    = lazy(() => import('./pages/Analytics'));
const Alerts       = lazy(() => import('./pages/Alerts'));
const Report       = lazy(() => import('./pages/Report'));
const Profile      = lazy(() => import('./pages/Profile.jsx'));
const EmissionForm = lazy(() => import('./pages/EmissionForm'));

function App() {
  /**
   * isLoggedIn tri-state:
   *   null  → auth check not yet done  (show nothing)
   *   false → no token found            (show public routes)
   *   true  → valid token present       (show protected routes)
   */
  const [isLoggedIn, setIsLoggedIn] = useState(null);
  const warmupStatus = useBackendWarmup(isLoggedIn === true);

  /* Check localStorage for an existing token on first render */
  useEffect(() => {
    const token = localStorage.getItem('token');
    setIsLoggedIn(!!token);
  }, []);

  /* Wait until auth check is complete before rendering any route */
  if (isLoggedIn === null) {
    return <AppFallback label="Opening GreenCO₂…" sublabel="Restoring your secure workspace." />;
  }

  if (warmupStatus === 'initializing') {
    return (
      <ThemeProvider>
        <AppFallback
          label="Initializing backend…"
          sublabel="Free Render services can take a few seconds to wake up. Your dashboard will load automatically."
        />
      </ThemeProvider>
    );
  }

  return (
    <ThemeProvider>
      <Router>
        <AppShell isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn}>
          <Suspense fallback={<AppFallback />}>
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
          </Suspense>
        </AppShell>
      </Router>
    </ThemeProvider>
  );
}

export default App;