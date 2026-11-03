# UniPro — Autonomous University Application Agent

UniPro is an autonomous university-application agent built for the **Strands SDK: Workshop to Ship Hackathon** (Focus Area: **Education / Social Good**).

### Social Impact: Leveling the College Admissions Playing Field
Navigating university admissions portals involves dozens of repetitive forms, strict document formats, and high-stakes legal/disciplinary disclosures. Wealthier applicants rely on private counselors to manage this process. First-generation applicants and students from underserved communities often navigate complex portals alone with no guidance.

UniPro acts as an autonomous digital guidance counselor and assistant:
- **Reduces friction:** Automates repetitive portal forms (personal details, academic records, test scores) using student-verified profiles.
- **Safety by design:** High-stakes decisions (disciplinary questions, legal attestations, final review) are strictly protected by human-in-the-loop gates.
- **Privacy & Ownership:** The student remains the sole authorized submitter; the agent cannot submit an application on its own.

---

## Architecture & Technology Stack

| Component | Technology | Description |
|---|---|---|
| **Agent Framework** | **Strands Agents SDK** | Autonomous agent loop powered by `@tool` calling and lifecycle hooks |
| **Model Provider** | **Amazon Bedrock / Nova Lite** | Pluggable provider layer (`eu.amazon.nova-lite-v1:0` or Gemini fallback) |
| **Safety & Control** | **State Machine & Policy Gate** | Deterministic field mapping engine, risk classification, outer hook gate |
| **Browser Automation**| **Playwright** | Headless or visible browser runner interacting directly with application portals |
| **Storage & Cloud** | **Amazon S3 & DynamoDB** | Per-student S3 document subfolders (`students/{id}/documents/...`) & session store |
| **Backend API** | **FastAPI & Uvicorn** | High-performance async REST API with concurrency locking & timeline auditing |
| **Frontend UI** | **React 19, Vite, TailwindCSS** | Real-time portal monitoring, human-in-the-loop prompt responses, and profile manager |

---

## Safety Architecture: "LLM Proposes, Code Decides"

1. **Deterministic Mapping Engine (`app/tools/mapping.py`):**
   - The model is not allowed to hallucinate form values.
   - Every field on a portal is checked against student-verified profile records.
2. **Human-in-the-Loop Approval Gate (`app/tools/approval.py` & `app/agent/policies.py`):**
   - Low-risk verified fields are auto-filled.
   - High-risk questions (disciplinary history, legal disclosures, citizenship/visa) pause the agent and present native interactive controls (e.g. Yes/No radio selectors) to the student.
3. **No Autonomous Submission:**
   - The agent has **no submit tool**. Submission is strictly student-authorized via the review interface (`runner.approve_and_submit`).
4. **Challenge Protection:**
   - CAPTCHA and OTP challenges are detected; the agent halts and prompts the student to complete them manually.

---

## Quick Start

### 1. Prerequisites
- Python 3.11 or 3.12
- Node.js 18+ & npm

### 2. Backend Setup
```bash
# Create and activate virtual environment
python3 -m venv .venv
source .venv/bin/activate

# Install dependencies and browser binaries
pip install -r requirements.txt
playwright install chromium

# Configure environment
cp .env.example .env
# Configure AWS_REGION, BEDROCK_REGION, and S3_BUCKET (or GEMINI_API_KEY if testing Gemini)

# Seed sample student profile & test documents
python scripts/make_demo_documents.py
python scripts/seed_demo_profile.py
```

### 3. Run Automated Tests
```bash
# Run complete unit & end-to-end verification suite (48 tests)
pytest tests/
```

### 4. Start the Application

**Terminal 1 — Demo University Portal:**
```bash
python scripts/serve_demo_university.py
# Running at http://localhost:8080
```

**Terminal 2 — UniPro API Server:**
```bash
uvicorn app.api.routes:app --reload --port 8000
# Running at http://localhost:8000
```

**Terminal 3 — Frontend UI:**
```bash
cd frontend
npm install
npm run dev
# Running at http://localhost:5173
```

---

## Repository Structure

```
├── app/
│   ├── agent/            # Strands agent definition, runner serialization, model provider & prompts
│   ├── api/              # FastAPI REST endpoints for applications and student profile
│   ├── data/             # Local verified student profile and document repository
│   ├── state_machine/    # Application lifecycle states (PREPARING -> RUNNING -> REVIEW -> SUBMITTED)
│   └── tools/            # Strands tools: browser automation, deterministic mapping, approval gates, S3
├── demo_university/      # Multi-page university portal used for real-time demonstration
├── frontend/             # React/Vite dashboard, live agent tracker, and profile manager
├── scripts/              # Setup, diagnostic, and demo server scripts
└── tests/                # Pytest unit & end-to-end test suite
```
