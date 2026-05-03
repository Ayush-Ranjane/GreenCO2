"""
ml_engine/alerts/email_service.py — GreenCO2 SMTP Email Service (v2)
======================================================================
Changes in v2:
  - Supports multiple recipients (primary + notification_emails from DB)
  - Improved HTML email design: dark-card layout, bar charts, colour coding
  - send_alert_email() now accepts an optional `extra_recipients` list
  - New helper: get_all_recipients(conn, primary_email) — fetches extras from DB

Configuration (.env):
    SMTP_HOST      = smtp.gmail.com
    SMTP_PORT      = 465
    SMTP_USER      = your@gmail.com
    SMTP_PASSWORD  = xxxx-xxxx-xxxx-xxxx   (Gmail App Password)
    ALERT_FROM     = GreenCO2 Alerts <your@gmail.com>
    ALERT_REPLY_TO = no-reply@yourdomain.com  (optional)
"""

from __future__ import annotations

import logging
import os
import smtplib
from datetime import datetime
from email.mime.multipart import MIMEMultipart
from email.mime.text import MIMEText
from typing import Any

logger = logging.getLogger(__name__)

# ── Severity / category metadata ──────────────────────────────────────────────

_SEV_COLOR = {
    "critical": "#dc2626",
    "high":     "#ea580c",
    "medium":   "#ca8a04",
    "low":      "#16a34a",
}
_SEV_BG = {
    "critical": "#3f0000",
    "high":     "#431407",
    "medium":   "#422006",
    "low":      "#052e16",
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
_CAT_ICON = {
    "threshold":  "📊",
    "trend":      "📈",
    "anomaly":    "🔬",
    "prediction": "🔮",
}


# ── DB helper: fetch all recipients ──────────────────────────────────────────

def get_all_recipients(conn, primary_email: str) -> list[str]:
    """
    Return [primary_email] + any extra notification_emails stored for the user.
    Falls back to [primary_email] if DB lookup fails.
    """
    try:
        cur = conn.cursor()
        cur.execute(
            "SELECT notification_emails FROM users WHERE email = %s",
            (primary_email,),
        )
        row = cur.fetchone()
        cur.close()
        extras = list(row[0] or []) if row else []
        # Deduplicate while preserving order, primary first
        seen = {primary_email}
        recipients = [primary_email]
        for e in extras:
            if e and e not in seen:
                seen.add(e)
                recipients.append(e)
        return recipients
    except Exception as exc:
        logger.warning("Could not fetch notification_emails: %s", exc)
        return [primary_email]


# ── HTML email builder ────────────────────────────────────────────────────────

def _severity_summary_bar(alerts: list[dict]) -> str:
    """Build a colour-coded summary bar showing counts per severity."""
    counts: dict[str, int] = {}
    for a in alerts:
        sev = a.get("severity", "medium")
        counts[sev] = counts.get(sev, 0) + 1

    chips = ""
    order = ["critical", "high", "medium", "low"]
    for sev in order:
        n = counts.get(sev, 0)
        if n:
            color = _SEV_COLOR[sev]
            emoji = _SEV_EMOJI[sev]
            chips += f"""
            <span style="display:inline-block;margin:0 6px 4px 0;padding:4px 12px;
                         background:{_SEV_BG.get(sev,'#1e293b')};border:1px solid {color};
                         border-radius:20px;font-size:11px;color:{color};font-weight:700;
                         letter-spacing:.06em;">
                {emoji} {n} {sev.upper()}
            </span>"""
    return chips


def _build_alert_cards(alerts: list[dict]) -> str:
    html = ""
    for a in alerts:
        sev       = a.get("severity", "medium")
        cat       = a.get("category", "")
        color     = _SEV_COLOR.get(sev,   "#6b7280")
        bg        = _SEV_BG.get(sev,      "#1e293b")
        sev_emoji = _SEV_EMOJI.get(sev,   "🔔")
        cat_emoji = _CAT_ICON.get(cat,    "🔔")
        cat_label = _CAT_LABEL.get(cat,   cat.title())
        html += f"""
        <div style="margin-bottom:14px;border-radius:10px;overflow:hidden;
                    border:1px solid {color}33;">
          <!-- Card top bar -->
          <div style="background:{bg};padding:8px 16px;display:flex;
                      align-items:center;border-bottom:1px solid {color}55;">
            <span style="font-size:11px;font-weight:700;letter-spacing:.08em;
                         text-transform:uppercase;color:{color};">
              {sev_emoji} {sev.upper()}
            </span>
            <span style="margin-left:12px;font-size:11px;color:#64748b;
                         font-weight:600;letter-spacing:.05em;">
              {cat_emoji} {cat_label}
            </span>
            {'<span style="margin-left:auto;font-size:10px;color:#16a34a;' +
             'background:#052e16;padding:2px 8px;border-radius:4px;font-weight:700;">' +
             '📧 EMAIL SENT</span>' if a.get('email_sent') else ''}
          </div>
          <!-- Card body -->
          <div style="background:#1e293b;padding:14px 16px;">
            <p style="margin:0 0 6px;font-size:15px;font-weight:700;color:#f1f5f9;
                      line-height:1.4;">
              {a.get('title', '')}
            </p>
            <p style="margin:0;font-size:13px;color:#94a3b8;line-height:1.6;">
              {a.get('message', '')}
            </p>
          </div>
        </div>"""
    return html


def _build_html(alerts: list[dict], extra_recipients: list[str] | None = None) -> str:
    count       = len(alerts)
    now_str     = datetime.now().strftime("%d %b %Y · %H:%M")
    summary_bar = _severity_summary_bar(alerts)
    cards_html  = _build_alert_cards(alerts)
    has_crit    = any(a.get("severity") == "critical" for a in alerts)
    banner_text = (
        "🚨 Critical issues require immediate attention."
        if has_crit else
        "Your GreenCO₂ monitoring system has detected the following alerts."
    )
    banner_color = "#dc2626" if has_crit else "#16a34a"

    recipients_note = ""
    if extra_recipients:
        others = ", ".join(extra_recipients)
        recipients_note = f"""
        <p style="margin:12px 0 0;font-size:11px;color:#475569;text-align:center;">
            Also sent to: <span style="color:#94a3b8;">{others}</span>
        </p>"""

    return f"""<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width,initial-scale=1">
  <title>GreenCO2 Alert Notification</title>
</head>
<body style="margin:0;padding:0;background:#0a0f1a;
             font-family:'Segoe UI',Helvetica,Arial,sans-serif;">

  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#0a0f1a;padding:32px 0 48px;">
    <tr><td align="center">
      <table width="600" cellpadding="0" cellspacing="0"
             style="max-width:600px;width:100%;">

        <!-- ── Top Logo Bar ── -->
        <tr>
          <td style="background:linear-gradient(135deg,#052e16 0%,#14532d 60%,#166534 100%);
                     border-radius:12px 12px 0 0;padding:28px 32px;">
            <table width="100%" cellpadding="0" cellspacing="0">
              <tr>
                <td>
                  <p style="margin:0;font-size:24px;font-weight:800;color:#fff;
                            letter-spacing:-.5px;">
                    🌿 GreenCO₂
                  </p>
                  <p style="margin:4px 0 0;font-size:12px;color:#86efac;
                            letter-spacing:.12em;text-transform:uppercase;
                            font-weight:600;">
                    Emission Monitoring System
                  </p>
                </td>
                <td style="text-align:right;vertical-align:top;">
                  <p style="margin:0;font-size:11px;color:#86efac;">{now_str}</p>
                  <div style="display:inline-block;margin-top:6px;
                              background:rgba(255,255,255,.12);border-radius:20px;
                              padding:3px 12px;">
                    <span style="font-size:11px;color:#fff;font-weight:700;">
                      {count} Alert{'s' if count != 1 else ''}
                    </span>
                  </div>
                </td>
              </tr>
            </table>
          </td>
        </tr>

        <!-- ── Banner ── -->
        <tr>
          <td style="background:{banner_color}18;border-left:4px solid {banner_color};
                     padding:12px 20px;">
            <p style="margin:0;font-size:13px;color:#e2e8f0;font-weight:500;">
              {banner_text}
            </p>
          </td>
        </tr>

        <!-- ── Summary Bar ── -->
        <tr>
          <td style="background:#1e293b;padding:12px 24px;border-bottom:1px solid #334155;">
            {summary_bar}
          </td>
        </tr>

        <!-- ── Alert Cards ── -->
        <tr>
          <td style="background:#0f172a;padding:20px 24px;">
            {cards_html}
          </td>
        </tr>

        <!-- ── Footer ── -->
        <tr>
          <td style="background:#020817;border-radius:0 0 12px 12px;
                     padding:20px 24px;border-top:1px solid #1e293b;">
            <p style="margin:0;font-size:11px;color:#334155;line-height:1.7;
                      text-align:center;">
              This is an automated notification from the GreenCO₂ monitoring platform.<br>
              Please do not reply directly to this email.
            </p>
            {recipients_note}
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>"""


def _build_plain(alerts: list[dict]) -> str:
    lines = [
        "GreenCO2 Alert Notification",
        "=" * 44,
        f"Generated: {datetime.now().strftime('%d %b %Y %H:%M')}",
        f"Total alerts: {len(alerts)}",
        "",
    ]
    for a in alerts:
        sev   = a.get("severity", "").upper()
        cat   = _CAT_LABEL.get(a.get("category", ""), "Alert")
        lines.append(f"[{sev}] {cat}")
        lines.append(f"Title: {a.get('title', '')}")
        lines.append(f"Details: {a.get('message', '')}")
        lines.append("")
    lines += ["—", "Sent automatically by GreenCO2 Monitoring System."]
    return "\n".join(lines)


# ── Public send function ──────────────────────────────────────────────────────

def send_alert_email(
    to_email: str,
    alerts: list[dict[str, Any]],
    *,
    subject: str | None = None,
    extra_recipients: list[str] | None = None,
) -> bool:
    """
    Send alert notification email to to_email and any extra_recipients.

    Args:
        to_email:          Primary recipient (always included).
        alerts:            List of alert dicts to include in the email.
        subject:           Override email subject (optional).
        extra_recipients:  Additional CC-style To addresses to send to.

    Returns True on full success, False if any send failed.
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
            "SMTP credentials not configured. Email skipped for %s.", to_email
        )
        return False

    # Build full recipient list (deduplicated)
    all_recipients: list[str] = [to_email]
    if extra_recipients:
        for e in extra_recipients:
            if e and e != to_email and e not in all_recipients:
                all_recipients.append(e)

    count    = len(alerts)
    has_crit = any(a.get("severity") == "critical" for a in alerts)
    subj = subject or (
        f"🚨 CRITICAL: {count} GreenCO₂ Alert{'s' if count > 1 else ''}"
        if has_crit else
        f"⚠️ {count} GreenCO₂ Alert{'s' if count > 1 else ''}"
    )

    # Show extra recipients note in the email body (excluding primary)
    body_extras = all_recipients[1:] if len(all_recipients) > 1 else None

    success = True

    # Send individually so each recipient sees only their own address in "To:"
    for recipient in all_recipients:
        msg = MIMEMultipart("alternative")
        msg["Subject"] = subj
        msg["From"]    = from_addr
        msg["To"]      = recipient
        if reply_to:
            msg["Reply-To"] = reply_to

        msg.attach(MIMEText(_build_plain(alerts),                         "plain"))
        msg.attach(MIMEText(_build_html(alerts, extra_recipients=body_extras), "html"))

        try:
            if smtp_port == 465:
                with smtplib.SMTP_SSL(smtp_host, smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_addr, [recipient], msg.as_string())
            else:
                with smtplib.SMTP(smtp_host, smtp_port, timeout=30) as server:
                    server.ehlo()
                    server.starttls()
                    server.ehlo()
                    server.login(smtp_user, smtp_pass)
                    server.sendmail(from_addr, [recipient], msg.as_string())

            logger.info("Alert email sent to %s (%d alert(s))", recipient, count)

        except smtplib.SMTPAuthenticationError:
            logger.error(
                "SMTP auth failed. For Gmail use an App Password from "
                "myaccount.google.com/apppasswords."
            )
            success = False
        except smtplib.SMTPException as exc:
            logger.error("SMTP error sending to %s: %s", recipient, exc)
            success = False
        except (TimeoutError, OSError) as exc:
            logger.error("Network error sending to %s: %s", recipient, exc)
            success = False

    return success


def mark_emails_sent(conn, alert_ids: list[int]) -> None:
    """Flip email_sent = TRUE for the given alert IDs."""
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