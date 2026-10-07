"""
Application-level state machine — the single source of truth for "where is
this application right now?".

The LLM can never change state directly. State only moves when deterministic
code (tools, the runner, or a student action) calls `transition()`, and every
move is validated against `_ALLOWED_TRANSITIONS`.
"""
from __future__ import annotations

from dataclasses import dataclass, field
from datetime import datetime, timezone
from enum import Enum


class ApplicationState(str, Enum):
    DRAFT = "draft"
    PREPARING = "preparing"
    REQUIREMENTS_CHECK = "requirements_check"
    MISSING_INFORMATION = "missing_information"
    READY_TO_RUN = "ready_to_run"
    RUNNING = "running"
    STUDENT_ACTION_REQUIRED = "student_action_required"
    READY_TO_SUBMIT = "ready_to_submit"
    AWAITING_FINAL_APPROVAL = "awaiting_final_approval"
    SUBMITTING = "submitting"
    SUBMITTED = "submitted"
    FAILED = "failed"


S = ApplicationState
_ALLOWED_TRANSITIONS: dict[ApplicationState, set[ApplicationState]] = {
    S.DRAFT: {S.PREPARING},
    S.PREPARING: {S.REQUIREMENTS_CHECK, S.FAILED},
    S.REQUIREMENTS_CHECK: {S.MISSING_INFORMATION, S.READY_TO_RUN, S.FAILED},
    S.MISSING_INFORMATION: {S.REQUIREMENTS_CHECK, S.FAILED},
    S.READY_TO_RUN: {S.RUNNING, S.FAILED},
    S.RUNNING: {S.STUDENT_ACTION_REQUIRED, S.READY_TO_SUBMIT, S.FAILED},
    S.STUDENT_ACTION_REQUIRED: {S.RUNNING, S.FAILED},
    S.READY_TO_SUBMIT: {S.AWAITING_FINAL_APPROVAL, S.FAILED},
    # RUNNING again = the student asked for changes instead of approving.
    S.AWAITING_FINAL_APPROVAL: {S.SUBMITTING, S.RUNNING, S.FAILED},
    S.SUBMITTING: {S.SUBMITTED, S.FAILED},
    S.SUBMITTED: set(),
    # Recovery paths (Phase 19): retry the run, or restart preparation.
    S.FAILED: {S.RUNNING, S.PREPARING},
}


class InvalidTransition(Exception):
    pass


@dataclass
class ActivityEntry:
    timestamp: str
    message: str


@dataclass
class ApplicationStateMachine:
    application_id: str
    state: ApplicationState = ApplicationState.DRAFT
    activity_log: list[ActivityEntry] = field(default_factory=list)

    def can_transition(self, new_state: ApplicationState) -> bool:
        return new_state in _ALLOWED_TRANSITIONS.get(self.state, set())

    def transition(self, new_state: ApplicationState, note: str = "") -> None:
        if not self.can_transition(new_state):
            allowed = _ALLOWED_TRANSITIONS.get(self.state, set())
            raise InvalidTransition(
                f"Cannot go from {self.state.value} to {new_state.value}. "
                f"Allowed: {sorted(s.value for s in allowed)}"
            )
        self._log(f"{self.state.value} -> {new_state.value}" + (f" ({note})" if note else ""))
        self.state = new_state

    def _log(self, message: str) -> None:
        self.activity_log.append(
            ActivityEntry(timestamp=datetime.now(timezone.utc).isoformat(), message=message)
        )

    def to_dict(self) -> dict:
        return {
            "application_id": self.application_id,
            "state": self.state.value,
            "activity_log": [vars(e) for e in self.activity_log],
        }

    @classmethod
    def from_dict(cls, data: dict) -> "ApplicationStateMachine":
        sm = cls(application_id=data["application_id"], state=ApplicationState(data["state"]))
        sm.activity_log = [ActivityEntry(**e) for e in data.get("activity_log", [])]
        return sm
