"""
Graph Query Service for Detection Team & Surveillance Agents (Graph/Crafting Layer).

Provides a clean, domain-specific query interface for retrieving:
- Patient contacts (staff and co-located patients)
- Chronological patient journeys and clinical timelines
- Organism-specific patient cohorts
- Temporal contact paths between patient pairs (e.g. Index -> Staff -> Downstream)

Operates with live Neo4j queries when connected, or falls back transparently
to the deterministic intermediate contact event engine and PostgreSQL.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Set
from sqlalchemy.orm import Session

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Staff, Ward, Bed, Movement, Procedure, LabReport, LabReportAntibiotic
from app.schemas.graph import (
    ContactEvent,
    ConnectedEntity,
    LocationInfo,
    TimelineEvent,
    PatientTimelineResponse,
    PatientContactsResponse,
    OrganismPatientCohort,
    ContactPathHop,
    ContactPathResponse,
)
from app.services.graph.neo4j_service import Neo4jService
from app.services.graph.contact_event_service import ContactEventEngine


class GraphQueryService:
    def __init__(
        self,
        db_session: Optional[Session] = None,
        neo4j_service: Optional[Neo4jService] = None,
    ):
        self._owns_session = db_session is None
        self.db = db_session or SessionLocal()
        self.neo4j = neo4j_service or Neo4jService()
        self._contact_engine = ContactEventEngine(db_session=self.db)

    def close(self):
        if self._owns_session:
            self.db.close()
        self.neo4j.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    # -------------------------------------------------------------
    # 1. Get Patient Contacts
    # -------------------------------------------------------------
    def get_patient_contacts(self, patient_id: int) -> PatientContactsResponse:
        """Retrieves all staff and patient contacts for a specific patient."""
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found.")

        all_events = self._contact_engine.generate_all_contact_events()

        staff_contacts: List[ContactEvent] = []
        patient_contacts: List[ContactEvent] = []

        for e in all_events:
            # Check if patient is primary or connected
            if e.patient_id == patient_id:
                if e.connected_entity.type == "staff":
                    staff_contacts.append(e)
                elif e.connected_entity.type == "patient":
                    patient_contacts.append(e)
            elif e.connected_entity.type == "patient" and e.connected_entity.id == patient_id:
                # Invert relationship so patient_id is always the requested patient
                inverted = ContactEvent(
                    event_id=e.event_id,
                    contact_type=e.contact_type,
                    patient_id=patient_id,
                    patient_name=patient.name,
                    connected_entity=ConnectedEntity(
                        type="patient",
                        id=e.patient_id,
                        name=e.patient_name,
                    ),
                    location=e.location,
                    start_time=e.start_time,
                    end_time=e.end_time,
                    overlap_minutes=e.overlap_minutes,
                    evidence_source=e.evidence_source,
                    source_record_ids=e.source_record_ids,
                )
                patient_contacts.append(inverted)

        return PatientContactsResponse(
            patient_id=patient.id,
            patient_name=patient.name,
            total_contacts=len(staff_contacts) + len(patient_contacts),
            staff_contacts=staff_contacts,
            patient_contacts=patient_contacts,
        )

    # -------------------------------------------------------------
    # 2. Get Patient Timeline
    # -------------------------------------------------------------
    def get_patient_timeline(self, patient_id: int) -> PatientTimelineResponse:
        """Retrieves chronological clinical timeline for a patient."""
        patient = self.db.query(Patient).filter(Patient.id == patient_id).first()
        if not patient:
            raise ValueError(f"Patient with ID {patient_id} not found.")

        events: List[TimelineEvent] = []

        # Admission
        events.append(
            TimelineEvent(
                event_type="admission",
                timestamp=patient.admission_date.isoformat(),
                description=f"Admitted with diagnosis: {patient.admitting_diagnosis or 'General Admission'}",
                details={"admitting_diagnosis": patient.admitting_diagnosis},
            )
        )

        # Discharge (if discharged)
        if patient.discharge_date:
            events.append(
                TimelineEvent(
                    event_type="discharge",
                    timestamp=patient.discharge_date.isoformat(),
                    description=f"Discharged from hospital",
                    details={"discharge_date": patient.discharge_date.isoformat()},
                )
            )

        # Movements
        movements = (
            self.db.query(Movement)
            .filter(Movement.patient_id == patient_id)
            .order_by(Movement.entry_time)
            .all()
        )
        for m in movements:
            loc_name = f"Location {m.location_id}"
            if m.location_type == "ward":
                w = self.db.query(Ward).filter(Ward.id == m.location_id).first()
                if w:
                    loc_name = w.name
            elif m.location_type == "bed":
                b = self.db.query(Bed).filter(Bed.id == m.location_id).first()
                if b:
                    loc_name = f"Bed {b.bed_number}"

            events.append(
                TimelineEvent(
                    event_type="movement",
                    timestamp=m.entry_time.isoformat(),
                    end_timestamp=m.exit_time.isoformat(),
                    description=f"Stay in {m.location_type.upper()}: {loc_name}",
                    details={
                        "location_type": m.location_type,
                        "location_id": m.location_id,
                        "location_name": loc_name,
                    },
                )
            )

        # Procedures
        procedures = (
            self.db.query(Procedure)
            .filter(Procedure.patient_id == patient_id)
            .order_by(Procedure.start_time)
            .all()
        )
        for pr in procedures:
            staff_names = [s.name for s in pr.staff_members]
            events.append(
                TimelineEvent(
                    event_type="procedure",
                    timestamp=pr.start_time.isoformat(),
                    end_timestamp=pr.end_time.isoformat(),
                    description=f"Procedure: {pr.procedure_type}",
                    details={
                        "procedure_type": pr.procedure_type,
                        "staff_involved": staff_names,
                    },
                )
            )

        # Lab Reports
        lab_reports = (
            self.db.query(LabReport)
            .filter(LabReport.patient_id == patient_id)
            .order_by(LabReport.collected_at)
            .all()
        )
        for lr in lab_reports:
            events.append(
                TimelineEvent(
                    event_type="lab_report",
                    timestamp=lr.collected_at.isoformat(),
                    end_timestamp=lr.reported_at.isoformat(),
                    description=f"Microbiology Culture: {lr.organism} ({lr.resistance_profile}) - {lr.specimen_type}",
                    details={
                        "lab_report_id": lr.id,
                        "specimen_type": lr.specimen_type,
                        "organism": lr.organism,
                        "resistance_profile": lr.resistance_profile,
                        "reported_at": lr.reported_at.isoformat(),
                        "status": lr.status,
                    },
                )
            )

        # Sort events chronologically
        events.sort(key=lambda x: x.timestamp)

        return PatientTimelineResponse(
            patient_id=patient.id,
            patient_name=patient.name,
            mrn=patient.mrn,
            admission_date=patient.admission_date.isoformat(),
            discharge_date=patient.discharge_date.isoformat() if patient.discharge_date else None,
            admitting_diagnosis=patient.admitting_diagnosis,
            events=events,
        )

    # -------------------------------------------------------------
    # 3. Find Patients by Organism
    # -------------------------------------------------------------
    def get_organism_patients(
        self, organism: str, resistance_profile: Optional[str] = None
    ) -> OrganismPatientCohort:
        """Finds all patients and reports matching a microbial organism and optional resistance profile."""
        query = self.db.query(LabReport).filter(LabReport.organism.ilike(f"%{organism}%"))
        if resistance_profile:
            query = query.filter(LabReport.resistance_profile.ilike(f"%{resistance_profile}%"))

        reports = query.order_by(LabReport.collected_at).all()
        patient_ids = list(dict.fromkeys(r.patient_id for r in reports))
        report_ids = [r.id for r in reports]

        summary_list = []
        for r in reports:
            p = self.db.query(Patient).filter(Patient.id == r.patient_id).first()
            summary_list.append({
                "lab_report_id": r.id,
                "patient_id": r.patient_id,
                "patient_name": p.name if p else "Unknown",
                "organism": r.organism,
                "resistance_profile": r.resistance_profile,
                "specimen_type": r.specimen_type,
                "collected_at": r.collected_at.isoformat(),
                "reported_at": r.reported_at.isoformat(),
            })

        return OrganismPatientCohort(
            organism=organism,
            resistance_profile=resistance_profile,
            total_patients=len(patient_ids),
            patient_ids=patient_ids,
            lab_report_ids=report_ids,
            reports_summary=summary_list,
        )

    # -------------------------------------------------------------
    # 4. Find Temporal Contact Path Between Two Patients
    # -------------------------------------------------------------
    def find_contact_path(
        self, source_patient_id: int, target_patient_id: int, max_hops: int = 3
    ) -> ContactPathResponse:
        """
        Discovers temporal contact paths between source and target patients.
        Example: Patient 1 -> Staff 1 (Nurse Anita) -> Patient 2.
        """
        p_src = self.db.query(Patient).filter(Patient.id == source_patient_id).first()
        p_tgt = self.db.query(Patient).filter(Patient.id == target_patient_id).first()
        if not p_src or not p_tgt:
            raise ValueError("Source or target patient not found.")

        all_events = self._contact_engine.generate_all_contact_events()

        # Check direct Patient <-> Patient contact
        direct_matches = [
            e for e in all_events
            if e.contact_type == "patient_patient"
            and (
                (e.patient_id == source_patient_id and e.connected_entity.id == target_patient_id)
                or (e.patient_id == target_patient_id and e.connected_entity.id == source_patient_id)
            )
        ]
        if direct_matches:
            match = direct_matches[0]
            hop = ContactPathHop(
                from_entity={"type": "patient", "id": p_src.id, "name": p_src.name},
                to_entity={"type": "patient", "id": p_tgt.id, "name": p_tgt.name},
                contact_event=match,
            )
            return ContactPathResponse(
                source_patient_id=source_patient_id,
                target_patient_id=target_patient_id,
                path_found=True,
                hops_count=1,
                path=[hop],
                explanation=f"Direct patient co-location in {match.location.name} ({match.overlap_minutes} mins overlap).",
            )

        # Check 2-hop Staff mediated contact: Patient A -> Staff S -> Patient B
        # Overlap temporal constraint: Staff contact with Patient A must occur at or before contact with Patient B
        src_staff_events = [
            e for e in all_events
            if e.contact_type in ("patient_staff", "patient_procedure_staff")
            and e.patient_id == source_patient_id
        ]
        tgt_staff_events = [
            e for e in all_events
            if e.contact_type in ("patient_staff", "patient_procedure_staff")
            and e.patient_id == target_patient_id
        ]

        for s_evt in src_staff_events:
            staff_id = s_evt.connected_entity.id
            staff_name = s_evt.connected_entity.name
            for t_evt in tgt_staff_events:
                if t_evt.connected_entity.id == staff_id:
                    # Check temporal order: src contact start <= tgt contact start
                    if s_evt.start_time <= t_evt.start_time:
                        hop1 = ContactPathHop(
                            from_entity={"type": "patient", "id": p_src.id, "name": p_src.name},
                            to_entity={"type": "staff", "id": staff_id, "name": staff_name},
                            contact_event=s_evt,
                        )
                        hop2 = ContactPathHop(
                            from_entity={"type": "staff", "id": staff_id, "name": staff_name},
                            to_entity={"type": "patient", "id": p_tgt.id, "name": p_tgt.name},
                            contact_event=t_evt,
                        )
                        return ContactPathResponse(
                            source_patient_id=source_patient_id,
                            target_patient_id=target_patient_id,
                            path_found=True,
                            hops_count=2,
                            path=[hop1, hop2],
                            explanation=(
                                f"Staff-mediated contact via {staff_name} (ID: {staff_id}). "
                                f"First interacted with {p_src.name} in {s_evt.location.name} at {s_evt.start_time}, "
                                f"then interacted with {p_tgt.name} in {t_evt.location.name} at {t_evt.start_time}."
                            ),
                        )

        return ContactPathResponse(
            source_patient_id=source_patient_id,
            target_patient_id=target_patient_id,
            path_found=False,
            hops_count=0,
            path=[],
            explanation="No direct or 2-hop staff-mediated contact path found.",
        )
