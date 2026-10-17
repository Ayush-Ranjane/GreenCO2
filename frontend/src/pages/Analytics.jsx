import React, { useEffect, useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import API from '../api/api';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import {
  TrendingUp, TrendingDown, Calendar, AlertTriangle,
  Cpu, Zap, RefreshCw, PlusCircle, Info
} from 'lucide-react';
import '../assets/css/Analytics.css';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [trend, setTrend] = useState(0);
  const [days, setDays] = useState(7);
  const [peakDay, setPeakDay] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [isRetraining, setIsRetraining] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);
  const [feedbackMsg, setFeedbackMsg] = useState("");

  const fetchAllData = useCallback(async () => {
    try {
      setLoading(true);

      // Fetch model info, forecast, and anomalies in parallel
      const [infoRes, predRes, anomalyRes] = await Promise.allSettled([
        API.get("/model-info"),
        API.get(`/predict?days=${days}`),
        API.get("/anomaly"),
      ]);

      // 🔹 Model Info
      if (infoRes.status === "fulfilled" && infoRes.value?.data) {
        setModelInfo(infoRes.value.data);
      } else {
        setModelInfo(null);
      }

      // 🔹 Prediction Data
      let futureFormatted = [];
      if (predRes.status === "fulfilled" && predRes.value?.data?.prediction) {
        futureFormatted = predRes.value.data.prediction.map(item => ({
          date: String(item.ds || "").slice(0, 10),
          future: Number(item.yhat || 0),
        }));
      }

      // 🔹 Anomaly Detection Data
      const anomalyMap = {};
      if (anomalyRes.status === "fulfilled" && anomalyRes.value?.data?.anomalies) {
        anomalyRes.value.data.anomalies.forEach(item => {
          if (item?.ds) {
            anomalyMap[String(item.ds).slice(0, 10)] = item.anomaly;
          }
        });
      }

      setData(futureFormatted.map(item => ({
        ...item,
        anomaly: anomalyMap[item.date],
      })));

      // 🔥 Trend Calculation
      if (futureFormatted.length >= 2) {
        const first = futureFormatted[0].future;
        const last = futureFormatted[futureFormatted.length - 1].future;
        const percent = first > 0 ? (((last - first) / first) * 100) : 0;

        setTrend(percent.toFixed(2));

        if (percent > 10) {
          setRecommendation("⚠️ Emissions rising fast. Consider reducing high-consumption fuel usage.");
        } else if (percent > 0) {
          setRecommendation("📈 Slight increase detected. Monitor ongoing equipment & electricity usage.");
        } else {
          setRecommendation("✅ Emissions decreasing. Operations are within sustainable efficiency targets.");
        }
      } else {
        setTrend(0);
        setRecommendation("");
      }

      // 🔥 Peak Day
      if (futureFormatted.length > 0) {
        const max = futureFormatted.reduce((prev, curr) =>
          curr.future > prev.future ? curr : prev
        );
        setPeakDay(max);
      } else {
        setPeakDay(null);
      }

    } catch (err) {
      console.error("Analytics fetch error:", err);
    } finally {
      setLoading(false);
    }
  }, [days]);

  useEffect(() => {
    fetchAllData();
  }, [fetchAllData]);

  const handleRetrain = async () => {
    try {
      setIsRetraining(true);
      setFeedbackMsg("");
      const res = await API.post("/retrain");
      if (res.data?.meta) {
        setModelInfo(res.data.meta);
      }
      setFeedbackMsg("Model retrained successfully ✅");
      await fetchAllData();
      setTimeout(() => setFeedbackMsg(""), 4000);
    } catch (err) {
      console.error("Retrain error:", err);
      setFeedbackMsg("Failed to retrain model. Please ensure emission records are logged.");
      setTimeout(() => setFeedbackMsg(""), 4000);
    } finally {
      setIsRetraining(false);
    }
  };

  const anomalyCount = data.filter(d => d.anomaly === -1).length;

  const CustomTooltip = ({ active, payload, label }) => {
    if (!active || !payload?.length) return null;
    return (
      <div className="analytics-tooltip">
        <p className="analytics-tooltip__date">{label}</p>
        {payload.map((entry, i) =>
          entry.value != null ? (
            <div key={i} className="analytics-tooltip__row">
              <span className="analytics-tooltip__swatch" style={{ background: entry.color }} />
              <span className="analytics-tooltip__name">{entry.name}</span>
              <span className="analytics-tooltip__val">{Number(entry.value).toFixed(1)} kg</span>
            </div>
          ) : null
        )}
      </div>
    );
  };

  if (loading && !isRetraining) {
    return (
      <div className="page">
        <div className="analytics-progress-bar" />
        <div className="page-header analytics-header" style={{ marginBottom: 'var(--space-xl)' }}>
          <div>
            <div className="skeleton" style={{ width: '160px', height: '34px', marginBottom: '8px', borderRadius: 'var(--radius-md)' }} />
            <div className="skeleton" style={{ width: '300px', height: '18px', borderRadius: 'var(--radius-sm)' }} />
          </div>
          <div className="skeleton" style={{ width: '120px', height: '36px', borderRadius: 'var(--radius-md)' }} />
        </div>
        <div className="cards">
          {[1, 2, 3].map(i => <div key={i} className="card skeleton" style={{ height: '110px' }} />)}
        </div>
        <div className="card skeleton" style={{ height: '68px', marginBottom: 'var(--space-md)' }} />
        <div className="card skeleton" style={{ height: '68px', marginBottom: 'var(--space-md)' }} />
        <div className="card skeleton" style={{ height: '340px' }} />
      </div>
    );
  }

  const trendIcon = trend > 10
    ? <TrendingUp size={18} />
    : trend > 0
      ? <TrendingUp size={18} />
      : <TrendingDown size={18} />;

  const trendColor = trend > 10 ? 'var(--color-danger)' : trend > 0 ? 'var(--color-warning)' : 'var(--color-success)';
  const trendBg    = trend > 10 ? 'rgba(220,38,38,0.1)'  : trend > 0 ? 'rgba(217,119,6,0.1)'   : 'rgba(22,163,74,0.1)';

  const isModelTrained = modelInfo?.status === "trained" || (modelInfo?.trained_at && modelInfo?.status !== "insufficient_data");
  const isInsufficient = modelInfo?.status === "insufficient_data";

  const badgeClass = isModelTrained
    ? "analytics-model-badge--active"
    : isInsufficient
      ? "analytics-model-badge--warn"
      : "analytics-model-badge--inactive";

  const badgeText = isModelTrained
    ? "Active"
    : isInsufficient
      ? "Collecting Data"
      : "Untrained";

  return (
    <div className="page">

      {/* ── Header ── */}
      <div className="page-header analytics-header">
        <div>
          <h1 className="page-title">Analytics</h1>
          <p className="page-subtitle">Emission forecasts, anomalies &amp; AI insights</p>
        </div>
        <div className="analytics-days-wrap">
          <label className="analytics-days-label">Forecast window</label>
          <select className="analytics-select" value={days} onChange={(e) => setDays(Number(e.target.value))}>
            <option value={7}>7 Days</option>
            <option value={14}>14 Days</option>
            <option value={30}>30 Days</option>
          </select>
        </div>
      </div>

      {/* ── KPI Cards ── */}
      <div className="cards">
        <div className="card card--metric analytics-kpi-card">
          <div className="analytics-kpi-icon" style={{ background: trendBg, color: trendColor }}>
            {trendIcon}
          </div>
          <h3>{days}-Day Trend</h3>
          <p style={{ color: trendColor }}>{trend > 0 ? `+${trend}%` : `${trend}%`}</p>
          <div className={`card-trend ${trend > 10 ? 'card-trend--up' : trend > 0 ? 'card-trend--neutral' : 'card-trend--down'}`}>
            {trend > 10 ? 'Rising fast' : trend > 0 ? 'Slight increase' : 'Decreasing'}
          </div>
        </div>

        <div className="card card--metric analytics-kpi-card">
          <div className="analytics-kpi-icon" style={{ background: 'rgba(37,99,235,0.1)', color: 'var(--color-info)' }}>
            <Calendar size={18} />
          </div>
          <h3>Peak Forecast Day</h3>
          {peakDay ? (
            <>
              <p>{peakDay.future.toFixed(1)}<span className="unit"> kg</span></p>
              <div className="card-trend card-trend--neutral">{peakDay.date}</div>
            </>
          ) : <p className="analytics-no-data">—</p>}
        </div>

        <div className="card card--metric analytics-kpi-card">
          <div className="analytics-kpi-icon" style={{ background: anomalyCount > 0 ? 'rgba(220,38,38,0.1)' : 'rgba(22,163,74,0.1)', color: anomalyCount > 0 ? 'var(--color-danger)' : 'var(--color-success)' }}>
            <AlertTriangle size={18} />
          </div>
          <h3>Anomalies Detected</h3>
          <p className={anomalyCount > 0 ? 'status-warn' : 'status-ok'}>{anomalyCount}</p>
          <div className={`card-trend ${anomalyCount > 0 ? 'card-trend--up' : 'card-trend--down'}`}>
            {anomalyCount > 0 ? 'Unusual readings found' : 'No anomalies'}
          </div>
        </div>
      </div>

      {/* ── Model Info Strip ── */}
      <div className="card analytics-model-card section-gap">
        <div className="card-title-row">
          <div className="analytics-card-heading">
            <Cpu size={16} strokeWidth={1.75} />
            <h3>ML Model</h3>
          </div>
          <div className="analytics-model-header-right">
            <button
              className="analytics-retrain-btn"
              onClick={handleRetrain}
              disabled={isRetraining}
              title="Retrain prediction model with latest emission records"
            >
              <RefreshCw size={12} className={isRetraining ? "analytics-spin" : ""} />
              {isRetraining ? "Retraining…" : "Retrain Model"}
            </button>
            <span className={`analytics-model-badge ${badgeClass}`}>
              {badgeText}
            </span>
          </div>
        </div>

        {feedbackMsg && (
          <p style={{ fontSize: 'var(--text-xs)', color: feedbackMsg.includes('failed') ? 'var(--color-danger)' : 'var(--color-success)', margin: 'var(--space-sm) 0 0' }}>
            {feedbackMsg}
          </p>
        )}

        {isModelTrained ? (
          <div className="analytics-stat-strip">
            <div className="analytics-stat">
              <span className="analytics-stat__label">Last Trained</span>
              <span className="analytics-stat__val">{modelInfo.trained_at || "Just now"}</span>
            </div>
            <div className="analytics-stat-divider" />
            <div className="analytics-stat">
              <span className="analytics-stat__label">Data Points</span>
              <span className="analytics-stat__val">{modelInfo.data_points ?? "—"}</span>
            </div>
            <div className="analytics-stat-divider" />
            <div className="analytics-stat">
              <span className="analytics-stat__label">Accuracy (MAE)</span>
              <span className="analytics-stat__val">{modelInfo.mae != null ? `${modelInfo.mae} kg` : "—"}</span>
            </div>
          </div>
        ) : isInsufficient ? (
          <div className="analytics-guidance-box">
            <div className="analytics-guidance-left">
              <Info size={18} />
              <span>
                {modelInfo.message || `Recorded ${modelInfo.data_points || 0} day(s) of data. At least 3 daily emission logs are needed to generate forecasts.`}
              </span>
            </div>
            <Link to="/emission-form" className="analytics-guidance-btn">
              <PlusCircle size={14} /> Log Daily Emissions
            </Link>
          </div>
        ) : (
          <div className="analytics-guidance-box">
            <div className="analytics-guidance-left">
              <Info size={18} />
              <span>No model trained yet for your company. Click Retrain Model or log your first emissions.</span>
            </div>
            <Link to="/emission-form" className="analytics-guidance-btn">
              <PlusCircle size={14} /> Log Emissions
            </Link>
          </div>
        )}
      </div>

      {/* ── AI Insight ── */}
      {recommendation && (
        <div className="card analytics-insight section-gap">
          <div className="analytics-insight__header">
            <div className="analytics-insight__icon"><Zap size={15} /></div>
            <span>AI Insight</span>
          </div>
          <p className="analytics-insight__text">{recommendation}</p>
        </div>
      )}

      {/* ── Premium Area Chart ── */}
      <div className="card analytics-chart-card">
        <div className="analytics-chart-header">
          <div>
            <div className="analytics-card-heading">
              <h3 style={{ fontSize: 'var(--text-base)', fontWeight: 600, color: 'var(--text-primary)', textTransform: 'none', letterSpacing: 0, margin: 0 }}>
                Emission Forecast
              </h3>
            </div>
            <p className="analytics-chart-sub">{days}-day ML predicted CO₂ emissions</p>
          </div>
          <div className="analytics-chart-legend">
            <span className="analytics-legend-item">
              <span className="analytics-legend-swatch analytics-legend-swatch--future" />
              Predicted Forecast
            </span>
            {anomalyCount > 0 && (
              <span className="analytics-legend-item">
                <span className="analytics-legend-swatch analytics-legend-swatch--anomaly" />
                Anomaly
              </span>
            )}
          </div>
        </div>

        {data.length > 0 ? (
          <ResponsiveContainer width="100%" height={340}>
            <AreaChart data={data} margin={{ top: 10, right: 8, left: 0, bottom: 0 }}>
              <defs>
                <linearGradient id="gradForecast" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#16a34a" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#16a34a" stopOpacity={0} />
                </linearGradient>
              </defs>

              <CartesianGrid strokeDasharray="3 3" stroke="var(--surface-3)" vertical={false} />

              <XAxis
                dataKey="date"
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => v ? v.slice(5) : v}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'var(--text-muted)', fontFamily: 'var(--font-sans)' }}
                axisLine={false} tickLine={false}
                tickFormatter={v => `${v}`}
                width={48}
              />

              <Tooltip content={<CustomTooltip />} cursor={{ stroke: 'var(--surface-3)', strokeWidth: 1 }} />

              <Area
                type="monotone" dataKey="future" name="Forecast"
                stroke="#16a34a" strokeWidth={2.5}
                fill="url(#gradForecast)"
                dot={(props) => {
                  const { payload, cx, cy } = props;
                  if (payload.anomaly === -1)
                    return <circle key={cx} cx={cx} cy={cy} r={5} fill="var(--color-danger)" stroke="#fff" strokeWidth={1.5} />;
                  return null;
                }}
                activeDot={{ r: 5, fill: '#16a34a', stroke: 'var(--surface-1)', strokeWidth: 2 }}
                connectNulls
              />
            </AreaChart>
          </ResponsiveContainer>
        ) : (
          <div className="analytics-empty-chart">
            <Cpu size={36} strokeWidth={1.5} />
            <h4 style={{ margin: 0, color: 'var(--text-primary)' }}>No Forecast Available Yet</h4>
            <p>
              AI emission forecasting requires at least 3 distinct days of emission logs.
              Once daily records are entered, Prophet and Isolation Forest models will predict future trends and identify anomalies.
            </p>
            <Link to="/emission-form" className="analytics-guidance-btn">
              <PlusCircle size={14} /> Log Daily Emissions
            </Link>
          </div>
        )}
      </div>

    </div>
  );
};

export default Analytics;