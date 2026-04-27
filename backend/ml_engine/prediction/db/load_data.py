import pandas as pd
import psycopg2
import dotenv
import os
dotenv.load_dotenv()
DB_NAME = os.getenv("DB_NAME")
DB_user = os.getenv("DB_USER")
DB_password = os.getenv("DB_PASSWORD")

conn = psycopg2.connect(
    dbname=DB_NAME,
    user=DB_user,
    password=DB_password,
    host="localhost",
    port="5432"
)

query = """
SELECT 
    company_id,
    date,
    SUM(emission) AS total_emission
FROM emission_sources
GROUP BY company_id, date
ORDER BY company_id, date;
"""

df = pd.read_sql(query, conn)

# Rename for Prophet
df.rename(columns={
    'date': 'ds',
    'total_emission': 'y'
}, inplace=True)

print(df.head())