"""
add_alerts_table.py — Migration: add the `alerts` table to GreenCO2 DB
========================================================================
Run once after the base schema (apply_schema.py) has already been applied:

    python add_alerts_table.py

The script is idempotent — safe to run multiple times.
"""

import os
import sys
from dotenv import load_dotenv
import psycopg2

load_dotenv()

SCHEMA = """
-- ── alerts table ────────────────────────────────────────────────────────────
-- Stores all generated alerts per company.
-- alert_date is a generated column (today's date at insert time) used in the
-- unique constraint to prevent duplicate alerts on the same day.

CREATE TABLE IF NOT EXISTS alerts (
    id          SERIAL       PRIMARY KEY,
    company_id  INTEGER      NOT NULL REFERENCES companies(id) ON DELETE CASCADE,

    -- category: threshold | trend | anomaly | prediction
    category    TEXT         NOT NULL,

    -- severity: medium | high | critical
    severity    TEXT         NOT NULL
                CHECK (severity IN ('low', 'medium', 'high', 'critical')),

    title       TEXT         NOT NULL,
    message     TEXT         NOT NULL,

    -- date portion of created_at; used in the unique constraint
    alert_date  DATE         NOT NULL DEFAULT CURRENT_DATE,

    is_read     BOOLEAN      NOT NULL DEFAULT FALSE,
    email_sent  BOOLEAN      NOT NULL DEFAULT FALSE,
    created_at  TIMESTAMPTZ  NOT NULL DEFAULT NOW()
);

-- Prevent duplicate alerts of the same type/title within a single day
CREATE UNIQUE INDEX IF NOT EXISTS uq_alert_company_cat_title_date
    ON alerts (company_id, category, title, alert_date);

-- Fast per-company lookups, newest first
CREATE INDEX IF NOT EXISTS idx_alerts_company_created
    ON alerts (company_id, created_at DESC);

-- Fast unread-badge query
CREATE INDEX IF NOT EXISTS idx_alerts_unread
    ON alerts (company_id, is_read)
    WHERE is_read = FALSE;
"""


def main() -> None:
    try:
        conn = psycopg2.connect(
            dbname   = os.getenv("DB_NAME"),
            user     = os.getenv("DB_USER"),
            password = os.getenv("DB_PASSWORD"),
            host     = os.getenv("DB_HOST"),
            port     = os.getenv("DB_PORT"),
        )
        conn.autocommit = True
        cur = conn.cursor()
        cur.execute(SCHEMA)
        cur.close()
        conn.close()
        print("[OK] alerts table and indexes created (or already exist).")
        print("     Table:   alerts")
        print("     Indexes: uq_alert_company_cat_title_date")
        print("              idx_alerts_company_created")
        print("              idx_alerts_unread")
    except Exception as exc:
        print(f"[ERROR] Migration failed: {exc}", file=sys.stderr)
        sys.exit(1)


if __name__ == "__main__":
    main()