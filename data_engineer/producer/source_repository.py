from __future__ import annotations

from dataclasses import dataclass
from typing import Any

import psycopg


@dataclass(frozen=True)
class SourceUser:
    id: str
    country: str
    device_preference: str


@dataclass(frozen=True)
class SourceManga:
    id: int
    mangadex_id: str
    title: str
    popularity_rank: int
    genres: list[str]


@dataclass(frozen=True)
class SourceChapter:
    mangadex_id: str
    manga_id: int
    pages: int


@dataclass(frozen=True)
class SourceSnapshot:
    users: list[SourceUser]
    manga: list[SourceManga]
    chapters_by_manga_id: dict[int, list[SourceChapter]]
    genre_names: list[str]


def load_source_snapshot(connection: psycopg.Connection) -> SourceSnapshot:
    with connection.cursor() as cursor:
        users = [
            SourceUser(id=str(row["id"]), country=row["country"], device_preference=row["device_preference"])
            for row in cursor.execute(
                """
                SELECT id, country, device_preference
                FROM source.users
                ORDER BY signup_at
                """
            ).fetchall()
        ]

        manga_rows = cursor.execute(
            """
            SELECT
              m.id,
              m.mangadex_id,
              m.title,
              m.popularity_rank,
              coalesce(array_agg(g.name ORDER BY g.name) FILTER (WHERE g.name IS NOT NULL), '{}') AS genres
            FROM source.manga m
            LEFT JOIN source.manga_genres mg ON mg.manga_id = m.id
            LEFT JOIN source.genres g ON g.id = mg.genre_id
            GROUP BY m.id, m.mangadex_id, m.title, m.popularity_rank
            ORDER BY m.popularity_rank
            """
        ).fetchall()
        manga = [_manga_from_row(row) for row in manga_rows]

        chapter_rows = cursor.execute(
            """
            SELECT mangadex_id, manga_id, pages
            FROM source.chapters
            WHERE pages > 0
            ORDER BY manga_id, publish_at NULLS LAST, chapter_number NULLS LAST
            """
        ).fetchall()

        genre_rows = cursor.execute("SELECT name FROM source.genres ORDER BY name").fetchall()

    chapters_by_manga_id: dict[int, list[SourceChapter]] = {}
    for row in chapter_rows:
        chapter = SourceChapter(mangadex_id=str(row["mangadex_id"]), manga_id=int(row["manga_id"]), pages=int(row["pages"]))
        chapters_by_manga_id.setdefault(chapter.manga_id, []).append(chapter)

    return SourceSnapshot(
        users=users,
        manga=manga,
        chapters_by_manga_id=chapters_by_manga_id,
        genre_names=[row["name"] for row in genre_rows],
    )


def assert_snapshot_ready(snapshot: SourceSnapshot) -> None:
    if not snapshot.users:
        raise RuntimeError("source.users is empty; run seed_source_db.py first")
    if not snapshot.manga:
        raise RuntimeError("source.manga is empty; run seed_source_db.py first")
    if not snapshot.chapters_by_manga_id:
        raise RuntimeError("source.chapters is empty; run seed_source_db.py first")
    if not snapshot.genre_names:
        raise RuntimeError("source.genres is empty; run seed_source_db.py first")


def _manga_from_row(row: dict[str, Any]) -> SourceManga:
    return SourceManga(
        id=int(row["id"]),
        mangadex_id=str(row["mangadex_id"]),
        title=row["title"],
        popularity_rank=int(row["popularity_rank"]),
        genres=list(row["genres"] or []),
    )

