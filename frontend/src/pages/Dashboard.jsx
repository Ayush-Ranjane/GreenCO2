/**
 * Dashboard.jsx — Main Data Dashboard Page
 * ------------------------------------------
 * Fetches live data from GET /api/dashboard on mount.
 *
 * API shape expected:
 * {
 *   today_total:   number,
 *   monthly_total: number,
 *   trend:         [{ date: "YYYY-MM-DD", co2: number }, ...],
 *   by_source:     [{ type: string, co2: number }, ...],
 *   alert:         "High emission" | "Normal"
 * }
 *
 * States:
 *   data    {object|null} — API response
 *   loading {boolean}     — spinner while fetching
 *   error   {string|null} — error message on failure
 */

import React, { useState, useEffect } from 'react';
import API from '../api/api';
import '../assets/css/Dashboard.css';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Scale co2 value to a readable bar height (max ~200px) */
const getBarHeight = (co2, maxCo2) => {
  if (!maxCo2 || maxCo2 === 0) return '4px';
  const h = Math.max(4, Math.round((co2 / maxCo2) * 200));
  return `${h}px`;
};

/** Colour thresholds matching the CPCB limit model */
const getBarColor = (co2) => {
  if (co2 > 1000) return 'var(--color-danger,  #ef4444)';
  if (co2 > 500)  return 'var(--color-warning, #f59e0b)';
  return 'var(--green-500, #22c55e)';
};

/** Source-type emoji lookup */
const SOURCE_ICON = {
  diesel:      '⛽',
  petrol:      '🛢️',
  natural_gas: '🔥',
  electricity: '⚡',
};

// ── Component ─────────────────────────────────────────────────────────────────

const Dashboard = () => {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(null);

  useEffect(() => {
    let cancelled = false;

    API.get('/api/dashboard')
      .then((res) => {
        if (!cancelled) setData(res.data);
      })
      .catch((err) => {
        if (!cancelled) {
          const msg = err.response?.data?.error || 'Failed to load dashboard data.';
          setError(msg);
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });

    return () => { cancelled = true; };
  }, []);

  // ── Loading ──────────────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="page">
        <div className="dashboard-loading">
          <div className="spinner-large" />
          <p>Loading dashboard…</p>
        </div>
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="card dashboard-error">
          <span className="dashboard-error-icon">⚠️</span>
          <h3>Dashboard Unavailable</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  const { today_total, monthly_total, trend = [], by_source = [], alert } = data;
  const maxTrendCo2 = trend.length > 0 ? Math.max(...trend.map((t) => t.co2)) : 0;
  const isHighAlert = alert === 'High emission';

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">📊</span>
        Dashboard
      </h1>

      {/* ── Alert Banner ── */}
      {isHighAlert && (
        <div className="alert danger dashboard-alert-banner">
          <span className="alert-icon">🔴</span>
          <strong>High Emission Alert</strong> — Today's CO₂ exceeds 1,000 kg. Review your emission sources.
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="cards">

        <div className="card card--metric">
          <h3>Today's CO₂</h3>
          <p>
            {today_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="unit"> kg</span>
          </p>
          <div className={`card-trend ${isHighAlert ? 'card-trend--up' : 'card-trend--neutral'}`}>
            {isHighAlert ? '▲ Above threshold' : '✔ Within limits'}
          </div>
        </div>

        <div className="card card--metric">
          <h3>Monthly Total</h3>
          <p>
            {monthly_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}
            <span className="unit"> kg</span>
          </p>
          <div className="card-trend card-trend--neutral">Current calendar month</div>
        </div>

        <div className="card card--metric">
          <h3>Compliance Status</h3>
          <p className={isHighAlert ? 'status-warn' : 'status-ok'}>
            {isHighAlert ? '⚠️ Review Required' : '✅ Normal'}
          </p>
          <div className="card-trend card-trend--neutral">Threshold: 1,000 kg/day</div>
        </div>

      </div>

      {/* ── 7-Day CO₂ Trend Chart ── */}
      <div className="card card--chart">
        <h3>7-Day CO₂ Trend</h3>
        <p className="card-subtitle">Last 7 days (kg CO₂ per day)</p>

        {trend.length === 0 ? (
          <div className="chart-empty">No emission data logged yet. Use <strong>Log Emissions</strong> to get started.</div>
        ) : (
          <>
            <div className="bar-chart">
              {trend.map((item, index) => (
                <div key={index} className="bar-group">
                  <div className="bar-value">
                    {item.co2.toLocaleString(undefined, { maximumFractionDigits: 1 })}
                  </div>
                  <div
                    className="bar"
                    style={{
                      height:     getBarHeight(item.co2, maxTrendCo2),
                      background: getBarColor(item.co2),
                    }}
                    title={`${item.date}: ${item.co2} kg CO₂`}
                  />
                  <div className="bar-label">
                    {/* Show MM-DD for readability */}
                    {item.date.slice(5)}
                  </div>
                </div>
              ))}
            </div>

            <div className="chart-legend">
              <span className="legend-dot legend-dot--green" /> Safe (&lt;500 kg)
              <span className="legend-dot legend-dot--yellow" /> Near Limit (500–1,000 kg)
              <span className="legend-dot legend-dot--red" /> Exceeded (&gt;1,000 kg)
            </div>
          </>
        )}
      </div>

      {/* ── Source Breakdown ── */}
      <div className="card">
        <h3>Emissions by Source</h3>
        {by_source.length === 0 ? (
          <p className="chart-empty">No source data available yet.</p>
        ) : (
          <div className="source-breakdown">
            {by_source.map((src, i) => {
              const totalAll = by_source.reduce((s, r) => s + r.co2, 0);
              const pct = totalAll > 0 ? ((src.co2 / totalAll) * 100).toFixed(1) : 0;
              return (
                <div key={i} className="source-row">
                  <span className="source-icon">
                    {SOURCE_ICON[src.type] || '🏭'}
                  </span>
                  <span className="source-label">{src.type.replace('_', ' ')}</span>
                  <div className="source-bar-track">
                    <div
                      className="source-bar-fill"
                      style={{ width: `${pct}%`, background: getBarColor(src.co2) }}
                    />
                  </div>
                  <span className="source-value">
                    {src.co2.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                    <span className="source-pct"> ({pct}%)</span>
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </div>

    </div>
  );
};

export default Dashboard;