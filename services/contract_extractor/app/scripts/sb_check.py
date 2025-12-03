"""Utility helpers for manual SB Check calls outside of the API layer."""

from typing import Dict, List

from ..services.sb_check_service import get_sb_check_service


async def analyze_company(name: str) -> Dict[str, object]:
    """Run the SB Check analyzer and return the serialized payload.

    Mirrors the response structure of the former ``/sb-check/analyze`` endpoint.
    """

    service = get_sb_check_service()
    try:
        result = await service.analyze_company(name)
    except ValueError:
        return {
            "status": 0,
            "company_name": "",
            "globas_score": None,
            "good_count": 0,
            "bad_count": 0,
            "html_report": "",
        }

    return {
        "status": 1,
        "company_name": result.company_name,
        "globas_score": result.globas_score,
        "good_count": result.good_count,
        "bad_count": result.bad_count,
        "html_report": result.html_report,
    }


async def health_check(sample_size: int = 5) -> Dict[str, object]:
    """Return a minimal health payload for the SB Check data source."""

    try:
        service = get_sb_check_service()
        companies = await service.get_companies_list(sample_size)
    except Exception as exc:  # pragma: no cover - defensive guard for manual scripts
        return {"status": "error", "error": str(exc)}

    return {
        "status": "ok",
        "service": "sb_check",
        "available_companies_sample": companies,
        "data_file": str(service.data_file),
    }


async def list_companies(limit: int = 20) -> Dict[str, object]:
    """Expose the list of available companies in a script-friendly format."""

    service = get_sb_check_service()
    companies: List[Dict[str, str]] = []
    try:
        companies = await service.get_companies_list(limit)
    except Exception as exc:  # pragma: no cover - defensive guard for manual scripts
        return {
            "ok": False,
            "error": f"Failed to load companies: {exc}",
            "companies": [],
            "total": 0,
        }

    return {"ok": True, "companies": companies, "total": len(companies)}