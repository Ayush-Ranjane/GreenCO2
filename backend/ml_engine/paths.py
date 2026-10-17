"""
ml_engine/paths.py — Centralized model directory and file path resolver
========================================================================
Ensures model and metadata paths are always absolute regardless of current working directory.
"""

from __future__ import annotations
import os

ML_ENGINE_DIR = os.path.dirname(os.path.abspath(__file__))

PREDICTION_MODELS_DIR = os.path.join(ML_ENGINE_DIR, "prediction", "models")
ANOMALY_MODELS_DIR    = os.path.join(ML_ENGINE_DIR, "anomaly", "models")

os.makedirs(PREDICTION_MODELS_DIR, exist_ok=True)
os.makedirs(ANOMALY_MODELS_DIR, exist_ok=True)


def get_prediction_model_path(company_id: int | str) -> str:
    return os.path.join(PREDICTION_MODELS_DIR, f"model_{company_id}.pkl")


def get_prediction_meta_path(company_id: int | str) -> str:
    return os.path.join(PREDICTION_MODELS_DIR, f"meta_{company_id}.json")


def get_anomaly_model_path(company_id: int | str) -> str:
    return os.path.join(ANOMALY_MODELS_DIR, f"anomaly_{company_id}.pkl")


def get_anomaly_meta_path(company_id: int | str) -> str:
    return os.path.join(ANOMALY_MODELS_DIR, f"meta_{company_id}.json")
