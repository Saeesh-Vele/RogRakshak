"""
Database Integration Script for Validated Lab Reports (Phase 2C).

Integrates validated extraction results from data/lab_reports/extracted_reports.json
into the PostgreSQL database:
- Updates LabReport records with document paths and statuses.
- Persists structured Antimicrobial Susceptibility Testing (AST) panels into lab_report_antibiotics.
- Strictly idempotent: repeated executions produce identical database states without duplicates.
"""

import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import LabReport, Patient, LabReportAntibiotic
from app.services.lab_report_validation import LabReportValidationService


def integrate_extractions(
    extracted_file: Path,
    manifest_file: Path = None,
) -> Dict[str, Any]:
    print("=" * 60)
    print("ROGRAKSHAK PHASE 2C DATABASE INTEGRATION")
    print("=" * 60)

    if not extracted_file.exists():
        print(f"❌ Error: Extracted reports file {extracted_file} not found.")
        sys.exit(1)

    session = SessionLocal()
    try:
        # Step 1: Validate extractions
        validator = LabReportValidationService(db_session=session)
        val_report = validator.validate_all(
            extracted_data=extracted_file,
            manifest_data=manifest_file if (manifest_file and manifest_file.exists()) else None,
        )

        passed_reports = [r for r in val_report["reports"] if r["validation_status"] == "passed"]
        failed_reports = [r for r in val_report["reports"] if r["validation_status"] == "failed"]

        print(f"Total extracted reports evaluated : {len(val_report['reports'])}")
        print(f"Validated for integration         : {len(passed_reports)}")
        print(f"Skipped due to validation failure : {len(failed_reports)}")

        if failed_reports:
            print("⚠️ Warning: Some reports failed validation and will NOT be integrated.")

        updated_reports_count = 0
        total_ast_records = 0

        # Step 2: Idempotent integration into PostgreSQL
        for rep in passed_reports:
            lr_id = rep["report_id"]
            doc_path = rep["source_document"]
            ext_data = rep["extracted_data"]

            db_report = session.query(LabReport).filter(LabReport.id == lr_id).first()
            if not db_report:
                print(f"⚠️ Warning: DB report {lr_id} not found during integration step.")
                continue

            # Update document path if not already set or changed
            if doc_path:
                db_report.raw_report_path = doc_path
            if ext_data.get("status"):
                db_report.status = str(ext_data.get("status")).lower()

            # Sync AST (Antimicrobial Susceptibility Testing) child records
            ast_items = ext_data.get("antimicrobial_susceptibility", [])

            # Clear existing AST records for this report to guarantee idempotency
            session.query(LabReportAntibiotic).filter(LabReportAntibiotic.lab_report_id == lr_id).delete()

            # Insert current AST records
            for ast in ast_items:
                ab_record = LabReportAntibiotic(
                    lab_report_id=lr_id,
                    antibiotic=ast.get("antibiotic", "Unknown"),
                    result=ast.get("result", "Unknown"),
                    mic=ast.get("mic"),
                    interp=ast.get("interp"),
                )
                session.add(ab_record)
                total_ast_records += 1

            updated_reports_count += 1

        session.commit()

        print("-" * 60)
        print("DATABASE INTEGRATION SUMMARY:")
        print(f"  • LabReport records updated      : {updated_reports_count}")
        print(f"  • AST antibiotic rows synced     : {total_ast_records}")
        print(f"  • Transaction status             : COMMITTED ✅")
        print("=" * 60)

        return {
            "updated_reports": updated_reports_count,
            "synced_ast_rows": total_ast_records,
            "status": "success",
        }

    except Exception as e:
        session.rollback()
        print(f"❌ Error during database integration: {e}")
        sys.exit(1)
    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Integrate validated lab report extractions into database.")
    parser.add_argument(
        "--extracted",
        type=str,
        default="data/lab_reports/extracted_reports.json",
        help="Path to extracted_reports.json",
    )
    parser.add_argument(
        "--manifest",
        type=str,
        default="data/lab_reports/document_manifest.json",
        help="Path to document_manifest.json",
    )

    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    extracted_file = repo_root / args.extracted
    manifest_file = repo_root / args.manifest

    integrate_extractions(
        extracted_file=extracted_file,
        manifest_file=manifest_file,
    )


if __name__ == "__main__":
    main()
