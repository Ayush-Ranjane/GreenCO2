"""
app/config/settings.py — Centralized Application Configuration
===============================================================
All environment-driven settings live here. Import with:

    from app.config.settings import Config

Sub-classes allow different configs per environment without mutating
global state (safe for testing and multi-environment deploys).
"""

import os


class Config:
    """Base configuration — all settings with safe defaults."""

    # ── JWT ───────────────────────────────────────────────────────────────────
    JWT_SECRET_KEY     = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
    JWT_IDENTITY_CLAIM = "sub"
    JWT_TOKEN_LOCATION = ["headers"]
    JWT_HEADER_NAME    = "Authorization"
    JWT_HEADER_TYPE    = "Bearer"

    # ── CORS ──────────────────────────────────────────────────────────────────
    # Comma-separated origins in env: "http://localhost:3000,https://app.example.com"
    CORS_ORIGINS = os.getenv("CORS_ORIGINS", "http://localhost:3000").split(",")

    # ── Database ──────────────────────────────────────────────────────────────
    DB_NAME     = os.getenv("DB_NAME", "greenco2")
    DB_USER     = os.getenv("DB_USER", "postgres")
    DB_PASSWORD = os.getenv("DB_PASSWORD", "")
    DB_HOST     = os.getenv("DB_HOST", "localhost")
    DB_PORT     = os.getenv("DB_PORT", "5432")

    # ── SMTP / Email ──────────────────────────────────────────────────────────
    SMTP_HOST  = os.getenv("SMTP_HOST", "smtp.gmail.com")
    SMTP_PORT  = int(os.getenv("SMTP_PORT", "587"))
    SMTP_USER  = os.getenv("SMTP_USER", "")
    SMTP_PASS  = os.getenv("SMTP_PASSWORD", "")
    ALERT_FROM = os.getenv("ALERT_FROM", "")

    # ── Emission Factors (kg CO₂ per unit) ───────────────────────────────────
    # These MUST mirror the frontend constants exactly (see EmissionForm.jsx).
    EMISSION_FACTORS = {
        "diesel":      2.68,   # kg CO₂ per litre
        "petrol":      2.31,   # kg CO₂ per litre
        "natural_gas": 2.75,   # kg CO₂ per m³
        "electricity": 0.82,   # kg CO₂ per kWh
    }

    # ── Compliance Thresholds (CPCB India) ───────────────────────────────────
    DAILY_LIMIT_KG   = 1_000
    MONTHLY_LIMIT_KG = 15_000


class DevelopmentConfig(Config):
    """Development config — debug mode on, relaxed settings."""
    DEBUG = True


class ProductionConfig(Config):
    """Production config — debug off. Set all secrets via env vars."""
    DEBUG = False


# Map an APP_ENV string to a config class
config_map = {
    "development": DevelopmentConfig,
    "production":  ProductionConfig,
    "default":     DevelopmentConfig,
}
