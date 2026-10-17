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
    try:
        from app.utils.db import get_db
        conn = get_db()
    except Exception:
        database_url = os.getenv("DATABASE_URL")
        if database_url:
            if database_url.startswith("postgres://"):
                database_url = database_url.replace("postgres://", "postgresql://", 1)
            conn = psycopg2.connect(database_url)
        else:
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


def load_company_df(company_id: int) -> pd.DataFrame:
    """
    Load daily total emissions for a specific company.
    Returns DataFrame with columns: ds, y.
    """
    query = """
    SELECT
        date AS ds,
        SUM(emission) AS y
    FROM emission_sources
    WHERE company_id = %s
    GROUP BY date
    ORDER BY date;
    """
    try:
        from app.utils.db import get_db
        conn = get_db()
    except Exception:
        conn = psycopg2.connect(
            dbname=os.getenv("DB_NAME"),
            user=os.getenv("DB_USER"),
            password=os.getenv("DB_PASSWORD"),
            host=os.getenv("DB_HOST", "localhost"),
            port=os.getenv("DB_PORT", "5432"),
            sslmode=os.getenv("DB_SSLMODE", "prefer"),
        )
    try:
        frame = pd.read_sql(query, conn, params=(int(company_id),))
    finally:
        conn.close()

    return frame