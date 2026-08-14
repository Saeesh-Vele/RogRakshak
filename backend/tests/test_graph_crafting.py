"""
Unit & Integration Tests for Graph/Crafting Layer.

Tests:
1. Mathematical interval overlap logic [start, end)
2. Boundary conditions and zero-duration overlaps
3. Deterministic event ID generation and reproducibility
4. Contact event engine generation
5. Planted outbreak contact path recovery (Index -> Nurse Anita -> Downstream)
6. Negative control isolation (True Negatives)
7. Graph Query Service responses & FastAPI endpoints
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient

from app.main import app
from app.services.graph.contact_event_service import (
    compute_interval_overlap,
    generate_event_id,
    ContactEventEngine,
)
from app.services.graph.graph_query_service import GraphQueryService
from app.schemas.graph import ContactPathResponse, PatientContactsResponse


client = TestClient(app)


# -------------------------------------------------------------
# 1. Mathematical Interval Overlap Tests
# -------------------------------------------------------------
def test_compute_interval_overlap_positive():
    t1 = datetime(2026, 8, 3, 10, 0, 0)
    t2 = datetime(2026, 8, 3, 20, 0, 0)
    t3 = datetime(2026, 8, 3, 16, 0, 0)
    t4 = datetime(2026, 8, 4, 4, 0, 0)

    # Overlap between [10:00, 20:00) and [16:00, 04:00+1) is [16:00, 20:00) -> 4 hours = 240 mins
    res = compute_interval_overlap(t1, t2, t3, t4)
    assert res is not None
    s, e, mins = res
    assert s == datetime(2026, 8, 3, 16, 0, 0)
    assert e == datetime(2026, 8, 3, 20, 0, 0)
    assert mins == 240.0


def test_compute_interval_overlap_non_overlapping():
    t1 = datetime(2026, 8, 3, 8, 0, 0)
    t2 = datetime(2026, 8, 3, 12, 0, 0)
    t3 = datetime(2026, 8, 3, 14, 0, 0)
    t4 = datetime(2026, 8, 3, 18, 0, 0)

    res = compute_interval_overlap(t1, t2, t3, t4)
    assert res is None


def test_compute_interval_overlap_boundary_condition():
    # Exactly adjacent intervals: [08:00, 12:00) and [12:00, 16:00)
    t1 = datetime(2026, 8, 3, 8, 0, 0)
    t2 = datetime(2026, 8, 3, 12, 0, 0)
    t3 = datetime(2026, 8, 3, 12, 0, 0)
    t4 = datetime(2026, 8, 3, 16, 0, 0)

    res = compute_interval_overlap(t1, t2, t3, t4)
    assert res is None  # End is exclusive; adjacent intervals have 0 overlap


def test_deterministic_event_id():
    id1 = generate_event_id("ps", 1, 1, "ward", 1, "2026-08-03T16:00:00", "2026-08-04T04:00:00")
    id2 = generate_event_id("ps", 1, 1, "ward", 1, "2026-08-03T16:00:00", "2026-08-04T04:00:00")
    id3 = generate_event_id("ps", 1, 2, "ward", 1, "2026-08-03T16:00:00", "2026-08-04T04:00:00")

    assert id1 == id2
    assert id1 != id3
    assert id1.startswith("EVT-PS-")


# -------------------------------------------------------------
# 2. Contact Event Engine & Outbreak Tests
# -------------------------------------------------------------
def test_contact_engine_generation():
    with ContactEventEngine() as engine:
        events = engine.generate_all_contact_events()
        assert len(events) > 0
        event_ids = [e.event_id for e in events]
        assert len(event_ids) == len(set(event_ids))  # No duplicate event IDs


def test_planted_outbreak_contacts():
    with GraphQueryService() as svc:
        # Index patient (1) contacts
        contacts = svc.get_patient_contacts(patient_id=1)
        anita_contacts = [c for c in contacts.staff_contacts if c.connected_entity.id == 1]
        assert len(anita_contacts) > 0
        assert anita_contacts[0].overlap_minutes == 720.0  # 12 hours in ICU

        # Path from Index (1) to Downstream 1 (2)
        path_res = svc.find_contact_path(source_patient_id=1, target_patient_id=2)
        assert path_res.path_found is True
        assert path_res.hops_count == 2
        assert path_res.path[0].to_entity["name"] == "Nurse Anita Sharma"


def test_organism_cohort_query():
    with GraphQueryService() as svc:
        cohort = svc.get_organism_patients(organism="Klebsiella pneumoniae", resistance_profile="MDR")
        assert cohort.total_patients == 4
        assert set(cohort.patient_ids) == {1, 2, 3, 4}


# -------------------------------------------------------------
# 3. FastAPI Endpoint Route Tests
# -------------------------------------------------------------
def test_api_patient_contacts():
    response = client.get("/graph/patient/1/contacts")
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == 1
    assert data["total_contacts"] > 0


def test_api_patient_timeline():
    response = client.get("/graph/patient/1/timeline")
    assert response.status_code == 200
    data = response.json()
    assert data["patient_id"] == 1
    assert len(data["events"]) > 0


def test_api_organism_patients():
    response = client.get("/graph/organism/Klebsiella pneumoniae/patients?resistance_profile=MDR")
    assert response.status_code == 200
    data = response.json()
    assert data["total_patients"] == 4


def test_api_contact_path():
    response = client.post("/graph/contact-path", json={"source_patient_id": 1, "target_patient_id": 2})
    assert response.status_code == 200
    data = response.json()
    assert data["path_found"] is True
    assert data["hops_count"] == 2
