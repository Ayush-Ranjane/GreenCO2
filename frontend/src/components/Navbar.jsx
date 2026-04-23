import React from 'react';
import '../assets/css/Navbar.css';

const Navbar = () => {
  return (
    <nav className="navbar">
      <div className="navbar-container">

        <div className="navbar-logo">
          <h2>GreenCO₂</h2>
        </div>

        <ul className="navbar-links">
          <li><a href="/">Home</a></li>
          <li><a href="/client">Dashboard</a></li>
          <li><a href="/analytics">Analytics</a></li>
          <li><a href="/alerts">Alerts</a></li>
          <li><a href="/report">Report</a></li>
        </ul>

        <div className="navbar-auth">
          <a href="/auth" className="btn-login">Login</a>
        </div>

      </div>
    </nav>
  );
};

export default Navbar;