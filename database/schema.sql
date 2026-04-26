-- =============================================================================
-- GreenCO2 — PostgreSQL Schema
-- =============================================================================
-- Run this file against your `greenco2` database to create / verify the schema:
--   psql -U postgres -d greenco2 -f schema.sql
--
-- The schema is idempotent: tables are only created if they don't exist.
-- =============================================================================

-- ── companies ──────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS companies (
    id         SERIAL PRIMARY KEY,
    name       TEXT        NOT NULL UNIQUE,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- ── users ──────────────────────────────────────────────────────────────────────

CREATE TABLE IF NOT EXISTS users (
    id         SERIAL PRIMARY KEY,
    email      TEXT        NOT NULL UNIQUE,
    password   TEXT        NOT NULL,          -- bcrypt hash
    company_id INTEGER     REFERENCES companies(id) ON DELETE SET NULL,
    industry   TEXT,
    location   TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_users_email      ON users(email);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);

-- ── emission_sources ───────────────────────────────────────────────────────────
-- Primary table for the /api/emissions endpoint (multi-source daily entry).
--
-- source_type values:  diesel | petrol | natural_gas | electricity
-- amount              — raw units consumed (litres / m³ / kWh)
-- emission            — kg CO₂ = amount × emission_factor (computed server-side)

CREATE TABLE IF NOT EXISTS emission_sources (
    id          SERIAL PRIMARY KEY,
    company_id  INTEGER     NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    date        DATE        NOT NULL,
    source_type TEXT        NOT NULL,
    amount      NUMERIC(14, 4) NOT NULL CHECK (amount > 0),
    emission    NUMERIC(14, 4) NOT NULL CHECK (emission > 0),
    created_at  TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_emission_sources_company_date
    ON emission_sources(company_id, date);

-- Note: no functional index on DATE_TRUNC — it is not IMMUTABLE in PostgreSQL.
-- The (company_id, date) index above handles monthly range queries efficiently.

-- ── emissions_data ─────────────────────────────────────────────────────────────
-- Legacy table used by the /calculate endpoint (single-source diesel only).
-- Kept for backward compatibility.

CREATE TABLE IF NOT EXISTS emissions_data (
    id           SERIAL PRIMARY KEY,
    fuel_used    NUMERIC(14, 4) NOT NULL,
    co2_emission NUMERIC(14, 4) NOT NULL,
    company_id   INTEGER     REFERENCES companies(id) ON DELETE SET NULL,
    created_at   TIMESTAMPTZ NOT NULL DEFAULT NOW()
);
