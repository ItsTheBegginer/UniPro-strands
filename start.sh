#!/usr/bin/env bash
# UniPro — one-command launcher
# Starts all three services: FastAPI backend, demo university portal, and React frontend.
#
# Usage:  ./start.sh
# Stop:   Press Ctrl+C  (kills all three background processes)

set -e
cd "$(dirname "$0")"

# ── Activate Python virtual env ───────────────────────────────────────────────
if [ -f ".venv/bin/activate" ]; then
  source .venv/bin/activate
elif [ -f "venv/bin/activate" ]; then
  source venv/bin/activate
else
  echo "❌  No virtual environment found." >&2
  echo "    Run:  python -m venv .venv && pip install -e ." >&2
  exit 1
fi

# ── Seed demo profile if needed ───────────────────────────────────────────────
if [ ! -f "app/data/student_profile.json" ] && [ ! -d "app/data/profiles" ]; then
  echo "🌱  Seeding demo student profile…"
  python scripts/seed_demo_profile.py
fi

echo ""
echo "🚀  Starting UniPro services…"
echo ""

# [1] Demo university portal (port 8080)
echo "  [1/3]  Demo University Portal  →  http://localhost:8080"
python scripts/serve_demo_university.py &
PORTAL_PID=$!

# [2] FastAPI backend (port 8000)  — brief delay so deps load cleanly
sleep 1
echo "  [2/3]  FastAPI Backend          →  http://localhost:8000"
uvicorn app.api.routes:app --reload --port 8000 &
API_PID=$!

# [3] React dev server (port 5173)
sleep 1
echo "  [3/3]  React Frontend           →  http://localhost:5173"
cd frontend && npm run dev &
FRONTEND_PID=$!
cd ..

echo ""
echo "✅  All services started."
echo "    Open  http://localhost:5173  in your browser."
echo "    Press Ctrl+C to stop everything."
echo ""

# Kill all children on Ctrl+C / exit
cleanup() {
  echo ""
  echo "Stopping services…"
  kill "$PORTAL_PID" "$API_PID" "$FRONTEND_PID" 2>/dev/null || true
  echo "Done."
}
trap cleanup EXIT INT TERM

# Keep script alive
wait

