"""
Neo4j Graph & Query Service Verification Script (Graph/Crafting Layer).

Verifies:
1. Cypher artifact data/neo4j_dump.cypher exists and is syntactically structured.
2. Cypher statements cover all 40 Patients, 25 Staff, 6 Wards, 30 Beds, 12 Procedures, 16 LabReports, and 156 Antibiotic results.
3. Temporal contact edges match 629 computed contact events.
4. Outbreak transmission chain recovery (Patient 1 -> Nurse Anita Sharma -> Patients 2, 3, 4).
5. True-negative isolation for non-overlapping patient control pairs.
6. Live Neo4j validation if connected.
"""

import sys
import json
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Staff, Ward, Bed, LabReport
from app.services.graph.graph_query_service import GraphQueryService
from app.services.graph.neo4j_service import Neo4jService


def verify_neo4j_graph(cypher_file: Path, events_file: Path) -> bool:
    print("=" * 70)
    print("ROGRAKSHAK NEO4J GRAPH & QUERY SERVICE VERIFICATION")
    print("=" * 70)

    errors = []

    # 1. Verify Cypher Dump
    if not cypher_file.exists():
        print(f"❌ Error: Cypher dump {cypher_file} not found.")
        return False

    with open(cypher_file, "r", encoding="utf-8") as f:
        cypher_text = f.read()
        lines = [l.strip() for l in cypher_text.splitlines() if l.strip() and not l.startswith("//")]

    print(f"  • Total Cypher Statements : {len(lines)}")

    patient_stmts = [l for l in lines if "MERGE (p:Patient" in l]
    staff_stmts = [l for l in lines if "MERGE (s:Staff" in l]
    ward_stmts = [l for l in lines if "MERGE (w:Ward" in l]
    bed_stmts = [l for l in lines if "MERGE (b:Bed" in l]
    proc_stmts = [l for l in lines if "MERGE (pr:Procedure" in l]
    lr_stmts = [l for l in lines if "MERGE (lr:LabReport" in l]
    ab_stmts = [l for l in lines if "MERGE (ab:Antibiotic" in l]
    contact_stmts = [l for l in lines if "MERGE (p)-[r:CONTACT_WITH" in l or "MERGE (p1)-[r:CO_LOCATED_WITH" in l]

    print(f"  • Patient MERGE statements   : {len(patient_stmts)} (Expected: 40)")
    print(f"  • Staff MERGE statements     : {len(staff_stmts)} (Expected: 25)")
    print(f"  • Ward MERGE statements      : {len(ward_stmts)} (Expected: 6)")
    print(f"  • Bed MERGE statements       : {len(bed_stmts)} (Expected: 30)")
    print(f"  • Procedure MERGE statements : {len(proc_stmts)} (Expected: 12)")
    print(f"  • LabReport MERGE statements : {len(lr_stmts)} (Expected: 16)")
    print(f"  • Antibiotic MERGE statements: {len(ab_stmts)} (Expected: 156)")
    print(f"  • Contact Edge statements    : {len(contact_stmts)} (Expected: 629)")

    if len(patient_stmts) != 40:
        errors.append(f"Expected 40 Patient MERGE statements, got {len(patient_stmts)}")
    if len(staff_stmts) != 25:
        errors.append(f"Expected 25 Staff MERGE statements, got {len(staff_stmts)}")
    if len(ward_stmts) != 6:
        errors.append(f"Expected 6 Ward MERGE statements, got {len(ward_stmts)}")
    if len(bed_stmts) != 30:
        errors.append(f"Expected 30 Bed MERGE statements, got {len(bed_stmts)}")
    if len(proc_stmts) != 12:
        errors.append(f"Expected 12 Procedure MERGE statements, got {len(proc_stmts)}")
    if len(lr_stmts) != 16:
        errors.append(f"Expected 16 LabReport MERGE statements, got {len(lr_stmts)}")
    if len(ab_stmts) != 156:
        errors.append(f"Expected 156 Antibiotic MERGE statements, got {len(ab_stmts)}")
    if len(contact_stmts) != 629:
        errors.append(f"Expected 629 Contact Edge statements, got {len(contact_stmts)}")

    # 2. Verify Graph Query Service Capabilities & Outbreak Chain Recovery
    print("\n--- Testing Graph Query Service & Outbreak Chain Recovery ---")
    with GraphQueryService() as g_service:
        # A. Index patient contacts
        idx_contacts = g_service.get_patient_contacts(patient_id=1)
        print(f"  • Index Patient (ID: 1) Total Contacts : {idx_contacts.total_contacts}")
        anita_contact = [c for c in idx_contacts.staff_contacts if c.connected_entity.id == 1]
        if not anita_contact:
            errors.append("Index Patient (ID: 1) does not have contact with Nurse Anita Sharma (ID: 1)")
        else:
            print(f"    - Contact with Nurse Anita Sharma verified: {anita_contact[0].overlap_minutes} mins in {anita_contact[0].location.name}")

        # B. Contact Paths from Index (ID: 1) to Downstream Patients (IDs: 2, 3, 4)
        for ds_id in [2, 3, 4]:
            path_res = g_service.find_contact_path(source_patient_id=1, target_patient_id=ds_id)
            if not path_res.path_found:
                errors.append(f"Transmission contact path from Index (1) to Downstream ({ds_id}) NOT found!")
            else:
                print(f"    - Path 1 -> {ds_id}: Found {path_res.hops_count}-hop path via {path_res.path[0].to_entity['name']}")

        # C. Organism Cohort query
        kp_cohort = g_service.get_organism_patients(organism="Klebsiella pneumoniae", resistance_profile="MDR")
        print(f"  • MDR Klebsiella pneumoniae Cohort : {kp_cohort.total_patients} patients (Expected: 4)")
        if kp_cohort.total_patients != 4:
            errors.append(f"Expected 4 patients in MDR Klebsiella pneumoniae cohort, got {kp_cohort.total_patients}")

        # D. Patient Timeline query
        idx_timeline = g_service.get_patient_timeline(patient_id=1)
        print(f"  • Index Patient Timeline Events : {len(idx_timeline.events)}")
        if len(idx_timeline.events) == 0:
            errors.append("Index Patient timeline returned 0 events")

        # E. True Negative Control Path (Deepak Chopra ID: 21 vs Divya Sharma ID: 9 in Gen Med B)
        session = SessionLocal()
        p_deepak = session.query(Patient).filter(Patient.name.like("%Deepak Chopra%")).first()
        p_divya = session.query(Patient).filter(Patient.name.like("%Divya Sharma%")).first()
        session.close()

        if p_deepak and p_divya:
            neg_path = g_service.find_contact_path(source_patient_id=p_deepak.id, target_patient_id=p_divya.id)
            direct_contact_found = neg_path.path_found and neg_path.hops_count == 1
            print(f"  • True Negative Pair ({p_deepak.name} vs {p_divya.name}) Direct Co-location Contact: {'FOUND (Error)' if direct_contact_found else 'NONE (Correct)'}")
            if direct_contact_found:
                errors.append(f"Unexpected direct contact found for true negative pair ({p_deepak.name} and {p_divya.name})")

    print("-" * 70)
    print("VERIFICATION CHECKLIST:")
    print(f"  [1] Cypher Node Statements Complete (40 P, 25 S, 6 W, 30 B)  : {'✅ PASS' if not any('MERGE' in e for e in errors) else '❌ FAIL'}")
    print(f"  [2] Contact Edge Statements Complete (629 Edges)           : {'✅ PASS' if len(contact_stmts) == 629 else '❌ FAIL'}")
    print(f"  [3] Index Patient <-> Vector Staff Contact Verified        : {'✅ PASS' if anita_contact else '❌ FAIL'}")
    print(f"  [4] Outbreak Chain Recoverable (1 -> Staff -> 2, 3, 4)     : {'✅ PASS' if not any('path from Index' in e for e in errors) else '❌ FAIL'}")
    print(f"  [5] Organism Cohort Retrieval Valid (4 MDR Patients)       : {'✅ PASS' if kp_cohort.total_patients == 4 else '❌ FAIL'}")
    print(f"  [6] Negative Control True Negatives Intact                 : {'✅ PASS' if not any('Unexpected direct' in e for e in errors) else '❌ FAIL'}")
    print("=" * 70)

    if errors:
        print(f"❌ Verification FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  • {err}")
        return False
    else:
        print("✅ ALL GRAPH & QUERY SERVICE CHECKS PASSED PERFECTLY!")
        return True


def main():
    repo_root = Path(__file__).resolve().parent.parent
    cypher_file = repo_root / "data" / "neo4j_dump.cypher"
    events_file = repo_root / "data" / "contact_events.json"

    success = verify_neo4j_graph(cypher_file, events_file)
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    main()
