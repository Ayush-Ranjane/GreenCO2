import React from 'react';
import { ArrowRight, BarChart3, Shield, Zap, TrendingDown, CheckCircle } from 'lucide-react';
import '../assets/css/Home.css';

const Home = () => {
  return (
    <div className="home">

      {/* ── Hero ── */}
      <section className="hero">
        <div className="hero-badge">
          <span className="hero-badge__dot" />
          AI-Powered Emission Intelligence
        </div>

        <h1 className="hero-title">
          Stay Compliant.<br />
          <span className="hero-title--accent">Reduce Emissions.</span>
        </h1>

        <p className="hero-desc">
          Enterprise-grade CO₂ monitoring and prediction platform for industrial compliance.
          Powered by TensorFlow — built for teams who take sustainability seriously.
        </p>

        <div className="hero-actions">
          <a href="/auth" className="hero-btn hero-btn--primary">
            Get Started <ArrowRight size={16} strokeWidth={2} />
          </a>
          <a href="/client" className="hero-btn hero-btn--ghost">
            View Dashboard
          </a>
        </div>
      </section>

      {/* ── Stats ── */}
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

      {/* ── Value cards ── */}
      <section className="value-section">
        <div className="value-card">
          <div className="value-card__icon"><Shield size={22} strokeWidth={1.75} /></div>
          <h3>Regulatory Compliance</h3>
          <p>Stay aligned with CPCB and global emission standards without manual effort.</p>
        </div>
        <div className="value-card">
          <div className="value-card__icon"><TrendingDown size={22} strokeWidth={1.75} /></div>
          <h3>Cost Reduction</h3>
          <p>Identify fuel inefficiencies and cut unnecessary operational costs.</p>
        </div>
        <div className="value-card">
          <div className="value-card__icon"><Zap size={22} strokeWidth={1.75} /></div>
          <h3>Real-Time Monitoring</h3>
          <p>Track emissions instantly instead of relying on delayed manual reports.</p>
        </div>
        <div className="value-card">
          <div className="value-card__icon"><BarChart3 size={22} strokeWidth={1.75} /></div>
          <h3>AI Forecasting</h3>
          <p>Predict future emissions with machine learning before they become violations.</p>
        </div>
      </section>

      {/* ── Impact ── */}
      <section className="impact-section">
        <div className="impact-text">
          <h2>Why Industries Choose GreenCO₂</h2>
          <p>Built for sustainability teams that need precision, speed, and compliance confidence.</p>
          <ul className="impact-list">
            <li><CheckCircle size={16} strokeWidth={2} /> Avoid regulatory penalties and shutdown risks</li>
            <li><CheckCircle size={16} strokeWidth={2} /> Reduce reporting time by up to 90%</li>
            <li><CheckCircle size={16} strokeWidth={2} /> Improve operational efficiency and ESG scores</li>
          </ul>
          <a href="/auth" className="hero-btn hero-btn--primary" style={{ marginTop: '24px', display: 'inline-flex' }}>
            Start Free Today <ArrowRight size={16} strokeWidth={2} />
          </a>
        </div>
      </section>

    </div>
  );
};

export default Home;