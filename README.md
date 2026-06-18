# Trekking Management Application (TMA)

## Run (dev)

### 1) Prereqs

- Python 3.12+
- Redis (for cache + Celery broker/result backend)

On the provided WSL image you may need:

```bash
sudo apt update
sudo apt install -y python3-pip python3-venv redis-server
```

### 2) Install deps

```bash
python3 -m venv .venv
source .venv/bin/activate
pip install -r backend/requirements.txt
```

### 3) Start API

```bash
uvicorn backend.main:app --reload --port 8000
```

Open:

- http://localhost:8000 (SPA)
- http://localhost:8000/api/docs (OpenAPI)

### 4) Start Celery (worker + beat)

```bash
celery -A celery_worker.celery_app worker -l info
celery -A celery_worker.celery_app beat -l info
```

## Seeded Admin

On first run, exactly one Admin is seeded:

- Email: `admin@ridgeline.app`
- Password: `admin123`

Override via env vars:

- `TMA_SEED_ADMIN_EMAIL`
- `TMA_SEED_ADMIN_PASSWORD`
- `TMA_SEED_ADMIN_NAME`

## Demo Seed Data

By default, the app also seeds a small demo dataset (so the SPA isn't empty):

- Staff: `devraj@ridgeline.app` / `staff123`
- Staff: `karma@ridgeline.app` / `staff123`
- Trekker: `riya@trekker.app` / `trek123`
- Trekker: `vikram@trekker.app` / `trek123`

Disable demo seeding:

- `TMA_SEED_DEMO_DATA=false`
