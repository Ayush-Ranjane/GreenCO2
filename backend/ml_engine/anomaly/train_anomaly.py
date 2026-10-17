from sklearn.ensemble import IsolationForest
import pandas as pd
import pickle
import os
import json
import logging
from datetime import datetime

from ml_engine.paths import (
    get_anomaly_model_path,
    get_anomaly_meta_path,
    ANOMALY_MODELS_DIR,
)
from ml_engine.db.load_data import load_company_df, load_df

logger = logging.getLogger(__name__)


def train_company_anomaly_model(company_id: int | str) -> dict:
    """
    Train an Isolation Forest anomaly model for a single company.
    Returns metadata dict.
    """
    company_id = int(company_id)
    logger.info("Training Isolation Forest for company_id=%s", company_id)

    try:
        df_c = load_company_df(company_id)
        if df_c.empty:
            return {
                "company_id": company_id,
                "status": "insufficient_data",
                "data_points": 0,
            }

        df_c = df_c.dropna()
        num_points = int(df_c.shape[0])

        if num_points < 3:
            return {
                "company_id": company_id,
                "status": "insufficient_data",
                "data_points": num_points,
            }

        df_c = df_c.sort_values('ds')
        X = df_c[['y']]

        model = IsolationForest(
            n_estimators=100,
            contamination=0.05 if num_points >= 20 else 0.1,
            random_state=42
        )
        model.fit(X)

        path = get_anomaly_model_path(company_id)
        with open(path, "wb") as f:
            pickle.dump(model, f)

        preds = model.predict(X)
        anomalies = int((preds == -1).sum())

        meta = {
            "company_id": company_id,
            "status": "trained",
            "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_points": num_points,
            "anomalies_detected": anomalies,
        }

        meta_path = get_anomaly_meta_path(company_id)
        with open(meta_path, "w") as f:
            json.dump(meta, f)

        logger.info("Anomaly model saved for company_id=%s (%d anomalies detected)", company_id, anomalies)
        return meta

    except Exception as exc:
        logger.exception("Failed training anomaly model for company_id=%s: %s", company_id, exc)
        return {
            "company_id": company_id,
            "status": "error",
            "error": str(exc),
        }


def train_all_anomaly_models():
    """Train anomaly models for all companies."""
    try:
        df = load_df()
        if df.empty or 'company_id' not in df.columns:
            return

        companies = df['company_id'].unique()
        for company in companies:
            try:
                train_company_anomaly_model(company)
            except Exception as e:
                logger.exception("Error training anomaly model for company %s: %s", company, e)

    except Exception as exc:
        logger.exception("Retrain anomaly failed: %s", exc)