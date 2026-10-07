"""
Common App adapter — UniPro's one real, live automation target.

We deliberately target a Common App PRACTICE account
(https://apply.commonapp.org), not a real applicant account:
  - Common App built practice accounts specifically so people can experience
    the real, live application flow without being treated as a real
    applicant.
  - Practice-account applications cannot be submitted to a college — this
    is a platform-level guarantee, not just a restraint we're choosing to
    honor, so there is no risk of accidentally triggering a real submission
    during a live demo.

This module intentionally does NOT hardcode field selectors. Per the
project's mapping-first design, the agent calls tools.browser.inspect_page()
at runtime to discover the real DOM, then tools.mapping.map_form_field()
to decide what to do with each field. Hardcoding selectors against a
production site we don't control would break the moment Common App ships
a UI change. What this adapter DOES fix is the things that are structural
and stable: entry URLs and the high-level page flow.
"""
from __future__ import annotations

ENTRY_URL = "https://apply.commonapp.org"
CREATE_ACCOUNT_URL = "https://apply.commonapp.org/createaccount"

# High-level flow, used to narrate progress to the student and to know
# when the run has reached "ready to submit" (which, for a practice
# account, is also the natural end of the demo — see note above).
APPLICATION_FLOW = [
    "login_or_create_practice_account",
    "profile",           # personal info, education, test scores
    "family",
    "education",
    "testing",
    "activities",
    "writing",           # personal essay
    "college_specific_questions",
    "review",
    "ready_to_submit",   # practice accounts stop here — cannot actually submit
]

SETUP_NOTE = (
    "Before running a live demo: manually create a Common App practice "
    "account once (apply.commonapp.org -> 'I am a...' -> select an option "
    "such as counselor/other -> follow the 'create a practice account' "
    "link), store its login email in .env as COMMONAPP_PRACTICE_EMAIL, "
    "and add one real college to 'My Colleges' so there's a college-specific "
    "question set for the agent to fill. Do this before recording — do not "
    "have the agent create the practice account live, since that's a one-time "
    "manual step tied to a real email address."
)
