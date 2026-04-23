import React from 'react';
import '../assets/css/Footer.css'; // Import the CSS file for styling

const Footer = () => {
  return (
    <footer className="footer">
      <div className="footer-grid">

        <div className="footer-brand">
          <h2> GreenCO₂</h2>
          <p>AI-powered CO₂ emission prediction system helping industries go sustainable.</p>
        </div>

        <div className="footer-section">
          <h4>Navigation</h4>
          <a href="/">Home</a>
          <a href="/dashboard">Dashboard</a>
          <a href="/about">Analytics</a>
          <a href="/alerts">Alerts</a>
          <a href="/report">Report</a>
        </div>

        <div className="footer-section">
          <h4>Tech Stack</h4>
          <p>Flask API</p>
          <p>TensorFlow Model</p>
          <p>React Frontend</p>
        </div>

        <div className="footer-section">
          <h4>Connect</h4>
          <a href="https://github.com/Ayush-Ranjane">GitHub</a>
          <a href="https://www.linkedin.com/in/ayush-ranjane-61051b303">LinkedIn</a>
        </div>

      </div>

      <p className ="footer-copy">© 2026 GreenCO₂ | Built by Ayush Ranjane </p>
    </footer>
  );
};

export default Footer;