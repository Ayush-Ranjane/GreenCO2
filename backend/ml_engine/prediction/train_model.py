from prophet import Prophet
import pickle
import os
import logging
import pandas as pd
from datetime import datetime
import json

logger = logging.getLogger(__name__)


def train_all_models():
    logger.info("Retrain job started.")

    try:
        # Load fresh data on every run — avoids stale startup snapshot
        from ml_engine.db.load_data import load_df
        df = load_df()

        MODEL_DIR = "ml_engine/prediction/models"
        os.makedirs(MODEL_DIR, exist_ok=True)

        companies = df['company_id'].unique()

        for company in companies:
            logger.info("Processing company_id=%s", company)

            df_c = df[df['company_id'] == company][['ds', 'y']].copy()
            df_c = df_c.dropna()

            # Skip if not enough data
            if df_c.shape[0] < 10:
                logger.warning("Skipping company_id=%s — only %d data points", company, df_c.shape[0])
                continue

            # Ensure proper datetime format
            df_c['ds'] = pd.to_datetime(df_c['ds'])

            # Sort data (required by Prophet)
            df_c = df_c.sort_values('ds')

            # Train model
            model = Prophet(
                daily_seasonality=True,
                yearly_seasonality=True
            )
            model.fit(df_c)

            # Save model
            model_path = f"{MODEL_DIR}/model_{company}.pkl"
            with open(model_path, "wb") as f:
                pickle.dump(model, f)

            logger.info("Model saved: %s", model_path)

            # Predictions on training data (for MAE)
            forecast = model.predict(df_c)
            df_c['yhat'] = forecast['yhat']
            mae = abs(df_c['y'] - df_c['yhat']).mean()

            metadata = {
                "company_id": int(company),
                "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data_points": int(df_c.shape[0]),
                "mae": round(mae, 2),
            }

            with open(f"{MODEL_DIR}/meta_{company}.json", "w") as f:
                json.dump(metadata, f)

            logger.info("Metadata saved for company_id=%s (MAE=%.2f)", company, mae)

        logger.info("Retrain job completed — %d companies processed.", len(companies))

    except Exception as exc:
        logger.exception("Retrain job failed: %s", exc)