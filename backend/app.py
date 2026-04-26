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
- JWT_JSON_KEY is NOT a valid Flask-JWT-Extended config key (removed)
- verify_jwt_in_request() is NOT called inside @jwt_required() routes (removed)
- `from numpy import identity` removed  — it shadowed the local variable
- Top-level `import email` removed     — it conflicts with the `email` variable
"""

import os

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

# ── App ─────────────────────────────────────────────────────────────────────

app = Flask(__name__)

# JWT — identity is stored as a plain email string (no JSON encoding needed)
app.config["JWT_SECRET_KEY"]      = os.getenv("JWT_SECRET_KEY", "change-me-in-production")
app.config["JWT_IDENTITY_CLAIM"]  = "sub"
app.config["JWT_TOKEN_LOCATION"]  = ["headers"]
app.config["JWT_HEADER_NAME"]     = "Authorization"
app.config["JWT_HEADER_TYPE"]     = "Bearer"

jwt     = JWTManager(app)
bcrypt  = Bcrypt(app)

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

# ── DB helper ────────────────────────────────────────────────────────────────

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

# ── Helpers ──────────────────────────────────────────────────────────────────

def calculate_co2(fuel_litres):
    """Convert diesel fuel litres → kg of CO₂ (emission factor 2.68 kg/L)."""
    return fuel_litres * 2.68

# ── Health check ─────────────────────────────────────────────────────────────

@app.route("/")
def home():
    return jsonify({"message": "GreenCO2 Backend Running 🚀"}), 200

# ── Auth endpoints ───────────────────────────────────────────────────────────

@app.route("/api/register", methods=["POST"])
def register():
    """
    POST /api/register
    Body: { email, password, company }

    Creates a company row if it doesn't exist, then inserts a new user.
    Passwords are hashed with bcrypt before storage.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        data         = request.get_json(force=True)
        user_email   = data["email"].strip().lower()
        password     = data["password"]
        company_name = data.get("company", "Default Company")

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
            company_id = cur.fetchone()[0]

        hashed_pw = bcrypt.generate_password_hash(password).decode("utf-8")

        cur.execute(
            "INSERT INTO users (email, password, company_id) VALUES (%s, %s, %s)",
            (user_email, hashed_pw, company_id),
        )
        conn.commit()

        return jsonify({"message": "User registered successfully"}), 201

    except Exception as e:
        conn.rollback()
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
        data       = request.get_json(force=True)
        user_email = data["email"].strip().lower()
        password   = data["password"]

        cur.execute(
            "SELECT email, password FROM users WHERE email = %s",
            (user_email,),
        )
        user = cur.fetchone()

        if not user or not bcrypt.check_password_hash(user[1], password):
            return jsonify({"error": "Invalid credentials"}), 401

        # Identity = email string.  No JSON encoding, no dict, no object.
        token = create_access_token(identity=user[0])
        return jsonify({"token": token}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()

# ── Profile endpoints ────────────────────────────────────────────────────────

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
        return jsonify({"message": "Profile updated successfully"}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

# ── Dashboard endpoint ───────────────────────────────────────────────────────

@app.route("/api/dashboard", methods=["GET"])
@jwt_required()
def dashboard():
    """
    GET /api/dashboard
    Header: Authorization: Bearer <token>

    Returns aggregated CO₂ / fuel totals for the authenticated user's company.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()

        # Resolve company_id from email
        cur.execute(
            "SELECT company_id FROM users WHERE email = %s",
            (user_email,),
        )
        row = cur.fetchone()

        if not row:
            return jsonify({"error": "User not found"}), 404

        company_id = row[0]

        cur.execute(
            """
            SELECT
                COALESCE(SUM(co2_emission), 0) AS total_co2,
                COALESCE(SUM(fuel_used),    0) AS total_fuel
            FROM emissions_data
            WHERE company_id = %s
            """,
            (company_id,),
        )
        data = cur.fetchone()

        return jsonify({
            "total_co2":  float(data[0]),
            "total_fuel": float(data[1]),
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()

# ── Calculate & store emission ────────────────────────────────────────────────

@app.route("/calculate", methods=["POST"])
@jwt_required()
def calculate():
    """
    POST /calculate
    Header: Authorization: Bearer <token>
    Body:   { fuel: <float> }

    Computes CO₂, stores it, returns the result.
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
        fuel = float(data["fuel"])
        co2  = calculate_co2(fuel)

        cur.execute(
            "INSERT INTO emissions_data (fuel_used, co2_emission, company_id) VALUES (%s, %s, %s)",
            (fuel, co2, company_id),
        )
        conn.commit()

        return jsonify({"co2_emission": co2}), 200

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)}), 400

    finally:
        cur.close()
        conn.close()

# ── Entry point ───────────────────────────────────────────────────────────────

if __name__ == "__main__":
    app.run(debug=True, port=5000)