/**
 * Analytics.jsx — Analytics Overview Page
 * -----------------------------------------
 * Shows emission trend insights and fuel efficiency metrics.
 * Currently uses static data (same pattern as Dashboard).
 *
 * Future enhancement: fetch from GET /api/analytics to get
 * real computed statistics from the ML model.
 *
 * No props needed — standalone page component.
 */

import React from 'react';
import '../assets/css/Analytics.css';

const Analytics = () => {
  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">📈</span>
        Analytics
      </h1>

      {/* ── Insight Cards ──
          Each card shows a specific analytical insight with a status indicator */}
      <div className="cards">

        {/* Emission Trend Card */}
        <div className="card analytics-card analytics-card--alert">
          <div className="analytics-icon">🌫️</div>
          <h3>Emission Trend</h3>
          <p className="analytics-value">+8%</p>
          <p className="analytics-desc">
            CO₂ emissions increased by 8% this month compared to the previous cycle.
            Current level: 12,540 kg.
          </p>
          <div className="analytics-badge analytics-badge--warn">Above Average</div>
        </div>

        {/* Fuel Efficiency Card */}
        <div className="card analytics-card analytics-card--warn">
          <div className="analytics-icon">⛽</div>
          <h3>Fuel Efficiency</h3>
          <p className="analytics-value">−5%</p>
          <p className="analytics-desc">
            Efficiency decreased by 5% compared to last operational cycle.
            Review engine load data for root cause.
          </p>
          <div className="analytics-badge analytics-badge--warn">Needs Review</div>
        </div>

      </div>

      {/* ── Recommendations Panel ── */}
      <div className="card analytics-recommendations">
        <h3>🤖 AI Recommendations</h3>
        <ul className="recommendation-list">
          <li>
            <span className="rec-icon">💡</span>
            Switch to LNG for boiler operations — estimated 15% CO₂ reduction.
          </li>
          <li>
            <span className="rec-icon">🔧</span>
            Schedule engine maintenance — irregular combustion detected.
          </li>
          <li>
            <span className="rec-icon">📅</span>
            Shift heavy loads to off-peak hours to improve fuel efficiency.
          </li>
        </ul>
      </div>

    </div>
  );
};

export default Analytics;