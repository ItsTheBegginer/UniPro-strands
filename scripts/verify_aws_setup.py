"""
Run this AFTER configuring AWS credentials and requesting Bedrock model
access, and BEFORE we build persistence/FastAPI on top. It calls the real
AWS APIs directly (bypassing Strands and the agent entirely) so any
failure here is unambiguously a credentials/permissions/region problem,
not a bug in our code.

Usage:
    python scripts/verify_aws_setup.py
"""
import os
import sys

from dotenv import load_dotenv

load_dotenv()

REGION = os.environ.get("AWS_REGION", "us-east-1")
MODEL_ID = os.environ.get("BEDROCK_MODEL_ID", "us.amazon.nova-2-lite-v1:0")


def check_credentials():
    import boto3

    print(f"[1/4] Checking AWS credentials (region={REGION})...")
    try:
        sts = boto3.client("sts", region_name=REGION)
        identity = sts.get_caller_identity()
        print(f"      OK — signed in as {identity['Arn']}")
        return True
    except Exception as e:
        print(f"      FAILED: {e}")
        print("      -> Run `aws configure` or set AWS_PROFILE in .env")
        return False


def check_bedrock_model_access():
    import boto3

    if os.environ.get("MODEL_PROVIDER", "gemini").lower() != "bedrock":
        print("[2/4] Bedrock check skipped (MODEL_PROVIDER is not 'bedrock').")
        return True

    print(f"[2/4] Checking Bedrock model access for {MODEL_ID}...")
    try:
        client = boto3.client("bedrock-runtime", region_name=REGION)
        client.converse(
            modelId=MODEL_ID,
            messages=[{"role": "user", "content": [{"text": "Reply with exactly: OK"}]}],
        )
        print("      OK — Bedrock responded")
        return True
    except Exception as e:
        print(f"      FAILED: {e}")
        if "not allowed" in str(e).lower() and not MODEL_ID.startswith(("eu.", "us.", "global.", "apac.")):
            print(
                f"      -> {REGION} has no in-region invocation for most Bedrock models -- "
                f"only cross-region inference profiles. Try prefixing MODEL_ID with 'eu.' "
                f"(e.g. eu.{MODEL_ID}) rather than the bare model ID. Find the exact profile "
                f"ID with: aws bedrock list-inference-profiles --region {REGION}"
            )
        else:
            print(
                "      -> In the AWS Console: Bedrock -> Model access -> request access "
                f"to {MODEL_ID} (or the model family). Access can take a few minutes to "
                "activate. Also confirm your IAM user/role has bedrock:InvokeModel."
            )
        return False


def check_strands_agent():
    print("[3/4] Checking the real Strands agent end-to-end (one live call)...")
    try:
        sys.path.insert(0, ".")
        from app.agent.unipro_agent import build_agent

        agent = build_agent()
        result = agent("Reply with exactly: UniPro is online.")
        print(f"      OK — agent responded: {str(result)[:200]}")
        return True
    except Exception as e:
        print(f"      FAILED: {e}")
        return False


def check_dynamodb():
    import boto3

    tables = [
        os.environ.get("DDB_TABLE_APPLICATIONS", "unipro-applications"),
        os.environ.get("DDB_TABLE_PROFILES", "unipro-profiles"),
        os.environ.get("DDB_TABLE_ACTIVITY", "unipro-activity"),
    ]
    print(f"[4/4] Checking DynamoDB tables {tables}...")
    ddb = boto3.client("dynamodb", region_name=REGION)
    existing = ddb.list_tables().get("TableNames", [])
    missing = [t for t in tables if t not in existing]
    if missing:
        print(f"      Tables not found yet: {missing}")
        print("      -> Run: python scripts/create_dynamodb_tables.py")
        return False
    print("      OK — all tables exist")
    return True


if __name__ == "__main__":
    results = [
        check_credentials(),
        check_bedrock_model_access(),
        check_strands_agent(),
        check_dynamodb(),
    ]
    print()
    if all(results):
        print("All checks passed. Safe to build persistence + FastAPI on top of this.")
    else:
        print("Fix the FAILED steps above before we continue — later phases assume these work.")
        sys.exit(1)
