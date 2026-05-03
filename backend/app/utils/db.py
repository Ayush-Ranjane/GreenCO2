"""
app/utils/db.py — Database Connection Helper
=============================================
Provides get_db() — a thin wrapper around psycopg2.connect().

Design rules:
  - One connection per request, never shared across requests.
  - Each caller opens a connection at the top and closes it in `finally`.
  - Uses environment variables resolved at call time (not import time),
    so tests can override them without restarting the process.
"""

import os
import psycopg2


def get_db():
    """
    Open and return a fresh psycopg2 connection.

    Reads connection params from environment variables:
        DB_NAME, DB_USER, DB_PASSWORD, DB_HOST, DB_PORT

    Returns:
        psycopg2 connection object (caller must close it).
    """
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
    )
