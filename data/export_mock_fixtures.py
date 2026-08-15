"""
Script to export realistic mock graph query fixtures for Detection Team.
"""

import sys
import json
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.graph.graph_query_service import GraphQueryService


def export_fixtures(output_path: Path):
    with GraphQueryService() as svc:
        index_contacts = svc.get_patient_contacts(patient_id=1).model_dump()
        index_timeline = svc.get_patient_timeline(patient_id=1).model_dump()
        mdr_kp_cohort = svc.get_organism_patients(organism="Klebsiella pneumoniae", resistance_profile="MDR").model_dump()
        
        path_to_ds1 = svc.find_contact_path(source_patient_id=1, target_patient_id=2).model_dump()
        path_to_ds2 = svc.find_contact_path(source_patient_id=1, target_patient_id=3).model_dump()
        path_to_ds3 = svc.find_contact_path(source_patient_id=1, target_patient_id=4).model_dump()

    fixtures = {
        "metadata": {
            "description": "Deterministic mock graph query responses for Detection Team & Multi-Agent testing",
            "source_dataset": "RogRakshak Synthetic Hospital Outbreak Dataset",
            "planted_organism": "Klebsiella pneumoniae (MDR)",
        },
        "index_patient_contacts": index_contacts,
        "index_patient_timeline": index_timeline,
        "mdr_klebsiella_cohort": mdr_kp_cohort,
        "transmission_paths": {
            "index_to_downstream_1": path_to_ds1,
            "index_to_downstream_2": path_to_ds2,
            "index_to_downstream_3": path_to_ds3,
        }
    }

    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(fixtures, f, indent=2)

    print(f"Mock fixtures exported to: {output_path}")


if __name__ == "__main__":
    repo_root = Path(__file__).resolve().parent.parent
    export_fixtures(repo_root / "data" / "fixtures" / "mock_graph_responses.json")
