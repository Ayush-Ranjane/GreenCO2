import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer
} from 'recharts';
import { TrendingUp, TrendingDown, Calendar, AlertTriangle, Cpu, Zap } from 'lucide-react';
import '../assets/css/Analytics.css';

const Analytics = () => {
  const [data, setData] = useState([]);
  const [trend, setTrend] = useState(0);
  const [days, setDays] = useState(7);
  const [peakDay, setPeakDay] = useState(null);
  const [recommendation, setRecommendation] = useState("");
  const [loading, setLoading] = useState(false);
  const [modelInfo, setModelInfo] = useState(null);

  useEffect(() => {

    const fetchAllData = async () => {
      try {
        setLoading(true);

        const token = localStorage.getItem("token");

        // 🔹 Model Info
        const infoRes = await axios.get("http://localhost:5000/model-info", {
          headers: { Authorization: `Bearer ${token}` }
        });
        setModelInfo(infoRes.data);




        // 🔹 Prediction
        const predRes = await axios.get(
          `http://localhost:5000/predict?days=${days}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const futureFormatted = predRes.data.prediction.map(item => ({
          date: item.ds.slice(0, 10),
          future: item.yhat
        }));

        // 🔹 Anomaly Detection
        const anomalyRes = await axios.get(
          "http://localhost:5000/anomaly",
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        // Create anomaly map → date => anomaly
        const anomalyMap = {};
        anomalyRes.data.anomalies.forEach(item => {
          anomalyMap[item.ds] = item.anomaly;
        });

        setData(futureFormatted);

        // 🔥 Trend Calculation
        if (futureFormatted.length >= 2) {
          const first = futureFormatted[0].future;
          const last = futureFormatted[futureFormatted.length - 1].future;
          const percent = ((last - first) / first) * 100;

          setTrend(percent.toFixed(2));

          if (percent > 10) {
            setRecommendation("⚠️ Emissions rising fast. Reduce diesel usage immediately.");
          } else if (percent > 0) {
            setRecommendation("📈 Slight increase detected. Monitor operations.");
          } else {
            setRecommendation("✅ Emissions decreasing. Good performance.");
          }
        }

        // 🔥 Peak Day
        if (futureFormatted.length > 0) {
          const max = futureFormatted.reduce((prev, curr) =>
            curr.future > prev.future ? curr : prev
          );
          setPeakDay(max);
        }

      } catch (err) {
        console.error("Analytics error:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchAllData();

  }, [days]);

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

  if (loading) {
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

  const trendColor     = trend > 10 ? 'var(--color-danger)' : trend > 0 ? 'var(--color-warning)' : 'var(--color-success)';
  const trendBg        = trend > 10 ? 'rgba(220,38,38,0.1)'  : trend > 0 ? 'rgba(217,119,6,0.1)'   : 'rgba(22,163,74,0.1)';

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
          <span className="analytics-model-badge">Active</span>
        </div>
        {modelInfo ? (
          <div className="analytics-stat-strip">
            <div className="analytics-stat">
              <span className="analytics-stat__label">Last Trained</span>
              <span className="analytics-stat__val">{modelInfo.trained_at}</span>
            </div>
            <div className="analytics-stat-divider" />
            <div className="analytics-stat">
              <span className="analytics-stat__label">Data Points</span>
              <span className="analytics-stat__val">{modelInfo.data_points}</span>
            </div>
            <div className="analytics-stat-divider" />
            <div className="analytics-stat">
              <span className="analytics-stat__label">Accuracy (MAE)</span>
              <span className="analytics-stat__val">{modelInfo.mae}</span>
            </div>
          </div>
        ) : <p className="analytics-no-data" style={{ fontSize: 'var(--text-sm)', margin: 0 }}>No model info available</p>}
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
      </div>

    </div>
  );
};

export default Analytics;