"""create_initial_schema

Revision ID: 0ab6edf81f2d
Revises: 
Create Date: 2026-08-14 19:51:33.473952

"""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = '0ab6edf81f2d'
down_revision: Union[str, Sequence[str], None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    # 1. patients table
    op.create_table(
        'patients',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('mrn', sa.String(length=64), nullable=False),
        sa.Column('admission_date', sa.DateTime(), nullable=False),
        sa.Column('discharge_date', sa.DateTime(), nullable=True),
        sa.Column('admitting_diagnosis', sa.String(length=255), nullable=True),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_patients_id'), 'patients', ['id'], unique=False)
    op.create_index(op.f('ix_patients_mrn'), 'patients', ['mrn'], unique=True)

    # 2. staff table
    op.create_table(
        'staff',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=255), nullable=False),
        sa.Column('role', sa.String(length=64), nullable=False),
        sa.Column('department', sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_staff_id'), 'staff', ['id'], unique=False)

    # 3. wards table
    op.create_table(
        'wards',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('name', sa.String(length=128), nullable=False),
        sa.Column('department', sa.String(length=128), nullable=False),
        sa.PrimaryKeyConstraint('id'),
        sa.UniqueConstraint('name'),
    )
    op.create_index(op.f('ix_wards_id'), 'wards', ['id'], unique=False)

    # 4. beds table
    op.create_table(
        'beds',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('ward_id', sa.Integer(), nullable=False),
        sa.Column('bed_number', sa.String(length=64), nullable=False),
        sa.ForeignKeyConstraint(['ward_id'], ['wards.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_beds_id'), 'beds', ['id'], unique=False)
    op.create_index(op.f('ix_beds_ward_id'), 'beds', ['ward_id'], unique=False)

    # 5. movements table
    op.create_table(
        'movements',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=True),
        sa.Column('staff_id', sa.Integer(), nullable=True),
        sa.Column('location_type', sa.String(length=64), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('entry_time', sa.DateTime(), nullable=False),
        sa.Column('exit_time', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_movements_id'), 'movements', ['id'], unique=False)
    op.create_index(op.f('ix_movements_patient_id'), 'movements', ['patient_id'], unique=False)
    op.create_index(op.f('ix_movements_staff_id'), 'movements', ['staff_id'], unique=False)
    op.create_index(op.f('ix_movements_location_id'), 'movements', ['location_id'], unique=False)
    op.create_index(op.f('ix_movements_entry_time'), 'movements', ['entry_time'], unique=False)
    op.create_index(op.f('ix_movements_exit_time'), 'movements', ['exit_time'], unique=False)
    op.create_index('ix_movements_time_window', 'movements', ['entry_time', 'exit_time'], unique=False)
    op.create_index('ix_movements_location_time', 'movements', ['location_type', 'location_id', 'entry_time', 'exit_time'], unique=False)

    # 6. procedures table
    op.create_table(
        'procedures',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('procedure_type', sa.String(length=128), nullable=False),
        sa.Column('location_id', sa.Integer(), nullable=False),
        sa.Column('start_time', sa.DateTime(), nullable=False),
        sa.Column('end_time', sa.DateTime(), nullable=False),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_procedures_id'), 'procedures', ['id'], unique=False)
    op.create_index(op.f('ix_procedures_patient_id'), 'procedures', ['patient_id'], unique=False)

    # 7. procedure_staff join table
    op.create_table(
        'procedure_staff',
        sa.Column('procedure_id', sa.Integer(), nullable=False),
        sa.Column('staff_id', sa.Integer(), nullable=False),
        sa.ForeignKeyConstraint(['procedure_id'], ['procedures.id'], ondelete='CASCADE'),
        sa.ForeignKeyConstraint(['staff_id'], ['staff.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('procedure_id', 'staff_id'),
    )

    # 8. lab_reports table
    op.create_table(
        'lab_reports',
        sa.Column('id', sa.Integer(), autoincrement=True, nullable=False),
        sa.Column('patient_id', sa.Integer(), nullable=False),
        sa.Column('specimen_type', sa.String(length=128), nullable=False),
        sa.Column('organism', sa.String(length=255), nullable=False),
        sa.Column('resistance_profile', sa.String(length=64), nullable=False),
        sa.Column('collected_at', sa.DateTime(), nullable=False),
        sa.Column('reported_at', sa.DateTime(), nullable=False),
        sa.Column('raw_report_path', sa.String(length=512), nullable=True),
        sa.Column('status', sa.String(length=64), nullable=False, server_default='final'),
        sa.ForeignKeyConstraint(['patient_id'], ['patients.id'], ondelete='CASCADE'),
        sa.PrimaryKeyConstraint('id'),
    )
    op.create_index(op.f('ix_lab_reports_id'), 'lab_reports', ['id'], unique=False)
    op.create_index(op.f('ix_lab_reports_patient_id'), 'lab_reports', ['patient_id'], unique=False)


def downgrade() -> None:
    op.drop_index(op.f('ix_lab_reports_patient_id'), table_name='lab_reports')
    op.drop_index(op.f('ix_lab_reports_id'), table_name='lab_reports')
    op.drop_table('lab_reports')

    op.drop_table('procedure_staff')

    op.drop_index(op.f('ix_procedures_patient_id'), table_name='procedures')
    op.drop_index(op.f('ix_procedures_id'), table_name='procedures')
    op.drop_table('procedures')

    op.drop_index('ix_movements_location_time', table_name='movements')
    op.drop_index('ix_movements_time_window', table_name='movements')
    op.drop_index(op.f('ix_movements_exit_time'), table_name='movements')
    op.drop_index(op.f('ix_movements_entry_time'), table_name='movements')
    op.drop_index(op.f('ix_movements_location_id'), table_name='movements')
    op.drop_index(op.f('ix_movements_staff_id'), table_name='movements')
    op.drop_index(op.f('ix_movements_patient_id'), table_name='movements')
    op.drop_index(op.f('ix_movements_id'), table_name='movements')
    op.drop_table('movements')

    op.drop_index(op.f('ix_beds_ward_id'), table_name='beds')
    op.drop_index(op.f('ix_beds_id'), table_name='beds')
    op.drop_table('beds')

    op.drop_index(op.f('ix_wards_id'), table_name='wards')
    op.drop_table('wards')

    op.drop_index(op.f('ix_staff_id'), table_name='staff')
    op.drop_table('staff')

    op.drop_index(op.f('ix_patients_mrn'), table_name='patients')
    op.drop_index(op.f('ix_patients_id'), table_name='patients')
    op.drop_table('patients')
