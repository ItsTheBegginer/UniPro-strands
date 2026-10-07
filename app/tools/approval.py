"""
Human-in-the-loop tools (Phases 8, 12, 13).

Two agent-facing tools:

* request_student_input  -- pause and ask the student (HIGH/MEDIUM risk items).
* request_final_approval -- declare the application ready for final review.

Neither can submit anything. Final submission is a student-triggered runner
action (app/agent/runner.py: approve_and_submit); the agent has no way to
call it, which is a stronger guarantee than a prompt rule.
"""
from __future__ import annotations

from typing import Any

from strands import tool

from app.agent.policies import RiskLevel, classify_field
from app.state_machine.states import ApplicationState as S
from app.tools import state
from app.tools.state import ApplicationSession  # noqa: F401


def unresolved_items(session: ApplicationSession) -> list[str]:
    """Everything that still blocks final review (pure, unit-testable)."""
    problems: list[str] = []
    req = session.requirements or {}

    covered = {m["source"].removeprefix("student_profile.").split(".")[0]
               for label, m in session.mappings.items()
               if label in session.filled and m.get("source")}
    for key in req.get("required_fields", []):
        if key not in covered:
            problems.append(f"required field '{key}' has not been filled")

    for doc in req.get("required_documents", []):
        if doc != "personal_statement" and doc not in session.uploaded:
            problems.append(f"required document '{doc}' has not been uploaded")

    for label, m in session.mappings.items():
        if m["action"] != "auto_fill" and label not in session.filled:
            problems.append(f"'{label}' still needs the student's answer to be entered")

    if session.pending:
        problems.append("a student decision is still pending")
    return problems


@tool
def request_student_input(
    question: str, field_label: str, reason: str, proposed_answer: str = ""
) -> dict[str, Any]:
    """Pause the run and ask the student for an answer or a decision.

    Use for every field where map_form_field returned "ask_student" or
    "propose_and_confirm". After this returns status "paused", END YOUR TURN
    immediately: the application is now waiting on the student and all
    browser actions are blocked until they answer. If the student already
    answered this field, the stored answer is returned instead.

    Args:
        question: The exact question/field text to show the student.
        field_label: The same label you passed to map_form_field.
        reason: Why the student is being asked (one sentence).
        proposed_answer: A suggested answer for MEDIUM-risk items only. Ignored
            (and dropped) for HIGH-risk items such as disciplinary or legal questions.
    """
    s = state.active_session()
    risk = classify_field(field_label, question)
    proposal = "" if risk == RiskLevel.HIGH else (proposed_answer or "")

    if s is not None and field_label in s.answers:
        return {"status": "answered", "field_label": field_label, "answer": s.answers[field_label]}

    if s is not None:
        blocked = state.blocked_unless({S.RUNNING}, "ask the student a question")
        if blocked:
            return blocked
        s.pending = {
            "field_label": field_label, "question": question, "reason": reason,
            "proposed_answer": proposal, "risk": risk.value,
        }
        state.save_active()
        state.record("question_encountered", field=field_label, risk=risk.value)
        state.transition(S.STUDENT_ACTION_REQUIRED, note=field_label)
        state.record("human_approval_requested", field=field_label, question=question)
    return {
        "status": "paused",
        "message": "STOP. The student has been asked; end your turn now. UniPro will resume you with their answer.",
    }


@tool
def request_final_approval() -> dict[str, Any]:
    """Declare that every field is filled and ask the student for final review.

    This is NOT submission. It verifies (deterministically) that all required
    fields/documents were filled and no decision is pending, then moves the
    application to AWAITING_FINAL_APPROVAL. If something is unresolved it
    returns the list — fix those first. After success, end your turn.
    """
    s = state.active_session()
    if s is None:
        return {"status": "error", "error": "No active application."}
    blocked = state.blocked_unless({S.RUNNING}, "request final approval")
    if blocked:
        return blocked
    problems = unresolved_items(s)
    if problems:
        return {"status": "not_ready", "unresolved": problems}
    state.transition(S.READY_TO_SUBMIT)
    state.record("final_review_ready")
    state.transition(S.AWAITING_FINAL_APPROVAL)
    return {
        "status": "awaiting_final_approval",
        "message": "The application is ready. The student must review and submit it themselves. End your turn.",
    }
