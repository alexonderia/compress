import json
import logging
from pathlib import Path
from typing import Any, Dict, List

from fastapi import FastAPI, File, HTTPException, Query, UploadFile

from .core.config import CONFIG
from .services.ollama_client import OllamaServiceError
from .services.qa import SectionQuestionAnswering

from .services.utils import read_text_and_sections_from_upload

APP_DIR = Path(__file__).resolve().parent
QA_SYSTEM_PROMPT_PATH = APP_DIR / "prompts" / "qa_system.txt"
QA_USER_TMPL_PATH = APP_DIR / "prompts" / "qa_user_template.txt"
QA_PLANS_DIR = APP_DIR / "assets" / "qa_plans"

qa_service = (
    SectionQuestionAnswering(str(QA_SYSTEM_PROMPT_PATH), str(QA_USER_TMPL_PATH))
    if CONFIG.use_llm
    else None
)

app = FastAPI(title="Contract Extractor API", version=CONFIG.version)

@app.get("/healthz")
async def healthz():
    return {"status": "ok"}

def _load_json_file(path: Path):
    try:
        with path.open("r", encoding="utf-8") as file:
            return json.load(file)
    except FileNotFoundError as exc:
        raise HTTPException(status_code=404, detail="Requested resource not found") from exc
    except json.JSONDecodeError as exc:  # pragma: no cover
        logging.exception("Invalid JSON content in %s", path)
        raise HTTPException(status_code=500, detail="Invalid JSON content") from exc


def _normalize_sections(payload: Dict[str, Any]) -> Dict[str, str]:
    sections_input = payload.get("sections") or payload.get("parts")

    if sections_input is None:
        text = payload.get("text", "")
        if isinstance(text, str) and text.strip():
            return {"part_0": text}
        raise HTTPException(status_code=400, detail="Provide 'sections' or non-empty 'text'")

    if isinstance(sections_input, list):
        return {
            f"part_{idx}": section if isinstance(section, str) else ""
            for idx, section in enumerate(sections_input)
        }

    if isinstance(sections_input, dict):
        normalized = {}
        for key, value in sections_input.items():
            if not isinstance(key, str):
                raise HTTPException(status_code=400, detail="Section keys must be strings")
            normalized[key] = value if isinstance(value, str) else ""
        return normalized

    raise HTTPException(status_code=400, detail="'sections' must be an object or array")


def _normalize_queries(payload: Dict[str, Any]) -> List[Dict[str, Any]]:
    queries = payload.get("queries") or payload.get("plan") or payload.get("questions")
    if not queries or not isinstance(queries, list):
        raise HTTPException(status_code=400, detail="Provide a non-empty 'queries' list")

    normalized: List[Dict[str, Any]] = []
    for item in queries:
        if not isinstance(item, dict):
            raise HTTPException(status_code=400, detail="Each query must be an object")

        parts = item.get("parts")
        question = item.get("question")
        answers = item.get("answer")

        if not isinstance(parts, list) or not all(isinstance(p, str) for p in parts):
            raise HTTPException(status_code=400, detail="Query 'parts' must be a list of strings")
        if not isinstance(question, str) or not question.strip():
            raise HTTPException(status_code=400, detail="Query 'question' must be a non-empty string")
        if not isinstance(answers, list) or not all(isinstance(a, str) for a in answers):
            raise HTTPException(status_code=400, detail="Query 'answer' must be a list of strings")

        normalized.append({"parts": parts, "question": question.strip(), "answer": answers})

    return normalized


def _load_qa_plan(plan_name: str) -> List[Dict[str, Any]]:
    safe_name = Path(plan_name).stem
    plan_path = QA_PLANS_DIR / f"{safe_name}.json"

    if not plan_path.exists():
        raise HTTPException(status_code=404, detail=f"QA plan '{safe_name}' not found")

    content = _load_json_file(plan_path)
    plan_payload = {"queries": content} if isinstance(content, list) else content

    if not isinstance(plan_payload, dict):
        raise HTTPException(status_code=400, detail="QA plan must be an object or array of queries")

    return _normalize_queries(plan_payload)


async def _run_queries(
    sections_map: Dict[str, str], queries: List[Dict[str, Any]]
) -> Dict[str, Any]:
    aggregated: Dict[str, Any] = {}
    responses: List[Dict[str, Any]] = []

    for query in queries:
        missing_parts = [name for name in query["parts"] if name not in sections_map]
        if missing_parts:
            raise HTTPException(
                status_code=400,
                detail=f"Sections not found for parts: {', '.join(sorted(set(missing_parts)))}",
            )

        combined_text = "\n\n".join(sections_map[name] for name in query["parts"])
        result = await qa_service.ask(combined_text, query["question"], query["answer"])

        responses.append({"question": query["question"], "parts": query["parts"], "result": result})
        for key, value in result.items():
            aggregated[key] = value

    return {"ok": True, "result": aggregated, "responses": responses}


@app.post("/qa/docx")
async def ask_questions_from_docx(
    file: UploadFile = File(...),
    plan: str = Query("default"),
):
    """
    QA по DOCX + автозапуск SB Check по продавцу.

    1. Разбираем DOCX на секции.
    2. Выполняем QA-план (plan).
    3. Берём из result['seller'] название продавца.
    4. Вызываем SB Check по этому продавцу.
    5. Возвращаем:
       {
         "ok": True,
         "result": {...},
         "responses": [...],
         "sb_check": {
             "status": 0|1,
             "company_name": ...,
             "globas_score": ...,
             "good_count": ...,
             "bad_count": ...,
             "html_report": "..."
         }
       }
    """
    if qa_service is None:
        raise HTTPException(status_code=503, detail="LLM features are disabled (USE_LLM=false)")

    if file is None:
        raise HTTPException(status_code=400, detail="Provide a DOCX file")

    # 1. Читаем DOCX и бьём на секции
    text, sections = await read_text_and_sections_from_upload(file)
    if sections is None:
        sections = [text]

    sections_map = {f"part_{idx}": section for idx, section in enumerate(sections)}

    # 2. Загружаем план и выполняем QA
    queries = _load_qa_plan(plan)
    try:
        qa_result = await _run_queries(sections_map, queries)
    except OllamaServiceError as exc:
        logging.exception("Ollama service error during QA plan execution")
        raise HTTPException(status_code=502, detail=str(exc)) from exc
    except Exception as exc:  # pragma: no cover
        logging.exception("Unhandled error during QA plan execution")
        raise HTTPException(status_code=500, detail="Internal processing error") from exc

    # Заготовка под ответ SB Check по умолчанию (нет данных / не нашли)
    sb_payload = {
        "status": 0,
        "company_name": "",
        "globas_score": None,
        "good_count": 0,
        "bad_count": 0,
        "html_report": "",
    }

    # 3. Пытаемся достать seller из QA-результата
    seller_name = None
    try:
        seller_name = qa_result.get("result", {}).get("seller")
    except Exception:
        seller_name = None

    # 4. Если seller есть — вызываем SB Check
    if seller_name and isinstance(seller_name, str) and seller_name.strip():
        try:
            from .services.sb_check_service import get_sb_check_service

            service = get_sb_check_service()
            sb_result = await service.analyze_company(seller_name)

            sb_payload = {
                "status": 1,
                "company_name": sb_result.company_name,
                "globas_score": sb_result.globas_score,
                "good_count": sb_result.good_count,
                "bad_count": sb_result.bad_count,
                "html_report": sb_result.html_report,
            }

        except ValueError:
            # Компания не найдена — оставляем status = 0, пустые поля
            logging.warning("SB Check: company '%s' not found", seller_name)
        except Exception as e:
            logging.exception("SB Check analysis from /qa/docx failed: %s", e)

    # 5. Добавляем SB Check в ответ QA и возвращаем
    qa_result["sb_check"] = sb_payload
    return qa_result

