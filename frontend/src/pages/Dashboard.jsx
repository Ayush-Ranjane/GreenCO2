import React, { useEffect, useState } from "react";
import API from "../api/api";

const Dashboard = () => {
  const [data, setData] = useState({
    total_co2: 0,
    total_fuel: 0
  });

  useEffect(() => {
    API.get("/api/dashboard")
      .then(res => setData(res.data))
      .catch(err => console.log(err));
  }, []);

  return (
    <div className="page">
      <h1>Dashboard</h1>

      <div className="cards">
        <div className="card">
          <h3>Total CO₂ Emission</h3>
          <p>{data.total_co2} kg</p>
        </div>

        <div className="card">
          <h3>Fuel Usage</h3>
          <p>{data.total_fuel} L</p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;