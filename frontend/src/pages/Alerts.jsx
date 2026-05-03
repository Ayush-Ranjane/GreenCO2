/**
 * Alerts.jsx — GreenCO2 Live Alert Centre
 * ==========================================
 * Fetches real alerts from GET /api/alerts.
 * Supports filtering by category + severity, mark-as-read, mark-all-read,
 * and on-demand alert engine trigger (POST /api/alerts/run).
 *
 * Alert categories and their severities:
 *   threshold  → medium   (yellow)
 *   trend      → high     (orange)
 *   anomaly    → critical (red)
 *   prediction → high     (orange)
 */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import '../assets/css/Alerts.css';

// ── Config ────────────────────────────────────────────────────────────────────

const API = 'http://localhost:5000';

const SEVERITY_META = {
  critical: { label: 'Critical', color: '#dc2626', bg: 'rgba(220,38,38,.12)', icon: '🚨' },
  high:     { label: 'High',     color: '#ea580c', bg: 'rgba(234,88,12,.12)', icon: '⚠️' },
  medium:   { label: 'Medium',   color: '#ca8a04', bg: 'rgba(202,138,4,.12)',  icon: '🟡' },
  low:      { label: 'Low',      color: '#16a34a', bg: 'rgba(22,163,74,.12)',  icon: '✅' },
};

const CAT_META = {
  threshold:  { label: 'Threshold',  icon: '📊' },
  trend:      { label: 'Trend',      icon: '📈' },
  anomaly:    { label: 'Anomaly',    icon: '🔬' },
  prediction: { label: 'Prediction', icon: '🔮' },
};

// ── Helper ────────────────────────────────────────────────────────────────────

function authHeader() {
  const token = localStorage.getItem('token');
  return { Authorization: `Bearer ${token}` };
}

function timeAgo(iso) {
  const diff = Date.now() - new Date(iso).getTime();
  const mins  = Math.floor(diff / 60_000);
  if (mins < 1)   return 'Just now';
  if (mins < 60)  return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs  < 24)  return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
}

// ── Sub-components ────────────────────────────────────────────────────────────

function SeverityBadge({ severity }) {
  const m = SEVERITY_META[severity] || SEVERITY_META.medium;
  return (
    <span style={{
      fontSize: '10px', fontWeight: 700, letterSpacing: '.08em',
      textTransform: 'uppercase', color: m.color,
      background: m.bg, borderRadius: '4px', padding: '2px 7px',
    }}>
      {m.icon} {m.label}
    </span>
  );
}

function CategoryBadge({ category }) {
  const m = CAT_META[category] || { label: category, icon: '🔔' };
  return (
    <span style={{
      fontSize: '10px', fontWeight: 600, letterSpacing: '.05em',
      textTransform: 'uppercase', color: '#64748b',
      background: 'rgba(100,116,139,.1)', borderRadius: '4px',
      padding: '2px 7px',
    }}>
      {m.icon} {m.label}
    </span>
  );
}

function AlertCard({ alert, onMarkRead }) {
  const sev = SEVERITY_META[alert.severity] || SEVERITY_META.medium;
  return (
    <div
      className={`alert-card ${alert.is_read ? 'alert-card--read' : 'alert-card--unread'}`}
      style={{ borderLeftColor: sev.color }}
    >
      <div className="alert-card__header">
        <div className="alert-card__badges">
          <SeverityBadge severity={alert.severity} />
          <CategoryBadge category={alert.category} />
        </div>
        <div className="alert-card__meta">
          <span className="alert-card__time">{timeAgo(alert.created_at)}</span>
          {!alert.is_read && (
            <button
              className="alert-card__read-btn"
              onClick={() => onMarkRead(alert.id)}
              title="Mark as read"
            >
              ✓ Mark read
            </button>
          )}
          {alert.is_read && <span className="alert-card__read-chip">Read</span>}
        </div>
      </div>

      <p className="alert-card__title">{alert.title}</p>
      <p className="alert-card__message">{alert.message}</p>

      {alert.email_sent && (
        <p className="alert-card__email-note">📧 Email notification sent</p>
      )}
    </div>
  );
}

// ── Summary bar ───────────────────────────────────────────────────────────────

function SummaryBar({ alerts }) {
  const counts = { critical: 0, high: 0, medium: 0, low: 0 };
  alerts.forEach(a => { counts[a.severity] = (counts[a.severity] || 0) + 1; });

  return (
    <div className="alerts-summary">
      {Object.entries(counts).map(([sev, n]) => n > 0 && (
        <span
          key={sev}
          className="summary-chip"
          style={{
            background: SEVERITY_META[sev].bg,
            color:      SEVERITY_META[sev].color,
            border:     `1px solid ${SEVERITY_META[sev].color}33`,
          }}
        >
          {SEVERITY_META[sev].icon} {n} {SEVERITY_META[sev].label}
        </span>
      ))}
    </div>
  );
}

// ── Main component ────────────────────────────────────────────────────────────

const Alerts = () => {
  const [alerts,      setAlerts]      = useState([]);
  const [total,       setTotal]       = useState(0);
  const [unread,      setUnread]      = useState(0);
  const [loading,     setLoading]     = useState(false);
  const [running,     setRunning]     = useState(false);
  const [runResult,   setRunResult]   = useState(null);

  // Filters
  const [filterCat,  setFilterCat]  = useState('');
  const [filterSev,  setFilterSev]  = useState('');
  const [filterUnread, setFilterUnread] = useState(false);

  // ── Fetch alerts ────────────────────────────────────────────────────────────

  const fetchAlerts = useCallback(async () => {
    setLoading(true);
    try {
      const params = { limit: 100, offset: 0 };
      if (filterCat)    params.category = filterCat;
      if (filterSev)    params.severity  = filterSev;
      if (filterUnread) params.unread    = 'true';

      const res = await axios.get(`${API}/api/alerts`, {
        headers: authHeader(),
        params,
      });
      setAlerts(res.data.alerts || []);
      setTotal(res.data.total   || 0);
      setUnread(res.data.unread_count || 0);
    } catch (err) {
      console.error('Failed to fetch alerts:', err);
    } finally {
      setLoading(false);
    }
  }, [filterCat, filterSev, filterUnread]);

  useEffect(() => { fetchAlerts(); }, [fetchAlerts]);

  // ── Mark single read ────────────────────────────────────────────────────────

  const handleMarkRead = async (id) => {
    try {
      await axios.put(`${API}/api/alerts/${id}/read`, {}, { headers: authHeader() });
      setAlerts(prev => prev.map(a => a.id === id ? { ...a, is_read: true } : a));
      setUnread(u => Math.max(u - 1, 0));
    } catch (err) {
      console.error('Mark read failed:', err);
    }
  };

  // ── Mark all read ───────────────────────────────────────────────────────────

  const handleMarkAllRead = async () => {
    try {
      await axios.put(`${API}/api/alerts/read-all`, {}, { headers: authHeader() });
      setAlerts(prev => prev.map(a => ({ ...a, is_read: true })));
      setUnread(0);
    } catch (err) {
      console.error('Mark all read failed:', err);
    }
  };

  // ── Run alert engine ────────────────────────────────────────────────────────

  const handleRunEngine = async () => {
    setRunning(true);
    setRunResult(null);
    try {
      const res = await axios.post(`${API}/api/alerts/run`, {}, { headers: authHeader() });
      setRunResult({
        count:      res.data.count,
        emailSent:  res.data.email_sent,
        ok:         true,
      });
      fetchAlerts();   // refresh list
    } catch (err) {
      setRunResult({ ok: false, error: 'Alert engine failed. Check server logs.' });
    } finally {
      setRunning(false);
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page">

      {/* Header */}
      <div className="alerts-header">
        <div>
          <h1>
            🔔 Alert Centre
            {unread > 0 && (
              <span className="unread-badge">{unread}</span>
            )}
          </h1>
          <p className="alerts-subtitle">
            {total} alert{total !== 1 ? 's' : ''} total · {unread} unread
          </p>
        </div>

        <div className="alerts-actions">
          {unread > 0 && (
            <button className="btn btn--ghost" onClick={handleMarkAllRead}>
              ✓ Mark all read
            </button>
          )}
          <button
            className="btn btn--primary"
            onClick={handleRunEngine}
            disabled={running}
          >
            {running ? '⏳ Running…' : '⚡ Run Alert Engine'}
          </button>
        </div>
      </div>

      {/* Engine run result banner */}
      {runResult && (
        <div className={`run-banner ${runResult.ok ? 'run-banner--ok' : 'run-banner--err'}`}>
          {runResult.ok
            ? `✅ Engine ran — ${runResult.count} new alert${runResult.count !== 1 ? 's' : ''} generated.${runResult.emailSent ? ' Email sent ✉️' : ''}`
            : `❌ ${runResult.error}`}
        </div>
      )}

      {/* Category architecture explainer */}
      <div className="category-grid">
        {Object.entries(CAT_META).map(([key, meta]) => {
          const sevKey = key === 'anomaly' ? 'critical' : key === 'threshold' ? 'medium' : 'high';
          const sev    = SEVERITY_META[sevKey];
          return (
            <div
              key={key}
              className="category-card"
              style={{ borderColor: sev.color + '44' }}
              onClick={() => setFilterCat(filterCat === key ? '' : key)}
            >
              <span className="category-card__icon">{meta.icon}</span>
              <span className="category-card__label">{meta.label}</span>
              <SeverityBadge severity={sevKey} />
            </div>
          );
        })}
      </div>

      {/* Summary bar */}
      {alerts.length > 0 && <SummaryBar alerts={alerts} />}

      {/* Filters */}
      <div className="alerts-filters">
        <select
          value={filterCat}
          onChange={e => setFilterCat(e.target.value)}
          className="filter-select"
        >
          <option value="">All Categories</option>
          <option value="threshold">📊 Threshold</option>
          <option value="trend">📈 Trend</option>
          <option value="anomaly">🔬 Anomaly</option>
          <option value="prediction">🔮 Prediction</option>
        </select>

        <select
          value={filterSev}
          onChange={e => setFilterSev(e.target.value)}
          className="filter-select"
        >
          <option value="">All Severities</option>
          <option value="critical">🚨 Critical</option>
          <option value="high">⚠️ High</option>
          <option value="medium">🟡 Medium</option>
          <option value="low">✅ Low</option>
        </select>

        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filterUnread}
            onChange={e => setFilterUnread(e.target.checked)}
          />
          Unread only
        </label>

        <button className="btn btn--ghost btn--sm" onClick={fetchAlerts}>
          🔄 Refresh
        </button>
      </div>

      {/* Alert list */}
      {loading ? (
        <div className="loader-wrap">
          <div className="loader" />
          <p>Fetching alerts…</p>
        </div>
      ) : alerts.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state__icon">✅</span>
          <p className="empty-state__title">No alerts match your filters</p>
          <p className="empty-state__sub">
            Run the alert engine to check for new issues, or adjust your filters.
          </p>
        </div>
      ) : (
        <div className="alerts-list">
          {alerts.map(alert => (
            <AlertCard
              key={alert.id}
              alert={alert}
              onMarkRead={handleMarkRead}
            />
          ))}
        </div>
      )}

    </div>
  );
};

export default Alerts;