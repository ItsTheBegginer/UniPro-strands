"""
Scripted end-to-end run: the real tools + real Chromium + the demo portal, with
a deterministic script standing in for the LLM's decisions. This verifies every
component and safety gate EXCEPT the model's own choices (see scripts/check_gemini.py).
"""
import functools
import http.server
import threading
from pathlib import Path

import pytest

from app.agent import runner
from app.state_machine.states import ApplicationState as S
from app.tools import state
from app.tools.approval import request_final_approval, request_student_input
from app.tools.browser import (click_button, close_browser, detect_captcha, fill_field, inspect_page,
                               open_page, select_option, upload_document)
from app.tools.mapping import map_form_field
from app.tools.profile import get_verified_information, load_profile, save_profile
from app.tools.requirements import check_university_requirements

PORTAL = Path(__file__).resolve().parent.parent / "demo_university"
_server = {}


def portal_url(monkeypatch) -> str:
    if "url" not in _server:
        class Quiet(http.server.SimpleHTTPRequestHandler):
            def log_message(self, *a, **k):
                pass

        handler = functools.partial(Quiet, directory=str(PORTAL))
        srv = http.server.ThreadingHTTPServer(("127.0.0.1", 0), handler)
        threading.Thread(target=srv.serve_forever, daemon=True).start()
        _server["url"] = f"http://127.0.0.1:{srv.server_address[1]}"
    monkeypatch.setenv("DEMO_UNIVERSITY_URL", _server["url"])
    monkeypatch.setenv("BROWSER_HEADLESS", "true")
    return _server["url"]


def new_app(app_id="t1"):
    state.create_session(app_id, "Demo University", "Computer Science")
    s = state.activate(app_id)
    state.transition(S.PREPARING)
    state.record("application_started")
    return s


def clean(label):
    return label.rstrip(" *").strip()


def do_page():
    """What a well-behaved agent does on one page. Returns the paused field label, or None."""
    for f in inspect_page()["fields"]:
        label = clean(f["label"])
        if f["type"] == "file":
            assert upload_document(f["selector"], label.split()[0].lower())["status"] == "ok"
            continue
        m = map_form_field(label)
        tool = select_option if f["type"] in ("radio_group", "select") else fill_field
        if m["action"] == "auto_fill":
            assert tool(f["selector"], str(m["value"]), label)["status"] == "ok", label
            continue
        r = request_student_input(label, label, "needs the student", m.get("value") or "")
        if r["status"] == "paused":
            return label
        assert tool(f["selector"], r["answer"], label)["status"] == "ok", label
    return None


def stub_agent(monkeypatch):
    prompts = []
    monkeypatch.setattr(runner, "_run_agent", lambda app_id, prompt: (prompts.append(prompt), runner.status(app_id))[1])
    return prompts


def test_full_flow_pause_resume_approval_submit(monkeypatch):
    base = portal_url(monkeypatch)
    prompts = stub_agent(monkeypatch)
    try:
        s = new_app()
        req = check_university_requirements("Demo University", "Computer Science")
        assert s.state == S.READY_TO_RUN
        assert open_page(req["application_url"])["status"] == "ok" and s.state == S.RUNNING

        assert do_page() is None                                     # login: email auto-filled
        click_button("#save-continue")
        click_button("#start-link")
        for _ in range(3):                                           # personal-info, education, documents
            assert do_page() is None
            assert click_button("#save-continue")["status"] == "ok"

        # questions page: statement is only an unverified AI draft -> agent must ask
        assert do_page() == "Personal statement"
        assert s.state == S.STUDENT_ACTION_REQUIRED and s.pending["proposed_answer"]
        assert fill_field("#statement", "x", "Personal statement")["status"] == "blocked"   # frozen while paused

        assert runner.provide_answer("t1", "")["error"]                                    # invalid response rejected
        assert runner.provide_answer("t1", "I love building software.")["state"] == "running"
        assert "responded" in prompts[-1]
        assert get_verified_information()["personal_statement"] == "I love building software."

        s = state.activate("t1")
        assert do_page() == "Have you ever been subject to disciplinary action?"
        assert s.pending["proposed_answer"] == ""                                          # HIGH risk: never proposed
        runner.provide_answer("t1", "no")

        s = state.activate("t1")
        assert do_page() is None
        assert click_button("#save-continue")["status"] == "ok"

        # agent has no way to submit: final button is refused, approval is a separate step
        assert click_button("#final-submit")["status"] == "blocked"
        assert runner.approve_and_submit("t1")["error"]                                    # still RUNNING -> refused
        s = state.activate("t1")
        r = request_final_approval(); assert r["status"] == "awaiting_final_approval", r
        assert s.state == S.AWAITING_FINAL_APPROVAL

        out = runner.approve_and_submit("t1")
        assert out["state"] == "submitted"
        timeline = "\n".join(runner.format_timeline("t1"))
        for expected in ("Application started", "Requirements checked", "Filled: Full name",
                         "Uploaded: transcript", "Human approval requested", "Student responded",
                         "Agent resumed", "Final review ready", "Student approved", "Application submitted"):
            assert expected in timeline, expected
    finally:
        state.activate("t1") if state.store().exists("t1") else None
        close_browser()


def test_agent_cannot_invent_values_or_documents(monkeypatch):
    base = portal_url(monkeypatch)
    try:
        s = new_app("t2")
        req = check_university_requirements("Demo University", "Computer Science")
        open_page(req["application_url"] .replace("login", "education"))
        map_form_field("Undergraduate GPA")
        assert fill_field("#gpa", "9.9", "Undergraduate GPA")["status"] == "refused"      # invented value
        assert fill_field("#gpa", "8.7", "Never mapped label")["status"] == "refused"
        map_form_field("Have you ever been subject to disciplinary action?")
        assert fill_field("#gpa", "no", "Have you ever been subject to disciplinary action?")["status"] == "refused"
        open_page(base + "/documents.html")
        assert upload_document("#resume", "passport")["status"] == "refused"               # no such document
        assert upload_document("#resume", "resume")["status"] == "ok"
        p = load_profile(); p["documents"]["verified"] = False; save_profile(p)
        assert upload_document("#transcript", "transcript")["status"] == "refused"         # unverified docs never used
        assert request_final_approval()["status"] == "not_ready"                           # nothing filled yet
        assert s.state == S.RUNNING
    finally:
        close_browser()


def test_missing_information_blocks_the_browser(monkeypatch):
    portal_url(monkeypatch)
    try:
        p = load_profile(); del p["documents"]["value"]["resume"]; save_profile(p)
        s = new_app("t3")
        out = check_university_requirements("Demo University", "Computer Science")
        assert s.state == S.MISSING_INFORMATION and out["blocking_missing"] == ["resume"]
        assert open_page(out["application_url"])["status"] == "blocked"
    finally:
        close_browser()


def test_captcha_is_never_bypassed_and_pauses_the_run(monkeypatch):
    base = portal_url(monkeypatch)
    try:
        s = new_app("t4")
        check_university_requirements("Demo University", "Computer Science")
        open_page(base + "/login.html?challenge=captcha")
        assert detect_captcha()["captcha_detected"] is True
        assert s.state == S.STUDENT_ACTION_REQUIRED and s.pending["field_label"] == "captcha"
    finally:
        close_browser()


def test_hook_gate_denies_forbidden_tools_and_logs_calls():
    from app.agent.interventions import UniProApprovalGate

    class Ev:
        def __init__(self, name): self.tool_use = {"name": name, "input": {}}; self.cancel_tool = None

    new_app("t5")
    gate = UniProApprovalGate()
    bad, ok = Ev("submit_application"), Ev("get_verified_information")
    gate._before_tool_call(bad)
    gate._before_tool_call(ok)
    assert bad.cancel_tool and "disabled" in bad.cancel_tool and ok.cancel_tool is None
    assert [t["tool"] for t in state.active_session().trace] == ["submit_application", "get_verified_information"]
