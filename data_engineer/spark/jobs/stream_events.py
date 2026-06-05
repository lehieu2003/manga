from __future__ import annotations

import argparse

from pyspark.sql import SparkSession
from pyspark.sql import functions as F
from pyspark.sql.types import (
    ArrayType,
    BooleanType,
    IntegerType,
    StringType,
    StructField,
    StructType,
)


EVENT_SCHEMA = StructType(
    [
        StructField("event_id", StringType(), True),
        StructField("event_type", StringType(), True),
        StructField("event_ts", StringType(), True),
        StructField("user_id", StringType(), True),
        StructField("session_id", StringType(), True),
        StructField("manga_id", StringType(), True),
        StructField("manga_title", StringType(), True),
        StructField("chapter_id", StringType(), True),
        StructField("genres", ArrayType(StringType()), True),
        StructField("query", StringType(), True),
        StructField("duration_seconds", IntegerType(), True),
        StructField("pages_read", IntegerType(), True),
        StructField("completed", BooleanType(), True),
        StructField("device_type", StringType(), True),
        StructField("country", StringType(), True),
        StructField("source", StringType(), True),
    ]
)

VALID_EVENT_TYPES = ["manga_view", "chapter_read", "like", "follow", "search"]


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Stream manga behavior events from Kafka into Bronze and Silver Parquet layers.")
    parser.add_argument("--kafka-bootstrap-servers", default="kafka:9092")
    parser.add_argument("--topic", default="manga.user_events")
    parser.add_argument("--bronze-path", default="s3a://manga-analytics/bronze/events")
    parser.add_argument("--silver-path", default="s3a://manga-analytics/silver/events")
    parser.add_argument("--bronze-checkpoint", default="s3a://manga-analytics/checkpoints/bronze/events")
    parser.add_argument("--silver-checkpoint", default="s3a://manga-analytics/checkpoints/silver/events")
    parser.add_argument("--starting-offsets", default="earliest")
    parser.add_argument("--processing-mode", choices=["available-now", "continuous"], default="available-now")
    return parser.parse_args()


def read_kafka_stream(spark: SparkSession, args: argparse.Namespace):
    return (
        spark.readStream.format("kafka")
        .option("kafka.bootstrap.servers", args.kafka_bootstrap_servers)
        .option("subscribe", args.topic)
        .option("startingOffsets", args.starting_offsets)
        .option("failOnDataLoss", "false")
        .load()
    )


def parsed_events(kafka_df):
    parsed = kafka_df.select(
        F.col("topic"),
        F.col("partition"),
        F.col("offset"),
        F.col("timestamp").alias("kafka_timestamp"),
        F.col("key").cast("string").alias("kafka_key"),
        F.col("value").cast("string").alias("raw_value"),
        F.from_json(F.col("value").cast("string"), EVENT_SCHEMA).alias("event"),
        F.current_timestamp().alias("processing_ts"),
    )

    return (
        parsed.select(
            "topic",
            "partition",
            "offset",
            "kafka_timestamp",
            "kafka_key",
            "raw_value",
            "processing_ts",
            "event.*",
        )
        .withColumn("event_timestamp", F.to_timestamp("event_ts"))
        .withColumn("event_date", F.to_date("event_timestamp"))
        .withColumn("event_hour", F.hour("event_timestamp"))
    )


def silver_events(events_df):
    uuid_regex = "^[0-9a-fA-F]{8}-[0-9a-fA-F]{4}-[1-5][0-9a-fA-F]{3}-[89abAB][0-9a-fA-F]{3}-[0-9a-fA-F]{12}$"

    valid_common = (
        F.col("event_id").rlike(uuid_regex)
        & F.col("event_type").isin(VALID_EVENT_TYPES)
        & F.col("event_timestamp").isNotNull()
        & F.col("user_id").rlike(uuid_regex)
        & F.col("session_id").rlike(uuid_regex)
        & F.col("device_type").isin("mobile", "desktop", "tablet")
        & F.col("country").rlike("^[A-Z]{2}$")
    )

    valid_search = (F.col("event_type") == "search") & F.col("query").isNotNull() & (F.length(F.col("query")) > 0)
    valid_non_search = (
        (F.col("event_type") != "search")
        & F.col("manga_id").rlike(uuid_regex)
        & F.col("manga_title").isNotNull()
        & (F.size(F.col("genres")) > 0)
    )
    valid_chapter_read = (
        (F.col("event_type") != "chapter_read")
        | (
            F.col("chapter_id").rlike(uuid_regex)
            & (F.col("duration_seconds") > 0)
            & (F.col("pages_read") > 0)
            & F.col("completed").isNotNull()
        )
    )

    return (
        events_df.filter(valid_common & (valid_search | valid_non_search) & valid_chapter_read)
        .withWatermark("event_timestamp", "24 hours")
        .dropDuplicates(["event_id"])
        .select(
            "event_id",
            "event_type",
            "event_timestamp",
            "event_date",
            "event_hour",
            "user_id",
            "session_id",
            "manga_id",
            "manga_title",
            "chapter_id",
            "genres",
            "query",
            "duration_seconds",
            "pages_read",
            "completed",
            "device_type",
            "country",
            "source",
            "topic",
            "partition",
            "offset",
            "processing_ts",
        )
    )


def write_stream(df, path: str, checkpoint: str, processing_mode: str):
    writer = (
        df.writeStream.format("parquet")
        .outputMode("append")
        .option("path", path)
        .option("checkpointLocation", checkpoint)
        .partitionBy("event_date")
    )
    if processing_mode == "available-now":
        return writer.trigger(availableNow=True).start()
    return writer.start()


def input_rows(query) -> int:
    return sum(int(progress.get("numInputRows", 0)) for progress in query.recentProgress)


def main() -> None:
    args = parse_args()
    spark = SparkSession.builder.appName("manga-events-bronze-silver").getOrCreate()
    spark.sparkContext.setLogLevel("WARN")

    bronze = parsed_events(read_kafka_stream(spark, args))
    silver = silver_events(parsed_events(read_kafka_stream(spark, args)))

    bronze_query = write_stream(bronze, args.bronze_path, args.bronze_checkpoint, args.processing_mode)
    silver_query = write_stream(silver, args.silver_path, args.silver_checkpoint, args.processing_mode)

    bronze_query.awaitTermination()
    silver_query.awaitTermination()

    print(f"bronze_input_rows={input_rows(bronze_query)}")
    print(f"silver_input_rows={input_rows(silver_query)}")
    spark.stop()


if __name__ == "__main__":
    main()
