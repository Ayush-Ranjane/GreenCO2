from prophet import Prophet
import pickle
import os
from ml_engine.db.load_data import df
import pandas as pd
from datetime import datetime
import json

def train_all_models():
    print("🔄 Training started...")

    try:
        os.makedirs("models", exist_ok=True)

        companies = df['company_id'].unique()

        for company in companies:
            print(f"\n📊 Processing company: {company}")

            df_c = df[df['company_id'] == company][['ds', 'y']].copy()
            df_c = df_c.dropna()

            # 🔹 Skip if not enough data
            if df_c.shape[0] < 10:
                print(f"⚠️ Skipping {company} (too little data)")
                continue

            # 🔹 Ensure proper datetime format
            df_c['ds'] = pd.to_datetime(df_c['ds'])

            # 🔹 Sort data (IMPORTANT for Prophet)
            df_c = df_c.sort_values('ds')

            # 🔹 Train model
            model = Prophet(
                daily_seasonality=True,
                yearly_seasonality=True
            )

            model.fit(df_c)

            # 🔹 Save model
            model_path = f"models/model_{company}.pkl"

            with open(model_path, "wb") as f:
                pickle.dump(model, f)

            print(f"✅ Model saved: {model_path}")
            # 🔹 Predictions on training data (for accuracy)
            forecast = model.predict(df_c)

            # 🔹 Calculate simple error (MAE)
            df_c['yhat'] = forecast['yhat']
            mae = abs(df_c['y'] - df_c['yhat']).mean()

            metadata = {
                "company_id": int(company),
                "trained_at": datetime.now().strftime("%Y-%m-%d %H:%M:%S"),
                "data_points": int(df_c.shape[0]),
                "mae": round(mae, 2)
            }

            with open(f"models/meta_{company}.json", "w") as f:
                json.dump(metadata, f)

            print(f"📊 Metadata saved for {company}")

        print("\n🎯 All models processed successfully!")

    except Exception as e:
        print("❌ Training failed:", str(e))