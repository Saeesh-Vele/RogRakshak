"""
RogRakshak Synthetic Lab Report Document Generator (Phase 2A).

Generates realistic clinical microbiology report PDFs from existing PostgreSQL database
lab_reports records for multimodal extraction benchmarking.
Deterministic, reproducible, and compliant with ground truth schema.
"""

import os
import sys
import json
import random
from pathlib import Path
from datetime import datetime, timedelta
from typing import Dict, Any, List

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import LabReport, Patient

from reportlab.lib.pagesizes import letter
from reportlab.lib import colors
from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
from reportlab.platypus import (
    SimpleDocTemplate,
    Paragraph,
    Spacer,
    Table,
    TableStyle,
    HRFlowable,
    KeepTogether,
)


OUTPUT_DIR = Path(__file__).resolve().parent / "lab_reports"
MANIFEST_FILE = OUTPUT_DIR / "document_manifest.json"


# Antimicrobial panels calibrated for each organism and resistance profile
AST_PANELS = {
    ("Klebsiella pneumoniae", "MDR"): [
        {"antibiotic": "Ampicillin", "mic": "> 32 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Amoxicillin / Clavulanate", "mic": "> 32/16 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Piperacillin / Tazobactam", "mic": "> 128/4 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Ceftriaxone", "mic": "> 64 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Ceftazidime", "mic": "> 64 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Cefepime", "mic": "> 32 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Meropenem", "mic": "> 16 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Imipenem", "mic": "> 16 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Ertapenem", "mic": "> 8 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Ciprofloxacin", "mic": "> 4 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Levofloxacin", "mic": "> 8 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Gentamicin", "mic": "> 16 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Amikacin", "mic": "32 ug/mL", "result": "Intermediate (I)", "interp": "I"},
        {"antibiotic": "Trimethoprim / Sulfamethoxazole", "mic": "> 4/76 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Colistin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Tigecycline", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Escherichia coli", "susceptible"): [
        {"antibiotic": "Ampicillin", "mic": "<= 2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Amoxicillin / Clavulanate", "mic": "<= 4/2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Ceftriaxone", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Cefepime", "mic": "<= 1 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Meropenem", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Ciprofloxacin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Gentamicin", "mic": "<= 1 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Nitrofurantoin", "mic": "<= 16 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Trimethoprim / Sulfamethoxazole", "mic": "<= 1/19 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Staphylococcus aureus", "susceptible"): [
        {"antibiotic": "Penicillin G", "mic": ">= 0.25 ug/mL", "result": "Resistant (R)", "interp": "R"},
        {"antibiotic": "Oxacillin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Cefoxitin Screen", "mic": "Negative", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Vancomycin", "mic": "1.0 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Daptomycin", "mic": "0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Linezolid", "mic": "1.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Clindamycin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Erythromycin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Levofloxacin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Pseudomonas aeruginosa", "susceptible"): [
        {"antibiotic": "Piperacillin / Tazobactam", "mic": "<= 8/4 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Ceftazidime", "mic": "<= 2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Cefepime", "mic": "<= 2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Meropenem", "mic": "<= 1 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Imipenem", "mic": "<= 1 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Ciprofloxacin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Levofloxacin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Amikacin", "mic": "<= 4 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Tobramycin", "mic": "<= 1 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Enterococcus faecalis", "susceptible"): [
        {"antibiotic": "Ampicillin", "mic": "<= 2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Penicillin G", "mic": "<= 4 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Vancomycin", "mic": "2.0 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Linezolid", "mic": "2.0 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Daptomycin", "mic": "2.0 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "High-Level Gentamicin Screen", "mic": "Synergistic", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Nitrofurantoin", "mic": "<= 16 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Streptococcus pneumoniae", "susceptible"): [
        {"antibiotic": "Penicillin (Non-meningitis)", "mic": "<= 0.06 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Ceftriaxone (Non-meningitis)", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Levofloxacin", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Vancomycin", "mic": "0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Erythromycin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Moxifloxacin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
    ("Candida albicans", "susceptible"): [
        {"antibiotic": "Fluconazole", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Voriconazole", "mic": "<= 0.06 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Posaconazole", "mic": "<= 0.06 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Caspofungin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Micafungin", "mic": "<= 0.06 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        {"antibiotic": "Amphotericin B", "mic": "0.50 ug/mL", "result": "Susceptible (S)", "interp": "S"},
    ],
}

# Theme palettes for realistic visual variation
THEMES = [
    {
        "name": "navy",
        "primary": colors.HexColor("#1A365D"),
        "secondary": colors.HexColor("#2B6CB0"),
        "accent_bg": colors.HexColor("#EDF2F7"),
        "border": colors.HexColor("#CBD5E1"),
        "alert_bg": colors.HexColor("#FFF5F5"),
        "alert_border": colors.HexColor("#FEB2B2"),
        "alert_text": colors.HexColor("#9B2C2C"),
    },
    {
        "name": "teal",
        "primary": colors.HexColor("#0F4C5C"),
        "secondary": colors.HexColor("#2C7A7B"),
        "accent_bg": colors.HexColor("#E6FFFA"),
        "border": colors.HexColor("#B2F5EA"),
        "alert_bg": colors.HexColor("#FFF5F5"),
        "alert_border": colors.HexColor("#FEB2B2"),
        "alert_text": colors.HexColor("#9B2C2C"),
    },
    {
        "name": "slate",
        "primary": colors.HexColor("#1E293B"),
        "secondary": colors.HexColor("#475569"),
        "accent_bg": colors.HexColor("#F8FAFC"),
        "border": colors.HexColor("#E2E8F0"),
        "alert_bg": colors.HexColor("#FEF2F2"),
        "alert_border": colors.HexColor("#FECACA"),
        "alert_text": colors.HexColor("#991B1B"),
    },
    {
        "name": "indigo",
        "primary": colors.HexColor("#2E1065"),
        "secondary": colors.HexColor("#4F46E5"),
        "accent_bg": colors.HexColor("#EEF2FF"),
        "border": colors.HexColor("#C7D2FE"),
        "alert_bg": colors.HexColor("#FFF1F2"),
        "alert_border": colors.HexColor("#FECDD3"),
        "alert_text": colors.HexColor("#9F1239"),
    },
]


def generate_single_report_pdf(
    report: LabReport,
    patient: Patient,
    output_filepath: Path,
) -> None:
    """Generate a single realistic microbiology lab report PDF."""
    # Deterministic theme selection based on report ID
    theme = THEMES[report.id % len(THEMES)]

    doc = SimpleDocTemplate(
        str(output_filepath),
        pagesize=letter,
        leftMargin=36,
        rightMargin=36,
        topMargin=36,
        bottomMargin=36,
    )

    styles = getSampleStyleSheet()

    # Custom styles
    header_title_style = ParagraphStyle(
        "HeaderTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=15,
        leading=18,
        textColor=theme["primary"],
        alignment=1,  # Centered
    )
    header_sub_style = ParagraphStyle(
        "HeaderSub",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8.5,
        leading=11,
        textColor=colors.HexColor("#4A5568"),
        alignment=1,
    )
    doc_title_style = ParagraphStyle(
        "DocTitle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=11,
        leading=14,
        textColor=theme["secondary"],
        alignment=1,
    )
    section_heading_style = ParagraphStyle(
        "SectionHeading",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=9.5,
        leading=12,
        textColor=theme["primary"],
    )
    body_bold = ParagraphStyle(
        "BodyBold",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#1A202C"),
    )
    body_text = ParagraphStyle(
        "BodyText",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=8,
        leading=10,
        textColor=colors.HexColor("#2D3748"),
    )
    table_header_style = ParagraphStyle(
        "TableHeader",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=10,
        textColor=colors.white,
        alignment=0,
    )
    ast_res_style = ParagraphStyle(
        "AstRes",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#9B2C2C") if report.resistance_profile in ("MDR", "XDR") else colors.HexColor("#2D3748"),
    )
    ast_norm_style = ParagraphStyle(
        "AstNorm",
        parent=styles["Normal"],
        fontName="Helvetica",
        fontSize=7.5,
        leading=9,
        textColor=colors.HexColor("#2D3748"),
    )
    alert_style = ParagraphStyle(
        "AlertStyle",
        parent=styles["Normal"],
        fontName="Helvetica-Bold",
        fontSize=8,
        leading=11,
        textColor=theme["alert_text"],
    )
    disclaimer_style = ParagraphStyle(
        "Disclaimer",
        parent=styles["Normal"],
        fontName="Helvetica-Oblique",
        fontSize=6.5,
        leading=8.5,
        textColor=colors.HexColor("#718096"),
        alignment=1,
    )

    story = []

    # 1. Hospital Header
    story.append(Paragraph("ROGRAKSHAK SYNTHETIC MEDICAL CENTER", header_title_style))
    story.append(Paragraph("DEPARTMENT OF PATHOLOGY & CLINICAL MICROBIOLOGY", header_sub_style))
    story.append(Paragraph("Diagnostic Services Wing, Central Tower | Tel: +91 (22) 555-0199 | NABL & CAP Accredited Laboratory", header_sub_style))
    story.append(Spacer(1, 4))
    story.append(HRFlowable(width="100%", thickness=1.5, color=theme["primary"], spaceBefore=2, spaceAfter=4))
    story.append(Paragraph("LABORATORY MICROBIOLOGY & ANTIMICROBIAL SUSCEPTIBILITY REPORT", doc_title_style))
    story.append(Spacer(1, 6))

    # Calculate deterministic timestamps
    received_time = report.collected_at + timedelta(minutes=45)
    coll_str = report.collected_at.strftime("%Y-%m-%d %H:%M")
    recv_str = received_time.strftime("%Y-%m-%d %H:%M")
    rep_str = report.reported_at.strftime("%Y-%m-%d %H:%M")

    # Patient / Sample metadata table
    # Deterministic age & gender
    age = 35 + ((patient.id * 7) % 45)
    gender = "Male" if (patient.id % 2 == 1) else "Female"
    accession_no = f"ACC-2026-{report.id:05d}"
    order_id = f"ORD-MIC-{report.id + 1000}"

    patient_info_data = [
        [
            Paragraph("<b>Patient Name:</b>", body_bold),
            Paragraph(patient.name, body_text),
            Paragraph("<b>Specimen ID:</b>", body_bold),
            Paragraph(accession_no, body_text),
        ],
        [
            Paragraph("<b>MRN:</b>", body_bold),
            Paragraph(patient.mrn, body_text),
            Paragraph("<b>Order ID:</b>", body_bold),
            Paragraph(order_id, body_text),
        ],
        [
            Paragraph("<b>Patient ID:</b>", body_bold),
            Paragraph(f"PAT-{patient.id:04d}", body_text),
            Paragraph("<b>Specimen Type:</b>", body_bold),
            Paragraph(f"<b>{report.specimen_type}</b>", body_text),
        ],
        [
            Paragraph("<b>Age / Sex:</b>", body_bold),
            Paragraph(f"{age} Y / {gender}", body_text),
            Paragraph("<b>Collected Date/Time:</b>", body_bold),
            Paragraph(coll_str, body_text),
        ],
        [
            Paragraph("<b>Admitting Diagnosis:</b>", body_bold),
            Paragraph(patient.admitting_diagnosis or "General Medical Care", body_text),
            Paragraph("<b>Received Date/Time:</b>", body_bold),
            Paragraph(recv_str, body_text),
        ],
        [
            Paragraph("<b>Report Status:</b>", body_bold),
            Paragraph(f"<font color='{theme['primary'].hexval()}'><b>{report.status.upper()}</b></font>", body_text),
            Paragraph("<b>Reported Date/Time:</b>", body_bold),
            Paragraph(f"<b>{rep_str}</b>", body_text),
        ],
    ]

    patient_table = Table(patient_info_data, colWidths=[105, 165, 115, 155])
    patient_table.setStyle(
        TableStyle([
            ("BACKGROUND", (0, 0), (-1, -1), theme["accent_bg"]),
            ("BOX", (0, 0), (-1, -1), 0.75, theme["border"]),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, theme["border"]),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(patient_table)
    story.append(Spacer(1, 8))

    # 2. Microbiology Findings Section
    story.append(Paragraph("I. PRIMARY SPECIMEN EXAMINATION & CULTURE FINDINGS", section_heading_style))
    story.append(Spacer(1, 3))

    # Gram stain / smear details
    if "Klebsiella" in report.organism or "Escherichia" in report.organism or "Pseudomonas" in report.organism:
        smear_finding = "Gram-negative bacilli observed (moderate to heavy). Polymorphonuclear leukocytes seen."
    elif "Staphylococcus" in report.organism:
        smear_finding = "Gram-positive cocci in clusters observed (moderate to heavy)."
    elif "Enterococcus" in report.organism or "Streptococcus" in report.organism:
        smear_finding = "Gram-positive cocci in pairs and short chains observed."
    elif "Candida" in report.organism:
        smear_finding = "Budding yeast cells and pseudohyphae observed. Few pus cells."
    else:
        smear_finding = "Microorganisms observed on direct microscopy."

    culture_growth = f"Significant Pure Growth: > 10^5 CFU/mL isolated on selective and non-selective media."

    micro_data = [
        [
            Paragraph("<b>Direct Smear / Microscopy:</b>", body_bold),
            Paragraph(smear_finding, body_text),
        ],
        [
            Paragraph("<b>Culture Growth Result:</b>", body_bold),
            Paragraph(culture_growth, body_text),
        ],
        [
            Paragraph("<b>Isolated Organism:</b>", body_bold),
            Paragraph(f"<font color='{theme['primary'].hexval()}' size='9'><b><i>{report.organism}</i></b></font>", body_text),
        ],
        [
            Paragraph("<b>Resistance Classification:</b>", body_bold),
            Paragraph(f"<b>{report.resistance_profile.upper()}</b>", body_text),
        ],
        [
            Paragraph("<b>Identification Methodology:</b>", body_bold),
            Paragraph("Automated Microbial Identification (VITEK 2 GN/GP & MALDI-TOF Mass Spectrometry)", body_text),
        ],
    ]

    micro_table = Table(micro_data, colWidths=[160, 380])
    micro_table.setStyle(
        TableStyle([
            ("BOX", (0, 0), (-1, -1), 0.75, theme["border"]),
            ("INNERGRID", (0, 0), (-1, -1), 0.5, theme["border"]),
            ("BACKGROUND", (0, 0), (0, -1), theme["accent_bg"]),
            ("TOPPADDING", (0, 0), (-1, -1), 2.5),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 2.5),
            ("LEFTPADDING", (0, 0), (-1, -1), 5),
            ("RIGHTPADDING", (0, 0), (-1, -1), 5),
        ])
    )
    story.append(micro_table)
    story.append(Spacer(1, 8))

    # 3. Antimicrobial Susceptibility Testing (AST) Panel
    story.append(Paragraph("II. ANTIMICROBIAL SUSCEPTIBILITY TESTING (AST) — CLSI M100 CRITERIA", section_heading_style))
    story.append(Spacer(1, 3))

    ast_key = (report.organism, report.resistance_profile)
    ast_items = AST_PANELS.get(ast_key)
    if not ast_items:
        # Fallback default panel
        ast_items = [
            {"antibiotic": "Ampicillin", "mic": "<= 2 ug/mL", "result": "Susceptible (S)", "interp": "S"},
            {"antibiotic": "Ceftriaxone", "mic": "<= 0.5 ug/mL", "result": "Susceptible (S)", "interp": "S"},
            {"antibiotic": "Meropenem", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
            {"antibiotic": "Ciprofloxacin", "mic": "<= 0.25 ug/mL", "result": "Susceptible (S)", "interp": "S"},
        ]

    ast_table_data = [
        [
            Paragraph("<b>Antimicrobial Agent</b>", table_header_style),
            Paragraph("<b>MIC / Value</b>", table_header_style),
            Paragraph("<b>Interpretation</b>", table_header_style),
            Paragraph("<b>CLSI Category</b>", table_header_style),
        ]
    ]

    for item in ast_items:
        is_resistant = "Resistant" in item["result"] or item["interp"] == "R"
        text_style = ast_res_style if is_resistant else ast_norm_style
        
        # Color highlighting for resistant antibiotics
        if is_resistant:
            interp_cell = Paragraph(f"<font color='#9B2C2C'><b>{item['result']}</b></font>", text_style)
            cat_cell = Paragraph(f"<font color='#9B2C2C'><b>{item['interp']}</b></font>", text_style)
        elif item["interp"] == "I":
            interp_cell = Paragraph(f"<font color='#C05621'><b>{item['result']}</b></font>", text_style)
            cat_cell = Paragraph(f"<font color='#C05621'><b>{item['interp']}</b></font>", text_style)
        else:
            interp_cell = Paragraph(f"<font color='#22543D'><b>{item['result']}</b></font>", text_style)
            cat_cell = Paragraph(f"<font color='#22543D'><b>{item['interp']}</b></font>", text_style)

        ast_table_data.append([
            Paragraph(item["antibiotic"], text_style),
            Paragraph(item["mic"], text_style),
            interp_cell,
            cat_cell,
        ])

    ast_table = Table(ast_table_data, colWidths=[200, 110, 140, 90])
    tstyle_cmds = [
        ("BACKGROUND", (0, 0), (-1, 0), theme["primary"]),
        ("BOX", (0, 0), (-1, -1), 0.75, theme["border"]),
        ("INNERGRID", (0, 0), (-1, -1), 0.5, theme["border"]),
        ("TOPPADDING", (0, 0), (-1, -1), 2),
        ("BOTTOMPADDING", (0, 0), (-1, -1), 2),
        ("LEFTPADDING", (0, 0), (-1, -1), 5),
        ("RIGHTPADDING", (0, 0), (-1, -1), 5),
    ]

    # Alternating row colors for AST table
    for row_idx in range(1, len(ast_table_data)):
        if row_idx % 2 == 0:
            tstyle_cmds.append(("BACKGROUND", (0, row_idx), (-1, row_idx), theme["accent_bg"]))

    ast_table.setStyle(TableStyle(tstyle_cmds))
    story.append(ast_table)
    story.append(Spacer(1, 6))

    # 4. Clinical Interpretation & Infection Control Alert
    story.append(Paragraph("III. INTERPRETATION & CLINICAL REMARKS", section_heading_style))
    story.append(Spacer(1, 2))

    if report.resistance_profile in ("MDR", "XDR"):
        alert_content = [
            [
                Paragraph(
                    f"<b>*** INFECTION CONTROL ALERT: MULTIDRUG-RESISTANT ORGANISM DETECTED ***</b><br/>"
                    f"Isolated organism <b>{report.organism}</b> demonstrates resistance to multiple antimicrobial classes "
                    f"including extended-spectrum beta-lactams, carbapenems, fluoroquinolones, and aminoglycosides.<br/>"
                    f"<b>Recommendation:</b> Place patient under STRICT CONTACT PRECAUTIONS. Notify Hospital Infection Control Committee (HICC). "
                    f"Antimicrobial stewardship consultation advised.",
                    alert_style,
                )
            ]
        ]
        alert_table = Table(alert_content, colWidths=[540])
        alert_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), theme["alert_bg"]),
                ("BOX", (0, 0), (-1, -1), 1.0, theme["alert_border"]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 8),
                ("RIGHTPADDING", (0, 0), (-1, -1), 8),
            ])
        )
        story.append(alert_table)
    else:
        remarks_content = [
            [
                Paragraph(
                    f"<b>Interpretation:</b> Isolated strain of <b>{report.organism}</b> exhibits standard wild-type susceptible "
                    f"antimicrobial profile. No high-level or extended-spectrum acquired resistance detected. "
                    f"Therapy should be directed based on documented clinical susceptibility and site of infection.",
                    body_text,
                )
            ]
        ]
        remarks_table = Table(remarks_content, colWidths=[540])
        remarks_table.setStyle(
            TableStyle([
                ("BACKGROUND", (0, 0), (-1, -1), theme["accent_bg"]),
                ("BOX", (0, 0), (-1, -1), 0.75, theme["border"]),
                ("TOPPADDING", (0, 0), (-1, -1), 4),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 4),
                ("LEFTPADDING", (0, 0), (-1, -1), 6),
                ("RIGHTPADDING", (0, 0), (-1, -1), 6),
            ])
        )
        story.append(remarks_table)

    story.append(Spacer(1, 6))

    # 5. Laboratory Authorization & Signatures
    story.append(
        KeepTogether([
            Paragraph("IV. LABORATORY AUTHORIZATION & AUTHENTICATION", section_heading_style),
            Spacer(1, 2),
            Table(
                [
                    [
                        Paragraph(f"<b>Laboratory Report ID:</b> LAB-{report.id:04d}", body_text),
                        Paragraph("<b>Testing Lab:</b> Division of Clinical Microbiology", body_text),
                        Paragraph(f"<b>Status:</b> {report.status.upper()}", body_text),
                    ],
                    [
                        Paragraph("<b>Medical Technologist:</b><br/>S. Nambiar, MSc (Med Micro)<br/>Reg #MLT-2021-884", body_text),
                        Paragraph("<b>Reviewing Pathologist:</b><br/>Dr. Arvind Deshmukh, MD (Path)<br/>Reg #MMC-2012-0498", body_text),
                        Paragraph(f"<b>Consultant Microbiologist:</b><br/>Dr. Ramesh Kulkarni, MD, DNB<br/>Verified: {rep_str}", body_text),
                    ],
                ],
                colWidths=[180, 180, 180],
                style=[
                    ("BOX", (0, 0), (-1, -1), 0.75, theme["border"]),
                    ("INNERGRID", (0, 0), (-1, -1), 0.5, theme["border"]),
                    ("BACKGROUND", (0, 0), (-1, 0), theme["accent_bg"]),
                    ("TOPPADDING", (0, 0), (-1, -1), 3),
                    ("BOTTOMPADDING", (0, 0), (-1, -1), 3),
                    ("LEFTPADDING", (0, 0), (-1, -1), 5),
                    ("RIGHTPADDING", (0, 0), (-1, -1), 5),
                ],
            ),
            Spacer(1, 4),
            HRFlowable(width="100%", thickness=0.5, color=colors.HexColor("#CBD5E1"), spaceBefore=2, spaceAfter=2),
            Paragraph(
                "Confidential Medical Diagnostic Document — RogRakshak Healthcare System — Synthetic Evaluation Dataset for Outbreak Surveillance",
                disclaimer_style,
            ),
        ])
    )

    doc.build(story)


def generate_all_lab_reports() -> Dict[str, Any]:
    """
    Connects to database, reads all lab reports, generates PDFs, and creates document_manifest.json.
    """
    session = SessionLocal()
    try:
        reports = session.query(LabReport).order_by(LabReport.id).all()
        print(f"Found {len(reports)} lab report records in database.")

        OUTPUT_DIR.mkdir(parents=True, exist_ok=True)

        manifest_entries = []

        for report in reports:
            patient = session.query(Patient).filter(Patient.id == report.patient_id).first()
            if not patient:
                raise ValueError(f"Patient with id {report.patient_id} not found for lab report {report.id}")

            pdf_filename = f"lab_report_{report.id:03d}.pdf"
            pdf_path = OUTPUT_DIR / pdf_filename
            relative_doc_path = f"data/lab_reports/{pdf_filename}"

            print(f"  Generating: {relative_doc_path} (Report ID: {report.id}, Patient: {patient.name}, Organism: {report.organism}, Profile: {report.resistance_profile})")
            generate_single_report_pdf(report, patient, pdf_path)

            manifest_entry = {
                "lab_report_id": report.id,
                "patient_id": report.patient_id,
                "document_path": relative_doc_path,
                "organism": report.organism,
                "resistance_profile": report.resistance_profile,
                "specimen_type": report.specimen_type,
                "collected_at": report.collected_at.isoformat(),
                "reported_at": report.reported_at.isoformat(),
            }
            manifest_entries.append(manifest_entry)

        # Write manifest file deterministically
        with open(MANIFEST_FILE, "w", encoding="utf-8") as f:
            json.dump(manifest_entries, f, indent=2)

        print(f"Manifest written to: {MANIFEST_FILE} ({len(manifest_entries)} entries)")
        return {
            "total_reports": len(reports),
            "manifest_entries": len(manifest_entries),
            "output_dir": str(OUTPUT_DIR),
        }
    finally:
        session.close()


if __name__ == "__main__":
    generate_all_lab_reports()
