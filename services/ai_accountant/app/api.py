from __future__ import annotations

from fastapi import APIRouter, Body, HTTPException

from .analysis import prepare_response, run_llm
from .config import get_settings
from .llm_client import client
from .schemas import AccountantRequest, AccountantResponse, HealthResponse

router = APIRouter(prefix="/api/accountant", tags=["accountant"])


@router.get("/health", response_model=HealthResponse)
async def health() -> HealthResponse:
    settings = get_settings()
    models_raw = await client.list_models()
    available = [item.get("name") for item in models_raw.get("models", [])]
    return HealthResponse(
        status="ok",
        model=settings.ollama_model,
        ollama=settings.ollama_base_url,
        model_available=settings.ollama_model in available,
    )


@router.post("/analyze", response_model=AccountantResponse)
async def analyze_parts(payload: AccountantRequest = Body(...)) -> AccountantResponse:
    if not payload.part_1 or not payload.part_4 or not payload.part_16:
        raise HTTPException(status_code=400, detail="part_1, part_4 и part_16 обязательны")

    extraction, debug = await run_llm(payload)
    return prepare_response(extraction, debug)