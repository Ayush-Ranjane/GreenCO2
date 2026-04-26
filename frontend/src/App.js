/**
 * App.js — Root Application Component
 * -------------------------------------
 * Handles:
 *  1. Auth state initialisation (reads token from localStorage on mount)
 *  2. Route declarations (public + protected)
 *  3. Prop-drilling: passes isLoggedIn / setIsLoggedIn down to Navbar and Auth
 *
 * NOTE: We render `null` until the auth check is complete so protected routes
 * never flash before the redirect fires (avoids FOUC on refresh).
 */

import React from 'react';
import { useState, useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

/* ── Layout Components ── */
import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';

/* ── Page Components ── */
import Home from './pages/Home';
import Auth from './pages/Auth.jsx';
import Dashboard from './pages/Dashboard.jsx';
import Analytics from './pages/Analytics';
import Alerts from './pages/Alerts';
import Report from './pages/Report';
import Profile from './pages/Profile.jsx';
import EmissionForm from "./pages/EmissionForm";

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
    setIsLoggedIn(!!token); // converts token string to boolean
  }, []);

  /* Wait until auth check is complete before rendering any route */
  if (isLoggedIn === null) return null;

  return (
    <Router>
      {/* Navbar receives auth state + setter for logout functionality */}
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <Routes>
        {/* ── Public Routes ── */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />

        {/* ── Protected Routes ──
            If user is not logged in, redirect to "/" (home/landing page).
            Each route passes no extra props — data is fetched inside the page. */}
        <Route
          path="/client"
          element={isLoggedIn ? <Dashboard /> : <Navigate to="/" />}
        />
        <Route
          path="/analytics"
          element={isLoggedIn ? <Analytics /> : <Navigate to="/" />}
        />
        <Route
          path="/alerts"
          element={isLoggedIn ? <Alerts /> : <Navigate to="/" />}
        />
        <Route
          path="/report"
          element={isLoggedIn ? <Report /> : <Navigate to="/" />}
        />
        <Route
          path="/profile"
          element={isLoggedIn ? <Profile /> : <Navigate to="/" />}
        />
        <Route
          path="/emission-form"
          element={isLoggedIn ? <EmissionForm /> : <Navigate to="/" />}
        />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;