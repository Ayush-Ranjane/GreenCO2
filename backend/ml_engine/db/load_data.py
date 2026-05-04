import pandas as pd
import psycopg2
import dotenv
import os

dotenv.load_dotenv()

_QUERY = """
SELECT
    company_id,
    date,
    SUM(emission) AS total_emission
FROM emission_sources
GROUP BY company_id, date
ORDER BY company_id, date;
"""


def load_df() -> pd.DataFrame:
    """
    Open a fresh DB connection, load emission data, close the connection,
    and return the DataFrame ready for Prophet (columns: company_id, ds, y).
    Called on every retrain so the model always uses up-to-date data.
    """
    conn = psycopg2.connect(
        dbname=os.getenv("DB_NAME"),
        user=os.getenv("DB_USER"),
        password=os.getenv("DB_PASSWORD"),
        host=os.getenv("DB_HOST", "localhost"),
        port=os.getenv("DB_PORT", "5432"),
        sslmode=os.getenv("DB_SSLMODE", "prefer"),
    )
    try:
        frame = pd.read_sql(_QUERY, conn)
    finally:
        conn.close()

    frame.rename(columns={"date": "ds", "total_emission": "y"}, inplace=True)
    return frame