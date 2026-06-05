# STEP-05: Spark Bronze And Silver Layers

Status: Done

Completion date: 2026-06-05

## Objective

Implement Spark Structured Streaming ingestion from Kafka and write Bronze and Silver Parquet layers to MinIO.

## Plan

Bronze layer:

- Read Kafka topic `manga.user_events`.
- Parse JSON payloads.
- Add ingestion metadata such as Kafka partition, offset, and processing timestamp.
- Write raw parsed events to MinIO as Parquet.
- Partition by event date.

Silver layer:

- Validate required fields.
- Drop or quarantine unknown event types.
- Deduplicate by `event_id`.
- Normalize timestamps.
- Clean impossible values such as negative duration or negative page counts.
- Derive fields such as event date and event hour.
- Write cleaned events to MinIO as Parquet.

## Expected Outputs

- Spark streaming job for Kafka ingestion.
- Bronze Parquet data in MinIO.
- Silver Parquet data in MinIO.
- Checkpoint directories for streaming state.

## Acceptance Criteria

- Spark job starts and consumes Kafka events.
- Bronze data is written for incoming events.
- Silver data only contains validated and cleaned records.
- Duplicate event IDs are not repeated in Silver.
- Invalid events are handled predictably and do not crash the stream.

## Verification Evidence

- Added Spark defaults for Kafka connector, Hadoop S3A connector, and MinIO access.
- Added Spark Structured Streaming job: `stream_events.py`.
- Added Spark lake inspection helper: `inspect_lake.py`.
- Verified Python syntax with `python -m py_compile data_engineer/spark/jobs/stream_events.py`.
- Verified Spark job and defaults are mounted inside the Spark master container.
- Ran Bronze/Silver streaming job with:
  `docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/stream_events.py`.
- First run consumed existing Kafka messages and wrote Bronze/Silver Parquet files to MinIO.
- Produced 20 additional Kafka events, reran the streaming job, and verified checkpointed incremental processing: `bronze_input_rows=20`, `silver_input_rows=20`.
- Verified MinIO contains Bronze, Silver, and checkpoint objects under `manga-analytics`.
- Ran lake inspection helper with:
  `docker exec manga-de-spark-master /opt/spark/bin/spark-submit --properties-file /opt/manga/conf/spark-defaults.conf --master spark://spark-master:7077 /opt/manga/jobs/inspect_lake.py`.
- Inspection result: `bronze_count=120`, `silver_count=119`, `silver_duplicate_event_ids=0`, `silver_unknown_event_types=0`, `silver_invalid_duration_rows=0`.
