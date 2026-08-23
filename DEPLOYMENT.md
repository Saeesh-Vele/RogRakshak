# RogRakshak — Deployment

Three services, one existing account:

| Piece | Host | Notes |
| --- | --- | --- |
| Frontend (Next.js 14, App Router) | Vercel | root directory `frontend/` |
| Backend (FastAPI) | Render | root directory `backend/`, blueprint in `render.yaml` |
| Graph database (Neo4j) | Neo4j Aura Free | new instance |
| Clinical Postgres + Auth | Supabase | **already exists — do not re-create** |

No secret values live in this repo. Every variable below is set in the relevant
platform dashboard.

---

## 1. Environment variables

### Vercel — Project Settings → Environment Variables

These are the only three variables the frontend reads (`process.env` appears
nowhere else in `frontend/src/`). All are `NEXT_PUBLIC_`-prefixed because all
three are needed in the browser.

| Variable | Value | Notes |
| --- | --- | --- |
| `NEXT_PUBLIC_API_URL` | `https://<your-render-service>.onrender.com` | **No trailing slash.** Axios joins paths onto this. |
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<project-ref>.supabase.co` | Supabase → Project Settings → API |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | the anon/public key | Browser-safe. Not the Postgres password, not the `service_role` key. |

Two things to know about `NEXT_PUBLIC_*` on Vercel:

- They are **inlined at build time**, not read at runtime. Changing one requires
  a redeploy before it takes effect — an env-var edit alone does nothing.
- Set them for **Production, Preview, and Development** if you want preview
  deploys to work; a preview build with these missing falls back to
  `http://localhost:8000` and fails closed at the login screen.

### Render — Service → Environment

`render.yaml` declares all of these with `sync: false`, so Render prompts for
each one on first deploy rather than reading it from the repo.

| Variable | Value | Notes |
| --- | --- | --- |
| `DATABASE_URL` | `postgresql://postgres:<password>@db.<project-ref>.supabase.co:5432/postgres` | Supabase → Settings → Database → Connection string → URI. See the pooler note below. |
| `NEO4J_URI` | `neo4j+s://<id>.databases.neo4j.io` | Aura's own URI. Keep the `neo4j+s://` scheme — it carries TLS. |
| `NEO4J_USER` | `neo4j` | Aura's default. |
| `NEO4J_PASSWORD` | from the Aura credentials file | Shown **once**, at instance creation. Download it. |
| `GOOGLE_API_KEY` | Gemini API key | ⚠️ Named `GOOGLE_API_KEY`, **not** `GEMINI_API_KEY` — see below. |
| `GEMINI_MODEL` | `gemini-2.5-flash` | Pre-set in `render.yaml`; override only after re-validating extraction against `data/lab_reports/`. |
| `ALLOWED_ORIGINS` | `https://<your-app>.vercel.app` | Comma-separated. See §3. |
| `PYTHON_VERSION` | `3.13.9` | Pre-set in `render.yaml`; matches the local dev interpreter. |

> **The Gemini key is `GOOGLE_API_KEY`.** `app/services/lab_report_extraction.py`
> reads that exact name, and it is also the name `langchain-google-genai` picks
> up implicitly. Setting `GEMINI_API_KEY` on Render will start the service fine
> and then fail at the first lab-report extraction with
> `GOOGLE_API_KEY environment variable is not configured`.

> **Supabase connection string.** The direct `db.<ref>.supabase.co:5432` host is
> IPv4-only on legacy projects and IPv6-only on newer ones. If Render cannot
> reach it, switch to the **Session pooler** string (port `5432`, host
> `aws-0-<region>.pooler.supabase.com`) rather than the transaction pooler —
> SQLAlchemy's connection pooling and Alembic both expect session-level
> semantics.

### Supabase

Nothing new to provision — same project, same database. Only the auth URL
settings change; see §2 step 5.

---

## 2. Deploy order

Each step depends on a value produced by the one before it, so the order
matters.

**1 — Neo4j Aura Free.** Create the instance. Download the credentials file at
creation; the password is never shown again. Then load the graph from a machine
with the repo checked out:

```bash
cd backend && source .venv/bin/activate
export NEO4J_URI='neo4j+s://<id>.databases.neo4j.io'
export NEO4J_USER=neo4j NEO4J_PASSWORD='<password>'
python ../data/build_neo4j_graph.py
python ../data/verify_neo4j_graph.py
```

An empty Aura instance is the single most common cause of a backend that
health-checks green but returns empty graphs.

**2 — Backend on Render.** Point Render at this repo; it picks up `render.yaml`
(root directory `backend`, build `pip install -r requirements.txt`, start
`uvicorn app.main:app --host 0.0.0.0 --port $PORT`, health check `/health`).
Fill in the env vars from §1, including the Neo4j values from step 1. For
`ALLOWED_ORIGINS` put a placeholder for now — the real Vercel domain doesn't
exist yet.

Apply the Postgres migrations once, from your machine, against the Supabase
database:

```bash
cd backend && source .venv/bin/activate
export DATABASE_URL='<the same value you gave Render>'
alembic upgrade head
```

Confirm the service is live:

```bash
curl https://<your-service>.onrender.com/health
# {"status":"ok","service":"rograkshak-backend"}
```

**3 — Frontend on Vercel.** Import the repo, set the **root directory to
`frontend`**. Vercel detects Next.js and uses `next build` from
`frontend/package.json` with no config needed. Set the three env vars from §1,
using the Render URL from step 2 as `NEXT_PUBLIC_API_URL`. Deploy, and note the
production domain.

**4 — CORS update.** Back in Render, set `ALLOWED_ORIGINS` to the real Vercel
domain and save. Render restarts the service and the new origin takes effect —
no code change, no redeploy. Scheme and host must match exactly what the browser
sends: `https://rograkshak.vercel.app`, no trailing slash, no path.

If you want preview deploys to reach the API too, add them comma-separated:

```
https://rograkshak.vercel.app,https://rograkshak-git-main-you.vercel.app
```

**5 — Supabase auth settings.** Supabase → Authentication → URL Configuration:

- **Site URL** → `https://<your-app>.vercel.app`
- **Redirect URLs** → add `https://<your-app>.vercel.app/auth/callback`

`src/app/auth/callback` exchanges the email-confirmation `code` for a session;
without the redirect entry Supabase refuses the callback and the doctor lands
back on `/login` with an "invalid or expired link" message. Signup stays closed
— accounts are created with `scripts/create_doctor.py`, which needs the
`service_role` key and must only ever run locally.

**6 — End-to-end check.** Load the Vercel domain, sign in, open the dashboard.
If the shell renders but every panel is empty, it is almost always CORS (step 4)
or a cold backend (below) — the browser console distinguishes them immediately.

---

## 3. CORS is env-driven — verified

`backend/app/main.py` reads `ALLOWED_ORIGINS` once at startup, splits on commas,
strips whitespace, and hands the list to `CORSMiddleware`. Nothing is hardcoded
beyond a `localhost:3000` default used when the variable is absent.

Confirmed locally: with `ALLOWED_ORIGINS=https://rograkshak.vercel.app`, a
preflight from that origin returns `200` with a matching
`access-control-allow-origin`, and a preflight from any other origin returns
`400`. So adding the production domain is a dashboard edit only.

One consequence of reading it *at startup*: the change needs a service restart.
Render restarts automatically when you save an env var, so in practice this is
handled for you — just don't expect it to take effect mid-process.

---

## 4. Free-tier behaviour — expected, not broken

**Render free tier spins down when idle.** After roughly 15 minutes without
traffic the service is stopped. The next request starts the container from cold:
the first response typically takes **50 seconds or more**, and the frontend's
axios client gives up at its 30-second timeout, so the *first* page load after
an idle period will often show an error while the second one, moments later,
works fine. This is not a bug in the app. If a demo needs to be reliably fast,
hit `/health` a minute beforehand to warm it.

**Aura Free auto-pauses.** A free Neo4j Aura instance pauses itself after a few
days without a connection, and must be **manually resumed from the Aura
console** — it does not wake on an incoming query the way Render does. A paused
instance surfaces as a backend that is healthy (`/health` never touches Neo4j)
but returns empty or erroring graph endpoints. Check the Aura console before
debugging anything else. Aura also *deletes* instances left paused long enough,
so re-run `data/build_neo4j_graph.py` if the instance ever comes back empty.

**Neither free tier is suitable for a live clinical deployment.** Cold starts,
auto-pause, and Aura Free's node/relationship caps are fine for demos and
evaluation, not for surveillance anyone is relying on.

---

## 5. What changed in the repo for deployment

- `render.yaml` — Render blueprint: build/start commands, `/health` check, env
  var declarations (all `sync: false`).
- `backend/requirements.txt` — exact pins for the production dependency set.
  The langchain/langgraph/google-genai line ships breaking changes on minor
  releases; unpinned, a redeploy could break a service that worked yesterday.
- `backend/requirements-dev.txt` — `pytest`, `httpx`, `reportlab`. These were
  previously in the runtime dependency list despite nothing under `app/`
  importing them; `reportlab` in particular is a slow, heavy build that only
  `data/generate_lab_report_documents.py` needs.
- `backend/pyproject.toml` — runtime deps bounded to their tested major
  versions, dev-only packages moved into the `dev` extra.
- `frontend/src/lib/api-client.ts` — the server-side branch hardcoded
  `http://localhost:8000` regardless of environment. Both branches now read
  `NEXT_PUBLIC_API_URL`.

Local dev is unaffected: `pip install -e '.[dev]'` still installs everything,
and the localhost fallbacks still apply when the variables are unset.
