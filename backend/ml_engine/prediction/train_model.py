from prophet import Prophet
import pickle
import os
import logging
import pandas as pd
from datetime import datetime
import json

from ml_engine.paths import (
    get_prediction_model_path,
    get_prediction_meta_path,
    PREDICTION_MODELS_DIR,
)
from ml_engine.db.load_data import load_company_df, load_df

logger = logging.getLogger(__name__)


def train_company_model(company_id: int | str) -> dict:
    """
    Train a Prophet forecast model for a single company on demand.
    Returns metadata dict.
    """
    company_id = int(company_id)
    logger.info("Training Prophet model for company_id=%s", company_id)

    try:
        df_c = load_company_df(company_id)
        if df_c.empty:
            logger.info("No data for company_id=%s", company_id)
            return {
                "company_id": company_id,
                "status": "insufficient_data",
                "data_points": 0,
                "min_required": 3,
                "message": "No emission data logged yet. Please log daily emissions to train the model.",
            }

        df_c = df_c.dropna()
        num_points = int(df_c.shape[0])

        if num_points < 3:
            logger.info("Only %d points for company_id=%s (minimum 3 required)", num_points, company_id)
            return {
                "company_id": company_id,
                "status": "insufficient_data",
                "data_points": num_points,
                "min_required": 3,
                "message": f"Only {num_points} day(s) recorded. At least 3 daily emission logs are needed for forecasting.",
            }

        df_c['ds'] = pd.to_datetime(df_c['ds'])
        df_c = df_c.sort_values('ds')

        # Configure seasonality appropriately based on available data size
        model = Prophet(
            daily_seasonality=False,
            weekly_seasonality=(num_points >= 14),
            yearly_seasonality=(num_points >= 365),
        )
        model.fit(df_c)

        # Save model
        model_path = get_prediction_model_path(company_id)
        with open(model_path, "wb") as f:
            pickle.dump(model, f)

        # Compute MAE
        forecast = model.predict(df_c)
        df_c['yhat'] = forecast['yhat']
        mae = float(abs(df_c['y'] - df_c['yhat']).mean())

        metadata = {
            "company_id": company_id,
            "status": "trained",
            "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_points": num_points,
            "mae": round(mae, 2),
        }

        meta_path = get_prediction_meta_path(company_id)
        with open(meta_path, "w") as f:
            json.dump(metadata, f)

        logger.info("Model & metadata saved for company_id=%s (MAE=%.2f)", company_id, mae)
        return metadata

    except Exception as exc:
        logger.exception("Failed training model for company_id=%s: %s", company_id, exc)
        return {
            "company_id": company_id,
            "status": "error",
            "error": str(exc),
        }


def train_all_models():
    """Train Prophet & Anomaly models for all companies with logged data."""
    logger.info("Retrain job started.")

    try:
        df = load_df()
        if df.empty or 'company_id' not in df.columns:
            logger.info("No companies found to retrain.")
            return

        from ml_engine.anomaly.train_anomaly import train_company_anomaly_model

        companies = df['company_id'].unique()
        for company in companies:
            try:
                train_company_model(company)
                train_company_anomaly_model(company)
            except Exception as e:
                logger.exception("Error retraining company %s: %s", company, e)

        logger.info("Retrain job completed — %d companies processed.", len(companies))

    except Exception as exc:
        logger.exception("Retrain job failed: %s", exc)