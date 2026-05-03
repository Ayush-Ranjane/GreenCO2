"""
app/routes/auth_routes.py — Authentication Endpoints
=====================================================
Routes:
    POST /api/register — create a new user account + company
    POST /api/login    — authenticate and return a signed JWT

Identity design: JWT identity = plain email string.
This avoids JSON-parsing errors throughout protected routes.
"""

import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import create_access_token

from app.extensions import bcrypt
from app.utils.db import get_db

logger = logging.getLogger(__name__)
auth_bp = Blueprint("auth", __name__)


# ── POST /api/register ────────────────────────────────────────────────────────

@auth_bp.route("/api/register", methods=["POST"])
def register():
    """
    POST /api/register
    Body: { email, password, company }

    Creates a company row if it doesn't exist, then inserts a new user.
    Passwords are hashed with bcrypt before storage.
    Returns 409 if the email is already registered.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        user_email   = (data.get("email",   "") or "").strip().lower()
        password     = data.get("password", "")
        company_name = (data.get("company", "") or "Default Company").strip()

        # ── Input validation ──────────────────────────────────────────────────
        if not user_email or "@" not in user_email:
            return jsonify({"error": "Valid email is required"}), 400
        if not password or len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        if not company_name:
            return jsonify({"error": "Company name is required"}), 400

        # Reject duplicate emails
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409

        # ── Resolve or create company ─────────────────────────────────────────
        cur.execute("SELECT id FROM companies WHERE name = %s", (company_name,))
        company = cur.fetchone()

        if company:
            company_id = company[0]
        else:
            cur.execute(
                "INSERT INTO companies (name) VALUES (%s) RETURNING id",
                (company_name,),
            )
            row = cur.fetchone()
            if not row:
                return jsonify({"error": "Failed to create company"}), 500
            company_id = row[0]

        hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")
        cur.execute(
            "INSERT INTO users (email, password, company_id) VALUES (%s, %s, %s)",
            (user_email, hashed_pw, company_id),
        )
        conn.commit()

        logger.info("Registered new user: %s (company_id=%s)", user_email, company_id)
        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        conn.rollback()
        logger.exception("Register error: %s", e)
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()


# ── POST /api/login ───────────────────────────────────────────────────────────

@auth_bp.route("/api/login", methods=["POST"])
def login():
    """
    POST /api/login
    Body: { email, password }

    Returns a signed JWT access token on success.
    Identity stored as plain email string — no JSON encoding needed.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        user_email = (data.get("email", "") or "").strip().lower()
        password   = data.get("password", "")

        if not user_email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        cur.execute(
            "SELECT email, password FROM users WHERE email = %s",
            (user_email,),
        )
        user = cur.fetchone()

        if not user or not bcrypt.check_password_hash(user[1], password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Identity = email string — simple, unambiguous, avoids JSON-parsing bugs
        token = create_access_token(identity=user[0])
        logger.info("Login successful: %s", user_email)
        return jsonify({"token": token}), 200

    except Exception as e:
        logger.exception("Login error: %s", e)
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()
