"""
The UniPro agent: ONE Strands orchestrator with a focused, auditable toolset.

    Strands Agent -> model provider (Gemini | Bedrock) -> tools -> results -> model

The model provider is swappable via MODEL_PROVIDER (see model_provider.py);
nothing else in the codebase knows or cares which LLM is behind the agent.
"""
from __future__ import annotations

from strands import Agent

from app.agent.interventions import UniProApprovalGate
from app.agent.model_provider import get_model
from app.agent.prompts import SYSTEM_PROMPT
from app.tools.approval import request_final_approval, request_student_input
from app.tools.browser import (
    click_button, close_browser, detect_captcha, detect_otp, fill_field, find_field,
    inspect_page, open_page, read_page, select_option, upload_document,
)
from app.tools.mapping import map_form_field
from app.tools.profile import get_student_profile, get_verified_information, update_student_profile
from app.tools.requirements import check_university_requirements, find_missing_information

TOOLS = [
    # profile
    get_student_profile, get_verified_information, update_student_profile,
    # requirements + mapping
    check_university_requirements, find_missing_information, map_form_field,
    # browser
    open_page, inspect_page, find_field, read_page, fill_field, select_option,
    upload_document, click_button, detect_captcha, detect_otp, close_browser,
    # human-in-the-loop (note: no submit tool exists — by design)
    request_student_input, request_final_approval,
]


def build_agent(callback_handler="default") -> Agent:
    kwargs = {} if callback_handler == "default" else {"callback_handler": callback_handler}
    return Agent(
        model=get_model(),
        system_prompt=SYSTEM_PROMPT,
        tools=TOOLS,
        hooks=[UniProApprovalGate()],
        name="unipro",
        **kwargs,
    )


if __name__ == "__main__":
    # Standalone check (no browser side-effects beyond what the agent decides):
    #   python -m app.agent.unipro_agent
    from app.tools import state

    state.create_session("cli-smoke", "Demo University", "Computer Science")
    state.activate("cli-smoke")
    state.transition(state.ApplicationState.PREPARING)
    print(build_agent()("Prepare my Demo University Computer Science application."))

    agent = build_agent()
