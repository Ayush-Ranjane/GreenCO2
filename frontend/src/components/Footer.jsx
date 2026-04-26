/**
 * Footer.jsx — Global Footer Component
 * --------------------------------------
 * Static footer displayed on every page.
 * Contains: brand description, navigation links, tech stack, and social links.
 *
 * FIX: corrected two broken href values from the original:
 *   /dashboard → /client   (the actual Dashboard route in App.js)
 *   /about     → /analytics (there is no /about route)
 */

import React from 'react';
import '../assets/css/Footer.css';

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-grid">

        {/* ── Brand Column ── */}
        <div className="footer-brand">
          <h2>🌱 GreenCO₂</h2>
          <p>AI-powered CO₂ emission prediction system helping industries go sustainable.</p>
        </div>

        {/* ── Navigation Links ──
            FIX: /dashboard corrected to /client
            FIX: /about corrected to /analytics */}
        <div className="footer-section">
          <h4>Navigation</h4>
          <a href="/">Home</a>
          <a href="/client">Dashboard</a>
          <a href="/analytics">Analytics</a>
          <a href="/alerts">Alerts</a>
          <a href="/report">Report</a>
        </div>

        {/* ── Tech Stack ── */}
        <div className="footer-section">
          <h4>Tech Stack</h4>
          <p>Flask API</p>
          <p>TensorFlow Model</p>
          <p>React Frontend</p>
        </div>

        {/* ── Social Links ── */}
        <div className="footer-section">
          <h4>Connect</h4>
          <a href="https://github.com/Ayush-Ranjane" target="_blank" rel="noopener noreferrer">
            GitHub
          </a>
          <a href="https://www.linkedin.com/in/ayush-ranjane-61051b303" target="_blank" rel="noopener noreferrer">
            LinkedIn
          </a>
        </div>

      </div>

      {/* ── Copyright ── */}
      <p className="footer-copy">© 2026 GreenCO₂ | Built by Ayush Ranjane</p>
    </footer>
  );
};

export default Footer;