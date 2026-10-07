"""
Application runner (Phases 11-14): starts, pauses, resumes and finishes an
application. This is the layer the CLI, the FastAPI backend and (later) the
SQS worker all call — none of them touch the agent directly.

  start_application()  -> agent runs until it finishes or needs the student
  provide_answer()     -> student answers a pending question, agent resumes
  approve_and_submit() -> STUDENT-triggered final submission (agent can't do this)
  request_changes()    -> student sends the application back for edits
  retry()              -> recover a FAILED application

Every function persists state before returning, so a stopped process can
pick the application up again from disk.
"""
from __future__ import annotations

import uuid
from typing import Any

from app.state_machine.states import ApplicationState as S
from app.tools import state
from app.tools.browser import get_browser
from app.tools.mapping import match_source
from app.tools.profile import student_confirm_field

MAX_ANSWER_LEN = 5000


def _new_id() -> str:
    return f"app-{uuid.uuid4().hex[:8]}"


def status(application_id: str) -> dict[str, Any]:
    s = state.store().load(application_id)
    return {
        "application_id": application_id,
        "university": s.university,
        "program": s.program,
        "state": s.state.value,
        "pending": s.pending,
        "filled": sorted(s.filled),
        "uploaded": sorted(s.uploaded),
        "failure": s.failure,
    }

def list_applications() -> list[dict[str, Any]]:
    """Summary of every known application, newest-ish first (by id)."""
    out = []
    for app_id in reversed(state.store().list_ids()):
        try:
            out.append(status(app_id))
        except Exception:  # noqa: BLE001 - a corrupt/partial file shouldn't break the list
            continue
    return out
def format_timeline(application_id: str) -> list[str]:
    """Human-readable audit trail, e.g. '10:31  Requirements checked'."""
    labels = {
        "application_started": "Application started",
        "profile_loaded": "Profile loaded",
        "requirements_checked": "Requirements checked",
        "field_mapped": "Field mapped: {field} ({action}, {risk} risk)",
        "page_opened": "Browser opened {url}",
        "field_filled": "Filled: {field}",
        "document_uploaded": "Uploaded: {document}",
        "button_clicked": "Continued to next step",
        "question_encountered": "Question encountered: {field}",
        "human_approval_requested": "Human approval requested: {field}",
        "student_responded": "Student responded: {field}",
        "agent_resumed": "Agent resumed",
        "final_review_ready": "Final review ready",
        "student_approved": "Student approved final submission",
        "application_submitted": "Application submitted ({confirmation})",
        "fill_refused": "Blocked a fill: {field} — {reason}",
        "upload_refused": "Blocked an upload: {document}",
        "captcha_detected": "CAPTCHA detected — waiting for the student",
        "otp_detected": "OTP prompt detected — waiting for the student",
        "browser_error": "Browser error in {action}: {error}",
        "run_failed": "Run failed: {error}",
        "student_requested_changes": "Student requested changes: {note}",
    }
    lines = []
    for e in state.store().load(application_id).audit:
        if e["event"] == "state_changed":
            text = f"State -> {e['detail']['state']}"
        else:
            template = labels.get(e["event"], e["event"])
            try:
                text = template.format(**{**{"field": "", "action": "", "risk": ""}, **e["detail"]})
            except KeyError:
                text = template
        lines.append(f"{e['timestamp'][11:16]}  {text}")
    return lines


def _resume_brief(s: state.ApplicationSession) -> str:
    return (
        f"Application {s.application_id} for {s.university} / {s.program} is in state '{s.state.value}'.\n"
        f"Already filled: {sorted(s.filled) or 'nothing'}. Already uploaded: {sorted(s.uploaded) or 'nothing'}.\n"
        f"Student answers on record: {s.answers or 'none'}.\n"
        f"Last known browser page: {s.current_url or 'none'} — call read_page / inspect_page to see where "
        "the browser is now; if the browser is not on the portal, open_page(last known page)."
    )


def _run_agent(application_id: str, prompt: str) -> dict[str, Any]:
    """Run the Strands agent once; convert crashes into a controlled FAILED state."""
    from app.agent.unipro_agent import build_agent  # lazy: keeps this module importable without a model

    s = state.activate(application_id)
    message = ""
    try:
        message = str(build_agent()(prompt))
    except Exception as exc:  # noqa: BLE001 - recovery boundary
        s = state.active_session()
        s.failure = f"{type(exc).__name__}: {exc}"
        state.save_active()
        state.record("run_failed", error=s.failure)
        if s.sm.can_transition(S.FAILED):
            state.transition(S.FAILED, note=s.failure[:120])
    finally:
        out = status(application_id)
        state.deactivate()
    return {**out, "agent_message": message}


def start_application(university: str, program: str, application_id: str | None = None,
                      request: str | None = None) -> dict[str, Any]:
    application_id = application_id or _new_id()
    state.create_session(application_id, university, program)
    state.activate(application_id)
    state.transition(S.PREPARING)
    state.record("application_started", university=university, program=program)
    state.deactivate()
    return _run_agent(application_id, request or f"Prepare my application for {university} {program}.")


def provide_answer(application_id: str, answer: str) -> dict[str, Any]:
    """Student answers the pending question (or confirms a CAPTCHA/OTP was handled)."""
    s = state.activate(application_id)
    try:
        if s.state != S.STUDENT_ACTION_REQUIRED or not s.pending:
            return {**status(application_id), "error": "No student action is pending for this application."}
        answer = (answer or "").strip()
        if not answer:
            return {**status(application_id), "error": "An answer is required."}
        if len(answer) > MAX_ANSWER_LEN:
            return {**status(application_id), "error": f"Answer too long (max {MAX_ANSWER_LEN} characters)."}

        label, is_challenge = s.pending["field_label"], s.pending["field_label"] in ("captcha", "otp")
        if not is_challenge:
            s.answers[label] = answer
            source, _ = match_source(label)
            # A student-supplied answer to a safe, simple profile field becomes verified profile data.
            if source and "." not in source and s.pending.get("risk") != "high":
                student_confirm_field(source, answer)
        s.pending = None
        state.save_active()
        state.record("student_responded", field=label)
        state.transition(S.RUNNING, note="student responded")
        state.record("agent_resumed")
        prompt = (
            f"The student has responded to '{label}'. "
            + ("They completed the challenge manually. " if is_challenge else "Their answer is stored; ")
            + "Continue the application from where you left off.\n" + _resume_brief(s)
        )
    finally:
        state.deactivate()
    return _run_agent(application_id, prompt)


def approve_and_submit(application_id: str) -> dict[str, Any]:
    """STUDENT-TRIGGERED final submission. Not reachable by the agent."""
    s = state.activate(application_id)
    try:
        if s.state != S.AWAITING_FINAL_APPROVAL:
            return {**status(application_id), "error": f"Cannot submit while '{s.state.value}'."}
        s.submit_approved = True
        state.save_active()
        state.record("student_approved")
        state.transition(S.SUBMITTING)
        review_url = ((s.requirements or {}).get("application_url") or "").replace("login.html", "review.html")
        b = get_browser()
        try:
            if review_url:
                b.run(b.open_page, review_url)
            result = b.run(b.click_final_submit)
            if "submitted" not in result["url"]:
                raise RuntimeError(f"Portal did not confirm submission: {result['text'][:200]}")
            state.record("application_submitted", confirmation=result["text"].split("Confirmation number:")[-1].strip()[:20])
            state.transition(S.SUBMITTED)
        except Exception as exc:  # noqa: BLE001
            s.failure = f"{type(exc).__name__}: {exc}"
            state.save_active()
            state.record("run_failed", error=s.failure)
            state.transition(S.FAILED, note="submission failed")
        return status(application_id)
    finally:
        state.deactivate()


def request_changes(application_id: str, note: str) -> dict[str, Any]:
    s = state.activate(application_id)
    try:
        if s.state != S.AWAITING_FINAL_APPROVAL:
            return {**status(application_id), "error": f"Cannot request changes while '{s.state.value}'."}
        state.record("student_requested_changes", note=note)
        state.transition(S.RUNNING, note="changes requested")
        prompt = f"The student reviewed the application and asked for changes: {note}\n{_resume_brief(s)}"
    finally:
        state.deactivate()
    return _run_agent(application_id, prompt)


def retry(application_id: str) -> dict[str, Any]:
    """Recover a FAILED application (Phase 19): back to RUNNING, or restart preparation."""
    s = state.activate(application_id)
    try:
        if s.state != S.FAILED:
            return {**status(application_id), "error": "Only failed applications can be retried."}
        target = S.RUNNING if s.requirements and s.current_url else S.PREPARING
        s.failure = None
        state.save_active()
        state.transition(target, note="retry")
        state.record("agent_resumed")
        prompt = f"Retry after a failure.\n{_resume_brief(s)}"
    finally:
        state.deactivate()
    return _run_agent(application_id, prompt)

def nudge(application_id: str) -> dict[str, Any]:
    s = state.activate(application_id)
    try:
        if s.state != S.RUNNING:
            return {**status(application_id), "error": f"Cannot continue while '{s.state.value}'."}
        prompt = f"Continue the application from where you left off.\n{_resume_brief(s)}"
    finally:
        state.deactivate()
    return _run_agent(application_id, prompt)