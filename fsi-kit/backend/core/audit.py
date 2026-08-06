"""JSONL audit trail — every agent step is logged to disk and streamable to the UI."""

import json
import logging
import time
from pathlib import Path
from typing import Any

logger = logging.getLogger(__name__)

LOG_DIR = Path(__file__).parents[2] / "logs"


class AuditTrail:
    """Collects timestamped events for one run or case and persists them as JSONL."""

    def __init__(self, run_id: str, kind: str):
        self.run_id = run_id
        self.kind = kind
        self.events: list[dict[str, Any]] = []
        LOG_DIR.mkdir(exist_ok=True)

    def record(
        self, event_type: str, client_id: str | None = None, **data: Any
    ) -> dict[str, Any]:
        event = {
            "ts": round(time.time(), 3),
            "run_id": self.run_id,
            "kind": self.kind,
            "type": event_type,
            "client_id": client_id,
            **data,
        }
        self.events.append(event)
        return event

    def flush(self) -> Path:
        path = LOG_DIR / f"{self.run_id}.jsonl"
        with open(path, "a") as f:
            f.writelines(json.dumps(event) + "\n" for event in self.events)
        logger.info("audit trail flushed: %s (%d events)", path, len(self.events))
        self.events = []
        return path
