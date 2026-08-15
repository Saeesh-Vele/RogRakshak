"""
Investigation Service Facade (Detection / Investigation Layer).

High-level interface providing access to run and retrieve structured epidemiological
investigations via the LangGraph StateGraph workflow.
"""

from typing import Optional, Dict, Any, List
from app.schemas.detection import InvestigationCase, InvestigationListResponse
from app.services.detection.graph_provider import (
    GraphEvidenceProvider,
    LiveGraphEvidenceProvider,
    MockGraphEvidenceProvider,
)
from app.services.detection.langgraph_workflow import create_investigation_graph, InvestigationState

# In-memory storage for active investigation cases
_investigation_store: Dict[str, InvestigationCase] = {}


class InvestigationService:
    def __init__(self, graph_provider: Optional[GraphEvidenceProvider] = None):
        self.graph_provider = graph_provider or LiveGraphEvidenceProvider()
        self.workflow = create_investigation_graph()

    def run_investigation(
        self,
        target_patient_id: int = 1,
        organism: str = "Klebsiella pneumoniae",
        resistance_profile: Optional[str] = "MDR",
        use_mock_graph: bool = False,
        case_id: Optional[str] = None,
    ) -> InvestigationCase:
        """Executes the complete LangGraph investigation workflow."""
        cid = case_id or f"CASE-2026-{target_patient_id:03d}"
        provider = MockGraphEvidenceProvider() if use_mock_graph else self.graph_provider

        initial_state: InvestigationState = {
            "case_id": cid,
            "target_patient_id": target_patient_id,
            "organism": organism,
            "resistance_profile": resistance_profile,
            "graph_provider": provider,
            "warnings": [],
        }

        final_state = self.workflow.invoke(initial_state)
        case: InvestigationCase = final_state["final_case"]

        # Cache in store
        _investigation_store[cid] = case
        return case

    def list_investigations(self) -> InvestigationListResponse:
        """Returns all investigated outbreak cases."""
        cases = list(_investigation_store.values())
        if not cases:
            # Run default planted outbreak investigation
            default_case = self.run_investigation(
                target_patient_id=1,
                organism="Klebsiella pneumoniae",
                resistance_profile="MDR",
                case_id="CASE-2026-001",
            )
            cases = [default_case]

        return InvestigationListResponse(total_cases=len(cases), cases=cases)

    def get_investigation(self, case_id: str) -> Optional[InvestigationCase]:
        """Retrieves a specific investigation case by ID."""
        if case_id in _investigation_store:
            return _investigation_store[case_id]

        if case_id == "CASE-2026-001" or case_id == "CASE-001":
            return self.run_investigation(
                target_patient_id=1,
                organism="Klebsiella pneumoniae",
                resistance_profile="MDR",
                case_id=case_id,
            )
        return None
