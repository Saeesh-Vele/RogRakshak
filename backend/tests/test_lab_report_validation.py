"""
Unit tests for Lab Report Extraction Validation and Normalization (Phase 2C).
"""

import pytest
from datetime import datetime
from app.services.lab_report_validation import (
    normalize_str,
    normalize_timestamp,
    normalize_resistance,
    LabReportValidationService,
)
from app.models import LabReport, Patient, LabReportAntibiotic
from app.database import SessionLocal


def test_normalize_str():
    assert normalize_str("  Klebsiella pneumoniae  ") == "klebsiella pneumoniae"
    assert normalize_str("MDR") == "mdr"
    assert normalize_str(None) == ""
    assert normalize_str(123) == "123"


def test_normalize_timestamp():
    assert normalize_timestamp("2026-08-03T17:00:00") == "2026-08-03T17:00:00"
    assert normalize_timestamp("2026-08-03 17:00:00") == "2026-08-03T17:00:00"
    assert normalize_timestamp("2026-08-03 17:00") == "2026-08-03T17:00:00"
    assert normalize_timestamp("2026-08-03T17:00:00+00:00") == "2026-08-03T17:00:00"
    assert normalize_timestamp(None) is None
    assert normalize_timestamp("") is None


def test_normalize_resistance():
    assert normalize_resistance("MDR") == "MDR"
    assert normalize_resistance("mdr") == "MDR"
    assert normalize_resistance("Multidrug-Resistant (MDR)") == "MDR"
    assert normalize_resistance("XDR") == "XDR"
    assert normalize_resistance("susceptible") == "susceptible"
    assert normalize_resistance("Susceptible (S)") == "susceptible"
    assert normalize_resistance("SENSITIVE") == "susceptible"


def test_exact_validation_success():
    with LabReportValidationService() as validator:
        # Construct mock extraction matching Report 1 (Index patient)
        mock_extracted = {
            "source_document": "data/lab_reports/lab_report_001.pdf",
            "extraction_success": True,
            "extracted_data": {
                "report_id": 1,
                "patient_name": "Rajesh Verma (Index)",
                "patient_id": 1,
                "mrn": "MRN-2026-1001",
                "specimen_type": "Endotracheal Aspirate",
                "collected_at": "2026-08-03T17:00:00",
                "received_at": "2026-08-03T17:45:00",
                "reported_at": "2026-08-05T19:00:00",
                "organism": "Klebsiella pneumoniae",
                "resistance_profile": "MDR",
                "status": "final",
            },
        }
        res = validator.validate_single_report(mock_extracted)
        assert res["validation_status"] == "passed"
        assert len(res["mismatches"]) == 0
        assert res["field_results"]["organism"]["match"] is True
        assert res["field_results"]["resistance_profile"]["match"] is True
        assert res["field_results"]["collected_at"]["match"] is True


def test_mismatch_detection():
    with LabReportValidationService() as validator:
        # Construct mock extraction with mismatched organism and resistance
        mock_mismatched = {
            "source_document": "data/lab_reports/lab_report_001.pdf",
            "extraction_success": True,
            "extracted_data": {
                "report_id": 1,
                "patient_name": "Rajesh Verma (Index)",
                "patient_id": 1,
                "mrn": "MRN-2026-1001",
                "specimen_type": "Endotracheal Aspirate",
                "collected_at": "2026-08-03T17:00:00",
                "received_at": "2026-08-03T17:45:00",
                "reported_at": "2026-08-05T19:00:00",
                "organism": "Pseudomonas aeruginosa",  # Wrong organism
                "resistance_profile": "susceptible",  # Wrong resistance
                "status": "final",
            },
        }
        res = validator.validate_single_report(mock_mismatched)
        assert res["validation_status"] == "failed"
        assert "organism" in res["mismatches"]
        assert "resistance_profile" in res["mismatches"]
        assert res["field_results"]["organism"]["match"] is False
        assert res["field_results"]["resistance_profile"]["match"] is False


def test_missing_report_detection():
    with LabReportValidationService() as validator:
        mock_missing = {
            "source_document": "data/lab_reports/lab_report_999.pdf",
            "extraction_success": True,
            "extracted_data": {
                "report_id": 99999,  # Non-existent report
                "patient_id": 99999,
                "organism": "Unknown",
            },
        }
        res = validator.validate_single_report(mock_missing)
        assert res["validation_status"] == "failed"
        assert "database_record_not_found" in res["mismatches"]
