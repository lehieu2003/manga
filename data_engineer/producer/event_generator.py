from __future__ import annotations

import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any, Iterator

from source_repository import SourceChapter, SourceManga, SourceSnapshot, SourceUser


EVENT_TYPES = ["manga_view", "chapter_read", "like", "follow", "search"]
SEARCH_TEMPLATES = [
    "{genre} manga",
    "best {genre}",
    "{title}",
    "{genre} completed manga",
    "new {genre} chapters",
]


class MangaEventGenerator:
    def __init__(self, snapshot: SourceSnapshot, invalid_event_rate: float = 0.02, seed: int = 42) -> None:
        self.snapshot = snapshot
        self.invalid_event_rate = invalid_event_rate
        self.random = random.Random(seed)

    def generate(self, count: int) -> Iterator[dict[str, Any]]:
        for _ in range(count):
            yield self._maybe_corrupt(self._next_event())

    def _next_event(self) -> dict[str, Any]:
        user = self.random.choice(self.snapshot.users)
        event_type = self.random.choices(EVENT_TYPES, weights=[0.34, 0.36, 0.09, 0.08, 0.13], k=1)[0]
        session_id = str(uuid.uuid4())
        event_ts = datetime.now(timezone.utc) - timedelta(seconds=self.random.randint(0, 3600))

        if event_type == "search":
            return self._base_event(user, session_id, event_type, event_ts) | {
                "manga_id": None,
                "manga_title": None,
                "chapter_id": None,
                "genres": [],
                "query": self._search_query(),
                "duration_seconds": None,
                "pages_read": None,
                "completed": None,
            }

        manga = self._weighted_manga(require_chapters=event_type == "chapter_read")
        chapters = self.snapshot.chapters_by_manga_id.get(manga.id) or []
        chapter = self.random.choice(chapters) if chapters else None

        if event_type == "chapter_read":
            return self._chapter_read(user, session_id, event_ts, manga, chapter)

        return self._base_event(user, session_id, event_type, event_ts) | {
            "manga_id": manga.mangadex_id,
            "manga_title": manga.title,
            "chapter_id": None,
            "genres": manga.genres,
            "query": None,
            "duration_seconds": None,
            "pages_read": None,
            "completed": None,
        }

    def _base_event(self, user: SourceUser, session_id: str, event_type: str, event_ts: datetime) -> dict[str, Any]:
        return {
            "event_id": str(uuid.uuid4()),
            "event_type": event_type,
            "event_ts": event_ts.isoformat(),
            "user_id": user.id,
            "session_id": session_id,
            "device_type": user.device_preference,
            "country": user.country,
            "source": "synthetic_producer",
        }

    def _chapter_read(
        self,
        user: SourceUser,
        session_id: str,
        event_ts: datetime,
        manga: SourceManga,
        chapter: SourceChapter | None,
    ) -> dict[str, Any]:
        pages = max(1, chapter.pages if chapter else self.random.randint(8, 40))
        pages_read = self.random.randint(1, pages)
        completed = pages_read >= pages or self.random.random() < 0.62
        if completed:
            pages_read = pages
        duration_seconds = max(15, int(pages_read * self.random.uniform(18, 75)))
        return self._base_event(user, session_id, "chapter_read", event_ts) | {
            "manga_id": manga.mangadex_id,
            "manga_title": manga.title,
            "chapter_id": chapter.mangadex_id if chapter else None,
            "genres": manga.genres,
            "query": None,
            "duration_seconds": duration_seconds,
            "pages_read": pages_read,
            "completed": completed,
        }

    def _weighted_manga(self, require_chapters: bool = False) -> SourceManga:
        population = self.snapshot.manga[: min(len(self.snapshot.manga), 300)]
        if require_chapters:
            population = [manga for manga in population if self.snapshot.chapters_by_manga_id.get(manga.id)]
            if not population:
                raise RuntimeError("cannot generate chapter_read events because no manga have readable chapters")
        weights = [1 / max(1, manga.popularity_rank) ** 0.65 for manga in population]
        return self.random.choices(population, weights=weights, k=1)[0]

    def _search_query(self) -> str:
        title = self.random.choice(self.snapshot.manga).title
        genre = self.random.choice(self.snapshot.genre_names)
        return self.random.choice(SEARCH_TEMPLATES).format(title=title, genre=genre.lower())

    def _maybe_corrupt(self, event: dict[str, Any]) -> dict[str, Any]:
        if self.random.random() >= self.invalid_event_rate:
            return event
        corrupted = dict(event)
        corruption = self.random.choice(["negative_duration", "unknown_type", "missing_user"])
        if corruption == "negative_duration" and corrupted["event_type"] == "chapter_read":
            corrupted["duration_seconds"] = -1
        elif corruption == "unknown_type":
            corrupted["event_type"] = "invalid_event"
        else:
            corrupted["user_id"] = None
        return corrupted
