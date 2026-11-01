"""
Investigation Service Facade (Detection / Investigation Layer).

High-level interface providing access to run and retrieve structured epidemiological
investigations via the LangGraph StateGraph workflow.
"""

import logging
import threading
from typing import Optional, Dict, Any, List, NamedTuple
from app.schemas.detection import InvestigationCase, InvestigationListResponse
from app.services.detection.graph_provider import (
    GraphEvidenceProvider,
    LiveGraphEvidenceProvider,
    MockGraphEvidenceProvider,
)
from app.services.detection.langgraph_workflow import create_investigation_graph, InvestigationState

logger = logging.getLogger("rograkshak.investigations")

# In-memory storage for active investigation cases
_investigation_store: Dict[str, InvestigationCase] = {}


class DefaultCase(NamedTuple):
    case_id: str
    target_patient_id: int
    organism: str
    resistance_profile: Optional[str]


# Demo cases that must always be present. The store is in memory, so a restart
# empties it; these are re-created at startup (see app/main.py) and, as a
# fallback, on the first request that needs them. An existing case is never
# replaced by a default.
DEFAULT_CASES: List[DefaultCase] = [
    DefaultCase("CASE-2026-001", 1, "Klebsiella pneumoniae", "MDR"),
    DefaultCase("CASE-2026-004", 4, "Klebsiella pneumoniae", "MDR"),
]

# Serialises default seeding so the startup thread and a concurrent request do
# not both run the same workflow.
_seed_lock = threading.Lock()


class InvestigationService:
    def __init__(self, graph_provider: Optional[GraphEvidenceProvider] = None):
        self.graph_provider = graph_provider or LiveGraphEvidenceProvider()
        self.workflow = create_investigation_graph()

    def close(self) -> None:
        """Releases the graph provider's database session, if it owns one."""
        close = getattr(self.graph_provider, "close", None)
        if callable(close):
            close()

    def run_investigation(
        self,
        target_patient_id: int = 1,
        organism: str = "Klebsiella pneumoniae",
        resistance_profile: Optional[str] = "MDR",
        use_mock_graph: bool = False,
        case_id: Optional[str] = None,
    ) -> InvestigationCase:
        """Executes the complete LangGraph investigation workflow and stores the result.

        Storing replaces any case with the same ID — this is the explicit
        "run" / "re-run" path, which the UI confirms before calling.
        """
        case = self._execute(target_patient_id, organism, resistance_profile, use_mock_graph, case_id)
        _investigation_store[case.case_id] = case
        return case

    def _execute(
        self,
        target_patient_id: int,
        organism: str,
        resistance_profile: Optional[str],
        use_mock_graph: bool = False,
        case_id: Optional[str] = None,
    ) -> InvestigationCase:
        """Runs the workflow and returns the case without storing it."""
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
        return final_state["final_case"]

    def ensure_default_cases(self, only: Optional[str] = None) -> List[str]:
        """Creates any missing default case; never replaces an existing one.

        Returns the IDs it created. `only` restricts seeding to one case ID.
        A default that fails to run is logged and skipped, so one bad case
        cannot stop the others (or the server) from coming up.
        """
        created: List[str] = []
        with _seed_lock:
            for d in DEFAULT_CASES:
                if (only and d.case_id != only) or d.case_id in _investigation_store:
                    continue
                try:
                    case = self._execute(d.target_patient_id, d.organism, d.resistance_profile, case_id=d.case_id)
                except Exception:
                    logger.exception("Could not seed default case %s", d.case_id)
                    continue
                # setdefault: if a user ran this case while we were working,
                # their result stands.
                if _investigation_store.setdefault(d.case_id, case) is case:
                    created.append(d.case_id)
        return created

    def list_investigations(self) -> InvestigationListResponse:
        """Returns all investigated outbreak cases, defaults included."""
        if any(d.case_id not in _investigation_store for d in DEFAULT_CASES):
            self.ensure_default_cases()
        cases = list(_investigation_store.values())
        return InvestigationListResponse(total_cases=len(cases), cases=cases)

    def get_investigation(self, case_id: str) -> Optional[InvestigationCase]:
        """Retrieves a specific investigation case by ID."""
        if case_id in _investigation_store:
            return _investigation_store[case_id]

        if any(d.case_id == case_id for d in DEFAULT_CASES):
            self.ensure_default_cases(only=case_id)
            return _investigation_store.get(case_id)

        # Legacy short alias for the planted case
        if case_id == "CASE-001":
            return self.run_investigation(
                target_patient_id=1,
                organism="Klebsiella pneumoniae",
                resistance_profile="MDR",
                case_id=case_id,
            )
        return None
