"""
UniPro's safety and risk policy — the single source of truth for "what may
the agent do without a human?". Everything here is deterministic Python; the
model cannot talk its way around it.

Hard rules:
  - Never fabricate information or documents.
  - Never bypass CAPTCHA or OTP.
  - Never make payments.
  - Never submit without explicit final human approval.
  - Never answer a HIGH risk question without human input.
"""
from __future__ import annotations

import re
from enum import Enum
from typing import Any


class RiskLevel(str, Enum):
    LOW = "low"        # auto-fill if the value is verified
    MEDIUM = "medium"  # propose an answer, student must approve
    HIGH = "high"      # mandatory human action; agent never proposes a value


# Profile fields safe to auto-fill (when verified). Unknown fields default to
# MEDIUM, never LOW.
LOW_RISK_FIELDS = {
    "name", "email", "date_of_birth", "address", "gpa", "education",
    "graduation_year", "test_scores", "skills",
}

# Word-boundary matched so "legal name" stays LOW but "legal declaration" is HIGH.
_HIGH_RISK_RE = re.compile(
    r"\b(disciplinary|criminal|convicted|conviction|felony|misdemeanou?r|expelled|"
    r"suspended|misconduct|legal declaration|legal status|legally|lawsuit|"
    r"financial aid|financial declaration|medical|health condition|disability|"
    r"citizenship|immigration|visa|declaration|final submission|submit application|"
    r"payment)\b",
    re.IGNORECASE,
)

# Tools that must never run, whatever the model decides. The agent has NO
# submit capability at all: final submission is a student-triggered runner
# action (see app/agent/runner.py), so "submit_application" is forbidden too.
FORBIDDEN_TOOLS = {"bypass_captcha", "bypass_otp", "make_payment", "submit_application"}


def classify_field(field_name: str, question_text: str = "") -> RiskLevel:
    """Classify a form field/question into a risk tier."""
    if _HIGH_RISK_RE.search(f"{field_name} {question_text}"):
        return RiskLevel.HIGH
    base = field_name.lower().split(".")[0].strip()
    if base in LOW_RISK_FIELDS:
        return RiskLevel.LOW
    return RiskLevel.MEDIUM


def evaluate_tool_call(tool_name: str) -> tuple[bool, str]:
    """Static allow/deny for a tool call. Returns (allowed, reason)."""
    if tool_name in FORBIDDEN_TOOLS:
        return False, f"'{tool_name}' is permanently disabled by UniPro's safety policy."
    return True, ""


def _same(a: Any, b: Any) -> bool:
    return str(a).strip().lower() == str(b).strip().lower()


def check_fill_allowed(
    field_label: str, value: Any, mappings: dict[str, dict], answers: dict[str, str]
) -> tuple[bool, str]:
    """May `value` be written into the form field called `field_label`?

    Only two sources are trusted:
      1. a value the student typed in themselves (answers), or
      2. a verified profile value that the deterministic mapping engine
         classified as auto_fill for exactly this label.
    Anything else — including a value the model made up — is refused.
    """
    if field_label in answers and _same(value, answers[field_label]):
        return True, "student-provided answer"
    mapping = mappings.get(field_label)
    if mapping is None:
        return False, f"'{field_label}' has not been through map_form_field yet."
    if mapping["risk"] == RiskLevel.HIGH.value or mapping["action"] == "ask_student":
        return False, f"'{field_label}' needs the student's own answer (request_student_input)."
    if mapping["action"] == "propose_and_confirm":
        return False, f"'{field_label}' must be confirmed by the student first (request_student_input)."
    if mapping["action"] == "auto_fill" and _same(value, mapping.get("value")):
        return True, "verified profile value"
    return False, f"Value does not match the verified profile value for '{field_label}'."
