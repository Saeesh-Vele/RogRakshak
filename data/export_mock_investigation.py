"""
Script to export realistic mock investigation results for Frontend Team.
"""

import sys
import json
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.detection.investigation_service import InvestigationService


def export_investigation_fixtures(output_path: Path):
    svc = InvestigationService()
    case = svc.run_investigation(
        target_patient_id=1,
        organism="Klebsiella pneumoniae",
        resistance_profile="MDR",
        case_id="CASE-2026-001",
    )
    
    payload = {
        "metadata": {
            "description": "Pre-computed mock epidemiological outbreak investigation for Frontend Team",
            "outbreak_cluster": "Planted MDR Klebsiella pneumoniae Outbreak",
            "index_patient": "Rajesh Verma (Index, ID: 1)",
            "vector_staff": "Nurse Anita Sharma (ID: 1)",
            "downstream_patients": ["Suresh Joshi (ID: 2)", "Meenakshi Rao (ID: 3)", "Tarun Agarwal (ID: 4)"],
        },
        "investigation": case.model_dump(),
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"Mock investigation fixture written to: {output_path}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    export_investigation_fixtures(repo_root / "data" / "fixtures" / "mock_investigation_results.json")
