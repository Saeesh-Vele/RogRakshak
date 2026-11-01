"""
Default demo cases (CASE-2026-001, CASE-2026-004) are seeded when missing and
never overwrite an existing case. The workflow itself is stubbed so these tests
exercise only the seeding rules.
"""

import pytest

from app.services.detection import investigation_service as svc_mod
from app.services.detection.investigation_service import (
    DEFAULT_CASES,
    InvestigationService,
    _investigation_store,
)


class _FakeCase:
    def __init__(self, case_id, marker="seeded"):
        self.case_id = case_id
        self.marker = marker


@pytest.fixture
def service(monkeypatch):
    saved = dict(_investigation_store)
    _investigation_store.clear()
    calls = []

    def fake_execute(self, target_patient_id, organism, resistance_profile, use_mock_graph=False, case_id=None):
        calls.append((case_id, target_patient_id, organism, resistance_profile))
        return _FakeCase(case_id)

    monkeypatch.setattr(InvestigationService, "_execute", fake_execute)
    s = InvestigationService(graph_provider=object())
    s.calls = calls
    yield s
    _investigation_store.clear()
    _investigation_store.update(saved)


def test_defaults_are_the_two_demo_cases():
    assert [(d.case_id, d.target_patient_id) for d in DEFAULT_CASES] == [
        ("CASE-2026-001", 1),
        ("CASE-2026-004", 4),
    ]


def test_seeds_missing_defaults(service):
    created = service.ensure_default_cases()
    assert created == ["CASE-2026-001", "CASE-2026-004"]
    assert set(_investigation_store) == {"CASE-2026-001", "CASE-2026-004"}
    assert ("CASE-2026-004", 4, "Klebsiella pneumoniae", "MDR") in service.calls


def test_never_overwrites_an_existing_case(service):
    existing = _FakeCase("CASE-2026-004", marker="user-run")
    _investigation_store["CASE-2026-004"] = existing
    created = service.ensure_default_cases()
    assert created == ["CASE-2026-001"]
    assert _investigation_store["CASE-2026-004"] is existing
    assert all(c[0] != "CASE-2026-004" for c in service.calls)  # not even re-run


def test_a_concurrent_user_run_wins_over_the_seed(service, monkeypatch):
    # A user run lands while the seed for 004 is executing: the seed must not replace it.
    user_case = _FakeCase("CASE-2026-004", marker="user-run")

    def racing_execute(self, target_patient_id, organism, resistance_profile, use_mock_graph=False, case_id=None):
        if case_id == "CASE-2026-004":
            _investigation_store["CASE-2026-004"] = user_case
        return _FakeCase(case_id)

    monkeypatch.setattr(InvestigationService, "_execute", racing_execute)
    created = service.ensure_default_cases()
    assert "CASE-2026-004" not in created
    assert _investigation_store["CASE-2026-004"] is user_case


def test_one_failing_default_does_not_block_the_other(service, monkeypatch):
    def flaky_execute(self, target_patient_id, organism, resistance_profile, use_mock_graph=False, case_id=None):
        if case_id == "CASE-2026-001":
            raise RuntimeError("graph unavailable")
        return _FakeCase(case_id)

    monkeypatch.setattr(InvestigationService, "_execute", flaky_execute)
    assert service.ensure_default_cases() == ["CASE-2026-004"]


def test_get_seeds_a_default_on_demand(service):
    case = service.get_investigation("CASE-2026-004")
    assert case is not None and case.case_id == "CASE-2026-004"
    assert [c[0] for c in service.calls] == ["CASE-2026-004"]
    assert service.get_investigation("CASE-2026-099") is None
