<div align="center">

# 🌿 GreenCO2

### AI-Powered CO₂ Emission Monitoring & Compliance Platform

[![Python](https://img.shields.io/badge/Python-3.11-3776AB?logo=python&logoColor=white)](https://python.org)
[![Flask](https://img.shields.io/badge/Flask-3.x-000000?logo=flask&logoColor=white)](https://flask.palletsprojects.com)
[![React](https://img.shields.io/badge/React-19-61DAFB?logo=react&logoColor=black)](https://reactjs.org)
[![PostgreSQL](https://img.shields.io/badge/PostgreSQL-15-336791?logo=postgresql&logoColor=white)](https://postgresql.org)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED?logo=docker&logoColor=white)](https://docker.com)

*Track emissions. Predict trends. Stay compliant.*

</div>

---

## 📋 Table of Contents

- [Overview](#-overview)
- [Features](#-features)
- [Architecture](#-architecture)
- [Folder Structure](#-folder-structure)
- [Quick Start](#-quick-start)
- [Docker Setup](#-docker-setup)
- [API Reference](#-api-reference)
- [ML Engine](#-ml-engine)
- [Environment Variables](#-environment-variables)
- [For New Developers](#-for-new-developers)

---

## 🎯 Overview

**GreenCO2** is a full-stack SaaS platform that helps companies track, analyze, and reduce their CO₂ emissions. It provides:

- **Real-time dashboards** with daily/monthly emission metrics
- **AI-powered predictions** using Facebook Prophet for 7–14 day forecasts
- **Anomaly detection** using Isolation Forest to flag unusual emission spikes
- **Automated alerts** delivered via email when thresholds are breached
- **PDF compliance reports** formatted against CPCB (India) standards

---

## ✨ Features

| Feature | Description |
|---------|-------------|
| 🔐 JWT Auth | Stateless Bearer token authentication |
| 📊 Dashboard | Live KPIs: today total, monthly total, 7-day trend |
| 📝 Emission Logging | Multi-source entry (diesel, petrol, natural gas, electricity) |
| 🔮 ML Predictions | Prophet-based 7–14 day CO₂ forecasts per company |
| 🔬 Anomaly Detection | Isolation Forest flags unusual emission events |
| 🚨 Smart Alerts | Threshold / trend / anomaly / prediction alerts |
| 📧 Email Notifications | Multi-recipient HTML email alerts via SMTP |
| 📄 PDF Reports | Professional compliance reports with ReportLab |
| ⏰ Auto-Scheduler | Retrains models daily, sweeps alerts hourly |
| 🐳 Docker Ready | Full stack containerized with docker-compose |

---

## 🏗 Architecture

```
Browser (React SPA)
       │  HTTP/REST + JWT Bearer
       ▼
Flask Backend (Gunicorn)
       │
       ├── Routes       → thin request/response handlers
       ├── Services     → scheduler, business logic
       ├── Utils        → DB connections, shared helpers
       ├── Config       → centralized env-driven settings
       └── ML Engine    → Prophet + Isolation Forest models
               │
               ▼
       PostgreSQL Database
```

**Auth flow:** `POST /api/login` → JWT issued → frontend stores in `localStorage` → every request sends `Authorization: Bearer <token>` → Flask-JWT-Extended validates.

---

## 📁 Folder Structure

```
GreenCO2/
├── backend/
│   ├── app/                        ← Flask application package
│   │   ├── __init__.py             ← App factory (create_app)
│   │   ├── extensions.py           ← Flask extensions (jwt, bcrypt)
│   │   ├── config/
│   │   │   └── settings.py         ← All env-driven config (DB, JWT, SMTP…)
│   │   ├── routes/
│   │   │   ├── auth_routes.py      ← POST /api/register, /api/login
│   │   │   ├── profile_routes.py   ← GET/PUT /api/profile
│   │   │   ├── emission_routes.py  ← POST /api/emissions, /calculate
│   │   │   ├── dashboard_routes.py ← GET /api/dashboard
│   │   │   ├── ml_routes.py        ← GET /predict, /anomaly, /model-info
│   │   │   ├── alert_routes.py     ← GET/POST/PUT /api/alerts/*
│   │   │   └── report_routes.py    ← GET /api/report, /api/report/pdf
│   │   ├── services/
│   │   │   └── scheduler_service.py ← APScheduler (retrain + alert sweep)
│   │   └── utils/
│   │       └── db.py               ← get_db() — per-request DB connections
│   │
│   ├── ml_engine/                  ← All ML code (untouched)
│   │   ├── alerts/
│   │   │   ├── alert_engine.py     ← Threshold/trend/anomaly/prediction checks
│   │   │   └── email_service.py    ← SMTP sender, HTML email builder
│   │   ├── anomaly/
│   │   │   ├── detect.py           ← Isolation Forest inference
│   │   │   └── train_anomaly.py    ← Model training script
│   │   ├── prediction/
│   │   │   ├── predict.py          ← Prophet inference
│   │   │   └── train_model.py      ← Model training script
│   │   └── db/
│   │       └── load_data.py        ← Load emission data for training
│   │
│   ├── run.py                      ← Entry point (dev + prod)
│   ├── requirements.txt
│   ├── Dockerfile
│   └── .env.example
│
├── frontend/
│   └── src/
│       ├── api/
│       │   └── api.js              ← Axios instance with JWT interceptors
│       ├── auth.js                 ← Auth helper utilities
│       ├── components/
│       │   ├── Navbar.jsx
│       │   ├── Footer.jsx
│       │   └── ui/                 ← Reusable UI primitives
│       │       ├── index.js        ← Barrel export
│       │       ├── SkeletonLoader.jsx + .css
│       │       └── ErrorMessage.jsx  + .css
│       └── pages/
│           ├── Home.jsx
│           ├── Auth.jsx
│           ├── Dashboard.jsx
│           ├── Analytics.jsx
│           ├── EmissionForm.jsx
│           ├── Alerts.jsx
│           ├── Report.jsx
│           ├── Profile.jsx
│           └── NotificationSettings.jsx
│
├── database/
│   └── schema.sql                  ← PostgreSQL schema
│
└── docker-compose.yml              ← Full-stack orchestration
```

---

## ⚡ Quick Start

### Prerequisites

- Python 3.11+
- Node.js 20+
- PostgreSQL 15+

### 1 — Database

```bash
# Create the database and apply the schema
psql -U postgres -c "CREATE DATABASE greenco2;"
psql -U postgres -d greenco2 -f database/schema.sql
```

### 2 — Backend

```bash
cd backend

# Create and activate virtual environment
python -m venv venv
.\venv\Scripts\activate        # Windows
# source venv/bin/activate     # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Configure environment
copy .env.example .env
# Edit .env with your DB password, JWT secret, and SMTP credentials

# Start the development server
python run.py
# → Backend running at http://localhost:5000
```

### 3 — Frontend

```bash
cd frontend
npm install
npm start
# → React app running at http://localhost:3000
```

---

## 🐳 Docker Setup

> Requires Docker Desktop

```bash
# 1. Copy and fill in your secrets
copy backend\.env.example backend\.env

# 2. Build and start all services (Postgres + Backend + Frontend)
docker-compose up --build

# 3. Open the app
# Frontend → http://localhost:3000
# Backend  → http://localhost:5000
```

**Stop everything:**
```bash
docker-compose down
```

**View logs:**
```bash
docker-compose logs -f backend
```

---

## 📡 API Reference

All protected endpoints require `Authorization: Bearer <token>` header.

### Auth
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/register` | Register new user + company |
| POST | `/api/login` | Login → returns JWT |

### Emissions
| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/api/emissions` | Log multi-source emissions |
| GET | `/api/dashboard` | Aggregated KPIs + trend |

### ML
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/predict?days=7` | 7-day Prophet forecast |
| GET | `/anomaly` | Isolation Forest results |
| GET | `/model-info` | Trained model metadata |
| POST | `/retrain` | Manually trigger retraining |

### Alerts
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/alerts` | Paginated alert history |
| POST | `/api/alerts/run` | Trigger alert engine on-demand |
| PUT | `/api/alerts/<id>/read` | Mark one alert read |
| PUT | `/api/alerts/read-all` | Mark all alerts read |
| GET | `/api/alerts/unread-count` | Badge counter |

### Reports & Notifications
| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/api/report?days=30` | JSON report data |
| GET | `/api/report/pdf` | Download PDF report |
| GET | `/api/notifications` | Get notification emails |
| POST | `/api/notifications` | Add notification email |
| DELETE | `/api/notifications` | Remove notification email |

---

## 🧠 ML Engine

### How it works

```
emission_sources table
        │
        ▼
ml_engine/db/load_data.py     ← Load & reshape data with pandas
        │
        ├── ml_engine/prediction/train_model.py  → trains Prophet model per company
        │   └── models/model_<id>.pkl + meta_<id>.json
        │
        └── ml_engine/anomaly/train_anomaly.py   → trains Isolation Forest per company
            └── models/anomaly_<id>.pkl
```

### Scheduled jobs
- **Every 24 hours** → `train_all_models()` retrains Prophet for all companies
- **Every 1 hour** → Alert engine runs for all companies, emails new alerts

### Alert categories
| Category | Severity | Trigger |
|----------|----------|---------|
| `threshold` | medium | Today > 1,000 kg or month > 15,000 kg |
| `trend` | high | Predicted rise > 10% over 7 days |
| `anomaly` | critical | Isolation Forest flags anomalous event |
| `prediction` | high | Any predicted day > 1,200 kg |

---

## 🔐 Environment Variables

Copy `backend/.env.example` to `backend/.env` and fill in:

| Variable | Description | Example |
|----------|-------------|---------|
| `APP_ENV` | Runtime environment | `development` |
| `DB_NAME` | PostgreSQL database name | `greenco2` |
| `DB_USER` | PostgreSQL username | `postgres` |
| `DB_PASSWORD` | PostgreSQL password | `your_password` |
| `DB_HOST` | DB host (`db` in Docker) | `localhost` |
| `DB_PORT` | DB port | `5432` |
| `JWT_SECRET_KEY` | JWT signing secret | `random-64-char-string` |
| `SMTP_HOST` | Mail server | `smtp.gmail.com` |
| `SMTP_PORT` | SMTP port (587/465) | `587` |
| `SMTP_USER` | Sender email | `you@gmail.com` |
| `SMTP_PASSWORD` | Gmail App Password | `xxxx xxxx xxxx xxxx` |
| `ALERT_FROM` | From header for emails | `GreenCO2 <you@gmail.com>` |

> **Gmail tip:** Use a [Gmail App Password](https://myaccount.google.com/apppasswords), not your account password.

---

## 👨‍💻 For New Developers

### Understanding the request lifecycle

```
1. React sends HTTP request via api.js (Axios)
        ↓ Authorization: Bearer <JWT>
2. Flask app receives at a route in app/routes/
        ↓ @jwt_required() validates the token
3. Route handler calls get_db() → opens psycopg2 connection
        ↓ executes SQL queries
4. Result serialized via jsonify() → returned to client
        ↓ connection closed in finally block
5. React updates state → UI re-renders
```

### Key design decisions

| Decision | Reason |
|----------|--------|
| JWT identity = plain email string | Avoids JSON parsing errors in get_jwt_identity() |
| Per-request DB connections | Simple, safe — no connection pool complexity |
| CORS without `*` origin | Required when Authorization header is in use |
| Blueprints per domain | Each route file is independently testable |
| Scheduler singleton guard | Prevents double-start on Flask reloader hot reload |

### Adding a new API endpoint

1. Create or open the relevant file in `backend/app/routes/`
2. Add your route function with `@blueprint.route(...)` and `@jwt_required()`
3. Use `get_db()` for database access, close in `finally`
4. The blueprint is already registered in `app/__init__.py` — no changes needed

### Adding a new React page

1. Create `frontend/src/pages/YourPage.jsx`
2. Import `SkeletonLoader` / `ErrorMessage` from `../components/ui`
3. Add the route in `frontend/src/App.js`
4. Add nav link in `frontend/src/components/Navbar.jsx`

---

## 📄 License

MIT — see [LICENSE](LICENSE)
