from __future__ import annotations

import argparse

from pyspark.sql import SparkSession
from pyspark.sql import functions as F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Inspect Bronze and Silver Parquet outputs in MinIO.")
    parser.add_argument("--bronze-path", default="s3a://manga-analytics/bronze/events")
    parser.add_argument("--silver-path", default="s3a://manga-analytics/silver/events")
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.appName("manga-lake-inspection").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    bronze = spark.read.parquet(args.bronze_path)
    silver = spark.read.parquet(args.silver_path)
    silver_duplicate_ids = (
        silver.groupBy("event_id")
        .count()
        .filter(F.col("count") > 1)
        .count()
    )

    print(f"bronze_count={bronze.count()}")
    print(f"silver_count={silver.count()}")
    print(f"silver_duplicate_event_ids={silver_duplicate_ids}")
    print(f"silver_unknown_event_types={silver.filter(~F.col('event_type').isin('manga_view', 'chapter_read', 'like', 'follow', 'search')).count()}")
    print(f"silver_invalid_duration_rows={silver.filter((F.col('event_type') == 'chapter_read') & (F.col('duration_seconds') <= 0)).count()}")
    spark.stop()


if __name__ == "__main__":
    main()

