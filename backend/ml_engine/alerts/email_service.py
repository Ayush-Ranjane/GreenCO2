"""
ml_engine/alerts/email_service.py — GreenCO2 SMTP Email Service
=================================================================
Sends alert notification emails via SMTP (Gmail / any provider).

Configuration (add to your .env):
    SMTP_HOST      = smtp.gmail.com
    SMTP_PORT      = 465              ← use 465 for Gmail SSL  (or 587 for STARTTLS)
    SMTP_USER      = your@gmail.com
    SMTP_PASSWORD  = xxxx-xxxx-xxxx-xxxx   ← Gmail App Password
    ALERT_FROM     = GreenCO2 Alerts <your@gmail.com>
    ALERT_REPLY_TO = no-reply@yourdomain.com   (optional)

Port behaviour:
    465  → SMTP_SSL  (implicit TLS — recommended for Gmail)
    587  → SMTP + STARTTLS  (explicit TLS)
"""

from __future__ import annotations

import logging
import os
import smtplib
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger(__name__)

# ── Severity colours (for HTML email) ────────────────────────────────────────

_SEV_COLOR = {
    "critical": "#dc2626",
    "high":     "#ea580c",
    "medium":   "#ca8a04",
    "low":      "#16a34a",
}

_SEV_EMOJI = {
    "critical": "🚨",
    "high":     "⚠️",
    "medium":   "🟡",
    "low":      "✅",
}

_CAT_LABEL = {
    "threshold":  "Threshold Alert",
    "trend":      "Trend Alert",
    "anomaly":    "Anomaly Alert",
    "prediction": "Prediction Alert",
}


# ── HTML template ─────────────────────────────────────────────────────────────

def _build_html(alerts: list[dict[str, Any]]) -> str:
    count = len(alerts)
    cards_html = ""
    for a in alerts:
        sev   = a.get("severity", "medium")
        cat   = a.get("category", "")
        color = _SEV_COLOR.get(sev, "#6b7280")
        emoji = _SEV_EMOJI.get(sev, "🔔")
        label = _CAT_LABEL.get(cat, cat.title())
        cards_html += f"""
        <div style="background:#1e293b;border-left:4px solid {color};
                    border-radius:8px;margin-bottom:16px;padding:16px 20px;">
            <p style="margin:0 0 4px;font-size:11px;color:{color};
                      text-transform:uppercase;letter-spacing:.08em;">
                {emoji} {label} · {sev.upper()}
            </p>
            <p style="margin:0 0 8px;font-size:16px;font-weight:600;color:#f1f5f9;">
                {a.get('title', '')}
            </p>
            <p style="margin:0;font-size:14px;color:#94a3b8;line-height:1.6;">
                {a.get('message', '')}
            </p>
        </div>
        """

    return f"""<!DOCTYPE html>
<html lang="en">
<head><meta charset="UTF-8"><title>GreenCO2 Alerts</title></head>
<body style="margin:0;padding:0;background:#0f172a;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#0f172a;padding:32px 0;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="background:#1e293b;border-radius:12px;overflow:hidden;">
        <tr>
          <td style="background:linear-gradient(135deg,#166534,#16a34a);padding:28px 32px;">
            <p style="margin:0;font-size:22px;font-weight:700;color:#fff;">
              🌿 GreenCO₂ Alert Notification
            </p>
            <p style="margin:4px 0 0;font-size:13px;color:rgba(255,255,255,.7);">
              {count} new alert{'s' if count != 1 else ''}
            </p>
          </td>
        </tr>
        <tr><td style="padding:28px 32px;">{cards_html}</td></tr>
        <tr>
          <td style="padding:0 32px 28px;">
            <p style="margin:0;font-size:12px;color:#475569;line-height:1.6;">
              This email was sent automatically by the GreenCO₂ monitoring system.
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_plain(alerts: list[dict[str, Any]]) -> str:
    lines = ["GreenCO2 Alert Notification", "=" * 40, ""]
    for a in alerts:
        sev   = a.get("severity", "").upper()
        cat   = _CAT_LABEL.get(a.get("category", ""), "Alert")
        lines.append(f"[{sev}] {cat}: {a.get('title', '')}")
        lines.append(a.get("message", ""))
        lines.append("")
    lines += ["—", "Sent automatically by GreenCO2."]
    return "\n".join(lines)


# ── Public send function ──────────────────────────────────────────────────────

def send_alert_email(
    to_email: str,
    alerts: list[dict[str, Any]],
    *,
    subject: str | None = None,
) -> bool:
    """
    Send an alert notification email.

    Returns True on success, False on any error.

    Port behaviour:
        465  → SMTP_SSL  (recommended for Gmail)
        587  → SMTP + STARTTLS
    """
    if not alerts:
        return True

    smtp_host = os.getenv("SMTP_HOST", "smtp.gmail.com")
    smtp_port = int(os.getenv("SMTP_PORT", "465"))
    smtp_user = os.getenv("SMTP_USER", "")
    smtp_pass = os.getenv("SMTP_PASSWORD", "")
    from_addr = os.getenv("ALERT_FROM", smtp_user)
    reply_to  = os.getenv("ALERT_REPLY_TO", "")

    if not smtp_user or not smtp_pass:
        logger.warning(
            "SMTP credentials not configured (SMTP_USER / SMTP_PASSWORD). "
            "Email alert skipped for %s.", to_email
        )
        return False

    count    = len(alerts)
    has_crit = any(a.get("severity") == "critical" for a in alerts)
    subj     = subject or (
        f"🚨 CRITICAL: {count} GreenCO₂ Alert{'s' if count > 1 else ''}"
        if has_crit
        else f"⚠️ {count} GreenCO₂ Alert{'s' if count > 1 else ''}"
    )

    msg = MIMEMultipart("alternative")
    msg["Subject"] = subj
    msg["From"]    = from_addr
    msg["To"]      = to_email
    if reply_to:
        msg["Reply-To"] = reply_to

    msg.attach(MIMEText(_build_plain(alerts), "plain"))
    msg.attach(MIMEText(_build_html(alerts),  "html"))

    try:
        if smtp_port == 465:
            # Implicit SSL — no STARTTLS handshake needed
            with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                server.ehlo()
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_addr, [to_email], msg.as_string())
        else:
            # Explicit TLS via STARTTLS (port 587)
            with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                server.ehlo()
                server.starttls()
                server.ehlo()   # re-identify after STARTTLS upgrade
                server.login(smtp_user, smtp_pass)
                server.sendmail(from_addr, [to_email], msg.as_string())

        logger.info("Alert email sent to %s (%d alert(s))", to_email, count)
        return True

    except smtplib.SMTPAuthenticationError:
        logger.error(
            "SMTP auth failed for %s. "
            "For Gmail: use an App Password from "
            "myaccount.google.com/apppasswords — NOT your account password.",
            smtp_user,
        )
    except smtplib.SMTPException as exc:
        logger.error("SMTP error sending to %s: %s", to_email, exc)
    except TimeoutError:
        logger.error(
            "SMTP connection to %s:%s timed out. "
            "Try setting SMTP_PORT=465 in your .env for Gmail.",
            smtp_host, smtp_port,
        )
    except OSError as exc:
        logger.error("Network/OS error sending alert email: %s", exc)

    return False


def mark_emails_sent(conn, alert_ids: list[int]) -> None:
    """Flip email_sent = TRUE for the given alert IDs after a successful send."""
    if not alert_ids:
        return
    cur = conn.cursor()
    try:
        cur.execute(
            "UPDATE alerts SET email_sent = TRUE WHERE id = ANY(%s)",
            (alert_ids,),
        )
        conn.commit()
    finally:
        cur.close()