"""
app/routes/report_routes.py — Report & Notification Endpoints
=============================================================
Moved from backend/report_routes.py. Import fix: uses app.utils.db.get_db.

Routes:
    GET    /api/report       — fetch report data as JSON
    GET    /api/report/pdf   — generate + download a PDF report
    GET    /api/notifications  — get user's notification emails
    POST   /api/notifications  — add a notification email
    DELETE /api/notifications  — remove a notification email
"""

from __future__ import annotations

import io
import logging
import os
from datetime import date, timedelta, datetime
from typing import Any

from flask import Blueprint, jsonify, request, send_file
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db
from app.config.settings import Config

logger   = logging.getLogger(__name__)
report_bp = Blueprint("report",        __name__, url_prefix="/api/report")
notif_bp  = Blueprint("notifications", __name__, url_prefix="/api/notifications")

# ── Shared constants ──────────────────────────────────────────────────────────
DAILY_LIMIT_KG   = Config.DAILY_LIMIT_KG
MONTHLY_LIMIT_KG = Config.MONTHLY_LIMIT_KG
EMISSION_FACTORS  = Config.EMISSION_FACTORS

SOURCE_LABELS = {
    "diesel":      "Diesel",
    "petrol":      "Petrol",
    "natural_gas": "Natural Gas",
    "electricity": "Electricity",
}


# ── Date range helper ─────────────────────────────────────────────────────────

def _parse_date_range(args) -> tuple[date, date]:
    """Return (start_date, end_date) from query params."""
    end_date = date.today()
    if args.get("end"):
        try:
            end_date = date.fromisoformat(args["end"])
        except ValueError:
            pass

    if args.get("start"):
        try:
            start_date = date.fromisoformat(args["start"])
            return start_date, end_date
        except ValueError:
            pass

    days = int(args.get("days", 30))
    start_date = end_date - timedelta(days=days - 1)
    return start_date, end_date


# ── Report data builder ───────────────────────────────────────────────────────

def _build_report_data(cur, company_id: int, company_name: str,
                       start: date, end: date) -> dict[str, Any]:
    """Query DB and assemble a structured report dict."""

    cur.execute("""
        SELECT date, SUM(emission)
        FROM emission_sources
        WHERE company_id = %s AND date BETWEEN %s AND %s
        GROUP BY date ORDER BY date
    """, (company_id, start, end))
    trend = [{"date": str(r[0]), "co2": float(r[1] or 0)} for r in cur.fetchall()]
    total_co2 = sum(d["co2"] for d in trend)

    cur.execute("""
        SELECT source_type, SUM(amount), SUM(emission)
        FROM emission_sources
        WHERE company_id = %s AND date BETWEEN %s AND %s
        GROUP BY source_type ORDER BY SUM(emission) DESC
    """, (company_id, start, end))
    by_source = [
        {
            "type":   r[0],
            "label":  SOURCE_LABELS.get(r[0], r[0].title()),
            "amount": float(r[1] or 0),
            "co2":    float(r[2] or 0),
            "factor": EMISSION_FACTORS.get(r[0], 0),
            "pct":    round(float(r[2] or 0) / total_co2 * 100, 1) if total_co2 > 0 else 0,
        }
        for r in cur.fetchall()
    ]

    days_count = max((end - start).days + 1, 1)
    avg_daily  = round(total_co2 / days_count, 2)
    peak       = max(trend, key=lambda x: x["co2"], default=None)
    peak_day   = peak["date"] if peak else "N/A"
    peak_co2   = peak["co2"]  if peak else 0
    days_over  = sum(1 for d in trend if d["co2"] > DAILY_LIMIT_KG)
    compliance = (
        "Compliant" if days_over == 0 and total_co2 <= MONTHLY_LIMIT_KG * (days_count / 30)
        else "Non-Compliant"
    )
    compliance_note = (
        f"{days_over} day(s) exceeded the daily limit of {DAILY_LIMIT_KG:,} kg CO₂."
        if days_over > 0
        else "All recorded days were within CPCB daily emission limits."
    )

    if days_over > 3 or total_co2 > MONTHLY_LIMIT_KG * (days_count / 30) * 1.2:
        recommendation = (
            "Emissions are significantly above safe thresholds. Immediate review of "
            "diesel and electricity consumption is required. Consider switching to "
            "renewable energy sources and optimising fuel-intensive operations."
        )
        priority = "HIGH"
    elif days_over > 0 or avg_daily > DAILY_LIMIT_KG * 0.85:
        recommendation = (
            "Emissions are approaching critical limits. Monitor daily usage closely "
            "and implement fuel efficiency measures. Focus on reducing consumption "
            "in your highest-emitting source category."
        )
        priority = "MEDIUM"
    else:
        recommendation = (
            "Emission levels are within acceptable limits. Continue current practices "
            "and consider setting more ambitious reduction targets. Regular monitoring "
            "will help sustain and improve this performance."
        )
        priority = "LOW"

    return {
        "company":         company_name,
        "period_start":    str(start),
        "period_end":      str(end),
        "days":            days_count,
        "generated_at":    datetime.now().isoformat(timespec="seconds"),
        "total_co2":       round(total_co2, 2),
        "avg_daily_co2":   avg_daily,
        "peak_day":        peak_day,
        "peak_co2":        round(peak_co2, 2),
        "days_recorded":   len(trend),
        "days_over_limit": days_over,
        "compliance":      compliance,
        "compliance_note": compliance_note,
        "recommendation":  recommendation,
        "priority":        priority,
        "trend":           trend,
        "by_source":       by_source,
    }


# ── GET /api/report ───────────────────────────────────────────────────────────

@report_bp.route("", methods=["GET"])
@jwt_required()
def get_report():
    conn = get_db()
    cur  = conn.cursor()
    try:
        user_email = get_jwt_identity()
        cur.execute("""
            SELECT u.company_id, c.name
            FROM users u LEFT JOIN companies c ON c.id = u.company_id
            WHERE u.email = %s
        """, (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id, company_name = row[0], row[1] or "Your Company"

        start, end = _parse_date_range(request.args)
        data = _build_report_data(cur, company_id, company_name, start, end)
        return jsonify(data), 200

    except Exception as e:
        logger.exception("get_report error: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ── GET /api/report/pdf ───────────────────────────────────────────────────────

@report_bp.route("/pdf", methods=["GET"])
@jwt_required()
def download_pdf():
    conn = get_db()
    cur  = conn.cursor()
    try:
        user_email = get_jwt_identity()
        cur.execute("""
            SELECT u.company_id, c.name, u.industry, u.location
            FROM users u LEFT JOIN companies c ON c.id = u.company_id
            WHERE u.email = %s
        """, (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id   = row[0]
        company_name = row[1] or "Your Company"
        industry     = row[2] or "General Industry"
        location     = row[3] or "India"

        start, end = _parse_date_range(request.args)
        data = _build_report_data(cur, company_id, company_name, start, end)
        pdf_bytes = _generate_pdf(data, user_email, industry, location)
        filename  = f"GreenCO2_Report_{data['period_start']}_to_{data['period_end']}.pdf"

        return send_file(
            io.BytesIO(pdf_bytes),
            mimetype="application/pdf",
            as_attachment=True,
            download_name=filename,
        )

    except ImportError:
        return jsonify({"error": "reportlab not installed. Run: pip install reportlab"}), 500
    except Exception as e:
        logger.exception("download_pdf error: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


# ── PDF Generator (unchanged from original) ───────────────────────────────────

def _generate_pdf(data: dict, user_email: str, industry: str, location: str) -> bytes:
    """Build a professional PDF using reportlab and return bytes."""
    from reportlab.lib.pagesizes import A4
    from reportlab.lib.units import mm
    from reportlab.lib import colors
    from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
    from reportlab.platypus import (
        SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle,
        HRFlowable, KeepTogether,
    )
    from reportlab.lib.enums import TA_LEFT, TA_CENTER, TA_RIGHT

    GREEN_DARK  = colors.HexColor("#0f4c2a")
    GREEN_MID   = colors.HexColor("#166534")
    GREEN_LIGHT = colors.HexColor("#16a34a")
    GREEN_PALE  = colors.HexColor("#dcfce7")
    SLATE_DARK  = colors.HexColor("#0f172a")
    SLATE       = colors.HexColor("#334155")
    SLATE_LIGHT = colors.HexColor("#94a3b8")
    WHITE       = colors.white
    RED_SOFT    = colors.HexColor("#fef2f2")
    RED         = colors.HexColor("#dc2626")
    AMBER       = colors.HexColor("#ca8a04")
    AMBER_PALE  = colors.HexColor("#fefce8")

    buf = io.BytesIO()
    doc = SimpleDocTemplate(
        buf, pagesize=A4,
        rightMargin=18*mm, leftMargin=18*mm,
        topMargin=12*mm,   bottomMargin=18*mm,
        title=f"GreenCO2 Emission Report — {data['company']}",
        author="GreenCO2 Platform",
        subject="CO₂ Emission Compliance Report",
    )

    styles = getSampleStyleSheet()
    def S(name, **kw): return ParagraphStyle(name, **kw)

    story = []
    comp_status  = data["compliance"]
    status_color = GREEN_LIGHT if comp_status == "Compliant" else RED
    status_bg    = GREEN_PALE  if comp_status == "Compliant" else RED_SOFT

    # Header band
    header_data = [[
        Paragraph(
            f'<font size="22"><b>🌿 GreenCO₂</b></font><br/>'
            f'<font size="11" color="#86efac">Emission Compliance Report</font>',
            S("hdr", fontName="Helvetica-Bold", textColor=WHITE, leading=28)
        ),
        Paragraph(
            f'<font size="9" color="#86efac">PERIOD</font><br/>'
            f'<font size="13" color="white"><b>{data["period_start"]} → {data["period_end"]}</b></font><br/>'
            f'<font size="8" color="#86efac">{data["days"]} days · {data["days_recorded"]} data points</font>',
            S("hdrR", fontName="Helvetica", textColor=WHITE, alignment=TA_RIGHT, leading=18)
        ),
    ]]
    header_tbl = Table(header_data, colWidths=[110*mm, 62*mm])
    header_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), GREEN_DARK),
        ("ROWPADDING", (0,0), (-1,-1), 14),
        ("LEFTPADDING", (0,0), (0,-1), 16),
        ("RIGHTPADDING", (-1,0), (-1,-1), 16),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(header_tbl)
    story.append(Spacer(1, 6*mm))

    # Compliance block
    comp_icon = "✅" if comp_status == "Compliant" else "❌"
    comp_data = [[
        Paragraph(f'<font size="14"><b>{comp_icon} {comp_status}</b></font>',
                  S("cs", fontName="Helvetica-Bold", fontSize=14, textColor=status_color, alignment=TA_LEFT)),
        Paragraph(f'<font size="8">{data["compliance_note"]}</font>',
                  S("cn", fontName="Helvetica", fontSize=8, textColor=SLATE, alignment=TA_LEFT, leading=13)),
    ]]
    c_tbl = Table(comp_data, colWidths=[42*mm, 130*mm])
    c_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (-1,-1), status_bg),
        ("ROWPADDING", (0,0), (-1,-1), 10),
        ("LEFTPADDING", (0,0), (-1,-1), 12),
        ("BOX", (0,0), (-1,-1), 1, status_color),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(c_tbl)
    story.append(Spacer(1, 5*mm))

    # Recommendation
    priority_color = RED if data["priority"] == "HIGH" else (AMBER if data["priority"] == "MEDIUM" else GREEN_LIGHT)
    priority_bg    = RED_SOFT if data["priority"] == "HIGH" else (AMBER_PALE if data["priority"] == "MEDIUM" else GREEN_PALE)
    rec_data = [[
        Paragraph(f'<font size="9"><b>Priority: {data["priority"]}</b></font>',
                  S("pri", fontName="Helvetica-Bold", fontSize=9, textColor=priority_color, alignment=TA_CENTER)),
        Paragraph(data["recommendation"],
                  S("rec", fontName="Helvetica", fontSize=9, textColor=SLATE, leading=14, alignment=TA_LEFT)),
    ]]
    r_tbl = Table(rec_data, colWidths=[30*mm, 142*mm])
    r_tbl.setStyle(TableStyle([
        ("BACKGROUND", (0,0), (0,-1), priority_bg),
        ("BACKGROUND", (1,0), (1,-1), colors.HexColor("#f8fafc")),
        ("ROWPADDING", (0,0), (-1,-1), 12),
        ("LEFTPADDING", (0,0), (-1,-1), 10),
        ("BOX", (0,0), (-1,-1), 1, priority_color),
        ("LINEAFTER", (0,0), (0,-1), 1, priority_color),
        ("VALIGN", (0,0), (-1,-1), "MIDDLE"),
    ]))
    story.append(r_tbl)
    story.append(Spacer(1, 8*mm))

    # Footer
    story.append(HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#e2e8f0"), spaceAfter=4))
    footer_data = [[
        Paragraph(
            f'<font size="7" color="#94a3b8">Generated by GreenCO2 Platform · '
            f'{data["generated_at"][:16].replace("T"," ")} · {user_email}</font>',
            S("ft", fontName="Helvetica", fontSize=7, textColor=SLATE_LIGHT)
        ),
        Paragraph(
            '<font size="7" color="#94a3b8">CONFIDENTIAL — For internal compliance use only</font>',
            S("ft2", fontName="Helvetica", fontSize=7, textColor=SLATE_LIGHT, alignment=TA_RIGHT)
        ),
    ]]
    f_tbl = Table(footer_data, colWidths=[100*mm, 72*mm])
    f_tbl.setStyle(TableStyle([("ROWPADDING", (0,0), (-1,-1), 2)]))
    story.append(f_tbl)

    doc.build(story)
    return buf.getvalue()


# ── Notification email routes ─────────────────────────────────────────────────

@notif_bp.route("", methods=["GET"])
@jwt_required()
def get_notifications():
    """Return list of additional notification emails for the current user."""
    conn = get_db()
    cur  = conn.cursor()
    try:
        user_email = get_jwt_identity()
        cur.execute("SELECT notification_emails FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        emails = row[0] or []
        return jsonify({"emails": emails}), 200
    except Exception as e:
        logger.exception("get_notifications error: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@notif_bp.route("", methods=["POST"])
@jwt_required()
def add_notification():
    """Add an email to the user's notification list (max 10)."""
    conn = get_db()
    cur  = conn.cursor()
    try:
        user_email = get_jwt_identity()
        data       = request.get_json(force=True)
        new_email  = (data.get("email") or "").strip().lower()

        if not new_email or "@" not in new_email:
            return jsonify({"error": "Valid email is required"}), 400
        if new_email == user_email:
            return jsonify({"error": "This is already your primary email"}), 400

        cur.execute("SELECT notification_emails FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404

        current = list(row[0] or [])
        if new_email in current:
            return jsonify({"error": "Email already in notification list"}), 409
        if len(current) >= 10:
            return jsonify({"error": "Maximum 10 notification emails allowed"}), 400

        current.append(new_email)
        cur.execute(
            "UPDATE users SET notification_emails = %s WHERE email = %s",
            (current, user_email),
        )
        conn.commit()
        return jsonify({"message": "Email added", "emails": current}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("add_notification error: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()


@notif_bp.route("", methods=["DELETE"])
@jwt_required()
def remove_notification():
    """Remove an email from the user's notification list."""
    conn = get_db()
    cur  = conn.cursor()
    try:
        user_email = get_jwt_identity()
        data      = request.get_json(force=True)
        rem_email = (data.get("email") or "").strip().lower()

        cur.execute("SELECT notification_emails FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404

        current = list(row[0] or [])
        if rem_email not in current:
            return jsonify({"error": "Email not found in notification list"}), 404

        current.remove(rem_email)
        cur.execute(
            "UPDATE users SET notification_emails = %s WHERE email = %s",
            (current, user_email),
        )
        conn.commit()
        return jsonify({"message": "Email removed", "emails": current}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("remove_notification error: %s", e)
        return jsonify({"error": str(e)}), 500
    finally:
        cur.close()
        conn.close()
