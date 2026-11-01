# RogRakshak UI/UX rework: Stage E report

**Status:** ready for review. Nothing is staged or committed.

The working tree holds everything since your last commit (`7e6ffd2`, Stage C):

- Stage D (investigations list and case detail)
- the graph edge-click evidence fix
- Stage E (New Investigation and Graph Explorer chrome)
- the follow-up round on your three calls plus demo-case seeding (§1a)

Because this is the last stage, the report also covers what the original brief asked for in the final report: the Stage 0 audit items, accessibility before and after, and clean start commands.

---

## 1. Summary of checks on the final code

| Check | Result |
|---|---|
| `npx tsc --noEmit` | clean |
| `npm run lint` | clean, no warnings |
| `npx vitest run` | **14 / 14** (4 files) |
| `npm run build` (isolated copy, see §8) | compiles, no warnings |
| `pytest` (backend) | **37 / 37** (31 + 6 new seeding tests); the one Starlette/httpx deprecation warning is deferred, as you asked |
| axe (WCAG 2.2 AA + best practice), every page at 1440 and 390 | **0 violations everywhere** (table in §5) |
| Console errors, every page at 1440, 1280 and 390 | **0** |
| Horizontal scroll at 1440, 1280 and 390 | none |
| Edge to evidence test (every edge, both cases) | **10 / 10** |
| Stage D interaction suite | **7 / 7** |
| Stage E interaction suite | **13 / 13** (11 + 2 new phone-default checks) |
| Graph structure snapshot vs. before the edge fix | only the 2 duplicate edges removed, 0 pixels changed (§2.3); still identical after this round |
| Backend restart: CASE-2026-004 present without re-running | **confirmed twice** (§1a.3) |

These results are from the final code after the follow-up round. Your dev server and backend weren't running when I resumed, so I started both with the README commands to run these checks. I've stopped them again: the backend and dev server I started are not left running.

Browser tests sign in through the real `/login` form. The credentials come from environment variables and are held in memory only; they were never written to any file. The user-menu email is masked in every screenshot that shows it.

---

## 1a. Follow-up round: your decisions, implemented

### 1a.1 Hero line (honest copy)

| | Text |
|---|---|
| **Before** | "RogRakshak fuses patient movement logs, staff shift rosters and microbiology cultures into a temporal graph, then scores every suspected pathway deterministically, **with each figure traceable to the record it came from.**" |
| **After** | "RogRakshak fuses patient movement logs, staff shift rosters and microbiology cultures into a temporal graph, then scores every suspected pathway deterministically, **with every finding linked to its source evidence.**" |

The new wording claims only what the app does. Every finding is an evidence item with an ID and a named source, and edges and chains link to those items. Lab-derived items carry no record IDs, which the old wording implied. The old phrase appears nowhere else in the code, and it's absent from the served production page.

### 1a.2 Phones: graph shown as a table by default

- **Below 768 px,** the transmission graph on the case page and in Graph Explorer opens on the **table view** (people and relationships). The existing toggle switches to the interactive graph, whose filter panel still starts collapsed on phones.
- **768 px and up** is unchanged: the interactive graph is the default.
- **How the default is chosen:** a small hook, `src/components/investigation/use-graph-view.ts`, decides after mount. The server can't know the viewport, and deciding during render would break hydration. A placeholder at the graph's height holds the space until then, so nothing flashes or shifts.
- **Verified** by the Stage E suite. At 390 px, both pages start on the table, the toggle reports `aria-pressed` and opens the graph, and the filters start collapsed. At 1440 px the graph is still the default.

### 1a.3 CASE-2026-004 seeded at startup (backend change, as requested)

- **The defaults.** `investigation_service.py` now lists both demo cases in `DEFAULT_CASES`:

  | Case | Index patient | Organism |
  |---|---|---|
  | CASE-2026-001 | 1 | *Klebsiella pneumoniae* MDR |
  | CASE-2026-004 | 4 | *Klebsiella pneumoniae* MDR |

  `ensure_default_cases()` runs any that are missing.
- **Nothing is overwritten.** Defaults that already exist are skipped and never re-run. A result is stored with `setdefault`, so a user run that lands during seeding keeps its own result.
- **Safety.** A lock stops the startup thread and a concurrent request from both running the same workflow. One default failing (for example, the database unreachable) is logged and doesn't block the other or the server.
- **Startup.** `app/main.py` adds a FastAPI `lifespan` hook that seeds on a background thread, so the server answers immediately. It logs `Default cases seeded: [...]` to the uvicorn console. `SEED_DEFAULT_CASES=0` turns it off.
- **Fallback.** The list and detail endpoints still create a missing default on demand, the same way CASE-2026-001 always worked.
- **Tests.** `backend/tests/test_default_cases.py` (6 tests, workflow stubbed) covers: both defaults seeded; an existing case never overwritten or re-run; a racing user run wins; one failure doesn't block the other; the detail endpoint seeds on demand; unknown IDs return nothing.
- **Verified by restarting the backend, twice, with no re-run:**

  | Restart | CASE-2026-004 found | Response time | POSTs |
  |---|---|---|---|
  | `--reload` restart, triggered 16:52:20 UTC | `generated_at` 16:52:28 UTC | 14 ms | none sent |
  | cold start of a fresh process, up at 23:06:06 UTC (log: `Default cases seeded: ['CASE-2026-001', 'CASE-2026-004']`) | `generated_at` 23:06:04 UTC, during startup | 12 ms (CASE-2026-001: 5 ms) | **0** in the server log |

- **Docs and copy updated to match.** The README's "Investigation storage and restarts" section now describes the seeding. The case page's not-found message now says cases other than the two demo cases disappear on restart.

### 1a.4 Graph nodes and the keyboard

Left as is, per your decision; recorded as a known limitation in §9.

---

## 2. Graph edge-click evidence fix

### 2.1 The bug

Clicking an edge opened the evidence item behind it, but often the wrong one. There were two causes:

1. **Both edges of a chain used the first hop's evidence.** `transmission-graph.tsx` read `chain.hops[0]` for every edge of a chain. So clicking a nurse → downstream edge (hop 1, General Medicine A) opened the index → nurse evidence (hop 0, ICU).
2. **Shared hops were stacked.** In CASE-2026-001 every chain runs index → Nurse Anita Sharma, so `CHAIN-001-a`, `CHAIN-002-a` and `CHAIN-003-a` were drawn as three identical edges on top of each other. Only the top one (CHAIN-003) could ever be clicked.

### 2.2 The change (edge data and click wiring only)

`src/components/investigation/transmission-graph.tsx`:

- **Each edge takes its own hop.** Hop *i* joins `nodes[i]` and `nodes[i+1]`, so edge `-a` uses `hops[0]` and edge `-b` uses `hops[1]`. Its evidence and its overlap label both come from that hop. For CASE-2026-001 both hops are 720 minutes, so the label text is unchanged.
- **Shared hops are drawn once.** A source → target pair is drawn a single time, keeping the first chain's edge id (`CHAIN-001-a`). It carries `evidenceIds` and `chainIds` from every chain that uses it.
- **The click passes every item behind the edge.** `onSelectEvidence(evidenceIds: string[])` replaces the old single-id callback.

`evidence-list.tsx` and the case page:

- On a click, the list opens every item behind the edge, outlines them all, and scrolls the first (in page order) into view under the sticky bars.
- It also announces "Opened 3 evidence items for the selected edge, one per chain that shares it" in a polite live region.

**Not changed:** edge styling, labels' styling, markers, node positions, layout constants, cluster logic and filter behaviour. The diff's only lines matching style, layout or filter keywords are comments.

### 2.3 Verification

**Every edge clicked, exact evidence checked.** The test (`scratchpad/audit/edge_evidence_test.mjs`) works out the expected mapping independently from the live API. It then clicks each contact edge at a point on its drawn path and checks four things: the exact set of evidence ids that opens, that all of them are expanded, that the first is in view, and that every hop's evidence can be reached from some edge.

| Case | Edge | Evidence opened (exactly as expected) |
|---|---|---|
| CASE-2026-001 | `CHAIN-001-a` (shared index → nurse, ICU) | `EV-STAF-ba8be1d83e3f`, `EV-STAF-83c5ca3b27a4`, `EV-STAF-2dce82615b47`, one per chain |
| CASE-2026-001 | `CHAIN-001-b` (nurse → Suresh Joshi, Gen Med A) | `EV-STAF-9ffd99ba2033` |
| CASE-2026-001 | `CHAIN-002-b` (nurse → Meenakshi Rao) | `EV-STAF-8e012d6d8edf` |
| CASE-2026-001 | `CHAIN-003-b` (nurse → Tarun Agarwal) | `EV-STAF-bd06b81cd0ab` |
| CASE-2026-004 | `CHAIN-002-direct` (Tarun → Suresh, co-location) | `EV-COLO-a49d76cc573b` |
| CASE-2026-004 | `CHAIN-003-direct` (Tarun → Meenakshi) | `EV-COLO-55fcb3d11613` |

The test also confirmed that the set of rendered edges equals the expected set, and that all hop evidence is reachable (6/6 and 2/2). **Result: 10 / 10.**

**Structure snapshot** (same method as Stage D: every node's box and transform, every edge's path `d`, and the filter states, compared with Stage D's final snapshot):

| Case | Nodes | Edges | Filters | Pixels changed |
|---|---|---|---|---|
| CASE-2026-001 | identical | `CHAIN-002-a` and `CHAIN-003-a` removed, both exact duplicates of the kept `CHAIN-001-a` path; nothing added or changed | identical | **0** |
| CASE-2026-004 | identical | identical | identical | **0** |

After all of Stage E's chrome work, nodes, edges and filters are still identical to the post-fix snapshot.

**Axe after the fix:** 0 violations on the list page and both case pages at 1440 and 390. The interaction suite passes 7/7 (its edge check now expects hop 1 for a nurse → downstream edge). Typecheck, lint, build and pytest all pass.

---

## 3. Stage E: what changed

### 3.1 New Investigation (`/investigations/new`)

- **Searchable patient picker** (`patient-picker.tsx`) replaces the raw numeric ID field.
  - **Data:** the real directory from `GET /graph/patients`, 40 patients. In fixture mode it uses the people in the sample case.
  - **Each option** shows name, MRN, latest culture (organism, resistance, date) and "Has CASE-2026-00N" when a run would replace an existing case. Patients with a culture are listed first.
  - **Keyboard and screen readers:** an ARIA combobox. Typing filters by name, MRN, id or organism; ↑↓, Home, End, Enter and Escape all work; the result count is announced.
  - **Prefill from the search palette:** `?patient=` links from the ⌘K palette preselect the patient.
- **Prefill from the patient's culture.** Organism and resistance fill in from the selected patient's latest culture and stay editable, with a hint naming where they came from. For example, patient 6 prefills *Escherichia coli*, susceptible.
- **The selected patient** is summarised as MRN, latest culture, and the case ID the backend will assign.
- **Overwrite protection (decision B: confirm before overwrite, no backend change).** When the target `CASE-2026-{id:03d}` already exists:
  - an inline note shows its status, confidence and evidence count, and links to it
  - the button reads "Run and replace CASE-2026-004"
  - submitting opens "Replace CASE-2026-004?" with focus on Cancel, Escape to close, and focus returned to the button
- **Validation.** Errors appear on the field, linked through `aria-describedby`, with `aria-invalid` set ("Choose an index patient.", "Enter the organism to investigate."). Submission failures show inline and as a toast.
- **Directory states.** Skeleton, the "Waking up the analysis service" cold-start message after 4 seconds, and an error with Retry.
- **Progress panel, kept honest as you required.** The backend runs the workflow as one synchronous request, so the panel is a staged indicator.
  - The disclaimer comes first: "Indicative only… the steps below advance on a timer. The elapsed time and the result are real; the step timings are not measured."
  - The active step is labelled "(shown, not measured)".
  - The last step holds until the real response arrives.
  - The status line ("Running. Waiting for the backend's single response." / "Finished in 4.1s.") is a live region.
- **On success:** a toast, the result added to the shared case list, then the case page opens.

### 3.2 Graph Explorer chrome (graph internals untouched)

- **Toolbar:** a labelled case picker (opens on the strongest case, or the one in `?case=`), the case's status label, confidence, chain count and organism, a **View as table** toggle (the same accessible people and relationships tables as the case page), and a link to the full investigation.
- **Filter panel at 390 px.** It no longer covers the canvas.
  - It is now a **collapsible** panel: a "Show · 4 of 4 types" button with `aria-expanded` and `aria-controls`.
  - It is **closed by default on phones** and open by default on wider screens.
  - Collapsed, it is only as wide as its label.
  - The switches inside are unchanged, and filter behaviour is identical.
- **The cluster caption** gets a capped width on phones so the caption and the button never overlap.

### 3.3 Supporting changes

- **`src/lib/patients.ts`** is a shared, cached patient directory used by both the search palette and the picker. It also holds `caseIdFor()`, which mirrors the backend's `CASE-2026-{id:03d}`.
- **New unit tests** in `src/lib/patients.test.ts` cover `caseIdFor()` and the mock-mode directory, including the index patient's culture date.

### 3.4 Data touched while testing

All in memory on your local backend; a restart resets it.

- **CASE-2026-004** was re-run twice by the "Run and replace" tests. The results are regenerated identically.
- **CASE-2026-001** was re-run by the Stage D re-run test.

---

## 4. Stage D (also uncommitted): recap

- **Investigations list.** A compact toolbar (search, status filter, three sort options). One dense table: status label, index patient with MRN, organism, contacts, an evidence-tier strip with written counts, first event, and a confidence bar. Stacked rows on phones. A "Nothing matches" state with **Clear filters**.
- **Case detail.**
  - **Header:** breadcrumbs, a 96.4% confidence figure, a mini bar of the five weighted contributions, and Re-run with confirm-before-overwrite.
  - **Sticky section nav** (Timeline · Contacts · Graph · Evidence · Scoring · Report).
  - **Timeline** on a real time axis, with ward-stay bars from recorded entry and exit times and the culture marked in red.
  - **Ranked contacts:** tier, overlap bar, "via Nurse Anita Sharma".
  - **Graph** with a **View as table** alternative.
  - **Evidence** grouped by tier with counts; HIGH is marked by a 2px red rule rather than a tint.
  - **Scoring:** one bar out of 1.00 with the backend's real thresholds (0.40 / 0.70 / 0.85) and the arithmetic written out.
  - **Report:** facts, briefing and standing protocol.
- **Graph styling (approved):** node-card text contrast raised; the wrapper's `role="img"` changed to `group`; absent filter rows use muted text instead of a 40% fade. Structure was proven unchanged.
- **Landing:** fixed a hydration mismatch in the static network SVG (server and browser trigonometry differed in the last digit); coordinates are now rounded.

---

## 5. Accessibility: before and after (axe, WCAG 2.2 AA tags + best practice)

The baseline for signed-in pages is the original code (commit `e88a4e0`), built and served separately so it could be signed into. The landing and login baseline is from Stage 0. Counts are violating nodes at 1440 / 390.

| Page | Original | Now |
|---|---|---|
| Landing `/` | 30 / 27 | **0 / 0** |
| Login (form, and error state) | 0 / 0 | **0 / 0** |
| Dashboard | 7 / 7 | **0 / 0** |
| Investigations | 4 / 3 | **0 / 0** |
| Case CASE-2026-001 | 25 / 24 | **0 / 0** |
| Case CASE-2026-004 | did not exist (5 / 4 at its first Stage D audit) | **0 / 0** |
| New investigation | 12 / 12 | **0 / 0** (also 0 with the picker open) |
| Graph explorer | 11 / 10 | **0 / 0** (also 0 in table view) |
| Search palette, user menu, mobile drawer | didn't exist | **0** |

Beyond what axe checks:

- **Every page:** one `h1`, a skip link, `header`/`nav`/`main` landmarks, a page title per route, and visible focus rings at 3:1 or better.
- **Keyboard and focus:** dialogs trap focus, close on Escape and return focus; the evidence accordion, combobox, menu and switches are fully keyboard operable.
- **Announcements:** live regions cover agent progress, toasts, edge-click results and search counts.
- **Motion and targets:** prefers-reduced-motion is respected everywhere; touch targets are 44px on phones.

---

## 6. Stage 0 audit: fixed vs. deferred

| Item | Outcome |
|---|---|
| `GET /api/investigations` took ~20 s cold | **Fixed.** 23.1 s → 5.7 s per run (contact events built once per request instead of 6×; N+1 queries batched; 140 → 21 SQL queries). Output verified identical for CASE-2026-001 and -004. Plus a 90 s read timeout with one retry, a cold-start message, and a warm-up call from the app shell. |
| In-memory investigation store | **Deferred (your decision), demo risk mitigated.** CASE-2026-001 and CASE-2026-004 are seeded at every startup (§1a.3). Other cases still disappear on restart; documented in the README and explained by the case page's not-found message. |
| POST for an existing patient silently overwrote the case | **Fixed in the UI (decision B):** confirm-before-overwrite on New Investigation and on Re-run. No backend change. |
| New Investigation asked for a raw patient ID | **Fixed:** patient picker over the new read-only `GET /graph/patients`. |
| Inert bell; top-bar search only partly wired | **Fixed:** bell removed; ⌘K / `/` search over real cases and patients. |
| Mobile sidebar open by default | **Fixed:** closed by default, closes on navigation and Escape. |
| DB session leaked per request | **Fixed:** the per-request service is closed. |
| Summary claimed "active cluster" / "verified" for every status | **Fixed** for non-cluster statuses; cluster wording unchanged. |
| Unused deps, dead code, Inter/Geist fonts, `duration-[175ms]` warning | **Fixed / removed.** recharts removed in Stage C. |
| `npm ci` failed (lockfile out of sync) | **Fixed** as a side effect of the dependency changes. |
| Outbreak curve dropped the index culture and padded fake days (found in C) | **Fixed**, with tests. |
| "+N this week" stat (from run time) and the mislabelled "High-risk contacts" | **Dropped / corrected.** |
| Landing copy that overstated the system | **Corrected:** the LLM briefing, `validate_output`, record IDs, cohort ordering, Neo4j. |
| Graph edge click opened the wrong evidence | **Fixed** (§2). |
| Starlette / httpx deprecation warning in tests | **Deferred (your decision).** |

---

## 7. Bundle size and performance

First-load JS, from production builds:

| Route | Original | Now |
|---|---|---|
| `/` | 100 kB | 121 kB (+ 128 kB gzip of three.js/fiber/drei, loaded lazily after render; never loaded with reduced motion or no WebGL) |
| `/login` | 171 kB | 174 kB |
| `/dashboard` | 243 kB | **141 kB** (recharts removed) |
| `/investigations` | 138 kB | 140 kB |
| `/investigations/[caseId]` | 202 kB | 218 kB |
| `/investigations/new` | 127 kB | 151 kB |
| `/graph` | 192 kB | 199 kB |

Hero, re-measured on the final build: 60 fps (p95 16.7 ms), CLS 0. The render loop stops when the hero is scrolled away or the tab is hidden. It also held 60 fps with the CPU throttled 4× and 6×. These measurements are from a fast machine (M4 Pro); throttling is only a stand-in for slower laptops.

---

## 8. Starting the project cleanly

**Backend:**

```bash
cd backend
./setup.sh                      # first time: venv + dependencies
source .venv/bin/activate
uvicorn app.main:app --reload --port 8000
# health check: http://localhost:8000/health
# a few seconds after boot the log prints:
#   Default cases seeded: ['CASE-2026-001', 'CASE-2026-004']
# (set SEED_DEFAULT_CASES=0 to skip startup seeding)
```

**Frontend:**

```bash
cd frontend
npm ci                          # the lockfile is in sync now
npm run dev                     # http://localhost:3000
```

**Checks:**

```bash
cd frontend && npx tsc --noEmit && npm run lint && npx vitest run
cd backend && .venv/bin/python -m pytest
```

**Important: never run `npm run build` in `frontend/` while `npm run dev` is running.** Both write to `frontend/.next`, and the build breaks the dev server; I did exactly that in Stage 0. Either stop the dev server first and `rm -rf .next` before restarting it, or build a copy elsewhere, as I did for every build since.

---

## 9. Left over / for your attention

**Resolved this round:**

- the hero copy (§1a.1)
- the phone default for the graph (§1a.2)
- CASE-2026-004 surviving a restart (§1a.3)

**Known limitations and remaining notes:**

1. **Known limitation: graph nodes aren't individually keyboard-focusable** (kept as is, per your decision).
   - The interactive graph's nodes and edges live inside React Flow, which I left untouched. Keyboard users can reach the zoom controls and the filter switches, but can't tab from node to node or open an edge's evidence by keyboard.
   - **What covers it:** the "View as table" alternative on the case page and in Graph Explorer gives keyboard and screen-reader users every person and every hop (location, window, overlap, evidence ID). The evidence list below the graph is fully keyboard operable.
   - On phones the table is now the default.
2. **The backend's briefing is long, upper-case-prefixed template text.** I fixed it only where it was untrue. Rewording it further is a backend change.
3. **The landing product frames are a static snapshot.** They're labelled "Sample data, CASE-2026-001". If the detection logic changes, regenerate the fixture as described in the README.
4. **In-memory store:** cases other than the two seeded demo cases still disappear on backend restart, as documented.
5. **Startup seeding takes a few seconds and touches the database.** On a cold host (e.g. Render waking up), the first page may show the "Waking up the analysis service" message for slightly longer while both defaults are built. Setting `SEED_DEFAULT_CASES=0` reverts to on-demand behaviour.
6. **Starlette / httpx test warning:** deferred.

### Evidence

All screenshots and test scripts are under:

`/private/tmp/claude-501/-Users-saeeshsandipvele-NextBuildion/ff754ddd-b76a-49ae-b89c-c7151bbb7a24/scratchpad/audit/`

- **`out/final/`:** every signed-in page at 1440, 1280 and 390, plus the search palette, the masked user menu and the drawer.
- **`out/stageE/`:**
  - picker open and picked
  - validation
  - overwrite warning and the replace confirm
  - running state with disclaimer
  - directory cold start and error
  - graph at 390 with filters collapsed and open
  - graph table view
  - phone table defaults: `x_graph_390_table_default.png` and `x_case_390_table_default.png`
- **`out/edgefix/`:** the shared-edge click result.
- **`out/stageD_graph/`:** structure snapshots (`after2.json` → `edgefix.json` → `final.json`) and pixel diffs.
- **`out/final_public/`:** landing and login.

Test scripts: `edge_evidence_test.mjs`, `stageD_interactions.mjs`, `stageE_interactions.mjs`, `graph_geometry.mjs`, `audit.mjs`.
