import React, { useEffect, useState } from 'react';
import axios from 'axios';
import {
  LineChart, Line, XAxis, YAxis, Tooltip,
  ResponsiveContainer, Legend
} from 'recharts';
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

        // 🔹 Past Data
        const pastRes = await axios.get("http://localhost:5000/api/dashboard", {
          headers: { Authorization: `Bearer ${token}` }
        });

        const pastFormatted = pastRes.data.trend.map(item => ({
          date: item.date,
          past: item.co2
        }));

        // 🔹 Prediction
        const predRes = await axios.get(
          `http://localhost:5000/predict?days=${days}`,
          {
            headers: { Authorization: `Bearer ${token}` }
          }
        );

        const futureFormatted = predRes.data.prediction.map(item => ({
          date: item.ds,
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

        // 🔥 Merge all data
        const merged = [...pastFormatted, ...futureFormatted].map(item => ({
          ...item,
          anomaly: anomalyMap[item.date] || 1
        }));

        setData(merged);

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

  return (
    <div className="page">

      {loading && <div className="loader"></div>}

      <h1>📈 Analytics</h1>

      {/* 🔹 Days Selector */}
      <div style={{ marginBottom: "20px" }}>
        <label>Select Prediction Days: </label>
        <select value={days} onChange={(e) => setDays(Number(e.target.value))}>
          <option value={7}>7 Days</option>
          <option value={14}>14 Days</option>
          <option value={30}>30 Days</option>
        </select>
      </div>

      {/* 🔹 Model Info */}
      <div className="card">
        <h3>📊 Model Info</h3>

        {modelInfo ? (
          <>
            <p><strong>Last Trained:</strong> {modelInfo.trained_at}</p>
            <p><strong>Data Points:</strong> {modelInfo.data_points}</p>
            <p><strong>Accuracy (MAE):</strong> {modelInfo.mae}</p>
          </>
        ) : (
          <p>No model info available</p>
        )}
      </div>

      {/* 🔥 Trend Card */}
      <div className="card analytics-card">
        <h3>{days}-Day Emission Forecast</h3>
        <p className="analytics-value">
          {trend > 0 ? `+${trend}%` : `${trend}%`}
        </p>
        <p className="analytics-desc">
          Predicted emission trend over next {days} days.
        </p>
      </div>

      {/* 🔥 Peak Day */}
      <div className="card">
        <h3>🔥 Peak Emission Day</h3>
        {peakDay ? (
          <>
            <p>{peakDay.date}</p>
            <p>{peakDay.future.toFixed(2)} kg CO₂</p>
          </>
        ) : (
          <p>No data</p>
        )}
      </div>

      {/* 🤖 Recommendation */}
      <div className="card analytics-recommendations">
        <h3>🤖 AI Insight</h3>
        <p>{recommendation}</p>
      </div>

      {/* 🚨 Anomaly Summary */}
      <div className="card">
        <h3>🚨 Anomaly Detection</h3>
        <p>
          Total anomalies detected:{" "}
          {data.filter(d => d.anomaly === -1).length}
        </p>
      </div>

      {/* 📊 Graph */}
      <div className="card">
        <h3>Past vs Predicted Emissions</h3>

        <ResponsiveContainer width="100%" height={300}>
          <LineChart data={data}>
            <XAxis dataKey="date" />
            <YAxis />
            <Tooltip />
            <Legend />

            {/* Past */}
            <Line
              type="monotone"
              dataKey="past"
              stroke="#8884d8"
              name="Past"
              dot={(props) => {
                const { payload } = props;
                if (payload.anomaly === -1) {
                  return (
                    <circle
                      cx={props.cx}
                      cy={props.cy}
                      r={6}
                      fill="red"
                    />
                  );
                }
                return null;
              }}
            />

            {/* Future */}
            <Line
              type="monotone"
              dataKey="future"
              stroke="#82ca9d"
              name="Predicted"
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

    </div>
  );
};

export default Analytics;