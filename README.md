# RogRakshak

RogRakshak is an intelligent healthcare-associated infection surveillance and outbreak investigation platform. It detects pathogen transmission chains across hospital wards by fusing structured clinical records with temporal interaction graphs. The system orchestrates multi-agent investigation workflows powered by Google Gemini and LangGraph to reconstruct exposure pathways. Epidemiologists and infection control teams can visually trace transmission trees and patient timelines through a responsive Next.js dashboard. By automating root-cause discovery, RogRakshak accelerates containment interventions to protect vulnerable patients.

---

## Architecture Summary

RogRakshak leverages a modern multi-tier architecture designed for temporal reasoning and interactive visualization:
- **Supabase (PostgreSQL)**: Hosted PostgreSQL database storing structured clinical entities, patient records, admission/discharge/transfer logs, and lab culture results.
- **Neo4j**: Native graph database modeling dynamic spatial-temporal co-locations, staff interactions, and multi-hop transmission chains.
- **LangGraph & Gemini**: Multi-agent reasoning engine orchestrating surveillance, epidemiology, genomics, and briefing synthesis agents.
- **Next.js 14 Dashboard**: Clinical dashboard utilizing `@xyflow/react` for interactive contact graphs and `Plotly.js` for patient journey timelines.

For an in-depth breakdown, see [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md).

---

## Environment Variables & Database Configuration

- **Relational Database**: Hosted on Supabase. Set `DATABASE_URL` in `backend/.env` (or root `.env`) using the **Direct Connection URI** (found in Supabase Dashboard $\rightarrow$ Project Settings $\rightarrow$ Database $\rightarrow$ Connection String $\rightarrow$ URI [Direct]).
- **Next.js Frontend**: Next.js reads environment variables from `frontend/.env.local` in development (copy from `frontend/.env.local.example`), separate from the root `.env.example` which configures backend databases and AI keys.

---

## Authentication

The dashboard is doctor-only. Auth is **Supabase Auth with email/password**, reusing the *same* Supabase project that already hosts the clinical Postgres database — there is no second project and no third-party OAuth provider.

This is a **closed system: there is no self-service sign-up.** Doctors only ever sign in. Accounts are created by a developer with `scripts/create_doctor.py` (below), and the credentials are handed over out of band.

### Routes

| Route | Access |
| --- | --- |
| `/` | Public marketing landing page |
| `/login` | Public |
| `/dashboard`, `/investigations`, `/investigations/new`, `/investigations/{caseId}`, `/graph` | Requires a session |

Protection is centralised in `frontend/src/middleware.ts`: everything is private except an explicit allow-list, so a new route under `src/app` is protected by default. Unauthenticated requests are redirected to `/login?redirectTo=<path>`; signing in returns the doctor to where they were headed.

### Setup

1. **Frontend env** — set both values in `frontend/.env.local` (Supabase Dashboard → Project Settings → API). The anon key is a public, browser-safe key; it is *not* the Postgres password:

   ```
   NEXT_PUBLIC_SUPABASE_URL=https://[YOUR-PROJECT-REF].supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=<anon public key>
   ```

   With either value missing the app **fails closed** — private routes redirect to `/login`, and the auth screens explain what is unset.

2. **Providers** — Supabase Dashboard → Authentication → Providers: keep **Email** enabled, leave every third-party provider disabled.

3. **Redirect URLs** — Authentication → URL Configuration: set the Site URL to `http://localhost:3000`. Accounts created by the admin script are pre-confirmed, so no email round-trip is involved.

### Creating a doctor account

`scripts/create_doctor.py` calls the Supabase Auth Admin API to create a pre-confirmed user with the display name and clinical role set. Standard library only — no `pip install`, no virtualenv.

```bash
cp scripts/.env.local.example scripts/.env.local   # then fill in the two values
python3 scripts/create_doctor.py \
  --email s.kulkarni@hospital.org \
  --name "Dr. S. Kulkarni" \
  --role "Infection Control Lead"
```

`--password` is optional; omit it and a 16-character temporary password is generated. The script prints the email and password for you to hand over out of band. `--role` must be one of the seven values listed by `python3 scripts/create_doctor.py --help`.

> [!WARNING]
> `SUPABASE_SECRET_KEY` in `scripts/.env.local` is the **secret / service_role** key — full admin access, bypasses row-level security. It is deliberately *not* prefixed with `NEXT_PUBLIC_` and lives outside `frontend/`, so Next.js never loads it and it cannot be inlined into the browser bundle. The file is gitignored. Never copy this key into `frontend/.env.local`. The script refuses to run if it detects a publishable/anon key.

### Identity

`full_name` and `role` are stored in Supabase `user_metadata` and render as the top-bar identity (e.g. "Dr. S. Kulkarni / Infection Control Lead"). Sign-out lives in that same top-bar menu.

---

## Quickstart Guide

### 1. Backend Service (FastAPI + Supabase)

```bash
cd backend
# Setup virtual environment and install dependencies
./setup.sh

# Activate virtual environment
source .venv/bin/activate

# Test Supabase connection
python scripts/smoke_test_db.py

# Run Alembic migrations against Supabase
alembic upgrade head

# Run backend development server
uvicorn app.main:app --reload --port 8000
```
Backend health check is accessible at `http://localhost:8000/health`.

### 2. Frontend Application (Next.js 14)

```bash
cd frontend
# Copy environment configuration
cp .env.local.example .env.local

# Install dependencies
npm install

# Start Next.js development server
npm run dev
```
Open `http://localhost:3000` to access the dashboard.

## Investigation storage and restarts

Investigation results are held **in memory** in the backend process
(`_investigation_store` in `backend/app/services/detection/investigation_service.py`).
Nothing is written to the database, so a backend restart — including an automatic
`--reload` after a code change, or a Render instance spinning down — clears every
case.

What that means in practice:

- `CASE-2026-001` (the planted outbreak, index patient 1) is regenerated on demand,
  so `/api/investigations` and `/api/investigations/CASE-2026-001` always work. The
  first request after a restart runs the full workflow and takes a few seconds.
- Any other case you created (e.g. `CASE-2026-004`) returns **404** after a restart
  until you run that investigation again from **New investigation**.
- Case IDs are derived from the index patient (`CASE-2026-{patient_id:03d}`), so
  re-running an investigation for the same patient replaces that case. The UI asks
  for confirmation before it does.

## Landing page product frames are sample data

The "The product" section of the public landing page (`/`) shows the real
dashboard, timeline, evidence and scoring components, each labelled
**"Sample data, CASE-2026-001"**. They render a **static snapshot** of the API,
the bundled fixture `frontend/src/data/mock_investigation_results.json`, not live
data: the landing page is public and is served without a backend or a signed-in
session. The snapshot was checked against `GET /api/investigations/CASE-2026-001`
and matches it on every figure shown (confidence, status, the 15 evidence items,
the five scoring dimensions and the timeline). If the detection logic changes,
regenerate the fixture with `data/export_mock_investigation.py` so the landing
page stays truthful. The script writes `data/fixtures/mock_investigation_results.json`;
copy it over `frontend/src/data/mock_investigation_results.json` (the two are
currently identical).
