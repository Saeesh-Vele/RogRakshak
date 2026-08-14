# RogRakshak Architecture Overview

RogRakshak is an intelligent healthcare and hospital-acquired infection (HAI) surveillance, contact tracing, and outbreak investigation platform. It unifies structured clinical records, high-dimensional temporal interaction graphs, and multi-agent AI orchestration to detect, explain, and contain pathogen transmission networks.

---

## Phased Architecture & Components

```
                      +-----------------------------+
                      |   Next.js 14 Dashboard      |
                      | (React Flow Graph + Plotly) |
                      +--------------+--------------+
                                     |  REST / SSE
                                     v
                      +-----------------------------+
                      |   FastAPI Backend Service   |
                      +--------------+--------------+
                                     |
           +-------------------------+-------------------------+
           |                         |                         |
           v                         v                         v
+--------------------+    +--------------------+    +--------------------+
|  PostgreSQL DB     |    |   Neo4j Graph DB   |    | LangGraph & Gemini |
| Structured Records |    | Temporal Contacts  |    | Multi-Agent Engine |
+--------------------+    +--------------------+    +--------------------+
```

### 1. PostgreSQL for Structured Records
- **Role**: Relational persistence engine for structured clinical entities and state machines.
- **Key Data Models**:
  - `Patients`, `Healthcare Staff`, `Wards / Rooms / Beds`
  - `Admission / Discharge / Transfer (ADT)` movement logs
  - `Microbiology & Lab Culture Results` (pathogen identification, antibiograms, sample collection times)
  - `Alerts & Outbreak Incidents` with audit history.

### 2. Neo4j for the Temporal Interaction Graph
- **Role**: Native graph database modeling dynamic spatial and temporal interactions across hospital resources.
- **Key Graph Entities & Relationships**:
  - **Nodes**: `(:Patient)`, `(:Staff)`, `(:Location)`, `(:Equipment)`, `(:CultureSample)`
  - **Edges with Time Windows**:
    - `(:Patient)-[:OCCUPIED {start_time, end_time, bed_id}]->(:Location)`
    - `(:Staff)-[:ATTENDED {timestamp, duration, role}]->(:Patient)`
    - `(:Patient)-[:CO_LOCATED {overlap_minutes, ward_id}]->(:Patient)`
    - `(:Patient)-[:TESTED_POSITIVE {specimen_date, organism, strain}]->(:Pathogen)`
- **Capabilities**: Temporal pathfinding, multi-hop transmission chain detection, shared exposure clustering, and superspreader identification.

### 3. LangGraph Multi-Agent Orchestration with Gemini
- **Role**: Autonomous reasoning engine coordinating specialized investigative agents powered by Google Gemini.
- **Agent Workflow**:
  - **Surveillance Agent**: Monitors incoming culture results and triggers anomaly alerts when clustering thresholds are breached.
  - **Epidemiologist Agent**: Queries Neo4j for contact overlaps and transmission trees, building chronological timelines.
  - **Genomics & Resistance Agent**: Correlates resistance profiles across patient isolates to evaluate strain relatedness.
  - **Synthesis Agent**: Produces actionable outbreak briefings, confidence scores, and containment intervention checklists.

### 4. Next.js 14 Modern Frontend Dashboard
- **Role**: High-performance operator dashboard for infection preventionists and clinical epidemiologists.
- **Key Visualization Tools**:
  - **Interactive Network Graph**: Powered by `@xyflow/react` for visual inspection of transmission trees, contact clusters, and ward interactions.
  - **Temporal & Microbe Timelines**: Powered by `Plotly.js` (`react-plotly.js`) for multi-track patient journey timelines, ward occupancy heatmaps, and epidemic curves.
  - **Data Tables & State**: `@tanstack/react-table` for sortable/filterable patient registers and `zustand` for real-time state management.
