import pytest

from app.state_machine.states import ApplicationState as S
from app.state_machine.states import ApplicationStateMachine, InvalidTransition

HAPPY = [S.PREPARING, S.REQUIREMENTS_CHECK, S.READY_TO_RUN, S.RUNNING, S.STUDENT_ACTION_REQUIRED,
         S.RUNNING, S.READY_TO_SUBMIT, S.AWAITING_FINAL_APPROVAL, S.SUBMITTING, S.SUBMITTED]


def test_legal_happy_path():
    sm = ApplicationStateMachine(application_id="a")
    for s in HAPPY:
        sm.transition(s)
    assert sm.state == S.SUBMITTED and len(sm.activity_log) == len(HAPPY)


@pytest.mark.parametrize("target", [S.SUBMITTED, S.SUBMITTING, S.AWAITING_FINAL_APPROVAL, S.RUNNING])
def test_cannot_skip_ahead_from_draft(target):
    with pytest.raises(InvalidTransition):
        ApplicationStateMachine(application_id="a").transition(target)


def test_cannot_submit_without_final_approval_state():
    sm = ApplicationStateMachine(application_id="a", state=S.RUNNING)
    with pytest.raises(InvalidTransition):
        sm.transition(S.SUBMITTING)
    with pytest.raises(InvalidTransition):
        sm.transition(S.SUBMITTED)


def test_submitted_is_terminal():
    with pytest.raises(InvalidTransition):
        ApplicationStateMachine(application_id="a", state=S.SUBMITTED).transition(S.RUNNING)


def test_failure_is_recoverable():
    sm = ApplicationStateMachine(application_id="a", state=S.FAILED)
    sm.transition(S.RUNNING)


def test_round_trip_serialization():
    sm = ApplicationStateMachine(application_id="a")
    sm.transition(S.PREPARING)
    restored = ApplicationStateMachine.from_dict(sm.to_dict())
    assert restored.state == sm.state and len(restored.activity_log) == 1
