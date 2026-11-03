import pytest
from app.agent import runner

def test_runner_serialization_lock():
    # Simulate an active lock
    assert runner._RUN_LOCK.acquire(blocking=False)
    try:
        res = runner.start_application("Uni", "Prog")
        assert res.get("status") == "busy"
        assert "Another UniPro operation is already running" in res.get("error", "")

        res_retry = runner.retry("app-123")
        assert res_retry.get("status") == "busy"
    finally:
        runner._RUN_LOCK.release()

    # Once released, lock can be acquired again
    assert not runner._RUN_LOCK.locked()
