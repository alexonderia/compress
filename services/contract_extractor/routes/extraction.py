from fastapi import APIRouter, File, Query, UploadFile
from pydantic import BaseModel

from typing import Any

from ..handlers.extraction import ensure_qa_service, qa_docx, qa_sections


class SectionsPayload(BaseModel):
    sections: dict[str, Any] | list[Any]

router = APIRouter()


@router.get("/healthz")
async def healthz():
    return {"status": "ok"}


@router.post("/qa/docx")
async def qa_docx_route(file: UploadFile = File(...), plan: str = Query("default")):
    return await qa_docx(file, plan)


@router.post("/qa/sections")
async def qa_sections_route(payload: SectionsPayload, plan: str = Query("default")):
    return await qa_sections(payload.sections, plan)


__all__ = ["router", "ensure_qa_service"]
