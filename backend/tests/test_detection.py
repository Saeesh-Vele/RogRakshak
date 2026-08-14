"""
Unit & Integration Tests for Detection & Investigation Layer (Phase 3B).

Tests:
1. Candidate generation & organism cohort filtering
2. Staff-mediated contact evidence aggregation
3. Concordant antimicrobial resistance evidence matching
4. Negative control true-negative behavior
5. Multi-dimensional explainable scoring & confidence calculation
6. Transmission chain construction & formatting
7. LangGraph StateGraph execution (live and mock providers)
8. Output schema validation
9. FastAPI investigation endpoints
10. Execution idempotency & repeatability
"""

import pytest
from fastapi.testclient import TestClient

from app.main import app
from app.schemas.detection import InvestigationCase, InvestigationListResponse
from app.services.detection.graph_provider import LiveGraphEvidenceProvider, MockGraphEvidenceProvider
from app.services.detection.evidence_service import EvidenceAggregationService
from app.services.detection.scoring_service import OutbreakScoringService
from app.services.detection.chain_service import TransmissionChainService
from app.services.detection.investigation_service import InvestigationService
from app.services.detection.langgraph_workflow import create_investigation_graph, InvestigationState

client = TestClient(app)


# -------------------------------------------------------------
# 1. Graph Provider & Evidence Tests
# -------------------------------------------------------------
def test_mock_graph_provider():
    mock_gp = MockGraphEvidenceProvider()
    contacts = mock_gp.get_patient_contacts(patient_id=1)
    assert contacts.patient_id == 1
    assert contacts.total_contacts > 0

    cohort = mock_gp.get_organism_cohort(organism="Klebsiella pneumoniae", resistance_profile="MDR")
    assert cohort.total_patients == 4

    path = mock_gp.find_contact_path(source_patient_id=1, target_patient_id=2)
    assert path.path_found is True
    assert path.hops_count == 2


def test_evidence_aggregation_planted_cluster():
    live_gp = LiveGraphEvidenceProvider()
    try:
        ev_svc = EvidenceAggregationService(live_gp)
        cohort = live_gp.get_organism_cohort(organism="Klebsiella pneumoniae", resistance_profile="MDR")
        path = live_gp.find_contact_path(source_patient_id=1, target_patient_id=2)

        evidence = ev_svc.aggregate_evidence_for_candidate(
            index_patient_id=1,
            candidate_patient_id=2,
            cohort=cohort,
            contact_path=path,
        )

        ev_types = [e.type for e in evidence]
        assert "same_organism" in ev_types
        assert "same_resistance_profile" in ev_types
        assert "temporal_staff_overlap" in ev_types

        # Verify atomic evidence provenance: TWO discrete 720-minute EvidenceItems
        staff_evs = [e for e in evidence if e.type == "temporal_staff_overlap"]
        assert len(staff_evs) == 2

        # Hop 1: Index Patient in ICU
        hop1_ev = staff_evs[0]
        assert hop1_ev.mediator.name == "Nurse Anita Sharma"
        assert hop1_ev.location == "Intensive Care Unit (ICU)"
        assert hop1_ev.overlap_minutes == 720.0
        assert hop1_ev.event_id is not None
        assert "patient_movement_id" in hop1_ev.source_record_ids

        # Hop 2: Candidate Patient in General Medicine A
        hop2_ev = staff_evs[1]
        assert hop2_ev.mediator.name == "Nurse Anita Sharma"
        assert hop2_ev.location == "General Medicine A"
        assert hop2_ev.overlap_minutes == 720.0
        assert hop2_ev.event_id is not None
        assert "patient_movement_id" in hop2_ev.source_record_ids
    finally:
        live_gp.close()


def test_negative_control_isolation():
    """Verify that non-overlapping negative control patients produce NO contact evidence."""
    mock_gp = MockGraphEvidenceProvider()
    # Non-existent or non-overlapping target ID (e.g. 99)
    path = mock_gp.find_contact_path(source_patient_id=1, target_patient_id=99)
    assert path.path_found is False


# -------------------------------------------------------------
# 2. Scoring & Transmission Chain Tests
# -------------------------------------------------------------
def test_outbreak_scoring_dimensions():
    scoring_svc = OutbreakScoringService()
    mock_gp = MockGraphEvidenceProvider()
    ev_svc = EvidenceAggregationService(mock_gp)
    cohort = mock_gp.get_organism_cohort(organism="Klebsiella pneumoniae", resistance_profile="MDR")
    path = mock_gp.find_contact_path(source_patient_id=1, target_patient_id=2)

    evidence = ev_svc.aggregate_evidence_for_candidate(1, 2, cohort, path)
    breakdown, status = scoring_svc.compute_scoring_breakdown(evidence)

    assert breakdown.total_score >= 0.85
    assert breakdown.normalized_confidence >= 0.85
    assert status == "SUSPECTED_CLUSTER"
    assert len(breakdown.dimensions) == 5


def test_transmission_chain_construction():
    chain_svc = TransmissionChainService()
    mock_gp = MockGraphEvidenceProvider()
    ev_svc = EvidenceAggregationService(mock_gp)
    cohort = mock_gp.get_organism_cohort(organism="Klebsiella pneumoniae", resistance_profile="MDR")
    path = mock_gp.find_contact_path(source_patient_id=1, target_patient_id=2)
    evidence = ev_svc.aggregate_evidence_for_candidate(1, 2, cohort, path)

    chain = chain_svc.build_transmission_chain(
        chain_id="CHAIN-001",
        index_patient_id=1,
        index_patient_name="Rajesh Verma (Index)",
        target_patient_id=2,
        target_patient_name="Suresh Joshi",
        contact_path=path,
        evidence_list=evidence,
        confidence=0.94,
    )

    assert chain is not None
    assert chain.chain_id == "CHAIN-001"
    assert len(chain.nodes) == 3
    assert chain.nodes[0].name == "Rajesh Verma (Index)"
    assert chain.nodes[1].name == "Nurse Anita Sharma"
    assert chain.nodes[2].name == "Suresh Joshi"

    # Discrete hops linking to atomic evidence items
    assert len(chain.hops) == 2
    assert chain.hops[0].from_id == 1
    assert chain.hops[0].to_id == 1  # Staff ID 1
    assert chain.hops[0].overlap_minutes == 720.0
    assert chain.hops[0].location == "Intensive Care Unit (ICU)"

    assert chain.hops[1].from_id == 1  # Staff ID 1
    assert chain.hops[1].to_id == 2  # Patient ID 2
    assert chain.hops[1].overlap_minutes == 720.0
    assert chain.hops[1].location == "General Medicine A"

    assert chain.total_overlap_minutes == 1440.0  # 720m + 720m


# -------------------------------------------------------------
# 3. LangGraph Workflow Execution Tests
# -------------------------------------------------------------
def test_langgraph_investigation_workflow_mock():
    workflow = create_investigation_graph()
    mock_gp = MockGraphEvidenceProvider()

    initial_state: InvestigationState = {
        "case_id": "CASE-TEST-001",
        "target_patient_id": 1,
        "organism": "Klebsiella pneumoniae",
        "resistance_profile": "MDR",
        "graph_provider": mock_gp,
        "warnings": [],
    }

    final_state = workflow.invoke(initial_state)
    assert final_state["is_valid"] is True
    case: InvestigationCase = final_state["final_case"]

    assert case.case_id == "CASE-TEST-001"
    assert case.status in ("SUSPECTED_CLUSTER", "HIGH_PRIORITY_INVESTIGATION")
    assert case.index_patient.id == 1
    assert len(case.candidate_patients) == 3
    assert len(case.transmission_chains) == 3
    assert case.confidence >= 0.85


def test_investigation_service_repeatability():
    """Ensure running the investigation twice yields identical results."""
    svc = InvestigationService(graph_provider=MockGraphEvidenceProvider())
    case1 = svc.run_investigation(target_patient_id=1, case_id="CASE-R1")
    case2 = svc.run_investigation(target_patient_id=1, case_id="CASE-R2")

    assert case1.confidence == case2.confidence
    assert case1.status == case2.status
    assert len(case1.evidence) == len(case2.evidence)
    assert len(case1.transmission_chains) == len(case2.transmission_chains)


# -------------------------------------------------------------
# 4. FastAPI Endpoint Tests
# -------------------------------------------------------------
def test_api_list_investigations():
    response = client.get("/api/investigations")
    assert response.status_code == 200
    data = response.json()
    assert "total_cases" in data
    assert data["total_cases"] >= 1


def test_api_get_investigation_by_id():
    response = client.get("/api/investigations/CASE-2026-001")
    assert response.status_code == 200
    data = response.json()
    assert data["case_id"] == "CASE-2026-001"
    assert data["status"] == "SUSPECTED_CLUSTER"
    assert data["organism"] == "Klebsiella pneumoniae"
    assert data["index_patient"]["id"] == 1


def test_api_create_investigation():
    payload = {
        "target_patient_id": 1,
        "organism": "Klebsiella pneumoniae",
        "resistance_profile": "MDR",
        "use_mock_graph": True,
    }
    response = client.post("/api/investigations", json=payload)
    assert response.status_code == 200
    data = response.json()
    assert data["index_patient"]["id"] == 1
    assert data["confidence"] >= 0.85


def test_api_get_investigation_evidence_and_timeline():
    ev_resp = client.get("/api/investigations/CASE-2026-001/evidence")
    assert ev_resp.status_code == 200
    assert isinstance(ev_resp.json(), list)
    assert len(ev_resp.json()) > 0

    tl_resp = client.get("/api/investigations/CASE-2026-001/timeline")
    assert tl_resp.status_code == 200
    assert isinstance(tl_resp.json(), list)
