# ─────────────────────────────────────────────────────────────────────────────
# Dockerfile — GreenCO2 Backend
# ─────────────────────────────────────────────────────────────────────────────
# Build:  docker build -t greenco2-backend .
# Run:    docker run -p 5000:5000 --env-file .env greenco2-backend
# ─────────────────────────────────────────────────────────────────────────────

# Use official Python slim image — smaller footprint than full python:3.11
FROM python:3.11-slim

# Set working directory inside the container
WORKDIR /app

# ── System dependencies ───────────────────────────────────────────────────────
# libpq-dev  → required by psycopg2 to link against PostgreSQL client libs
# gcc        → required to compile some Python C extensions
RUN apt-get update && apt-get install -y --no-install-recommends \
    libpq-dev \
    gcc \
 && rm -rf /var/lib/apt/lists/*

# ── Python dependencies ───────────────────────────────────────────────────────
# Copy requirements first so Docker can cache this layer separately.
# Only invalidated when requirements.txt changes (not on source changes).
COPY requirements.txt .
RUN pip install --no-cache-dir -r requirements.txt

# ── Application source ────────────────────────────────────────────────────────
# Copy everything else (app/, ml_engine/, run.py, etc.)
COPY . .

# ── Runtime configuration ─────────────────────────────────────────────────────
# Expose the port gunicorn will listen on
EXPOSE 5000

# Run with gunicorn in production mode
# Keep one worker because APScheduler runs inside the Flask process.
CMD ["gunicorn", \
     "--bind", "0.0.0.0:5000", \
     "--workers", "1", \
     "--timeout", "180", \
     "--access-logfile", "-", \
     "--error-logfile", "-", \
     "run:app"]
