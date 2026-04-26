/**
 * Navbar.jsx — Global Navigation Component
 * -----------------------------------------
 * Props (via prop-drilling from App.js):
 *   isLoggedIn    {boolean} — controls which nav links are shown
 *   setIsLoggedIn {function} — called on logout to update App-level auth state
 *
 * Features:
 *  - Sticky glassmorphic bar
 *  - Public links (Home, Login) shown when logged out
 *  - Protected links (Dashboard, Analytics, Alerts, Report) when logged in
 *  - Profile dropdown with click-outside close behaviour
 *  - Active route highlighting via useLocation
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import '../assets/css/Navbar.css';

const Navbar = ({ isLoggedIn, setIsLoggedIn }) => {
  /* Controls the profile dropdown open/close state */
  const [open, setOpen] = useState(false);

  const navigate = useNavigate();
  const location = useLocation(); // used to highlight the active nav link
  const dropRef = useRef(null);  // ref for click-outside detection

  /**
   * handleLogout — clears auth tokens and resets global login state
   * Called from the dropdown menu. No API call needed — JWT is stateless.
   */
  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user_email');
    setIsLoggedIn(false); // prop-drilled setter from App.js
    navigate('/');
  };

  /**
   * Click-outside effect — closes the profile dropdown when the user
   * clicks anywhere outside the `.profile-container` element.
   * Prevents the dropdown from getting "stuck" open.
   */
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setOpen(false);
      }
    };

    // Attach listener only while dropdown is open (performance optimisation)
    if (open) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [open]);

  /**
   * Helper — returns 'active' class if the given path matches current route.
   * Used on nav <li> items to highlight the current page.
   */
  const isActive = (path) => location.pathname === path ? 'active' : '';

  return (
    <nav className="navbar">

      {/* ── Brand Logo ── */}
      <div className="navbar-logo">
        <Link to={isLoggedIn ? '/client' : '/'} className="navbar-brand-link">
          🌱 GreenCO₂
        </Link>
      </div>

      {/* ── Navigation Links ── */}
      <ul className="navbar-links">

        {/* Public links — shown only when logged OUT */}
        {!isLoggedIn ? (
          <>
            <li className={isActive('/')}><Link to="/">Home</Link></li>
            <li><Link to="/auth" className="nav-cta">Sign In</Link></li>
          </>
        ) : (
          <>
            {/* Protected links — shown only when logged IN */}
            <li className={isActive('/client')}>
              <Link to="/client">Dashboard</Link>
            </li>
            <li className={isActive('/analytics')}>
              <Link to="/analytics">Analytics</Link>
            </li>
            <li className={isActive('/alerts')}>
              <Link to="/alerts">Alerts</Link>
            </li>
            <li className={isActive('/report')}>
              <Link to="/report">Report</Link>
            </li>
            <li className={isActive('/emission-form')}>
              <Link to="/emission-form">Log Emissions</Link>
            </li>

            {/* ── Profile Dropdown ──
                ref={dropRef} enables click-outside-to-close behaviour */}
            <li className="profile-container" ref={dropRef}>
              <div
                onClick={() => setOpen(!open)}
                className={`profile-icon ${open ? 'profile-icon--open' : ''}`}
                aria-label="Profile menu"
                aria-expanded={open}
              >
                👤
              </div>

              {/* Dropdown panel — conditionally rendered */}
              {open && (
                <div className="dropdown" role="menu">
                  <Link
                    to="/profile"
                    onClick={() => setOpen(false)} // close on navigate
                    role="menuitem"
                  >
                    👤 Profile
                  </Link>
                  <div
                    onClick={handleLogout}
                    role="menuitem"
                    className="dropdown-logout"
                  >
                    🚪 Logout
                  </div>
                </div>
              )}
            </li>
          </>
        )}

      </ul>
    </nav>
  );
};

export default Navbar;