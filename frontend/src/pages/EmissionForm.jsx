/**
 * EmissionForm.jsx — Multi-Source Daily Emission Entry
 * ======================================================
 * Allows a user to log CO₂ emissions from multiple energy sources for a
 * given date in a single submission.
 *
 * State:
 *   date    {string}  — selected date (YYYY-MM-DD)
 *   sources {array}   — list of { type, amount } objects; starts with one row
 *   result  {number|null} — total CO₂ returned after a successful submission
 *   loading {boolean} — disables the submit button while request is in-flight
 *   errors  {object}  — per-field validation messages keyed by row index
 *
 * Flow:
 *   1. User picks a date and fills emission source rows
 *   2. "Add Source" appends a new blank row
 *   3. "Remove" on any row deletes that row (minimum 1 row enforced)
 *   4. Submit → validates locally → POST /api/emissions → shows total CO₂
 *   5. On success the form resets to its initial state
 *
 * API: uses the shared Axios instance (../api/api) which auto-attaches JWT.
 */

import React, { useState } from "react";
import API from "../api/api";
import "../assets/css/EmissionForm.css";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const SOURCE_OPTIONS = [
  { value: "diesel",      label: "Diesel (per litre)",  unit: "L"   },
  { value: "petrol",      label: "Petrol (per litre)",  unit: "L"   },
  { value: "natural_gas", label: "Natural Gas (per m³)", unit: "m³" },
  { value: "electricity", label: "Electricity (per kWh)", unit: "kWh" },
];

/* Emission factors mirror the backend — displayed as an info guide */
const FACTORS = {
  diesel:      2.68,
  petrol:      2.31,
  natural_gas: 2.75,
  electricity: 0.82,
};

/* A blank source row — used for initialisation and "Add Source" */
const blankSource = () => ({ type: "diesel", amount: "" });

/* ── Component ──────────────────────────────────────────────────────────────── */

const EmissionForm = () => {
  const today = new Date().toISOString().split("T")[0]; // default date = today

  const [date,    setDate]    = useState(today);
  const [sources, setSources] = useState([blankSource()]);
  const [result,  setResult]  = useState(null);   // total CO₂ from API
  const [loading, setLoading] = useState(false);
  const [errors,  setErrors]  = useState({});      // { rowIndex: "message" }

  /* ── Source row helpers ──────────────────────────────────────────────────── */

  /** Update a single field in a specific source row */
  const updateSource = (index, field, value) => {
    setSources((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], [field]: value };
      return next;
    });
    // Clear the per-row error when the user makes a change
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  /** Append a new blank source row */
  const addSource = () => setSources((prev) => [...prev, blankSource()]);

  /** Remove a specific row (at least 1 row must remain) */
  const removeSource = (index) => {
    if (sources.length === 1) return; // guard: never remove the last row
    setSources((prev) => prev.filter((_, i) => i !== index));
    setErrors((prev) => {
      const next = { ...prev };
      delete next[index];
      return next;
    });
  };

  /* ── Validation ──────────────────────────────────────────────────────────── */

  /** Returns true if all rows are valid; populates errors state on failure */
  const validate = () => {
    if (!date) {
      alert("Please select a date.");
      return false;
    }

    const newErrors = {};
    sources.forEach((src, i) => {
      const amt = parseFloat(src.amount);
      if (!src.amount || isNaN(amt) || amt <= 0) {
        newErrors[i] = "Enter a positive amount.";
      }
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  /* ── Live preview ────────────────────────────────────────────────────────── */

  /** Compute the estimated total CO₂ from current form state (client-side) */
  const previewTotal = sources.reduce((sum, src) => {
    const amt = parseFloat(src.amount) || 0;
    return sum + amt * (FACTORS[src.type] || 0);
  }, 0);

  /* ── Submission ──────────────────────────────────────────────────────────── */

  const handleSubmit = async () => {
    if (!validate()) return;

    setLoading(true);
    setResult(null);

    try {
      const res = await API.post("/api/emissions", {
        date,
        sources: sources.map((s) => ({
          type:   s.type,
          amount: parseFloat(s.amount),
        })),
      });

      setResult(res.data.total_co2);

      // Reset form after success
      setDate(today);
      setSources([blankSource()]);
      setErrors({});

    } catch (err) {
      const msg =
        err.response?.data?.error || "Failed to save. Please try again.";
      alert(msg);
    } finally {
      setLoading(false);
    }
  };

  /* ── Render ──────────────────────────────────────────────────────────────── */

  return (
    <div className="page">

      {/* ── Page Header ── */}
      <h1>
        <span className="page-icon">🏭</span>
        Daily Emission Entry
      </h1>
      <p className="page-subtitle">
        Log emissions from multiple sources for a single day.
      </p>

      <div className="card emission-card">

        {/* ── Date Picker ── */}
        <div className="emission-date-row">
          <label className="emission-label" htmlFor="emission-date">
            📅 Reporting Date
          </label>
          <input
            id="emission-date"
            type="date"
            className="emission-date-input"
            value={date}
            max={today}
            onChange={(e) => setDate(e.target.value)}
          />
        </div>

        {/* ── Source Rows ── */}
        <div className="emission-sources-header">
          <span className="emission-label">Emission Sources</span>
          <span className="emission-factor-hint">
            Factor (kg CO₂/unit): Diesel 2.68 · Petrol 2.31 · Gas 2.75 · Elec 0.82
          </span>
        </div>

        <div className="emission-rows">
          {sources.map((src, index) => {
            const meta = SOURCE_OPTIONS.find((o) => o.value === src.type);
            const preview =
              src.amount && parseFloat(src.amount) > 0
                ? (parseFloat(src.amount) * FACTORS[src.type]).toFixed(2)
                : null;

            return (
              <div key={index} className={`emission-row ${errors[index] ? "emission-row--error" : ""}`}>

                {/* Row number badge */}
                <span className="row-badge">{index + 1}</span>

                {/* Source type dropdown */}
                <div className="emission-field emission-field--type">
                  <label className="sr-only">Source Type</label>
                  <select
                    className="emission-select"
                    value={src.type}
                    onChange={(e) => updateSource(index, "type", e.target.value)}
                    aria-label={`Source type for row ${index + 1}`}
                  >
                    {SOURCE_OPTIONS.map((opt) => (
                      <option key={opt.value} value={opt.value}>
                        {opt.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Amount input */}
                <div className="emission-field emission-field--amount">
                  <label className="sr-only">Amount</label>
                  <div className="emission-input-wrapper">
                    <input
                      type="number"
                      className={`emission-input ${errors[index] ? "emission-input--error" : ""}`}
                      placeholder={`Amount in ${meta?.unit}`}
                      value={src.amount}
                      min="0"
                      step="any"
                      onChange={(e) => updateSource(index, "amount", e.target.value)}
                      aria-label={`Amount for row ${index + 1}`}
                    />
                    <span className="emission-unit">{meta?.unit}</span>
                  </div>
                  {errors[index] && (
                    <span className="emission-row-error">{errors[index]}</span>
                  )}
                </div>

                {/* Live CO₂ preview for this row */}
                <div className="emission-field emission-field--preview">
                  {preview ? (
                    <span className="row-preview">{preview} kg CO₂</span>
                  ) : (
                    <span className="row-preview row-preview--empty">— kg CO₂</span>
                  )}
                </div>

                {/* Remove row button */}
                <button
                  className="emission-remove-btn"
                  onClick={() => removeSource(index)}
                  disabled={sources.length === 1}
                  title="Remove this source"
                  aria-label={`Remove source row ${index + 1}`}
                >
                  ✕
                </button>

              </div>
            );
          })}
        </div>

        {/* ── Add Source Button ── */}
        <button className="emission-add-btn" onClick={addSource}>
          + Add Source
        </button>

        {/* ── Live Preview Total ── */}
        {previewTotal > 0 && (
          <div className="emission-preview-total">
            <span>Estimated Total</span>
            <span className="preview-total-value">
              {previewTotal.toFixed(2)} kg CO₂
            </span>
          </div>
        )}

        {/* ── Submit ── */}
        <button
          className="btn emission-submit-btn"
          onClick={handleSubmit}
          disabled={loading}
        >
          {loading ? (
            <>
              <span className="spinner" /> Saving…
            </>
          ) : (
            "💾 Save Entry"
          )}
        </button>

      </div>

      {/* ── Success Result Card ── */}
      {result !== null && (
        <div className="card result-card">
          <div className="result-icon">✅</div>
          <div className="result-content">
            <h3>Entry Saved Successfully</h3>
            <p>
              Total CO₂ recorded for {date}:
            </p>
            <div className="result-value">
              {result.toFixed(2)}
              <span className="result-unit"> kg CO₂</span>
            </div>
          </div>
        </div>
      )}

    </div>
  );
};

export default EmissionForm;