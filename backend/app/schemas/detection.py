"""
Detection & Investigation Pydantic Domain Models (Phase 3B).

Defines structured contracts for evidence aggregation, deterministic scoring,
transmission-pathway hypotheses, investigation cases, and API responses for the Frontend Team.
"""

from datetime import datetime
from typing import Optional, List, Dict, Any, Literal
from pydantic import BaseModel, Field


InvestigationStatus = Literal[
    "NO_SIGNAL",
    "POTENTIAL_CONTACT",
    "SUSPECTED_CLUSTER",
    "HIGH_PRIORITY_INVESTIGATION"
]

EvidenceType = Literal[
    "temporal_staff_overlap",
    "patient_colocation",
    "shared_procedure_staff",
    "same_organism",
    "same_resistance_profile",
    "temporal_lab_proximity",
    "shared_location",
    "clinical_timeline_relation"
]


class EvidenceMediator(BaseModel):
    type: Literal["staff", "location", "procedure"] = Field(description="Mediating entity type")
    id: int = Field(description="Primary key identifier")
    name: str = Field(description="Display name (e.g. Nurse Anita Sharma, ICU)")
    role: Optional[str] = Field(default=None, description="Role if staff member")


class EvidenceItem(BaseModel):
    """Atomic, verifiable piece of epidemiological evidence."""
    evidence_id: str = Field(description="Unique deterministic evidence ID")
    type: EvidenceType = Field(description="Category of evidence")
    subject_patient_id: int = Field(description="Source patient ID (e.g. Index Case)")
    object_patient_id: int = Field(description="Target patient ID (e.g. Candidate Case)")
    mediator: Optional[EvidenceMediator] = Field(default=None, description="Mediating entity if indirect contact")
    location: Optional[str] = Field(default=None, description="Hospital location or ward name")
    start_time: Optional[str] = Field(default=None, description="ISO-8601 interval start")
    end_time: Optional[str] = Field(default=None, description="ISO-8601 interval end")
    overlap_minutes: Optional[float] = Field(default=None, description="Overlap duration in minutes")
    source: str = Field(description="Provenance source (e.g. 'movements', 'lab_reports', 'procedures')")
    strength: float = Field(ge=0.0, le=1.0, description="Normalized evidence strength [0.0, 1.0]")
    explanation: str = Field(description="Objective factual statement describing the evidence")


class ScoringDimension(BaseModel):
    dimension: str = Field(description="Name of scoring dimension")
    raw_score: float = Field(description="Raw calculated score")
    weight: float = Field(description="Configured weight")
    weighted_score: float = Field(description="Contribution to total score")
    evidence_count: int = Field(description="Number of supporting evidence items")
    description: str = Field(description="Human-readable explanation of dimension score")


class ScoringBreakdown(BaseModel):
    total_score: float = Field(description="Sum of weighted scores")
    normalized_confidence: float = Field(ge=0.0, le=1.0, description="Normalized confidence [0.0, 1.0]")
    dimensions: List[ScoringDimension] = Field(default_factory=list)


class TransmissionChainNode(BaseModel):
    type: Literal["patient", "staff", "ward", "procedure"]
    id: int
    name: str
    role: Optional[str] = None


class TransmissionChainHop(BaseModel):
    from_id: int
    via_id: Optional[int] = None
    to_id: int
    overlap_minutes: Optional[float] = None
    location: str
    start_time: str
    end_time: str
    evidence_id: str


class TransmissionChain(BaseModel):
    """Suspected contact pathway / transmission hypothesis."""
    chain_id: str = Field(description="Deterministic chain identifier")
    nodes: List[TransmissionChainNode] = Field(description="Entities in transmission path")
    hops: List[TransmissionChainHop] = Field(description="Sequential contact hops")
    total_overlap_minutes: float = Field(description="Cumulative contact duration")
    confidence: float = Field(ge=0.0, le=1.0, description="Hypothesis confidence")
    description: str = Field(description="Explainable hypothesis description")


class PatientSummary(BaseModel):
    id: int
    name: str
    mrn: str
    role: Literal["index", "candidate", "control"]
    admission_date: str
    discharge_date: Optional[str] = None
    admitting_diagnosis: Optional[str] = None
    positive_culture_date: Optional[str] = None


class InvestigationTimelineEntry(BaseModel):
    timestamp: str
    event_type: str
    patient_id: int
    patient_name: str
    description: str
    location: Optional[str] = None


class InvestigationCase(BaseModel):
    """Complete structured epidemiological investigation result."""
    case_id: str = Field(description="Unique investigation case ID")
    status: InvestigationStatus = Field(description="Investigation priority / status")
    organism: str = Field(description="Microbial pathogen under investigation")
    resistance_profile: Optional[str] = Field(default=None, description="Resistance classification, e.g. MDR")
    confidence: float = Field(ge=0.0, le=1.0, description="Overall investigation confidence")
    scoring: ScoringBreakdown = Field(description="Explainable scoring breakdown")
    index_patient: PatientSummary = Field(description="Primary / index patient under investigation")
    patients: List[PatientSummary] = Field(default_factory=list, description="All involved patients")
    candidate_patients: List[PatientSummary] = Field(default_factory=list, description="Suspected contact cases")
    evidence: List[EvidenceItem] = Field(default_factory=list, description="All aggregated evidence items")
    transmission_chains: List[TransmissionChain] = Field(
        default_factory=list, description="Suspected contact transmission pathways"
    )
    timeline: List[InvestigationTimelineEntry] = Field(
        default_factory=list, description="Combined chronological incident timeline"
    )
    summary: str = Field(description="Executive clinical epidemiological briefing")
    warnings: List[str] = Field(default_factory=list, description="Data gaps, caveats, or control notes")
    generated_at: str = Field(description="ISO-8601 generation timestamp")


class InvestigationListResponse(BaseModel):
    total_cases: int
    cases: List[InvestigationCase]


class CreateInvestigationRequest(BaseModel):
    target_patient_id: int = Field(default=1, description="Index patient ID to investigate")
    organism: str = Field(default="Klebsiella pneumoniae", description="Pathogen name")
    resistance_profile: Optional[str] = Field(default="MDR", description="Resistance profile")
    use_mock_graph: bool = Field(default=False, description="Whether to use offline mock graph provider")
