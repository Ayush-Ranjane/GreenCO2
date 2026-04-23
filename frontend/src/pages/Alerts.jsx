import React from "react";

const Alerts = () => {
  return (
    <div className="page">
      <h1>Alerts</h1>

      <div className="alert danger">
        CO₂ emission exceeded threshold ⚠️
      </div>

      <div className="alert warning">
        Fuel usage unusually high
      </div>

      <div className="alert success">
        System running normally
      </div>
    </div>
  );
};

export default Alerts;