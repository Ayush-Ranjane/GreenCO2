"""
app/routes/ml_routes.py — ML Inference Endpoints
=================================================
Routes:
    GET  /predict      — N-day emission forecast via Prophet
    GET  /model-info   — model metadata JSON for the current user's company
    GET  /anomaly      — anomaly detection results via Isolation Forest
    POST /retrain      — manually trigger model retraining for user's company or all

All ML logic lives in ml_engine/ — these routes authenticate the request,
resolve company_id, delegate to ml_engine, and return clean JSON.
"""

import json
import os
import logging

from flask import Blueprint, request, jsonify
from flask_jwt_extended import jwt_required, get_jwt_identity

from app.utils.db import get_db

logger = logging.getLogger(__name__)
ml_bp = Blueprint("ml", __name__)


def _get_company_id(cur, user_email: str):
    """Resolve company_id from user email. Returns (company_id, error_response)."""
    cur.execute("SELECT company_id FROM users WHERE email = %s", (user_email,))
    row = cur.fetchone()
    if not row:
        return None, (jsonify({"error": "User not found"}), 404)
    return row[0], None


# ── GET /predict ──────────────────────────────────────────────────────────────

@ml_bp.route("/predict", methods=["GET"])
@jwt_required()
def predict():
    """
    GET /predict?days=7
    Header: Authorization: Bearer <token>

    Returns Prophet model predictions for the next N days.
    Response: { company_id, days, prediction: [{ ds, yhat }, ...] }
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        company_id, err = _get_company_id(cur, user_email)
        if err:
            return err

        days = request.args.get("days", default=7, type=int)

        from ml_engine.prediction.predict import predict_company
        result = predict_company(company_id, days)

        if result is None or (hasattr(result, "empty") and result.empty):
            return jsonify({
                "company_id": company_id,
                "days":       days,
                "prediction": [],
                "status":     "insufficient_data",
                "message":    "At least 3 days of emission logs are required to forecast trends.",
            }), 200

        # DataFrame or list of dicts — normalize to list
        data = result.to_dict(orient="records") if hasattr(result, "to_dict") else result

        # Convert ds to date string
        for item in data:
            if hasattr(item['ds'], 'strftime'):
                item['ds'] = item['ds'].strftime("%Y-%m-%d")
            else:
                item['ds'] = str(item['ds'])[:10]
            if 'yhat' in item:
                item['yhat'] = max(0.0, float(item['yhat']))

        return jsonify({
            "company_id": company_id,
            "days":       days,
            "prediction": data,
            "status":     "trained",
        }), 200

    except Exception as e:
        logger.exception("Predict error: %s", e)
        return jsonify({"error": str(e), "prediction": []}), 500

    finally:
        cur.close()
        conn.close()


# ── GET /model-info ───────────────────────────────────────────────────────────

@ml_bp.route("/model-info", methods=["GET"])
@jwt_required()
def model_info():
    """
    GET /model-info
    Header: Authorization: Bearer <token>

    Returns the Prophet model metadata JSON for the company.
    If the model has not been trained yet, attempts automatic on-demand training.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        company_id, err = _get_company_id(cur, user_email)
        if err:
            return err

        from ml_engine.paths import get_prediction_meta_path, get_prediction_model_path
        from ml_engine.prediction.train_model import train_company_model

        meta_path = get_prediction_meta_path(company_id)
        model_path = get_prediction_model_path(company_id)
        if not os.path.exists(meta_path) or not os.path.exists(model_path):
            logger.info("Model or metadata not found for company %s — attempting on-demand training", company_id)
            meta = train_company_model(company_id)
            return jsonify(meta), 200

        try:
            with open(meta_path, "r") as f:
                meta = json.load(f)
            return jsonify(meta), 200
        except Exception:
            logger.info("Corrupt metadata found for company %s — re-training", company_id)
            meta = train_company_model(company_id)
            return jsonify(meta), 200

    except Exception as e:
        logger.exception("Model info error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── GET /anomaly ──────────────────────────────────────────────────────────────

@ml_bp.route("/anomaly", methods=["GET"])
@jwt_required()
def anomaly():
    """
    GET /anomaly
    Header: Authorization: Bearer <token>

    Returns Isolation Forest anomaly detection results.
    Response: { company_id, anomalies: [{ ds, y, anomaly }, ...] }
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        company_id, err = _get_company_id(cur, user_email)
        if err:
            return err

        from ml_engine.anomaly.detect import detect_company_anomalies
        result = detect_company_anomalies(company_id)

        return jsonify({
            "company_id": company_id,
            "anomalies":  result or [],
        }), 200

    except Exception as e:
        logger.exception("Anomaly detection error: %s", e)
        return jsonify({"error": str(e), "anomalies": []}), 500

    finally:
        cur.close()
        conn.close()


# ── POST /retrain ─────────────────────────────────────────────────────────────

@ml_bp.route("/retrain", methods=["POST"])
@jwt_required(optional=True)
def retrain():
    """
    POST /retrain
    Manually trigger retraining of company ML models.
    If authenticated, retrains models specifically for the user's company.
    If unauthenticated or called by cron, retrains all companies.
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        company_id = None
        if user_email:
            company_id, _ = _get_company_id(cur, user_email)

        from ml_engine.prediction.train_model import train_company_model, train_all_models
        from ml_engine.anomaly.train_anomaly import train_company_anomaly_model

        if company_id:
            logger.info("Retraining models on request for company %s", company_id)
            meta = train_company_model(company_id)
            train_company_anomaly_model(company_id)
            return jsonify({
                "message": f"Model retraining complete for company {company_id}",
                "meta": meta,
            }), 200
        else:
            logger.info("Retraining models for all companies")
            train_all_models()
            return jsonify({"message": "Model retraining complete for all companies"}), 200

    except Exception as e:
        logger.exception("Retrain error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()
