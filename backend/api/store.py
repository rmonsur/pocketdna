"""SQLite job store on a persistent volume. stdlib only; no ops."""

from __future__ import annotations

import json
import os
import sqlite3
from pathlib import Path

DB_PATH = Path(os.environ.get("POCKETDNA_DB", str(Path(__file__).resolve().parents[1] / "pocketdna.db")))

_SCHEMA = """
CREATE TABLE IF NOT EXISTS jobs (
  job_id TEXT PRIMARY KEY,
  tier TEXT NOT NULL,
  state TEXT NOT NULL,
  rejection TEXT,
  message TEXT NOT NULL DEFAULT '',
  reel_json TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
CREATE TABLE IF NOT EXISTS events (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  job_id TEXT NOT NULL,
  step INTEGER NOT NULL,
  title TEXT NOT NULL DEFAULT '',
  model TEXT NOT NULL DEFAULT '',
  status TEXT NOT NULL,
  artifact TEXT NOT NULL DEFAULT ''
);
"""


def connect() -> sqlite3.Connection:
    DB_PATH.parent.mkdir(parents=True, exist_ok=True)
    conn = sqlite3.connect(DB_PATH)
    conn.executescript(_SCHEMA)
    return conn


def create_job(job_id: str, tier: str, state: str, message: str = "") -> None:
    conn = connect()
    conn.execute("INSERT INTO jobs (job_id, tier, state, message) VALUES (?, ?, ?, ?)",
                 (job_id, tier, state, message))
    conn.commit()
    conn.close()


def set_state(job_id: str, state: str, message: str = "", rejection: str | None = None) -> None:
    conn = connect()
    conn.execute("UPDATE jobs SET state = ?, message = ?, rejection = ? WHERE job_id = ?",
                 (state, message, rejection, job_id))
    conn.commit()
    conn.close()


def save_reel(job_id: str, reel: dict) -> None:
    conn = connect()
    conn.execute("UPDATE jobs SET reel_json = ?, state = 'done' WHERE job_id = ?",
                 (json.dumps(reel), job_id))
    conn.commit()
    conn.close()


def add_event(job_id: str, step: int, title: str, model: str, status: str, artifact: str = "") -> None:
    conn = connect()
    conn.execute("INSERT INTO events (job_id, step, title, model, status, artifact) VALUES (?, ?, ?, ?, ?, ?)",
                 (job_id, step, title, model, status, artifact))
    conn.commit()
    conn.close()


def get_job(job_id: str) -> dict | None:
    conn = connect()
    conn.row_factory = sqlite3.Row
    row = conn.execute("SELECT * FROM jobs WHERE job_id = ?", (job_id,)).fetchone()
    if row is None:
        conn.close()
        return None
    events = [dict(r) for r in conn.execute(
        "SELECT job_id, step, title, model, status, artifact FROM events WHERE job_id = ? ORDER BY id",
        (job_id,))]
    conn.close()
    job = dict(row)
    job["events"] = events
    return job
