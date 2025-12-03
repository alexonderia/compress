"""Utilities for slicing documents into numbered contract sections."""
from __future__ import annotations

import re
from dataclasses import dataclass

from ..document.models import Block
from ..document.reader import blocks_to_prompt_lines_with_mapping

_SECTION_HEADING_RE = re.compile(r"^(?P<number>\d{1,2})\.\s(?P<title>.+)")
_SECTION_BREAK_RE = re.compile(r"Приложение № 1")


@dataclass(slots=True)
class SectionChunk:
    number: int | None
    title: str
    content: str


def split_into_sections(blocks: list[Block], *, max_section_number: int = 15) -> list[SectionChunk]:
    lines, mapping = blocks_to_prompt_lines_with_mapping(blocks)

    sections: list[SectionChunk] = []
    current_lines: list[str] = []
    current_number: int | None = None
    current_title = "Шапка"
    header_saved = False

    def flush_section() -> None:
        nonlocal current_lines, current_number, current_title, header_saved
        content = "\n".join(line for line in current_lines if line).strip()
        if content or (current_number is None and not header_saved):
            sections.append(SectionChunk(number=current_number, title=current_title, content=content))
            if current_number is None:
                header_saved = True
        current_lines = []

    for line, (block_index, _) in zip(lines, mapping):
        if _SECTION_BREAK_RE.match(line):
            flush_section()
            break

        heading_match = _SECTION_HEADING_RE.match(line)
        if heading_match:
            number = int(heading_match.group("number"))
            if number > max_section_number:
                break

            flush_section()
            current_number = number
            raw_title = heading_match.group("title")
            current_title = raw_title.strip() or f"Раздел {number}"
            current_lines = [line]
            continue

        current_lines.append(line)

    flush_section()
    return sections


__all__ = ["SectionChunk", "split_into_sections"]