from sklearn.ensemble import IsolationForest
import pandas as pd
import pickle
import os
import json
from datetime import datetime
from ml_engine.db.load_data import df

def train_all_anomaly_models():
    print("🔄 Training anomaly models...")

    os.makedirs("ml_engine/anomaly/models", exist_ok=True)

    companies = df['company_id'].unique()

    for company in companies:
        print(f"\n📊 Company: {company}")

        df_c = df[df['company_id'] == company][['ds', 'y']].copy()
        df_c = df_c.dropna()

        if df_c.shape[0] < 10:
            print("⚠️ Skipping (not enough data)")
            continue

        df_c = df_c.sort_values('ds')

        # Only use emission values
        X = df_c[['y']]

        model = IsolationForest(
            n_estimators=100,
            contamination=0.05,
            random_state=42
        )

        model.fit(X)

        # Save model
        path = f"ml_engine/anomaly/models/anomaly_{company}.pkl"
        with open(path, "wb") as f:
            pickle.dump(model, f)

        # Detect anomalies for metadata
        preds = model.predict(X)
        anomalies = (preds == -1).sum()

        meta = {
            "company_id": int(company),
            "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
            "data_points": int(df_c.shape[0]),
            "anomalies_detected": int(anomalies)
        }

        with open(f"ml_engine/anomaly/models/meta_{company}.json", "w") as f:
            json.dump(meta, f)

        print(f"✅ Saved anomaly model for {company}")

    print("🎯 Done!")