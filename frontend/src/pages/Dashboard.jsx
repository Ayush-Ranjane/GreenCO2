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
import { SkeletonLoader, ErrorMessage } from '../components/ui';
import { Activity, BarChart2, ShieldCheck, ShieldAlert, Fuel, Droplets, Flame, Zap as ZapIcon } from 'lucide-react';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, ReferenceLine
} from 'recharts';

// ── Helpers ───────────────────────────────────────────────────────────────────

/** Colour thresholds matching the CPCB limit model */
const getBarColor = (co2) => {
  if (co2 > 1000) return 'var(--color-danger)';
  if (co2 > 500)  return 'var(--color-warning)';
  return 'var(--color-success)';
};

/** Lucide icon per source type */
const SOURCE_ICONS = {
  diesel:      <Fuel size={15} />,
  petrol:      <Droplets size={15} />,
  natural_gas: <Flame size={15} />,
  electricity: <ZapIcon size={15} />,
};

/** Fixed accent colour per source type */
const SOURCE_COLORS_MAP = {
  diesel:      '#f97316',
  petrol:      '#fb923c',
  natural_gas: '#facc15',
  electricity: '#60a5fa',
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

  // ── Loading — skeleton cards matching the 3 KPI cards below ───────────────
  if (loading) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
          <p className="page-subtitle">Your CO₂ emissions at a glance</p>
        </div>
        <div className="cards">
          {[1,2,3,4].map(i => <div key={i} className="card skeleton" style={{ height: '110px' }} />)}
        </div>
        <div className="card skeleton" style={{ height: '320px', marginBottom: '16px' }} />
      </div>
    );
  }

  // ── Error ────────────────────────────────────────────────────────────────
  if (error) {
    return (
      <div className="page">
        <div className="page-header">
          <h1 className="page-title">Dashboard</h1>
        </div>
        <div className="alert danger"><span className="alert-icon">⚠</span>{error}</div>
      </div>
    );
  }

  const { today_total, monthly_total, trend = [], by_source = [], alert } = data;
  const maxTrendCo2 = trend.length > 0 ? Math.max(...trend.map((t) => t.co2)) : 0;
  const isHighAlert = alert === 'High emission';

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <div className="page-header">
        <h1 className="page-title">Dashboard</h1>
        <p className="page-subtitle">Your CO₂ emissions at a glance</p>
      </div>

      {/* ── Alert Banner ── */}
      {isHighAlert && (
        <div className="alert danger dashboard-alert-banner">
          <span className="alert-icon">⚠</span>
          <div><strong>High Emission Alert</strong> — Today's CO₂ exceeds 1,000 kg. Review your emission sources.</div>
        </div>
      )}

      {/* ── KPI Cards ── */}
      <div className="cards">
        <div className="card card--metric dash-kpi-card">
          <div className="dash-kpi-icon"
            style={{ background: isHighAlert ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
                     color: isHighAlert ? 'var(--color-danger)' : 'var(--color-success)' }}>
            <Activity size={18} />
          </div>
          <h3>Today's CO₂</h3>
          <p>{today_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}<span className="unit"> kg</span></p>
          <div className={`card-trend ${isHighAlert ? 'card-trend--up' : 'card-trend--down'}`}>
            {isHighAlert ? 'Above threshold' : 'Within limits'}
          </div>
        </div>

        <div className="card card--metric dash-kpi-card">
          <div className="dash-kpi-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--color-info)' }}>
            <BarChart2 size={18} />
          </div>
          <h3>Monthly Total</h3>
          <p>{monthly_total.toLocaleString(undefined, { maximumFractionDigits: 2 })}<span className="unit"> kg</span></p>
          <div className="card-trend card-trend--neutral">Current calendar month</div>
        </div>

        <div className="card card--metric dash-kpi-card">
          <div className="dash-kpi-icon"
            style={{ background: isHighAlert ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)',
                     color: isHighAlert ? 'var(--color-danger)' : 'var(--color-success)' }}>
            {isHighAlert ? <ShieldAlert size={18} /> : <ShieldCheck size={18} />}
          </div>
          <h3>Compliance Status</h3>
          <p className={isHighAlert ? 'status-warn' : 'status-ok'}
             style={{ fontSize: 'var(--text-lg)', fontWeight: 700 }}>
            {isHighAlert ? 'Review' : 'Normal'}
          </p>
          <div className="card-trend card-trend--neutral">Threshold: 1,000 kg/day</div>
        </div>
      </div>

      {/* ── 7-Day CO₂ Trend Chart ── */}
      <div className="card">
        <div className="card-title-row">
          <h3>7-Day CO₂ Trend</h3>
          <div className="dash-chart-legend">
            <span className="dash-legend-item"><span className="dash-legend-line dash-legend-line--green" />Daily CO₂</span>
            <span className="dash-legend-item"><span className="dash-legend-line dash-legend-line--red" />Limit</span>
          </div>
        </div>
        <p className="card-subtitle">Last 7 days — kg CO₂ per day</p>

        {trend.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__title">No trend data yet</div>
            <div className="empty-state__sub">Use <strong>Log Emissions</strong> to get started.</div>
          </div>
        ) : (
          <ResponsiveContainer width="100%" height={260}>
            <AreaChart data={trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="dashGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" vertical={false} />
              <XAxis dataKey="date" tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                     axisLine={false} tickLine={false} tickFormatter={v => v.slice(5)} />
              <YAxis tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                     axisLine={false} tickLine={false} width={48} />
              <Tooltip
                contentStyle={{ background: 'var(--surface-1)', border: '1px solid var(--surface-3)', borderRadius: '10px', fontSize: '12px', fontFamily: 'var(--font-sans)' }}
                formatter={v => [`${Number(v).toFixed(1)} kg CO₂`, 'Daily CO₂']}
                cursor={{ stroke: 'var(--surface-3)', strokeWidth: 1 }}
              />
              <ReferenceLine y={1000} stroke="var(--color-danger)" strokeDasharray="5 3" strokeWidth={1.5} />
              <Area type="monotone" dataKey="co2" stroke="#16a34a" strokeWidth={2.5}
                    fill="url(#dashGrad)" dot={false}
                    activeDot={{ r: 5, fill: '#16a34a', stroke: 'var(--surface-1)', strokeWidth: 2 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </div>

      {/* ── Source Breakdown ── */}
      <div className="card">
        <div className="card-title-row"><h3>Emissions by Source</h3></div>
        {by_source.length === 0 ? (
          <div className="empty-state">
            <div className="empty-state__sub">No source data available yet.</div>
          </div>
        ) : (
          <div className="source-breakdown">
            {by_source.map((src, i) => {
              const totalAll = by_source.reduce((s, r) => s + r.co2, 0);
              const pct = totalAll > 0 ? ((src.co2 / totalAll) * 100).toFixed(1) : 0;
              const srcColor = SOURCE_COLORS_MAP[src.type] || 'var(--accent-primary)';
              return (
                <div key={i} className="source-row">
                  <span className="source-icon-box" style={{ background: srcColor + '1a', color: srcColor }}>
                    {SOURCE_ICONS[src.type] || <Fuel size={15} />}
                  </span>
                  <span className="source-label">{src.type.replace('_', ' ')}</span>
                  <div className="source-bar-track">
                    <div className="source-bar-fill" style={{ width: `${pct}%`, background: srcColor }} />
                  </div>
                  <span className="source-value">
                    {src.co2.toLocaleString(undefined, { maximumFractionDigits: 2 })} kg
                    <span className="source-pct"> {pct}%</span>
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