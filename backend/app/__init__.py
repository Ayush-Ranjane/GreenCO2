"""
app/__init__.py — GreenCO2 Flask Application Factory
=====================================================
Usage:
    from app import create_app
    flask_app = create_app()

The factory pattern allows the same codebase to run in different
environments (development / production / test) without global state changes.

Backward compatibility: this package also re-exports `get_db` so that the
original root-level alert_routes.py / report_routes.py can still do:
    from app import get_db
"""

import logging
import os

from dotenv import load_dotenv
from flask import Flask, jsonify
from flask_cors import CORS

# Load .env before any config reads happen
load_dotenv()

logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s — %(message)s",
)
logger = logging.getLogger(__name__)


def create_app(env: str | None = None) -> Flask:
    """
    Application factory — creates and fully configures a Flask app instance.

    Args:
        env: 'development' | 'production'. Defaults to APP_ENV env var.

    Returns:
        Configured Flask application.
    """
    from app.config.settings import config_map
    from app.extensions import bcrypt, jwt
    from app.services.scheduler_service import start_scheduler

    env = env or os.getenv("APP_ENV", "development")
    cfg = config_map.get(env, config_map["default"])

    flask_app = Flask(__name__)
    flask_app.config.from_object(cfg)

    logger.info("Starting GreenCO2 in [%s] mode…", env)

    # ── Initialize extensions ─────────────────────────────────────────────────
    bcrypt.init_app(flask_app)
    jwt.init_app(flask_app)

    # CORS: explicit origin required when Authorization header is used.
    # withCredentials: false on client (Bearer tokens, not cookies).
    CORS(
        flask_app,
        origins=cfg.CORS_ORIGINS,
        allow_headers=["Content-Type", "Authorization"],
        expose_headers=["Authorization"],
        supports_credentials=False,
    )

    # ── Health check ──────────────────────────────────────────────────────────
    @flask_app.route("/")
    def health():
        return jsonify({"message": "GreenCO2 Backend Running 🚀"}), 200

    @flask_app.route("/health")
    def health_check():
        return jsonify({"status": "ok", "service": "greenco2-backend"}), 200

    # ── Register blueprints ───────────────────────────────────────────────────
    _register_blueprints(flask_app)

    # ── Start background scheduler ────────────────────────────────────────────
    start_scheduler(flask_app)

    logger.info("GreenCO2 backend ready ✅")
    return flask_app


def _register_blueprints(flask_app: Flask) -> None:
    """Import and register all route blueprints in dependency order."""
    from app.routes.auth_routes      import auth_bp
    from app.routes.profile_routes   import profile_bp
    from app.routes.emission_routes  import emission_bp
    from app.routes.dashboard_routes import dashboard_bp
    from app.routes.ml_routes        import ml_bp
    from app.routes.alert_routes     import alerts_bp
    from app.routes.report_routes    import report_bp, notif_bp

    blueprints = [
        auth_bp, profile_bp, emission_bp,
        dashboard_bp, ml_bp, alerts_bp,
        report_bp, notif_bp,
    ]
    for bp in blueprints:
        flask_app.register_blueprint(bp)

    logger.info("Registered %d blueprints.", len(blueprints))


# ── Backward-compatibility re-export ─────────────────────────────────────────
# The original root-level alert_routes.py and report_routes.py do:
#   from app import get_db
# Re-exporting get_db here keeps that contract intact.
from app.utils.db import get_db  # noqa: E402, F401
