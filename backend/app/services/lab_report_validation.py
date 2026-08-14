"""
Laboratory Report Extraction Validation Service (Phase 2C).

Provides deterministic validation of Gemini multimodal extractions against
PostgreSQL database ground truth (LabReport, Patient) and document manifest.
Performs deterministic normalization without fuzzy matching or LLM correction.
"""

import sys
import json
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional, Union
from sqlalchemy.orm import Session

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent.parent
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import LabReport, Patient


def normalize_str(val: Any) -> str:
    """Deterministic string normalization: strips whitespace and lowercases."""
    if val is None:
        return ""
    return str(val).strip().lower()


def normalize_timestamp(val: Any) -> Optional[str]:
    """Deterministic timestamp normalization to standard ISO-8601 string (YYYY-MM-DDTHH:MM:SS)."""
    if val is None:
        return None
    s = str(val).strip()
    if not s:
        return None
    # Truncate any timezone offset or subsecond for consistent string comparison if present
    if "+" in s:
        s = s.split("+")[0]
    if "Z" in s:
        s = s.rstrip("Z")
    
    formats = [
        "%Y-%m-%dT%H:%M:%S",
        "%Y-%m-%d %H:%M:%S",
        "%Y-%m-%dT%H:%M",
        "%Y-%m-%d %H:%M",
        "%d/%m/%Y %H:%M",
        "%d-%m-%Y %H:%M",
    ]
    for fmt in formats:
        try:
            dt = datetime.strptime(s[:19], fmt[:len(s[:19])])
            return dt.strftime("%Y-%m-%dT%H:%M:%S")
        except (ValueError, IndexError):
            continue
    return s[:19]


def normalize_resistance(val: Any) -> str:
    """Deterministic resistance profile normalization."""
    if val is None:
        return ""
    s = str(val).strip().upper()
    if "MDR" in s:
        return "MDR"
    elif "XDR" in s:
        return "XDR"
    elif "SUSCEPTIBLE" in s or "SENSITIVE" in s:
        return "susceptible"
    return s.lower()


class LabReportValidationService:
    def __init__(self, db_session: Optional[Session] = None):
        self._owns_session = db_session is None
        self.db = db_session or SessionLocal()

    def close(self):
        if self._owns_session:
            self.db.close()

    def __enter__(self):
        return self

    def __exit__(self, exc_type, exc_val, exc_tb):
        self.close()

    def validate_single_report(
        self,
        extracted_item: Dict[str, Any],
        manifest_entry: Optional[Dict[str, Any]] = None,
    ) -> Dict[str, Any]:
        """
        Validates a single extracted report against PostgreSQL record and optional manifest.
        """
        doc_path = extracted_item.get("source_document", "")
        success = extracted_item.get("extraction_success", False)
        data = extracted_item.get("extracted_data")

        if not success or not data:
            return {
                "report_id": None,
                "source_document": doc_path,
                "validation_status": "failed",
                "reason": "Extraction marked as failed or missing data in input",
                "field_results": {},
                "mismatches": ["extraction_payload"],
            }

        extracted_report_id = data.get("report_id")

        # Resolve DB record by report_id
        db_report = None
        if extracted_report_id is not None:
            db_report = self.db.query(LabReport).filter(LabReport.id == extracted_report_id).first()

        # Fallback to resolving via manifest if report_id was missing
        if not db_report and manifest_entry:
            manifest_lr_id = manifest_entry.get("lab_report_id")
            if manifest_lr_id:
                db_report = self.db.query(LabReport).filter(LabReport.id == manifest_lr_id).first()

        if not db_report:
            return {
                "report_id": extracted_report_id,
                "source_document": doc_path,
                "validation_status": "failed",
                "reason": f"Database LabReport record not found for report_id={extracted_report_id}",
                "field_results": {},
                "mismatches": ["database_record_not_found"],
            }

        # Resolve Patient record
        db_patient = self.db.query(Patient).filter(Patient.id == db_report.patient_id).first()
        if not db_patient:
            return {
                "report_id": db_report.id,
                "source_document": doc_path,
                "validation_status": "failed",
                "reason": f"Database Patient record not found for patient_id={db_report.patient_id}",
                "field_results": {},
                "mismatches": ["patient_record_not_found"],
            }

        # Field comparisons
        field_results = {}
        mismatches = []

        # 1. Report ID
        exp_rep_id = db_report.id
        act_rep_id = data.get("report_id")
        rep_id_match = (act_rep_id == exp_rep_id)
        field_results["report_id"] = {"expected": exp_rep_id, "actual": act_rep_id, "match": rep_id_match}
        if not rep_id_match:
            mismatches.append("report_id")

        # 2. Patient ID
        exp_pat_id = db_patient.id
        act_pat_id = data.get("patient_id")
        pat_id_match = (act_pat_id == exp_pat_id)
        field_results["patient_id"] = {"expected": exp_pat_id, "actual": act_pat_id, "match": pat_id_match}
        if not pat_id_match:
            mismatches.append("patient_id")

        # 3. Patient Name
        exp_name = db_patient.name
        act_name = data.get("patient_name")
        name_match = (normalize_str(act_name) == normalize_str(exp_name))
        field_results["patient_name"] = {"expected": exp_name, "actual": act_name, "match": name_match}
        if not name_match:
            mismatches.append("patient_name")

        # 4. MRN
        exp_mrn = db_patient.mrn
        act_mrn = data.get("mrn")
        mrn_match = (normalize_str(act_mrn) == normalize_str(exp_mrn))
        field_results["mrn"] = {"expected": exp_mrn, "actual": act_mrn, "match": mrn_match}
        if not mrn_match:
            mismatches.append("mrn")

        # 5. Specimen Type
        exp_spec = db_report.specimen_type
        act_spec = data.get("specimen_type")
        spec_match = (normalize_str(act_spec) == normalize_str(exp_spec))
        field_results["specimen_type"] = {"expected": exp_spec, "actual": act_spec, "match": spec_match}
        if not spec_match:
            mismatches.append("specimen_type")

        # 6. Organism
        exp_org = db_report.organism
        act_org = data.get("organism")
        org_match = (normalize_str(act_org) == normalize_str(exp_org))
        field_results["organism"] = {"expected": exp_org, "actual": act_org, "match": org_match}
        if not org_match:
            mismatches.append("organism")

        # 7. Resistance Profile
        exp_res = db_report.resistance_profile
        act_res = data.get("resistance_profile")
        res_match = (normalize_resistance(act_res) == normalize_resistance(exp_res))
        field_results["resistance_profile"] = {"expected": exp_res, "actual": act_res, "match": res_match}
        if not res_match:
            mismatches.append("resistance_profile")

        # 8. Collected At
        exp_coll = normalize_timestamp(db_report.collected_at)
        act_coll = normalize_timestamp(data.get("collected_at"))
        coll_match = (act_coll == exp_coll)
        field_results["collected_at"] = {"expected": exp_coll, "actual": act_coll, "match": coll_match}
        if not coll_match:
            mismatches.append("collected_at")

        # 9. Reported At
        exp_rep = normalize_timestamp(db_report.reported_at)
        act_rep = normalize_timestamp(data.get("reported_at"))
        rep_match = (act_rep == exp_rep)
        field_results["reported_at"] = {"expected": exp_rep, "actual": act_rep, "match": rep_match}
        if not rep_match:
            mismatches.append("reported_at")

        validation_status = "passed" if len(mismatches) == 0 else "failed"

        return {
            "report_id": db_report.id,
            "source_document": doc_path,
            "validation_status": validation_status,
            "field_results": field_results,
            "mismatches": mismatches,
            "extracted_data": data,
        }

    def validate_all(
        self,
        extracted_data: Union[Dict[str, Any], Path, str],
        manifest_data: Optional[Union[List[Dict[str, Any]], Path, str]] = None,
    ) -> Dict[str, Any]:
        """
        Validates all extractions from extracted_reports payload.
        """
        if isinstance(extracted_data, (str, Path)):
            with open(extracted_data, "r", encoding="utf-8") as f:
                extracted_data = json.load(f)

        manifest_map: Dict[str, Dict[str, Any]] = {}
        if manifest_data:
            if isinstance(manifest_data, (str, Path)):
                with open(manifest_data, "r", encoding="utf-8") as f:
                    m_list = json.load(f)
            else:
                m_list = manifest_data
            for m in m_list:
                if "document_path" in m:
                    manifest_map[m["document_path"]] = m
                if "lab_report_id" in m:
                    manifest_map[str(m["lab_report_id"])] = m

        reports_list = extracted_data.get("reports", [])
        total_extracted = len(reports_list)

        results = []
        passed_count = 0
        failed_count = 0

        field_counts = {
            "report_id": 0,
            "patient_id": 0,
            "patient_name": 0,
            "mrn": 0,
            "specimen_type": 0,
            "organism": 0,
            "resistance_profile": 0,
            "collected_at": 0,
            "reported_at": 0,
        }

        for report_item in reports_list:
            doc_p = report_item.get("source_document", "")
            m_entry = manifest_map.get(doc_p)
            val_res = self.validate_single_report(report_item, manifest_entry=m_entry)
            results.append(val_res)

            if val_res["validation_status"] == "passed":
                passed_count += 1
            else:
                failed_count += 1

            for f_name, f_info in val_res.get("field_results", {}).items():
                if f_info.get("match", False):
                    field_counts[f_name] = field_counts.get(f_name, 0) + 1

        db_total_reports = self.db.query(LabReport).count()
        missing_count = max(0, db_total_reports - total_extracted)

        eval_base = total_extracted if total_extracted > 0 else 1
        field_accuracies = {
            k: (v / eval_base) * 100.0 for k, v in field_counts.items()
        }

        return {
            "summary": {
                "total_extracted_reports": total_extracted,
                "database_total_reports": db_total_reports,
                "validation_passed": passed_count,
                "validation_failed": failed_count,
                "missing_reports": missing_count,
                "exact_validated_matches": passed_count,
                "exact_match_rate": (passed_count / eval_base) * 100.0,
            },
            "field_validation": {
                k: {
                    "matched": field_counts[k],
                    "total": eval_base,
                    "accuracy_percent": field_accuracies[k],
                }
                for k in field_counts
            },
            "reports": results,
        }
