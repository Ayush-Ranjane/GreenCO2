import React from 'react';
import { BrowserRouter as Router, Routes, Route } from "react-router-dom"; // ✅ ADD THIS

import Navbar from './components/Navbar.jsx';
import Footer from './components/Footer.jsx';
import Home from "./pages/Home";
import './assets/css/app.css'; // Import the CSS file for styling

function App() {
  return (
    <Router>
      <div className="app-container">
        <Navbar />
          <Routes>
            <Route path="/" element={<Home />} />
          </Routes>
        <Footer />
      </div>
    </Router>
  );
}

export default App;