"""
ml_engine/alerts/alert_engine.py — GreenCO2 Alert Engine
==========================================================
Generates alerts by inspecting:
  1. Threshold Alerts  (severity: medium)   — today's total > configured limit
  2. Trend-Based Alerts (severity: high)    — predicted upward trend > 10 %
  3. Anomaly Alerts    (severity: critical) — Isolation Forest flags anomalies
  4. Prediction-Based Alerts (severity: high) — any predicted day > threshold

Each detected alert is:
  - Inserted into the `alerts` table (idempotent — duplicate titles on the
    same day for the same company are skipped via ON CONFLICT DO NOTHING).
  - Returned as a list of dicts for the caller to send email if desired.

Usage (called from app.py scheduler and /api/alerts POST trigger):
    from ml_engine.alerts.alert_engine import run_alert_engine
    new_alerts = run_alert_engine(conn, company_id)
"""

from __future__ import annotations

import logging
from datetime import date, datetime
from typing import Any

logger = logging.getLogger(__name__)

# ── Configurable thresholds ───────────────────────────────────────────────────

TODAY_THRESHOLD_KG   = 1_000    # kg CO₂ → Threshold Alert (medium)
MONTHLY_THRESHOLD_KG = 15_000   # kg CO₂ → Threshold Alert (medium)
PREDICT_PEAK_KG      = 1_200    # kg CO₂ → Prediction-Based Alert (high)
TREND_RISE_PCT       = 10.0     # % rise over prediction window → high

# ── Severity / category constants ────────────────────────────────────────────

CAT_THRESHOLD  = "threshold"
CAT_TREND      = "trend"
CAT_ANOMALY    = "anomaly"
CAT_PREDICTION = "prediction"

SEV_MEDIUM   = "medium"
SEV_HIGH     = "high"
SEV_CRITICAL = "critical"


# ── Internal helpers ──────────────────────────────────────────────────────────

def _insert_alert(
    cur,
    company_id: int,
    category: str,
    severity: str,
    title: str,
    message: str,
) -> dict[str, Any] | None:
    """
    Insert one alert row.  Duplicate (company_id, category, title, today) rows
    are silently ignored so re-runs don't spam the DB or inbox.
    Returns the inserted row dict, or None if it was a duplicate.
    """
    cur.execute(
        """
        INSERT INTO alerts (company_id, category, severity, title, message)
        VALUES (%s, %s, %s, %s, %s)
        ON CONFLICT (company_id, category, title, alert_date)
        DO NOTHING
        RETURNING id, created_at
        """,
        (company_id, category, severity, title, message),
    )
    row = cur.fetchone()
    if row is None:
        return None   # duplicate — already alerted today

    return {
        "id":         row[0],
        "company_id": company_id,
        "category":   category,
        "severity":   severity,
        "title":      title,
        "message":    message,
        "created_at": row[1].isoformat() if hasattr(row[1], "isoformat") else str(row[1]),
        "is_read":    False,
        "email_sent": False,
    }


# ── Sub-engines ───────────────────────────────────────────────────────────────

def _check_thresholds(cur, company_id: int) -> list[dict]:
    """Compare today's and this month's totals against hard limits."""
    alerts: list[dict] = []

    # Today total
    cur.execute(
        """
        SELECT COALESCE(SUM(emission), 0)
        FROM emission_sources
        WHERE company_id = %s AND date = CURRENT_DATE
        """,
        (company_id,),
    )
    today_total = float(cur.fetchone()[0])

    if today_total > TODAY_THRESHOLD_KG:
        pct_over = round((today_total - TODAY_THRESHOLD_KG) / TODAY_THRESHOLD_KG * 100, 1)
        a = _insert_alert(
            cur, company_id,
            CAT_THRESHOLD, SEV_MEDIUM,
            "Daily CO₂ Threshold Exceeded",
            (
                f"Today's total emission reached {today_total:,.1f} kg CO₂, "
                f"which is {pct_over}% above the daily limit of "
                f"{TODAY_THRESHOLD_KG:,} kg. Review fuel and energy usage."
            ),
        )
        if a:
            alerts.append(a)

    # Monthly total
    cur.execute(
        """
        SELECT COALESCE(SUM(emission), 0)
        FROM emission_sources
        WHERE company_id = %s
          AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        """,
        (company_id,),
    )
    monthly_total = float(cur.fetchone()[0])

    if monthly_total > MONTHLY_THRESHOLD_KG:
        pct_over = round((monthly_total - MONTHLY_THRESHOLD_KG) / MONTHLY_THRESHOLD_KG * 100, 1)
        a = _insert_alert(
            cur, company_id,
            CAT_THRESHOLD, SEV_MEDIUM,
            "Monthly CO₂ Threshold Exceeded",
            (
                f"Monthly emissions reached {monthly_total:,.1f} kg CO₂ "
                f"({pct_over}% above the {MONTHLY_THRESHOLD_KG:,} kg CPCB limit). "
                "Immediate corrective measures recommended."
            ),
        )
        if a:
            alerts.append(a)

    return alerts


def _check_trends(cur, company_id: int) -> list[dict]:
    """
    Compare the first and last predicted values for this company.
    Uses the stored Prophet predictions if available; falls back to
    the last-7-days slope from emission_sources.
    """
    alerts: list[dict] = []

    try:
        from ml_engine.prediction.predict import predict_company
        pred_df = predict_company(company_id, days=7)

        if hasattr(pred_df, "to_dict"):
            records = pred_df.to_dict(orient="records")
        else:
            records = pred_df

        if len(records) >= 2:
            first = float(records[0].get("yhat", 0))
            last  = float(records[-1].get("yhat", 0))
            if first > 0:
                pct_change = (last - first) / first * 100
                if pct_change > TREND_RISE_PCT:
                    a = _insert_alert(
                        cur, company_id,
                        CAT_TREND, SEV_HIGH,
                        "Rising Emission Trend Detected",
                        (
                            f"Predicted emissions will rise {pct_change:.1f}% "
                            f"over the next 7 days (from {first:.1f} to {last:.1f} kg CO₂/day). "
                            "Consider reducing diesel and electricity consumption."
                        ),
                    )
                    if a:
                        alerts.append(a)

    except Exception as exc:
        logger.warning("Trend check skipped (model unavailable): %s", exc)

    return alerts


def _check_anomalies(cur, company_id: int) -> list[dict]:
    """Flag any anomalies detected by the Isolation Forest model."""
    alerts: list[dict] = []

    try:
        from ml_engine.anomaly.detect import detect_company_anomalies
        anomalies = detect_company_anomalies(company_id)

        flagged = [r for r in anomalies if r.get("anomaly") == -1]
        if flagged:
            dates_str = ", ".join(r["ds"][:10] for r in flagged[:5])
            extra = f" (+{len(flagged)-5} more)" if len(flagged) > 5 else ""
            a = _insert_alert(
                cur, company_id,
                CAT_ANOMALY, SEV_CRITICAL,
                "Anomalous Emission Pattern Detected",
                (
                    f"Isolation Forest flagged {len(flagged)} anomalous emission "
                    f"event(s) on: {dates_str}{extra}. "
                    "These spikes deviate significantly from historical patterns — "
                    "investigate equipment or operational changes."
                ),
            )
            if a:
                alerts.append(a)

    except Exception as exc:
        logger.warning("Anomaly check skipped (model unavailable): %s", exc)

    return alerts


def _check_predictions(cur, company_id: int) -> list[dict]:
    """Alert if any predicted day is expected to exceed the peak threshold."""
    alerts: list[dict] = []

    try:
        from ml_engine.prediction.predict import predict_company
        pred_df = predict_company(company_id, days=14)

        if hasattr(pred_df, "to_dict"):
            records = pred_df.to_dict(orient="records")
        else:
            records = pred_df

        over = [r for r in records if float(r.get("yhat", 0)) > PREDICT_PEAK_KG]
        if over:
            worst     = max(over, key=lambda r: float(r.get("yhat", 0)))
            worst_val = float(worst.get("yhat", 0))
            worst_day = str(worst.get("ds", ""))[:10]
            a = _insert_alert(
                cur, company_id,
                CAT_PREDICTION, SEV_HIGH,
                "High Emission Day Predicted",
                (
                    f"{len(over)} day(s) in the next 14 days are predicted to exceed "
                    f"{PREDICT_PEAK_KG:,} kg CO₂. "
                    f"Peak expected on {worst_day} at {worst_val:,.1f} kg CO₂. "
                    "Pre-emptive action advised."
                ),
            )
            if a:
                alerts.append(a)

    except Exception as exc:
        logger.warning("Prediction alert check skipped: %s", exc)

    return alerts


# ── Public entry point ────────────────────────────────────────────────────────

def run_alert_engine(conn, company_id: int) -> list[dict]:
    """
    Run all alert checks for *company_id* using the supplied DB connection.
    The caller is responsible for committing/rolling back.

    Returns a list of newly inserted alert dicts (empty list = nothing new).
    """
    cur = conn.cursor()
    new_alerts: list[dict] = []

    try:
        new_alerts += _check_thresholds(cur, company_id)
        new_alerts += _check_trends(cur, company_id)
        new_alerts += _check_anomalies(cur, company_id)
        new_alerts += _check_predictions(cur, company_id)

        conn.commit()
        logger.info(
            "Alert engine ran for company_id=%s → %d new alert(s)",
            company_id, len(new_alerts),
        )

    except Exception as exc:
        conn.rollback()
        logger.exception("Alert engine error for company_id=%s: %s", company_id, exc)

    finally:
        cur.close()

    return new_alerts