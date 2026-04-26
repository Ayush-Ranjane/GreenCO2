/**
 * Report.jsx — Monthly Report Page
 * ----------------------------------
 * Displays a monthly CO₂ compliance summary report with:
 *  - Key metrics (CO₂ total, compliance status, recommendation)
 *  - A summary detail list
 *  - A download button (currently a placeholder — no API endpoint yet)
 *
 * Future enhancement: wire the Download button to POST /api/report/download
 * which returns a PDF blob from the Flask backend.
 *
 * No props needed — standalone page component.
 */

import React from 'react';
import '../assets/css/Report.css';

/* ── Static Report Data ──
   In the future, this will be fetched from GET /api/report/latest */
const REPORT = {
  period:         'April 2026',
  total_co2:      12540,
  compliance:     'Within CPCB Limits',
  fuel_used:      4680,
  efficiency:     '87%',
  recommendation: 'Reduce diesel consumption in boiler operations by 10% to stay well within limits.',
};

/* ── Report Summary Rows ──
   Each row maps to a detail line in the report card */
const SUMMARY_ROWS = [
  { label: 'Reporting Period',    value: REPORT.period },
  { label: 'Total CO₂ Emitted',  value: `${REPORT.total_co2.toLocaleString()} kg` },
  { label: 'Fuel Consumed',       value: `${REPORT.fuel_used.toLocaleString()} L` },
  { label: 'Fuel Efficiency',     value: REPORT.efficiency },
  { label: 'Compliance Status',   value: REPORT.compliance,  highlight: true },
  { label: 'Recommendation',      value: REPORT.recommendation },
];

const Report = () => {
  /**
   * handleDownload — placeholder for future PDF download
   * When the backend endpoint is ready, replace the alert with:
   *   const res = await API.get('/api/report/download', { responseType: 'blob' });
   *   // then create a URL and trigger a browser download
   */
  const handleDownload = () => {
    alert('PDF download coming soon — backend endpoint not yet implemented.');
  };

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">📄</span>
        Monthly Report
      </h1>

      {/* ── Report Header Card ──
          Shows the period and a status badge at a glance */}
      <div className="card report-header-card">
        <div className="report-period">
          <span className="period-label">Reporting Period</span>
          <span className="period-value">{REPORT.period}</span>
        </div>
        <span className="report-status-badge">✅ Compliant</span>
      </div>

      {/* ── Summary Card ──
          Detail rows from the SUMMARY_ROWS array */}
      <div className="card">
        <h3>Monthly Summary</h3>
        <div className="report-rows">
          {SUMMARY_ROWS.map((row, i) => (
            <div key={i} className="report-row">
              <span className="report-row-label">{row.label}</span>
              <span className={`report-row-value ${row.highlight ? 'report-row-value--green' : ''}`}>
                {row.value}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* ── Download Button ── */}
      <button className="btn report-download-btn" onClick={handleDownload}>
        ⬇ Download PDF Report
      </button>

    </div>
  );
};

export default Report;