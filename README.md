<div align="center">

<img src="https://img.shields.io/badge/%E2%96%B2-Ridgeline-2d5a27?style=for-the-badge&labelColor=1a3a18&color=2d5a27" alt="Ridgeline" height="48" />

# Ridgeline

### A full-stack Himalayan trek booking platform with AI-powered trip planning

[![Python](https://img.shields.io/badge/Python-3.12+-3776AB?style=flat-square&logo=python&logoColor=white)](https://python.org)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=flat-square&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![Vue.js](https://img.shields.io/badge/Vue.js-3-4FC08D?style=flat-square&logo=vue.js&logoColor=white)](https://vuejs.org)
[![SQLite](https://img.shields.io/badge/SQLite-3-003B57?style=flat-square&logo=sqlite&logoColor=white)](https://sqlite.org)
[![Claude AI](https://img.shields.io/badge/Claude-Haiku-D4734A?style=flat-square&logo=anthropic&logoColor=white)](https://anthropic.com)
[![License](https://img.shields.io/badge/License-MIT-green?style=flat-square)](LICENSE)

[Features](#-features) · [Tech Stack](#-tech-stack) · [Getting Started](#-getting-started) · [AI Features](#-ai-features) · [Demo Accounts](#-demo-accounts) · [API Docs](#-api-docs)

</div>

---

## Overview

Ridgeline is a production-grade trek booking application built for the Indian Himalayan trekking market. It supports three roles — **Trekkers**, **Staff**, and **Admins** — each with tailored dashboards. The platform integrates Claude AI for trek recommendations, personalised itinerary generation, fitness assessments, and intelligent staff announcements.

<div align="center">

| Role | Capabilities |
|---|---|
| 🧭 **Trekker** | Browse catalog, book treks, AI trip planning, reviews, waitlist |
| 🏔️ **Staff** | Manage assigned treks, mark completions, broadcast AI announcements |
| 🛡️ **Admin** | Full trek & user management, analytics dashboard, AI description writer |

</div>

---

## ✨ Features

### Core Platform
- **Trek Catalog** — filterable by difficulty, location, duration with live slot counts
- **Booking System** — JWT-authenticated booking with slot management and cancellation
- **Three-role access control** — Trekker / Staff / Admin with route guards on both frontend and backend
- **CSV Export** — async Celery-powered booking history export
- **Admin Dashboard** — revenue, occupancy, and booking trend metrics

### AI Features (powered by Claude Haiku)
- **Trek Finder** — preference-based trek recommendations with match scoring
- **AI Trip Planner** — day-by-day itinerary, packing list, and safety tips (cached in localStorage)
- **Fitness Check** — personalised Go / Caution / Rethink verdict before booking
- **AI Description Writer** — admin tool for generating trek marketing copy
- **Review Summariser** — automatic AI summary when a trek has 3+ reviews
- **Ridge Chat** — floating AI assistant available on every page
- **Staff Announcements** — AI-drafted broadcast messages to trek participants

### Social & Discovery
- **Reviews & Ratings** — 5-star reviews for completed treks with rating distribution and AI summary
- **Waitlist** — auto-notifies the next person when a full trek has a cancellation
- **Notification Center** — real-time bell icon with unread count, per-notification read state

---

## 🛠 Tech Stack

| Layer | Technology |
|---|---|
| **Backend** | FastAPI 0.115, SQLAlchemy 2.0, SQLite, Pydantic v2 |
| **Auth** | JWT (python-jose), bcrypt password hashing |
| **AI** | Anthropic Python SDK — `claude-haiku-4-5-20251001` |
| **Async tasks** | Celery 5.4 + Redis (CSV export, scheduling) |
| **Frontend** | Vue 3 (CDN global build), Vue Router 4 (hash history) |
| **UI** | Bootstrap 5.3, Bootstrap Icons |
| **HTTP client** | Axios |
| **Templating** | Jinja2 (single `index.html` shell for the SPA) |

---

## 🚀 Getting Started

### Prerequisites

- Python 3.12+
- Redis (for Celery broker and cache)
- An [Anthropic API key](https://console.anthropic.com/) for AI features

```bash
# macOS
brew install redis && brew services start redis

# Ubuntu / WSL
sudo apt update && sudo apt install -y redis-server
sudo service redis-server start
```

### Installation

```bash
# 1. Clone
git clone https://github.com/aloktripathi1/RidgeLine.git
cd RidgeLine

# 2. Create and activate virtualenv
python3 -m venv .venv
source .venv/bin/activate          # Windows: .venv\Scripts\activate

# 3. Install dependencies
pip install -r backend/requirements.txt

# 4. Set your Anthropic API key (required for AI features)
export ANTHROPIC_API_KEY="sk-ant-..."
```

### Running the App

Open **three terminals**:

```bash
# Terminal 1 — API server
uvicorn backend.main:app --reload --port 8000

# Terminal 2 — Celery worker (async tasks)
celery -A celery_worker.celery_app worker -l info

# Terminal 3 — Celery beat (scheduled tasks)
celery -A celery_worker.celery_app beat -l info
```

Then open **http://localhost:8000** in your browser.

> **API Explorer** — Interactive OpenAPI docs at http://localhost:8000/api/docs

---

## 🤖 AI Features

All AI features use `claude-haiku-4-5-20251001` via the Anthropic API.

| Endpoint | Description | Auth |
|---|---|---|
| `POST /api/ai/recommend` | Top-3 trek recommendations from user preferences | Public |
| `POST /api/ai/itinerary/{trek_id}` | Day-by-day itinerary + packing list + safety tips | Trekker |
| `POST /api/ai/fitness-check` | Personalised fitness assessment for a trek | Public |
| `GET /api/ai/review-summary/{trek_id}` | AI summary of trekker reviews | Public |
| `POST /api/ai/describe` | Marketing description generator | Admin |
| `POST /api/ai/draft-announcement` | Broadcast message drafter for staff | Staff / Admin |
| `POST /api/ai/chat` | Conversational trek advisor (Ridge) | Public |

Set `ANTHROPIC_API_KEY` in your environment. AI endpoints return HTTP 503 if the key is absent — the rest of the app continues to work normally.

---

## 👤 Demo Accounts

Seeded automatically on first run:

| Role | Email | Password |
|---|---|---|
| 🛡️ Admin | `admin@ridgeline.app` | `admin123` |
| 🏔️ Staff | `devraj@ridgeline.app` | `staff123` |
| 🏔️ Staff | `karma@ridgeline.app` | `staff123` |
| 🧭 Trekker | `riya@trekker.app` | `trek123` |
| 🧭 Trekker | `vikram@trekker.app` | `trek123` |

Override admin credentials with environment variables:

```bash
export TMA_SEED_ADMIN_EMAIL="you@example.com"
export TMA_SEED_ADMIN_PASSWORD="yourpassword"
export TMA_SEED_ADMIN_NAME="Your Name"
```

Disable demo data entirely:

```bash
export TMA_SEED_DEMO_DATA=false
```

---

## 📁 Project Structure

```
RidgeLine/
├── backend/
│   ├── models/          # SQLAlchemy ORM models
│   │   ├── user.py      # User, roles, profile fields
│   │   ├── trek.py      # Trek with status enum + slot tracking
│   │   ├── booking.py   # Booking with status lifecycle
│   │   ├── review.py    # Star ratings + review text
│   │   ├── waitlist.py  # Trek waitlist entries
│   │   └── notification.py
│   ├── routes/          # FastAPI routers (one file per domain)
│   │   ├── auth_routes.py
│   │   ├── trek_routes.py
│   │   ├── booking_routes.py
│   │   ├── review_routes.py
│   │   ├── waitlist_routes.py
│   │   ├── notification_routes.py
│   │   ├── ai_routes.py
│   │   └── metrics_routes.py
│   ├── services/        # Business logic layer
│   ├── schemas/         # Pydantic request/response models
│   └── main.py          # App factory
├── frontend/
│   ├── static/js/
│   │   ├── views/       # Page-level Vue components
│   │   ├── components/  # Shared Vue components (navbar, modals, chat)
│   │   ├── store.js     # Reactive global auth + notification state
│   │   └── api.js       # Axios wrapper — all API calls in one place
│   └── templates/
│       └── index.html   # SPA shell served by Jinja2
├── celery_worker.py     # Async task definitions
└── README.md
```

---

## 🔑 Environment Variables

| Variable | Default | Description |
|---|---|---|
| `ANTHROPIC_API_KEY` | — | Required for AI features |
| `TMA_SEED_ADMIN_EMAIL` | `admin@ridgeline.app` | Seed admin email |
| `TMA_SEED_ADMIN_PASSWORD` | `admin123` | Seed admin password |
| `TMA_SEED_ADMIN_NAME` | `Admin` | Seed admin display name |
| `TMA_SEED_DEMO_DATA` | `true` | Set to `false` to skip demo users/treks |
| `TMA_SQLITE_PATH` | `ridgeline.db` | SQLite database file path |
| `TMA_JWT_SECRET` | `change-me-in-prod` | JWT signing secret |

---

## 📄 License

MIT © [Alok Tripathi](https://github.com/aloktripathi1)
