"""
FastAPI Investigations API Router (Detection / Investigation Layer).

Exposes REST endpoints for the Frontend Team and external surveillance clients:
- GET /api/investigations
- GET /api/investigations/{case_id}
- POST /api/investigations
- GET /api/investigations/{case_id}/evidence
- GET /api/investigations/{case_id}/timeline
"""

from typing import List
from fastapi import APIRouter, HTTPException, Depends

from app.schemas.detection import (
    InvestigationCase,
    InvestigationListResponse,
    CreateInvestigationRequest,
    EvidenceItem,
    InvestigationTimelineEntry,
)
from app.services.detection.investigation_service import InvestigationService

router = APIRouter(prefix="/api/investigations", tags=["Outbreak Investigations"])


def get_investigation_service() -> InvestigationService:
    return InvestigationService()


@router.get("", response_model=InvestigationListResponse)
def list_investigations(
    service: InvestigationService = Depends(get_investigation_service),
) -> InvestigationListResponse:
    """List all conducted epidemiological outbreak investigations."""
    try:
        return service.list_investigations()
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Failed to list investigations: {e}")


@router.get("/{case_id}", response_model=InvestigationCase)
def get_investigation(
    case_id: str,
    service: InvestigationService = Depends(get_investigation_service),
) -> InvestigationCase:
    """Retrieve full structured dossier for a specific investigation case."""
    case = service.get_investigation(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation case '{case_id}' not found.")
    return case


@router.post("", response_model=InvestigationCase)
def create_investigation(
    request: CreateInvestigationRequest,
    service: InvestigationService = Depends(get_investigation_service),
) -> InvestigationCase:
    """Trigger a new epidemiological investigation workflow for a target patient and pathogen."""
    try:
        return service.run_investigation(
            target_patient_id=request.target_patient_id,
            organism=request.organism,
            resistance_profile=request.resistance_profile,
            use_mock_graph=request.use_mock_graph,
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Investigation execution error: {e}")


@router.get("/{case_id}/evidence", response_model=List[EvidenceItem])
def get_investigation_evidence(
    case_id: str,
    service: InvestigationService = Depends(get_investigation_service),
) -> List[EvidenceItem]:
    """Retrieve the objective evidence items supporting an investigation case."""
    case = service.get_investigation(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation case '{case_id}' not found.")
    return case.evidence


@router.get("/{case_id}/timeline", response_model=List[InvestigationTimelineEntry])
def get_investigation_timeline(
    case_id: str,
    service: InvestigationService = Depends(get_investigation_service),
) -> List[InvestigationTimelineEntry]:
    """Retrieve the chronological incident timeline for an investigation case."""
    case = service.get_investigation(case_id)
    if not case:
        raise HTTPException(status_code=404, detail=f"Investigation case '{case_id}' not found.")
    return case.timeline
