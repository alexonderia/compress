from __future__ import annotations

from pydantic import BaseModel, Field


class HealthResponse(BaseModel):
    status: str
    model: str
    ollama: str
    model_available: bool


class AccountantRequest(BaseModel):
    part_1: str = Field(..., description="Основной текст договора (часть 1)")
    part_4: str = Field(..., description="Сумма и НДС договора (часть 4)")
    part_16: str = Field(..., description="Спецификация договора (часть 16)")


class LlmExtraction(BaseModel):
    contract_type: str | None = None
    subject_part1: str | None = None
    subject_part16: str | None = None
    subject_consistent: bool | None = None
    amount_part4: float | None = None
    vat_part4: str | float | None = None
    amount_part16: float | None = None
    vat_part16: str | float | None = None
    amount_consistent: bool | None = None
    vat_consistent: bool | None = None


class AccountantResponse(BaseModel):
    res: str
    type: str
    RED_FLAGS: str
    details: dict | None = None