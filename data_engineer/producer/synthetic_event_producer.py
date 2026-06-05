from __future__ import annotations

import argparse
import json
import os
import time

from jsonschema import Draft202012Validator

from db import connect
from de_config import PROJECT_DIR, _float, _int, get_source_db_config, load_environment
from event_generator import MangaEventGenerator
from kafka_publisher import KafkaEventPublisher
from source_repository import assert_snapshot_ready, load_source_snapshot


def parse_args() -> argparse.Namespace:
    load_environment()
    parser = argparse.ArgumentParser(description="Generate synthetic manga behavior events and publish them to Kafka.")
    parser.add_argument("--events", type=int, default=_int("PRODUCER_EVENT_COUNT", 100000))
    parser.add_argument("--events-per-second", type=float, default=_float("PRODUCER_EVENTS_PER_SECOND", 200.0))
    parser.add_argument("--invalid-event-rate", type=float, default=_float("PRODUCER_INVALID_EVENT_RATE", 0.02))
    parser.add_argument("--seed", type=int, default=_int("PRODUCER_RANDOM_SEED", 42))
    parser.add_argument("--topic", default=os.getenv("KAFKA_TOPIC_USER_EVENTS", "manga.user_events"))
    parser.add_argument("--bootstrap-servers", default=os.getenv("KAFKA_BOOTSTRAP_SERVERS_LOCAL", "localhost:29092"))
    parser.add_argument("--validate-sample-size", type=int, default=25)
    return parser.parse_args()


def load_validator() -> Draft202012Validator:
    schema_path = PROJECT_DIR / "schemas" / "manga_event.schema.json"
    with schema_path.open(encoding="utf-8") as schema_file:
        return Draft202012Validator(json.load(schema_file))


def validate_sample(events: list[dict], validator: Draft202012Validator) -> None:
    valid_events = [event for event in events if event.get("event_type") != "invalid_event" and event.get("user_id") is not None]
    for event in valid_events:
        errors = sorted(validator.iter_errors(event), key=lambda item: item.path)
        if errors:
            message = "; ".join(error.message for error in errors)
            raise RuntimeError(f"generated valid sample failed schema validation: {message}")


def main() -> None:
    args = parse_args()
    db_config = get_source_db_config(host_port=True)

    with connect(db_config) as connection:
        snapshot = load_source_snapshot(connection)
    assert_snapshot_ready(snapshot)

    clean_generator = MangaEventGenerator(snapshot, invalid_event_rate=0, seed=args.seed)
    validator = load_validator()
    sample = list(clean_generator.generate(args.validate_sample_size))
    validate_sample(sample, validator)

    generator = MangaEventGenerator(snapshot, invalid_event_rate=args.invalid_event_rate, seed=args.seed)
    publisher = KafkaEventPublisher(args.bootstrap_servers, args.topic)
    interval = 1 / args.events_per_second if args.events_per_second > 0 else 0
    started_at = time.perf_counter()
    sent = 0

    for event in sample[: min(len(sample), args.events)]:
        publisher.publish(event)
        sent += 1
        if interval:
            time.sleep(interval)

    remaining = max(0, args.events - sent)
    for event in generator.generate(remaining):
        publisher.publish(event)
        sent += 1
        if sent % 1000 == 0:
            elapsed = max(0.001, time.perf_counter() - started_at)
            print(f"sent={sent} rate={sent / elapsed:.1f}/s")
        if interval:
            time.sleep(interval)

    publisher.flush()
    elapsed = max(0.001, time.perf_counter() - started_at)
    print(
        f"producer complete sent={sent} delivered={publisher.delivered} failed={publisher.failed} "
        f"elapsed_seconds={elapsed:.2f} effective_rate={sent / elapsed:.1f}/s topic={args.topic}"
    )


if __name__ == "__main__":
    main()
