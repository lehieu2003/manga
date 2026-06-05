# STEP-05: Spark Bronze And Silver Layers

Status: Not Started

Completion date: N/A

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

Record evidence here after implementation.

