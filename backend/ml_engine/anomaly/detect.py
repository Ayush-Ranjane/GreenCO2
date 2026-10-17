import pickle
import os
import logging
import pandas as pd

from ml_engine.paths import get_anomaly_model_path
from ml_engine.db.load_data import load_company_df

logger = logging.getLogger(__name__)


def detect_company_anomalies(company_id):
    """
    Detect anomalies in daily emissions for company_id.
    Auto-trains anomaly model if not yet trained.
    Returns list of dicts: [{'ds': 'YYYY-MM-DD', 'y': float, 'anomaly': 1 or -1}, ...]
    """
    company_id = int(company_id)
    path = get_anomaly_model_path(company_id)

    if not os.path.exists(path):
        from ml_engine.anomaly.train_anomaly import train_company_anomaly_model
        logger.info("Anomaly model not found for company %s, attempting on-demand training", company_id)
        res = train_company_anomaly_model(company_id)
        if not res or res.get("status") != "trained":
            return []

    if not os.path.exists(path):
        return []

    try:
        with open(path, "rb") as f:
            model = pickle.load(f)

        df_c = load_company_df(company_id)
        if df_c.empty:
            return []

        df_c = df_c.dropna().sort_values('ds')
        if df_c.empty:
            return []

        X = df_c[['y']]
        preds = model.predict(X)

        df_c['anomaly'] = preds.tolist()
        df_c['ds'] = df_c['ds'].astype(str)
        df_c['y'] = df_c['y'].astype(float)

        return df_c.to_dict(orient="records")

    except Exception as e:
        logger.warning("Error detecting anomalies for company %s: %s. Attempting clean retrain.", company_id, e)
        try:
            from ml_engine.anomaly.train_anomaly import train_company_anomaly_model
            res = train_company_anomaly_model(company_id)
            if res and res.get("status") == "trained" and os.path.exists(path):
                with open(path, "rb") as f:
                    model = pickle.load(f)
                df_c = load_company_df(company_id)
                if not df_c.empty:
                    df_c = df_c.dropna().sort_values('ds')
                    if not df_c.empty:
                        X = df_c[['y']]
                        preds = model.predict(X)
                        df_c['anomaly'] = preds.tolist()
                        df_c['ds'] = df_c['ds'].astype(str)
                        df_c['y'] = df_c['y'].astype(float)
                        return df_c.to_dict(orient="records")
        except Exception as retry_err:
            logger.exception("Anomaly retrain retry failed for company %s: %s", company_id, retry_err)
        return []