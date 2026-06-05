from __future__ import annotations

import argparse

from pyspark.sql import SparkSession


GOLD_DATASETS = [
    "trending_manga",
    "active_users",
    "reading_duration",
    "genre_popularity",
    "top_search_queries",
    "completion_rate",
]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect Gold analytics mart row counts.")
    parser.add_argument("--gold-base-path", default="s3a://manga-analytics/gold")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.appName("manga-gold-inspection").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    for dataset in GOLD_DATASETS:
        count = spark.read.parquet(f"{args.gold_base_path}/{dataset}").count()
        print(f"{dataset}_count={count}")

    spark.stop()


if __name__ == "__main__":
    main()

