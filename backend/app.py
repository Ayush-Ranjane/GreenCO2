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
    try:
        data = request.json
        fuel = data['fuel']

        emission_factor = 2.68
        co2 = fuel * emission_factor

        cur.execute(
            "INSERT INTO emissions_data (fuel_used, co2_emission) VALUES (%s, %s)",
            (fuel, co2)
        )

        conn.commit()

        return jsonify({
            "fuel_used": fuel,
            "co2_emission": co2,
            "message": "Data saved successfully"
        })

    except Exception as e:
        conn.rollback()   # 🔥 VERY IMPORTANT
        return jsonify({"error": str(e)})
    


# Registration and Login Endpoints

    
@app.route('/api/register', methods=['POST'])
def register():
    try:
        conn.rollback()

        data = request.json
        email = data['email']
        password = data['password']

        # check existing user
        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        if cur.fetchone():
            return jsonify({"error": "User already exists"}), 400

        hashed_pw = bcrypt.generate_password_hash(password).decode('utf-8')

        cur.execute(
            "INSERT INTO users (email, password) VALUES (%s, %s)",
            (email, hashed_pw)
        )
        conn.commit()

        return jsonify({"message": "Registered successfully"})

    except Exception as e:
        conn.rollback()
        return jsonify({"error": str(e)})
    
@app.route('/api/login', methods=['POST'])
def login():
    try:
        conn.rollback()

        data = request.json
        email = data['email']
        password = data['password']

        cur.execute("SELECT * FROM users WHERE email=%s", (email,))
        user = cur.fetchone()

        if user and bcrypt.check_password_hash(user[2], password):
            token = create_access_token(identity=email)
            return jsonify({"token": token})

        return jsonify({"error": "Invalid credentials"}), 401

    except Exception as e:
        return jsonify({"error": str(e)})

if __name__ == "__main__":
    app.run(debug=True)