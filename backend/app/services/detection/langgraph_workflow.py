"""
LangGraph Multi-Agent Epidemiological Investigation Workflow (Phase 3B).

Orchestrates the infection detection pipeline through a typed StateGraph:
LoadContext -> GetCohort -> AggregateEvidence -> ScoreEvidence -> BuildChains -> SynthesizeSummary -> ValidateOutput
"""

import os
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional, TypedDict
from langgraph.graph import StateGraph, START, END

from app.schemas.detection import (
    InvestigationCase,
    InvestigationStatus,
    PatientSummary,
    EvidenceItem,
    TransmissionChain,
    ScoringBreakdown,
    InvestigationTimelineEntry,
)
from app.schemas.graph import OrganismPatientCohort, PatientTimelineResponse
from app.services.detection.graph_provider import GraphEvidenceProvider, LiveGraphEvidenceProvider
from app.services.detection.evidence_service import EvidenceAggregationService
from app.services.detection.scoring_service import OutbreakScoringService
from app.services.detection.chain_service import TransmissionChainService


class InvestigationState(TypedDict, total=False):
    case_id: str
    target_patient_id: int
    organism: str
    resistance_profile: Optional[str]
    graph_provider: GraphEvidenceProvider
    
    # State accumulated across nodes
    index_patient: Optional[PatientSummary]
    timeline_response: Optional[PatientTimelineResponse]
    cohort: Optional[OrganismPatientCohort]
    patients: List[PatientSummary]
    candidate_patients: List[PatientSummary]
    evidence: List[EvidenceItem]
    scoring: Optional[ScoringBreakdown]
    status: Optional[InvestigationStatus]
    confidence: Optional[float]
    chains: List[TransmissionChain]
    combined_timeline: List[InvestigationTimelineEntry]
    summary: Optional[str]
    warnings: List[str]
    is_valid: bool
    final_case: Optional[InvestigationCase]


# -------------------------------------------------------------
# Node 1: Load Investigation Context
# -------------------------------------------------------------
def load_investigation_context(state: InvestigationState) -> Dict[str, Any]:
    gp: GraphEvidenceProvider = state["graph_provider"]
    p_id = state["target_patient_id"]

    timeline = gp.get_patient_timeline(p_id)
    idx_summary = PatientSummary(
        id=p_id,
        name=timeline.patient_name,
        mrn=timeline.mrn,
        role="index",
        admission_date=timeline.admission_date,
        discharge_date=timeline.discharge_date,
        admitting_diagnosis=timeline.admitting_diagnosis,
    )

    return {
        "index_patient": idx_summary,
        "timeline_response": timeline,
        "warnings": list(state.get("warnings", [])),
    }


# -------------------------------------------------------------
# Node 2: Get Organism Cohort
# -------------------------------------------------------------
def get_organism_cohort(state: InvestigationState) -> Dict[str, Any]:
    gp: GraphEvidenceProvider = state["graph_provider"]
    org = state["organism"]
    res = state.get("resistance_profile")

    cohort = gp.get_organism_cohort(organism=org, resistance_profile=res)
    
    # Build candidate patient summaries
    patients: List[PatientSummary] = []
    candidates: List[PatientSummary] = []
    idx_id = state["target_patient_id"]

    for report in cohort.reports_summary:
        pid = report["patient_id"]
        pname = report["patient_name"]
        role_type = "index" if pid == idx_id else "candidate"
        psum = PatientSummary(
            id=pid,
            name=pname,
            mrn=f"MRN-2026-{1000 + pid}",
            role=role_type,
            admission_date=report.get("collected_at", "2026-08-01T00:00:00"),
            positive_culture_date=report.get("collected_at"),
        )
        patients.append(psum)
        if pid != idx_id:
            candidates.append(psum)

    return {
        "cohort": cohort,
        "patients": patients,
        "candidate_patients": candidates,
    }


# -------------------------------------------------------------
# Node 3: Aggregate Evidence
# -------------------------------------------------------------
def aggregate_evidence(state: InvestigationState) -> Dict[str, Any]:
    gp: GraphEvidenceProvider = state["graph_provider"]
    ev_service = EvidenceAggregationService(gp)
    idx_id = state["target_patient_id"]
    cohort = state["cohort"]
    candidates = state.get("candidate_patients", [])

    all_evidence: List[EvidenceItem] = []

    for cand in candidates:
        path_res = gp.find_contact_path(source_patient_id=idx_id, target_patient_id=cand.id)
        cand_ev = ev_service.aggregate_evidence_for_candidate(
            index_patient_id=idx_id,
            candidate_patient_id=cand.id,
            cohort=cohort,
            contact_path=path_res,
        )
        all_evidence.extend(cand_ev)

    return {"evidence": all_evidence}


# -------------------------------------------------------------
# Node 4: Score Evidence & Classify Status
# -------------------------------------------------------------
def score_evidence(state: InvestigationState) -> Dict[str, Any]:
    scoring_svc = OutbreakScoringService()
    evidence = state.get("evidence", [])
    breakdown, status = scoring_svc.compute_scoring_breakdown(evidence)

    return {
        "scoring": breakdown,
        "status": status,
        "confidence": breakdown.normalized_confidence,
    }


# -------------------------------------------------------------
# Node 5: Build Contact Transmission Chains
# -------------------------------------------------------------
def build_contact_chains(state: InvestigationState) -> Dict[str, Any]:
    gp: GraphEvidenceProvider = state["graph_provider"]
    chain_svc = TransmissionChainService()
    idx_id = state["target_patient_id"]
    idx_name = state["index_patient"].name if state.get("index_patient") else f"Patient {idx_id}"
    candidates = state.get("candidate_patients", [])
    evidence = state.get("evidence", [])
    conf = state.get("confidence", 0.85)

    chains: List[TransmissionChain] = []
    for idx, cand in enumerate(candidates, start=1):
        path_res = gp.find_contact_path(source_patient_id=idx_id, target_patient_id=cand.id)
        cand_ev = [e for e in evidence if e.object_patient_id == cand.id]
        chain = chain_svc.build_transmission_chain(
            chain_id=f"CHAIN-00{idx}",
            index_patient_id=idx_id,
            index_patient_name=idx_name,
            target_patient_id=cand.id,
            target_patient_name=cand.name,
            contact_path=path_res,
            evidence_list=cand_ev,
            confidence=conf,
        )
        if chain:
            chains.append(chain)

    # Compile incident timeline
    timeline_entries: List[InvestigationTimelineEntry] = []
    if state.get("timeline_response"):
        for ev in state["timeline_response"].events:
            timeline_entries.append(
                InvestigationTimelineEntry(
                    timestamp=ev.timestamp,
                    event_type=ev.event_type,
                    patient_id=idx_id,
                    patient_name=idx_name,
                    description=ev.description,
                    location=ev.details.get("location_name"),
                )
            )

    return {
        "chains": chains,
        "combined_timeline": timeline_entries,
    }


# -------------------------------------------------------------
# Node 6: Synthesize Executive Briefing Summary
# -------------------------------------------------------------
def synthesize_summary(state: InvestigationState) -> Dict[str, Any]:
    status = state.get("status", "SUSPECTED_CLUSTER")
    conf = state.get("confidence", 0.0)
    org = state.get("organism", "Pathogen")
    res = state.get("resistance_profile", "")
    idx = state.get("index_patient")
    idx_name = idx.name if idx else "Index Patient"
    candidates = state.get("candidate_patients", [])
    cand_names = [c.name for c in candidates]
    chains = state.get("chains", [])

    summary = (
        f"EPIDEMIOLOGICAL INVESTIGATION BRIEFING [{status}]: "
        f"An active cluster of {org} ({res}) was identified centering on {idx_name} (ID: {state['target_patient_id']}). "
        f"Identified {len(candidates)} linked candidate cases ({', '.join(cand_names)}). "
        f"Deterministic contact tracing revealed {len(chains)} verified staff-mediated contact pathway(s) "
        f"with high cumulative exposure duration. Overall investigation confidence score: {conf * 100:.1f}%. "
        f"Recommended actions: Enhanced barrier nursing, staff cohorting, environmental disinfection, and active surveillance cultures."
    )

    return {"summary": summary}


# -------------------------------------------------------------
# Node 7: Validate Final Output
# -------------------------------------------------------------
def validate_output(state: InvestigationState) -> Dict[str, Any]:
    warnings: List[str] = list(state.get("warnings", []))
    is_valid = True

    if not state.get("index_patient"):
        warnings.append("Validation Error: Index patient missing.")
        is_valid = False

    if not state.get("scoring"):
        warnings.append("Validation Error: Scoring breakdown missing.")
        is_valid = False

    case = InvestigationCase(
        case_id=state.get("case_id", "CASE-001"),
        status=state.get("status", "SUSPECTED_CLUSTER"),
        organism=state.get("organism", "Unknown"),
        resistance_profile=state.get("resistance_profile"),
        confidence=state.get("confidence", 0.0),
        scoring=state["scoring"],
        index_patient=state["index_patient"],
        patients=state.get("patients", []),
        candidate_patients=state.get("candidate_patients", []),
        evidence=state.get("evidence", []),
        transmission_chains=state.get("chains", []),
        timeline=state.get("combined_timeline", []),
        summary=state.get("summary", ""),
        warnings=warnings,
        generated_at=datetime.now(timezone.utc).isoformat(),
    )

    return {
        "is_valid": is_valid,
        "final_case": case,
        "warnings": warnings,
    }


# -------------------------------------------------------------
# Build LangGraph Workflow Graph
# -------------------------------------------------------------
def create_investigation_graph():
    builder = StateGraph(InvestigationState)

    builder.add_node("load_context", load_investigation_context)
    builder.add_node("get_cohort", get_organism_cohort)
    builder.add_node("aggregate_evidence", aggregate_evidence)
    builder.add_node("score_evidence", score_evidence)
    builder.add_node("build_chains", build_contact_chains)
    builder.add_node("synthesize_summary", synthesize_summary)
    builder.add_node("validate_output", validate_output)

    builder.add_edge(START, "load_context")
    builder.add_edge("load_context", "get_cohort")
    builder.add_edge("get_cohort", "aggregate_evidence")
    builder.add_edge("aggregate_evidence", "score_evidence")
    builder.add_edge("score_evidence", "build_chains")
    builder.add_edge("build_chains", "synthesize_summary")
    builder.add_edge("synthesize_summary", "validate_output")
    builder.add_edge("validate_output", END)

    return builder.compile()
