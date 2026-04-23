import React from "react";

const Report = () => {
  return (
    <div className="page">
      <h1>Report</h1>

      <div className="card">
        <h3>Monthly Summary</h3>
        <p>Total CO₂: 12,540 kg</p>
        <p>Compliance: Within CPCB limits</p>
        <p>Recommendation: Reduce diesel consumption</p>
      </div>

      <button className="btn">Download Report</button>
    </div>
  );
};

export default Report;