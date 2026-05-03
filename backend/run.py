"""
run.py — GreenCO2 Backend Entry Point
======================================
Primary way to start the server:
    python run.py              # development
    gunicorn run:app           # production

The `app` variable at module level is also the WSGI callable used by
gunicorn / waitress / any WSGI host.
"""

import os
from app import create_app

# Create the WSGI-compatible application instance
app = create_app(env=os.getenv("APP_ENV", "development"))

if __name__ == "__main__":
    # Development server — do NOT use in production
    app.run(
        host=os.getenv("FLASK_HOST", "0.0.0.0"),
        port=int(os.getenv("FLASK_PORT", "5000")),
        debug=(os.getenv("APP_ENV", "development") == "development"),
    )
