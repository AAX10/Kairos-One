# =============================================================================
# Kairos One — Gemini Service Abstraction
# Provides structured generation via Google AI Studio.
# =============================================================================

import time
from typing import TypeVar

from pydantic import BaseModel, ValidationError

try:
    from google import genai
    from google.genai import types
except ImportError:
    genai = None

from config import get_settings
from services.logging_service import get_logger

T = TypeVar("T", bound=BaseModel)

logger = get_logger("gemini")

MAX_RETRIES = 3


class GeminiService:
    """Abstraction over Google AI Studio / Gemini API."""

    def __init__(self) -> None:
        settings = get_settings()
        self._api_key = settings.gemini_api_key
        self._model = settings.gemini_model
        self._configured = settings.gemini_configured

        self._client = None
        if self._configured and genai is not None:
            self._client = genai.Client(api_key=self._api_key)
            logger.info("Gemini service initialized with model=%s", self._model)
        else:
            logger.warning("Gemini service running in mock mode (no API key or missing SDK)")

    @property
    def is_configured(self) -> bool:
        """Whether a real Gemini API key is available."""
        return self._configured and self._client is not None

    def _sanitize_schema(self, schema: dict) -> dict:
        """Recursively resolves $ref, removes $defs, and prepares schema for Gemini SDK.
        This prevents the SDK from choking on nested Pydantic schemas ($refs) and 
        avoids the 'dict' object has no attribute 'upper' error.
        """
        import copy
        schema_copy = copy.deepcopy(schema)
        defs = schema_copy.pop("$defs", {})
        
        def resolve(node, is_properties_map=False):
            if isinstance(node, dict):
                if "$ref" in node:
                    ref_name = node["$ref"].split("/")[-1]
                    return resolve(copy.deepcopy(defs.get(ref_name, {})))
                
                # Gemini SDK doesn't support 'title', but we must not remove 'title' 
                # if it is a key in the properties map.
                if not is_properties_map:
                    node.pop("title", None)
                    node.pop("description", None)
                    node.pop("default", None)
                    node.pop("additionalProperties", None)
                
                # Convert 'type' to uppercase as expected by Google GenAI Schema format
                if "type" in node and isinstance(node["type"], str):
                    node["type"] = node["type"].upper()
                    
                for k, v in list(node.items()):
                    node[k] = resolve(v, is_properties_map=(k == "properties"))
            elif isinstance(node, list):
                for i in range(len(node)):
                    node[i] = resolve(node[i])
            return node
            
        return resolve(schema_copy)

    async def generate_structured(
        self,
        prompt: str,
        system_instruction: str,
        response_model: type[T],
        mock_response: T,
    ) -> T:
        """Generate a structured response from Gemini using Pydantic."""
        if not self.is_configured:
            logger.debug(
                "Gemini not configured — returning mock response for %s",
                response_model.__name__,
            )
            return mock_response

        logger.info("Generating structured output for %s", response_model.__name__)
        
        # Sanitize Pydantic schema for Gemini SDK
        raw_schema = response_model.model_json_schema()
        sanitized_schema = self._sanitize_schema(raw_schema)

        for attempt in range(1, MAX_RETRIES + 1):
            start_time = time.perf_counter()
            try:
                response = await self._client.aio.models.generate_content(
                    model=self._model,
                    contents=prompt,
                    config=types.GenerateContentConfig(
                        system_instruction=system_instruction,
                        response_mime_type="application/json",
                        response_schema=sanitized_schema,
                        temperature=0.2,
                    ),
                )

                duration_ms = (time.perf_counter() - start_time) * 1000
                logger.info(
                    "Gemini API call completed | model=%s | schema=%s | latency=%.1fms",
                    self._model,
                    response_model.__name__,
                    duration_ms,
                )

                # The SDK automatically returns a parsed pydantic object if response_schema is provided as a model.
                # Since we passed a sanitized dict, we must manually parse response.text.
                if response.text:
                    try:
                        return response_model.model_validate_json(response.text)
                    except ValidationError as ve:
                        logger.error("Gemini output failed validation against %s.\nRaw Output:\n%s\nValidation Errors: %s", 
                                     response_model.__name__, response.text, ve.errors())
                        raise ve
                
                raise ValueError("Empty response text from Gemini.")

            except Exception as e:
                import traceback
                duration_ms = (time.perf_counter() - start_time) * 1000
                logger.warning(
                    "Gemini API call failed (attempt %d/%d) | schema=%s | error=%s | latency=%.1fms\nTraceback: %s",
                    attempt,
                    MAX_RETRIES,
                    response_model.__name__,
                    str(e),
                    duration_ms,
                    traceback.format_exc()
                )
                if attempt == MAX_RETRIES:
                    logger.error("All retries exhausted for %s.", response_model.__name__)
                    from utils.exceptions import SentinelException
                    raise SentinelException("ai_generation_failed", "AI Generation Failed. Please try again.")

                backoff_time = min(2 ** (attempt - 1), 10)
                logger.info("Retrying Gemini API in %d seconds...", backoff_time)
                import asyncio
                await asyncio.sleep(backoff_time)

        from utils.exceptions import SentinelException
        raise SentinelException("ai_generation_failed", "AI Generation Failed. Please try again.")

    async def health(self) -> dict[str, str]:
        """Check Gemini service health."""
        if not self.is_configured:
            return {
                "status": "mock",
                "model": self._model,
                "detail": "Running without API key — mock mode active",
            }

        return {
            "status": "configured",
            "model": self._model,
            "detail": "API key present — integrated with Gemini 2.5 Flash",
        }


# =============================================================================
# Singleton
# =============================================================================

_gemini_service: GeminiService | None = None


def get_gemini_service() -> GeminiService:
    """Get or create the singleton GeminiService instance."""
    global _gemini_service  # noqa: PLW0603
    if _gemini_service is None:
        _gemini_service = GeminiService()
    return _gemini_service

