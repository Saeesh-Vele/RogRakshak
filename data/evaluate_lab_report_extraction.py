"""
Evaluation Script for Gemini Multimodal Lab Report Extraction (Phase 2B).

Compares model extractions in data/lab_reports/extracted_reports.json against
ground-truth metadata in data/lab_reports/document_manifest.json.

Calculates:
- Total reports
- Successful extractions
- Failed extractions
- Field-level accuracies (Patient ID, Specimen Type, Organism, Resistance Profile, Timestamps, Report ID)
- Exact full-report match count
- Overall accuracy metrics
"""

import os
import sys
import json
import argparse
from pathlib import Path
from typing import Dict, Any, List


def normalize_str(s: Any) -> str:
    if s is None:
        return ""
    return str(s).strip().lower()


def evaluate_extractions(
    extracted_file: Path,
    manifest_file: Path,
) -> Dict[str, Any]:
    print("=" * 70)
    print("ROGRAKSHAK LAB REPORT EXTRACTION EVALUATION (PHASE 2B)")
    print("=" * 70)

    if not extracted_file.exists():
        print(f"❌ Error: Extracted reports file {extracted_file} not found.")
        sys.exit(1)

    if not manifest_file.exists():
        print(f"❌ Error: Manifest file {manifest_file} not found.")
        sys.exit(1)

    with open(extracted_file, "r", encoding="utf-8") as f:
        extracted_data = json.load(f)

    with open(manifest_file, "r", encoding="utf-8") as f:
        manifest = json.load(f)

    reports = extracted_data.get("reports", [])
    meta = extracted_data.get("metadata", {})

    print(f"  • Extracted Reports File : {extracted_file}")
    print(f"  • Manifest File          : {manifest_file}")
    print(f"  • Gemini Model Evaluated : {meta.get('model', 'unknown')}")
    print(f"  • Total Reports in Run   : {len(reports)}")
    print(f"  • Total Ground Truth     : {len(manifest)}")
    print("-" * 70)

    # Index manifest by document_path and by lab_report_id
    manifest_by_doc = {entry["document_path"]: entry for entry in manifest}
    manifest_by_id = {entry["lab_report_id"]: entry for entry in manifest}

    total_reports = len(manifest)
    successful_extractions = 0
    failed_extractions = 0

    field_matches = {
        "report_id": 0,
        "patient_id": 0,
        "specimen_type": 0,
        "organism": 0,
        "resistance_profile": 0,
        "collected_at": 0,
        "reported_at": 0,
    }

    exact_matches = 0
    evaluation_details = []

    for report_item in reports:
        doc_path = report_item.get("source_document")
        success = report_item.get("extraction_success", False)
        data = report_item.get("extracted_data")

        # Match with manifest entry
        gt = manifest_by_doc.get(doc_path)
        if not gt:
            # Try to match by report_id if available
            if data and data.get("report_id"):
                gt = manifest_by_id.get(data.get("report_id"))

        if not gt:
            print(f"⚠️ Warning: No ground truth entry found for document {doc_path}")
            continue

        if not success or not data:
            failed_extractions += 1
            evaluation_details.append({
                "doc": doc_path,
                "success": False,
                "errors": ["Extraction failed / Error recorded"],
            })
            continue

        successful_extractions += 1
        item_errors = []

        # 1. Report ID check
        m_rep_id = data.get("report_id")
        gt_rep_id = gt.get("lab_report_id")
        if m_rep_id == gt_rep_id:
            field_matches["report_id"] += 1
        else:
            item_errors.append(f"Report ID: extracted={m_rep_id}, expected={gt_rep_id}")

        # 2. Patient ID check
        m_pat_id = data.get("patient_id")
        gt_pat_id = gt.get("patient_id")
        if m_pat_id == gt_pat_id:
            field_matches["patient_id"] += 1
        else:
            item_errors.append(f"Patient ID: extracted={m_pat_id}, expected={gt_pat_id}")

        # 3. Specimen Type check
        m_spec = normalize_str(data.get("specimen_type"))
        gt_spec = normalize_str(gt.get("specimen_type"))
        if m_spec == gt_spec:
            field_matches["specimen_type"] += 1
        else:
            item_errors.append(f"Specimen: extracted='{data.get('specimen_type')}', expected='{gt.get('specimen_type')}'")

        # 4. Organism check
        m_org = normalize_str(data.get("organism"))
        gt_org = normalize_str(gt.get("organism"))
        if m_org == gt_org:
            field_matches["organism"] += 1
        else:
            item_errors.append(f"Organism: extracted='{data.get('organism')}', expected='{gt.get('organism')}'")

        # 5. Resistance Profile check
        m_res = normalize_str(data.get("resistance_profile"))
        gt_res = normalize_str(gt.get("resistance_profile"))
        if m_res == gt_res:
            field_matches["resistance_profile"] += 1
        else:
            item_errors.append(f"Resistance: extracted='{data.get('resistance_profile')}', expected='{gt.get('resistance_profile')}'")

        # 6. Collected timestamp check
        m_coll = str(data.get("collected_at") or "")[:19]
        gt_coll = str(gt.get("collected_at") or "")[:19]
        if m_coll == gt_coll:
            field_matches["collected_at"] += 1
        else:
            item_errors.append(f"CollectedAt: extracted='{m_coll}', expected='{gt_coll}'")

        # 7. Reported timestamp check
        m_rep = str(data.get("reported_at") or "")[:19]
        gt_rep = str(gt.get("reported_at") or "")[:19]
        if m_rep == gt_rep:
            field_matches["reported_at"] += 1
        else:
            item_errors.append(f"ReportedAt: extracted='{m_rep}', expected='{gt_rep}'")

        if not item_errors:
            exact_matches += 1

        evaluation_details.append({
            "doc": doc_path,
            "success": True,
            "exact_match": len(item_errors) == 0,
            "errors": item_errors,
        })

    # Summary Calculations
    eval_count = total_reports if total_reports > 0 else 1
    field_accuracies = {
        k: (v / eval_count) * 100.0 for k, v in field_matches.items()
    }
    avg_field_accuracy = sum(field_accuracies.values()) / len(field_accuracies) if field_accuracies else 0.0
    exact_match_rate = (exact_matches / eval_count) * 100.0
    extraction_success_rate = (successful_extractions / eval_count) * 100.0

    print("FIELD-LEVEL EXTRACTION ACCURACY:")
    for field, acc in field_accuracies.items():
        matched = field_matches[field]
        print(f"  • {field:<20}: {matched:>2}/{eval_count} ({acc:>5.1f}%)")

    print("-" * 70)
    print("OVERALL SUMMARY METRICS:")
    print(f"  • Total Reports Evaluated : {total_reports}")
    print(f"  • Successful Extractions  : {successful_extractions}/{total_reports} ({extraction_success_rate:.1f}%)")
    print(f"  • Failed Extractions      : {failed_extractions}")
    print(f"  • Exact Full Match Rate   : {exact_matches}/{total_reports} ({exact_match_rate:.1f}%)")
    print(f"  • Mean Field Accuracy     : {avg_field_accuracy:.1f}%")
    print("=" * 70)

    if exact_matches == total_reports and successful_extractions == total_reports:
        print("✅ 100% PERFECT ACCURACY ON ALL EXTRACTED LAB REPORTS!")
    elif successful_extractions > 0:
        print(f"ℹ️ Evaluation completed with {exact_matches}/{total_reports} exact report matches.")

    return {
        "total_reports": total_reports,
        "successful_extractions": successful_extractions,
        "failed_extractions": failed_extractions,
        "field_accuracies": field_accuracies,
        "exact_matches": exact_matches,
        "exact_match_rate": exact_match_rate,
        "mean_field_accuracy": avg_field_accuracy,
    }


def main():
    parser = argparse.ArgumentParser(description="Evaluate Gemini lab report extractions against manifest ground truth.")
    parser.add_argument(
        "--extracted",
        type=str,
        default="data/lab_reports/extracted_reports.json",
        help="Path to extracted reports JSON",
    )
    parser.add_argument(
        "--manifest",
        type=str,
        default="data/lab_reports/document_manifest.json",
        help="Path to manifest JSON",
    )

    args = parser.parse_args()
    repo_root = Path(__file__).resolve().parent.parent

    extracted_file = repo_root / args.extracted
    manifest_file = repo_root / args.manifest

    evaluate_extractions(extracted_file=extracted_file, manifest_file=manifest_file)


if __name__ == "__main__":
    main()
