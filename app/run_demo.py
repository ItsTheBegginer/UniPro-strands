"""
Interactive terminal demo (Phases 11-13):

    python -m app.run_demo

Start the portal first:  python scripts/serve_demo_university.py
UniPro fills what it safely can, pauses for the student on sensitive
questions, then waits for YOUR final approval before submitting.
"""
from __future__ import annotations

import argparse

from dotenv import load_dotenv

from app.agent import runner
from app.state_machine.states import ApplicationState as S


def main() -> None:
    load_dotenv()
    p = argparse.ArgumentParser()
    p.add_argument("--university", default="Demo University")
    p.add_argument("--program", default="Computer Science")
    p.add_argument("--app-id", default=None, help="Resume an existing application id")
    args = p.parse_args()

    if args.app_id:
        result = runner.status(args.app_id)
    else:
        result = runner.start_application(args.university, args.program)
    app_id = result["application_id"]

    while True:
        st = S(result["state"])
        print(f"\n=== [{app_id}] state: {st.value} ===")
        if st == S.STUDENT_ACTION_REQUIRED:
            pend = result["pending"]
            print(f"\nUniPro needs your answer.\nQuestion: {pend['question']}\nWhy: {pend['reason']}")
            if pend.get("proposed_answer"):
                print(f"Suggested: {pend['proposed_answer']}")
            result = runner.provide_answer(app_id, input("Your answer: "))
        elif st == S.AWAITING_FINAL_APPROVAL:
            print("\nApplication ready. Review it in the browser window.")
            choice = input("Type SUBMIT to submit, or describe changes (blank to stop): ").strip()
            if choice == "SUBMIT":
                result = runner.approve_and_submit(app_id)
            elif choice:
                result = runner.request_changes(app_id, choice)
            else:
                break
        elif st == S.FAILED and input(f"Failed: {result.get('failure')}. Retry? [y/N] ").lower() == "y":
            result = runner.retry(app_id)
        elif st == S.RUNNING:
            result = runner.nudge(app_id)
        else:
            break
        if result.get("error"):
            print("!", result["error"])

    print("\n--- Activity ---")
    print("\n".join(runner.format_timeline(app_id)))


if __name__ == "__main__":
    main()
