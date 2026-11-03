import pytest
from fastapi.testclient import TestClient
from app.api.routes import app

client = TestClient(app)

def test_list_applications():
    resp = client.get("/applications")
    assert resp.status_code == 200
    assert "applications" in resp.json()

def test_get_nonexistent_application():
    resp = client.get("/applications/nonexistent-app-id")
    assert resp.status_code == 404

def test_busy_handling():
    from app.agent import runner
    # Acquire lock to trigger busy
    assert runner._RUN_LOCK.acquire(blocking=False)
    try:
        resp = client.post("/applications", json={"university": "Demo Uni", "program": "CS"})
        assert resp.status_code == 409
        assert "Another UniPro operation is already running" in resp.json()["detail"]
    finally:
        runner._RUN_LOCK.release()
