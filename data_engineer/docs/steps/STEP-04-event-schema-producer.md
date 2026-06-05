# STEP-04: Event Schema And Producer

Status: Not Started

Completion date: N/A

## Objective

Define the manga behavior event contract and implement a synthetic Kafka producer.

## Plan

Define a JSON schema for event types:

- `manga_view`
- `chapter_read`
- `like`
- `follow`
- `search`

Common event fields:

- `event_id`
- `event_type`
- `event_ts`
- `user_id`
- `session_id`
- `manga_id`
- `chapter_id`
- `genres`
- `query`
- `duration_seconds`
- `pages_read`
- `completed`
- `device_type`
- `country`

Implement a producer that:

- Reads users, manga, chapters, and genres from PostgreSQL.
- Generates realistic behavior sequences.
- Sends JSON events to Kafka topic `manga.user_events`.
- Supports command-line options for event count, rate, and run duration.
- Produces a small percentage of imperfect events for Spark validation testing.

## Expected Outputs

- JSON event schema file.
- Producer script that streams events to Kafka.
- Sample events documented in README or producer docs.

## Acceptance Criteria

- Producer sends valid JSON events to Kafka.
- Events include all required common fields.
- Event type-specific fields are populated correctly.
- Producer can generate enough volume for dashboard analytics.
- Producer logs send rate and total events sent.

## Verification Evidence

Record evidence here after implementation.

