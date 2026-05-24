"""关于页履历 API 序列化。"""
from __future__ import annotations

from typing import Any


def _iso_dt(value: Any) -> str | None:
    if value is None:
        return None
    if hasattr(value, "isoformat"):
        return value.isoformat()
    return str(value)


def _section_education(raw: dict[str, str]) -> dict[str, str]:
    return {
        "schoolPublic": raw["school_public"],
        "schoolRaw": raw["school_raw"],
        "degree": raw["degree"],
        "major": raw["major"],
        "period": raw["period"],
        "rankRaw": raw["rank_raw"],
    }


def _section_internship(raw: dict[str, str]) -> dict[str, str]:
    return {
        "companyPublic": raw["company_public"],
        "companyRaw": raw["company_raw"],
        "role": raw["role"],
        "period": raw["period"],
        "summaryRaw": raw["summary_raw"],
    }


def _section_club(raw: dict[str, str]) -> dict[str, str]:
    return {
        "namePublic": raw["name_public"],
        "nameRaw": raw["name_raw"],
        "role": raw["role"],
        "period": raw["period"],
        "summaryRaw": raw["summary_raw"],
    }


def profile_to_api(profile: dict[str, Any], *, updated_at: Any = None) -> dict[str, Any]:
    awards = profile.get("awards") or []
    return {
        "alias": profile["alias"],
        "genderAge": profile["gender_age"],
        "email": profile["email"],
        "intro": profile["intro"],
        "awards": [
            {"id": a["id"], "label": a["label"], "tier": a["tier"]}
            for a in awards
        ],
        "education": _section_education(profile["education"]),
        "internship": _section_internship(profile["internship"]),
        "club": _section_club(profile["club"]),
        "certificates": list(profile.get("certificates") or []),
        "updatedAt": _iso_dt(updated_at),
    }


def api_to_profile(payload: dict[str, Any]) -> dict[str, Any]:
    """站长 import-file JSON（camelCase）→ snake_case profile dict。"""
    education = payload.get("education") or {}
    internship = payload.get("internship") or {}
    club = payload.get("club") or {}
    awards_raw = payload.get("awards") or []

    return {
        "alias": str(payload.get("alias") or "").strip(),
        "gender_age": str(payload.get("genderAge") or payload.get("gender_age") or "").strip(),
        "email": str(payload.get("email") or "").strip(),
        "intro": str(payload.get("intro") or "").strip(),
        "awards": [
            {
                "id": str(a.get("id") or "").strip(),
                "label": str(a.get("label") or "").strip(),
                "tier": str(a.get("tier") or "").strip().lower(),
            }
            for a in awards_raw
            if isinstance(a, dict)
        ],
        "education": {
            "school_public": str(education.get("schoolPublic") or education.get("school_public") or "").strip(),
            "school_raw": str(education.get("schoolRaw") or education.get("school_raw") or "").strip(),
            "degree": str(education.get("degree") or "").strip(),
            "major": str(education.get("major") or "").strip(),
            "period": str(education.get("period") or "").strip(),
            "rank_raw": str(education.get("rankRaw") or education.get("rank_raw") or "").strip(),
        },
        "internship": {
            "company_public": str(
                internship.get("companyPublic") or internship.get("company_public") or ""
            ).strip(),
            "company_raw": str(internship.get("companyRaw") or internship.get("company_raw") or "").strip(),
            "role": str(internship.get("role") or "").strip(),
            "period": str(internship.get("period") or "").strip(),
            "summary_raw": str(internship.get("summaryRaw") or internship.get("summary_raw") or "").strip(),
        },
        "club": {
            "name_public": str(club.get("namePublic") or club.get("name_public") or "").strip(),
            "name_raw": str(club.get("nameRaw") or club.get("name_raw") or "").strip(),
            "role": str(club.get("role") or "").strip(),
            "period": str(club.get("period") or "").strip(),
            "summary_raw": str(club.get("summaryRaw") or club.get("summary_raw") or "").strip(),
        },
        "certificates": [
            str(c).strip()
            for c in (payload.get("certificates") or [])
            if str(c).strip()
        ],
    }
