"""
FastAPI Graph API Router (Graph/Crafting Layer).

Exposes REST endpoints for the Detection Team, LangGraph agents, and frontend:
- GET /graph/patient/{patient_id}/contacts
- GET /graph/patient/{patient_id}/timeline
- GET /graph/organism/{organism}/patients
- POST /graph/contact-path
"""

from typing import Optional
from fastapi import APIRouter, HTTPException, Query, Depends
from pydantic import BaseModel, Field

from app.schemas.graph import (
    PatientContactsResponse,
    PatientTimelineResponse,
    OrganismPatientCohort,
    ContactPathResponse,
)
from app.services.graph.graph_query_service import GraphQueryService

router = APIRouter(prefix="/graph", tags=["Graph & Temporal Contacts"])


def get_graph_service() -> GraphQueryService:
    return GraphQueryService()


class ContactPathRequest(BaseModel):
    source_patient_id: int = Field(description="Origin patient ID (e.g. Index Case)")
    target_patient_id: int = Field(description="Target patient ID (e.g. Downstream Case)")
    max_hops: int = Field(default=3, description="Maximum hops to traverse")


@router.get("/patient/{patient_id}/contacts", response_model=PatientContactsResponse)
def get_patient_contacts(
    patient_id: int,
    service: GraphQueryService = Depends(get_graph_service),
) -> PatientContactsResponse:
    """Retrieve all staff interactions and co-located patient contacts for a patient."""
    try:
        with service:
            return service.get_patient_contacts(patient_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal graph query error: {e}")


@router.get("/patient/{patient_id}/timeline", response_model=PatientTimelineResponse)
def get_patient_timeline(
    patient_id: int,
    service: GraphQueryService = Depends(get_graph_service),
) -> PatientTimelineResponse:
    """Retrieve chronological clinical journey (admissions, stays, procedures, lab tests) for a patient."""
    try:
        with service:
            return service.get_patient_timeline(patient_id)
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal graph query error: {e}")


@router.get("/organism/{organism}/patients", response_model=OrganismPatientCohort)
def get_organism_patients(
    organism: str,
    resistance_profile: Optional[str] = Query(default=None, description="Optional resistance filter, e.g. MDR"),
    service: GraphQueryService = Depends(get_graph_service),
) -> OrganismPatientCohort:
    """Find all patients with positive culture results for a given pathogen and resistance profile."""
    try:
        with service:
            return service.get_organism_patients(organism, resistance_profile)
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal graph query error: {e}")


@router.post("/contact-path", response_model=ContactPathResponse)
def find_contact_path(
    request: ContactPathRequest,
    service: GraphQueryService = Depends(get_graph_service),
) -> ContactPathResponse:
    """Find temporal contact transmission pathways between two patients (direct or staff-mediated)."""
    try:
        with service:
            return service.find_contact_path(
                source_patient_id=request.source_patient_id,
                target_patient_id=request.target_patient_id,
                max_hops=request.max_hops,
            )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Internal graph query error: {e}")
