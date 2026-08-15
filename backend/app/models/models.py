from datetime import datetime
from typing import Optional
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Index,
    Table,
)
from sqlalchemy.orm import relationship

from app.models.base import Base

# Association table for many-to-many procedures and staff
procedure_staff = Table(
    "procedure_staff",
    Base.metadata,
    Column("procedure_id", Integer, ForeignKey("procedures.id", ondelete="CASCADE"), primary_key=True),
    Column("staff_id", Integer, ForeignKey("staff.id", ondelete="CASCADE"), primary_key=True),
)


class Patient(Base):
    __tablename__ = "patients"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    mrn = Column(String(64), unique=True, index=True, nullable=False)
    admission_date = Column(DateTime, nullable=False)
    discharge_date = Column(DateTime, nullable=True)
    admitting_diagnosis = Column(String(255), nullable=True)

    # Relationships
    movements = relationship("Movement", back_populates="patient", cascade="all, delete-orphan")
    procedures = relationship("Procedure", back_populates="patient", cascade="all, delete-orphan")
    lab_reports = relationship("LabReport", back_populates="patient", cascade="all, delete-orphan")


class Staff(Base):
    __tablename__ = "staff"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(255), nullable=False)
    role = Column(String(64), nullable=False)  # 'nurse', 'doctor', 'technician'
    department = Column(String(128), nullable=False)

    # Relationships
    movements = relationship("Movement", back_populates="staff", cascade="all, delete-orphan")
    procedures = relationship("Procedure", secondary=procedure_staff, back_populates="staff_members")


class Ward(Base):
    __tablename__ = "wards"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    name = Column(String(128), unique=True, nullable=False)
    department = Column(String(128), nullable=False)

    # Relationships
    beds = relationship("Bed", back_populates="ward", cascade="all, delete-orphan")


class Bed(Base):
    __tablename__ = "beds"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    ward_id = Column(Integer, ForeignKey("wards.id", ondelete="CASCADE"), nullable=False, index=True)
    bed_number = Column(String(64), nullable=False)

    # Relationships
    ward = relationship("Ward", back_populates="beds")


class Movement(Base):
    __tablename__ = "movements"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=True, index=True)
    staff_id = Column(Integer, ForeignKey("staff.id", ondelete="CASCADE"), nullable=True, index=True)
    location_type = Column(String(64), nullable=False)  # 'bed', 'ward', 'procedure_room'
    location_id = Column(Integer, nullable=False, index=True)
    entry_time = Column(DateTime, nullable=False, index=True)
    exit_time = Column(DateTime, nullable=False, index=True)

    # Relationships
    patient = relationship("Patient", back_populates="movements")
    staff = relationship("Staff", back_populates="movements")

    __table_args__ = (
        Index("ix_movements_time_window", "entry_time", "exit_time"),
        Index("ix_movements_location_time", "location_type", "location_id", "entry_time", "exit_time"),
    )


class Procedure(Base):
    __tablename__ = "procedures"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    procedure_type = Column(String(128), nullable=False)
    location_id = Column(Integer, nullable=False)
    start_time = Column(DateTime, nullable=False)
    end_time = Column(DateTime, nullable=False)

    # Relationships
    patient = relationship("Patient", back_populates="procedures")
    staff_members = relationship("Staff", secondary=procedure_staff, back_populates="procedures")


class LabReport(Base):
    __tablename__ = "lab_reports"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    patient_id = Column(Integer, ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    specimen_type = Column(String(128), nullable=False)
    organism = Column(String(255), nullable=False)
    resistance_profile = Column(String(64), nullable=False)  # 'MDR', 'XDR', 'susceptible'
    collected_at = Column(DateTime, nullable=False)
    reported_at = Column(DateTime, nullable=False)
    raw_report_path = Column(String(512), nullable=True)
    status = Column(String(64), nullable=False, default="final")

    # Relationships
    patient = relationship("Patient", back_populates="lab_reports")
    antibiotics = relationship("LabReportAntibiotic", back_populates="lab_report", cascade="all, delete-orphan")


class LabReportAntibiotic(Base):
    __tablename__ = "lab_report_antibiotics"

    id = Column(Integer, primary_key=True, index=True, autoincrement=True)
    lab_report_id = Column(Integer, ForeignKey("lab_reports.id", ondelete="CASCADE"), nullable=False, index=True)
    antibiotic = Column(String(128), nullable=False)
    result = Column(String(64), nullable=False)
    mic = Column(String(64), nullable=True)
    interp = Column(String(16), nullable=True)

    # Relationships
    lab_report = relationship("LabReport", back_populates="antibiotics")
