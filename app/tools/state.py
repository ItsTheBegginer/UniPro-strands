"""
Application session store + audit trail (Phases 6 and 14).

An ApplicationSession bundles everything about one application run:
the state machine (single source of truth for progress), the audit trail,
every field mapping/fill/upload, the student's answers, and any pending
approval. It is persisted after every mutation, so a run can stop (waiting
for the student, crashing, or a worker restart) and resume from disk.

Storage is a JSON file per application. `SessionStore` is the only class
that touches disk, so swapping in DynamoDB (Phase 16) means implementing
`load`/`save` for `unipro-applications` and `unipro-activity`.
"""
from __future__ import annotations

import json
import os
from dataclasses import dataclass, field
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

from app.state_machine.states import (
    ApplicationState,
    ApplicationStateMachine,
    InvalidTransition,
)

_DEFAULT_DIR = Path(__file__).resolve().parent.parent / "data" / "runs"


def _now() -> str:
    return datetime.now(timezone.utc).isoformat()


@dataclass
class ApplicationSession:
    application_id: str
    university: str = ""
    program: str = ""
    sm: ApplicationStateMachine = None  # type: ignore[assignment]
    audit: list[dict[str, Any]] = field(default_factory=list)   # human-readable timeline
    trace: list[dict[str, Any]] = field(default_factory=list)   # agent tool-call timeline
    requirements: dict[str, Any] | None = None
    mappings: dict[str, dict] = field(default_factory=dict)     # field label -> mapping result
    filled: dict[str, dict] = field(default_factory=dict)       # field label -> {source, ...}
    uploaded: dict[str, str] = field(default_factory=dict)      # doc type -> path
    answers: dict[str, str] = field(default_factory=dict)       # question label -> student answer
    pending: dict[str, Any] | None = None                       # approval awaiting the student
    submit_approved: bool = False
    current_url: str = ""
    failure: str | None = None

    def __post_init__(self):
        if self.sm is None:
            self.sm = ApplicationStateMachine(application_id=self.application_id)

    @property
    def state(self) -> ApplicationState:
        return self.sm.state

    def to_dict(self) -> dict[str, Any]:
        d = {k: v for k, v in self.__dict__.items() if k != "sm"}
        d["sm"] = self.sm.to_dict()
        return d

    @classmethod
    def from_dict(cls, data: dict[str, Any]) -> "ApplicationSession":
        data = dict(data)
        sm = ApplicationStateMachine.from_dict(data.pop("sm"))
        return cls(sm=sm, **data)


class FileSessionStore:
    def __init__(self, base_dir: Path | None = None):
        self.base_dir = Path(base_dir or os.getenv("UNIPRO_RUNS_DIR", _DEFAULT_DIR))

    def _path(self, application_id: str) -> Path:
        return self.base_dir / f"{application_id}.json"

    def exists(self, application_id: str) -> bool:
        return self._path(application_id).exists()

    def list_ids(self) -> list[str]:
        if not self.base_dir.exists():
            return []
        return sorted(p.stem for p in self.base_dir.glob("*.json"))

    def load(self, application_id: str) -> ApplicationSession:
        path = self._path(application_id)
        if not path.exists():
            raise FileNotFoundError(f"Application session {application_id} not found at {path}")
        return ApplicationSession.from_dict(json.loads(path.read_text()))

    def save(self, session: ApplicationSession) -> None:
        self.base_dir.mkdir(parents=True, exist_ok=True)
        self._path(session.application_id).write_text(json.dumps(session.to_dict(), indent=2, default=str))


# Backward compatibility alias
SessionStore = FileSessionStore


class DynamoDBSessionStore:
    """DynamoDB-backed session store (Phase 16).
    
    Stores session metadata in unipro-applications and audit events in unipro-activity.
    Falls back safely to local FileSessionStore if DynamoDB is unreachable or access is denied.
    """
    def __init__(self, table_name: str = "unipro-applications", activity_table: str = "unipro-activity"):
        self.table_name = os.getenv("DYNAMODB_TABLE_APPLICATIONS", table_name)
        self.activity_table = os.getenv("DYNAMODB_TABLE_ACTIVITY", activity_table)
        self.region = os.getenv("AWS_REGION", "us-east-1")
        self._fallback = FileSessionStore()
        self._client = None

    def _get_client(self):
        if self._client is None:
            import boto3
            self._client = boto3.client("dynamodb", region_name=self.region)
        return self._client

    def exists(self, application_id: str) -> bool:
        try:
            client = self._get_client()
            resp = client.get_item(
                TableName=self.table_name,
                Key={"application_id": {"S": application_id}},
                ProjectionExpression="application_id"
            )
            if "Item" in resp:
                return True
        except Exception:
            pass
        return self._fallback.exists(application_id)

    def list_ids(self) -> list[str]:
        dynamo_ids = []
        try:
            client = self._get_client()
            resp = client.scan(
                TableName=self.table_name,
                ProjectionExpression="application_id"
            )
            dynamo_ids = [it["application_id"]["S"] for it in resp.get("Items", []) if "application_id" in it]
        except Exception:
            pass
        local_ids = self._fallback.list_ids()
        return sorted(set(dynamo_ids + local_ids))

    def load(self, application_id: str) -> ApplicationSession:
        try:
            client = self._get_client()
            resp = client.get_item(
                TableName=self.table_name,
                Key={"application_id": {"S": application_id}}
            )
            if "Item" in resp and "session_json" in resp["Item"]:
                data = json.loads(resp["Item"]["session_json"]["S"])
                return ApplicationSession.from_dict(data)
        except Exception:
            pass
        return self._fallback.load(application_id)

    def save(self, session: ApplicationSession) -> None:
        # Always persist locally first to guarantee state durability
        self._fallback.save(session)
        try:
            client = self._get_client()
            session_dict = session.to_dict()
            client.put_item(
                TableName=self.table_name,
                Item={
                    "application_id": {"S": session.application_id},
                    "university": {"S": session.university},
                    "program": {"S": session.program},
                    "state": {"S": session.state.value},
                    "session_json": {"S": json.dumps(session_dict, default=str)},
                    "updated_at": {"S": _now()}
                }
            )
            if session.audit:
                latest = session.audit[-1]
                client.put_item(
                    TableName=self.activity_table,
                    Item={
                        "application_id": {"S": session.application_id},
                        "timestamp": {"S": latest.get("timestamp", _now())},
                        "event": {"S": latest.get("event", "unknown")},
                        "detail": {"S": json.dumps(latest.get("detail", {}), default=str)}
                    }
                )
        except Exception:
            # DynamoDB write failed; local backup is already saved
            pass


def store():
    backend = os.getenv("STORAGE_BACKEND", "file").strip().lower()
    if backend == "dynamodb":
        return DynamoDBSessionStore()
    return FileSessionStore()


# ------------------------------------------------ active application context
# The runner sets which application the tools are currently working on. One
# run per process (one worker per job) is the deployment model, so a plain
# module global is safe and, unlike a ContextVar, survives Strands running
# tools on worker threads.
_ACTIVE: ApplicationSession | None = None


def create_session(application_id: str, university: str, program: str) -> ApplicationSession:
    session = ApplicationSession(application_id=application_id, university=university, program=program)
    store().save(session)
    return session


def activate(application_id: str) -> ApplicationSession:
    global _ACTIVE
    _ACTIVE = store().load(application_id)
    return _ACTIVE


def deactivate() -> None:
    global _ACTIVE
    _ACTIVE = None


def active_session() -> ApplicationSession | None:
    return _ACTIVE


def save_active() -> None:
    if _ACTIVE is not None:
        store().save(_ACTIVE)


# ------------------------------------------------------------- audit trail
def record(event: str, **detail: Any) -> None:
    """Append to the audit trail (no-op when no application is active)."""
    s = _ACTIVE
    if s is None:
        return
    s.audit.append({"timestamp": _now(), "event": event, "detail": detail})
    save_active()


def record_tool_call(tool_name: str, tool_input: dict[str, Any]) -> None:
    s = _ACTIVE
    if s is None:
        return
    s.trace.append({"timestamp": _now(), "tool": tool_name, "input": tool_input})
    save_active()


def transition(target: ApplicationState, note: str = "") -> bool:
    """Controlled state change. Returns False (and audits it) if not allowed."""
    s = _ACTIVE
    if s is None:
        return True
    try:
        s.sm.transition(target, note)
    except InvalidTransition as exc:
        record("transition_rejected", target=target.value, reason=str(exc))
        return False
    record("state_changed", state=target.value, note=note)
    return True


def blocked_unless(allowed: set[ApplicationState], action: str) -> dict[str, Any] | None:
    """Return an error dict if `action` isn't legal in the current state."""
    s = _ACTIVE
    if s is None or s.state in allowed:
        return None
    return {
        "status": "blocked",
        "error": (
            f"Cannot {action} while the application is '{s.state.value}'. "
            "Only the current workflow step is allowed; do not retry — end your turn "
            "and report status to the student."
        ),
    }
