"""
Neo4j Graph Ingestion Script (Graph/Crafting Layer).

Extracts data from PostgreSQL and intermediate data/contact_events.json to ingest
a complete, idempotent, and auditable graph into Neo4j.
Also outputs an offline Cypher artifact at data/neo4j_dump.cypher.
"""

import sys
import json
import argparse
from pathlib import Path
from datetime import datetime, timezone
from typing import Dict, Any, List

# Ensure backend package is in python path
backend_path = Path(__file__).resolve().parent.parent / "backend"
if str(backend_path) not in sys.path:
    sys.path.insert(0, str(backend_path))

from app.database import SessionLocal
from app.models import Patient, Staff, Ward, Bed, Movement, Procedure, LabReport, LabReportAntibiotic
from app.services.graph.neo4j_service import Neo4jService
from app.services.graph.contact_event_service import ContactEventEngine


def build_graph(
    events_file: Path,
    cypher_dump_path: Path,
    batch_size: int = 100,
) -> Dict[str, Any]:
    print("=" * 70)
    print("ROGRAKSHAK NEO4J GRAPH INGESTION")
    print("=" * 70)

    # 1. Load contact events
    if not events_file.exists():
        print("  Generating contact events artifact first...")
        with ContactEventEngine() as engine:
            events = engine.generate_all_contact_events()
        event_dicts = [e.model_dump() for e in events]
        events_file.parent.mkdir(parents=True, exist_ok=True)
        with open(events_file, "w", encoding="utf-8") as f:
            json.dump({"events": event_dicts}, f, indent=2)
    else:
        with open(events_file, "r", encoding="utf-8") as f:
            data = json.load(f)
            event_dicts = data.get("events", [])

    print(f"  • Contact events to ingest   : {len(event_dicts)}")

    # 2. Extract database entities
    session = SessionLocal()
    try:
        wards = session.query(Ward).all()
        beds = session.query(Bed).all()
        staff_members = session.query(Staff).all()
        patients = session.query(Patient).all()
        movements = session.query(Movement).all()
        procedures = session.query(Procedure).all()
        lab_reports = session.query(LabReport).all()
        antibiotics = session.query(LabReportAntibiotic).all()

        print(f"  • Wards                      : {len(wards)}")
        print(f"  • Beds                       : {len(beds)}")
        print(f"  • Staff members              : {len(staff_members)}")
        print(f"  • Patients                   : {len(patients)}")
        print(f"  • Procedures                 : {len(procedures)}")
        print(f"  • Lab Reports                : {len(lab_reports)}")
        print(f"  • Antibiotics (AST)          : {len(antibiotics)}")

        # Prepare Cypher statements
        cypher_lines: List[str] = []
        cypher_lines.append("// RogRakshak Neo4j Graph Ingestion Dump")
        cypher_lines.append(f"// Generated at: {datetime.now(timezone.utc).isoformat()}\n")

        # Constraints
        constraints = [
            "CREATE CONSTRAINT patient_id_unique IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE;",
            "CREATE CONSTRAINT staff_id_unique IF NOT EXISTS FOR (s:Staff) REQUIRE s.id IS UNIQUE;",
            "CREATE CONSTRAINT ward_id_unique IF NOT EXISTS FOR (w:Ward) REQUIRE w.id IS UNIQUE;",
            "CREATE CONSTRAINT bed_id_unique IF NOT EXISTS FOR (b:Bed) REQUIRE b.id IS UNIQUE;",
            "CREATE CONSTRAINT procedure_id_unique IF NOT EXISTS FOR (pr:Procedure) REQUIRE pr.id IS UNIQUE;",
            "CREATE CONSTRAINT lab_report_id_unique IF NOT EXISTS FOR (lr:LabReport) REQUIRE lr.id IS UNIQUE;",
            "CREATE CONSTRAINT antibiotic_id_unique IF NOT EXISTS FOR (ab:Antibiotic) REQUIRE ab.id IS UNIQUE;",
        ]
        cypher_lines.extend(constraints)
        cypher_lines.append("")

        # Wards
        for w in wards:
            cypher_lines.append(
                f"MERGE (w:Ward {{id: {w.id}}}) SET w.name = '{w.name}', w.department = '{w.department}';"
            )

        # Beds
        for b in beds:
            cypher_lines.append(
                f"MERGE (b:Bed {{id: {b.id}}}) SET b.bed_number = '{b.bed_number}', b.ward_id = {b.ward_id};"
            )
            cypher_lines.append(
                f"MATCH (b:Bed {{id: {b.id}}}), (w:Ward {{id: {b.ward_id}}}) MERGE (b)-[:LOCATED_IN]->(w);"
            )

        # Staff
        for s in staff_members:
            cypher_lines.append(
                f"MERGE (s:Staff {{id: {s.id}}}) SET s.name = '{s.name}', s.role = '{s.role}', s.department = '{s.department}';"
            )

        # Patients
        for p in patients:
            dis_val = f"'{p.discharge_date.isoformat()}'" if p.discharge_date else "null"
            diag_val = f"'{p.admitting_diagnosis}'" if p.admitting_diagnosis else "null"
            cypher_lines.append(
                f"MERGE (p:Patient {{id: {p.id}}}) SET p.name = '{p.name}', p.mrn = '{p.mrn}', "
                f"p.admission_date = '{p.admission_date.isoformat()}', p.discharge_date = {dis_val}, "
                f"p.admitting_diagnosis = {diag_val};"
            )

        # Procedures
        for pr in procedures:
            cypher_lines.append(
                f"MERGE (pr:Procedure {{id: {pr.id}}}) SET pr.procedure_type = '{pr.procedure_type}', "
                f"pr.patient_id = {pr.patient_id}, pr.location_id = {pr.location_id}, "
                f"pr.start_time = '{pr.start_time.isoformat()}', pr.end_time = '{pr.end_time.isoformat()}';"
            )
            cypher_lines.append(
                f"MATCH (p:Patient {{id: {pr.patient_id}}}), (pr:Procedure {{id: {pr.id}}}) MERGE (p)-[:UNDERWENT]->(pr);"
            )
            for sm in pr.staff_members:
                cypher_lines.append(
                    f"MATCH (pr:Procedure {{id: {pr.id}}}), (s:Staff {{id: {sm.id}}}) MERGE (pr)-[:PERFORMED_BY]->(s);"
                )

        # Lab Reports & Antibiotics
        for lr in lab_reports:
            raw_path = f"'{lr.raw_report_path}'" if lr.raw_report_path else "null"
            cypher_lines.append(
                f"MERGE (lr:LabReport {{id: {lr.id}}}) SET lr.patient_id = {lr.patient_id}, "
                f"lr.specimen_type = '{lr.specimen_type}', lr.organism = '{lr.organism}', "
                f"lr.resistance_profile = '{lr.resistance_profile}', "
                f"lr.collected_at = '{lr.collected_at.isoformat()}', lr.reported_at = '{lr.reported_at.isoformat()}', "
                f"lr.status = '{lr.status}', lr.raw_report_path = {raw_path};"
            )
            cypher_lines.append(
                f"MATCH (p:Patient {{id: {lr.patient_id}}}), (lr:LabReport {{id: {lr.id}}}) MERGE (p)-[:HAS_LAB_REPORT]->(lr);"
            )

        for ab in antibiotics:
            mic_val = f"'{ab.mic}'" if ab.mic else "null"
            interp_val = f"'{ab.interp}'" if ab.interp else "null"
            cypher_lines.append(
                f"MERGE (ab:Antibiotic {{id: {ab.id}}}) SET ab.lab_report_id = {ab.lab_report_id}, "
                f"ab.antibiotic = '{ab.antibiotic}', ab.result = '{ab.result}', "
                f"ab.mic = {mic_val}, ab.interp = {interp_val};"
            )
            cypher_lines.append(
                f"MATCH (lr:LabReport {{id: {ab.lab_report_id}}}), (ab:Antibiotic {{id: {ab.id}}}) MERGE (lr)-[:HAS_ANTIBIOTIC_RESULT]->(ab);"
            )

        # Contact Events
        for ev in event_dicts:
            c_type = ev["contact_type"]
            p_id = ev["patient_id"]
            conn_id = ev["connected_entity"]["id"]
            conn_type = ev["connected_entity"]["type"]
            loc_id = ev["location"]["id"]
            loc_type = ev["location"]["type"]
            loc_name = ev["location"]["name"].replace("'", "\\'")
            s_time = ev["start_time"]
            e_time = ev["end_time"]
            dur = ev["overlap_minutes"]
            e_id = ev["event_id"]

            if conn_type == "staff":
                cypher_lines.append(
                    f"MATCH (p:Patient {{id: {p_id}}}), (s:Staff {{id: {conn_id}}}) "
                    f"MERGE (p)-[r:CONTACT_WITH {{event_id: '{e_id}'}}]->(s) "
                    f"SET r.contact_type = '{c_type}', r.location_type = '{loc_type}', r.location_id = {loc_id}, "
                    f"r.location_name = '{loc_name}', r.start_time = '{s_time}', r.end_time = '{e_time}', "
                    f"r.overlap_minutes = {dur};"
                )
            elif conn_type == "patient":
                cypher_lines.append(
                    f"MATCH (p1:Patient {{id: {p_id}}}), (p2:Patient {{id: {conn_id}}}) "
                    f"MERGE (p1)-[r:CO_LOCATED_WITH {{event_id: '{e_id}'}}]->(p2) "
                    f"SET r.contact_type = '{c_type}', r.location_type = '{loc_type}', r.location_id = {loc_id}, "
                    f"r.location_name = '{loc_name}', r.start_time = '{s_time}', r.end_time = '{e_time}', "
                    f"r.overlap_minutes = {dur};"
                )

        # Write Cypher dump file
        cypher_dump_path.parent.mkdir(parents=True, exist_ok=True)
        with open(cypher_dump_path, "w", encoding="utf-8") as f:
            f.write("\n".join(cypher_lines))
        print(f"  • Cypher script exported to  : {cypher_dump_path} ({len(cypher_lines)} statements)")

        # 3. Attempt live Neo4j ingestion if server reachable
        neo4j_svc = Neo4jService()
        is_live = neo4j_svc.is_connected()
        if is_live:
            print("  • Live Neo4j instance detected! Executing graph ingestion...")
            neo4j_svc.create_constraints()
            driver = neo4j_svc.connect()
            with driver.session() as n_sess:
                for line in cypher_lines:
                    line = line.strip()
                    if line and not line.startswith("//"):
                        stmt = line.rstrip(";")
                        n_sess.run(stmt)
            print("  • Ingestion into live Neo4j database: COMPLETED ✅")
        else:
            print("  • Note: No live Neo4j server on port 7687 (offline mode active).")
            print(f"    Cypher artifact generated successfully at {cypher_dump_path} for immediate ingestion.")

        neo4j_svc.close()
        print("=" * 70)
        return {
            "cypher_statements": len(cypher_lines),
            "contact_events": len(event_dicts),
            "live_ingestion": is_live,
            "cypher_dump": str(cypher_dump_path),
        }

    finally:
        session.close()


def main():
    parser = argparse.ArgumentParser(description="Ingest PostgreSQL data and contact events into Neo4j.")
    parser.add_argument(
        "--events",
        type=str,
        default="data/contact_events.json",
        help="Path to contact events JSON",
    )
    parser.add_argument(
        "--dump",
        type=str,
        default="data/neo4j_dump.cypher",
        help="Path to output Cypher dump file",
    )
    args = parser.parse_args()

    repo_root = Path(__file__).resolve().parent.parent
    events_file = repo_root / args.events
    dump_file = repo_root / args.dump

    build_graph(events_file, dump_file)


if __name__ == "__main__":
    main()
