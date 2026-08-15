"""
Deterministic Temporal Contact Event Engine (Graph/Crafting Layer).

Queries PostgreSQL movement and procedure records to compute exact mathematical
temporal overlaps [start, end) between Patients, Staff, and Co-located Patients.
Produces an auditable, deterministic, and inspectable intermediate event representation.
"""

import sys
import hashlib
from pathlib import Path
from datetime import datetime
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session, joinedload

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Staff, Ward, Bed, Movement, Procedure
from app.schemas.graph import ContactEvent, ConnectedEntity, LocationInfo


def compute_interval_overlap(
    start_a: datetime, end_a: datetime, start_b: datetime, end_b: datetime
) -> Optional[Tuple[datetime, datetime, float]]:
    """
    Computes deterministic mathematical interval overlap [start, end) between two events.
    Returns (overlap_start, overlap_end, overlap_minutes) if overlap exists, else None.
    """
    overlap_start = max(start_a, start_b)
    overlap_end = min(end_a, end_b)

    if overlap_start < overlap_end:
        overlap_seconds = (overlap_end - overlap_start).total_seconds()
        if overlap_seconds > 0:
            return overlap_start, overlap_end, overlap_seconds / 60.0
    return None


def generate_event_id(
    prefix: str,
    id_1: int,
    id_2: int,
    loc_type: str,
    loc_id: int,
    start_iso: str,
    end_iso: str,
) -> str:
    """Generates a stable, reproducible deterministic event identifier."""
    raw = f"{prefix}:{id_1}:{id_2}:{loc_type}_{loc_id}:{start_iso}:{end_iso}"
    digest = hashlib.sha256(raw.encode("utf-8")).hexdigest()[:16]
    return f"EVT-{prefix.upper()}-{digest}"


class ContactEventEngine:
    def __init__(self, db_session: Optional[Session] = None):
        self._owns_session = db_session is None
        self.db = db_session or SessionLocal()
        self._cached_events: Optional[List[ContactEvent]] = None

    def close(self):
        self._cached_events = None
        if self._owns_session:
            self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def generate_all_contact_events(self) -> List[ContactEvent]:
        """
        Generates all deterministic contact events across the dataset:
        1. Patient <-> Staff contacts (via ward presence & shift overlaps)
        2. Patient <-> Patient co-location contacts (via shared ward/bed stays)
        3. Patient <-> Procedure Staff contacts (via clinical procedures)
        """
        if self._cached_events is not None:
            return self._cached_events

        events: List[ContactEvent] = []

        # Cache reference entities
        patients = {p.id: p for p in self.db.query(Patient).all()}
        staff_members = {s.id: s for s in self.db.query(Staff).all()}
        wards = {w.id: w for w in self.db.query(Ward).all()}
        beds = {b.id: b for b in self.db.query(Bed).all()}

        # -------------------------------------------------------------
        # 1. Patient <-> Staff Ward Overlaps
        # -------------------------------------------------------------
        patient_ward_movements = (
            self.db.query(Movement)
            .filter(Movement.patient_id.isnot(None), Movement.location_type == "ward")
            .order_by(Movement.entry_time)
            .all()
        )
        staff_ward_movements = (
            self.db.query(Movement)
            .filter(Movement.staff_id.isnot(None), Movement.location_type == "ward")
            .order_by(Movement.entry_time)
            .all()
        )

        staff_movements_by_ward: Dict[int, List[Movement]] = {}
        for sm in staff_ward_movements:
            staff_movements_by_ward.setdefault(sm.location_id, []).append(sm)

        for pm in patient_ward_movements:
            p_obj = patients.get(pm.patient_id)
            if not p_obj:
                continue

            w_obj = wards.get(pm.location_id)
            if not w_obj:
                continue

            for sm in staff_movements_by_ward.get(pm.location_id, []):
                s_obj = staff_members.get(sm.staff_id)
                if not s_obj:
                    continue

                overlap = compute_interval_overlap(pm.entry_time, pm.exit_time, sm.entry_time, sm.exit_time)
                if overlap:
                    ov_start, ov_end, ov_mins = overlap
                    s_iso = ov_start.isoformat()
                    e_iso = ov_end.isoformat()
                    evt_id = generate_event_id("ps", p_obj.id, s_obj.id, "ward", w_obj.id, s_iso, e_iso)

                    event = ContactEvent(
                        event_id=evt_id,
                        contact_type="patient_staff",
                        patient_id=p_obj.id,
                        patient_name=p_obj.name,
                        connected_entity=ConnectedEntity(
                            type="staff",
                            id=s_obj.id,
                            name=s_obj.name,
                            role_or_diagnosis=s_obj.role,
                        ),
                        location=LocationInfo(
                            type="ward",
                            id=w_obj.id,
                            name=w_obj.name,
                        ),
                        start_time=s_iso,
                        end_time=e_iso,
                        overlap_minutes=round(ov_mins, 2),
                        evidence_source=["movements"],
                        source_record_ids={
                            "patient_movement_id": pm.id,
                            "staff_movement_id": sm.id,
                            "ward_id": w_obj.id,
                        },
                    )
                    events.append(event)

        # -------------------------------------------------------------
        # 2. Patient <-> Patient Ward Co-location Overlaps
        # -------------------------------------------------------------
        # Group movements by ward to optimize pairwise checks
        movements_by_ward: Dict[int, List[Movement]] = {}
        for pm in patient_ward_movements:
            movements_by_ward.setdefault(pm.location_id, []).append(pm)

        for ward_id, m_list in movements_by_ward.items():
            w_obj = wards.get(ward_id)
            if not w_obj:
                continue

            for i in range(len(m_list)):
                m1 = m_list[i]
                p1 = patients.get(m1.patient_id)
                if not p1:
                    continue

                for j in range(i + 1, len(m_list)):
                    m2 = m_list[j]
                    if m1.patient_id == m2.patient_id:
                        continue

                    p2 = patients.get(m2.patient_id)
                    if not p2:
                        continue

                    overlap = compute_interval_overlap(m1.entry_time, m1.exit_time, m2.entry_time, m2.exit_time)
                    if overlap:
                        ov_start, ov_end, ov_mins = overlap
                        s_iso = ov_start.isoformat()
                        e_iso = ov_end.isoformat()

                        # Ensure stable canonical ordering P1 < P2 for event ID
                        canon_p1, canon_p2 = (p1, p2) if p1.id < p2.id else (p2, p1)
                        evt_id = generate_event_id("pp", canon_p1.id, canon_p2.id, "ward", w_obj.id, s_iso, e_iso)

                        event = ContactEvent(
                            event_id=evt_id,
                            contact_type="patient_patient",
                            patient_id=canon_p1.id,
                            patient_name=canon_p1.name,
                            connected_entity=ConnectedEntity(
                                type="patient",
                                id=canon_p2.id,
                                name=canon_p2.name,
                                role_or_diagnosis=canon_p2.admitting_diagnosis,
                            ),
                            location=LocationInfo(
                                type="ward",
                                id=w_obj.id,
                                name=w_obj.name,
                            ),
                            start_time=s_iso,
                            end_time=e_iso,
                            overlap_minutes=round(ov_mins, 2),
                            evidence_source=["movements"],
                            source_record_ids={
                                "patient_1_movement_id": m1.id if p1.id == canon_p1.id else m2.id,
                                "patient_2_movement_id": m2.id if p1.id == canon_p1.id else m1.id,
                                "ward_id": w_obj.id,
                            },
                        )
                        events.append(event)

        # -------------------------------------------------------------
        # 3. Patient <-> Procedure Staff Overlaps
        # -------------------------------------------------------------
        procedures = self.db.query(Procedure).options(joinedload(Procedure.staff_members)).all()
        for proc in procedures:
            p_obj = patients.get(proc.patient_id)
            w_obj = wards.get(proc.location_id) or Ward(id=proc.location_id, name="Procedure Room", department="Clinical")
            if not p_obj:
                continue

            for staff_m in proc.staff_members:
                s_iso = proc.start_time.isoformat()
                e_iso = proc.end_time.isoformat()
                dur_mins = (proc.end_time - proc.start_time).total_seconds() / 60.0
                evt_id = generate_event_id("pps", p_obj.id, staff_m.id, "procedure", proc.id, s_iso, e_iso)

                event = ContactEvent(
                    event_id=evt_id,
                    contact_type="patient_procedure_staff",
                    patient_id=p_obj.id,
                    patient_name=p_obj.name,
                    connected_entity=ConnectedEntity(
                        type="staff",
                        id=staff_m.id,
                        name=staff_m.name,
                        role_or_diagnosis=staff_m.role,
                    ),
                    location=LocationInfo(
                        type="procedure_room",
                        id=proc.location_id,
                        name=f"Procedure Room ({proc.procedure_type})",
                    ),
                    start_time=s_iso,
                    end_time=e_iso,
                    overlap_minutes=round(dur_mins, 2),
                    evidence_source=["procedures"],
                    source_record_ids={
                        "procedure_id": proc.id,
                        "staff_id": staff_m.id,
                    },
                )
                events.append(event)

        # Sort events deterministically by start_time, patient_id, connected_entity.id
        events.sort(key=lambda x: (x.start_time, x.patient_id, x.connected_entity.id, x.event_id))
        self._cached_events = events
        return events
