"""
app/services/scheduler_service.py — Background Scheduler Setup
===============================================================
APScheduler jobs:
  1. train_all_models     — retrain ML models every 24 hours
  2. _run_alert_sweep     — check & email alerts for all companies every hour

The scheduler is a module-level singleton so it is never double-started,
even if create_app() is called multiple times (e.g., in tests).
"""

from __future__ import annotations

import logging

from apscheduler.schedulers.background import BackgroundScheduler

logger = logging.getLogger(__name__)

# Module-level singleton — set once on first start_scheduler() call
_scheduler: BackgroundScheduler | None = None


def start_scheduler(app) -> None:
    """
    Initialize and start the background scheduler.
    Idempotent — safe to call multiple times; only the first call takes effect.

    Args:
        app: Flask application instance (reserved for future app-context jobs).
    """
    global _scheduler

    if _scheduler and _scheduler.running:
        logger.info("Scheduler already running — skipping re-init.")
        return

    _scheduler = BackgroundScheduler()

    # ── Job 1: Retrain ML models every 24 hours ───────────────────────────────
    from ml_engine.prediction.train_model import train_all_models
    _scheduler.add_job(
        train_all_models,
        trigger="interval",
        hours=24,
        id="retrain_models",
        replace_existing=True,
    )

    # ── Job 2: Alert sweep every hour ─────────────────────────────────────────
    _scheduler.add_job(
        _run_alert_sweep,
        trigger="interval",
        hours=1,
        id="alert_sweep",
        replace_existing=True,
    )

    _scheduler.start()
    logger.info("Background scheduler started — retrain=24h, alert_sweep=1h.")


def _run_alert_sweep() -> None:
    """
    Hourly task: iterate over every distinct (company_id, email) pair,
    run the alert engine, and email any newly triggered alerts.

    Opens its own DB connection and closes it in finally — never leaks.
    """
    from app.utils.db import get_db
    from ml_engine.alerts.alert_engine import run_alert_engine
    from ml_engine.alerts.email_service import (
        get_all_recipients, send_alert_email, mark_emails_sent,
    )

    conn = get_db()
    cur  = conn.cursor()
    rows = []
    try:
        # Fetch one representative user email per company
        cur.execute("SELECT DISTINCT company_id, email FROM users")
        rows = cur.fetchall()
    finally:
        cur.close()

    try:
        for company_id, email in rows:
            new_alerts = run_alert_engine(conn, company_id)
            if new_alerts:
                # Include any extra notification emails configured by the user
                extra = get_all_recipients(conn, email)[1:]
                ok = send_alert_email(
                    to_email=email,
                    alerts=new_alerts,
                    extra_recipients=extra,
                )
                if ok:
                    ids = [a["id"] for a in new_alerts if "id" in a]
                    mark_emails_sent(conn, ids)

    except Exception as exc:
        logger.exception("Alert sweep failed: %s", exc)
    finally:
        conn.close()
