"""
RogRakshak Synthetic Dataset Generator.

Generates realistic hospital simulation data for PostgreSQL/Supabase:
- 6 Wards & 30 Beds (including ICU)
- 25 Healthcare Staff (Nurses, Doctors, Technicians)
- 40 Patients with realistic admission/discharge and movement timelines
- Routine procedures and ~15 lab reports
- 1 Planted Outbreak Cluster:
  - Index Patient in ICU with Carbapenem-resistant Klebsiella pneumoniae (MDR)
  - Vector Nurse overlapping Index Patient in ICU, then rotating to General Medicine A
  - 3 Downstream Patients overlapping Vector Nurse in General Medicine A who test positive
  - Realistic temporal noise (same-ward without time overlap, non-outbreak roving staff)
- Writes ground-truth transmission details to data/ground_truth.json
"""

import argparse
import json
import random
import sys
from datetime import datetime, timedelta
from pathlib import Path

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from sqlalchemy import text
from app.database import engine, SessionLocal
from app.models import (
    Base,
    Patient,
    Staff,
    Ward,
    Bed,
    Movement,
    Procedure,
    procedure_staff,
    LabReport,
)

# Deterministic seed for reproducible synthetic data
RANDOM_SEED = 42
random.seed(RANDOM_SEED)

BASE_DATE = datetime(2026, 8, 1, 8, 0, 0)


def reset_database():
    """Drop and recreate all application tables using SQLAlchemy metadata."""
    print("Resetting database schema (dropping and recreating tables)...")
    Base.metadata.drop_all(bind=engine)
    Base.metadata.create_all(bind=engine)
    print("Database schema recreated successfully.")


def generate_dataset(session):
    print("Generating synthetic hospital dataset...")

    # -------------------------------------------------------------
    # 1. Wards & Beds
    # -------------------------------------------------------------
    wards_data = [
        {"name": "Intensive Care Unit (ICU)", "department": "Critical Care"},
        {"name": "General Medicine A", "department": "Internal Medicine"},
        {"name": "General Medicine B", "department": "Internal Medicine"},
        {"name": "Surgical Ward", "department": "Surgery"},
        {"name": "Pediatric Ward", "department": "Pediatrics"},
        {"name": "Cardiology Ward", "department": "Cardiology"},
    ]

    wards = []
    for w in wards_data:
        ward_obj = Ward(name=w["name"], department=w["department"])
        session.add(ward_obj)
        wards.append(ward_obj)
    session.flush()

    icu_ward = wards[0]
    gen_med_a = wards[1]
    gen_med_b = wards[2]
    surg_ward = wards[3]
    ped_ward = wards[4]
    cardio_ward = wards[5]

    # Create 5 beds per ward = 30 beds total
    beds = []
    for ward in wards:
        prefix = ward.name[:3].upper().replace(" ", "").replace("(", "")
        for b_num in range(1, 6):
            bed_obj = Bed(ward_id=ward.id, bed_number=f"{prefix}-BED-{b_num:02d}")
            session.add(bed_obj)
            beds.append(bed_obj)
    session.flush()

    # Map beds by ward
    ward_beds = {}
    for b in beds:
        ward_beds.setdefault(b.ward_id, []).append(b)

    # -------------------------------------------------------------
    # 2. Staff (25 Staff Members)
    # -------------------------------------------------------------
    first_names = ["Aarav", "Priya", "Rajesh", "Sunita", "Vikram", "Ananya", "Rohan", "Meera",
                   "Amit", "Pooja", "Deepak", "Sneha", "Karan", "Divya", "Sanjay", "Neha",
                   "Manoj", "Kavita", "Arjun", "Ritu", "Rahul", "Shweta", "Alok", "Nisha", "Gaurav"]
    last_names = ["Sharma", "Patel", "Verma", "Rao", "Nair", "Gupta", "Deshmukh", "Singh",
                  "Iyer", "Kulkarni", "Chopra", "Mehta", "Reddy", "Joshi", "Bose"]

    staff_members = []
    # Dedicated vector staff: Nurse Anita Sharma
    vector_nurse = Staff(name="Nurse Anita Sharma", role="nurse", department="Critical Care")
    session.add(vector_nurse)
    staff_members.append(vector_nurse)

    roles = ["nurse"] * 14 + ["doctor"] * 7 + ["technician"] * 3
    departments = ["Critical Care", "Internal Medicine", "Internal Medicine", "Surgery", "Pediatrics", "Cardiology"]

    for i in range(1, 25):
        name = f"{first_names[i % len(first_names)]} {last_names[(i * 3) % len(last_names)]}"
        role = roles[i - 1]
        dept = departments[i % len(departments)]
        s_obj = Staff(name=f"{role.capitalize()} {name}", role=role, department=dept)
        session.add(s_obj)
        staff_members.append(s_obj)
    session.flush()

    # -------------------------------------------------------------
    # 3. Patients (40 Patients)
    # -------------------------------------------------------------
    diagnoses = [
        "Community-Acquired Pneumonia", "Acute Coronary Syndrome", "Post-op Laparoscopic Cholecystectomy",
        "COPD Exacerbation", "Acute Appendicitis", "Diabetic Ketoacidosis", "Decompensated Heart Failure",
        "Cellulitis", "Pyelonephritis", "Sepsis secondary to UTI", "Acute Pancreatitis"
    ]

    patients = []
    # Index Patient: Rajesh Verma (Planted Outbreak Index)
    index_patient = Patient(
        name="Rajesh Verma (Index)",
        mrn="MRN-2026-1001",
        admission_date=BASE_DATE + timedelta(days=1, hours=6),
        discharge_date=BASE_DATE + timedelta(days=10, hours=14),
        admitting_diagnosis="Severe Sepsis & Respiratory Failure",
    )
    session.add(index_patient)
    patients.append(index_patient)

    # Downstream Patients in General Medicine A (Planted Victims)
    downstream_1 = Patient(
        name="Suresh Joshi (Downstream 1)",
        mrn="MRN-2026-1002",
        admission_date=BASE_DATE + timedelta(days=3, hours=10),
        discharge_date=BASE_DATE + timedelta(days=12, hours=12),
        admitting_diagnosis="COPD Exacerbation",
    )
    downstream_2 = Patient(
        name="Meenakshi Rao (Downstream 2)",
        mrn="MRN-2026-1003",
        admission_date=BASE_DATE + timedelta(days=3, hours=16),
        discharge_date=BASE_DATE + timedelta(days=13, hours=10),
        admitting_diagnosis="Decompensated Heart Failure",
    )
    downstream_3 = Patient(
        name="Tarun Agarwal (Downstream 3)",
        mrn="MRN-2026-1004",
        admission_date=BASE_DATE + timedelta(days=4, hours=8),
        discharge_date=BASE_DATE + timedelta(days=14, hours=11),
        admitting_diagnosis="Post-op Inguinal Hernia Repair",
    )
    session.add_all([downstream_1, downstream_2, downstream_3])
    patients.extend([downstream_1, downstream_2, downstream_3])

    # 36 other synthetic patients
    for i in range(5, 41):
        p_name = f"{first_names[(i * 7) % len(first_names)]} {last_names[(i * 5) % len(last_names)]}"
        adm_day = random.randint(0, 8)
        adm_hour = random.randint(6, 20)
        stay_days = random.randint(3, 7)
        adm_dt = BASE_DATE + timedelta(days=adm_day, hours=adm_hour)
        dis_dt = adm_dt + timedelta(days=stay_days, hours=random.randint(2, 6))

        diag = diagnoses[i % len(diagnoses)]
        p_obj = Patient(
            name=p_name,
            mrn=f"MRN-2026-{1000 + i}",
            admission_date=adm_dt,
            discharge_date=dis_dt,
            admitting_diagnosis=diag,
        )
        session.add(p_obj)
        patients.append(p_obj)
    session.flush()

    # -------------------------------------------------------------
    # 4. Movements (Patient Bed/Ward Stays + Staff Shifts)
    # -------------------------------------------------------------
    movements = []

    # --- Planted Outbreak Movements ---
    # A. Index Patient in ICU Bed 1 (Day 1 06:00 to Day 6 12:00)
    icu_bed_1 = ward_beds[icu_ward.id][0]
    m_idx_bed = Movement(
        patient_id=index_patient.id,
        staff_id=None,
        location_type="bed",
        location_id=icu_bed_1.id,
        entry_time=BASE_DATE + timedelta(days=1, hours=6),
        exit_time=BASE_DATE + timedelta(days=6, hours=12),
    )
    m_idx_ward = Movement(
        patient_id=index_patient.id,
        staff_id=None,
        location_type="ward",
        location_id=icu_ward.id,
        entry_time=BASE_DATE + timedelta(days=1, hours=6),
        exit_time=BASE_DATE + timedelta(days=6, hours=12),
    )
    # Index transfers to Surgical Ward bed later
    surg_bed_1 = ward_beds[surg_ward.id][0]
    m_idx_stepdown = Movement(
        patient_id=index_patient.id,
        staff_id=None,
        location_type="bed",
        location_id=surg_bed_1.id,
        entry_time=BASE_DATE + timedelta(days=6, hours=12),
        exit_time=index_patient.discharge_date,
    )
    movements.extend([m_idx_bed, m_idx_ward, m_idx_stepdown])

    # B. Vector Nurse Shifts:
    # Shift 1: ICU on Day 2 (08:00 - 20:00) -> OVERLAPS Index Patient in ICU
    m_nurse_icu = Movement(
        patient_id=None,
        staff_id=vector_nurse.id,
        location_type="ward",
        location_id=icu_ward.id,
        entry_time=BASE_DATE + timedelta(days=2, hours=8),
        exit_time=BASE_DATE + timedelta(days=2, hours=20),
    )
    # Shift 2: Rotates to General Medicine A on Day 4 (08:00 - 20:00) -> OVERLAPS Downstream 1, 2, 3
    m_nurse_med_a_1 = Movement(
        patient_id=None,
        staff_id=vector_nurse.id,
        location_type="ward",
        location_id=gen_med_a.id,
        entry_time=BASE_DATE + timedelta(days=4, hours=8),
        exit_time=BASE_DATE + timedelta(days=4, hours=20),
    )
    # Shift 3: General Medicine A on Day 5 (08:00 - 20:00) -> FURTHER OVERLAPS Downstream 1, 2, 3
    m_nurse_med_a_2 = Movement(
        patient_id=None,
        staff_id=vector_nurse.id,
        location_type="ward",
        location_id=gen_med_a.id,
        entry_time=BASE_DATE + timedelta(days=5, hours=8),
        exit_time=BASE_DATE + timedelta(days=5, hours=20),
    )
    movements.extend([m_nurse_icu, m_nurse_med_a_1, m_nurse_med_a_2])

    # C. Downstream Patients in General Medicine A
    med_a_beds = ward_beds[gen_med_a.id]
    downstream_list = [downstream_1, downstream_2, downstream_3]
    for idx, p in enumerate(downstream_list):
        p_bed = med_a_beds[idx % len(med_a_beds)]
        m_p_bed = Movement(
            patient_id=p.id,
            staff_id=None,
            location_type="bed",
            location_id=p_bed.id,
            entry_time=p.admission_date,
            exit_time=p.discharge_date,
        )
        m_p_ward = Movement(
            patient_id=p.id,
            staff_id=None,
            location_type="ward",
            location_id=gen_med_a.id,
            entry_time=p.admission_date,
            exit_time=p.discharge_date,
        )
        movements.extend([m_p_bed, m_p_ward])

    # D. Other Patients Movements across Wards (with natural overlap and noise)
    other_wards = [gen_med_b, surg_ward, ped_ward, cardio_ward]
    for p in patients[4:]:
        assigned_ward = other_wards[p.id % len(other_wards)]
        assigned_bed = ward_beds[assigned_ward.id][p.id % len(ward_beds[assigned_ward.id])]
        
        m_bed = Movement(
            patient_id=p.id,
            staff_id=None,
            location_type="bed",
            location_id=assigned_bed.id,
            entry_time=p.admission_date,
            exit_time=p.discharge_date,
        )
        m_ward = Movement(
            patient_id=p.id,
            staff_id=None,
            location_type="ward",
            location_id=assigned_ward.id,
            entry_time=p.admission_date,
            exit_time=p.discharge_date,
        )
        movements.extend([m_bed, m_ward])

    # E. Other Staff Shifts across the 14 days
    for s in staff_members[1:]:
        s_ward = wards[s.id % len(wards)]
        # Generate 6 shifts per staff across the 14-day window
        for day in range(1, 14, 2):
            shift_start = BASE_DATE + timedelta(days=day, hours=random.choice([7, 8, 19, 20]))
            shift_end = shift_start + timedelta(hours=random.choice([8, 12]))
            m_shift = Movement(
                patient_id=None,
                staff_id=s.id,
                location_type="ward",
                location_id=s_ward.id,
                entry_time=shift_start,
                exit_time=shift_end,
            )
            movements.append(m_shift)

    session.add_all(movements)
    session.flush()

    # -------------------------------------------------------------
    # 5. Procedures
    # -------------------------------------------------------------
    procedures = []
    proc_types = ["Central Line Insertion", "Bronchoscopy", "Wound Debridement", "Endoscopy", "Echocardiogram"]
    # Procedures for index patient and a few others
    p_proc1 = Procedure(
        patient_id=index_patient.id,
        procedure_type="Central Line Insertion",
        location_id=icu_ward.id,
        start_time=BASE_DATE + timedelta(days=2, hours=10),
        end_time=BASE_DATE + timedelta(days=2, hours=11, minutes=30),
    )
    p_proc1.staff_members.append(vector_nurse)
    procedures.append(p_proc1)

    for i, p in enumerate(patients[1:12]):
        proc_type = proc_types[i % len(proc_types)]
        proc_start = p.admission_date + timedelta(days=1, hours=2)
        proc = Procedure(
            patient_id=p.id,
            procedure_type=proc_type,
            location_id=wards[p.id % len(wards)].id,
            start_time=proc_start,
            end_time=proc_start + timedelta(hours=1),
        )
        assigned_staff = staff_members[(i * 2 + 1) % len(staff_members)]
        proc.staff_members.append(assigned_staff)
        procedures.append(proc)

    session.add_all(procedures)
    session.flush()

    # -------------------------------------------------------------
    # 6. Lab Reports (~15 Reports with Planted Outbreak Cluster)
    # -------------------------------------------------------------
    lab_reports = []

    # Outbreak Cluster positive reports:
    # Index Patient: Positive MDR Klebsiella pneumoniae collected on Day 2, reported on Day 4
    lr_index = LabReport(
        patient_id=index_patient.id,
        specimen_type="Endotracheal Aspirate",
        organism="Klebsiella pneumoniae",
        resistance_profile="MDR",
        collected_at=BASE_DATE + timedelta(days=2, hours=9),
        reported_at=BASE_DATE + timedelta(days=4, hours=11),
        raw_report_path="/reports/2026/08/lab_idx_kp_mdr.pdf",
        status="final",
    )
    lab_reports.append(lr_index)

    # Downstream Patients: Positive MDR Klebsiella pneumoniae reported a few days after nurse contact
    lr_downstream_1 = LabReport(
        patient_id=downstream_1.id,
        specimen_type="Sputum",
        organism="Klebsiella pneumoniae",
        resistance_profile="MDR",
        collected_at=BASE_DATE + timedelta(days=6, hours=10),
        reported_at=BASE_DATE + timedelta(days=8, hours=14),
        raw_report_path="/reports/2026/08/lab_ds1_kp_mdr.pdf",
        status="final",
    )
    lr_downstream_2 = LabReport(
        patient_id=downstream_2.id,
        specimen_type="Blood Culture",
        organism="Klebsiella pneumoniae",
        resistance_profile="MDR",
        collected_at=BASE_DATE + timedelta(days=7, hours=11),
        reported_at=BASE_DATE + timedelta(days=9, hours=16),
        raw_report_path="/reports/2026/08/lab_ds2_kp_mdr.pdf",
        status="final",
    )
    lr_downstream_3 = LabReport(
        patient_id=downstream_3.id,
        specimen_type="Wound Swab",
        organism="Klebsiella pneumoniae",
        resistance_profile="MDR",
        collected_at=BASE_DATE + timedelta(days=7, hours=15),
        reported_at=BASE_DATE + timedelta(days=9, hours=18),
        raw_report_path="/reports/2026/08/lab_ds3_kp_mdr.pdf",
        status="final",
    )
    lab_reports.extend([lr_downstream_1, lr_downstream_2, lr_downstream_3])

    # 12 Routine / Background Lab Reports (Susceptible / Negative organisms)
    background_organisms = [
        ("Escherichia coli", "susceptible", "Urine"),
        ("Staphylococcus aureus", "susceptible", "Wound Swab"),
        ("Pseudomonas aeruginosa", "susceptible", "Sputum"),
        ("Enterococcus faecalis", "susceptible", "Urine"),
        ("Streptococcus pneumoniae", "susceptible", "Blood Culture"),
        ("Candida albicans", "susceptible", "Urine"),
    ]

    for i, p in enumerate(patients[5:17]):
        org, res, spec = background_organisms[i % len(background_organisms)]
        coll_dt = p.admission_date + timedelta(days=1, hours=3)
        rep_dt = coll_dt + timedelta(days=2, hours=4)
        lr = LabReport(
            patient_id=p.id,
            specimen_type=spec,
            organism=org,
            resistance_profile=res,
            collected_at=coll_dt,
            reported_at=rep_dt,
            raw_report_path=f"/reports/2026/08/lab_bg_{i:02d}.pdf",
            status="final",
        )
        lab_reports.append(lr)

    session.add_all(lab_reports)
    session.commit()

    # -------------------------------------------------------------
    # 7. Write data/ground_truth.json
    # -------------------------------------------------------------
    ground_truth = {
        "cluster_name": "ICU to General Medicine A - MDR Klebsiella pneumoniae Outbreak",
        "organism": "Klebsiella pneumoniae",
        "resistance_profile": "MDR",
        "index_patient": {
            "id": index_patient.id,
            "name": index_patient.name,
            "mrn": index_patient.mrn,
            "ward": icu_ward.name,
            "positive_sample_collected_at": lr_index.collected_at.isoformat(),
            "positive_report_reported_at": lr_index.reported_at.isoformat(),
        },
        "vector_staff": {
            "id": vector_nurse.id,
            "name": vector_nurse.name,
            "role": vector_nurse.role,
            "transmission_shifts": [
                {
                    "ward": icu_ward.name,
                    "entry_time": m_nurse_icu.entry_time.isoformat(),
                    "exit_time": m_nurse_icu.exit_time.isoformat(),
                    "role_in_transmission": "Exposed to Index Patient in ICU during central line and clinical care",
                },
                {
                    "ward": gen_med_a.name,
                    "entry_time": m_nurse_med_a_1.entry_time.isoformat(),
                    "exit_time": m_nurse_med_a_1.exit_time.isoformat(),
                    "role_in_transmission": "Rotated to General Medicine A, transmitting pathogen to downstream patients",
                },
                {
                    "ward": gen_med_a.name,
                    "entry_time": m_nurse_med_a_2.entry_time.isoformat(),
                    "exit_time": m_nurse_med_a_2.exit_time.isoformat(),
                    "role_in_transmission": "Second consecutive shift in General Medicine A",
                },
            ],
        },
        "downstream_patients": [
            {
                "id": downstream_1.id,
                "name": downstream_1.name,
                "mrn": downstream_1.mrn,
                "ward": gen_med_a.name,
                "overlap_window_with_vector": {
                    "start": m_nurse_med_a_1.entry_time.isoformat(),
                    "end": m_nurse_med_a_1.exit_time.isoformat(),
                },
                "positive_sample_collected_at": lr_downstream_1.collected_at.isoformat(),
                "positive_report_reported_at": lr_downstream_1.reported_at.isoformat(),
            },
            {
                "id": downstream_2.id,
                "name": downstream_2.name,
                "mrn": downstream_2.mrn,
                "ward": gen_med_a.name,
                "overlap_window_with_vector": {
                    "start": m_nurse_med_a_1.entry_time.isoformat(),
                    "end": m_nurse_med_a_1.exit_time.isoformat(),
                },
                "positive_sample_collected_at": lr_downstream_2.collected_at.isoformat(),
                "positive_report_reported_at": lr_downstream_2.reported_at.isoformat(),
            },
            {
                "id": downstream_3.id,
                "name": downstream_3.name,
                "mrn": downstream_3.mrn,
                "ward": gen_med_a.name,
                "overlap_window_with_vector": {
                    "start": m_nurse_med_a_1.entry_time.isoformat(),
                    "end": m_nurse_med_a_1.exit_time.isoformat(),
                },
                "positive_sample_collected_at": lr_downstream_3.collected_at.isoformat(),
                "positive_report_reported_at": lr_downstream_3.reported_at.isoformat(),
            },
        ],
        "transmission_timeline": (
            "1. Day 1 (2026-08-02 06:00): Index Patient (Rajesh Verma) is admitted to ICU Bed 1 with severe sepsis.\n"
            "2. Day 2 (2026-08-03 08:00 - 20:00): Vector Nurse (Nurse Anita Sharma) works in ICU and cares for Index Patient. Sputum specimen collected shows Carbapenem-resistant Klebsiella pneumoniae (reported on Day 4).\n"
            "3. Day 4 (2026-08-05 08:00 - 20:00): Nurse Anita Sharma rotates to General Medicine A for a 12-hour shift. She attends to Suresh Joshi (Downstream 1), Meenakshi Rao (Downstream 2), and Tarun Agarwal (Downstream 3).\n"
            "4. Day 5 (2026-08-06 08:00 - 20:00): Nurse Anita Sharma works a second shift in General Medicine A with continued exposure.\n"
            "5. Days 6-7 (2026-08-07 to 2026-08-08): Downstream patients develop clinical symptoms; diagnostic cultures are collected.\n"
            "6. Days 8-9 (2026-08-09 to 2026-08-10): All three downstream patients test positive for the identical MDR Klebsiella pneumoniae strain."
        ),
    }

    ground_truth_file = Path(__file__).resolve().parent / "ground_truth.json"
    with open(ground_truth_file, "w") as f:
        json.dump(ground_truth, f, indent=2)

    print(f"Dataset generated successfully! Ground truth written to {ground_truth_file}")
    return ground_truth


def main():
    parser = argparse.ArgumentParser(description="Generate synthetic hospital dataset for RogRakshak.")
    parser.add_argument("--reset", action="store_true", help="Drop and recreate tables before seeding.")
    args = parser.parse_args()

    if args.reset:
        reset_database()

    db = SessionLocal()
    try:
        generate_dataset(db)
    finally:
        db.close()


if __name__ == "__main__":
    main()
