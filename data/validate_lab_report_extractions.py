"""
Phase 2C Validation Runner for Extracted Lab Reports.

Loads data/lab_reports/extracted_reports.json, validates each extraction against
PostgreSQL database ground truth using LabReportValidationService, outputs
the validation report, and saves data/lab_reports/validation_results.json.
"""

import sys
import json
import argparse
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.lab_report_validation import LabReportValidationService


def run_validation(
    extracted_file: Path,
    manifest_file: Path,
    output_file: Path,
) -> dict:
    print("=" * 60)
    print("ROGRAKSHAK PHASE 2C VALIDATION")
    print("=" * 60)

    if not extracted_file.exists():
        print(f"❌ Error: Extracted reports file {extracted_file} not found.")
        sys.exit(1)

    with LabReportValidationService() as validator:
        report = validator.validate_all(
            extracted_data=extracted_file,
            manifest_data=manifest_file if manifest_file.exists() else None,
        )

    summary = report["summary"]
    fields = report["field_validation"]

    print(f"\nTotal extracted reports : {summary['total_extracted_reports']}")
    print(f"Validation passed       : {summary['validation_passed']}")
    print(f"Validation failed       : {summary['validation_failed']}")
    print(f"Missing reports         : {summary['missing_reports']}")

    print("\nFIELD VALIDATION:")
    for f_name, f_stat in fields.items():
        matched = f_stat["matched"]
        total = f_stat["total"]
        acc = f_stat["accuracy_percent"]
        print(f"{f_name:<23} {matched:>2}/{total} ({acc:>5.1f}%)")

    print(f"\nExact validated matches : {summary['exact_validated_matches']}/{summary['total_extracted_reports']} ({summary['exact_match_rate']:.1f}%)")
    print("=" * 60)

    # Save to validation_results.json
    output_file.parent.mkdir(parents=True, exist_ok=True)
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(report, f, indent=2)

    print(f"Validation results written to: {output_file}\n")

    if summary["validation_failed"] > 0:
        print(f"❌ Validation FAILED for {summary['validation_failed']} report(s):")
        for r in report["reports"]:
            if r["validation_status"] == "failed":
                print(f"  • Report {r.get('report_id')} ({r.get('source_document')}): Mismatches = {r.get('mismatches')}")
        return report

    print("✅ ALL EXTRACTED LAB REPORTS PASSED PHASE 2C VALIDATION!")
    return report


def main():
    parser = argparse.ArgumentParser(description="Validate Gemini extracted lab reports against database ground truth.")
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
    parser.add_argument(
        "--output",
        type=str,
        default="data/lab_reports/validation_results.json",
        help="Output validation results JSON path",
    )

    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    extracted_file = repo_root / args.extracted
    manifest_file = repo_root / args.manifest
    output_file = repo_root / args.output

    res = run_validation(
        extracted_file=extracted_file,
        manifest_file=manifest_file,
        output_file=output_file,
    )
    if res["summary"]["validation_failed"] > 0:
        sys.exit(1)


if __name__ == "__main__":
    main()
