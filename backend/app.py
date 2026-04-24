from flask import Flask, request, jsonify
from flask_bcrypt import Bcrypt
from flask_jwt_extended import create_access_token, jwt_required, get_jwt_identity, JWTManager
from flask_cors import CORS
import os
from dotenv import load_dotenv
import psycopg2
load_dotenv()

conn = psycopg2.connect(
    dbname=os.getenv("DB_NAME"),
    user=os.getenv("DB_USER"),
    password=os.getenv("DB_PASSWORD"),
    host=os.getenv("DB_HOST"),
    port=os.getenv("DB_PORT")
)

cur = conn.cursor()

def get_db():
    return psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST"),
        port=os.getenv("DB_PORT")
    )

app = Flask(__name__)

# ✅ CONFIG AFTER APP
app.config["JWT_SECRET_KEY"] = "super-secret-key"

# ✅ THEN INITIALIZE
jwt = JWTManager(app)
bcrypt = Bcrypt(app)
CORS(app)

# Basic CO2 calculation
def calculate_co2(fuel):
    emission_factor = 2.68  # diesel
    return fuel * emission_factor

@app.route('/')
def home():
    return "GreenCO2 Backend Running 🚀"



# Calucalate CO2 and save to DB

@app.route('/calculate', methods=['POST'])
@jwt_required()
def calculate():
    conn = get_db()
    cur = conn.cursor()

    try:
        user = get_jwt_identity()
        company_id = user["company_id"]

        data = request.json
        fuel = data['fuel']

        co2 = fuel * 2.68

        cur.execute("""
            INSERT INTO emissions_data (fuel_used, co2_emission, company_id)
            VALUES (%s, %s, %s)
        """, (fuel, co2, company_id))

        conn.commit()

        return jsonify({"co2_emission": co2})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)})

    finally:
        cur.close()
        conn.close()
    


# Registration and Login Endpoints

@app.route('/api/register', methods=['POST'])
def register():
    conn = get_db()
    cur = conn.cursor()

    try:
        data = request.json
        email = data['email'].strip().lower()
        password = data['password']
        company_name = data.get('company', 'Default Company')

        # check if company exists
        cur.execute("SELECT id FROM companies WHERE name=%s", (company_name,))
        company = cur.fetchone()

        if not company:
            cur.execute("INSERT INTO companies (name) VALUES (%s) RETURNING id", (company_name,))
            company_id = cur.fetchone()[0]
        else:
            company_id = company[0]

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

        cur.execute("""
            INSERT INTO users (email, password, company_id)
            VALUES (%s, %s, %s)
        """, (email, hashed_pw, company_id))

        conn.commit()

        return jsonify({"message": "User registered with company"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)})

    finally:
        cur.close()
        conn.close()

@app.route('/api/login', methods=['POST'])
def login():
    conn = get_db()
    cur = conn.cursor()

    try:
        data = request.json
        email = data['email'].strip().lower()
        password = data['password']

        cur.execute("SELECT email, password, company_id FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user and bcrypt.check_password_hash(user[1], password):
            token = create_access_token(identity={
                "email": user[0],
                "company_id": user[2]
            })
            return jsonify({"token": token})

        return jsonify({"error": "Invalid credentials"}), 401

    finally:
        cur.close()
        conn.close()

@app.route('/api/profile', methods=['GET'])
@jwt_required()
def get_profile():
    conn = get_db()
    cur = conn.cursor()

    try:
        email = get_jwt_identity()

        cur.execute(
            "SELECT email, company, industry, location FROM users WHERE email=%s",
            (email,)
        )

        user = cur.fetchone()

        return jsonify({
            "email": user[0],
            "company": user[1],
            "industry": user[2],
            "location": user[3]
        })

    finally:
        cur.close()
        conn.close()

@app.route('/api/profile', methods=['PUT'])
@jwt_required()
def update_profile():
    conn = get_db()
    cur = conn.cursor()

    try:
        email = get_jwt_identity()
        data = request.json

        cur.execute("""
            UPDATE users
            SET company=%s, industry=%s, location=%s
            WHERE email=%s
        """, (
            data.get("company"),
            data.get("industry"),
            data.get("location"),
            email
        ))

        conn.commit()

        return jsonify({"message": "Profile updated successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)})

    finally:
        cur.close()
        conn.close()

@app.route('/api/dashboard', methods=['GET'])
@jwt_required()
def dashboard():
    conn = get_db()
    cur = conn.cursor()

    try:
        user = get_jwt_identity()
        company_id = user["company_id"]

        # get total CO2 and fuel for this company
        cur.execute("""
            SELECT 
                COALESCE(SUM(co2_emission), 0),
                COALESCE(SUM(fuel_used), 0)
            FROM emissions_data
            WHERE company_id = %s
        """, (company_id,))

        data = cur.fetchone()

        return jsonify({
            "total_co2": data[0],
            "total_fuel": data[1]
        })

    finally:
        cur.close()
        conn.close()

if __name__ == "__main__":
    app.run(debug=True)