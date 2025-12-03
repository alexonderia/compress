"""Minimal document model definitions used by the splitter service."""
from __future__ import annotations

from dataclasses import dataclass
from typing import Literal

BlockType = Literal["paragraph", "table"]


@dataclass(slots=True)
class Block:
    """Normalized representation of a document block."""

    type: BlockType
    text: str
    rows: list[list[str]] | None = None


__all__ = ["Block", "BlockType"]