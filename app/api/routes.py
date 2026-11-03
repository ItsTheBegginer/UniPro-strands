# app/api/routes.py
from typing import Any
from fastapi import FastAPI, File, Form, HTTPException, UploadFile
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import runner
from app.tools.profile import (
    load_profile,
    save_profile,
    student_confirm_field,
    is_field,
    field_state,
)

app = FastAPI(title="UniPro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartRequest(BaseModel):
    university: str
    program: str
    application_id: str | None = None

class AnswerRequest(BaseModel):
    answer: str

class ChangesRequest(BaseModel):
    note: str

# ── Profile request models ────────────────────────────────────────────────────

class ProfileFieldRequest(BaseModel):
    """Update a single scalar field in the student profile."""
    field: str
    value: Any

class ProfileBulkRequest(BaseModel):
    """Set / replace multiple scalar fields at once (all confirmed verified)."""
    fields: dict[str, Any]   # {"name": "Alice", "gpa": 3.9, ...}

def _check_busy(res: Any) -> Any:
    if isinstance(res, dict) and res.get("status") == "busy":
        raise HTTPException(status_code=409, detail=res.get("error", "Agent is busy."))
    return res

@app.get("/applications")
def list_applications():
    return {"applications": runner.list_applications()}

@app.post("/applications")
def start(req: StartRequest):
    return _check_busy(runner.start_application(req.university, req.program, req.application_id))

@app.get("/applications/{application_id}")
def get_status(application_id: str):
    try:
        return runner.status(application_id)
    except FileNotFoundError:
        raise HTTPException(404, "Application not found")

@app.get("/applications/{application_id}/activity")
def activity(application_id: str):
    return {"timeline": runner.format_timeline(application_id)}

@app.post("/applications/{application_id}/answer")
def answer(application_id: str, req: AnswerRequest):
    return _check_busy(runner.provide_answer(application_id, req.answer))

@app.post("/applications/{application_id}/submit")
def submit(application_id: str):
    return _check_busy(runner.approve_and_submit(application_id))

@app.post("/applications/{application_id}/request-changes")
def changes(application_id: str, req: ChangesRequest):
    return _check_busy(runner.request_changes(application_id, req.note))

@app.post("/applications/{application_id}/retry")
def retry(application_id: str):
    return _check_busy(runner.retry(application_id))

@app.post("/applications/{application_id}/continue")
def continue_run(application_id: str):
    return _check_busy(runner.nudge(application_id))


# ── Profile endpoints ─────────────────────────────────────────────────────────

@app.get("/profile")
def get_profile():
    """Return the full student profile with per-field verification states."""
    try:
        profile = load_profile()
    except FileNotFoundError:
        # Return an empty profile instead of 404 — frontend can handle it
        return {"fields": {}, "documents": {}}

    fields: dict[str, Any] = {}
    for key, entry in profile.items():
        if key == "student_id":
            continue
        if is_field(entry):
            fields[key] = {
                "value": entry["value"],
                "verified": entry.get("verified", False),
                "state": field_state(entry),
            }

    docs_entry = profile.get("documents", {})
    documents: dict[str, str] = {}
    if is_field(docs_entry) and isinstance(docs_entry.get("value"), dict):
        documents = {
            k: str(v) for k, v in docs_entry["value"].items() if v
        }

    return {"fields": fields, "documents": documents}


@app.put("/profile")
def update_profile(req: ProfileBulkRequest):
    """Save multiple profile fields at once, marking them all verified.

    The student is the one calling this from the UI, so we treat every
    value they submit as confirmed / verified.
    """
    try:
        profile = load_profile()
    except FileNotFoundError:
        profile = {"student_id": "default"}

    for field, value in req.fields.items():
        if field == "student_id":
            continue
        # Nested dicts (education, test_scores) are stored as-is
        profile[field] = {"value": value, "verified": True, "source": "student"}

    save_profile(profile)
    return {"status": "saved", "updated": list(req.fields.keys())}


@app.post("/profile/documents/{doc_type}")
async def upload_document(doc_type: str, file: UploadFile = File(...)):
    """Upload a document (resume, transcript, …) and store its path in profile.

    The file is saved locally for development and also uploaded to S3
    under a per‑student folder (`students/<student_id>/documents/...`).
    """
    import shutil
    from pathlib import Path
    from app.tools.profile import upload_document_to_s3

    allowed = {"resume", "transcript", "cover_letter", "portfolio", "other"}
    if doc_type not in allowed:
        raise HTTPException(400, f"doc_type must be one of {sorted(allowed)}")

    # Save locally first (as before)
    docs_dir = Path(__file__).resolve().parent.parent / "data" / "documents"
    docs_dir.mkdir(parents=True, exist_ok=True)

    suffix = Path(file.filename or "file").suffix or ""
    dest = docs_dir / f"{doc_type}{suffix}"
    with dest.open("wb") as fh:
        shutil.copyfileobj(file.file, fh)

    # Upload to S3 (if bucket configured)
    s3_path = upload_document_to_s3(doc_type, str(dest))

    # Record in profile using a relative path (local) – keep S3 path for reference if needed
    try:
        profile = load_profile()
    except FileNotFoundError:
        profile = {"student_id": "default"}

    docs_entry = profile.get("documents", {"value": {}, "verified": True})
    if not is_field(docs_entry):
        docs_entry = {"value": {}, "verified": True}
    if not isinstance(docs_entry.get("value"), dict):
        docs_entry["value"] = {}

    rel_path = f"app/data/documents/{dest.name}"
    docs_entry["value"][doc_type] = rel_path
    # Mark as verified (student uploaded)
    docs_entry["verified"] = True
    docs_entry["source"] = "student"
    profile["documents"] = docs_entry
    save_profile(profile)

    return {"status": "uploaded", "doc_type": doc_type, "path": rel_path, "s3": s3_path}


@app.delete("/profile/documents/{doc_type}")
def delete_document(doc_type: str):
    """Remove a document entry from the profile (does not delete the file)."""
    try:
        profile = load_profile()
    except FileNotFoundError:
        raise HTTPException(404, "No profile found")

    docs_entry = profile.get("documents", {})
    if is_field(docs_entry) and isinstance(docs_entry.get("value"), dict):
        docs_entry["value"].pop(doc_type, None)
        profile["documents"] = docs_entry
        save_profile(profile)

    return {"status": "removed", "doc_type": doc_type}
