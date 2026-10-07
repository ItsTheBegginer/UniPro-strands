"""
Reset the demo student profile to its seed state (also resets any run state).
Deliberately incomplete: `experience` is missing and `personal_statement` is
an unverified AI draft, so the demo shows UniPro refusing to guess and asking.

Run: python scripts/seed_demo_profile.py
"""
import shutil
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent.parent))

from app.tools.profile import save_profile

PROFILE = {
    "student_id": "demo-student",
    "name": {"value": "Alex Johnson", "verified": True},
    "email": {"value": "alex.johnson.demo@example.com", "verified": True},
    "date_of_birth": {"value": "2004-03-14", "verified": True},
    "address": {"value": "221B Example Street, Mumbai, India", "verified": True},
    "education": {
        "value": [{"institution": "Example Institute of Technology", "degree": "B.Tech Computer Science"}],
        "verified": True,
    },
    "graduation_year": {"value": 2027, "verified": True},
    "gpa": {"value": 8.7, "verified": True},
    "skills": {"value": ["Python", "Machine Learning", "JavaScript"], "verified": True},
    "test_scores": {"value": {"SAT": 1480}, "verified": True},
    "experience": {"value": None, "verified": False},
    "personal_statement": {
        "value": "I have always been fascinated by how software can solve real-world problems at scale.",
        "verified": False,
        "source": "ai_draft",
    },
    "documents": {
        "value": {
            "resume": "app/data/documents/resume.pdf",
            "transcript": "app/data/documents/transcript.pdf",
        },
        "verified": True,
    },
}

if __name__ == "__main__":
    save_profile(PROFILE)
    runs = Path(__file__).resolve().parent.parent / "app" / "data" / "runs"
    if runs.exists():
        shutil.rmtree(runs)
    print("Seeded demo profile and cleared run state.")
