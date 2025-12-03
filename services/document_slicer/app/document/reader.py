"""Helpers for loading paragraphs and tables from simple documents."""
from __future__ import annotations

from io import BytesIO
from pathlib import Path
from typing import Callable, Iterable
import html
import re

from docx import Document
from docx.document import Document as _Document
from docx.oxml.table import CT_Tbl
from docx.oxml.text.paragraph import CT_P
from docx.table import Table
from docx.text.paragraph import Paragraph

from .models import Block

Parser = Callable[[bytes], list[Block]]


def _append_line(lines: list[str], mapping: list[tuple[int, int]], block_index: int, value: str, *, row_index: int = -1) -> None:
    if value:
        lines.append(value)
        mapping.append((block_index, row_index))


def _clean_text_noise(text: str) -> str:
    text = re.sub(r"[«»]", "", text)
    text = re.sub(r"[_]{2,}", " ", text)
    text = re.sub(r"[-]{3,}", " ", text)
    text = re.sub(r"[.]{3,}", " ", text)
    text = re.sub(r"\s{2,}", " ", text)
    return text.strip()


def _iter_docx_blocks(document: _Document) -> Iterable[Paragraph | Table]:
    body = document.element.body
    for element in body.iterchildren():
        if isinstance(element, CT_P):
            yield Paragraph(element, document)
        elif isinstance(element, CT_Tbl):
            yield Table(element, document)


def _table_to_rows(table: Table) -> list[list[str]]:
    rows: list[list[str]] = []
    for row in table.rows:
        cells: list[str] = []
        for cell in row.cells:
            fragments = [paragraph.text.strip() for paragraph in cell.paragraphs if paragraph.text.strip()]
            cells.append(" ".join(fragments))
        if any(cell for cell in cells):
            rows.append(cells)
    return rows


def _parse_docx(payload: bytes) -> list[Block]:
    document = Document(BytesIO(payload))
    blocks: list[Block] = []
    for item in _iter_docx_blocks(document):
        if isinstance(item, Paragraph):
            raw_text = " ".join(part for part in item.text.split() if part)
            text = _clean_text_noise(raw_text)
            blocks.append(Block(type="paragraph", text=text))
        elif isinstance(item, Table):
            rows = _table_to_rows(item)
            if rows:
                blocks.append(Block(type="table", text="", rows=rows))
    return blocks


def _parse_plain_text(payload: bytes) -> list[Block]:
    text = payload.decode("utf-8", "ignore")
    lines = [line.rstrip() for line in text.splitlines()]
    blocks: list[Block] = []
    current_table: list[list[str]] = []

    def flush_table() -> None:
        nonlocal current_table
        if current_table:
            blocks.append(Block(type="table", text="", rows=current_table))
            current_table = []

    for line in lines:
        clean_line = _clean_text_noise(line)
        if not clean_line:
            flush_table()
            continue
        if "|" in line:
            columns = [col.strip() for col in line.split("|") if col.strip()]
            if columns:
                current_table.append(columns)
                continue
        flush_table()
        blocks.append(Block(type="paragraph", text=clean_line))

    flush_table()
    return blocks


def load_blocks(filename: str, payload: bytes) -> list[Block]:
    suffix = Path(filename or "").suffix.lower()
    parsers: dict[str, Parser] = {
        ".docx": _parse_docx,
        ".txt": _parse_plain_text,
        ".md": _parse_plain_text,
    }
    parser = parsers.get(suffix, _parse_plain_text)
    return parser(payload)


def blocks_to_html(blocks: list[Block]) -> str:
    parts: list[str] = []
    for block in blocks:
        if block.type == "paragraph":
            parts.append(f"<p>{html.escape(block.text)}</p>")
        elif block.type == "table":
            rows_html = []
            for row in block.rows or []:
                cells_html = "".join(f"<td>{html.escape(cell)}</td>" for cell in row)
                rows_html.append(f"<tr>{cells_html}</tr>")
            if rows_html:
                parts.append(f"<table>{''.join(rows_html)}</table>")
    return "".join(parts)


def blocks_to_prompt_lines_with_mapping(blocks: list[Block]) -> tuple[list[str], list[tuple[int, int]]]:
    lines: list[str] = []
    mapping: list[tuple[int, int]] = []

    for block_index, block in enumerate(blocks):
        if block.type == "paragraph":
            text = (block.text or "").strip()
            _append_line(lines, mapping, block_index, text)
            continue

        for row_index, row in enumerate(block.rows or []):
            row_text = " | ".join(cell.strip() for cell in row if cell and cell.strip())
            if row_text:
                _append_line(lines, mapping, block_index, f"TABLE: {row_text}", row_index=row_index)

    return lines, mapping


__all__ = ["Block", "blocks_to_html", "blocks_to_prompt_lines_with_mapping", "load_blocks"]