"""
Deterministic Evidence Aggregation Engine (Phase 3B).

Gathers objective facts from graph and laboratory records to build structured,
verifiable EvidenceItems linking an index patient to candidate cases.
"""

import hashlib
from datetime import datetime
from typing import List, Dict, Any, Optional

from app.schemas.detection import EvidenceItem, EvidenceMediator
from app.schemas.graph import OrganismPatientCohort, ContactPathResponse, PatientContactsResponse
from app.services.detection.graph_provider import GraphEvidenceProvider


class EvidenceAggregationService:
    def __init__(self, graph_provider: GraphEvidenceProvider):
        self.graph = graph_provider

    def generate_evidence_id(self, ev_type: str, p1: int, p2: int, extra: str = "") -> str:
        raw = f"{ev_type}:{p1}:{p2}:{extra}"
        digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:12]
        return f"EV-{ev_type.upper()[:4]}-{digest}"

    def aggregate_evidence_for_candidate(
        self,
        index_patient_id: int,
        candidate_patient_id: int,
        cohort: OrganismPatientCohort,
        contact_path: ContactPathResponse,
    ) -> List[EvidenceItem]:
        """Aggregates all objective evidence linking index patient to candidate patient."""
        evidence_list: List[EvidenceItem] = []

        # 1. Same Organism Evidence
        idx_reports = [r for r in cohort.reports_summary if r["patient_id"] == index_patient_id]
        cand_reports = [r for r in cohort.reports_summary if r["patient_id"] == candidate_patient_id]

        if idx_reports and cand_reports:
            ev_id = self.generate_evidence_id("organism", index_patient_id, candidate_patient_id, cohort.organism)
            evidence_list.append(
                EvidenceItem(
                    evidence_id=ev_id,
                    type="same_organism",
                    subject_patient_id=index_patient_id,
                    object_patient_id=candidate_patient_id,
                    source="lab_reports",
                    strength=0.90,
                    explanation=(
                        f"Both Patient {index_patient_id} and Patient {candidate_patient_id} "
                        f"tested positive for {cohort.organism} in validated microbiology cultures."
                    ),
                )
            )

            # 2. Same Resistance Profile Evidence
            idx_res = idx_reports[0].get("resistance_profile")
            cand_res = cand_reports[0].get("resistance_profile")
            if idx_res and cand_res and idx_res.lower() == cand_res.lower():
                ev_id = self.generate_evidence_id("resistance", index_patient_id, candidate_patient_id, idx_res)
                evidence_list.append(
                    EvidenceItem(
                        evidence_id=ev_id,
                        type="same_resistance_profile",
                        subject_patient_id=index_patient_id,
                        object_patient_id=candidate_patient_id,
                        source="lab_reports",
                        strength=0.95,
                        explanation=(
                            f"Identical antimicrobial resistance phenotype ({idx_res}) "
                            f"confirmed across both patient isolates."
                        ),
                    )
                )

            # 3. Temporal Lab Proximity Evidence
            try:
                t1 = datetime.fromisoformat(idx_reports[0]["collected_at"])
                t2 = datetime.fromisoformat(cand_reports[0]["collected_at"])
                delta_days = abs((t2 - t1).total_seconds()) / 86400.0
                if delta_days <= 14.0:
                    ev_id = self.generate_evidence_id("lab_proximity", index_patient_id, candidate_patient_id, f"{delta_days:.1f}d")
                    evidence_list.append(
                        EvidenceItem(
                            evidence_id=ev_id,
                            type="temporal_lab_proximity",
                            subject_patient_id=index_patient_id,
                            object_patient_id=candidate_patient_id,
                            start_time=idx_reports[0]["collected_at"],
                            end_time=cand_reports[0]["collected_at"],
                            source="lab_reports",
                            strength=max(0.60, 1.0 - (delta_days / 14.0) * 0.4),
                            explanation=(
                                f"Culture sample collection dates are temporally clustered within {delta_days:.1f} days "
                                f"({idx_reports[0]['collected_at'][:10]} to {cand_reports[0]['collected_at'][:10]})."
                            ),
                        )
                    )
            except Exception:
                pass

        # 4. Contact Path Evidence (Direct or Staff-Mediated)
        if contact_path.path_found:
            if contact_path.hops_count == 1:
                # Direct Co-location
                hop = contact_path.path[0]
                ev = hop.contact_event
                ev_id = self.generate_evidence_id("colocation", index_patient_id, candidate_patient_id, ev.event_id)
                evidence_list.append(
                    EvidenceItem(
                        evidence_id=ev_id,
                        type="patient_colocation",
                        subject_patient_id=index_patient_id,
                        object_patient_id=candidate_patient_id,
                        location=ev.location.name,
                        start_time=ev.start_time,
                        end_time=ev.end_time,
                        overlap_minutes=ev.overlap_minutes,
                        source="movements",
                        strength=0.95,
                        explanation=(
                            f"Direct patient co-location documented in {ev.location.name} "
                            f"with {ev.overlap_minutes:.1f} minutes of continuous temporal overlap."
                        ),
                    )
                )
            elif contact_path.hops_count == 2:
                # Staff Mediated Contact
                hop1 = contact_path.path[0]
                hop2 = contact_path.path[1]
                staff_info = hop1.to_entity
                ev1 = hop1.contact_event
                ev2 = hop2.contact_event

                ev_id = self.generate_evidence_id("staff_overlap", index_patient_id, candidate_patient_id, f"s{staff_info['id']}")
                evidence_list.append(
                    EvidenceItem(
                        evidence_id=ev_id,
                        type="temporal_staff_overlap",
                        subject_patient_id=index_patient_id,
                        object_patient_id=candidate_patient_id,
                        mediator=EvidenceMediator(
                            type="staff",
                            id=staff_info["id"],
                            name=staff_info["name"],
                            role=staff_info.get("role", "nurse"),
                        ),
                        location=f"{ev1.location.name} -> {ev2.location.name}",
                        start_time=ev1.start_time,
                        end_time=ev2.end_time,
                        overlap_minutes=ev1.overlap_minutes + ev2.overlap_minutes,
                        source="movements",
                        strength=0.92,
                        explanation=(
                            f"Shared clinical contact mediated by {staff_info['name']} (Staff ID: {staff_info['id']}). "
                            f"Interacted with Index in {ev1.location.name} ({ev1.overlap_minutes:.0f}m overlap) "
                            f"followed by Candidate in {ev2.location.name} ({ev2.overlap_minutes:.0f}m overlap)."
                        ),
                    )
                )

        return evidence_list
