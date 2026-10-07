from app.tools.mapping import map_field, match_source
from app.tools.profile import load_profile


def m(label, question=""):
    return map_field(label, load_profile(), question)


def test_alias_match_auto_fills_verified_low_risk():
    out = m("Undergraduate GPA")
    assert (out["source"], out["value"], out["verified"], out["risk"], out["action"]) == \
        ("student_profile.gpa", 8.7, True, "low", "auto_fill")
    assert out["confidence"] >= 0.9


def test_nested_sources():
    assert m("Institution")["value"] == "Example Institute of Technology"
    assert m("SAT score")["value"] == 1480
    assert m("Graduation year")["value"] == 2027


def test_label_normalization():
    assert m("Full name *")["action"] == "auto_fill"
    assert m("Email address:")["value"] == "alex.johnson.demo@example.com"


def test_disciplinary_question_is_never_answered():
    out = m("Have you ever been subject to disciplinary action?")
    assert out["risk"] == "high" and out["action"] == "ask_student" and "value" not in out


def test_high_risk_wins_even_with_a_profile_match():
    out = m("name", "Have you ever been subject to disciplinary action?")
    assert out["action"] == "ask_student" and "value" not in out


def test_unverified_draft_is_proposed_not_filled():
    out = m("Personal statement")
    assert out["action"] == "propose_and_confirm" and out["verified"] is False


def test_missing_value_asks_student_and_never_invents():
    out = m("Work experience")
    assert out["action"] == "ask_student" and "value" not in out


def test_unknown_field_asks_student():
    out = m("Favorite programming language")
    assert out["action"] == "ask_student" and "value" not in out


def test_fuzzy_match_can_never_auto_fill():
    source, conf = match_source("Undergrad GPA score")
    assert conf <= 0.85
    out = m("Undergrad GPA score")
    assert out["action"] != "auto_fill"
