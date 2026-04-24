import React, { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import "../assets/css/Navbar.css";

const Navbar = ({ isLoggedIn, setIsLoggedIn }) => {
  const [open, setOpen] = useState(false);
  const navigate = useNavigate();

  const handleLogout = () => {
    localStorage.removeItem("token");
    localStorage.removeItem("user_email");
    setIsLoggedIn(false);
    navigate("/");
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

            {/* PROFILE ICON */}
            <li className="profile-container">
              <div onClick={() => setOpen(!open)} className="profile-icon">
                👤
              </div>

              {open && (
                <div className="dropdown">
                  <Link to="/profile">Profile</Link>
                  <div onClick={handleLogout}>Logout</div>
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