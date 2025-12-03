"""Utilities for extracting specification tables from blocks."""
from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Literal

from .models import Block
from .reader import load_blocks
from .utils import is_specification_table

BlockType = Literal["paragraph", "table"]


@dataclass(slots=True)
class TableRegion:
    index: int
    start_index: int
    end_index: int
    block: Block


@dataclass(slots=True)
class SpecificationResult:
    heading: str
    start_index: int
    end_index: int
    tables: list[TableRegion]
    start_block: Block
    end_block: Block


class UnsupportedDocumentError(RuntimeError):
    """Raised when a document cannot be parsed."""


def extract_specification(filename: str, content: bytes) -> SpecificationResult:
    suffix = Path(filename or "").suffix.lower()
    if suffix not in {".docx", ".txt", ".md"}:
        raise UnsupportedDocumentError("Поддерживаются только файлы DOCX и TXT")

    blocks = load_blocks(filename, content)
    return extract_specification_from_blocks(blocks)


def extract_specification_from_blocks(blocks: list[Block]) -> SpecificationResult:
    result = _locate_specification(blocks)
    if result is None:
        raise ValueError("В документе не найден раздел 'Спецификация' с таблицами")
    return result


def _locate_specification(blocks: list[Block]) -> SpecificationResult | None:
    best_result: tuple[tuple[int, int], SpecificationResult] | None = None

    for idx, block in enumerate(blocks):
        if not _is_heading_candidate(block):
            continue
        collected = _collect_tables_after_heading(blocks, idx)
        if collected is None:
            continue

        tables, end_index = collected
        if not tables:
            continue
        heading_text = (block.text or "").strip() or "Спецификация"
        priority = _heading_priority(heading_text)
        key = (priority, idx)

        result = SpecificationResult(
            heading=heading_text,
            start_index=idx,
            end_index=end_index,
            tables=tables,
            start_block=block,
            end_block=blocks[end_index],
        )

        if best_result is None or key < best_result[0]:
            best_result = (key, result)

    if best_result is None:
        return None
    return best_result[1]


def _heading_priority(text: str) -> int:
    normalized = text.casefold()
    if "спецификац" in normalized:
        return 0
    if "приложение" in normalized:
        return 1
    return 2


def _is_heading_candidate(block: Block) -> bool:
    if block.type != "paragraph":
        return False

    text = (block.text or "").casefold()
    if not text.strip():
        return False

    words = text.split()
    if len(words) > 8 and "спецификац" in text:
        return False

    spec_patterns = [
        "пецификац",
        "пецификация №",
        "приложение №",
        "к договору",
        "номенклатура, характеристика",
    ]

    return any(pattern in text for pattern in spec_patterns)


def _collect_tables_after_heading(blocks: list[Block], index: int) -> tuple[list[TableRegion], int] | None:
    end_patterns = ["общая цена", "общая сумма"]

    tables: list[TableRegion] = []
    last_relevant_index = index
    found_tables = False

    for cursor in range(index + 1, len(blocks)):
        block = blocks[cursor]

        if block.type == "paragraph":
            text = (block.text or "").strip()
            normalized = text.casefold()

            if not text:
                continue

            if found_tables and any(pattern in normalized for pattern in end_patterns):
                last_relevant_index = cursor
                break

            if found_tables and _looks_like_heading(text):
                break

            if not found_tables:
                continue

            last_relevant_index = cursor
            continue

        if block.type != "table":
            continue
        rows = block.rows or []
        if not rows:
            continue

        if not is_specification_table(block):
            if found_tables:
                break
            continue

        tables.append(TableRegion(index=cursor, start_index=cursor, end_index=cursor, block=block))
        last_relevant_index = cursor
        found_tables = True

    if not tables:
        return None
    if last_relevant_index < tables[-1].end_index:
        last_relevant_index = tables[-1].end_index

    return tables, last_relevant_index


def _looks_like_heading(text: str) -> bool:
    normalized = text.strip()
    if not normalized:
        return False

    if len(normalized) <= 80 and normalized == normalized.upper():
        return True

    if normalized.endswith(":") and len(normalized) <= 120:
        return True

    if normalized.startswith("Приложение"):
        return True

    return False


__all__ = [
    "SpecificationResult",
    "TableRegion",
    "UnsupportedDocumentError",
    "extract_specification",
    "extract_specification_from_blocks",
]