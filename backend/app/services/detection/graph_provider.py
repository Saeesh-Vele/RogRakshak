"""
Graph Evidence Provider Abstraction (Detection / Investigation Layer).

Decouples the Detection Engine from raw database connections, allowing it to execute
against either the live GraphQueryService or offline mock graph response fixtures.
"""

import json
from abc import ABC, abstractmethod
from pathlib import Path
from typing import Optional, Dict, Any, List

from app.schemas.graph import (
    PatientContactsResponse,
    PatientTimelineResponse,
    OrganismPatientCohort,
    ContactPathResponse,
)
from app.services.graph.graph_query_service import GraphQueryService


class GraphEvidenceProvider(ABC):
    """Abstract interface for querying graph and contact evidence."""

    @abstractmethod
    def get_patient_contacts(self, patient_id: int) -> PatientContactsResponse:
        pass

    @abstractmethod
    def get_patient_timeline(self, patient_id: int) -> PatientTimelineResponse:
        pass

    @abstractmethod
    def get_organism_cohort(
        self, organism: str, resistance_profile: Optional[str] = None
    ) -> OrganismPatientCohort:
        pass

    @abstractmethod
    def find_contact_path(
        self, source_patient_id: int, target_patient_id: int, max_hops: int = 3
    ) -> ContactPathResponse:
        pass


class LiveGraphEvidenceProvider(GraphEvidenceProvider):
    """Queries live GraphQueryService against PostgreSQL & Graph layer."""

    def __init__(self, query_service: Optional[GraphQueryService] = None):
        self._owns_service = query_service is None
        self.service = query_service or GraphQueryService()

    def close(self):
        if self._owns_service:
            self.service.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def get_patient_contacts(self, patient_id: int) -> PatientContactsResponse:
        return self.service.get_patient_contacts(patient_id)

    def get_patient_timeline(self, patient_id: int) -> PatientTimelineResponse:
        return self.service.get_patient_timeline(patient_id)

    def get_organism_cohort(
        self, organism: str, resistance_profile: Optional[str] = None
    ) -> OrganismPatientCohort:
        return self.service.get_organism_patients(organism, resistance_profile)

    def find_contact_path(
        self, source_patient_id: int, target_patient_id: int, max_hops: int = 3
    ) -> ContactPathResponse:
        return self.service.find_contact_path(source_patient_id, target_patient_id, max_hops)


class MockGraphEvidenceProvider(GraphEvidenceProvider):
    """Loads realistic pre-computed mock graph fixtures from JSON."""

    def __init__(self, fixture_path: Optional[Path] = None):
        if fixture_path is None:
            # Check relative to repo root
            curr = Path(__file__).resolve()
            # Traverse up until finding data/fixtures
            repo_root = curr.parents[4] if len(curr.parents) >= 5 else curr.parent
            fixture_path = repo_root / "data" / "fixtures" / "mock_graph_responses.json"
            if not fixture_path.exists():
                alt_path = Path.cwd() / "data" / "fixtures" / "mock_graph_responses.json"
                if alt_path.exists():
                    fixture_path = alt_path
        
        self.fixture_path = fixture_path
        if fixture_path and fixture_path.exists():
            with open(fixture_path, "r", encoding="utf-8") as f:
                self.fixtures = json.load(f)
        else:
            self.fixtures = {}

    def get_patient_contacts(self, patient_id: int) -> PatientContactsResponse:
        if patient_id == 1 and "index_patient_contacts" in self.fixtures:
            return PatientContactsResponse.model_validate(self.fixtures["index_patient_contacts"])
        # Fallback empty response
        return PatientContactsResponse(
            patient_id=patient_id,
            patient_name=f"Patient {patient_id}",
            total_contacts=0,
            staff_contacts=[],
            patient_contacts=[],
        )

    def get_patient_timeline(self, patient_id: int) -> PatientTimelineResponse:
        if patient_id == 1 and "index_patient_timeline" in self.fixtures:
            return PatientTimelineResponse.model_validate(self.fixtures["index_patient_timeline"])
        return PatientTimelineResponse(
            patient_id=patient_id,
            patient_name=f"Patient {patient_id}",
            mrn=f"MRN-2026-{1000 + patient_id}",
            admission_date="2026-08-01T10:00:00",
            events=[],
        )

    def get_organism_cohort(
        self, organism: str, resistance_profile: Optional[str] = None
    ) -> OrganismPatientCohort:
        if "mdr_klebsiella_cohort" in self.fixtures:
            return OrganismPatientCohort.model_validate(self.fixtures["mdr_klebsiella_cohort"])
        return OrganismPatientCohort(
            organism=organism,
            resistance_profile=resistance_profile,
            total_patients=0,
            patient_ids=[],
            lab_report_ids=[],
            reports_summary=[],
        )

    def find_contact_path(
        self, source_patient_id: int, target_patient_id: int, max_hops: int = 3
    ) -> ContactPathResponse:
        paths = self.fixtures.get("transmission_paths", {})
        key = f"index_to_downstream_{target_patient_id - 1}"
        if key in paths:
            return ContactPathResponse.model_validate(paths[key])
        
        return ContactPathResponse(
            source_patient_id=source_patient_id,
            target_patient_id=target_patient_id,
            path_found=False,
            hops_count=0,
            path=[],
            explanation="No contact path found in mock fixture.",
        )
