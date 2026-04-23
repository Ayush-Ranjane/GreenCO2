from flask import Flask, request, jsonify
import psycopg2

import os
from dotenv import load_dotenv

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

# Basic CO2 calculation
def calculate_co2(fuel):
    emission_factor = 2.68  # diesel
    return fuel * emission_factor

@app.route('/')
def home():
    return "GreenCO2 Backend Running 🚀"

@app.route('/calculate', methods=['POST'])
@app.route('/calculate', methods=['POST'])
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

if __name__ == "__main__":
    app.run(debug=True)