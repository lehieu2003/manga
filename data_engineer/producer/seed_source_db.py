from __future__ import annotations

import argparse
import json
import random
import uuid
from datetime import datetime, timedelta, timezone
from typing import Any

from faker import Faker

from db import connect, finish_ingestion_run, source_row_counts, start_ingestion_run
from de_config import get_mangadex_config, get_seed_config, get_source_db_config
from mangadex_client import MangaDexClient, normalize_chapter, normalize_manga


COUNTRIES = ["VN", "US", "JP", "KR", "TH", "ID", "PH", "BR", "FR", "DE"]
DEVICES = ["mobile", "desktop", "tablet"]


def parse_args() -> argparse.Namespace:
    mangadex = get_mangadex_config()
    seed = get_seed_config()
    parser = argparse.ArgumentParser(description="Seed DE source DB with real MangaDex catalog and synthetic users.")
    parser.add_argument("--manga-target", type=int, default=mangadex.manga_target_count)
    parser.add_argument("--chapters-per-manga", type=int, default=mangadex.chapters_per_manga)
    parser.add_argument("--users", type=int, default=seed.synthetic_user_count)
    parser.add_argument("--page-limit", type=int, default=mangadex.page_limit)
    return parser.parse_args()


def upsert_user(cursor: Any, fake: Faker) -> None:
    user_id = uuid.uuid4()
    signup_at = datetime.now(timezone.utc) - timedelta(days=random.randint(1, 720))
    cursor.execute(
        """
        INSERT INTO source.users (id, email, display_name, country, device_preference, signup_at)
        VALUES (%s, %s, %s, %s, %s, %s)
        ON CONFLICT (email) DO NOTHING
        """,
        (
            user_id,
            fake.unique.email(),
            fake.name(),
            random.choice(COUNTRIES),
            random.choices(DEVICES, weights=[0.68, 0.24, 0.08], k=1)[0],
            signup_at,
        ),
    )


def seed_users(connection: Any, target_count: int) -> int:
    fake = Faker()
    Faker.seed(42)
    random.seed(42)
    with connection.cursor() as cursor:
        current = cursor.execute("SELECT count(*) AS count FROM source.users").fetchone()["count"]
        missing = max(0, target_count - int(current))
        for _ in range(missing):
            upsert_user(cursor, fake)
    return missing


def upsert_manga(cursor: Any, manga: dict[str, Any]) -> int:
    row = cursor.execute(
        """
        INSERT INTO source.manga (
          mangadex_id, title, alt_titles, description, status, year, content_rating,
          original_language, publication_demographic, cover_url, popularity_rank,
          mangadex_created_at, mangadex_updated_at, fetched_at
        )
        VALUES (%s, %s, %s::jsonb, %s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        ON CONFLICT (mangadex_id) DO UPDATE SET
          title = EXCLUDED.title,
          alt_titles = EXCLUDED.alt_titles,
          description = EXCLUDED.description,
          status = EXCLUDED.status,
          year = EXCLUDED.year,
          content_rating = EXCLUDED.content_rating,
          original_language = EXCLUDED.original_language,
          publication_demographic = EXCLUDED.publication_demographic,
          cover_url = EXCLUDED.cover_url,
          popularity_rank = EXCLUDED.popularity_rank,
          mangadex_created_at = EXCLUDED.mangadex_created_at,
          mangadex_updated_at = EXCLUDED.mangadex_updated_at,
          fetched_at = now()
        RETURNING id
        """,
        (
            manga["mangadex_id"],
            manga["title"],
            json.dumps(manga["alt_titles"]),
            manga["description"],
            manga["status"],
            manga["year"],
            manga["content_rating"],
            manga["original_language"],
            manga["publication_demographic"],
            manga["cover_url"],
            manga["popularity_rank"],
            manga["mangadex_created_at"],
            manga["mangadex_updated_at"],
        ),
    ).fetchone()
    return int(row["id"])


def upsert_genres(cursor: Any, manga_db_id: int, genres: list[dict[str, Any]]) -> None:
    for genre in genres:
        if not genre["mangadex_tag_id"] or not genre["slug"]:
            continue
        row = cursor.execute(
            """
            INSERT INTO source.genres (mangadex_tag_id, name, slug, group_name, fetched_at)
            VALUES (%s, %s, %s, %s, now())
            ON CONFLICT (mangadex_tag_id) DO UPDATE SET
              name = EXCLUDED.name,
              slug = EXCLUDED.slug,
              group_name = EXCLUDED.group_name,
              fetched_at = now()
            RETURNING id
            """,
            (genre["mangadex_tag_id"], genre["name"], genre["slug"], genre["group_name"]),
        ).fetchone()
        cursor.execute(
            """
            INSERT INTO source.manga_genres (manga_id, genre_id)
            VALUES (%s, %s)
            ON CONFLICT DO NOTHING
            """,
            (manga_db_id, row["id"]),
        )


def upsert_chapter(cursor: Any, chapter: dict[str, Any]) -> None:
    cursor.execute(
        """
        INSERT INTO source.chapters (
          mangadex_id, manga_id, title, chapter_number, volume, translated_language,
          pages, publish_at, readable_at, scanlation_group, fetched_at
        )
        VALUES (%s, %s, %s, %s, %s, %s, %s, %s, %s, %s, now())
        ON CONFLICT (mangadex_id) DO UPDATE SET
          manga_id = EXCLUDED.manga_id,
          title = EXCLUDED.title,
          chapter_number = EXCLUDED.chapter_number,
          volume = EXCLUDED.volume,
          translated_language = EXCLUDED.translated_language,
          pages = EXCLUDED.pages,
          publish_at = EXCLUDED.publish_at,
          readable_at = EXCLUDED.readable_at,
          scanlation_group = EXCLUDED.scanlation_group,
          fetched_at = now()
        """,
        (
            chapter["mangadex_id"],
            chapter["manga_id"],
            chapter["title"],
            chapter["chapter_number"],
            chapter["volume"],
            chapter["translated_language"],
            chapter["pages"],
            chapter["publish_at"],
            chapter["readable_at"],
            chapter["scanlation_group"],
        ),
    )


def seed_catalog(connection: Any, args: argparse.Namespace) -> dict[str, int]:
    config = get_mangadex_config()
    client = MangaDexClient(config)
    loaded_manga = 0
    loaded_chapters = 0
    offset = 0

    while loaded_manga < args.manga_target:
        limit = min(args.page_limit, args.manga_target - loaded_manga)
        response = client.list_manga(limit=limit, offset=offset)
        data = response.get("data") or []
        if not data:
            break

        with connection.cursor() as cursor:
            for entity in data:
                loaded_manga += 1
                manga = normalize_manga(entity, loaded_manga)
                manga_db_id = upsert_manga(cursor, manga)
                upsert_genres(cursor, manga_db_id, manga["genres"])

                chapter_response = client.list_chapters(manga["mangadex_id"], args.chapters_per_manga)
                for chapter_entity in chapter_response.get("data") or []:
                    upsert_chapter(cursor, normalize_chapter(chapter_entity, manga_db_id))
                    loaded_chapters += 1

                if loaded_manga % 25 == 0:
                    connection.commit()
                    print(f"loaded manga={loaded_manga} chapters={loaded_chapters}")

        connection.commit()
        offset += len(data)

    return {"loaded_manga": loaded_manga, "loaded_chapters": loaded_chapters}


def main() -> None:
    args = parse_args()
    db_config = get_source_db_config(host_port=True)
    details = {
        "manga_target": args.manga_target,
        "chapters_per_manga": args.chapters_per_manga,
        "users": args.users,
    }

    with connect(db_config) as connection:
        run_id = start_ingestion_run(connection, "source_db_seed", details)
        connection.commit()
        try:
            inserted_users = seed_users(connection, args.users)
            catalog_result = seed_catalog(connection, args)
            counts = source_row_counts(connection)
            finish_ingestion_run(
                connection,
                run_id,
                "succeeded",
                {"inserted_users": inserted_users, **catalog_result, "counts": counts},
            )
            connection.commit()
            print(json.dumps({"status": "succeeded", "counts": counts, **catalog_result}, indent=2))
        except Exception as exc:
            finish_ingestion_run(connection, run_id, "failed", {"error": str(exc)})
            connection.commit()
            raise


if __name__ == "__main__":
    main()

