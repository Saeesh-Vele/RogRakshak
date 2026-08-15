# RogRakshak Infection Detection & Outbreak Investigation Architecture

This document specifies the Detection / Investigation Layer (Phase 3B) of RogRakshak, detailing evidence aggregation, multi-dimensional deterministic scoring, LangGraph workflow orchestration, transmission hypothesis generation, and the REST API contracts consumed by the Frontend Team.

---

## 1. Pipeline & Architectural Separation

```
+-------------------------------------------------------------+
|                     PostgreSQL Database                     |
|           (Clinical Records, Movements, AST Labs)           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                     Graph / Crafting Layer                  |
|    (Contact Events, GraphQueryService, Neo4j Graph DB)      |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                   Graph Evidence Provider                   |
|   (LiveGraphEvidenceProvider / MockGraphEvidenceProvider)   |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|              LangGraph StateGraph Workflow Engine           |
|  [LoadContext] -> [GetCohort] -> [AggregateEvidence] ->     |
|  [ScoreEvidence] -> [BuildChains] -> [SynthesizeSummary] -> |
|  [ValidateOutput]                                           |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|               Investigation Service & REST API              |
|        (GET /api/investigations, POST /api/investigations)  |
+------------------------------+------------------------------+
                               |
                               v
+-------------------------------------------------------------+
|                    Next.js 14 Frontend UI                   |
+-------------------------------------------------------------+
```

---

## 2. Core Architectural Principle: Fact vs Reasoning

| Category | Definition | Example in RogRakshak |
|---|---|---|
| **Fact / Evidence** | Verifiable observation from verified electronic health record, movement log, or lab culture. | *Patient 1 and Staff 1 overlapped in ICU for 720 minutes; Patient 1 and Patient 2 both tested positive for MDR K. pneumoniae.* |
| **Reasoning / Hypothesis** | Analytical interpretation assessing plausibility and transmission potential. | *Patient 1 $\to$ Staff 1 $\to$ Patient 2 is an evidence-supported suspected contact pathway with 94.0% confidence.* |

> [!IMPORTANT]
> The system does not claim definitive clinical transmission. It models **suspected contact pathways** and **evidence-supported cluster hypotheses** to assist infection preventionists.

---

## 3. Evidence Model

Every finding is backed by explicit, atomic `EvidenceItem` instances corresponding directly to underlying source contact events:

```json
[
  {
    "evidence_id": "EV-STAF-87e2b10a9c14",
    "type": "temporal_staff_overlap",
    "subject_patient_id": 1,
    "object_patient_id": 2,
    "mediator": {
      "type": "staff",
      "id": 1,
      "name": "Nurse Anita Sharma",
      "role": "nurse"
    },
    "location": "Intensive Care Unit (ICU)",
    "start_time": "2026-08-03T16:00:00",
    "end_time": "2026-08-04T04:00:00",
    "overlap_minutes": 720.0,
    "source": "movements",
    "event_id": "EVT-PS-8d19760773dcf068",
    "source_record_ids": {"patient_movement_id": 1, "staff_movement_id": 161, "ward_id": 1},
    "strength": 0.92,
    "explanation": "Index Patient 1 had 720m continuous contact with Nurse Anita Sharma in Intensive Care Unit (ICU) (2026-08-03T16:00:00 to 2026-08-04T04:00:00)."
  },
  {
    "evidence_id": "EV-STAF-91f4c32b11a5",
    "type": "temporal_staff_overlap",
    "subject_patient_id": 1,
    "object_patient_id": 2,
    "mediator": {
      "type": "staff",
      "id": 1,
      "name": "Nurse Anita Sharma",
      "role": "nurse"
    },
    "location": "General Medicine A",
    "start_time": "2026-08-05T16:00:00",
    "end_time": "2026-08-06T04:00:00",
    "overlap_minutes": 720.0,
    "source": "movements",
    "event_id": "EVT-PS-b31a89d0124f5678",
    "source_record_ids": {"patient_movement_id": 4, "staff_movement_id": 172, "ward_id": 2},
    "strength": 0.92,
    "explanation": "Candidate Patient 2 had 720m continuous contact with Nurse Anita Sharma in General Medicine A (2026-08-05T16:00:00 to 2026-08-06T04:00:00)."
  }
]
```

### Supported Evidence Types:
- `temporal_staff_overlap`: Index and candidate interacted with the same healthcare worker during overlapping shift intervals.
- `patient_colocation`: Index and candidate shared a ward/room during overlapping stay intervals.
- `shared_procedure_staff`: Index and candidate underwent procedures attended by common clinical staff.
- `same_organism`: Both patients tested positive for the exact pathogen in validated microbiology cultures.
- `same_resistance_profile`: Isolates share concordant phenotypic resistance classifications (e.g. `MDR`).
- `temporal_lab_proximity`: Specimen collection dates cluster within the incubation/outbreak time window.

---

## 4. Deterministic Scoring Model

Total risk/confidence score is computed as a weighted sum of explainable evidence dimensions:

$$\text{Total Score} = \sum_{i} (\text{Raw Score}_i \times \text{Weight}_i)$$

| Scoring Dimension | Configured Weight | Description |
|---|---|---|
| **Temporal Contact Overlap** | `0.30` | Duration and continuity of physical co-location or shift overlap. |
| **Microbiological Match** | `0.25` | Concordant bacterial species identification from validated culture. |
| **Antimicrobial Resistance Phenotype** | `0.20` | Matching phenotypic resistance profile (e.g. MDR). |
| **Shared Clinical Intermediary** | `0.15` | Identified healthcare vector or shared clinical attendant. |
| **Specimen Temporal Clustering** | `0.10` | Clustering of positive culture collection dates ($\le 14$ days). |

### Status Classification Taxonomy:
- **$\ge 0.85$**: `SUSPECTED_CLUSTER`
- **$0.70 - 0.84$**: `HIGH_PRIORITY_INVESTIGATION`
- **$0.40 - 0.69$**: `POTENTIAL_CONTACT`
- **$< 0.40$**: `NO_SIGNAL`

---

## 5. LangGraph StateGraph Architecture

The workflow is orchestrated via a compiled LangGraph `StateGraph` with typed `InvestigationState`:

```
START
  ↓
[load_context]       (Fetches index patient metadata & clinical timeline)
  ↓
[get_cohort]          (Queries matching microbial cohort across hospital)
  ↓
[aggregate_evidence]  (Evaluates contact paths & builds atomic EvidenceItems)
  ↓
[score_evidence]      (Calculates multi-dimensional score & assigns status)
  ↓
[build_chains]        (Constructs transmission chain hypotheses & timeline)
  ↓
[synthesize_summary]  (Produces executive epidemiological briefing)
  ↓
[validate_output]     (Enforces strict structural and referential integrity)
  ↓
END
```

---

## 6. Frontend Investigation API Contract

### Endpoints
- `GET /api/investigations` — Returns all active investigation cases.
- `GET /api/investigations/{case_id}` — Returns the full structured dossier for a case.
- `POST /api/investigations` — Triggers a new investigation workflow.
- `GET /api/investigations/{case_id}/evidence` — Returns supporting `EvidenceItem` array.
- `GET /api/investigations/{case_id}/timeline` — Returns combined incident chronological timeline.

### Sample Response (`GET /api/investigations/CASE-2026-001`)
```json
{
  "case_id": "CASE-2026-001",
  "status": "SUSPECTED_CLUSTER",
  "organism": "Klebsiella pneumoniae",
  "resistance_profile": "MDR",
  "confidence": 0.94,
  "scoring": {
    "total_score": 0.94,
    "normalized_confidence": 0.94,
    "dimensions": [
      {
        "dimension": "Temporal Contact Overlap",
        "raw_score": 0.92,
        "weight": 0.3,
        "weighted_score": 0.276,
        "evidence_count": 3,
        "description": "Evidence of physical co-location or continuous shift contact overlap."
      }
    ]
  },
  "index_patient": {
    "id": 1,
    "name": "Rajesh Verma (Index)",
    "mrn": "MRN-2026-1001",
    "role": "index",
    "admission_date": "2026-08-01T10:00:00"
  },
  "candidate_patients": [
    {"id": 2, "name": "Suresh Joshi", "role": "candidate"},
    {"id": 3, "name": "Meenakshi Rao", "role": "candidate"},
    {"id": 4, "name": "Tarun Agarwal", "role": "candidate"}
  ],
  "transmission_chains": [
    {
      "chain_id": "CHAIN-001",
      "nodes": [
        {"type": "patient", "id": 1, "name": "Rajesh Verma (Index)"},
        {"type": "staff", "id": 1, "name": "Nurse Anita Sharma", "role": "nurse"},
        {"type": "patient", "id": 2, "name": "Suresh Joshi"}
      ],
      "total_overlap_minutes": 1440.0,
      "confidence": 0.94
    }
  ]
}
```

---

## 7. Verification & Planted Outbreak Recovery

Running `pytest backend/tests`:
- **Planted Outbreak**: Recovered 100% of the planted cluster (Index Rajesh Verma $\to$ Nurse Anita Sharma $\to$ Suresh Joshi, Meenakshi Rao, Tarun Agarwal) with $0.94$ confidence and `SUSPECTED_CLUSTER` status.
- **Negative Control Isolation**: Non-overlapping patients in the same ward (e.g. Deepak Chopra vs Divya Sharma) generate $0$ direct contact evidence items and produce `NO_SIGNAL`.
- **Repeatability**: Repeated runs against the same graph state produce identical deterministic outputs.
