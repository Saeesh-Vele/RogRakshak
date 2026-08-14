"""
Gemini Multimodal Laboratory Report Extraction Service (Phase 2B).

Reads synthetic hospital microbiology PDF reports and performs structured extraction
using Google Gemini multimodal vision, validated against Pydantic schema.
"""

import os
import json
import logging
from pathlib import Path
from typing import Optional, Union, Dict, Any
from dotenv import load_dotenv

import google.generativeai as genai

# Ensure backend package imports work
from app.schemas.lab_report import LabReportExtraction

logger = logging.getLogger("rograkshak.extraction")

# Load environment
_backend_env = Path(__file__).resolve().parent.parent.parent / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"

if _backend_env.exists():
    load_dotenv(_backend_env)
elif _root_env.exists():
    load_dotenv(_root_env)
else:
    load_dotenv()


EXTRACTION_PROMPT = """You are extracting structured information from a synthetic hospital microbiology laboratory report.

Extract ONLY information visible in the supplied document.
Do not infer missing information.
Do not use external knowledge to fill missing fields.
Do not modify names, identifiers, timestamps, organism names, or resistance classifications.
If a field is not visible, return null.

Return only a valid JSON object with the following structure:
{
  "report_id": <numerical ID, e.g. 1 from LAB-0001 or 1>,
  "patient_name": "<full patient name>",
  "patient_id": <numerical ID, e.g. 1 from PAT-0001 or 1>,
  "mrn": "<MRN string, e.g. MRN-2026-1001>",
  "specimen_type": "<specimen type, e.g. Endotracheal Aspirate, Sputum, Blood Culture, Wound Swab, Urine>",
  "collected_at": "<ISO-8601 timestamp YYYY-MM-DDTHH:MM:SS or null>",
  "received_at": "<ISO-8601 timestamp YYYY-MM-DDTHH:MM:SS or null>",
  "reported_at": "<ISO-8601 timestamp YYYY-MM-DDTHH:MM:SS or null>",
  "organism": "<isolated organism name, e.g. Klebsiella pneumoniae>",
  "resistance_profile": "<resistance classification: MDR, XDR, or susceptible>",
  "culture_result": "<culture result string>",
  "antimicrobial_susceptibility": [
    {
      "antibiotic": "<antimicrobial agent name>",
      "mic": "<MIC value e.g. '> 32 ug/mL'>",
      "result": "<Susceptible (S) / Resistant (R) / Intermediate (I)>",
      "interp": "<S / I / R>"
    }
  ],
  "interpretation": "<clinical remarks or infection control alert notes>",
  "status": "<report status, e.g. final>"
}
"""


class LabReportExtractionService:
    def __init__(self, model_name: Optional[str] = None):
        api_key = os.getenv("GOOGLE_API_KEY")
        if not api_key or api_key.strip() == "" or api_key == "your_gemini_api_key_here":
            raise ValueError(
                "GOOGLE_API_KEY environment variable is not configured. "
                "Please set a valid GOOGLE_API_KEY in backend/.env"
            )

        genai.configure(api_key=api_key)
        self.model_name = model_name or os.getenv("GEMINI_MODEL", "gemini-flash-latest")
        self.model = genai.GenerativeModel(
            model_name=self.model_name,
            generation_config={
                "response_mime_type": "application/json",
                "temperature": 0.0,
            },
        )

    def extract_from_pdf(self, pdf_path: Union[str, Path]) -> LabReportExtraction:
        """
        Extracts structured data from a PDF laboratory report using Gemini multimodal.
        """
        pdf_path = Path(pdf_path)
        if not pdf_path.exists():
            raise FileNotFoundError(f"PDF report not found: {pdf_path}")

        # Read PDF binary content
        with open(pdf_path, "rb") as f:
            pdf_bytes = f.read()

        contents = [
            {
                "mime_type": "application/pdf",
                "data": pdf_bytes,
            },
            EXTRACTION_PROMPT,
        ]

        response = self.model.generate_content(contents)
        raw_text = response.text.strip()

        # Parse JSON
        try:
            data = json.loads(raw_text)
        except json.JSONDecodeError as e:
            # Fallback if markdown code fences were included
            clean_text = raw_text
            if clean_text.startswith("```json"):
                clean_text = clean_text[7:]
            elif clean_text.startswith("```"):
                clean_text = clean_text[3:]
            if clean_text.endswith("```"):
                clean_text = clean_text[:-3]
            data = json.loads(clean_text.strip())

        # Validate with Pydantic
        extraction = LabReportExtraction.model_validate(data)
        return extraction


def extract_lab_report(
    pdf_path: Union[str, Path],
    model_name: Optional[str] = None
) -> LabReportExtraction:
    """Convenience functional wrapper for single report extraction."""
    service = LabReportExtractionService(model_name=model_name)
    return service.extract_from_pdf(pdf_path)
