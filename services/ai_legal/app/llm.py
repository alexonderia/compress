from __future__ import annotations

import json
from typing import Any, Iterable

import httpx

from .schemas import LlmDebugInfo
from .settings import get_settings


class OllamaClient:
    """Минимальный клиент для обращения к Ollama."""

    def __init__(self, base_url: str | None = None, model: str | None = None, timeout: float | None = None) -> None:
        cfg = get_settings()
        self.base_url = (base_url or cfg.ollama_base_url).rstrip("/")
        self.model = model or cfg.ollama_model
        self.timeout = timeout or cfg.ollama_timeout

    async def chat(self, messages: Iterable[dict[str, str]], *, model: str | None = None) -> dict[str, Any]:
        payload = {
            "model": model or self.model,
            "messages": list(messages),
            "stream": False,
            "options": {"temperature": 0, "seed": 123},
        }
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.post(f"{self.base_url}/api/chat", json=payload)
            response.raise_for_status()
            return response.json()

    async def list_models(self) -> dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            response = await client.get(f"{self.base_url}/api/tags")
            response.raise_for_status()
            return response.json()


def extract_reply(data: dict[str, Any]) -> str:
    message = data.get("message") if isinstance(data, dict) else None
    if isinstance(message, dict):
        content = message.get("content") or message.get("text")
        if isinstance(content, str):
            return content.strip()
        if isinstance(content, list):
            joined = "\n".join(str(part) for part in content)
            return joined.strip()
    fallback = data.get("response") or data.get("reply") if isinstance(data, dict) else ""
    return str(fallback or "").strip()


def build_debug_info(messages: list[dict[str, str]], raw: dict[str, Any]) -> LlmDebugInfo:
    prompt_pretty = json.dumps(messages, ensure_ascii=False, indent=2)
    response_pretty = json.dumps(raw, ensure_ascii=False, indent=2)
    return LlmDebugInfo(
        prompt=messages,
        prompt_formatted=prompt_pretty,
        response=raw,
        response_formatted=response_pretty,
    )


client = OllamaClient()