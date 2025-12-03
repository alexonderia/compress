"""Utility helpers for recognizing specification tables."""
from __future__ import annotations

import re

from .models import Block

_HEADER_KEYWORDS = [
    "наименован",
    "характерист",
    "товар",
    "ед.",
    "ед.изм",
    "кол",
    "кол-во",
    "количество",
    "цена",
    "сумм",
    "стоим",
    "срок",
]

_DATA_KEYWORDS = [
    "шт",
    "компл",
    "услуг",
    "руб",
    "eur",
    "usd",
    "парт",
    "лот",
]

_EXCLUDE_ROW_PATTERNS = [
    r"\bитог",
    r"\bвсего",
    r"\bобщая",
    r"\bсумма договора",
    r"\bцена",
]

_non_digit_re = re.compile(r"\D")
_whitespace_re = re.compile(r"\s+")


def _normalize(text: str) -> str:
    return _whitespace_re.sub(" ", text).strip().casefold()


def table_has_goods(rows: list[list[str]]) -> bool:
    header_band = min(2, len(rows))

    for index, row in enumerate(rows[1:], start=1):
        combined = " ".join(cell or "" for cell in row)
        normalized = _normalize(combined)
        if not normalized:
            continue

        if any(re.search(pattern, normalized) for pattern in _EXCLUDE_ROW_PATTERNS):
            continue

        if index < header_band and any(keyword in normalized for keyword in _HEADER_KEYWORDS):
            continue

        if any(keyword in normalized for keyword in _DATA_KEYWORDS):
            return True

        digit_count = sum(ch.isdigit() for ch in normalized)
        alpha_count = sum(ch.isalpha() for ch in normalized)

        if digit_count >= 3 and alpha_count >= 3:
            return True

        if digit_count >= 4:
            normalized_cells = [_normalize(cell or "") for cell in row if cell]
            if not normalized_cells:
                continue
            has_numeric_cell = any(sum(ch.isdigit() for ch in cell) >= 2 for cell in normalized_cells)
            has_text_cell = any(sum(ch.isalpha() for ch in cell) >= 2 for cell in normalized_cells)
            if has_numeric_cell and has_text_cell:
                return True

    return False


def is_specification_table(block: Block) -> bool:
    if block.type != "table":
        return False

    rows = block.rows or []
    if len(rows) < 2:
        return False

    header_candidates = [_normalize(" ".join(rows[i])) for i in range(min(2, len(rows)))]
    header = " ".join(candidate for candidate in header_candidates if candidate)
    if not header:
        return False

    has_header_keywords = any(
        keyword in candidate for candidate in header_candidates for keyword in _HEADER_KEYWORDS
    )

    if not has_header_keywords:
        has_numbering = any(symbol in header for symbol in ("№", "#"))
        if not has_numbering:
            filled_cells = sum(1 for cell in rows[0] if _normalize(cell))
            if len(rows[0]) < 3 or filled_cells <= 1:
                return False

    return table_has_goods(rows)


__all__ = ["is_specification_table", "table_has_goods"]