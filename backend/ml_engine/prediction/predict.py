import os
import pickle
from functools import lru_cache


def predict_company(company_id, days=7):
    path = f"ml_engine/prediction/models/model_{company_id}.pkl"
    mtime = os.path.getmtime(path)
    return _predict_company_cached(company_id, days, mtime)


@lru_cache(maxsize=128)
def _predict_company_cached(company_id, days, model_mtime):
    path = f"ml_engine/prediction/models/model_{company_id}.pkl"
    with open(path, "rb") as f:
        model = pickle.load(f)

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    return forecast[['ds', 'yhat']].tail(days)

