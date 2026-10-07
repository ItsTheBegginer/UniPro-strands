# UniPro

An autonomous university-application agent. Built on **Strands Agents**, a swappable
model provider (Gemini now, Bedrock later), Playwright, and AWS (DynamoDB/S3/SQS planned).

## Quick start
```bash
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt && playwright install chromium
cp .env.example .env            # add GEMINI_API_KEY
python scripts/make_demo_documents.py && python scripts/seed_demo_profile.py

python scripts/check_gemini.py           # Phase 2: Strands -> Gemini -> tool -> answer
python -m pytest tests                   # deterministic logic + scripted browser e2e

python scripts/serve_demo_university.py  # terminal 1: portal on :8080
python -m app.run_demo                   # terminal 2: the real agent
```

## How it stays safe
- The model never picks values: `app/tools/mapping.py` decides source/value/risk/action.
- `fill_field` / `select_option` only accept a verified profile value or the student's own answer.
- Uploads are by document *type*, resolved to verified profile files only.
- HIGH-risk questions (disciplinary, legal, financial, medical, visa) always pause for the student.
- The agent has **no submit tool**. Final submission is student-triggered (`runner.approve_and_submit`).
- The state machine is the only source of truth; the agent cannot change state directly.
- CAPTCHA / OTP: detected, then the run pauses for the student. Never bypassed.

## Layout
`app/agent` (agent, prompts, policies, gate, runner) · `app/tools` (profile, requirements,
mapping, browser, approval, state/audit) · `app/state_machine` · `demo_university/` (local portal).
`backend/` is the legacy Google-ADK backend, kept for reference until the new FastAPI layer (Phase 15) replaces it.
