/**
 * Navbar.jsx — Top bar component
 * For authenticated pages: shows hamburger (mobile), theme toggle, page label.
 * For public pages: shows logo, nav links, sign-in CTA.
 */

import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { Sun, Moon, Menu, Leaf } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import '../assets/css/Navbar.css';

const PAGE_LABELS = {
  '/client':       'Dashboard',
  '/analytics':    'Analytics',
  '/alerts':       'Alerts',
  '/report':       'Report',
  '/emission-form':'Log Emissions',
  '/profile':      'Profile',
};

const Navbar = ({ isLoggedIn, showMenuButton, onMenuClick }) => {
  const { theme, toggle } = useTheme();
  const location = useLocation();
  const [dropOpen, setDropOpen] = useState(false);
  const dropRef = useRef(null);

  const pageLabel = PAGE_LABELS[location.pathname] || '';

  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropRef.current && !dropRef.current.contains(e.target)) {
        setDropOpen(false);
      }
    };
    if (dropOpen) document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [dropOpen]);

  /* ── Authenticated top bar ── */
  if (isLoggedIn) {
    return (
      <header className="topbar">
        <div className="topbar__left">
          {showMenuButton && (
            <button className="topbar__menu-btn" onClick={onMenuClick} aria-label="Open menu">
              <Menu size={20} strokeWidth={1.75} />
            </button>
          )}
          {pageLabel && <span className="topbar__page-label">{pageLabel}</span>}
        </div>
        <div className="topbar__right">
          <button
            className="topbar__icon-btn"
            onClick={toggle}
            aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
            title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
          >
            {theme === 'dark'
              ? <Sun size={17} strokeWidth={1.75} />
              : <Moon size={17} strokeWidth={1.75} />}
          </button>
        </div>
      </header>
    );
  }

  /* ── Public nav bar ── */
  return (
    <nav className="public-nav">
      <Link to="/" className="public-nav__brand">
        <div className="public-nav__logo-icon"><Leaf size={16} strokeWidth={2} /></div>
        <span>GreenCO₂</span>
      </Link>
      <div className="public-nav__actions">
        <button
          className="topbar__icon-btn"
          onClick={toggle}
          aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
        >
          {theme === 'dark'
            ? <Sun size={16} strokeWidth={1.75} />
            : <Moon size={16} strokeWidth={1.75} />}
        </button>
        <Link to="/auth" className="public-nav__signin">Sign In</Link>
      </div>
    </nav>
  );
};

export default Navbar;