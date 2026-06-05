from __future__ import annotations

import json
from contextlib import contextmanager
from pathlib import Path
from typing import Iterator

import psycopg
from psycopg.rows import dict_row

from de_config import SourceDbConfig


@contextmanager
def connect(config: SourceDbConfig) -> Iterator[psycopg.Connection]:
    with psycopg.connect(config.dsn, row_factory=dict_row) as connection:
        yield connection


def execute_sql_file(config: SourceDbConfig, path: Path) -> None:
    with connect(config) as connection:
        with connection.cursor() as cursor:
            cursor.execute(path.read_text(encoding="utf-8"))
        connection.commit()


def start_ingestion_run(connection: psycopg.Connection, run_type: str, details: dict) -> int:
    with connection.cursor() as cursor:
        row = cursor.execute(
            """
            INSERT INTO source.ingestion_runs (run_type, details)
            VALUES (%s, %s::jsonb)
            RETURNING id
            """,
            (run_type, json.dumps(details)),
        ).fetchone()
    return int(row["id"])


def finish_ingestion_run(connection: psycopg.Connection, run_id: int, status: str, details: dict) -> None:
    with connection.cursor() as cursor:
        cursor.execute(
            """
            UPDATE source.ingestion_runs
            SET finished_at = now(), status = %s, details = details || %s::jsonb
            WHERE id = %s
            """,
            (status, json.dumps(details), run_id),
        )


def source_row_counts(connection: psycopg.Connection) -> dict[str, int]:
    tables = ["users", "manga", "chapters", "genres", "manga_genres"]
    counts: dict[str, int] = {}
    with connection.cursor() as cursor:
        for table in tables:
            row = cursor.execute(f"SELECT count(*) AS count FROM source.{table}").fetchone()
            counts[table] = int(row["count"])
    return counts

