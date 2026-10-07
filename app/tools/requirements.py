"""
University requirements tools (Phase 5).

One deliberately deep target: Demo University / Computer Science, backed by
the local demo portal (demo_university/). `check_university_requirements`
compares what the program needs against the REAL student profile and
returns a checklist, so the agent never has to guess what is missing.
"""
from __future__ import annotations

import os
from typing import Any

from strands import tool

from app.state_machine.states import ApplicationState as S
from app.tools import state
from app.tools.profile import field_state, load_profile


def _portal_url() -> str:
    return os.getenv("DEMO_UNIVERSITY_URL", "http://localhost:8080").rstrip("/")


def _requirements_db() -> dict[tuple[str, str], dict[str, Any]]:
    base = _portal_url()
    return {
        ("demo university", "computer science"): {
            "university": "Demo University",
            "program": "Computer Science",
            "deadline": "2026-12-01",
            "application_url": f"{base}/login.html",
            "required_documents": ["resume", "transcript", "personal_statement"],
            "required_fields": [
                "name", "email", "date_of_birth", "address", "education",
                "graduation_year", "gpa", "test_scores",
            ],
            "application_fields": [
                {"page": "personal-info", "label": "Full name", "type": "text"},
                {"page": "personal-info", "label": "Email address", "type": "email"},
                {"page": "personal-info", "label": "Date of birth", "type": "date"},
                {"page": "personal-info", "label": "Mailing address", "type": "text"},
                {"page": "education", "label": "Institution", "type": "text"},
                {"page": "education", "label": "Degree", "type": "text"},
                {"page": "education", "label": "Graduation year", "type": "number"},
                {"page": "education", "label": "Undergraduate GPA", "type": "number"},
                {"page": "education", "label": "SAT score", "type": "number"},
                {"page": "documents", "label": "Resume", "type": "file"},
                {"page": "documents", "label": "Transcript", "type": "file"},
            ],
            "questions": [
                {"page": "questions", "text": "Personal statement", "risk": "medium"},
                {"page": "questions", "text": "Have you ever been subject to disciplinary action?", "risk": "high"},
            ],
        }
    }


def get_requirements(university: str, program: str) -> dict[str, Any] | None:
    return _requirements_db().get((university.strip().lower(), program.strip().lower()))


def build_checklist(req: dict[str, Any], profile: dict[str, Any]) -> dict[str, Any]:
    """Compare requirements to the real profile. Pure function (unit-testable)."""
    checklist: dict[str, str] = {}
    for key in req["required_fields"]:
        checklist[key] = {"verified": "ready", "unverified": "needs_confirmation", "missing": "missing"}[
            field_state(profile.get(key))
        ]
    docs = profile.get("documents")
    docs_ok = field_state(docs) == "verified"
    for doc in req["required_documents"]:
        if doc == "personal_statement":
            st = field_state(profile.get("personal_statement"))
            checklist[doc] = {"verified": "ready", "unverified": "needs_confirmation", "missing": "missing"}[st]
        else:
            checklist[doc] = "ready" if docs_ok and docs["value"].get(doc) else "missing"
    return {
        "checklist": checklist,
        "blocking_missing": [k for k, v in checklist.items() if v == "missing"],
        "needs_confirmation": [k for k, v in checklist.items() if v == "needs_confirmation"],
    }


def _apply_state(blocking_missing: list[str]) -> None:
    """Drive the state machine from the requirements outcome (never the model)."""
    s = state.active_session()
    if s is None:
        return
    if s.state in (S.PREPARING, S.MISSING_INFORMATION):
        state.transition(S.REQUIREMENTS_CHECK)
    if s.state == S.REQUIREMENTS_CHECK:
        state.transition(S.MISSING_INFORMATION if blocking_missing else S.READY_TO_RUN)


@tool
def check_university_requirements(university: str, program: str) -> dict[str, Any]:
    """Look up what a program requires and check it against the student's real profile.

    Returns the deadline, application_url, required documents/fields, the
    application fields and known questions, plus a per-item `checklist`
    (ready / needs_confirmation / missing). `blocking_missing` items MUST be
    provided by the student before the browser is opened; `needs_confirmation`
    items (e.g. an AI-drafted personal statement) are handled when the
    student is asked about them during the form.

    Args:
        university: University name (case-insensitive).
        program: Program/major name (case-insensitive).
    """
    req = get_requirements(university, program)
    if req is None:
        state.record("requirements_unsupported", university=university, program=program)
        return {
            "error": (
                f"No requirements on file for {program} at {university}. "
                "This build only supports Demo University / Computer Science. "
                "Tell the student; do not guess requirements."
            )
        }
    result = build_checklist(req, load_profile())
    s = state.active_session()
    if s is not None:
        s.requirements = req
        state.save_active()
    state.record(
        "requirements_checked",
        university=req["university"], program=req["program"],
        blocking_missing=result["blocking_missing"], needs_confirmation=result["needs_confirmation"],
    )
    _apply_state(result["blocking_missing"])
    return {**req, **result, "ready_to_start": not result["blocking_missing"]}


@tool
def find_missing_information(university: str, program: str) -> dict[str, Any]:
    """List what is missing or unconfirmed for a program, computed from the real profile.

    Args:
        university: University name.
        program: Program/major name.

    Returns:
        {"missing": [...], "needs_confirmation": [...], "ready": bool}. `ready`
        is False while anything blocking is missing. Never invent a missing value.
    """
    req = get_requirements(university, program)
    if req is None:
        return {"error": f"No requirements on file for {program} at {university}."}
    result = build_checklist(req, load_profile())
    return {
        "missing": result["blocking_missing"],
        "needs_confirmation": result["needs_confirmation"],
        "ready": not result["blocking_missing"],
    }
