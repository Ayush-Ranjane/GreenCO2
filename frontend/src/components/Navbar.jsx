import React from "react";
import { Link } from "react-router-dom";
import "../assets/css/Navbar.css";

const Navbar = ({ isLoggedIn }) => {

  const handleLogout = () => {
    localStorage.removeItem("token");
    window.location.reload();
  };

  return (
    <nav className="navbar">
      <div className="navbar-logo">
        <h2>🌱 GreenCO₂</h2>
      </div>

      <ul className="navbar-links">

        {!isLoggedIn ? (
          <>
            <li><Link to="/">Home</Link></li>
            <li><Link to="/auth">Login</Link></li>
          </>
        ) : (
          <>
            <li><Link to="/client">Dashboard</Link></li>
            <li><Link to="/analytics">Analytics</Link></li>
            <li><Link to="/alerts">Alerts</Link></li>
            <li><Link to="/report">Report</Link></li>
            <li onClick={handleLogout} className="logout-btn">Logout</li>
          </>
        )}

      </ul>
    </nav>
  );
};

export default Navbar;