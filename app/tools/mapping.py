"""
Deterministic mapping engine (Phase 7).

    website field label -> profile source -> value/verified -> confidence
                        -> risk -> action

The LLM is NOT allowed to invent field mappings or values. It passes the
label it sees on the page; this module decides the source, value, risk and
whether the agent may fill, must propose, or must ask the student.

Confidence: an exact (normalized) label alias = 0.99. A fuzzy match is
capped at 0.85 and therefore can never be auto-filled (threshold 0.9).
"""
from __future__ import annotations

import re
from difflib import SequenceMatcher
from typing import Any

from strands import tool

from app.agent.policies import RiskLevel, classify_field
from app.tools import state
from app.tools.profile import load_profile, resolve_source

AUTO_FILL_THRESHOLD = 0.9
FUZZY_CAP = 0.85
FUZZY_MIN = 0.75

# normalized website label -> profile source path
LABEL_TO_SOURCE: dict[str, str] = {
    "name": "name", "full name": "name", "your name": "name", "legal name": "name",
    "email": "email", "email address": "email", "e-mail": "email", "applicant email": "email",
    "date of birth": "date_of_birth", "dob": "date_of_birth", "birth date": "date_of_birth",
    "address": "address", "mailing address": "address", "home address": "address",
    "institution": "education.institution", "school": "education.institution",
    "college": "education.institution", "university attended": "education.institution",
    "degree": "education.degree", "degree program": "education.degree",
    "graduation year": "graduation_year", "year of graduation": "graduation_year",
    "expected graduation year": "graduation_year",
    "gpa": "gpa", "undergraduate gpa": "gpa", "cumulative gpa": "gpa",
    "sat score": "test_scores.SAT", "sat": "test_scores.SAT",
    "skills": "skills",
    "personal statement": "personal_statement", "statement of purpose": "personal_statement",
    "work experience": "experience", "experience": "experience",
}


def normalize_label(label: str) -> str:
    text = re.sub(r"\(.*?\)|[*:?]", " ", label.lower())
    return re.sub(r"\s+", " ", text).strip()


def match_source(label: str) -> tuple[str | None, float]:
    norm = normalize_label(label)
    if norm in LABEL_TO_SOURCE:
        return LABEL_TO_SOURCE[norm], 0.99
    best, best_score = None, 0.0
    for alias, source in LABEL_TO_SOURCE.items():
        score = SequenceMatcher(None, norm, alias).ratio()
        if score > best_score:
            best, best_score = source, score
    if best is not None and best_score >= FUZZY_MIN:
        return best, round(min(best_score, FUZZY_CAP), 2)
    return None, round(best_score, 2)


def map_field(field_label: str, profile: dict[str, Any], question_text: str = "") -> dict[str, Any]:
    """Pure mapping function (unit-testable, no agent/browser needed)."""
    source, confidence = match_source(field_label)
    risk = classify_field(source or field_label, f"{field_label} {question_text}")
    value, vstate = resolve_source(profile, source) if source else (None, "missing")
    verified = vstate == "verified"

    if source is None or risk == RiskLevel.HIGH or vstate == "missing":
        action = "ask_student"
    elif risk == RiskLevel.LOW and verified and confidence >= AUTO_FILL_THRESHOLD:
        action = "auto_fill"
    else:
        action = "propose_and_confirm"

    result: dict[str, Any] = {
        "field": field_label,
        "source": f"student_profile.{source}" if source else None,
        "verified": verified,
        "confidence": confidence,
        "risk": risk.value,
        "action": action,
    }
    if action in ("auto_fill", "propose_and_confirm"):
        result["value"] = value
    return result


@tool
def map_form_field(field_label: str, question_text: str = "") -> dict[str, Any]:
    """Map a form field on the website to the student's profile (deterministic).

    Call this for EVERY field/question before touching it. Obey `action`:
    - "auto_fill": call fill_field with exactly `value`.
    - "propose_and_confirm": call request_student_input with `value` as the proposal.
    - "ask_student": call request_student_input WITHOUT proposing anything.

    Args:
        field_label: The label text shown on the page, exactly as displayed.
        question_text: Full question text if this is a question rather than a simple field.
    """
    result = map_field(field_label, load_profile(), question_text)
    s = state.active_session()
    if s is not None:
        s.mappings[field_label] = result
        state.save_active()
    state.record("field_mapped", field=field_label, source=result["source"],
                 risk=result["risk"], action=result["action"], confidence=result["confidence"])
    return result
