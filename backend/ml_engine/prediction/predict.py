import pickle
def predict_company(company_id, days=7):
    with open(f"ml_engine/prediction/models/model_{company_id}.pkl", "rb") as f:
        model = pickle.load(f)

    future = model.make_future_dataframe(periods=days)
    forecast = model.predict(future)

    return forecast[['ds', 'yhat']].tail(days)

