"""
app/routes/dashboard_routes.py — Dashboard Data Endpoint
=========================================================
Routes:
    GET /api/dashboard — aggregated emission metrics for the user's company

Returns:
    today_total, monthly_total, 7-day trend, source breakdown, alert status

All Decimal values from psycopg2 are explicitly cast to float before
jsonify() to avoid JSON TypeError on serialization.
"""

import logging

from flask import Blueprint, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db

logger = logging.getLogger(__name__)
dashboard_bp = Blueprint("dashboard", __name__)


@dashboard_bp.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """
    GET /api/dashboard
    Header: Authorization: Bearer <token>

    Returns aggregated emission data for the authenticated user's company:
      - today_total   — sum of emissions for today (float, kg CO₂)
      - monthly_total — sum for the current calendar month
      - trend         — last 7 days: [{ date, co2 }, ...]
      - by_source     — all-time totals by source_type: [{ type, co2 }, ...]
      - alert         — "High emission" if today_total > 1000 else "Normal"
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        # Resolve the company for this user
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        logger.info("Dashboard request: user=%s company_id=%s", user_email, company_id)

        # ── Today total ───────────────────────────────────────────────────────
        cur.execute("""
            SELECT COALESCE(SUM(emission), 0)
            FROM emission_sources
            WHERE company_id = %s AND date = CURRENT_DATE
        """, (company_id,))
        today_total = float(cur.fetchone()[0])

        # ── Monthly total (current calendar month) ────────────────────────────
        cur.execute("""
            SELECT COALESCE(SUM(emission), 0)
            FROM emission_sources
            WHERE company_id = %s
            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        """, (company_id,))
        monthly_total = float(cur.fetchone()[0])

        # ── 7-day trend — one row per day, zero-fill handled client-side ──────
        cur.execute("""
            SELECT date, SUM(emission)
            FROM emission_sources
            WHERE company_id = %s
              AND date >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY date
            ORDER BY date
        """, (company_id,))
        trend = [
            {"date": str(r[0]), "co2": float(r[1] or 0)}
            for r in cur.fetchall()
        ]

        # ── Source breakdown — all-time totals grouped by type ────────────────
        cur.execute("""
            SELECT source_type, SUM(emission)
            FROM emission_sources
            WHERE company_id = %s
            GROUP BY source_type
            ORDER BY SUM(emission) DESC
        """, (company_id,))
        by_source = [
            {"type": r[0], "co2": float(r[1] or 0)}
            for r in cur.fetchall()
        ]

        # ── Alert — simple threshold logic (matches alert_engine.py) ──────────
        alert = "High emission" if today_total > 1000 else "Normal"

        return jsonify({
            "today_total":   today_total,
            "monthly_total": monthly_total,
            "trend":         trend,
            "by_source":     by_source,
            "alert":         alert,
        }), 200

    except Exception as e:
        logger.exception("Dashboard error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()
