import React from "react";
import "../assets/css/Home.css";

const Home = () => {
  return (
    <div className="home">

      {/* HERO SECTION */}
      <section className="hero">
        <h1>
          Stay Compliant. Reduce Emissions. Avoid Penalties.
        </h1>
        <p>
          AI-powered CO₂ monitoring system designed for industries to ensure
          regulatory compliance and optimize operational efficiency.
        </p>

        <div className="hero-buttons">
          <a href="/client" className="btn-primary">View Dashboard</a>
          <a href="/auth" className="btn-secondary">Get Started</a>
        </div>
      </section>

      {/* VALUE SECTION */}
      <section className="value">
        <div className="value-card">
          <h3>Regulatory Compliance</h3>
          <p>Stay aligned with CPCB and global emission standards without manual effort.</p>
        </div>

        <div className="value-card">
          <h3>Cost Reduction</h3>
          <p>Identify fuel inefficiencies and reduce unnecessary operational costs.</p>
        </div>

        <div className="value-card">
          <h3>Real-Time Monitoring</h3>
          <p>Track emissions instantly instead of relying on delayed reports.</p>
        </div>
      </section>

      {/* IMPACT SECTION */}
      <section className="impact">
        <h2>Why Industries Choose GreenCO₂</h2>
        <ul>
          <li>Avoid regulatory penalties and shutdown risks</li>
          <li>Reduce reporting time by up to 90%</li>
          <li>Improve operational efficiency and sustainability</li>
        </ul>
      </section>

    </div>
  );
};

export default Home;