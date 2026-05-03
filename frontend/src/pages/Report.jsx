/**
 * Report.jsx — GreenCO2 Professional Report Page (v2)
 * =====================================================
 * Features:
 *  - Duration picker: 7 | 14 | 30 | 90 | 180 | 365 days or custom date range
 *  - Live data from GET /api/report (JSON)
 *  - PDF download via GET /api/report/pdf (blob)
 *  - Compliance badge, key metrics, source breakdown, trend chart
 *  - Polished dark-green professional UI
 */

import React, { useEffect, useState, useCallback } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, BarChart, Bar,
  XAxis, YAxis, Tooltip, ResponsiveContainer,
  ReferenceLine, Cell, Legend,
} from 'recharts';
import '../assets/css/Report.css';

// ── Config ────────────────────────────────────────────────────────────────────

const API = 'http://localhost:5000';

const DURATION_OPTIONS = [
  { label: '7 Days',   days: 7 },
  { label: '14 Days',  days: 14 },
  { label: '30 Days',  days: 30 },
  { label: '90 Days',  days: 90 },
  { label: '6 Months', days: 180 },
  { label: '1 Year',   days: 365 },
  { label: 'Custom',   days: null },
];

const SOURCE_COLORS = {
  diesel:      '#f97316',
  petrol:      '#fb923c',
  natural_gas: '#facc15',
  electricity: '#60a5fa',
};

const DAILY_LIMIT = 1000; // kg CO₂

// ── Helpers ───────────────────────────────────────────────────────────────────

function authHeader() {
  return { Authorization: `Bearer ${localStorage.getItem('token')}` };
}

function fmt(n) { return Number(n || 0).toLocaleString(undefined, { maximumFractionDigits: 1 }); }
function fmtDate(iso) {
  if (!iso) return '—';
  const d = new Date(iso);
  return d.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' });
}
function today() { return new Date().toISOString().slice(0, 10); }
function daysAgo(n) {
  const d = new Date();
  d.setDate(d.getDate() - n + 1);
  return d.toISOString().slice(0, 10);
}

// ── Sub-components ────────────────────────────────────────────────────────────

function MetricCard({ icon, label, value, unit, note, highlight }) {
  return (
    <div className={`report-metric-card ${highlight ? 'report-metric-card--highlight' : ''}`}>
      <span className="rmc-icon">{icon}</span>
      <span className="rmc-label">{label}</span>
      <div className="rmc-value">
        {value}
        {unit && <span className="rmc-unit"> {unit}</span>}
      </div>
      {note && <span className="rmc-note">{note}</span>}
    </div>
  );
}

function ComplianceBadge({ status }) {
  const ok = status === 'Compliant';
  return (
    <span className={`compliance-badge ${ok ? 'compliance-badge--ok' : 'compliance-badge--fail'}`}>
      {ok ? '✅ Compliant' : '❌ Non-Compliant'}
    </span>
  );
}

function CustomTooltip({ active, payload, label }) {
  if (!active || !payload?.length) return null;
  return (
    <div className="chart-tooltip">
      <p className="ct-label">{label}</p>
      {payload.map((p, i) => (
        <p key={i} style={{ color: p.color }}>
          {p.name}: <b>{fmt(p.value)} kg</b>
        </p>
      ))}
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────

const Report = () => {
  const [report,       setReport]       = useState(null);
  const [loading,      setLoading]      = useState(false);
  const [downloading,  setDownloading]  = useState(false);
  const [error,        setError]        = useState('');
  const [selectedDays, setSelectedDays] = useState(30);
  const [customMode,   setCustomMode]   = useState(false);
  const [startDate,    setStartDate]    = useState(daysAgo(30));
  const [endDate,      setEndDate]      = useState(today());

  // ── Fetch report ────────────────────────────────────────────────────────────

  const fetchReport = useCallback(async () => {
    setLoading(true);
    setError('');
    try {
      const params = customMode
        ? { start: startDate, end: endDate }
        : { days: selectedDays };

      const res = await axios.get(`${API}/api/report`, {
        headers: authHeader(),
        params,
      });
      setReport(res.data);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to load report data.');
    } finally {
      setLoading(false);
    }
  }, [selectedDays, customMode, startDate, endDate]);

  useEffect(() => { fetchReport(); }, [fetchReport]);

  // ── Download PDF ────────────────────────────────────────────────────────────

  const handleDownload = async () => {
    setDownloading(true);
    try {
      const params = customMode
        ? { start: startDate, end: endDate }
        : { days: selectedDays };

      const res = await axios.get(`${API}/api/report/pdf`, {
        headers: authHeader(),
        params,
        responseType: 'blob',
      });

      const url  = window.URL.createObjectURL(new Blob([res.data]));
      const link = document.createElement('a');
      link.href  = url;
      const cd   = res.headers['content-disposition'] || '';
      const fn   = cd.split('filename=')[1]?.replace(/"/g, '') || 'GreenCO2_Report.pdf';
      link.setAttribute('download', fn);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError('PDF generation failed. Make sure reportlab is installed on the backend.');
    } finally {
      setDownloading(false);
    }
  };

  // ── Duration picker handler ─────────────────────────────────────────────────

  const handleDurationClick = (opt) => {
    if (opt.days === null) {
      setCustomMode(true);
    } else {
      setCustomMode(false);
      setSelectedDays(opt.days);
      setStartDate(daysAgo(opt.days));
      setEndDate(today());
    }
  };

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="page report-page">

      {/* ── Page Header ── */}
      <div className="report-top-header">
        <div>
          <h1>📄 Emission Report</h1>
          <p className="report-subtitle">
            Generate formal compliance reports for any time range
          </p>
        </div>
        <button
          className="btn btn--download"
          onClick={handleDownload}
          disabled={downloading || loading || !report}
        >
          {downloading ? '⏳ Generating PDF…' : '⬇ Download PDF'}
        </button>
      </div>

      {/* ── Duration Picker ── */}
      <div className="card duration-picker">
        <span className="dp-label">Report Period</span>
        <div className="dp-options">
          {DURATION_OPTIONS.map((opt) => (
            <button
              key={opt.label}
              className={`dp-btn ${
                opt.days === null
                  ? customMode ? 'dp-btn--active' : ''
                  : !customMode && selectedDays === opt.days ? 'dp-btn--active' : ''
              }`}
              onClick={() => handleDurationClick(opt)}
            >
              {opt.label}
            </button>
          ))}
        </div>

        {customMode && (
          <div className="dp-custom">
            <label>
              From
              <input
                type="date"
                value={startDate}
                max={endDate}
                onChange={e => setStartDate(e.target.value)}
                className="dp-date-input"
              />
            </label>
            <span className="dp-arrow">→</span>
            <label>
              To
              <input
                type="date"
                value={endDate}
                min={startDate}
                max={today()}
                onChange={e => setEndDate(e.target.value)}
                className="dp-date-input"
              />
            </label>
          </div>
        )}
      </div>

      {/* ── Error ── */}
      {error && (
        <div className="report-error">⚠ {error}</div>
      )}

      {/* ── Loading ── */}
      {loading && (
        <div className="report-loading">
          <div className="loader" />
          <p>Building report…</p>
        </div>
      )}

      {/* ── Report Content ── */}
      {!loading && report && (
        <>
          {/* Report Header */}
          <div className="card report-header-card">
            <div className="rhc-left">
              <h2 className="rhc-company">{report.company}</h2>
              <p className="rhc-period">
                {fmtDate(report.period_start)} — {fmtDate(report.period_end)}
                <span className="rhc-days"> ({report.days} days · {report.days_recorded} data points)</span>
              </p>
              <p className="rhc-generated">
                Generated {new Date(report.generated_at).toLocaleString()}
              </p>
            </div>
            <div className="rhc-right">
              <ComplianceBadge status={report.compliance} />
              <p className="rhc-compliance-note">{report.compliance_note}</p>
            </div>
          </div>

          {/* Key Metrics */}
          <div className="report-metrics-grid">
            <MetricCard
              icon="💨"
              label="Total CO₂"
              value={fmt(report.total_co2)}
              unit="kg"
              note={`Over ${report.days} days`}
            />
            <MetricCard
              icon="📅"
              label="Daily Average"
              value={fmt(report.avg_daily_co2)}
              unit="kg/day"
              note={`Limit: ${DAILY_LIMIT.toLocaleString()} kg/day`}
            />
            <MetricCard
              icon="🔥"
              label="Peak Day"
              value={fmt(report.peak_co2)}
              unit="kg"
              note={fmtDate(report.peak_day)}
            />
            <MetricCard
              icon="⚠️"
              label="Days Over Limit"
              value={report.days_over_limit}
              unit="days"
              note={`of ${report.days_recorded} recorded`}
              highlight={report.days_over_limit > 0}
            />
          </div>

          {/* Emission Trend Chart */}
          <div className="card">
            <div className="card-title-row">
              <h3>📈 Daily Emission Trend</h3>
              <span className="chart-legend-note">
                <span className="dot dot--red" /> Daily limit ({DAILY_LIMIT.toLocaleString()} kg)
              </span>
            </div>
            <ResponsiveContainer width="100%" height={240}>
              <AreaChart data={report.trend} margin={{ top: 8, right: 8, left: 0, bottom: 0 }}>
                <defs>
                  <linearGradient id="co2Grad" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.35} />
                    <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                  </linearGradient>
                </defs>
                <XAxis dataKey="date" tick={{ fontSize: 10, fill: '#64748b' }}
                       tickFormatter={v => v.slice(5)} />
                <YAxis tick={{ fontSize: 10, fill: '#64748b' }} />
                <Tooltip content={<CustomTooltip />} />
                <ReferenceLine y={DAILY_LIMIT} stroke="#ef4444" strokeDasharray="4 3"
                               label={{ value: 'Limit', fill: '#ef4444', fontSize: 9 }} />
                <Area type="monotone" dataKey="co2" stroke="#16a34a" fill="url(#co2Grad)"
                      strokeWidth={2} dot={false} name="CO₂" />
              </AreaChart>
            </ResponsiveContainer>
          </div>

          {/* Source Breakdown */}
          {report.by_source?.length > 0 && (
            <div className="report-two-col">
              {/* Bar chart */}
              <div className="card">
                <h3>🏭 Source Breakdown</h3>
                <ResponsiveContainer width="100%" height={220}>
                  <BarChart data={report.by_source} layout="vertical"
                            margin={{ top: 4, right: 24, left: 0, bottom: 4 }}>
                    <XAxis type="number" tick={{ fontSize: 10, fill: '#64748b' }} />
                    <YAxis type="category" dataKey="label"
                           tick={{ fontSize: 10, fill: '#94a3b8' }} width={80} />
                    <Tooltip content={<CustomTooltip />} />
                    <Bar dataKey="co2" name="CO₂" radius={[0, 4, 4, 0]}>
                      {report.by_source.map((entry) => (
                        <Cell key={entry.type}
                              fill={SOURCE_COLORS[entry.type] || '#6b7280'} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>

              {/* Table */}
              <div className="card">
                <h3>📊 Detail Table</h3>
                <table className="report-table">
                  <thead>
                    <tr>
                      <th>Source</th>
                      <th className="right">CO₂ (kg)</th>
                      <th className="right">Share</th>
                    </tr>
                  </thead>
                  <tbody>
                    {report.by_source.map(s => (
                      <tr key={s.type}>
                        <td>
                          <span className="src-dot"
                                style={{ background: SOURCE_COLORS[s.type] || '#6b7280' }} />
                          {s.label}
                        </td>
                        <td className="right bold">{fmt(s.co2)}</td>
                        <td className="right">
                          <span className="pct-badge">{s.pct}%</span>
                        </td>
                      </tr>
                    ))}
                    <tr className="total-row">
                      <td><b>Total</b></td>
                      <td className="right bold">{fmt(report.total_co2)}</td>
                      <td className="right"><b>100%</b></td>
                    </tr>
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* AI Recommendation */}
          <div className={`card recommendation-card priority-${report.priority?.toLowerCase()}`}>
            <div className="rec-header">
              <span className="rec-icon">🤖</span>
              <h3>AI Recommendation</h3>
              <span className={`priority-badge priority-${report.priority?.toLowerCase()}`}>
                {report.priority} PRIORITY
              </span>
            </div>
            <p className="rec-text">{report.recommendation}</p>
          </div>

          {/* Download CTA */}
          <div className="card download-cta">
            <div>
              <h3>📄 Export This Report</h3>
              <p>Download a formal, print-ready PDF with all charts, tables, and compliance details.</p>
            </div>
            <button
              className="btn btn--download btn--lg"
              onClick={handleDownload}
              disabled={downloading}
            >
              {downloading ? '⏳ Generating…' : '⬇ Download PDF Report'}
            </button>
          </div>
        </>
      )}
    </div>
  );
};

export default Report;