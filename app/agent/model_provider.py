"""
Model provider layer (Phase 2).

UniPro / Strands never import a concrete model directly; they call
`get_model()`, which reads MODEL_PROVIDER from the environment.

    MODEL_PROVIDER=bedrock | gemini
    BEDROCK_MODEL_ID (default us.amazon.nova-lite-v1:0)
    AWS_REGION (default us-east-1)
    GEMINI_API_KEY, GEMINI_MODEL_ID (default gemini-3.6-flash)
"""
from __future__ import annotations

import logging
import os

from dotenv import load_dotenv

load_dotenv(override=True)

logger = logging.getLogger("unipro.model_provider")


def get_model():
    """Return a Strands-compatible model instance for the configured provider."""
    provider = os.getenv("MODEL_PROVIDER", "bedrock").strip().lower()

    if provider == "bedrock":
        from strands.models import BedrockModel
        import botocore.config

        model_id = os.getenv("BEDROCK_MODEL_ID", "eu.amazon.nova-lite-v1:0").strip()
        region_name = os.getenv("BEDROCK_REGION", "eu-north-1").strip()
        boto_config = botocore.config.Config(
            retries={"max_attempts": 5, "mode": "adaptive"}
        )
        return BedrockModel(
            model_id=model_id,
            region_name=region_name,
            temperature=float(os.getenv("BEDROCK_TEMPERATURE", "0.1")),
            max_tokens=int(os.getenv("BEDROCK_MAX_TOKENS", "4096")),
            boto_client_config=boto_config,
        )

    if provider == "gemini":
        try:
            from strands.models.gemini import GeminiModel
        except ImportError as exc:
            raise RuntimeError(
                "Gemini support is not installed. Run: pip install strands-agents[gemini]"
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
            params={"temperature": 0.2, "max_output_tokens": 8192},
        )

    raise ValueError(f"Unknown MODEL_PROVIDER \"{provider}\". Use 'bedrock' or 'gemini'.")
