"""
app.py — GreenCO2 Flask Backend
================================
Auth stack:  Flask-JWT-Extended  (Bearer token, identity = email string)
DB:          PostgreSQL via psycopg2  (per-request connections via get_db())
CORS:        Flask-CORS  (explicit allowed headers, no wildcard + credentials)

Key design decisions
---------------------
- identity = plain email string   → no JSON parsing, no type errors
- Every route opens its own connection and closes it in `finally`
- CORS does NOT use wildcard origin when Authorization headers are needed
- All numeric values from psycopg2 (Decimal) are cast to float before jsonify
- /api/emissions is the multi-source emission entry endpoint
- Emission factors match frontend constants exactly
"""

import os
import logging

from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import (
    JWTManager,
    create_access_token,
    jwt_required,
    get_jwt_identity,
)
from flask_cors import CORS
from dotenv import load_dotenv
import psycopg2

load_dotenv()

# ── Logging ──────────────────────────────────────────────────────────────────

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(message)s",
)
logger = logging.getLogger(__name__)

# ── App ──────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# JWT — identity is stored as a plain email string (no JSON encoding needed)
app.config["JWT_SECRET_KEY"]      = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
app.config["JWT_IDENTITY_CLAIM"]  = "sub"
app.config["JWT_TOKEN_LOCATION"]  = ["headers"]
app.config["JWT_HEADER_NAME"]     = "Authorization"
app.config["JWT_HEADER_TYPE"]     = "Bearer"

# ⚠️  Do NOT log the secret key — even in development
logger.info("JWT configuration loaded. Backend starting…")

jwt    = JWTManager(app)
bcrypt = Bcrypt(app)

# CORS — allow the React dev server; also expose Authorization header
# NOTE: when Authorization header is in use you CANNOT use origins="*"
#       You must name the origin explicitly (or use a list).
CORS(
    app,
    origins=["http://localhost:3000"],   # React dev server
    allow_headers=["Content-Type", "Authorization"],
    expose_headers=["Authorization"],
    supports_credentials=False,          # False because we use Bearer, not cookies
)

# ── Emission factors (mirrors frontend constants) ─────────────────────────────

EMISSION_FACTORS = {
    "diesel":      2.68,   # kg CO₂ per litre
    "petrol":      2.31,   # kg CO₂ per litre
    "natural_gas": 2.75,   # kg CO₂ per m³
    "electricity": 0.82,   # kg CO₂ per kWh
}

# ── DB helper ─────────────────────────────────────────────────────────────────

def get_db():
    """Open and return a fresh psycopg2 connection.
    Each route is responsible for closing it in its `finally` block.
    Never share connections across requests.
    """
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT"),
    )

# ── Health check ──────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({"message": "GreenCO2 Backend Running 🚀"}), 200

# ── Auth endpoints ────────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
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

        user_email   = (data.get("email", "") or "").strip().lower()
        password     = data.get("password", "")
        company_name = (data.get("company", "") or "Default Company").strip()

        # Basic input validation
        if not user_email or "@" not in user_email:
            return jsonify({"error": "Valid email is required"}), 400
        if not password or len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters"}), 400
        if not company_name:
            return jsonify({"error": "Company name is required"}), 400

        # Check for duplicate email
        cur.execute("SELECT id FROM users WHERE email = %s", (user_email,))
        if cur.fetchone():
            return jsonify({"error": "Email already registered"}), 409

        # Resolve or create company
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


@app.route("/api/login", methods=["POST"])
def login():
    """
    POST /api/login
    Body: { email, password }

    Returns a signed JWT token on success.
    Identity is the plain email string — simple and unambiguous.
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

        # Identity = email string.  No JSON encoding, no dict, no object.
        token = create_access_token(identity=user[0])
        logger.info("Login successful: %s", user_email)
        return jsonify({"token": token}), 200

    except Exception as e:
        logger.exception("Login error: %s", e)
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()

# ── Profile endpoints ─────────────────────────────────────────────────────────

@app.route("/api/profile", methods=["GET"])
@jwt_required()
def get_profile():
    """
    GET /api/profile
    Header: Authorization: Bearer <token>

    Returns the current user's profile data.
    Joins users + companies to resolve the company name.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        # get_jwt_identity() returns the plain email string set during login
        user_email = get_jwt_identity()

        cur.execute(
            """
            SELECT u.email, c.name AS company, u.industry, u.location
            FROM   users     u
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


@app.route("/api/profile", methods=["PUT"])
@jwt_required()
def update_profile():
    """
    PUT /api/profile
    Header: Authorization: Bearer <token>
    Body:   { company, industry, location }

    Updates the mutable profile fields.  Email is immutable.
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
            (
                data.get("industry"),
                data.get("location"),
                user_email,
            ),
        )

        # If a company name was supplied, update the companies table as well
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

# ── Emissions endpoint ────────────────────────────────────────────────────────

@app.route("/api/emissions", methods=["POST"])
@jwt_required()
def log_emissions():
    """
    POST /api/emissions
    Header: Authorization: Bearer <token>
    Body:
    {
        "date":    "YYYY-MM-DD",
        "sources": [
            { "type": "diesel",      "amount": 100.0 },
            { "type": "electricity", "amount": 50.0  }
        ]
    }

    Calculates CO₂ for each source using server-side emission factors,
    inserts one row per source into emission_sources, and returns the total.

    Validation:
    - date must be present
    - sources must be a non-empty list
    - each source type must be one of the known keys in EMISSION_FACTORS
    - each amount must be a positive number
    - sanity cap: amount must be ≤ 1,000,000 per source
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        # Resolve company_id
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        date    = (data.get("date") or "").strip()
        sources = data.get("sources", [])

        # ── Validation ────────────────────────────────────────────────────────
        if not date:
            return jsonify({"error": "date is required (YYYY-MM-DD)"}), 400

        if not isinstance(sources, list) or len(sources) == 0:
            return jsonify({"error": "sources must be a non-empty list"}), 400

        validation_errors = []
        for i, src in enumerate(sources):
            src_type   = src.get("type", "")
            src_amount = src.get("amount")

            if src_type not in EMISSION_FACTORS:
                validation_errors.append(
                    f"Row {i+1}: unknown source type '{src_type}'. "
                    f"Valid types: {list(EMISSION_FACTORS.keys())}"
                )
                continue

            try:
                amt = float(src_amount)
            except (TypeError, ValueError):
                validation_errors.append(f"Row {i+1}: amount must be a number")
                continue

            if amt <= 0:
                validation_errors.append(f"Row {i+1}: amount must be > 0")
            elif amt > 1_000_000:
                validation_errors.append(f"Row {i+1}: amount exceeds sanity limit (1,000,000)")

        if validation_errors:
            return jsonify({"error": "Validation failed", "details": validation_errors}), 400

        # ── Insert rows + calculate total ─────────────────────────────────────
        total_co2 = 0.0

        for src in sources:
            src_type = src["type"]
            amount   = float(src["amount"])
            emission = round(amount * EMISSION_FACTORS[src_type], 4)
            total_co2 += emission

            cur.execute(
                """
                INSERT INTO emission_sources
                    (company_id, date, source_type, amount, emission)
                VALUES (%s, %s, %s, %s, %s)
                """,
                (company_id, date, src_type, amount, emission),
            )

        conn.commit()
        logger.info(
            "Emissions logged: user=%s company_id=%s date=%s total_co2=%.4f",
            user_email, company_id, date, total_co2,
        )

        return jsonify({
            "message":   "Emissions recorded successfully",
            "date":      date,
            "total_co2": round(total_co2, 4),
        }), 201

    except Exception as e:
        conn.rollback()
        logger.exception("Log emissions error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

# ── Dashboard endpoint ────────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """
    GET /api/dashboard
    Header: Authorization: Bearer <token>

    Returns aggregated emission data for the authenticated user's company:
      - today_total   — sum of all emissions for today (float, kg CO₂)
      - monthly_total — sum of all emissions for the current calendar month
      - trend         — last 7 days, one { date, co2 } entry per day
      - by_source     — total per source_type across all time
      - alert         — "High emission" if today_total > 1000 else "Normal"

    All Decimal values from psycopg2 are cast to float before serialisation
    to avoid JSON TypeError.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        # Resolve company_id
        cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
        row = cur.fetchone()
        if not row:
            return jsonify({"error": "User not found"}), 404
        company_id = row[0]

        logger.info("Dashboard request: user=%s company_id=%s", user_email, company_id)

        # TODAY TOTAL
        cur.execute("""
            SELECT COALESCE(SUM(emission), 0)
            FROM emission_sources
            WHERE company_id = %s AND date = CURRENT_DATE
        """, (company_id,))
        today_total = float(cur.fetchone()[0])

        # MONTHLY TOTAL
        cur.execute("""
            SELECT COALESCE(SUM(emission), 0)
            FROM emission_sources
            WHERE company_id = %s
            AND DATE_TRUNC('month', date) = DATE_TRUNC('month', CURRENT_DATE)
        """, (company_id,))
        monthly_total = float(cur.fetchone()[0])

        # TREND — last 7 days (one row per day, zero-filled gaps handled client-side)
        cur.execute("""
            SELECT date, SUM(emission)
            FROM emission_sources
            WHERE company_id = %s
              AND date >= CURRENT_DATE - INTERVAL '6 days'
            GROUP BY date
            ORDER BY date
        """, (company_id,))
        trend = [
            {"date": str(r[0]), "co2": float(r[1] or 0)}
            for r in cur.fetchall()
        ]

        # SOURCE BREAKDOWN — grouped by source type, all-time
        cur.execute("""
            SELECT source_type, SUM(emission)
            FROM emission_sources
            WHERE company_id = %s
            GROUP BY source_type
            ORDER BY SUM(emission) DESC
        """, (company_id,))
        by_source = [
            {"type": r[0], "co2": float(r[1] or 0)}
            for r in cur.fetchall()
        ]

        # ALERT — simple threshold logic
        alert = "High emission" if today_total > 1000 else "Normal"

        return jsonify({
            "today_total":   today_total,
            "monthly_total": monthly_total,
            "trend":         trend,
            "by_source":     by_source,
            "alert":         alert,
        }), 200

    except Exception as e:
        logger.exception("Dashboard error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

# ── Legacy single-source emission calculator ─────────────────────────────────

@app.route("/calculate", methods=["POST"])
@jwt_required()
def calculate():
    """
    POST /calculate  (legacy endpoint — use /api/emissions instead)
    Header: Authorization: Bearer <token>
    Body:   { fuel: <float> }

    Computes CO₂ from diesel litres, stores it in emissions_data, returns result.
    Kept for backward compatibility.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        cur.execute(
            "SELECT company_id FROM users WHERE email = %s",
            (user_email,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "User not found"}), 404

        company_id = row[0]

        data = request.get_json(force=True)
        if not data:
            return jsonify({"error": "Request body must be JSON"}), 400

        try:
            fuel = float(data["fuel"])
        except (KeyError, TypeError, ValueError):
            return jsonify({"error": "fuel must be a valid number"}), 400

        if fuel <= 0:
            return jsonify({"error": "fuel must be a positive number"}), 400

        co2 = round(fuel * EMISSION_FACTORS["diesel"], 4)

        cur.execute(
            "INSERT INTO emissions_data (fuel_used, co2_emission, company_id) VALUES (%s, %s, %s)",
            (fuel, co2, company_id),
        )
        conn.commit()

        return jsonify({"co2_emission": co2}), 200

    except Exception as e:
        conn.rollback()
        logger.exception("Calculate error: %s", e)
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)