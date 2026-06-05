from __future__ import annotations

import argparse

from pyspark.sql import DataFrame, SparkSession
from pyspark.sql import functions as F


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Build Gold analytics marts from Silver manga behavior events.")
    parser.add_argument("--silver-path", default="s3a://manga-analytics/silver/events")
    parser.add_argument("--gold-base-path", default="s3a://manga-analytics/gold")
    return parser.parse_args()


def write_gold(df: DataFrame, path: str) -> None:
    df.coalesce(1).write.mode("overwrite").parquet(path)


def trending_manga(silver: DataFrame) -> DataFrame:
    return (
        silver.filter(F.col("manga_id").isNotNull())
        .groupBy("manga_id", "manga_title")
        .agg(
            F.count("*").alias("event_count"),
            F.sum(F.when(F.col("event_type") == "manga_view", 1).otherwise(0)).alias("view_count"),
            F.sum(F.when(F.col("event_type") == "chapter_read", 1).otherwise(0)).alias("read_count"),
            F.sum(F.when(F.col("event_type") == "like", 1).otherwise(0)).alias("like_count"),
            F.sum(F.when(F.col("event_type") == "follow", 1).otherwise(0)).alias("follow_count"),
            F.sum(F.when((F.col("event_type") == "chapter_read") & (F.col("completed") == True), 1).otherwise(0)).alias("completed_read_count"),
            F.sum(F.when(F.col("event_type") == "chapter_read", F.col("duration_seconds")).otherwise(0)).alias("total_reading_seconds"),
            F.countDistinct("user_id").alias("unique_users"),
        )
        .withColumn(
            "completion_rate",
            F.when(F.col("read_count") > 0, F.round(F.col("completed_read_count") / F.col("read_count"), 4)).otherwise(F.lit(0.0)),
        )
        .withColumn(
            "trending_score",
            F.col("view_count") + (F.col("read_count") * 3) + (F.col("like_count") * 5) + (F.col("follow_count") * 7),
        )
        .orderBy(F.desc("trending_score"), F.desc("unique_users"), F.asc("manga_title"))
    )


def active_users(silver: DataFrame) -> DataFrame:
    return (
        silver.groupBy("event_date", "event_hour")
        .agg(
            F.count("*").alias("event_count"),
            F.countDistinct("user_id").alias("active_users"),
            F.sum(F.when(F.col("event_type") == "chapter_read", 1).otherwise(0)).alias("read_event_count"),
            F.sum(F.when(F.col("event_type") == "search", 1).otherwise(0)).alias("search_event_count"),
        )
        .orderBy("event_date", "event_hour")
    )


def reading_duration(silver: DataFrame) -> DataFrame:
    return (
        silver.filter(F.col("event_type") == "chapter_read")
        .groupBy("event_date", "manga_id", "manga_title")
        .agg(
            F.sum("duration_seconds").alias("total_reading_seconds"),
            F.round(F.avg("duration_seconds"), 2).alias("avg_reading_seconds"),
            F.count("*").alias("read_count"),
            F.countDistinct("user_id").alias("reader_count"),
        )
        .orderBy(F.desc("total_reading_seconds"), F.asc("manga_title"))
    )


def genre_popularity(silver: DataFrame) -> DataFrame:
    exploded = silver.filter(F.size(F.col("genres")) > 0).withColumn("genre", F.explode("genres"))
    return (
        exploded.groupBy("event_date", "genre")
        .agg(
            F.count("*").alias("event_count"),
            F.sum(F.when(F.col("event_type") == "manga_view", 1).otherwise(0)).alias("view_count"),
            F.sum(F.when(F.col("event_type") == "chapter_read", 1).otherwise(0)).alias("read_count"),
            F.sum(F.when(F.col("event_type") == "like", 1).otherwise(0)).alias("like_count"),
            F.sum(F.when(F.col("event_type") == "follow", 1).otherwise(0)).alias("follow_count"),
            F.countDistinct("user_id").alias("unique_users"),
        )
        .withColumn("popularity_score", F.col("view_count") + (F.col("read_count") * 3) + (F.col("like_count") * 5) + (F.col("follow_count") * 7))
        .orderBy(F.desc("popularity_score"), F.asc("genre"))
    )


def top_search_queries(silver: DataFrame) -> DataFrame:
    return (
        silver.filter(F.col("event_type") == "search")
        .groupBy("event_date", "query")
        .agg(
            F.count("*").alias("search_count"),
            F.countDistinct("user_id").alias("unique_users"),
        )
        .orderBy(F.desc("search_count"), F.asc("query"))
    )


def completion_rate(silver: DataFrame) -> DataFrame:
    return (
        silver.filter(F.col("event_type") == "chapter_read")
        .groupBy("manga_id", "manga_title")
        .agg(
            F.count("*").alias("read_count"),
            F.sum(F.when(F.col("completed") == True, 1).otherwise(0)).alias("completed_read_count"),
            F.sum("pages_read").alias("total_pages_read"),
            F.countDistinct("user_id").alias("reader_count"),
        )
        .withColumn("completion_rate", F.round(F.col("completed_read_count") / F.col("read_count"), 4))
        .orderBy(F.desc("completion_rate"), F.desc("read_count"), F.asc("manga_title"))
    )


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.appName("manga-gold-analytics").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    silver = spark.read.parquet(args.silver_path)
    datasets = {
        "trending_manga": trending_manga(silver),
        "active_users": active_users(silver),
        "reading_duration": reading_duration(silver),
        "genre_popularity": genre_popularity(silver),
        "top_search_queries": top_search_queries(silver),
        "completion_rate": completion_rate(silver),
    }

    for name, dataframe in datasets.items():
        path = f"{args.gold_base_path}/{name}"
        write_gold(dataframe, path)
        print(f"{name}_count={dataframe.count()}")

    spark.stop()


if __name__ == "__main__":
    main()

