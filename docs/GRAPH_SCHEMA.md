# RogRakshak Neo4j Graph & Contact Event Schema

This document specifies the Graph/Crafting Layer architecture for RogRakshak, detailing the node models, relationship types, deterministic temporal overlap engine, query service contracts, and ingestion workflows.

---

## 1. Graph Architecture & Pipeline

```
PostgreSQL Database
       ↓
Deterministic Contact Event Engine ([start, end) interval overlap)
       ↓
Intermediate Artifact (`data/contact_events.json`)
       ↓
Neo4j Graph Database (`MERGE` Ingestion & Constraints)
       ↓
Graph Query Service (`GraphQueryService` & REST API `/graph/*`)
       ↓
Detection Team (LangGraph Epidemiologist, Surveillance Agents)
```

---

## 2. Node Schema & Properties

All nodes maintain their stable primary keys from the PostgreSQL database.

### `(:Patient)`
Represents hospitalized patients.
- `id` (`Integer`, Unique Constraint)
- `name` (`String`)
- `mrn` (`String`)
- `admission_date` (`ISO-8601 String`)
- `discharge_date` (`ISO-8601 String`, nullable)
- `admitting_diagnosis` (`String`, nullable)

### `(:Staff)`
Represents healthcare personnel (nurses, doctors, technicians).
- `id` (`Integer`, Unique Constraint)
- `name` (`String`)
- `role` (`String`, e.g. `'nurse'`, `'doctor'`, `'technician'`)
- `department` (`String`)

### `(:Ward)`
Represents hospital clinical wards / units.
- `id` (`Integer`, Unique Constraint)
- `name` (`String`, e.g. `'Intensive Care Unit (ICU)'`, `'General Medicine A'`)
- `department` (`String`)

### `(:Bed)`
Represents individual inpatient beds.
- `id` (`Integer`, Unique Constraint)
- `bed_number` (`String`)
- `ward_id` (`Integer`)

### `(:Procedure)`
Represents clinical procedures performed on patients.
- `id` (`Integer`, Unique Constraint)
- `patient_id` (`Integer`)
- `procedure_type` (`String`)
- `location_id` (`Integer`)
- `start_time` (`ISO-8601 String`)
- `end_time` (`ISO-8601 String`)

### `(:LabReport)`
Represents diagnostic microbiology reports.
- `id` (`Integer`, Unique Constraint)
- `patient_id` (`Integer`)
- `specimen_type` (`String`)
- `organism` (`String`)
- `resistance_profile` (`String`, e.g. `'MDR'`, `'susceptible'`)
- `collected_at` (`ISO-8601 String`)
- `reported_at` (`ISO-8601 String`)
- `status` (`String`, e.g. `'final'`)
- `raw_report_path` (`String`)

### `(:Antibiotic)`
Represents antimicrobial susceptibility testing (AST) panel results.
- `id` (`Integer`, Unique Constraint)
- `lab_report_id` (`Integer`)
- `antibiotic` (`String`)
- `result` (`String`, e.g. `'Resistant (R)'`, `'Susceptible (S)'`)
- `mic` (`String`, e.g. `'> 32 ug/mL'`, `'<= 0.5 ug/mL'`)
- `interp` (`String`, e.g. `'R'`, `'S'`, `'I'`)

---

## 3. Relationship Schema

### Structural Relationships
- `(:Bed)-[:LOCATED_IN]->(:Ward)`
- `(:Patient)-[:STAYED_IN {movement_id, entry_time, exit_time}]->(:Bed)`
- `(:Patient)-[:ADMITTED_TO {movement_id, entry_time, exit_time}]->(:Ward)`
- `(:Staff)-[:ASSIGNED_TO {movement_id, entry_time, exit_time}]->(:Ward)`
- `(:Patient)-[:UNDERWENT]->(:Procedure)`
- `(:Procedure)-[:PERFORMED_BY]->(:Staff)`
- `(:Procedure)-[:OCCURRED_IN]->(:Ward)`
- `(:Patient)-[:HAS_LAB_REPORT]->(:LabReport)`
- `(:LabReport)-[:HAS_ANTIBIOTIC_RESULT]->(:Antibiotic)`

### Temporal Evidence Contact Relationships
- `(:Patient)-[:CONTACT_WITH {event_id, contact_type, location_type, location_id, location_name, start_time, end_time, overlap_minutes, evidence_source}]->(:Staff)`
- `(:Patient)-[:CO_LOCATED_WITH {event_id, contact_type, location_type, location_id, location_name, start_time, end_time, overlap_minutes, evidence_source}]->(:Patient)`

> [!NOTE]
> The graph layer models **objective temporal evidence**, not speculative transmission conclusions. No `(:Patient)-[:INFECTED]->(:Patient)` edges are created in this layer.

---

## 4. Temporal Overlap Algorithm

Temporal interaction between two events $[start_a, end_a)$ and $[start_b, end_b)$ is computed using half-open intervals:
1. **Overlap Condition**:
   $$\max(start_a, start_b) < \min(end_a, end_b)$$
2. **Overlap Window**:
   $$start_{ovlp} = \max(start_a, start_b), \quad end_{ovlp} = \min(end_a, end_b)$$
3. **Overlap Duration**:
   $$duration_{mins} = \frac{(end_{ovlp} - start_{ovlp})\text{ in seconds}}{60.0}$$
4. **Boundary Rule**: Adjacent non-overlapping intervals ($end_a = start_b$) have $0$ overlap duration and are discarded.
5. **Deterministic Event ID**:
   $$\text{EVT-PREFIX}-\text{SHA256}(\text{prefix}:\text{id}_1:\text{id}_2:\text{loc}:\text{start}:\text{end})[:16]$$

---

## 5. Contact Event Intermediate Schema (`data/contact_events.json`)

```json
{
  "event_id": "EVT-PS-8d19760773dcf068",
  "contact_type": "patient_staff",
  "patient_id": 1,
  "patient_name": "Rajesh Verma (Index)",
  "connected_entity": {
    "type": "staff",
    "id": 1,
    "name": "Nurse Anita Sharma",
    "role_or_diagnosis": "nurse"
  },
  "location": {
    "type": "ward",
    "id": 1,
    "name": "Intensive Care Unit (ICU)"
  },
  "start_time": "2026-08-03T16:00:00",
  "end_time": "2026-08-04T04:00:00",
  "overlap_minutes": 720.0,
  "evidence_source": [
    "movements"
  ],
  "source_record_ids": {
    "patient_movement_id": 1,
    "staff_movement_id": 161,
    "ward_id": 1
  }
}
```

---

## 6. Graph Query Service Contract (for Detection Team)

The `GraphQueryService` (`backend/app/services/graph/graph_query_service.py`) and FastAPI endpoints expose:

### 1. `GET /graph/patient/{patient_id}/contacts`
Returns all staff contacts and co-located patient stays.
- Output: `PatientContactsResponse`

### 2. `GET /graph/patient/{patient_id}/timeline`
Returns chronological clinical journey (admissions, ward stays, bed transfers, procedures, microbiology cultures).
- Output: `PatientTimelineResponse`

### 3. `GET /graph/organism/{organism}/patients?resistance_profile=MDR`
Retrieves patient cohorts with positive culture results for a given microbe and resistance pattern.
- Output: `OrganismPatientCohort`

### 4. `POST /graph/contact-path`
Finds direct or staff-mediated transmission contact pathways between two patients.
- Request: `{"source_patient_id": 1, "target_patient_id": 2}`
- Output: `ContactPathResponse`

---

## 7. Execution Commands

```bash
# 1. Generate Contact Events Intermediate Artifact
python data/generate_contact_events.py

# 2. Verify Contact Events (Outbreak & True Negatives)
python data/verify_contact_events.py

# 3. Ingest Graph into Neo4j (and export Cypher dump)
python data/build_neo4j_graph.py

# 4. Verify Neo4j Graph & Query Service
python data/verify_neo4j_graph.py

# 5. Export Mock Graph Fixtures
python data/export_mock_fixtures.py

# 6. Run Complete Test Suite
pytest backend/tests
```

---

## 8. Planted Outbreak & Control Verification Results

- **Index Patient (ID 1) + Nurse Anita Sharma (ID 1)**: Verified 12.0h overlap in ICU (`2026-08-03 16:00` -> `2026-08-04 04:00`).
- **Nurse Anita Sharma (ID 1) + Downstream Patients (IDs 2, 3, 4)**: Verified 12.0h overlaps in General Medicine A (`2026-08-05 16:00` -> `2026-08-06 04:00` & `2026-08-06 16:00` -> `2026-08-07 04:00`).
- **2-Hop Transmission Paths Recovered**:
  - `Rajesh Verma (Index)` → `Nurse Anita Sharma` → `Suresh Joshi (Downstream 1)`
  - `Rajesh Verma (Index)` → `Nurse Anita Sharma` → `Meenakshi Rao (Downstream 2)`
  - `Rajesh Verma (Index)` → `Nurse Anita Sharma` → `Tarun Agarwal (Downstream 3)`
- **True Negative Control Isolation**: Patients in the same ward without temporal overlap (e.g. `Deepak Chopra` vs `Divya Sharma`) generate zero direct or single-shift contact edges.
