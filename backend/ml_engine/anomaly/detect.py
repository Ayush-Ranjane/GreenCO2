import pickle
import pandas as pd
from ml_engine.db.load_data import df

def detect_company_anomalies(company_id):
    with open(f"ml_engine/anomaly/models/anomaly_{company_id}.pkl", "rb") as f:
        model = pickle.load(f)

    df_c = df[df['company_id'] == company_id][['ds', 'y']].copy()
    df_c = df_c.dropna()
    df_c = df_c.sort_values('ds')

    X = df_c[['y']]

    preds = model.predict(X)

    df_c['anomaly'] = preds  # -1 or 1

    return df_c.to_dict(orient="records")