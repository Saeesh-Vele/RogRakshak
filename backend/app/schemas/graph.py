"""
Graph & Contact Event Pydantic Schemas (Graph/Crafting Layer).

Defines structured contracts for deterministic contact events, patient contacts,
timelines, organism cohorts, and contact paths consumed by the Detection Team.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


class ConnectedEntity(BaseModel):
    type: Literal["staff", "patient"] = Field(description="Entity type: staff or patient")
    id: int = Field(description="Database primary key of the connected entity")
    name: str = Field(description="Full name of the connected entity")
    role_or_diagnosis: Optional[str] = Field(default=None, description="Staff role or Patient diagnosis")


class LocationInfo(BaseModel):
    type: Literal["ward", "bed", "procedure_room"] = Field(description="Location type")
    id: int = Field(description="Location primary key")
    name: str = Field(description="Location display name (e.g. Intensive Care Unit (ICU), Bed 01)")


class ContactEvent(BaseModel):
    """Deterministic intermediate contact event representation."""
    event_id: str = Field(description="Stable deterministic hash identifier")
    contact_type: Literal["patient_staff", "patient_patient", "patient_procedure_staff"] = Field(
        description="Type of contact relationship"
    )
    patient_id: int = Field(description="Primary patient ID")
    patient_name: str = Field(description="Primary patient name")
    connected_entity: ConnectedEntity = Field(description="Interacting staff or secondary patient")
    location: LocationInfo = Field(description="Location where interaction occurred")
    start_time: str = Field(description="ISO-8601 overlap start timestamp")
    end_time: str = Field(description="ISO-8601 overlap end timestamp")
    overlap_minutes: float = Field(description="Exact overlap duration in minutes")
    evidence_source: List[str] = Field(
        default_factory=list, description="Data sources proving contact (e.g. ['movements'], ['procedures'])"
    )
    source_record_ids: Dict[str, Any] = Field(
        default_factory=dict, description="Underlying database record IDs for provenance"
    )


class TimelineEvent(BaseModel):
    """Chronological timeline event for a patient's journey."""
    event_type: Literal["admission", "discharge", "movement", "procedure", "lab_report", "contact"]
    timestamp: str
    end_timestamp: Optional[str] = None
    description: str
    details: Dict[str, Any] = Field(default_factory=dict)


class PatientTimelineResponse(BaseModel):
    patient_id: int
    patient_name: str
    mrn: str
    admission_date: str
    discharge_date: Optional[str] = None
    admitting_diagnosis: Optional[str] = None
    events: List[TimelineEvent] = Field(default_factory=list)


class PatientContactsResponse(BaseModel):
    patient_id: int
    patient_name: str
    total_contacts: int
    staff_contacts: List[ContactEvent] = Field(default_factory=list)
    patient_contacts: List[ContactEvent] = Field(default_factory=list)


class OrganismPatientCohort(BaseModel):
    organism: str
    resistance_profile: Optional[str] = None
    total_patients: int
    patient_ids: List[int] = Field(default_factory=list)
    lab_report_ids: List[int] = Field(default_factory=list)
    reports_summary: List[Dict[str, Any]] = Field(default_factory=list)


class ContactPathHop(BaseModel):
    from_entity: Dict[str, Any]
    to_entity: Dict[str, Any]
    contact_event: ContactEvent


class ContactPathResponse(BaseModel):
    source_patient_id: int
    target_patient_id: int
    path_found: bool
    hops_count: int
    path: List[ContactPathHop] = Field(default_factory=list)
    explanation: Optional[str] = None
