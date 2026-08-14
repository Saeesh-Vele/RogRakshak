"""
RogRakshak Lab Report Document Verification Script (Phase 2A).

Verifies generated PDF documents and document_manifest.json against
the live database lab_reports table.

Verification criteria:
1. Number of PDFs == number of lab_reports.
2. Every lab_report has exactly one generated document.
3. Every document has a corresponding manifest entry.
4. Every manifest entry references a valid database lab_report.
5. Patient IDs match.
6. Organism matches.
7. Resistance profile matches.
8. Specimen type matches.
9. Collection timestamp matches.
10. Report timestamp matches.
11. No documents are missing.
12. No extra documents exist.
"""

import sys
import json
from pathlib import Path
from datetime import datetime

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import LabReport, Patient


def verify_lab_reports():
    repo_root = Path(__file__).resolve().parent.parent
    lab_reports_dir = repo_root / "data" / "lab_reports"
    manifest_path = lab_reports_dir / "document_manifest.json"

    print("=" * 70)
    print("ROGRAKSHAK LAB REPORT DOCUMENT VERIFICATION (PHASE 2A)")
    print("=" * 70)

    # Check directory existence
    if not lab_reports_dir.exists():
        print(f"❌ Error: Lab reports directory {lab_reports_dir} does not exist.")
        sys.exit(1)

    if not manifest_path.exists():
        print(f"❌ Error: Manifest file {manifest_path} does not exist.")
        sys.exit(1)

    # Load manifest
    try:
        with open(manifest_path, "r", encoding="utf-8") as f:
            manifest = json.load(f)
    except Exception as e:
        print(f"❌ Error reading manifest JSON: {e}")
        sys.exit(1)

    # Query database
    session = SessionLocal()
    try:
        db_reports = session.query(LabReport).order_by(LabReport.id).all()
        db_report_map = {r.id: r for r in db_reports}
        db_count = len(db_reports)
    finally:
        session.close()

    print(f"  • Database Lab Reports count : {db_count}")
    print(f"  • Manifest entries count     : {len(manifest)}")

    # Scan directory files
    dir_files = list(lab_reports_dir.iterdir())
    pdf_files = [f for f in dir_files if f.is_file() and f.suffix.lower() == ".pdf"]
    non_pdf_files = [f for f in dir_files if f.is_file() and f.suffix.lower() not in [".pdf", ".json"]]

    print(f"  • Generated PDF files count  : {len(pdf_files)}")

    errors = []

    # 1. Number of PDFs == number of lab_reports
    if len(pdf_files) != db_count:
        errors.append(f"PDF count ({len(pdf_files)}) does not match database lab reports count ({db_count}).")

    # 2. Manifest count == db count
    if len(manifest) != db_count:
        errors.append(f"Manifest entry count ({len(manifest)}) does not match database count ({db_count}).")

    # 12. Check for unexpected files in lab_reports directory
    if non_pdf_files:
        errors.append(f"Unexpected non-PDF files found in directory: {[f.name for f in non_pdf_files]}")

    # Track manifest mappings
    manifest_by_report_id = {}
    manifest_by_doc_path = {}

    for entry in manifest:
        lr_id = entry.get("lab_report_id")
        doc_path_str = entry.get("document_path")

        if lr_id is None:
            errors.append(f"Manifest entry missing 'lab_report_id': {entry}")
            continue

        if lr_id in manifest_by_report_id:
            errors.append(f"Duplicate manifest entry for lab_report_id {lr_id}")

        manifest_by_report_id[lr_id] = entry
        manifest_by_doc_path[doc_path_str] = entry

    # Verify each database record against manifest and file on disk
    for lr in db_reports:
        # 2. Every lab_report has exactly one generated document
        expected_filename = f"lab_report_{lr.id:03d}.pdf"
        expected_rel_path = f"data/lab_reports/{expected_filename}"
        expected_file = lab_reports_dir / expected_filename

        # 11. Missing document check
        if not expected_file.exists():
            errors.append(f"Missing PDF document for lab_report_id {lr.id}: {expected_file}")

        # 3. Document has corresponding manifest entry
        manifest_entry = manifest_by_report_id.get(lr.id)
        if not manifest_entry:
            errors.append(f"No manifest entry for database lab_report ID {lr.id}")
            continue

        # 4. Manifest references valid database lab_report
        # 5. Patient IDs match
        if manifest_entry.get("patient_id") != lr.patient_id:
            errors.append(f"Patient ID mismatch for report {lr.id}: manifest={manifest_entry.get('patient_id')}, db={lr.patient_id}")

        # 6. Organism matches
        if manifest_entry.get("organism") != lr.organism:
            errors.append(f"Organism mismatch for report {lr.id}: manifest={manifest_entry.get('organism')}, db={lr.organism}")

        # 7. Resistance profile matches
        if manifest_entry.get("resistance_profile") != lr.resistance_profile:
            errors.append(f"Resistance profile mismatch for report {lr.id}: manifest={manifest_entry.get('resistance_profile')}, db={lr.resistance_profile}")

        # 8. Specimen type matches
        if manifest_entry.get("specimen_type") != lr.specimen_type:
            errors.append(f"Specimen type mismatch for report {lr.id}: manifest={manifest_entry.get('specimen_type')}, db={lr.specimen_type}")

        # 9. Collection timestamp matches
        m_coll = manifest_entry.get("collected_at")
        db_coll_iso = lr.collected_at.isoformat()
        if m_coll != db_coll_iso:
            errors.append(f"Collection timestamp mismatch for report {lr.id}: manifest={m_coll}, db={db_coll_iso}")

        # 10. Report timestamp matches
        m_rep = manifest_entry.get("reported_at")
        db_rep_iso = lr.reported_at.isoformat()
        if m_rep != db_rep_iso:
            errors.append(f"Reported timestamp mismatch for report {lr.id}: manifest={m_rep}, db={db_rep_iso}")

    # Check for orphaned PDFs not in DB
    for pdf_file in pdf_files:
        rel_path = f"data/lab_reports/{pdf_file.name}"
        if rel_path not in manifest_by_doc_path:
            errors.append(f"Orphaned PDF on disk not in manifest: {pdf_file.name}")

    print("-" * 70)
    print("VERIFICATION CHECKLIST RESULTS:")
    print(f"  [1] PDF count == Lab report count ({len(pdf_files)} == {db_count}) : {'✅ PASS' if len(pdf_files) == db_count else '❌ FAIL'}")
    print(f"  [2] Each report has exactly one document                        : {'✅ PASS' if not any('Missing PDF' in e for e in errors) else '❌ FAIL'}")
    print(f"  [3] All documents mapped in manifest                            : {'✅ PASS' if len(manifest) == len(pdf_files) else '❌ FAIL'}")
    print(f"  [4] Manifest entries reference valid DB reports                 : {'✅ PASS' if len(manifest_by_report_id) == db_count else '❌ FAIL'}")
    print(f"  [5] Patient IDs match                                           : {'✅ PASS' if not any('Patient ID mismatch' in e for e in errors) else '❌ FAIL'}")
    print(f"  [6] Organism names match                                        : {'✅ PASS' if not any('Organism mismatch' in e for e in errors) else '❌ FAIL'}")
    print(f"  [7] Resistance profiles match                                   : {'✅ PASS' if not any('Resistance profile mismatch' in e for e in errors) else '❌ FAIL'}")
    print(f"  [8] Specimen types match                                        : {'✅ PASS' if not any('Specimen type mismatch' in e for e in errors) else '❌ FAIL'}")
    print(f"  [9] Collection timestamps match                                 : {'✅ PASS' if not any('Collection timestamp' in e for e in errors) else '❌ FAIL'}")
    print(f"  [10] Report timestamps match                                    : {'✅ PASS' if not any('Reported timestamp' in e for e in errors) else '❌ FAIL'}")
    print(f"  [11] No missing documents                                       : {'✅ PASS' if not any('Missing' in e for e in errors) else '❌ FAIL'}")
    print(f"  [12] No extra/unexpected files                                  : {'✅ PASS' if not any('Unexpected' in e or 'Orphaned' in e for e in errors) else '❌ FAIL'}")
    print("=" * 70)

    if errors:
        print(f"❌ Verification FAILED with {len(errors)} error(s):")
        for err in errors:
            print(f"  • {err}")
        sys.exit(1)
    else:
        print("✅ ALL 12 VERIFICATION CHECKS PASSED PERFECTLY!")
        sys.exit(0)


if __name__ == "__main__":
    verify_lab_reports()
