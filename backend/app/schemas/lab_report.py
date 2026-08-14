"""
Pydantic Schemas for Laboratory Report Extraction (Phase 2B).

Defines strict data models for structured multimodal extraction of microbiology
lab reports with type validation and normalization.
"""

from datetime import datetime
from typing import Optional, List, Union
from pydantic import BaseModel, Field, field_validator


class AntibioticResult(BaseModel):
    antibiotic: str = Field(description="Name of the antimicrobial agent tested")
    result: str = Field(description="Qualitative susceptibility result e.g. Resistant (R), Susceptible (S), Intermediate (I)")
    mic: Optional[str] = Field(default=None, description="Minimum Inhibitory Concentration or screen value e.g. '> 32 ug/mL', '<= 0.5 ug/mL'")
    interp: Optional[str] = Field(default=None, description="Category code: S, I, or R")

    @field_validator("interp", mode="before")
    @classmethod
    def normalize_interp(cls, v, info):
        if v is None and "result" in info.data:
            res = str(info.data["result"]).upper()
            if "(R)" in res or res.startswith("R"):
                return "R"
            elif "(S)" in res or res.startswith("S"):
                return "S"
            elif "(I)" in res or res.startswith("I"):
                return "I"
        return str(v).strip().upper() if v else None


class LabReportExtraction(BaseModel):
    report_id: Optional[int] = Field(default=None, description="Numerical report ID extracted from Report ID / Lab ID (e.g. 1 from LAB-0001)")
    patient_name: Optional[str] = Field(default=None, description="Full name of the patient")
    patient_id: Optional[int] = Field(default=None, description="Numerical patient ID (e.g. 1 from PAT-0001)")
    mrn: Optional[str] = Field(default=None, description="Medical Record Number (e.g. MRN-2026-1001)")
    specimen_type: Optional[str] = Field(default=None, description="Type of clinical specimen (e.g. Endotracheal Aspirate, Sputum, Blood Culture, Wound Swab, Urine)")
    collected_at: Optional[str] = Field(default=None, description="Specimen collection timestamp in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)")
    received_at: Optional[str] = Field(default=None, description="Specimen received timestamp in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)")
    reported_at: Optional[str] = Field(default=None, description="Report verified/reported timestamp in ISO 8601 format (YYYY-MM-DDTHH:MM:SS)")
    organism: Optional[str] = Field(default=None, description="Isolated microbial pathogen name (e.g. Klebsiella pneumoniae)")
    resistance_profile: Optional[str] = Field(default=None, description="Resistance profile classification: MDR, XDR, or susceptible")
    culture_result: Optional[str] = Field(default=None, description="Culture growth summary or colony count")
    antimicrobial_susceptibility: List[AntibioticResult] = Field(default_factory=list, description="List of tested antibiotics and susceptibility results")
    interpretation: Optional[str] = Field(default=None, description="Clinical remarks, interpretation, or infection control alerts")
    status: Optional[str] = Field(default="final", description="Report status (e.g. final)")

    @field_validator("patient_id", mode="before")
    @classmethod
    def parse_patient_id(cls, v):
        if v is None:
            return None
        if isinstance(v, int):
            return v
        s = str(v).strip()
        # Handle 'PAT-0001' or 'PID-0001' or '1'
        digits = "".join(ch for ch in s if ch.isdigit())
        return int(digits) if digits else None

    @field_validator("report_id", mode="before")
    @classmethod
    def parse_report_id(cls, v):
        if v is None:
            return None
        if isinstance(v, int):
            return v
        s = str(v).strip()
        # Handle 'LAB-0001' or '001' or '1'
        digits = "".join(ch for ch in s if ch.isdigit())
        return int(digits) if digits else None

    @field_validator("resistance_profile", mode="before")
    @classmethod
    def normalize_resistance(cls, v):
        if v is None:
            return None
        s = str(v).strip()
        if "MDR" in s.upper():
            return "MDR"
        elif "XDR" in s.upper():
            return "XDR"
        elif "SUSCEPTIBLE" in s.upper() or "SENSITIVE" in s.upper():
            return "susceptible"
        return s.lower()

    @field_validator("collected_at", "received_at", "reported_at", mode="before")
    @classmethod
    def normalize_timestamp(cls, v):
        if v is None or not str(v).strip():
            return None
        s = str(v).strip()
        # Try parsing various formats to standard ISO string YYYY-MM-DDTHH:MM:SS
        formats = [
            "%Y-%m-%dT%H:%M:%S",
            "%Y-%m-%d %H:%M:%S",
            "%Y-%m-%d %H:%M",
            "%Y-%m-%dT%H:%M",
            "%d/%m/%Y %H:%M",
            "%d-%m-%Y %H:%M",
        ]
        for fmt in formats:
            try:
                dt = datetime.strptime(s, fmt)
                return dt.strftime("%Y-%m-%dT%H:%M:%S")
            except ValueError:
                continue
        return s
