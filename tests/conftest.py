"""Shared test setup: isolates all file-backed state and, when the Strands SDK
isn't installed (e.g. a minimal CI box), provides a tiny stand-in so the
deterministic logic can still be unit-tested. With the real SDK installed
this stub is never used."""
import shutil
import sys
import types
from pathlib import Path

import pytest

try:
    import strands  # noqa: F401
except ImportError:  # pragma: no cover
    strands = types.ModuleType("strands")

    def tool(fn=None, **_kw):
        return fn if fn is not None else (lambda f: f)

    class Agent:  # never constructed in unit tests
        def __init__(self, *a, **k):
            raise RuntimeError("strands-agents is not installed")

    hooks = types.ModuleType("strands.hooks")

    class BeforeToolCallEvent:
        pass

    class HookProvider:
        pass

    class HookRegistry:
        pass

    hooks.BeforeToolCallEvent, hooks.HookProvider, hooks.HookRegistry = BeforeToolCallEvent, HookProvider, HookRegistry
    strands.tool, strands.Agent, strands.hooks = tool, Agent, hooks
    sys.modules["strands"], sys.modules["strands.hooks"] = strands, hooks

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT))


def isolate(tmp_path: Path, monkeypatch) -> None:
    """Point profile + run storage at a temp dir seeded from the real demo profile."""
    profile = tmp_path / "student_profile.json"
    shutil.copy(ROOT / "app" / "data" / "student_profile.json", profile)
    monkeypatch.setenv("UNIPRO_PROFILE_PATH", str(profile))
    monkeypatch.setenv("UNIPRO_RUNS_DIR", str(tmp_path / "runs"))
    from app.tools import state
    state.deactivate()


@pytest.fixture(autouse=True)
def _isolated(tmp_path, monkeypatch):
    isolate(tmp_path, monkeypatch)
    yield
    from app.tools import state
    state.deactivate()
