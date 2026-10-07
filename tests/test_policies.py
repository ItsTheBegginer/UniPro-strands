from app.agent.policies import RiskLevel, check_fill_allowed, classify_field, evaluate_tool_call


def test_low_risk_fields_are_low():
    for f in ("gpa", "email", "name", "education", "address", "education.degree"):
        assert classify_field(f) == RiskLevel.LOW


def test_high_risk_keywords_override_everything():
    assert classify_field("name", "Explain any disciplinary history") == RiskLevel.HIGH
    assert classify_field("essay", "Describe your financial aid situation") == RiskLevel.HIGH
    assert classify_field("Have you ever been subject to disciplinary action?") == RiskLevel.HIGH
    assert classify_field("Legal declaration") == RiskLevel.HIGH


def test_legal_name_is_not_high_risk():
    assert classify_field("Legal name", "") != RiskLevel.HIGH


def test_unknown_field_defaults_to_medium_not_low():
    assert classify_field("some_random_new_field") == RiskLevel.MEDIUM
    assert classify_field("personal_statement") == RiskLevel.MEDIUM


def test_forbidden_tools_including_submit():
    for name in ("bypass_captcha", "bypass_otp", "make_payment", "submit_application"):
        assert evaluate_tool_call(name)[0] is False
    assert evaluate_tool_call("fill_field")[0] is True


AUTO = {"GPA": {"action": "auto_fill", "risk": "low", "value": 8.7}}


def test_fill_allows_only_the_verified_value():
    assert check_fill_allowed("GPA", "8.7", AUTO, {})[0]
    assert not check_fill_allowed("GPA", "9.9", AUTO, {})[0]          # invented value
    assert not check_fill_allowed("Unmapped", "x", AUTO, {})[0]       # never mapped


def test_fill_refuses_high_risk_unless_student_answered():
    m = {"Disc": {"action": "ask_student", "risk": "high"}}
    assert not check_fill_allowed("Disc", "no", m, {})[0]
    assert check_fill_allowed("Disc", "no", m, {"Disc": "no"})[0]
    assert not check_fill_allowed("Disc", "yes", m, {"Disc": "no"})[0]  # differs from student's answer


def test_fill_refuses_unconfirmed_proposal():
    m = {"Statement": {"action": "propose_and_confirm", "risk": "medium", "value": "draft"}}
    assert not check_fill_allowed("Statement", "draft", m, {})[0]
