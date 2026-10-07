from app.tools.profile import load_profile, save_profile
from app.tools.requirements import build_checklist, check_university_requirements, find_missing_information, get_requirements


def test_unknown_program_returns_error_not_a_guess():
    assert "error" in check_university_requirements("Nowhere U", "Basket Weaving")


def test_demo_cs_requirements_and_checklist():
    out = check_university_requirements("Demo University", "Computer Science")
    assert out["deadline"] and out["application_url"].endswith("/login.html")
    cl = out["checklist"]
    assert cl["resume"] == cl["transcript"] == cl["gpa"] == cl["education"] == "ready"
    assert cl["personal_statement"] == "needs_confirmation"     # AI draft only
    assert out["blocking_missing"] == [] and out["ready_to_start"]


def test_missing_document_blocks():
    p = load_profile()
    del p["documents"]["value"]["transcript"]
    save_profile(p)
    out = find_missing_information("demo university", "computer science")
    assert out["missing"] == ["transcript"] and out["ready"] is False


def test_missing_required_field_blocks():
    p = load_profile()
    p["gpa"] = {"value": None, "verified": False}
    save_profile(p)
    assert find_missing_information("Demo University", "Computer Science")["missing"] == ["gpa"]


def test_unverified_required_field_needs_confirmation_not_ready():
    p = load_profile()
    p["gpa"]["verified"] = False
    cl = build_checklist(get_requirements("Demo University", "Computer Science"), p)
    assert cl["checklist"]["gpa"] == "needs_confirmation"
