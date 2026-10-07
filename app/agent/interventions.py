"""
Tool-call safety gate, hooked into Strands' native lifecycle.

Defense in depth — this is the *outer* layer:
  1. This gate cancels forbidden tools before they execute and logs every
     tool call to the execution timeline (Phase 20).
  2. Each tool ALSO enforces its own rules (state checks, fill allow-list,
     document allow-list), so safety does not depend on the hook API alone.
  3. The agent has no submit capability at all (see approval.py).

Human pauses are not implemented as SDK interrupts: `request_student_input`
persists a pending approval and moves the state machine to
STUDENT_ACTION_REQUIRED, which blocks every browser action. That works
identically for a terminal run, an API request, and a background worker
that stops and is later resumed from disk.
"""
from __future__ import annotations

from strands.hooks import BeforeToolCallEvent, HookProvider, HookRegistry

from app.agent.policies import evaluate_tool_call
from app.tools import state


class UniProApprovalGate(HookProvider):
    def register_hooks(self, registry: HookRegistry, **kwargs) -> None:
        registry.add_callback(BeforeToolCallEvent, self._before_tool_call)

    def _before_tool_call(self, event: BeforeToolCallEvent) -> None:
        name = event.tool_use["name"]
        state.record_tool_call(name, event.tool_use.get("input", {}))
        allowed, reason = evaluate_tool_call(name)
        if not allowed:
            state.record("tool_denied", tool=name, reason=reason)
            event.cancel_tool = reason  # Strands: cancels the call and returns this text to the model
