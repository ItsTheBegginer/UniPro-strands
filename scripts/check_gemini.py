"""
Phase 2 completion test: Strands -> Gemini -> tool -> result -> Gemini -> answer.

    python scripts/check_gemini.py

Uses one toy tool so any failure is about the model/SDK wiring, not UniPro logic.
Also reports the installed Strands version and whether the hook API UniPro's
safety gate relies on is present.
"""
import sys
from importlib.metadata import version

sys.path.insert(0, ".")
from dotenv import load_dotenv

load_dotenv()

from strands import Agent, tool
from strands.hooks import BeforeToolCallEvent

from app.agent.model_provider import get_model

calls = []


@tool
def get_gpa() -> dict:
    """Return the student's GPA."""
    calls.append("get_gpa")
    return {"gpa": 8.7, "verified": True}


print("strands-agents", version("strands-agents"))
print("BeforeToolCallEvent.cancel_tool available:",
      "cancel_tool" in getattr(BeforeToolCallEvent, "__dataclass_fields__", {}) or hasattr(BeforeToolCallEvent, "cancel_tool"))
agent = Agent(model=get_model(), tools=[get_gpa], callback_handler=None)
reply = str(agent("What is the student's GPA? Use your tool."))
print("Reply:", reply)
assert calls == ["get_gpa"], f"Model did not call the tool (calls={calls})"
assert "8.7" in reply, "Final answer does not contain the tool result"
print("PASS: tool selection -> execution -> result -> final response")
