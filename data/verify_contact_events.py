"""
Contact Events Verification Script (Graph/Crafting Layer).

Verifies:
1. Patient 1 (Index) <-> Nurse Anita Sharma (Vector) overlap exists in ICU (12h).
2. Nurse Anita Sharma <-> Patient 2 (Downstream 1) overlap exists in Gen Med A (12h).
3. Nurse Anita Sharma <-> Patient 3 (Downstream 2) overlap exists in Gen Med A (12h).
4. Nurse Anita Sharma <-> Patient 4 (Downstream 3) overlap exists in Gen Med A (12h).
5. Overlap durations and locations match temporal truth.
6. Known true-negative noise pairs do NOT appear as contacts.
7. No duplicate event IDs exist.
8. All source entity IDs refer to valid PostgreSQL records.
9. Event generation is strictly idempotent.
"""

import sys
import json
from pathlib import Path
from sqlalchemy.orm import Session

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Staff, Ward, Movement, Procedure
from app.services.graph.contact_event_service import ContactEventEngine


def verify_contact_events(events_file: Path) -> bool:
    print("=" * 70)
    print("ROGRAKSHAK CONTACT EVENTS VERIFICATION")
    print("=" * 70)

    if not events_file.exists():
        print(f"❌ Error: Events artifact {events_file} not found.")
        return False

    with open(events_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    events = data.get("events", [])
    print(f"Loaded {len(events)} events from {events_file.name}")

    session = SessionLocal()
    errors = []

    try:
        # Load database entities
        patients = {p.id: p for p in session.query(Patient).all()}
        staff_members = {s.id: s for s in session.query(Staff).all()}
        wards = {w.id: w for w in session.query(Ward).all()}

        # 1. Check duplicate event IDs
        event_ids = [e["event_id"] for e in events]
        unique_ids = set(event_ids)
        if len(event_ids) != len(unique_ids):
            errors.append(f"Duplicate event IDs detected: {len(event_ids)} total, {len(unique_ids)} unique")

        # 2. Verify all entity foreign keys link to real PostgreSQL rows
        for e in events:
            p_id = e["patient_id"]
            if p_id not in patients:
                errors.append(f"Event {e['event_id']} has non-existent patient_id {p_id}")

            conn_type = e["connected_entity"]["type"]
            conn_id = e["connected_entity"]["id"]
            if conn_type == "staff" and conn_id not in staff_members:
                errors.append(f"Event {e['event_id']} has non-existent staff_id {conn_id}")
            elif conn_type == "patient" and conn_id not in patients:
                errors.append(f"Event {e['event_id']} has non-existent connected patient_id {conn_id}")

        # 3. Check Planted Outbreak Contacts:
        # Vector Nurse: ID=1 (Anita Sharma)
        # Index Patient: ID=1 (Rajesh Verma)
        # Downstream Patients: ID=2 (Suresh Joshi), ID=3 (Meenakshi Rao), ID=4 (Tarun Agarwal)
        vector_nurse_id = 1
        index_patient_id = 1
        downstream_ids = [2, 3, 4]

        # A. Index Patient <-> Vector Nurse in ICU
        index_contacts = [
            e for e in events
            if e["contact_type"] == "patient_staff"
            and e["patient_id"] == index_patient_id
            and e["connected_entity"]["id"] == vector_nurse_id
        ]
        index_verified = False
        for ic in index_contacts:
            if "ICU" in ic["location"]["name"] or ic["location"]["id"] == 1:
                if ic["overlap_minutes"] == 720.0:  # 12 hours
                    index_verified = True

        if not index_verified:
            errors.append("Planted Index Patient (ID: 1) <-> Vector Nurse (ID: 1) 12h ICU overlap missing!")

        # B. Vector Nurse <-> Downstream Patients in General Medicine A
        verified_downstream = set()
        for ds_id in downstream_ids:
            ds_contacts = [
                e for e in events
                if e["contact_type"] == "patient_staff"
                and e["patient_id"] == ds_id
                and e["connected_entity"]["id"] == vector_nurse_id
            ]
            for dc in ds_contacts:
                if "General Medicine A" in dc["location"]["name"] or dc["location"]["id"] == 2:
                    if dc["overlap_minutes"] == 720.0:
                        verified_downstream.add(ds_id)

        if len(verified_downstream) != 3:
            errors.append(f"Planted Vector Nurse <-> Downstream patient overlaps incomplete: {len(verified_downstream)}/3 verified")

        # 4. Check Negative Control / Noise pairs (ensure no false-positive contacts)
        # In General Medicine B: Patient 'Deepak Chopra' vs 'Divya Sharma' have zero time overlap
        # Check that no patient_patient contact exists between non-overlapping patient pairs
        p_deepak = session.query(Patient).filter(Patient.name.like("%Deepak Chopra%")).first()
        p_divya = session.query(Patient).filter(Patient.name.like("%Divya Sharma%")).first()

        noise_contacts_found = False
        if p_deepak and p_divya:
            p1_min, p2_max = min(p_deepak.id, p_divya.id), max(p_deepak.id, p_divya.id)
            noise_contact = [
                e for e in events
                if e["contact_type"] == "patient_patient"
                and e["patient_id"] == p1_min
                and e["connected_entity"]["id"] == p2_max
            ]
            if noise_contact:
                noise_contacts_found = True
                errors.append(f"False-positive contact detected for non-overlapping negative control pair ({p_deepak.name} and {p_divya.name})!")

        # 5. Check Idempotency (re-running ContactEventEngine generates identical events)
        with ContactEventEngine(db_session=session) as engine:
            fresh_events = engine.generate_all_contact_events()
            fresh_dicts = [e.model_dump() for e in fresh_events]

        idempotent = (fresh_dicts == events)
        if not idempotent:
            errors.append("Contact event generation is NOT idempotent!")

        print("-" * 70)
        print("VERIFICATION CHECKLIST:")
        print(f"  [1] No duplicate event IDs ({len(unique_ids)} unique)       : {'✅ PASS' if len(event_ids) == len(unique_ids) else '❌ FAIL'}")
        print(f"  [2] All entity IDs link to real DB rows                    : {'✅ PASS' if not any('non-existent' in e for e in errors) else '❌ FAIL'}")
        print(f"  [3] Index Patient <-> Vector Staff Overlap (12h, ICU)      : {'✅ PASS' if index_verified else '❌ FAIL'}")
        print(f"  [4] Vector Staff <-> All 3 Downstream Overlaps (12h, Gen Med): {'✅ PASS' if len(verified_downstream) == 3 else '❌ FAIL'}")
        print(f"  [5] Negative Control True Negatives preserved (No False +) : {'✅ PASS' if not noise_contacts_found else '❌ FAIL'}")
        print(f"  [6] Mathematical idempotency verified                      : {'✅ PASS' if idempotent else '❌ FAIL'}")
        print("=" * 70)

        if errors:
            print(f"❌ Verification FAILED with {len(errors)} error(s):")
            for err in errors:
                print(f"  • {err}")
            return False
        else:
            print("✅ ALL CONTACT EVENT CHECKS PASSED PERFECTLY!")
            return True

    finally:
        session.close()


def main():
    repo_root = Path(__file__).resolve().parent.parent
    events_file = repo_root / "data" / "contact_events.json"

    success = verify_contact_events(events_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
