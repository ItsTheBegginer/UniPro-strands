"""
Model provider layer (Phase 2).

UniPro / Strands never import a concrete model directly; they call
`get_model()`, which reads MODEL_PROVIDER from the environment. Gemini is the
default because Bedrock model invocation is currently blocked on this AWS
account; Bedrock remains a one-line switch (MODEL_PROVIDER=bedrock) for later.

    MODEL_PROVIDER=gemini | bedrock
    GEMINI_API_KEY, GEMINI_MODEL_ID      (default gemini-2.5-flash)
    BEDROCK_MODEL_ID, AWS_REGION
"""
from __future__ import annotations

import os

from dotenv import load_dotenv

load_dotenv()


def get_model():
    """Return a Strands-compatible model instance for the configured provider."""
    provider = os.getenv("MODEL_PROVIDER", "gemini").strip().lower()

    if provider == "gemini":
        try:
            from strands.models.gemini import GeminiModel
        except ImportError as exc:  # the gemini extra pulls in google-genai
            raise RuntimeError(
                "Gemini support is not installed. Run: pip install 'strands-agents[gemini]'"
            ) from exc

        api_key = os.getenv("GEMINI_API_KEY")
        if not api_key:
            raise RuntimeError("GEMINI_API_KEY is not set (put it in .env).")

        from google.genai import types

        retry_options = types.HttpRetryOptions(
            attempts=5,
            initial_delay=1.0,
            max_delay=30.0,
            http_status_codes=[408, 429, 500, 502, 503, 504],
        )
        http_options = types.HttpOptions(retry_options=retry_options)

        return GeminiModel(
            client_args={"api_key": api_key, "http_options": http_options},
            model_id=os.getenv("GEMINI_MODEL_ID", "gemini-3.6-flash"),
            # Thinking tokens count against the output limit; keep headroom
            # so tool-call turns are never truncated.
            params={"temperature": 0.2, "max_output_tokens": 8192},
        )

    if provider == "bedrock":
        from strands.models import BedrockModel

        model_id = os.getenv("BEDROCK_MODEL_ID")
        if not model_id:
            raise RuntimeError("BEDROCK_MODEL_ID is not set (e.g. us.amazon.nova-2-lite-v1:0).")
        return BedrockModel(model_id=model_id, region_name=os.getenv("AWS_REGION", "us-east-1"))

    raise ValueError(f"Unknown MODEL_PROVIDER '{provider}'. Use 'gemini' or 'bedrock'.")
