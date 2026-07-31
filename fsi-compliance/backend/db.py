"""Lightweight SQLite persistence for run history (watchlist runs + investigations)."""

import json
import sqlite3
import time
from pathlib import Path
from typing import Any

DB_PATH = Path(__file__).parent / "data" / "runs.db"

_SCHEMA = """
CREATE TABLE IF NOT EXISTS runs (
    run_id     TEXT PRIMARY KEY,
    kind       TEXT NOT NULL,
    created_at REAL NOT NULL,
    query      TEXT,
    elapsed_s  REAL,
    counts     TEXT,
    payload    TEXT NOT NULL
)
"""


def _conn() -> sqlite3.Connection:
    conn = sqlite3.connect(DB_PATH)
    conn.row_factory = sqlite3.Row
    conn.execute(_SCHEMA)
    return conn


def save_run(
    run_id: str,
    kind: str,
    payload: dict[str, Any],
    query: str | None = None,
    elapsed_s: float | None = None,
    counts: dict[str, int] | None = None,
) -> None:
    with _conn() as conn:
        conn.execute(
            "INSERT OR REPLACE INTO runs (run_id, kind, created_at, query, elapsed_s, counts, payload)"
            " VALUES (?, ?, ?, ?, ?, ?, ?)",
            (
                run_id,
                kind,
                time.time(),
                query,
                elapsed_s,
                json.dumps(counts) if counts is not None else None,
                json.dumps(payload),
            ),
        )


def list_runs(kind: str | None = None, limit: int = 50) -> list[dict[str, Any]]:
    """Return run metadata (no payload), newest first."""
    with _conn() as conn:
        if kind:
            rows = conn.execute(
                "SELECT run_id, kind, created_at, query, elapsed_s, counts FROM runs"
                " WHERE kind = ? ORDER BY created_at DESC LIMIT ?",
                (kind, limit),
            ).fetchall()
        else:
            rows = conn.execute(
                "SELECT run_id, kind, created_at, query, elapsed_s, counts FROM runs"
                " ORDER BY created_at DESC LIMIT ?",
                (limit,),
            ).fetchall()
    return [
        {
            "run_id": r["run_id"],
            "kind": r["kind"],
            "created_at": r["created_at"],
            "query": r["query"],
            "elapsed_s": r["elapsed_s"],
            "counts": json.loads(r["counts"]) if r["counts"] else None,
        }
        for r in rows
    ]


def get_run(run_id: str) -> dict[str, Any] | None:
    """Return a single run including its full payload."""
    with _conn() as conn:
        row = conn.execute("SELECT * FROM runs WHERE run_id = ?", (run_id,)).fetchone()
    if row is None:
        return None
    return {
        "run_id": row["run_id"],
        "kind": row["kind"],
        "created_at": row["created_at"],
        "query": row["query"],
        "elapsed_s": row["elapsed_s"],
        "counts": json.loads(row["counts"]) if row["counts"] else None,
        "payload": json.loads(row["payload"]),
    }
