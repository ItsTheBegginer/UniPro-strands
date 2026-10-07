import pytest

from app.tools.profile import (field_state, get_verified_information, get_student_profile, load_profile,
                               resolve_document_path, resolve_source, student_confirm_field,
                               update_student_profile, verification_status)


def test_agent_can_retrieve_gpa_from_the_real_profile():
    assert get_verified_information()["gpa"] == 8.7


def test_unverified_and_missing_values_are_never_returned_as_verified():
    v = get_verified_information()
    assert "personal_statement" not in v      # AI draft, unverified
    assert "experience" not in v              # missing
    st = verification_status(load_profile())
    assert "personal_statement" in st["unverified"] and "experience" in st["missing"]


def test_full_profile_reports_verification_status():
    assert "verification_status" in get_student_profile()


def test_agent_update_is_always_unverified():
    update_student_profile("experience", "Intern at Acme")
    assert field_state(load_profile()["experience"]) == "unverified"
    assert "experience" not in get_verified_information()


def test_only_student_confirmation_verifies():
    student_confirm_field("personal_statement")
    assert "personal_statement" in get_verified_information()


def test_cannot_verify_a_field_with_no_value():
    with pytest.raises(ValueError):
        student_confirm_field("experience")


def test_dotted_resolution_and_nothing_invented():
    p = load_profile()
    assert resolve_source(p, "test_scores.SAT") == (1480, "verified")
    assert resolve_source(p, "education.degree")[0] == "B.Tech Computer Science"
    assert resolve_source(p, "education.gpa") == (None, "missing")
    assert resolve_source(p, "nonexistent") == (None, "missing")


def test_documents_resolve_only_when_verified_and_present():
    assert resolve_document_path("resume").endswith("resume.pdf")
    assert resolve_document_path("passport") is None
