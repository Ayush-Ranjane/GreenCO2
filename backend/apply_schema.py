"""
apply_schema.py — One-shot script to create all GreenCO2 tables.
Run from the backend directory with the venv active:
    python apply_schema.py
"""
import os
import sys
from dotenv import load_dotenv
import psycopg2

load_dotenv()

SCHEMA = """
-- companies
CREATE TABLE IF NOT EXISTS companies (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- users
CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      TEXT        NOT NULL UNIQUE,
    password   TEXT        NOT NULL,
    company_id INTEGER     REFERENCES companies(id) ON DELETE SET NULL,
    industry   TEXT,
    location   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- emission_sources  (used by POST /api/emissions  and GET /api/dashboard)
CREATE TABLE IF NOT EXISTS emission_sources (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER        NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date        DATE           NOT NULL,
    source_type TEXT           NOT NULL,
    amount      NUMERIC(14,4)  NOT NULL CHECK (amount > 0),
    emission    NUMERIC(14,4)  NOT NULL CHECK (emission > 0),
    created_at  TIMESTAMPTZ    NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emission_sources_company_date
    ON emission_sources(company_id, date);

-- Note: no functional index on DATE_TRUNC — it is not IMMUTABLE in PostgreSQL.
-- The (company_id, date) index above is sufficient for monthly range scans.

-- emissions_data  (legacy /calculate endpoint)
CREATE TABLE IF NOT EXISTS emissions_data (
    id           SERIAL PRIMARY KEY,
    fuel_used    NUMERIC(14,4) NOT NULL,
    co2_emission NUMERIC(14,4) NOT NULL,
    company_id   INTEGER       REFERENCES companies(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ   NOT NULL DEFAULT NOW()
);
"""

def main():
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
        print("[OK] Schema applied successfully.")
        print("     Tables:  companies, users, emission_sources, emissions_data")
        print("     Indexes: idx_users_email, idx_users_company_id,")
        print("              idx_emission_sources_company_date")
    except Exception as e:
        print(f"[ERROR] Schema error: {e}", file=sys.stderr)
        sys.exit(1)

if __name__ == "__main__":
    main()
