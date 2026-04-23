import React from "react";

const Dashboard = () => {
  return (
    <div className="page">
      <h1>Dashboard</h1>

      <div className="cards">
        <div className="card">
          <h3>Total CO₂ Emission</h3>
          <p>12,540 kg</p>
        </div>

        <div className="card">
          <h3>Fuel Usage</h3>
          <p>4,680 L</p>
        </div>

        <div className="card">
          <h3>Status</h3>
          <p>Within Limits ✅</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;