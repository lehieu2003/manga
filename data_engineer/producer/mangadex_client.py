from __future__ import annotations

import time
from typing import Any

import requests

from de_config import MangaDexConfig


USER_AGENT = "manga-data-engineering-demo/0.1"


class MangaDexClient:
    def __init__(self, config: MangaDexConfig) -> None:
        self.config = config
        self.session = requests.Session()
        self.session.headers.update({"Accept": "application/json", "User-Agent": USER_AGENT})

    def _get(self, path: str, params: list[tuple[str, str]] | None = None) -> dict[str, Any]:
        url = f"{self.config.base_url}{path}"
        for attempt in range(3):
            response = self.session.get(url, params=params, timeout=20)
            if response.status_code == 429 and attempt < 2:
                time.sleep(max(self.config.request_delay_seconds, 1.0) * (attempt + 1))
                continue
            response.raise_for_status()
            if self.config.request_delay_seconds > 0:
                time.sleep(self.config.request_delay_seconds)
            return response.json()
        raise RuntimeError(f"MangaDex request failed after retries: {url}")

    def list_manga(self, limit: int, offset: int) -> dict[str, Any]:
        params = [
            ("limit", str(limit)),
            ("offset", str(offset)),
            ("includes[]", "cover_art"),
            ("availableTranslatedLanguage[]", "en"),
            ("contentRating[]", "safe"),
            ("contentRating[]", "suggestive"),
            ("order[followedCount]", "desc"),
        ]
        return self._get("/manga", params)

    def list_chapters(self, manga_id: str, limit: int) -> dict[str, Any]:
        params = [
            ("limit", str(limit)),
            ("offset", "0"),
            ("translatedLanguage[]", "en"),
            ("includes[]", "scanlation_group"),
            ("order[volume]", "asc"),
            ("order[chapter]", "asc"),
        ]
        return self._get(f"/manga/{manga_id}/feed", params)


def first_localized(value: dict[str, str] | None, preferred: list[str] | None = None) -> str:
    if not value:
        return ""
    for language in preferred or ["en", "vi", "ja-ro", "ja"]:
        if value.get(language):
            return value[language]
    return next(iter(value.values()), "")


def slugify(value: str) -> str:
    return "".join(character.lower() if character.isalnum() else "-" for character in value).strip("-")


def normalize_manga(entity: dict[str, Any], popularity_rank: int) -> dict[str, Any]:
    attributes = entity.get("attributes") or {}
    relationships = entity.get("relationships") or []
    cover = next((item for item in relationships if item.get("type") == "cover_art"), None)
    file_name = ((cover or {}).get("attributes") or {}).get("fileName")
    tags = []

    for tag in attributes.get("tags") or []:
        tag_attributes = tag.get("attributes") or {}
        name = first_localized(tag_attributes.get("name"), ["en", "vi"])
        if not name:
            continue
        tags.append(
            {
                "mangadex_tag_id": tag.get("id"),
                "name": name,
                "slug": slugify(name),
                "group_name": tag_attributes.get("group"),
            }
        )

    alt_titles = [
        first_localized(title)
        for title in attributes.get("altTitles") or []
        if first_localized(title)
    ][:8]

    return {
        "mangadex_id": entity["id"],
        "title": first_localized(attributes.get("title")),
        "alt_titles": alt_titles,
        "description": first_localized(attributes.get("description")),
        "status": attributes.get("status"),
        "year": attributes.get("year"),
        "content_rating": attributes.get("contentRating"),
        "original_language": attributes.get("originalLanguage"),
        "publication_demographic": attributes.get("publicationDemographic"),
        "cover_url": f"https://uploads.mangadex.org/covers/{entity['id']}/{file_name}.512.jpg" if file_name else None,
        "popularity_rank": popularity_rank,
        "mangadex_created_at": attributes.get("createdAt"),
        "mangadex_updated_at": attributes.get("updatedAt"),
        "genres": tags,
    }


def normalize_chapter(entity: dict[str, Any], manga_db_id: int) -> dict[str, Any]:
    attributes = entity.get("attributes") or {}
    relationships = entity.get("relationships") or []
    group = next((item for item in relationships if item.get("type") == "scanlation_group"), None)
    return {
        "mangadex_id": entity["id"],
        "manga_id": manga_db_id,
        "title": attributes.get("title") or "",
        "chapter_number": attributes.get("chapter"),
        "volume": attributes.get("volume"),
        "translated_language": attributes.get("translatedLanguage") or "en",
        "pages": attributes.get("pages") or 0,
        "publish_at": attributes.get("publishAt"),
        "readable_at": attributes.get("readableAt"),
        "scanlation_group": ((group or {}).get("attributes") or {}).get("name"),
    }

