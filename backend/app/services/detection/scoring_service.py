"""
Deterministic Scoring & Risk Evaluation Framework (Phase 3B).

Computes an explainable, multi-dimensional score and confidence metric
from aggregated epidemiological evidence without black-box heuristics.
"""

from typing import List, Tuple
from app.schemas.detection import (
    EvidenceItem,
    ScoringDimension,
    ScoringBreakdown,
    InvestigationStatus,
)


class OutbreakScoringService:
    # Configurable dimension weights (sum = 1.00)
    WEIGHTS = {
        "temporal_contact": 0.30,
        "organism_match": 0.25,
        "resistance_match": 0.20,
        "intermediary_contact": 0.15,
        "lab_temporal_proximity": 0.10,
    }

    def compute_scoring_breakdown(
        self, evidence_list: List[EvidenceItem]
    ) -> Tuple[ScoringBreakdown, InvestigationStatus]:
        """Calculates multi-dimensional weighted score and determines investigation status."""
        ev_types = [e.type for e in evidence_list]

        dimensions: List[ScoringDimension] = []

        # 1. Temporal Contact Dimension
        contact_evs = [e for e in evidence_list if e.type in ("patient_colocation", "temporal_staff_overlap")]
        contact_raw = 0.0
        if contact_evs:
            max_strength = max(e.strength for e in contact_evs)
            contact_raw = min(1.0, max_strength)
        w_contact = self.WEIGHTS["temporal_contact"]
        dimensions.append(
            ScoringDimension(
                dimension="Temporal Contact Overlap",
                raw_score=round(contact_raw, 3),
                weight=w_contact,
                weighted_score=round(contact_raw * w_contact, 3),
                evidence_count=len(contact_evs),
                description="Evidence of physical co-location or continuous shift contact overlap.",
            )
        )

        # 2. Organism Match Dimension
        org_evs = [e for e in evidence_list if e.type == "same_organism"]
        org_raw = 1.0 if org_evs else 0.0
        w_org = self.WEIGHTS["organism_match"]
        dimensions.append(
            ScoringDimension(
                dimension="Microbiological Match",
                raw_score=round(org_raw, 3),
                weight=w_org,
                weighted_score=round(org_raw * w_org, 3),
                evidence_count=len(org_evs),
                description="Concordant bacterial pathogen identification from validated culture.",
            )
        )

        # 3. Resistance Match Dimension
        res_evs = [e for e in evidence_list if e.type == "same_resistance_profile"]
        res_raw = 1.0 if res_evs else 0.0
        w_res = self.WEIGHTS["resistance_match"]
        dimensions.append(
            ScoringDimension(
                dimension="Antimicrobial Resistance Phenotype",
                raw_score=round(res_raw, 3),
                weight=w_res,
                weighted_score=round(res_raw * w_res, 3),
                evidence_count=len(res_evs),
                description="Matching phenotypic resistance profile (e.g. MDR / XDR).",
            )
        )

        # 4. Intermediary Mediated Contact Dimension
        staff_evs = [e for e in evidence_list if e.type == "temporal_staff_overlap" and e.mediator is not None]
        staff_raw = 1.0 if staff_evs else (0.5 if "patient_colocation" in ev_types else 0.0)
        w_staff = self.WEIGHTS["intermediary_contact"]
        dimensions.append(
            ScoringDimension(
                dimension="Shared Clinical Intermediary",
                raw_score=round(staff_raw, 3),
                weight=w_staff,
                weighted_score=round(staff_raw * w_staff, 3),
                evidence_count=len(staff_evs),
                description="Identified healthcare vector or shared clinical attendant.",
            )
        )

        # 5. Lab Temporal Proximity Dimension
        lab_prox_evs = [e for e in evidence_list if e.type == "temporal_lab_proximity"]
        prox_raw = max([e.strength for e in lab_prox_evs], default=0.0)
        w_prox = self.WEIGHTS["lab_temporal_proximity"]
        dimensions.append(
            ScoringDimension(
                dimension="Specimen Temporal Clustering",
                raw_score=round(prox_raw, 3),
                weight=w_prox,
                weighted_score=round(prox_raw * w_prox, 3),
                evidence_count=len(lab_prox_evs),
                description="Temporal clustering of positive culture collection dates.",
            )
        )

        # Total Score & Confidence
        total_score = sum(d.weighted_score for d in dimensions)
        confidence = min(1.0, max(0.0, total_score))

        # Status Classification
        if confidence >= 0.85:
            status: InvestigationStatus = "SUSPECTED_CLUSTER"
        elif confidence >= 0.70:
            status: InvestigationStatus = "HIGH_PRIORITY_INVESTIGATION"
        elif confidence >= 0.40:
            status: InvestigationStatus = "POTENTIAL_CONTACT"
        else:
            status: InvestigationStatus = "NO_SIGNAL"

        breakdown = ScoringBreakdown(
            total_score=round(total_score, 3),
            normalized_confidence=round(confidence, 3),
            dimensions=dimensions,
        )

        return breakdown, status
