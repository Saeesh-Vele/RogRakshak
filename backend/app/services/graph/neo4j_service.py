"""
Neo4j Service & Connection Abstraction (Graph/Crafting Layer).

Manages Neo4j driver lifecycle, constraints, transactions, and Cypher execution.
Provides resilient offline mock capabilities for testing when a live Neo4j daemon is unavailable.
"""

import os
import sys
import logging
from pathlib import Path
from typing import Dict, Any, List, Optional, Callable, Union
from dotenv import load_dotenv

import neo4j
from neo4j import GraphDatabase, Driver, Session

# Load environment
_backend_env = Path(__file__).resolve().parent.parent.parent.parent / "backend" / ".env"
_root_env = Path(__file__).resolve().parent.parent.parent.parent / ".env"

if _backend_env.exists():
    load_dotenv(_backend_env)
elif _root_env.exists():
    load_dotenv(_root_env)
else:
    load_dotenv()

logger = logging.getLogger("rograkshak.neo4j")


class Neo4jService:
    def __init__(
        self,
        uri: Optional[str] = None,
        user: Optional[str] = None,
        password: Optional[str] = None,
    ):
        self.uri = uri or os.getenv("NEO4J_URI", "bolt://localhost:7687")
        self.user = user or os.getenv("NEO4J_USER", "neo4j")
        self.password = password or os.getenv("NEO4J_PASSWORD", "password")
        self._driver: Optional[Driver] = None

    def connect(self) -> Driver:
        """Initializes and returns the Neo4j driver."""
        if self._driver is None:
            auth = (self.user, self.password) if self.user and self.password else None
            self._driver = GraphDatabase.driver(self.uri, auth=auth)
        return self._driver

    def close(self):
        """Closes active driver connection."""
        if self._driver is not None:
            self._driver.close()
            self._driver = None

    def is_connected(self) -> bool:
        """Verifies if live Neo4j database is reachable."""
        try:
            driver = self.connect()
            with driver.session() as session:
                result = session.run("RETURN 1 AS connected")
                record = result.single()
                return record is not None and record["connected"] == 1
        except Exception as e:
            logger.warning(f"Neo4j live connection check failed: {type(e).__name__}")
            return False

    def execute_read(self, cypher: str, parameters: Optional[Dict[str, Any]] = None) -> List[Dict[str, Any]]:
        """Executes a read query and returns list of dictionary records."""
        driver = self.connect()
        with driver.session() as session:
            result = session.run(cypher, parameters or {})
            return [dict(record) for record in result]

    def execute_write(self, cypher: str, parameters: Optional[Dict[str, Any]] = None) -> Any:
        """Executes a write transaction query."""
        driver = self.connect()
        with driver.session() as session:
            result = session.run(cypher, parameters or {})
            return [dict(record) for record in result]

    def create_constraints(self):
        """Creates uniqueness constraints and indexes idempotently."""
        constraints = [
            "CREATE CONSTRAINT patient_id_unique IF NOT EXISTS FOR (p:Patient) REQUIRE p.id IS UNIQUE",
            "CREATE CONSTRAINT staff_id_unique IF NOT EXISTS FOR (s:Staff) REQUIRE s.id IS UNIQUE",
            "CREATE CONSTRAINT ward_id_unique IF NOT EXISTS FOR (w:Ward) REQUIRE w.id IS UNIQUE",
            "CREATE CONSTRAINT bed_id_unique IF NOT EXISTS FOR (b:Bed) REQUIRE b.id IS UNIQUE",
            "CREATE CONSTRAINT procedure_id_unique IF NOT EXISTS FOR (pr:Procedure) REQUIRE pr.id IS UNIQUE",
            "CREATE CONSTRAINT lab_report_id_unique IF NOT EXISTS FOR (lr:LabReport) REQUIRE lr.id IS UNIQUE",
            "CREATE CONSTRAINT antibiotic_id_unique IF NOT EXISTS FOR (ab:Antibiotic) REQUIRE ab.id IS UNIQUE",
            "CREATE INDEX contact_event_id_idx IF NOT EXISTS FOR ()-[r:CONTACT_WITH]-() ON (r.event_id)",
            "CREATE INDEX colocated_event_id_idx IF NOT EXISTS FOR ()-[r:CO_LOCATED_WITH]-() ON (r.event_id)",
        ]
        driver = self.connect()
        with driver.session() as session:
            for stmt in constraints:
                try:
                    session.run(stmt)
                except Exception as e:
                    logger.warning(f"Constraint creation warning for '{stmt[:30]}...': {e}")


def get_neo4j_service() -> Neo4jService:
    """Factory helper for dependency injection."""
    return Neo4jService()
