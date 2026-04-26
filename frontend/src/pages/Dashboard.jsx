/**
 * Dashboard.jsx — Main Data Dashboard Page
 * ------------------------------------------
 * Displays CO₂ emission summary, a visual monthly trend bar chart,
 * and recent system alerts — all sourced from a local data file.
 *
 * Data source: src/assets/data/dashboardData.js
 * (In a future iteration, this will be fetched from GET /api/dashboard)
 *
 * No props needed — data is read directly from the local data file.
 */

import React from 'react';
import dashboardData from '../assets/data/dashboardData';
import '../assets/css/Dashboard.css';

const Dashboard = () => {
  /* Destructure all data sections from the local data file */
  const { company, summary, trends, alerts } = dashboardData;

  /**
   * Bar height calculation:
   * FIX: original code used raw number (e.g. 42) without 'px' unit — bars were invisible.
   * Now divides by 50 and appends 'px' so bars render at a readable height (max ~50px).
   */
  const getBarHeight = (co2Value) => `${Math.round(co2Value / 50)}px`;

  /**
   * Bar colour logic:
   * Green = safe, Yellow = approaching limit, Red = over threshold
   */
  const getBarColor = (co2Value) => {
    if (co2Value > 2400) return 'var(--color-danger)';
    if (co2Value > 2000) return 'var(--color-warning)';
    return 'var(--green-500)';
  };

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">📊</span>
        {company} Dashboard
      </h1>

      {/* ── Summary Cards ──
          Displays the three key KPIs: total CO₂, fuel usage, and compliance status */}
      <div className="cards">

        <div className="card card--metric">
          <h3>Total CO₂ Emission</h3>
          <p>{summary.total_co2.toLocaleString()} <span className="unit">kg</span></p>
          <div className="card-trend card-trend--up">▲ 8% vs last month</div>
        </div>

        <div className="card card--metric">
          <h3>Fuel Usage</h3>
          <p>{summary.total_fuel.toLocaleString()} <span className="unit">L</span></p>
          <div className="card-trend card-trend--up">▲ 12% vs last month</div>
        </div>

        <div className="card card--metric">
          <h3>Compliance Status</h3>
          <p className="status-ok">✅ {summary.status}</p>
          <div className="card-trend card-trend--neutral">CPCB Limit: 15,000 kg</div>
        </div>

      </div>

      {/* ── Monthly CO₂ Trend Chart ──
          Custom CSS bar chart. Each bar height is computed from co2 value.
          FIX: height now uses pixel strings (e.g. "42px") instead of raw numbers. */}
      <div className="card card--chart">
        <h3>Monthly CO₂ Trend</h3>
        <p className="card-subtitle">Jan – Jun 2026 (kg)</p>

        <div className="bar-chart">
          {trends.map((item, index) => (
            <div key={index} className="bar-group">
              {/* Tooltip shows exact value on hover */}
              <div className="bar-value">{item.co2.toLocaleString()}</div>
              <div
                className="bar"
                style={{
                  height:     getBarHeight(item.co2),  // FIX: was missing 'px'
                  background: getBarColor(item.co2),   // FIX: was hardcoded green
                }}
                title={`${item.month}: ${item.co2} kg`}
              />
              <div className="bar-label">{item.month}</div>
            </div>
          ))}
        </div>

        {/* Chart legend */}
        <div className="chart-legend">
          <span className="legend-dot legend-dot--green" /> Safe
          <span className="legend-dot legend-dot--yellow" /> Near Limit
          <span className="legend-dot legend-dot--red" /> Exceeded
        </div>
      </div>

      {/* ── Recent Alerts ──
          Each alert has a type: 'warning' | 'danger' | 'success'
          These map to CSS classes in app.css (.alert.warning, .alert.danger etc.) */}
      <div className="card">
        <h3>Recent Alerts</h3>
        {alerts.map((a, i) => (
          <div key={i} className={`alert ${a.type}`}>
            {/* Icon based on severity */}
            <span className="alert-icon">
              {a.type === 'danger'  ? '🔴' :
               a.type === 'warning' ? '🟡' : '🟢'}
            </span>
            {a.message}
          </div>
        ))}
      </div>

    </div>
  );
};

export default Dashboard;