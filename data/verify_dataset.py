"""
RogRakshak Dataset Sanity Check & Verification Script.

Queries PostgreSQL / Supabase directly to verify:
1. Row counts across all core tables (Patients, Staff, Wards, Beds, Movements, Procedures, LabReports).
2. Planted Outbreak Temporal Overlaps:
   - Vector staff overlaps Index patient's ICU stay.
   - Vector staff overlaps each Downstream patient's General Medicine stay.
   - Exact temporal overlap windows.
3. Noise Verification:
   - Same-ward patient pairs with NO temporal overlap (verifies negative test cases for graph traversal).
"""

import sys
from pathlib import Path
from sqlalchemy import text

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import engine, SessionLocal
from app.models import (
    Patient,
    Staff,
    Ward,
    Bed,
    Movement,
    Procedure,
    LabReport,
)


def verify_dataset():
    session = SessionLocal()
    print("=" * 70)
    print("ROGRAKSHAK SYNTHETIC DATASET VERIFICATION")
    print("=" * 70)

    # -------------------------------------------------------------
    # 1. Row Counts
    # -------------------------------------------------------------
    counts = {
        "Patients": session.query(Patient).count(),
        "Staff": session.query(Staff).count(),
        "Wards": session.query(Ward).count(),
        "Beds": session.query(Bed).count(),
        "Movements": session.query(Movement).count(),
        "Procedures": session.query(Procedure).count(),
        "Lab Reports": session.query(LabReport).count(),
    }

    print("\n--- 1. Database Row Counts ---")
    for table_name, count in counts.items():
        print(f"  • {table_name:<15}: {count}")

    # -------------------------------------------------------------
    # 2. Planted Outbreak Cluster Verification
    # -------------------------------------------------------------
    print("\n--- 2. Planted Outbreak Cluster & Overlap Verification ---")

    # Find vector nurse and patients
    vector_nurse = session.query(Staff).filter(Staff.name.like("%Anita Sharma%")).first()
    index_patient = session.query(Patient).filter(Patient.mrn == "MRN-2026-1001").first()
    downstream_patients = session.query(Patient).filter(
        Patient.mrn.in_(["MRN-2026-1002", "MRN-2026-1003", "MRN-2026-1004"])
    ).all()

    if not vector_nurse or not index_patient or len(downstream_patients) < 3:
        print("  ❌ ERROR: Planted cluster entities not found in database!")
        return False

    print(f"  • Vector Staff : ID={vector_nurse.id}, Name='{vector_nurse.name}'")
    print(f"  • Index Patient: ID={index_patient.id}, Name='{index_patient.name}', MRN={index_patient.mrn}")

    # Direct SQL query to detect temporal overlaps between vector staff and patients
    overlap_query = text("""
        SELECT 
            s.id AS staff_id,
            s.name AS staff_name,
            p.id AS patient_id,
            p.name AS patient_name,
            w.name AS ward_name,
            GREATEST(sm.entry_time, pm.entry_time) AS overlap_start,
            LEAST(sm.exit_time, pm.exit_time) AS overlap_end,
            EXTRACT(EPOCH FROM (LEAST(sm.exit_time, pm.exit_time) - GREATEST(sm.entry_time, pm.entry_time))) / 3600.0 AS overlap_hours
        FROM movements sm
        JOIN staff s ON sm.staff_id = s.id
        JOIN movements pm ON pm.patient_id IS NOT NULL 
            AND pm.location_type = sm.location_type 
            AND pm.location_id = sm.location_id
        JOIN patients p ON pm.patient_id = p.id
        JOIN wards w ON sm.location_id = w.id
        WHERE sm.staff_id = :staff_id
          AND sm.location_type = 'ward'
          AND sm.entry_time < pm.exit_time 
          AND sm.exit_time > pm.entry_time
        ORDER BY overlap_start;
    """)

    overlaps = session.execute(overlap_query, {"staff_id": vector_nurse.id}).fetchall()

    print(f"\n  Found {len(overlaps)} temporal contact overlap windows with Vector Staff:")
    verified_index = False
    verified_downstream_ids = set()

    for row in overlaps:
        overlap_hrs = float(row.overlap_hours)
        print(f"    - Contact: [{row.ward_name}] Patient '{row.patient_name}' (ID: {row.patient_id})")
        print(f"      Window : {row.overlap_start} -> {row.overlap_end} ({overlap_hrs:.1f} hours)")

        if row.patient_id == index_patient.id:
            verified_index = True
        if row.patient_id in [dp.id for dp in downstream_patients]:
            verified_downstream_ids.add(row.patient_id)

    print("\n  Planted Cluster Verification Status:")
    print(f"    - Overlap with Index Patient     : {'✅ VERIFIED' if verified_index else '❌ FAILED'}")
    print(f"    - Overlap with Downstream Cases  : {'✅ ALL 3 VERIFIED' if len(verified_downstream_ids) == 3 else f'❌ {len(verified_downstream_ids)}/3 verified'}")

    # -------------------------------------------------------------
    # 3. Noise Analysis (Same-ward, NO time overlap)
    # -------------------------------------------------------------
    print("\n--- 3. Negative Control / Noise Verification ---")
    noise_query = text("""
        SELECT 
            p1.name AS patient_1,
            p2.name AS patient_2,
            w.name AS ward_name,
            m1.entry_time AS p1_entry,
            m1.exit_time AS p1_exit,
            m2.entry_time AS p2_entry,
            m2.exit_time AS p2_exit
        FROM movements m1
        JOIN movements m2 ON m1.location_type = 'ward' 
            AND m2.location_type = 'ward'
            AND m1.location_id = m2.location_id
            AND m1.patient_id < m2.patient_id
        JOIN patients p1 ON m1.patient_id = p1.id
        JOIN patients p2 ON m2.patient_id = p2.id
        JOIN wards w ON m1.location_id = w.id
        WHERE (m1.exit_time <= m2.entry_time OR m2.exit_time <= m1.entry_time)
        LIMIT 5;
    """)

    noise_pairs = session.execute(noise_query).fetchall()
    print(f"  Found sample same-ward non-overlapping patient pairs (True Negatives):")
    for np in noise_pairs:
        print(f"    - Ward '{np.ward_name}': '{np.patient_1}' ({np.p1_entry.strftime('%m/%d')}->{np.p1_exit.strftime('%m/%d')}) vs '{np.patient_2}' ({np.p2_entry.strftime('%m/%d')}->{np.p2_exit.strftime('%m/%d')}) [No Time Overlap]")

    has_noise = len(noise_pairs) > 0
    print(f"  Noise verification: {'✅ VERIFIED (Non-overlapping ward pairs present)' if has_noise else '❌ FAILED'}")

    session.close()
    return verified_index and (len(verified_downstream_ids) == 3) and has_noise


if __name__ == "__main__":
    success = verify_dataset()
    sys.exit(0 if success else 1)
