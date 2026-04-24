import React from "react";
import "../assets/css/Home.css";

const Home = () => {
  return (
    <div className="home">

      {/* HERO SECTION */}
      <section className="hero">
        <div className="hero-badge">🌿 AI-Powered Emission Intelligence</div>

        <h1>
          Stay Compliant. Reduce Emissions. Avoid Penalties.
        </h1>
        <p>
          AI-powered CO₂ monitoring system designed for industries to ensure
          regulatory compliance and optimize operational efficiency.
        </p>

        <div className="hero-buttons">
          <a href="/client" className="btn-primary">View Dashboard →</a>
          <a href="/auth" className="btn-secondary">Get Started Free</a>
        </div>
      </section>

      {/* STATS STRIP */}
      <div className="stats-strip">
        <div className="stat-item">
          <div className="stat-value">90%</div>
          <div className="stat-label">Less Reporting Time</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">Real-Time</div>
          <div className="stat-label">Emission Monitoring</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">CPCB</div>
          <div className="stat-label">Compliance Ready</div>
        </div>
        <div className="stat-item">
          <div className="stat-value">AI</div>
          <div className="stat-label">TensorFlow Powered</div>
        </div>
      </div>

      {/* VALUE SECTION */}
      <section className="value">
        <div className="value-card">
          <div className="value-card-icon">📋</div>
          <h3>Regulatory Compliance</h3>
          <p>Stay aligned with CPCB and global emission standards without manual effort.</p>
        </div>

        <div className="value-card">
          <div className="value-card-icon">💡</div>
          <h3>Cost Reduction</h3>
          <p>Identify fuel inefficiencies and reduce unnecessary operational costs.</p>
        </div>

        <div className="value-card">
          <div className="value-card-icon">📡</div>
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