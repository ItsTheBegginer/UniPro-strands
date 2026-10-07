"""
Student profile tools.

Every usable value carries its own verification state:

    "gpa": {"value": 8.7, "verified": true}

A field is in exactly one of three states: verified (safe to submit),
unverified (has a value but the student hasn't confirmed it), or missing
(no value). The agent can read the profile but can NEVER mark anything
verified — only a student action (`student_confirm_field`, called by the
CLI/API, not exposed as a tool) can do that.

Storage is a local JSON file for now; a DynamoDB backend (Phase 16) only
needs to replace `load_profile` / `save_profile`.
"""
from __future__ import annotations

import json
import os
from pathlib import Path
from typing import Any

from strands import tool

_DEFAULT_PATH = Path(__file__).resolve().parent.parent / "data" / "student_profile.json"
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent


def _profile_path() -> Path:
    return Path(os.getenv("UNIPRO_PROFILE_PATH", str(_DEFAULT_PATH)))


def load_profile() -> dict[str, Any]:
    path = _profile_path()
    if not path.exists():
        raise FileNotFoundError(f"No student profile at {path}. Run scripts/seed_demo_profile.py.")
    return json.loads(path.read_text())


def save_profile(profile: dict[str, Any]) -> None:
    path = _profile_path()
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(profile, indent=2))


def is_field(entry: Any) -> bool:
    return isinstance(entry, dict) and "value" in entry


def _has_value(value: Any) -> bool:
    return value not in (None, "", [], {})


def field_state(entry: dict[str, Any] | None) -> str:
    """'verified' | 'unverified' | 'missing'."""
    if not entry or not _has_value(entry.get("value")):
        return "missing"
    return "verified" if entry.get("verified") is True else "unverified"


def verified_values(profile: dict[str, Any]) -> dict[str, Any]:
    return {k: e["value"] for k, e in profile.items() if is_field(e) and field_state(e) == "verified"}


def verification_status(profile: dict[str, Any]) -> dict[str, list[str]]:
    out: dict[str, list[str]] = {"verified": [], "unverified": [], "missing": []}
    for key, entry in profile.items():
        if is_field(entry):
            out[field_state(entry)].append(key)
    return out


def resolve_source(profile: dict[str, Any], source: str) -> tuple[Any, str]:
    """Resolve a dotted profile path like 'education.degree' or 'test_scores.SAT'.

    Returns (value, state). Verification state is the state of the top-level
    field the path lives in. Nothing is ever invented: a path that doesn't
    resolve is reported as (None, 'missing').
    """
    key, *rest = source.split(".")
    entry = profile.get(key)
    if not is_field(entry):
        return None, "missing"
    value = entry["value"]
    for part in rest:
        if isinstance(value, list):
            value = value[0] if value else None
        if isinstance(value, dict):
            value = value.get(part)
        else:
            value = None
        if value is None:
            break
    state = field_state(entry) if _has_value(value) else "missing"
    return value, state


def resolve_document_path(doc_type: str) -> str | None:
    """Absolute path of a VERIFIED profile document, or None."""
    profile = load_profile()
    docs = profile.get("documents")
    if field_state(docs) != "verified":
        return None
    rel = docs["value"].get(doc_type)
    if not rel:
        return None
    path = Path(rel)
    if not path.is_absolute():
        path = PROJECT_ROOT / path
    return str(path) if path.exists() else None


def student_confirm_field(field: str, value: Any = None) -> dict[str, Any]:
    """STUDENT ACTION (not an agent tool): confirm/replace a field and mark it verified."""
    profile = load_profile()
    entry = profile.get(field) if is_field(profile.get(field)) else {"value": None}
    if value is not None:
        entry["value"] = value
    if not _has_value(entry.get("value")):
        raise ValueError(f"Cannot verify '{field}': it has no value.")
    entry["verified"] = True
    entry["source"] = "student"
    profile[field] = entry
    save_profile(profile)
    return {"field": field, "verified": True}


# --------------------------------------------------------------------- tools
@tool
def get_student_profile() -> dict[str, Any]:
    """Return the full student profile with per-field verification state.

    Each field looks like {"value": ..., "verified": true|false}. The
    "verification_status" key lists which fields are verified, unverified
    (value exists but the student hasn't confirmed it), or missing.
    Only verified values may ever be used to fill an application.
    """
    from app.tools.state import record

    profile = load_profile()
    record("profile_loaded", fields=len([k for k, e in profile.items() if is_field(e)]))
    return {**profile, "verification_status": verification_status(profile)}


@tool
def get_verified_information() -> dict[str, Any]:
    """Return ONLY the verified profile values, as {field: value}.

    Use this to answer questions like "what is the student's GPA?". If a
    value is not in this result, it is unverified or missing — never guess
    it; report it as missing/needs confirmation instead.
    """
    return verified_values(load_profile())


@tool
def update_student_profile(field: str, value: str) -> dict[str, Any]:
    """Record a value the agent inferred for a profile field (never verified).

    The value is stored as UNVERIFIED and will not be auto-filled anywhere
    until the student confirms it. This tool cannot mark a field verified.

    Args:
        field: Profile field name.
        value: The inferred value.
    """
    profile = load_profile()
    profile[field] = {"value": value, "verified": False, "source": "ai_extracted"}
    save_profile(profile)
    return {"field": field, "value": value, "verified": False}
