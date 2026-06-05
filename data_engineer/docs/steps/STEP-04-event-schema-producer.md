# STEP-04: Event Schema And Producer

Status: Done

Completion date: 2026-06-05

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

- Added JSON schema for manga behavior events at `data_engineer/schemas/manga_event.schema.json`.
- Added source snapshot loader that reads users, manga, chapters, and genres from PostgreSQL.
- Added event generator for `manga_view`, `chapter_read`, `like`, `follow`, and `search`.
- Added Kafka publisher using `confluent-kafka`.
- Added producer CLI: `python data_engineer/producer/synthetic_event_producer.py`.
- Producer supports event count, event rate, invalid event rate, random seed, topic, and bootstrap server options.
- Verified schema JSON parses with `python -m json.tool`.
- Verified Python syntax with `python -m compileall data_engineer/producer`.
- Verified Kafka topic description for `manga.user_events` shows 3 partitions and replication factor 1.
- Ran smoke test: `python data_engineer/producer/synthetic_event_producer.py --events 100 --events-per-second 500 --invalid-event-rate 0.02`.
- Smoke test result: sent `100`, delivered `100`, failed `0`.
- Consumed 5 messages from Kafka; payloads included real MangaDex titles such as `Tensei Shitara Slime datta Ken`, `Kage no Jitsuryokusha ni Naritakute!`, and `Kumo desu ga, Nani ka?`.
- Added Kafka UI access for browser-based topic/message inspection at `http://localhost:18082`.
