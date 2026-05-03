"""
app/routes/alert_routes.py — Alert API Routes
==============================================
Moved from backend/alert_routes.py into the app package.
Import fix: uses app.utils.db.get_db instead of circular `from app import get_db`.

Routes:
    GET  /api/alerts              — fetch alert history (paginated, filterable)
    POST /api/alerts/run          — trigger alert engine on-demand
    PUT  /api/alerts/<id>/read    — mark a single alert as read
    PUT  /api/alerts/read-all     — mark ALL alerts as read
    GET  /api/alerts/unread-count — fast badge counter

All routes require JWT Authorization: Bearer <token>.
"""

import logging

from flask import Blueprint, jsonify, request
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db
from ml_engine.alerts.alert_engine import run_alert_engine
from ml_engine.alerts.email_service import send_alert_email, mark_emails_sent

logger   = logging.getLogger(__name__)
alerts_bp = Blueprint("alerts", __name__, url_prefix="/api/alerts")


# ── GET /api/alerts ───────────────────────────────────────────────────────────

@alerts_bp.route("", methods=["GET"])
@jwt_required()
def get_alerts():
    """
    GET /api/alerts
    Query params:
        category  — filter by category (threshold|trend|anomaly|prediction)
        severity  — filter by severity (medium|high|critical)
        unread    — "true" → only unread alerts
        limit     — max rows (default 50, max 200)
        offset    — pagination offset (default 0)

    Returns: { alerts: [...], total: <int>, unread_count: <int> }
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

        # ── Build dynamic WHERE clause ────────────────────────────────────────
        filters = ["company_id = %s"]
        params  = [company_id]

        category = request.args.get("category")
        if category:
            filters.append("category = %s")
            params.append(category)

        severity = request.args.get("severity")
        if severity:
            filters.append("severity = %s")
            params.append(severity)

        if request.args.get("unread", "").lower() == "true":
            filters.append("is_read = FALSE")

        limit  = min(int(request.args.get("limit",  50)), 200)
        offset = max(int(request.args.get("offset",  0)),   0)

        where = " AND ".join(filters)

        # Total count for pagination metadata
        cur.execute(f"SELECT COUNT(*) FROM alerts WHERE {where}", params)
        total = cur.fetchone()[0]

        # Unread badge count (always uses company_id only)
        cur.execute(
            "SELECT COUNT(*) FROM alerts WHERE company_id = %s AND is_read = FALSE",
            (company_id,),
        )
        unread_count = cur.fetchone()[0]

        # Fetch the requested page
        cur.execute(
            f"""
            SELECT id, category, severity, title, message,
                   is_read, email_sent, created_at
            FROM alerts
            WHERE {where}
            ORDER BY created_at DESC
            LIMIT %s OFFSET %s
            """,
            [*params, limit, offset],
        )
        rows = cur.fetchall()

        alerts_list = [
            {
                "id":         r[0],
                "category":   r[1],
                "severity":   r[2],
                "title":      r[3],
                "message":    r[4],
                "is_read":    r[5],
                "email_sent": r[6],
                "created_at": r[7].isoformat() if hasattr(r[7], "isoformat") else str(r[7]),
            }
            for r in rows
        ]

        return jsonify({
            "alerts":       alerts_list,
            "total":        total,
            "unread_count": unread_count,
            "limit":        limit,
            "offset":       offset,
        }), 200

    except Exception as e:
        logger.exception("get_alerts error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── POST /api/alerts/run ──────────────────────────────────────────────────────

@alerts_bp.route("/run", methods=["POST"])
@jwt_required()
def trigger_alerts():
    """
    POST /api/alerts/run
    Manually trigger the alert engine for the authenticated user's company.
    Sends email for any newly generated alerts.

    Returns: { new_alerts: [...], email_sent: <bool>, count: <int> }
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
        cur.close()

        # Run all alert checks (threshold, trend, anomaly, prediction)
        new_alerts = run_alert_engine(conn, company_id)

        email_ok = False
        if new_alerts:
            email_ok = send_alert_email(to_email=user_email, alerts=new_alerts)
            if email_ok:
                ids = [a["id"] for a in new_alerts if "id" in a]
                mark_emails_sent(conn, ids)

        return jsonify({
            "new_alerts": new_alerts,
            "email_sent": email_ok,
            "count":      len(new_alerts),
        }), 200

    except Exception as e:
        logger.exception("trigger_alerts error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        conn.close()


# ── PUT /api/alerts/<id>/read ─────────────────────────────────────────────────

@alerts_bp.route("/<int:alert_id>/read", methods=["PUT"])
@jwt_required()
def mark_read(alert_id: int):
    """Mark a single alert as read. Only marks alerts belonging to the user's company."""
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        cur.execute(
            "UPDATE alerts SET is_read = TRUE WHERE id = %s AND company_id = %s",
            (alert_id, company_id),
        )
        if cur.rowcount == 0:
            return jsonify({"error": "Alert not found"}), 404

        conn.commit()
        return jsonify({"message": "Alert marked as read"}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("mark_read error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── PUT /api/alerts/read-all ──────────────────────────────────────────────────

@alerts_bp.route("/read-all", methods=["PUT"])
@jwt_required()
def mark_all_read():
    """Mark ALL unread alerts for the user's company as read."""
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        cur.execute(
            "UPDATE alerts SET is_read = TRUE WHERE company_id = %s AND is_read = FALSE",
            (company_id,),
        )
        updated = cur.rowcount
        conn.commit()
        return jsonify({"message": f"{updated} alert(s) marked as read"}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("mark_all_read error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── GET /api/alerts/unread-count ──────────────────────────────────────────────

@alerts_bp.route("/unread-count", methods=["GET"])
@jwt_required()
def unread_count():
    """Fast unread badge count — minimal DB load."""
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        cur.execute(
            "SELECT COUNT(*) FROM alerts WHERE company_id = %s AND is_read = FALSE",
            (company_id,),
        )
        count = cur.fetchone()[0]
        return jsonify({"unread_count": count}), 200

    except Exception as e:
        logger.exception("unread_count error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()
