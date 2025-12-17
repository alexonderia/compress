from __future__ import annotations

import json
import re
from typing import Any

from fastapi import HTTPException

from .llm_client import build_debug_info, client, extract_reply
from .schemas import AccountantRequest, AccountantResponse, LlmExtraction

CONTRACT_TYPES = [
    "Возврат обеспечения заявок",
    "Договоры ГПХ, вкл. НДФЛ. Заявки на платеж по штрафам ГИБДД",
    "Договоры организационного отдела - магазин и кофейня",
    "Договоры по инвестиционной деятельности - ПИР, СМР",
    "Договоры по осн. средствам - КС. Заявки на платеж по госпошлине",
    "Договоры по основным средствам / Заявки по основным средствам",
    "Договоры по ТМЦ / Заявки на платеж по ТМЦ",
    "Договоры по услугам / Заявки на платеж по услугам",
    "Договоры/ ЗнО по коммунальным услугам (Охрана, Клининг и уборка, Газоснабж., Электроснабж.)",
    "Договоры НМА, Лицензии, программы и др. виды НМА / Заявки НМА",
    "Договоры реализации (с покупателем)",
    "Договоры с иностр. контрагентами, договоры УВИ / Заявки на платеж по налогам",
    "Заявка на платеж по штрафам, пени",
    "Заявки на платеж по командировочным, представительским расходам",
    "Заявки на платеж по субсидиям (Грант), кредитным линиям",
    "Договоры / Заявки на платеж по аренде, лизингу",
    "Договоры по ТМЦ - ПРОИЗВОДСТВО/ Заявки на платеж по ТМЦ - ПРОИЗВОДСТВО",
]


def _strip_code_fences(text: str) -> str:
    fenced = re.sub(r"^```[a-zA-Z]*", "", text.strip())
    fenced = re.sub(r"```$", "", fenced.strip())
    return fenced.strip()


def _load_extraction(raw_text: str) -> LlmExtraction:
    try:
        cleaned = _strip_code_fences(raw_text)
        data = json.loads(cleaned)
        return LlmExtraction(**data)
    except Exception as exc:  # pylint: disable=broad-except
        raise HTTPException(status_code=400, detail=f"Не удалось распарсить ответ LLM: {exc}") from exc


async def run_llm(request: AccountantRequest) -> tuple[LlmExtraction, dict[str, Any]]:
    messages = [
        {
            "role": "system",
            "content": (
                "Ты опытный бухгалтер. Тебе нужно строго в формате JSON определить тип договора, "
                "предмет договора в частях 1 и 16, суммы и НДС. Тип договора выбирай только из списка: "
                + "; ".join(CONTRACT_TYPES)
            ),
        },
        {
            "role": "user",
            "content": (
                "Определи по тексту: договорный тип (из списка), предмет договора из part_1, "
                "предмет/состав спецификации из part_16, суммы и НДС из part_4 и part_16.\n"
                "Сравни предметы и суммы/НДС между частями: subject_consistent=true/false, "
                "amount_consistent=true/false, vat_consistent=true/false.\n"
                "Если предмет part_16 является детализацией или спецификацией "
                "предмета part_1, subject_consistent = true."
                "Верни только JSON c полями: contract_type, subject_part1, subject_part16, "
                "subject_consistent, amount_part4, vat_part4, amount_part16, vat_part16, "
                "amount_consistent, vat_consistent.\n"
                "part_1: "
                + request.part_1
                + "\npart_4: "
                + request.part_4
                + "\npart_16: "
                + request.part_16
            ),
        },
    ]

    raw = await client.chat(messages)
    answer = extract_reply(raw)
    extraction = _load_extraction(answer)
    debug = build_debug_info(messages, raw)
    return extraction, debug


def _build_flags(extraction: LlmExtraction) -> list[str]:
    flags: list[str] = []
    if extraction.subject_consistent is False:
        flags.append("Несовпадение предмета договора и состава спецификации")
    if extraction.amount_consistent is False or extraction.vat_consistent is False:
        flags.append("Несовпадение суммы или НДС договора между part_4 и part_16")
    return flags


def prepare_response(extraction: LlmExtraction, debug: dict[str, Any] | None = None) -> AccountantResponse:
    red_flags = _build_flags(extraction)
    if not extraction.contract_type:
        red_flags.append("Не удалось определить тип договора")

    has_problems = bool(red_flags)
    res = "bad" if has_problems else "ok"
    contract_type = "" if has_problems else (extraction.contract_type or "")
    return AccountantResponse(
        res=res,
        type=contract_type,
        RED_FLAGS="; ".join(red_flags),
        details={
            "subject_part1": extraction.subject_part1,
            "subject_part16": extraction.subject_part16,
            "amount_part4": extraction.amount_part4,
            "vat_part4": extraction.vat_part4,
            "amount_part16": extraction.amount_part16,
            "vat_part16": extraction.vat_part16,
            "flags": red_flags,
            "debug": debug or {},
        },
    )