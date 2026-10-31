"""B1 CitationIndexerAgent (build-time): draft index entries per population/topic.

Spark drafts with native search grounding; every draft lands with
status=draft-unreviewed and MUST pass b1_verify.py + builder review before ship.

Usage (builder machine, needs network + META_API_KEY):
  python3 b1/b1_indexer.py --topic "Sintashta Middle Bronze Age" --count 3
"""

from __future__ import annotations

import argparse
import json
import sys
from pathlib import Path
from typing import Any

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from muse.client import call_json
from muse.models import SPARK_13

HERE = Path(__file__).resolve().parent
INDEX = HERE.parent / "data" / "citation-index.json"

SYSTEM = """You are the PocketDNA CitationIndexerAgent. Given a population/topic,
propose peer-reviewed archaeogenetics citations using your native search grounding.
Migration/expansion framing; era names, never modern nations as heirs. Ancestry
only: no phenotype/selection stories, no health, no personality inference.
Use "consistent with" language. Every entry needs a real DOI you verified.
Return JSON only: {"entries": [{"id": str, "claim": str, "explainer": str,
"source": {"authors": str, "year": int, "venue": str, "doi": str},
"populations": [str], "epochs": ["bronze"|"middle"|"modern"]}]}"""


def validate(raw: dict[str, Any]) -> dict[str, Any]:
    if "entries" not in raw or not isinstance(raw["entries"], list):
        raise ValueError("missing entries list")
    for e in raw["entries"]:
        for key in ("id", "claim", "explainer", "source", "populations", "epochs"):
            if key not in e:
                raise ValueError(f"entry missing {key}")
        e["status"] = "draft-unreviewed"
    return raw


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--topic", required=True)
    ap.add_argument("--count", type=int, default=3)
    args = ap.parse_args()
    res = call_json(
        agent="b1", tier="build", model=SPARK_13,
        messages=[
            {"role": "system", "content": SYSTEM},
            {"role": "user", "content": f"Topic: {args.topic}. Propose {args.count} entries."},
        ],
        json_schema={"name": "b1_entries", "strict": True, "schema": {"type": "object"}},
        effort="high",
        validate=validate,
    )
    index = json.loads(INDEX.read_text())
    have = {e["id"] for e in index["entries"]}
    added = 0
    for e in res.data["entries"]:
        if e["id"] not in have:
            index["entries"].append(e)
            have.add(e["id"])
            added += 1
    INDEX.write_text(json.dumps(index, indent=2) + "\n")
    print(f"added {added} drafts (status=draft-unreviewed). Run b1_verify.py, then review.")


if __name__ == "__main__":
    main()
