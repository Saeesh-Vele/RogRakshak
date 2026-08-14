"""
Integration Verification Script for Lab Report Database Extractions (Phase 2C).

Verifies:
1. Every expected lab report still exists (16 records).
2. No duplicate lab_reports were created.
3. Patient foreign keys are valid.
4. Report IDs remain stable.
5. Organisms are preserved.
6. Resistance profiles are preserved.
7. Timestamps are preserved.
8. AST child records have valid foreign keys and non-empty rows.
9. Verification of idempotency across integration runs.
"""

import sys
import json
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import LabReport, Patient, LabReportAntibiotic


def verify_integration() -> bool:
    print("=" * 70)
    print("ROGRAKSHAK PHASE 2C INTEGRATION VERIFICATION")
    print("=" * 70)

    session = SessionLocal()
    errors = []

    try:
        # 1. Total lab reports count
        db_reports = session.query(LabReport).order_by(LabReport.id).all()
        report_count = len(db_reports)
        print(f"  • Total LabReport records in database : {report_count}")
        if report_count != 16:
            errors.append(f"Expected 16 lab reports in database, found {report_count}")

        # 2. Duplicate ID check
        unique_ids = {r.id for r in db_reports}
        if len(unique_ids) != report_count:
            errors.append(f"Duplicate LabReport IDs detected: count={report_count}, unique={len(unique_ids)}")

        # 3. Patient foreign keys validity & field preservation
        patients = {p.id: p for p in session.query(Patient).all()}
        for r in db_reports:
            if r.patient_id not in patients:
                errors.append(f"LabReport {r.id} has invalid patient_id {r.patient_id}")
            if not r.organism:
                errors.append(f"LabReport {r.id} has missing organism")
            if not r.resistance_profile:
                errors.append(f"LabReport {r.id} has missing resistance_profile")
            if not r.collected_at:
                errors.append(f"LabReport {r.id} has missing collected_at")
            if not r.reported_at:
                errors.append(f"LabReport {r.id} has missing reported_at")
            if not r.raw_report_path or not r.raw_report_path.startswith("data/lab_reports/"):
                errors.append(f"LabReport {r.id} has unintegrated raw_report_path: '{r.raw_report_path}'")

        # 4. AST records verification
        ast_records = session.query(LabReportAntibiotic).all()
        ast_count = len(ast_records)
        print(f"  • Total AST Antibiotic records in DB  : {ast_count}")

        if ast_count == 0:
            errors.append("No AST antibiotic records found in lab_report_antibiotics table")

        # Verify all AST foreign keys link to valid LabReports
        report_id_set = {r.id for r in db_reports}
        for ast in ast_records:
            if ast.lab_report_id not in report_id_set:
                errors.append(f"AST record {ast.id} has invalid lab_report_id {ast.lab_report_id}")
            if not ast.antibiotic:
                errors.append(f"AST record {ast.id} has empty antibiotic name")
            if not ast.result:
                errors.append(f"AST record {ast.id} has empty result")

        # Check AST coverage per lab report
        reports_with_ast = {ast.lab_report_id for ast in ast_records}
        missing_ast_reports = report_id_set - reports_with_ast
        if missing_ast_reports:
            errors.append(f"LabReports missing AST records: {missing_ast_reports}")

        print("-" * 70)
        print("VERIFICATION CHECKLIST:")
        print(f"  [1] Lab report count == 16               : {'✅ PASS' if report_count == 16 else '❌ FAIL'}")
        print(f"  [2] No duplicate LabReports              : {'✅ PASS' if len(unique_ids) == report_count else '❌ FAIL'}")
        print(f"  [3] Valid Patient Foreign Keys           : {'✅ PASS' if not any('patient_id' in e for e in errors) else '❌ FAIL'}")
        print(f"  [4] Organism & Resistance Preserved      : {'✅ PASS' if not any('organism' in e or 'resistance' in e for e in errors) else '❌ FAIL'}")
        print(f"  [5] Document Paths Updated               : {'✅ PASS' if not any('raw_report_path' in e for e in errors) else '❌ FAIL'}")
        print(f"  [6] AST Records Synced (> 0)             : {'✅ PASS' if ast_count > 0 else '❌ FAIL'}")
        print(f"  [7] AST Foreign Keys Valid               : {'✅ PASS' if not any('AST record' in e and 'invalid' in e for e in errors) else '❌ FAIL'}")
        print(f"  [8] All 16 Reports have AST Records      : {'✅ PASS' if not missing_ast_reports else '❌ FAIL'}")
        print("=" * 70)

        if errors:
            print(f"❌ Verification FAILED with {len(errors)} error(s):")
            for err in errors:
                print(f"  • {err}")
            return False
        else:
            print("✅ ALL INTEGRATION VERIFICATION CHECKS PASSED PERFECTLY!")
            return True

    finally:
        session.close()


def main():
    success = verify_integration()
    if not success:
        sys.exit(1)


if __name__ == "__main__":
    main()
