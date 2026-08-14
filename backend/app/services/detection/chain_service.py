"""
Transmission Chain & Suspected Contact Pathway Construction Service (Phase 3B).

Builds structured, explainable transmission chain hypotheses linking an index patient
to candidate downstream cases through verified intermediaries.
"""

from typing import List, Optional
from app.schemas.detection import (
    TransmissionChain,
    TransmissionChainNode,
    TransmissionChainHop,
    EvidenceItem,
)
from app.schemas.graph import ContactPathResponse


class TransmissionChainService:
    def build_transmission_chain(
        self,
        chain_id: str,
        index_patient_id: int,
        index_patient_name: str,
        target_patient_id: int,
        target_patient_name: str,
        contact_path: ContactPathResponse,
        evidence_list: List[EvidenceItem],
        confidence: float,
    ) -> Optional[TransmissionChain]:
        """Constructs a TransmissionChain hypothesis if a valid path exists."""
        if not contact_path.path_found or not contact_path.path:
            return None

        nodes: List[TransmissionChainNode] = []
        hops: List[TransmissionChainHop] = []
        total_overlap = 0.0

        if contact_path.hops_count == 1:
            # Direct 1-hop path
            hop = contact_path.path[0]
            ev = hop.contact_event
            total_overlap = ev.overlap_minutes

            nodes.append(
                TransmissionChainNode(type="patient", id=index_patient_id, name=index_patient_name)
            )
            nodes.append(
                TransmissionChainNode(type="patient", id=target_patient_id, name=target_patient_name)
            )

            # Find matching evidence ID
            matching_ev = next((e for e in evidence_list if e.type == "patient_colocation"), None)
            ev_id = matching_ev.evidence_id if matching_ev else "EV-DIRECT"

            hops.append(
                TransmissionChainHop(
                    from_id=index_patient_id,
                    via_id=None,
                    to_id=target_patient_id,
                    overlap_minutes=ev.overlap_minutes,
                    location=ev.location.name,
                    start_time=ev.start_time,
                    end_time=ev.end_time,
                    evidence_id=ev_id,
                )
            )
            desc = (
                f"Direct co-location contact pathway between {index_patient_name} and {target_patient_name} "
                f"in {ev.location.name} ({ev.overlap_minutes:.0f} mins continuous overlap)."
            )

        elif contact_path.hops_count == 2:
            # 2-hop Staff-mediated path
            hop1 = contact_path.path[0]
            hop2 = contact_path.path[1]
            staff = hop1.to_entity
            ev1 = hop1.contact_event
            ev2 = hop2.contact_event
            total_overlap = ev1.overlap_minutes + ev2.overlap_minutes

            nodes.append(
                TransmissionChainNode(type="patient", id=index_patient_id, name=index_patient_name)
            )
            nodes.append(
                TransmissionChainNode(
                    type="staff", id=staff["id"], name=staff["name"], role=staff.get("role", "nurse")
                )
            )
            nodes.append(
                TransmissionChainNode(type="patient", id=target_patient_id, name=target_patient_name)
            )

            matching_ev = next((e for e in evidence_list if e.type == "temporal_staff_overlap"), None)
            ev_id = matching_ev.evidence_id if matching_ev else "EV-STAFF"

            hops.append(
                TransmissionChainHop(
                    from_id=index_patient_id,
                    via_id=staff["id"],
                    to_id=target_patient_id,
                    overlap_minutes=ev1.overlap_minutes + ev2.overlap_minutes,
                    location=f"{ev1.location.name} -> {ev2.location.name}",
                    start_time=ev1.start_time,
                    end_time=ev2.end_time,
                    evidence_id=ev_id,
                )
            )
            desc = (
                f"Staff-mediated suspected transmission pathway from {index_patient_name} to {target_patient_name} "
                f"via {staff['name']} ({staff.get('role', 'staff')}, ID: {staff['id']}) across "
                f"{ev1.location.name} and {ev2.location.name}."
            )

        else:
            return None

        return TransmissionChain(
            chain_id=chain_id,
            nodes=nodes,
            hops=hops,
            total_overlap_minutes=round(total_overlap, 1),
            confidence=round(confidence, 3),
            description=desc,
        )
