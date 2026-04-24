import React from 'react';
import { useState, useEffect } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom"; // ✅ ADD THIS

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from "./pages/Home";
import './assets/css/app.css'; // Import the CSS file for styling
import Auth from "./pages/Auth.jsx";           // ✅ ADD
import Dashboard from "./pages/Dashboard.jsx"; // ✅ ADD
import Analytics from "./pages/Analytics"; // ✅ ADD
import Alerts from "./pages/Alerts";       // ✅ ADD
import Report from "./pages/Report";       // ✅ ADD
import Profile from './pages/Profile.jsx';

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    const token = localStorage.getItem("token");
    setIsLoggedIn(!!token);
  }, []);

  // 🛑 wait until auth checked
  if (isLoggedIn === null) return null;  

  return (
    <Router>
      <Navbar isLoggedIn={isLoggedIn} setIsLoggedIn={setIsLoggedIn} />

      <Routes>
        {/* Public */}
        <Route path="/" element={<Home />} />
        <Route path="/auth" element={<Auth setIsLoggedIn={setIsLoggedIn} />} />

        {/* Protected */}
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

        import Profile from "./pages/Profile"; // ADD THIS

        <Route
          path="/profile"
          element={isLoggedIn ? <Profile /> : <Navigate to="/" />}
        />
      </Routes>

      <Footer />
    </Router>
  );
}

export default App;