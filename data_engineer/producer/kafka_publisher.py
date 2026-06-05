from __future__ import annotations

import json
from typing import Any

from confluent_kafka import Producer


class KafkaEventPublisher:
    def __init__(self, bootstrap_servers: str, topic: str) -> None:
        self.topic = topic
        self.producer = Producer({"bootstrap.servers": bootstrap_servers})
        self.delivered = 0
        self.failed = 0

    def publish(self, event: dict[str, Any]) -> None:
        key = event.get("user_id") or event["event_id"]
        self.producer.produce(
            self.topic,
            key=str(key).encode("utf-8"),
            value=json.dumps(event, separators=(",", ":")).encode("utf-8"),
            callback=self._delivery_report,
        )
        self.producer.poll(0)

    def flush(self) -> None:
        self.producer.flush()

    def _delivery_report(self, error: Any, message: Any) -> None:
        if error is not None:
            self.failed += 1
            print(f"failed to deliver event: {error}")
            return
        self.delivered += 1

