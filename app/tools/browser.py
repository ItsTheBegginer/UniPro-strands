"""
Browser tools backed by Playwright (Phase 10).

The LLM decides WHAT to do; this module is the only thing that knows HOW to
drive a browser, and every write goes through deterministic safety checks:

  * fill/select values must come from the verified profile (via the mapping
    engine) or from the student's own answers — see policies.check_fill_allowed.
  * uploads are by document *type* and resolve only to VERIFIED profile files.
  * the agent cannot click the final submit control; that is a student-
    triggered runner action (`BrowserSession.click_final_submit`).
  * every write is blocked unless the application is in a state that allows it.

Threading: Playwright's sync API is thread-bound, and Strands may run tools on
different threads / event loops between agent invocations. All browser work
therefore runs on ONE dedicated worker thread, so the page survives a
pause -> resume cycle within the same process.
"""
from __future__ import annotations
from pathlib import Path

import os
import re
import threading
from concurrent.futures import ThreadPoolExecutor
from difflib import SequenceMatcher
from typing import Any

from strands import tool

from app.agent.policies import check_fill_allowed
from app.state_machine.states import ApplicationState as S
from app.tools import state
from app.tools.profile import resolve_document_path

_READ_STATES = {S.RUNNING, S.STUDENT_ACTION_REQUIRED, S.READY_TO_SUBMIT, S.AWAITING_FINAL_APPROVAL}
_WRITE_STATES = {S.RUNNING}
_FINAL_SUBMIT_RE = re.compile(r"submit\s*application|final\s*submit|confirm\s*submission", re.I)

_INSPECT_JS = r"""
() => {
  const esc = (s) => CSS.escape(s);
  const sel = (el) => el.id ? '#' + esc(el.id)
      : el.name ? el.tagName.toLowerCase() + '[name="' + el.name + '"]' : null;
  const visible = (el) => { const r = el.getBoundingClientRect(); const st = getComputedStyle(el);
      return st.display !== 'none' && st.visibility !== 'hidden' && (r.width > 0 || r.height > 0); };
  const fields = [], seenRadio = new Set();
  document.querySelectorAll('input, select, textarea').forEach((el) => {
    if (el.type === 'hidden' || !visible(el)) return;
    if (el.type === 'radio') {
      if (seenRadio.has(el.name)) return; seenRadio.add(el.name);
      const group = [...document.querySelectorAll('input[type=radio][name="' + el.name + '"]')];
      const legend = el.closest('fieldset') && el.closest('fieldset').querySelector('legend');
      fields.push({ type: 'radio_group', label: legend ? legend.innerText.trim() : el.name,
        selector: 'input[name="' + el.name + '"]',
        options: group.map(r => ({ value: r.value, label: (r.labels[0] && r.labels[0].innerText.trim()) || r.value })),
        value: (group.find(r => r.checked) || {}).value || null });
      return;
    }
    fields.push({
      type: el.tagName === 'SELECT' ? 'select' : el.tagName === 'TEXTAREA' ? 'textarea' : (el.type || 'text'),
      label: (el.labels && el.labels[0] && el.labels[0].innerText.trim()) || el.getAttribute('aria-label') || el.placeholder || null,
      selector: sel(el), required: el.required, value: el.type === 'file' ? null : el.value,
      options: el.tagName === 'SELECT' ? [...el.options].map(o => ({ value: o.value, label: o.text })) : undefined });
  });
  const buttons = [...document.querySelectorAll('button, a.button, input[type=submit]')].filter(visible).map((b) => ({
    text: (b.innerText || b.value || '').trim(), selector: sel(b),
    is_final_submit: b.hasAttribute('data-final-submit') }));
  const h = document.querySelector('h1, h2');
  return { heading: h ? h.innerText.trim() : null, step: document.body.dataset.step || null, fields, buttons };
}
"""


class BrowserSession:
    def __init__(self) -> None:
        self._exec = ThreadPoolExecutor(max_workers=1, thread_name_prefix="unipro-browser")
        self._pw = self._browser = self._page = None

    # every call funnels through the single worker thread
    def run(self, fn, *args, **kwargs):
        return self._exec.submit(fn, *args, **kwargs).result()

    def _page_or_start(self):
        if self._page is None:
            from playwright.sync_api import sync_playwright

            self._pw = sync_playwright().start()
            headless = os.getenv("BROWSER_HEADLESS", "false").lower() == "true"
            slow = 0 if headless else int(os.getenv("BROWSER_SLOW_MO_MS", "300"))

            s = state.active_session()
            app_id = s.application_id if s else "default"
            profile_dir = Path(os.getenv("UNIPRO_BROWSER_PROFILE_DIR", "app/data/browser_profiles")) / app_id
            profile_dir.mkdir(parents=True, exist_ok=True)

            # Persistent context, not launch(): localStorage must survive a
            # crashed/restarted process resuming the SAME application, since
            # the demo portal tracks per-page completion in localStorage.
            self._browser = self._pw.chromium.launch_persistent_context(
                str(profile_dir), headless=headless, slow_mo=slow
            )
            self._page = self._browser.pages[0] if self._browser.pages else self._browser.new_page()
        return self._page

    # ------------------------------------------------------------ actions
    def open_page(self, url: str) -> dict[str, Any]:
        page = self._page_or_start()
        page.goto(url, wait_until="domcontentloaded")
        return {"url": page.url, "title": page.title()}

    def inspect_page(self) -> dict[str, Any]:
        page = self._page_or_start()
        return {"url": page.url, **page.evaluate(_INSPECT_JS)}

    def read_page(self, max_chars: int = 4000) -> dict[str, Any]:
        page = self._page_or_start()
        text = page.inner_text("body")
        return {"url": page.url, "title": page.title(), "text": text[:max_chars], "truncated": len(text) > max_chars}

    def fill(self, selector: str, value: str) -> None:
        self._page_or_start().fill(selector, value, timeout=5000)

    def select(self, selector: str, value: str) -> str:
        page = self._page_or_start()
        if page.locator(selector).first.get_attribute("type") == "radio":
            values = page.eval_on_selector_all(selector, "els => els.map(e => e.value)")
            match = next((v for v in values if v.lower() == value.strip().lower()), None)
            if match is None:
                raise ValueError(f"No option '{value}'. Options: {values}")
            page.check(f'{selector}[value="{match}"]', timeout=5000)
            return match
        page.select_option(selector, value, timeout=5000)
        return value

    def upload(self, selector: str, path: str) -> None:
        self._page_or_start().set_input_files(selector, path, timeout=5000)

    def click(self, selector: str) -> dict[str, Any]:
        page = self._page_or_start()
        loc = page.locator(selector).first
        info = loc.evaluate(
            "e => ({final: e.hasAttribute('data-final-submit'), text: (e.innerText || e.value || ''), id: e.id})",
            timeout=5000,
        )
        if info["final"] or _FINAL_SUBMIT_RE.search(f"{info['text']} {info['id']}"):
            return {"status": "blocked", "error": "This is the final submit control. Only the student can submit."}
        loc.click(timeout=5000)
        page.wait_for_load_state("domcontentloaded")
        return {"status": "ok", "url": page.url, "title": page.title()}

    def click_final_submit(self) -> dict[str, Any]:
        """STUDENT-TRIGGERED ONLY. Never exposed as an agent tool."""
        page = self._page_or_start()
        page.click("[data-final-submit]", timeout=5000)
        page.wait_for_load_state("domcontentloaded")
        return {"url": page.url, "text": page.inner_text("body")[:500]}

    def detect_captcha(self) -> bool:
        page = self._page_or_start()
        if page.locator("iframe[src*='recaptcha'], iframe[src*='hcaptcha'], .g-recaptcha, .h-captcha, [data-captcha]").count():
            return True
        return bool(re.search(r"\bcaptcha\b|i'm not a robot", page.inner_text("body"), re.I))

    def detect_otp(self) -> bool:
        page = self._page_or_start()
        if page.locator("input[autocomplete='one-time-code'], [data-otp]").count():
            return True
        return bool(re.search(r"\botp\b|one-time (password|code)|verification code|two-factor", page.inner_text("body"), re.I))

    def current_url(self) -> str | None:
        return self._page.url if self._page is not None else None

    def close(self) -> None:
        if self._browser is not None:
            self._browser.close()
        if self._pw is not None:
            self._pw.stop()
        self._pw = self._browser = self._page = None


_session: BrowserSession | None = None
_lock = threading.Lock()


def get_browser() -> BrowserSession:
    global _session
    with _lock:
        if _session is None:
            _session = BrowserSession()
        return _session


def _sync_url() -> None:
    s = state.active_session()
    b = _session
    if s is not None and b is not None:
        url = b.run(b.current_url)
        if url:
            s.current_url = url
            state.save_active()


def _no_session() -> dict[str, Any]:
    return {"status": "blocked", "error": "No active application. Browser writes are only allowed inside an application run."}


# --------------------------------------------------------------------- tools
@tool
def open_page(url: str) -> dict[str, Any]:
    """Open a URL in the browser (starts the RUNNING phase on the first call).

    Args:
        url: The page to open (use the application_url from check_university_requirements).
    """
    s = state.active_session()
    if s is not None:
        if s.state == S.READY_TO_RUN:
            state.transition(S.RUNNING, note="browser opened")
        blocked = state.blocked_unless(_WRITE_STATES, "open a page")
        if blocked:
            return blocked
    b = get_browser()
    try:
        out = b.run(b.open_page, url)
    except Exception as exc:  # noqa: BLE001 - surfaced to the agent + audit trail
        state.record("browser_error", action="open_page", error=str(exc))
        return {"status": "error", "error": str(exc)}
    state.record("page_opened", url=out["url"])
    _sync_url()
    return {"status": "ok", **out}


@tool
def inspect_page() -> dict[str, Any]:
    """List the visible fields, radio groups and buttons on the current page.

    Returns each field's label, type, CSS selector and options. Always call
    this before filling a page — never guess a selector.
    """
    blocked = state.blocked_unless(_READ_STATES, "inspect the page")
    if blocked:
        return blocked
    b = get_browser()
    return b.run(b.inspect_page)


@tool
def find_field(label: str) -> dict[str, Any]:
    """Find the field on the current page whose label best matches `label`.

    Args:
        label: Label text to look for (e.g. "GPA").
    """
    blocked = state.blocked_unless(_READ_STATES, "search the page")
    if blocked:
        return blocked
    b = get_browser()
    page = b.run(b.inspect_page)
    scored = [
        (SequenceMatcher(None, label.lower(), (f.get("label") or "").lower()).ratio()
         + (0.5 if label.lower() in (f.get("label") or "").lower() else 0), f)
        for f in page["fields"]
    ]
    if not scored:
        return {"found": False}
    score, best = max(scored, key=lambda t: t[0])
    return {"found": score >= 0.6, "field": best} if score >= 0.6 else {"found": False, "closest": best}


@tool
def read_page() -> dict[str, Any]:
    """Return the visible text of the current page (for reading confirmations/errors)."""
    blocked = state.blocked_unless(_READ_STATES, "read the page")
    if blocked:
        return blocked
    b = get_browser()
    return b.run(b.read_page)


@tool
def fill_field(selector: str, value: str, field_label: str) -> dict[str, Any]:
    """Type a value into a text/number/date/textarea field.

    Allowed ONLY if `value` is the verified profile value that map_form_field
    approved for `field_label`, or the student's own answer. Anything else is
    refused, whatever you intend.

    Args:
        selector: CSS selector from inspect_page.
        value: The exact value to enter.
        field_label: The same label you passed to map_form_field.
    """
    s = state.active_session()
    if s is None:
        return _no_session()
    blocked = state.blocked_unless(_WRITE_STATES, "fill a field")
    if blocked:
        return blocked
    ok, why = check_fill_allowed(field_label, value, s.mappings, s.answers)
    if not ok:
        state.record("fill_refused", field=field_label, reason=why)
        return {"status": "refused", "error": why}
    b = get_browser()
    try:
        b.run(b.fill, selector, str(value))
    except Exception as exc:  # noqa: BLE001
        state.record("browser_error", action="fill_field", field=field_label, error=str(exc))
        return {"status": "error", "error": str(exc)}
    source = (s.mappings.get(field_label) or {}).get("source")
    s.filled[field_label] = {"selector": selector, "source": source or "student"}
    state.save_active()
    state.record("field_filled", field=field_label, via=why)
    return {"status": "ok", "field": field_label}


@tool
def select_option(selector: str, value: str, field_label: str) -> dict[str, Any]:
    """Choose an option in a dropdown or radio group (same safety rules as fill_field).

    Args:
        selector: CSS selector of the select element or radio group (from inspect_page).
        value: The option value/label to choose.
        field_label: The same label you passed to map_form_field.
    """
    s = state.active_session()
    if s is None:
        return _no_session()
    blocked = state.blocked_unless(_WRITE_STATES, "select an option")
    if blocked:
        return blocked
    ok, why = check_fill_allowed(field_label, value, s.mappings, s.answers)
    if not ok:
        state.record("fill_refused", field=field_label, reason=why)
        return {"status": "refused", "error": why}
    b = get_browser()
    try:
        chosen = b.run(b.select, selector, str(value))
    except Exception as exc:  # noqa: BLE001
        state.record("browser_error", action="select_option", field=field_label, error=str(exc))
        return {"status": "error", "error": str(exc)}
    s.filled[field_label] = {"selector": selector, "source": (s.mappings.get(field_label) or {}).get("source") or "student"}
    state.save_active()
    state.record("field_filled", field=field_label, via=why, option=chosen)
    return {"status": "ok", "field": field_label, "selected": chosen}


@tool
def upload_document(selector: str, document_type: str) -> dict[str, Any]:
    """Upload one of the student's VERIFIED documents into a file input.

    You pass the document TYPE ("resume", "transcript"), never a file path.
    If the student has no verified document of that type, this refuses —
    never fabricate a document.

    Args:
        selector: CSS selector of the file input (from inspect_page).
        document_type: Key from the profile documents, e.g. "resume".
    """
    s = state.active_session()
    if s is None:
        return _no_session()
    blocked = state.blocked_unless(_WRITE_STATES, "upload a document")
    if blocked:
        return blocked
    path = resolve_document_path(document_type)
    if path is None:
        state.record("upload_refused", document=document_type)
        return {"status": "refused", "error": f"No verified '{document_type}' document on file. Ask the student to provide it."}
    b = get_browser()
    try:
        b.run(b.upload, selector, path)
    except Exception as exc:  # noqa: BLE001
        state.record("browser_error", action="upload_document", document=document_type, error=str(exc))
        return {"status": "error", "error": str(exc)}
    s.uploaded[document_type] = path
    state.save_active()
    state.record("document_uploaded", document=document_type)
    return {"status": "ok", "document": document_type}


@tool
def click_button(selector: str) -> dict[str, Any]:
    """Click a navigation/save button (e.g. "Save & Continue"). Cannot click final submit.

    Args:
        selector: CSS selector of the button (from inspect_page).
    """
    blocked = state.blocked_unless(_WRITE_STATES, "click a button")
    if blocked:
        return blocked
    b = get_browser()
    try:
        out = b.run(b.click, selector)
    except Exception as exc:  # noqa: BLE001
        state.record("browser_error", action="click_button", selector=selector, error=str(exc))
        return {"status": "error", "error": str(exc)}
    if out.get("status") == "blocked":
        state.record("click_refused", selector=selector, reason=out["error"])
        return out
    state.record("button_clicked", selector=selector, url=out["url"])
    _sync_url()
    return out


def _pause_for_challenge(kind: str) -> None:
    """A CAPTCHA/OTP is a human-only step: park the run in STUDENT_ACTION_REQUIRED."""
    s = state.active_session()
    if s is None or s.state != S.RUNNING:
        return
    s.pending = {
        "field_label": kind, "risk": "high", "proposed_answer": "",
        "question": f"The website is showing a {kind.upper()} challenge. Please complete it manually in the browser, then continue.",
        "reason": "UniPro never attempts to bypass CAPTCHA or OTP challenges.",
    }
    state.save_active()
    state.transition(S.STUDENT_ACTION_REQUIRED, note=kind)
    state.record("human_approval_requested", field=kind)


@tool
def detect_captcha() -> dict[str, Any]:
    """Check whether the page shows a CAPTCHA. If so, stop and ask the student to solve it."""
    b = get_browser()
    hit = b.run(b.detect_captcha)
    if hit:
        state.record("captcha_detected")
        _pause_for_challenge("captcha")
    return {"captcha_detected": hit, **({"message": "STOP. Student must solve it. End your turn."} if hit else {})}


@tool
def detect_otp() -> dict[str, Any]:
    """Check whether the page asks for an OTP / verification code. If so, stop and ask the student."""
    b = get_browser()
    hit = b.run(b.detect_otp)
    if hit:
        state.record("otp_detected")
        _pause_for_challenge("otp")
    return {"otp_detected": hit, **({"message": "STOP. Student must enter it. End your turn."} if hit else {})}


@tool
def close_browser() -> dict[str, Any]:
    """Close the browser (end of run)."""
    global _session
    if _session is not None:
        _session.run(_session.close)
    return {"closed": True}
