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
