import React, { useState } from "react";
import { useNavigate } from "react-router-dom";  // ✅ correct
import API from "../api/api";

const Auth = ({ setIsLoggedIn }) => {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const navigate = useNavigate();

const handleLogin = async () => {
  try {
    const res = await API.post("/api/login", {
      email,
      password,
    });

    // save token
    localStorage.setItem("token", res.data.token);

    // 🔥 update state immediately
    setIsLoggedIn(true);

    // redirect
    navigate("/client");
    
  } catch (err) {
    console.log(err.response?.data);
    alert("Invalid credentials");
  }
};

  return (
    <div>
      <h2>Login</h2>

      <input
        placeholder="Email"
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Password"
        onChange={(e) => setPassword(e.target.value)}
      />

      <button onClick={handleLogin}>Login</button>
    </div>
  );
};

export default Auth;