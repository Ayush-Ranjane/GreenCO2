"""
app/routes/ml_routes.py — ML Inference Endpoints
=================================================
Routes:
    GET  /predict      — 7-day (configurable) emission forecast via Prophet
    GET  /model-info   — model metadata JSON for the current user's company
    GET  /anomaly      — anomaly detection results via Isolation Forest
    POST /retrain      — manually trigger model retraining (admin/debug)

All ML logic lives in ml_engine/ — these routes are thin wrappers that:
  1. Authenticate the request
  2. Resolve company_id
  3. Delegate to the ML module
  4. Serialize and return the result
"""

import json
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

        # DataFrame or list of dicts — normalize to list
        data = result.to_dict(orient="records") if hasattr(result, "to_dict") else result

        #convert ds to date string if it's a datetime
        for item in data:
            item['ds'] = item['ds'].date()
            
        return jsonify({
            "company_id": company_id,
            "days":       days,
            "prediction": data,
        }), 200

    except Exception as e:
        logger.exception("Predict error: %s", e)
        return jsonify({"error": str(e)}), 500

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

    Returns the Prophet model metadata JSON stored at
    ml_engine/prediction/models/meta_<company_id>.json
    """
    conn = get_db()
    cur  = conn.cursor()

    try:
        user_email = get_jwt_identity()
        company_id, err = _get_company_id(cur, user_email)
        if err:
            return err

        with open(f"ml_engine/prediction/models/meta_{company_id}.json", "r") as f:
            meta = json.load(f)

        return jsonify(meta), 200

    except FileNotFoundError:
        return jsonify({"error": f"No model found for company. Run /retrain first."}), 404
    except Exception as e:
        logger.exception("Model info error: %s", e)
        return jsonify({"error": str(e)}), 400

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
            "anomalies":  result,
        }), 200

    except Exception as e:
        logger.exception("Anomaly detection error: %s", e)
        return jsonify({"error": str(e)}), 500

    finally:
        cur.close()
        conn.close()


# ── POST /retrain ─────────────────────────────────────────────────────────────

@ml_bp.route("/retrain", methods=["POST"])
def retrain():
    """
    POST /retrain
    Manually trigger retraining of all company ML models.
    Primarily for admin use or debugging — scheduler handles this automatically.
    """
    try:
        from ml_engine.prediction.train_model import train_all_models
        train_all_models()
        return jsonify({"message": "Model retraining complete"}), 200
    except Exception as e:
        logger.exception("Retrain error: %s", e)
        return jsonify({"error": str(e)}), 500
