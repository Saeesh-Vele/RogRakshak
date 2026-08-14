"""
Contact Event Generation Script (Graph/Crafting Layer).

Queries PostgreSQL database to deterministically compute all temporal contact events
(patient-staff, patient-patient, and patient-procedure-staff) and saves the inspectable
intermediate representation to data/contact_events.json.
"""

import sys
import json
import argparse
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.graph.contact_event_service import ContactEventEngine


def generate_contact_events(output_file: Path) -> dict:
    print("=" * 70)
    print("ROGRAKSHAK DETERMINISTIC CONTACT EVENT GENERATOR")
    print("=" * 70)

    with ContactEventEngine() as engine:
        events = engine.generate_all_contact_events()

    event_dicts = [e.model_dump() for e in events]

    by_type = {}
    for e in events:
        by_type[e.contact_type] = by_type.get(e.contact_type, 0) + 1

    payload = {
        "metadata": {
            "total_events": len(events),
            "events_by_type": by_type,
            "deterministic_version": "1.0.0",
        },
        "events": event_dicts,
    }

    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(payload, f, indent=2)

    print(f"\nGenerated {len(events)} deterministic contact events:")
    for c_type, count in by_type.items():
        print(f"  • {c_type:<25}: {count}")
    print(f"\nArtifact written to: {output_file}")
    print("=" * 70)

    return payload


def main():
    parser = argparse.ArgumentParser(description="Generate deterministic contact events from PostgreSQL.")
    parser.add_argument(
        "--output",
        type=str,
        default="data/contact_events.json",
        help="Path to output contact events JSON",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    output_file = repo_root / args.output

    generate_contact_events(output_file)


if __name__ == "__main__":
    main()
