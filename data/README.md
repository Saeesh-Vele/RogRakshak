# RogRakshak Synthetic Data Pipeline

This directory holds dataset generation scripts, schemas, and fixtures for simulating hospital operations, patient movements, microbiological culture reports, and disease outbreak scenarios.

## Planned Data Schemas & Modules

1. **Hospital Layout**:
   - Wards (e.g., ICU, General Medicine, Surgery, Pediatric)
   - Rooms and Bed identifiers with spatial proximity metadata.

2. **Entities**:
   - **Patients**: ID, demographic details, admission/discharge timestamps.
   - **Staff**: ID, role (doctor, nurse, technician), ward shift schedules.

3. **Temporal Interactions**:
   - **Movement Logs**: Bed-level transfer events with exact datetime intervals.
   - **Staff Interactions**: Timestamps of clinician-patient contact events.

4. **Microbiology & Outbreak Plant**:
   - Pathogen test orders, specimen collection dates, positivity results.
   - Planted transmission clusters: Seeded index patient, secondary cases via co-location in ICU/wards or shared staff vector, and resistance pattern signatures.
