# app/api/routes.py
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from app.agent import runner

app = FastAPI(title="UniPro")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
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

@app.get("/applications")
def list_applications():
    return {"applications": runner.list_applications()}

@app.post("/applications")
def start(req: StartRequest):
    return runner.start_application(req.university, req.program, req.application_id)

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
    return runner.provide_answer(application_id, req.answer)

@app.post("/applications/{application_id}/submit")
def submit(application_id: str):
    return runner.approve_and_submit(application_id)

@app.post("/applications/{application_id}/request-changes")
def changes(application_id: str, req: ChangesRequest):
    return runner.request_changes(application_id, req.note)

@app.post("/applications/{application_id}/retry")
def retry(application_id: str):
    return runner.retry(application_id)

@app.post("/applications/{application_id}/continue")
def continue_run(application_id: str):
    return runner.nudge(application_id)