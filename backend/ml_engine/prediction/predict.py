import os
import pickle
import logging
from functools import lru_cache

from ml_engine.paths import get_prediction_model_path

logger = logging.getLogger(__name__)


def predict_company(company_id, days=7):
    """
    Get Prophet forecast for company_id.
    If the model does not exist on disk, attempt to train it on the fly.
    Returns DataFrame with columns ['ds', 'yhat'] or None if insufficient data.
    """
    company_id = int(company_id)
    path = get_prediction_model_path(company_id)

    if not os.path.exists(path):
        from ml_engine.prediction.train_model import train_company_model
        logger.info("Model not found for company %s, attempting on-demand training", company_id)
        res = train_company_model(company_id)
        if not res or res.get("status") != "trained":
            logger.info("Unable to train model for company %s: %s", company_id, res)
            return None

    if not os.path.exists(path):
        return None

    try:
        mtime = os.path.getmtime(path)
        return _predict_company_cached(company_id, days, mtime, path)
    except Exception as e:
        logger.warning(
            "Error predicting with cached model for company %s: %s. Attempting clean retrain.",
            company_id, e
        )
        try:
            from ml_engine.prediction.train_model import train_company_model
            res = train_company_model(company_id)
            if res and res.get("status") == "trained" and os.path.exists(path):
                mtime = os.path.getmtime(path)
                return _predict_company_cached(company_id, days, mtime, path)
        except Exception as retry_err:
            logger.exception("Model retrain retry failed for company %s: %s", company_id, retry_err)
        return None


@lru_cache(maxsize=128)
def _predict_company_cached(company_id, days, model_mtime, model_path):
    with open(model_path, "rb") as f:
        model = pickle.load(f)

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    result = forecast[['ds', 'yhat']].tail(days).copy()
    result['yhat'] = result['yhat'].clip(lower=0.0)
    return result
