import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // ✅ correct
import API from "../api/api";
import "../assets/css/Auth.css";

const Auth = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [company, setCompany] = useState("");

  const navigate = useNavigate();

const handleLogin = async () => {
  try {
    const res = await API.post("/api/login", {
      email,
      password,
      company
    });

    // save token
    localStorage.setItem("token", res.data.token);

    // 🔥 update state immediately
    setIsLoggedIn(true);

    // redirect
    navigate("/client");

    localStorage.setItem("token", res.data.token);
    localStorage.setItem("user_email", email); // ADD THIS
    
  } catch (err) {
    console.log(err.response?.data);
    alert("Invalid credentials");
  }
};

  return (
    <div className="auth-page">
      <div className="auth-card">

        <div className="auth-logo">
          <span>🌱</span>
        </div>

        <h2>Welcome Back</h2>
        <p className="auth-subtitle">Sign in to your GreenCO₂ account</p>

        <div className="auth-field">
          <label className="auth-label">Email</label>
          <input
            className="auth-input"
            placeholder="you@company.com"
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Password</label>
          <input
            className="auth-input"
            type="password"
            placeholder="••••••••"
            onChange={(e) => setPassword(e.target.value)}
          />
        </div>

        <div className="auth-field">
          <label className="auth-label">Company</label>
          <input
            className="auth-input"
            placeholder="Company Name"
            onChange={(e) => setCompany(e.target.value)}
          />
        </div>

        

        <button className="auth-btn" onClick={handleLogin}>
          Sign In →
        </button>
      </div>
    </div>
  );
};

export default Auth;