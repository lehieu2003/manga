from __future__ import annotations

import argparse
import json
from datetime import date, datetime
from decimal import Decimal
from pathlib import Path
from typing import Any

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F


DATASETS = {
    "trending_manga": "trending_manga.json",
    "active_users": "active_users.json",
    "reading_duration": "reading_duration.json",
    "genre_popularity": "genre_popularity.json",
    "top_search_queries": "top_search_queries.json",
}


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Export Gold Parquet marts into dashboard-ready JSON files.")
    parser.add_argument("--gold-base-path", default="s3a://manga-analytics/gold")
    parser.add_argument("--silver-path", default="s3a://manga-analytics/silver/events")
    parser.add_argument("--output-dir", default="/opt/manga/dashboard/data/gold")
    parser.add_argument("--top-n", type=int, default=50)
    return parser.parse_args()


def normalize_value(value: Any) -> Any:
    if isinstance(value, (datetime, date)):
        return value.isoformat()
    if isinstance(value, Decimal):
        return float(value)
    if isinstance(value, list):
        return [normalize_value(item) for item in value]
    if isinstance(value, dict):
        return {key: normalize_value(item) for key, item in value.items()}
    return value


def dataframe_to_records(df: DataFrame, limit: int) -> list[dict[str, Any]]:
    return [normalize_value(row.asDict(recursive=True)) for row in df.limit(limit).collect()]


def write_json(path: Path, payload: Any) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(payload, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def read_gold_dataset(spark: SparkSession, gold_base_path: str, dataset_name: str) -> DataFrame:
    return spark.read.parquet(f"{gold_base_path}/{dataset_name}")


def build_summary_kpis(spark: SparkSession, silver_path: str, gold_base_path: str) -> dict[str, Any]:
    silver = spark.read.parquet(silver_path)
    trending = read_gold_dataset(spark, gold_base_path, "trending_manga")
    reading_duration = read_gold_dataset(spark, gold_base_path, "reading_duration")
    genre_popularity = read_gold_dataset(spark, gold_base_path, "genre_popularity")
    top_search_queries = read_gold_dataset(spark, gold_base_path, "top_search_queries")

    silver_metrics = silver.agg(
        F.count("*").alias("total_events"),
        F.countDistinct("user_id").alias("active_users"),
        F.countDistinct("manga_id").alias("manga_with_events"),
        F.sum(F.when(F.col("event_type") == "chapter_read", 1).otherwise(0)).alias("chapter_reads"),
        F.sum(F.when(F.col("event_type") == "search", 1).otherwise(0)).alias("search_events"),
    ).first()

    reading_metrics = reading_duration.agg(
        F.coalesce(F.sum("total_reading_seconds"), F.lit(0)).alias("total_reading_seconds")
    ).first()

    top_manga = trending.orderBy(F.desc("trending_score"), F.asc("manga_title")).limit(1).collect()
    top_genre = genre_popularity.orderBy(F.desc("popularity_score"), F.asc("genre")).limit(1).collect()
    top_query = top_search_queries.orderBy(F.desc("search_count"), F.asc("query")).limit(1).collect()

    return normalize_value(
        {
            "generated_at": datetime.utcnow().isoformat(timespec="seconds") + "Z",
            "total_events": int(silver_metrics["total_events"] or 0),
            "active_users": int(silver_metrics["active_users"] or 0),
            "manga_with_events": int(silver_metrics["manga_with_events"] or 0),
            "chapter_reads": int(silver_metrics["chapter_reads"] or 0),
            "search_events": int(silver_metrics["search_events"] or 0),
            "total_reading_seconds": int(reading_metrics["total_reading_seconds"] or 0),
            "top_manga": top_manga[0].asDict(recursive=True) if top_manga else None,
            "top_genre": top_genre[0].asDict(recursive=True) if top_genre else None,
            "top_search_query": top_query[0].asDict(recursive=True) if top_query else None,
        }
    )


def main() -> None:
    args = parse_args()
    output_dir = Path(args.output_dir)
    spark = SparkSession.builder.appName("manga-dashboard-json-export").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    summary = build_summary_kpis(spark, args.silver_path, args.gold_base_path)
    write_json(output_dir / "summary_kpis.json", summary)
    print("summary_kpis_count=1")

    for dataset_name, file_name in DATASETS.items():
        dataframe = read_gold_dataset(spark, args.gold_base_path, dataset_name)
        records = dataframe_to_records(dataframe, args.top_n)
        write_json(output_dir / file_name, records)
        print(f"{dataset_name}_exported={len(records)}")

    spark.stop()


if __name__ == "__main__":
    main()
