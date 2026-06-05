from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv


PROJECT_DIR = Path(__file__).resolve().parents[1]


def load_environment() -> None:
    load_dotenv(PROJECT_DIR / ".env")
    load_dotenv(PROJECT_DIR / ".env.example")


def _int(name: str, default: int) -> int:
    value = os.getenv(name)
    return default if value is None or value == "" else int(value)


def _float(name: str, default: float) -> float:
    value = os.getenv(name)
    return default if value is None or value == "" else float(value)


@dataclass(frozen=True)
class SourceDbConfig:
    host: str
    port: int
    database: str
    user: str
    password: str

    @property
    def dsn(self) -> str:
        return f"postgresql://{self.user}:{self.password}@{self.host}:{self.port}/{self.database}"


@dataclass(frozen=True)
class MangaDexConfig:
    base_url: str
    page_limit: int
    manga_target_count: int
    chapters_per_manga: int
    request_delay_seconds: float


@dataclass(frozen=True)
class SeedConfig:
    synthetic_user_count: int


def get_source_db_config(host_port: bool = True) -> SourceDbConfig:
    load_environment()
    return SourceDbConfig(
        host=os.getenv("SOURCE_DB_HOST_LOCAL", "localhost") if host_port else os.getenv("SOURCE_DB_HOST", "postgres-source"),
        port=_int("SOURCE_DB_HOST_PORT" if host_port else "SOURCE_DB_PORT", 15432 if host_port else 5432),
        database=os.getenv("SOURCE_DB_NAME", "manga_source"),
        user=os.getenv("SOURCE_DB_USER", "manga_de"),
        password=os.getenv("SOURCE_DB_PASSWORD", "manga_de"),
    )


def get_mangadex_config() -> MangaDexConfig:
    load_environment()
    return MangaDexConfig(
        base_url=os.getenv("MANGADEX_BASE_URL", "https://api.mangadex.org").rstrip("/"),
        page_limit=_int("MANGADEX_PAGE_LIMIT", 100),
        manga_target_count=_int("MANGADEX_MANGA_TARGET_COUNT", 600),
        chapters_per_manga=_int("MANGADEX_CHAPTERS_PER_MANGA", 20),
        request_delay_seconds=_float("MANGADEX_REQUEST_DELAY_SECONDS", 0.5),
    )


def get_seed_config() -> SeedConfig:
    load_environment()
    return SeedConfig(synthetic_user_count=_int("SYNTHETIC_USER_COUNT", 3000))

