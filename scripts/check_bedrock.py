# Test AWS Bedrock model invocation (Amazon Nova in eu-north-1).
import os
import boto3
from dotenv import load_dotenv

load_dotenv(override=True)

region = os.getenv("BEDROCK_REGION", "eu-north-1")
target_model = os.getenv("BEDROCK_MODEL_ID", "eu.amazon.nova-lite-v1:0")

print(f"Testing AWS Bedrock in region: {region}")
print(f"Target model ID: {target_model}")

client = boto3.client("bedrock-runtime", region_name=region)

candidates = [
    target_model,
    "eu.amazon.nova-lite-v1:0",
    "amazon.nova-lite-v1:0",
    "eu.amazon.nova-micro-v1:0",
]

seen = set()
models_to_try = [m for m in candidates if not (m in seen or seen.add(m))]

success = False
for model_id in models_to_try:
    print(f"\n--- Trying model: {model_id} ---")
    try:
        r = client.converse(
            modelId=model_id,
            messages=[{"role": "user", "content": [{"text": "Reply with the single word: OK"}]}],
            inferenceConfig={"maxTokens": 20, "temperature": 0.1},
        )
        reply = r["output"]["message"]["content"][0]["text"].strip()
        print(f"SUCCESS: Bedrock responded: {reply}")
        success = True
        break
    except Exception as exc:
        err = str(exc)
        if "Operation not allowed" in err:
            print(f"BLOCKED: Model access is not enabled in AWS for {model_id}.")
        elif "ResourceNotFoundException" in err:
            print(f"NOT FOUND: Model {model_id} is not supported or not available in {region}.")
        else:
            print(f"ERROR: {type(exc).__name__}: {err}")

if success:
    print(f"\n=== BEDROCK AMAZON NOVA IS WORKING IN {region}! ===")
else:
    print(f"\nCould not invoke Nova in {region}. Check AWS credentials.")
