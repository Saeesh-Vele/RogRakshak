# RogRakshak Backend Service

FastAPI service powering clinical data ingestion, hospital movement tracking, graph interaction queries (Neo4j), and LangGraph multi-agent HAI outbreak workflows.

---

## Database Configuration (Supabase PostgreSQL)

The relational database is hosted on **Supabase** (PostgreSQL), not a local PostgreSQL instance.

### Obtaining the Direct Connection String:
1. Log into your [Supabase Dashboard](https://supabase.com/dashboard).
2. Open your project and navigate to:
   **Project Settings** $\rightarrow$ **Database** $\rightarrow$ **Connection String**.
3. Select the **"URI"** tab and choose the **Direct Connection** (Port 5432, not the Pooled/PgBouncer Transaction mode).
4. Copy the connection string and set `DATABASE_URL` in `backend/.env` (or root `.env`):
   ```env
   DATABASE_URL=postgresql://postgres:[YOUR-PASSWORD]@db.[YOUR-PROJECT-REF].supabase.co:5432/postgres
   ```

> **Why Direct Connection?**
> Direct connection is required because Alembic DDL migrations execute transactional schema modifications that can fail when run through pooled connection proxies.

---

## Setup & Local Development

### 1. Initialize Virtual Environment & Dependencies
```bash
cd backend
./setup.sh

# Activate environment
source .venv/bin/activate
```

### 2. Verify Database Connection
Run the database smoke test:
```bash
python scripts/smoke_test_db.py
```

### 3. Run Database Migrations (Alembic)
```bash
# Generate a new migration (when models change)
alembic revision --autogenerate -m "create_initial_schema"

# Apply migrations to Supabase
alembic upgrade head
```

### 4. Run Development Server
```bash
uvicorn app.main:app --reload --port 8000
```
- API Docs: `http://localhost:8000/docs`
- Health Check: `http://localhost:8000/health`

### 5. Run Test Suite
```bash
pytest -v
```
