"""
app/routes/profile_routes.py — User Profile Endpoints
======================================================
Routes:
    GET /api/profile — fetch the authenticated user's profile
    PUT /api/profile — update mutable fields (industry, location, company name)

Email is intentionally immutable — it is the JWT identity and the DB key.
"""

import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db

logger = logging.getLogger(__name__)
profile_bp = Blueprint("profile", __name__)


# ── GET /api/profile ──────────────────────────────────────────────────────────

@profile_bp.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """
    GET /api/profile
    Header: Authorization: Bearer <token>

    Joins users + companies tables to resolve the company name.
    Returns: { email, company, industry, location }
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()  # plain email string from JWT sub claim

        cur.execute(
            """
            SELECT u.email, c.name AS company, u.industry, u.location
            FROM   users u
            LEFT JOIN companies c ON c.id = u.company_id
            WHERE  u.email = %s
            """,
            (user_email,),
        )
        user = cur.fetchone()

        if not user:
            return jsonify({"error": "User not found"}), 404

        return jsonify({
            "email":    user[0],
            "company":  user[1] or "",
            "industry": user[2] or "",
            "location": user[3] or "",
        }), 200

    except Exception as e:
        logger.exception("Get profile error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── PUT /api/profile ──────────────────────────────────────────────────────────

@profile_bp.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """
    PUT /api/profile
    Header: Authorization: Bearer <token>
    Body:   { company, industry, location }

    Updates mutable fields. If company is supplied, the companies row
    linked to the current user is also updated.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        data       = request.get_json(force=True)

        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        cur.execute(
            """
            UPDATE users
            SET    industry = %s, location = %s
            WHERE  email    = %s
            """,
            (data.get("industry"), data.get("location"), user_email),
        )

        # Optionally update the company display name
        if data.get("company"):
            cur.execute(
                """
                UPDATE companies c
                SET    name = %s
                FROM   users u
                WHERE  u.company_id = c.id
                  AND  u.email      = %s
                """,
                (data["company"], user_email),
            )

        conn.commit()
        logger.info("Profile updated: %s", user_email)
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("Update profile error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()
