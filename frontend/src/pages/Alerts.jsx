/**
 * Alerts.jsx — System Alerts Page
 * ---------------------------------
 * Displays categorised system alerts for the industrial CO₂ monitoring system.
 * Currently uses static alert data.
 *
 * Alert severity levels:
 *   danger  — immediate action required (CO₂ over threshold)
 *   warning — attention needed (approaching limits)
 *   success — system is operating normally
 *
 * Future enhancement: fetch alerts from GET /api/alerts for live data.
 *
 * No props needed — standalone page component.
 */

import React from 'react';
import '../assets/css/Alerts.css';

/* ── Static Alert Data ──
   Each alert has: type, title, message, and timestamp.
   In the future, this will be replaced by an API response. */
const ALERTS = [
  {
    type:      'danger',
    icon:      '🔴',
    title:     'CO₂ Threshold Exceeded',
    message:   'CO₂ emission has exceeded the CPCB regulatory threshold of 15,000 kg. Immediate corrective action required.',
    time:      '2 hours ago',
  },
  {
    type:      'warning',
    icon:      '🟡',
    title:     'Fuel Usage Spike',
    message:   'Fuel usage is unusually high — 12% above the average for this operational period.',
    time:      '5 hours ago',
  },
  {
    type:      'success',
    icon:      '🟢',
    title:     'System Operating Normally',
    message:   'All sensors reporting nominal values. CO₂ levels within safe range.',
    time:      '1 day ago',
  },
];

const Alerts = () => {
  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">🔔</span>
        Alerts
      </h1>

      {/* ── Alert Count Summary ── */}
      <div className="alerts-summary">
        <span className="summary-chip chip--danger">🔴 1 Critical</span>
        <span className="summary-chip chip--warning">🟡 1 Warning</span>
        <span className="summary-chip chip--success">🟢 1 Resolved</span>
      </div>

      {/* ── Alert Items ──
          Rendered from the ALERTS array above.
          className uses the `type` field to apply the correct colour theme
          (maps to .alert.danger, .alert.warning, .alert.success in app.css) */}
      <div className="alerts-list">
        {ALERTS.map((alert, index) => (
          <div key={index} className={`alert ${alert.type} alert--rich`}>

            {/* Severity icon */}
            <span className="alert-icon">{alert.icon}</span>

            {/* Alert content */}
            <div className="alert-content">
              <div className="alert-title">{alert.title}</div>
              <div className="alert-message">{alert.message}</div>
              <div className="alert-time">{alert.time}</div>
            </div>

          </div>
        ))}
      </div>

    </div>
  );
};

export default Alerts;