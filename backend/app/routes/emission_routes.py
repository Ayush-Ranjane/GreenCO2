"""
app/routes/emission_routes.py — Emission Logging Endpoints
===========================================================
Routes:
    POST /api/emissions — multi-source emission entry (primary endpoint)
    POST /calculate     — legacy single-fuel endpoint (backward compat)

Emission factors are imported from config so they stay in sync with
the frontend constants and the report/alert modules.
"""

import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db
from app.config.settings import Config

logger = logging.getLogger(__name__)
emission_bp = Blueprint("emission", __name__)

# Central reference — defined once in settings.py, used everywhere
EMISSION_FACTORS = Config.EMISSION_FACTORS


# ── POST /api/emissions ───────────────────────────────────────────────────────

@emission_bp.route("/api/emissions", methods=["POST"])
@jwt_required()
def log_emissions():
    """
    POST /api/emissions
    Header: Authorization: Bearer <token>
    Body:
    {
        "date":    "YYYY-MM-DD",
        "sources": [
            { "type": "diesel",      "amount": 100.0 },
            { "type": "electricity", "amount": 50.0  }
        ]
    }

    Calculates CO₂ per source using server-side emission factors,
    inserts one row per source into emission_sources, and returns total.

    Validation:
    - date must be present
    - sources must be a non-empty list
    - each type must be in EMISSION_FACTORS
    - each amount must be a positive number ≤ 1,000,000
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        # Resolve the user's company_id
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        date    = (data.get("date") or "").strip()
        sources = data.get("sources", [])

        # ── Validate top-level fields ─────────────────────────────────────────
        if not date:
            return jsonify({"error": "date is required (YYYY-MM-DD)"}), 400
        if not isinstance(sources, list) or len(sources) == 0:
            return jsonify({"error": "sources must be a non-empty list"}), 400

        # ── Validate each source row ──────────────────────────────────────────
        validation_errors = []
        for i, src in enumerate(sources):
            src_type   = src.get("type", "")
            src_amount = src.get("amount")

            if src_type not in EMISSION_FACTORS:
                validation_errors.append(
                    f"Row {i+1}: unknown source type '{src_type}'. "
                    f"Valid types: {list(EMISSION_FACTORS.keys())}"
                )
                continue

            try:
                amt = float(src_amount)
            except (TypeError, ValueError):
                validation_errors.append(f"Row {i+1}: amount must be a number")
                continue

            if amt <= 0:
                validation_errors.append(f"Row {i+1}: amount must be > 0")
            elif amt > 1_000_000:
                validation_errors.append(f"Row {i+1}: amount exceeds sanity limit (1,000,000)")

        if validation_errors:
            return jsonify({"error": "Validation failed", "details": validation_errors}), 400

        # ── Insert rows and compute total CO₂ ────────────────────────────────
        total_co2 = 0.0

        for src in sources:
            src_type = src["type"]
            amount   = float(src["amount"])
            emission = round(amount * EMISSION_FACTORS[src_type], 4)
            total_co2 += emission

            cur.execute(
                """
                INSERT INTO emission_sources
                    (company_id, date, source_type, amount, emission)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (company_id, date, src_type, amount, emission),
            )

        conn.commit()
        logger.info(
            "Emissions logged: user=%s company_id=%s date=%s total_co2=%.4f",
            user_email, company_id, date, total_co2,
        )

        return jsonify({
            "message":   "Emissions recorded successfully",
            "date":      date,
            "total_co2": round(total_co2, 4),
        }), 201

    except Exception as e:
        conn.rollback()
        logger.exception("Log emissions error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── POST /calculate ───────────────────────────────────────────────────────────
# Legacy endpoint — kept for backward compatibility.
# New code should use POST /api/emissions instead.

@emission_bp.route("/calculate", methods=["POST"])
@jwt_required()
def calculate():
    """
    POST /calculate  (legacy — use /api/emissions instead)
    Body: { fuel: <float> }

    Computes CO₂ from diesel litres, stores in emissions_data table.
    Kept so older client integrations don't break.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        try:
            fuel = float(data["fuel"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "fuel must be a valid number"}), 400

        if fuel <= 0:
            return jsonify({"error": "fuel must be a positive number"}), 400

        co2 = round(fuel * EMISSION_FACTORS["diesel"], 4)

        cur.execute(
            "INSERT INTO emissions_data (fuel_used, co2_emission, company_id) VALUES (%s, %s, %s)",
            (fuel, co2, company_id),
        )
        conn.commit()

        return jsonify({"co2_emission": co2}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("Calculate error: %s", e)
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()
