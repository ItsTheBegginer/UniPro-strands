# Competition Code Map

This document maps out the architecture of the UniPro system to clarify what was migrated from previous conceptual work and what is new for the AWS hackathon.

## Old Architecture (Pre-Hackathon) -> New Architecture (AWS Hackathon)

| Component | Old Architecture | New Architecture (Hackathon Submission) |
| --- | --- | --- |
| **Agent Framework** | Google ADK | **Strands Agents** |
| **LLM Provider** | Google Gemini | **Provider layer** (`app/agent/model_provider.py`): Gemini now, Bedrock pluggable via `MODEL_PROVIDER` |
| **Storage (State)** | In-memory Dict -> SQLite | SQLite -> **DynamoDB (Planned)** |
| **Document Storage** | Local File System | **Amazon S3 (Planned)** |
| **Tools** | ADK Python Tools | **Strands Python Tools** |
| **Browser Automation**| Playwright (Sync) -> Async | Playwright Async Adapter System |
| **Frontend UI** | Next.js / Tailwind | Next.js / Tailwind (Modified for Approvals) |
| **Backend API** | FastAPI | FastAPI |

## Core Agent Loop (New)
The most significant change is the core decision-making loop. Instead of relying on old routing, the Strands agent runs a persistent loop that actively evaluates if a human needs to intervene (the `Human Approval System`).
