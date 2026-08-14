"""
Batch Multimodal Extraction Script for Lab Reports (Phase 2B).

Finds generated microbiology lab report PDFs in data/lab_reports/,
invokes Google Gemini multimodal extraction via LabReportExtractionService,
and saves validated results to data/lab_reports/extracted_reports.json.

Features:
- Resume-safe: loads existing extracted_reports.json and skips already successfully extracted reports.
- Retries only missing or failed reports.
- Preserves existing successful results.
- Continuous processing across failures.
- Zero secret leakage.
"""

import os
import re
import sys
import time
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List, Optional

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.services.lab_report_extraction import LabReportExtractionService


def parse_retry_delay(error_str: str) -> float:
    """Parse suggested retry delay from ResourceExhausted error message or default to 15s."""
    match = re.search(r"retry in\s+([0-9\.]+)\s*s", error_str, re.IGNORECASE)
    if match:
        try:
            return float(match.group(1)) + 1.0
        except ValueError:
            pass
    match_sec = re.search(r"seconds:\s*([0-9]+)", error_str)
    if match_sec:
        try:
            return float(match_sec.group(1)) + 1.0
        except ValueError:
            pass
    return 15.0


def run_batch_extraction(
    pdf_dir: Path,
    output_file: Path,
    single_pdf: Optional[str] = None,
    model_name: Optional[str] = None,
    delay_seconds: float = 2.0,
    max_retries: int = 3,
    resume: bool = True,
) -> Dict[str, Any]:
    print("=" * 70)
    print("ROGRAKSHAK GEMINI LAB REPORT MULTIMODAL EXTRACTION (PHASE 2B)")
    print("=" * 70)

    service = LabReportExtractionService(model_name=model_name)
    actual_model = service.model_name
    print(f"Using Gemini Model: {actual_model}")

    if single_pdf:
        target_path = Path(single_pdf)
        if not target_path.is_absolute():
            target_path = Path.cwd() / target_path
        if not target_path.exists():
            print(f"❌ Error: Single PDF not found at {target_path}")
            sys.exit(1)
        pdf_paths = [target_path]
    else:
        if not pdf_dir.exists():
            print(f"❌ Error: Directory {pdf_dir} does not exist.")
            sys.exit(1)
        pdf_paths = sorted(pdf_dir.glob("*.pdf"))

    print(f"Total PDFs queued for extraction: {len(pdf_paths)}")

    # 1. Load existing extracted_reports.json if it exists
    existing_reports: Dict[str, Dict[str, Any]] = {}
    if resume and output_file.exists() and not single_pdf:
        try:
            with open(output_file, "r", encoding="utf-8") as f:
                old_data = json.load(f)
                for item in old_data.get("reports", []):
                    src = item.get("source_document")
                    if src and item.get("extraction_success") and item.get("extracted_data") is not None:
                        existing_reports[src] = item
            if existing_reports:
                print(f"  ℹ️ Loaded {len(existing_reports)} previously successful report(s) from {output_file.name}.")
        except Exception as e:
            print(f"  ⚠️ Could not load existing cache: {e}")
            existing_reports = {}

    results: List[Dict[str, Any]] = []
    success_count = 0
    fail_count = 0

    repo_root = Path(__file__).resolve().parent.parent

    for idx, pdf_path in enumerate(pdf_paths, 1):
        try:
            rel_path = str(pdf_path.relative_to(repo_root))
        except ValueError:
            rel_path = str(pdf_path)

        filename = pdf_path.name

        # 2. If PDF already has a successful extraction, skip it
        if resume and rel_path in existing_reports:
            cached_item = existing_reports[rel_path]
            results.append(cached_item)
            success_count += 1
            print(f"[{idx}/{len(pdf_paths)}] [SKIP] {filename} — already successfully extracted")
            continue

        # 3. Process new or previously failed report
        is_retry = output_file.exists() and rel_path not in existing_reports
        action_tag = "[RETRY]" if is_retry else "[EXTRACT]"
        print(f"\n[{idx}/{len(pdf_paths)}] {action_tag} {filename} ...", flush=True)

        extracted_item = None
        for attempt in range(1, max_retries + 1):
            start_t = time.time()
            try:
                extraction = service.extract_from_pdf(pdf_path)
                elapsed = time.time() - start_t
                success_count += 1
                print(f"  ✅ Extracted in {elapsed:.2f}s | Patient: {extraction.patient_name} (ID: {extraction.patient_id}) | Organism: {extraction.organism} ({extraction.resistance_profile})")

                extracted_item = {
                    "source_document": rel_path,
                    "extraction_success": True,
                    "model": actual_model,
                    "timestamp": datetime.now(timezone.utc).isoformat(),
                    "extracted_data": extraction.model_dump(),
                }
                break
            except Exception as e:
                elapsed = time.time() - start_t
                err_type = type(e).__name__
                # Sanitize error message to avoid leaking any credentials
                api_key = os.getenv("GOOGLE_API_KEY", "")
                err_msg = str(e).replace(api_key, "[REDACTED_API_KEY]") if api_key else str(e)

                if ("ResourceExhausted" in err_type or "429" in err_msg) and attempt < max_retries:
                    backoff = parse_retry_delay(err_msg)
                    print(f"  ⏳ Rate limit (429) hit on attempt {attempt}/{max_retries}. Backing off for {backoff:.1f}s...")
                    time.sleep(backoff)
                    continue
                else:
                    fail_count += 1
                    print(f"  ❌ Failed in {elapsed:.2f}s: {err_type} - {err_msg[:120]}")
                    extracted_item = {
                        "source_document": rel_path,
                        "extraction_success": False,
                        "model": actual_model,
                        "timestamp": datetime.now(timezone.utc).isoformat(),
                        "error": f"{err_type}: {err_msg}",
                        "extracted_data": None,
                    }
                    break

        if extracted_item:
            results.append(extracted_item)

        # 4 & 11. Write current state to extracted_reports.json atomically and validly
        output_payload = {
            "metadata": {
                "total_documents": len(pdf_paths),
                "successful_extractions": success_count,
                "failed_extractions": fail_count,
                "model": actual_model,
                "extracted_at": datetime.now(timezone.utc).isoformat(),
            },
            "reports": results,
        }
        output_file.parent.mkdir(parents=True, exist_ok=True)
        with open(output_file, "w", encoding="utf-8") as f:
            json.dump(output_payload, f, indent=2)

        if idx < len(pdf_paths) and delay_seconds > 0 and rel_path not in existing_reports:
            time.sleep(delay_seconds)

    print("\n" + "=" * 70)
    print(f"EXTRACTION COMPLETED: {success_count}/{len(pdf_paths)} succeeded ({fail_count} failed)")
    print(f"Results saved to: {output_file}")
    print("=" * 70)

    return output_payload


def main():
    parser = argparse.ArgumentParser(description="Extract structured data from PDF lab reports using Gemini.")
    parser.add_argument(
        "--single",
        type=str,
        default=None,
        help="Path to a single PDF to extract (for testing)",
    )
    parser.add_argument(
        "--pdf-dir",
        type=str,
        default="data/lab_reports",
        help="Directory containing PDF reports",
    )
    parser.add_argument(
        "--output",
        type=str,
        default="data/lab_reports/extracted_reports.json",
        help="Output JSON file path",
    )
    parser.add_argument(
        "--model",
        type=str,
        default=None,
        help="Gemini model name (default: gemini-flash-latest or GEMINI_MODEL env)",
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=2.0,
        help="Delay between requests in seconds for rate limiting",
    )
    parser.add_argument(
        "--no-resume",
        action="store_true",
        help="Do not reuse existing successful extractions; re-extract all files",
    )

    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    pdf_dir = repo_root / args.pdf_dir
    output_file = repo_root / args.output

    run_batch_extraction(
        pdf_dir=pdf_dir,
        output_file=output_file,
        single_pdf=args.single,
        model_name=args.model,
        delay_seconds=args.delay,
        resume=not args.no_resume,
    )


if __name__ == "__main__":
    main()
